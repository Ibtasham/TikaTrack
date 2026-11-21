/* ---------------------------------------------------------------------------
 * English strings for Readiness Advisor & Global Command Palette.
 *
 * Kept in sync with `readiness.bn.ts`.
 * ------------------------------------------------------------------------- */
import type { TranslationDictionary } from '../types';

export const en: TranslationDictionary = {
  'readiness.eyebrow': 'LIFE-EVENT & TRAVEL IMMUNIZATION PLANNER',
  'readiness.title': 'Vaccine Readiness Advisor',
  'readiness.subtitle':
    'Select a life event, pilgrimage, study-abroad trip, occupation, or health profile to generate a tailored vaccine readiness checklist cross-checked against your family dose ledger.',
  'readiness.stepScenarios': '1. Choose scenarios (combine multiple if needed)',
  'readiness.stepContext': '2. Personalize with family record & target date',
  'readiness.memberLabel': 'Family member ledger check',
  'readiness.memberGuest': 'General checklist (no member selected)',
  'readiness.targetDateLabel': 'Target / departure / milestone date',
  'readiness.targetDateHint': 'Calculates the latest clinic date for vaccines requiring ≥7–42 days lead time.',
  'readiness.summaryTotal': 'Total checks',
  'readiness.summaryRecorded': 'Recorded on device',
  'readiness.summaryNeeded': 'Action needed',
  'readiness.clinicGuidance': 'Clinic & certification guidance',
  'readiness.priority.mandatory': 'Mandatory / Core rule',
  'readiness.priority.essential': 'Essential priority',
  'readiness.priority.recommended': 'Strongly recommended',
  'readiness.priority.situational': 'Situational / Advisory',
  'readiness.status.recorded': 'Recorded ({0} dose/s)',
  'readiness.status.equivalent': 'Equivalent antigen logged ({0})',
  'readiness.status.unconfirmedNote': 'Includes unconfirmed dose record — verify against paper card',
  'readiness.status.needed': 'Not recorded yet',
  'readiness.deadlineLabel': 'Latest recommended clinic date',
  'readiness.tightWindowAlert':
    'Target date is very close — consult an approved clinic or physician immediately for accelerated guidance.',
  'readiness.routeSiteLabel': 'Administration & cold chain',
  'readiness.actions.viewMonograph': 'Full clinical monograph',
  'readiness.actions.logInTracker': 'Log in Tracker',
  'readiness.actions.findCentres': 'Find Verified Centres',
  'readiness.actions.print': 'Print checklist',
  'readiness.actions.download': 'Export text summary',
  'readiness.emptySelection': 'Select at least one scenario above to view your readiness plan.',
  'readiness.disclaimer':
    'Readiness guidance is for preparation only and does not replace official border rules or individual physician evaluation. Call Bangladesh Health Hotline 16263 for national guidance.',

  // Command Palette (⌘K)
  'cmd.placeholder': 'Search 90 vaccines, 175 centres across 64 districts, life stages, or tools…',
  'cmd.triggerLabel': 'Search…',
  'cmd.shortcutHint': 'Ctrl/⌘ K',
  'cmd.empty': 'No matching vaccines, centres, or pages found.',
  'cmd.group.tools': 'Pages & Interactive Tools',
  'cmd.group.vaccines': 'Vaccines (Clinical Monographs)',
  'cmd.group.centres': 'Verified Centres (64 Districts)',
  'cmd.group.stages': 'All-Ages Schedule Milestones',
  'cmd.footerHint': '↑↓ to navigate · Enter to open · Esc to close',
};
