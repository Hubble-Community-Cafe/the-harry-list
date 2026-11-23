import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HelpGuide } from '../components/HelpGuide';

const sections = [
  { title: 'Overview', content: 'What this page does.' },
  { title: 'Filters', content: 'How to filter.' },
  { title: 'Export', content: 'How to export.' },
];

describe('HelpGuide', () => {
  it('opens as a named dialog with a keyboard-scrollable content region', () => {
    render(<HelpGuide title="Reservations help" sections={sections} />);
    fireEvent.click(screen.getByRole('button', { name: /Help/ }));

    expect(screen.getByRole('dialog', { name: 'Reservations help' })).toBeInTheDocument();
    const region = screen.getByRole('region', { name: 'Overview' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('button', { name: 'Close help' })).toBeInTheDocument();
  });

  it('names each section dot, marks the current one, and jumps on click', () => {
    render(<HelpGuide title="Reservations help" sections={sections} />);
    fireEvent.click(screen.getByRole('button', { name: /Help/ }));

    expect(screen.getByRole('button', { name: 'Go to Overview' })).toHaveAttribute('aria-current', 'step');
    fireEvent.click(screen.getByRole('button', { name: 'Go to Export' }));
    expect(screen.getByRole('region', { name: 'Export' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to Export' })).toHaveAttribute('aria-current', 'step');
  });
});
