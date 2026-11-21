import type { LocalizedText } from './evidence/types.ts';
import type { Vaccine } from './vaccines.ts';
import { extraVaccineClinicalProfiles } from './vaccineClinicalDetailsExtra.ts';

/**
 * Structured clinical pharmacology, cold-chain, catch-up dosing, and patient
 * aftercare monograph attached to every vaccine entry in TikaTrack.
 */
export interface VaccineClinicalProfile {
  /** Antigen technology / vaccine platform (e.g., Live-attenuated viral, Conjugate, mRNA-LNP). */
  platform: LocalizedText;
  /** Route of administration and preferred anatomical site. */
  route: LocalizedText;
  /** Standard volume or strength per dose. */
  doseVolume: LocalizedText;
  /** WHO cold-chain temperature window, freeze sensitivity & opened-vial handling. */
  coldChain: LocalizedText;
  /** Dosing intervals, boosters, minimum ages & missed-dose catch-up protocol. */
  dosingProtocol: LocalizedText;
  /** Expected seroprotection, onset & duration of immunity. */
  immunityProfile: LocalizedText;
  /** Pregnancy, lactation, prematurity & immunocompromised guidance. */
  specialPopulations: LocalizedText;
  /** Pre-vaccination check & home post-dose management / red flags. */
  aftercare: LocalizedText;
  /** WHO-prequalified / internationally licensed example products. */
  formulations: string;
}

const coreVaccineClinicalProfiles: Record<string, VaccineClinicalProfile> = {
  bcg: {
    platform: {
      en: 'Live-attenuated bacterial vaccine (Mycobacterium bovis BCG strain)',
      bn: 'মৃদু জীবিত ব্যাকটেরিয়াজাত টিকা (Mycobacterium bovis বিসিজি স্ট্রেইন)',
    },
    route: {
      en: 'Intradermal (ID) strictly — outer upper left arm (deltoid insertion)',
      bn: 'ত্বকের ভেতরে (ID) — বাম বাহুর উপরের বাইরের দিকের ডেল্টয়েড অংশে',
    },
    doseVolume: {
      en: '0.05 mL (infants <12 months); 0.1 mL (children ≥12 months & adults)',
      bn: '০.০৫ মি.লি. (<১২ মাস বয়সী শিশু); ০.১ মি.লি. (১২+ মাস শিশু ও প্রাপ্তবয়স্ক)',
    },
    coldChain: {
      en: '+2°C to +8°C (WHO VVM-30); protect freeze-dried & reconstituted vials from sunlight; discard 6 hours after reconstitution',
      bn: '+২°সে থেকে +৮°সে (VVM-30); সূর্যালোক থেকে দূরে রাখুন এবং গুলানোর ৬ ঘণ্টা পর অবশিষ্ট ভায়াল বাতিল করুন',
    },
    dosingProtocol: {
      en: 'Single neonatal dose as soon after birth as possible (Bangladesh EPI: at birth or first contact <1 year). No booster is recommended by WHO.',
      bn: 'জন্মের পরপরই যত দ্রুত সম্ভব ১টি ডোজ (১ বছরের আগে প্রথম সাক্ষাতেও দেওয়া যায়)। কোনো বুস্টার ডোজের প্রয়োজন নেই।',
    },
    immunityProfile: {
      en: '70–80% protection against life-threatening childhood TB meningitis and miliary TB; immunity against adult pulmonary TB is variable (lasts ~10–15 years).',
      bn: 'শিশুদের প্রাণঘাতী টিবি মেনিনজাইটিস ও মিলিয়ারি টিবি থেকে ৭০–৮০% সুরক্ষা দেয় (~১০–১৫ বছর কার্যকর)।',
    },
    specialPopulations: {
      en: 'CONTRAINDICATED in symptomatic HIV-infected children and severe cellular immunodeficiency. Asymptomatic HIV-exposed newborns whose mothers are on ART and clinically well may receive BCG per WHO.',
      bn: 'উপসর্গযুক্ত এইচআইভি বা গুরুতর কোষীয় অনাক্রম্যতা দুর্বলতায় নিষিদ্ধ। সুস্থ মায়ের (ART-তে থাকা) উপসর্গহীন নবজাতককে চিকিৎসকের পরামর্শে দেওয়া যায়।',
    },
    aftercare: {
      en: 'A small 5–8 mm wheal appears immediately; over 2–6 weeks it forms a papule/ulcer that heals into a flat scar by 12 weeks. Keep clean and dry—never squeeze, lance, or apply ointments/bandages.',
      bn: 'ইনজেকশনের ২–৬ সপ্তাহ পর ছোট ঘা বা ফোস্কা হয়ে ৮–১২ সপ্তাহে আপনা-আপনি দাগ পড়ে শুকিয়ে যায়। ক্ষতটি শুকনো ও পরিষ্কার রাখুন—চাপবেন না বা মলম/ব্যান্ডেজ দেবেন না।',
    },
    formulations: 'BCG Freeze-Dried (Serum Institute of India / Japan BCG Laboratory, WHO PQ)',
  },
  opv: {
    platform: {
      en: 'Bivalent live-attenuated oral poliovirus vaccine (bOPV types 1 & 3)',
      bn: 'মৃদু জীবিত বাইভ্যালেন্ট ওরাল পোলিও ভ্যাকসিন (bOPV টাইপ ১ ও ৩)',
    },
    route: {
      en: 'Oral (PO) — 2 drops squeezed directly onto the tongue (avoid dropper touching mouth)',
      bn: 'মুখে খাওয়ার ফোঁটা (PO) — ড্রপার না ছুঁইয়ে সরাসরি জিহ্বায় ২ ফোঁটা',
    },
    doseVolume: {
      en: '0.1 mL (2 oral drops per dose)',
      bn: '০.১ মি.লি. (প্রতি ডোজে ২ ফোঁটা)',
    },
    coldChain: {
      en: '-20°C in central stores; +2°C to +8°C at clinic level; strictly check WHO VVM-2 diamond before every child; open multi-dose vials usable up to 28 days under MDVP',
      bn: 'কেন্দ্রীয়ভাবে -২০°সে ও কেন্দ্রে +২°সে–+৮°সে; প্রতিটি ডোজের আগে অবশ্যই VVM-2 যাচাই করুন; MDVP মেনে খোলা ভায়াল ২৮ দিন ব্যবহার্য',
    },
    dosingProtocol: {
      en: 'Bangladesh EPI: OPV-0 at birth (<14 days preferred), OPV-1 at 6 weeks, OPV-2 at 10 weeks, OPV-3 at 14 weeks (min interval 4 weeks; paired with fIPV at 6 & 14 weeks). Repeat dose if baby vomits/spits within 10 minutes.',
      bn: 'বাংলাদেশ ইপিআই: জন্মের সময় (০–১৪ দিন), ৬, ১০ ও ১৪ সপ্তাহে ৪ ডোজ (সর্বনিম্ন ব্যবধান ৪ সপ্তাহ; ৬ ও ১৪ সপ্তাহে fIPV সহ)। ১০ মিনিটের মধ্যে বমি করলে পুনরায় ২ ফোঁটা দিন।',
    },
    immunityProfile: {
      en: 'Builds strong humoral PLUS intestinal mucosal (IgA) immunity, interrupting person-to-person poliovirus shedding; >95% protection after full series.',
      bn: 'রক্তের পাশাপাশি অন্ত্রে মিউকোসাল IgA সুরক্ষা তৈরি করে, ফলে পোলিও ভাইরাস ছড়ানোও বন্ধ হয় (>৯৫% কার্যকর)।',
    },
    specialPopulations: {
      en: 'Safe for premature infants and breastfeeding newborns (no fasting required). Use IPV/fIPV instead of OPV in infants with primary immunodeficiency or household contacts with severe immunosuppression.',
      bn: 'অকালজাত ও বুকের দুধ খাওয়া নবজাতকের জন্য নিরাপদ (খাওয়ার আগে-পরে অপেক্ষা লাগে না)। গুরুতর রোগপ্রতিরোধ ঘাটতিতে OPV-এর বদলে IPV দিন।',
    },
    aftercare: {
      en: 'Normal feeding can resume immediately. Practice good handwashing after diaper changes during the first 2 weeks.',
      bn: 'ডোজের পরপরই শিশুকে স্বাভাবিক বুকের দুধ খাওয়ানো যাবে; প্রথম ২ সপ্তাহ ডায়াপার পাল্টানোর পর হাত ধুয়ে নিন।',
    },
    formulations: 'bOPV 1&3 (Bio Farma / Sanofi / Bharat Biotech, WHO PQ)',
  },
  pentavalent: {
    platform: {
      en: '5-in-1 Liquid combination: Diphtheria & Tetanus toxoids, whole-cell Pertussis (wP), recombinant HBsAg & Hib conjugate',
      bn: '৫-ইন-১ সমন্বিত তরল: ডিফথেরিয়া-টিটেনাস টক্সয়েড, হোল-সেল পার্টুসিস (wP), হেপ-বি ও হিব কনজুগেট',
    },
    route: {
      en: 'Intramuscular (IM) — anterolateral aspect of the mid-thigh (left/right side per EPI chart)',
      bn: 'মাংসপেশিতে (IM) — শিশুর উরুর মাঝখানের বাইরের দিকের পেশী',
    },
    doseVolume: {
      en: '0.5 mL single ready-to-use liquid dose (NEVER freeze)',
      bn: '০.৫ মি.লি. ব্যবহারের জন্য প্রস্তুত তরল (কখনোই ফ্রিজ করবেন না)',
    },
    coldChain: {
      en: '+2°C to +8°C strictly; NEVER freeze (perform Shake Test if freeze exposure suspected); open 10-dose vials usable up to 28 days under WHO MDVP',
      bn: '+২°সে থেকে +৮°সে; কখনোই ফ্রিজ করবেন না (সন্দেহ হলে শেক টেস্ট করুন); WHO MDVP অনুযায়ী খোলা ভায়াল ২৮ দিন ব্যবহার্য',
    },
    dosingProtocol: {
      en: 'Bangladesh EPI: 3 doses at 6, 10, and 14 weeks of age (minimum age 6 weeks; minimum interval 4 weeks). If delayed, resume the remaining doses without ever restarting from Dose 1.',
      bn: 'বাংলাদেশ ইপিআই: ৬, ১০ ও ১৪ সপ্তাহে ৩ ডোজ (সর্বনিম্ন ব্যবধান ৪ সপ্তাহ)। কোনো ডোজ দেরি হলেও নতুন করে শুরু না করে বাকি ডোজগুলো পূর্ণ করুন।',
    },
    immunityProfile: {
      en: '85–95% protection against diphtheria, tetanus, pertussis, chronic hepatitis B, and invasive Hib pneumonia/meningitis; boosters reinforce waning pertussis/tetanus.',
      bn: 'ডিফথেরিয়া, টিটেনাস, হুপিং কাশি, হেপাটাইটিস বি ও হিব মেনিনজাইটিস থেকে ৮৫–৯৫% সুরক্ষা প্রদান করে।',
    },
    specialPopulations: {
      en: 'Do NOT use whole-cell Pentavalent if child is ≥7 years (switch to Td) or had anaphylaxis / unexplained encephalopathy within 7 days of prior dose (defer pertussis and use DT/HepB/Hib).',
      bn: '৭+ বছর বয়সী শিশুর জন্য প্রযোজ্য নয় (Td দিন)। আগের ডোজে অ্যানাফাইল্যাক্সিস বা এনকেফালোপ্যাথি হলে পার্টুসিস বাদ দিয়ে চিকিৎসকের পরামর্শ নিন।',
    },
    aftercare: {
      en: 'Mild thigh soreness, swelling, and low-to-moderate fever within 24–48 hours are normal responses to whole-cell pertussis. Give weight-appropriate paracetamol drops ONLY if fever causes discomfort.',
      bn: 'টিকার ২৪–৪৮ ঘণ্টার মধ্যে জ্বর ও উরুতে ব্যথা স্বাভাবিক (হোল-সেল পার্টুসিসের সাধারণ প্রতিক্রিয়া)। অস্বস্তি হলে চিকিৎসকের নির্ধারিত মাত্রায় প্যারাসিটামল ড্রপ দিন; নিতম্বে বা উরুতে মালিশ করবেন না।',
    },
    formulations: 'Eupenta / Pentavac / Shan5 / Quinvaxem (WHO PQ)',
  },
  pcv: {
    platform: {
      en: '10-valent Pneumococcal polysaccharide–protein conjugate vaccine (PCV10)',
      bn: '১০-ভ্যালেন্ট নিউমোকক্কাল পলিস্যাকারাইড–প্রোটিন কনজুগেট টিকা (PCV10)',
    },
    route: {
      en: 'Intramuscular (IM) — anterolateral aspect of opposite thigh from Pentavalent',
      bn: 'মাংসপেশিতে (IM) — পেন্টাভ্যালেন্টের বিপরীত উরুর বাইরের দিকের পেশী',
    },
    doseVolume: {
      en: '0.5 mL liquid dose',
      bn: '০.৫ মি.লি. তরল ডোজ',
    },
    coldChain: {
      en: '+2°C to +8°C; strictly freeze-sensitive (NEVER freeze; VVM-30); check product MDVP applicability',
      bn: '+২°সে থেকে +৮°সে; ফ্রিজ-সংবেদনশীল (কখনোই জমাবেন না)',
    },
    dosingProtocol: {
      en: 'Bangladesh EPI: 3 doses at 6, 10, and 14 weeks (or 2+1 schedule: 6 wks, 14 wks, 9 mo depending on DGHS circular). Minimum 4-week gap between infant primary doses.',
      bn: 'বাংলাদেশ ইপিআই: ৬, ১০ ও ১৪ সপ্তাহে ৩ ডোজ (ন্যূনতম ৪ সপ্তাহ ব্যবধান; কিছু ক্ষেত্রে ৬, ১৪ সপ্তাহ ও ৯ মাসে)।',
    },
    immunityProfile: {
      en: '75–88% efficacy against vaccine-type invasive pneumococcal disease (pneumonia, meningitis, bacteremia) and significantly lowers pediatric acute otitis media.',
      bn: 'শিশুদের গুরুতর নিউমোকক্কাল নিউমোনিয়া, মেনিনজাইটিস ও রক্ত-সংক্রমণ ৭৫–৮৮% পর্যন্ত প্রতিরোধ করে।',
    },
    specialPopulations: {
      en: 'Safe for premature babies, underweight infants, HIV+ children, and sickle cell / nephrotic syndrome patients (children ≥2 yrs with high-risk conditions may also benefit from PPSV23 later).',
      bn: 'কম ওজনের বা অকালজাত শিশু, এইচআইভি+ ও কিডনি/সিকল সেল রোগী শিশুদের জন্য সম্পূর্ণ নিরাপদ ও অত্যন্ত জরুরি।',
    },
    aftercare: {
      en: 'Temporary leg tenderness or mild fever resolves in 1–2 days; avoid massaging or putting warm poultices on the injection bump.',
      bn: 'পায়ে সামান্য ব্যথা বা জ্বর ১–২ দিনে কমে; ইনজেকশনের স্থানে মালিশ বা গরম সেঁক দেবেন না।',
    },
    formulations: 'Synflorix (GSK, WHO PQ), Pneumosil (Serum Institute, WHO PQ PCV10)',
  },
  tcv: {
    platform: {
      en: 'Typhoid Vi capsular polysaccharide conjugated to tetanus toxoid (Vi-TT) / CRM197',
      bn: 'টাইফয়েড Vi পলিস্যাকারাইড–টিটেনাস টক্সয়েড কনজুগেট টিকা (Vi-TT)',
    },
    route: {
      en: 'Intramuscular (IM) — anterolateral thigh (<2 yrs) or deltoid (≥2 yrs)',
      bn: 'মাংসপেশিতে (IM) — উরুর বাইরের দিক (<২ বছর) বা বাহুর ডেল্টয়েড',
    },
    doseVolume: {
      en: '0.5 mL single injection (25 µg Vi polysaccharide)',
      bn: '০.৫ মি.লি. একক ইনজেকশন (২৫ মাইক্রোগ্রাম Vi)',
    },
    coldChain: {
      en: '+2°C to +8°C; NEVER freeze; protect from light; VVM-30 stable',
      bn: '+২°সে থেকে +৮°সে; ফ্রিজ করবেন না; আলো থেকে দূরে রাখুন',
    },
    dosingProtocol: {
      en: 'Bangladesh EPI (effective 2026): Single dose at 15 months alongside MR-2 (different limb). Catch-up campaign covers children aged 9 months–15 years. No routine booster currently required by WHO.',
      bn: 'বাংলাদেশ ইপিআই: ১৫ মাস বয়সে MR-2 টিকার সাথে (ভিন্ন স্থানে) একক ডোজ; ক্যাম্পেইনে ৯ মাস–১৫ বছর পর্যন্ত। বর্তমানে বুস্টারের প্রয়োজন নেই।',
    },
    immunityProfile: {
      en: '80–85% efficacy against blood-culture-confirmed Salmonella Typhi (including multidrug-resistant & XDR typhoid), maintaining strong immunity for ≥5 years.',
      bn: 'রক্ত-কালচার নিশ্চিত টাইফয়েডের (এমনকি ওষুধ-প্রতিরোধী XDR টাইফয়েড) বিরুদ্ধে ৮০–৮৫% সুরক্ষা দেয়, যা কমপক্ষে ৫+ বছর স্থায়ী।',
    },
    specialPopulations: {
      en: 'Safe from 6 months of age, in HIV+ children, and alongside MR, JE, or yellow fever vaccines; defer briefly only during high acute fever >38.5°C.',
      bn: '৬ মাস বয়স থেকে, এইচআইভি আক্রান্ত শিশুতে ও MR টিকার সাথে একসাথে নিরাপদ; তীব্র জ্বর থাকলে সেরে ওঠা পর্যন্ত অপেক্ষা করুন।',
    },
    aftercare: {
      en: 'Mild arm/thigh soreness or low-grade fever settles within 24–48 hours. Still ensure safe boiled/filtered drinking water and handwashing.',
      bn: '২৪–৪৮ ঘণ্টায় হালকা জ্বর বা ব্যথা সেরে যায়। টিকার পাশাপাশি নিরাপদ পানি পান ও হাত ধোয়া বজায় রাখুন।',
    },
    formulations: 'Typbar-TCV (Bharat Biotech, WHO PQ), TYPHIBEV (Biological E, WHO PQ)',
  },
  mr: {
    platform: {
      en: 'Live-attenuated bivalent Measles (Edmonston-Zagreb) + Rubella (RA 27/3) viral vaccine',
      bn: 'মৃদু জীবিত বাইভ্যালেন্ট হাম (এডমনস্টন-জাগ্রেব) ও রুবেলা (RA 27/3) ভাইরাস টিকা',
    },
    route: {
      en: 'Subcutaneous (SC) — upper outer arm (deltoid) or anterolateral thigh',
      bn: 'চামড়ার নিচে (SC) — বাহুর উপরিভাগের বাইরের দিক বা উরুতে',
    },
    doseVolume: {
      en: '0.5 mL freshly reconstituted with manufacturer sterile diluent ONLY',
      bn: '০.৫ মি.লি. শুধুমাত্র নির্ধারিত জীবাণুমুক্ত ডাইলুয়েন্টে মিশ্রিত',
    },
    coldChain: {
      en: '+2°C to +8°C (chill diluent to same temp before mixing to prevent thermal shock); protect from light; discard 6 hours after reconstitution',
      bn: '+২°সে থেকে +৮°সে (মেশানোর আগে ডাইলুয়েন্ট ঠান্ডা রাখুন); আলো থেকে দূরে রাখুন এবং গুলানোর ৬ ঘণ্টা পর অবশিষ্ট ফেলে দিন',
    },
    dosingProtocol: {
      en: 'Bangladesh EPI: Dose 1 (MR-1) at 9 months (completed 270 days); Dose 2 (MR-2) at 15 months. Catch-up: any child <15 yrs missing doses gets 2 doses at least 4 weeks apart.',
      bn: 'বাংলাদেশ ইপিআই: ৯ মাসে ১ম ডোজ (MR-1) এবং ১৫ মাসে ২য় ডোজ (MR-2)। মিস হলে ১৫ বছর বয়স পর্যন্ত অন্তত ৪ সপ্তাহ ব্যবধানে ২ ডোজ সম্পন্ন করা যায়।',
    },
    immunityProfile: {
      en: '~85% immunity after MR-1 rising to ≥97% lifelong protection for both measles and rubella after MR-2.',
      bn: '১ম ডোজে ~৮৫% এবং ২য় ডোজের পর হাম ও রুবেলা উভয়ের বিরুদ্ধে ≥৯৭% আজীবন সুরক্ষা গড়ে ওঠে।',
    },
    specialPopulations: {
      en: 'CONTRAINDICATED in pregnancy (avoid pregnancy for 28 days after vaccination) and severe cellular immunodeficiency. Safe during breastfeeding and in mildly ill or malnourished children.',
      bn: 'গর্ভাবস্থায় ও গুরুতর অনাক্রম্যতা দুর্বলতায় নিষিদ্ধ (টিকার পর ২৮ দিন গর্ভধারণ থেকে বিরত থাকুন)। স্তন্যদান ও অপুষ্ট শিশুর ক্ষেত্রে নিরাপদ।',
    },
    aftercare: {
      en: 'Delayed low-grade fever or faint transient rash 7–12 days post-injection is a normal immune sign and not contagious. Keep child hydrated.',
      bn: 'টিকার ৭–১২ দিন পর হালকা জ্বর বা র‍্যাশ স্বাভাবিক রোগপ্রতিরোধ প্রতিক্রিয়া এবং ছোঁয়াচে নয়; শিশুকে তরল খাবার দিন।',
    },
    formulations: 'MR Vaccine Live Attenuated (Serum Institute of India, WHO PQ)',
  },
  covid19: {
    platform: {
      en: 'mRNA-LNP (Pfizer/Moderna), Viral-Vector (ChAdOx1), or Inactivated Whole-Virion (Sinopharm/Sinovac)',
      bn: 'mRNA-লিপিড (ফাইজার/মডার্না), ভাইরাল-ভেক্টর (অ্যাস্ট্রাজেনেকা) বা নিষ্ক্রিয় হোল-ভিরিয়ন (সিনোফার্ম)',
    },
    route: {
      en: 'Intramuscular (IM) — deltoid muscle',
      bn: 'মাংসপেশিতে (IM) — বাহুর ডেল্টয়েড পেশী',
    },
    doseVolume: {
      en: 'Product-specific: 0.3 mL (Comirnaty) or 0.5 mL (Moderna / AstraZeneca / Sinopharm)',
      bn: 'ব্র্যান্ডভেদে ০.৩ মি.লি. (ফাইজার) বা ০.৫ মি.লি. (মডার্না / অ্যাস্ট্রাজেনেকা / সিনোফার্ম)',
    },
    coldChain: {
      en: 'Inactivated/Vector: +2°C to +8°C; mRNA: ultra-cold (-90°C to -60°C or -20°C) then +2°C to +8°C up to 4–10 weeks thawed (never refreeze)',
      bn: 'সিনোফার্ম/অ্যাস্ট্রাজেনেকা: +২°সে–+৮°সে; mRNA: -৯০°সে থেকে -৬০°সে সংরক্ষণের পর গলিয়ে +২°সে–+৮°সে-এ সীমিত সময় ব্যবহার্য',
    },
    dosingProtocol: {
      en: 'Primary series (1–2 doses, 3–8 weeks apart depending on platform) + booster 6 months later; WHO SAGE 2023–2026 prioritizes annual updated doses for ≥65 yrs, pregnancy, comorbidities & health workers.',
      bn: 'প্রাথমিক ১–২ ডোজ (৩–৮ সপ্তাহ ব্যবধান) ও ৬ মাস পর বুস্টার। WHO-এর বর্তমান পরামর্শ অনুযায়ী ৬৫+ প্রবীণ, গর্ভবতী, দীর্ঘস্থায়ী রোগী ও স্বাস্থ্যকর্মীদের জন্য নিয়মিত আপডেটেড ডোজ অগ্রাধিকারযোগ্য।',
    },
    immunityProfile: {
      en: '85–95% effectiveness against severe disease, ICU admission, and death across original & evolving SARS-CoV-2 variants (infection protection wanes over 4–6 months).',
      bn: 'গুরুতর অসুস্থতা, আইসিইউ ভর্তি ও মৃত্যু প্রতিরোধে ৮৫–৯৫% কার্যকর।',
    },
    specialPopulations: {
      en: 'WHO strongly recommends vaccination in pregnancy (high risk of severe maternal COVID-19 and protects newborn); safe during lactation; avoid specific product if PEG/polysorbate anaphylaxis.',
      bn: 'গর্ভাবস্থায় ও স্তন্যদানকালে নিরাপদ এবং মা ও নবজাতকের সুরক্ষায় বিশেষভাবে সুপারিশকৃত।',
    },
    aftercare: {
      en: 'Wait 15 minutes at the clinic after injection. Rest and hydrate if mild fever, myalgia, or headache lasts 24–48h; evaluate promptly for chest pain/dyspnea within 7 days after mRNA.',
      bn: 'টিকার পর ১৫ মিনিট কেন্দ্রে অপেক্ষা করুন। হালকা জ্বর বা শরীর ব্যথা ১–২ দিনে কমে যায়; বিরল বুক ব্যথা বা শ্বাসকষ্ট হলে দ্রুত ডাক্তার দেখান।',
    },
    formulations: 'Comirnaty (Pfizer), Spikevax (Moderna), BBIBP-CorV (Sinopharm), CoronaVac, Covishield',
  },
  fipv: {
    platform: {
      en: 'Inactivated trivalent Poliovirus vaccine (types 1, 2, 3) given in 1/5 fractional dose',
      bn: 'নিষ্ক্রিয় ট্রাইভ্যালেন্ট পোলিও ভ্যাকসিন (টাইপ ১, ২, ৩)—এক-পঞ্চমাংশ ফ্র্যাকশনাল ডোজ',
    },
    route: {
      en: 'Intradermal (ID) strictly — upper outer right arm (deltoid) using 0.1 mL auto-disable syringe',
      bn: 'ত্বকের ভেতরে (ID) — ডান বাহুর উপরের বাইরের দিকের ডেল্টয়েড অংশে (০.১ মি.লি. সিরিঞ্জ)',
    },
    doseVolume: {
      en: '0.1 mL (one-fifth of full 0.5 mL IM IPV dose; must raise a visible 5–8 mm pale bleb)',
      bn: '০.১ মি.লি. (পূর্ণ ডোজের ১/৫ ভাগ; ত্বকের নিচে ৫–৮ মি.মি. ফোলা ভাব তৈরি হবে)',
    },
    coldChain: {
      en: '+2°C to +8°C; strictly NEVER freeze; open multi-dose vials usable up to 28 days under MDVP (check VVM)',
      bn: '+২°সে থেকে +৮°সে; কখনোই ফ্রিজ করবেন না; খোলা ভায়াল WHO MDVP মেনে ২৮ দিন ব্যবহার্য',
    },
    dosingProtocol: {
      en: 'Bangladesh EPI: 2 fractional intradermal doses at 6 weeks and 14 weeks (8-week minimum interval) alongside OPV doses. Equal immunogenicity to 1 full IM IPV while stretching global IPV supply 5×.',
      bn: 'বাংলাদেশ ইপিআই: ৬ সপ্তাহ এবং ১৪ সপ্তাহে ২টি ডোজ (৮ সপ্তাহ ব্যবধান)। পূর্ণ ১ ডোজ IM IPV-এর সমান টাইপ-২ সুরক্ষা প্রদান করে।',
    },
    immunityProfile: {
      en: 'Closes the type-2 immunity gap created after global tOPV-to-bOPV switch; 2 fIPV doses induce >90% seroconversion against all 3 poliovirus types.',
      bn: 'bOPV-তে রূপান্তরের পর টাইপ-২ পোলিওর সুরক্ষার ঘাটতি পূরণ করে এবং ৩টি টাইপের বিরুদ্ধেই >৯০% অ্যান্টিবডি তৈরি করে।',
    },
    specialPopulations: {
      en: 'Safe for immunocompromised, HIV-infected, and preterm infants (contains NO live virus—zero VAPP risk).',
      bn: 'নিষ্ক্রিয় টিকা হওয়ায় দুর্বল রোগপ্রতিরোধ, এইচআইভি ও অকালজাত শিশুর জন্য ১০০% নিরাপদ (VAPP-র কোনো ঝুঁকি নেই)।',
    },
    aftercare: {
      en: 'The small pale intradermal bleb flattens within 15–30 minutes—do NOT rub or cover with cotton/bandage.',
      bn: 'ত্বকের ওপরের ছোট ফোলা দাগ ১৫–৩০ মিনিটে মিলিয়ে যায়—ঘষবেন না বা তুলা-পট্টি বাঁধবেন না।',
    },
    formulations: 'WHO PQ Bilthoven / Sanofi / Panacea / Serum Institute IPV (fractional ID use)',
  },
  hpv: {
    platform: {
      en: 'Non-infectious recombinant L1 virus-like particle (VLP) vaccine (EPI Bangladesh bivalent/quadrivalent)',
      bn: 'অ-সংক্রামক রিকম্বিন্যান্ট L1 ভাইরাস-সদৃশ কণা টিকা (বাংলাদেশ ইপিআই এইচপিভি)',
    },
    route: {
      en: 'Intramuscular (IM) — deltoid muscle of upper arm',
      bn: 'মাংসপেশিতে (IM) — বাহুর উপরিভাগের ডেল্টয়েড পেশী',
    },
    doseVolume: {
      en: '0.5 mL single-dose vial/syringe',
      bn: '০.৫ মি.লি. একক ডোজ',
    },
    coldChain: {
      en: '+2°C to +8°C; protect from light; NEVER freeze',
      bn: '+২°সে থেকে +৮°সে; আলো থেকে দূরে রাখুন; ফ্রিজ করবেন না',
    },
    dosingProtocol: {
      en: 'Bangladesh EPI single-dose strategy: 1 dose for girls aged 10–14 years (Grades 5–9 in schools and out-of-school girls via Upazila EPI). Girls ≥15 yrs or immunocompromised need 2–3 doses.',
      bn: 'বাংলাদেশ ইপিআই: ১০–১৪ বছরের কিশোরীদের (৫ম–৯ম শ্রেণি ও স্কুল-বহির্ভূত) জন্য ১ ডোজ। ১৫+ বছর বা দুর্বল রোগপ্রতিরোধে ২–৩ ডোজ প্রয়োজন।',
    },
    immunityProfile: {
      en: 'WHO SAGE confirmed a single dose in 9–14 year girls produces >90–95% durable protection against HPV-16/18 persistent infection and cervical cancer precursors.',
      bn: 'WHO প্রমাণ করেছে ৯–১৪ বছরে ১ ডোজই HPV-16/18 সংক্রমণ ও জরায়ুমুখ ক্যানসারের পূর্বাবস্থা থেকে >৯০–৯৫% দীর্ঘস্থায়ী সুরক্ষা দেয়।',
    },
    specialPopulations: {
      en: 'Defer during pregnancy; safe during breastfeeding; HIV-positive girls require 2 or 3 doses (at 0 & 6 months).',
      bn: 'গর্ভবতী অবস্থায় স্থগিত রাখুন; স্তন্যদানে নিরাপদ; এইচআইভি পজিটিভ কিশোরীদের ২–৩ ডোজ প্রয়োজন।',
    },
    aftercare: {
      en: 'Sit or lie down for 15 minutes after shot to prevent adolescent vasovagal fainting; mild arm ache clears within 2 days.',
      bn: 'মাথা ঘোরা এড়াতে টিকার পর ১৫ মিনিট বসে বিশ্রাম নিন; হাতে হালকা ব্যথা ১–২ দিনে ভালো হয়ে যায়।',
    },
    formulations: 'Cecolin (Innovax), Cervarix (GSK), Gardasil (MSD, WHO PQ)',
  },
  tt: {
    platform: {
      en: 'Adsorbed Tetanus Toxoid / Tetanus–reduced Diphtheria Toxoid (WHO recommends Td over single TT)',
      bn: 'অ্যাডজর্বড টিটেনাস টক্সয়েড / টিটেনাস-ডিফথেরিয়া টক্সয়েড (WHO একক TT-র বদলে Td সুপারিশ করে)',
    },
    route: {
      en: 'Intramuscular (IM) — deltoid muscle',
      bn: 'মাংসপেশিতে (IM) — বাহুর ডেল্টয়েড পেশী',
    },
    doseVolume: {
      en: '0.5 mL per dose (shake vial well before drawing)',
      bn: 'প্রতি ডোজ ০.৫ মি.লি. (নেওয়ার আগে ভায়াল ভালোভাবে ঝাঁকান)',
    },
    coldChain: {
      en: '+2°C to +8°C; strictly NEVER freeze (freeze-damaged toxoid causes sterile abscesses); MDVP usable 28 days',
      bn: '+২°সে থেকে +৮°সে; কখনোই জমাবেন না (জমে গেলে জীবাণুবিহীন ফোঁড়া হতে পারে); খোলা ভায়াল ২৮ দিন ব্যবহার্য',
    },
    dosingProtocol: {
      en: '5-dose Bangladesh EPI female schedule (15–49 yrs): TT1 at age 15 (or 1st pregnancy), TT2 ≥4 wks later, TT3 ≥6 mo, TT4 ≥1 yr, TT5 ≥1 yr (confers lifelong ~30+ yr protection; no repeat needed in future pregnancies).',
      bn: 'বাংলাদেশ ইপিআই ৫-ডোজ নারী সূচি: TT1 ১৫ বছর বয়সে বা গর্ভবতী হলে, TT2 ৪ সপ্তাহ পর, TT3 ৬ মাস পর, TT4 ১ বছর পর, TT5 আরও ১ বছর পর—৫ ডোজে আজীবন সুরক্ষা।',
    },
    immunityProfile: {
      en: '95–100% effective; maternal IgG crosses placenta to protect newborns against fatal neonatal tetanus during delivery & cord care.',
      bn: '৯৫–১০০% কার্যকর; মায়ের শরীর থেকে গর্ভফুলের মাধ্যমে নবজাতককে প্রসবকালীন ও নাভির টিটেনাস থেকে রক্ষা করে।',
    },
    specialPopulations: {
      en: 'Safe in ALL trimesters of pregnancy and during lactation; avoid in rare anaphylaxis or Arthus-type hypersensitivity to prior toxoid (<5 yrs booster overload).',
      bn: 'গর্ভাবস্থার যেকোনো সময় ও স্তন্যদানে সম্পূর্ণ নিরাপদ।',
    },
    aftercare: {
      en: 'Keep EPI woman vaccination card safely for life so unnecessary repeat doses are avoided in subsequent pregnancies.',
      bn: 'মহিলাদের টিটেনাস কার্ড সারাজীবন সংরক্ষণ করুন যাতে পরবর্তী গর্ভধারণে অপ্রয়োজনীয় অতিরিক্ত ডোজ না লাগে।',
    },
    formulations: 'WHO PQ Adsorbed TT / Td (Serum Institute / Biological E / Essential Drugs BD)',
  },
  rotavirus: {
    platform: {
      en: 'Live-attenuated oral rotavirus vaccine (G1P[8] RV1 or pentavalent RV5 / 116E)',
      bn: 'মৃদু জীবিত মুখে খাওয়ার রোটাভাইরাস টিকা (RV1 / RV5 / 116E)',
    },
    route: {
      en: 'Oral (PO) — liquid administered inside cheek (strictly non-injectable)',
      bn: 'মুখে খাওয়ার তরল (PO) — গালের ভেতরে দেওয়া হয় (ইনজেকশন নয়)',
    },
    doseVolume: {
      en: '1.5 mL (Rotarix), 2.0 mL (RotaTeq), or 0.5 mL (Rotavac 5D)',
      bn: '১.৫ মি.লি. (রোটারিক্স), ২.০ মি.লি. (রোটাটেক) বা ০.৫ মি.লি. (রোটাভ্যাক 5D)',
    },
    coldChain: {
      en: '+2°C to +8°C; NEVER freeze; protect from light',
      bn: '+২°সে থেকে +৮°সে; ফ্রিজ করবেন না; আলো থেকে দূরে রাখুন',
    },
    dosingProtocol: {
      en: '2 doses (6 & 10 wks for RV1) or 3 doses (6, 10, 14 wks for RV5/Rotavac). Initiate between 6 and 15 weeks of age; complete full series before 24–32 weeks (do NOT start late catch-up in older infants due to intussusception safety monitoring).',
      bn: '৬ ও ১০ সপ্তাহে ২ ডোজ (RV1) বা ৬, ১০, ১৪ সপ্তাহে ৩ ডোজ (RV5/রোটাভ্যাক)। ১ম ডোজ ১৫ সপ্তাহের আগে এবং শেষ ডোজ ২৪–৩২ সপ্তাহের আগেই সম্পন্ন করুন।',
    },
    immunityProfile: {
      en: '85–95% effective against severe dehydrating rotavirus diarrhea and hospitalization during the first 2 years of life.',
      bn: 'জীবনের প্রথম ২ বছরে তীব্র পানিশূন্যতা সৃষ্টিকারী রোটাভাইরাস ডায়রিয়া ও হাসপাতালে ভর্তি ৮৫–৯৫% প্রতিরোধ করে।',
    },
    specialPopulations: {
      en: 'CONTRAINDICATED in SCID, prior intussusception, and uncorrected congenital GI anomaly; safe for preterm infants ≥6 weeks old and breastfed infants.',
      bn: 'SCID রোগ, পূর্বে ইন্টাসাসসেপশন বা অন্ত্রের জন্মগত ত্রুটিতে নিষিদ্ধ; ৬ সপ্তাহ+ অকালজাত ও বুকের দুধ খাওয়া শিশুর জন্য নিরাপদ।',
    },
    aftercare: {
      en: 'Alert doctor urgently for severe episodic crying with leg pulling, bilious vomiting, or bloody stool within 1–2 weeks after vaccination.',
      bn: 'টিকার ১–২ সপ্তাহের মধ্যে হঠাৎ তীব্র কান্না-পেটব্যথা, সবুজ বমি বা রক্তমিশ্রিত পায়খানা হলে দ্রুত হাসপাতালে নিন।',
    },
    formulations: 'Rotarix (GSK), RotaTeq (MSD), Rotavac 5D (Bharat Biotech, WHO PQ)',
  },
  cholera: {
    platform: {
      en: 'WHO-prequalified Killed Whole-Cell Oral Cholera Vaccine (OCV: Euvichol-Plus / Shanchol / Euvichol-S)',
      bn: 'WHO-অনুমোদিত নিষ্ক্রিয় হোল-সেল মুখে খাওয়ার কলেরা টিকা (OCV)',
    },
    route: {
      en: 'Oral (PO) — single-dose tube/vial swallowed directly (followed by clean water)',
      bn: 'মুখে খাওয়ার তরল (PO) — সরাসরি গিলে পান করতে হয়',
    },
    doseVolume: {
      en: '1.5 mL oral liquid',
      bn: '১.৫ মি.লি. মুখে খাওয়ার তরল',
    },
    coldChain: {
      en: '+2°C to +8°C; NEVER freeze; VVM-14 supports temporary controlled temperature chain (CTC) campaigns',
      bn: '+২°সে থেকে +৮°সে; ফ্রিজ করবেন না; VVM-14 ক্যাম্পেইনে স্বল্পমেয়াদী তাপমাত্রা সহনশীল',
    },
    dosingProtocol: {
      en: 'Ages ≥1 year: 2 oral doses spaced 14 days (up to 6 weeks) apart; in acute outbreaks during supply constraints, 1 emergency dose provides immediate short-term protection (icddr,b / DGHS campaigns in Dhaka & Cox’s Bazar).',
      bn: '১+ বছর বয়সীদের ১৪ দিন ব্যবধানে ২ ডোজ; সংকট বা জরুরি প্রাদুর্ভাবে ১ ডোজও তাৎক্ষণিক সুরক্ষা দেয় (ঢাকা ও কক্সবাজার ক্যাম্পেইনে ব্যবহৃত)।',
    },
    immunityProfile: {
      en: '65–85% protection against severe dehydrating Vibrio cholerae O1/O139 cholera for 2–3 years.',
      bn: 'গুরুতর কলেরার বিরুদ্ধে ২–৩ বছর পর্যন্ত ৬৫–৮৫% সুরক্ষা দেয়।',
    },
    specialPopulations: {
      en: 'Safe in pregnancy, breastfeeding, malnourished children ≥1 yr, and HIV-infected individuals (non-living bacteria).',
      bn: 'গর্ভাবস্থা, স্তন্যদান, অপুষ্ট শিশু (১+ বছর) ও এইচআইভি আক্রান্তদের জন্য সম্পূর্ণ নিরাপদ।',
    },
    aftercare: {
      en: 'Mild transient loose stool or nausea may occur rarely; always keep ORS packets accessible during monsoon flood seasons.',
      bn: 'বিরল ক্ষেত্রে হালকা বমিভাব হতে পারে; বর্ষা ও বন্যার মৌসুমে ঘরে ওরস্যালাইন (ORS) ও বিশুদ্ধ পানির ব্যবস্থা রাখুন।',
    },
    formulations: 'Euvichol-Plus / Euvichol-S (EuBiologics), Shanchol (Sanofi, WHO PQ)',
  },
  je: {
    platform: {
      en: 'Live-attenuated SA14-14-2 (WHO PQ) or Inactivated Vero-cell Japanese Encephalitis virus vaccine',
      bn: 'মৃদু জীবিত SA14-14-2 অথবা নিষ্ক্রিয় ভেরো-সেল জাপানিজ এনকেফালাইটিস টিকা',
    },
    route: {
      en: 'Subcutaneous (SC, live CD.JEVAX) or Intramuscular (IM, IMOJEV / Ixiaro)',
      bn: 'চামড়ার নিচে (SC, লাইভ) অথবা মাংসপেশিতে (IM)',
    },
    doseVolume: {
      en: '0.5 mL (pediatric Ixiaro <3 yrs = 0.25 mL)',
      bn: '০.৫ মি.লি. (৩ বছরের নিচে নিষ্ক্রিয় ফর্মুলায় ০.২৫ মি.লি.)',
    },
    coldChain: {
      en: '+2°C to +8°C; protect from light; NEVER freeze',
      bn: '+২°সে থেকে +৮°সে; আলো থেকে দূরে রাখুন; ফ্রিজ করবেন না',
    },
    dosingProtocol: {
      en: 'Live SA14-14-2 (EPI target in endemic Asian programmes like Rajshahi/Rangpur JE pilot): 1 dose from 8–9 months (optional booster 1–2 yrs later). Inactivated Ixiaro: 2 doses Day 0 & Day 28.',
      bn: 'লাইভ SA14-14-2: ৮–৯ মাস থেকে ১ ডোজ (এশীয় ইপিআই সূচিতে ১টি ডোজই দীর্ঘ সুরক্ষা দেয়)। নিষ্ক্রিয় Ixiaro: ০ ও ২৮ দিনে ২ ডোজ।',
    },
    immunityProfile: {
      en: '95–99% protective efficacy against mosquito-borne JE viral encephalitis—a disease with ~30% fatality and permanent brain injury in half of survivors.',
      bn: 'মশাবাহিত জাপানিজ এনকেফালাইটিসের বিরুদ্ধে ৯৫–৯৯% সুরক্ষা দেয় (এ রোগে ~৩০% মৃত্যু ও স্থায়ী স্নায়ুক্ষতি হতে পারে)।',
    },
    specialPopulations: {
      en: 'Use inactivated (Ixiaro) rather than live JE vaccines in severely immunocompromised patients and pregnant women unless outbreak exposure is extreme.',
      bn: 'গর্ভবতী ও দুর্বল রোগপ্রতিরোধের ব্যক্তিদের লাইভের বদলে নিষ্ক্রিয় (Ixiaro) টিকা চিকিৎসকের পরামর্শে বিবেচনা করুন।',
    },
    aftercare: {
      en: 'Pair vaccination with evening mosquito coils/nets around rice paddies and pig-farming areas during peak monsoon months.',
      bn: 'বর্ষা মৌসুমে ধানক্ষেত ও গ্রামাঞ্চলে সন্ধ্যায় মশারি ব্যবহার অব্যাহত রাখুন।',
    },
    formulations: 'CD.JEVAX (Chengdu Institute, WHO PQ), IMOJEV (Sanofi), Ixiaro (Valneva)',
  },
  influenza: {
    platform: {
      en: 'Inactivated split-virion or subunit quadrivalent/trivalent seasonal influenza vaccine (Northern/Southern strain update)',
      bn: 'নিষ্ক্রিয় স্প্লিট-ভিরিয়ন বা সাবইউনিট মৌসুমি ফ্লু টিকা (বার্ষিক হালনাগাদকৃত)',
    },
    route: {
      en: 'Intramuscular (IM) — anterolateral thigh (6–35 mo) or deltoid (≥3 yrs)',
      bn: 'মাংসপেশিতে (IM) — উরু (৬–৩৫ মাস) বা বাহুর ডেল্টয়েড (৩+ বছর)',
    },
    doseVolume: {
      en: '0.5 mL standard quadrivalent syringe (or 0.25 mL in select pediatric labels for 6–35 mo)',
      bn: '০.৫ মি.লি. (কিছু শিশু ফর্মুলেশনে ৬–৩৫ মাসে ০.২৫ মি.লি.)',
    },
    coldChain: {
      en: '+2°C to +8°C; NEVER freeze; protect from light',
      bn: '+২°সে থেকে +৮°সে; ফ্রিজ করবেন না; আলো থেকে দূরে রাখুন',
    },
    dosingProtocol: {
      en: 'Annual single IM dose starting from 6 months of age. First-time pediatric recipients aged 6 months–8 years require 2 doses ≥4 weeks apart in their initial season; ≥9 years always need 1 dose annually.',
      bn: '৬ মাস বয়স থেকে প্রতি বছর ১ ডোজ। তবে ৬ মাস–৮ বছর বয়সী প্রথমবার ফ্লু টিকা নিলে ৪ সপ্তাহ ব্যবধানে ২ ডোজ প্রয়োজন; ৯+ বছরে প্রতি বছর ১ ডোজ।',
    },
    immunityProfile: {
      en: '40–70% efficacy against symptomatic flu and ~50–75% reduction in severe flu pneumonia, ICU stay, and cardiovascular events (requires annual update due to antigenic drift).',
      bn: 'উপসর্গযুক্ত ফ্লু ৪০–৭০% এবং গুরুতর নিউমোনিয়া বা আইসিইউ ভর্তি ৫০–৭৫% কমায়; ভাইরাস বদলানোর কারণে প্রতি বছর নিতে হয়।',
    },
    specialPopulations: {
      en: 'WHO #1 priority groups: pregnant women (any trimester—protects mother & newborn <6 mo), healthcare workers, adults ≥65 yrs, children 6–59 mo, and asthma/diabetes/cardiac patients. Safe even in egg allergy.',
      bn: 'গর্ভবতী নারী (যেকোনো সময়), স্বাস্থ্যকর্মী, ৬৫+ প্রবীণ, হাঁপানি/ডায়াবেটিস/হৃদরোগী ও ছোট শিশুদের জন্য অগ্রাধিকারযোগ্য; ডিমে অ্যালার্জি থাকলেও নিরাপদ।',
    },
    aftercare: {
      en: 'Inactivated flu shots cannot cause flu; mild arm ache or 24-hour low fever resolves spontaneously.',
      bn: 'নিষ্ক্রিয় টিকা থেকে কখনো ফ্লু হয় না; হাতে হালকা ব্যথা ১–২ দিনে কমে যায়।',
    },
    formulations: 'VaxigripTetra (Sanofi, WHO PQ), Influvac Tetra (Abbott), Fluarix Tetra (GSK)',
  },
  varicella: {
    platform: {
      en: 'Live-attenuated Oka-strain Varicella-Zoster Virus (chickenpox) vaccine',
      bn: 'মৃদু জীবিত ওকা-স্ট্রেইন ভ্যারিসেলা (জলবসন্ত) ভাইরাস টিকা',
    },
    route: {
      en: 'Subcutaneous (SC) — upper arm or thigh (do NOT inject intradermally)',
      bn: 'চামড়ার নিচে (SC) — বাহুর উপরিভাগ বা উরুতে',
    },
    doseVolume: {
      en: '0.5 mL freshly reconstituted; use within 30 minutes of mixing',
      bn: '০.৫ মি.লি. মিশ্রণের ৩০ মিনিটের মধ্যে ব্যবহার্য',
    },
    coldChain: {
      en: '+2°C to +8°C (refrigerator-stable products like Varilrix/Varivax) or -15°C frozen; protect from light',
      bn: '+২°সে থেকে +৮°সে (অথবা পণ্যভেদে -১৫°সে); আলো থেকে দূরে রাখুন',
    },
    dosingProtocol: {
      en: '2 doses for ≥98% lifelong protection: Dose 1 at 12–15 months, Dose 2 at 4–6 years (min interval: 3 months for children <13 yrs; 4–8 weeks for ≥13 yrs). Can also serve as PEP within 3–5 days of exposure.',
      bn: 'পূর্ণ সুরক্ষায় ২ ডোজ: ১ম ডোজ ১২–১৫ মাস এবং ২য় ডোজ ৪–৬ বছর (১৩ বছরের কমে ন্যূনতম ব্যবধান ৩ মাস; ১৩+ বয়সে ৪–৮ সপ্তাহ)। সংস্পর্শের ৩–৫ দিনের মধ্যে জরুরি PEP হিসেবেও কার্যকর।',
    },
    immunityProfile: {
      en: '~85% protection after 1 dose; ≥98% against any varicella and ~100% against severe hemorrhagic/bacterial superinfected varicella after 2 doses.',
      bn: '১ ডোজে ~৮৫% এবং ২ ডোজে যেকোনো জলবসন্ত থেকে ≥৯৮% ও মারাত্মক জটিলতা থেকে প্রায় ১০০% সুরক্ষা।',
    },
    specialPopulations: {
      en: 'CONTRAINDICATED in pregnancy (wait 1 month post-dose before conceiving), severe immunodeficiency, and neomycin/gelatin anaphylaxis; safe for breastfeeding mothers; avoid aspirin for 6 weeks post-dose.',
      bn: 'গর্ভাবস্থা (টিকার পর ১ মাস গর্ভধারণ এড়ান), গুরুতর রোগপ্রতিরোধ ঘাটতি ও নিওমাইসিন অ্যালার্জিতে নিষিদ্ধ; স্তন্যদানে নিরাপদ; ৬ সপ্তাহ অ্যাসপিরিন এড়িয়ে চলুন।',
    },
    aftercare: {
      en: '5% of recipients develop 2–5 mild localized papules 1–3 weeks later; cover any lesions around immunocompromised household members.',
      bn: 'কদাচিৎ ১–৩ সপ্তাহ পর ইনজেকশনের স্থানে ২–৫টি ছোট ফোস্কা উঠতে পারে—দুর্বল রোগীর সংস্পর্শ এড়াতে তা ঢেকে রাখুন।',
    },
    formulations: 'Varivax (MSD), Varilrix (GSK, WHO PQ), Biken / Sinovac Varicella',
  },
  hepatitisA: {
    platform: {
      en: 'Inactivated whole-virion Hepatitis A virus adsorbed on aluminium adjuvant',
      bn: 'নিষ্ক্রিয় হোল-ভিরিয়ন হেপাটাইটিস-এ ভাইরাস টিকা',
    },
    route: {
      en: 'Intramuscular (IM) — anterolateral thigh (12–23 mo) or deltoid (≥2 yrs)',
      bn: 'মাংসপেশিতে (IM) — উরু (১–২ বছর) বা বাহুর ডেল্টয়েড (২+ বছর)',
    },
    doseVolume: {
      en: '0.5 mL pediatric formulation (ages 1–18 yrs: Havrix 720 / Vaqta 25U); 1.0 mL adult (≥19 yrs: Havrix 1440 / Vaqta 50U)',
      bn: 'শিশু (১–১৮ বছর): ০.৫ মি.লি.; প্রাপ্তবয়স্ক (১৯+ বছর): ১.০ মি.লি.',
    },
    coldChain: {
      en: '+2°C to +8°C; NEVER freeze; shake well before injecting',
      bn: '+২°সে থেকে +৮°সে; ফ্রিজ করবেন না; ব্যবহারের আগে ঝাঁকান',
    },
    dosingProtocol: {
      en: '2 doses starting from ≥12 months of age spaced 6–18 months apart (minimum 6 months). Single dose within 2 weeks of Hepatitis A exposure provides effective post-exposure prophylaxis (PEP).',
      bn: '১২ মাস বয়স থেকে ৬–১৮ মাস ব্যবধানে ২ ডোজ (ন্যূনতম ব্যবধান ৬ মাস)। আক্রান্তের সংস্পর্শে আসার ২ সপ্তাহের মধ্যে দিলে রোগ প্রতিরোধ করে।',
    },
    immunityProfile: {
      en: '>95% seroprotection within 2–4 weeks of Dose 1 and >99% long-term immunity lasting ≥25–40 years after Dose 2.',
      bn: '১ম ডোজের ২–৪ সপ্তাহেই >৯৫% এবং ২য় ডোজের পর >৯৯% সুরক্ষা কমপক্ষে ২৫–৪০ বছর স্থায়ী থাকে।',
    },
    specialPopulations: {
      en: 'Essential for chronic liver disease (Hepatitis B/C, cirrhosis), food handlers, and travelers in Bangladesh where foodborne outbreaks cause jaundice; safe in pregnancy when indicated.',
      bn: 'লিভার রোগী, হোটেল/খাবার কর্মী ও জন্ডিস-প্রবণ এলাকার জন্য জরুরি; প্রয়োজন হলে গর্ভাবস্থাতেও নিরাপদ।',
    },
    aftercare: {
      en: 'Mild arm soreness or fatigue passes in 1–2 days; avoid switching pediatric vs adult formulations carelessly without verifying dose.',
      bn: 'বাহু ব্যথা ১–২ দিনে সেরে যায়; শিশু ও প্রাপ্তবয়স্ক ফর্মুলেশনের ডোজ-মাত্রা নিশ্চিত হয়ে প্রয়োগ করুন।',
    },
    formulations: 'Havrix (GSK), Vaqta (MSD), Avaxim (Sanofi), Mevac-A / Biovac-A',
  },
  mmr: {
    platform: {
      en: 'Live-attenuated trivalent Measles, Mumps (Jeryl Lynn/RIT 4385), and Rubella (RA 27/3) viral vaccine',
      bn: 'মৃদু জীবিত ট্রাইভ্যালেন্ট হাম, মাম্পস ও রুবেলা (MMR) ভাইরাস টিকা',
    },
    route: {
      en: 'Subcutaneous (SC) or Intramuscular (IM, Priorix/M-M-R II) — outer upper arm or anterolateral thigh',
      bn: 'চামড়ার নিচে (SC) বা মাংসপেশিতে (IM) — বাহুর উপরিভাগ বা উরুতে',
    },
    doseVolume: {
      en: '0.5 mL freshly reconstituted using supplied diluent',
      bn: '০.৫ মি.লি. সরবরাহকৃত ডাইলুয়েন্টে সদ্য মিশ্রিত',
    },
    coldChain: {
      en: '+2°C to +8°C; protect from light; administer immediately (or within 8h refrigerated per label) after reconstitution',
      bn: '+২°সে থেকে +৮°সে; আলো থেকে দূরে রাখুন; মিশ্রণের পর নির্ধারিত সময়ের মধ্যে ব্যবহার করুন',
    },
    dosingProtocol: {
      en: '2 doses: Dose 1 at 12–15 months, Dose 2 at 4–6 years (min interval 28 days for catch-up or international travel). Infants 6–11 mo traveling abroad may receive an early dose (routine 2 doses still required from 12+ mo).',
      bn: '২ ডোজ: ১২–১৫ মাস এবং ৪–৬ বছর (ক্যাচ-আপে ন্যূনতম ব্যবধান ২৮ দিন)। বাংলাদেশ ইপিআই-এর MR সূচির বাইরে বেসরকারিতে মাম্পস সুরক্ষাসহ ব্যবহৃত হয়।',
    },
    immunityProfile: {
      en: '97% against measles, ~88% against mumps, and 97% against rubella after 2 doses—lifelong protection without needing boosters.',
      bn: '২ ডোজে হামে ৯৭%, মাম্পসে ~৮৮% এবং রুবেলায় ৯৭% আজীবন সুরক্ষা প্রদান করে।',
    },
    specialPopulations: {
      en: 'CONTRAINDICATED in pregnancy and severe immunodeficiency (CD4 <200 or biologic therapy); safe for egg-allergic children; space 3–11 months after IVIG/blood transfusions.',
      bn: 'গর্ভাবস্থা ও গুরুতর অনাক্রম্যতা দুর্বলতায় নিষিদ্ধ; ডিমে অ্যালার্জি থাকা শিশুর জন্য নিরাপদ।',
    },
    aftercare: {
      en: 'Low fever, mild rash, or transient parotid/cheek swelling 7–14 days later resolves on its own.',
      bn: '৭–১৪ দিন পর হালকা জ্বর, র‍্যাশ বা গালের পাশে সামান্য ফোলা নিজেই সেরে যায়।',
    },
    formulations: 'Priorix (GSK), M-M-R II (MSD), Tresivac (Serum Institute, WHO PQ)',
  },
  meningococcal: {
    platform: {
      en: 'Tetravalent Meningococcal serogroups A, C, W, Y polysaccharide-protein conjugate vaccine (MenACWY)',
      bn: 'টেট্রাভ্যালেন্ট মেনিনগোকক্কাল A, C, W, Y কনজুগেট টিকা',
    },
    route: {
      en: 'Intramuscular (IM) — deltoid (or anterolateral thigh in infants)',
      bn: 'মাংসপেশিতে (IM) — ডেল্টয়েড বা উরু',
    },
    doseVolume: {
      en: '0.5 mL liquid or freshly reconstituted vial',
      bn: '০.৫ মি.লি. একক ডোজ',
    },
    coldChain: {
      en: '+2°C to +8°C; NEVER freeze; protect from light',
      bn: '+২°সে থেকে +৮°সে; ফ্রিজ করবেন না; আলো থেকে দূরে রাখুন',
    },
    dosingProtocol: {
      en: 'Adolescents: 1st dose at 11–12 yrs + booster at 16 yrs. Bangladesh Hajj/Umrah travelers: 1 mandatory conjugate dose ≥10 days before departure (valid 5 years on International Vaccination Certificate).',
      bn: 'কিশোর: ১১–১২ বছর + ১৬ বছরে বুস্টার। হজ ও ওমরাহ যাত্রীদের যাত্রার অন্তত ১০ দিন আগে ১ ডোজ বাধ্যতামূলক (মেয়াদ ৫ বছর)।',
    },
    immunityProfile: {
      en: '85–95% seroprotection against fatal meningococcal meningitis & meningococcemia (A, C, W-135, Y) and clears asymptomatic throat carriage.',
      bn: 'মেনিনজাইটিস ও সেপ্টিসিমিয়ার বিরুদ্ধে ৮৫–৯৫% সুরক্ষা দেয় এবং গলার জীবাণু বহন কমায়।',
    },
    specialPopulations: {
      en: 'Mandatory early series (2–4 doses) for functional/anatomic asplenia, sickle cell disease, HIV, and complement C5–C9 deficiencies; safe in pregnancy if travel/outbreak risk.',
      bn: 'প্লীহাহীনতা, সিকল সেল রোগ ও এইচআইভি-তে বিশেষভাবে প্রয়োজন; ভ্রমণ বা প্রাদুর্ভাবে গর্ভাবস্থায় নিরাপদ।',
    },
    aftercare: {
      en: 'Check whether destination Hajj visa requires conjugate (valid 5 yrs) vs older polysaccharide (valid 3 yrs) certificate stamp.',
      bn: 'হজ ভিসার জন্য কনজুগেট টিকার (৫ বছর মেয়াদী) সরকারি সনদ সিলসহ সংরক্ষণ করুন।',
    },
    formulations: 'Menveo (GSK), Nimenrix (Pfizer), MenQuadfi (Sanofi)',
  },
  yellowFever: {
    platform: {
      en: 'Live-attenuated 17D Yellow Fever viral vaccine (chick embryo propagated)',
      bn: 'মৃদু জীবিত ১৭ডি ইয়েলো ফিভার ভাইরাস টিকা',
    },
    route: {
      en: 'Subcutaneous (SC) or Intramuscular (IM) — upper arm (must be given at DGHS/designated IHR yellow-card center)',
      bn: 'চামড়ার নিচে (SC) বা মাংসপেশিতে (IM) — অনুমোদিত IHR আন্তর্জাতিক কেন্দ্র থেকে নিতে হয়',
    },
    doseVolume: {
      en: '0.5 mL single reconstituted dose (discard unused portion after 1–6 hours per label)',
      bn: '০.৫ মি.লি. একক ডোজ',
    },
    coldChain: {
      en: '+2°C to +8°C (WHO VVM-14/30); protect from light; strictly keep diluent cold before mixing',
      bn: '+২°সে থেকে +৮°সে; সূর্যালোক থেকে দূরে রাখুন; ডাইলুয়েন্ট ঠান্ডা করে মেশান',
    },
    dosingProtocol: {
      en: 'Single lifetime dose ≥10 days before entering endemic zones of Sub-Saharan Africa or South America (valid for life under updated WHO IHR; no 10-year booster needed for healthy travelers). Minimum age 9 months (never <6 months).',
      bn: 'আফ্রিকা বা দক্ষিণ আমেরিকার ঝুঁকিপূর্ণ দেশে ভ্রমণের কমপক্ষে ১০ দিন আগে ১ ডোজ (WHO-এর নিয়ম অনুযায়ী এক ডোজই আজীবন বৈধ)। ৯ মাসের আগে নয় (৬ মাসের নিচে নিষিদ্ধ)।',
    },
    immunityProfile: {
      en: '>99% neutralizing immunity develops within 10–30 days and persists lifelong in >95% of recipients.',
      bn: '১০–৩০ দিনের মধ্যে >৯৯% অ্যান্টিবডি তৈরি হয় এবং আজীবন সুরক্ষা বজায় থাকে।',
    },
    specialPopulations: {
      en: 'CONTRAINDICATED in infants <6 months, severe egg anaphylaxis, thymus disorder/myasthenia gravis, and severe immunodeficiency; caution in adults ≥60 years (rare viscerotropic YEL-AVD risk) & pregnancy (issue medical waiver if non-essential).',
      bn: '৬ মাসের নিচে শিশু, তীব্র ডিম অ্যালার্জি, থাইমাস রোগ ও দুর্বল রোগপ্রতিরোধে নিষিদ্ধ; ৬০+ প্রবীণ ও গর্ভাবস্থায় চিকিৎসকের বিশেষ ছাড়পত্র বা ঝুঁকি মূল্যায়ন জরুরি।',
    },
    aftercare: {
      en: 'Obtain the signed Yellow International Certificate of Vaccination (ICVP); carry DEET repellent alongside vaccination.',
      bn: 'আন্তর্জাতিক হলুদ টিকা সনদ (ICVP) স্বাক্ষর ও সিলসহ সংগ্রহ করুন; ভ্রমণে মশা প্রতিরোধক ব্যবহার করুন।',
    },
    formulations: 'Stamaril (Sanofi, WHO PQ), YF-VAX, 17DD Bio-Manguinhos (WHO PQ)',
  },
  rabies: {
    platform: {
      en: 'Inactivated cell-culture Rabies Vaccine (Purified Vero Cell / PCECV)',
      bn: 'নিষ্ক্রিয় সেল-কালচার জলাতঙ্ক টিকা (VERO / PCECV)',
    },
    route: {
      en: 'Intramuscular (IM, deltoid / infant thigh) OR WHO 2-site Intradermal (ID, both deltoids) — NEVER gluteal buttock injection',
      bn: 'মাংসপেশিতে (IM, ডেল্টয়েড/উরু) বা ২-সাইট ত্বকের ভেতরে (ID) — কখনোই নিতম্বে দেবেন না',
    },
    doseVolume: {
      en: '0.5–1.0 mL IM (full vial) OR 0.1 mL × 2 sites (0.2 mL total) ID',
      bn: '০.৫–১.০ মি.লি. IM অথবা প্রতি বাহুতে ০.১ মি.লি. করে ২ স্থানে ID',
    },
    coldChain: {
      en: '+2°C to +8°C; use reconstituted vial within 6–8 hours under aseptic refrigeration',
      bn: '+২°সে থেকে +৮°সে; মিশ্রণের পর ৬–৮ ঘণ্টার মধ্যে ব্যবহার করুন',
    },
    dosingProtocol: {
      en: 'Post-exposure (PEP): WHO 1-week 2-site ID (Days 0, 3, 7) at Dhaka/district rabies clinics OR Essen 4–5 dose IM (Days 0, 3, 7, 14, ±28). Previously vaccinated persons need ONLY 2 boosters (Days 0 & 3) and NO RIG.',
      bn: 'কামড়ের পর (PEP): সরকারি হাসপাতালে ১-সপ্তাহের ID সূচি (০, ৩, ৭ দিন) অথবা IM সূচি (০, ৩, ৭, ১৪, ±২৮ দিন)। পূর্বে টিকা নেওয়া থাকলে শুধু দিন ০ ও ৩-এ ২টি বুস্টারই যথেষ্ট (RIG লাগে না)।',
    },
    immunityProfile: {
      en: 'Near 100% survival when paired with immediate 15-minute soap-and-water wound scrub and Day-0 RIG (for Category III bleeding bites/scratches).',
      bn: 'কামড়ের পর ১৫ মিনিট সাবান-পানিতে ক্ষত ধোয়া ও ক্যাটাগরি-৩ ক্ষতে RIG সহ দিলে প্রায় ১০০% জলাতঙ্ক প্রতিরোধ করে।',
    },
    specialPopulations: {
      en: 'Zero contraindications in PEP: mandatory and safe for pregnant women, newborns, breastfeeding mothers, and HIV+ patients (give Day-0 RIG even for mild immunosuppression).',
      bn: 'কামড়-পরবর্তী জরুরি সুরক্ষায় গর্ভবতী, শিশু ও রোগীদের কোনো বাধা নেই—কারণ চিকিৎসা না করলে জলাতঙ্ক প্রায় শতভাগ প্রাণঘাতী।',
    },
    aftercare: {
      en: 'Do NOT wait to observe a stray dog for 10 days before starting PEP—start Day-0 doses immediately (can stop after Day 10 ONLY if healthy domestic dog stays alive/healthy on vet exam).',
      bn: 'কুকুর বা বিড়াল ১০ দিন পর্যবেক্ষণের অপেক্ষায় প্রথম ডোজ দেরি করবেন না—আজই শুরু করুন।',
    },
    formulations: 'Verorab (Sanofi), Rabipur (Bavarian Nordic), Vaxirab N, Abhayrab (WHO PQ)',
  },
  hepatitisB: {
    platform: {
      en: 'Recombinant Hepatitis B surface antigen (HBsAg) yeast-derived subunit vaccine',
      bn: 'রিকম্বিন্যান্ট হেপাটাইটিস-বি সারফেস অ্যান্টিজেন (HBsAg) সাবইউনিট টিকা',
    },
    route: {
      en: 'Intramuscular (IM) — anterolateral thigh (neonates/infants) or deltoid (children/adults)',
      bn: 'মাংসপেশিতে (IM) — নবজাতকের উরুর বাইরের দিক বা বড়দের ডেল্টয়েড',
    },
    doseVolume: {
      en: '0.5 mL (10 µg pediatric/adolescent ≤19 yrs); 1.0 mL (20 µg adult ≥20 yrs; 40 µg for hemodialysis)',
      bn: 'শিশু/কিশোর: ০.৫ মি.লি. (১০ µg); প্রাপ্তবয়স্ক: ১.০ মি.লি. (২০ µg)',
    },
    coldChain: {
      en: '+2°C to +8°C; NEVER freeze (shake test if suspect); MDVP multi-dose vial usable 28 days',
      bn: '+২°সে থেকে +৮°সে; কখনোই ফ্রিজ করবেন না; খোলা ভায়াল ২৮ দিন ব্যবহার্য',
    },
    dosingProtocol: {
      en: 'WHO recommends a universal Monovalent Birth Dose within 24 hours of delivery (essential if mother is HBsAg+ alongside HBIG), followed by 3 Pentavalent doses at 6, 10, 14 weeks. Adults: 0, 1, 6 months.',
      bn: 'WHO জন্মের ২৪ ঘণ্টার মধ্যে ১ম ডোজ দেওয়ার সুপারিশ করে (মা HBsAg+ হলে HBIG সহ অবশ্যই দিতে হবে), এরপর ৬, ১০, ১৪ সপ্তাহে পেন্টাভ্যালেন্ট। প্রাপ্তবয়স্ক: ০, ১ ও ৬ মাসে ৩ ডোজ।',
    },
    immunityProfile: {
      en: '95% protective seroconversion (anti-HBs ≥10 mIU/mL) conferring 30+ years to lifelong immune memory against chronic HBV, cirrhosis, and liver cancer.',
      bn: '৯৫% সুরক্ষা (anti-HBs ≥১০) তৈরি করে এবং লিভার সিরোসিস ও লিভার ক্যানসার থেকে ৩০+ বছর থেকে আজীবন সুরক্ষা দেয়।',
    },
    specialPopulations: {
      en: 'Safe in pregnancy, newborns, and renal dialysis (give double adult 40 µg doses); preterm <2,000 g infants of HBsAg-negative mothers may wait until 1 month or hospital discharge unless mother is HBsAg+.',
      bn: 'গর্ভবতী, নবজাতক ও কিডনি ডায়ালাইসিস রোগীদের জন্য নিরাপদ (ডায়ালাইসিস রোগীর উচ্চ ডোজ লাগে)।',
    },
    aftercare: {
      en: 'Healthcare workers should check anti-HBs titer 1–2 months after the 3rd dose to confirm ≥10 mIU/mL.',
      bn: 'স্বাস্থ্যকর্মী ও ঝুঁকিপূর্ণ ব্যক্তিদের ৩য় ডোজের ১–২ মাস পর রক্তে অ্যান্টিবডি টাইটার (≥১০) পরীক্ষা করে নেওয়া উচিত।',
    },
    formulations: 'Engerix-B (GSK), Recombivax HB (MSD), Euvax-B / Shanvac-B / Heplisav-B',
  },
  dengue: {
    platform: {
      en: 'Live-attenuated tetravalent dengue vaccine (TAK-003 Qdenga or CYD-TDV Dengvaxia)',
      bn: 'মৃদু জীবিত টেট্রাভ্যালেন্ট ডেঙ্গু টিকা (Qdenga TAK-003 বা Dengvaxia)',
    },
    route: {
      en: 'Subcutaneous (SC) — upper arm deltoid area',
      bn: 'চামড়ার নিচে (SC) — বাহুর উপরিভাগ',
    },
    doseVolume: {
      en: '0.5 mL reconstituted dose',
      bn: '০.৫ মি.লি. মিশ্রিত ডোজ',
    },
    coldChain: {
      en: '+2°C to +8°C; protect from light; administer promptly after reconstitution',
      bn: '+২°সে থেকে +৮°সে; আলো থেকে দূরে রাখুন; মিশ্রণের পর দ্রুত দিন',
    },
    dosingProtocol: {
      en: 'TAK-003 (Qdenga, WHO PQ May 2024): 2 SC doses 3 months apart for ages 6–16 in high-burden dengue settings regardless of serostatus. CYD-TDV (Dengvaxia): 3 doses (0, 6, 12 mo) ONLY if lab-confirmed seropositive.',
      bn: 'Qdenga (WHO PQ): উচ্চ ডেঙ্গুপ্রবণ এলাকায় ৬–১৬ বছর বয়সীদের ৩ মাস ব্যবধানে ২ ডোজ। Dengvaxia: কেবল পূর্ব-সংক্রমণ নিশ্চিত হলেই ০, ৬, ১২ মাসে ৩ ডোজ।',
    },
    immunityProfile: {
      en: 'TAK-003 reduces hospitalized dengue by ~84% and symptomatic dengue by ~61% over 4.5 years (strongest against DENV-1 & DENV-2; note DGHS Bangladesh has not yet added dengue vaccine to routine EPI).',
      bn: 'Qdenga হাসপাতালে ভর্তি ~৮৪% এবং উপসর্গযুক্ত ডেঙ্গু ~৬১% কমায় (বাংলাদেশের সরকারি ইপিআই-তে এখনো যুক্ত হয়নি)।',
    },
    specialPopulations: {
      en: 'CONTRAINDICATED in pregnancy (defer 1 month post-dose), breastfeeding women, and immunocompromised persons.',
      bn: 'গর্ভবতী, স্তন্যদানকারী ও দুর্বল রোগপ্রতিরোধের ব্যক্তিদের জন্য নিষিদ্ধ।',
    },
    aftercare: {
      en: 'Maintain mosquito bed nets, window screens, and clearing stagnant Aedes water containers even after vaccination.',
      bn: 'টিকা নেওয়ার পরও এডিস মশার প্রজনন স্থান (জমে থাকা পরিষ্কার পানি) ধ্বংস ও মশারি ব্যবহার অব্যাহত রাখুন।',
    },
    formulations: 'Qdenga / TAK-003 (Takeda, WHO PQ), Dengvaxia (Sanofi)',
  },
  malaria: {
    platform: {
      en: 'Recombinant P. falciparum circumsporozoite–HBsAg VLP vaccine with AS01E adjuvant (RTS,S/AS01)',
      bn: 'রিকম্বিন্যান্ট ম্যালেরিয়া সারকামস্পোরোজয়েট–HBsAg প্রোটিন টিকা (RTS,S/AS01E)',
    },
    route: {
      en: 'Intramuscular (IM) — anterolateral thigh (infants) or deltoid',
      bn: 'মাংসপেশিতে (IM) — শিশুর উরু বা বাহু',
    },
    doseVolume: {
      en: '0.5 mL reconstituted with AS01E liquid adjuvant suspension',
      bn: '০.৫ মি.লি. AS01E অ্যাডজুভ্যান্টে মিশ্রিত ডোজ',
    },
    coldChain: {
      en: '+2°C to +8°C; NEVER freeze; administer within 6 hours of mixing antigen + adjuvant vials',
      bn: '+২°সে থেকে +৮°সে; ফ্রিজ করবেন না; মেশানোর ৬ ঘণ্টার মধ্যে ব্যবহার করুন',
    },
    dosingProtocol: {
      en: '4 doses starting at 5 months of age: Doses 1–3 given ≥4 weeks apart (e.g., 5, 6, 7 months), Dose 4 at 18–24 months (endemic Sub-Saharan Africa / high-transmission areas only).',
      bn: 'উচ্চ ম্যালেরিয়া-প্রবণ অঞ্চলে ৫ মাস বয়স থেকে ৪ ডোজ: ৫, ৬ ও ৭ মাসে ৩ ডোজ এবং ১৮–২৪ মাসে ৪র্থ বুস্টার ডোজ।',
    },
    immunityProfile: {
      en: 'Reduces clinical and severe P. falciparum malaria in young children by ~30–40% and all-cause child mortality by ~13% when combined with bed nets.',
      bn: 'মশারির সাথে ব্যবহারে গুরুতর ম্যালেরিয়া ~৩০–৪০% এবং শিশু মৃত্যুহার ~১৩% কমিয়েছে।',
    },
    specialPopulations: {
      en: 'For young children living in P. falciparum moderate/high transmission settings—not intended for adult travelers or routine urban Bangladesh.',
      bn: 'উচ্চ ফ্যালসিপেরাম সংক্রমণ এলাকার ছোট শিশুদের জন্য নির্ধারিত; সাধারণ ভ্রমণকারীদের জন্য নয়।',
    },
    aftercare: {
      en: 'Fever and injection tenderness common; seek rapid RDT malaria test for any febrile illness.',
      bn: 'টিকার পরও জ্বর হলে দ্রুত ম্যালেরিয়া RDT পরীক্ষা করান ও মশারি ব্যবহার করুন।',
    },
    formulations: 'Mosquirix / RTS,S/AS01E (GSK, WHO PQ)',
  },
  rsv: {
    platform: {
      en: 'Unadjuvanted bivalent recombinant prefusion F (RSVpreF) glycoprotein vaccine (Abrysvo)',
      bn: 'অ্যাডজুভ্যান্ট-বিহীন বাইভ্যালেন্ট রিকম্বিন্যান্ট RSV প্রি-ফিউশন এফ টিকা (Abrysvo)',
    },
    route: {
      en: 'Intramuscular (IM) — deltoid muscle immediately after mixing lyophilized vial with diluent',
      bn: 'মাংসপেশিতে (IM) — মিশ্রণের পরপরই বাহুর ডেল্টয়েড পেশীতে',
    },
    doseVolume: {
      en: '0.5 mL single injection (120 µg RSV A+B prefusion F)',
      bn: '০.৫ মি.লি. একক ইনজেকশন',
    },
    coldChain: {
      en: '+2°C to +8°C; NEVER freeze; administer within 4 hours of reconstitution',
      bn: '+২°সে থেকে +৮°সে; ফ্রিজ করবেন না; মেশানোর ৪ ঘণ্টার মধ্যে দিন',
    },
    dosingProtocol: {
      en: 'Maternal immunization: 1 IM dose during 32–36 weeks gestation (to transfer protective IgG to newborn). Older adults ≥75 yrs (or 60–74 at high cardiopulmonary risk): 1 IM dose.',
      bn: 'গর্ভবতী নারী: ৩২–৩৬ সপ্তাহে ১ ডোজ (নবজাতককে সুরক্ষা দিতে)। প্রবীণ: ৭৫+ বছর বা ৬০–৭৪ বছরের ঝুঁকিপূর্ণ রোগীদের ১ ডোজ।',
    },
    immunityProfile: {
      en: '81.8% efficacy against severe hospitalized infant RSV bronchiolitis in the first 90 days of life (69.4% through 6 months) and ~86% against severe RSV LRTI in older adults.',
      bn: 'নবজাতকের প্রথম ৩ মাসে গুরুতর RSV ব্রঙ্কিওলাইটিস ~৮১.৮% এবং প্রবীণদের ~৮৬% প্রতিরোধ করে।',
    },
    specialPopulations: {
      en: 'Abrysvo is the ONLY RSV vaccine licensed in pregnancy; give at least 14 days before birth and ≥2 weeks from Tdap if separate visits are preferred (safe co-administered).',
      bn: 'গর্ভাবস্থায় কেবল Abrysvo অনুমোদিত; প্রসবের অন্তত ১৪ দিন আগে নিতে হয় (প্রয়োজনে Tdap-এর সাথে একসাথে দেওয়া যায়)।',
    },
    aftercare: {
      en: 'If mother delivered <14 days after Abrysvo, infant should receive nirsevimab monoclonal antibody instead.',
      bn: 'টিকা নেওয়ার ১৪ দিনের আগেই প্রসব হয়ে গেলে নবজাতককে নীরসেভিমাব মনোক্লোনাল অ্যান্টিবডি দেওয়া উচিত।',
    },
    formulations: 'Abrysvo (Pfizer)',
  },
  shingles: {
    platform: {
      en: 'Recombinant varicella-zoster glycoprotein E (gE) with AS01B liposomal adjuvant (RZV — non-live)',
      bn: 'রিকম্বিন্যান্ট ভ্যারিসেলা-জস্টার গ্লাইকোপ্রোটিন-ই ও AS01B অ্যাডজুভ্যান্টযুক্ত নির্জীব টিকা',
    },
    route: {
      en: 'Intramuscular (IM) — deltoid muscle only (do NOT give subcutaneously)',
      bn: 'শুধুমাত্র মাংসপেশিতে (IM) — বাহুর ডেল্টয়েড পেশী',
    },
    doseVolume: {
      en: '0.5 mL reconstituted dose (use within 6 hours refrigerated)',
      bn: '০.৫ মি.লি. মিশ্রিত ডোজ',
    },
    coldChain: {
      en: '+2°C to +8°C; protect from light; NEVER freeze',
      bn: '+২°সে থেকে +৮°সে; আলো থেকে দূরে রাখুন; ফ্রিজ করবেন না',
    },
    dosingProtocol: {
      en: 'Adults ≥50 years (and immunocompromised adults ≥19 years): 2 doses spaced 2–6 months apart (immunocompromised may use 1–2 month accelerated interval). Recommended even if prior shingles or Zostavax occurred.',
      bn: '৫০+ বছর বয়সী (এবং ১৯+ দুর্বল রোগপ্রতিরোধ) ব্যক্তিদের ২–৬ মাস ব্যবধানে ২ ডোজ। আগে শিনগলস হয়ে থাকলেও পুনরাবৃত্তি রোধে নিতে হবে।',
    },
    immunityProfile: {
      en: '97% efficacy in adults 50–69 years and 91% in adults ≥70 years against shingles & debilitating postherpetic neuralgia (PHN), sustained >10 years.',
      bn: 'শিনগলস ও তীব্র স্নায়ু-ব্যথা (PHN) প্রতিরোধে ৫০–৬৯ বছরে ৯৭% এবং ৭০+ বছরে ৯১% কার্যকর, যা ১০+ বছর থাকে।',
    },
    specialPopulations: {
      en: 'Non-live recombinant vaccine is SAFE for cancer, transplant, steroid, and HIV+ patients; postpone during an active acute shingles rash until lesions crust over.',
      bn: 'নির্জীব টিকা হওয়ায় ক্যানসার ও দুর্বল রোগপ্রতিরোধের রোগীদের জন্য নিরাপদ; সক্রিয় শিনগলস র‍্যাশ শুকিয়ে যাওয়ার পর নিন।',
    },
    aftercare: {
      en: 'Expect moderate temporary arm pain, fatigue, or 1–2 days of myalgia/fever (~15% impact daily activities briefly)—complete Dose 2 even if Dose 1 was reactogenic.',
      bn: '১–২ দিন বাহুতে ব্যথা, ক্লান্তি বা হালকা জ্বর হতে পারে—১ম ডোজে ব্যথা হলেও পূর্ণ সুরক্ষার জন্য ২য় ডোজ অবশ্যই নিন।',
    },
    formulations: 'Shingrix (GSK)',
  },
  pneumococcal23: {
    platform: {
      en: 'Unconjugated 23-valent purified Pneumococcal capsular polysaccharide vaccine (PPSV23)',
      bn: '২৩-ভ্যালেন্ট নিউমোকক্কাল পলিস্যাকারাইড টিকা (PPSV23)',
    },
    route: {
      en: 'Intramuscular (IM) or Subcutaneous (SC) — deltoid or upper outer arm',
      bn: 'মাংসপেশিতে (IM) বা চামড়ার নিচে (SC) — বাহুতে',
    },
    doseVolume: {
      en: '0.5 mL single injection',
      bn: '০.৫ মি.লি. একক ইনজেকশন',
    },
    coldChain: {
      en: '+2°C to +8°C; clear colorless liquid; NEVER freeze',
      bn: '+২°সে থেকে +৮°সে; কখনোই ফ্রিজ করবেন না',
    },
    dosingProtocol: {
      en: 'For adults ≥65 or high-risk individuals ≥2 yrs (given ≥8 weeks–1 year AFTER PCV13/PCV15 if PCV20/PCV21 not used; not effective in children <2 years). Give one 5-year booster for asplenia/immunocompromised.',
      bn: '২+ বছর ঝুঁকিপূর্ণ শিশু বা ৬৫+ প্রবীণদের জন্য (PCV13/15-এর পরে ব্যবধানে)। ২ বছরের কম শিশুতে কাজ করে না; প্লীহাহীনতা বা দুর্বল অনাক্রম্যতায় ৫ বছর পর বুস্টার।',
    },
    immunityProfile: {
      en: '60–75% protection against invasive bacteremic pneumococcal disease across 23 serotypes (does not generate T-cell memory or prevent asymptomatic carriage).',
      bn: '২৩টি সেরোটাইপের রক্ত-সংক্রমণ ও গুরুতর নিউমোনিয়ার বিরুদ্ধে ৬০–৭৫% সুরক্ষা দেয়।',
    },
    specialPopulations: {
      en: 'Critical for sickle cell disease, splenectomy, nephrotic syndrome, chronic heart/lung/liver disease, CSF leaks, and diabetes mellitus.',
      bn: 'প্লীহাহীনতা, কিডনি রোগ (নেফ্রোটিক সিনড্রোম), সিওপিডি, হৃদরোগ ও ডায়াবেটিসে অত্যন্ত উপকারী।',
    },
    aftercare: {
      en: 'Localized redness or tenderness clears within 48 hours; record batch date carefully before any 5-year repeat.',
      bn: 'হালকা ব্যথা ৪৮ ঘণ্টায় সেরে যায়; ৫ বছরের বুস্টারের প্রয়োজনে তারিখ লিখে রাখুন।',
    },
    formulations: 'Pneumovax 23 (MSD)',
  },
  typhoidVi: {
    platform: {
      en: 'Unconjugated purified Vi capsular polysaccharide vaccine of Salmonella Typhi (ViPS)',
      bn: 'অ-কনজুগেট পিউরিফায়েড টাইফয়েড Vi পলিস্যাকারাইড টিকা (ViPS)',
    },
    route: {
      en: 'Intramuscular (IM) or deep Subcutaneous (SC) — deltoid or thigh',
      bn: 'মাংসপেশিতে (IM) বা গভীর চামড়ার নিচে (SC)',
    },
    doseVolume: {
      en: '0.5 mL (25 µg Vi polysaccharide)',
      bn: '০.৫ মি.লি. (২৫ মাইক্রোগ্রাম Vi)',
    },
    coldChain: {
      en: '+2°C to +8°C; NEVER freeze',
      bn: '+২°সে থেকে +৮°সে; ফ্রিজ করবেন না',
    },
    dosingProtocol: {
      en: 'Single dose for ages ≥2 years at least 2 weeks before exposure; revaccinate every 2–3 years if ongoing risk (ineffective in infants <2 yrs—use Typbar-TCV conjugate instead).',
      bn: '২+ বছর বয়সীদের ভ্রমণ বা ঝুঁকির ২ সপ্তাহ আগে ১ ডোজ; সুরক্ষা ধরে রাখতে প্রতি ২–৩ বছরে বুস্টার। ২ বছরের নিচে কার্যকর নয় (সেক্ষেত্রে TCV ব্যবহার্য)।',
    },
    immunityProfile: {
      en: '55–72% efficacy for ~2–3 years (lower & shorter durability than Typhoid Conjugate Vaccine TCV).',
      bn: '৫৫–৭২% সুরক্ষা প্রায় ২–৩ বছর থাকে (কনজুগেট TCV-এর তুলনায় স্থায়িত্ব কম)।',
    },
    specialPopulations: {
      en: 'Inactivated non-live antigen is safe in HIV+ patients; consult clinician in pregnancy (TCV preferred where available).',
      bn: 'নিষ্ক্রিয় হওয়ায় এইচআইভি আক্রান্তদের জন্য নিরাপদ; বর্তমানে কনজুগেট TCV অধিক কার্যকর বিকল্প।',
    },
    aftercare: {
      en: 'Do not rely on vaccine alone—drink boiled/sealed water and avoid raw street ice/salads in high-risk zones.',
      bn: 'টিকা ১০০% সুরক্ষা দেয় না—রাস্তার খোলা বরফ/কাঁচা পানি এড়িয়ে চলুন।',
    },
    formulations: 'Typhim Vi (Sanofi), Typherix (GSK)',
  },
  anthrax: {
    platform: {
      en: 'Cell-free protective-antigen (PA) adsorbed subunit toxoid (AVA / BioThrax / Cyfendus)',
      bn: 'সেল-ফ্রি প্রোটেক্টিভ-অ্যান্টিজেন (PA) অ্যাডজর্বড সাবইউনিট অ্যানথ্রাক্স টিকা',
    },
    route: {
      en: 'Intramuscular (IM) for routine pre-exposure; Subcutaneous (SC) strictly for post-exposure prophylaxis (PEP)',
      bn: 'প্রি-এক্সপোজারে মাংসপেশিতে (IM); আক্রমণের পর জরুরি PEP-তে চামড়ার নিচে (SC)',
    },
    doseVolume: {
      en: '0.5 mL per dose',
      bn: 'প্রতি ডোজ ০.৫ মি.লি.',
    },
    coldChain: {
      en: '+2°C to +8°C; NEVER freeze',
      bn: '+২°সে থেকে +৮°সে; ফ্রিজ করবেন না',
    },
    dosingProtocol: {
      en: 'Occupational PrEP (vets, tannery/abattoir/BSL-3 workers, military): IM at 0, 1, 6 months + boosters at 12 & 18 mo, then annually. PEP after spore exposure: 3 SC doses (0, 2, 4 weeks) + 60 days ciprofloxacin/doxycycline.',
      bn: 'ঝুঁকিপূর্ণ পেশা (পশুচিকিৎসক/ল্যাব/ট্যানারি): ০, ১, ৬ মাসে + ১২, ১৮ মাসে ও বাৎসরিক বুস্টার। স্পোর এক্সপোজারের পর: ৬০ দিন অ্যান্টিবায়োটিকসহ ০, ২ ও ৪ সপ্তাহে ৩ ডোজ।',
    },
    immunityProfile: {
      en: '>92% seroconversion against lethal Bacillus anthracis lethal/edema toxin components after primary series.',
      bn: 'প্রাথমিক সূচি শেষে মারাত্মক অ্যানথ্রাক্স টক্সিনের বিরুদ্ধে >৯২% অ্যান্টিবডি তৈরি হয়।',
    },
    specialPopulations: {
      en: 'Adults 18–65 years only; defer elective PrEP during pregnancy unless acute inhalational anthrax spore exposure occurred (where maternal survival dictates immediate PEP).',
      bn: '১৮–৬৫ বছর বয়সীদের জন্য নির্ধারিত; তীব্র সংস্পর্শ ছাড়া গর্ভাবস্থায় ঐচ্ছিক ডোজ স্থগিত রাখুন।',
    },
    aftercare: {
      en: 'Subcutaneous lumps, itching, and arm soreness are common; complete the entire 60-day antibiotic course alongside PEP doses.',
      bn: 'চামড়ার নিচে ছোট চাকা বা ব্যথা হতে পারে; স্পোর এক্সপোজারের পর অ্যান্টিবায়োটিক কোর্স কখনোই মাঝপথে থামাবেন না।',
    },
    formulations: 'BioThrax / AVA (Emergent BioSolutions), Cyfendus (AVA + CpG 7909)',
  },
  mpox: {
    platform: {
      en: 'Live, non-replicating Modified Vaccinia Ankara (MVA-BN / JYNNEOS / Imvanex)',
      bn: 'নন-রেপ্লিকেটিং মডিফায়েড ভ্যাকসিনিয়া আঙ্কারা ভাইরাস টিকা (MVA-BN)',
    },
    route: {
      en: 'Subcutaneous (SC) — upper arm (or 0.1 mL Intradermal dose-sparing in adults ≥18 yrs during outbreaks)',
      bn: 'চামড়ার নিচে (SC) — বাহুর উপরিভাগ (প্রাদুর্ভাবে ১৮+ বছরে ০.১ মি.লি. ID)',
    },
    doseVolume: {
      en: '0.5 mL SC (or 0.1 mL ID)',
      bn: '০.৫ মি.লি. SC (অথবা ০.১ মি.লি. ID)',
    },
    coldChain: {
      en: '-20°C / -50°C long-term; +2°C to +8°C thawed usable up to 4–8 weeks (product label); protect from light',
      bn: '-২০°সে দীর্ঘমেয়াদী; গলানোর পর +২°সে–+৮°সে-এ ৪–৮ সপ্তাহ; আলো থেকে দূরে রাখুন',
    },
    dosingProtocol: {
      en: '2 doses given 28 days (4 weeks) apart; peak immunity 14 days after Dose 2. PEP: give Dose 1 within 4 days of close mpox contact (up to 14 days to blunt illness).',
      bn: '২৮ দিন (৪ সপ্তাহ) ব্যবধানে ২ ডোজ; ২য় ডোজের ১৪ দিন পর পূর্ণ সুরক্ষা। রোগীর সংস্পর্শে এলে ৪ দিনের মধ্যে (সর্বোচ্চ ১৪ দিন) ১ম ডোজ দিন।',
    },
    immunityProfile: {
      en: '~66–86% effectiveness after 2 doses against clade I & II mpox illness and strongly prevents hospitalization/death.',
      bn: '২ ডোজে মাঙ্কিপক্স সংক্রমণ ~৬৬–৮৬% প্রতিরোধ করে এবং গুরুতর জটিলতা কমায়।',
    },
    specialPopulations: {
      en: 'Because MVA-BN does NOT replicate in human cells, it is SAFE in HIV+ patients, atopic dermatitis/eczema, and pregnant/lactating mothers during exposure (unlike ACAM2000).',
      bn: 'মানবদেহে বংশবৃদ্ধি না করায় এইচআইভি, একজিমা ও ঝুঁকিপূর্ণ গর্ভাবস্থাতেও (ACAM2000-এর বিপরীতে) নিরাপদ।',
    },
    aftercare: {
      en: 'Avoid confusing mild redness/induration with a smallpox "take" scar (MVA-BN leaves NO ulcer or contagious scab).',
      bn: 'এই টিকায় স্মলপক্সের মতো কোনো ক্ষত বা সংক্রামক দাগ তৈরি হয় না।',
    },
    formulations: 'JYNNEOS / Imvanex / Imvamune (Bavarian Nordic, WHO PQ), LC16m8 (KM Biologics)',
  },
  tickBorne: {
    platform: {
      en: 'Inactivated whole-virion Tick-Borne Encephalitis virus (TBEV European/Far-Eastern strains)',
      bn: 'নিষ্ক্রিয় হোল-ভিরিয়ন টিক-বর্ন এনকেফালাইটিস ভাইরাস টিকা (TBE)',
    },
    route: {
      en: 'Intramuscular (IM) — deltoid (or thigh in young children)',
      bn: 'মাংসপেশিতে (IM) — বাহু বা উরু',
    },
    doseVolume: {
      en: '0.25 mL pediatric (ages 1–15 yrs) or 0.5 mL adult (≥16 yrs)',
      bn: 'শিশু (১–১৫ বছর): ০.২৫ মি.লি.; প্রাপ্তবয়স্ক (১৬+ বছর): ০.৫ মি.লি.',
    },
    coldChain: {
      en: '+2°C to +8°C; NEVER freeze; protect from light',
      bn: '+২°সে থেকে +৮°সে; ফ্রিজ করবেন না',
    },
    dosingProtocol: {
      en: '3 primary IM doses (Month 0, Month 1–3, Month 5–12) OR rapid pre-travel schedule (Days 0, 14, + 5–12 months); 1st booster after 3 years, then every 5 years (<60 yrs) or 3 years (≥60 yrs).',
      bn: '৩টি প্রাথমিক ডোজ (০, ১–৩ মাস, ৫–১২ মাস) বা দ্রুত ০, ১৪ দিনে + ৫–১২ মাসে; ৩ বছর পর প্রথম বুস্টার এবং পরে প্রতি ৩–৫ বছরে।',
    },
    immunityProfile: {
      en: '>95–98% protective effectiveness against TBE meningitis/encephalitis for travelers hiking/camping in Central/Eastern European & Siberian forests.',
      bn: 'মধ্য/পূর্ব ইউরোপ ও সাইবেরিয়ার বনাঞ্চলে ভ্রমণকারীদের জন্য TBE এনকেফালাইটিস থেকে >৯৫–৯৮% সুরক্ষা।',
    },
    specialPopulations: {
      en: 'Not endemic to Bangladesh—for travelers to forested endemic regions April–November; weigh risk if pregnant.',
      bn: 'বাংলাদেশে এ রোগ নেই—কেবল ইউরোপ/এশিয়ার ঝুঁকিপূর্ণ বনাঞ্চলে ভ্রমণকারীদের জন্য।',
    },
    aftercare: {
      en: 'Check skin for ticks after forest walks & avoid unpasteurized goat/cow milk in endemic countries.',
      bn: 'ঝুঁকিপূর্ণ বনে ভ্রমণের পর শরীরে পোকা (টিক) পরীক্ষা করুন এবং কাঁচা/অফুটানো দুধ এড়িয়ে চলুন।',
    },
    formulations: 'FSME-IMMUN / TicoVac (Pfizer), Encepur (Bavarian Nordic)',
  },
  plague: {
    platform: {
      en: 'Killed whole-cell Yersinia pestis suspension (historically USP) / investigational F1-V subunit',
      bn: 'নিষ্ক্রিয় ইয়ারসিনিয়া পেস্টিস ব্যাকটেরিয়াল সাসপেনশন (বিশেষ ঝুঁকিপূর্ণ পেশা)',
    },
    route: {
      en: 'Intramuscular (IM) — deltoid muscle',
      bn: 'মাংসপেশিতে (IM) — বাহুর ডেল্টয়েড পেশী',
    },
    doseVolume: {
      en: '1.0 mL (initial), followed by 0.2 mL subsequent & booster doses (legacy USP schedule)',
      bn: '১ম ডোজ ১.০ মি.লি., পরবর্তী ডোজ ও বুস্টার ০.২ মি.লি.',
    },
    coldChain: {
      en: '+2°C to +8°C; do not freeze',
      bn: '+২°সে থেকে +৮°সে; ফ্রিজ করবেন না',
    },
    dosingProtocol: {
      en: 'Restricted solely to Y. pestis laboratory researchers and field plague ecologists (0, 1–3, and 5–6 months + 6-monthly boosters); NOT recommended for travelers or post-exposure (antibiotics streptomycin/doxycycline treat/prevent plague).',
      bn: 'শুধুমাত্র গবেষণাগার কর্মী ও প্লেগ গবেষকদের জন্য (০, ১–৩ ও ৫–৬ মাসে ৩ ডোজ); সাধারণ নাগরিক বা ভ্রমণকারীদের জন্য নয়—সংস্পর্শে অ্যান্টিবায়োটিক ব্যবহৃত হয়।',
    },
    immunityProfile: {
      en: 'Moderate protection against flea-borne bubonic plague; minimal/unproven protection against aerosolized pneumonic plague.',
      bn: 'বিউবোনিক প্লেগের বিরুদ্ধে আংশিক সুরক্ষা দেয়; নিউমোনিক প্লেগে কার্যকর প্রমাণিত নয়।',
    },
    specialPopulations: {
      en: 'Adults ≥18 yrs high-containment lab personnel only; avoid in pregnancy & known hypersensitivity.',
      bn: 'কেবল উচ্চ-সুরক্ষা ল্যাব কর্মীদের জন্য; গর্ভাবস্থায় পরিহার্য।',
    },
    aftercare: {
      en: 'Observe 30 minutes for local induration or febrile reaction; seek immediate doxycycline/ciprofloxacin evaluation for any lab exposure.',
      bn: 'ল্যাব এক্সপোজারের সন্দেহ হলেই অবিলম্বে জরুরি অ্যান্টিবায়োটিক চিকিৎসা শুরু করুন।',
    },
    formulations: 'USP Killed Plague (discontinued US commercial supply; military/BSL-3 F1-V candidates in trials)',
  },
  choleraWC: {
    platform: {
      en: 'Killed bivalent Whole-Cell O1 + O139 Oral Cholera Vaccine (WC-OCV, no buffer needed)',
      bn: 'নিষ্ক্রিয় বাইভ্যালেন্ট হোল-সেল ওরাল কলেরা টিকা (WC-OCV, বাফার-বিহীন)',
    },
    route: {
      en: 'Oral (PO) — 1.5 mL tube/vial swallowed directly',
      bn: 'মুখে খাওয়ার তরল (PO) — সরাসরি ১.৫ মি.লি. পানীয়',
    },
    doseVolume: {
      en: '1.5 mL per dose',
      bn: 'প্রতি ডোজ ১.৫ মি.লি.',
    },
    coldChain: {
      en: '+2°C to +8°C; NEVER freeze; short-term CTC stable',
      bn: '+২°সে থেকে +৮°সে; ফ্রিজ করবেন না',
    },
    dosingProtocol: {
      en: '2 oral doses spaced 14 days apart for ages ≥1 year (re-dose every 2–3 years in endemic cholera hotspots).',
      bn: '১+ বছর বয়সীদের ১৪ দিন ব্যবধানে ২টি মুখে খাওয়ার ডোজ (ঝুঁকিপূর্ণ এলাকায় ২–৩ বছর পর বুস্টার)।',
    },
    immunityProfile: {
      en: '65–80% protective efficacy over 2–3 years across urban Dhaka & Cox’s Bazar mass vaccination trials.',
      bn: 'ঢাকা ও কক্সবাজারের বৃহৎ টিকাদান ক্যাম্পেইনে ২–৩ বছর মেয়াদী ৬৫–৮০% সুরক্ষা প্রমাণিত।',
    },
    specialPopulations: {
      en: 'Safe in pregnancy, breastfeeding, and HIV+; excluded only below 12 months of age.',
      bn: 'গর্ভবতী, স্তন্যদানকারী ও এইচআইভি আক্রান্তদের জন্য নিরাপদ; ১ বছরের নিচে দেওয়া হয় না।',
    },
    aftercare: {
      en: 'Maintain safe drinking water, hand hygiene, and ORS readiness.',
      bn: 'নিরাপদ পানি পান ও হাত ধোয়ার অভ্যাস বজায় রাখুন।',
    },
    formulations: 'Shanchol (Sanofi), Euvichol-Plus / S (EuBiologics), Cholvax (Incepta Bangladesh)',
  },
  'japanese-encephalitis': {
    platform: {
      en: 'Live-attenuated SA14-14-2 / chimeric JE or Inactivated Vero-cell JE vaccine',
      bn: 'মৃদু জীবিত SA14-14-2 / কাইমেরিক অথবা নিষ্ক্রিয় ভেরো-সেল জাপানিজ এনকেফালাইটিস টিকা',
    },
    route: {
      en: 'Intramuscular (IM) or Subcutaneous (SC) depending on brand',
      bn: 'মাংসপেশিতে (IM) বা চামড়ার নিচে (SC)',
    },
    doseVolume: {
      en: '0.5 mL (0.25 mL pediatric <3 yrs for Ixiaro)',
      bn: '০.৫ মি.লি. (৩ বছরের নিচে নিষ্ক্রিয় ফর্মুলায় ০.২৫ মি.লি.)',
    },
    coldChain: {
      en: '+2°C to +8°C; protect from light; NEVER freeze',
      bn: '+২°সে থেকে +৮°সে; আলো থেকে দূরে রাখুন; ফ্রিজ করবেন না',
    },
    dosingProtocol: {
      en: 'Inactivated Vero-cell: 2 doses on Days 0 & 28 (booster at 12–24 months if ongoing risk). Live-attenuated SA14-14-2: 1 dose from 8–9 months (optional booster 1 yr later).',
      bn: 'নিষ্ক্রিয়: ০ ও ২৮ দিনে ২ ডোজ (১ বছরে বুস্টার)। লাইভ: ৮–৯ মাসে ১ ডোজ (প্রয়োজনে ১ বছর পর বুস্টার)।',
    },
    immunityProfile: {
      en: '≥95% neutralizing antibody protection against JE viral encephalitis transmitted by Culex mosquitoes.',
      bn: 'কিউলেক্স মশাবাহিত জাপানিজ এনকেফালাইটিস মস্তিষ্ক-প্রদাহ থেকে ≥৯৫% সুরক্ষা দেয়।',
    },
    specialPopulations: {
      en: 'Prefer inactivated JE vaccine for immunocompromised patients and unavoidable travel in pregnancy.',
      bn: 'গর্ভবতী ও দুর্বল রোগপ্রতিরোধে নিষ্ক্রিয় টিকা বেছে নিন।',
    },
    aftercare: {
      en: 'Use mosquito nets and evening repellents in rural rice-paddy regions.',
      bn: 'গ্রামীণ জলাভূমি ও ধানক্ষেত এলাকায় সন্ধ্যায় মশারি ও মশা-নিরোধক ব্যবহার করুন।',
    },
    formulations: 'CD.JEVAX (WHO PQ), IMOJEV (Sanofi), Ixiaro (Valneva), JENVAC (Bharat Biotech)',
  },
  'meningococcal-acwy': {
    platform: {
      en: 'Conjugated quadrivalent MenACWY polysaccharide-protein vaccine (CRM197, TT, or DT carrier)',
      bn: 'কনজুগেটেড কোয়াড্রিভ্যালেন্ট মেনিনগোকক্কাল (A, C, W, Y) টিকা',
    },
    route: {
      en: 'Intramuscular (IM) — deltoid or infant thigh',
      bn: 'মাংসপেশিতে (IM) — বাহুর ডেল্টয়েড বা উরু',
    },
    doseVolume: {
      en: '0.5 mL single injection',
      bn: '০.৫ মি.লি. একক ডোজ',
    },
    coldChain: {
      en: '+2°C to +8°C; NEVER freeze; protect from light',
      bn: '+২°সে থেকে +৮°সে; ফ্রিজ করবেন না',
    },
    dosingProtocol: {
      en: '≥2 yrs: 1 IM dose (valid 5 years for Hajj/Umrah travel certificate). Infants 2–23 mo (Menveo/Nimenrix): 2–4 doses per age at start. High-risk asplenia/HIV/complement deficiency: 2-dose primary + booster every 5 years.',
      bn: '২+ বছর: ১ ডোজ (হজ/ওমরাহ সনদে ৫ বছর বৈধ)। উচ্চ ঝুঁকিপূর্ণ রোগী: ২-ডোজ সূচি + প্রতি ৫ বছর পরপর বুস্টার।',
    },
    immunityProfile: {
      en: 'Robust T-cell-dependent IgG memory against serogroups A, C, W, and Y—superior booster response and carriage reduction vs old MPSV4.',
      bn: 'A, C, W, Y সেরোগ্রুপের বিরুদ্ধে শক্তিশালী ও দীর্ঘমেয়াদী সুরক্ষা দেয় এবং গলার ক্যারেজ কমায়।',
    },
    specialPopulations: {
      en: 'Safe in pregnancy & lactation when travel/outbreak risk exists; preferred over older unconjugated polysaccharide.',
      bn: 'ভ্রমণ বা প্রাদুর্ভাবে গর্ভবতী ও স্তন্যদানকারী মায়েদের জন্য নিরাপদ।',
    },
    aftercare: {
      en: 'Obtain official Bangladesh Hajj/DGHS yellow stamp at least 10 days pre-travel.',
      bn: 'ভ্রমণের অন্তত ১০ দিন আগে অনুমোদিত স্বাস্থ্যকেন্দ্র থেকে আন্তর্জাতিক টিকা সনদ সংগ্রহ করুন।',
    },
    formulations: 'Nimenrix (Pfizer), Menveo (GSK), MenQuadfi (Sanofi)',
  },
  'meningococcal-b': {
    platform: {
      en: 'Recombinant outer-membrane protein vaccine targeting Meningococcal Serogroup B (4CMenB / FHbp)',
      bn: 'রিকম্বিন্যান্ট আউটার-মেমব্রেন প্রোটিন মেনিনগোকক্কাল-বি টিকা (MenB)',
    },
    route: {
      en: 'Intramuscular (IM) — deltoid or infant anterolateral thigh',
      bn: 'মাংসপেশিতে (IM) — ডেল্টয়েড বা শিশুর উরু',
    },
    doseVolume: {
      en: '0.5 mL prefilled syringe (shake well)',
      bn: '০.৫ মি.লি. প্রি-ফিল্ড সিরিঞ্জ (ব্যবহারের আগে ঝাঁকান)',
    },
    coldChain: {
      en: '+2°C to +8°C; NEVER freeze; protect from light',
      bn: '+২°সে থেকে +৮°সে; ফ্রিজ করবেন না',
    },
    dosingProtocol: {
      en: 'Non-interchangeable brands! Bexsero: 2 doses ≥1 month apart (ages 10–25) or 3 doses (0, 1–2, 6 mo) for high-risk; Trumenba: 2 doses (0, 6 mo) healthy or 3 doses (0, 1–2, 6 mo) high-risk. Give same brand throughout.',
      bn: 'ব্র্যান্ড পরিবর্তনযোগ্য নয়! Bexsero: ১+ মাস ব্যবধানে ২ ডোজ (ঝুঁকিপূর্ণ হলে ৩ ডোজ)। Trumenba: ০ ও ৬ মাসে ২ ডোজ (বা ঝুঁকিপূর্ণে ৩ ডোজ)। একই ব্র্যান্ড দিয়ে কোর্স শেষ করুন।',
    },
    immunityProfile: {
      en: '~75–85% protection against invasive MenB meningitis (which MenACWY does NOT cover); moderate protection wanes after ~3–4 years unless boosted in high-risk.',
      bn: 'MenACWY-তে অনুপস্থিত সেরোগ্রুপ-বি মেনিনজাইটিস থেকে ~৭৫–৮৫% সুরক্ষা দেয়।',
    },
    specialPopulations: {
      en: 'Crucial for asplenia, complement inhibitor drugs (eculizumab), and microbiology lab staff; infants given Bexsero alongside routine shots often benefit from prophylactic paracetamol for fever.',
      bn: 'প্লীহাহীনতা, কমপ্লিমেন্ট ঘাটতি ও ল্যাব কর্মীদের জন্য জরুরি; শিশুদের ক্ষেত্রে জ্বর কমাতে প্রোফাইল্যাকটিক প্যারাসিটামল সহায়ক।',
    },
    aftercare: {
      en: 'Injection-site pain is noticeably stronger than MenACWY for 1–3 days; rest arm and use cold compress.',
      bn: 'MenACWY-র তুলনায় হাতে ব্যথা কিছুটা বেশি হতে পারে যা ১–৩ দিনে সেরে যায়।',
    },
    formulations: 'Bexsero (GSK), Trumenba (Pfizer)',
  },
  'polio-ipv': {
    platform: {
      en: 'Full-dose Inactivated Trivalent Poliovirus Vaccine (Salk strains Types 1, 2, 3)',
      bn: 'পূর্ণ-ডোজ নিষ্ক্রিয় ট্রাইভ্যালেন্ট পোলিও ভ্যাকসিন (সাল্ক টাইপ ১, ২, ৩)',
    },
    route: {
      en: 'Intramuscular (IM) — anterolateral thigh (infants) or deltoid (children/adults)',
      bn: 'মাংসপেশিতে (IM) — শিশুর উরু বা বড়দের বাহু',
    },
    doseVolume: {
      en: '0.5 mL single injection',
      bn: '০.৫ মি.লি. একক ডোজ',
    },
    coldChain: {
      en: '+2°C to +8°C; NEVER freeze; open MDVP vials usable 28 days',
      bn: '+২°সে থেকে +৮°সে; কখনোই ফ্রিজ করবেন না; খোলা ভায়াল ২৮ দিন ব্যবহার্য',
    },
    dosingProtocol: {
      en: 'All-IPV countries: 4 doses (2, 4, 6–18 mo, 4–6 yrs). OPV-using countries: WHO recommends ≥2 IPV doses alongside bOPV (Bangladesh EPI delivers 2 fractional fIPV doses at 6 & 14 wks). Adult travel booster: 1 lifetime adult dose if ≥4 wks before endemic travel.',
      bn: 'আন্তর্জাতিক পূর্ণ-IPV সূচি: ৪ ডোজ (২, ৪, ৬–১৮ মাস, ৪–৬ বছর)। বাংলাদেশে bOPV-এর সাথে ৬ ও ১৪ সপ্তাহে fIPV দেওয়া হয়। প্রাপ্তবয়স্ক ভ্রমণকারী: জীবনে ১টি বুস্টার।',
    },
    immunityProfile: {
      en: '>99% humoral immunity against paralytic poliomyelitis across all 3 serotypes after ≥3 doses; zero VAPP/cVDPV risk.',
      bn: '৩ ডোজের পর ৩টি পোলিও টাইপের প্যারালাইসিস থেকে >৯৯% সুরক্ষা এবং ভ্যাকসিন-জাত পোলিওর কোনো ঝুঁকি নেই।',
    },
    specialPopulations: {
      en: 'Safe for immunocompromised children, HIV+, household contacts of immunosuppressed patients, and pregnant travelers requiring polio certification.',
      bn: 'দুর্বল রোগপ্রতিরোধ, এইচআইভি ও গর্ভবতী ভ্রমণকারীদের জন্য সম্পূর্ণ নিরাপদ।',
    },
    aftercare: {
      en: 'Minimal local redness or soreness; verify IHR Polio Certificate if traveling from/to active polio countries.',
      bn: 'হালকা ব্যথা ছাড়া তেমন পার্শ্বপ্রতিক্রিয়া নেই; প্রয়োজন হলে আন্তর্জাতিক পোলিও সনদ সংগ্রহ করুন।',
    },
    formulations: 'IPOL (Sanofi), Poliorix (GSK), ShanIPV / Imovax Polio (WHO PQ)',
  },
  dtp: {
    platform: {
      en: 'Combined Diphtheria Toxoid, Tetanus Toxoid & Whole-cell Bordetella pertussis (DTwP)',
      bn: 'ডিফথেরিয়া-টিটেনাস টক্সয়েড ও হোল-সেল পার্টুসিস (DTP / DTwP)',
    },
    route: {
      en: 'Intramuscular (IM) — anterolateral thigh (infants) or deltoid (toddlers)',
      bn: 'মাংসপেশিতে (IM) — উরু বা ডেল্টয়েড পেশী',
    },
    doseVolume: {
      en: '0.5 mL single injection (shake to suspend)',
      bn: '০.৫ মি.লি. একক ডোজ',
    },
    coldChain: {
      en: '+2°C to +8°C; strictly NEVER freeze; MDVP usable 28 days',
      bn: '+২°সে থেকে +৮°সে; ফ্রিজ করবেন না; খোলা ভায়াল ২৮ দিন ব্যবহার্য',
    },
    dosingProtocol: {
      en: '3 primary infant doses (6, 10, 14 weeks — given as Pentavalent in Bangladesh EPI) + WHO-recommended 12–23 month DTP booster and 4–7 year Td/DTaP booster. Only for children <7 years.',
      bn: '৬, ১০ ও ১৪ সপ্তাহে ৩টি প্রাথমিক ডোজ (বাংলাদেশে পেন্টাভ্যালেন্ট হিসেবে) + ১–২ বছর ও ৪–৬ বছরে বুস্টার (৭ বছরের কম বয়সী শিশুদের জন্য)।',
    },
    immunityProfile: {
      en: 'Whole-cell pertussis induces longer-lasting T-cell immunity against whooping cough (5–10 yrs) than acellular DTaP, with slightly higher transient post-dose fever.',
      bn: 'হোল-সেল পার্টুসিস অ্যাসেলুলার টিকার চেয়ে দীর্ঘমেয়াদী (৫–১০ বছর) হুপিং কাশি প্রতিরোধ ক্ষমতা গড়ে তোলে, তবে সাময়িক জ্বর কিছুটা বেশি হতে পারে।',
    },
    specialPopulations: {
      en: 'Never give ≥7 years (use Td/Tdap); discontinue pertussis component if anaphylaxis or unexplained encephalopathy occurred within 7 days of previous dose.',
      bn: '৭+ বছর বয়সে দেবেন না (সেক্ষেত্রে Td/Tdap দিন); আগের ডোজে গুরুতর মস্তিষ্কজনিত প্রতিক্রিয়া হলে পার্টুসিস বাদ দিন।',
    },
    aftercare: {
      en: 'Give fever/pain relief only if child is uncomfortable; seek urgent medical review for fever >40°C or persistent >3h inconsolable crying.',
      bn: '৪০°সে-এর বেশি জ্বর বা ৩ ঘণ্টার বেশি একটানা তীব্র কান্না হলে চিকিৎসকের পরামর্শ নিন।',
    },
    formulations: 'Adsorbed DTP (Serum Institute / Biological E / Bio Farma, WHO PQ)',
  },
  hib: {
    platform: {
      en: 'Purified Haemophilus influenzae type b capsular polysaccharide (PRP) conjugated to tetanus toxoid / CRM197',
      bn: 'হিমোফিলাস ইনফ্লুয়েঞ্জা টাইপ-বি (PRP) প্রোটিন-কনজুগেট টিকা (হিব)',
    },
    route: {
      en: 'Intramuscular (IM) — anterolateral thigh (or deltoid in older high-risk children)',
      bn: 'মাংসপেশিতে (IM) — শিশুর উরু বা বড়দের বাহু',
    },
    doseVolume: {
      en: '0.5 mL (liquid or reconstituted lyophilized vial)',
      bn: '০.৫ মি.লি. একক ডোজ',
    },
    coldChain: {
      en: '+2°C to +8°C; NEVER freeze; protect from light',
      bn: '+২°সে থেকে +৮°সে; ফ্রিজ করবেন না',
    },
    dosingProtocol: {
      en: 'Normally delivered via Pentavalent at 6, 10, 14 weeks (or private 2, 4, 6 mo + 12–15 mo booster). Unvaccinated healthy children ≥5 years do NOT need routine Hib; high-risk asplenia/sickle cell/HSCT patients DO get 1–3 catch-up doses.',
      bn: 'বাংলাদেশে পেন্টাভ্যালেন্টের অংশ হিসেবে ৬, ১০ ও ১৪ সপ্তাহে দেওয়া হয়। ৫+ বছরের সুস্থ শিশুর প্রয়োজন নেই; তবে প্লীহাহীন বা সিকল সেল রোগীদের ক্যাচ-আপ ডোজ প্রয়োজন।',
    },
    immunityProfile: {
      en: '>95% reduction in devastating childhood Hib meningitis, epiglottitis, septic arthritis, and bacterial pneumonia since 2009 Bangladesh introduction.',
      bn: '২০০৯ সালে বাংলাদেশে চালুর পর থেকে শিশুদের মারাত্মক হিব মেনিনজাইটিস ও নিউমোনিয়া >৯৫% হ্রাস করেছে।',
    },
    specialPopulations: {
      en: 'Vital for anatomic/functional asplenia, sickle cell disease, HIV, and bone-marrow transplant recipients at any age.',
      bn: 'প্লীহাহীনতা, সিকল সেল ও অস্থিমজ্জা প্রতিস্থাপন রোগীদের জন্য যেকোনো বয়সেই গুরুত্বপূর্ণ।',
    },
    aftercare: {
      en: 'Mild thigh redness or warmth clears within 24–48 hours.',
      bn: 'ইনজেকশনের স্থানে হালকা লালচে ভাব বা ব্যথা ১–২ দিনে কমে যায়।',
    },
    formulations: 'ActHIB (Sanofi), Hiberix (GSK), PedvaxHIB (MSD), Quimi-Hib (WHO PQ)',
  },
  'hepatitis-b-adult': {
    platform: {
      en: 'Adult recombinant HBsAg subunit (Aluminium-adjuvanted 3-dose or CpG-adjuvanted Heplisav-B 2-dose)',
      bn: 'প্রাপ্তবয়স্ক রিকম্বিন্যান্ট হেপাটাইটিস-বি সারফেস অ্যান্টিজেন টিকা (২০–৪০ মাইক্রোগ্রাম)',
    },
    route: {
      en: 'Intramuscular (IM) — deltoid muscle strictly (gluteal injection markedly lowers seroconversion)',
      bn: 'শুধুমাত্র বাহুর ডেল্টয়েড মাংসপেশিতে (IM) — নিতম্বে দিলে কার্যকারিতা কমে যায়',
    },
    doseVolume: {
      en: '1.0 mL (20 µg standard adult Engerix-B / Euvax-B); 0.5 mL (Heplisav-B 2-dose); 40 µg for dialysis patients',
      bn: '১.০ মি.লি. (২০ µg সাধারণ ডোজ); ডায়ালাইসিস রোগীদের ৪০ µg উচ্চ ডোজ',
    },
    coldChain: {
      en: '+2°C to +8°C; NEVER freeze; shake well before injecting',
      bn: '+২°সে থেকে +৮°সে; কখনোই ফ্রিজ করবেন না',
    },
    dosingProtocol: {
      en: 'Standard 3 doses at 0, 1, and 6 months (min intervals: ≥4 wks between Dose 1–2, ≥8 wks Dose 2–3, ≥16 wks Dose 1–3). Heplisav-B: 2 doses 1 month apart (adults ≥18). Never restart if delayed.',
      bn: 'সাধারণ ৩ ডোজ: ০, ১ ও ৬ মাসে (মাঝে বাদ পড়লেও নতুন করে শুরু নয়)। Heplisav-B: ১ মাস ব্যবধানে ২ ডোজ।',
    },
    immunityProfile: {
      en: '>90–95% seroprotection (even >95% in diabetics/elderly with CpG-adjuvanted 2-dose) guarding against chronic HBV cirrhosis and hepatocellular carcinoma.',
      bn: '৯০–৯৫%+ সুরক্ষা দেয় এবং দীর্ঘস্থায়ী হেপাটাইটিস-বি, লিভার সিরোসিস ও লিভার ক্যানসার থেকে আজীবন রক্ষা করে।',
    },
    specialPopulations: {
      en: 'Priority for HBsAg-negative household/sexual contacts, healthcare students/staff, dialysis/chronic liver patients, and diabetic adults <60; safe in pregnancy (use alum-adjuvanted Engerix-B/Recombivax).',
      bn: 'স্বাস্থ্যকর্মী, মেডিকেল/নার্সিং শিক্ষার্থী, ডায়ালাইসিস, ডায়াবেটিস রোগী ও পরিবারের আক্রান্ত ব্যক্তির সংস্পর্শীদের জন্য অপরিহার্য; গর্ভবতীর জন্যও নিরাপদ।',
    },
    aftercare: {
      en: 'Test HBsAg before starting if high-risk exposure history; verify anti-HBs ≥10 mIU/mL 1–2 months post-series in medical staff and immunocompromised hosts.',
      bn: 'স্বাস্থ্যকর্মী ও ঝুঁকিপূর্ণ ব্যক্তিদের ৩য় ডোজের ১–২ মাস পর রক্তে anti-HBs টাইটার পরীক্ষা করা উচিত।',
    },
    formulations: 'Engerix-B Adult (GSK), Hepavax-Gene, Euvax-B, Heplisav-B (Dynavax)',
  },
  mmrv: {
    platform: {
      en: 'Combined 4-in-1 Live-attenuated Measles, Mumps, Rubella, and higher-titer Varicella vaccine',
      bn: '৪-ইন-১ মৃদু জীবিত হাম, মাম্পস, রুবেলা ও ভ্যারিসেলা (জলবসন্ত) সমন্বয় টিকা (MMRV)',
    },
    route: {
      en: 'Subcutaneous (SC) — outer arm or anterolateral thigh',
      bn: 'চামড়ার নিচে (SC) — বাহু বা উরু',
    },
    doseVolume: {
      en: '0.5 mL freshly reconstituted; discard if unused after 30 minutes',
      bn: '০.৫ মি.লি. মিশ্রণের ৩০ মিনিটের মধ্যে ব্যবহার্য',
    },
    coldChain: {
      en: 'Frozen (-50°C to -15°C) or +2°C to +8°C (Priorix-Tetra); protect from light',
      bn: '-১৫°সে বা +২°সে থেকে +৮°সে (ব্র্যান্ডভেদে); আলো থেকে দূরে রাখুন',
    },
    dosingProtocol: {
      en: '2 doses for children aged 12 months–12 years (12–15 mo and 4–6 yrs; min 3 months apart). For children 12–47 months receiving Dose 1, separate MMR + Varicella shots in two limbs carry HALF the febrile seizure risk compared with MMRV.',
      bn: '১২ মাস–১২ বছর বয়সে ২ ডোজ (১২–১৫ মাস এবং ৪–৬ বছর)। ১২–৪৭ মাস বয়সে ১ম ডোজে MMRV-এর বদলে আলাদা MMR ও ভ্যারিসেলা নিলে জ্বর-খিঁচুনির ঝুঁকি অর্ধেক থাকে।',
    },
    immunityProfile: {
      en: 'Combines lifelong protection against 4 viral diseases while cutting needle count at preschool visits.',
      bn: 'প্রিস্কুল ভিজিটে ইনজেকশনের সংখ্যা কমিয়ে ৪টি ভাইরাসজনিত রোগ থেকে আজীবন সুরক্ষা দেয়।',
    },
    specialPopulations: {
      en: 'CONTRAINDICATED in pregnancy, severe immunodeficiency, and personal/family seizure history for 1st toddler dose (use separate MMR + Varicella).',
      bn: 'গর্ভাবস্থা ও দুর্বল রোগপ্রতিরোধে নিষিদ্ধ; শিশুর বা পরিবারে খিঁচুনির ইতিহাস থাকলে ১ম ডোজে আলাদা MMR + ভ্যারিসেলা ব্যবহার করুন।',
    },
    aftercare: {
      en: 'Fever peaks 5–12 days post-Dose 1 (~2× higher than MMR+V); avoid salicylates/aspirin for 6 weeks.',
      bn: '১ম ডোজের ৫–১২ দিন পর জ্বর দেখা দিতে পারে; ৬ সপ্তাহ অ্যাসপিরিন ব্যবহার করবেন না।',
    },
    formulations: 'Priorix-Tetra (GSK), ProQuad (MSD)',
  },
  dtap: {
    platform: {
      en: 'Diphtheria-Tetanus toxoids with 3-to-5 component Acellular Pertussis (aP) vaccine',
      bn: 'ডিফথেরিয়া-টিটেনাস টক্সয়েড ও অ্যাসেলুলার পার্টুসিস (DTaP) টিকা',
    },
    route: {
      en: 'Intramuscular (IM) — anterolateral thigh (infants) or deltoid (older toddlers)',
      bn: 'মাংসপেশিতে (IM) — উরু বা বাহুর ডেল্টয়েড পেশী',
    },
    doseVolume: {
      en: '0.5 mL single injection',
      bn: '০.৫ মি.লি. একক ডোজ',
    },
    coldChain: {
      en: '+2°C to +8°C; NEVER freeze; shake before withdrawal',
      bn: '+২°সে থেকে +৮°সে; ফ্রিজ করবেন না',
    },
    dosingProtocol: {
      en: '5 childhood doses (2, 4, 6 months, 15–18 months, and 4–6 years) strictly for children <7 years; Dose 5 unnecessary if Dose 4 was given at ≥4 years AND ≥6 months after Dose 3.',
      bn: '৭ বছরের কম বয়সী শিশুদের ৫ ডোজ (২, ৪, ৬, ১৫–১৮ মাস এবং ৪–৬ বছর)। ৪র্থ ডোজ ৪+ বছরে হলে ৫ম ডোজ প্রয়োজন নেই।',
    },
    immunityProfile: {
      en: '~85–95% protection against pertussis in early childhood with substantially fewer fever/febrile seizure events than whole-cell DTP, though waning starts 4–5 years later (requiring adolescent Tdap).',
      bn: 'শৈশবে ~৮৫–৯৫% হুপিং কাশি সুরক্ষা ও কম জ্বর-প্রতিক্রিয়া (কৈশোরে Tdap বুস্টার প্রয়োজন হয়)।',
    },
    specialPopulations: {
      en: 'Never administer at ≥7 years (high diphtheria/pertussis antigen dose causes sore arms—use Tdap/Td instead).',
      bn: '৭ বছর পূর্ণ হলে আর DTaP দেবেন না; এর বদলে কম-ডোজের Tdap বা Td দিন।',
    },
    aftercare: {
      en: 'Temporary localized limb swelling may follow 4th/5th doses and resolves spontaneously within days.',
      bn: '৪র্থ/৫ম ডোজে হাত বা পা সাময়িক ফুলে যেতে পারে যা কয়েক দিনে সেরে যায়।',
    },
    formulations: 'Infanrix (GSK), Daptacel (Sanofi)',
  },
  tdap: {
    platform: {
      en: 'Tetanus toxoid + reduced-dose Diphtheria toxoid & reduced-dose Acellular Pertussis (Tdap)',
      bn: 'টিটেনাস ও কম-ডোজের ডিফথেরিয়া-অ্যাসেলুলার পার্টুসিস বুস্টার (Tdap)',
    },
    route: {
      en: 'Intramuscular (IM) — deltoid muscle (adolescents & adults ≥7–10 years)',
      bn: 'মাংসপেশিতে (IM) — বাহুর ডেল্টয়েড পেশী (৭–১০+ বছর ও প্রাপ্তবয়স্ক)',
    },
    doseVolume: {
      en: '0.5 mL single injection',
      bn: '০.৫ মি.লি. একক ইনজেকশন',
    },
    coldChain: {
      en: '+2°C to +8°C; NEVER freeze; shake well',
      bn: '+২°সে থেকে +৮°সে; ফ্রিজ করবেন না',
    },
    dosingProtocol: {
      en: 'Routine 11–12 yr adolescent booster; pregnant women: 1 dose during EVERY pregnancy at 27–36 weeks gestation (regardless of previous Tdap history); adult catch-up if never received, followed by Td/Tdap every 10 years.',
      bn: '১১–১২ বছরে কিশোর বুস্টার এবং প্রতিটি গর্ভাবস্থায় ২৭–৩৬ সপ্তাহে ১ ডোজ (নবজাতককে হুপিং কাশি থেকে বাঁচাতে)। প্রাপ্তবয়স্কদের প্রতি ১০ বছরে Td/Tdap বুস্টার।',
    },
    immunityProfile: {
      en: 'Maternal 27–36 week Tdap transfers transplacental anti-pertussis antibodies, preventing >85–90% of fatal pertussis hospitalizations in newborns <2 months before Pentavalent begins.',
      bn: 'গর্ভাবস্থার ২৭–৩৬ সপ্তাহে Tdap নিলে নবজাতক জন্মের প্রথম ২ মাসে প্রাণঘাতী হুপিং কাশি থেকে >৮৫–৯০% সুরক্ষা পায়।',
    },
    specialPopulations: {
      en: 'Strongly recommended in every pregnancy and for household caregivers/grandparents ("cocooning") around newborns; also usable in dirty-wound PEP.',
      bn: 'গর্ভাবস্থা, স্তন্যদান ও নবজাতকের কাছাকাছি থাকা অভিভাবকদের জন্য অত্যন্ত উপকারী।',
    },
    aftercare: {
      en: 'Mild deltoid ache or fatigue lasts 1–2 days; ice pack helps soreness.',
      bn: '১–২ দিন বাহুতে হালকা ব্যথা হতে পারে; প্রয়োজনে ঠান্ডা সেঁক দিন।',
    },
    formulations: 'Boostrix (GSK), Adacel (Sanofi)',
  },
  smallpox: {
    platform: {
      en: 'Replicating Vaccinia virus (ACAM2000) or non-replicating MVA-BN (JYNNEOS)',
      bn: 'রেপ্লিকেটিং ভ্যাকসিনিয়া (ACAM2000) অথবা নন-রেপ্লিকেটিং MVA-BN স্মলপক্স/এমপক্স টিকা',
    },
    route: {
      en: 'Percutaneous scarification via bifurcated needle (ACAM2000) OR Subcutaneous 2-dose (JYNNEOS)',
      bn: 'দ্বি-মুখী সূচে ত্বকের ওপর আঁচড় (ACAM2000) অথবা চামড়ার নিচে ২ ডোজ (JYNNEOS)',
    },
    doseVolume: {
      en: '0.0025 mL droplet on bifurcated needle (15 jabs) OR 0.5 mL SC (JYNNEOS)',
      bn: 'বাইফারকেটেড সূচে ১ ফোঁটা (ACAM2000) বা ০.৫ মি.লি. SC (JYNNEOS)',
    },
    coldChain: {
      en: '-20°C / -25°C frozen long term; +2°C to +8°C thawed per product limits',
      bn: 'দীর্ঘমেয়াদে -২০°সে থেকে -২৫°সে; গলানোর পর +২°সে–+৮°সে নির্ধারিত সময়',
    },
    dosingProtocol: {
      en: 'Smallpox was globally eradicated in 1980; immunization is restricted strictly to orthopoxvirus laboratory staff, emergency responders, and military stockpiles (or mpox overlap via JYNNEOS).',
      bn: '১৯৮০ সালে গুটিবসন্ত নির্মূল হওয়ায় বর্তমানে শুধু ল্যাব গবেষক ও জরুরি প্রতিরক্ষা কর্মীদের জন্য সীমাবদ্ধ (২৮ দিন ব্যবধানে ২ ডোজ JYNNEOS)।',
    },
    immunityProfile: {
      en: '>95% cross-protective orthopoxvirus immunity against variola (smallpox) and high protection against mpox.',
      bn: 'ভ্যারিওলা (গুটিবসন্ত) ও এমপক্স ভাইরাসের বিরুদ্ধে উচ্চ ক্রস-সুরক্ষা প্রদান করে।',
    },
    specialPopulations: {
      en: 'ACAM2000 has strict contraindications (eczema, HIV/immunosuppression, pregnancy, heart disease due to myopericarditis risk); JYNNEOS avoids autoinoculation and eczema vaccinatum.',
      bn: 'ACAM2000 একজিমা, হৃদরোগ, গর্ভাবস্থা ও দুর্বল অনাক্রম্যতায় নিষিদ্ধ—ঝুঁকিপূর্ণদের ক্ষেত্রে JYNNEOS ব্যবহার্য।',
    },
    aftercare: {
      en: 'For ACAM2000, keep vaccination site covered with semi-permeable bandage and wash hands strictly until the scab falls off (~3 weeks) to prevent accidental eye/contact spread.',
      bn: 'ACAM2000 নিলে ক্ষতের মামড়ি ঝরে না পড়া পর্যন্ত ঢেকে রাখুন এবং চোখে হাত দেবেন না।',
    },
    formulations: 'ACAM2000 (Emergent), JYNNEOS / Imvanex (Bavarian Nordic)',
  },
  'typhoid-oral': {
    platform: {
      en: 'Live-attenuated Salmonella enterica serovar Typhi Ty21a enteric-coated oral capsules',
      bn: 'মৃদু জীবিত সালমোনেলা টাইফি Ty21a এন্টেরিক-কোটেড মুখে খাওয়ার ক্যাপসুল',
    },
    route: {
      en: 'Oral (PO) — capsules swallowed WHOLE with cool/lukewarm water (<37°C) 1 hour BEFORE a meal',
      bn: 'মুখে খাওয়া (PO) — খাবারের ১ ঘণ্টা আগে ঠান্ডা/কুসুম পানির সাথে আস্ত গিলুন (চাবাবেন না)',
    },
    doseVolume: {
      en: '4 enteric-coated capsules total (1 capsule on Days 1, 3, 5, and 7)',
      bn: 'মোট ৪টি ক্যাপসুল (১, ৩, ৫ ও ৭তম দিনে ১টি করে)',
    },
    coldChain: {
      en: '+2°C to +8°C strictly; NEVER freeze; store capsules refrigerated between alternate-day doses',
      bn: '+২°সে থেকে +৮°সে ফ্রিজে রাখুন (ডিপ ফ্রিজে নয়); ডোজের দিনগুলোর মাঝেও ফ্রিজে সংরক্ষণ করুন',
    },
    dosingProtocol: {
      en: '1 capsule on Days 1, 3, 5, and 7 for ages ≥6 years (complete ≥1 week before travel; repeat booster every 5 years in US/every 3 yrs in Europe). Separate from antibiotics/antimalarials by ≥3 days.',
      bn: '৬+ বছর বয়সীদের ১, ৩, ৫ ও ৭তম দিনে মোট ৪টি ক্যাপসুল (ভ্রমণের অন্তত ১ সপ্তাহ আগে শেষ করুন; প্রতি ৩–৫ বছরে বুস্টার)। অ্যান্টিবায়োটিক খাওয়ার ৩ দিনের মধ্যে নেবেন না।',
    },
    immunityProfile: {
      en: '50–80% efficacy over 3–7 years; builds local intestinal IgA + systemic immunity without needles.',
      bn: 'সূচ ছাড়াই অন্ত্রে স্থানীয় IgA ও সিস্টেমিক সুরক্ষা গড়ে তোলে যা ৩–৭ বছর ৫০–৮০% কার্যকর।',
    },
    specialPopulations: {
      en: 'CONTRAINDICATED in children <6 years (cannot swallow capsules safely), acute diarrhea/vomiting, pregnancy, immunocompromised hosts, and active antibiotic use (use TCV or ViPS injection instead).',
      bn: '৬ বছরের নিচে শিশু, তীব্র ডায়রিয়া, গর্ভবতী, দুর্বল অনাক্রম্যতা ও অ্যান্টিবায়োটিক চলমান থাকলে নিষিদ্ধ (পরিবর্তে TCV ইনজেকশন নিন)।',
    },
    aftercare: {
      en: 'NEVER chew/open capsules or swallow with hot drinks/milk (stomach acid or heat kills Ty21a bacteria).',
      bn: 'ক্যাপসুল চাবানো বা গরম পানীয়/দুধের সাথে খাওয়া যাবে না।',
    },
    formulations: 'Vivotif (Bavarian Nordic)',
  },
  'rsv-pregnancy': {
    platform: {
      en: 'Bivalent unadjuvanted recombinant RSV prefusion F (RSVpreF) maternal vaccine',
      bn: 'অ্যাডজুভ্যান্ট-বিহীন রিকম্বিন্যান্ট RSVpreF মাতৃকালীন টিকা (Abrysvo)',
    },
    route: {
      en: 'Intramuscular (IM) — deltoid muscle during 32–36 weeks pregnancy',
      bn: 'মাংসপেশিতে (IM) — গর্ভাবস্থার ৩২–৩৬ সপ্তাহে বাহুর ডেল্টয়েড পেশী',
    },
    doseVolume: {
      en: '0.5 mL single reconstituted dose (only Abrysvo is pregnancy-approved; NOT Arexvy)',
      bn: '০.৫ মি.লি. একক ডোজ (কেবলমাত্র Abrysvo গর্ভাবস্থায় অনুমোদিত)',
    },
    coldChain: {
      en: '+2°C to +8°C; NEVER freeze; administer within 4 hours of mixing',
      bn: '+২°সে থেকে +৮°সে; ফ্রিজ করবেন না; মেশানোর ৪ ঘণ্টার মধ্যে দিন',
    },
    dosingProtocol: {
      en: 'Single IM dose between 32 weeks 0 days and 36 weeks 6 days of gestation (at least 14 days prior to delivery so maternal IgG transfers across the placenta). Not repeated in subsequent pregnancies under current CDC guidance—use nirsevimab for later babies until multi-pregnancy data mature.',
      bn: 'গর্ভাবস্থার ৩২–৩৬ সপ্তাহের মধ্যে ১ ডোজ (প্রসবের অন্তত ১৪ দিন আগে, যাতে মায়ের অ্যান্টিবডি গর্ভফুল দিয়ে শিশুতে পৌঁছায়)।',
    },
    immunityProfile: {
      en: '~81.8% reduction in severe hospitalized newborn RSV lower respiratory infection in the first 3 months of life (~69% through 6 months).',
      bn: 'জন্মের প্রথম ৩ মাসে নবজাতকের মারাত্মক RSV ব্রঙ্কিওলাইটিস ও হাসপাতালে ভর্তি ~৮১.৮% প্রতিরোধ করে।',
    },
    specialPopulations: {
      en: 'Strictly stay within the 32–36 week window to avoid theoretical preterm signal seen at earlier gestational weeks in trials; safe alongside Tdap, Influenza, and COVID-19 shots.',
      bn: 'গর্ভাবস্থার ৩২–৩৬ সপ্তাহের বাইরে দেবেন না; একই সময়ে Tdap, ফ্লু ও কোভিড টিকার সাথে নিরাপদ।',
    },
    aftercare: {
      en: 'Tell your pediatrician/OB the exact vaccination date; if baby delivers <14 days after injection, baby still needs nirsevimab.',
      bn: 'শিশুরোগ বিশেষজ্ঞকে টিকার তারিখ জানিয়ে রাখুন; টিকার ১৪ দিনের মধ্যে প্রসব হলে শিশুকে নীরসেভিমাব দেওয়া প্রয়োজন।',
    },
    formulations: 'Abrysvo (Pfizer — WHO SAGE / FDA / EMA maternal approval)',
  },
};

export const vaccineClinicalProfiles: Record<string, VaccineClinicalProfile> = {
  ...coreVaccineClinicalProfiles,
  ...extraVaccineClinicalProfiles,
};

/**
 * Look up the detailed clinical profile for any vaccine in `allVaccines`.
 * Every one of the 90 catalogue entries has an explicit bespoke entry; the
 * fallback handles any synthetic test fixture cleanly.
 */
export function getVaccineClinicalProfile(vaccine: Vaccine): VaccineClinicalProfile {
  const exact = vaccineClinicalProfiles[vaccine.id];
  if (exact) return exact;

  return {
    platform: {
      en: `Licensed ${vaccine.category.replace('_', ' ')} immunization formulation`,
      bn: `অনুমোদিত টিকাদান ফর্মুলেশন (${vaccine.category})`,
    },
    route: {
      en: 'Administer per manufacturer monograph and DGHS EPI clinic protocol',
      bn: 'প্রস্তুতকারকের নির্দেশিকা ও ডিজিএইচএস ইপিআই প্রোটোকল অনুযায়ী প্রয়োগযোগ্য',
    },
    doseVolume: {
      en: 'Standard single-dose volume per product monograph',
      bn: 'পণ্যের নির্দেশিকা অনুযায়ী আদর্শ একক ডোজ',
    },
    coldChain: {
      en: '+2°C to +8°C cold-chain storage; inspect VVM before drawing dose',
      bn: '+২°সে থেকে +৮°সে কোল্ড-চেইন সংরক্ষণ; ডোজ নেওয়ার আগে VVM যাচাই করুন',
    },
    dosingProtocol: {
      en: `${vaccine.schedule.en} (${vaccine.doses} dose schedule). Confirm minimum intervals with a registered provider.`,
      bn: `${vaccine.schedule.bn} (${vaccine.doses} ডোজ সূচি)। নিবন্ধিত স্বাস্থ্যকর্মীর সাথে ব্যবধান নিশ্চিত করুন।`,
    },
    immunityProfile: {
      en: vaccine.efficacy
        ? `Published efficacy ~${vaccine.efficacy} against ${vaccine.disease.en}.`
        : `${vaccine.disease.en} prevention.`,
      bn: vaccine.efficacy
        ? `${vaccine.disease.bn} প্রতিরোধে ~${vaccine.efficacy} কার্যকারিতা।`
        : `${vaccine.disease.bn} প্রতিরোধে সহায়ক।`,
    },
    specialPopulations: {
      en: vaccine.contraindications.en,
      bn: vaccine.contraindications.bn,
    },
    aftercare: {
      en: vaccine.commonEffects.en,
      bn: vaccine.commonEffects.bn,
    },
    formulations: vaccine.source,
  };
}
