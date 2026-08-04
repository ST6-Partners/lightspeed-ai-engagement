// ============================================================
// CORE DATA — hub landing page
// Consolidates the former Core Data sidebar group into a single
// entry that opens this grid of cards. Each card navigates to the
// existing sub-page (routes unchanged in App.tsx).
// ============================================================

import { Link } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import {
  Contact, Briefcase, Building2, ListChecks, Gauge, Award,
  MessageCircle, ClipboardList,
} from 'lucide-react';

type Card = { path: string; label: string; desc: string; icon: typeof Contact; item?: string };

// Order mirrors the former Core Data sidebar group.
const cards: Card[] = [
  { item: 'employees', path: '/core-data/employees', label: 'Employees', icon: Contact,
    desc: 'The people directory — names, titles, departments, and managers.' },
  { item: 'job-titles', path: '/core-data/job-titles', label: 'Job Titles', icon: Briefcase,
    desc: 'The shared title / level list used across PIPs, Employees, and surveys.' },
  { item: 'departments', path: '/core-data/departments', label: 'Departments', icon: Building2,
    desc: 'The department list employees and PIPs are assigned to.' },
  { item: 'survey-questions', path: '/core-data/survey-questions', label: 'Survey Questions', icon: ListChecks,
    desc: 'The question set for the Manager Review.' },
  { item: 'peer-review-questions', path: '/core-data/peer-review-questions', label: 'Peer Review Questions', icon: ListChecks,
    desc: 'The question set for Peer Reviews.' },
  { item: 'rating-scale', path: '/core-data/rating-scale', label: 'Rating Scale', icon: Gauge,
    desc: 'The rating scale applied to manager reviews.' },
  { item: 'org-data', path: '/core-data/org-data', label: 'Org Data', icon: ListChecks,
    desc: 'Organization-level reference data.' },
  { item: 'values', path: '/core-data/values', label: 'Company Values', icon: Award,
    desc: 'The company values referenced across reviews and coaching.' },
  { item: 'performance-criteria', path: '/core-data/performance-criteria', label: 'Performance Criteria', icon: Gauge,
    desc: 'The criteria used to evaluate performance.' },
  { item: 'checkin-questions', path: '/core-data/checkin-questions', label: 'Pulse Questions', icon: MessageCircle,
    desc: 'The prompts used in recurring pulses / check-ins.' },
  { item: 'engagement-questions', path: '/core-data/engagement-questions', label: 'Engagement Questions', icon: ListChecks,
    desc: 'Add, remove, or toggle the questions on the engagement survey.' },
  { item: 'assessments', path: '/core-data/assessments', label: 'Assessments', icon: ClipboardList,
    desc: 'The assessment definitions available to the app.' },
];

export default function CoreData() {
  // The hub keeps its own card list, so filtering the sidebar alone left every
  // page one click away here. Same capability table the server enforces.
  const { data: caps } = trpc.accessControl.myCapabilities.useQuery();
  const visible = cards.filter((c) => !c.item || !caps || (caps.coreDataItems as string[]).includes(c.item));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ls-ink">Core Data</h1>
        <p className="text-ls-ink-3 mt-1">
          The reference data that powers the app. Pick an area to view and manage it.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((c) => {
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
