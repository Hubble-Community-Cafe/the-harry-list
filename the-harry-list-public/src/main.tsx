import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.tsx'

declare const __APP_VERSION__: string;

const sentryDsn = window.__RUNTIME_CONFIG__?.SENTRY_DSN || import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn && !sentryDsn.startsWith('__')) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    release: `the-harry-list-public@${__APP_VERSION__}`,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
