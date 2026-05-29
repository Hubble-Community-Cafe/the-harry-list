import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { UsersPage } from '../pages/UsersPage';

const { mockFetchAllUsers, mockUpdateUserRole } = vi.hoisted(() => ({
  mockFetchAllUsers: vi.fn(),
  mockUpdateUserRole: vi.fn(),
}));

vi.mock('../lib/api', () => ({
  fetchAllUsers: mockFetchAllUsers,
  updateUserRole: mockUpdateUserRole,
}));

const mockRefetch = vi.fn();

vi.mock('../lib/RoleContext', () => ({
  useRole: () => ({
    user: { id: 1, azureOid: 'oid-1', email: 'pim@hubble.cafe', displayName: 'Pim', role: 'ADMIN' },
    role: 'ADMIN',
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  }),
}));

const sampleUsers = [
  { id: 1, azureOid: 'oid-1', email: 'pim@hubble.cafe', displayName: 'Pim', role: 'ADMIN' },
  { id: 2, azureOid: 'oid-2', email: 'josselyn@hubble.cafe', displayName: 'Josselyn', role: 'EDITOR' },
  { id: 3, azureOid: 'oid-3', email: 'mike@hubble.cafe', displayName: 'Mike', role: 'VIEWER' },
];

const renderPage = () =>
  render(
    <BrowserRouter>
      <UsersPage />
    </BrowserRouter>
  );

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchAllUsers.mockResolvedValue(sampleUsers);
  });

  it('renders page title', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument();
    });
  });

  it('displays all users after loading', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Pim')).toBeInTheDocument();
      expect(screen.getByText('Josselyn')).toBeInTheDocument();
      expect(screen.getByText('Mike')).toBeInTheDocument();
    });
  });

  it('shows user emails', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('pim@hubble.cafe')).toBeInTheDocument();
      expect(screen.getByText('josselyn@hubble.cafe')).toBeInTheDocument();
      expect(screen.getByText('mike@hubble.cafe')).toBeInTheDocument();
    });
  });

  it('shows "You" badge next to current user', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('You')).toBeInTheDocument();
    });
  });

  it('shows role badge (not dropdown) for current user', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Pim')).toBeInTheDocument();
    });
    // Current user should see a badge, not a select
    // There should be 2 dropdowns (Josselyn + Mike), not 3
    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(2);
  });

  it('shows role legend with descriptions', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Role Permissions')).toBeInTheDocument();
    });
  });

  it('calls updateUserRole when role is changed', async () => {
    const updatedUser = { ...sampleUsers[2], role: 'EDITOR' };
    mockUpdateUserRole.mockResolvedValue(updatedUser);

    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Mike')).toBeInTheDocument();
    });

    const selects = screen.getAllByRole('combobox');
    // Find the one for Mike (VIEWER)
    const mikeSelect = selects.find(s => (s as HTMLSelectElement).value === 'VIEWER');
    expect(mikeSelect).toBeTruthy();

    fireEvent.change(mikeSelect!, { target: { value: 'EDITOR' } });

    await waitFor(() => {
      expect(mockUpdateUserRole).toHaveBeenCalledWith(3, 'EDITOR');
    });
  });

  it('shows empty state when no users', async () => {
    mockFetchAllUsers.mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/No users yet/)).toBeInTheDocument();
    });
  });

  it('shows error when API fails', async () => {
    mockFetchAllUsers.mockRejectedValue(new Error('Network error'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });
});
