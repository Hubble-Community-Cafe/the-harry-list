import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ExportPage } from '../pages/ExportPage';

const renderWithRouter = (component: React.ReactNode) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('ExportPage', () => {
  it('renders the export page title', () => {
    renderWithRouter(<ExportPage />);
    expect(screen.getByText('Export reservations')).toBeInTheDocument();
  });

  it('displays date picker', () => {
    renderWithRouter(<ExportPage />);
    const dateInput = document.querySelector('input[type="date"]');
    expect(dateInput).toBeInTheDocument();
  });

  it('displays location options', () => {
    renderWithRouter(<ExportPage />);
    expect(screen.getByText(/hubble/i)).toBeInTheDocument();
    expect(screen.getByText(/meteor/i)).toBeInTheDocument();
  });

  it('groups the location toggles under a name and says which one is selected', () => {
    renderWithRouter(<ExportPage />);
    const group = screen.getByRole('group', { name: 'Select location' });
    // The emoji are decorative (aria-hidden), so the names are just the café names.
    const toggles = [within(group).getByRole('button', { name: 'Hubble' }), within(group).getByRole('button', { name: 'Meteor' })];
    expect(toggles.filter((t) => t.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    expect(screen.getByRole('group', { name: 'Filter' })).toBeInTheDocument();
  });

  it('has a download button', () => {
    renderWithRouter(<ExportPage />);
    const downloadButton = screen.getByRole('button', { name: /download|pdf/i });
    expect(downloadButton).toBeInTheDocument();
  });

  it('displays confirmed only filter', () => {
    renderWithRouter(<ExportPage />);
    expect(screen.getByText(/confirmed/i)).toBeInTheDocument();
  });

  it('displays catering only filter', () => {
    renderWithRouter(<ExportPage />);
    expect(screen.getByText(/catering reservations only/i)).toBeInTheDocument();
  });

  it('catering filter is unchecked by default', () => {
    renderWithRouter(<ExportPage />);
    const cateringCheckbox = screen
      .getByText(/catering reservations only/i)
      .closest('label')!
      .querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(cateringCheckbox).not.toBeChecked();
  });

  it('notes that appointments appear on the report', () => {
    renderWithRouter(<ExportPage />);
    expect(screen.getByText(/appointments page/i)).toBeInTheDocument();
  });
});

