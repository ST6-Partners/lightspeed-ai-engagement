import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Entities from './pages/Entities';
import Chat from './pages/Chat';
import Login from './pages/Login';
import AdminSettings from './pages/AdminSettings';
import Pips from './pages/Pips';
import PipDetail from './pages/PipDetail';
import { JobTitles, Departments, Employees } from './pages/admin';
import Organization from './pages/Organization';
import Okrs from './pages/Okrs';
import WeeklyPlan from './pages/WeeklyPlan';
import ExitSurvey from './pages/ExitSurvey';

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
        <Route path="/pips" element={<Pips />} />
        <Route path="/pips/:id" element={<PipDetail />} />
        <Route path="/exit-survey" element={<ExitSurvey />} />
        {/* Core Data */}
        <Route path="/core-data/employees" element={<Employees />} />
        <Route path="/core-data/job-titles" element={<JobTitles />} />
        <Route path="/core-data/departments" element={<Departments />} />
        {/* System */}
        <Route path="/admin/settings" element={<AdminSettings />} />
        {/* Retained template surfaces (not in primary nav) */}
        <Route path="/entities" element={<Entities />} />
        <Route path="/chat" element={<Chat />} />
      </Route>
    </Routes>
  );
}
