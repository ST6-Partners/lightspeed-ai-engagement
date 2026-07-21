// ============================================================
// ROOT tRPC ROUTER — merges all sub-routers
// ============================================================

import { router } from './trpc.js';
import { authRouter } from './routers/auth.js';
import { sampleEntityRouter } from './routers/sampleEntity.js';
import { adminRouter } from './routers/admin.js';
import { changelogRouter } from './routers/changelog.js';
import { notificationsRouter } from './routers/notifications.js';
import { telemetryRouter } from './routers/telemetry.js';
import { feedbackAdminRouter } from './routers/feedbackAdmin.js';
import { feedbackReviewRouter } from './routers/feedbackReview.js';
import { agentRouter } from './routers/agent.js';
import { feedbackApproveRouter } from './routers/feedbackApprove.js';
import { promptsRouter } from './routers/prompts.js';
import { systemRouter } from './routers/system.js';
import { emailTestRouter } from './routers/emailTest.js';
import { releasesRouter } from './routers/releases.js';
import { onboardingVideosRouter } from './routers/onboardingVideos.js';
import { chatRouter } from './routers/chat.js';
import { pipRouter } from './routers/pip.js';
import { jobTitlesRouter } from './routers/jobTitles.js';
import { organizationRouter } from './routers/organization.js';
import { okrsRouter } from './routers/okrs.js';
import { orgScreenRouter } from './routers/orgScreen.js';
import { weeklyPlanRouter } from './routers/weeklyPlan.js';
import { exitSurveyRouter } from './routers/exitSurvey.js';
import { departmentsRouter } from './routers/departments.js';
import { engagementSurveyRouter } from './routers/engagementSurvey.js';
import { engagementAnalyticsRouter } from './routers/engagementAnalytics.js';
import { managerSurveyQuestionsRouter } from './routers/managerSurveyQuestions.js';
import { managerRatingScaleRouter } from './routers/managerRatingScale.js';
import { managerSurveyRouter } from './routers/managerSurvey.js';
import { valuesRouter } from './routers/values.js';
import { performanceRouter } from './routers/performance.js';
import { coachingRouter } from './routers/coaching.js';
import { reviewSessionRouter } from './routers/reviewSession.js';
import { checkinsRouter } from './routers/checkins.js';
import { checkinQuestionsRouter } from './routers/checkinQuestions.js';
import { checkinSettingsRouter } from './routers/checkinSettings.js';
import { oneOnOneRouter } from './routers/oneOnOne.js';

export const appRouter = router({
  auth: authRouter,
  entity: sampleEntityRouter,
  admin: adminRouter,
  changelog: changelogRouter,
  notifications: notificationsRouter,
  telemetry: telemetryRouter,
  feedbackAdmin: feedbackAdminRouter,
  feedbackReview: feedbackReviewRouter,   // pre-submit AI review (SC-002 / Contract §5)
  agent: agentRouter,
  feedbackApprove: feedbackApproveRouter,                     // propose-and-approve auto-fix harness (SC-034)
  prompts: promptsRouter,
  system: systemRouter,
  emailTest: emailTestRouter,
  releases: releasesRouter,
  onboardingVideos: onboardingVideosRouter,
  chat: chatRouter,
  pip: pipRouter,
  jobTitles: jobTitlesRouter,
  organization: organizationRouter,
  okrs: okrsRouter,
  orgScreen: orgScreenRouter,
  weeklyPlan: weeklyPlanRouter,
  oneOnOne: oneOnOneRouter,
  exitSurvey: exitSurveyRouter,
  departments: departmentsRouter,
  engagementSurvey: engagementSurveyRouter,
  engagementAnalytics: engagementAnalyticsRouter,
  managerSurveyQuestions: managerSurveyQuestionsRouter,
  managerRatingScale: managerRatingScaleRouter,
  managerSurvey: managerSurveyRouter,
  values: valuesRouter,
  performance: performanceRouter,
  coaching: coachingRouter,
  reviewSession: reviewSessionRouter,
  checkins: checkinsRouter,
  checkinQuestions: checkinQuestionsRouter,
  checkinSettings: checkinSettingsRouter,
});

export type AppRouter = typeof appRouter;
