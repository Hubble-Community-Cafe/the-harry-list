import type { MouseEvent } from 'react';

/** The id of the page's `<main>`, which the skip link jumps to. Give `<main>` `tabIndex={-1}` too. */
export const MAIN_CONTENT_ID = 'main-content';

/**
 * "Skip to content": the first focusable element on the page, so keyboard and screen reader users
 * can jump past the header and navigation (WCAG 2.4.1). Hidden until it receives focus (see
 * `.skip-link` in index.css). Moves focus itself rather than following the #hash, so it never
 * changes the URL or the router state.
 */
export function SkipLink() {
  const skipToContent = (event: MouseEvent<HTMLAnchorElement>) => {
    const main = document.getElementById(MAIN_CONTENT_ID);
    if (!main) return;
    event.preventDefault();
    main.focus();
    main.scrollIntoView({ block: 'start' });
  };

  return (
    <a href={`#${MAIN_CONTENT_ID}`} className="skip-link" onClick={skipToContent}>
      Skip to content
    </a>
  );
}
