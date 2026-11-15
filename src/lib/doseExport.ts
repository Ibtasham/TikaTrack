import { allVaccines } from '../data/vaccines';
import type { Language } from '../i18n/types';
import type { Profile } from '../types';

import { milestoneDoses } from './doseLedger';
import { formatAge } from './format';

/**
 * Dose-level export builders.
 *
 * Pure and framework-free, so a component and a test share one implementation:
 * these return rows, and the caller decides what to do with them
 * (`downloadCSV`, a print sheet, an assertion).
 *
 * One row per **administered dose**, straight from the ledger. The 2.x export
 * wrote one row per vaccine, so a three-dose series appeared once and the dose
 * number, centre, batch and provenance were not in the file at all — a backup
 * that cannot represent a series cannot restore one.
 */

/** Column order of the dose CSV. English headers: it is an interchange format. */
export const DOSE_CSV_HEADER: readonly string[] = [
  'Member',
  'Date of birth',
  'Age',
  'Vaccine',
  'Vaccine (EN)',
  'Dose number',
  'Dose (EN)',
  'Date given',
  'Centre',
  'Manufacturer',
  'Batch',
  'Notes',
  'Provenance',
  'Needs review',
  'Recorded at',
  'Record ID',
];

const vaccineNameById = new Map(allVaccines.map((vaccine) => [vaccine.id, vaccine.name]));

/** One row per dose, header first. Members with no doses still get a row. */
export function doseCsvRows(profiles: readonly Profile[], language: Language = 'en'): unknown[][] {
  const rows: unknown[][] = [[...DOSE_CSV_HEADER]];

  for (const profile of profiles) {
    const events = profile.events ?? [];
    if (events.length === 0) {
      rows.push([
        profile.name,
        profile.dateOfBirth,
        formatAge(profile.dateOfBirth, language),
        ...Array(DOSE_CSV_HEADER.length - 3).fill(''),
      ]);
      continue;
    }

    for (const event of events) {
      const names = vaccineNameById.get(event.vaccineId);
      const milestone = milestoneDoses(event.vaccineId).find(
        (row) => row.doseNumber === event.doseNumber,
      );
      rows.push([
        profile.name,
        profile.dateOfBirth,
        formatAge(profile.dateOfBirth, language),
        names ? names[language] : event.vaccineId,
        names ? names.en : event.vaccineId,
        // An unknown dose number stays empty. It is never filled in on export:
        // inventing one here would turn an honest gap into a false record.
        event.doseNumber ?? '',
        milestone ? milestone.label.en : '',
        event.date,
        event.centre ?? '',
        event.manufacturer ?? '',
        event.batch ?? '',
        event.notes ?? '',
        event.provenance,
        event.needsReview ? 'yes' : 'no',
        event.createdAt,
        event.id,
      ]);
    }
  }

  return rows;
}

/** The same rows without the header — what a reader counts or re-imports. */
export function doseCsvDataRows(
  profiles: readonly Profile[],
  language: Language = 'en',
): unknown[][] {
  return doseCsvRows(profiles, language).slice(1);
}

/** How many administered doses the export represents. */
export function doseCsvCount(profiles: readonly Profile[]): number {
  return profiles.reduce((total, profile) => total + (profile.events?.length ?? 0), 0);
}

/** Index of a column in {@link DOSE_CSV_HEADER}, for readers of the rows. */
export function doseCsvColumn(name: string): number {
  const index = DOSE_CSV_HEADER.indexOf(name);
  if (index < 0) throw new Error(`unknown dose CSV column: ${name}`);
  return index;
}
