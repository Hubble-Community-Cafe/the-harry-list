import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, X, Users, Shield } from 'lucide-react';
import { fetchAllUsers, updateUserRole, type AdminUser } from '../lib/api';
import { useRole } from '../lib/RoleContext';

const ROLE_OPTIONS = ['VIEWER', 'EDITOR', 'ADMIN'] as const;

const ROLE_STYLES: Record<string, string> = {
  ADMIN: 'bg-red-500/20 text-red-400',
  EDITOR: 'bg-hubble-500/20 text-hubble-400',
  VIEWER: 'bg-dark-700 text-dark-300',
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  ADMIN: 'Full access including user management, email templates, and form settings',
  EDITOR: 'Can manage reservations, blocked periods, appointments, and attachments',
  VIEWER: 'Read-only access to all pages, can export data',
};

export function UsersPage() {
  const { user: currentUser, refetch: refetchRole } = useRole();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<number | null>(null);

  useEffect(() => {
    fetchAllUsers()
      .then(setUsers)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load users'))
      .finally(() => setLoading(false));
  }, []);

  const handleRoleChange = async (userId: number, newRole: string) => {
    setSaving(userId);
    setError(null);
    try {
      const updated = await updateUserRole(userId, newRole);
      setUsers(prev => prev.map(u => u.id === userId ? updated : u));
      refetchRole();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setSaving(null);
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
      <div>
        <h1 className="text-2xl font-title font-bold text-white">User Management</h1>
        <p className="text-dark-400 font-light">Manage admin panel access and roles</p>
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

      {/* Role Legend */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-dark-400" />
          <span className="text-sm font-medium text-dark-300">Role Permissions</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {ROLE_OPTIONS.map(role => (
            <div key={role} className="flex items-start gap-2">
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded mt-0.5 ${ROLE_STYLES[role]}`}>
                {role}
              </span>
              <span className="text-xs text-dark-500">{ROLE_DESCRIPTIONS[role]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Users List */}
      {users.length === 0 ? (
        <div className="card text-center py-12">
          <Users className="w-12 h-12 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400">No users yet. Users are created automatically on first login.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map(user => {
            const isSelf = currentUser?.id === user.id;
            return (
              <div
                key={user.id}
                className="bg-dark-900 border border-dark-800 rounded-xl p-4 flex items-center gap-4"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-hubble-500/20 flex items-center justify-center shrink-0">
                  <span className="text-hubble-400 font-semibold text-sm">
                    {(user.displayName || user.email).charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-medium">{user.displayName || 'Unknown'}</span>
                    {isSelf && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-dark-700 text-dark-400">
                        You
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-dark-500 truncate">{user.email}</div>
                </div>

                {/* Role selector */}
                <div className="flex items-center gap-2 shrink-0">
                  {isSelf ? (
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${ROLE_STYLES[user.role]}`}>
                      {user.role}
                    </span>
                  ) : (
                    <div className="relative">
                      <select
                        value={user.role}
                        onChange={e => handleRoleChange(user.id, e.target.value)}
                        disabled={saving === user.id}
                        className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-1.5 text-white text-sm appearance-none pr-8 cursor-pointer disabled:opacity-50"
                      >
                        {ROLE_OPTIONS.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                      {saving === user.id && (
                        <Loader2 className="w-4 h-4 text-hubble-400 animate-spin absolute right-2 top-1/2 -translate-y-1/2" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
