/**
 * WHO Child Growth Standards (0–60 months / 0–5 years).
 *
 * Source: World Health Organization Multicentre Growth Reference Study (2006),
 * weight-for-age (kg) and length/height-for-age (cm) percentile tables at
 * 3rd, 15th, 50th (median), 85th, and 97th percentiles.
 *
 * Notes on measurement convention:
 * - Length (lying down) is standard from 0–24 months; standing height is used
 *   from 24–60 months (~0.7 cm transition offset at 24m).
 * - Reference curves are sex-specific ('female' / 'male'). When a member's sex
 *   is 'other' or unspecified, the midpoint reference curve is used and noted
 *   in the UI.
 */

export type GrowthMetric = 'weight' | 'height';
export type WhoSex = 'female' | 'male';

export interface WhoReferencePoint {
  month: number;
  p3: number;
  p15: number;
  p50: number;
  p85: number;
  p97: number;
}

export const WHO_WEIGHT_FOR_AGE: Record<WhoSex, readonly WhoReferencePoint[]> = {
  male: [
    { month: 0, p3: 2.5, p15: 2.9, p50: 3.3, p85: 3.9, p97: 4.3 },
    { month: 1, p3: 3.4, p15: 3.9, p50: 4.5, p85: 5.1, p97: 5.7 },
    { month: 2, p3: 4.4, p15: 4.9, p50: 5.6, p85: 6.3, p97: 7.0 },
    { month: 3, p3: 5.1, p15: 5.7, p50: 6.4, p85: 7.2, p97: 7.9 },
    { month: 4, p3: 5.6, p15: 6.2, p50: 7.0, p85: 7.8, p97: 8.6 },
    { month: 5, p3: 6.1, p15: 6.7, p50: 7.5, p85: 8.4, p97: 9.2 },
    { month: 6, p3: 6.4, p15: 7.1, p50: 7.9, p85: 8.8, p97: 9.7 },
    { month: 9, p3: 7.2, p15: 8.0, p50: 8.9, p85: 9.9, p97: 10.9 },
    { month: 12, p3: 7.8, p15: 8.6, p50: 9.6, p85: 10.8, p97: 11.8 },
    { month: 15, p3: 8.4, p15: 9.2, p50: 10.3, p85: 11.5, p97: 12.7 },
    { month: 18, p3: 8.9, p15: 9.8, p50: 10.9, p85: 12.2, p97: 13.5 },
    { month: 24, p3: 9.8, p15: 10.8, p50: 12.2, p85: 13.6, p97: 15.1 },
    { month: 30, p3: 10.7, p15: 11.8, p50: 13.3, p85: 15.0, p97: 16.6 },
    { month: 36, p3: 11.4, p15: 12.7, p50: 14.3, p85: 16.2, p97: 18.0 },
    { month: 42, p3: 12.1, p15: 13.5, p50: 15.3, p85: 17.4, p97: 19.4 },
    { month: 48, p3: 12.9, p15: 14.4, p50: 16.3, p85: 18.6, p97: 20.9 },
    { month: 54, p3: 13.6, p15: 15.2, p50: 17.3, p85: 19.8, p97: 22.4 },
    { month: 60, p3: 14.3, p15: 16.0, p50: 18.3, p85: 21.0, p97: 23.8 },
  ],
  female: [
    { month: 0, p3: 2.4, p15: 2.8, p50: 3.2, p85: 3.7, p97: 4.2 },
    { month: 1, p3: 3.2, p15: 3.6, p50: 4.2, p85: 4.8, p97: 5.4 },
    { month: 2, p3: 4.0, p15: 4.5, p50: 5.1, p85: 5.8, p97: 6.5 },
    { month: 3, p3: 4.6, p15: 5.2, p50: 5.8, p85: 6.6, p97: 7.4 },
    { month: 4, p3: 5.1, p15: 5.7, p50: 6.4, p85: 7.3, p97: 8.1 },
    { month: 5, p3: 5.5, p15: 6.1, p50: 6.9, p85: 7.8, p97: 8.7 },
    { month: 6, p3: 5.8, p15: 6.5, p50: 7.3, p85: 8.2, p97: 9.2 },
    { month: 9, p3: 6.6, p15: 7.3, p50: 8.2, p85: 9.3, p97: 10.4 },
    { month: 12, p3: 7.1, p15: 7.9, p50: 8.9, p85: 10.1, p97: 11.3 },
    { month: 15, p3: 7.7, p15: 8.5, p50: 9.6, p85: 10.9, p97: 12.2 },
    { month: 18, p3: 8.2, p15: 9.1, p50: 10.2, p85: 11.6, p97: 13.0 },
    { month: 24, p3: 9.2, p15: 10.2, p50: 11.5, p85: 13.0, p97: 14.6 },
    { month: 30, p3: 10.1, p15: 11.2, p50: 12.7, p85: 14.4, p97: 16.2 },
    { month: 36, p3: 11.0, p15: 12.2, p50: 13.9, p85: 15.8, p97: 17.8 },
    { month: 42, p3: 11.8, p15: 13.1, p50: 15.0, p85: 17.2, p97: 19.5 },
    { month: 48, p3: 12.5, p15: 14.0, p50: 16.1, p85: 18.5, p97: 21.1 },
    { month: 54, p3: 13.2, p15: 14.9, p50: 17.2, p85: 19.8, p97: 22.7 },
    { month: 60, p3: 14.0, p15: 15.8, p50: 18.2, p85: 21.2, p97: 24.4 },
  ],
};

export const WHO_HEIGHT_FOR_AGE: Record<WhoSex, readonly WhoReferencePoint[]> = {
  male: [
    { month: 0, p3: 46.3, p15: 47.9, p50: 49.9, p85: 51.8, p97: 53.4 },
    { month: 1, p3: 51.1, p15: 52.8, p50: 54.7, p85: 56.7, p97: 58.4 },
    { month: 2, p3: 54.7, p15: 56.4, p50: 58.4, p85: 60.4, p97: 62.2 },
    { month: 3, p3: 57.6, p15: 59.4, p50: 61.4, p85: 63.5, p97: 65.3 },
    { month: 4, p3: 60.0, p15: 61.8, p50: 63.9, p85: 66.0, p97: 67.8 },
    { month: 5, p3: 61.9, p15: 63.8, p50: 65.9, p85: 68.0, p97: 69.9 },
    { month: 6, p3: 63.6, p15: 65.5, p50: 67.6, p85: 69.8, p97: 71.6 },
    { month: 9, p3: 68.0, p15: 69.9, p50: 72.0, p85: 74.2, p97: 76.2 },
    { month: 12, p3: 71.3, p15: 73.4, p50: 75.7, p85: 78.1, p97: 80.2 },
    { month: 15, p3: 74.4, p15: 76.6, p50: 79.1, p85: 81.7, p97: 83.9 },
    { month: 18, p3: 77.2, p15: 79.6, p50: 82.3, p85: 85.0, p97: 87.3 },
    { month: 24, p3: 81.7, p15: 84.4, p50: 87.1, p85: 90.2, p97: 92.9 },
    { month: 30, p3: 85.5, p15: 88.5, p50: 91.9, p85: 95.3, p97: 98.3 },
    { month: 36, p3: 89.0, p15: 92.4, p50: 96.1, p85: 99.8, p97: 103.1 },
    { month: 42, p3: 92.2, p15: 95.9, p50: 99.9, p85: 103.9, p97: 107.5 },
    { month: 48, p3: 95.3, p15: 99.1, p50: 103.3, p85: 107.5, p97: 111.3 },
    { month: 54, p3: 98.1, p15: 102.2, p50: 106.7, p85: 111.1, p97: 115.2 },
    { month: 60, p3: 101.0, p15: 105.3, p50: 110.0, p85: 114.6, p97: 118.9 },
  ],
  female: [
    { month: 0, p3: 45.6, p15: 47.2, p50: 49.1, p85: 51.0, p97: 52.7 },
    { month: 1, p3: 50.0, p15: 51.7, p50: 53.7, p85: 55.6, p97: 57.4 },
    { month: 2, p3: 53.2, p15: 55.0, p50: 57.1, p85: 59.1, p97: 60.9 },
    { month: 3, p3: 55.8, p15: 57.7, p50: 59.8, p85: 61.9, p97: 63.8 },
    { month: 4, p3: 58.0, p15: 59.9, p50: 62.1, p85: 64.3, p97: 66.2 },
    { month: 5, p3: 59.9, p15: 61.8, p50: 64.0, p85: 66.2, p97: 68.2 },
    { month: 6, p3: 61.5, p15: 63.5, p50: 65.7, p85: 68.0, p97: 70.0 },
    { month: 9, p3: 65.6, p15: 67.7, p50: 70.1, p85: 72.6, p97: 74.7 },
    { month: 12, p3: 69.2, p15: 71.5, p50: 74.0, p85: 76.6, p97: 78.9 },
    { month: 15, p3: 72.4, p15: 74.8, p50: 77.5, p85: 80.2, p97: 82.7 },
    { month: 18, p3: 75.2, p15: 77.8, p50: 80.7, p85: 83.6, p97: 86.2 },
    { month: 24, p3: 80.3, p15: 83.1, p50: 86.4, p85: 89.6, p97: 92.5 },
    { month: 30, p3: 84.0, p15: 87.1, p50: 90.7, p85: 94.2, p97: 97.3 },
    { month: 36, p3: 87.9, p15: 91.3, p50: 95.1, p85: 98.9, p97: 102.2 },
    { month: 42, p3: 91.4, p15: 95.1, p50: 99.0, p85: 103.0, p97: 106.7 },
    { month: 48, p3: 94.6, p15: 98.5, p50: 102.7, p85: 106.9, p97: 110.8 },
    { month: 54, p3: 97.7, p15: 101.8, p50: 106.2, p85: 110.6, p97: 114.7 },
    { month: 60, p3: 100.5, p15: 104.8, p50: 109.4, p85: 114.0, p97: 118.4 },
  ],
};

export const WHO_MAX_MONTHS = 60;

/**
 * WHO Reference 2007 BMI-for-age (61–228 months / 5–19 years).
 * Thresholds follow WHO SD cut-offs:
 * - -2 SD (~2.3rd pct): thinness
 * - +1 SD (~85th pct): overweight
 * - +2 SD (~97.7th pct): obesity
 */
export interface WhoBmiReferencePoint {
  month: number;
  thinness: number;
  median: number;
  overweight: number;
  obesity: number;
}

export const WHO_BMI_5_TO_19_AGE: Record<WhoSex, readonly WhoBmiReferencePoint[]> = {
  male: [
    { month: 61, thinness: 13.0, median: 15.3, overweight: 16.6, obesity: 18.3 },
    { month: 72, thinness: 13.0, median: 15.3, overweight: 16.8, obesity: 18.5 },
    { month: 96, thinness: 13.3, median: 15.7, overweight: 17.4, obesity: 19.7 },
    { month: 120, thinness: 13.7, median: 16.4, overweight: 18.5, obesity: 21.4 },
    { month: 144, thinness: 14.5, median: 17.5, overweight: 19.9, obesity: 23.6 },
    { month: 168, thinness: 15.5, median: 19.0, overweight: 21.8, obesity: 25.9 },
    { month: 192, thinness: 16.5, median: 20.5, overweight: 23.5, obesity: 27.9 },
    { month: 216, thinness: 17.3, median: 21.7, overweight: 24.9, obesity: 29.2 },
    { month: 228, thinness: 17.6, median: 22.2, overweight: 25.4, obesity: 29.7 },
  ],
  female: [
    { month: 61, thinness: 12.7, median: 15.2, overweight: 16.9, obesity: 18.9 },
    { month: 72, thinness: 12.7, median: 15.3, overweight: 17.0, obesity: 19.2 },
    { month: 96, thinness: 12.9, median: 15.7, overweight: 17.7, obesity: 20.6 },
    { month: 120, thinness: 13.5, median: 16.6, overweight: 19.0, obesity: 22.6 },
    { month: 144, thinness: 14.4, median: 18.0, overweight: 20.8, obesity: 25.0 },
    { month: 168, thinness: 15.4, median: 19.6, overweight: 22.7, obesity: 27.3 },
    { month: 192, thinness: 16.2, median: 20.7, overweight: 24.1, obesity: 28.9 },
    { month: 216, thinness: 16.4, median: 21.3, overweight: 24.8, obesity: 29.5 },
    { month: 228, thinness: 16.5, median: 21.4, overweight: 25.0, obesity: 29.7 },
  ],
};

export const WHO_5_TO_19_MAX_MONTHS = 228;

