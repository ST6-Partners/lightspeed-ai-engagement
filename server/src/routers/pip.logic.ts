// ============================================================
// PIP — pure business rules (no db / no ctx), so they're unit-testable
// and shared as the single source of truth for the router.
// ============================================================

export type PipStatus =
  | 'draft' | 'active' | 'completed_met' | 'completed_not_met' | 'extended' | 'cancelled';

export const TERMINAL_STATUSES: PipStatus[] = ['completed_met', 'completed_not_met', 'cancelled'];

// Allowed forward transitions. A no-op (from === to) is always allowed.
export const STATUS_TRANSITIONS: Record<PipStatus, PipStatus[]> = {
  draft: ['active', 'cancelled'],
  active: ['completed_met', 'completed_not_met', 'extended', 'cancelled'],
  extended: ['completed_met', 'completed_not_met', 'cancelled'],
  completed_met: [],
  completed_not_met: [],
  cancelled: [],
};

export function isTerminal(status: PipStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function canTransition(from: PipStatus, to: PipStatus): boolean {
  if (from === to) return true;
  return (STATUS_TRANSITIONS[from] ?? []).includes(to);
}

// ── permissions (pure) ──────────────────────────────────────
const ADMIN_ROLES = ['admin', 'sysadmin'];

export interface ActorLite { id: string; role: string }
export interface PipLite {
  employeeId: string | null;
  managerId: string | null;
  hrPartnerId: string | null;
  createdBy: string | null;
}

export function isAdmin(actor: ActorLite): boolean {
  return ADMIN_ROLES.includes(actor.role);
}

/** Manager / HR partner / creator / admin may edit the plan and its rows. */
export function isPipEditor(actor: ActorLite, pip: PipLite): boolean {
  if (isAdmin(actor)) return true;
  return [pip.managerId, pip.hrPartnerId, pip.createdBy].includes(actor.id);
}

export function isSubject(actor: ActorLite, pip: PipLite): boolean {
  return pip.employeeId === actor.id;
}

/** The subject may write only their own §8 comments; editors may too. */
export function canEditComments(actor: ActorLite, pip: PipLite): boolean {
  return isSubject(actor, pip) || isPipEditor(actor, pip);
}

/**
 * §9 signing: the employee may sign only the 'employee' row; everyone else's
 * row requires editor rights (so an editor can counter-sign on behalf if needed).
 */
export function canSignRole(actor: ActorLite, pip: PipLite, role: string): boolean {
  if (role === 'employee') return isSubject(actor, pip) || isPipEditor(actor, pip);
  return isPipEditor(actor, pip);
}
