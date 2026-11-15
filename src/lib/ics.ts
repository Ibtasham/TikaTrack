/**
 * iCalendar (RFC 5545) generation.
 *
 * Why this exists: a vaccination schedule is only useful if it reaches the
 * calendar the family already lives in — the one that wakes them up. Browser
 * notifications need the tab open; a `.ics` file does not. Every due dose can be
 * exported as an all-day event with an alarm, and it keeps working on a feature
 * phone through Google Calendar, Outlook or any mail client.
 *
 * The details that are easy to get wrong and are handled here:
 *   - **CRLF only.** RFC 5545 §3.1 requires `\r\n`; a file with bare `\n` is
 *     rejected by strict parsers (Outlook).
 *   - **75-octet folding.** Long lines must be folded with CRLF + one space, and
 *     the split must never land inside a multi-octet UTF-8 character — Bangla
 *     text is three octets per letter, so a naive `slice(75)` corrupts it.
 *   - **All-day semantics.** `DTEND` is *exclusive*: an event on 12 November is
 *     `DTSTART;VALUE=DATE:20261112` / `DTEND;VALUE=DATE:20261113`.
 *   - **Stable UIDs.** Re-importing the same file must update the event, not
 *     duplicate it, so UIDs are derived from the data (see `eventUid`).
 */

import { downloadTextFile } from './exporters';

export interface CalendarEvent {
  /** Stable identifier; see `eventUid`. */
  uid: string;
  /** Local calendar date, `YYYY-MM-DD`. Events are all-day. */
  date: string;
  summary: string;
  description?: string;
  location?: string;
  url?: string;
  /** Alarm offsets before the event, in minutes (1440 = one day before). */
  alarmsMinutesBefore?: number[];
}

export interface CalendarDocument {
  /** Shown as the calendar's name by most clients (`X-WR-CALNAME`). */
  name?: string;
  description?: string;
  /** Informational only — all-day events carry no time zone. */
  timezone?: string;
  /** Injectable for deterministic output in tests. */
  now?: Date;
}

const PRODID = '-//TikaTrack//Vaccination Schedule 2.0//EN';

/** RFC 5545 §3.1: lines must not exceed 75 octets excluding the CRLF. */
const MAX_LINE_OCTETS = 75;

const MINUTES_PER_DAY = 1440;

/** Escape a text value per RFC 5545 §3.3.11. */
export function escapeText(value: string): string {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/**
 * Fold one logical line into physical lines of at most 75 octets.
 *
 * Iterates by code point and measures in octets, so neither a surrogate pair nor
 * a Bangla character is ever cut in half. Continuation lines start with the
 * single space the RFC requires.
 */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= MAX_LINE_OCTETS) return line;

  const parts: string[] = [];
  let current = '';
  let budget = MAX_LINE_OCTETS;

  for (const char of line) {
    const size = encoder.encode(char).length;
    if (size > budget) {
      parts.push(current);
      current = ` ${char}`;
      budget = MAX_LINE_OCTETS - 1 - size;
    } else {
      current += char;
      budget -= size;
    }
  }
  parts.push(current);
  return parts.join('\r\n');
}

/** `YYYY-MM-DD` → `YYYYMMDD`, or `null` when the input is not a calendar date. */
export function icsDate(iso: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? '').trim());
  if (!match) return null;
  const [, year, month, day] = match;
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  if (monthNumber < 1 || monthNumber > 12 || dayNumber < 1 || dayNumber > 31) return null;
  return `${year}${month}${day}`;
}

/** A UTC timestamp for `DTSTAMP`: `20261112T093000Z`. */
export function icsTimestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/** The day after an `YYYYMMDD` date, computed in UTC so no local zone leaks in. */
export function icsNextDay(compactDate: string): string {
  const year = Number(compactDate.slice(0, 4));
  const month = Number(compactDate.slice(4, 6));
  const day = Number(compactDate.slice(6, 8));
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${next.getUTCFullYear()}${pad(next.getUTCMonth() + 1)}${pad(next.getUTCDate())}`;
}

/** Minutes → a negative RFC 5555 duration (`-P1D`, `-PT90M`), or `null`. */
export function icsDuration(minutes: number): string | null {
  if (!Number.isFinite(minutes) || minutes < 0) return null;
  if (minutes === 0) return 'PT0M';

  const days = Math.floor(minutes / MINUTES_PER_DAY);
  const remainder = Math.round(minutes % MINUTES_PER_DAY);
  const hours = Math.floor(remainder / 60);
  const mins = remainder % 60;

  let value = '-P';
  if (days > 0) value += `${days}D`;
  if (hours > 0 || mins > 0) {
    value += 'T';
    if (hours > 0) value += `${hours}H`;
    if (mins > 0) value += `${mins}M`;
  }
  return value === '-P' ? null : value;
}

/**
 * Build a deterministic UID from the event's identity.
 *
 * Importing the same schedule twice must update the existing events instead of
 * duplicating them, which is exactly what a stable UID gives us.
 */
export function eventUid(...parts: Array<string | number>): string {
  const slug = parts
    .map((part) =>
      String(part ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        // Punctuation-only parts would otherwise leave a stray dash behind.
        .replace(/^-+|-+$/g, ''),
    )
    .filter(Boolean)
    .join('-');
  return `${slug || 'event'}@tikatrack.local`;
}

/**
 * Render a `.ics` document.
 *
 * Events with an unparseable date are skipped rather than aborting the whole
 * export: a hand-edited record should cost the user one row, not the file.
 */
export function buildICS(
  events: readonly CalendarEvent[],
  calendar: CalendarDocument = {},
): string {
  const now = calendar.now ?? new Date();
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  if (calendar.name) lines.push(`X-WR-CALNAME:${escapeText(calendar.name)}`);
  if (calendar.description) lines.push(`X-WR-CALDESC:${escapeText(calendar.description)}`);
  if (calendar.timezone) lines.push(`X-WR-TIMEZONE:${calendar.timezone}`);

  for (const event of events) {
    const start = icsDate(event.date);
    if (!start) continue;

    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.uid.trim() || eventUid(start, event.summary)}`,
      `DTSTAMP:${icsTimestamp(now)}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${icsNextDay(start)}`,
      `SUMMARY:${escapeText(event.summary) || 'TikaTrack'}`,
    );

    if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
    if (event.url) lines.push(`URL:${event.url}`);

    for (const minutes of event.alarmsMinutesBefore ?? []) {
      const trigger = icsDuration(minutes);
      if (!trigger) continue;
      lines.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${escapeText(event.summary) || 'TikaTrack'}`,
        `TRIGGER:${trigger}`,
        'END:VALARM',
      );
    }

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}

/** Number of events that will actually make it into the file. */
export function countValidEvents(events: readonly CalendarEvent[]): number {
  return events.filter((event) => icsDate(event.date) !== null).length;
}

/** Download the calendar. Returns `false` when there was nothing to export. */
export function downloadICS(
  filename: string,
  events: readonly CalendarEvent[],
  calendar: CalendarDocument = {},
): boolean {
  if (countValidEvents(events) === 0) return false;
  downloadTextFile(filename, buildICS(events, calendar), 'text/calendar;charset=utf-8');
  return true;
}
