import { lifespanSchedule, type LifespanMilestone } from '../data/lifespanSchedule';
import type { Profile } from '../types';
import { ensureLedger } from './doseLedger';
import type { ScheduledDose } from './smartScheduler';

export interface LifespanOrdinalEntry {
  /** 1-based occurrence index of `vaccineId` across age milestones in `lifespanSchedule`. */
  ordinal: number;
  /** Total occurrences of `vaccineId` across age milestones in `lifespanSchedule`. */
  totalOccurrences: number;
}

/**
 * Build a stable lookup mapping `${milestone.id}::${vaccine.id}` -> ordinal occurrence
 * across chronological age milestones so multi-dose non-EPI series (e.g. Varicella 1 & 2,
 * Hepatitis A 1 & 2, Rotavirus 1 & 2) never mark future doses completed after a single shot.
 */
export function buildLifespanDoseIndex(
  schedule: readonly LifespanMilestone[] = lifespanSchedule,
): Map<string, LifespanOrdinalEntry> {
  const counts = new Map<string, number>();
  const raw = new Map<string, { vaccineId: string; ordinal: number }>();

  for (const milestone of schedule) {
    if (milestone.ageDays === null) continue;
    for (const item of milestone.vaccines) {
      const next = (counts.get(item.id) ?? 0) + 1;
      counts.set(item.id, next);
      raw.set(`${milestone.id}::${item.id}`, { vaccineId: item.id, ordinal: next });
    }
  }

  const out = new Map<string, LifespanOrdinalEntry>();
  for (const [key, entry] of raw.entries()) {
    out.set(key, {
      ordinal: entry.ordinal,
      totalOccurrences: counts.get(entry.vaccineId) ?? 1,
    });
  }
  return out;
}

const DEFAULT_DOSE_INDEX = buildLifespanDoseIndex();

/**
 * Resolve recorded date for a specific vaccine occurrence inside a lifespan milestone.
 *
 * - EPI scheduled doses delegate directly to the canonical `doseLedger`-backed `memberScheduleMap`.
 * - Non-EPI multi-dose vaccines match by explicit `doseNumber === ordinal`, or fall back to
 *   positional matching in chronological event order (`eventsForVaccine[ordinal - 1]`) so
 *   1 recorded dose only satisfies the 1st milestone occurrence.
 */
export function resolveLifespanVaccineRecord(
  member: Profile | null,
  milestone: LifespanMilestone,
  vaccineId: string,
  memberScheduleMap: Map<string, ScheduledDose>,
  doseIndex: Map<string, LifespanOrdinalEntry> = DEFAULT_DOSE_INDEX,
): { recorded: boolean; date?: string; suggestedDoseNumber: number } {
  const ordinalEntry = doseIndex.get(`${milestone.id}::${vaccineId}`);
  const ordinal = ordinalEntry?.ordinal ?? 1;

  if (!member) {
    return { recorded: false, suggestedDoseNumber: ordinal };
  }

  if (milestone.ageDays !== null) {
    const epiRow = memberScheduleMap.get(`${vaccineId}@${milestone.ageDays}`);
    if (epiRow) {
      return {
        recorded: epiRow.status === 'completed',
        date: epiRow.status === 'completed' ? epiRow.actualDate : undefined,
        suggestedDoseNumber: epiRow.doseNumber,
      };
    }
  }

  // Filter chronological ledger events (+ legacy fallback) for this vaccine
  const allEvents = ensureLedger(member).events ?? [];
  const matching = allEvents
    .filter((ev) => ev.vaccineId === vaccineId)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt.localeCompare(b.createdAt)));

  if (matching.length === 0) {
    return { recorded: false, suggestedDoseNumber: ordinal };
  }

  if (milestone.ageDays === null) {
    // Special / Travel / Maternal milestones represent event-triggered doses: latest event applies
    const latest = matching[matching.length - 1];
    return {
      recorded: true,
      date: latest.date,
      suggestedDoseNumber: matching.length + 1,
    };
  }

  // Check explicit doseNumber match first
  const exact = matching.find((ev) => ev.doseNumber === ordinal);
  if (exact) {
    return {
      recorded: true,
      date: exact.date,
      suggestedDoseNumber: ordinal,
    };
  }

  // Only consume an event positionally if its doseNumber wasn't explicitly assigned to another slot
  const remainingPool = matching.filter(
    (ev) => ev.doseNumber === null || ev.doseNumber === undefined || ev.doseNumber === ordinal,
  );
  // Count how many earlier occurrences already consumed either explicit or pooled events
  const candidate = matching[ordinal - 1];
  if (candidate && (candidate.doseNumber === null || candidate.doseNumber === ordinal)) {
    return {
      recorded: true,
      date: candidate.date,
      suggestedDoseNumber: ordinal,
    };
  }

  if (remainingPool.length >= ordinal) {
    return {
      recorded: true,
      date: remainingPool[ordinal - 1].date,
      suggestedDoseNumber: ordinal,
    };
  }

  return {
    recorded: false,
    suggestedDoseNumber: ordinal,
  };
}
