import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from '../components/Footer';

describe('Footer', () => {
  it('renders the footer element', () => {
    render(<Footer />);
    const footer = document.querySelector('footer');
    expect(footer).toBeInTheDocument();
  });

  it('contains copyright or contact information', () => {
    render(<Footer />);
    // Footer should contain some text content
    const footer = document.querySelector('footer');
    expect(footer?.textContent?.length).toBeGreaterThan(0);
  });
});

