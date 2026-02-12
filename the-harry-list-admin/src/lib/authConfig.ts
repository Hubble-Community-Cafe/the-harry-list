import type { Configuration } from '@azure/msal-browser';
import { LogLevel } from '@azure/msal-browser';

// Runtime configuration interface
declare global {
  interface Window {
    __RUNTIME_CONFIG__?: {
      API_URL?: string;
      AZURE_CLIENT_ID?: string;
      AZURE_TENANT_ID?: string;
      REDIRECT_URI?: string;
      ALLOWED_GROUP_ID?: string;
    };
  }
}

// Helper to get runtime config value (falls back to build-time env)
const getConfig = (runtimeKey: keyof NonNullable<typeof window.__RUNTIME_CONFIG__>, envKey: string): string => {
  const runtimeValue = window.__RUNTIME_CONFIG__?.[runtimeKey];
  // Check if it's a valid value (not the placeholder)
  if (runtimeValue && !runtimeValue.startsWith('__')) {
    return runtimeValue;
  }
  // Fall back to build-time env variable
  return import.meta.env[envKey] || '';
};

// Get configuration values from runtime config or build-time env
const AZURE_CLIENT_ID = getConfig('AZURE_CLIENT_ID', 'VITE_AZURE_CLIENT_ID');
const AZURE_TENANT_ID = getConfig('AZURE_TENANT_ID', 'VITE_AZURE_TENANT_ID');
const REDIRECT_URI = getConfig('REDIRECT_URI', 'VITE_REDIRECT_URI') || window.location.origin;

// Debug logging for auth configuration
console.log('Auth Config:', {
  clientId: AZURE_CLIENT_ID ? `${AZURE_CLIENT_ID.substring(0, 8)}...` : '(not set)',
  tenantId: AZURE_TENANT_ID ? `${AZURE_TENANT_ID.substring(0, 8)}...` : '(not set)',
  redirectUri: REDIRECT_URI,
  runtimeConfig: window.__RUNTIME_CONFIG__ ? 'loaded' : 'not loaded',
});

// Allowed group ID - only members of this group can access the admin portal
export const ALLOWED_GROUP_ID = getConfig('ALLOWED_GROUP_ID', 'VITE_ALLOWED_GROUP_ID');

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

// Request for checking group membership
export const groupMembershipRequest = {
  scopes: ['GroupMember.Read.All'],
};

export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me',
  graphMemberOfEndpoint: 'https://graph.microsoft.com/v1.0/me/memberOf',
};
