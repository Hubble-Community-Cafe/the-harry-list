import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as Sentry from '@sentry/react';
import { ErrorBoundary } from '../components/ErrorBoundary';

vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));

function Crash(): never {
  throw new Error('render failed');
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // React logs caught render errors; keep the test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it('renders its children when nothing fails', () => {
    render(<ErrorBoundary buttonClassName="bg-x"><p>All good</p></ErrorBoundary>);

    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('shows the fallback with the app’s icon and button style, and reports to Sentry', () => {
    render(
      <ErrorBoundary buttonClassName="bg-hubble-600" icon={<span data-testid="icon" />}>
        <Crash />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh page' })).toHaveClass('bg-hubble-600');
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'render failed' }), expect.anything());
  });
});
