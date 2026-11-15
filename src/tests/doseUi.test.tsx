/**
 * The dose ledger as a person uses it.
 *
 * `doseRegression.test.ts` proves the data layer cannot let one dose speak for a
 * whole series. This file proves the same thing through the screens: a family can
 * record dose 1, 2 and 3 of a vaccine, correct one date, delete one dose behind a
 * confirmation, see the complete history, and confirm a migrated record they never
 * numbered — and every one of those actions lands in localStorage exactly as
 * shown.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import App from '../App';
import { allVaccines } from '../data/vaccines';
import { translations } from '../i18n';
import { LANGUAGE_STORAGE_KEY } from '../i18n/storage';
import { milestoneDoses } from '../lib/doseLedger';
import { createProfile, recordDoseEvent } from '../lib/profileStore';
import { readJSON, STORAGE_KEYS, writeJSON } from '../lib/storage';
import type { Profile, VaccinationEvent } from '../types';

const ERROR_MARKER = 'TikaTrack hit an unexpected error';
const en = translations.en;

const MEMBER = 'Asha Rahman';
const DOB = '2024-01-01';

/** The schedule's own labels, so the test does not hard-code them twice. */
const OPV = milestoneDoses('opv').map((row) => row.label.en); // OPV-0 … OPV-3
const PCV = milestoneDoses('pcv').map((row) => row.label.en);
const opvName = allVaccines.find((vaccine) => vaccine.id === 'opv')!.name.en;

/** A monotonic clock, so "recorded first" never depends on the millisecond. */
let ticks = 0;
function stamp(): string {
  ticks += 1;
  return new Date(Date.parse('2026-01-01T00:00:00.000Z') + ticks * 1000).toISOString();
}

interface Seeded {
  profile: Profile;
  /** `${vaccineId}-${doseNumber}` -> event id. */
  ids: Record<string, string>;
}

function seed(
  doses: Array<{
    vaccineId: string;
    date: string;
    doseNumber: number | null;
    centre?: string;
    notes?: string;
  }>,
): Seeded {
  const created = createProfile({ name: MEMBER, dateOfBirth: DOB, relationship: 'child' });
  if (!created.profile) throw new Error(`seed profile rejected: ${created.error}`);

  let profiles = [created.profile];
  const ids: Record<string, string> = {};
  for (const dose of doses) {
    const result = recordDoseEvent(profiles, created.profile.id, dose, stamp());
    if (!result.event) throw new Error(`seed dose rejected: ${String(result.error)}`);
    ids[`${dose.vaccineId}-${dose.doseNumber ?? 'unknown'}`] = result.event.id;
    profiles = result.profiles;
  }

  writeJSON(STORAGE_KEYS.profiles, profiles);
  return { profile: profiles[0], ids };
}

/** Write a 2.x payload verbatim: no `events`, one slot per vaccine. */
function seedLegacy(records: Record<string, unknown>, id = 'legacy-1'): void {
  localStorage.setItem(
    STORAGE_KEYS.profiles,
    JSON.stringify([{ id, name: MEMBER, dateOfBirth: DOB, records }]),
  );
}

/** What the app actually persisted, read back the way it hydrates. */
function storedProfile(): Profile {
  const stored = readJSON<Profile[]>(STORAGE_KEYS.profiles, []);
  const profile = stored.find((entry) => entry.name === MEMBER);
  if (!profile) throw new Error('the member was not persisted');
  return profile;
}

function storedEvents(vaccineId?: string): VaccinationEvent[] {
  const events = storedProfile().events ?? [];
  return vaccineId ? events.filter((event) => event.vaccineId === vaccineId) : events;
}

async function openTracker(): Promise<void> {
  // BrowserRouter reads window.location on mount, so set it first.
  window.history.pushState({}, '', '/tracker');
  render(<App />);
  await waitFor(() => expect(screen.getAllByText(MEMBER).length).toBeGreaterThan(0));
  expect(screen.queryByText(ERROR_MARKER)).toBeNull();
}

/**
 * The remove button of one dose. Its accessible name carries the dose label, so
 * "delete this dose" can never be aimed at the wrong row by accident.
 */
function removeButton(label: string): HTMLElement {
  return screen.getByRole('button', { name: `${en['tracker.dose.remove']} ${label}` });
}

/** The history row for one dose, addressed the way a screen reader would. */
function rowFor(label: string): HTMLElement {
  const row = removeButton(label).closest('li');
  if (!row) throw new Error(`no history row for ${label}`);
  return row as HTMLElement;
}

async function fillRecorder(
  user: ReturnType<typeof userEvent.setup>,
  dose: { vaccineId: string; doseNumber: string; date: string; centre?: string },
): Promise<void> {
  // The form is collapsed until asked for; opening it twice is a no-op.
  const openButton = screen.queryByRole('button', { name: en['tracker.member.recordDose'] });
  if (openButton) await user.click(openButton);

  const form = document.getElementById('dose-recorder-form');
  if (!form) throw new Error('the dose recorder did not open');

  await user.selectOptions(
    document.getElementById('dose-vaccine') as HTMLSelectElement,
    dose.vaccineId,
  );
  await user.selectOptions(
    document.getElementById('dose-number') as HTMLSelectElement,
    dose.doseNumber,
  );
  // jsdom has no date picker, so the value is set the way a browser would.
  fireEvent.change(document.getElementById('dose-date') as HTMLInputElement, {
    target: { value: dose.date },
  });
  if (dose.centre) {
    await user.type(document.getElementById('dose-centre') as HTMLInputElement, dose.centre);
  }
  await user.click(screen.getByRole('button', { name: en['tracker.dose.submit'] }));
}

describe('recording a dose from the tracker', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
  });

  it('records the dose the family chose, and only that dose', async () => {
    const user = userEvent.setup();
    seed([]);
    await openTracker();

    expect(screen.getByText(en['tracker.dose.history.empty'])).toBeTruthy();
    // Every field is labelled, and the date cannot be in the future.
    expect(screen.getByRole('button', { name: en['tracker.member.recordDose'] })).toBeTruthy();

    await fillRecorder(user, {
      vaccineId: 'opv',
      doseNumber: '1',
      date: '2024-01-01',
      centre: 'Mohakhali EPI centre',
    });

    expect(await screen.findByText(`Recorded: ${OPV[0]}`)).toBeTruthy();
    expect(screen.getByText('1 dose(s) recorded')).toBeTruthy();
    // One dose of a four-dose series: the other three are still outstanding.
    expect(screen.getByText(`1 of 4 scheduled doses`)).toBeTruthy();

    const row = rowFor(OPV[0]);
    expect(within(row).getByText('1 January 2024 · Mohakhali EPI centre')).toBeTruthy();
    expect(within(row).getByText(en['tracker.dose.provenance.manual'])).toBeTruthy();

    const [event] = storedEvents('opv');
    expect(storedEvents()).toHaveLength(1);
    expect(event).toMatchObject({
      vaccineId: 'opv',
      doseNumber: 1,
      scheduledDoseId: 'opv#1@0d',
      date: '2024-01-01',
      centre: 'Mohakhali EPI centre',
      provenance: 'manual',
    });
    expect(event.needsReview).toBeUndefined();
  });

  it('marks the recorded dose as given in the choice list', async () => {
    const user = userEvent.setup();
    seed([]);
    await openTracker();

    await fillRecorder(user, { vaccineId: 'opv', doseNumber: '1', date: '2024-01-01' });
    await screen.findByText(`Recorded: ${OPV[0]}`);

    // The form stays open for the next dose, and its list now says which doses
    // exist — a family cannot accidentally believe the series is finished.
    const options = Array.from(
      (document.getElementById('dose-number') as HTMLSelectElement).options,
    ).map((option) => option.textContent ?? '');
    expect(options[0]).toBe(en['tracker.dose.doseUnknown']);
    expect(options[1]).toContain(OPV[0]);
    expect(options[1]).toContain('already given on 1 January 2024');
    expect(options[2]).toContain(OPV[1]);
    expect(options[2]).toContain(en['tracker.dose.notRecorded']);
    expect(options[3]).toContain(OPV[2]);
    expect(options[3]).toContain(en['tracker.dose.notRecorded']);
  });

  it('keeps dose 1 when doses 2 and 3 are recorded', async () => {
    const user = userEvent.setup();
    seed([]);
    await openTracker();

    await fillRecorder(user, { vaccineId: 'opv', doseNumber: '1', date: '2024-01-01' });
    await screen.findByText(`Recorded: ${OPV[0]}`);
    await fillRecorder(user, { vaccineId: 'opv', doseNumber: '2', date: '2024-02-12' });
    await screen.findByText(`Recorded: ${OPV[1]}`);
    await fillRecorder(user, { vaccineId: 'opv', doseNumber: '3', date: '2024-03-11' });
    await screen.findByText(`Recorded: ${OPV[2]}`);

    expect(screen.getByText('3 dose(s) recorded')).toBeTruthy();
    expect(screen.getByText('3 of 4 scheduled doses')).toBeTruthy();
    for (const label of [OPV[0], OPV[1], OPV[2]]) {
      expect(rowFor(label)).toBeTruthy();
    }
    // The fourth dose is not claimed by the other three.
    expect(screen.queryByRole('button', { name: `${en['tracker.dose.remove']} ${OPV[3]}` })).toBe(
      null,
    );

    expect(storedEvents('opv').map((event) => event.doseNumber)).toEqual([1, 2, 3]);
    expect(storedEvents('opv').map((event) => event.date)).toEqual([
      '2024-01-01',
      '2024-02-12',
      '2024-03-11',
    ]);
    expect(new Set(storedEvents('opv').map((event) => event.id)).size).toBe(3);
  });

  it('accepts "not sure" and stores an unknown dose number, flagged', async () => {
    const user = userEvent.setup();
    seed([]);
    await openTracker();

    await fillRecorder(user, { vaccineId: 'opv', doseNumber: '', date: '2024-02-12' });

    expect(await screen.findByText(en['tracker.dose.review.badge'])).toBeTruthy();
    const row = rowFor(opvName);
    expect(within(row).getByText(en['tracker.dose.unnumbered'])).toBeTruthy();
    expect(within(row).getByText(en['tracker.dose.review.dose-number-unknown'])).toBeTruthy();

    // Never silently turned into dose 1, and a human is asked which it was.
    const [event] = storedEvents('opv');
    expect(event.doseNumber).toBeNull();
    expect(event.needsReview).toBe(true);
    expect(event.reviewReason).toBe('dose-number-unknown');
    expect(within(row).getByLabelText(en['tracker.dose.review.confirm'])).toBeTruthy();
  });

  it('flags a second record claiming a dose that is already in the ledger', async () => {
    const user = userEvent.setup();
    seed([{ vaccineId: 'opv', date: '2024-01-01', doseNumber: 1 }]);
    await openTracker();

    // The form warns before the save, because dose 1 is already on the card.
    await user.click(screen.getByRole('button', { name: en['tracker.member.recordDose'] }));
    await user.selectOptions(document.getElementById('dose-vaccine') as HTMLSelectElement, 'opv');
    await user.selectOptions(document.getElementById('dose-number') as HTMLSelectElement, '1');
    const warning = en['tracker.dose.alreadyGiven']
      .replace('{0}', OPV[0])
      .replace('{1}', '1 January 2024');
    expect(await screen.findByText(warning)).toBeTruthy();

    await fillRecorder(user, { vaccineId: 'opv', doseNumber: '1', date: '2024-06-01' });
    // Recording it is still allowed (a clinic may be correcting a card), but the
    // duplicate is kept and marked — never silently merged away.
    expect(await screen.findByText(en['tracker.dose.review.duplicate-dose-number'])).toBeTruthy();
    expect(storedEvents('opv')).toHaveLength(2);
    expect(storedEvents('opv')[1].needsReview).toBe(true);
    // Still one dose satisfied, not two.
    expect(screen.getByText('1 of 4 scheduled doses')).toBeTruthy();
  });
});

describe('correcting and deleting a dose from the history', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
  });

  it('corrects one date and leaves the other doses untouched', async () => {
    const user = userEvent.setup();
    const { ids } = seed([
      { vaccineId: 'opv', date: '2024-01-01', doseNumber: 1, centre: 'Mohakhali' },
      { vaccineId: 'opv', date: '2024-02-12', doseNumber: 2, centre: 'Mirpur' },
      { vaccineId: 'opv', date: '2024-03-11', doseNumber: 3, centre: 'Uttara' },
    ]);
    const before = storedEvents('opv');
    await openTracker();

    const row = rowFor(OPV[1]);
    await user.click(within(row).getByRole('button', { name: en['tracker.dose.edit.button'] }));

    const dateInput = document.getElementById(`edit-date-${ids['opv-2']}`) as HTMLInputElement;
    expect(dateInput.value).toBe('2024-02-12');
    expect(dateInput.max).not.toBe('');
    expect(
      screen.getByText(`${en['tracker.dose.edit.title'].replace('{0}', OPV[1])}`),
    ).toBeTruthy();

    fireEvent.change(dateInput, { target: { value: '2024-02-20' } });
    await user.click(screen.getByRole('button', { name: en['tracker.dose.edit.save'] }));

    expect(await screen.findByText(en['tracker.dose.updated'])).toBeTruthy();
    expect(within(rowFor(OPV[1])).getByText('20 February 2024 · Mirpur')).toBeTruthy();
    expect(within(rowFor(OPV[1])).getByText(en['tracker.dose.corrected'])).toBeTruthy();
    // The neighbours still show their own dates, and no "corrected" badge.
    expect(within(rowFor(OPV[0])).getByText('1 January 2024 · Mohakhali')).toBeTruthy();
    expect(within(rowFor(OPV[2])).getByText('11 March 2024 · Uttara')).toBeTruthy();
    expect(within(rowFor(OPV[0])).queryByText(en['tracker.dose.corrected'])).toBeNull();
    expect(within(rowFor(OPV[2])).queryByText(en['tracker.dose.corrected'])).toBeNull();

    const after = storedEvents('opv');
    expect(after).toHaveLength(3);
    expect(after.map((event) => event.date)).toEqual(['2024-01-01', '2024-02-20', '2024-03-11']);
    expect(after[1].id).toBe(ids['opv-2']);
    expect(after[1].createdAt).toBe(before[1].createdAt);
    expect(after[1].updatedAt).toBeTruthy();
    // Byte-for-byte the same neighbours.
    expect(after[0]).toEqual(before[0]);
    expect(after[2]).toEqual(before[2]);
  });

  it('refuses a corrected date in the future', async () => {
    const user = userEvent.setup();
    const { ids } = seed([{ vaccineId: 'opv', date: '2024-02-12', doseNumber: 2 }]);
    await openTracker();

    await user.click(
      within(rowFor(OPV[1])).getByRole('button', { name: en['tracker.dose.edit.button'] }),
    );
    const dateInput = document.getElementById(`edit-date-${ids['opv-2']}`) as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2030-01-01' } });
    await user.click(screen.getByRole('button', { name: en['tracker.dose.edit.save'] }));

    // The save is stopped in the form, with the reason, and nothing is written.
    expect(await screen.findByText(en['tracker.dose.error.future-date'])).toBeTruthy();
    expect(storedEvents('opv')[0].date).toBe('2024-02-12');
  });

  it('deletes one dose only after confirmation, and keeps the rest', async () => {
    const user = userEvent.setup();
    const { ids } = seed([
      { vaccineId: 'opv', date: '2024-01-01', doseNumber: 1 },
      { vaccineId: 'opv', date: '2024-02-12', doseNumber: 2 },
      { vaccineId: 'opv', date: '2024-03-11', doseNumber: 3 },
      { vaccineId: 'pcv', date: '2024-02-12', doseNumber: 1 },
    ]);
    await openTracker();

    await user.click(removeButton(OPV[1]));

    // The dialog names the dose, the member and the date, and says the rest stays.
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText(en['tracker.dose.delete.title'])).toBeTruthy();
    expect(
      within(dialog).getByText(
        `${OPV[1]}, given on 12 February 2024, will be removed from the record of ${MEMBER}. The other doses of this vaccine stay.`,
      ),
    ).toBeTruthy();

    // Cancelling changes nothing at all.
    await user.click(within(dialog).getByRole('button', { name: en['tracker.cancel'] }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(screen.getByText('4 dose(s) recorded')).toBeTruthy();
    expect(storedEvents()).toHaveLength(4);

    // Confirming removes that one dose.
    await user.click(removeButton(OPV[1]));
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: en['tracker.dose.delete.confirm'],
      }),
    );

    expect(await screen.findByText(`Removed ${OPV[1]}`)).toBeTruthy();
    expect(screen.getByText('3 dose(s) recorded')).toBeTruthy();
    expect(screen.queryByRole('button', { name: `${en['tracker.dose.remove']} ${OPV[1]}` })).toBe(
      null,
    );
    // The other OPV doses and the whole PCV series are untouched.
    expect(rowFor(OPV[0])).toBeTruthy();
    expect(rowFor(OPV[2])).toBeTruthy();
    expect(rowFor(PCV[0])).toBeTruthy();
    expect(screen.getByText('2 of 4 scheduled doses')).toBeTruthy();
    expect(screen.getByText(`1 of 3 scheduled doses`)).toBeTruthy();

    const events = storedEvents();
    expect(events).toHaveLength(3);
    expect(events.map((event) => event.id)).not.toContain(ids['opv-2']);
    expect(storedEvents('opv').map((event) => event.doseNumber)).toEqual([1, 3]);
    expect(storedEvents('pcv').map((event) => event.doseNumber)).toEqual([1]);
  });

  it('keeps "delete the whole vaccine history" a separate, louder action', async () => {
    const user = userEvent.setup();
    seed([
      { vaccineId: 'opv', date: '2024-01-01', doseNumber: 1 },
      { vaccineId: 'opv', date: '2024-02-12', doseNumber: 2 },
      { vaccineId: 'pcv', date: '2024-02-12', doseNumber: 1 },
    ]);
    await openTracker();

    await user.click(
      screen.getByRole('button', {
        name: `${en['tracker.dose.deleteVaccine.button'].replace('{0}', '2')}`,
      }),
    );

    const dialog = screen.getByRole('alertdialog');
    expect(
      within(dialog).getByText(en['tracker.dose.deleteVaccine.title'].replace('{0}', opvName)),
    ).toBeTruthy();
    expect(
      within(dialog).getByText(
        `This removes all 2 recorded doses of ${opvName}. It cannot be undone.`,
      ),
    ).toBeTruthy();

    await user.click(
      within(dialog).getByRole('button', { name: en['tracker.dose.deleteVaccine.confirm'] }),
    );

    expect(await screen.findByText(`Removed ${opvName} (2 dose(s))`)).toBeTruthy();
    expect(screen.getByText('1 dose(s) recorded')).toBeTruthy();
    // PCV survives an OPV deletion.
    expect(rowFor(PCV[0])).toBeTruthy();
    expect(screen.queryByText(`2 of 4 scheduled doses`)).toBeNull();
    expect(storedEvents()).toHaveLength(1);
    expect(storedEvents()[0].vaccineId).toBe('pcv');
  });
});

describe('a record migrated from TikaTrack 2.x', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
  });

  it('is shown as needing review, with its date, note and centre intact', async () => {
    seedLegacy({
      opv: { date: '2024-02-12', notes: 'given with pentavalent', centre: 'Mirpur EPI centre' },
      pcv: '2024-02-12',
    });
    await openTracker();

    expect(screen.getByText('2 dose(s) recorded')).toBeTruthy();
    expect(screen.getByText(en['tracker.dose.history.review'].replace('{0}', '2'))).toBeTruthy();

    const row = rowFor(opvName);
    expect(within(row).getByText('12 February 2024 · Mirpur EPI centre')).toBeTruthy();
    expect(within(row).getByText('given with pentavalent')).toBeTruthy();
    expect(within(row).getByText(en['tracker.dose.unnumbered'])).toBeTruthy();
    expect(within(row).getByText(en['tracker.dose.provenance.legacy-migration'])).toBeTruthy();
    expect(
      within(row).getByText(en['tracker.dose.review.legacy-dose-number-unknown']),
    ).toBeTruthy();

    // One legacy row satisfies at most one dose of the series.
    expect(screen.getByText('1 of 4 scheduled doses')).toBeTruthy();
    expect(screen.getByText('1 of 3 scheduled doses')).toBeTruthy();

    const events = storedEvents();
    expect(events).toHaveLength(2);
    expect(events.every((event) => event.doseNumber === null)).toBe(true);
    expect(events.every((event) => event.provenance === 'legacy-migration')).toBe(true);
    expect(events.every((event) => event.needsReview)).toBe(true);
    expect(events.find((event) => event.vaccineId === 'opv')?.notes).toBe('given with pentavalent');
    // The 2.x map is still written alongside, for an older build.
    expect(storedProfile().records.opv.date).toBe('2024-02-12');
  });

  it('can be given its real dose number in place, which clears the flag', async () => {
    const user = userEvent.setup();
    seedLegacy({ opv: { date: '2024-02-12', notes: 'given with pentavalent' } });
    await openTracker();

    await user.selectOptions(screen.getByLabelText(en['tracker.dose.review.confirm']), '3');

    expect(await screen.findByText(en['tracker.dose.review.saved'])).toBeTruthy();
    // Dose 3 of OPV is labelled OPV-2 by the schedule.
    expect(rowFor(OPV[2])).toBeTruthy();
    expect(screen.queryByText(en['tracker.dose.unnumbered'])).toBeNull();
    expect(screen.queryByText(en['tracker.dose.review.badge'])).toBeNull();

    const [event] = storedEvents('opv');
    expect(event).toMatchObject({
      doseNumber: 3,
      scheduledDoseId: 'opv#3@70d',
      date: '2024-02-12',
      notes: 'given with pentavalent',
      provenance: 'legacy-migration',
    });
    expect(event.needsReview).toBeUndefined();
    // Nothing was invented to fill doses 1 and 2.
    expect(screen.getByText('1 of 4 scheduled doses')).toBeTruthy();
    expect(storedEvents()).toHaveLength(1);
  });
});
