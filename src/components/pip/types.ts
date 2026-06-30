// Local types for the PIP feature — mirror the server `pip.get` shape.
// Declared client-side (don't import server types) per the planning pattern.

export type PipStatus =
  | 'draft' | 'active' | 'completed_met' | 'completed_not_met' | 'extended' | 'cancelled';

export type GoalStatus =
  | 'pending' | 'on_track' | 'partial' | 'off_track' | 'met' | 'not_met';

export type CheckinStatus = 'on_track' | 'partial' | 'off_track' | null;

export type SignatureRole = 'employee' | 'manager' | 'hr' | 'reviewer';

export interface PipConcern {
  id: string;
  pipId: string;
  sortOrder: number;
  area: string;
  observations: string | null;
  expectation: string | null;
  previouslyRaised: string | null;
}

export interface PipGoal {
  id: string;
  pipId: string;
  sortOrder: number;
  title: string;
  successCriteria: string | null;
  measurement: string | null;
  status: GoalStatus;
}

export interface PipSupport {
  id: string;
  pipId: string;
  sortOrder: number;
  support: string;
  owner: string | null;
  cadence: string | null;
}

export interface PipCheckin {
  id: string;
  pipId: string;
  sortOrder: number;
  label: string;
  checkinDate: string | null;
  attendees: string | null;
  notes: string | null;
  status: CheckinStatus;
}

export interface PipSignature {
  id: string;
  pipId: string;
  sortOrder: number;
  role: SignatureRole;
  signerName: string | null;
  signedById: string | null;
  signedAt: string | null;
}

export interface PipListRow {
  id: string;
  employeeId: string | null;
  managerId: string | null;
  hrPartnerId: string | null;
  employeeName: string | null;
  managerName: string | null;
  hrPartnerName: string | null;
  jobTitleId: string | null;
  roleLevel: string | null;   // derived display label for jobTitleId
  departmentId: string | null;
  team: string | null;        // derived display label for departmentId (the "Team / Department" field)
  status: PipStatus;
  durationDays: number;
  startDate: string | null;
  finalReviewDate: string | null;
  updatedAt: string;
}

export interface PipDetail extends PipListRow {
  midpointDate: string | null;
  purpose: string | null;
  outcomeMet: string | null;
  outcomeNotMet: string | null;
  employeeComments: string | null;
  activatedAt: string | null;
  closedAt: string | null;
  isEmployee: boolean;
  canEdit: boolean;
  concerns: PipConcern[];
  goals: PipGoal[];
  supports: PipSupport[];
  checkins: PipCheckin[];
  signatures: PipSignature[];
}

// ---- shared label maps -----------------------------------------------------

export const STATUS_LABELS: Record<PipStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  completed_met: 'Completed — met',
  completed_not_met: 'Completed — not met',
  extended: 'Extended',
  cancelled: 'Cancelled',
};

export const STATUS_CLASS: Record<PipStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  active: 'bg-blue-100 text-blue-700',
  completed_met: 'bg-green-100 text-green-700',
  completed_not_met: 'bg-red-100 text-red-700',
  extended: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  pending: 'Pending',
  on_track: 'On track',
  partial: 'Partial progress',
  off_track: 'Off track',
  met: 'Met',
  not_met: 'Not met',
};

export const CHECKIN_STATUS_LABELS: Record<NonNullable<CheckinStatus>, string> = {
  on_track: 'On track',
  partial: 'Partial progress',
  off_track: 'Off track',
};

export const CHECKIN_STATUS_CLASS: Record<NonNullable<CheckinStatus>, string> = {
  on_track: 'bg-green-50 text-green-700 border-green-200',
  partial: 'bg-amber-50 text-amber-700 border-amber-200',
  off_track: 'bg-red-50 text-red-700 border-red-200',
};

export const SIGNATURE_LABELS: Record<SignatureRole, string> = {
  employee: 'Employee',
  manager: 'Manager',
  hr: 'HR Partner',
  reviewer: 'Skip-level / Reviewer',
};

// Allowed next states (mirrors the server transition guard).
export const STATUS_TRANSITIONS: Record<PipStatus, PipStatus[]> = {
  draft: ['active', 'cancelled'],
  active: ['completed_met', 'completed_not_met', 'extended', 'cancelled'],
  extended: ['completed_met', 'completed_not_met', 'cancelled'],
  completed_met: [],
  completed_not_met: [],
  cancelled: [],
};
