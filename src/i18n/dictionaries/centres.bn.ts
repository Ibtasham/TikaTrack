/* ---------------------------------------------------------------------------
 * Bangla (বাংলা) strings.
 *
 * Kept in sync with the other language file: `npm run test` fails when a key
 * exists in one language but not the other.
 * ------------------------------------------------------------------------- */
import type { TranslationDictionary } from '../types';

export const bn: TranslationDictionary = {
  'centres.title': 'টিকাদান কেন্দ্র',
  'centres.subtitle': 'আপনার এলাকায় টিকাদান কেন্দ্র খুঁজুন',
  'centres.selectDistrict': 'জেলা নির্বাচন করুন',
  'centres.searchPlaceholder': 'কেন্দ্র অনুসন্ধান করুন...',
  'centres.noData': 'আপনার মানদণ্ডের সাথে মিলে এমন কোনো কেন্দ্র পাওয়া যায়নি।',
  'centres.callHelpline': 'জাতীয় হেলপলাইনে কল করুন',
  'centres.address': 'ঠিকানা',
  'centres.phone': 'ফোন',
  'centres.hotline': 'হটলাইন',
  'centres.services': 'সেবা',
  'centres.hours': 'কাজের সময়',
  'centres.verified': 'যাচাইকৃত',
  'centres.lastUpdated': 'সর্বশেষ আপডেট',
  'centres.totalFound': '{0} টি কেন্দ্র পাওয়া গেছে',
  'centres.filter.division': 'বিভাগ',
  'centres.filter.district': 'জেলা',
  'centres.filter.type': 'ধরন',
  'centres.filter.verifiedOnly': 'শুধু যাচাইকৃত',
  'centres.type.government': 'সরকারি',
  'centres.type.private': 'বেসরকারি',
  'centres.type.ngo': 'এনজিও',
  'centres.type.hospital': 'হাসপাতাল',
  'centres.allDivisions': 'সব বিভাগ',
  'centres.allDistricts': 'সব জেলা',
  'centres.allTypes': 'সব ধরন',
  'centres.openMaps': 'ম্যাপে খুলুন',
  'centres.copyPhone': 'ফোন নম্বর কপি করুন',
  'centres.source': 'যাচাইয়ের সূত্র',
  'centres.unverified': 'স্বতন্ত্রভাবে যাচাই করা হয়নি',
  'centres.sort.name': 'নাম',
  'centres.sort.district': 'জেলা',
  'centres.sort.type': 'ধরন',
  'centres.filters.active': '{0} টি ফিল্টার চালু',
  'centres.export': 'এই তালিকা ডাউনলোড করুন (CSV)',
  'centres.disclaimer':
    'সময় ও ফোন নম্বর বদলাতে পারে। যাওয়ার আগে ফোন করুন, এবং কেন্দ্র সাড়া না দিলে ১৬২৬৩ হটলাইনে যোগাযোগ করুন।',
  'centres.nearMe': 'আমার নিকটতম',
  'centres.locating': 'অবস্থান খুঁজছে…',
  'centres.locationActive': 'দূরত্ব অনুযায়ী সাজানো',
  'centres.locationClear': 'অবস্থান মুছুন',
  'centres.locationUnsupported': 'এই ব্রাউজারে লোকেশন সুবিধা নেই।',
  'centres.locationDenied': 'লোকেশন অনুমতি পাওয়া যায়নি — বিভাগ বা জেলা বেছে নিন।',
  'centres.sort.distance': 'নিকটতম দূরত্ব',
  'centres.away': '{0} দূরে',
};
