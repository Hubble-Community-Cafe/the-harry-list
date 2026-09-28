import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { MAIN_CONTENT_ID } from '../components/SkipLink';

vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({ instance: { logoutPopup: vi.fn() }, accounts: [{ name: 'Test User', username: 'test@hubble.cafe' }] }),
}));

vi.mock('../lib/api', () => ({ clearAuth: vi.fn() }));

vi.mock('../lib/usePermissions', () => ({
  usePermissions: () => ({
    canEditEmailTemplates: false,
    canManageAttachments: false,
    canEditFormSettings: false,
    canViewAuditLog: false,
  }),
}));

vi.mock('../lib/RoleContext', () => ({ useRole: () => ({ role: 'VIEWER' }) }));

vi.mock('../components/ThemeToggle', () => ({ ThemeToggle: () => null }));

const renderLayout = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<h1>Dashboard page</h1>} />
          <Route path="/reservations" element={<h1>Reservations page</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

describe('Layout focus management', () => {
  it('renders the skip link first and a focusable main content area', () => {
    renderLayout();
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', MAIN_CONTENT_ID);
    expect(main).toHaveAttribute('tabindex', '-1');
    const firstLink = document.querySelector('a');
    expect(firstLink).toHaveTextContent('Skip to content');
  });

  it('leaves focus alone on the first page load', () => {
    renderLayout();
    expect(document.activeElement).not.toBe(screen.getByRole('main'));
  });

  it('moves focus to the content and scrolls it to the top after navigating', async () => {
    renderLayout();
    const main = screen.getByRole('main');
    main.scrollTop = 250;

    fireEvent.click(screen.getByRole('link', { name: /Reservations/ }));

    expect(await screen.findByRole('heading', { name: 'Reservations page' })).toBeInTheDocument();
    expect(document.activeElement).toBe(main);
    expect(main.scrollTop).toBe(0);
  });
});
