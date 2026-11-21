import {
  WHO_5_TO_19_MAX_MONTHS,
  WHO_BMI_5_TO_19_AGE,
  WHO_HEIGHT_FOR_AGE,
  WHO_MAX_MONTHS,
  WHO_WEIGHT_FOR_AGE,
  type GrowthMetric,
  type WhoBmiReferencePoint,
  type WhoReferencePoint,
} from '../data/whoGrowthStandards';
import { allVaccines } from '../data/vaccines';
import { daysBetween, parseISODate, todayISO } from './format';
import { milestoneForDose } from './doseLedger';
import { createId } from './id';
import type { GrowthMeasurement, Profile, VaccinationEvent } from '../types';

const AVG_DAYS_PER_MONTH = 30.4375;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type PercentileBand = 'below-p3' | 'p3-p15' | 'p15-p85' | 'p85-p97' | 'above-p97';

export interface PercentileAssessment {
  band: PercentileBand;
  approxPercentile: number;
  whoMedian: number;
  whoP3: number;
  whoP97: number;
}

export interface GrowthVaccineMarker {
  eventId: string;
  vaccineId: string;
  doseNumber: number | null;
  date: string;
  month: number;
  label: { en: string; bn: string };
}

export interface GrowthChartPoint {
  /** Age in months (numeric x-axis key for Recharts). */
  month: number;
  p3: number;
  p15: number;
  p50: number;
  p85: number;
  p97: number;
  /** Recharts stacked/range area tuples `[low, high]`. */
  rangeOuter: [number, number];
  rangeInner: [number, number];
  /** Child's measured value at this age point, if recorded. */
  childValue?: number;
  measurementDate?: string;
  measurementId?: string;
  measurementNotes?: string;
  percentileBand?: PercentileBand;
  approxPercentile?: number;
  /** Administered vaccine doses matching or occurring within this timeline point. */
  vaccines?: GrowthVaccineMarker[];
  /** Non-null when a vaccine was given at this exact point (for scatter markers). */
  vaccinePinValue?: number;
}

export type GrowthInputError =
  | 'missing-date'
  | 'invalid-date'
  | 'future-date'
  | 'before-birth'
  | 'missing-measurement'
  | 'invalid-weight'
  | 'invalid-height';

export interface NewGrowthInput {
  date: string;
  weightKg?: number | string | null;
  heightCm?: number | string | null;
  notes?: string;
  id?: string;
  createdAt?: string;
}

export type BuildGrowthResult =
  | { measurement: GrowthMeasurement; error?: undefined }
  | { measurement?: undefined; error: GrowthInputError };

export function createGrowthId(): string {
  return createId('growth');
}

/** Round to 1 decimal place cleanly. */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Exact fractional age in months between birth date and a target ISO date. */
export function ageInMonths(dateOfBirth: string, targetDate: string): number | null {
  const dob = parseISODate(dateOfBirth);
  const target = parseISODate(targetDate);
  if (!dob || !target) return null;
  const days = daysBetween(dob, target);
  if (days < 0) return null;
  return Math.round((days / AVG_DAYS_PER_MONTH) * 100) / 100;
}

/** Resolve WHO table to use: female, male, or midpoint when gender is 'other'/unset. */
export function whoReferenceCurve(
  gender: Profile['gender'] | undefined,
  metric: GrowthMetric,
): readonly WhoReferencePoint[] {
  const table = metric === 'weight' ? WHO_WEIGHT_FOR_AGE : WHO_HEIGHT_FOR_AGE;
  if (gender === 'female' || gender === 'male') return table[gender];
  return table.female.map((f, index) => {
    const m = table.male[index];
    return {
      month: f.month,
      p3: round1((f.p3 + m.p3) / 2),
      p15: round1((f.p15 + m.p15) / 2),
      p50: round1((f.p50 + m.p50) / 2),
      p85: round1((f.p85 + m.p85) / 2),
      p97: round1((f.p97 + m.p97) / 2),
    };
  });
}

/** Piecewise linear interpolation of WHO percentile cutoffs at any month `0..60`. */
export function interpolateWhoBand(
  gender: Profile['gender'] | undefined,
  metric: GrowthMetric,
  month: number,
): WhoReferencePoint | null {
  if (!Number.isFinite(month) || month < 0 || month > WHO_MAX_MONTHS) return null;
  const curve = whoReferenceCurve(gender, metric);
  if (month <= curve[0].month) return curve[0];
  const last = curve[curve.length - 1];
  if (month >= last.month) return last;

  for (let i = 0; i < curve.length - 1; i += 1) {
    const a = curve[i];
    const b = curve[i + 1];
    if (month >= a.month && month <= b.month) {
      const span = b.month - a.month || 1;
      const ratio = (month - a.month) / span;
      return {
        month: round1(month),
        p3: round1(a.p3 + (b.p3 - a.p3) * ratio),
        p15: round1(a.p15 + (b.p15 - a.p15) * ratio),
        p50: round1(a.p50 + (b.p50 - a.p50) * ratio),
        p85: round1(a.p85 + (b.p85 - a.p85) * ratio),
        p97: round1(a.p97 + (b.p97 - a.p97) * ratio),
      };
    }
  }
  return last;
}

/**
 * Assess where a measurement falls relative to WHO Child Growth Standards.
 * Returns `null` when the child is older than 60 months (beyond WHO 0–5y tables).
 */
export function assessMeasurement(
  gender: Profile['gender'] | undefined,
  metric: GrowthMetric,
  month: number,
  value: number,
): PercentileAssessment | null {
  const ref = interpolateWhoBand(gender, metric, month);
  if (!ref || !Number.isFinite(value)) return null;

  let band: PercentileBand;
  let approxPercentile: number;

  if (value < ref.p3) {
    band = 'below-p3';
    const spread = Math.max(ref.p15 - ref.p3, 0.2);
    const est = 3 - ((ref.p3 - value) / spread) * 2.5;
    approxPercentile = Math.max(1, Math.round(est));
  } else if (value < ref.p15) {
    band = 'p3-p15';
    const ratio = (value - ref.p3) / Math.max(ref.p15 - ref.p3, 0.1);
    approxPercentile = Math.round(3 + ratio * 12);
  } else if (value <= ref.p85) {
    band = 'p15-p85';
    if (value <= ref.p50) {
      const ratio = (value - ref.p15) / Math.max(ref.p50 - ref.p15, 0.1);
      approxPercentile = Math.round(15 + ratio * 35);
    } else {
      const ratio = (value - ref.p50) / Math.max(ref.p85 - ref.p50, 0.1);
      approxPercentile = Math.round(50 + ratio * 35);
    }
  } else if (value <= ref.p97) {
    band = 'p85-p97';
    const ratio = (value - ref.p85) / Math.max(ref.p97 - ref.p85, 0.1);
    approxPercentile = Math.round(85 + ratio * 12);
  } else {
    band = 'above-p97';
    const spread = Math.max(ref.p97 - ref.p85, 0.2);
    const est = 97 + ((value - ref.p97) / spread) * 2.5;
    approxPercentile = Math.min(99, Math.round(est));
  }

  return {
    band,
    approxPercentile,
    whoMedian: ref.p50,
    whoP3: ref.p3,
    whoP97: ref.p97,
  };
}

export type AdolescentBmiBand = 'thinness' | 'normal' | 'overweight' | 'obesity';

export interface AdolescentBmiAssessment {
  bmi: number;
  band: AdolescentBmiBand;
  medianBmi: number;
  thinnessCutoff: number;
  overweightCutoff: number;
  obesityCutoff: number;
}

/** Piecewise linear interpolation for WHO 2007 5–19 years (61–228 months) BMI-for-age. */
export function interpolateWhoBmi5to19(
  gender: Profile['gender'] | undefined,
  month: number,
): WhoBmiReferencePoint | null {
  if (!Number.isFinite(month) || month <= WHO_MAX_MONTHS || month > WHO_5_TO_19_MAX_MONTHS) {
    return null;
  }
  const curve: readonly WhoBmiReferencePoint[] =
    gender === 'female' || gender === 'male'
      ? WHO_BMI_5_TO_19_AGE[gender]
      : WHO_BMI_5_TO_19_AGE.female.map((f, idx) => {
          const m = WHO_BMI_5_TO_19_AGE.male[idx];
          return {
            month: f.month,
            thinness: round1((f.thinness + m.thinness) / 2),
            median: round1((f.median + m.median) / 2),
            overweight: round1((f.overweight + m.overweight) / 2),
            obesity: round1((f.obesity + m.obesity) / 2),
          };
        });

  if (month <= curve[0].month) return curve[0];
  const last = curve[curve.length - 1];
  if (month >= last.month) return last;

  for (let i = 0; i < curve.length - 1; i += 1) {
    const a = curve[i];
    const b = curve[i + 1];
    if (month >= a.month && month <= b.month) {
      const ratio = (month - a.month) / (b.month - a.month || 1);
      return {
        month: round1(month),
        thinness: round1(a.thinness + (b.thinness - a.thinness) * ratio),
        median: round1(a.median + (b.median - a.median) * ratio),
        overweight: round1(a.overweight + (b.overweight - a.overweight) * ratio),
        obesity: round1(a.obesity + (b.obesity - a.obesity) * ratio),
      };
    }
  }
  return last;
}

/** Assess BMI-for-age under WHO Reference 2007 for children & teens aged 5–19 years (61–228 months). */
export function assessBmiForAge5to19(
  gender: Profile['gender'] | undefined,
  month: number,
  weightKg: number,
  heightCm: number,
): AdolescentBmiAssessment | null {
  if (!Number.isFinite(weightKg) || !Number.isFinite(heightCm) || heightCm <= 0) return null;
  const ref = interpolateWhoBmi5to19(gender, month);
  if (!ref) return null;
  const bmi = round1(weightKg / ((heightCm / 100) * (heightCm / 100)));
  let band: AdolescentBmiBand = 'normal';
  if (bmi < ref.thinness) band = 'thinness';
  else if (bmi >= ref.obesity) band = 'obesity';
  else if (bmi >= ref.overweight) band = 'overweight';

  return {
    bmi,
    band,
    medianBmi: ref.median,
    thinnessCutoff: ref.thinness,
    overweightCutoff: ref.overweight,
    obesityCutoff: ref.obesity,
  };
}

/** Build display labels for an administered vaccine event. */
export function resolveVaccineLabel(event: VaccinationEvent): { en: string; bn: string } {
  if (event.doseNumber !== null) {
    const milestone = milestoneForDose(event.vaccineId, event.doseNumber);
    if (milestone) return milestone.label;
  }
  const found = allVaccines.find((v) => v.id === event.vaccineId);
  if (found) {
    if (event.doseNumber !== null) {
      return {
        en: `${found.name.en} (Dose ${event.doseNumber})`,
        bn: `${found.name.bn} (ডোজ ${event.doseNumber})`,
      };
    }
    return found.name;
  }
  return { en: event.vaccineId, bn: event.vaccineId };
}

/** Map all vaccination events for a profile onto age-in-months markers (0..60m). */
export function mapVaccinesToMonths(profile: Profile, maxMonths = WHO_MAX_MONTHS): GrowthVaccineMarker[] {
  const markers: GrowthVaccineMarker[] = [];
  for (const event of profile.events ?? []) {
    const month = ageInMonths(profile.dateOfBirth, event.date);
    if (month === null || month < 0 || month > maxMonths) continue;
    markers.push({
      eventId: event.id,
      vaccineId: event.vaccineId,
      doseNumber: event.doseNumber,
      date: event.date,
      month: Math.round(month * 10) / 10,
      label: resolveVaccineLabel(event),
    });
  }
  return markers.sort((a, b) => a.month - b.month);
}

/** Find vaccinations occurring within `windowDays` of a growth measurement date. */
export function nearbyVaccinesForDate(
  profile: Profile,
  measurementDate: string,
  windowDays = 14,
): GrowthVaccineMarker[] {
  const target = parseISODate(measurementDate);
  if (!target) return [];
  const matches: GrowthVaccineMarker[] = [];
  for (const event of profile.events ?? []) {
    const eventDate = parseISODate(event.date);
    if (!eventDate) continue;
    if (Math.abs(daysBetween(target, eventDate)) <= windowDays) {
      const month = ageInMonths(profile.dateOfBirth, event.date) ?? 0;
      matches.push({
        eventId: event.id,
        vaccineId: event.vaccineId,
        doseNumber: event.doseNumber,
        date: event.date,
        month: Math.round(month * 10) / 10,
        label: resolveVaccineLabel(event),
      });
    }
  }
  return matches;
}

/**
 * Determine a clean default chart age ceiling (`12`, `24`, `36`, `60` months)
 * based on the child's current age, measurements, and vaccination history.
 */
export function recommendedAgeWindow(profile: Profile): 12 | 24 | 36 | 60 {
  const currentAge = ageInMonths(profile.dateOfBirth, todayISO()) ?? 0;
  let maxPoint = currentAge;
  for (const entry of profile.growth ?? []) {
    const m = ageInMonths(profile.dateOfBirth, entry.date);
    if (m !== null && m > maxPoint) maxPoint = m;
  }
  if (maxPoint <= 11) return 12;
  if (maxPoint <= 23) return 24;
  if (maxPoint <= 35) return 36;
  return 60;
}

/**
 * Build unified Recharts time-series data combining WHO standard curves (`p3..p97`),
 * the child's measurements, and optional vaccination markers on a shared numeric `month` axis.
 */
export function buildGrowthChartSeries(
  profile: Profile,
  metric: GrowthMetric,
  maxMonths = WHO_MAX_MONTHS,
  includeVaccines = true,
): GrowthChartPoint[] {
  const curve = whoReferenceCurve(profile.gender, metric).filter((p) => p.month <= maxMonths);
  const byMonth = new Map<number, GrowthChartPoint>();

  for (const ref of curve) {
    byMonth.set(ref.month, {
      month: ref.month,
      p3: ref.p3,
      p15: ref.p15,
      p50: ref.p50,
      p85: ref.p85,
      p97: ref.p97,
      rangeOuter: [ref.p3, ref.p97],
      rangeInner: [ref.p15, ref.p85],
    });
  }

  const upsertPoint = (monthValue: number): GrowthChartPoint | null => {
    const m = Math.round(monthValue * 10) / 10;
    if (m < 0 || m > maxMonths) return null;
    const existing = byMonth.get(m);
    if (existing) return existing;
    const ref = interpolateWhoBand(profile.gender, metric, m);
    if (!ref) return null;
    const created: GrowthChartPoint = {
      month: m,
      p3: ref.p3,
      p15: ref.p15,
      p50: ref.p50,
      p85: ref.p85,
      p97: ref.p97,
      rangeOuter: [ref.p3, ref.p97],
      rangeInner: [ref.p15, ref.p85],
    };
    byMonth.set(m, created);
    return created;
  };

  for (const entry of sortGrowthMeasurements(profile.growth ?? [])) {
    const value = metric === 'weight' ? entry.weightKg : entry.heightCm;
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    const m = ageInMonths(profile.dateOfBirth, entry.date);
    if (m === null || m < 0 || m > maxMonths) continue;
    const point = upsertPoint(m);
    if (!point) continue;
    point.childValue = value;
    point.measurementDate = entry.date;
    point.measurementId = entry.id;
    if (entry.notes) point.measurementNotes = entry.notes;
    const assessment = assessMeasurement(profile.gender, metric, m, value);
    if (assessment) {
      point.percentileBand = assessment.band;
      point.approxPercentile = assessment.approxPercentile;
    }
  }

  if (includeVaccines) {
    for (const marker of mapVaccinesToMonths(profile, maxMonths)) {
      const point = upsertPoint(marker.month);
      if (!point) continue;
      if (!point.vaccines) point.vaccines = [];
      point.vaccines.push(marker);
      // Place vaccination diamond right along the child's measured line when available,
      // otherwise on the WHO 50th percentile baseline so parents can see timing at a glance.
      point.vaccinePinValue = point.childValue ?? point.p50;
    }
  }

  return [...byMonth.values()].sort((a, b) => a.month - b.month);
}

export interface CombinedGrowthPoint {
  /** Age in months (numeric x-axis key for Recharts). */
  month: number;
  date: string;
  weightKg?: number;
  heightCm?: number;
  whoWeightP50?: number;
  whoHeightP50?: number;
  notes?: string;
  vaccines?: GrowthVaccineMarker[];
}

export interface GrowthProgressSummary {
  checkupCount: number;
  latestWeightKg?: number;
  latestWeightDate?: string;
  weightDeltaKg?: number;
  latestHeightCm?: number;
  latestHeightDate?: string;
  heightDeltaCm?: number;
  bmi?: number;
}

/**
 * Build chronological trend points containing both weight and height
 * measurements plus WHO 50th-percentile baselines for dual-axis Recharts
 * visualization.
 */
export function buildCombinedGrowthSeries(
  profile: Profile,
  maxMonths = WHO_MAX_MONTHS,
  includeVaccines = true,
): CombinedGrowthPoint[] {
  const sorted = sortGrowthMeasurements(profile.growth ?? []);
  const points: CombinedGrowthPoint[] = [];

  for (const entry of sorted) {
    const m = ageInMonths(profile.dateOfBirth, entry.date);
    if (m === null || m < 0 || m > maxMonths) continue;
    const roundedMonth = Math.round(m * 10) / 10;
    const wRef = interpolateWhoBand(profile.gender, 'weight', roundedMonth);
    const hRef = interpolateWhoBand(profile.gender, 'height', roundedMonth);
    const vaccines = includeVaccines ? nearbyVaccinesForDate(profile, entry.date, 7) : undefined;

    points.push({
      month: roundedMonth,
      date: entry.date,
      weightKg: entry.weightKg,
      heightCm: entry.heightCm,
      whoWeightP50: wRef?.p50,
      whoHeightP50: hRef?.p50,
      notes: entry.notes,
      ...(vaccines && vaccines.length > 0 ? { vaccines } : {}),
    });
  }

  return points;
}

/**
 * Compute latest weight/height values, change since previous measurement,
 * and BMI when both metrics exist on the latest paired measurement.
 */
export function computeGrowthProgress(
  measurements: readonly GrowthMeasurement[],
): GrowthProgressSummary {
  const sorted = sortGrowthMeasurements(measurements);
  const weightEntries = sorted.filter(
    (item): item is GrowthMeasurement & { weightKg: number } => typeof item.weightKg === 'number',
  );
  const heightEntries = sorted.filter(
    (item): item is GrowthMeasurement & { heightCm: number } => typeof item.heightCm === 'number',
  );

  const latestWeight = weightEntries[weightEntries.length - 1];
  const prevWeight = weightEntries.length >= 2 ? weightEntries[weightEntries.length - 2] : undefined;
  const latestHeight = heightEntries[heightEntries.length - 1];
  const prevHeight = heightEntries.length >= 2 ? heightEntries[heightEntries.length - 2] : undefined;

  const paired = [...sorted]
    .reverse()
    .find((item) => typeof item.weightKg === 'number' && typeof item.heightCm === 'number');
  const bmi =
    paired && paired.weightKg && paired.heightCm
      ? Math.round((paired.weightKg / ((paired.heightCm / 100) * (paired.heightCm / 100))) * 10) /
        10
      : undefined;

  return {
    checkupCount: sorted.length,
    latestWeightKg: latestWeight?.weightKg,
    latestWeightDate: latestWeight?.date,
    weightDeltaKg:
      latestWeight && prevWeight
        ? Math.round((latestWeight.weightKg - prevWeight.weightKg) * 100) / 100
        : undefined,
    latestHeightCm: latestHeight?.heightCm,
    latestHeightDate: latestHeight?.date,
    heightDeltaCm:
      latestHeight && prevHeight
        ? Math.round((latestHeight.heightCm - prevHeight.heightCm) * 10) / 10
        : undefined,
    bmi,
  };
}

/** Validate and build one GrowthMeasurement record. */
export function buildGrowthMeasurement(
  dateOfBirth: string,
  input: NewGrowthInput,
  now = new Date().toISOString(),
): BuildGrowthResult {
  const date = (input.date ?? '').trim().slice(0, 10);
  if (!date) return { error: 'missing-date' };
  if (!ISO_DATE.test(date) || Number.isNaN(Date.parse(date))) return { error: 'invalid-date' };
  if (date > todayISO()) return { error: 'future-date' };
  if (date < dateOfBirth) return { error: 'before-birth' };

  const rawWeight = input.weightKg;
  const rawHeight = input.heightCm;

  let weightKg: number | undefined;
  if (rawWeight !== undefined && rawWeight !== null && String(rawWeight).trim() !== '') {
    const parsed = Number(rawWeight);
    if (!Number.isFinite(parsed) || parsed < 0.5 || parsed > 120) {
      return { error: 'invalid-weight' };
    }
    weightKg = Math.round(parsed * 100) / 100;
  }

  let heightCm: number | undefined;
  if (rawHeight !== undefined && rawHeight !== null && String(rawHeight).trim() !== '') {
    const parsed = Number(rawHeight);
    if (!Number.isFinite(parsed) || parsed < 25 || parsed > 220) {
      return { error: 'invalid-height' };
    }
    heightCm = Math.round(parsed * 10) / 10;
  }

  if (weightKg === undefined && heightCm === undefined) {
    return { error: 'missing-measurement' };
  }

  const notes = typeof input.notes === 'string' ? input.notes.trim().slice(0, 300) : '';
  const measurement: GrowthMeasurement = {
    id: input.id?.trim() || createGrowthId(),
    date,
    createdAt: input.createdAt ?? now,
  };
  if (weightKg !== undefined) measurement.weightKg = weightKg;
  if (heightCm !== undefined) measurement.heightCm = heightCm;
  if (notes) measurement.notes = notes;

  return { measurement };
}

/** Normalise untrusted persisted/imported growth entry, returning `null` if invalid. */
export function normaliseGrowthMeasurement(
  raw: unknown,
  now = new Date().toISOString(),
): GrowthMeasurement | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Record<string, unknown>;
  const date = typeof candidate.date === 'string' ? candidate.date.trim().slice(0, 10) : '';
  if (!ISO_DATE.test(date) || Number.isNaN(Date.parse(date))) return null;

  const weight =
    typeof candidate.weightKg === 'number' &&
    Number.isFinite(candidate.weightKg) &&
    candidate.weightKg >= 0.5 &&
    candidate.weightKg <= 120
      ? Math.round(candidate.weightKg * 100) / 100
      : undefined;

  const height =
    typeof candidate.heightCm === 'number' &&
    Number.isFinite(candidate.heightCm) &&
    candidate.heightCm >= 25 &&
    candidate.heightCm <= 220
      ? Math.round(candidate.heightCm * 10) / 10
      : undefined;

  if (weight === undefined && height === undefined) return null;

  const id =
    typeof candidate.id === 'string' && candidate.id.trim()
      ? candidate.id.trim().slice(0, 96)
      : createGrowthId();
  const createdAt =
    typeof candidate.createdAt === 'string' && candidate.createdAt.trim()
      ? candidate.createdAt.trim().slice(0, 64)
      : now;

  const measurement: GrowthMeasurement = { id, date, createdAt };
  if (weight !== undefined) measurement.weightKg = weight;
  if (height !== undefined) measurement.heightCm = height;
  if (typeof candidate.notes === 'string' && candidate.notes.trim()) {
    measurement.notes = candidate.notes.trim().slice(0, 300);
  }
  return measurement;
}

export function sortGrowthMeasurements(
  items: readonly GrowthMeasurement[],
): GrowthMeasurement[] {
  return [...items].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export function mergeGrowthMeasurements(
  existing: readonly GrowthMeasurement[],
  incoming: readonly GrowthMeasurement[],
): GrowthMeasurement[] {
  const byId = new Map<string, GrowthMeasurement>();
  for (const item of existing) byId.set(item.id, item);
  for (const item of incoming) {
    if (!byId.has(item.id)) byId.set(item.id, item);
  }
  return sortGrowthMeasurements([...byId.values()]);
}
