import { useRole } from './RoleContext';

export function usePermissions() {
  const { role } = useRole();

  const isEditor = role === 'EDITOR' || role === 'ADMIN';
  const isAdmin = role === 'ADMIN';

  return {
    // Editor-level permissions
    canUpdateReservations: isEditor,
    canManageBlockedPeriods: isEditor,
    canManageAppointments: isEditor,
    canManageAttachments: isEditor,

    // Admin-level permissions
    canEditEmailTemplates: isAdmin,
    canEditFormSettings: isAdmin,
    canManageUsers: isAdmin,
  };
}
