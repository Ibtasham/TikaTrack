/* ---------------------------------------------------------------------------
 * Bangla (বাংলা) strings.
 *
 * Kept in sync with the other language file: `npm run test` fails when a key
 * exists in one language but not the other.
 * ------------------------------------------------------------------------- */
import type { TranslationDictionary } from '../types';

export const bn: TranslationDictionary = {
  'confirm.deleteProfile.title': 'এই প্রোফাইল মুছবেন?',
  'confirm.deleteProfile.body':
    '“{0}” এবং তার সব রেকর্ডকৃত ডোজ এই ডিভাইস থেকে মুছে যাবে। এটি ফেরানো যাবে না।',
  'confirm.delete.title': 'আপনি কি নিশ্চিত?',
  'confirm.delete': 'মুছে ফেলুন',
  'confirm.keep': 'রেখে দিন',
};
