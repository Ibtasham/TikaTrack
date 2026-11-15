/* ---------------------------------------------------------------------------
 * Bangla (বাংলা) strings.
 *
 * Kept in sync with the other language file: `npm run test` fails when a key
 * exists in one language but not the other.
 * ------------------------------------------------------------------------- */
import type { TranslationDictionary } from '../types';

export const bn: TranslationDictionary = {
  'notFound.title': 'পেজ পাওয়া যায়নি',
  'notFound.body': 'এই লিঙ্কটির অস্তিত্ব নেই। টিকা লাইব্রেরি দেখুন অথবা হোমে ফিরে যান।',
  'notFound.home': 'হোমে ফিরে যান',
  'notFound.vaccines': 'টিকা দেখুন',
  'notFound.subtitle': 'এই পেজটি নেই। হয়তো সরে গেছে, অথবা লিংকে ভুল আছে।',
  'notFound.suggestions': 'অথবা এগুলো দেখুন',
};
