import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Entities from './pages/Entities';
import Chat from './pages/Chat';
import Login from './pages/Login';
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
import Reviews from './pages/Reviews';
import CoachingPlans from './pages/CoachingPlans';
import CoachingPlanDetail from './pages/CoachingPlanDetail';
import CoreData from './pages/CoreData';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        {/* Planning */}
        <Route path="/organization" element={<Organization />} />
        <Route path="/okrs" element={<Okrs />} />
        <Route path="/weekly-plan" element={<WeeklyPlan />} />
        {/* Engagement */}
        <Route path="/check-ins" element={<CheckIns />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/coaching-plans" element={<CoachingPlans />} />
        <Route path="/coaching-plans/:id" element={<CoachingPlanDetail />} />
        <Route path="/pips" element={<Pips />} />
        <Route path="/pips/:id" element={<PipDetail />} />
        <Route path="/exit-survey" element={<ExitSurvey />} />
        <Route path="/engagement-survey" element={<EngagementSurvey />} />
        <Route path="/manager-survey" element={<ManagerSurvey />} />
        <Route path="/peer-review" element={<PeerReview />} />
        {/* Core Data */}
        <Route path="/core-data" element={<CoreData />} />
        <Route path="/core-data/employees" element={<Employees />} />
        <Route path="/core-data/job-titles" element={<JobTitles />} />
        <Route path="/core-data/departments" element={<Departments />} />
        <Route path="/core-data/survey-questions" element={<ManagerSurveyQuestions />} />
        <Route path="/core-data/peer-review-questions" element={<PeerReviewQuestions />} />
        <Route path="/core-data/rating-scale" element={<ManagerRatingScale />} />
        <Route path="/core-data/org-data" element={<OrgData />} />
        <Route path="/core-data/values" element={<CompanyValues />} />
        <Route path="/core-data/performance-criteria" element={<PerformanceCriteria />} />
        <Route path="/core-data/checkin-questions" element={<CheckinQuestions />} />
        <Route path="/core-data/assessments" element={<Assessments />} />
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
