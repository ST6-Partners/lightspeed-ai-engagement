// ============================================================
// CAPABILITIES — the per-page and per-action rules (AIE 2026-08-03)
//
// The Access grid answers one question per AREA: how far can this level see?
// It cannot say "eight of the eleven Core Data items", "two of the three tabs
// on Reviews", or "may receive a PIP but never write one" — those are page-
// and action-shaped, not reach-shaped.
//
// Those rules live here, in code, by PM decision: the model is a day old and
// expected to move once people use it, so pinning it into a settings screen
// now would be premature. The grid still governs area reach and stays
// editable. If this table starts changing weekly, that is the signal to
// promote it into the grid.
//
// This file is the single source of truth. The client mirrors it to hide
// things; the server enforces it. Hiding alone is not enforcement.
// ============================================================

import type { AccessLevel } from '../db/schema/accessControl.js';

// ── Pages ────────────────────────────────────────────────────
export const PAGES = [
  'organization', 'okrs', 'okr-analytics', 'weekly-plan',
  'pulses', 'reviews', 'development', 'engagement-survey',
  'insights', 'core-data',
] as const;
export type Page = (typeof PAGES)[number];

// ── Sub-tabs that are gated independently of their page ──────
// A user gives an upward review of their manager and reviews their peers, but
// does not author the regular review — they are on the receiving end of that.
export const REVIEW_TABS = ['reviews', 'manager', 'peer'] as const;
export type ReviewTab = (typeof REVIEW_TABS)[number];

// ── Core Data items ──────────────────────────────────────────
export const CORE_DATA_ITEMS = [
  'employees', 'job-titles', 'departments', 'values', 'performance-criteria',
  'rating-scale', 'checkin-questions', 'survey-questions', 'peer-review-questions',
  'engagement-questions', 'org-data', 'assessments',
] as const;
export type CoreDataItem = (typeof CORE_DATA_ITEMS)[number];

/** Withheld from a plain user: the instruments and the raw org/assessment data. */
const USER_HIDDEN_CORE_DATA: CoreDataItem[] = [
  'survey-questions', 'peer-review-questions', 'engagement-questions',
  'checkin-questions', 'org-data', 'assessments',
];

// ── Actions ──────────────────────────────────────────────────
// Verbs, not views. Each is checked server-side at its mutation.
export const ACTIONS = [
  'survey.run',                  // start, edit and send the engagement survey
  'survey.editQuestions',
  'survey.takeOwn',              // answer it — everyone
  'survey.viewResults',          // see the aggregate results
  'managerSurvey.editQuestions', // the instrument managers are rated WITH
  'managerSurvey.submit',        // fill one in about your own manager
  'pip.create',
  'coaching.create',
  'exitSurvey.send',             // send one TO somebody
  'exitSurvey.submitOwn',        // fill in your own — everyone
  'review.author',               // author a regular (downward) review
  'ninebox.rate',
  'priorities.set',
  'okr.edit',                    // create/edit objectives; linking one to a
                                 // weekly-plan action item is NOT this
  'employees.edit',
] as const;
export type Action = (typeof ACTIONS)[number];

interface Caps {
  pages: readonly Page[];
  reviewTabs: readonly ReviewTab[];
  coreDataItems: readonly CoreDataItem[];
  actions: readonly Action[];
}

const ALL_PAGES = PAGES;
const ALL_CORE_DATA = CORE_DATA_ITEMS;
const ALL_REVIEW_TABS = REVIEW_TABS;

// Everything except running the survey — that belongs to ELT and HR alone,
// deliberately including sysadmin in the exclusion (PM ruling). Sysadmin
// administers the system; it does not speak to the company.
const SYSADMIN_ACTIONS: Action[] = [
  'survey.takeOwn', 'survey.viewResults', 'managerSurvey.editQuestions', 'managerSurvey.submit',
  'pip.create', 'coaching.create', 'exitSurvey.send', 'exitSurvey.submitOwn',
  'review.author', 'ninebox.rate', 'priorities.set', 'okr.edit', 'employees.edit',
];

const SURVEY_OWNER_ACTIONS: Action[] = [...SYSADMIN_ACTIONS, 'survey.run', 'survey.editQuestions'];

// 'employees' is on this list as a READ. Editing the roster is employees.edit,
// which a user does not have — they see the directory, they cannot change it.

const CAPS: Record<AccessLevel, Caps> = {
  // Runs the system. Everything except addressing the company.
  sysadmin: {
    pages: ALL_PAGES, reviewTabs: ALL_REVIEW_TABS,
    coreDataItems: ALL_CORE_DATA, actions: SYSADMIN_ACTIONS,
  },
  // Runs the company. Everything, survey included.
  elt: {
    pages: ALL_PAGES, reviewTabs: ALL_REVIEW_TABS,
    coreDataItems: ALL_CORE_DATA, actions: SURVEY_OWNER_ACTIONS,
  },
  // Owns the people processes alongside ELT.
  hr: {
    pages: ALL_PAGES, reviewTabs: ALL_REVIEW_TABS,
    coreDataItems: ALL_CORE_DATA, actions: SURVEY_OWNER_ACTIONS,
  },
  // Everything their branch of the tree can justify — but not the instruments,
  // and they do not send surveys.
  // Reads Core Data in full, but does not edit the instrument they are rated
  // with — managerSurvey.editQuestions is deliberately absent (PM, 2026-08-03).
  manager: {
    pages: ALL_PAGES, reviewTabs: ALL_REVIEW_TABS,
    coreDataItems: ALL_CORE_DATA,
    // managerSurvey.submit is absent by PM ruling (2026-08-03): on the Manager
    // Review tab a manager reads what they were given, they do not author.
    // NOTE this also means a manager cannot review their own manager — flagged
    // to the PM rather than quietly softened.
    actions: [
      'survey.takeOwn', 'survey.viewResults',
      'pip.create', 'coaching.create', 'exitSurvey.send', 'exitSurvey.submitOwn',
      'review.author', 'ninebox.rate', 'priorities.set', 'okr.edit',
    ],
  },
  // Receives coaching, PIPs and reviews; authors none of them. Gives an upward
  // and a peer review, and fills in their own exit survey if asked.
  // Reads OKRs but does not author them — linking one to a weekly-plan action
  // item is a different thing and stays open. Takes the engagement survey but
  // never sees the results. Sees the Reviews tab as a read-only history of what
  // they have been given: reviewTabs keeps 'reviews' so the tab renders, and
  // review.author is absent so nothing on it can start one.
  user: {
    pages: ['okrs', 'okr-analytics', 'weekly-plan', 'pulses', 'reviews',
            'development', 'engagement-survey', 'core-data'],
    reviewTabs: ALL_REVIEW_TABS,
    coreDataItems: ALL_CORE_DATA.filter((i) => !USER_HIDDEN_CORE_DATA.includes(i)),
    actions: ['exitSurvey.submitOwn', 'survey.takeOwn', 'managerSurvey.submit'],
  },
};

export function capsFor(level: AccessLevel): Caps {
  return CAPS[level] ?? CAPS.user;
}

export function canDo(level: AccessLevel, action: Action): boolean {
  return capsFor(level).actions.includes(action);
}

export function canSeePage(level: AccessLevel, page: Page): boolean {
  return capsFor(level).pages.includes(page);
}

export function canSeeCoreDataItem(level: AccessLevel, item: CoreDataItem): boolean {
  return capsFor(level).coreDataItems.includes(item);
}

export function canSeeReviewTab(level: AccessLevel, tab: ReviewTab): boolean {
  return capsFor(level).reviewTabs.includes(tab);
}

/** One payload the client can mirror, so hiding and enforcing never drift. */
export function capabilityPayload(level: AccessLevel) {
  const c = capsFor(level);
  return {
    level,
    pages: [...c.pages],
    reviewTabs: [...c.reviewTabs],
    coreDataItems: [...c.coreDataItems],
    actions: [...c.actions],
  };
}
