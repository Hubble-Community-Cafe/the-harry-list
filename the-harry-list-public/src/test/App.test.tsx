import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';

// The form itself is covered by ReservationForm.test.tsx; here only the App-level loading matters.
vi.mock('../components/ReservationForm', () => ({
  ReservationForm: () => <div data-testid="reservation-form-stub" />,
}));

// Prevent the altcha custom element from registering web workers in jsdom.
vi.mock('altcha', () => ({}));

describe('App: parts that load on demand', () => {
  afterEach(() => {
    delete (window as { requestIdleCallback?: unknown }).requestIdleCallback;
  });

  it('does not mount the privacy dialog until it is first opened, then shows it', async () => {
    render(<App />);
    expect(screen.queryByTestId('privacy-policy')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('footer-privacy-link'));

    expect(await screen.findByTestId('privacy-policy')).toBeInTheDocument();
  });

  it('prefetches the deferred parts in idle time after the first render', () => {
    const requestIdleCallback = vi.fn();
    (window as { requestIdleCallback?: unknown }).requestIdleCallback = requestIdleCallback;

    render(<App />);

    expect(screen.getByTestId('reservation-form-stub')).toBeInTheDocument();
    expect(requestIdleCallback).toHaveBeenCalledTimes(1);
    expect(requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 3000 });
  });
});

describe('App: hero', () => {
  it('names the page as one sentence, with each café in its own flat colour', () => {
    render(<App />);
    const hero = screen.getByRole('heading', { level: 1, name: 'Reserve Your Spot at Hubble & Meteor' });
    expect(hero).toHaveClass('font-title');
    expect(screen.getByText('Hubble', { selector: 'h1 span' })).toHaveClass('text-hubble-400');
    expect(screen.getByText('Meteor', { selector: 'h1 span' })).toHaveClass('text-meteor-400');
    expect(hero.outerHTML).not.toMatch(/bg-clip-text|bg-gradient/);
  });
});
