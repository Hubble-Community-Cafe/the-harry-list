import { useState, useEffect } from 'react';
import {
  Plus, Trash2, Loader2, AlertCircle,
  ToggleLeft, ToggleRight, Calendar, Shield, Pencil, X, Database, Clock
} from 'lucide-react';
import {
  fetchFormConstraints, createFormConstraint, updateFormConstraint,
  toggleFormConstraint, deleteFormConstraint,
  fetchBlockedPeriods, createBlockedPeriod, updateBlockedPeriod,
  toggleBlockedPeriod, deleteBlockedPeriod,
  fetchRetentionSettings,
} from '../lib/api';
import type { FormConstraint, BlockedPeriod } from '../types/reservation';
import type { RetentionSettings } from '../lib/api';
import { HelpGuide } from '../components/HelpGuide';
import { formSettingsGuide } from '../lib/guideContent';

const CONSTRAINT_TYPES = [
  { value: 'ACTIVITY_CONFLICT', label: 'Activity Conflict' },
  { value: 'LOCATION_LOCK', label: 'Location Lock' },
  { value: 'SEATING_LOCK', label: 'Seating Lock' },
  { value: 'TIME_RESTRICTION', label: 'Time Restriction' },
  { value: 'ADVANCE_BOOKING', label: 'Advance Booking' },
  { value: 'GUEST_LIMIT', label: 'Guest Limit' },
  { value: 'GUEST_MINIMUM', label: 'Guest Minimum' },
];

const ACTIVITIES = [
  'GRADUATION', 'EAT_A_LA_CARTE', 'EAT_CATERING', 'CATERING_CORONA_ROOM', 'PRIVATE_EVENT',
];

const LOCATIONS = ['HUBBLE', 'METEOR'];

const emptyConstraint: FormConstraint = {
  constraintType: 'ACTIVITY_CONFLICT',
  triggerActivity: 'EAT_CATERING',
  targetValue: '',
  numericValue: undefined,
  secondaryValue: '',
  message: '',
  enabled: true,
};

const emptyBlockedPeriod: BlockedPeriod = {
  location: '',
  startDate: '',
  endDate: '',
  startTime: '',
  endTime: '',
  reason: '',
  publicMessage: '',
  enabled: true,
};

export function FormSettingsPage() {
  const [activeTab, setActiveTab] = useState<'constraints' | 'blocked'>('constraints');
  const [constraints, setConstraints] = useState<FormConstraint[]>([]);
  const [blockedPeriods, setBlockedPeriods] = useState<BlockedPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [retention, setRetention] = useState<RetentionSettings | null>(null);

  // Constraint form state
  const [editingConstraint, setEditingConstraint] = useState<FormConstraint | null>(null);
  const [savingConstraint, setSavingConstraint] = useState(false);

  // Blocked period form state
  const [editingPeriod, setEditingPeriod] = useState<BlockedPeriod | null>(null);
  const [savingPeriod, setSavingPeriod] = useState(false);

  useEffect(() => {
    Promise.all([fetchFormConstraints(), fetchBlockedPeriods(), fetchRetentionSettings()])
      .then(([c, bp, ret]) => {
        setConstraints(c);
        setBlockedPeriods(bp);
        setRetention(ret);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  // ===== Constraint handlers =====
  async function handleToggleConstraint(id: number) {
    try {
      const updated = await toggleFormConstraint(id);
      setConstraints(prev => prev.map(c => c.id === id ? updated : c));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle constraint');
    }
  }

  async function handleDeleteConstraint(id: number) {
    if (!confirm('Delete this constraint?')) return;
    try {
      await deleteFormConstraint(id);
      setConstraints(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete constraint');
    }
  }

  /** Clean empty strings to null for optional fields */
  function cleanEmpty<T>(obj: T): T {
    const cleaned = { ...obj } as Record<string, unknown>;
    for (const key of Object.keys(cleaned)) {
      if (cleaned[key] === '') {
        cleaned[key] = null;
      }
    }
    return cleaned as T;
  }

  async function handleSaveConstraint() {
    if (!editingConstraint) return;
    setSavingConstraint(true);
    try {
      const data = cleanEmpty(editingConstraint);
      if (data.id) {
        const updated = await updateFormConstraint(data.id, data);
        setConstraints(prev => prev.map(c => c.id === updated.id ? updated : c));
      } else {
        const created = await createFormConstraint(data);
        setConstraints(prev => [...prev, created]);
      }
      setEditingConstraint(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save constraint');
    } finally {
      setSavingConstraint(false);
    }
  }

  // ===== Blocked period handlers =====
  async function handleTogglePeriod(id: number) {
    try {
      const updated = await toggleBlockedPeriod(id);
      setBlockedPeriods(prev => prev.map(bp => bp.id === id ? updated : bp));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle blocked period');
    }
  }

  async function handleDeletePeriod(id: number) {
    if (!confirm('Delete this blocked period?')) return;
    try {
      await deleteBlockedPeriod(id);
      setBlockedPeriods(prev => prev.filter(bp => bp.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete blocked period');
    }
  }

  async function handleSavePeriod() {
    if (!editingPeriod) return;
    setSavingPeriod(true);
    try {
      const data = cleanEmpty(editingPeriod);
      if (data.id) {
        const updated = await updateBlockedPeriod(data.id, data);
        setBlockedPeriods(prev => prev.map(bp => bp.id === updated.id ? updated : bp));
      } else {
        const created = await createBlockedPeriod(data);
        setBlockedPeriods(prev => [...prev, created]);
      }
      setEditingPeriod(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save blocked period');
    } finally {
      setSavingPeriod(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-hubble-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-title font-bold text-white">Form Settings</h1>
          <p className="text-dark-400 font-light">Manage form constraints and blocked periods</p>
        </div>
        <HelpGuide title="Form Settings Guide" sections={formSettingsGuide} />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span className="text-red-400 text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex gap-2 border-b border-dark-800 pb-0">
        <button
          onClick={() => setActiveTab('constraints')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
            activeTab === 'constraints'
              ? 'bg-dark-800 text-hubble-400 border-b-2 border-hubble-500'
              : 'text-dark-400 hover:text-white'
          }`}
        >
          <Shield className="w-4 h-4" />
          Form Constraints ({constraints.length})
        </button>
        <button
          onClick={() => setActiveTab('blocked')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
            activeTab === 'blocked'
              ? 'bg-dark-800 text-hubble-400 border-b-2 border-hubble-500'
              : 'text-dark-400 hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Blocked Periods ({blockedPeriods.length})
        </button>
      </div>

      {/* ===== Constraints Tab ===== */}
      {activeTab === 'constraints' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-dark-400">
              Manage rules that control which activities, locations, and time slots are available in the reservation form.
            </p>
            <button
              onClick={() => setEditingConstraint({ ...emptyConstraint })}
              className="flex items-center gap-2 px-3 py-2 bg-hubble-600 hover:bg-hubble-500 text-white rounded-lg text-sm transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Constraint
            </button>
          </div>

          {constraints.length === 0 ? (
            <div className="text-center py-12 text-dark-500">No constraints configured yet.</div>
          ) : (
            <div className="space-y-3">
              {constraints.map((c) => (
                <div
                  key={c.id}
                  className={`bg-dark-900 border rounded-xl p-4 flex items-start gap-4 transition-colors ${
                    c.enabled ? 'border-dark-800' : 'border-dark-800/50 opacity-60'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-dark-800 text-hubble-400">
                        {CONSTRAINT_TYPES.find(t => t.value === c.constraintType)?.label || c.constraintType}
                      </span>
                      <span className="text-xs text-dark-500">
                        {c.triggerActivity}
                        {c.targetValue && ` → ${c.targetValue}`}
                        {c.numericValue !== null && c.numericValue !== undefined && ` (${c.numericValue})`}
                      </span>
                    </div>
                    <p className="text-sm text-dark-300">{c.message}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setEditingConstraint({ ...c })}
                      className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => c.id && handleToggleConstraint(c.id)}
                      className="p-1.5 rounded-lg transition-colors"
                      title={c.enabled ? 'Disable' : 'Enable'}
                    >
                      {c.enabled
                        ? <ToggleRight className="w-5 h-5 text-green-400" />
                        : <ToggleLeft className="w-5 h-5 text-dark-500" />
                      }
                    </button>
                    <button
                      onClick={() => c.id && handleDeleteConstraint(c.id)}
                      className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== Blocked Periods Tab ===== */}
      {activeTab === 'blocked' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-dark-400">
              Block specific dates or date ranges from being reserved. Optionally scope to a specific location.
            </p>
            <button
              onClick={() => setEditingPeriod({ ...emptyBlockedPeriod })}
              className="flex items-center gap-2 px-3 py-2 bg-hubble-600 hover:bg-hubble-500 text-white rounded-lg text-sm transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Blocked Period
            </button>
          </div>

          {blockedPeriods.length === 0 ? (
            <div className="text-center py-12 text-dark-500">No blocked periods configured.</div>
          ) : (
            <div className="space-y-3">
              {blockedPeriods.map((bp) => (
                <div
                  key={bp.id}
                  className={`bg-dark-900 border rounded-xl p-4 flex items-start gap-4 transition-colors ${
                    bp.enabled ? 'border-dark-800' : 'border-dark-800/50 opacity-60'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-dark-800 text-red-400">
                        {bp.startDate} — {bp.endDate}
                      </span>
                      {bp.location && (
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-dark-800 text-amber-400">
                          {bp.location}
                        </span>
                      )}
                      {bp.startTime && bp.endTime && (
                        <span className="text-xs text-dark-500">
                          {bp.startTime} – {bp.endTime}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-white font-medium">{bp.reason}</p>
                    {bp.publicMessage && (
                      <p className="text-xs text-dark-400 mt-1">Public: {bp.publicMessage}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setEditingPeriod({ ...bp })}
                      className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => bp.id && handleTogglePeriod(bp.id)}
                      className="p-1.5 rounded-lg transition-colors"
                      title={bp.enabled ? 'Disable' : 'Enable'}
                    >
                      {bp.enabled
                        ? <ToggleRight className="w-5 h-5 text-green-400" />
                        : <ToggleLeft className="w-5 h-5 text-dark-500" />
                      }
                    </button>
                    <button
                      onClick={() => bp.id && handleDeletePeriod(bp.id)}
                      className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== Constraint Edit Modal ===== */}
      {editingConstraint && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">
                  {editingConstraint.id ? 'Edit Constraint' : 'New Constraint'}
                </h2>
                <button onClick={() => setEditingConstraint(null)} className="text-dark-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-dark-400 mb-1">Constraint Type</label>
                  <select
                    value={editingConstraint.constraintType}
                    onChange={e => setEditingConstraint({
                      ...editingConstraint,
                      constraintType: e.target.value,
                      triggerActivity: e.target.value === 'GUEST_MINIMUM' ? 'ANY' : editingConstraint.triggerActivity,
                    })}
                    className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm"
                  >
                    {CONSTRAINT_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {editingConstraint.constraintType !== 'GUEST_MINIMUM' && (
                  <div>
                    <label className="block text-sm text-dark-400 mb-1">Trigger Activity</label>
                    <select
                      value={editingConstraint.triggerActivity}
                      onChange={e => setEditingConstraint({ ...editingConstraint, triggerActivity: e.target.value })}
                      className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm"
                    >
                      {ACTIVITIES.map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm text-dark-400 mb-1">Target Value</label>
                  <input
                    type="text"
                    value={editingConstraint.targetValue || ''}
                    onChange={e => setEditingConstraint({ ...editingConstraint, targetValue: e.target.value })}
                    placeholder="e.g. EAT_A_LA_CARTE, HUBBLE, INSIDE"
                    className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                  <p className="text-xs text-dark-500 mt-1">
                    {editingConstraint.constraintType === 'ACTIVITY_CONFLICT' && 'The conflicting activity'}
                    {editingConstraint.constraintType === 'LOCATION_LOCK' && 'The locked location (HUBBLE or METEOR)'}
                    {editingConstraint.constraintType === 'SEATING_LOCK' && 'The locked seating (INSIDE or OUTSIDE)'}
                    {editingConstraint.constraintType === 'TIME_RESTRICTION' && 'e.g. EARLY_ACCESS'}
                    {editingConstraint.constraintType === 'ADVANCE_BOOKING' && 'Leave empty (use numeric value)'}
                    {editingConstraint.constraintType === 'GUEST_LIMIT' && 'Leave empty (use numeric value)'}
                    {editingConstraint.constraintType === 'GUEST_MINIMUM' && 'The location this minimum applies to (HUBBLE or METEOR), or leave empty for all locations'}
                  </p>
                </div>

                {(editingConstraint.constraintType === 'ADVANCE_BOOKING' ||
                  editingConstraint.constraintType === 'GUEST_LIMIT' ||
                  editingConstraint.constraintType === 'GUEST_MINIMUM') && (
                  <div>
                    <label className="block text-sm text-dark-400 mb-1">
                      {editingConstraint.constraintType === 'ADVANCE_BOOKING' && 'Days in advance'}
                      {editingConstraint.constraintType === 'GUEST_LIMIT' && 'Max guests'}
                      {editingConstraint.constraintType === 'GUEST_MINIMUM' && 'Min guests'}
                    </label>
                    <input
                      type="number"
                      value={editingConstraint.numericValue ?? ''}
                      onChange={e => setEditingConstraint({
                        ...editingConstraint,
                        numericValue: e.target.value ? parseInt(e.target.value) : undefined,
                      })}
                      className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                )}

                {editingConstraint.constraintType === 'TIME_RESTRICTION' && (
                  <div>
                    <label className="block text-sm text-dark-400 mb-1">Time Range</label>
                    <input
                      type="text"
                      value={editingConstraint.secondaryValue || ''}
                      onChange={e => setEditingConstraint({ ...editingConstraint, secondaryValue: e.target.value })}
                      placeholder="e.g. 09:00-10:45"
                      className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm text-dark-400 mb-1">Message (shown to users)</label>
                  <textarea
                    value={editingConstraint.message}
                    onChange={e => setEditingConstraint({ ...editingConstraint, message: e.target.value })}
                    rows={2}
                    className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditingConstraint(null)}
                  className="flex-1 px-4 py-2 bg-dark-800 hover:bg-dark-700 text-white rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveConstraint}
                  disabled={savingConstraint || !editingConstraint.message}
                  className="flex-1 px-4 py-2 bg-hubble-600 hover:bg-hubble-500 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  {savingConstraint ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Blocked Period Edit Modal ===== */}
      {editingPeriod && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">
                  {editingPeriod.id ? 'Edit Blocked Period' : 'New Blocked Period'}
                </h2>
                <button onClick={() => setEditingPeriod(null)} className="text-dark-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-dark-400 mb-1">Location (optional)</label>
                  <select
                    value={editingPeriod.location || ''}
                    onChange={e => setEditingPeriod({ ...editingPeriod, location: e.target.value || undefined })}
                    className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm"
                  >
                    <option value="">All locations</option>
                    {LOCATIONS.map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-dark-400 mb-1">Start Date *</label>
                    <input
                      type="date"
                      value={editingPeriod.startDate}
                      onChange={e => setEditingPeriod({ ...editingPeriod, startDate: e.target.value })}
                      className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-dark-400 mb-1">End Date *</label>
                    <input
                      type="date"
                      value={editingPeriod.endDate}
                      onChange={e => setEditingPeriod({ ...editingPeriod, endDate: e.target.value })}
                      className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-dark-400 mb-1">Start Time (optional)</label>
                    <input
                      type="time"
                      value={editingPeriod.startTime || ''}
                      onChange={e => setEditingPeriod({ ...editingPeriod, startTime: e.target.value || undefined })}
                      className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-dark-400 mb-1">End Time (optional)</label>
                    <input
                      type="time"
                      value={editingPeriod.endTime || ''}
                      onChange={e => setEditingPeriod({ ...editingPeriod, endTime: e.target.value || undefined })}
                      className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-dark-400 mb-1">Reason (staff only) *</label>
                  <input
                    type="text"
                    value={editingPeriod.reason}
                    onChange={e => setEditingPeriod({ ...editingPeriod, reason: e.target.value })}
                    placeholder="e.g. Holiday closure, Maintenance"
                    className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm text-dark-400 mb-1">Public Message (shown to users)</label>
                  <input
                    type="text"
                    value={editingPeriod.publicMessage || ''}
                    onChange={e => setEditingPeriod({ ...editingPeriod, publicMessage: e.target.value })}
                    placeholder="e.g. Closed for maintenance"
                    className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditingPeriod(null)}
                  className="flex-1 px-4 py-2 bg-dark-800 hover:bg-dark-700 text-white rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePeriod}
                  disabled={savingPeriod || !editingPeriod.reason || !editingPeriod.startDate || !editingPeriod.endDate}
                  className="flex-1 px-4 py-2 bg-hubble-600 hover:bg-hubble-500 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  {savingPeriod ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Retention */}
      {retention && (
        <div className="card">
          <h2 className="text-lg font-title font-semibold text-white mb-1 flex items-center gap-2">
            <Database className="w-5 h-5 text-hubble-400" />
            Data Retention
          </h2>
          <p className="text-xs text-dark-500 mb-4">
            Read-only — configure via <code className="bg-dark-800 text-hubble-400 px-1 rounded font-mono">DATA_RETENTION_DAYS</code> in your Docker Compose settings
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-dark-800 rounded-xl p-4">
              <div className="text-xs text-dark-500 mb-1">Status</div>
              <div className={`text-sm font-semibold ${retention.enabled ? 'text-green-400' : 'text-dark-400'}`}>
                {retention.enabled ? 'Enabled' : 'Disabled'}
              </div>
            </div>
            <div className="bg-dark-800 rounded-xl p-4">
              <div className="text-xs text-dark-500 mb-1">Retention Period</div>
              <div className="text-sm font-semibold text-white">
                {retention.enabled ? `${retention.retentionDays} days` : '—'}
              </div>
            </div>
            <div className="bg-dark-800 rounded-xl p-4">
              <div className="text-xs text-dark-500 mb-1">Cutoff Date</div>
              <div className="text-sm font-semibold text-white">
                {retention.cutoffDate ?? '—'}
              </div>
            </div>
            <div className="bg-dark-800 rounded-xl p-4">
              <div className="text-xs text-dark-500 mb-1">Eligible for Removal</div>
              <div className={`text-sm font-semibold ${retention.eligibleForDeletion > 0 ? 'text-amber-400' : 'text-white'}`}>
                {retention.eligibleForDeletion} reservations
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-dark-500">
            <Clock className="w-3.5 h-3.5" />
            Next automatic cleanup: <span className="text-dark-400">{new Date(retention.nextRunAt).toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
