/* ---------------------------------------------------------------------------
 * Bangla (বাংলা) strings.
 *
 * Kept in sync with the other language file: `npm run test` fails when a key
 * exists in one language but not the other.
 * ------------------------------------------------------------------------- */
import type { TranslationDictionary } from '../types';

export const bn: TranslationDictionary = {
  'compare.title': 'টিকার তুলনা',
  'compare.subtitle': 'দুই থেকে চারটি টিকা বেছে নিন এবং পাশাপাশি দেখুন',
  'compare.picker': 'টিকা বেছে নিন',
  'compare.selected': '{1}টির মধ্যে {0}টি নির্বাচিত',
  'compare.hint': 'তুলনা করতে কমপক্ষে দুইটি টিকা বেছে নিন।',
  'compare.limit': 'সর্বোচ্চ {0}টি টিকা তুলনা করা যাবে।',
  'compare.clear': 'নির্বাচন মুছে ফেলুন',
  'compare.attribute.name': 'টিকা',
  'compare.attribute.fullName': 'পূর্ণ নাম',
  'compare.attribute.disease': 'প্রতিরোধ করে',
  'compare.attribute.category': 'ধরন',
  'compare.attribute.schedule': 'সূচি',
  'compare.attribute.doses': 'ডোজ সংখ্যা',
  'compare.attribute.efficacy': 'কার্যকারিতা',
  'compare.attribute.ageGroup': 'বয়স গোষ্ঠী',
  'compare.attribute.introduced': 'বাংলাদেশে চালু',
  'compare.attribute.commonEffects': 'সাধারণ পার্শ্বপ্রতিক্রিয়া',
  'compare.attribute.seriousEffects': 'বিরল তবে গুরুতর',
  'compare.attribute.contraindications': 'কারা নেবেন না',
  'compare.attribute.source': 'উৎস',
  'compare.print': 'তুলনা প্রিন্ট করুন',
  'compare.empty': 'এখনো কোনো টিকা নির্বাচিত হয়নি',
  'compare.addFirst': 'পাশাপাশি তুলনা দেখতে অন্তত একটি টিকা যোগ করুন।',
  'compare.addSecond': 'তুলনা করতে আরেকটি টিকা যোগ করুন।',
  'compare.browse': 'টিকার তালিকা দেখুন',
  'compare.remove': 'সরান',
  'compare.attribute': 'বৈশিষ্ট্য',
};
