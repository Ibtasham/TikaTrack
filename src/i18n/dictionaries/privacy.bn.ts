/* ---------------------------------------------------------------------------
 * Bangla (বাংলা) strings.
 *
 * Kept in sync with the other language file: `npm run test` fails when a key
 * exists in one language but not the other.
 * ------------------------------------------------------------------------- */
import type { TranslationDictionary } from '../types';

export const bn: TranslationDictionary = {
  'privacy.title': 'গোপনীয়তা ও নিরাপত্তা',
  'privacy.subtitle': 'আপনার অ্যাকাউন্ট, ডেটা এবং গোপনীয়তা সেটিংস পরিচালনা করুন',
  'privacy.account': 'অ্যাকাউন্ট তথ্য',
  'privacy.email': 'ইমেইল',
  'privacy.name': 'পূর্ণ নাম',
  'privacy.family': 'পরিবার',
  'privacy.role': 'ভূমিকা',
  'privacy.members': 'সদস্য',
  'privacy.data': 'আপনার ডেটা',
  'privacy.export': 'সমস্ত ডেটা রপ্তানি করুন',
  'privacy.exportDesc': 'আপনার সমস্ত টিকাদান রেকর্ড এবং পরিবারের ডেটার একটি কপি ডাউনলোড করুন',
  'privacy.exporting': 'রপ্তানি করা হচ্ছে...',
  'privacy.delete': 'অ্যাকাউন্ট মুছুন',
  'privacy.deleteDesc': 'আপনার অ্যাকাউন্ট এবং সমস্ত সম্পর্কিত ডেটা স্থায়ীভাবে মুছে ফেলুন',
  'privacy.deleteWarning':
    'এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না। আপনার সমস্ত ডেটা স্থায়ীভাবে মুছে ফেলা হবে।',
  'privacy.deleting': 'মুছে ফেলা হচ্ছে...',
  'privacy.password': 'পাসওয়ার্ড পরিবর্তন করুন',
  'privacy.newPassword': 'নতুন পাসওয়ার্ড',
  'privacy.confirmPassword': 'পাসওয়ার্ড নিশ্চিত করুন',
  'privacy.security': 'নিরাপত্তা সেটিংস',
  'privacy.sessions': 'সক্রিয় সেশন',
  'privacy.logoutAll': 'সমস্ত ডিভাইস থেকে লগ আউট করুন',
  'privacy.activity': 'সাম্প্রতিক কার্যকলাপ',
  'privacy.sharing': 'ডেটা শেয়ারিং',
  'privacy.sharingDesc': 'নিয়ন্ত্রণ করুন কে আপনার পরিবারের টিকাদান রেকর্ড অ্যাক্সেস করতে পারে',
  'privacy.confirm': 'নিশ্চিত করুন',
  'privacy.cancel': 'বাতিল',
  'privacy.save': 'সংরক্ষণ করুন',
  'privacy.offline.title': 'অ্যাপের অফলাইন কপি',
  'privacy.offline.body':
    'সার্ভিস ওয়ার্কার টিকাট্র্যাকের নিজস্ব ফাইল — কোড, স্টাইল ও আইকন — সংরক্ষণ রাখে, ফলে ইন্টারনেট ছাড়াই অ্যাপ খোলা যায়। আপনার রেকর্ড এতে রাখা হয় না: সেগুলো থাকে লোকাল স্টোরেজে, যা ওয়ার্কার পড়ে না।',
  'privacy.offline.usage': 'ব্রাউজার স্টোরেজে ব্যবহৃত: {0}',
  'privacy.offline.usageUnknown': 'এই ব্রাউজার স্টোরেজের পরিমাণ জানায় না।',
  'privacy.offline.clear': 'অফলাইন কপি মুছে ফেলুন',
  'privacy.offline.cleared': 'অফলাইন কপি মুছে ফেলা হয়েছে। অনলাইনে থাকলে অ্যাপ আগের মতোই চলবে।',
  'privacy.offline.unavailable': 'এই ব্রাউজারে অ্যাপের কোনো অফলাইন কপি নেই।',
};
