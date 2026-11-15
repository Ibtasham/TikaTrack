/**
 * Geographic distance helpers for the vaccination centre finder.
 *
 * All calculations run locally in the browser using the Haversine formula so
 * user coordinates never leave the device.
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance between two WGS84 coordinates in kilometres. */
export function haversineDistanceKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Format a distance in kilometres (or metres under 1 km) for compact badges. */
export function formatDistanceKm(km: number, language: 'en' | 'bn'): string {
  if (!Number.isFinite(km) || km < 0) return '';
  if (km < 1) {
    const metres = Math.round(km * 1000);
    return language === 'bn' ? `${metres.toLocaleString('bn-BD')} মি.` : `${metres} m`;
  }
  const rounded = km < 10 ? km.toFixed(1) : Math.round(km).toString();
  return language === 'bn' ? `${Number(rounded).toLocaleString('bn-BD')} কি.মি.` : `${rounded} km`;
}
