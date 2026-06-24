import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PublicClientApplication, EventType, type AccountInfo } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { msalConfig } from './lib/authConfig';
import { setMsalInstance } from './lib/api';
import { installTranslationCrashGuard } from './lib/translationCrashGuard';
import App from './App';
import './index.css';

declare const __APP_VERSION__: string;

// Must run before React renders — see translationCrashGuard for details.
installTranslationCrashGuard();

const sentryDsn = window.__RUNTIME_CONFIG__?.SENTRY_DSN || import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn && !sentryDsn.startsWith('__')) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    release: `the-harry-list-admin@${__APP_VERSION__}`,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
    // Transient client-side network blips (offline, flaky connection,
    // navigation aborts) — not actionable server/app bugs.
    ignoreErrors: [
      'Failed to fetch',
      'NetworkError when attempting to fetch resource',
      'Load failed',
    ],
  });
}

const msalInstance = new PublicClientApplication(msalConfig);

// Set MSAL instance for API module to use for token acquisition
setMsalInstance(msalInstance);

// Initialize MSAL before rendering
msalInstance.initialize().then(async () => {
  // Handle redirect response (for redirect-based login)
  try {
    const response = await msalInstance.handleRedirectPromise();
    if (response) {
      if (import.meta.env.DEV) console.log('Login successful via redirect:', response.account?.username);
      msalInstance.setActiveAccount(response.account);
      if (response.account) {
        Sentry.setUser({ email: response.account.username });
      }
      // Force context update by dispatching a custom event
      window.dispatchEvent(new Event('msal:accountChanged'));
    } else {
      // Set active account if one exists
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        msalInstance.setActiveAccount(accounts[0]);
        Sentry.setUser({ email: accounts[0].username });
        if (import.meta.env.DEV) console.log('Active account restored:', accounts[0].username);
        window.dispatchEvent(new Event('msal:accountChanged'));
      }
    }
  } catch (error) {
    console.error('Error handling redirect:', error);
    Sentry.captureException(error);
  }

  // Listen for login events
  msalInstance.addEventCallback((event) => {
    if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
      const payload = event.payload as { account: AccountInfo | null };
      msalInstance.setActiveAccount(payload.account);
      if (payload.account) {
        Sentry.setUser({ email: payload.account.username });
      }
      if (import.meta.env.DEV) console.log('Login event - account set:', payload.account?.username);
      window.dispatchEvent(new Event('msal:accountChanged'));
    }
    if (event.eventType === EventType.LOGOUT_SUCCESS) {
      msalInstance.setActiveAccount(null);
      Sentry.setUser(null);
      if (import.meta.env.DEV) console.log('Logout successful');
    }
  });

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </MsalProvider>
    </StrictMode>
  );
}).catch((error) => {
  console.error('MSAL initialization error:', error);
  Sentry.captureException(error);
});
