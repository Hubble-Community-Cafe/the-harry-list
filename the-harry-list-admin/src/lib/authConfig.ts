import type { Configuration } from '@azure/msal-browser';
import { LogLevel } from '@azure/msal-browser';
import { configuredValue } from 'the-harry-list-shared';

// Runtime configuration interface
declare global {
  interface Window {
    __RUNTIME_CONFIG__?: {
      API_URL?: string;
      AZURE_CLIENT_ID?: string;
      AZURE_TENANT_ID?: string;
      REDIRECT_URI?: string;
      SENTRY_DSN?: string;
      // e2e-only: injected by docker-compose.e2e.yml to bypass MSAL in tests.
      E2E_AUTH_OID?: string;
      E2E_AUTH_EMAIL?: string;
      E2E_AUTH_NAME?: string;
    };
  }
}

// Helper to get runtime config value (falls back to build-time env)
const getConfig = (runtimeKey: keyof NonNullable<typeof window.__RUNTIME_CONFIG__>, envKey: string): string => {
  // A filled-in runtime value wins; otherwise fall back to the build-time env variable.
  return configuredValue(window.__RUNTIME_CONFIG__?.[runtimeKey]) ?? (import.meta.env[envKey] || '');
};

// Get configuration values from runtime config or build-time env
const AZURE_CLIENT_ID = getConfig('AZURE_CLIENT_ID', 'VITE_AZURE_CLIENT_ID');
const AZURE_TENANT_ID = getConfig('AZURE_TENANT_ID', 'VITE_AZURE_TENANT_ID');
const REDIRECT_URI = getConfig('REDIRECT_URI', 'VITE_REDIRECT_URI') || window.location.origin;

// Debug logging for auth configuration (dev only)
if (import.meta.env.DEV) {
  console.log('Auth Config:', {
    clientId: AZURE_CLIENT_ID ? `${AZURE_CLIENT_ID.substring(0, 8)}...` : '(not set)',
    tenantId: AZURE_TENANT_ID ? `${AZURE_TENANT_ID.substring(0, 8)}...` : '(not set)',
    redirectUri: REDIRECT_URI,
    runtimeConfig: window.__RUNTIME_CONFIG__ ? 'loaded' : 'not loaded',
  });
}

export const msalConfig: Configuration = {
  auth: {
    clientId: AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${AZURE_TENANT_ID || 'common'}`,
    redirectUri: REDIRECT_URI,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
          default:
            return;
        }
      },
    },
  },
};

export const loginRequest = {
  scopes: [
    'User.Read',
    'openid',
    'profile',
    'email',
    `api://${AZURE_CLIENT_ID}/access_as_user`
  ],
};
