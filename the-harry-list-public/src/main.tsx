import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.tsx'
import { installTranslationCrashGuard } from './lib/translationCrashGuard'

declare const __APP_VERSION__: string;

// Must run before React renders — see translationCrashGuard for details.
installTranslationCrashGuard();

const sentryDsn = window.__RUNTIME_CONFIG__?.SENTRY_DSN || import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn && !sentryDsn.startsWith('__')) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    release: `the-harry-list-public@${__APP_VERSION__}`,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
    // Transient client-side network blips (offline, flaky mobile, navigation
    // aborts). Already handled by fetchWithRetry + in-app error UI — not bugs.
    ignoreErrors: [
      'Failed to fetch',
      'NetworkError when attempting to fetch resource',
      'Load failed',
    ],
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
