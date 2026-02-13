import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock window.config for runtime config
(window as any).config = {
  API_BASE_URL: 'http://localhost:8080',
  AZURE_CLIENT_ID: 'test-client-id',
  AZURE_TENANT_ID: 'test-tenant-id',
};

// Mock MSAL
vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({
    instance: {
      acquireTokenSilent: vi.fn().mockResolvedValue({ accessToken: 'test-token' }),
    },
    accounts: [{ name: 'Test User', username: 'test@example.com' }],
    inProgress: 'none',
  }),
  useIsAuthenticated: () => true,
  MsalProvider: ({ children }: { children: React.ReactNode }) => children,
}));

