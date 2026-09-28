import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SkipLink, MAIN_CONTENT_ID } from '../components/SkipLink';

describe('SkipLink', () => {
  it('is a link to the main content with a clear name', () => {
    render(<SkipLink />);
    const link = screen.getByRole('link', { name: 'Skip to content' });
    expect(link).toHaveAttribute('href', `#${MAIN_CONTENT_ID}`);
    expect(link).toHaveClass('skip-link');
  });

  it('moves focus to the main content without changing the URL', () => {
    render(
      <>
        <SkipLink />
        <nav><a href="/somewhere">Navigation</a></nav>
        <main id={MAIN_CONTENT_ID} tabIndex={-1}>Content</main>
      </>,
    );
    const hashBefore = window.location.hash;

    const notPrevented = fireEvent.click(screen.getByRole('link', { name: 'Skip to content' }));

    expect(document.activeElement).toBe(screen.getByRole('main'));
    expect(notPrevented).toBe(false);
    expect(window.location.hash).toBe(hashBefore);
  });

  it('falls back to the plain link when the page has no main content', () => {
    render(<SkipLink />);
    const notPrevented = fireEvent.click(screen.getByRole('link', { name: 'Skip to content' }));
    expect(notPrevented).toBe(true);
  });
});
