/* ---------------------------------------------------------------------------
 * Bangla (বাংলা) strings.
 *
 * Kept in sync with the other language file: `npm run test` fails when a key
 * exists in one language but not the other.
 * ------------------------------------------------------------------------- */
import type { TranslationDictionary } from '../types';

export const bn: TranslationDictionary = {
  'scheduler.title': 'স্মার্ট টিকাদান শিডিউলার',
  'scheduler.subtitle': 'বুদ্ধিমান ব্যক্তিগত টিকাদান শিডিউলিং',
  'scheduler.selectProfile': 'প্রোফাইল নির্বাচন করুন',
  'scheduler.currentAge': 'বর্তমান বয়স',
  'scheduler.progress': 'অগ্রগতি',
  'scheduler.completed': 'সম্পন্ন',
  'scheduler.upcoming': 'আসন্ন',
  'scheduler.overdue': 'বকেয়া',
  'scheduler.dueToday': 'আজ',
  'scheduler.daysUntil': 'দিন বাকি',
  'scheduler.daysOverdue': 'দিন বকেয়া',
  'scheduler.filterAge': 'বয়স অনুযায়ী ফিল্টার',
  'scheduler.filterStatus': 'স্ট্যাটাস অনুযায়ী ফিল্টার',
  'scheduler.search': 'টিকা অনুসন্ধান করুন...',
  'scheduler.all': 'সব',
  'scheduler.newborn': 'নবজাতক (০-২৮ দিন)',
  'scheduler.infant': 'শিশু (২৯ দিন - ১২ মাস)',
  'scheduler.toddler': 'টডলার (১-৫ বছর)',
  'scheduler.child': 'শিশু (৫-১০ বছর)',
  'scheduler.adolescent': 'কিশোর (১০-১৮ বছর)',
  'scheduler.adult': 'প্রাপ্তবয়স্ক (১৮+ বছর)',
  'scheduler.print': 'সূচি প্রিন্ট করুন',
  'scheduler.download': 'PDF ডাউনলোড করুন',
  'scheduler.why': 'কেন এই টিকা?',
  'scheduler.recommended': 'সুপারিশকৃত',
  'scheduler.dose': 'ডোজ',
  'scheduler.source': 'উৎস',
  'scheduler.verified': 'সর্বশেষ যাচাইকৃত',
  'scheduler.today': 'আজ',
};
