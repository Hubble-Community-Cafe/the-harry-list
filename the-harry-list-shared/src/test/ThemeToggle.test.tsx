import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from '../components/ThemeToggle';
import { ThemeProvider } from '../lib/ThemeContext';

describe('ThemeToggle', () => {
  it('has an accessible name that says what it will do, not only a tooltip', () => {
    localStorage.setItem('theme', 'dark');
    render(<ThemeProvider><ThemeToggle /></ThemeProvider>);
    const toggle = screen.getByRole('button', { name: 'Switch to light mode' });
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeInTheDocument();
  });
});
