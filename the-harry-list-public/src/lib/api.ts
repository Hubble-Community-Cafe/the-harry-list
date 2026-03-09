// Runtime configuration interface
declare global {
  interface Window {
    __RUNTIME_CONFIG__?: {
      API_URL?: string;
      RECAPTCHA_SITE_KEY?: string;
    };
  }
}

// Get API URL from runtime config or fall back to build-time env
const getApiUrl = (): string => {
  const runtimeUrl = window.__RUNTIME_CONFIG__?.API_URL;
  if (runtimeUrl && !runtimeUrl.startsWith('__')) {
    return runtimeUrl;
  }
  return import.meta.env.VITE_API_URL || 'https://api.hubble.cafe';
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

export async function fetchFormOptions() {
  const response = await fetch(`${API_BASE_URL}/api/options/all`);
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

import type { ReservationFormData } from '../types/reservation';

export async function submitReservation(data: ReservationFormData, recaptchaToken?: string) {
  // Transform empty strings to null for optional enum fields
  const cleanedData = {
    ...data,
    dietaryPreference: data.dietaryPreference || null,
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

