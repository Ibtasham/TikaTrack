import type { LocalizedText } from './evidence/types';
import { isPublishable } from './evidence/bridge';
import { allVaccines, type Vaccine } from './vaccines';
import { getVaccineClinicalProfile, type VaccineClinicalProfile } from './vaccineClinicalDetails';
import { addDays, isValidISODate, parseISODate, resolveReferenceTodayISO, toISODate } from '../lib/format';
import type { Profile } from '../types';

export type ReadinessScenarioId =
  | 'hajj'
  | 'travel'
  | 'pregnancy'
  | 'occupational'
  | 'chronic'
  | 'senior';

export type ReadinessPriority = 'mandatory' | 'essential' | 'recommended' | 'situational';

export interface ReadinessRecommendation {
  vaccineId: string;
  /** Alternative IDs recorded in a family member's dose ledger that satisfy or partially satisfy protection. */
  equivalentIds?: string[];
  priority: ReadinessPriority;
  /** Minimum recommended lead time before a target travel/milestone date (`null` if timing is ongoing/trimester-based). */
  leadDays: number | null;
  timingLabel: LocalizedText;
  rationale: LocalizedText;
  certificateNote?: LocalizedText;
}

export interface ReadinessScenario {
  id: ReadinessScenarioId;
  title: LocalizedText;
  subtitle: LocalizedText;
  summary: LocalizedText;
  clinicTip: LocalizedText;
  defaultTargetLabel: LocalizedText;
  recommendations: ReadinessRecommendation[];
}

export const READINESS_SCENARIOS: ReadonlyArray<ReadinessScenario> = [
  {
    id: 'hajj',
    title: {
      en: 'Hajj & Umrah Pilgrimage',
      bn: 'হজ ও ওমরাহ যাত্রা',
    },
    subtitle: {
      en: 'Saudi Ministry of Health & Bangladesh Ashkona / Civil Surgeon checklist',
      bn: 'সৌদি স্বাস্থ্য মন্ত্রণালয় ও বাংলাদেশ সিভিল সার্জন/আশকোনা হজ ক্যাম্প সূচি',
    },
    summary: {
      en: 'Quadrivalent Meningococcal ACWY is strictly mandatory for visa/entry and must be administered at least 10 days before arrival in Saudi Arabia.',
      bn: 'সৌদি আরবে ভিসা ও প্রবেশের জন্য মেনিনগোকক্কাল ACWY টিকা বাধ্যতামূলক এবং পৌঁছানোর অন্তত ১০ দিন আগে নিতে হয়।',
    },
    clinicTip: {
      en: 'Collect your official Civil Surgeon or approved Hajj medical camp card with batch number, date, and clinic stamp.',
      bn: 'সিভিল সার্জন অফিস বা অনুমোদিত হজ ক্যাম্প থেকে ব্যাচ নম্বর, তারিখ ও সিলমোহরসহ সরকারি টিকা কার্ড সংগ্রহ করুন।',
    },
    defaultTargetLabel: {
      en: 'Departure date (optional)',
      bn: 'যাত্রার তারিখ (ঐচ্ছিক)',
    },
    recommendations: [
      {
        vaccineId: 'meningococcal-acwy',
        equivalentIds: ['meningococcal', 'meningococcal-abcwy'],
        priority: 'mandatory',
        leadDays: 10,
        timingLabel: {
          en: '≥10 days before departure (valid 5 yrs conjugate / 3 yrs polysaccharide)',
          bn: 'যাত্রার কমপক্ষে ১০ দিন আগে (কনজুগেট ৫ বছর বৈধ)',
        },
        rationale: {
          en: 'Required entry certificate against invasive serogroups A, C, W, and Y in crowded pilgrim gatherings.',
          bn: 'মসজিদুল হারাম ও মিনা-আরাফাতের ভিড়ে মেনিনজাইটিস সংক্রমণ রোধে বাধ্যতামূলক।',
        },
        certificateNote: {
          en: 'Visa & Airport Check',
          bn: 'ভিসা ও বিমানবন্দর যাচাই',
        },
      },
      {
        vaccineId: 'influenza',
        equivalentIds: ['influenza-high-dose'],
        priority: 'essential',
        leadDays: 14,
        timingLabel: {
          en: 'At least 14 days before flight (annual Northern/Southern strain)',
          bn: 'ফ্লাইটের অন্তত ১৪ দিন আগে (বার্ষিক ফ্লু ডোজ)',
        },
        rationale: {
          en: 'Sharply reduces severe respiratory illness and hospitalization during mass gatherings ("Hajj cough").',
          bn: 'বড় সমাবেশে তীব্র শ্বাসতন্ত্রের সংক্রমণ ও নিউমোনিয়া ঝুঁকি উল্লেখযোগ্যভাবে কমায়।',
        },
      },
      {
        vaccineId: 'polio-ipv',
        equivalentIds: ['opv', 'fipv'],
        priority: 'situational',
        leadDays: 28,
        timingLabel: {
          en: '4 weeks to 12 months before departure (if travel advisory requires)',
          bn: 'যাত্রার ৪ সপ্তাহ থেকে ১২ মাসের মধ্যে (বিধিনিষেধ থাকলে)',
        },
        rationale: {
          en: 'Required on ICVP card if arriving from or transiting polio-affected corridors; verify current DGHS Hajj circular.',
          bn: 'আন্তর্জাতিক স্বাস্থ্য বিধি বা হজ সার্কুলার অনুযায়ী পোলিও প্রমাণপত্র প্রযোজ্য হতে পারে।',
        },
        certificateNote: {
          en: 'Check DGHS Circular',
          bn: 'ইপিআই/হজ সার্কুলার দেখুন',
        },
      },
      {
        vaccineId: 'covid19-mrna-updated',
        equivalentIds: ['covid19'],
        priority: 'recommended',
        leadDays: 14,
        timingLabel: {
          en: '≥14 days prior for pilgrims ≥65 yrs, pregnant, or with chronic illness',
          bn: '৬৫+ প্রবীণ, গর্ভবতী বা দীর্ঘস্থায়ী রোগীদের জন্য ১৪+ দিন আগে',
        },
        rationale: {
          en: 'Protects high-risk pilgrims from severe COVID-19 respiratory complications abroad.',
          bn: 'বয়স্ক ও ঝুঁকিপূর্ণ হাজিদের গুরুতর কোভিড জটিলতা থেকে সুরক্ষা দেয়।',
        },
      },
      {
        vaccineId: 'pcv20',
        equivalentIds: ['pcv15', 'pneumococcal23', 'pcv13'],
        priority: 'recommended',
        leadDays: 14,
        timingLabel: {
          en: 'Single dose for adults 65+ or with diabetes/asthma/heart disease',
          bn: '৬৫+ প্রবীণ বা ডায়াবেটিস/শ্বাসরোগ/হৃদরোগীদের জন্য ১ ডোজ',
        },
        rationale: {
          en: 'Prevents invasive pneumococcal pneumonia commonly triggered after viral respiratory infections during pilgrimage.',
          bn: 'হজ সফরে ফ্লু-পরবর্তী ব্যাকটেরিয়াজনিত মারাত্মক নিউমোনিয়া প্রতিরোধ করে।',
        },
      },
    ],
  },
  {
    id: 'travel',
    title: {
      en: 'International Travel & Study Abroad',
      bn: 'বিদেশ ভ্রমণ ও উচ্চশিক্ষা',
    },
    subtitle: {
      en: 'University dormitories (US/UK/EU), Africa/South America YF rules & regional travel',
      bn: 'বিদেশি বিশ্ববিদ্যালয়ের হোস্টেল (US/UK/EU), ইয়েলো ফিভার ও আঞ্চলিক ভ্রমণ',
    },
    summary: {
      en: 'Universities typically mandate MMR, Tdap, Varicella, HepB, and Meningococcal ACWY/B; travel to Sub-Saharan Africa or South America requires an ICVP Yellow Fever card ≥10 days prior.',
      bn: 'বিদেশি বিশ্ববিদ্যালয়ে সাধারণত MMR, Tdap, ভ্যারিসেলা ও মেনিনগোকক্কাল লাগে; আফ্রিকা/দক্ষিণ আমেরিকায় যেতে ১০+ দিন আগে ইয়েলো ফিভার বাধ্যতামূলক।',
    },
    clinicTip: {
      en: 'Begin multi-dose travel or university series (like Twinrix/HepB or Rabies PrEP) 4–6 weeks before departure so primary protection completes on time.',
      bn: 'একাধিক ডোজের টিকা (যেমন হেপ-বি/টুইনরিক্স বা জলাতঙ্ক) সময়মতো শেষ করতে যাত্রার ৪–৬ সপ্তাহ আগেই শুরু করুন।',
    },
    defaultTargetLabel: {
      en: 'Travel / semester start date',
      bn: 'ভ্রমণ বা সেমিস্টার শুরুর তারিখ',
    },
    recommendations: [
      {
        vaccineId: 'yellowFever',
        priority: 'mandatory',
        leadDays: 10,
        timingLabel: {
          en: '≥10 days before entering endemic Africa / South America (ICVP)',
          bn: 'ঝুঁকিপূর্ণ আফ্রিকা/দক্ষিণ আমেরিকায় প্রবেশের ১০+ দিন আগে (ICVP কার্ড)',
        },
        rationale: {
          en: 'Strict border requirement for ICVP "Yellow Card" issued at authorized centres (lifelong single-dose validity under WHO IHR).',
          bn: 'WHO আন্তর্জাতিক বিধি অনুযায়ী অনুমোদিত কেন্দ্র থেকে এক ডোজেই আজীবন বৈধ হলুদ কার্ড দেওয়া হয়।',
        },
        certificateNote: {
          en: 'ICVP Border Rule',
          bn: 'আন্তর্জাতিক হলুদ কার্ড',
        },
      },
      {
        vaccineId: 'meningococcal-acwy',
        equivalentIds: ['meningococcal', 'meningococcal-abcwy'],
        priority: 'essential',
        leadDays: 14,
        timingLabel: {
          en: '≥14 days prior for international university dorms & high-risk regions',
          bn: 'আবাসিক বিশ্ববিদ্যালয়/হোস্টেল ও ঝুঁকিপূর্ণ ভ্রমণের ১৪+ দিন আগে',
        },
        rationale: {
          en: 'Required by almost all North American and European universities for incoming students living in shared housing.',
          bn: 'বিদেশি বিশ্ববিদ্যালয়ের ছাত্রাবাসে ওঠার আগে আবশ্যিক মেনিনজাইটিস সুরক্ষা।',
        },
      },
      {
        vaccineId: 'meningococcal-b',
        equivalentIds: ['meningococcal-abcwy'],
        priority: 'recommended',
        leadDays: 42,
        timingLabel: {
          en: '2 doses (4–8 wks apart) for UK/US/EU campus outbreaks & dorms',
          bn: 'ক্যাম্পাস/হোস্টেলের জন্য ৪–৮ সপ্তাহ ব্যবধানে ২ ডোজ',
        },
        rationale: {
          en: 'Serogroup B causes the majority of college meningococcal outbreaks and is not covered by ACWY alone.',
          bn: 'বিশ্ববিদ্যালয় ক্যাম্পাসে মেনিনজাইটিসের প্রধান ধরন Serogroup B (যা শুধু ACWY-তে থাকে না)।',
        },
      },
      {
        vaccineId: 'tdap',
        equivalentIds: ['dtap', 'pentavalent', 'td-adult', 'tt'],
        priority: 'essential',
        leadDays: 14,
        timingLabel: {
          en: '1 booster if >5–10 years since last tetanus-pertussis dose',
          bn: 'শেষ টিটেনাস-পার্টুসিস ডোজের ৫–১০ বছর পেরিয়ে গেলে ১ ডোজ',
        },
        rationale: {
          en: 'Standard immigration and university health clearance requirement worldwide.',
          bn: 'বিদেশে ভর্তি ও অভিবাসন স্বাস্থ্য পরীক্ষায় প্রায় সর্বত্র আবশ্যিক।',
        },
      },
      {
        vaccineId: 'mmr',
        equivalentIds: ['mr'],
        priority: 'essential',
        leadDays: 28,
        timingLabel: {
          en: '2 documented doses (≥28 days apart) if university mandates Mumps component',
          bn: 'বিশ্ববিদ্যালয়ে মাম্পসসহ ২ ডোজ চাইলে অন্তত ২৮ দিন ব্যবধানে',
        },
        rationale: {
          en: 'Many US/EU schools require MMR specifically rather than Bangladesh EPI MR (which lacks Mumps).',
          bn: 'বাংলাদেশ ইপিআই-এর MR টিকায় মাম্পস না থাকায় অনেক বিদেশি বিশ্ববিদ্যালয় ২ ডোজ MMR চায়।',
        },
      },
      {
        vaccineId: 'typhoid-typbar-tcv',
        equivalentIds: ['tcv', 'typhoidVi', 'typhoid-oral'],
        priority: 'recommended',
        leadDays: 14,
        timingLabel: {
          en: '≥14 days before rural travel, backpacking, or extended regional stays',
          bn: 'আঞ্চলিক বা গ্রামীণ সফরের অন্তত ১৪ দিন আগে ১ ডোজ',
        },
        rationale: {
          en: 'Protects against XDR/MDR Salmonella Typhi transmission from food and water.',
          bn: 'খাবার ও পানি বাহিত ওষুধ-প্রতিরোধী টাইফয়েড থেকে দীর্ঘমেয়াদী সুরক্ষা দেয়।',
        },
      },
      {
        vaccineId: 'hepa-hepb-twinrix',
        equivalentIds: ['hepatitisA', 'hepatitisB', 'hepatitis-b-adult'],
        priority: 'recommended',
        leadDays: 30,
        timingLabel: {
          en: '0, 1, 6 months (or Days 0, 7, 21 + 12 mo rapid travel course)',
          bn: '০, ১ ও ৬ মাস (বা দ্রুত সূচি: দিন ০, ৭, ২১ ও ১২ মাস)',
        },
        rationale: {
          en: 'Dual protection against food/waterborne Hepatitis A and blood/mucosal Hepatitis B in one series.',
          bn: 'একই সিরিজে হেপাটাইটিস-এ এবং হেপাটাইটিস-বি উভয় থেকে দীর্ঘস্থায়ী সুরক্ষা।',
        },
      },
    ],
  },
  {
    id: 'pregnancy',
    title: {
      en: 'Pregnancy & Expectant Parent',
      bn: 'গর্ভাবস্থা ও অনাগত শিশুর সুরক্ষা',
    },
    subtitle: {
      en: 'Antenatal Bangladesh EPI TT/Td + Maternal Tdap & RSV transplacental shield',
      bn: 'বাংলাদেশ ইপিআই ৫-ডোজ TT/Td এবং গর্ভফুলের মাধ্যমে নবজাতক সুরক্ষা (Tdap ও RSV)',
    },
    summary: {
      en: 'Maternal immunization protects both expectant mother and newborn during the vulnerable first 8 weeks of life before infant clinic shots begin.',
      bn: 'গর্ভাবস্থায় নেওয়া টিকা শিশুর জন্মের প্রথম ২ মাস (যখন তার নিজের টিকা শুরু হয় না) মারাত্মক সংক্রমণ থেকে রক্ষা করে।',
    },
    clinicTip: {
      en: 'Always confirm current gestational week with your obstetrician before Maternal RSV (strictly weeks 32–36) or any live-vaccine exclusion.',
      bn: 'মাতৃকালীন RSV (শুধুমাত্র ৩২–৩৬ সপ্তাহে) নেওয়ার আগে গর্ভাবস্থার সঠিক সপ্তাহ আপনার গাইনি চিকিৎসকের সাথে নিশ্চিত করুন।',
    },
    defaultTargetLabel: {
      en: 'Expected due date (EDD, optional)',
      bn: 'সম্ভাব্য প্রসবের তারিখ (ঐচ্ছিক)',
    },
    recommendations: [
      {
        vaccineId: 'tt',
        equivalentIds: ['td-adult', 'tdap'],
        priority: 'mandatory',
        leadDays: null,
        timingLabel: {
          en: 'Verify Bangladesh 5-dose TT/Td lifetime status at antenatal booking',
          bn: 'গর্ভাবস্থার শুরুতেই ইপিআই ৫-ডোজ TT/Td স্ট্যাটাস যাচাই করুন',
        },
        rationale: {
          en: 'Core national EPI safeguard eliminating maternal and neonatal tetanus.',
          bn: 'মা ও নবজাতকের প্রাণঘাতী টিটেনাস সম্পূর্ণভাবে প্রতিরোধে জাতীয় ইপিআই সূচি।',
        },
      },
      {
        vaccineId: 'tdap',
        priority: 'essential',
        leadDays: 28,
        timingLabel: {
          en: '1 dose during weeks 27–36 of EVERY pregnancy (even if prior doses given)',
          bn: 'প্রতি গর্ভাবস্থার ২৭–৩৬ সপ্তাহে ১ ডোজ (আগে নেওয়া থাকলেও)',
        },
        rationale: {
          en: 'Transfers high maternal pertussis antibodies across the placenta, preventing >90% of infant whooping cough hospitalizations under 2 months.',
          bn: 'গর্ভফুল দিয়ে উচ্চমাত্রার অ্যান্টিবডি শিশুতে পৌঁছায়, যা জন্মের পর হুপিং কাশি থেকে ৯০%+ সুরক্ষা দেয়।',
        },
      },
      {
        vaccineId: 'rsv-pregnancy',
        priority: 'recommended',
        leadDays: 28,
        timingLabel: {
          en: '1 dose strictly during weeks 32–36 (or infant Nirsevimab after birth)',
          bn: 'শুধুমাত্র গর্ভাবস্থার ৩২–৩৬ সপ্তাহে ১ ডোজ (অথবা জন্মের পর শিশুকে Nirsevimab)',
        },
        rationale: {
          en: 'Prevents severe infant RSV bronchiolitis and neonatal ICU admissions through the first 6 months.',
          bn: 'নবজাতকের তীব্র শ্বাসকষ্ট ও ব্রঙ্কিওলাইটিস প্রতিরোধে কার্যকর মাতৃকালীন সুরক্ষা।',
        },
      },
      {
        vaccineId: 'influenza',
        priority: 'essential',
        leadDays: null,
        timingLabel: {
          en: 'Inactivated flu shot safe in ANY trimester during flu season',
          bn: 'যেকোনো ট্রাইমেস্টারে নিষ্ক্রিয় ফ্লু টিকা সম্পূর্ণ নিরাপদ',
        },
        rationale: {
          en: 'WHO Priority Group: pregnant women face elevated risk of severe pneumonia and preterm complications from influenza.',
          bn: 'গর্ভাবস্থায় ফ্লু জটিলতা বেশি হয়; টিকা মা ও নবজাতক উভয়কেই সুরক্ষা দেয়।',
        },
      },
      {
        vaccineId: 'covid19',
        equivalentIds: ['covid19-mrna-updated'],
        priority: 'recommended',
        leadDays: null,
        timingLabel: {
          en: 'Safe in ANY trimester if unvaccinated or overdue for maternal booster',
          bn: 'যেকোনো সময় নিরাপদ (আগে সম্পূর্ণ না হলে বা বুস্টার প্রাপ্য হলে)',
        },
        rationale: {
          en: 'Reduces gestational hypertension, ICU admission, and adverse pregnancy outcomes linked to COVID-19.',
          bn: 'গর্ভকালীন কোভিড জটিলতা ও প্রসূতি ঝুঁকি উল্লেখযোগ্যভাবে হ্রাস করে।',
        },
      },
    ],
  },
  {
    id: 'occupational',
    title: {
      en: 'Healthcare, Veterinary & Food Workers',
      bn: 'স্বাস্থ্যকর্মী, ভেটেরিনারি ও খাদ্যকর্মী',
    },
    subtitle: {
      en: 'Needle-stick, bloodborne, zoonotic rabies & foodborne exposure safeguards',
      bn: 'রক্তবাহিত সংক্রমণ, পশু-চিকিৎসা জলাতঙ্ক ও খাদ্যবাহিত রোগ প্রতিরোধ',
    },
    summary: {
      en: 'Essential pre-exposure immunity for doctors, nurses, medical/nursing students, lab technicians, veterinary staff, and commercial food handlers.',
      bn: 'ডাক্তার, নার্স, মেডিকেল শিক্ষার্থী, ল্যাব কর্মী, পশুচিকিৎসক এবং খাদ্য প্রস্তুতকারকদের পেশাগত ঝুঁকি প্রতিরোধে জরুরি টিকা।',
    },
    clinicTip: {
      en: 'Healthcare personnel completing a 3-dose HepB series should request an anti-HBs titer test 1–2 months after Dose 3 (protective ≥10 mIU/mL).',
      bn: 'স্বাস্থ্যকর্মীদের ৩ ডোজ হেপাটাইটিস-বি শেষ করার ১–২ মাস পর anti-HBs টাইটার পরীক্ষা (≥১০ mIU/mL) নিশ্চিত করা উচিত।',
    },
    defaultTargetLabel: {
      en: 'Clinical posting / job start date',
      bn: 'চাকরি বা ক্লিনিকাল পোস্টিং শুরুর তারিখ',
    },
    recommendations: [
      {
        vaccineId: 'hepatitis-b-adult',
        equivalentIds: ['hepatitisB', 'pentavalent', 'hexavalent', 'hepa-hepb-twinrix'],
        priority: 'mandatory',
        leadDays: 30,
        timingLabel: {
          en: '3 doses (0, 1, 6 months) + anti-HBs titer check 1–2 mo post-series',
          bn: '৩ ডোজ (০, ১ ও ৬ মাস) এবং শেষ ডোজের ১–২ মাস পর টাইটার পরীক্ষা',
        },
        rationale: {
          en: 'Primary occupational safeguard against needle-stick and mucocutaneous HBV exposure in clinics and labs.',
          bn: 'হাসপাতাল ও ল্যাবে সূঁচ ফোটা বা রক্তের সংস্পর্শ থেকে হেপাটাইটিস-বি প্রতিরোধে প্রধান সুরক্ষা।',
        },
      },
      {
        vaccineId: 'rabies-preexposure',
        equivalentIds: ['rabies', 'rabies-pcecv'],
        priority: 'essential',
        leadDays: 7,
        timingLabel: {
          en: '2-visit PrEP (Days 0 & 7) for vets, animal handlers, ER & lab staff',
          bn: 'পশুচিকিৎসক ও মাঠকর্মীদের জন্য দিন ০ ও ৭-এ ২ ডোজ প্রি-এক্সপোজার',
        },
        rationale: {
          en: 'Eliminates need for scarce Rabies Immunoglobulin (RIG) if bitten/scratched and cuts PEP to 2 rapid boosters.',
          bn: 'আঁচড় বা কামড় লাগলে ব্যয়বহুল RIG ছাড়াই দ্রুত ২টি বুস্টারে পূর্ণ সুরক্ষা নিশ্চিত করে।',
        },
      },
      {
        vaccineId: 'influenza',
        equivalentIds: ['influenza-high-dose'],
        priority: 'essential',
        leadDays: 14,
        timingLabel: {
          en: 'Every autumn/flu season for all clinical & hospital staff',
          bn: 'প্রতি বছর মৌসুমি ফ্লু শুরুর আগে সকল হাসপাতাল কর্মীদের জন্য',
        },
        rationale: {
          en: 'Prevents nosocomial outbreaks among vulnerable ICU, neonatal, and oncology patients.',
          bn: 'চিকিৎসক বা কর্মীদের মাধ্যমে রোগী ও নবজাতকদের মধ্যে ফ্লু ছড়ানো বন্ধ করে।',
        },
      },
      {
        vaccineId: 'tdap',
        equivalentIds: ['dtap', 'td-adult'],
        priority: 'essential',
        leadDays: 14,
        timingLabel: {
          en: '1 adult Tdap (especially pediatric/maternity staff), then Td q10y',
          bn: '১ ডোজ টিড্যাপ (বিশেষ করে শিশু/প্রসূতি ওয়ার্ডে), এরপর প্রতি ১০ বছরে টিডি',
        },
        rationale: {
          en: 'Prevents healthcare-worker pertussis transmission to newborns and immunocompromised wards.',
          bn: 'স্বাস্থ্যকর্মীদের থেকে নবজাতকদের মাঝে হুপিং কাশি ছড়ানো রোধ করে।',
        },
      },
      {
        vaccineId: 'typhoid-typbar-tcv',
        equivalentIds: ['tcv', 'typhoidVi'],
        priority: 'recommended',
        leadDays: 14,
        timingLabel: {
          en: '1 dose for food handlers, catering staff & microbiology labs',
          bn: 'খাদ্য কর্মী ও মাইক্রোবায়োলজি ল্যাব কর্মীদের জন্য ১ ডোজ',
        },
        rationale: {
          en: 'Protects kitchen teams and prevents foodborne Salmonella Typhi outbreaks.',
          bn: 'খাদ্য প্রস্তুতকারক ও ল্যাব কর্মীদের টাইফয়েড সংক্রমণ ও বিস্তার প্রতিরোধ করে।',
        },
      },
      {
        vaccineId: 'varicella',
        priority: 'recommended',
        leadDays: 28,
        timingLabel: {
          en: '2 doses (4–8 wks apart) if no history of chickenpox or prior shots',
          bn: 'আগে জলবসন্ত না হয়ে থাকলে ৪–৮ সপ্তাহ ব্যবধানে ২ ডোজ',
        },
        rationale: {
          en: 'Prevents severe adult varicella and hospital ward exposure.',
          bn: 'প্রাপ্তবয়স্ক অবস্থায় তীব্র জলবসন্ত এবং হাসপাতালে সংক্রমণ ছড়ানো রোধ করে।',
        },
      },
    ],
  },
  {
    id: 'chronic',
    title: {
      en: 'Chronic Conditions (Diabetes, Heart, Lung, Kidney)',
      bn: 'দীর্ঘস্থায়ী রোগ (ডায়াবেটিস, হৃদরোগ, হাঁপানি, কিডনি)',
    },
    subtitle: {
      en: 'Targeted adult immunization lowering hospitalization & cardiac triggers',
      bn: 'ডায়াবেটিস, অ্যাজমা/COPD, হৃদরোগ ও কিডনি রোগীদের জটিলতা কমানোর সুরক্ষা',
    },
    summary: {
      en: 'Adults with diabetes, COPD/asthma, chronic heart, liver, or kidney disease carry significantly higher pneumonia, sepsis, shingles, and hepatitis B risk.',
      bn: 'ডায়াবেটিস, শ্বাসরোগ, হৃদরোগ বা কিডনি সমস্যায় ভোগা ব্যক্তিদের নিউমোনিয়া, শিংলস ও হেপাটাইটিস-বি-র ঝুঁকি অনেক বেশি।',
    },
    clinicTip: {
      en: 'If you are preparing for dialysis, organ transplant, or immunosuppressive therapy, ask your specialist to finish live vaccines (MMR/Varicella) at least 4 weeks beforehand.',
      bn: 'ডায়ালাইসিস বা ইমিউনোসাপ্রেসিভ ওষুধ শুরু করার আগে কমপক্ষে ৪ সপ্তাহ হাতে রেখে চিকিৎসকের সাথে টিকার সূচি ঠিক করে নিন।',
    },
    defaultTargetLabel: {
      en: 'Planned checkup / treatment date',
      bn: 'পরবর্তী চেকআপ বা চিকিৎসার তারিখ',
    },
    recommendations: [
      {
        vaccineId: 'pcv20',
        equivalentIds: ['pcv15', 'pneumococcal23', 'pcv13'],
        priority: 'mandatory',
        leadDays: 14,
        timingLabel: {
          en: 'Single PCV20 dose (or PCV15 followed by PPSV23) at any adult age ≥19 yrs',
          bn: '১৯+ বয়সের যেকোনো সময়ে এক ডোজ PCV20 (অথবা PCV15 + PPSV23)',
        },
        rationale: {
          en: 'Dramatically reduces invasive pneumococcal pneumonia and bacteremia in diabetes, heart/lung disease, kidney disease, and asplenia.',
          bn: 'ডায়াবেটিস, হৃদরোগ ও হাঁপানি রোগীদের প্রাণঘাতী নিউমোকক্কাল নিউমোনিয়া ও সেপসিস ঝুঁকি কমায়।',
        },
      },
      {
        vaccineId: 'influenza',
        equivalentIds: ['influenza-high-dose'],
        priority: 'essential',
        leadDays: 14,
        timingLabel: {
          en: 'Every year without fail (choose Flu shot, not live nasal spray)',
          bn: 'প্রতি বছর নিয়মিত ১ ডোজ ইনজেকশন ফ্লু টিকা',
        },
        rationale: {
          en: 'Flu vaccination is proven to reduce cardiac events, diabetic ketoacidosis crises, and COPD exacerbations.',
          bn: 'বার্ষিক ফ্লু টিকা হৃদরোগীদের হার্ট অ্যাটাক ও ডায়াবেটিক রোগীদের হাসপাতালে ভর্তি কমায়।',
        },
      },
      {
        vaccineId: 'hepatitis-b-adult',
        equivalentIds: ['hepatitisB', 'pentavalent', 'hepa-hepb-twinrix'],
        priority: 'essential',
        leadDays: null,
        timingLabel: {
          en: '3-dose series (or higher-dose dialysis formulation if CKD)',
          bn: '৩ ডোজ সিরিজ (ক্রনিক কিডনি রোগ/ডায়ালাইসিসে বিশেষ মাত্রা)',
        },
        rationale: {
          en: 'Crucial in diabetes (shared glucose monitoring risk), chronic liver disease (protects remaining liver tissue), and hemodialysis.',
          bn: 'ডায়াবেটিস, লিভারের রোগ ও ডায়ালাইসিস রোগীদের লিভার সুরক্ষায় অত্যন্ত গুরুত্বপূর্ণ।',
        },
      },
      {
        vaccineId: 'covid19-mrna-updated',
        equivalentIds: ['covid19'],
        priority: 'essential',
        leadDays: 14,
        timingLabel: {
          en: 'Updated annual/6-monthly dose for chronic cardiac/metabolic/renal risk',
          bn: 'দীর্ঘস্থায়ী রোগীদের জন্য ৬–১২ মাস অন্তর হালনাগাদ ডোজ',
        },
        rationale: {
          en: 'Prevents severe hypoxic respiratory failure and post-viral cardiac complications.',
          bn: 'তীব্র শ্বাসকষ্ট ও ভাইরাস-পরবর্তী হৃদযন্ত্রের জটিলতা প্রতিরোধ করে।',
        },
      },
      {
        vaccineId: 'shingles',
        priority: 'recommended',
        leadDays: null,
        timingLabel: {
          en: '2 non-live Shingrix doses (0 & 2–6 mo; safe even if immunocompromised at ≥19 yrs)',
          bn: '০ ও ২–৬ মাসে ২ ডোজ নির্জীব শিংলস টিকা (ঝুঁকি থাকলে ১৯+ বয়সেও নিরাপদ)',
        },
        rationale: {
          en: 'Recombinant RZV protects compromised immune systems from painful herpes zoster and long-term nerve pain.',
          bn: 'নির্জীব রিকম্বিন্যান্ট টিকা হওয়ায় দুর্বল রোগ প্রতিরোধ ক্ষমতার মানুষদেরও শিংলস স্নায়ু ব্যথা থেকে বাঁচায়।',
        },
      },
    ],
  },
  {
    id: 'senior',
    title: {
      en: 'Senior Healthy Aging (60–65+ Years)',
      bn: 'প্রবীণ সুস্থ জীবন সুরক্ষা (৬০–৬৫+ বছর)',
    },
    subtitle: {
      en: 'Protecting grandparents & older adults from pneumonia, RSV, flu & shingles',
      bn: 'বয়স্ক মা-বাবা ও দাদা-দাদিকে নিউমোনিয়া, আরএসভি, ফ্লু ও শিংলস থেকে সুরক্ষা',
    },
    summary: {
      en: 'Immunosenescence reduces natural antibody responses after age 60, making adult pneumococcal, high-dose flu, RSV, and recombinant shingles vaccines vital.',
      bn: '৬০ বছরের পর স্বাভাবিক রোগ প্রতিরোধ ক্ষমতা কমে যাওয়ায় নিউমোনিয়া, উচ্চ-মাত্রার ফ্লু, আরএসভি ও শিংলস টিকা অত্যন্ত জরুরি।',
    },
    clinicTip: {
      en: 'Ask whether vaccines can be co-administered safely in opposite arms (e.g., High-Dose Flu + COVID-19 or PCV20) to save elderly family members extra clinic trips.',
      bn: 'প্রবীণদের বারবার ক্লিনিকে নেওয়া কমাতে ফ্লু, কোভিড বা নিউমোনিয়া টিকা একই ভিজিটে দুই বাহুতে একসাথে নেওয়া যাবে কিনা চিকিৎসককে জিজ্ঞাসা করুন।',
    },
    defaultTargetLabel: {
      en: 'Clinic visit / family milestone date',
      bn: 'ক্লিনিক ভিজিট বা পারিবারিক তারিখ',
    },
    recommendations: [
      {
        vaccineId: 'pcv20',
        equivalentIds: ['pcv15', 'pneumococcal23', 'pcv13'],
        priority: 'mandatory',
        leadDays: 14,
        timingLabel: {
          en: '1 lifetime PCV20 dose recommended for all adults ≥65 years',
          bn: '৬৫+ বছর বয়সী সকল প্রবীণের জন্য জীবনে ১ ডোজ PCV20',
        },
        rationale: {
          en: 'Covers 20 pneumococcal serotypes causing severe pneumonia, meningitis, and bloodstream infection in elders.',
          bn: 'প্রবীণদের প্রাণঘাতী নিউমোনিয়া ও রক্তের সংক্রমণ সৃষ্টিকারী ২০টি প্রজাতির বিরুদ্ধে সুরক্ষা।',
        },
      },
      {
        vaccineId: 'influenza-high-dose',
        equivalentIds: ['influenza'],
        priority: 'essential',
        leadDays: 14,
        timingLabel: {
          en: 'Annual 4× antigen High-Dose or Adjuvanted Flu (or standard flu if unavailable)',
          bn: 'প্রতি বছর উচ্চ-মাত্রার বা স্ট্যান্ডার্ড মৌসুমি ফ্লু টিকা',
        },
        rationale: {
          en: 'Higher antigen formulation overcomes age-related immune decline and boosts hospital protection in adults ≥65.',
          bn: 'বয়সজনিত দুর্বলতা কাটিয়ে প্রবীণদের হাসপাতালে ভর্তির ঝুঁকি আরও কার্যকরভাবে কমায়।',
        },
      },
      {
        vaccineId: 'rsv-arexvy',
        equivalentIds: ['rsv', 'rsv-pregnancy'],
        priority: 'essential',
        leadDays: 14,
        timingLabel: {
          en: '1 dose for all adults ≥75 years and risk-elevated adults 60–74 years',
          bn: '৭৫+ সবার এবং ৬০–৭৪ বছর ঝুঁকিপূর্ণ প্রবীণদের জন্য ১ ডোজ',
        },
        rationale: {
          en: 'RSV causes severe winter respiratory illness in elders comparable to influenza; single-dose protection lasts ≥2–3 seasons.',
          bn: 'শীতকালীন তীব্র শ্বাসকষ্ট ও নিউমোনিয়া থেকে একাধিক মৌসুম দীর্ঘ সুরক্ষা দেয়।',
        },
      },
      {
        vaccineId: 'shingles',
        priority: 'essential',
        leadDays: null,
        timingLabel: {
          en: '2 doses spaced 2–6 months apart (>90% protection even at 70–80+)',
          bn: '২–৬ মাস ব্যবধানে ২ ডোজ (৭০–৮০+ বয়সেও >৯০% কার্যকর)',
        },
        rationale: {
          en: 'Prevents agonizing postherpetic neuralgia (months/years of nerve pain) following shingles reactivation.',
          bn: 'শিংলস-পরবর্তী দীর্ঘস্থায়ী অসহনীয় স্নায়ুবিক ব্যথা প্রায় সম্পূর্ণভাবে প্রতিরোধ করে।',
        },
      },
      {
        vaccineId: 'covid19-mrna-updated',
        equivalentIds: ['covid19'],
        priority: 'essential',
        leadDays: 14,
        timingLabel: {
          en: 'WHO top-priority group: updated booster every 6–12 months',
          bn: 'WHO সর্বোচ্চ অগ্রাধিকার: প্রতি ৬–১২ মাসে হালনাগাদ কোভিড বুস্টার',
        },
        rationale: {
          en: 'Age remains the #1 predictor of severe COVID-19; regular boosting preserves cellular and neutralizing protection.',
          bn: 'বয়স্কদের গুরুতর কোভিড ঝুঁকি সবচেয়ে বেশি; নিয়মিত বুস্টার সুরক্ষা অটুট রাখে।',
        },
      },
      {
        vaccineId: 'td-adult',
        equivalentIds: ['tdap', 'tt'],
        priority: 'recommended',
        leadDays: null,
        timingLabel: {
          en: '1 booster every 10 years (or after ≥5 years if skin/garden injury)',
          bn: 'প্রতি ১০ বছরে ১ ডোজ (মাটি/ক্ষত হলে ৫+ বছরে)',
        },
        rationale: {
          en: 'Waning tetanus immunity in older adults makes routine 10-year Td/Tdap maintenance essential.',
          bn: 'প্রবীণ বয়সে টিটেনাসের অ্যান্টিবডি কমে যাওয়ায় প্রতি ১০ বছরে বুস্টার জরুরি।',
        },
      },
    ],
  },
];

export interface EvaluatedRecommendation {
  recommendation: ReadinessRecommendation;
  vaccine: Vaccine;
  clinical: VaccineClinicalProfile;
  recordedCount: number;
  unconfirmedCount: number;
  hasUnconfirmedRecords: boolean;
  matchedViaEquivalent: boolean;
  status: 'recorded' | 'needed';
  latestClinicDate: string | null;
  tightWindow: boolean;
}

function subtractDaysISO(isoDate: string, days: number): string | null {
  if (!isValidISODate(isoDate)) return null;
  const parsed = parseISODate(isoDate);
  if (!parsed) return null;
  return toISODate(addDays(parsed, -days));
}

/**
 * Evaluate scenario recommendations against `allVaccines`, `isPublishable()`,
 * an optional selected family `Profile` dose ledger, and an optional target date.
 */
export function evaluateScenarioReadiness(
  scenarioIds: ReadonlyArray<ReadinessScenarioId>,
  profile: Profile | null | undefined,
  targetDateISO?: string,
): {
  scenarioList: ReadinessScenario[];
  items: EvaluatedRecommendation[];
  recordedCount: number;
  neededCount: number;
} {
  const scenarioList = READINESS_SCENARIOS.filter((s) => scenarioIds.includes(s.id));
  const vaccineMap = new Map(allVaccines.map((v) => [v.id, v]));
  const seenVaccineIds = new Set<string>();
  const items: EvaluatedRecommendation[] = [];

  // Build quick dose count & review-status lookup from profile events + legacy records
  const doseCounts = new Map<string, number>();
  const unconfirmedCounts = new Map<string, number>();
  if (profile) {
    for (const ev of profile.events ?? []) {
      doseCounts.set(ev.vaccineId, (doseCounts.get(ev.vaccineId) ?? 0) + 1);
      if (ev.needsReview === true || ev.doseNumber === null) {
        unconfirmedCounts.set(ev.vaccineId, (unconfirmedCounts.get(ev.vaccineId) ?? 0) + 1);
      }
    }
    for (const [vid, rec] of Object.entries(profile.records ?? {})) {
      if (rec?.date && !doseCounts.has(vid)) {
        doseCounts.set(vid, 1);
        unconfirmedCounts.set(vid, 1);
      }
    }
  }

  const todayStr = resolveReferenceTodayISO();
  const validTargetDate = targetDateISO && isValidISODate(targetDateISO) ? targetDateISO : undefined;
  const priorityOrder: Record<ReadinessPriority, number> = {
    mandatory: 0,
    essential: 1,
    recommended: 2,
    situational: 3,
  };

  for (const scenario of scenarioList) {
    for (const rec of scenario.recommendations) {
      if (seenVaccineIds.has(rec.vaccineId)) continue;
      if (!isPublishable(rec.vaccineId)) continue;
      const vaccine = vaccineMap.get(rec.vaccineId);
      if (!vaccine) continue;

      seenVaccineIds.add(rec.vaccineId);

      const directCount = doseCounts.get(rec.vaccineId) ?? 0;
      const directUnconfirmed = unconfirmedCounts.get(rec.vaccineId) ?? 0;
      let equivalentCount = 0;
      let equivalentUnconfirmed = 0;
      if (directCount === 0 && rec.equivalentIds) {
        for (const eqId of rec.equivalentIds) {
          equivalentCount += doseCounts.get(eqId) ?? 0;
          equivalentUnconfirmed += unconfirmedCounts.get(eqId) ?? 0;
        }
      }
      const recordedCount = directCount + equivalentCount;
      const unconfirmedCount = directCount > 0 ? directUnconfirmed : equivalentUnconfirmed;
      const matchedViaEquivalent = directCount === 0 && equivalentCount > 0;

      const latestClinicDate =
        validTargetDate && rec.leadDays !== null
          ? subtractDaysISO(validTargetDate, rec.leadDays)
          : null;
      const tightWindow = Boolean(
        latestClinicDate && recordedCount === 0 && latestClinicDate <= todayStr,
      );

      items.push({
        recommendation: rec,
        vaccine,
        clinical: getVaccineClinicalProfile(vaccine),
        recordedCount,
        unconfirmedCount,
        hasUnconfirmedRecords: unconfirmedCount > 0,
        matchedViaEquivalent,
        status: recordedCount > 0 ? 'recorded' : 'needed',
        latestClinicDate,
        tightWindow,
      });
    }
  }

  items.sort(
    (a, b) =>
      priorityOrder[a.recommendation.priority] - priorityOrder[b.recommendation.priority] ||
      a.vaccine.name.en.localeCompare(b.vaccine.name.en),
  );

  const recordedCount = items.filter((item) => item.status === 'recorded').length;
  return {
    scenarioList,
    items,
    recordedCount,
    neededCount: items.length - recordedCount,
  };
}
