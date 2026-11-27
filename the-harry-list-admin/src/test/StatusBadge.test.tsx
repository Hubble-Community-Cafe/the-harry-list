import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../components/StatusBadge';
import { statusEdgeClass } from '../lib/status';

describe('StatusBadge', () => {
  it.each([
    ['PENDING', 'Pending', 'status-pending'],
    ['CONFIRMED', 'Confirmed', 'status-confirmed'],
    ['REJECTED', 'Rejected', 'status-rejected'],
    ['CANCELLED', 'Cancelled', 'status-cancelled'],
  ])('shows %s as "%s" with its token colours', (status, label, className) => {
    render(<StatusBadge status={status} testId="badge" />);
    const badge = screen.getByTestId('badge');
    expect(badge).toHaveTextContent(label);
    expect(badge).toHaveClass(className);
    // The icon is decorative: the word carries the meaning, never colour alone.
    expect(badge.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('gives cancelled its own icon, so it differs from rejected by more than colour', () => {
    render(<><StatusBadge status="REJECTED" testId="r" /><StatusBadge status="CANCELLED" testId="c" /></>);
    const icon = (id: string) => screen.getByTestId(id).querySelector('svg')?.getAttribute('class');
    expect(icon('r')).toContain('circle-x');
    expect(icon('c')).toContain('ban');
  });

  it('has a compact size for week cards and a large one for the detail header', () => {
    render(<><StatusBadge status="PENDING" size="compact" testId="s" /><StatusBadge status="PENDING" size="large" testId="l" /></>);
    expect(screen.getByTestId('s')).toHaveClass('text-[10px]');
    expect(screen.getByTestId('l')).toHaveClass('text-sm');
  });
});

describe('statusEdgeClass', () => {
  it('colours a card edge by status, with a neutral fallback', () => {
    expect(statusEdgeClass('CONFIRMED')).toBe('status-edge-confirmed');
    expect(statusEdgeClass('UNKNOWN')).toBe('border-l-dark-600');
  });
});
