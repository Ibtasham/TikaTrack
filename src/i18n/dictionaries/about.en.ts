/* ---------------------------------------------------------------------------
 * English strings.
 *
 * Kept in sync with the other language file: `npm run test` fails when a key
 * exists in one language but not the other.
 * ------------------------------------------------------------------------- */
import type { TranslationDictionary } from '../types';

export const en: TranslationDictionary = {
  'about.title': 'About TikaTrack',
  'about.subtitle': 'What TikaTrack is, what it is not, and where the data comes from.',
  'about.mission.title': 'Why it exists',
  'about.mission.body':
    'Vaccination guidance in Bangladesh is published across PDFs, circulars and hotline scripts, in two languages, and it changes. TikaTrack pulls the parts families actually need into one offline-first place.',
  'about.whatItIs.title': 'What TikaTrack does',
  'about.whatItIs.body':
    'It stores your family’s vaccination records in this browser, calculates what is due from the national schedule, helps you find a centre, and puts the remaining doses into your phone’s calendar. Everything runs locally.',
  'about.whatItIsNot.title': 'What TikaTrack is not',
  'about.whatItIsNot.body':
    'It is not a government service, not a medical authority and not a substitute for a health worker. It cannot book appointments or issue official certificates.',
  'about.sources.title': 'Where the data comes from',
  'about.sources.body':
    'Every vaccine and centre entry carries the source it was checked against — DGHS and the EPI programme, WHO and UNICEF country documents, and published manufacturer guidance.',
  'about.tech.title': 'How it is built',
  'about.tech.body':
    'React, TypeScript and Tailwind, bundled with Vite. State lives in localStorage; optional Supabase sync switches on only when you configure it. The QR certificates are generated on-device, and a service worker caches the app shell so it opens without a network.',
  'about.disclaimer.title': 'Medical disclaimer',
  'about.disclaimer.body':
    'Information here is summarised from published guidance and may lag behind the latest circular. Always confirm with a registered health worker or by calling 16263.',
  'about.links.title': 'Official resources',
  'about.hotline': 'National health hotline',
  'about.version': 'Version',
  'about.license': 'Released under the MIT licence',
};
