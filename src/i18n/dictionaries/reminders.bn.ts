/* ---------------------------------------------------------------------------
 * Bangla (বাংলা) strings.
 *
 * Kept in sync with the other language file: `npm run test` fails when a key
 * exists in one language but not the other.
 * ------------------------------------------------------------------------- */
import type { TranslationDictionary } from '../types';

export const bn: TranslationDictionary = {
  'reminders.title': 'রিমাইন্ডার',
  'reminders.subtitle': 'প্রতিটি আসন্ন ডোজের জন্য ব্রাউজার নোটিফিকেশন ও ছাপার যোগ্য চেকলিস্ট',
  'reminders.empty.title': 'এখনো কোনো রিমাইন্ডার নেই',
  'reminders.empty.body':
    'প্রতিটি প্রোফাইলের জন্মতারিখ থেকে রিমাইন্ডার তৈরি হয়। আগে একটি প্রোফাইল যোগ করুন।',
  'reminders.permission.title': 'ব্রাউজার নোটিফিকেশন চালু করুন',
  'reminders.permission.body':
    'টিকাট্র্যাক আপনার ব্রাউজারের কাছে অনুমতি চায় — নোটিফিকেশন এই ডিভাইস ছেড়ে যায় না।',
  'reminders.permission.grant': 'নোটিফিকেশন অনুমতি দিন',
  'reminders.permission.granted': 'নোটিফিকেশন চালু আছে',
  'reminders.permission.denied': 'ব্রাউজার সেটিংসে নোটিফিকেশন বন্ধ আছে',
  'reminders.permission.unsupported': 'এই ব্রাউজার নোটিফিকেশন সমর্থন করে না',
  'reminders.settings.title': 'রিমাইন্ডার সেটিংস',
  'reminders.settings.daysBefore': 'নির্ধারিত তারিখের আগে দিন',
  'reminders.settings.onDueDate': 'নির্ধারিত তারিখে জানান',
  'reminders.settings.onOverdue': 'বকেয়া হলে জানান',
  'reminders.settings.quietHours': 'নীরব সময়',
  'reminders.settings.quietFrom': 'শুরু',
  'reminders.settings.quietTo': 'শেষ',
  'reminders.settings.saved': 'রিমাইন্ডার সেটিংস সংরক্ষিত হয়েছে',
  'reminders.group.overdue': 'বকেয়া',
  'reminders.group.dueToday': 'আজ প্রাপ্য',
  'reminders.group.upcoming': 'আসন্ন',
  'reminders.group.done': 'সম্পন্ন',
  'reminders.item.dueIn': '{0} পরে প্রাপ্য',
  'reminders.item.overdueBy': '{0} বকেয়া',
  'reminders.item.dueToday': 'আজ প্রাপ্য',
  'reminders.item.markDone': 'সম্পন্ন হিসেবে চিহ্নিত করুন',
  'reminders.item.dismiss': 'বাতিল করুন',
  'reminders.test.title': 'পরীক্ষামূলক নোটিফিকেশন পাঠান',
  'reminders.stats.total': 'সক্রিয় রিমাইন্ডার',
  'reminders.stats.today': 'আজ প্রাপ্য',
  'reminders.stats.overdue': 'বকেয়া',
  'reminders.print': 'চেকলিস্ট প্রিন্ট করুন',
  'reminders.howItWorks.title': 'রিমাইন্ডার কীভাবে কাজ করে',
  'reminders.howItWorks.body':
    'টিকাট্র্যাক প্রতিটি সদস্যের সূচি থেকে রিমাইন্ডার তৈরি করে এই ব্রাউজারে রাখে। নোটিফিকেশনের অনুমতি দিলে অ্যাপ খোলা থাকার সময় বকেয়া রিমাইন্ডার দেখানো হয় — অ্যাপ বন্ধ থাকলে কিছু নির্ধারিত হয় না।',
  'reminders.permission.hint':
    'নোটিফিকেশন ঐচ্ছিক। অনুমতি না দিলেও এই পেজে বকেয়া রিমাইন্ডার দেখানো হবে।',
  'reminders.refresh': 'রিমাইন্ডার নতুন করে হিসাব করুন',
  'reminders.refreshed': '{0} জন সদস্যের জন্য রিমাইন্ডার নতুন করে হিসাব হয়েছে।',
  'reminders.none.title': 'কিছুই নির্ধারিত নেই',
  'reminders.none.body': 'জন্ম তারিখসহ একজন সদস্য যোগ করুন, রিমাইন্ডার এখানে দেখা যাবে।',
  'reminders.settings.hint': 'পরিবর্তনগুলো এই ব্রাউজারে স্বয়ংক্রিয়ভাবে সংরক্ষিত হয়।',
  'reminders.item.profile': '{0}-এর জন্য',
  'reminders.settings.enable': 'রিমাইন্ডার চালু',
  'reminders.settings.browser': 'ব্রাউজার নোটিফিকেশন',
  'reminders.settings.email': 'ইমেইল নোটিফিকেশন',
  'reminders.settings.emailHint':
    'ইমেইল রিমাইন্ডারের জন্য সার্ভার প্রয়োজন এবং এই বিল্ডে তা উপলব্ধ নয়।',
  'reminders.item.record': 'ডোজ রেকর্ড করুন',
  'reminders.doneHint':
    'রিমাইন্ডারগুলো প্রতিটি সদস্যের সময়সূচি থেকে তৈরি হয় — ট্র্যাকারে ডোজ রেকর্ড করলে সংশ্লিষ্ট রিমাইন্ডার মুছে যায়।',
  'reminders.sent': '{0} টি রিমাইন্ডার নোটিফিকেশন পাঠানো হয়েছে',
  'reminders.calendar.title': 'যেকোনো ক্যালেন্ডার অ্যাপে এই রিমাইন্ডারগুলো যোগ করুন',
  'reminders.calendar.button': 'ক্যালেন্ডারে যোগ করুন',
  'reminders.calendar.none': 'যোগ করার মতো কোনো রিমাইন্ডার নেই',
  'reminders.calendar.done': 'ক্যালেন্ডার ফাইল ডাউনলোড হয়েছে',
  'reminders.calendar.body': '{0}টি রিমাইন্ডার অ্যালার্মসহ যোগ হয়েছে',
  'reminders.filter.member': 'সদস্য অনুযায়ী ফিল্টার',
  'reminders.filter.allMembers': 'পরিবারের সবাই',
};
