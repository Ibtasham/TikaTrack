import type { VaccinationCentre } from '../data/vaccinationCentres';
import type { Coordinates } from './geo';

export type TravelModeKey = 'DRIVING' | 'WALKING' | 'TRANSIT' | 'TWO_WHEELER';

export const TRAVEL_MODES: readonly TravelModeKey[] = [
  'DRIVING',
  'TWO_WHEELER',
  'TRANSIT',
  'WALKING',
] as const;

export interface RouteOrigin {
  coords: Coordinates;
  label: string;
  kind: 'gps' | 'area';
}

export interface RouteSummary {
  centreId: string;
  centreName: string;
  travelMode: TravelModeKey;
  distanceText: string;
  durationText: string;
}

/** Ephemeral nearby hospital result from Google Places API (New). Never persisted to storage. */
export interface NearbyGoogleClinic {
  id: string;
  name: string;
  address: string;
  location: Coordinates;
  googleMapsUri?: string;
}

export const GMP_ATTRIBUTION_ID = 'gmp_mcp_codeassist_v1_aistudio';

export const CENTRE_PIN_COLORS: Record<
  VaccinationCentre['type'],
  { background: string; borderColor: string; glyphColor: string }
> = {
  government: { background: '#059669', borderColor: '#047857', glyphColor: '#ecfdf5' },
  hospital: { background: '#0284c7', borderColor: '#0369a1', glyphColor: '#f0f9ff' },
  private: { background: '#4f46e5', borderColor: '#4338ca', glyphColor: '#eef2ff' },
  ngo: { background: '#d97706', borderColor: '#b45309', glyphColor: '#fffbeb' },
};

/** Resolve the client-side Google Maps Platform API key injected by Vite. */
export function getGoogleMapsApiKey(): string {
  const raw = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  return typeof raw === 'string' ? raw.trim() : '';
}

/** Detect quota/rate-limit errors from Maps JS, Places (New), and Routes SDKs without false positives. */
export function isMapsQuotaError(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === 'object' && error !== null) {
    const rec = error as Record<string, unknown>;
    if (rec.status === 429 || rec.code === 429 || rec.status === 'RESOURCE_EXHAUSTED') {
      return true;
    }
    if (rec.status === 'OVER_QUERY_LIMIT') {
      return true;
    }
    if (
      typeof rec.error === 'object' &&
      rec.error !== null &&
      ((rec.error as Record<string, unknown>).status === 'RESOURCE_EXHAUSTED' ||
        (rec.error as Record<string, unknown>).code === 429)
    ) {
      return true;
    }
  }
  const message =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === 'string'
        ? error
        : JSON.stringify(error);
  return (
    message.includes('RESOURCE_EXHAUSTED') ||
    message.includes('OVER_QUERY_LIMIT') ||
    message.includes('OverQuotaMapError') ||
    message.includes('QuotaExceededError') ||
    /\b429\b/.test(message)
  );
}

/** Trigger the top-level quota warning banner registered in App.tsx. */
export function notifyMapsQuotaExceeded(): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  }
}

/** Format route distance in metres/kilometres for English or Bangla display. */
export function formatRouteDistance(meters: number | null | undefined, language: 'en' | 'bn'): string {
  if (typeof meters !== 'number' || !Number.isFinite(meters) || meters < 0) return '';
  if (meters < 1000) {
    const roundedMeters = Math.round(meters);
    return language === 'bn'
      ? `${roundedMeters.toLocaleString('bn-BD')} মি.`
      : `${roundedMeters} m`;
  }
  const km = meters / 1000;
  const formatted = km < 10 ? km.toFixed(1) : Math.round(km).toString();
  return language === 'bn'
    ? `${Number(formatted).toLocaleString('bn-BD')} কি.মি.`
    : `${formatted} km`;
}

/** Format route travel duration in milliseconds into compact human-readable minutes/hours. */
export function formatRouteDuration(
  durationMillis: number | null | undefined,
  language: 'en' | 'bn',
): string {
  if (typeof durationMillis !== 'number' || !Number.isFinite(durationMillis) || durationMillis < 0) {
    return '';
  }
  const totalMinutes = Math.max(1, Math.round(durationMillis / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (language === 'bn') {
    if (hours === 0) return `${totalMinutes.toLocaleString('bn-BD')} মিনিট`;
    if (minutes === 0) return `${hours.toLocaleString('bn-BD')} ঘণ্টা`;
    return `${hours.toLocaleString('bn-BD')} ঘণ্টা ${minutes.toLocaleString('bn-BD')} মিনিট`;
  }

  if (hours === 0) return `${totalMinutes} min`;
  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}
