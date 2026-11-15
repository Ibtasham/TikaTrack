import { describe, expect, it } from 'vitest';

import { formatDistanceKm, haversineDistanceKm } from '../lib/geo';

describe('haversineDistanceKm', () => {
  it('returns 0 for identical coordinates', () => {
    const dhaka = { lat: 23.8103, lng: 90.4125 };
    expect(haversineDistanceKm(dhaka, dhaka)).toBe(0);
  });

  it('computes realistic distance between Dhaka and Chattogram', () => {
    const dhaka = { lat: 23.8103, lng: 90.4125 };
    const chattogram = { lat: 22.3569, lng: 91.7832 };
    const km = haversineDistanceKm(dhaka, chattogram);
    expect(km).toBeGreaterThan(200);
    expect(km).toBeLessThan(230);
  });
});

describe('formatDistanceKm', () => {
  it('formats sub-kilometre distances in metres', () => {
    expect(formatDistanceKm(0.45, 'en')).toBe('450 m');
    expect(formatDistanceKm(0.45, 'bn')).toContain('মি.');
  });

  it('formats distances >= 1 km in km with appropriate precision', () => {
    expect(formatDistanceKm(3.42, 'en')).toBe('3.4 km');
    expect(formatDistanceKm(18.7, 'en')).toBe('19 km');
    expect(formatDistanceKm(5.2, 'bn')).toContain('কি.মি.');
  });

  it('returns empty string for invalid numbers', () => {
    expect(formatDistanceKm(-1, 'en')).toBe('');
    expect(formatDistanceKm(Number.NaN, 'en')).toBe('');
  });
});
