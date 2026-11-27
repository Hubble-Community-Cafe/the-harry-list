import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PublicClientApplication, EventType, type AccountInfo } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { msalConfig } from './lib/authConfig';
import { setMsalInstance } from './lib/api';
import { sentryUserFor } from './lib/sentryUser';
import { installTranslationCrashGuard, installChunkReload, initSentry } from 'the-harry-list-shared';
import App from './App';
import './index.css';

declare const __APP_VERSION__: string;

// Must run before React renders: see translationCrashGuard for details.
installTranslationCrashGuard();
// A tab opened before a deploy reloads once to fetch the new build when a lazy chunk is gone.
installChunkReload();

initSentry({
  dsn: window.__RUNTIME_CONFIG__?.SENTRY_DSN || import.meta.env.VITE_SENTRY_DSN,
  app: 'the-harry-list-admin',
  version: __APP_VERSION__,
  environment: import.meta.env.MODE,
});

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
      Sentry.setUser(sentryUserFor(response.account));
      // Force context update by dispatching a custom event
      window.dispatchEvent(new Event('msal:accountChanged'));
    } else {
      // Set active account if one exists
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        msalInstance.setActiveAccount(accounts[0]);
        Sentry.setUser(sentryUserFor(accounts[0]));
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
      Sentry.setUser(sentryUserFor(payload.account));
      if (import.meta.env.DEV) console.log('Login event - account set:', payload.account?.username);
      window.dispatchEvent(new Event('msal:accountChanged'));
    }
    if (event.eventType === EventType.LOGOUT_SUCCESS) {
      msalInstance.setActiveAccount(null);
      Sentry.setUser(null);
      if (import.meta.env.DEV) console.log('Logout successful');
    }
  });

  // A data router, so pages can block navigation while they hold unsaved changes (useBlocker).
  // One catch-all route renders App, which keeps defining the actual routes with <Routes>.
  const router = createBrowserRouter([{ path: '*', element: <App /> }]);

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <RouterProvider router={router} />
      </MsalProvider>
    </StrictMode>
  );
}).catch((error) => {
  console.error('MSAL initialization error:', error);
  Sentry.captureException(error);
});
