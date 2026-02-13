import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SuccessMessage } from '../components/SuccessMessage';

describe('SuccessMessage', () => {
  const mockOnNewReservation = vi.fn();
  const mockResult = {
    confirmationNumber: 'ABC123',
    eventTitle: 'Test Event',
    contactName: 'John Doe',
    email: 'test@example.com',
  };

  it('renders the confirmation number', () => {
    render(
      <SuccessMessage
        result={mockResult}
        onNewReservation={mockOnNewReservation}
      />
    );
    expect(screen.getByText('ABC123')).toBeInTheDocument();
  });

  it('displays success message', () => {
    render(
      <SuccessMessage
        result={mockResult}
        onNewReservation={mockOnNewReservation}
      />
    );
    // Should indicate success with specific heading text
    expect(screen.getByText('Reservation Submitted!')).toBeInTheDocument();
  });

  it('shows the email address', () => {
    render(
      <SuccessMessage
        result={mockResult}
        onNewReservation={mockOnNewReservation}
      />
    );
    expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
  });

  it('renders a button to make a new reservation', () => {
    render(
      <SuccessMessage
        result={mockResult}
        onNewReservation={mockOnNewReservation}
      />
    );
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });
});

