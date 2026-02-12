// Get API URL from runtime config or fall back to build-time env
const getApiUrl = (): string => {
  const runtimeUrl = (window as any).__RUNTIME_CONFIG__?.API_URL;
  if (runtimeUrl && !runtimeUrl.startsWith('__')) {
    return runtimeUrl;
  }
  return import.meta.env.VITE_API_URL || 'https://harry.hubble.cafe';
};

const API_BASE_URL = getApiUrl();

// API credentials from environment (for Docker/Portainer setups)
const ENV_API_USERNAME = import.meta.env.VITE_API_USERNAME;
const ENV_API_PASSWORD = import.meta.env.VITE_API_PASSWORD;

// Check if we're in development mode (allows bypassing Microsoft auth)
export const isDevMode = () => {
  return import.meta.env.DEV || import.meta.env.VITE_DEV_MODE === 'true';
};

// Check if API credentials are configured via environment
export const hasEnvCredentials = () => {
  return Boolean(ENV_API_USERNAME && ENV_API_PASSWORD);
};

// Dev mode authentication (bypasses Microsoft login)
export const setDevAuthenticated = (authenticated: boolean) => {
  if (authenticated) {
    sessionStorage.setItem('dev_authenticated', 'true');
  } else {
    sessionStorage.removeItem('dev_authenticated');
  }
};

export const isDevAuthenticated = () => {
  return sessionStorage.getItem('dev_authenticated') === 'true';
};

// Get stored credentials (env takes priority, then session storage)
const getAuthHeader = () => {
  // First check environment variables
  if (ENV_API_USERNAME && ENV_API_PASSWORD) {
    return 'Basic ' + btoa(`${ENV_API_USERNAME}:${ENV_API_PASSWORD}`);
  }
  // Fallback to session storage
  const username = sessionStorage.getItem('api_username');
  const password = sessionStorage.getItem('api_password');
  if (username && password) {
    return 'Basic ' + btoa(`${username}:${password}`);
  }
  return null;
};

export const setApiCredentials = (username: string, password: string) => {
  sessionStorage.setItem('api_username', username);
  sessionStorage.setItem('api_password', password);
};

export const clearApiCredentials = () => {
  sessionStorage.removeItem('api_username');
  sessionStorage.removeItem('api_password');
  sessionStorage.removeItem('dev_authenticated');
};

export const hasApiCredentials = () => {
  // Check env credentials first
  if (hasEnvCredentials()) {
    return true;
  }
  // Fallback to session storage
  return Boolean(sessionStorage.getItem('api_username') && sessionStorage.getItem('api_password'));
};

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const authHeader = getAuthHeader();
  if (!authHeader) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 401) {
    clearApiCredentials();
    throw new Error('Authentication failed');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
}

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

export async function testCredentials(username: string, password: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/reservations`, {
      headers: {
        'Authorization': 'Basic ' + btoa(`${username}:${password}`),
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

