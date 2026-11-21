export type LifeStageKey =
  | 'all'
  | 'infant'
  | 'toddler'
  | 'child'
  | 'adolescent'
  | 'adult'
  | 'midlife'
  | 'senior'
  | 'special';

export type ProgrammeScope = 'all' | 'epi' | 'recommended' | 'special';

export interface LifespanVaccineItem {
  id: string;
  doseLabel: { en: string; bn: string };
  programme: 'epi' | 'recommended' | 'special';
  note: { en: string; bn: string };
}

export interface LifespanMilestone {
  id: string;
  stage: Exclude<LifeStageKey, 'all'>;
  /** Minimum age in days (`null` for event/travel/pregnancy milestones). */
  ageDays: number | null;
  /** Exact calendar months for month-based milestones (6m, 9m, 12m, 15m). */
  ageMonths?: number;
  /** Upper age bound in days for highlighting current-age applicability. */
  maxAgeDays?: number;
  age: { en: string; bn: string };
  stageLabel: { en: string; bn: string };
  summary: { en: string; bn: string };
  vaccines: LifespanVaccineItem[];
}

export const LIFE_STAGE_OPTIONS: ReadonlyArray<{
  key: LifeStageKey;
  labelKey: string;
  ageBand: { en: string; bn: string };
}> = [
  { key: 'all', labelKey: 'schedule.stage.all', ageBand: { en: 'Birth–65+ yrs', bn: 'জন্ম–৬৫+ বছর' } },
  { key: 'infant', labelKey: 'schedule.stage.infant', ageBand: { en: '0–12 mo', bn: '০–১২ মাস' } },
  { key: 'toddler', labelKey: 'schedule.stage.toddler', ageBand: { en: '1–3 yrs', bn: '১–৩ বছর' } },
  { key: 'child', labelKey: 'schedule.stage.child', ageBand: { en: '4–6 yrs', bn: '৪–৬ বছর' } },
  { key: 'adolescent', labelKey: 'schedule.stage.adolescent', ageBand: { en: '9–18 yrs', bn: '৯–১৮ বছর' } },
  { key: 'adult', labelKey: 'schedule.stage.adult', ageBand: { en: '19–49 yrs', bn: '১৯–৪৯ বছর' } },
  { key: 'midlife', labelKey: 'schedule.stage.midlife', ageBand: { en: '50–64 yrs', bn: '৫০–৬৪ বছর' } },
  { key: 'senior', labelKey: 'schedule.stage.senior', ageBand: { en: '65+ yrs', bn: '৬৫+ বছর' } },
  { key: 'special', labelKey: 'schedule.stage.special', ageBand: { en: 'Pregnancy & Travel', bn: 'গর্ভাবস্থা ও ভ্রমণ' } },
];

export const lifespanSchedule: LifespanMilestone[] = [
  {
    id: 'at-birth',
    stage: 'infant',
    ageDays: 0,
    maxAgeDays: 28,
    age: { en: 'At Birth (0–14 days)', bn: 'জন্মের সময় (০–১৪ দিন)' },
    stageLabel: { en: 'Newborn', bn: 'নবজাতক' },
    summary: {
      en: 'Immediate neonatal tuberculosis and polio protection under Bangladesh EPI, plus WHO birth-dose Hepatitis B within 24 hours.',
      bn: 'বাংলাদেশ ইপিআই অনুযায়ী জন্মের সাথে সাথে যক্ষ্মা ও পোলিও সুরক্ষা এবং ২৪ ঘণ্টার মধ্যে জন্মকালীন হেপাটাইটিস-বি ডোজ।',
    },
    vaccines: [
      {
        id: 'bcg',
        doseLabel: { en: 'BCG', bn: 'বিসিজি' },
        programme: 'epi',
        note: { en: 'EPI · 1 intradermal dose at birth', bn: 'ইপিআই · জন্মের সময় ১ ডোজ (ID)' },
      },
      {
        id: 'opv',
        doseLabel: { en: 'OPV-0', bn: 'ওপিভি-০' },
        programme: 'epi',
        note: { en: 'EPI · 2 oral drops (<14 days)', bn: 'ইপিআই · মুখে ২ ফোঁটা (<১৪ দিন)' },
      },
      {
        id: 'hepatitisB',
        doseLabel: { en: 'HepB Birth Dose', bn: 'হেপ-বি জন্ম ডোজ' },
        programme: 'recommended',
        note: { en: 'Hospital/WHO · within 24 hours of birth', bn: 'WHO সুপারিশ · জন্মের ২৪ ঘণ্টার মধ্যে' },
      },
      {
        id: 'rsv-nirsevimab',
        doseLabel: { en: 'Nirsevimab (RSV mAb)', bn: 'নীরসেভিমাব (RSV সুরক্ষা)' },
        programme: 'special',
        note: { en: 'Optional <8 mo if mother unvaccinated', bn: 'ঐচ্ছিক · মা টিকা না নিলে নবজাতকের জন্য' },
      },
    ],
  },
  {
    id: '6-weeks',
    stage: 'infant',
    ageDays: 42,
    maxAgeDays: 69,
    age: { en: '6 Weeks', bn: '৬ সপ্তাহ' },
    stageLabel: { en: 'Early Infancy', bn: 'প্রাথমিক শৈশব' },
    summary: {
      en: 'First primary infant EPI visit protecting against 7 serious infections, plus fractional IPV-1 and optional oral Rotavirus-1.',
      bn: '৭টি মারাত্মক রোগ প্রতিরোধে প্রথম শিশু ইপিআই ভিজিট, সাথে fIPV-1 ও ঐচ্ছিক রোটাভাইরাস-১।',
    },
    vaccines: [
      {
        id: 'pentavalent',
        doseLabel: { en: 'Pentavalent-1', bn: 'পেন্টাভ্যালেন্ট-১' },
        programme: 'epi',
        note: { en: 'EPI · DPT + HepB + Hib (1st dose)', bn: 'ইপিআই · ডিপিটি + হেপ-বি + হিব (১ম)' },
      },
      {
        id: 'opv',
        doseLabel: { en: 'OPV-1', bn: 'ওপিভি-১' },
        programme: 'epi',
        note: { en: 'EPI · Oral polio dose 1', bn: 'ইপিআই · মুখে পোলিও ১ম ডোজ' },
      },
      {
        id: 'pcv',
        doseLabel: { en: 'PCV-1', bn: 'পিসিভি-১' },
        programme: 'epi',
        note: { en: 'EPI · Pneumococcal 1st dose', bn: 'ইপিআই · নিউমোকক্কাল ১ম ডোজ' },
      },
      {
        id: 'fipv',
        doseLabel: { en: 'fIPV-1', bn: 'এফআইপিভি-১' },
        programme: 'epi',
        note: { en: 'EPI · Fractional IPV intradermal', bn: 'ইপিআই · ফ্র্যাকশনাল আইপিভি (ID)' },
      },
      {
        id: 'rotavirus',
        doseLabel: { en: 'Rotavirus-1', bn: 'রোটাভাইরাস-১' },
        programme: 'recommended',
        note: { en: 'Oral · initiate before 15 weeks', bn: 'মুখে · ১৫ সপ্তাহ বয়সের আগে শুরু' },
      },
    ],
  },
  {
    id: '10-weeks',
    stage: 'infant',
    ageDays: 70,
    maxAgeDays: 97,
    age: { en: '10 Weeks', bn: '১০ সপ্তাহ' },
    stageLabel: { en: 'Early Infancy', bn: 'প্রাথমিক শৈশব' },
    summary: {
      en: 'Second primary EPI visit maintaining the strict minimum 4-week spacing after the 6-week doses.',
      bn: '৬ সপ্তাহের ডোজের ৪ সপ্তাহ পর দ্বিতীয় প্রাথমিক ইপিআই ভিজিট।',
    },
    vaccines: [
      {
        id: 'pentavalent',
        doseLabel: { en: 'Pentavalent-2', bn: 'পেন্টাভ্যালেন্ট-২' },
        programme: 'epi',
        note: { en: 'EPI · 2nd primary dose', bn: 'ইপিআই · ২য় প্রাথমিক ডোজ' },
      },
      {
        id: 'opv',
        doseLabel: { en: 'OPV-2', bn: 'ওপিভি-২' },
        programme: 'epi',
        note: { en: 'EPI · Oral polio dose 2', bn: 'ইপিআই · মুখে পোলিও ২য় ডোজ' },
      },
      {
        id: 'pcv',
        doseLabel: { en: 'PCV-2', bn: 'পিসিভি-২' },
        programme: 'epi',
        note: { en: 'EPI · Pneumococcal 2nd dose', bn: 'ইপিআই · নিউমোকক্কাল ২য় ডোজ' },
      },
      {
        id: 'rotavirus',
        doseLabel: { en: 'Rotavirus-2', bn: 'রোটাভাইরাস-২' },
        programme: 'recommended',
        note: { en: 'Completes 2-dose Rotarix or 2nd of RV5', bn: 'রোটারিক্সের ২য়/শেষ বা RV5-এর ২য় ডোজ' },
      },
    ],
  },
  {
    id: '14-weeks',
    stage: 'infant',
    ageDays: 98,
    maxAgeDays: 179,
    age: { en: '14 Weeks', bn: '১৪ সপ্তাহ' },
    stageLabel: { en: 'Primary Completion', bn: 'প্রাথমিক সিরিজ সমাপ্তি' },
    summary: {
      en: 'Completes the primary infant DTP-HepB-Hib, PCV, OPV, and fractional IPV type-2 polio series.',
      bn: 'শিশুর প্রাথমিক পেন্টাভ্যালেন্ট, পিসিভি, ওপিভি এবং দ্বিতীয় fIPV সিরিজ সম্পন্ন করে।',
    },
    vaccines: [
      {
        id: 'pentavalent',
        doseLabel: { en: 'Pentavalent-3', bn: 'পেন্টাভ্যালেন্ট-৩' },
        programme: 'epi',
        note: { en: 'EPI · 3rd primary dose', bn: 'ইপিআই · ৩য় প্রাথমিক ডোজ' },
      },
      {
        id: 'opv',
        doseLabel: { en: 'OPV-3', bn: 'ওপিভি-৩' },
        programme: 'epi',
        note: { en: 'EPI · Oral polio dose 3', bn: 'ইপিআই · মুখে পোলিও ৩য় ডোজ' },
      },
      {
        id: 'pcv',
        doseLabel: { en: 'PCV-3', bn: 'পিসিভি-৩' },
        programme: 'epi',
        note: { en: 'EPI · Pneumococcal 3rd dose', bn: 'ইপিআই · নিউমোকক্কাল ৩য় ডোজ' },
      },
      {
        id: 'fipv',
        doseLabel: { en: 'fIPV-2', bn: 'এফআইপিভি-২' },
        programme: 'epi',
        note: { en: 'EPI · 2nd fractional IPV', bn: 'ইপিআই · ২য় ফ্র্যাকশনাল আইপিভি' },
      },
      {
        id: 'rotavirus-rotateq',
        doseLabel: { en: 'Rotavirus-3 (if RV5/Rotavac)', bn: 'রোটাভাইরাস-৩ (RV5/রোটাভ্যাক)' },
        programme: 'recommended',
        note: { en: '3rd dose only for 3-dose oral brands', bn: 'শুধু ৩-ডোজের ব্র্যান্ডের ক্ষেত্রে' },
      },
    ],
  },
  {
    id: '6-months',
    stage: 'infant',
    ageDays: 180,
    ageMonths: 6,
    maxAgeDays: 269,
    age: { en: '6 Months', bn: '৬ মাস' },
    stageLabel: { en: 'Mid-Infancy', bn: 'মধ্য-শৈশব' },
    summary: {
      en: 'Earliest age for annual seasonal influenza (two priming doses 4 weeks apart in the first season) and high-risk infant protection.',
      bn: 'বার্ষিক মৌসুমি ফ্লু শুরু করার সর্বনিম্ন বয়স (প্রথম মৌসুমে ৪ সপ্তাহ ব্যবধানে ২ ডোজ)।',
    },
    vaccines: [
      {
        id: 'influenza',
        doseLabel: { en: 'Seasonal Influenza (Annual)', bn: 'মৌসুমি ফ্লু (বার্ষিক)' },
        programme: 'recommended',
        note: { en: '2 priming doses 4 wks apart in year 1', bn: 'প্রথম বছরে ৪ সপ্তাহ ব্যবধানে ২ ডোজ' },
      },
      {
        id: 'covid19',
        doseLabel: { en: 'COVID-19 (High-Risk Infants)', bn: 'কোভিড-১৯ (উচ্চ ঝুঁকিপূর্ণ শিশু)' },
        programme: 'special',
        note: { en: 'Pediatric mRNA if severely immunocompromised', bn: 'গুরুতর ঝুঁকিপূর্ণ শিশুর জন্য চিকিৎসকের পরামর্শে' },
      },
    ],
  },
  {
    id: '9-months',
    stage: 'infant',
    ageDays: 270,
    ageMonths: 9,
    maxAgeDays: 364,
    age: { en: '9 Months', bn: '৯ মাস' },
    stageLabel: { en: 'Late Infancy', bn: '৯ মাস ধাপ' },
    summary: {
      en: 'First Measles-Rubella (MR-1) dose as maternal antibodies wane, plus Japanese Encephalitis in endemic areas.',
      bn: 'মায়ের অ্যান্টিবডি কমে আসায় প্রথম হাম-রুবেলা (MR-1) এবং ঝুঁকিপূর্ণ এলাকায় জাপানিজ এনকেফালাইটিস।',
    },
    vaccines: [
      {
        id: 'mr',
        doseLabel: { en: 'MR-1', bn: 'এমআর-১' },
        programme: 'epi',
        note: { en: 'EPI · Measles & Rubella 1st dose', bn: 'ইপিআই · হাম ও রুবেলা ১ম ডোজ' },
      },
      {
        id: 'je',
        doseLabel: { en: 'Japanese Encephalitis', bn: 'জাপানিজ এনকেফালাইটিস' },
        programme: 'recommended',
        note: { en: 'Endemic rural districts (8–9+ months)', bn: 'এন্ডেমিক গ্রামীণ এলাকায় (৮–৯+ মাস)' },
      },
      {
        id: 'meningococcal-acwy',
        doseLabel: { en: 'Meningococcal ACWY (High-Risk)', bn: 'মেনিনগোকক্কাল ACWY (ঝুঁকিপূর্ণ)' },
        programme: 'special',
        note: { en: 'Asplenia, complement deficiency, or travel', bn: 'প্লীহাহীনতা বা ভ্রমণ ঝুঁকিতে' },
      },
    ],
  },
  {
    id: '12-months',
    stage: 'toddler',
    ageDays: 365,
    ageMonths: 12,
    maxAgeDays: 449,
    age: { en: '12 Months (1 Year)', bn: '১২ মাস (১ বছর)' },
    stageLabel: { en: 'Early Toddler', bn: 'প্রাথমিক টডলার' },
    summary: {
      en: 'First-year private/recommended pediatric immunizations: Varicella-1, Hepatitis A-1, MMR, and Cholera OCV if indicated.',
      bn: '১ বছর বয়সে সুপারিশকৃত শিশু টিকা: জলবসন্ত-১, হেপাটাইটিস এ-১, এমএমআর এবং প্রয়োজনে কলেরা।',
    },
    vaccines: [
      {
        id: 'varicella',
        doseLabel: { en: 'Varicella-1 (Chickenpox)', bn: 'ভ্যারিসেলা-১ (জলবসন্ত)' },
        programme: 'recommended',
        note: { en: '1st dose at 12–15 months', bn: '১২–১৫ মাসে ১ম ডোজ' },
      },
      {
        id: 'hepatitisA',
        doseLabel: { en: 'Hepatitis A-1', bn: 'হেপাটাইটিস এ-১' },
        programme: 'recommended',
        note: { en: '1st dose (2nd dose 6–12 mo later)', bn: '১ম ডোজ (৬–১২ মাস পর ২য় ডোজ)' },
      },
      {
        id: 'pcv13',
        doseLabel: { en: 'PCV13 Booster (if private 3+1)', bn: 'পিসিভি-১৩ বুস্টার (বেসরকারি সূচি)' },
        programme: 'recommended',
        note: { en: 'Toddler booster at 12–15 months', bn: '১২–১৫ মাসে বুস্টার ডোজ' },
      },
      {
        id: 'cholera',
        doseLabel: { en: 'Oral Cholera OCV (1+ yr)', bn: 'ওরাল কলেরা টিকা (১+ বছর)' },
        programme: 'special',
        note: { en: '2 oral doses 14 days apart in outbreak zones', bn: 'প্রাদুর্ভাব এলাকায় ১৪ দিন ব্যবধানে ২ ডোজ' },
      },
    ],
  },
  {
    id: '15-18-months',
    stage: 'toddler',
    ageDays: 450,
    ageMonths: 15,
    maxAgeDays: 1459,
    age: { en: '15–18 Months', bn: '১৫–১৮ মাস' },
    stageLabel: { en: 'Toddler Milestone', bn: 'টডলার ধাপ' },
    summary: {
      en: 'Bangladesh EPI MR-2 + single-dose Typhoid Conjugate Vaccine (TCV) at 15 months, followed by Pentavalent/DTaP & HepA boosters at 18 months.',
      bn: '১৫ মাসে ইপিআই MR-2 ও টাইফয়েড কনজুগেট (TCV) এবং ১৮ মাসে পেন্টাভ্যালেন্ট/DTaP ও হেপ-এ বুস্টার।',
    },
    vaccines: [
      {
        id: 'mr',
        doseLabel: { en: 'MR-2', bn: 'এমআর-২' },
        programme: 'epi',
        note: { en: 'EPI · 15 months lifelong 2nd dose', bn: 'ইপিআই · ১৫ মাসে ২য় ডোজ' },
      },
      {
        id: 'tcv',
        doseLabel: { en: 'TCV (Typhoid Conjugate)', bn: 'টিসিভি (টাইফয়েড কনজুগেট)' },
        programme: 'epi',
        note: { en: 'EPI · Single dose at 15 months', bn: 'ইপিআই · ১৫ মাসে একক ডোজ' },
      },
      {
        id: 'pentavalent-booster',
        doseLabel: { en: 'DTP/Pentavalent Booster', bn: 'ডিটিপি/পেন্টাভ্যালেন্ট বুস্টার' },
        programme: 'recommended',
        note: { en: 'Pediatric booster at 15–18 months', bn: '১৫–১৮ মাসে বুস্টার ডোজ' },
      },
      {
        id: 'hepatitisA',
        doseLabel: { en: 'Hepatitis A-2', bn: 'হেপাটাইটিস এ-২' },
        programme: 'recommended',
        note: { en: '6–12 months after Dose 1', bn: '১ম ডোজের ৬–১২ মাস পর' },
      },
    ],
  },
  {
    id: '4-6-years',
    stage: 'child',
    ageDays: 1460,
    maxAgeDays: 3284,
    age: { en: '4–6 Years (School Entry)', bn: '৪–৬ বছর (স্কুলে ভর্তি)' },
    stageLabel: { en: 'Preschool & Early Child', bn: 'প্রাক-প্রাথমিক শিশু' },
    summary: {
      en: 'Pre-school booster window strengthening Diphtheria, Tetanus, Pertussis, Polio, MMR, and Chickenpox immunity before primary school.',
      bn: 'প্রাথমিক বিদ্যালয়ে ভর্তির আগে ডিফথেরিয়া, টিটেনাস, পার্টুসিস, পোলিও, এমএমআর ও জলবসন্ত বুস্টার।',
    },
    vaccines: [
      {
        id: 'dtap',
        doseLabel: { en: 'DTaP / DTP Booster', bn: 'ডিট্যাপ / ডিটিপি বুস্টার' },
        programme: 'recommended',
        note: { en: '5th preschool booster (4–6 years)', bn: '৪–৬ বছরে ৫ম প্রিস্কুল বুস্টার' },
      },
      {
        id: 'polio-ipv',
        doseLabel: { en: 'IPV Preschool Booster', bn: 'আইপিভি প্রিস্কুল বুস্টার' },
        programme: 'recommended',
        note: { en: 'Inactivated polio booster (4–6 years)', bn: '৪–৬ বছরে নিষ্ক্রিয় পোলিও বুস্টার' },
      },
      {
        id: 'mmr',
        doseLabel: { en: 'MMR-2', bn: 'এমএমআর-২' },
        programme: 'recommended',
        note: { en: 'If private MMR chosen over MR-2', bn: 'বেসরকারি MMR সূচি অনুসরণ করলে ২য় ডোজ' },
      },
      {
        id: 'varicella',
        doseLabel: { en: 'Varicella-2', bn: 'ভ্যারিসেলা-২' },
        programme: 'recommended',
        note: { en: '2nd lifetime dose for >98% protection', bn: '৯৮%+ সুরক্ষার জন্য ২য় ডোজ' },
      },
      {
        id: 'influenza',
        doseLabel: { en: 'Annual Influenza', bn: 'বার্ষিক ফ্লু টিকা' },
        programme: 'recommended',
        note: { en: '1 dose every flu season', bn: 'প্রতি বছর ১ ডোজ' },
      },
    ],
  },
  {
    id: '9-14-years',
    stage: 'adolescent',
    ageDays: 3285,
    maxAgeDays: 5474,
    age: { en: '9–14 Years (Pre-Teen)', bn: '৯–১৪ বছর (কিশোর-কিশোরী)' },
    stageLabel: { en: 'Pre-Teen & Early Teen', bn: 'প্রাক-কৈশোর' },
    summary: {
      en: 'Bangladesh EPI HPV vaccination for girls (ages 10–14), adolescent Tdap booster, Meningococcal ACWY, and Dengue/Typhoid catch-up.',
      bn: 'বাংলাদেশ ইপিআই-এর এইচপিভি টিকা (১০–১৪ বছর কিশোরী), টিড্যাপ বুস্টার ও মেনিনগোকক্কাল সুরক্ষা।',
    },
    vaccines: [
      {
        id: 'hpv',
        doseLabel: { en: 'HPV (EPI Girls 10–14 yrs)', bn: 'এইচপিভি (ইপিআই ১০–১৪ বছর কিশোরী)' },
        programme: 'epi',
        note: { en: 'EPI · 1 dose (Grades 5–9 & out-of-school)', bn: 'ইপিআই · ১ ডোজ (৫ম–৯ম শ্রেণি)' },
      },
      {
        id: 'hpv-9valent',
        doseLabel: { en: 'HPV 9-Valent (2 doses)', bn: 'এইচপিভি ৯-ভ্যালেন্ট (২ ডোজ)' },
        programme: 'recommended',
        note: { en: 'Private option for girls & boys (0, 6–12 mo)', bn: 'ছেলে ও মেয়েদের জন্য (০ ও ৬–১২ মাস)' },
      },
      {
        id: 'tdap',
        doseLabel: { en: 'Tdap Booster (11–12 yrs)', bn: 'টিড্যাপ বুস্টার (১১–১২ বছর)' },
        programme: 'recommended',
        note: { en: 'Adolescent pertussis-diphtheria-tetanus booster', bn: 'কৈশোরকালীন পার্টুসিস-টিটেনাস বুস্টার' },
      },
      {
        id: 'meningococcal-acwy',
        doseLabel: { en: 'Meningococcal ACWY-1', bn: 'মেনিনগোকক্কাল ACWY-১' },
        programme: 'recommended',
        note: { en: 'Ages 11–12 yrs (or hostel/boarding)', bn: '১১–১২ বছর বা হোস্টেলে থাকলে' },
      },
      {
        id: 'tcv',
        doseLabel: { en: 'TCV Catch-Up (<15 yrs)', bn: 'টিসিভি ক্যাচ-আপ (<১৫ বছর)' },
        programme: 'recommended',
        note: { en: 'Single dose if missed at 15 months', bn: '১৫ মাসে না নিলে ১ ডোজ ক্যাচ-আপ' },
      },
    ],
  },
  {
    id: '15-18-years',
    stage: 'adolescent',
    ageDays: 5475,
    maxAgeDays: 6934,
    age: { en: '15–18 Years (Older Teen)', bn: '১৫–১৮ বছর (উচ্চ-কৈশোর)' },
    stageLabel: { en: 'Late Adolescent', bn: 'কৈশোরোত্তর ধাপ' },
    summary: {
      en: 'Bangladesh EPI 5-dose TT series start at age 15 for females, Meningococcal booster before university/dorms, and Dengue/flu coverage.',
      bn: '১৫ বছর বয়সে নারীদের ৫-ডোজ টিটি (TT) সূচির শুরু, বিশ্ববিদ্যালয়/হোস্টেলের আগে মেনিনগোকক্কাল বুস্টার।',
    },
    vaccines: [
      {
        id: 'tt',
        doseLabel: { en: 'TT-1 / Td (Females 15+ yrs)', bn: 'টিটি-১ / টিডি (১৫+ বছর নারী)' },
        programme: 'epi',
        note: { en: 'EPI · Start of 5-dose maternal protection series', bn: 'ইপিআই · ৫-ডোজ টিটেনাস সূচির ১ম ডোজ' },
      },
      {
        id: 'meningococcal-acwy',
        doseLabel: { en: 'Meningococcal ACWY Booster', bn: 'মেনিনগোকক্কাল ACWY বুস্টার' },
        programme: 'recommended',
        note: { en: 'Age 16 booster (or 1st dose before college)', bn: '১৬ বছরে বুস্টার বা বিশ্ববিদ্যালয়ের আগে' },
      },
      {
        id: 'meningococcal-b',
        doseLabel: { en: 'Meningococcal B (Dorm/Study Abroad)', bn: 'মেনিনগোকক্কাল বি (হোস্টেল/বিদেশে পড়া)' },
        programme: 'special',
        note: { en: '2 doses for dormitories & UK/US/EU study', bn: 'হোস্টেল ও বিদেশে উচ্চশিক্ষার জন্য ২ ডোজ' },
      },
      {
        id: 'dengue',
        doseLabel: { en: 'Dengue (Qdenga · 4–60 yrs)', bn: 'ডেঙ্গু (কিউডেঙ্গা · ৪–৬০ বছর)' },
        programme: 'special',
        note: { en: 'Where licensed · 2 doses (0 & 3 mo)', bn: 'অনুমোদিত স্থানে · ০ ও ৩ মাসে ২ ডোজ' },
      },
    ],
  },
  {
    id: '19-49-years',
    stage: 'adult',
    ageDays: 6935,
    maxAgeDays: 18249,
    age: { en: '19–49 Years (Adults)', bn: '১৯–৪৯ বছর (প্রাপ্তবয়স্ক)' },
    stageLabel: { en: 'Young & Mid-Life Adult', bn: 'প্রাপ্তবয়স্ক ধাপ' },
    summary: {
      en: 'Ten-year Td/Tdap boosters, annual flu, updated COVID-19, adult Hepatitis B screening/3-dose catch-up, and non-immune MMR/Varicella.',
      bn: 'প্রতি ১০ বছরে টিডি/টিড্যাপ বুস্টার, বার্ষিক ফ্লু, কোভিড-১৯ এবং অসংক্রমিত প্রাপ্তবয়স্কদের হেপ-বি ও এমএমআর/জলবসন্ত।',
    },
    vaccines: [
      {
        id: 'tdap',
        doseLabel: { en: 'Tdap / Td (Every 10 Years)', bn: 'টিড্যাপ / টিডি (প্রতি ১০ বছরে)' },
        programme: 'recommended',
        note: { en: '1 Tdap then Td/Tdap booster q10 years', bn: '১টি টিড্যাপ, এরপর প্রতি ১০ বছরে বুস্টার' },
      },
      {
        id: 'influenza',
        doseLabel: { en: 'Seasonal Influenza (Annual)', bn: 'মৌসুমি ফ্লু (প্রতি বছর)' },
        programme: 'recommended',
        note: { en: '1 dose annually · essential for caregivers', bn: 'প্রতি বছর ১ ডোজ' },
      },
      {
        id: 'hepatitis-b-adult',
        doseLabel: { en: 'Hepatitis B (3-Dose Adult Catch-Up)', bn: 'হেপাটাইটিস-বি (৩-ডোজ প্রাপ্তবয়স্ক)' },
        programme: 'recommended',
        note: { en: '0, 1, 6 months if never vaccinated', bn: 'টিকা না থাকলে ০, ১ ও ৬ মাসে ৩ ডোজ' },
      },
      {
        id: 'mmr',
        doseLabel: { en: 'MMR (Adult Catch-Up)', bn: 'এমএমআর (প্রাপ্তবয়স্ক ক্যাচ-আপ)' },
        programme: 'recommended',
        note: { en: '1–2 doses if no childhood immunity record', bn: 'শৈশবের প্রমাণ না থাকলে ১–২ ডোজ' },
      },
      {
        id: 'varicella',
        doseLabel: { en: 'Varicella (2 Adult Doses)', bn: 'ভ্যারিসেলা (প্রাপ্তবয়স্ক ২ ডোজ)' },
        programme: 'recommended',
        note: { en: '4–8 wks apart if never had chickenpox', bn: 'আগে জলবসন্ত না হয়ে থাকলে ৪–৮ সপ্তাহ ব্যবধানে' },
      },
      {
        id: 'covid19-mrna-updated',
        doseLabel: { en: 'COVID-19 Updated Dose', bn: 'হালনাগাদ কোভিড-১৯ ডোজ' },
        programme: 'recommended',
        note: { en: 'Priority for comorbidities & healthcare staff', bn: 'দীর্ঘস্থায়ী রোগী ও স্বাস্থ্যকর্মীদের অগ্রাধিকার' },
      },
    ],
  },
  {
    id: '50-64-years',
    stage: 'midlife',
    ageDays: 18250,
    maxAgeDays: 23724,
    age: { en: '50–64 Years (Mature Adult)', bn: '৫০–৬৪ বছর (মধ্য-প্রবীণ)' },
    stageLabel: { en: '50+ Preventative Care', bn: '৫০+ প্রতিরোধমূলক ধাপ' },
    summary: {
      en: 'Recombinant Shingles (Shingrix) 2-dose series begins at age 50, alongside annual Flu, 10-year Td/Tdap, HepB up to age 59, and chronic-risk Pneumococcal.',
      bn: '৫০ বছর থেকে ২ ডোজ শিংলস (Shingrix) টিকা, বার্ষিক ফ্লু, ১০-বছর অন্তর টিড্যাপ এবং ঝুঁকি থাকলে নিউমোকক্কাল।',
    },
    vaccines: [
      {
        id: 'shingles',
        doseLabel: { en: 'Shingles / RZV (50+ yrs · 2 doses)', bn: 'শিংলস / RZV (৫০+ বছর · ২ ডোজ)' },
        programme: 'recommended',
        note: { en: '2 doses spaced 2–6 months apart (>90% effective)', bn: '২–৬ মাস ব্যবধানে ২ ডোজ (>৯০% কার্যকর)' },
      },
      {
        id: 'influenza',
        doseLabel: { en: 'Annual Influenza', bn: 'বার্ষিক ফ্লু টিকা' },
        programme: 'recommended',
        note: { en: '1 dose every flu season', bn: 'প্রতি বছর ১ ডোজ' },
      },
      {
        id: 'td-adult',
        doseLabel: { en: 'Td / Tdap Booster', bn: 'টিডি / টিড্যাপ বুস্টার' },
        programme: 'recommended',
        note: { en: 'Every 10 years (or dirty wound >5 yrs)', bn: 'প্রতি ১০ বছরে (ক্ষত হলে ৫+ বছরে)' },
      },
      {
        id: 'pcv20',
        doseLabel: { en: 'PCV20 (if Diabetes/Heart/Lung)', bn: 'পিসিভি-২০ (ডায়াবেটিস/হৃদ/শ্বাসরোগ)' },
        programme: 'special',
        note: { en: 'Single dose for chronic medical conditions', bn: 'দীর্ঘস্থায়ী রোগ থাকলে ১ ডোজ' },
      },
      {
        id: 'hepatitis-b-adult',
        doseLabel: { en: 'Hepatitis B (Ages 19–59)', bn: 'হেপাটাইটিস-বি (১৯–৫৯ বছর)' },
        programme: 'recommended',
        note: { en: 'Universal catch-up through age 59', bn: '৫৯ বছর পর্যন্ত সবার জন্য সুপারিশকৃত' },
      },
      {
        id: 'covid19-mrna-updated',
        doseLabel: { en: 'COVID-19 Seasonal Booster', bn: 'কোভিড-১৯ মৌসুমি বুস্টার' },
        programme: 'recommended',
        note: { en: 'Recommended especially with comorbidities', bn: 'দীর্ঘস্থায়ী রোগীদের জন্য বিশেষভাবে প্রযোজ্য' },
      },
    ],
  },
  {
    id: '65-plus-seniors',
    stage: 'senior',
    ageDays: 23725,
    age: { en: '65+ Years (Seniors)', bn: '৬৫+ বছর (প্রবীণ নাগরিক)' },
    stageLabel: { en: 'Healthy Aging', bn: 'প্রবীণ সুরক্ষা' },
    summary: {
      en: 'Essential senior pneumonia (PCV20 or PCV15+PPSV23), high-dose annual Influenza, RSV adult vaccine, updated COVID-19, and Shingles completion.',
      bn: 'প্রবীণদের নিউমোনিয়া (PCV20), উচ্চ-মাত্রার বার্ষিক ফ্লু, RSV টিকা, কোভিড-১৯ বুস্টার ও শিংলস সম্পূর্ণ করা।',
    },
    vaccines: [
      {
        id: 'pcv20',
        doseLabel: { en: 'PCV20 (or PCV15 + PPSV23)', bn: 'পিসিভি-২০ (বা PCV15 + PPSV23)' },
        programme: 'recommended',
        note: { en: 'Universal single dose at age 65+', bn: '৬৫+ বছরে সবার জন্য একক ডোজ' },
      },
      {
        id: 'influenza-high-dose',
        doseLabel: { en: 'High-Dose / Adjuvanted Flu (65+)', bn: 'উচ্চ-মাত্রার ফ্লু টিকা (৬৫+)' },
        programme: 'recommended',
        note: { en: 'Preferred 4× antigen annual dose for 65+', bn: 'প্রবীণদের জন্য বার্ষিক ১ ডোজ অগ্রাধিকারযোগ্য' },
      },
      {
        id: 'rsv-arexvy',
        doseLabel: { en: 'RSV Senior Vaccine (Arexvy/Abrysvo)', bn: 'আরএসভি প্রবীণ টিকা' },
        programme: 'recommended',
        note: { en: '1 dose for 75+ all & 60–74 high-risk', bn: '৭৫+ সবার ও ৬০–৭৪ ঝুঁকিপূর্ণদের ১ ডোজ' },
      },
      {
        id: 'covid19-mrna-updated',
        doseLabel: { en: 'COVID-19 Senior Booster', bn: 'কোভিড-১৯ প্রবীণ বুস্টার' },
        programme: 'recommended',
        note: { en: 'WHO top-priority group (6–12 mo)', bn: 'WHO অগ্রাধিকার গোষ্ঠী (৬–১২ মাস পরপর)' },
      },
      {
        id: 'shingles',
        doseLabel: { en: 'Shingles / RZV (if not yet given)', bn: 'শিংলস (আগে নেওয়া না থাকলে)' },
        programme: 'recommended',
        note: { en: '2 doses (0 & 2–6 months)', bn: '০ ও ২–৬ মাসে ২ ডোজ' },
      },
      {
        id: 'td-adult',
        doseLabel: { en: 'Td / Tdap (10-Year Booster)', bn: 'টিডি / টিড্যাপ (১০ বছর বুস্টার)' },
        programme: 'recommended',
        note: { en: 'Maintain every 10 years', bn: 'প্রতি ১০ বছর পরপর বজায় রাখুন' },
      },
    ],
  },
  {
    id: 'pregnancy-maternal',
    stage: 'special',
    ageDays: null,
    age: { en: 'Pregnancy (Any Trimester / Every Pregnancy)', bn: 'গর্ভাবস্থা (প্রতি গর্ভধারণে)' },
    stageLabel: { en: 'Maternal & Newborn Shield', bn: 'মা ও নবজাতক সুরক্ষা' },
    summary: {
      en: 'Antenatal vaccines cross the placenta to shield newborns before their first clinic shots: Bangladesh 5-dose TT, Tdap (27–36 wks), Maternal RSV (32–36 wks), Flu & COVID-19.',
      bn: 'গর্ভাবস্থায় নেওয়া টিকা গর্ভফুলের মাধ্যমে নবজাতককে জীবনের প্রথম কয়েক মাস রক্ষা করে: ইপিআই TT, টিড্যাপ (২৭–৩৬ সপ্তাহ), RSV (৩২–৩৬ সপ্তাহ), ফ্লু ও কোভিড-১৯।',
    },
    vaccines: [
      {
        id: 'tt',
        doseLabel: { en: 'TT / Td (BD 5-Dose Schedule)', bn: 'টিটি / টিডি (বাংলাদেশ ৫-ডোজ)' },
        programme: 'epi',
        note: { en: 'EPI · Prevents fatal neonatal tetanus', bn: 'ইপিআই · নবজাতকের টিটেনাস প্রতিরোধে' },
      },
      {
        id: 'tdap',
        doseLabel: { en: 'Tdap (Weeks 27–36, Each Pregnancy)', bn: 'টিড্যাপ (২৭–৩৬ সপ্তাহে প্রতিবার)' },
        programme: 'recommended',
        note: { en: 'Protects infant from whooping cough <2 mo', bn: '২ মাসের নিচে শিশুকে হুপিং কাশি থেকে বাঁচায়' },
      },
      {
        id: 'rsv-pregnancy',
        doseLabel: { en: 'Maternal RSV (Weeks 32–36)', bn: 'গর্ভকালীন RSV (৩২–৩৬ সপ্তাহে)' },
        programme: 'recommended',
        note: { en: 'Single dose · prevents infant RSV ICU stays', bn: '১ ডোজ · নবজাতকের গুরুতর শ্বাসকষ্ট রোধ করে' },
      },
      {
        id: 'influenza',
        doseLabel: { en: 'Seasonal Flu (Any Trimester)', bn: 'মৌসুমি ফ্লু (যেকোনো মাসে)' },
        programme: 'recommended',
        note: { en: 'WHO top maternal priority', bn: 'WHO প্রসূতি অগ্রাধিকার টিকা' },
      },
      {
        id: 'covid19',
        doseLabel: { en: 'COVID-19 (Any Trimester)', bn: 'কোভিড-১৯ (যেকোনো মাসে)' },
        programme: 'recommended',
        note: { en: 'Safe for mother and fetus', bn: 'মা ও অনাগত শিশুর জন্য নিরাপদ' },
      },
    ],
  },
  {
    id: 'travel-hajj-occupational',
    stage: 'special',
    ageDays: null,
    age: { en: 'Hajj, Travel & High-Risk Occupations', bn: 'হজ, বিদেশ ভ্রমণ ও পেশাগত ঝুঁকি' },
    stageLabel: { en: 'Travel & Exposure', bn: 'ভ্রমণ ও বিশেষ ঝুঁকি' },
    summary: {
      en: 'Visa-required Hajj/Umrah Meningococcal ACWY & Polio certificates, Yellow Fever (≥10 days pre-travel), Typhoid, Twinrix, Cholera, and Rabies PrEP for high-risk staff.',
      bn: 'হজ/ওমরাহ-র জন্য বাধ্যতামূলক মেনিনগোকক্কাল ও পোলিও, ইয়েলো ফিভার (ভ্রমণের ১০+ দিন আগে), টাইফয়েড, টুইনরিক্স ও প্রি-এক্সপোজার জলাতঙ্ক টিকা।',
    },
    vaccines: [
      {
        id: 'meningococcal-acwy',
        doseLabel: { en: 'Meningococcal ACWY (Hajj/Umrah)', bn: 'মেনিনগোকক্কাল ACWY (হজ/ওমরাহ)' },
        programme: 'special',
        note: { en: 'Mandatory ≥10 days before Saudi visa travel', bn: 'সৌদি ভিসার অন্তত ১০ দিন আগে বাধ্যতামূলক' },
      },
      {
        id: 'polio-ipv',
        doseLabel: { en: 'Polio IPV/OPV Certificate', bn: 'পোলিও IPV/OPV সার্টিফিকেট' },
        programme: 'special',
        note: { en: '4 wks–12 mo before travel where required', bn: 'আন্তর্জাতিক স্বাস্থ্য বিধিমতো প্রয়োজন হলে' },
      },
      {
        id: 'yellowFever',
        doseLabel: { en: 'Yellow Fever (ICVP Certificate)', bn: 'ইয়েলো ফিভার (হলুদ কার্ড)' },
        programme: 'special',
        note: { en: '1 dose ≥10 days pre-travel (100% lifelong)', bn: 'ভ্রমণের ১০ দিন আগে ১ ডোজ (আজীবন বৈধ)' },
      },
      {
        id: 'typhoid-typbar-tcv',
        doseLabel: { en: 'Typhoid Conjugate (Adult Travel)', bn: 'টাইফয়েড কনজুগেট (ভ্রমণ)' },
        programme: 'special',
        note: { en: '1 dose before South Asia / field travel', bn: 'ভ্রমণ ও খাদ্যকর্মীদের জন্য ১ ডোজ' },
      },
      {
        id: 'hepa-hepb-twinrix',
        doseLabel: { en: 'Twinrix (HepA + HepB)', bn: 'টুইনরিক্স (হেপ-এ + হেপ-বি)' },
        programme: 'special',
        note: { en: '3 doses (0, 1, 6 mo) or rapid travel', bn: '০, ১, ৬ মাসে বা দ্রুত ভ্রমণ সূচিতে' },
      },
      {
        id: 'rabies-preexposure',
        doseLabel: { en: 'Rabies Pre-Exposure (PrEP)', bn: 'জলাতঙ্ক প্রি-এক্সপোজার (PrEP)' },
        programme: 'special',
        note: { en: 'Days 0 & 7 for vets, bikers & cave/field travel', bn: 'দিন ০ ও ৭-এ পশুচিকিৎসক ও ঝুঁকিপূর্ণদের' },
      },
    ],
  },
];

/** Determine which life-stage filter matches a chronological age in years/months/days. */
export function lifeStageForAgeDays(ageDays: number): Exclude<LifeStageKey, 'all' | 'special'> {
  if (ageDays < 365) return 'infant';
  if (ageDays < 1460) return 'toddler';
  if (ageDays < 3285) return 'child';
  if (ageDays < 6935) return 'adolescent';
  if (ageDays < 18250) return 'adult';
  if (ageDays < 23725) return 'midlife';
  return 'senior';
}
