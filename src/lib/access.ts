// ============================================================
// ACCESS MAP — single source of truth for role-driven UI.
// Mirrors the server four-tier permission model
// (server/src/services/permissions.ts). Drives the sidebar nav
// gating, the Settings > Access page, and request-access sections.
// The server enforces the real gate; this config decides what a
// given role SEES.
// ============================================================

export type RoleTier = 'user' | 'manager' | 'admin' | 'sysadmin';

export const ROLE_ORDER: Record<RoleTier, number> = { user: 1, manager: 2, admin: 3, sysadmin: 4 };

export function hasMinRole(role: string | undefined, min: RoleTier): boolean {
  return (ROLE_ORDER[role as RoleTier] ?? 0) >= ROLE_ORDER[min];
}

export const ROLE_META: Record<RoleTier, { label: string; badge: string; description: string }> = {
  user: {
    label: 'Employee view', badge: 'Employee',
    description: 'You see the everyday employee tools plus your own account settings. Management and setup areas stay hidden until your access changes.',
  },
  manager: {
    label: 'Manager view', badge: 'Manager',
    description: 'You get everything an employee sees, plus planning tools and core data for your team. Admin-only setup stays hidden.',
  },
  admin: {
    label: 'Admin view', badge: 'Admin',
    description: 'You see the full app: everyday tools, planning, core data, and the admin console for settings, users, and integrations.',
  },
  sysadmin: {
    label: 'System admin view', badge: 'System admin',
    description: 'Full access to every section, including system administration.',
  },
};

export type AccessSection = { key: string; label: string; description: string; requiredRole: RoleTier };

export const ACCESS_SECTIONS: AccessSection[] = [
  { key: 'everyday', label: 'Everyday tools', description: 'Home, AI assistant, pulses, reviews, PIP, surveys', requiredRole: 'user' },
  { key: 'account', label: 'Your account', description: 'Profile photo, password, notifications', requiredRole: 'user' },
  { key: 'planning', label: 'Planning', description: 'Organization, OKRs, weekly plans', requiredRole: 'manager' },
  { key: 'core-data', label: 'Core data', description: 'Employees, job titles, departments, questions', requiredRole: 'manager' },
  { key: 'admin', label: 'Admin console', description: 'App settings, user management, integrations', requiredRole: 'admin' },
];
