/* ---------------------------------------------------------------------------
 * Bangla (বাংলা) strings.
 *
 * Kept in sync with the other language file: `npm run test` fails when a key
 * exists in one language but not the other.
 * ------------------------------------------------------------------------- */
import type { TranslationDictionary } from '../types';

export const bn: TranslationDictionary = {
  'home.stats.vaccines': 'তথ্যসমৃদ্ধ টিকা',
  'home.stats.centres': 'যাচাইকৃত কেন্দ্র',
  'home.stats.districts': 'কভার করা জেলা',
  'home.stats.divisions': 'বিভাগ',
  'home.stats.languages': 'ভাষা',
  'home.offline.title': 'অফলাইনে চলে, তথ্য থাকে স্থানীয়ভাবে',
  'home.offline.body':
    'অ্যাকাউন্ট লাগে না। প্রোফাইল, ডোজ ও রিমাইন্ডার আপনার ব্রাউজারেই থাকে এবং ক্লাউড সিঙ্ক চালু না করলে ডিভাইস ছেড়ে যায় না। অ্যাপটিও ক্যাশ হয়ে থাকে, তাই একদম নেটওয়ার্ক ছাড়াই খোলে।',
  'home.hero.title': 'পরিবারের সবার জন্য প্রতিটি টিকা, সঠিক সময়ে।',
  'home.hero.subtitle':
    'বাংলাদেশের জন্য নির্ভরযোগ্য সূত্রসহ টিকাদান সূচি, ক্যাচ-আপ পরিকল্পনা, ডোজ ট্র্যাকিং এবং ৯৯টি যাচাই করা কেন্দ্র — ইংরেজি ও বাংলায়, এবং সবকিছু অফলাইনে কাজ করে।',
  'home.hero.primary': 'সূচি দেখুন',
  'home.hero.secondary': 'পরিবারের সদস্য যোগ করুন',
  'home.hero.tertiary': 'টিকাবটকে জিজ্ঞাসা করুন',
  'home.features.schedule.title': 'বয়সভিত্তিক সূচি',
  'home.features.schedule.body':
    'জন্ম থেকে ১৫ মাস পর্যন্ত বাংলাদেশের ইপিআই সূচি, এবং কোনো ডোজ বাদ পড়লে ক্যাচ-আপ পরিকল্পনা।',
  'home.features.tracker.title': 'পরিবার ট্র্যাকিং',
  'home.features.tracker.body':
    'প্রতিটি সদস্যের রেকর্ড রাখুন। ডোজ, তারিখ, কেন্দ্র ও নোট আপনার ডিভাইসেই থাকে — এবং ক্যালেন্ডার ফাইল, চ্যাট বার্তা বা ছাপার কার্ড হিসেবে বের করে নেওয়া যায়।',
  'home.features.centres.title': 'যাচাই করা কেন্দ্র',
  'home.features.centres.body':
    'সরকারি, বেসরকারি, এনজিও ও হাসপাতাল কেন্দ্র — ফোন নম্বর, সময় এবং কোন সূত্র থেকে যাচাই করা হয়েছে তা সহ।',
  'home.features.bot.title': 'টিকাবট সহকারী',
  'home.features.bot.body':
    'পার্শ্বপ্রতিক্রিয়া, ডোজের ব্যবধান বা পিছিয়ে পড়লে কী করবেন — জিজ্ঞাসা করুন। উত্তরে সূত্র উল্লেখ থাকে, এবং চাইলে আপনার সংরক্ষিত রেকর্ডের তথ্যও যোগ হয়।',
  'home.features.passport.title': 'ডিজিটাল পাসপোর্ট',
  'home.features.passport.body':
    'স্বাক্ষরিত QR সনদ তৈরি করুন, ছবি হিসেবে শেয়ার করুন, এবং সার্ভার ছাড়াই অফলাইনে যাচাই করুন — ফোন দিয়ে স্ক্যান করেও।',
  'home.features.analytics.title': 'অগ্রগতি বিশ্লেষণ',
  'home.features.analytics.body':
    'সম্পন্ন হার, পরবর্তী ডোজ এবং কোথায় পিছিয়ে আছেন — ছবিসহ দেখুন, প্রিন্টও করা যায়।',
  'home.quick.title': 'সরাসরি শুরু করুন',
  'home.cta.title': 'একজন পরিবারের সদস্য দিয়ে শুরু করুন',
  'home.cta.body':
    'মাত্র বিশ সেকেন্ড লাগে। কিছুই আপলোড হয় না, এবং যেকোনো সময় সব তথ্য এক্সপোর্ট বা মুছে ফেলতে পারেন।',
  'home.cta.button': 'ট্র্যাকার খুলুন',
  'home.banner.notPersistent':
    'এই ব্রাউজার লোকাল স্টোরেজ বন্ধ রেখেছে, তাই আপনি যা লিখবেন তা সংরক্ষিত হবে না। প্রাইভেট উইন্ডোতে এমন হয়।',
  'home.stats.doses': 'মোট ডোজ ট্র্যাক করা হয়',
  'home.family.title': 'আপনার পরিবারের বর্তমান অবস্থা',
  'home.family.subtitle': 'এই ডিভাইসে সংরক্ষিত রেকর্ড থেকে তাৎক্ষণিক অগ্রগতি।',
  'home.family.dueToday': 'আজ {0}টি প্রাপ্য',
  'home.family.allCaughtUp': 'সব প্রাপ্য ডোজ সম্পন্ন',
  'home.family.nextLabel': 'পরবর্তী',
  'home.family.openTracker': 'খুলুন',
};
