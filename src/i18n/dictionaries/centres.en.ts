/* ---------------------------------------------------------------------------
 * English strings.
 *
 * Kept in sync with the other language file: `npm run test` fails when a key
 * exists in one language but not the other.
 * ------------------------------------------------------------------------- */
import type { TranslationDictionary } from '../types';

export const en: TranslationDictionary = {
  'centres.title': 'Vaccination Centres',
  'centres.subtitle': 'Find vaccination centres in your area',
  'centres.selectDistrict': 'Select District',
  'centres.searchPlaceholder': 'Search centres...',
  'centres.noData': 'No centres found matching your criteria.',
  'centres.callHelpline': 'Call National Helpline',
  'centres.address': 'Address',
  'centres.phone': 'Phone',
  'centres.hotline': 'Hotline',
  'centres.services': 'Services',
  'centres.hours': 'Working Hours',
  'centres.verified': 'Verified',
  'centres.lastUpdated': 'Last Updated',
  'centres.totalFound': '{0} centres found',
  'centres.filter.division': 'Division',
  'centres.filter.district': 'District',
  'centres.filter.type': 'Type',
  'centres.filter.verifiedOnly': 'Verified only',
  'centres.type.government': 'Government',
  'centres.type.private': 'Private',
  'centres.type.ngo': 'NGO',
  'centres.type.hospital': 'Hospital',
  'centres.allDivisions': 'All divisions',
  'centres.allDistricts': 'All districts',
  'centres.allTypes': 'All types',
  'centres.openMaps': 'Open in Maps',
  'centres.copyPhone': 'Copy phone number',
  'centres.source': 'Verified against',
  'centres.unverified': 'Not independently verified',
  'centres.sort.name': 'Name',
  'centres.sort.district': 'District',
  'centres.sort.type': 'Type',
  'centres.filters.active': '{0} filters active',
  'centres.export': 'Download this list (CSV)',
  'centres.disclaimer':
    'Opening hours and phone numbers change. Call before you travel, and use the 16263 hotline if a centre is unresponsive.',
  'centres.nearMe': 'Nearest to me',
  'centres.locating': 'Finding location…',
  'centres.locationActive': 'Sorted by distance',
  'centres.locationClear': 'Clear location',
  'centres.locationUnsupported': 'Location access is not supported in this browser.',
  'centres.locationDenied': 'Location permission was blocked — pick a division or district instead.',
  'centres.sort.distance': 'Nearest distance',
  'centres.away': '{0} away',
};
