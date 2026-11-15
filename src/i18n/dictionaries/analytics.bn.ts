/* ---------------------------------------------------------------------------
 * Bangla (বাংলা) strings.
 *
 * Kept in sync with the other language file: `npm run test` fails when a key
 * exists in one language but not the other.
 * ------------------------------------------------------------------------- */
import type { TranslationDictionary } from '../types';

export const bn: TranslationDictionary = {
  'analytics.title': 'বিশ্লেষণ',
  'analytics.subtitle': 'জাতীয় সূচির তুলনায় আপনার পরিবারের অগ্রগতি',
  'analytics.empty.title': 'বিশ্লেষণের জন্য এখনো তথ্য নেই',
  'analytics.empty.body':
    'পরিবারের সদস্য যোগ করুন এবং কয়েকটি ডোজ রেকর্ড করুন — চার্ট এখানে স্বয়ংক্রিয়ভাবে দেখা যাবে।',
  'analytics.empty.cta': 'ট্র্যাকার খুলুন',
  'analytics.stats.overall': 'সার্বিক সম্পূর্ণতা',
  'analytics.stats.completed': 'রেকর্ডকৃত ডোজ',
  'analytics.stats.due': '৩০ দিনের মধ্যে প্রাপ্য',
  'analytics.stats.overdue': 'বকেয়া',
  'analytics.stats.profiles': 'পরিবারের সদস্য',
  'analytics.chart.statusTitle': 'অবস্থা অনুযায়ী ডোজ',
  'analytics.chart.completionTitle': 'সদস্য অনুযায়ী সম্পূর্ণতা',
  'analytics.chart.timelineTitle': 'মাস অনুযায়ী রেকর্ডকৃত ডোজ',
  'analytics.chart.categoryTitle': 'টিকার ধরন অনুযায়ী কভারেজ',
  'analytics.legend.completed': 'সম্পন্ন',
  'analytics.legend.upcoming': 'আসন্ন',
  'analytics.legend.overdue': 'বকেয়া',
  'analytics.legend.dueToday': 'আজ প্রাপ্য',
  'analytics.table.member': 'সদস্য',
  'analytics.table.progress': 'অগ্রগতি',
  'analytics.table.next': 'পরবর্তী ডোজ',
  'analytics.table.status': 'অবস্থা',
  'analytics.range.6m': 'গত ৬ মাস',
  'analytics.range.12m': 'গত ১২ মাস',
  'analytics.range.all': 'সর্বকাল',
  'analytics.insight.onTrack': '{0} জাতীয় সূচি অনুযায়ী পুরোপুরি সঠিক পথে আছে।',
  'analytics.insight.overdue': '{0}-এর {1} টি ডোজ বকেয়া আছে। ক্যাচ-আপ ভিজিট বুক করুন।',
  'analytics.insight.upcoming': '{0}-এর পরবর্তী ডোজ {1} তারিখে।',
  'analytics.print.title': 'রিপোর্ট প্রিন্ট করুন',
  'analytics.export.title': 'এই হিসাব সঙ্গে নিন',
  'analytics.export.csv': 'CSV ডাউনলোড',
  'analytics.member.all': 'সব সদস্য',
  'analytics.coverage': 'টিকার ধরন অনুযায়ী কভারেজ',
  'analytics.noChartData': 'এখনো ছবি আঁকার মতো ডোজ সংরক্ষিত হয়নি।',
  'analytics.ageGroup': 'বয়সগ্রুপ অনুযায়ী',
  'analytics.recentActivity': 'সাম্প্রতিক কার্যক্রম',
  'analytics.lastDose': 'সর্বশেষ সংরক্ষিত ডোজ',
  'analytics.nextMilestone': 'পরবর্তী ধাপ',
  'analytics.days': '{0} দিন',
};
