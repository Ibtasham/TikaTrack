/**
 * Personal context for TikaBot.
 *
 * The assistant answers strictly from the sourced corpus (`ragEngine`), which is
 * the right safety rule for a health bot — but it means "when is the next dose?"
 * gets a generic answer even when this device already knows exactly which child
 * is being asked about and when their Pentavalent-3 falls due.
 *
 * This module computes that answer from the family's own records. It is kept
 * separate from `ragEngine` on purpose and rendered as a **distinct, labelled
 * block** in the UI: corpus text stays attributable to its sources, and computed
 * text stays visibly computed. Neither is passed off as the other.
 */

import type { Language } from '../i18n/types';
import type { Profile } from '../types';
import { formatAge, formatDate, localiseNumber, todayISO } from './format';
import {
  calculateVaccinationStats,
  generatePersonalizedSchedule,
  milestoneDoseName,
  type ScheduledDose,
} from './smartScheduler';

export interface BotContextDose {
  /** Display name, e.g. `Pentavalent-3`. */
  vaccine: string;
  vaccineId: string;
  /** Localised date, ready to show. */
  dateText: string;
  /** ISO date, for building calendar events. */
  isoDate: string;
  /** Whole days from today; negative means it was due in the past. */
  days: number;
  /** Natural-language distance: "in 12 days", "40 days ago", "today". */
  daysText: string;
}

export interface BotContext {
  memberName: string;
  ageText: string;
  completed: number;
  totalScheduled: number;
  progressPercentage: number;
  dueToday: BotContextDose[];
  overdue: BotContextDose[];
  nextDue: BotContextDose | null;
  /** The day this snapshot was computed — the record is only as fresh as this. */
  asOf: string;
}

/** How many overdue doses to name before collapsing into "+N more". */
const MAX_LISTED_OVERDUE = 3;

/**
 * Queries where a personal answer is more useful than a generic one.
 *
 * Deliberately narrow: asking about side effects should get the sourced text and
 * nothing else, so the block is not attached to every message.
 */
const PERSONALISATION_TERMS = [
  // English
  'schedule',
  'next dose',
  'next vaccine',
  'due',
  'overdue',
  'missed',
  'catch-up',
  'catch up',
  'which vaccine',
  'how many doses',
  'my child',
  'my baby',
  'plan',
  // Bangla
  'সময়সূচি',
  'পরবর্তী',
  'কবে',
  'বাকি',
  'অতিক্রান্ত',
  'ডোজ',
  'শিশু',
  'পরিকল্পনা',
];

/** `true` when the question is about timing, so the record is worth showing. */
export function shouldPersonalise(query: string): boolean {
  const text = String(query ?? '').toLowerCase();
  if (!text.trim()) return false;
  return PERSONALISATION_TERMS.some((term) => text.includes(term));
}

/**
 * "in 12 days" / "40 days ago" / "today".
 *
 * `formatRelativeDays` renders `-40 days`, which is right for a table column and
 * wrong in a sentence, so the bot gets its own phrasing (and localised digits).
 */
export function relativeDays(days: number, language: Language): string {
  const count = localiseNumber(Math.abs(days), language);
  if (days === 0) return language === 'bn' ? 'আজ' : 'today';
  const singular = Math.abs(days) === 1;

  if (language === 'bn') return days > 0 ? `${count} দিন পরে` : `${count} দিন আগে`;
  if (days > 0) return singular ? `in ${count} day` : `in ${count} days`;
  return singular ? `${count} day ago` : `${count} days ago`;
}

function toContextDose(dose: ScheduledDose, language: Language): BotContextDose {
  return {
    vaccine: milestoneDoseName(dose, language),
    vaccineId: dose.vaccineId,
    dateText: formatDate(dose.scheduledDate, language),
    isoDate: dose.scheduledDate,
    days: dose.daysUntilDue,
    daysText: relativeDays(dose.daysUntilDue, language),
  };
}

/**
 * Build the snapshot for one family member.
 *
 * Returns `null` when the profile has no usable date of birth — a half-filled
 * record should not produce a confident-sounding schedule.
 */
export function buildBotContext(profile: Profile, language: Language): BotContext | null {
  if (!profile?.dateOfBirth) return null;

  // The whole profile, not `profile.records`: the legacy map holds one dose per
  // vaccine, so the assistant would report a series as finished after one dose.
  const doses = generatePersonalizedSchedule(profile.dateOfBirth, profile);
  if (doses.length === 0) return null;

  const stats = calculateVaccinationStats(profile.dateOfBirth, profile);
  const pending = doses
    .filter((dose) => dose.status === 'upcoming' || dose.status === 'due-today')
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

  return {
    memberName: profile.name,
    ageText: formatAge(profile.dateOfBirth, language),
    completed: stats.completed,
    totalScheduled: stats.totalScheduled,
    progressPercentage: stats.progressPercentage,
    dueToday: doses
      .filter((dose) => dose.status === 'due-today')
      .map((dose) => toContextDose(dose, language)),
    overdue: doses
      .filter((dose) => dose.status === 'overdue')
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
      .map((dose) => toContextDose(dose, language)),
    nextDue: pending.length > 0 ? toContextDose(pending[0], language) : null,
    asOf: todayISO(),
  };
}

const TEXT = {
  en: {
    heading: (name: string) => `From ${name}'s record on this device`,
    age: 'Age',
    progress: (done: string, total: string) => `Doses recorded: ${done} of ${total}`,
    dueToday: 'Due today',
    overdue: 'Overdue',
    more: (count: string) => `+${count} more`,
    next: 'Next due',
    allDone: 'Nothing outstanding in the national schedule — well done.',
    asOf: (date: string) => `Calculated ${date}`,
    none: 'none',
  },
  bn: {
    heading: (name: string) => `এই ডিভাইসে সংরক্ষিত ${name}-এর তথ্য থেকে`,
    age: 'বয়স',
    progress: (done: string, total: string) => `টিকা দেওয়া হয়েছে: ${total}টির মধ্যে ${done}টি`,
    dueToday: 'আজ দিতে হবে',
    overdue: 'সময় অতিক্রান্ত',
    more: (count: string) => `+ আরও ${count}টি`,
    next: 'পরবর্তী টিকা',
    allDone: 'জাতীয় সময়সূচি অনুযায়ী আর কিছু বাকি নেই — ভালো করেছেন।',
    asOf: (date: string) => `হিসাব করা হয়েছে ${date}`,
    none: 'নেই',
  },
} as const;

/**
 * Render the snapshot as plain text lines.
 *
 * Plain text (not markup) so it can be read aloud by a screen reader, copied into
 * a message, and dropped into the chat log without a second renderer.
 */
export function renderBotContext(context: BotContext, language: Language): string {
  const text = TEXT[language] ?? TEXT.en;
  const lines: string[] = [];

  lines.push(text.heading(context.memberName));
  lines.push(`• ${text.age}: ${context.ageText}`);
  lines.push(
    `• ${text.progress(
      localiseNumber(context.completed, language),
      localiseNumber(context.totalScheduled, language),
    )}`,
  );

  if (context.dueToday.length > 0) {
    lines.push(`• ${text.dueToday}: ${context.dueToday.map((dose) => dose.vaccine).join(', ')}`);
  }

  if (context.overdue.length > 0) {
    const listed = context.overdue
      .slice(0, MAX_LISTED_OVERDUE)
      .map((dose) => `${dose.vaccine} (${dose.daysText})`)
      .join(', ');
    const extra = context.overdue.length - MAX_LISTED_OVERDUE;
    lines.push(
      `• ${text.overdue}: ${listed}${
        extra > 0 ? ` ${text.more(localiseNumber(extra, language))}` : ''
      }`,
    );
  }

  if (context.nextDue) {
    lines.push(
      `• ${text.next}: ${context.nextDue.vaccine} — ${context.nextDue.dateText} (${context.nextDue.daysText})`,
    );
  } else if (context.overdue.length === 0 && context.dueToday.length === 0) {
    lines.push(`• ${text.allDone}`);
  }

  lines.push(text.asOf(formatDate(context.asOf, language)));
  return lines.join('\n');
}
