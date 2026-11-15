/* ---------------------------------------------------------------------------
 * Bangla (বাংলা) strings.
 *
 * Kept in sync with the other language file: `npm run test` fails when a key
 * exists in one language but not the other.
 * ------------------------------------------------------------------------- */
import type { TranslationDictionary } from '../types';

export const bn: TranslationDictionary = {
  'error.title': 'টিকাট্র্যাকে অপ্রত্যাশিত সমস্যা হয়েছে',
  'error.body':
    'আপনার সংরক্ষিত রেকর্ড এই ডিভাইসেই আছে। পেজটি রিলোড করুন অথবা হোমে গিয়ে আবার চেষ্টা করুন।',
  'error.reload': 'রিলোড',
  'error.home': 'হোমে যান',
  'error.details': 'সমস্যার বিবরণ',
  'error.boundary.title': 'এই পেজে একটি সমস্যা হয়েছে',
  'error.boundary.body':
    'আপনার সংরক্ষিত তথ্য অক্ষত আছে — এটি একটি রেন্ডারিং সমস্যা। রিলোড করলে সাধারণত ঠিক হয়ে যায়।',
  'error.offline.title': 'আপনি অফলাইনে আছেন বলে মনে হচ্ছে',
  'error.offline.body':
    'ব্রাউজারে সংরক্ষিত তথ্য দিয়ে টিকাট্র্যাক চলতে থাকবে, তবে নতুন অনুসন্ধান ব্যর্থ হতে পারে।',
};
