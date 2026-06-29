// Unit tests for PIP pure business rules.
// Run:  npx tsx server/src/routers/pip.logic.test.ts
// (No DB or server needed — these are pure functions.)

import assert from 'node:assert/strict';
import {
  canTransition, isTerminal, isPipEditor, isSubject, canEditComments, canSignRole,
  type ActorLite, type PipLite,
} from './pip.logic.js';

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.equal(cond, true, label);
  passed++;
}

// ── fixtures ───────────────────────────────────────────────
const pip: PipLite = { employeeId: 'emp', managerId: 'mgr', hrPartnerId: 'hr', createdBy: 'mgr' };
const employee: ActorLite = { id: 'emp', role: 'user' };
const manager: ActorLite  = { id: 'mgr', role: 'manager' };
const hr: ActorLite       = { id: 'hr',  role: 'user' };
const admin: ActorLite    = { id: 'zzz', role: 'admin' };
const sysadmin: ActorLite = { id: 'yyy', role: 'sysadmin' };
const stranger: ActorLite = { id: 'who', role: 'user' };

// ── status workflow ────────────────────────────────────────
ok('draft → active allowed',            canTransition('draft', 'active'));
ok('draft → cancelled allowed',         canTransition('draft', 'cancelled'));
ok('draft → completed_met BLOCKED',    !canTransition('draft', 'completed_met'));
ok('active → extended allowed',         canTransition('active', 'extended'));
ok('active → completed_met allowed',    canTransition('active', 'completed_met'));
ok('extended → completed_not_met ok',   canTransition('extended', 'completed_not_met'));
ok('extended → active BLOCKED',        !canTransition('extended', 'active'));
ok('completed_met is terminal (no out)',!canTransition('completed_met', 'active'));
ok('cancelled is terminal (no out)',   !canTransition('cancelled', 'active'));
ok('same → same is a no-op (allowed)',  canTransition('active', 'active'));

ok('completed_met is terminal',  isTerminal('completed_met'));
ok('completed_not_met terminal', isTerminal('completed_not_met'));
ok('cancelled is terminal',      isTerminal('cancelled'));
ok('active is NOT terminal',    !isTerminal('active'));
ok('draft is NOT terminal',    !isTerminal('draft'));

// ── edit permission ────────────────────────────────────────
ok('manager can edit',        isPipEditor(manager, pip));
ok('hr can edit',             isPipEditor(hr, pip));
ok('creator can edit',        isPipEditor({ id: 'mgr', role: 'user' }, pip));
ok('admin can edit',          isPipEditor(admin, pip));
ok('sysadmin can edit',       isPipEditor(sysadmin, pip));
ok('employee canNOT edit',   !isPipEditor(employee, pip));
ok('stranger canNOT edit',   !isPipEditor(stranger, pip));

// ── subject + comments ─────────────────────────────────────
ok('employee is the subject',     isSubject(employee, pip));
ok('manager is not the subject', !isSubject(manager, pip));
ok('subject may edit comments',   canEditComments(employee, pip));
ok('editor may edit comments',    canEditComments(manager, pip));
ok('stranger may NOT comment',   !canEditComments(stranger, pip));

// ── signatures ─────────────────────────────────────────────
ok('subject signs own employee line',     canSignRole(employee, pip, 'employee'));
ok('manager may sign employee line',       canSignRole(manager, pip, 'employee'));
ok('stranger canNOT sign employee line',  !canSignRole(stranger, pip, 'employee'));
ok('employee canNOT sign manager line',   !canSignRole(employee, pip, 'manager'));
ok('hr may sign manager line (editor)',    canSignRole(hr, pip, 'manager'));
ok('admin may sign reviewer line',         canSignRole(admin, pip, 'reviewer'));

console.log(`\n✓ all ${passed} PIP business-rule assertions passed`);
