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
};
