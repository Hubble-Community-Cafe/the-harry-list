// Must be the first import: it configures Zod before any module defines a schema (see the file).
import './lib/zodConfig'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installTranslationCrashGuard, installChunkReload, initSentry } from 'the-harry-list-shared'

declare const __APP_VERSION__: string;

// Must run before React renders: see translationCrashGuard for details.
installTranslationCrashGuard();
// A tab opened before a deploy reloads once to fetch the new build when a lazy chunk is gone.
installChunkReload();

initSentry({
  dsn: window.__RUNTIME_CONFIG__?.SENTRY_DSN || import.meta.env.VITE_SENTRY_DSN,
  app: 'the-harry-list-public',
  version: __APP_VERSION__,
  environment: import.meta.env.MODE,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
