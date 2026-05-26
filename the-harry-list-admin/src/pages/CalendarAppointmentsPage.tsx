import { useState, useEffect } from 'react';
import {
  Plus, Trash2, Loader2, AlertCircle,
  ToggleLeft, ToggleRight, Pencil, X, CalendarPlus, Clock, Sun, Repeat
} from 'lucide-react';
import {
  fetchCalendarAppointments, createCalendarAppointment, updateCalendarAppointment,
  toggleCalendarAppointment, deleteCalendarAppointment,
} from '../lib/api';
import type { CalendarAppointment, RecurrenceType } from '../types/reservation';

const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: 'NONE', label: 'None' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Bi-weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
];

const RECURRENCE_LABELS: Record<string, string> = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  BIWEEKLY: 'Bi-weekly',
  MONTHLY: 'Monthly',
  YEARLY: 'Yearly',
};

const emptyAppointment: CalendarAppointment = {
  title: '',
  description: '',
  date: '',
  allDay: false,
  startTime: '',
  endTime: '',
  location: 'HUBBLE',
  recurrenceType: 'NONE',
  recurrenceEndDate: '',
  enabled: true,
};

export function CalendarAppointmentsPage() {
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<CalendarAppointment | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCalendarAppointments()
      .then(data => setAppointments(data))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load appointments'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setError(null);

    // Clean empty strings to null for optional fields
    const cleaned = {
      ...editing,
      description: editing.description || undefined,
      startTime: editing.allDay ? undefined : editing.startTime || undefined,
      endTime: editing.allDay ? undefined : editing.endTime || undefined,
      recurrenceEndDate: editing.recurrenceType === 'NONE' ? undefined : editing.recurrenceEndDate || undefined,
    };

    try {
      if (editing.id) {
        const updated = await updateCalendarAppointment(editing.id, cleaned);
        setAppointments(prev => prev.map(a => a.id === updated.id ? updated : a));
      } else {
        const created = await createCalendarAppointment(cleaned);
        setAppointments(prev => [...prev, created]);
      }
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save appointment');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      const updated = await toggleCalendarAppointment(id);
      setAppointments(prev => prev.map(a => a.id === id ? updated : a));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle appointment');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteCalendarAppointment(id);
      setAppointments(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete appointment');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-hubble-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-title font-bold text-white">Calendar Appointments</h1>
          <p className="text-dark-400 font-light">Custom calendar entries that appear in the ICS feeds alongside reservations</p>
        </div>
        <button
          onClick={() => setEditing({ ...emptyAppointment })}
          className="btn-primary flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Appointment
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span className="text-red-400 text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4 text-red-400" />
          </button>
        </div>
      )}

      {/* List */}
      {appointments.length === 0 ? (
        <div className="card text-center py-12">
          <CalendarPlus className="w-12 h-12 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400">No appointments yet. Create one to add it to your calendar feeds.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map(appointment => (
            <div
              key={appointment.id}
              className={`bg-dark-900 border rounded-xl p-4 flex items-start gap-4 ${
                appointment.enabled ? 'border-dark-800' : 'border-dark-800/50 opacity-60'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-white font-medium">{appointment.title}</span>
                  {/* Location badge */}
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    appointment.location === 'HUBBLE'
                      ? 'bg-hubble-500/20 text-hubble-400'
                      : 'bg-meteor-500/20 text-meteor-400'
                  }`}>
                    {appointment.location}
                  </span>
                  {/* All-day or time badge */}
                  {appointment.allDay ? (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 flex items-center gap-1">
                      <Sun className="w-3 h-3" />
                      All day
                    </span>
                  ) : appointment.startTime && appointment.endTime ? (
                    <span className="text-xs text-dark-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {appointment.startTime.slice(0, 5)}–{appointment.endTime.slice(0, 5)}
                    </span>
                  ) : null}
                  {/* Recurrence badge */}
                  {appointment.recurrenceType !== 'NONE' && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 flex items-center gap-1">
                      <Repeat className="w-3 h-3" />
                      {RECURRENCE_LABELS[appointment.recurrenceType] || appointment.recurrenceType}
                    </span>
                  )}
                </div>
                <div className="text-xs text-dark-500 mb-1">
                  {appointment.date}
                  {appointment.recurrenceType !== 'NONE' && appointment.recurrenceEndDate && (
                    <span> → {appointment.recurrenceEndDate}</span>
                  )}
                </div>
                {appointment.description && (
                  <p className="text-sm text-dark-400 truncate">{appointment.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setEditing({ ...appointment })}
                  className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => appointment.id && handleToggle(appointment.id)}
                  className="p-1.5 rounded-lg"
                  title={appointment.enabled ? 'Disable' : 'Enable'}
                >
                  {appointment.enabled
                    ? <ToggleRight className="w-5 h-5 text-green-400" />
                    : <ToggleLeft className="w-5 h-5 text-dark-500" />
                  }
                </button>
                <button
                  onClick={() => appointment.id && handleDelete(appointment.id)}
                  className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                  {editing.id ? 'Edit Appointment' : 'New Appointment'}
                </h2>
                <button onClick={() => setEditing(null)} className="text-dark-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Title */}
              <div>
                <label className="label">Title *</label>
                <input
                  type="text"
                  value={editing.title}
                  onChange={e => setEditing({ ...editing, title: e.target.value })}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="e.g. Staff Meeting, Holiday Closure"
                />
              </div>

              {/* Description */}
              <div>
                <label className="label">Description</label>
                <textarea
                  value={editing.description || ''}
                  onChange={e => setEditing({ ...editing, description: e.target.value })}
                  rows={2}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="Optional notes or details"
                />
              </div>

              {/* Date */}
              <div>
                <label className="label">Date *</label>
                <input
                  type="date"
                  value={editing.date}
                  onChange={e => setEditing({ ...editing, date: e.target.value })}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>

              {/* All-day toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditing({ ...editing, allDay: !editing.allDay })}
                  className="shrink-0"
                >
                  {editing.allDay
                    ? <ToggleRight className="w-6 h-6 text-amber-400" />
                    : <ToggleLeft className="w-6 h-6 text-dark-500" />
                  }
                </button>
                <span className="text-sm text-dark-300">All-day event</span>
              </div>

              {/* Time fields (hidden when all-day) */}
              {!editing.allDay && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Start Time *</label>
                    <input
                      type="time"
                      value={editing.startTime || ''}
                      onChange={e => setEditing({ ...editing, startTime: e.target.value })}
                      className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="label">End Time *</label>
                    <input
                      type="time"
                      value={editing.endTime || ''}
                      onChange={e => setEditing({ ...editing, endTime: e.target.value })}
                      className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Location */}
              <div>
                <label className="label">Location *</label>
                <select
                  value={editing.location}
                  onChange={e => setEditing({ ...editing, location: e.target.value })}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="HUBBLE">Hubble</option>
                  <option value="METEOR">Meteor</option>
                </select>
              </div>

              {/* Recurrence */}
              <div>
                <label className="label">Recurrence</label>
                <select
                  value={editing.recurrenceType}
                  onChange={e => setEditing({ ...editing, recurrenceType: e.target.value as RecurrenceType })}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm"
                >
                  {RECURRENCE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Recurrence end date (shown when recurrence != NONE) */}
              {editing.recurrenceType !== 'NONE' && (
                <div>
                  <label className="label">Recurrence End Date</label>
                  <input
                    type="date"
                    value={editing.recurrenceEndDate || ''}
                    onChange={e => setEditing({ ...editing, recurrenceEndDate: e.target.value })}
                    className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                  <p className="text-xs text-dark-500 mt-1">Leave empty for indefinite recurrence</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 text-sm text-dark-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !editing.title || !editing.date || (!editing.allDay && (!editing.startTime || !editing.endTime))}
                  className="btn-primary flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editing.id ? 'Save Changes' : 'Create Appointment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}