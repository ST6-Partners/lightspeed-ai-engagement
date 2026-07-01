// ============================================================
// CHAT TOOLS — read-only, permission-mirrored live-data tools for the
// AI Assistant (DD-014/DD-016 pattern). Claude calls these to answer
// questions from the app's REAL data instead of guessing.
//
// GUARDRAILS (non-negotiable):
//   • READ-ONLY. No tool here creates, edits, or deletes anything.
//   • Survey data (engagement / exit / manager) is AGGREGATE-ONLY.
//     Individual responses and free-text are never returned, and any
//     group smaller than MIN_GROUP is suppressed to protect anonymity.
//   • Permission-mirrored: sensitive tools require manager/admin, using
//     the SAME role hierarchy as the tRPC routes (services/permissions).
// ============================================================

import { tool } from 'ai';
import { z } from 'zod';
import { and, eq, ilike, or, isNull, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { DrizzleClient } from '../db.js';
import { hasMinimumRole, type RoleTier } from './permissions.js';
import { users } from '../db/schema/core.js';
import { departments } from '../db/schema/departments.js';
import { jobTitles } from '../db/schema/jobTitles.js';
import { okrNodes } from '../db/schema/okr.js';
import { pips } from '../db/schema/pip.js';

/** Minimum group size before any survey aggregate is revealed (anonymity floor). */
export const MIN_GROUP = 4;

export interface ChatToolCtx {
  db: DrizzleClient;
  userId: string;
  userRole: RoleTier;
}

const deny = (min: RoleTier) => ({
  error: 'permission_denied',
  message: `That information requires the "${min}" role or higher, and your account doesn't have it.`,
});

const round = (x: number, p = 2) => {
  const f = 10 ** p;
  return Math.round(x * f) / f;
};
const favPct = (arr: number[]) => (arr.length ? round((arr.filter((v) => v >= 4).length / arr.length) * 100, 1) : null);
const mean = (arr: number[]) => (arr.length ? round(arr.reduce((a, b) => a + b, 0) / arr.length, 2) : null);
const num = (v: unknown): number | null => (v == null ? null : Number(v));

export function buildChatTools(ctx: ChatToolCtx) {
  return {
    // ── Directory & org (all authenticated users) ──────────────
    list_employees: tool({
      description:
        'List or search the employee directory: name, email, job title, department, manager, and role. Read-only. Use for questions like "who works in Engineering", "who is Dana", "list managers".',
      inputSchema: z.object({
        search: z.string().optional().describe('case-insensitive match on name or email'),
        department: z.string().optional().describe('exact department name to filter by'),
        limit: z.number().int().min(1).max(200).default(50),
      }),
      execute: async ({ search, department, limit }) => {
        const mgr = alias(users, 'mgr');
        const conds = [eq(users.isActive, true)];
        if (search) conds.push(or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`))!);
        if (department) conds.push(eq(departments.name, department));
        const rows = await ctx.db
          .select({
            name: users.name,
            email: users.email,
            role: users.role,
            title: jobTitles.title,
            department: departments.name,
            manager: mgr.name,
          })
          .from(users)
          .leftJoin(jobTitles, eq(users.jobTitleId, jobTitles.id))
          .leftJoin(departments, eq(users.departmentId, departments.id))
          .leftJoin(mgr, eq(users.managerId, mgr.id))
          .where(and(...conds))
          .orderBy(users.name)
          .limit(limit ?? 50);
        return { count: rows.length, employees: rows };
      },
    }),

    get_direct_reports: tool({
      description: 'Given a manager (by name or email), list their direct reports. Read-only.',
      inputSchema: z.object({ manager: z.string().describe('manager name or email') }),
      execute: async ({ manager }) => {
        const m = await ctx.db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(or(ilike(users.name, `%${manager}%`), ilike(users.email, `%${manager}%`)))
          .limit(1);
        if (!m.length) return { error: 'not_found', message: `No employee matching "${manager}".` };
        const reports = await ctx.db
          .select({ name: users.name, title: jobTitles.title, department: departments.name })
          .from(users)
          .leftJoin(jobTitles, eq(users.jobTitleId, jobTitles.id))
          .leftJoin(departments, eq(users.departmentId, departments.id))
          .where(and(eq(users.managerId, m[0].id), eq(users.isActive, true)))
          .orderBy(users.name);
        return { manager: m[0].name, reportCount: reports.length, reports };
      },
    }),

    list_departments: tool({
      description: 'List active departments with a headcount of active employees in each. Read-only.',
      inputSchema: z.object({}),
      execute: async () => {
        const rows = await ctx.db
          .select({
            name: departments.name,
            description: departments.description,
            employees: sql<number>`count(${users.id})::int`,
          })
          .from(departments)
          .leftJoin(users, and(eq(users.departmentId, departments.id), eq(users.isActive, true)))
          .where(eq(departments.isActive, true))
          .groupBy(departments.id, departments.name, departments.description)
          .orderBy(departments.name);
        return { count: rows.length, departments: rows };
      },
    }),

    list_job_titles: tool({
      description: 'List active job titles / levels in the company. Read-only.',
      inputSchema: z.object({}),
      execute: async () => {
        const rows = await ctx.db
          .select({ title: jobTitles.title, level: jobTitles.level })
          .from(jobTitles)
          .where(eq(jobTitles.isActive, true))
          .orderBy(jobTitles.sortOrder);
        return { count: rows.length, titles: rows };
      },
    }),

    list_okrs: tool({
      description:
        'List OKRs — objectives, key results, and tasks (nested via parentId) with owner, status, and RAG light. Read-only.',
      inputSchema: z.object({
        status: z.enum(['not_started', 'in_progress', 'on_hold', 'complete']).optional(),
        limit: z.number().int().min(1).max(300).default(200),
      }),
      execute: async ({ status, limit }) => {
        const conds = [isNull(okrNodes.archivedAt)];
        if (status) conds.push(eq(okrNodes.status, status));
        const rows = await ctx.db
          .select({
            id: okrNodes.id,
            parentId: okrNodes.parentId,
            type: okrNodes.type,
            title: okrNodes.title,
            owner: okrNodes.owner,
            status: okrNodes.status,
            light: okrNodes.light,
            dueDate: okrNodes.dueDate,
          })
          .from(okrNodes)
          .where(and(...conds))
          .orderBy(okrNodes.sortOrder)
          .limit(limit ?? 200);
        return { count: rows.length, nodes: rows };
      },
    }),

    // ── Weekly plan participation (manager+, aggregate) ────────
    get_weekly_plan_summary: tool({
      description:
        'Aggregate weekly-plan participation: number of saved plans, average mood, and pulse-answer distribution. Aggregate only — never returns individual wins/blockers text. Requires manager role.',
      inputSchema: z.object({}),
      execute: async () => {
        if (!hasMinimumRole(ctx.userRole, 'manager')) return deny('manager');
        const rows = await ctx.db.query.weeklyCheckins.findMany();
        const saved = rows.filter((r) => r.status === 'saved');
        if (saved.length < MIN_GROUP)
          return {
            note: 'Aggregate only.',
            suppressed: true,
            message: `Fewer than ${MIN_GROUP} saved weekly plans — suppressed to protect anonymity.`,
          };
        const moods = saved.map((r) => r.mood).filter((x): x is number => x != null);
        const pulse = saved.reduce((a, r) => {
          const k = r.pulseAnswer || '—';
          a[k] = (a[k] || 0) + 1;
          return a;
        }, {} as Record<string, number>);
        return { note: 'Aggregate only — no individual text.', savedPlans: saved.length, avgMood: mean(moods), pulseDistribution: pulse };
      },
    }),

    // ── PIP status (manager+, no narrative) ────────────────────
    get_pip_summary: tool({
      description:
        'Performance Improvement Plan status: counts by status plus a list of plans (employee, status, dates, department, title). Does NOT return concern details, goals text, or employee comments. Requires manager role.',
      inputSchema: z.object({
        status: z
          .enum(['draft', 'active', 'completed_met', 'completed_not_met', 'extended', 'cancelled'])
          .optional(),
      }),
      execute: async ({ status }) => {
        if (!hasMinimumRole(ctx.userRole, 'manager')) return deny('manager');
        const emp = alias(users, 'emp');
        const conds = [isNull(pips.archivedAt)];
        if (status) conds.push(eq(pips.status, status));
        const rows = await ctx.db
          .select({
            employee: emp.name,
            status: pips.status,
            startDate: pips.startDate,
            finalReviewDate: pips.finalReviewDate,
            department: departments.name,
            title: jobTitles.title,
          })
          .from(pips)
          .leftJoin(emp, eq(pips.employeeId, emp.id))
          .leftJoin(departments, eq(pips.departmentId, departments.id))
          .leftJoin(jobTitles, eq(pips.jobTitleId, jobTitles.id))
          .where(and(...conds));
        const byStatus = rows.reduce((a, r) => {
          a[r.status] = (a[r.status] || 0) + 1;
          return a;
        }, {} as Record<string, number>);
        return { total: rows.length, byStatus, plans: rows };
      },
    }),

    // ── Engagement survey results (manager+, aggregate-only) ────
    get_engagement_results: tool({
      description:
        'Aggregate engagement-survey results: company favorability trend across periods, latest per-driver scores, and a department breakdown. AGGREGATE ONLY — never individual responses; departments under the anonymity threshold are suppressed. Requires manager role.',
      inputSchema: z.object({}),
      execute: async () => {
        if (!hasMinimumRole(ctx.userRole, 'manager')) return deny('manager');
        const periods = await ctx.db.query.surveyPeriods.findMany();
        const metrics = await ctx.db.query.surveyMetrics.findMany();
        const periodsSorted = [...periods].sort((a, b) => String(a.periodDate).localeCompare(String(b.periodDate)));

        const trend = periodsSorted.map((p) => {
          const m = metrics.find((x) => x.periodId === p.id && x.scope === 'company' && x.dimension === 'overall');
          return {
            period: p.label,
            date: String(p.periodDate),
            favorablePct: m ? num(m.favorablePct) : null,
            mean: m ? num(m.mean) : null,
            responseCount: p.responseCount,
            eligibleCount: p.eligibleCount,
          };
        });

        const latest = periodsSorted[periodsSorted.length - 1];
        let drivers: unknown[] = [];
        let departmentBreakdown: unknown[] = [];
        if (latest) {
          drivers = metrics
            .filter((x) => x.periodId === latest.id && x.scope === 'company' && x.dimension === 'driver')
            .map((x) => ({ driver: x.metricKey, favorablePct: num(x.favorablePct), mean: num(x.mean) }));
          departmentBreakdown = metrics
            .filter((x) => x.periodId === latest.id && x.scope === 'department' && x.dimension === 'overall')
            .map((x) =>
              x.responseCount < MIN_GROUP
                ? { department: x.department, suppressed: true, reason: `fewer than ${MIN_GROUP} responses` }
                : { department: x.department, favorablePct: num(x.favorablePct), mean: num(x.mean), responseCount: x.responseCount }
            );
        }

        // Live period computed from confidential responses — aggregate only.
        const responses = await ctx.db.query.engagementSurveyResponses.findMany();
        let live: unknown = null;
        if (responses.length) {
          const allVals: number[] = [];
          const byDept = new Map<string, number[]>();
          for (const r of responses) {
            const vals = Object.values(r.answers || {}).map(Number).filter((v) => !Number.isNaN(v));
            allVals.push(...vals);
            const d = r.department || 'Unspecified';
            if (!byDept.has(d)) byDept.set(d, []);
            byDept.get(d)!.push(...vals);
          }
          live = {
            period: 'Live (in progress)',
            responseCount: responses.length,
            favorablePct: favPct(allVals),
            mean: mean(allVals),
            departments: Array.from(byDept.entries()).map(([dept, arr]) => {
              const respCount = responses.filter((r) => (r.department || 'Unspecified') === dept).length;
              return respCount < MIN_GROUP
                ? { department: dept, suppressed: true, reason: `fewer than ${MIN_GROUP} respondents` }
                : { department: dept, favorablePct: favPct(arr), mean: mean(arr), respondents: respCount };
            }),
          };
        }

        return {
          note: 'Aggregate results only — individual responses are never exposed.',
          latestPeriod: latest?.label ?? null,
          trend,
          drivers,
          departmentBreakdown,
          live,
        };
      },
    }),

    // ── Exit survey summary (admin, aggregate-only) ────────────
    get_exit_survey_summary: tool({
      description:
        'Aggregate exit-survey summary: completed count, split by voluntary/involuntary, and average "surprise" scores. No names, roles, or free-text. Suppressed under the anonymity threshold. Requires admin role.',
      inputSchema: z.object({}),
      execute: async () => {
        if (!hasMinimumRole(ctx.userRole, 'admin')) return deny('admin');
        const rows = await ctx.db.query.exitSurveys.findMany();
        const complete = rows.filter((r) => r.status === 'complete');
        if (complete.length < MIN_GROUP)
          return {
            note: 'Aggregate only.',
            suppressed: true,
            message: `Fewer than ${MIN_GROUP} completed exit surveys — suppressed to protect anonymity.`,
          };
        const byType = complete.reduce((a, r) => {
          a[r.exitType] = (a[r.exitType] || 0) + 1;
          return a;
        }, {} as Record<string, number>);
        const avg = (k: 'surpriseEmployee' | 'surpriseManager') =>
          mean(complete.map((r) => r[k]).filter((x): x is number => x != null));
        return {
          note: 'Aggregate only — no names or free-text.',
          completed: complete.length,
          byType,
          avgSurpriseEmployee: avg('surpriseEmployee'),
          avgSurpriseManager: avg('surpriseManager'),
        };
      },
    }),

    // ── Manager survey results (admin, aggregate-only) ─────────
    get_manager_survey_results: tool({
      description:
        'Aggregate upward manager-survey results: overall mean, per-question means, and per-manager means. AGGREGATE ONLY — individual responses never exposed; any manager with fewer than the anonymity threshold of respondents is suppressed. Requires admin role.',
      inputSchema: z.object({}),
      execute: async () => {
        if (!hasMinimumRole(ctx.userRole, 'admin')) return deny('admin');
        const responses = await ctx.db.query.managerSurveyResponses.findMany();
        const complete = responses.filter((r) => r.status === 'complete');
        if (complete.length < MIN_GROUP)
          return {
            note: 'Aggregate only.',
            suppressed: true,
            message: `Fewer than ${MIN_GROUP} responses — suppressed to protect anonymity.`,
          };
        const questions = await ctx.db.query.managerSurveyQuestions.findMany();
        const byQuestion = questions.map((q) => {
          const vals = complete.map((r) => r.ratings?.[q.id]).filter((x): x is number => typeof x === 'number');
          return { question: q.text, mean: mean(vals), responses: vals.length };
        });
        const allVals = complete.flatMap((r) => Object.values(r.ratings || {}).map(Number).filter((v) => !Number.isNaN(v)));
        const byMgr = new Map<string, number[]>();
        for (const r of complete) {
          const m = r.managerName || 'Unknown';
          if (!byMgr.has(m)) byMgr.set(m, []);
          byMgr.get(m)!.push(...Object.values(r.ratings || {}).map(Number).filter((v) => !Number.isNaN(v)));
        }
        const byManager = Array.from(byMgr.entries()).map(([mgr, arr]) => {
          const respCount = complete.filter((r) => (r.managerName || 'Unknown') === mgr).length;
          return respCount < MIN_GROUP
            ? { manager: mgr, suppressed: true, reason: `fewer than ${MIN_GROUP} respondents` }
            : { manager: mgr, mean: mean(arr), respondents: respCount };
        });
        return {
          note: 'Aggregate only — individual responses never exposed.',
          totalResponses: complete.length,
          overallMean: mean(allVals),
          byQuestion,
          byManager,
        };
      },
    }),
  };
}
