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
  'passport.download.passportPdf': 'টিকাদান পাসপোর্ট ডাউনলোড (PDF)',
  'passport.download.cardPng': 'কার্ডের ছবি ডাউনলোড (PNG)',
  'passport.download.pdfDone': 'টিকাদান পাসপোর্ট PDF ডাউনলোড হয়েছে',
  'passport.download.cardDone': 'টিকাদান পাসপোর্ট কার্ডের ছবি ডাউনলোড হয়েছে',
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
  'passport.card.historyTitle': 'টিকাদানের ইতিহাস',
  'passport.card.colVaccine': 'টিকা',
  'passport.card.colDose': 'ডোজ',
  'passport.card.colDate': 'প্রদানের তারিখ',
  'passport.card.colCentre': 'কেন্দ্র / ব্যাচ',
  'passport.card.coverage': 'সূচির অগ্রগতি',
  'passport.mode.label': 'স্বাক্ষর পদ্ধতি',
  'passport.mode.deviceHmac': 'এই ডিভাইস (HMAC · সর্বোচ্চ ডোজ)',
  'passport.mode.portableEcdsa': 'সব ডিভাইসে যাচাইযোগ্য (ECDSA P-256)',
  'passport.verify.algorithmEcdsa': 'ECDSA P-256 স্বাক্ষরযুক্ত — যেকোনো ডিভাইসে অফলাইনে যাচাইযোগ্য',
  'passport.biometric.title': 'বায়োমেট্রিক পাসপোর্ট লক',
  'passport.biometric.subtitle':
    'Face ID, Touch ID বা ফিঙ্গারপ্রিন্ট দিয়ে এই ফোনে আপনার QR সনদ সুরক্ষিত রাখুন।',
  'passport.biometric.status.protected': 'সুরক্ষিত · আনলক করা',
  'passport.biometric.status.locked': 'লক করা',
  'passport.biometric.status.off': 'চালু নেই',
  'passport.biometric.supportedReady': 'এই ডিভাইসে বায়োমেট্রিক পাসকি সমর্থিত',
  'passport.biometric.unsupportedPin':
    'হার্ডওয়্যার বায়োমেট্রিক নেই — এর বদলে ৬ সংখ্যার ডিভাইস পিন সেট করুন',
  'passport.biometric.insecureContext':
    'বায়োমেট্রিক পাসকির জন্য HTTPS প্রয়োজন — লাইভ সাইটে এটি কাজ করবে',
  'passport.biometric.deviceLabel': 'ডিভাইসের নাম',
  'passport.biometric.devicePlaceholder': 'যেমন: আমার ফোন',
  'passport.biometric.backupPinLabel': 'ঐচ্ছিক ৬ সংখ্যার ব্যাকআপ পিন',
  'passport.biometric.backupPinPlaceholder': '৬ সংখ্যা (ঐচ্ছিক বিকল্প)',
  'passport.biometric.pinOnlyLabel': '৬ সংখ্যার ভল্ট পিন',
  'passport.biometric.pinHint':
    'ব্রাউজারেই সল্টেড PBKDF2-SHA256 দিয়ে হ্যাশ করা হয়; কখনো সাধারণ টেক্সটে রাখা হয় না।',
  'passport.biometric.enablePasskey': 'বায়োমেট্রিক লক চালু করুন',
  'passport.biometric.enablePinOnly': '৬ সংখ্যার পিন লক চালু করুন',
  'passport.biometric.lockNow': 'পাসপোর্ট লক করুন',
  'passport.biometric.testVerify': 'পুনরায় যাচাই করুন',
  'passport.biometric.disable': 'লক সরান',
  'passport.biometric.autoLockLabel': 'স্বয়ংক্রিয় লক সময়',
  'passport.biometric.autoLock.immediate': 'ট্যাব বা অ্যাপ ছাড়লেই',
  'passport.biometric.autoLock.5m': '৫ মিনিট পর',
  'passport.biometric.autoLock.15m': '১৫ মিনিট পর',
  'passport.biometric.autoLock.manual': 'লক না করা পর্যন্ত',
  'passport.biometric.gateTitle': 'পাসপোর্ট ভল্ট লক করা',
  'passport.biometric.gateBody':
    'পরিবারের QR সনদ, ডোজের ইতিহাস এবং ডাউনলোড দেখতে এই ডিভাইসের বায়োমেট্রিক দিয়ে যাচাই করুন।',
  'passport.biometric.gateUnlock': 'Face ID / ফিঙ্গারপ্রিন্ট দিয়ে আনলক করুন',
  'passport.biometric.gateUsePin': '৬ সংখ্যার পিন দিয়ে আনলক করুন',
  'passport.biometric.gatePinPlaceholder': '৬ সংখ্যার পিন লিখুন',
  'passport.biometric.gatePinSubmit': 'পাসপোর্ট আনলক করুন',
  'passport.biometric.gateReset': 'লক রিসেট ও QR ক্যাশ মুছুন',
  'passport.biometric.resetTitle': 'বায়োমেট্রিক পাসপোর্ট লক রিসেট করবেন?',
  'passport.biometric.resetBody':
    'যাচাই ছাড়া রিসেট করলে এই লক সরে যাবে এবং স্বাস্থ্যতথ্য সুরক্ষিত রাখতে ইস্যু করা QR সনদগুলো এই ডিভাইস থেকে মুছে যাবে। আপনার ট্র্যাকার প্রোফাইল অক্ষত থাকবে।',
  'passport.biometric.resetConfirm': 'রিসেট ও QR মুছুন',
  'passport.biometric.disableTitle': 'বায়োমেট্রিক পাসপোর্ট লক সরাবেন?',
  'passport.biometric.disableBody':
    'আবার চালু না করা পর্যন্ত Face ID, ফিঙ্গারপ্রিন্ট বা পিন ছাড়াই আপনার QR সনদ দেখা যাবে।',
  'passport.biometric.disableConfirm': 'লক সরান',
  'passport.biometric.enrolledToast': 'বায়োমেট্রিক পাসপোর্ট লক চালু হয়েছে',
  'passport.biometric.unlockedToast': 'পাসপোর্ট ভল্ট আনলক হয়েছে',
  'passport.biometric.lockedToast': 'পাসপোর্ট ভল্ট লক হয়েছে',
  'passport.biometric.removedToast': 'বায়োমেট্রিক পাসপোর্ট লক সরানো হয়েছে',
  'passport.biometric.error.cancelled': 'বায়োমেট্রিক যাচাই বাতিল বা সময় শেষ হয়েছে — আবার চেষ্টা করুন',
  'passport.biometric.error.unsupported': 'এই ব্রাউজারে প্ল্যাটফর্ম বায়োমেট্রিক সমর্থিত নয়',
  'passport.biometric.error.insecure': 'WebAuthn পাসকির জন্য HTTPS প্রয়োজন',
  'passport.biometric.error.verificationFailed':
    'বায়োমেট্রিক স্বাক্ষর যাচাই ব্যর্থ হয়েছে — আবার চেষ্টা করুন',
  'passport.biometric.error.invalidPin': 'সঠিক ৬ সংখ্যার পিন দিন',
  'passport.biometric.error.pinMismatch': 'ভুল ৬ সংখ্যার পিন',
  'passport.biometric.error.cooldown': 'অনেকবার ভুল পিন — {0} সেকেন্ড অপেক্ষা করুন',
  'passport.biometric.error.generic': 'বায়োমেট্রিক যাচাই সম্পন্ন করা যায়নি',
  'passport.biometric.error.iframeBlocked':
    'এই এম্বেডেড ফ্রেমে বায়োমেট্রিক অনুমোদিত নয় — আলাদা ব্রাউজার ট্যাবে খুলুন অথবা ৬ সংখ্যার ভল্ট পিন ব্যবহার করুন।',
  'passport.biometric.lockedBanner':
    'সনদ তৈরি বা দেখতে আগে পাসপোর্ট ভল্ট আনলক করুন।',
  'passport.biometric.lastVerified': 'সর্বশেষ যাচাই: {0}',
};
