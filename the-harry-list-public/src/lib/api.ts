// Runtime configuration interface
declare global {
  interface Window {
    __RUNTIME_CONFIG__?: {
      API_URL?: string;
      RECAPTCHA_SITE_KEY?: string;
      SENTRY_DSN?: string;
    };
  }
}

// Get API URL from runtime config or fall back to build-time env
const getApiUrl = (): string => {
  const runtimeUrl = window.__RUNTIME_CONFIG__?.API_URL;
  if (runtimeUrl && !runtimeUrl.startsWith('__')) {
    return runtimeUrl;
  }
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) {
    throw new Error('VITE_API_URL is not configured. Set it in .env or runtime config.');
  }
  return envUrl;
};

// Get reCAPTCHA site key from runtime config
export const getRecaptchaSiteKey = (): string | null => {
  const runtimeKey = window.__RUNTIME_CONFIG__?.RECAPTCHA_SITE_KEY;
  if (runtimeKey && !runtimeKey.startsWith('__') && runtimeKey.length > 0) {
    return runtimeKey;
  }
  return import.meta.env.VITE_RECAPTCHA_SITE_KEY || null;
};

const API_BASE_URL = getApiUrl();

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

export async function fetchWithRetry(url: string, maxAttempts = 3): Promise<Response> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok || attempt === maxAttempts || !RETRYABLE_STATUS_CODES.has(response.status)) {
        return response;
      }
    } catch (error) {
      if (attempt === maxAttempts) throw error;
    }
    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
  }
  // Unreachable, but satisfies TypeScript
  throw new Error(`Failed to fetch ${url} after ${maxAttempts} attempts`);
}

export async function fetchFormOptions() {
  const response = await fetchWithRetry(`${API_BASE_URL}/api/options/all`);
  if (!response.ok) {
    throw new Error('Failed to fetch form options');
  }
  return response.json();
}

// Check if reCAPTCHA is enabled on the backend
export async function checkRecaptchaStatus(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/public/reservations/recaptcha-status`);
    if (!response.ok) {
      return false;
    }
    const data = await response.json();
    return data.enabled === true;
  } catch {
    return false;
  }
}

import type { ReservationFormData, FormConstraint, BlockedPeriod } from '../types/reservation';

export async function fetchFormConstraints(): Promise<FormConstraint[]> {
  const response = await fetchWithRetry(`${API_BASE_URL}/api/options/constraints`);
  if (!response.ok) {
    throw new Error('Failed to fetch form constraints');
  }
  return response.json();
}

export async function fetchBlockedPeriods(): Promise<BlockedPeriod[]> {
  const response = await fetchWithRetry(`${API_BASE_URL}/api/options/blocked-periods`);
  if (!response.ok) {
    throw new Error('Failed to fetch blocked periods');
  }
  return response.json();
}

export async function submitReservation(data: ReservationFormData, recaptchaToken?: string) {
  // Transform empty strings to null for optional fields
  const cleanedData = {
    ...data,
    specialActivities: data.specialActivities?.length > 0 ? data.specialActivities : null,
    location: data.location || 'NO_PREFERENCE',
    invoiceType: data.invoiceType || null,
    seatingArea: data.seatingArea || null,
    recaptchaToken: recaptchaToken || null,
  };

  const response = await fetch(`${API_BASE_URL}/api/public/reservations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cleanedData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to submit reservation' }));
    throw new Error(error.message || 'Failed to submit reservation');
  }

  return response.json();
}
