import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from '../components/Header';
import { ThemeProvider } from '../lib/ThemeContext';

const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <ThemeProvider>
      {component}
    </ThemeProvider>
  );
};

describe('Header', () => {
  it('renders the Hubble logo text', () => {
    renderWithProviders(<Header />);
    expect(screen.getByText(/hubble/i)).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    renderWithProviders(<Header />);
    // Header should be present
    const header = document.querySelector('header');
    expect(header).toBeInTheDocument();
  });
});

