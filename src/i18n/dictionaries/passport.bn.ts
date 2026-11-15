/* ---------------------------------------------------------------------------
 * Bangla (বাংলা) strings.
 *
 * Kept in sync with the other language file: `npm run test` fails when a key
 * exists in one language but not the other.
 * ------------------------------------------------------------------------- */
import type { TranslationDictionary } from '../types';

export const bn: TranslationDictionary = {
  'passport.title': 'ডিজিটাল পাসপোর্ট',
  'passport.subtitle':
    'যেকোনো প্রোফাইল থেকে স্বাক্ষরিত, শেয়ারযোগ্য QR সনদ তৈরি করুন — আপনার ডিভাইসেই',
  'passport.empty.title': 'এখনো পাসপোর্ট নেই',
  'passport.empty.body': 'টিকাদান পাসপোর্ট তৈরি করতে পরিবারের একজন সদস্য বেছে নিন।',
  'passport.generate': 'পাসপোর্ট তৈরি করুন',
  'passport.regenerate': 'আবার তৈরি করুন',
  'passport.profile': 'প্রোফাইল',
  'passport.certificate': 'টিকাদান সনদ',
  'passport.id': 'সনদ নম্বর',
  'passport.issued': 'ইস্যুর তারিখ',
  'passport.doses': 'রেকর্ডকৃত ডোজ',
  'passport.scanToVerify': 'যাচাই করতে স্ক্যান করুন',
  'passport.verify.title': 'সনদ যাচাই করুন',
  'passport.verify.placeholder': 'সনদ কোড পেস্ট করুন বা QR স্ক্যান করুন',
  'passport.verify.button': 'যাচাই করুন',
  'passport.verify.valid': 'বৈধ সনদ',
  'passport.verify.invalid': 'এই কোড যাচাই করা যায়নি',
  'passport.verify.tampered': 'স্বাক্ষরের সাথে তথ্য মিলছে না — এটিকে অবৈধ ধরুন',
  'passport.download.svg': 'SVG ডাউনলোড',
  'passport.download.png': 'PNG ডাউনলোড',
  'passport.download.json': 'তথ্য ডাউনলোড (JSON)',
  'passport.print': 'সনদ প্রিন্ট করুন',
  'passport.privacy':
    'সবকিছু আপনার ব্রাউজারেই হয়: QR তথ্য লোকালি স্বাক্ষরিত হয় এবং কিছুই আপলোড হয় না।',
  'passport.saved': '{0}-এর পাসপোর্ট সংরক্ষিত হয়েছে',
  'passport.whatIsThis': 'এই সনদ সম্পর্কে',
  'passport.whatIsThis.body':
    'QR কোডে সদস্যের নাম, জন্ম তারিখ ও সংরক্ষিত ডোজ, সঙ্গে একটি চেকসাম থাকে। এটি এই ডিভাইসেই তৈরি হয় এবং টিকাট্র্যাক চালু থাকা যেকোনো ডিভাইসে যাচাই করা যায় — সার্ভার বা অ্যাকাউন্ট লাগে না।',
  'passport.warning':
    'এটি একটি ব্যক্তিগত রেকর্ড, সরকারি সনদ নয়। ভ্রমণ বা চাকরির যাচাইয়ের জন্য এটি ব্যবহার করা যাবে না।',
  'passport.member': 'সদস্য',
  'passport.dob': 'জন্ম তারিখ',
  'passport.generated': 'তৈরির সময়',
  'passport.noDoses': 'এই সদস্যের এখনো কোনো ডোজ সংরক্ষিত নেই।',
  'passport.verify.help':
    'টিকাট্র্যাক সনদের QR কোডের ভেতরের টেক্সট দিন — এটি পরিবর্তন করা হয়েছে কি না যাচাই হবে।',
  'passport.verify.error.empty': 'আগে একটি সনদের পেলোড দিন।',
  'passport.verify.error.format': 'এটি টিকাট্র্যাক সনদের পেলোড নয়।',
  'passport.verify.doses': '{0} টি সংরক্ষিত ডোজ',
  'passport.generateFailed': 'পাসপোর্ট তৈরি করা যায়নি',
  'passport.error.tooLarge':
    'একটি কিউআর কোডে ধরানোর জন্য অনেক বেশি ডোজ। এর পরিবর্তে ট্র্যাকার প্রিন্ট করুন।',
  'passport.savedWeak': 'পাসপোর্ট সংরক্ষিত — সাধারণ চেকসাম দিয়ে স্বাক্ষরিত (WebCrypto অনুপলব্ধ)',
  'passport.weakAlgorithm':
    'এই ব্রাউজারে WebCrypto অনুপলব্ধ থাকায় সাধারণ চেকসাম দিয়ে স্বাক্ষরিত।',
  'passport.verify.error.invalid': 'এটি কোনো টিকাট্র্যাক পাসপোর্ট কোড নয়।',
  'passport.verify.error.tampered': 'কোডটি ইস্যু হওয়ার পর পরিবর্তন করা হয়েছে — চেকসাম মিলছে না।',
  'passport.verify.error.unsupported-version': 'এই কোডটি টিকাট্র্যাকের নতুন সংস্করণে তৈরি।',
  'passport.scanner.title': 'সনদ স্ক্যান করুন',
  'passport.scanner.body':
    'ক্যামেরা টিকাট্র্যাক কিউআর কোডের দিকে ধরুন, অথবা কোডের একটি ছবি আপলোড করুন। ছবি এই ডিভাইসেই পড়া হয়, কোথাও পাঠানো হয় না।',
  'passport.scanner.videoLabel': 'ক্যামেরার দৃশ্য',
  'passport.scanner.start': 'ক্যামেরা চালু করুন',
  'passport.scanner.stop': 'ক্যামেরা বন্ধ করুন',
  'passport.scanner.upload': 'ছবি আপলোড করুন',
  'passport.scanner.error.unsupported':
    'এই ব্রাউজারে ক্যামেরা ব্যবহার করা যাচ্ছে না — ছবি আপলোড করুন',
  'passport.scanner.error.permission':
    'ক্যামেরার অনুমতি দেওয়া হয়নি — ব্রাউজার সেটিংস থেকে অনুমতি দিন',
  'passport.scanner.error.noCamera': 'ক্যামেরা পাওয়া যায়নি, অথবা অন্য কোনো অ্যাপ ব্যবহার করছে',
  'passport.scanner.error.insecure': 'ক্যামেরা ব্যবহার করতে HTTPS প্রয়োজন — ছবি আপলোড করুন',
  'passport.scanner.error.decode': 'ছবিটিতে কোনো টিকাট্র্যাক কোড পাওয়া যায়নি',
  'passport.scanner.error.unknown': 'ক্যামেরা চালু করা যায়নি',
  'passport.share.button': 'সনদ শেয়ার করুন',
  'passport.share.pngFailed': 'সনদের ছবি তৈরি করা যায়নি',
  'passport.truncated.title': 'কিছু ডোজ কিউআর কোডে ধরেনি',
  'passport.truncated.body':
    'সংরক্ষিত {1}টি ডোজের মধ্যে {0}টি কোডে যুক্ত হয়নি। প্রিন্ট করা কার্ড ও JSON ব্যাকআপে পুরো ইতিহাস আছে।',
  'passport.dose.number': 'ডোজ {0}',
  'passport.dose.unnumbered': 'ডোজ নম্বর লেখা নেই',
  'passport.stale.title': 'ইস্যুর পর রেকর্ড পরিবর্তিত হয়েছে',
  'passport.stale.body':
    'এই QR সনদ তৈরির পর লোকাল ডোজ রেকর্ডে পরিবর্তন হয়েছে। QR মেলাতে আবার তৈরি করুন।',
  'passport.familyStatus': 'পরিবারের পাসপোর্ট',
  'passport.status.issued': 'তৈরি হয়েছে',
  'passport.status.missing': 'তৈরি হয়নি',
  'passport.status.outdated': 'হালনাগাদ প্রয়োজন',
};
