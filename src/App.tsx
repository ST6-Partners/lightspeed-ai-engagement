import { Routes, Route, Navigate } from 'react-router-dom';
import AreaGuard from './components/AreaGuard';
import ItemGuard from './components/ItemGuard';
import Layout from './components/Layout';
import Home from './pages/Home';
import Entities from './pages/Entities';
import Chat from './pages/Chat';
import Login from './pages/Login';
import Profile from './pages/Profile';
import ResetPassword from './pages/ResetPassword';
import SetPassword from './pages/SetPassword';
import AdminSettings from './pages/AdminSettings';
import Pips from './pages/Pips';
import PipDetail from './pages/PipDetail';
import { JobTitles, Departments, Employees, ManagerSurveyQuestions, ManagerRatingScale, OrgData, CompanyValues, PerformanceCriteria, CheckinQuestions, Assessments, PeerReviewQuestions, EngagementQuestions } from './pages/admin';
import Organization from './pages/Organization';
import Okrs from './pages/Okrs';
import OkrAnalytics from './pages/OkrAnalytics';
import WeeklyPlan from './pages/WeeklyPlan';
import ExitSurvey from './pages/ExitSurvey';
import EngagementSurvey from './pages/EngagementSurvey';
import CheckIns from './pages/CheckIns';
import ManagerEffectiveness from './pages/ManagerEffectiveness';
import ManagerBrief from './pages/ManagerBrief';
import InsightsDashboard from './pages/InsightsDashboard';
import Reviews from './pages/Reviews';
import CoachingPlans from './pages/CoachingPlans';
import Development from './pages/Development';
import CoachingPlanDetail from './pages/CoachingPlanDetail';
import CoreData from './pages/CoreData';
import CoreDataSubLayout from './components/CoreDataSubLayout';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      {/* First sign-in password change. Outside <Layout /> on purpose — the person
          is authenticated but must not reach the app until they've chosen a
          password, and Layout is what routes them here. */}
      <Route path="/set-password" element={<SetPassword />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        {/* Planning */}
        <Route element={<AreaGuard area="planning" />}>
          <Route path="/organization" element={<Organization />} />
          <Route path="/okrs" element={<Okrs />} />
          <Route path="/okr-analytics" element={<OkrAnalytics />} />
          <Route path="/weekly-plan" element={<WeeklyPlan />} />
        </Route>
        {/* Engagement */}
        <Route element={<AreaGuard area="engagement" />}>
          <Route path="/check-ins" element={<CheckIns />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/development" element={<Development />} />
          <Route path="/coaching-plans" element={<CoachingPlans />} />
          <Route path="/coaching-plans/:id" element={<CoachingPlanDetail />} />
          <Route path="/pips" element={<Pips />} />
          <Route path="/pips/:id" element={<PipDetail />} />
          <Route path="/exit-survey" element={<ExitSurvey />} />
          <Route path="/engagement-survey" element={<EngagementSurvey />} />
        </Route>
        <Route path="/profile" element={<Profile />} />
        <Route path="/manager-survey" element={<Navigate to="/reviews?tab=manager" replace />} />
        <Route path="/peer-review" element={<Navigate to="/reviews?tab=peer" replace />} />
        {/* Documents -> Overview was removed 2026-08-05; old links land on Core Data. */}
        <Route path="/documents/overview" element={<Navigate to="/core-data" replace />} />
        {/* Core Data */}
        <Route path="/core-data" element={<AreaGuard area="documents" />}>
          <Route index element={<CoreData />} />
          <Route element={<CoreDataSubLayout />}>
            <Route path="employees" element={<ItemGuard item="employees"><Employees readOnly /></ItemGuard>} />
            <Route path="job-titles" element={<ItemGuard item="job-titles"><JobTitles /></ItemGuard>} />
            <Route path="departments" element={<ItemGuard item="departments"><Departments /></ItemGuard>} />
            <Route path="survey-questions" element={<ItemGuard item="survey-questions"><ManagerSurveyQuestions /></ItemGuard>} />
            <Route path="peer-review-questions" element={<ItemGuard item="peer-review-questions"><PeerReviewQuestions /></ItemGuard>} />
            <Route path="rating-scale" element={<ItemGuard item="rating-scale"><ManagerRatingScale /></ItemGuard>} />
            <Route path="org-data" element={<ItemGuard item="org-data"><OrgData /></ItemGuard>} />
            <Route path="values" element={<ItemGuard item="values"><CompanyValues /></ItemGuard>} />
            <Route path="performance-criteria" element={<ItemGuard item="performance-criteria"><PerformanceCriteria /></ItemGuard>} />
            <Route path="checkin-questions" element={<ItemGuard item="checkin-questions"><CheckinQuestions /></ItemGuard>} />
            <Route path="engagement-questions" element={<ItemGuard item="engagement-questions"><EngagementQuestions /></ItemGuard>} />
            <Route path="assessments" element={<ItemGuard item="assessments"><AreaGuard area="assessments"><Assessments /></AreaGuard></ItemGuard>} />
          </Route>
        </Route>
        {/* Insights (manager+) */}
        <Route element={<AreaGuard area="insights" />}>
          <Route path="/insights" element={<InsightsDashboard />} />
          <Route path="/manager-brief" element={<ManagerBrief />} />
          <Route path="/manager-effectiveness" element={<ManagerEffectiveness />} />
        </Route>
        {/* Documents */}
        {/* System */}
        <Route path="/admin/settings" element={<AdminSettings />} />
        {/* Retained template surfaces (not in primary nav) */}
        <Route path="/entities" element={<Entities />} />
        <Route path="/chat" element={<Chat />} />
      </Route>
    </Routes>
  );
}
