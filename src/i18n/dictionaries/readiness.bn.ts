/* ---------------------------------------------------------------------------
 * Bangla (বাংলা) strings for Readiness Advisor & Global Command Palette.
 *
 * Kept in sync with `readiness.en.ts`.
 * ------------------------------------------------------------------------- */
import type { TranslationDictionary } from '../types';

export const bn: TranslationDictionary = {
  'readiness.eyebrow': 'ভ্রমণ, গর্ভাবস্থা ও বিশেষ পরিস্থিতি পরিকল্পনা',
  'readiness.title': 'টিকা প্রস্তুতি পরামর্শক',
  'readiness.subtitle':
    'হজ/ওমরাহ, বিদেশে উচ্চশিক্ষা, গর্ভাবস্থা, পেশাগত ঝুঁকি বা প্রবীণ সুরক্ষার জন্য আপনার পরিবারের সংরক্ষিত রেকর্ডের সাথে মিলিয়ে ব্যক্তিগত টিকা প্রস্তুতি তালিকা তৈরি করুন।',
  'readiness.stepScenarios': '১. পরিস্থিতি নির্বাচন করুন (একাধিক নির্বাচন করা যাবে)',
  'readiness.stepContext': '২. পরিবারের সদস্য ও লক্ষ্য তারিখ অনুযায়ী মিলিয়ে দেখুন',
  'readiness.memberLabel': 'পরিবারের সদস্যের রেকর্ড যাচাই',
  'readiness.memberGuest': 'সাধারণ তালিকা (কোনো সদস্য নির্বাচিত নয়)',
  'readiness.targetDateLabel': 'যাত্রা / প্রসব / লক্ষ্য তারিখ',
  'readiness.targetDateHint': '৭–৪২ দিন আগে নেওয়ার নিয়ম থাকলে সর্বশেষ ক্লিনিক ভিজিটের তারিখ হিসাব করে দেয়।',
  'readiness.summaryTotal': 'মোট পরামর্শ',
  'readiness.summaryRecorded': 'ডিভাইসে সংরক্ষিত',
  'readiness.summaryNeeded': 'নেওয়া প্রয়োজন',
  'readiness.clinicGuidance': 'ক্লিনিক ও সনদ নির্দেশনা',
  'readiness.priority.mandatory': 'বাধ্যতামূলক / মূল নিয়ম',
  'readiness.priority.essential': 'অত্যন্ত জরুরি অগ্রাধিকার',
  'readiness.priority.recommended': 'বিশেষভাবে সুপারিশকৃত',
  'readiness.priority.situational': 'পরিস্থিতি সাপেক্ষ',
  'readiness.status.recorded': 'সংরক্ষিত ({0} ডোজ)',
  'readiness.status.equivalent': 'সমতুল্য টিকা সংরক্ষিত ({0})',
  'readiness.status.unconfirmedNote': 'অনিশ্চিত ডোজ রেকর্ড রয়েছে — কাগজের কার্ডের সাথে মিলিয়ে দেখুন',
  'readiness.status.needed': 'এখনো রেকর্ড হয়নি',
  'readiness.deadlineLabel': 'টিকা নেওয়ার সর্বশেষ পরামর্শিত তারিখ',
  'readiness.tightWindowAlert':
    'লক্ষ্য তারিখ খুবই কাছে — দ্রুত সময়সূচি বা পরামর্শের জন্য অনুমোদিত ক্লিনিক বা চিকিৎসকের সাথে যোগাযোগ করুন।',
  'readiness.routeSiteLabel': 'প্রয়োগ পদ্ধতি ও কোল্ড-চেইন',
  'readiness.actions.viewMonograph': 'পূর্ণ ক্লিনিকাল তথ্য',
  'readiness.actions.logInTracker': 'ট্র্যাকারে লিখুন',
  'readiness.actions.findCentres': 'যাচাইকৃত কেন্দ্র দেখুন',
  'readiness.actions.print': 'তালিকা প্রিন্ট করুন',
  'readiness.actions.download': 'টেক্সট ফাইল ডাউনলোড',
  'readiness.emptySelection': 'প্রস্তুতি তালিকা দেখতে উপরে অন্তত একটি পরিস্থিতি নির্বাচন করুন।',
  'readiness.disclaimer':
    'এই প্রস্তুতি পরামর্শ কেবল প্রাথমিক পরিকল্পনার জন্য; আনুষ্ঠানিক ভিসা/সীমান্ত নিয়ম বা চিকিৎসকের পরামর্শের বিকল্প নয়। জাতীয় স্বাস্থ্য তথ্যের জন্য ১৬২৬৩ নম্বরে কল করুন।',

  // Command Palette (⌘K)
  'cmd.placeholder': '৯০টি টিকা, ৬৪ জেলার ১৭৫টি কেন্দ্র, বয়সের ধাপ বা টুলস খুঁজুন…',
  'cmd.triggerLabel': 'খুঁজুন…',
  'cmd.shortcutHint': 'Ctrl/⌘ K',
  'cmd.empty': 'মিলছে এমন কোনো টিকা, কেন্দ্র বা পেজ পাওয়া যায়নি।',
  'cmd.group.tools': 'পেজ ও ইন্টারঅ্যাক্টিভ টুলস',
  'cmd.group.vaccines': 'টিকা (পূর্ণ ক্লিনিকাল তথ্য)',
  'cmd.group.centres': 'যাচাইকৃত কেন্দ্র (৬৪ জেলা)',
  'cmd.group.stages': 'সকল বয়সের সূচি ধাপ',
  'cmd.footerHint': '↑↓ নির্বাচন · Enter খুলুন · Esc বন্ধ',
};
