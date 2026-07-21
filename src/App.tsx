import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Entities from './pages/Entities';
import Chat from './pages/Chat';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import AdminSettings from './pages/AdminSettings';
import Pips from './pages/Pips';
import PipDetail from './pages/PipDetail';
import { JobTitles, Departments, Employees, ManagerSurveyQuestions, ManagerRatingScale, OrgData, CompanyValues, PerformanceCriteria, CheckinQuestions, Assessments, PeerReviewQuestions } from './pages/admin';
import Organization from './pages/Organization';
import Okrs from './pages/Okrs';
import WeeklyPlan from './pages/WeeklyPlan';
import ExitSurvey from './pages/ExitSurvey';
import EngagementSurvey from './pages/EngagementSurvey';
import ManagerSurvey from './pages/ManagerSurvey';
import PeerReview from './pages/PeerReview';
import Overview from './pages/Overview';
import CheckIns from './pages/CheckIns';
import Metrics from './pages/Metrics';
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
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        {/* Planning */}
        <Route path="/organization" element={<Organization />} />
        <Route path="/okrs" element={<Okrs />} />
        <Route path="/weekly-plan" element={<WeeklyPlan />} />
        {/* Engagement */}
        <Route path="/check-ins" element={<CheckIns />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/development" element={<Development />} />
        <Route path="/coaching-plans" element={<CoachingPlans />} />
        <Route path="/coaching-plans/:id" element={<CoachingPlanDetail />} />
        <Route path="/pips" element={<Pips />} />
        <Route path="/pips/:id" element={<PipDetail />} />
        <Route path="/exit-survey" element={<ExitSurvey />} />
        <Route path="/engagement-survey" element={<EngagementSurvey />} />
        <Route path="/manager-survey" element={<ManagerSurvey />} />
        <Route path="/peer-review" element={<PeerReview />} />
        {/* Core Data */}
        <Route path="/core-data">
          <Route index element={<CoreData />} />
          <Route element={<CoreDataSubLayout />}>
            <Route path="employees" element={<Employees />} />
            <Route path="job-titles" element={<JobTitles />} />
            <Route path="departments" element={<Departments />} />
            <Route path="survey-questions" element={<ManagerSurveyQuestions />} />
            <Route path="peer-review-questions" element={<PeerReviewQuestions />} />
            <Route path="rating-scale" element={<ManagerRatingScale />} />
            <Route path="org-data" element={<OrgData />} />
            <Route path="values" element={<CompanyValues />} />
            <Route path="performance-criteria" element={<PerformanceCriteria />} />
            <Route path="checkin-questions" element={<CheckinQuestions />} />
            <Route path="assessments" element={<Assessments />} />
          </Route>
        </Route>
        {/* Metrics (manager+) */}
        <Route path="/metrics" element={<Metrics />} />
        {/* Documents */}
        <Route path="/documents/overview" element={<Overview />} />
        {/* System */}
        <Route path="/admin/settings" element={<AdminSettings />} />
        {/* Retained template surfaces (not in primary nav) */}
        <Route path="/entities" element={<Entities />} />
        <Route path="/chat" element={<Chat />} />
      </Route>
    </Routes>
  );
}
