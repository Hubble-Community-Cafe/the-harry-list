import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    expect(screen.getByText('Export Reservations')).toBeInTheDocument();
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
});

