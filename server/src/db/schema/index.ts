// Schema barrel export — all tables
// Template App SP-002 scaffold

// Core (4 tables)
// Sessions are stored in Postgres via connect-pg-simple (the
// `auth_sessions` table, created on first run by getSessionMiddleware).
export { users, userPreferences, appSettings, screenInventory } from './core.js';

// Feedback (4 tables) — SC-002 feedback + AI review + agent (SC-034)
export { feedback, feedbackAttachments, feedbackReviewAttempts, agentRuns } from './feedback.js';

// Audit (2 tables)
export { changeLog, changeBatches } from './audit.js';

// Telemetry (3 tables)
export { userActivityLog, chatDebugLog, chatSessionLogs } from './telemetry.js';

// AI & Prompts (4 tables)
export { promptTemplates, designKnowledge, faqEntries, chatAttachments } from './ai.js';

// Notifications (2 tables)
export { notifications, releaseNotes } from './notifications.js';

// Access requests (self-service request-access to locked sections)
export { accessRequests } from './accessRequests.js';

// System Operations (3 tables)
export { systemJobs, backupLog, onboardingVideos } from './system.js';

// Sample Domain Entity (1 table) — adopters replace with their domain
export { sampleEntities } from './sampleEntity.js';

// Total: 23 tables (22 infrastructure + 1 sample domain)

export { departments } from './departments.js';
export { passwordResetTokens } from './passwordResetTokens.js';
export { jobTitles } from './jobTitles.js';
export {
  pips, pipConcerns, pipGoals, pipSupports, pipCheckins, pipSignatures,
} from './pip.js';

// New surfaces (DD-002): Planning + Engagement backends
export { okrNodes } from './okr.js';
export { weeklyCheckins } from './weeklyPlan.js';
export { exitSurveys } from './exitSurvey.js';

// Email (1 table) — inbound/test inbox
export { inboundEmails } from './email.js';

// Engagement Survey (1 table) — periodic engagement survey (15Five Engage parity)
export { engagementSurveyResponses } from './engagementSurvey.js';

// Engagement analytics (2 tables) — survey periods + aggregate metrics fact table
export { surveyPeriods, surveyMetrics } from './engagementAnalytics.js';
export { engagementSurveyQuestions } from './engagementSurveyQuestions.js';
export { engagementSurveyVersions, engagementSurveyVersionQuestions } from './engagementSurveyVersions.js';

// Manager Survey (3 tables) — questions lookup + rating scale + responses
export { managerSurveyQuestions, managerRatingScale, managerSurveyResponses } from './managerSurvey.js';

// Org Screen (Stage 1) — priorities + 9 box + engagement snapshots
export { priorities, nineBoxRatings, engagementSnapshots } from './orgScreen.js';
// Org Screen (Stage 2) — Assessments + Review
export {
  assessmentSummaries, assessmentCcatSections, assessmentEppAttributes,
  assessmentInsightProfiles, reviewCycles, reviewValueDetails,
} from './orgScreen.js';

// Company Values (read-only cache from ATA) + employee value evaluations (Reviews section, 2026-07-08)
export { companyValues, reviewPeriods } from './values.js';
// Shared employee reviews (values + performance), 2026-07-09 consolidation
export { reviews, reviewScores } from './reviews.js';
// Review session container (the Reviews feature; groups both passes + go-forward — 2026-07-14)
export { reviewSessions } from './reviewSessions.js';

// Performance criteria (AIE-owned) + employee performance evaluations (Reviews section, 2026-07-09)
export { performanceCriteria } from './performance.js';

// Weekly Check-in pulse (standalone, 2026-07-08)
export { checkinResponses } from './checkins.js';
export { checkinQuestions, checkinSettings } from './checkins.js';

// Coaching Plans (crafted from a review; AI-drafted narrative, PDF export — 2026-07-09)
export { coachingPlans, coachingPlanFocusAreas } from './coaching.js';

// 1:1 Hub (Reviews rework, 2026-07-21) — pair-scoped talking points, action items, notes
export { talkingPoints, actionItems, oneOnOneNotes } from './oneOnOne.js';

// Peer Review (2026-07-21) — lateral peer feedback; reuses manager_rating_scale
export { peerReviewQuestions, peerReviewResponses } from './peerReview.js';
