export type ActionKind = 'DISMISS' | 'WARN' | 'SUSPEND' | 'BAN' | 'RESTORE';
export interface AdminUser {
  id: number;
  fullname: string;
  email: string;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  suspendedUntil: string | null;
  effectiveStatus?: string;
}
export interface AuditAction {
  id: number;
  kind: ActionKind;
  reason: string;
  createdAt: string;
  suspendedUntil: string | null;
  actor: { id: number; fullname: string };
}
export interface AdminReport {
  id: number;
  reason: string;
  details: string | null;
  status: 'OPEN' | 'REVIEWED';
  createdAt: string;
  reporter: { id: number; fullname: string };
  reportedUser: AdminUser;
  moderationActions?: AuditAction[];
}
export interface UserDetail extends AdminUser {
  moderationReceived: AuditAction[];
}
export interface ListResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
export const actionLabels: Record<ActionKind, string> = {
  DISMISS: 'Dismiss report',
  WARN: 'Send warning',
  SUSPEND: 'Suspend temporarily',
  BAN: 'Ban account',
  RESTORE: 'Restore access',
};
