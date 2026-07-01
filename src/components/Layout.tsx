// ============================================================
// LAYOUT — Lightspeed left sidebar (DD-001/002) + top bar
// Auth guard: redirects to /login if not authenticated
// ============================================================

import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Users, Target, CalendarCheck, ClipboardList, DoorOpen,
  Settings, LogOut, MessageSquare, Briefcase, Building2, Contact, ClipboardCheck, FileText,
  UserCheck, ListChecks, Gauge,
} from 'lucide-react';
import NotificationBell from './NotificationBell';
import FeedbackDrawer from './FeedbackDrawer';
import WhatsNew from './WhatsNew';
import { trpc } from '../lib/trpc';

type NavItem = { path: string; label: string; icon: typeof Home };
type NavGroup = { label: string | null; items: NavItem[] };

// Information architecture per DD-002
const navGroups: NavGroup[] = [
  { label: null, items: [{ path: '/', label: 'Home', icon: Home }] },
  {
    label: 'Planning',
    items: [
      { path: '/organization', label: 'Organization', icon: Users },
      { path: '/okrs', label: 'OKRs', icon: Target },
      { path: '/weekly-plan', label: 'Weekly Plan', icon: CalendarCheck },
    ],
  },
  {
    label: 'Engagement',
    items: [
      { path: '/pips', label: 'PIP', icon: ClipboardList },
      { path: '/exit-survey', label: 'Exit Survey', icon: DoorOpen },
      { path: '/engagement-survey', label: 'Engagement Survey', icon: ClipboardCheck },
      { path: '/manager-survey', label: 'Manager Survey', icon: UserCheck },
    ],
  },
  {
    label: 'Core Data',
    items: [
      { path: '/core-data/employees', label: 'Employees', icon: Contact },
      { path: '/core-data/job-titles', label: 'Job Titles', icon: Briefcase },
      { path: '/core-data/departments', label: 'Departments', icon: Building2 },
      { path: '/core-data/survey-questions', label: 'Survey Questions', icon: ListChecks },
      { path: '/core-data/rating-scale', label: 'Rating Scale', icon: Gauge },
    ],
  },
  {
    label: 'Documents',
    items: [
      { path: '/documents/overview', label: 'Overview', icon: FileText },
    ],
  },
  { label: 'System', items: [{ path: '/admin/settings', label: 'Admin', icon: Settings }] },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showFeedback, setShowFeedback] = useState(false);

  const { data: user, isLoading } = trpc.auth.me.useQuery();
  const timezoneMutation = trpc.auth.updateTimezone.useMutation();
  const logoutMutation = trpc.auth.logout.useMutation();

  const handleLogout = async () => {
    localStorage.removeItem('auth_token');
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // ignore — redirect regardless
    }
    window.location.href = '/login';
  };

  useEffect(() => {
    if (!isLoading && !user) navigate('/login', { replace: true });
  }, [isLoading, user, navigate]);

  useEffect(() => {
    if (user) {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) timezoneMutation.mutate({ timezone: tz });
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ls-bg">
        <div className="text-sm text-ls-ink-3">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-60 bg-ls-slate text-[#B9C3CB] flex flex-col">
        <div className="px-4 py-4 flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-ls-active shadow-[0_4px_14px_rgba(79,169,214,.45)] shrink-0">
            <svg width="16" height="16" viewBox="0 0 40 40" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round">
              <path d="M11 8 a8.5 8.5 0 0 1 8.5 8.5 v7 a8.5 8.5 0 0 0 8.5 8.5" />
              <path d="M29 8 a8.5 8.5 0 0 0 -8.5 8.5 v7 a8.5 8.5 0 0 1 -8.5 8.5" />
            </svg>
          </span>
          <div className="leading-tight">
            <div className="text-white font-bold text-[15px]">Lightspeed</div>
            <div className="text-[11px] text-[#7E8B94]">AI Engagement</div>
          </div>
        </div>

        <nav className="flex-1 px-2 py-2 overflow-y-auto">
          {navGroups.map((group, gi) => (
            <div key={gi} className="mb-1">
              {group.label && (
                <div className="px-2.5 pt-3 pb-1.5 text-[10.5px] font-bold tracking-[0.12em] uppercase text-[#677480]">
                  {group.label}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm mb-0.5 transition-colors ${
                      active
                        ? 'bg-ls-active text-white font-medium shadow-[0_4px_14px_rgba(79,169,214,.3)]'
                        : 'text-[#B9C3CB] hover:bg-[#323D46] hover:text-white'
                    }`}
                  >
                    <Icon size={18} className={active ? 'opacity-100' : 'opacity-85'} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {user && (
          <div className="px-3 py-3 border-t border-[#36424B]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-ls-active text-white flex items-center justify-center text-xs font-bold">
                {user.name?.charAt(0) || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-[#E3E7EA] truncate">{user.name}</div>
                <div className="text-[11px] text-[#7E8B94]">{user.role}</div>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white/80 backdrop-blur border-b border-ls-line flex items-center justify-between px-6">
          <div />
          <div className="flex items-center gap-2">
            <WhatsNew />
            <NotificationBell />
            <button
              onClick={() => setShowFeedback(true)}
              className="p-2 text-ls-ink-3 hover:text-ls-ink-2 rounded-lg hover:bg-ls-bg-2 transition-colors"
              title="Submit Feedback"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-ls-ink-3 hover:text-ls-ink-2 rounded-lg hover:bg-ls-bg-2 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>

      <FeedbackDrawer open={showFeedback} onClose={() => setShowFeedback(false)} />
    </div>
  );
}
