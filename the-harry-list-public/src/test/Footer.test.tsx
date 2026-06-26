import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Footer } from '../components/Footer';

describe('Footer', () => {
  it('renders the footer element', () => {
    render(<Footer onOpenPrivacy={() => {}} />);
    const footer = document.querySelector('footer');
    expect(footer).toBeInTheDocument();
  });

  it('contains copyright or contact information', () => {
    render(<Footer onOpenPrivacy={() => {}} />);
    // Footer should contain some text content
    const footer = document.querySelector('footer');
    expect(footer?.textContent?.length).toBeGreaterThan(0);
  });

  it('opens the privacy policy via its link', () => {
    const onOpenPrivacy = vi.fn();
    render(<Footer onOpenPrivacy={onOpenPrivacy} />);
    fireEvent.click(screen.getByTestId('footer-privacy-link'));
    expect(onOpenPrivacy).toHaveBeenCalledTimes(1);
  });
});

