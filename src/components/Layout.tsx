// ============================================================
// LAYOUT — Lightspeed left sidebar (DD-001/002) + top bar
// Auth guard: redirects to /login if not authenticated
// ============================================================

import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bot, MessageCircle, Star, Database,
  Home, Users, Target, CalendarCheck, ClipboardList, DoorOpen,
  Settings, LogOut, MessageSquare, ClipboardCheck, FileText,
  UserCheck, ChevronsLeft, ChevronsRight, HeartHandshake, BarChart3,
  ChevronDown, ChevronRight, Sparkles} from 'lucide-react';
import NotificationBell from './NotificationBell';
import FeedbackDrawer from './FeedbackDrawer';
import WhatsNew from './WhatsNew';
import { trpc } from '../lib/trpc';

type RoleTier = 'user' | 'manager' | 'admin' | 'sysadmin';
type NavItem = { path: string; label: string; icon: typeof Home; minRole?: RoleTier; children?: { path: string; label: string }[] };
type NavGroup = { label: string | null; items: NavItem[] };

// Information architecture per DD-002
const navGroups: NavGroup[] = [
  {
    label: 'Planning',
    items: [
      { path: '/organization', label: 'Organization', icon: Users },
      { path: '/okrs', label: 'OKRs', icon: Target },
      { path: '/okr-analytics', label: 'OKR Analytics', icon: BarChart3, minRole: 'manager' },
      { path: '/weekly-plan', label: 'Weekly Plan', icon: CalendarCheck },
    ],
  },
  {
    label: 'Engagement',
    // Order mirrors the Documents → Overview chart's Engagement row.
    items: [
      { path: '/check-ins', label: 'Pulses', icon: MessageCircle },
      { path: '/reviews', label: 'Reviews', icon: Star, children: [
        { path: '/reviews?tab=reviews', label: 'Reviews' },
        { path: '/reviews?tab=manager', label: 'Manager Review' },
        { path: '/reviews?tab=peer', label: 'Peer Review' },
      ] },
      { path: '/development', label: 'Development', icon: HeartHandshake, children: [
        { path: '/development?tab=coaching', label: 'Coaching Plans' },
        { path: '/development?tab=pip', label: 'PIP' },
        { path: '/development?tab=exit', label: 'Exit Survey' },
      ] },
      { path: '/engagement-survey', label: 'Engagement Survey', icon: ClipboardCheck },
    ],
  },
  {
    label: 'Documents',
    items: [
      { path: '/documents/overview', label: 'Overview', icon: FileText },
      { path: '/core-data', label: 'Core Data', icon: Database, children: [
        { path: '/core-data/employees', label: 'Employees' },
        { path: '/core-data/job-titles', label: 'Job Titles' },
        { path: '/core-data/departments', label: 'Departments' },
        { path: '/core-data/survey-questions', label: 'Survey Questions' },
        { path: '/core-data/peer-review-questions', label: 'Peer Review Questions' },
        { path: '/core-data/rating-scale', label: 'Rating Scale' },
        { path: '/core-data/org-data', label: 'Org Data' },
        { path: '/core-data/values', label: 'Company Values' },
        { path: '/core-data/performance-criteria', label: 'Performance Criteria' },
        { path: '/core-data/checkin-questions', label: 'Check-in Questions' },
        { path: '/core-data/engagement-questions', label: 'Engagement Questions' },
        { path: '/core-data/assessments', label: 'Assessments' },
      ] },
    ],
  },
  {
    label: 'Insights',
    items: [
      { path: '/insights', label: 'Insights Dashboard', icon: BarChart3, minRole: 'manager', children: [
        { path: '/insights?tab=brief', label: 'Manager Brief' },
        { path: '/insights?tab=metrics', label: 'Metrics' },
        { path: '/insights?tab=effectiveness', label: 'Manager Effectiveness' },
      ] },
    ],
  },
  { label: 'System', items: [{ path: '/admin/settings', label: 'Admin', icon: Settings }] },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showFeedback, setShowFeedback] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('nav.collapsed') === '1'; } catch { return false; }
  });
  const toggleNav = () => setNavCollapsed((v) => {
    const n = !v;
    try { localStorage.setItem('nav.collapsed', n ? '1' : '0'); } catch { /* noop */ }
    return n;
  });

  // Per-parent expand state for sidebar dropdowns (Reviews, Core Data).
  const [navExpanded, setNavExpanded] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('nav.expanded') || '{}'); } catch { return {}; }
  });
  const toggleExpand = (path: string) => setNavExpanded((prev) => {
    const next = { ...prev, [path]: !(prev[path] ?? false) };
    try { localStorage.setItem('nav.expanded', JSON.stringify(next)); } catch { /* noop */ }
    return next;
  });

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

  const ROLE_ORDER: Record<string, number> = { user: 1, manager: 2, admin: 3, sysadmin: 4 };
  const meetsRole = (min: RoleTier) => (ROLE_ORDER[user?.role ?? 'user'] ?? 0) >= (ROLE_ORDER[min] ?? 0);
  const visibleGroups = navGroups
    .map((g) => ({ ...g, items: g.items.filter((it) => !it.minRole || meetsRole(it.minRole)) }))
    .filter((g) => g.items.length > 0);

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  // A sub-page link is active when the pathname matches; for the query-driven
  // Reviews tabs, also compare the ?tab= value (absent tab === 'reviews').
  const isChildActive = (childPath: string) => {
    const [pathOnly, query] = childPath.split('?');
    const cur = location.pathname;
    if (query) {
      const want = new URLSearchParams(query).get('tab');
      // Default tab when the URL has no ?tab= (first sub-tab of each dropdown).
      const TAB_DEFAULT: Record<string, string> = { '/reviews': 'reviews', '/development': 'coaching' };
      const have = new URLSearchParams(location.search).get('tab') ?? (TAB_DEFAULT[pathOnly] ?? '');
      return cur === pathOnly && have === want;
    }
    return cur === pathOnly || cur.startsWith(pathOnly + '/');
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ls-bg">
        <div className="text-sm text-ls-ink-3">Loading…</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      <aside className={`${navCollapsed ? 'w-16' : 'w-60'} bg-ls-slate text-[#B9C3CB] flex flex-col transition-all duration-200`}>
        <div className={`px-3 py-4 flex items-center ${navCollapsed ? 'justify-center' : 'gap-3'}`}>
          <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-ls-active shadow-[0_4px_14px_rgba(0,175,215,.45)] shrink-0">
            <img src="/lightspeed-logo-white.png" alt="Lightspeed Systems" className="w-6 h-6 object-contain" />
          </span>
          {!navCollapsed && (
            <div className="leading-tight flex-1 min-w-0">
              <div className="text-white font-bold text-[15px]">Lightspeed Systems</div>
              <div className="text-[11px] text-[#7E8B94]">AI Engagement</div>
            </div>
          )}
          {!navCollapsed && (
            <button onClick={toggleNav} title="Collapse sidebar"
              className="p-1 rounded-md text-[#B9C3CB] hover:bg-[#323D46] hover:text-white shrink-0">
              <ChevronsLeft size={18} />
            </button>
          )}
        </div>
        {navCollapsed && (
          <div className="px-2 pb-2 flex justify-center">
            <button onClick={toggleNav} title="Expand sidebar"
              className="p-1 rounded-md text-[#B9C3CB] hover:bg-[#323D46] hover:text-white">
              <ChevronsRight size={18} />
            </button>
          </div>
        )}

        <nav className="flex-1 px-2 py-2 overflow-y-auto no-scrollbar">
          {visibleGroups.map((group, gi) => (
            <div key={gi} className="mb-1">
              {group.label && !navCollapsed && (
                <div className="px-2.5 pt-3 pb-1.5 text-[10.5px] font-bold tracking-[0.12em] uppercase text-[#677480]">
                  {group.label}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                const hasChildren = !!item.children?.length;

                // Plain link: leaf items, or any item while the sidebar is collapsed.
                if (!hasChildren || navCollapsed) {
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      title={navCollapsed ? item.label : undefined}
                      className={`flex items-center ${navCollapsed ? 'justify-center' : 'gap-3'} px-2.5 py-2 rounded-lg text-sm mb-0.5 transition-colors ${
                        active
                          ? 'bg-ls-active text-white font-medium shadow-[0_4px_14px_rgba(79,169,214,.3)]'
                          : 'text-[#B9C3CB] hover:bg-[#323D46] hover:text-white'
                      }`}
                    >
                      <Icon size={18} className={active ? 'opacity-100' : 'opacity-85'} />
                      {!navCollapsed && item.label}
                    </Link>
                  );
                }

                // Dropdown parent: name links to the hub page; the chevron to the
                // right of the name expands/collapses the sub-page list. Auto-open
                // when the section is active; manual toggle persists in localStorage.
                const expanded = navExpanded[item.path] ?? active;
                return (
                  <div key={item.path} className="mb-0.5">
                    <div
                      className={`flex items-center gap-1 pr-1 rounded-lg transition-colors ${
                        active
                          ? 'bg-ls-active text-white font-medium shadow-[0_4px_14px_rgba(79,169,214,.3)]'
                          : 'text-[#B9C3CB] hover:bg-[#323D46] hover:text-white'
                      }`}
                    >
                      <Link
                        to={item.path}
                        className="flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm flex-1 min-w-0"
                      >
                        <Icon size={18} className={active ? 'opacity-100' : 'opacity-85'} />
                        <span className="truncate">{item.label}</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => toggleExpand(item.path)}
                        aria-label={expanded ? `Collapse ${item.label}` : `Expand ${item.label}`}
                        aria-expanded={expanded}
                        className="p-1 rounded-md hover:bg-black/15 shrink-0"
                      >
                        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    </div>

                    {expanded && (
                      <div className="mt-0.5 ml-3 pl-3 border-l border-[#36424B] flex flex-col">
                        {item.children!.map((child) => {
                          const cActive = isChildActive(child.path);
                          return (
                            <Link
                              key={child.path}
                              to={child.path}
                              className={`px-2.5 py-1.5 rounded-lg text-[13px] mb-0.5 transition-colors ${
                                cActive
                                  ? 'bg-ls-active/90 text-white font-medium'
                                  : 'text-[#9FAAB3] hover:bg-[#323D46] hover:text-white'
                              }`}
                            >
                              {child.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {user && (
          <div className="px-3 py-3 border-t border-[#36424B]">
            <Link to="/profile" title="Your profile"
              className={`flex items-center ${navCollapsed ? 'justify-center' : 'gap-2.5'} rounded-lg -mx-1 px-1 py-1 hover:bg-[#36424B] transition-colors`}>
              {user.avatarUrl
                ? <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                : <div className="w-8 h-8 rounded-full bg-ls-active text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {user.name?.charAt(0) || '?'}
                  </div>}
              {!navCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-[#E3E7EA] truncate">{user.name}</div>
                  <div className="text-[11px] text-[#7E8B94]">{user.role}</div>
                </div>
              )}
            </Link>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white/80 backdrop-blur border-b border-ls-line flex items-center justify-between px-6">
          <div />
          <div className="flex items-center gap-2">
            <WhatsNew />
            <Link
              to="/chat"
              title="AI Assistant"
              className={`p-2 rounded-lg transition-colors ${
                isActive('/chat') ? 'text-ls-active bg-ls-bg-2' : 'text-ls-ink-3 hover:text-ls-ink-2 hover:bg-ls-bg-2'
              }`}
            >
              <Bot className="w-5 h-5" />
            </Link>
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
