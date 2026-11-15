/* ---------------------------------------------------------------------------
 * Bangla (বাংলা) strings.
 *
 * Kept in sync with the other language file: `npm run test` fails when a key
 * exists in one language but not the other.
 * ------------------------------------------------------------------------- */
import type { TranslationDictionary } from '../types';

export const bn: TranslationDictionary = {
  'onboarding.eyebrow': 'টিকাট্র্যাকে স্বাগতম',
  'onboarding.step': 'ধাপ {0} / {1}',
  'onboarding.progress': 'পরিচয়ের অগ্রগতি',
  'onboarding.skip': 'পরিচয় এড়িয়ে যান',
  'onboarding.finish': 'শুরু করুন',

  'onboarding.privacy.title': 'আপনার তথ্য এই ডিভাইসেই থাকে',
  'onboarding.privacy.body':
    'কোনো অ্যাকাউন্ট নেই, সার্ভার নেই, বিজ্ঞাপন নেই। রেকর্ড এই ব্রাউজারেই থাকে, এবং আপনি নিজে ক্লাউড সিঙ্ক চালু না করলে কিছুই আপলোড হয় না। প্রাইভেসি পেজ থেকে যেকোনো সময় সব তথ্য রপ্তানি বা মুছে ফেলতে পারবেন।',

  'onboarding.start.title': 'শুরু করুন পরিবারের একজন সদস্য দিয়ে',
  'onboarding.start.body':
    'নাম আর জন্মতারিখ যোগ করুন। এই দুটি তথ্য থেকেই টিকাট্র্যাক জাতীয় সূচি হিসাব করে, কী বকেয়া তা দেখায়, ক্যাচ-আপ ডোজ সাজায় এবং প্রতিটি ডোজের আগে মনে করিয়ে দেয়।',
  'onboarding.start.cta': 'সদস্য যোগ করুন',

  'onboarding.everywhere.title': 'সাথে নিয়ে যান',
  'onboarding.everywhere.body':
    'ক্লিনিকে নেটওয়ার্ক ছাড়া ব্যবহারের জন্য অ্যাপটি ইনস্টল করুন, বাকি ডোজগুলো ফোনের ক্যালেন্ডারে যোগ করুন, স্বাস্থ্যকর্মীর জন্য কার্ড ছাপুন, অথবা যিনি শিশুকে নিয়ে যাবেন তাঁর সঙ্গে সারসংক্ষেপ শেয়ার করুন। ভাষা ও লেখার আকার বদলের অপশন হেডারে আছে।',
};
