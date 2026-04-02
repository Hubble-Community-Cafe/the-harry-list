import { PublicClientApplication } from '@azure/msal-browser';
// Note: Window.__RUNTIME_CONFIG__ type is declared in authConfig.ts

// Get API URL from runtime config or fall back to build-time env
const getApiUrl = (): string => {
  const runtimeUrl = window.__RUNTIME_CONFIG__?.API_URL;
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
  const clientId = window.__RUNTIME_CONFIG__?.AZURE_CLIENT_ID || import.meta.env.VITE_AZURE_CLIENT_ID;
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
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  // Ensure URL is absolute
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  // Skip Content-Type for FormData (browser sets it with boundary automatically)
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...options.headers as Record<string, string>,
    'Authorization': `Bearer ${token}`,
  };
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(fullUrl, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearAuth();
    throw new Error('Authentication failed');
  }

  return response;
}

// Wrapper that also parses JSON and throws on error
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchJsonWithAuth(url: string, options: RequestInit = {}): Promise<any> {
  const response = await fetchWithAuth(url, options);

  if (!response.ok) {
    let errorMessage = 'Request failed';
    try {
      const errorData = await response.json();
      // Handle Spring Boot validation errors
      if (errorData.errors && Array.isArray(errorData.errors)) {
        errorMessage = errorData.errors.map((e: { defaultMessage?: string; message?: string }) => e.defaultMessage || e.message).join(', ');
      } else if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      } else {
        errorMessage = JSON.stringify(errorData);
      }
    } catch {
      errorMessage = `Request failed with status ${response.status}`;
    }
    throw new Error(errorMessage);
  }

  // Handle empty responses (e.g., DELETE)
  const text = await response.text();
  if (!text) {
    return null;
  }

  return JSON.parse(text);
}

// Import types for proper typing
import type { Reservation, FormConstraint, BlockedPeriod, EmailAttachment, CateringEmailRequest } from '../types/reservation';

// API Functions
export async function fetchReservations(): Promise<Reservation[]> {
  return fetchJsonWithAuth(`${API_BASE_URL}/api/reservations`) as Promise<Reservation[]>;
}

export async function fetchReservation(id: number): Promise<Reservation | null> {
  return fetchJsonWithAuth(`${API_BASE_URL}/api/reservations/${id}`) as Promise<Reservation | null>;
}

export async function updateReservation(id: number, data: Record<string, unknown>, sendEmail: boolean = true): Promise<Reservation> {
  // Clean up empty strings to null for enum fields that the backend expects
  const cleanedData: Record<string, unknown> = { ...data };
  const enumFields = ['seatingArea', 'location', 'paymentOption', 'invoiceType'];
  enumFields.forEach(field => {
    if (cleanedData[field] === '') {
      cleanedData[field] = null;
    }
  });

  return fetchJsonWithAuth(`${API_BASE_URL}/api/reservations/${id}?sendEmail=${sendEmail}`, {
    method: 'PUT',
    body: JSON.stringify(cleanedData),
  }) as Promise<Reservation>;
}

export async function deleteReservation(id: number, sendEmail: boolean = true): Promise<void> {
  await fetchJsonWithAuth(`${API_BASE_URL}/api/reservations/${id}?sendEmail=${sendEmail}`, {
    method: 'DELETE',
  });
}

export async function updateReservationStatus(
  id: number,
  status: string,
  confirmedBy?: string,
  sendEmail: boolean = true
): Promise<Reservation> {
  let url = `${API_BASE_URL}/api/admin/reservations/${id}/status?status=${status}&sendEmail=${sendEmail}`;
  if (confirmedBy) {
    url += `&confirmedBy=${encodeURIComponent(confirmedBy)}`;
  }
  return fetchJsonWithAuth(url, { method: 'PATCH' }) as Promise<Reservation>;
}

export async function updateCateringArranged(id: number, arranged: boolean): Promise<Reservation> {
  return fetchJsonWithAuth(`${API_BASE_URL}/api/admin/reservations/${id}/catering-arranged?arranged=${arranged}`, {
    method: 'PATCH',
  }) as Promise<Reservation>;
}

// ===== Form Constraints =====
export async function fetchFormConstraints(): Promise<FormConstraint[]> {
  return fetchJsonWithAuth(`${API_BASE_URL}/api/admin/form-constraints`) as Promise<FormConstraint[]>;
}

export async function createFormConstraint(constraint: FormConstraint): Promise<FormConstraint> {
  return fetchJsonWithAuth(`${API_BASE_URL}/api/admin/form-constraints`, {
    method: 'POST',
    body: JSON.stringify(constraint),
  }) as Promise<FormConstraint>;
}

export async function updateFormConstraint(id: number, constraint: FormConstraint): Promise<FormConstraint> {
  return fetchJsonWithAuth(`${API_BASE_URL}/api/admin/form-constraints/${id}`, {
    method: 'PUT',
    body: JSON.stringify(constraint),
  }) as Promise<FormConstraint>;
}

export async function toggleFormConstraint(id: number): Promise<FormConstraint> {
  return fetchJsonWithAuth(`${API_BASE_URL}/api/admin/form-constraints/${id}/toggle`, {
    method: 'PATCH',
  }) as Promise<FormConstraint>;
}

export async function deleteFormConstraint(id: number): Promise<void> {
  await fetchJsonWithAuth(`${API_BASE_URL}/api/admin/form-constraints/${id}`, {
    method: 'DELETE',
  });
}

// ===== Blocked Periods =====
export async function fetchBlockedPeriods(): Promise<BlockedPeriod[]> {
  return fetchJsonWithAuth(`${API_BASE_URL}/api/admin/blocked-periods`) as Promise<BlockedPeriod[]>;
}

export async function createBlockedPeriod(period: BlockedPeriod): Promise<BlockedPeriod> {
  return fetchJsonWithAuth(`${API_BASE_URL}/api/admin/blocked-periods`, {
    method: 'POST',
    body: JSON.stringify(period),
  }) as Promise<BlockedPeriod>;
}

export async function updateBlockedPeriod(id: number, period: BlockedPeriod): Promise<BlockedPeriod> {
  return fetchJsonWithAuth(`${API_BASE_URL}/api/admin/blocked-periods/${id}`, {
    method: 'PUT',
    body: JSON.stringify(period),
  }) as Promise<BlockedPeriod>;
}

export async function toggleBlockedPeriod(id: number): Promise<BlockedPeriod> {
  return fetchJsonWithAuth(`${API_BASE_URL}/api/admin/blocked-periods/${id}/toggle`, {
    method: 'PATCH',
  }) as Promise<BlockedPeriod>;
}

export async function deleteBlockedPeriod(id: number): Promise<void> {
  await fetchJsonWithAuth(`${API_BASE_URL}/api/admin/blocked-periods/${id}`, {
    method: 'DELETE',
  });
}

// ===== Email Attachments =====
export async function fetchEmailAttachments(): Promise<EmailAttachment[]> {
  return fetchJsonWithAuth(`${API_BASE_URL}/api/admin/email-attachments`) as Promise<EmailAttachment[]>;
}

export async function uploadEmailAttachment(file: File, name: string): Promise<EmailAttachment> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', name);

  return fetchJsonWithAuth(`${API_BASE_URL}/api/admin/email-attachments`, {
    method: 'POST',
    body: formData,
  }) as Promise<EmailAttachment>;
}

export async function deleteEmailAttachment(id: number): Promise<void> {
  await fetchJsonWithAuth(`${API_BASE_URL}/api/admin/email-attachments/${id}`, {
    method: 'DELETE',
  });
}

export async function toggleEmailAttachmentActive(id: number, active: boolean): Promise<EmailAttachment> {
  return fetchJsonWithAuth(`${API_BASE_URL}/api/admin/email-attachments/${id}/active?active=${active}`, {
    method: 'PATCH',
  }) as Promise<EmailAttachment>;
}

// ===== Catering Email =====
export async function fetchCateringEmailPreview(reservationId: number): Promise<{ subject: string; body: string }> {
  return fetchJsonWithAuth(`${API_BASE_URL}/api/admin/reservations/${reservationId}/catering-email/preview`) as Promise<{ subject: string; body: string }>;
}

export async function sendCateringEmail(reservationId: number, request: CateringEmailRequest): Promise<{ status: string; message: string }> {
  return fetchJsonWithAuth(`${API_BASE_URL}/api/admin/reservations/${reservationId}/catering-email`, {
    method: 'POST',
    body: JSON.stringify(request),
  }) as Promise<{ status: string; message: string }>;
}

// ===== Settings =====
export interface RetentionSettings {
  retentionDays: number;
  enabled: boolean;
  eligibleForDeletion: number;
  nextRunAt: string;
  cutoffDate: string | null;
}

export async function fetchRetentionSettings(): Promise<RetentionSettings> {
  return fetchJsonWithAuth(`${API_BASE_URL}/api/admin/settings/retention`) as Promise<RetentionSettings>;
}

// Test if authentication is working
export async function testAuth(): Promise<boolean> {
  try {
    await fetchJsonWithAuth(`${API_BASE_URL}/api/reservations`);
    return true;
  } catch {
    return false;
  }
}
