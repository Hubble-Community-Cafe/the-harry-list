// Audit log types — mirror the backend AuditLogResponse / FieldChange DTOs.

export interface FieldChange {
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'STATUS_CHANGE'
  | 'NOTES_UPDATED'
  | 'CATERING_ARRANGED'
  | 'EMAIL_SENT'
  | 'ROLE_CHANGED'
  | 'TOGGLE';

export type AuditEntityType =
  | 'RESERVATION'
  | 'BLOCKED_PERIOD'
  | 'CALENDAR_APPOINTMENT'
  | 'EMAIL_TEMPLATE'
  | 'EMAIL_ATTACHMENT'
  | 'FORM_CONSTRAINT'
  | 'ADMIN_USER';

export interface AuditLogEntry {
  id: number;
  entityType: AuditEntityType;
  entityId: number | null;
  entityLabel: string | null;
  action: AuditAction;
  actorOid: string | null;
  actorEmail: string | null;
  actorName: string | null;
  changes: FieldChange[];
  summary: string | null;
  createdAt: string;
}

export interface AuditLogPageResponse {
  content: AuditLogEntry[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface AuditLogFilters {
  entityType?: AuditEntityType;
  entityId?: number;
  actorEmail?: string;
  action?: AuditAction;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}
