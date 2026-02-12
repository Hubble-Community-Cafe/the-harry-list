import { PublicClientApplication } from '@azure/msal-browser';

// Get API URL from runtime config or fall back to build-time env
const getApiUrl = (): string => {
  const runtimeUrl = (window as any).__RUNTIME_CONFIG__?.API_URL;
  if (runtimeUrl && !runtimeUrl.startsWith('__')) {
    return runtimeUrl;
  }
  return import.meta.env.VITE_API_URL || 'https://harry.hubble.cafe';
};

const API_BASE_URL = getApiUrl();

// MSAL instance for getting tokens
let msalInstance: PublicClientApplication | null = null;

export const setMsalInstance = (instance: PublicClientApplication) => {
  msalInstance = instance;
};

export const clearAuth = () => {
  sessionStorage.clear();
};

// Get API scope dynamically from runtime config, as required by Azure Entra setup
const getApiScope = () => {
  const clientId = (window as any).__RUNTIME_CONFIG__?.AZURE_CLIENT_ID || import.meta.env.VITE_AZURE_CLIENT_ID;
  return `api://${clientId}/access_as_user`;
};

// Get access token from MSAL for calling our backend API
// Important: We only request the API scope here, not Graph scopes.
// Azure AD can only return a token for ONE resource at a time.
// If you mix scopes from different resources (e.g., User.Read + api://xxx/access_as_user),
// Azure AD will return a token for the first resource (Graph), not your API.
const getAccessToken = async (): Promise<string | null> => {
  if (!msalInstance) {
    console.error('MSAL instance not set');
    return null;
  }

  const accounts = msalInstance.getAllAccounts();
  if (accounts.length === 0) {
    return null;
  }

  try {
    // Request ONLY the API scope - this ensures we get a token for our backend
    const response = await msalInstance.acquireTokenSilent({
      scopes: [getApiScope()],
      account: accounts[0],
    });
    return response.accessToken;
  } catch (error) {
    console.error('Failed to acquire token silently:', error);
    return null;
  }
};

// Main fetch function with authentication
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<any> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 401) {
    clearAuth();
    throw new Error('Authentication failed');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  // Handle empty responses (e.g., DELETE)
  const text = await response.text();
  if (!text) {
    return null;
  }

  return JSON.parse(text);
}

// API Functions
export async function fetchReservations() {
  return fetchWithAuth(`${API_BASE_URL}/api/reservations`);
}

export async function fetchReservation(id: number) {
  return fetchWithAuth(`${API_BASE_URL}/api/reservations/${id}`);
}

export async function updateReservation(id: number, data: any, sendEmail: boolean = true) {
  return fetchWithAuth(`${API_BASE_URL}/api/reservations/${id}?sendEmail=${sendEmail}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteReservation(id: number, sendEmail: boolean = true) {
  return fetchWithAuth(`${API_BASE_URL}/api/reservations/${id}?sendEmail=${sendEmail}`, {
    method: 'DELETE',
  });
}

export async function updateReservationStatus(
  id: number,
  status: string,
  confirmedBy?: string,
  sendEmail: boolean = true
) {
  let url = `${API_BASE_URL}/api/admin/reservations/${id}/status?status=${status}&sendEmail=${sendEmail}`;
  if (confirmedBy) {
    url += `&confirmedBy=${encodeURIComponent(confirmedBy)}`;
  }
  return fetchWithAuth(url, { method: 'PATCH' });
}

// Test if authentication is working
export async function testAuth(): Promise<boolean> {
  try {
    await fetchWithAuth(`${API_BASE_URL}/api/reservations`);
    return true;
  } catch {
    return false;
  }
}
