import { beforeEach, describe, expect, it, vi } from 'vitest';

import { downloadTextFile } from '../lib/exporters';
import {
  buildICS,
  countValidEvents,
  downloadICS,
  escapeText,
  eventUid,
  foldLine,
  icsDate,
  icsDuration,
  icsNextDay,
  icsTimestamp,
  type CalendarEvent,
} from '../lib/ics';

vi.mock('../lib/exporters', () => ({ downloadTextFile: vi.fn() }));

const NOW = new Date(Date.UTC(2026, 10, 1, 9, 30, 5));

function dose(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    uid: 'ayesha-penta-3@tikatrack.local',
    date: '2026-11-12',
    summary: 'Pentavalent dose 3 — Ayesha',
    ...overrides,
  };
}

/** Undo RFC 5545 line folding. */
function unfold(text: string): string {
  return text.replace(/\r\n[ \t]/g, '');
}

function octetLength(line: string): number {
  return new TextEncoder().encode(line).length;
}

beforeEach(() => {
  vi.mocked(downloadTextFile).mockClear();
});

describe('escapeText', () => {
  it('escapes the four characters RFC 5545 reserves', () => {
    expect(escapeText('a,b;c\\d')).toBe('a\\,b\\;c\\\\d');
  });

  it('turns every newline flavour into an escaped \\n', () => {
    expect(escapeText('one\r\ntwo\nthree\rfour')).toBe('one\\ntwo\\nthree\\nfour');
  });

  it('leaves Bangla text alone', () => {
    expect(escapeText('পেন্টাভ্যালেন্ট টিকা')).toBe('পেন্টাভ্যালেন্ট টিকা');
  });

  it('tolerates values that a hand-edited export might leave empty', () => {
    expect(escapeText(undefined as unknown as string)).toBe('');
    expect(escapeText(null as unknown as string)).toBe('');
    expect(escapeText(42 as unknown as string)).toBe('42');
  });
});

describe('foldLine', () => {
  it('leaves short lines untouched', () => {
    expect(foldLine('SUMMARY:Short')).toBe('SUMMARY:Short');
  });

  it('keeps every physical line within 75 octets and round-trips', () => {
    const long = `DESCRIPTION:${'The national EPI schedule covers BCG, Pentavalent, MR and more. '.repeat(4)}`;
    const folded = foldLine(long);

    for (const line of folded.split('\r\n')) expect(octetLength(line)).toBeLessThanOrEqual(75);
    expect(unfold(folded)).toBe(long);
    expect(folded.split('\r\n').length).toBeGreaterThan(1);
  });

  it('never splits a multi-octet Bangla character', () => {
    const long = `SUMMARY:${'টিকা '.repeat(40)}`;
    const folded = foldLine(long);

    for (const line of folded.split('\r\n')) expect(octetLength(line)).toBeLessThanOrEqual(75);
    // A split code point would produce U+FFFD or throw when re-decoded.
    expect(unfold(folded)).toBe(long);
    expect(unfold(folded)).not.toContain('\uFFFD');
  });

  it('starts continuation lines with exactly one space', () => {
    const folded = foldLine(`SUMMARY:${'x'.repeat(200)}`);
    const [, second] = folded.split('\r\n');
    expect(second.startsWith(' ')).toBe(true);
    expect(second.startsWith('  ')).toBe(false);
  });
});

describe('date helpers', () => {
  it('compacts an ISO date', () => {
    expect(icsDate('2026-11-12')).toBe('20261112');
    expect(icsDate('2026-01-02')).toBe('20260102');
  });

  it.each(['', '2026-1-2', '2026-13-01', '2026-00-10', '2026-11-00', '2026-11-32', 'tomorrow'])(
    'rejects %s',
    (value) => {
      expect(icsDate(value)).toBeNull();
    },
  );

  it('formats a UTC timestamp', () => {
    expect(icsTimestamp(NOW)).toBe('20261101T093005Z');
  });

  it.each([
    ['20261112', '20261113'],
    ['20261130', '20261201'],
    ['20261231', '20270101'],
    ['20280228', '20280229'], // leap year
    ['20260228', '20260301'], // common year
  ])('day after %s is %s', (input, expected) => {
    expect(icsNextDay(input)).toBe(expected);
  });

  it.each([
    [0, 'PT0M'],
    [60, '-PT1H'],
    [90, '-PT1H30M'],
    [30, '-PT30M'],
    [1440, '-P1D'],
    [1500, '-P1DT1H'],
    [2880, '-P2D'],
    [4320, '-P3D'],
  ])('turns %s minutes into %s', (minutes, expected) => {
    expect(icsDuration(minutes)).toBe(expected);
  });

  it('rejects nonsense alarm offsets', () => {
    expect(icsDuration(-5)).toBeNull();
    expect(icsDuration(Number.NaN)).toBeNull();
    expect(icsDuration(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe('eventUid', () => {
  it('is deterministic, so re-importing updates instead of duplicating', () => {
    expect(eventUid('Ayesha', 'penta-3', '2026-11-12')).toBe(
      eventUid('ayesha', 'PENTA 3', '2026-11-12'),
    );
    expect(eventUid('Ayesha', 'penta-3')).toBe('ayesha-penta-3@tikatrack.local');
  });

  it('falls back to a generic slug when nothing usable was given', () => {
    expect(eventUid('', '  ', '!!!')).toBe('event@tikatrack.local');
  });

  it('accepts numbers', () => {
    expect(eventUid('dose', 3)).toBe('dose-3@tikatrack.local');
  });
});

describe('buildICS', () => {
  it('writes a publishable calendar with the required properties', () => {
    const ics = buildICS([dose()], { now: NOW, name: 'TikaTrack — Ayesha' });

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('PRODID:-//TikaTrack//');
    expect(ics).toContain('CALSCALE:GREGORIAN');
    expect(ics).toContain('METHOD:PUBLISH');
    expect(ics).toContain('X-WR-CALNAME:TikaTrack — Ayesha');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('emits an all-day event whose DTEND is exclusive', () => {
    const ics = buildICS([dose()], { now: NOW });

    expect(ics).toContain('DTSTART;VALUE=DATE:20261112');
    expect(ics).toContain('DTEND;VALUE=DATE:20261113');
    expect(ics).toContain('DTSTAMP:20261101T093005Z');
    expect(ics).toContain('UID:ayesha-penta-3@tikatrack.local');
    expect(ics).toContain('SUMMARY:Pentavalent dose 3 — Ayesha');
  });

  it('includes description, location, url and alarms when given', () => {
    const ics = buildICS(
      [
        dose({
          description: 'Bring the EPI card.\nCentre opens 09:00.',
          location: 'Uposhohar EPI Centre, Dhaka',
          url: 'https://example.org/vaccines/pentavalent',
          alarmsMinutesBefore: [1440, 120],
        }),
      ],
      { now: NOW },
    );

    expect(ics).toContain('DESCRIPTION:Bring the EPI card.\\nCentre opens 09:00.');
    expect(ics).toContain('LOCATION:Uposhohar EPI Centre\\, Dhaka');
    expect(ics).toContain('URL:https://example.org/vaccines/pentavalent');
    expect(ics).toContain('BEGIN:VALARM');
    expect(ics).toContain('TRIGGER:-P1D');
    expect(ics).toContain('TRIGGER:-PT2H');
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(2);
  });

  it('skips alarms with an invalid offset', () => {
    const ics = buildICS([dose({ alarmsMinutesBefore: [-1, Number.NaN] })], { now: NOW });
    expect(ics).not.toContain('BEGIN:VALARM');
  });

  it('uses CRLF everywhere and never a bare line feed', () => {
    const ics = buildICS([dose(), dose({ uid: 'b', date: '2026-12-01' })], { now: NOW });

    expect(ics.endsWith('\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toContain('\n');
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
  });

  it('folds long values so no line exceeds the limit', () => {
    const ics = buildICS([dose({ summary: `${'Pentavalent '.repeat(30)}— Ayesha` })], { now: NOW });

    for (const line of ics.split('\r\n')) expect(octetLength(line)).toBeLessThanOrEqual(75);
    expect(unfold(ics)).toContain(`SUMMARY:${'Pentavalent '.repeat(30)}— Ayesha`);
  });

  it('drops events with an unusable date instead of writing a broken file', () => {
    const ics = buildICS([dose(), dose({ uid: 'bad', date: 'not-a-date' })], { now: NOW });
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(countValidEvents([dose(), dose({ date: 'nope' })])).toBe(1);
  });

  it('generates a UID when the caller has none', () => {
    const ics = buildICS([dose({ uid: '  ' })], { now: NOW });
    expect(ics).toMatch(/UID:20261112-pentavalent-dose-3-ayesha@tikatrack\.local/);
  });

  it('still produces a valid empty calendar', () => {
    const ics = buildICS([], { now: NOW });
    expect(unfold(ics)).toContain('BEGIN:VCALENDAR');
    expect(ics).not.toContain('BEGIN:VEVENT');
  });

  it('includes the optional calendar description and timezone', () => {
    const ics = buildICS([dose()], {
      now: NOW,
      description: 'Due doses; semi-colon test',
      timezone: 'Asia/Dhaka',
    });
    expect(ics).toContain('X-WR-CALDESC:Due doses\\; semi-colon test');
    expect(ics).toContain('X-WR-TIMEZONE:Asia/Dhaka');
  });

  it('defaults DTSTAMP to the current time', () => {
    const ics = buildICS([dose()]);
    expect(ics).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);
  });
});

describe('downloadICS', () => {
  it('writes a text/calendar file', () => {
    expect(downloadICS('ayesha.ics', [dose()], { now: NOW, name: 'TikaTrack' })).toBe(true);
    expect(downloadTextFile).toHaveBeenCalledTimes(1);

    const [filename, contents, mime] = vi.mocked(downloadTextFile).mock.calls[0];
    expect(filename).toBe('ayesha.ics');
    expect(mime).toBe('text/calendar;charset=utf-8');
    expect(contents).toContain('BEGIN:VCALENDAR');
  });

  it('refuses to write an empty file', () => {
    expect(downloadICS('nothing.ics', [])).toBe(false);
    expect(downloadICS('nothing.ics', [dose({ date: 'bad' })])).toBe(false);
    expect(downloadTextFile).not.toHaveBeenCalled();
  });
});
