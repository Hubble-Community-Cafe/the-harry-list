import { useEffect, useState } from 'react';
import { Loader2, AlertCircle, History, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { fetchAuditLog } from '../lib/api';
import type { AuditAction, AuditEntityType, AuditLogEntry } from '../types/audit';

const ENTITY_TYPES: AuditEntityType[] = [
  'RESERVATION', 'BLOCKED_PERIOD', 'CALENDAR_APPOINTMENT',
  'EMAIL_TEMPLATE', 'EMAIL_ATTACHMENT', 'FORM_CONSTRAINT', 'ADMIN_USER',
];

const ACTIONS: AuditAction[] = [
  'CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE',
  'NOTES_UPDATED', 'CATERING_ARRANGED', 'EMAIL_SENT', 'ROLE_CHANGED', 'TOGGLE',
];

const PAGE_SIZE = 50;

export function AuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Filters
  const [entityType, setEntityType] = useState<AuditEntityType | ''>('');
  const [action, setAction] = useState<AuditAction | ''>('');
  const [actorEmail, setActorEmail] = useState('');
  const [fromDate, setFromDate] = useState(''); // YYYY-MM-DD
  const [toDate, setToDate] = useState('');     // YYYY-MM-DD

  // State is only set inside async callbacks (not synchronously in the effect body),
  // to satisfy the react-hooks/set-state-in-effect rule. `loading` starts true.
  useEffect(() => {
    let cancelled = false;
    fetchAuditLog({
      page,
      size: PAGE_SIZE,
      entityType: entityType || undefined,
      action: action || undefined,
      actorEmail: actorEmail.trim() || undefined,
      // Backend expects ISO date-times; widen the day bounds so the range is inclusive.
      from: fromDate ? `${fromDate}T00:00:00` : undefined,
      to: toDate ? `${toDate}T23:59:59` : undefined,
    })
      .then(result => {
        if (cancelled) return;
        setEntries(result.content);
        setTotalPages(result.totalPages);
        setTotalElements(result.totalElements);
        setError(null);
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load audit log');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [page, entityType, action, actorEmail, fromDate, toDate]);

  // Changing a filter resets to the first page.
  const onFilterChange = <T,>(setter: (v: T) => void) => (value: T) => {
    setPage(0);
    setter(value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-title font-bold text-white flex items-center gap-2">
          <History className="w-6 h-6 text-hubble-400" />
          Audit Log
        </h1>
        <p className="text-dark-400 font-light">A record of who changed what across the admin panel</p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3 text-sm text-dark-300">
          <Filter className="w-4 h-4" /> Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="form-group">
            <label className="label" htmlFor="audit-entity-type">Entity type</label>
            <select
              id="audit-entity-type"
              value={entityType}
              onChange={e => onFilterChange(setEntityType)(e.target.value as AuditEntityType | '')}
              className="select-field"
            >
              <option value="">All</option>
              {ENTITY_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label" htmlFor="audit-action">Action</label>
            <select
              id="audit-action"
              value={action}
              onChange={e => onFilterChange(setAction)(e.target.value as AuditAction | '')}
              className="select-field"
            >
              <option value="">All</option>
              {ACTIONS.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label" htmlFor="audit-actor-email">Actor email</label>
            <input
              id="audit-actor-email"
              type="text"
              value={actorEmail}
              onChange={e => onFilterChange(setActorEmail)(e.target.value)}
              placeholder="e.g. staff@example.com"
              className="input-field"
            />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="audit-from">From date</label>
            <input
              id="audit-from"
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={e => onFilterChange(setFromDate)(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="audit-to">To date</label>
            <input
              id="audit-to"
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={e => onFilterChange(setToDate)(e.target.value)}
              className="input-field"
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span className="text-red-400 text-sm">{error}</span>
        </div>
      )}

      {/* Entries */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 text-hubble-400 animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="card text-center py-12">
          <History className="w-12 h-12 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400">No audit entries match your filters.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {entries.map(entry => (
              <div key={entry.id} className="bg-dark-900 border border-dark-800 rounded-xl p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <AuditActionBadge action={entry.action} />
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-dark-700 text-dark-300">
                      {entry.entityType.replace(/_/g, ' ')}
                    </span>
                    <span className="text-white text-sm">{entry.entityLabel || `#${entry.entityId ?? '—'}`}</span>
                  </div>
                  <time className="text-xs text-dark-500">{new Date(entry.createdAt).toLocaleString()}</time>
                </div>
                <div className="text-sm text-dark-300 mt-1">
                  <span className="text-white">{entry.actorName || entry.actorEmail || 'system'}</span>
                  {entry.summary && <span className="text-dark-400"> — {entry.summary}</span>}
                </div>
                {entry.changes.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {entry.changes.map((change, i) => (
                      <li key={i} className="text-xs text-dark-400">
                        <code className="text-dark-300">{change.field}</code>:{' '}
                        <span className="line-through text-red-400/70">{change.oldValue ?? '—'}</span>
                        {' → '}
                        <span className="text-green-400/80">{change.newValue ?? '—'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-dark-500">
              {totalElements} {totalElements === 1 ? 'entry' : 'entries'} · page {page + 1} of {Math.max(totalPages, 1)}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dark-700 text-dark-300 hover:bg-dark-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page + 1 >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dark-700 text-dark-300 hover:bg-dark-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function AuditActionBadge({ action }: { action: string }) {
  const config: Record<string, { label: string; color: string; bg: string }> = {
    CREATE: { label: 'Created', color: 'text-green-400', bg: 'bg-green-500/20' },
    UPDATE: { label: 'Updated', color: 'text-blue-400', bg: 'bg-blue-500/20' },
    DELETE: { label: 'Deleted', color: 'text-red-400', bg: 'bg-red-500/20' },
    STATUS_CHANGE: { label: 'Status changed', color: 'text-amber-400', bg: 'bg-amber-500/20' },
    NOTES_UPDATED: { label: 'Notes updated', color: 'text-hubble-400', bg: 'bg-hubble-500/20' },
    CATERING_ARRANGED: { label: 'Catering', color: 'text-orange-400', bg: 'bg-orange-500/20' },
    EMAIL_SENT: { label: 'Email sent', color: 'text-meteor-400', bg: 'bg-meteor-500/20' },
    ROLE_CHANGED: { label: 'Role changed', color: 'text-red-400', bg: 'bg-red-500/20' },
    TOGGLE: { label: 'Toggled', color: 'text-dark-300', bg: 'bg-dark-700' },
  };
  const { label, color, bg } = config[action] || { label: action, color: 'text-dark-300', bg: 'bg-dark-700' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${color}`}>{label}</span>;
}
