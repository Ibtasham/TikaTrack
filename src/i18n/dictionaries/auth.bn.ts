/* ---------------------------------------------------------------------------
 * Bangla (বাংলা) strings.
 *
 * Kept in sync with the other language file: `npm run test` fails when a key
 * exists in one language but not the other.
 * ------------------------------------------------------------------------- */
import type { TranslationDictionary } from '../types';

export const bn: TranslationDictionary = {
  'auth.login.title': 'স্বাগতম',
  'auth.login.subtitle': 'আপনার পরিবারের টিকাদান ট্র্যাক করা চালিয়ে যেতে সাইন ইন করুন',
  'auth.signup.title': 'অ্যাকাউন্ট তৈরি করুন',
  'auth.signup.subtitle': 'আপনার পরিবারকে সুরক্ষিত রাখতে টিকাট্র্যাকে যোগ দিন',
  'auth.reset.title': 'পাসওয়ার্ড রিসেট করুন',
  'auth.reset.subtitle': 'পাসওয়ার্ড রিসেট লিঙ্ক পেতে আপনার ইমেইল লিখুন',
  'auth.email': 'ইমেইল ঠিকানা',
  'auth.password': 'পাসওয়ার্ড',
  'auth.confirmPassword': 'পাসওয়ার্ড নিশ্চিত করুন',
  'auth.fullName': 'পূর্ণ নাম',
  'auth.submit.login': 'সাইন ইন',
  'auth.submit.signup': 'অ্যাকাউন্ট তৈরি করুন',
  'auth.submit.reset': 'রিসেট লিঙ্ক পাঠান',
  'auth.switch.signup': 'অ্যাকাউন্ট নেই? সাইন আপ করুন',
  'auth.switch.login': 'ইতিমধ্যে অ্যাকাউন্ট আছে? সাইন ইন করুন',
  'auth.switch.reset': 'পাসওয়ার্ড ভুলে গেছেন? রিসেট করুন',
  'auth.switch.back': 'সাইন ইনে ফিরে যান',
  'auth.error.invalid': 'ভুল ইমেইল বা পাসওয়ার্ড',
  'auth.error.exists': 'ইমেইল ইতিমধ্যে নিবন্ধিত',
  'auth.error.mismatch': 'পাসওয়ার্ড মিলছে না',
  'auth.error.weak': 'পাসওয়ার্ড খুব দুর্বল',
  'auth.success.reset': 'পাসওয়ার্ড রিসেট লিঙ্ক আপনার ইমেইলে পাঠানো হয়েছে',
  'auth.success.signup': 'অ্যাকাউন্ট তৈরি হয়েছে! যাচাই করতে আপনার ইমেইল চেক করুন',
  'auth.privacy': 'আপনার ডেটা এনক্রিপ্টেড এবং নিরাপদ',
  'auth.optional.title': 'ঐচ্ছিক অ্যাকাউন্ট',
  'auth.optional.body':
    'অ্যাকাউন্ট ছাড়াই টিকাট্র্যাক পুরোপুরি কাজ করে — সবকিছু এই ব্রাউজারে থাকে। একই তথ্য কয়েকটি ডিভাইসে রাখতে চাইলে তবেই অ্যাকাউন্ট খুলুন।',
  'auth.localMode': 'লোকাল মোড — তথ্য এই ডিভাইসেই থাকে',
  'auth.cloudMode': 'ক্লাউড সিঙ্ক — {0}-এর সঙ্গে যুক্ত',
  'auth.cloudNotConfigured':
    'এই ডিপ্লয়মেন্টে ক্লাউড সিঙ্ক কনফিগার করা নেই। চালু করতে VITE_SUPABASE_URL ও VITE_SUPABASE_ANON_KEY সেট করুন।',
  'auth.signedInAs': '{0} হিসেবে সাইন ইন করা',
  'auth.localAccountNotice':
    'এটি একটি লোকাল অ্যাকাউন্ট। আপনার পাসওয়ার্ড এই ব্রাউজারে হ্যাশ করা থাকে এবং কোথাও পাঠানো হয় না — অর্থাৎ ভুলে গেলে ফেরানোর উপায় নেই। একটি ব্যাকআপ রাখুন।',
  'auth.passwordStrength': 'পাসওয়ার্ডের শক্তি',
  'auth.strength.weak': 'দুর্বল',
  'auth.strength.fair': 'মোটামুটি',
  'auth.strength.good': 'ভালো',
  'auth.strength.strong': 'শক্তিশালী',
  'auth.family.title': 'পরিবার শেয়ারিং',
  'auth.family.body':
    'পরিবার শেয়ারিংয়ের জন্য ক্লাউড সিঙ্ক দরকার। Supabase কনফিগার করে একটি পরিবার তৈরি করুন ও সদস্যদের আমন্ত্রণ জানান।',
  'auth.family.create': 'পরিবার তৈরি করুন',
  'auth.family.name': 'পরিবারের নাম',
  'auth.family.members': 'সদস্যরা',
  'auth.family.invite': 'ইমেইলে আমন্ত্রণ',
  'auth.family.role.owner': 'মালিক',
  'auth.family.role.parent': 'অভিভাবক',
  'auth.family.role.caregiver': 'যত্নকারী',
  'auth.family.role.viewer': 'দর্শক',
  'auth.signedOut': 'আপনি সাইন আউট করেছেন।',
  'auth.error.required': 'অনুগ্রহ করে সব ঘর পূরণ করুন।',
  'auth.family.you': 'আপনি',
  'auth.hidePassword': 'পাসওয়ার্ড লুকান',
  'auth.showPassword': 'পাসওয়ার্ড দেখান',
  'auth.passwordChanged': 'পাসওয়ার্ড হালনাগাদ হয়েছে',
};
