import { describe, it, expect, vi, afterEach } from 'vitest';
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

  afterEach(() => {
    delete window.__RUNTIME_CONFIG__;
  });

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

  it('warns the guest about the sender address and spam folder', () => {
    render(
      <SuccessMessage
        result={mockResult}
        onNewReservation={mockOnNewReservation}
      />
    );
    const notice = screen.getByTestId('sender-notice');
    expect(notice).toHaveTextContent(/spam/i);
    // Falls back to the default sender address when no runtime config is injected.
    expect(notice).toHaveTextContent('noreply@ducksandbears.cafe');
  });

  it('shows the runtime-injected sender address so it stays in sync with the backend', () => {
    window.__RUNTIME_CONFIG__ = { SENDER_EMAIL: 'noreply@example-cafe.test' };
    render(
      <SuccessMessage
        result={mockResult}
        onNewReservation={mockOnNewReservation}
      />
    );
    expect(screen.getByTestId('sender-notice')).toHaveTextContent('noreply@example-cafe.test');
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

