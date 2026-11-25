/* ---------------------------------------------------------------------------
 * Bangla (বাংলা) strings.
 *
 * Kept in sync with the other language file: `npm run test` fails when a key
 * exists in one language but not the other.
 * ------------------------------------------------------------------------- */
import type { TranslationDictionary } from '../types';

export const bn: TranslationDictionary = {
  'dashboard.title': 'স্মার্ট টিকাদান ড্যাশবোর্ড',
  'dashboard.subtitle': 'বুদ্ধিমান ব্যক্তিগত টিকাদান শিডিউলিং',
  'dashboard.upcomingVaccinations': 'আসন্ন টিকাদান',
  'dashboard.overdueVaccinations': 'বকেয়া টিকাদান',
  'dashboard.timeline': 'পরিবারের টাইমলাইন',
  'dashboard.progress': 'টিকাদান অগ্রগতি',
  'dashboard.noUpcoming': 'কোনো আসন্ন টিকাদান নেই',
  'dashboard.noOverdue': 'কোনো বকেয়া টিকাদান নেই',
  'dashboard.daysUntil': 'দিন বাকি',
  'dashboard.daysOverdue': 'দিন বকেয়া',
  'dashboard.today': 'আজ',
  'dashboard.viewDetails': 'বিস্তারিত দেখুন',
  'dashboard.month': 'মাস',
  'dashboard.year': 'বছর',
  'dashboard.all': 'সব',
  'dashboard.completed': 'সম্পন্ন',
  'dashboard.upcoming': 'আসন্ন',
  'dashboard.overdue': 'বকেয়া',
  'dashboard.overview': 'সারসংক্ষেপ',
  'dashboard.reminders': 'রিমাইন্ডার',
  'dashboard.catchup': 'ক্যাচ-আপ',

  // Antigen Protection Matrix
  'protection.eyebrow': 'রোগ প্রতিরোধ সুরক্ষা',
  'protection.title': 'রোগভিত্তিক টিকা সুরক্ষা বিশ্লেষণ',
  'protection.subtitle':
    'নিশ্চিত ও অস্থায়ী লেজার ডোজের ভিত্তিতে প্রতিটি টিকা-প্রতিরোধযোগ্য রোগের বর্তমান সুরক্ষা অবস্থা।',
  'protection.summaryProtected': '{0}টি সম্পন্ন',
  'protection.summaryAttention': '{0}টিতে মনোযোগ প্রয়োজন',
  'protection.status.protected': 'সুরক্ষিত',
  'protection.status.partial': 'চলমান',
  'protection.status.attention': 'প্রাপ্য / বকেয়া',
  'protection.status.provisional': 'অনিশ্চিত ডোজ #',
  'protection.status.upcoming': 'ভবিষ্যৎ সূচি',
  'protection.status.optional': 'ঐচ্ছিক / বিশেষ',
  'protection.confirmedCount': '{0}টি নিশ্চিত',
  'protection.provisionalCount': '{0}টি অস্থায়ী',
  'protection.dueCount': '{0}টি প্রাপ্য',
  'protection.eligibleFraction': 'প্রাপ্য {1}টির {0}টি',
  'protection.nextAction': 'লিখুন',
  'protection.learnMore': 'তথ্য',

  // Clinic Visit Planner
  'visitPlan.eyebrow': 'কেন্দ্র ভিজিট পরিকল্পনা',
  'visitPlan.title': 'আসন্ন টিকাদান কেন্দ্র ভিজিট প্ল্যানার',
  'visitPlan.subtitle':
    'নির্বাচিত সময়ের প্রাপ্য ডোজগুলো একত্রে সাজায় ও যাওয়ার আগের প্রস্তুতি তালিকা দেখায়।',
  'visitPlan.window14': '১৪ দিন',
  'visitPlan.window30': '৩০ দিন',
  'visitPlan.window60': '৬০ দিন',
  'visitPlan.priorityHeading': 'অগ্রাধিকার / এখনই প্রাপ্য',
  'visitPlan.upcomingHeading': 'এই সময়ে নির্ধারিত',
  'visitPlan.empty': 'নির্বাচিত সময়ের মধ্যে কোনো প্রাপ্য বা আসন্ন ইপিআই ডোজ নেই।',
  'visitPlan.checklistHeading': 'কেন্দ্রে যাওয়ার আগের প্রস্তুতি তালিকা',
  'visitPlan.checklistProgress': '{1}টির {0}টি প্রস্তুত',
  'visitPlan.downloadBrief': 'ভিজিট সারসংক্ষেপ নামান',
  'visitPlan.briefDownloaded': 'কেন্দ্র ভিজিট সারসংক্ষেপ ডাউনলোড হয়েছে',
  'visitPlan.findCentres': 'নিকটস্থ কেন্দ্র দেখুন',
  'visitPlan.hcwWarning':
    'বকেয়া বা অস্থায়ী রেকর্ড রয়েছে — সেশনে স্বাস্থ্যকর্মীর সাথে ব্যবধান যাচাই করুন।',
  'visitPlan.recordNow': 'লিখুন',
};
