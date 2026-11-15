/* ---------------------------------------------------------------------------
 * Bangla (বাংলা) strings.
 *
 * Kept in sync with the other language file: `npm run test` fails when a key
 * exists in one language but not the other.
 * ------------------------------------------------------------------------- */
import type { TranslationDictionary } from '../types';

export const bn: TranslationDictionary = {
  'tikabot.title': 'টিকাবট সহকারী',
  'tikabot.subtitle': 'টিকা ও টিকাদান সম্পর্কে প্রশ্ন করুন',
  'tikabot.placeholder': 'আপনার প্রশ্ন লিখুন...',
  'tikabot.disclaimer':
    'টিকাবট শুধুমাত্র সাধারণ তথ্য প্রদান করে। চিকিৎসা পরামর্শের জন্য স্বাস্থ্যসেবা প্রদানকারীর সাথে পরামর্শ করুন।',
  'tikabot.greeting':
    'আসসালামু আলাইকুম! আমি টিকাবট। টিকার সূচি, পার্শ্বপ্রতিক্রিয়া, বকেয়া ডোজ বা কোথায় টিকা নেবেন — যা খুশি জিজ্ঞাসা করুন।',
  'tikabot.suggestions': 'এগুলো জিজ্ঞাসা করে দেখুন',
  'tikabot.thinking': 'টিকাবট খুঁজে দেখছে…',
  'tikabot.fallback':
    'আমার কাছে থাকা বাংলাদেশের টিকাদান নির্দেশিকায় এটি খুঁজে পাইনি। অন্যভাবে জিজ্ঞাসা করুন, অথবা নির্দিষ্ট টিকা, ডোজের ব্যবধান বা পার্শ্বপ্রতিক্রিয়া সম্পর্কে জানতে চান।',
  'tikabot.confidence': 'নির্ভুলতা',
  'tikabot.relatedQuestions': 'এগুলোও জিজ্ঞাসা করতে পারেন',
  'tikabot.send': 'পাঠান',
  'tikabot.inputPlaceholder': 'ইংরেজি বা বাংলায় প্রশ্ন লিখুন…',
  'tikabot.clear': 'নতুন কথোপকথন শুরু করুন',
  'tikabot.history': 'এই কথোপকথনের আগের অংশ',
  'tikabot.offline':
    'টিকাবট সম্পূর্ণভাবে আপনার ব্রাউজারে, সংরক্ষিত নলেজ বেস থেকে চলে। কোনো প্রশ্ন সার্ভারে পাঠানো হয় না।',
  'tikabot.context.about': 'যার সম্পর্কে উত্তর',
  'tikabot.context.everyone': 'সাধারণ প্রশ্ন',
  'tikabot.context.hint':
    'পরিবারের সদস্য বেছে নিলে টিকাবট আপনার সংরক্ষিত রেকর্ডের তথ্যও যোগ করে দেবে।',
  'tikabot.context.title': 'এই ডিভাইসে সংরক্ষিত আপনার রেকর্ড থেকে',
  'tikabot.context.source': 'আপনার সংরক্ষিত তথ্য থেকে হিসাব করা — নিচে দেওয়া উৎস থেকে নয়।',
  'tikabot.copyAnswer': 'উত্তর কপি করুন',
  'tikabot.copied': 'কপি হয়েছে',
  'tikabot.topics.label': 'বিষয় অনুযায়ী প্রশ্ন',
  'tikabot.topics.epi': 'ইপিআই সূচি',
  'tikabot.topics.epiQuery': 'শিশুদের জন্য বাংলাদেশের ইপিআই টিকাদান সূচি কী?',
  'tikabot.topics.effects': 'পার্শ্বপ্রতিক্রিয়া ও জ্বর',
  'tikabot.topics.effectsQuery':
    'টিকা দেওয়ার পর কোন পার্শ্বপ্রতিক্রিয়া স্বাভাবিক এবং কখন ডাক্তার দেখাতে হবে?',
  'tikabot.topics.missed': 'বাদ পড়া ডোজ',
  'tikabot.topics.missedQuery': 'কোনো টিকার ডোজ বাদ পড়লে বা দেরি হলে কী করণীয়?',
  'tikabot.topics.tt': 'গর্ভাবস্থা ও টিটি',
  'tikabot.topics.ttQuery': 'নারীদের ও গর্ভাবস্থায় টিটি টিকা কখন দেওয়া হয়?',
  'tikabot.topics.travel': 'ভ্রমণ ও প্রাপ্তবয়স্ক',
  'tikabot.topics.travelQuery': 'হজ, ওমরাহ বা বিদেশ ভ্রমণের জন্য কোন টিকা লাগে?',
};
