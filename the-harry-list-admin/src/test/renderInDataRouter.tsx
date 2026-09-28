import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

/**
 * Renders a page inside a data router, as the app does (main.tsx), so hooks such as useBlocker work.
 * Every other path renders a placeholder "other page", which lets tests navigate away and check
 * whether the page let them go.
 */
interface DataRouterOptions {
  /** Route pattern the page is mounted on, e.g. '/reservations/:id'. */
  path?: string;
  /** URL the test starts on; defaults to `path`. */
  initialEntry?: string;
}

export function renderInDataRouter(element: ReactNode, { path = '/', initialEntry }: DataRouterOptions = {}) {
  const router = createMemoryRouter(
    [
      { path, element },
      { path: '*', element: <div data-testid="other-page">Other page</div> },
    ],
    { initialEntries: [initialEntry ?? path] },
  );
  return { router, ...render(<RouterProvider router={router} />) };
}
