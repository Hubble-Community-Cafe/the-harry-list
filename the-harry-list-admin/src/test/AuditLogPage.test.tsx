import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuditLogPage } from '../pages/AuditLogPage';
import type { AuditLogPageResponse } from '../types/audit';

const { samplePage } = vi.hoisted(() => ({
  samplePage: {
    content: [
      {
        id: 10,
        entityType: 'RESERVATION',
        entityId: 1,
        entityLabel: 'ABC123 - Birthday Party',
        action: 'STATUS_CHANGE',
        actorOid: 'oid-1',
        actorEmail: 'staff@example.com',
        actorName: 'Staff Member',
        changes: [{ field: 'status', oldValue: 'PENDING', newValue: 'CONFIRMED' }],
        summary: 'Status changed',
        createdAt: '2026-06-01T12:00:00',
      },
    ],
    page: 0,
    size: 50,
    totalElements: 1,
    totalPages: 1,
  } as AuditLogPageResponse,
}));

vi.mock('../lib/api', () => ({
  fetchAuditLog: vi.fn().mockResolvedValue(samplePage),
}));

import { fetchAuditLog } from '../lib/api';

const renderPage = () => render(<BrowserRouter><AuditLogPage /></BrowserRouter>);

describe('AuditLogPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchAuditLog).mockResolvedValue(samplePage);
  });

  it('renders audit entries with action, entity label, actor and field diffs', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('ABC123 - Birthday Party')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText('Status changed')).toBeInTheDocument();
    expect(screen.getByText('Staff Member')).toBeInTheDocument();
    expect(screen.getByText('status')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(screen.getByText('CONFIRMED')).toBeInTheDocument();
  });

  it('passes the selected entity type filter to the API and resets to page 0', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('ABC123 - Birthday Party')).toBeInTheDocument();
    });

    const entitySelect = screen.getByLabelText('Entity type');
    fireEvent.change(entitySelect, { target: { value: 'ADMIN_USER' } });

    await waitFor(() => {
      expect(fetchAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'ADMIN_USER', page: 0 })
      );
    });
  });

  it('passes the selected date range to the API as inclusive ISO bounds', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('ABC123 - Birthday Party')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2026-06-01' } });
    fireEvent.change(screen.getByLabelText('To date'), { target: { value: '2026-06-30' } });

    await waitFor(() => {
      expect(fetchAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '2026-06-01T00:00:00',
          to: '2026-06-30T23:59:59',
          page: 0,
        })
      );
    });
  });

  it('shows an empty state when there are no entries', async () => {
    vi.mocked(fetchAuditLog).mockResolvedValueOnce({
      content: [], page: 0, size: 50, totalElements: 0, totalPages: 0,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('No audit entries match your filters.')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
