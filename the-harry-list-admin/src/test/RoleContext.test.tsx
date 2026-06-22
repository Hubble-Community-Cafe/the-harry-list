import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { RoleProvider, useRole } from '../lib/RoleContext';

const { mockFetchCurrentUser, mockUseIsAuthenticated } = vi.hoisted(() => ({
  mockFetchCurrentUser: vi.fn(),
  mockUseIsAuthenticated: vi.fn(),
}));

vi.mock('@azure/msal-react', () => ({
  useIsAuthenticated: () => mockUseIsAuthenticated(),
}));

vi.mock('../lib/api', () => ({
  fetchCurrentUser: mockFetchCurrentUser,
}));

// Authenticate via MSAL so the e2e bridge isn't involved in these tests.
vi.mock('../lib/e2eAuth', () => ({
  isE2E: () => false,
}));

const adminUser = { id: 1, azureOid: 'oid-1', email: 'pim@hubble.cafe', displayName: 'Pim', role: 'ADMIN' };

function RoleProbe() {
  const { role, isLoading, error, refetch } = useRole();
  return (
    <div>
      <span data-testid="role">{role ?? 'none'}</span>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="error">{error ?? 'none'}</span>
      <button onClick={() => refetch()}>refetch</button>
    </div>
  );
}

const renderProvider = () =>
  render(
    <RoleProvider>
      <RoleProbe />
    </RoleProvider>
  );

describe('RoleProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseIsAuthenticated.mockReturnValue(true);
  });

  it('resolves the role on a successful fetch', async () => {
    mockFetchCurrentUser.mockResolvedValueOnce(adminUser);

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('ADMIN'));
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(mockFetchCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('recovers from a transient fetch failure by retrying', async () => {
    // Fails twice, then succeeds — the role must still resolve (previously a single
    // failure left role=null permanently and hid role-gated UI).
    mockFetchCurrentUser
      .mockRejectedValueOnce(new Error('network blip'))
      .mockRejectedValueOnce(new Error('network blip'))
      .mockResolvedValueOnce(adminUser);

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('ADMIN'), { timeout: 5000 });
    expect(mockFetchCurrentUser).toHaveBeenCalledTimes(3);
    expect(screen.getByTestId('error')).toHaveTextContent('none');
  });

  it('surfaces an error after exhausting all retries', async () => {
    mockFetchCurrentUser.mockRejectedValue(new Error('still down'));

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('Failed to load user role'), {
      timeout: 5000,
    });
    expect(mockFetchCurrentUser).toHaveBeenCalledTimes(3);
    expect(screen.getByTestId('role')).toHaveTextContent('none');
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });

  it('does not fetch when unauthenticated', async () => {
    mockUseIsAuthenticated.mockReturnValue(false);

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('role')).toHaveTextContent('none');
    expect(mockFetchCurrentUser).not.toHaveBeenCalled();
  });

  it('refetches the role on demand', async () => {
    mockFetchCurrentUser.mockResolvedValueOnce({ ...adminUser, role: 'VIEWER' });

    renderProvider();
    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('VIEWER'));

    mockFetchCurrentUser.mockResolvedValueOnce({ ...adminUser, role: 'ADMIN' });
    await act(async () => {
      screen.getByText('refetch').click();
    });

    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('ADMIN'));
    expect(mockFetchCurrentUser).toHaveBeenCalledTimes(2);
  });
});
