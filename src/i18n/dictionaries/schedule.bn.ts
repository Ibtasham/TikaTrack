/* ---------------------------------------------------------------------------
 * Bangla (বাংলা) strings.
 *
 * Kept in sync with the other language file: `npm run test` fails when a key
 * exists in one language but not the other.
 * ------------------------------------------------------------------------- */
import type { TranslationDictionary } from '../types';

export const bn: TranslationDictionary = {
  'schedule.title': 'টিকাদান সূচি',
  'schedule.subtitle': 'ইন্টারেক্টিভ বয়স-ভিত্তিক টিকাদান সময়রেখা',
  'schedule.enterBirthDate': 'জন্ম তারিখ লিখুন',
  'schedule.calculateAge': 'সূচি গণনা করুন',
  'schedule.currentAge': 'বর্তমান বয়স',
  'schedule.completed': 'সম্পন্ন',
  'schedule.upcoming': 'আসন্ন',
  'schedule.overdue': 'বকেয়া',
  'schedule.notDue': 'এখনো সময় হয়নি',
  'schedule.progress': 'অগ্রগতি',
  'schedule.filter': 'বয়স অনুযায়ী ফিল্টার',
  'schedule.all': 'সব',
  'schedule.newborn': 'নবজাতক',
  'schedule.infant': 'শিশু',
  'schedule.toddler': 'টডলার',
  'schedule.print': 'সূচি প্রিন্ট করুন',
  'schedule.download': 'সূচি ডাউনলোড করুন',
  'schedule.selectMember': 'সংরক্ষিত সদস্যের জন্য দেখুন',
  'schedule.customDob': 'অন্য জন্ম তারিখ',
  'schedule.milestonesReached': 'বয়স অনুযায়ী {1}টির মধ্যে {0}টি ইপিআই ধাপে পৌঁছেছে',
  'schedule.recordNotice':
    'শুধু বয়স অনুযায়ী ধাপ দেখানো হচ্ছে। কোন ডোজ দেওয়া হয়েছে তা সংরক্ষণ করতে পরিবার ট্র্যাকার খুলুন।',
  'schedule.memberDosesRecorded': 'নির্ধারিত {1}টি ডোজের {0}টি যুক্ত হয়েছে',
  'schedule.dueToday': 'আজ প্রাপ্য',
  'schedule.recordDose': 'যুক্ত করুন',
};
