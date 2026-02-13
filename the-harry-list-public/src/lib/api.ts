// Runtime configuration interface
declare global {
  interface Window {
    __RUNTIME_CONFIG__?: {
      API_URL?: string;
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

const API_BASE_URL = getApiUrl();

export async function fetchFormOptions() {
  const response = await fetch(`${API_BASE_URL}/api/options/all`);
  if (!response.ok) {
    throw new Error('Failed to fetch form options');
  }
  return response.json();
}

import type { ReservationFormData } from '../types/reservation';

export async function submitReservation(data: ReservationFormData) {
  // Transform empty strings to null for optional enum fields
  const cleanedData = {
    ...data,
    dietaryPreference: data.dietaryPreference || null,
    seatingArea: data.seatingArea || null,
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

