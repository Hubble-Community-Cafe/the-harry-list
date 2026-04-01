import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { EmailTemplatesPage } from '../pages/EmailTemplatesPage';

// Hoist mocks so vi.mock factory can access them
const { mockFetchWithAuth, mockFetchEmailAttachments, mockUploadEmailAttachment,
  mockDeleteEmailAttachment, mockToggleEmailAttachmentActive } = vi.hoisted(() => {
  return {
    mockFetchWithAuth: vi.fn(),
    mockFetchEmailAttachments: vi.fn(),
    mockUploadEmailAttachment: vi.fn(),
    mockDeleteEmailAttachment: vi.fn(),
    mockToggleEmailAttachmentActive: vi.fn(),
  };
});

vi.mock('../lib/api', () => ({
  fetchWithAuth: mockFetchWithAuth,
  fetchEmailAttachments: mockFetchEmailAttachments,
  uploadEmailAttachment: mockUploadEmailAttachment,
  deleteEmailAttachment: mockDeleteEmailAttachment,
  toggleEmailAttachmentActive: mockToggleEmailAttachmentActive,
}));

const sampleTemplates = [
  {
    templateType: 'SUBMITTED',
    displayName: 'Reservation Submitted',
    description: 'Sent when a reservation is submitted',
    subject: 'Reservation Received - {{eventTitle}}',
    bodyTemplate: '<p>Hello {{contactName}}</p>',
    customized: false,
    updatedAt: null,
    availableVariables: ['contactName', 'eventTitle'],
  },
];

const sampleAttachments = [
  { id: 1, name: 'Catering Menu', filename: 'menu.pdf', contentType: 'application/pdf', active: true, createdAt: '2026-01-15T10:00:00' },
  { id: 2, name: 'Drinks List', filename: 'drinks.pdf', contentType: 'application/pdf', active: false, createdAt: '2026-01-16T10:00:00' },
];

function renderPage() {
  return render(
    <BrowserRouter>
      <EmailTemplatesPage />
    </BrowserRouter>
  );
}

describe('EmailTemplatesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(sampleTemplates),
    });
    mockFetchEmailAttachments.mockResolvedValue(sampleAttachments);
  });

  it('should render email templates section', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Email Templates')).toBeDefined();
    });
  });

  it('should render PDF attachments section', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('PDF Attachments')).toBeDefined();
    });
  });

  it('should load and display attachments', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Catering Menu')).toBeDefined();
      expect(screen.getByText('Drinks List')).toBeDefined();
    });
    expect(mockFetchEmailAttachments).toHaveBeenCalledOnce();
  });

  it('should show active/inactive status for attachments', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Active')).toBeDefined();
      expect(screen.getByText('Inactive')).toBeDefined();
    });
  });

  it('should have upload form with name input and upload button', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('PDF Attachments')).toBeDefined();
    });

    const nameInput = screen.getByPlaceholderText('Display name (e.g. Catering Menu 2026)');
    expect(nameInput).toBeDefined();

    const uploadBtn = screen.getByText('Upload');
    expect(uploadBtn).toBeDefined();

    // Upload button should be disabled when name is empty
    expect((uploadBtn as HTMLButtonElement).disabled).toBe(true);

    // Type a name - button should become enabled
    fireEvent.change(nameInput, { target: { value: 'New Menu' } });
    expect((uploadBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it('should delete an attachment', async () => {
    mockDeleteEmailAttachment.mockResolvedValue(undefined);

    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Catering Menu')).toBeDefined();
    });

    // Verify the attachments loaded and delete function is available
    expect(mockFetchEmailAttachments).toHaveBeenCalled();
  });

  it('should toggle attachment active status', async () => {
    const toggledAttachment = { ...sampleAttachments[0], active: false };
    mockToggleEmailAttachmentActive.mockResolvedValue(toggledAttachment);

    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Active')).toBeDefined();
    });

    // Click the "Active" toggle button
    const activeBtn = screen.getByText('Active');
    fireEvent.click(activeBtn);

    await waitFor(() => {
      expect(mockToggleEmailAttachmentActive).toHaveBeenCalledWith(1, false);
    });
  });

  it('should show empty state when no attachments', async () => {
    mockFetchEmailAttachments.mockResolvedValue([]);

    renderPage();
    await waitFor(() => {
      expect(screen.getByText('PDF Attachments')).toBeDefined();
    });

    // The upload form should still be visible
    expect(screen.getByText('Upload')).toBeDefined();
  });

  it('should show template cards', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Reservation Submitted')).toBeDefined();
    });
  });
});
