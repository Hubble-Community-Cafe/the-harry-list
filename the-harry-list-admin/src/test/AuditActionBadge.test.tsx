import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuditActionBadge } from '../components/AuditActionBadge';

describe('AuditActionBadge', () => {
  it.each([
    ['CREATE', 'Created', 'status-confirmed'],
    ['UPDATE', 'Updated', 'text-hubble-400'],
    ['DELETE', 'Deleted', 'status-rejected'],
    ['STATUS_CHANGE', 'Status changed', 'status-pending'],
    ['NOTES_UPDATED', 'Notes updated', 'text-hubble-400'],
    ['CATERING_ARRANGED', 'Catering', 'status-pending'],
    ['EMAIL_SENT', 'Email sent', 'text-meteor-400'],
    ['ROLE_CHANGED', 'Role changed', 'status-rejected'],
    ['TOGGLE', 'Toggled', 'status-cancelled'],
  ])('shows %s as "%s" in a housestyle tone', (action, label, className) => {
    render(<AuditActionBadge action={action} />);
    expect(screen.getByText(label)).toHaveClass(className);
  });

  it('shows an unknown action as-is on a neutral tint', () => {
    render(<AuditActionBadge action="SOMETHING_NEW" />);
    expect(screen.getByText('SOMETHING_NEW')).toHaveClass('bg-dark-700');
  });

  it('uses no colours from outside the palette', () => {
    const { container } = render(
      <>{['CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'CATERING_ARRANGED'].map((a) => <AuditActionBadge key={a} action={a} />)}</>,
    );
    expect(container.innerHTML).not.toMatch(/(green|blue|red|amber|orange)-\d{3}/);
  });
});
