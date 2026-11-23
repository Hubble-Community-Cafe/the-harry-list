import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { MAIN_CONTENT_ID } from 'the-harry-list-shared';

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

// Keep the rest of the shared package real (SkipLink, ThemeProvider); only the toggle is not under test.
vi.mock('the-harry-list-shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('the-harry-list-shared')>()),
  ThemeToggle: () => null,
}));

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

describe('Layout navigation for keyboard and screen readers', () => {
  it('gives each page its own tab title', async () => {
    renderLayout();
    expect(document.title).toBe('Dashboard · The Harry List Admin');
    fireEvent.click(screen.getByRole('link', { name: /Reservations/ }));
    await screen.findByRole('heading', { name: 'Reservations page' });
    expect(document.title).toBe('Reservations · The Harry List Admin');
  });

  it('has a named menu button that opens the drawer, and Escape closes it back to the button', async () => {
    renderLayout();
    const menu = screen.getByRole('button', { name: 'Open menu' });
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    expect(menu).toHaveAttribute('aria-controls', document.querySelector('aside')?.id);

    fireEvent.click(menu);
    expect(menu).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: /Dashboard/ })).toHaveFocus();

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    expect(menu).toHaveFocus();
  });

  it('keeps the closed drawer out of reach on a phone', () => {
    // The test setup's matchMedia matches nothing, so this renders the phone layout.
    renderLayout();
    expect(document.querySelector('aside')).toHaveAttribute('inert');
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(document.querySelector('aside')).not.toHaveAttribute('inert');
  });

  it('has one h1 per page: the sidebar brand is not a heading', () => {
    renderLayout();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });
});
