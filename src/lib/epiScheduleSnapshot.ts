import { allVaccines, schedule, type ScheduleItem, type Vaccine } from '../data/vaccines.ts';

export const EPI_SCHEDULE_SNAPSHOT_VERSION = 'bangladesh-epi-2026.1';

export interface EpiScheduleSnapshot {
  version: string;
  country: 'BD';
  source: string;
  generatedAt: string;
  milestones: ScheduleItem[];
  vaccines: Vaccine[];
}

/**
 * Deterministic serializable snapshot of the national Bangladesh EPI schedule
 * and vaccine catalog for Service Worker offline caching and `/api/epi-schedule`.
 */
export function buildEpiScheduleSnapshot(generatedAt = '2026-01-01T00:00:00.000Z'): EpiScheduleSnapshot {
  return {
    version: EPI_SCHEDULE_SNAPSHOT_VERSION,
    country: 'BD',
    source: 'DGHS Bangladesh EPI / WHO',
    generatedAt,
    milestones: schedule,
    vaccines: allVaccines,
  };
}
