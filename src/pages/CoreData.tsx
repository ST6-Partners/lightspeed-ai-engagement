// ============================================================
// CORE DATA — hub landing page
// Consolidates the former Core Data sidebar group into a single
// entry that opens this grid of cards. Each card navigates to the
// existing sub-page (routes unchanged in App.tsx).
// ============================================================

import { Link } from 'react-router-dom';
import {
  Contact, Briefcase, Building2, ListChecks, Gauge, Award,
  MessageCircle, ClipboardList,
} from 'lucide-react';

type Card = { path: string; label: string; desc: string; icon: typeof Contact };

// Order mirrors the former Core Data sidebar group.
const cards: Card[] = [
  { path: '/core-data/employees', label: 'Employees', icon: Contact,
    desc: 'The people directory — names, titles, departments, and managers.' },
  { path: '/core-data/job-titles', label: 'Job Titles', icon: Briefcase,
    desc: 'The shared title / level list used across PIPs, Employees, and surveys.' },
  { path: '/core-data/departments', label: 'Departments', icon: Building2,
    desc: 'The department list employees and PIPs are assigned to.' },
  { path: '/core-data/survey-questions', label: 'Survey Questions', icon: ListChecks,
    desc: 'The question set for the Manager Review.' },
  { path: '/core-data/peer-review-questions', label: 'Peer Review Questions', icon: ListChecks,
    desc: 'The question set for Peer Reviews.' },
  { path: '/core-data/rating-scale', label: 'Rating Scale', icon: Gauge,
    desc: 'The rating scale applied to manager reviews.' },
  { path: '/core-data/org-data', label: 'Org Data', icon: ListChecks,
    desc: 'Organization-level reference data.' },
  { path: '/core-data/values', label: 'Company Values', icon: Award,
    desc: 'The company values referenced across reviews and coaching.' },
  { path: '/core-data/performance-criteria', label: 'Performance Criteria', icon: Gauge,
    desc: 'The criteria used to evaluate performance.' },
  { path: '/core-data/checkin-questions', label: 'Check-in Questions', icon: MessageCircle,
    desc: 'The prompts used in recurring pulses / check-ins.' },
  { path: '/core-data/assessments', label: 'Assessments', icon: ClipboardList,
    desc: 'The assessment definitions available to the app.' },
];

export default function CoreData() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ls-ink">Core Data</h1>
        <p className="text-ls-ink-3 mt-1">
          The reference data that powers the app. Pick an area to view and manage it.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.path}
              to={c.path}
              className="group bg-white rounded-ls border border-ls-line p-5 shadow-ls hover:shadow-ls-2 hover:border-ls-blue transition-all"
            >
              <div className="inline-flex p-2.5 rounded-ls bg-ls-blue-50 text-ls-blue-deep mb-3 group-hover:bg-ls-active group-hover:text-white transition-colors">
                <Icon size={22} />
              </div>
              <h3 className="font-semibold text-ls-ink">{c.label}</h3>
              <p className="text-sm text-ls-ink-3 mt-1">{c.desc}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
