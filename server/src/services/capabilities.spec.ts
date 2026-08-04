// Capability assertions, checked against the PM spec agreed 2026-08-03.
// Run: npx tsx server/src/services/capabilities.spec.ts
import { canDo, canSeeCoreDataItem, canSeeReviewTab, canSeePage, canSeeExitPart } from './capabilities.js';

let fail = 0;
const t = (name: string, got: boolean, want: boolean) => {
  const ok = got === want;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS  ' : 'FAIL  '}${name}${ok ? '' : `  got ${got} want ${want}`}`);
};

// Who runs the survey — ELT and HR only, sysadmin deliberately excluded.
t('ELT runs the survey', canDo('elt', 'survey.run'), true);
t('HR runs the survey', canDo('hr', 'survey.run'), true);
t('Sysadmin does NOT run the survey', canDo('sysadmin', 'survey.run'), false);
t('Sysadmin does NOT edit survey questions', canDo('sysadmin', 'survey.editQuestions'), false);
t('Manager does not run the survey', canDo('manager', 'survey.run'), false);
t('User does not run the survey', canDo('user', 'survey.run'), false);

// A user receives; it never sends.
t('User cannot create a PIP', canDo('user', 'pip.create'), false);
t('User cannot create a coaching plan', canDo('user', 'coaching.create'), false);
t('User cannot send an exit survey', canDo('user', 'exitSurvey.send'), false);
t('User CAN fill in their own exit survey', canDo('user', 'exitSurvey.submitOwn'), true);
t('User cannot author a regular review', canDo('user', 'review.author'), false);
t('Manager can create a PIP', canDo('manager', 'pip.create'), true);
t('Manager can send an exit survey', canDo('manager', 'exitSurvey.send'), true);

// Pages a user gets, and the one they lose.
t('User has no Organization', canSeePage('user', 'organization'), false);
t('User has OKRs', canSeePage('user', 'okrs'), true);
t('User has OKR Analytics', canSeePage('user', 'okr-analytics'), true);
t('User has Weekly Plan', canSeePage('user', 'weekly-plan'), true);
t('User has Pulses', canSeePage('user', 'pulses'), true);
t('User has Reviews', canSeePage('user', 'reviews'), true);
t('User has Core Data', canSeePage('user', 'core-data'), true);
t('Manager keeps Organization', canSeePage('manager', 'organization'), true);

// Reviews: gives upward and peer, receives the regular one.
// Revised 2026-08-03 (second pass): the tab is SHOWN to a user, but as a
// read-only history of reviews they have been given. review.author is what
// removes the "New review" button, not hiding the tab.
t('User Reviews — regular tab shown, read-only', canSeeReviewTab('user', 'reviews'), true);
t('User Reviews — manager tab shown', canSeeReviewTab('user', 'manager'), true);
t('User Reviews — peer tab shown', canSeeReviewTab('user', 'peer'), true);
t('Manager Reviews — regular tab shown', canSeeReviewTab('manager', 'reviews'), true);

// Core Data: the three exclusions, and proof the rest stays.
t('User Core Data — no survey questions', canSeeCoreDataItem('user', 'survey-questions'), false);
t('User Core Data — no peer review questions', canSeeCoreDataItem('user', 'peer-review-questions'), false);
t('User Core Data — no engagement questions', canSeeCoreDataItem('user', 'engagement-questions'), false);
t('User Core Data — no assessments', canSeeCoreDataItem('user', 'assessments'), false);
t('User Core Data — no org data', canSeeCoreDataItem('user', 'org-data'), false);
t('User Core Data — job titles kept', canSeeCoreDataItem('user', 'job-titles'), true);
t('User Core Data — departments kept', canSeeCoreDataItem('user', 'departments'), true);
t('User Core Data — company values kept', canSeeCoreDataItem('user', 'values'), true);
t('User Core Data — rating scale kept', canSeeCoreDataItem('user', 'rating-scale'), true);
t('User Core Data — performance criteria kept', canSeeCoreDataItem('user', 'performance-criteria'), true);
// Revised 2026-08-03: pulse (check-in) questions are an instrument too, so
// they join the hidden set. Also relabelled Pulse Questions in the UI.
t('User Core Data — pulse questions hidden', canSeeCoreDataItem('user', 'checkin-questions'), false);

// ── Second pass, 2026-08-03 ──────────────────────────────────
t('User reads OKRs but cannot edit them', canDo('user', 'okr.edit'), false);
t('Manager can edit OKRs', canDo('manager', 'okr.edit'), true);
t('User CAN take the engagement survey', canDo('user', 'survey.takeOwn'), true);
t('User canNOT see survey results', canDo('user', 'survey.viewResults'), false);
t('Manager can see survey results', canDo('manager', 'survey.viewResults'), true);
t('User has the engagement survey page', canSeePage('user', 'engagement-survey'), true);
t('User has no Insights page', canSeePage('user', 'insights'), false);
t('User can view the employee directory', canSeeCoreDataItem('user', 'employees'), true);
t('User cannot edit employees', canDo('user', 'employees.edit'), false);
t('Manager can read all of Core Data', canSeeCoreDataItem('manager', 'org-data'), true);
t('Manager cannot edit the manager-survey questions', canDo('manager', 'managerSurvey.editQuestions'), false);
t('HR can edit the manager-survey questions', canDo('hr', 'managerSurvey.editQuestions'), true);
t('Sysadmin can edit the manager-survey questions', canDo('sysadmin', 'managerSurvey.editQuestions'), true);

// ── Third pass, 2026-08-03 ───────────────────────────────────
t('User fills in a manager survey', canDo('user', 'managerSurvey.submit'), true);
t('Manager does NOT fill one in — reads what they were given', canDo('manager', 'managerSurvey.submit'), false);
t('User cannot send an exit survey (Development create hidden)', canDo('user', 'exitSurvey.send'), false);
t('Manager reads Core Data — org data', canSeeCoreDataItem('manager', 'org-data'), true);
t('Manager reads Core Data — assessments', canSeeCoreDataItem('manager', 'assessments'), true);
t('Manager reads Core Data — pulse questions', canSeeCoreDataItem('manager', 'checkin-questions'), true);

// ── Exit-survey sides, 2026-08-03 ────────────────────────────
// Two blind halves plus a comparison; each level sees exactly one.
t('User sees Part A only — not B', canSeeExitPart('user', 'a') && !canSeeExitPart('user', 'b'), true);
t('User does NOT see the HR comparison', canSeeExitPart('user', 'comparison'), false);
t('Manager sees Part B only — not A', canSeeExitPart('manager', 'b') && !canSeeExitPart('manager', 'a'), true);
t('Manager does NOT see the HR comparison', canSeeExitPart('manager', 'comparison'), false);
t('HR sees the comparison', canSeeExitPart('hr', 'comparison'), true);
t('HR does NOT fill in Part A', canSeeExitPart('hr', 'a'), false);
t('HR does NOT fill in Part B', canSeeExitPart('hr', 'b'), false);

console.log(fail ? `\n${fail} FAILED` : `\nAll ${'assertions'} passed`);
process.exit(fail ? 1 : 0);
