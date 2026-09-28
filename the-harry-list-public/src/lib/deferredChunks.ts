import { lazy } from 'react';

/*
 * Parts of the form that the first screen does not need, each in its own chunk so the first
 * download stays small (ALTCHA alone is about 80 KB and is only used on the last step).
 */
const loadAltchaWidget = () => import('../components/AltchaWidget');
const loadPrivacyPolicy = () => import('../components/PrivacyPolicy');
const loadSuccessMessage = () => import('../components/SuccessMessage');

export const AltchaWidget = lazy(() => loadAltchaWidget().then((m) => ({ default: m.AltchaWidget })));
export const PrivacyPolicy = lazy(() => loadPrivacyPolicy().then((m) => ({ default: m.PrivacyPolicy })));
export const SuccessMessage = lazy(() => loadSuccessMessage().then((m) => ({ default: m.SuccessMessage })));

/**
 * Fetch the deferred chunks in the background once the first screen is up. They are then ready
 * long before a visitor reaches the last step, so a deploy that happens while the form is being
 * filled in can never make them fail to load (which would reload the page and lose the input).
 */
export function prefetchDeferredChunks(): void {
  const prefetch = () => {
    void Promise.all([loadAltchaWidget(), loadPrivacyPolicy(), loadSuccessMessage()]).catch(() => {
      // A failed prefetch is retried by React.lazy when the part is actually needed.
    });
  };
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(prefetch, { timeout: 3000 });
  } else {
    setTimeout(prefetch, 1500);
  }
}
