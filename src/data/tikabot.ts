export type Language = 'en' | 'bn';

export interface FAQEntry {
  id: string;
  question: { en: string; bn: string };
  answer: { en: string; bn: string };
  category: 'schedule' | 'safety' | 'side-effects' | 'missed-dose' | 'urgent' | 'general';
  priority: 'high' | 'medium' | 'low';
  sources?: string[];
  relatedQuestions?: string[];
}

export const faqDatabase: FAQEntry[] = [
  {
    id: 'schedule-basic',
    question: { en: 'What vaccines does my child need?', bn: 'আমার সন্তানের কোন টিকাগুলো প্রয়োজন?' },
    answer: {
      en: 'Bangladesh follows the national EPI schedule. Key vaccines include BCG at birth, Pentavalent at 6/10/14 weeks, PCV at 6/10/14 weeks, OPV at birth and 6/10/14 weeks, MR at 9 and 15 months, fIPV at 6 and 14 weeks, and TCV at 15 months.',
      bn: 'বাংলাদেশ জাতীয় ইপিআই সূচি অনুসরণ করে। প্রধান টিকা: জন্মের সময় বিসিজি, ৬/১০/১৪ সপ্তাহে পেন্টাভ্যালেন্ট, ৯ ও ১৫ মাসে এমআর, ১৫ মাসে টিসিভি।'
    },
    category: 'schedule',
    priority: 'high',
    sources: ['WHO Bangladesh', 'DGHS Bangladesh'],
    relatedQuestions: ['vaccine-free', 'bcg-when', 'pentavalent-what']
  },
  {
    id: 'vaccine-safe',
    question: { en: 'Are vaccines safe?', bn: 'টিকা কি নিরাপদ?' },
    answer: {
      en: 'Yes, vaccines used in Bangladesh are approved by WHO and national authorities. Like all medicines, vaccines can cause mild side effects such as soreness or low fever, but serious reactions are very rare. Benefits far outweigh risks.',
      bn: 'হ্যাঁ, বাংলাদেশে ব্যবহৃত টিকা WHO ও জাতীয় কর্তৃপক্ষ দ্বারা অনুমোদিত। সমস্ত ওষুধের মতো হালকা পার্শ্বপ্রতিক্রিয়া হতে পারে, কিন্তু গুরুতর প্রতিক্রিয়া খুবই বিরল।'
    },
    category: 'safety',
    priority: 'high',
    sources: ['WHO', 'DGHS Bangladesh']
  },
  {
    id: 'side-effects',
    question: { en: 'What are common side effects?', bn: 'সাধারণ পার্শ্বপ্রতিক্রিয়া কী?' },
    answer: {
      en: 'Common side effects include: soreness at injection site, mild fever, fatigue, reduced appetite. These are normal signs the body is building protection and usually resolve within 1-3 days.',
      bn: 'সাধারণ পার্শ্বপ্রতিক্রিয়া: ইনজেকশনের জায়গায় ব্যথা, হালকা জ্বর, ক্লান্তি, ক্ষুধামন্দা। এগুলি ১-৩ দিনের মধ্যে দূর হয়।'
    },
    category: 'side-effects',
    priority: 'medium',
    sources: ['WHO']
  },
  {
    id: 'urgent-fever',
    question: { en: 'What if my child has high fever after vaccination?', bn: 'টিকার পরে উচ্চ জ্বর হলে কী করব?' },
    answer: {
      en: 'URGENT: If fever above 40°C (104°F), difficulty breathing, rash, or persistent crying >3 hours — seek medical attention immediately. Go to nearest healthcare facility or call 999.',
      bn: 'জরুরি: ৪০°C এর উপরে জ্বর, শ্বাসকষ্ট, র‍্যাশ, বা ৩ ঘণ্টার বেশি কান্না — অবিলম্বে চিকিৎসা নিন। নিকটতম স্বাস্থ্যসেবা কেন্দ্রে যান বা ৯৯৯ নম্বরে কল করুন।'
    },
    category: 'urgent',
    priority: 'high',
    sources: ['WHO', 'DGHS Bangladesh']
  },
  {
    id: 'missed-dose',
    question: { en: 'What if we missed a vaccination?', bn: 'কোনো টিকা বাদ পড়লে কী করব?' },
    answer: {
      en: 'Do NOT start over. Go to your EPI centre and remaining doses will be given in order. Skipping vaccines is the real mistake. Consult your healthcare provider as soon as possible.',
      bn: 'আবার শুরু করবেন না। ইপিআই কেন্দ্রে যান, বাকি ডোজ ক্রমে দেওয়া হবে। পরামর্শের জন্য স্বাস্থ্যসেবা প্রদানকারীর সাথে যোগাযোগ করুন।'
    },
    category: 'missed-dose',
    priority: 'high',
    sources: ['WHO', 'DGHS Bangladesh']
  },
  {
    id: 'vaccine-free',
    question: { en: 'Are vaccines free in Bangladesh?', bn: 'বাংলাদেশে টিকা কি বিনামূল্যে?' },
    answer: {
      en: 'Yes, routine EPI vaccines are provided free of charge at government health facilities. Some private facilities may charge for administration.',
      bn: 'হ্যাঁ, সরকারি স্বাস্থ্য কেন্দ্রে নিয়মিত ইপিআই টিকা বিনামূল্যে পাওয়া যায়।'
    },
    category: 'general',
    priority: 'medium',
    sources: ['DGHS Bangladesh']
  }
];

export function findBestMatch(query: string, language: Language): { entry: FAQEntry | null; confidence: number } {
  const lowerQuery = query.toLowerCase();
  let bestMatch: FAQEntry | null = null;
  let highestScore = 0;

  for (const entry of faqDatabase) {
    let score = 0;
    const questionText = entry.question[language].toLowerCase();
    const answerText = entry.answer[language].toLowerCase();

    // Check if query words match question
    const queryWords = lowerQuery.split(/\s+/);
    for (const word of queryWords) {
      if (word.length > 2) {
        if (questionText.includes(word)) score += 2;
        if (answerText.includes(word)) score += 1;
      }
    }

    // Boost score for priority
    if (entry.priority === 'high') score *= 1.5;
    if (entry.priority === 'medium') score *= 1.2;

    if (score > highestScore) {
      highestScore = score;
      bestMatch = entry;
    }
  }

  const confidence = highestScore > 0 ? Math.min(highestScore / 10, 1) : 0;
  return { entry: confidence > 0.3 ? bestMatch : null, confidence };
}
