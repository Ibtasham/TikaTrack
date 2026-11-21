import type { VaccineClinicalProfile } from './vaccineClinicalDetails';

/**
 * Detailed clinical pharmacology & administration profiles for vaccines #46–#90
 * (`rabies-preexposure` through `adenovirus`). Merged into `vaccineClinicalProfiles`.
 */
export const extraVaccineClinicalProfiles: Record<string, VaccineClinicalProfile> = {
  'rabies-preexposure': {
    platform: {
      en: 'Inactivated purified cell-culture rabies virus (VERO / PCECV / HDCV)',
      bn: 'নিষ্ক্রিয় পিউরিফায়েড সেল-কালচার জলাতঙ্ক ভাইরাস (VERO / PCECV / HDCV)',
    },
    route: {
      en: 'Intramuscular (IM, deltoid) or 2-site Intradermal (ID, deltoid)',
      bn: 'মাংসপেশিতে (IM, ডেল্টয়েড) অথবা ২-সাইট ত্বকের ভেতরে (ID, ডেল্টয়েড)',
    },
    doseVolume: {
      en: '1.0 mL (or 0.5 mL per product) IM; 0.1 mL per site (2 sites) ID',
      bn: '১.০ মি.লি. (বা পণ্যানুযায়ী ০.৫ মি.লি.) IM; প্রতি স্থানে ০.১ মি.লি. (২ স্থান) ID',
    },
    coldChain: {
      en: '+2°C to +8°C (freeze-dried lyophilized powder + diluent); use reconstituted vial within 6–8 hours',
      bn: '+২°সে থেকে +৮°সে (লাইওফিলাইজড পাউডার ও ডাইলুয়েন্ট); গুলানোর পর ৬–৮ ঘণ্টার মধ্যে ব্যবহার্য',
    },
    dosingProtocol: {
      en: 'WHO abridged PrEP: 2 visits on Days 0 and 7 (2-site ID or 1-site IM); traditional 3-dose (0, 7, 21–28 days). Eliminates need for RIG if later bitten (only 2-dose PEP boosters on Days 0 & 3 needed).',
      bn: 'WHO সংক্ষিপ্ত PrEP: দিন ০ ও দিন ৭-এ ২ বার (২-সাইট ID বা ১-সাইট IM); প্রচলিত ৩-ডোজ (০, ৭, ২১–২৮ দিন)। পরবর্তীতে কামড় হলে আর RIG লাগে না—শুধু ০ ও ৩ দিনে ২টি বুস্টার ডোজ যথেষ্ট।',
    },
    immunityProfile: {
      en: 'Long-lasting immune memory (>10 years) with rapid anamnestic neutralizing antibody rise after booster; periodic serology recommended for lab/vet staff.',
      bn: 'দীর্ঘমেয়াদী ইমিউন মেমোরি (>১০ বছর) ও বুস্টারের পর দ্রুত অ্যান্টিবডি বৃদ্ধি; ল্যাব বা পশুচিকিৎসকদের নিয়মিত টাইটার পরীক্ষা সুপারিশকৃত।',
    },
    specialPopulations: {
      en: 'Safe in pregnancy, lactation, and infants when occupational or travel exposure risk exists. Immunocompromised individuals require 3-dose regimen and post-vaccination antibody titer check.',
      bn: 'ঝুঁকিপূর্ণ পেশা বা ভ্রমণে গর্ভাবস্থা ও স্তন্যদানে নিরাপদ। রোগপ্রতিরোধ ক্ষমতা দুর্বল হলে ৩-ডোজ ও টাইটার পরীক্ষা প্রয়োজন।',
    },
    aftercare: {
      en: 'Mild soreness, redness, or low-grade fever resolves within 24–48 hours. Record PrEP certificate dates carefully so emergency RIG is avoided after exposure.',
      bn: 'ইনজেকশনের স্থানে হালকা ব্যথা বা সামান্য জ্বর ২৪–৪৮ ঘণ্টায় সেরে যায়। প্রি-এক্সপোজার সনদ সংরক্ষণ করুন যাতে কামড়ের পর অপ্রয়োজনীয় RIG এড়ানো যায়।',
    },
    formulations: 'Verorab (Sanofi), Rabipur / PCECV, Abhayrab, Indirab (WHO PQ)',
  },
  hexavalent: {
    platform: {
      en: 'Combined toxoids (DTaP), inactivated poliovirus (IPV), recombinant HepB & conjugated Hib',
      bn: 'সমন্বিত টক্সয়েড (DTaP), নিষ্ক্রিয় পোলিও (IPV), রিকম্বিন্যান্ট হেপ-বি ও কনজুগেটেড হিব',
    },
    route: {
      en: 'Intramuscular (IM) — anterolateral thigh (<2 yrs) or deltoid',
      bn: 'মাংসপেশিতে (IM) — উরুর বাইরের দিক (<২ বছর) বা বাহু',
    },
    doseVolume: {
      en: '0.5 mL single ready-to-use prefilled syringe or reconstituted liquid',
      bn: '০.৫ মি.লি. প্রস্তুত প্রি-ফিল্ড সিরিঞ্জ বা মিশ্রিত তরল',
    },
    coldChain: {
      en: '+2°C to +8°C; NEVER freeze (aluminium adjuvant clumps and loses potency if frozen)',
      bn: '+২°সে থেকে +৮°সে; কখনোই ফ্রিজ করবেন না (জমে গেলে অ্যালুমিনিয়াম অ্যাডজুভ্যান্ট নষ্ট হয়)',
    },
    dosingProtocol: {
      en: 'Private pediatric schedule: 3 primary doses at 6, 10, 14 weeks (or 2, 4, 6 months) with 4th booster at 15–18 months; minimum 4-week interval between primary doses.',
      bn: 'বেসরকারি শিশু সূচি: ৬, ১০, ১৪ সপ্তাহে (বা ২, ৪, ৬ মাসে) ৩টি প্রাথমিক ডোজ এবং ১৫–১৮ মাসে ৪র্থ বুস্টার; প্রাথমিক ডোজের ন্যূনতম ব্যবধান ৪ সপ্তাহ।',
    },
    immunityProfile: {
      en: '90–98% seroprotection against all 6 target pathogens; acellular pertussis (aP) reduces fever/reactogenicity vs whole-cell Pentavalent though wanes slightly earlier without boosters.',
      bn: '৬টি রোগের বিরুদ্ধেই ৯০–৯৮% সুরক্ষা; হোল-সেল পেন্টাভ্যালেন্টের তুলনায় অ্যাসেলুলার পার্টুসিস (aP)-এ জ্বর কম হয়, তবে সময়মতো বুস্টার জরুরি।',
    },
    specialPopulations: {
      en: 'Safe for premature infants (immunize by chronological age; apnea monitoring for 48–72h in extreme preterms <28 weeks). Not licensed for children ≥7 years.',
      bn: 'সময়ের আগে জন্ম নেওয়া শিশুদের জন্ম-বয়স অনুযায়ী নিরাপদ (<২৮ সপ্তাহে জন্মালে ৪৮–৭২ ঘণ্টা শ্বাস-পর্যবেক্ষণ)। ৭+ বছর বয়সীদের জন্য প্রযোজ্য নয়।',
    },
    aftercare: {
      en: 'Mild redness or fussiness lasts 1–2 days; apply cool cloth if tender. Do not skip the 15–18 month booster.',
      bn: 'হালকা লালচে ভাব বা অস্থিরতা ১–২ দিনে কমে। ১৫–১৮ মাসের বুস্টার ডোজ মিস করবেন না।',
    },
    formulations: 'Hexaxim (Sanofi), Infanrix Hexa (GSK), EasySix',
  },
  'pentavalent-booster': {
    platform: {
      en: 'Combined Diphtheria-Tetanus toxoids, whole-cell/acellular Pertussis, HepB & Hib conjugate',
      bn: 'ডিফথেরিয়া-টিটেনাস টক্সয়েড, পার্টুসিস, হেপাটাইটিস-বি ও হিব কনজুগেট বুস্টার',
    },
    route: {
      en: 'Intramuscular (IM) — anterolateral thigh or deltoid',
      bn: 'মাংসপেশিতে (IM) — উরুর বাইরের দিক বা বাহুর ডেল্টয়েড',
    },
    doseVolume: {
      en: '0.5 mL single injection',
      bn: '০.৫ মি.লি. একক ইনজেকশন',
    },
    coldChain: {
      en: '+2°C to +8°C; shake gently before drawing; NEVER freeze',
      bn: '+২°সে থেকে +৮°সে; নেওয়ার আগে আলতো করে ঝাঁকান; ফ্রিজ করবেন না',
    },
    dosingProtocol: {
      en: 'Given at 15–18 months, at least 6 months after the 3rd primary Pentavalent/DTaP dose, to reinforce waning Hib and pertussis antibody levels.',
      bn: 'তৃতীয় প্রাথমিক ডোজের অন্তত ৬ মাস পর ১৫–১৮ মাস বয়সে দেওয়া হয়, যা হিব ও পার্টুসিসের কমতে থাকা রোগপ্রতিরোধ ক্ষমতা পুনর্গঠন করে।',
    },
    immunityProfile: {
      en: 'Produces strong anamnestic booster titers across all antigens, carrying protection through preschool years.',
      bn: 'সব অ্যান্টিজেনের বিরুদ্ধে শক্তিশালী বুস্টার অ্যান্টিবডি তৈরি করে এবং প্রিস্কুল বয়স পর্যন্ত সুরক্ষা ধরে রাখে।',
    },
    specialPopulations: {
      en: 'Verify previous adverse reactions (hypotonic-hyporesponsive episode, fever >40.5°C, anaphylaxis) before administering whole-cell pertussis formulations.',
      bn: 'হোল-সেল পার্টুসিস বুস্টারের আগে পূর্ববর্তী ডোজে উচ্চ জ্বর (>৪০.৫°সে) বা অ্যালার্জি ছিল কিনা যাচাই করুন।',
    },
    aftercare: {
      en: 'Use age-weight paracetamol only if uncomfortable fever develops; keep limb moving normally.',
      bn: 'অস্বস্তিকর জ্বর বা ব্যথা হলে চিকিৎসকের পরামর্শমতো প্যারাসিটামল ব্যবহার করুন।',
    },
    formulations: 'DTwP-HepB-Hib Booster (Serum Institute / Biological E) / DTaP-IPV-Hib',
  },
  'malaria-r21': {
    platform: {
      en: 'Recombinant circumsporozoite protein nanoparticle with Matrix-M saponin adjuvant',
      bn: 'রিকম্বিন্যান্ট সারকামস্পোরোজয়েট প্রোটিন ন্যানো-পার্টিকেল ও ম্যাট্রিক্স-এম অ্যাডজুভ্যান্ট',
    },
    route: {
      en: 'Intramuscular (IM) — anterolateral thigh (infants) or deltoid',
      bn: 'মাংসপেশিতে (IM) — উরুর বাইরের দিক (শিশু) বা ডেল্টয়েড',
    },
    doseVolume: {
      en: '0.5 mL liquid vial',
      bn: '০.৫ মি.লি. তরল ভায়াল',
    },
    coldChain: {
      en: '+2°C to +8°C; strictly freeze-sensitive; inspect Matrix-M suspension before withdrawal',
      bn: '+২°সে থেকে +৮°সে; ফ্রিজ-সংবেদনশীল; ব্যবহারের আগে ভায়াল পরীক্ষা করুন',
    },
    dosingProtocol: {
      en: 'WHO-recommended 4-dose pediatric regimen in P. falciparum endemic settings: 3 primary doses starting from 5 months (minimum 4 weeks apart) + 4th dose 12 months after dose 3.',
      bn: 'ম্যালেরিয়া-প্রবণ অঞ্চলে ৫ মাস বয়স থেকে ৪ ডোজ: অন্তত ৪ সপ্তাহ ব্যবধানে ৩টি প্রাথমিক ডোজ এবং ৩য় ডোজের ১২ মাস পর ৪র্থ ডোজ।',
    },
    immunityProfile: {
      en: '~75% efficacy against clinical malaria in seasonal transmission areas when paired with bed nets and chemoprevention.',
      bn: 'মৌসুমি সংক্রমণ অঞ্চলে মশারি ও প্রতিরোধী চিকিৎসার সাথে ক্লিনিকাল ম্যালেরিয়ার বিরুদ্ধে ~৭৫% কার্যকর।',
    },
    specialPopulations: {
      en: 'Authorized for children 5–36 months in moderate-to-high P. falciparum endemic areas (not for adult travelers or low-transmission urban clinics).',
      bn: 'মাঝারি-থেকে-উচ্চ পি. ফ্যালসিপেরাম সংক্রমণ এলাকার ৫–৩৬ মাস বয়সী শিশুদের জন্য; সাধারণ ভ্রমণকারী প্রাপ্তবয়স্কদের জন্য নয়।',
    },
    aftercare: {
      en: 'Continue insecticide-treated bed nets and prompt fever testing—malaria vaccines provide partial protection and do not replace vector control.',
      bn: 'টিকা দেওয়ার পরও মশারি ব্যবহার ও জ্বর হলে দ্রুত ম্যালেরিয়া পরীক্ষা অব্যাহত রাখুন।',
    },
    formulations: 'R21/Matrix-M (Serum Institute of India / University of Oxford, WHO PQ)',
  },
  'tb-new': {
    platform: {
      en: 'Investigational Phase 3 subunit/adjuvanted vaccine candidate (M72/AS01E & MTBVAC)',
      bn: 'গবেষণাধীন ফেজ-৩ সাবইউনিট ও লাইভ-অ্যাটেনুয়েটেড যক্ষ্মা টিকা (M72/AS01E ও MTBVAC)',
    },
    route: {
      en: 'Intramuscular (IM, M72/AS01E) or Intradermal (ID, MTBVAC) in clinical trials',
      bn: 'ক্লিনিকাল ট্রায়ালে মাংসপেশিতে (IM, M72) অথবা ত্বকের ভেতরে (ID, MTBVAC)',
    },
    doseVolume: {
      en: '0.5 mL (investigational protocol; not commercially licensed)',
      bn: '০.৫ মি.লি. (গবেষণা প্রোটোকল; বাণিজ্যিকভাবে অনুমোদিত নয়)',
    },
    coldChain: {
      en: '+2°C to +8°C in trial supply chains; not stocked in routine EPI clinics',
      bn: 'গবেষণা সরবরাহ চেইনে +২°সে থেকে +৮°সে; সাধারণ ইপিআই কেন্দ্রে পাওয়া যায় না',
    },
    dosingProtocol: {
      en: 'No licensed public schedule yet. M72/AS01E Phase 3 trials evaluate 2 IM doses 1 month apart in adolescents and adults with latent TB infection.',
      bn: 'এখনো কোনো সাধারণ সূচি নেই। ফেজ-৩ ট্রায়ালে কিশোর ও প্রাপ্তবয়স্কদের ১ মাস ব্যবধানে ২টি IM ডোজ মূল্যায়ন করা হচ্ছে।',
    },
    immunityProfile: {
      en: 'Phase 2b showed ~49.7% protection against progression from latent TB to active pulmonary disease; Phase 3 confirmation underway across Africa and Asia.',
      bn: 'ফেজ-২বি গবেষণায় সুপ্ত যক্ষ্মা থেকে সক্রিয় ফুসফুসের যক্ষ্মা প্রতিরোধে ~৪৯.৭% কার্যকারিতা দেখা গেছে; ফেজ-৩ পরীক্ষা চলমান।',
    },
    specialPopulations: {
      en: 'Available strictly inside ethics-approved clinical trials; neonatal BCG remains the only WHO-recommended TB vaccine currently in Bangladesh EPI.',
      bn: 'শুধুমাত্র অনুমোদিত ক্লিনিকাল ট্রায়ালে সীমাবদ্ধ; বর্তমানে বাংলাদেশে নবজাতকের বিসিজি-ই একমাত্র অনুমোদিত যক্ষ্মা টিকা।',
    },
    aftercare: {
      en: 'For persistent cough >2 weeks, night sweats, or weight loss, seek free DOTS sputum/GeneXpert screening at your Upazila or NIDCH clinic.',
      bn: '২ সপ্তাহের বেশি কাশি, রাতে ঘাম বা ওজন কমলে নিকটস্থ সরকারি যক্ষ্মা (DOTS) কেন্দ্রে পরীক্ষা করান।',
    },
    formulations: 'Investigational only (M72/AS01E, MTBVAC — Not Licensed)',
  },
  hiv: {
    platform: {
      en: 'Investigational vaccine research (mRNA germline-targeting, broadly neutralizing mAbs)',
      bn: 'গবেষণাধীন এইচআইভি টিকা (mRNA জার্মলাইন-টার্গেটিং ও ব্রডলি নিউট্রালাইজিং অ্যান্টিবডি)',
    },
    route: {
      en: 'Experimental IM / IV clinical trials only — NO licensed HIV vaccine exists globally',
      bn: 'শুধু পরীক্ষামূলক গবেষণা — বিশ্বব্যাপী কোনো অনুমোদিত এইচআইভি টিকা নেই',
    },
    doseVolume: {
      en: 'Not applicable (investigational only)',
      bn: 'প্রযোজ্য নয় (শুধুমাত্র গবেষণা পর্যায়ে)',
    },
    coldChain: {
      en: 'Not applicable (no commercial product available)',
      bn: 'প্রযোজ্য নয় (বাণিজ্যিক পণ্য নেই)',
    },
    dosingProtocol: {
      en: 'Do not mistake HIV research for an available vaccine. Use proven prevention: condoms, sterile needles, U=U antiretroviral therapy (ART), PrEP, and PEP within 72 hours of exposure.',
      bn: 'এইচআইভি টিকা গবেষণাকে উপলব্ধ টিকা ভাববেন না। প্রমাণিত প্রতিরোধ ব্যবস্থা—কনডম, জীবাণুমুক্ত সিরিঞ্জ, নিয়মিত ART, PrEP ও ঝুঁকির ৭২ ঘণ্টার মধ্যে PEP—ব্যবহার করুন।',
    },
    immunityProfile: {
      en: 'Extreme HIV envelope mutation rate and glycan shielding have prevented any candidate from achieving regulatory licensure to date.',
      bn: 'এইচআইভি ভাইরাসের দ্রুত মিউটেশনের কারণে এখনো কোনো টিকা চূড়ান্ত অনুমোদন পায়নি।',
    },
    specialPopulations: {
      en: 'People living with HIV on suppressive ART should still receive standard inactivated vaccines (HepB, Pneumococcal, Tdap, Influenza, HPV).',
      bn: 'ART-তে থাকা এইচআইভি আক্রান্ত ব্যক্তিদের নিয়মিত নিষ্ক্রিয় টিকা (হেপ-বি, নিউমোকক্কাল, টিড্যাপ, ফ্লু, এইচপিভি) গ্রহণ করা জরুরি।',
    },
    aftercare: {
      en: 'Confidential HIV testing and ART care in Bangladesh are available through government Medical College ART centres and ASP.',
      bn: 'বাংলাদেশে গোপনীয় এইচআইভি পরীক্ষা ও বিনামূল্যে ART চিকিৎসা সরকারি মেডিকেল কলেজ হাসপাতাল ও ASP কেন্দ্রে পাওয়া যায়।',
    },
    formulations: 'None licensed (Research / Clinical Trials Only)',
  },
  'cancer-cervical': {
    platform: {
      en: 'Investigational therapeutic HPV/cancer immunotherapy (unlike preventive Gardasil/Cervarix)',
      bn: 'গবেষণাধীন থেরাপিউটিক ক্যানসার ইমিউনোথেরাপি (প্রতিরোধমূলক এইচপিভি টিকা থেকে ভিন্ন)',
    },
    route: {
      en: 'Experimental trial protocols only; preventive HPV vaccination is licensed & widely available',
      bn: 'শুধু গবেষণা প্রোটোকল; প্রতিরোধমূলক এইচপিভি টিকা (গার্ডাসিল/সার্ভারিক্স) অনুমোদিত ও সহজলভ্য',
    },
    doseVolume: {
      en: 'Not applicable (investigational therapeutic only)',
      bn: 'প্রযোজ্য নয় (থেরাপিউটিক গবেষণা পর্যায়ে)',
    },
    coldChain: {
      en: 'Not applicable',
      bn: 'প্রযোজ্য নয়',
    },
    dosingProtocol: {
      en: 'No therapeutic vaccine treats established cervical cancer yet. Girls 10–14 years should receive the preventive Bangladesh EPI HPV vaccine; women 30–60 years need regular VIA / Pap / HPV-DNA screening.',
      bn: 'সৃষ্ট ক্যানসার সারানোর কোনো টিকা এখনো অনুমোদিত হয়নি। ১০–১৪ বছরের মেয়েদের ইপিআই-এর প্রতিরোধমূলক HPV টিকা এবং ৩০–৬০ বছর বয়সী নারীদের নিয়মিত VIA/প্যাপ স্ক্রিনিং করাতে হবে।',
    },
    immunityProfile: {
      en: 'Therapeutic candidates aim to stimulate cytotoxic T-cells against HPV E6/E7 oncoproteins; preventive L1 VLP vaccines (HPV/HPV9) remain >90% effective before exposure.',
      bn: 'প্রতিরোধমূলক HPV টিকা সংক্রমণের আগে দিলে জরায়ুমুখ ক্যানসার >৯০% প্রতিরোধ করে; থেরাপিউটিক টিকা এখনো পরীক্ষামূলক।',
    },
    specialPopulations: {
      en: 'Women with precancerous CIN lesions or cervical cancer require gynecologic oncology management, not experimental vaccines.',
      bn: 'ক্যানসার-পূর্ব বা ক্যানসার রোগীদের গাইনি-অনকোলজি বিশেষজ্ঞের চিকিৎসা প্রয়োজন।',
    },
    aftercare: {
      en: 'Free VIA screening is available at District Sadar Hospitals and Upazila Health Complexes across Bangladesh.',
      bn: 'বাংলাদেশের জেলা সদর হাসপাতাল ও উপজেলা স্বাস্থ্য কমপ্লেক্সে বিনামূল্যে VIA স্ক্রিনিং চালু আছে।',
    },
    formulations: 'Therapeutic candidates investigational only (Preventive: HPV / Cecolin / Gardasil)',
  },
  pcv13: {
    platform: {
      en: '13-valent Pneumococcal polysaccharide conjugated to CRM197 diphtheria protein',
      bn: '১৩-ভ্যালেন্ট নিউমোকক্কাল পলিস্যাকারাইড–CRM197 প্রোটিন কনজুগেট টিকা',
    },
    route: {
      en: 'Intramuscular (IM) — anterolateral thigh (infants) or deltoid (children/adults)',
      bn: 'মাংসপেশিতে (IM) — উরুর বাইরের দিক (শিশু) বা ডেল্টয়েড (বড় শিশু/প্রাপ্তবয়স্ক)',
    },
    doseVolume: {
      en: '0.5 mL prefilled syringe (shake well to form homogeneous white suspension)',
      bn: '০.৫ মি.লি. প্রি-ফিল্ড সিরিঞ্জ (ব্যবহারের আগে ভালোভাবে ঝাঁকান)',
    },
    coldChain: {
      en: '+2°C to +8°C; NEVER freeze; discard if exposed to freezing temperature',
      bn: '+২°সে থেকে +৮°সে; কখনোই ফ্রিজ করবেন না; জমে গেলে বাতিল করুন',
    },
    dosingProtocol: {
      en: 'Infants: 3+1 schedule (2, 4, 6 months + booster 12–15 months) or 2+1 (6, 14 weeks + 9 months). Catch-up: 12–23 mo = 2 doses (8 wks apart); 24–59 mo = 1 dose.',
      bn: 'শিশু: ৩+১ সূচি (২, ৪, ৬ মাস + ১২–১৫ মাসে বুস্টার) বা ২+১ সূচি। ক্যাচ-আপ: ১২–২৩ মাস = ৮ সপ্তাহ ব্যবধানে ২ ডোজ; ২–৫ বছর = ১ ডোজ।',
    },
    immunityProfile: {
      en: 'Covers 13 invasive serotypes (including 3, 6A, 19A not in PCV10); strong mucosal nasopharyngeal carriage reduction and pediatric herd protection.',
      bn: 'PCV10-এর বাইরের সেরোটাইপ ৩, ৬এ, ১৯এ সহ ১৩টি ধরনের বিরুদ্ধে কার্যকর এবং শিশুদের ইনভেসিভ নিউমোকক্কাল রোগ ও ক্যারেজ কমায়।',
    },
    specialPopulations: {
      en: 'Strongly indicated for functional/anatomic asplenia, sickle cell disease, nephrotic syndrome, cochlear implants, CSF leaks, and HIV.',
      bn: 'প্লীহাহীনতা, সিকল সেল রোগ, নেফ্রোটিক সিনড্রোম, ককলিয়ার ইমপ্ল্যান্ট ও এইচআইভি রোগীদের জন্য অত্যন্ত জরুরি।',
    },
    aftercare: {
      en: 'Redness, swelling, drowsiness, or decreased appetite for 1–2 days is common; keep child hydrated.',
      bn: '১–২ দিন ব্যথা, ফোলা, ঝিমুনি বা ক্ষুধামন্দা হতে পারে; শিশুকে পর্যাপ্ত তরল/বুকের দুধ খাওয়ান।',
    },
    formulations: 'Prevnar 13 / Prevenar 13 (Pfizer, WHO PQ)',
  },
  pcv15: {
    platform: {
      en: '15-valent Pneumococcal polysaccharide conjugate vaccine (adds serotypes 22F & 33F)',
      bn: '১৫-ভ্যালেন্ট নিউমোকক্কাল কনজুগেট টিকা (অতিরিক্ত ২২এফ ও ৩৩এফ সেরোটাইপসহ)',
    },
    route: {
      en: 'Intramuscular (IM) — anterolateral thigh (infants) or deltoid',
      bn: 'মাংসপেশিতে (IM) — উরুর বাইরের দিক বা বাহুর ডেল্টয়েড',
    },
    doseVolume: {
      en: '0.5 mL single prefilled syringe',
      bn: '০.৫ মি.লি. প্রি-ফিল্ড সিরিঞ্জ',
    },
    coldChain: {
      en: '+2°C to +8°C; protect from light; NEVER freeze',
      bn: '+২°সে থেকে +৮°সে; আলো থেকে দূরে রাখুন; ফ্রিজ করবেন না',
    },
    dosingProtocol: {
      en: 'Pediatrics: 4-dose series at 2, 4, 6, and 12–15 months (interchangeable with PCV13). Adults ≥65 or 19–64 with risk factors: 1 dose (followed by PPSV23 ≥1 year later if PCV20/PCV21 unavailable).',
      bn: 'শিশু: ২, ৪, ৬ ও ১২–১৫ মাসে ৪ ডোজ (PCV13-এর সাথে পরিবর্তনযোগ্য)। ৬৫+ বা ঝুঁকিপূর্ণ প্রাপ্তবয়স্ক: ১ ডোজ (প্রয়োজনে ১ বছর পর PPSV23)।',
    },
    immunityProfile: {
      en: 'Non-inferior immunogenicity to PCV13 across shared serotypes plus superior serotype 3 and 22F/33F coverage.',
      bn: 'PCV13-এর সব সেরোটাইপের পাশাপাশি সেরোটাইপ ৩, ২২এফ ও ৩৩এফ-এর বিরুদ্ধে বাড়তি রোগপ্রতিরোধ ক্ষমতা তৈরি করে।',
    },
    specialPopulations: {
      en: 'Safe in immunocompromised hosts; insufficient human pregnancy data—weigh risk in high-risk pregnancies.',
      bn: 'দুর্বল রোগপ্রতিরোধ ক্ষমতার ব্যক্তিদের জন্য নিরাপদ; গর্ভাবস্থায় চিকিৎসকের পরামর্শে সিদ্ধান্ত নিন।',
    },
    aftercare: {
      en: 'Observe 15 minutes post-injection; mild arm pain or fatigue usually resolves within 48 hours.',
      bn: 'টিকা নেওয়ার পর ১৫ মিনিট অপেক্ষা করুন; বাহু ব্যথা বা ক্লান্তি ৪৮ ঘণ্টায় কমে যায়।',
    },
    formulations: 'Vaxneuvance (MSD / Merck)',
  },
  pcv20: {
    platform: {
      en: '20-valent Pneumococcal polysaccharide CRM197 conjugate vaccine',
      bn: '২০-ভ্যালেন্ট নিউমোকক্কাল পলিস্যাকারাইড–CRM197 কনজুগেট টিকা',
    },
    route: {
      en: 'Intramuscular (IM) — deltoid (adults/children) or anterolateral thigh (infants)',
      bn: 'মাংসপেশিতে (IM) — বাহুর ডেল্টয়েড (বড়) বা উরুর বাইরের দিক (শিশু)',
    },
    doseVolume: {
      en: '0.5 mL single-dose prefilled syringe',
      bn: '০.৫ মি.লি. একক ডোজ প্রি-ফিল্ড সিরিঞ্জ',
    },
    coldChain: {
      en: '+2°C to +8°C horizontally; do not freeze; shake vigorously until uniform',
      bn: '+২°সে থেকে +৮°সে; ফ্রিজ করবেন না; ব্যবহারের আগে ভালোভাবে ঝাঁকান',
    },
    dosingProtocol: {
      en: 'Adults ≥65 or high-risk ≥19 years: single dose (completes pneumococcal series without needing PPSV23). Infants: 4 doses (2, 4, 6, 12–15 months). Wait ≥1 year after prior PPSV23 before giving PCV20.',
      bn: '৬৫+ বা ঝুঁকিপূর্ণ প্রাপ্তবয়স্ক: একক ডোজ (আলাদা PPSV23 লাগে না)। শিশু: ৪ ডোজ (২, ৪, ৬, ১২–১৫ মাস)। আগে PPSV23 নেওয়া থাকলে অন্তত ১ বছর পর নিন।',
    },
    immunityProfile: {
      en: 'Broadest conjugate serotype coverage (adds 8, 10A, 11A, 12F, 15B, 22F, 33F beyond PCV13) against bacteremic pneumonia and meningitis.',
      bn: 'PCV13-এর তুলনায় আরও ৭টি অতিরিক্ত সেরোটাইপসহ মোট ২০ ধরনের নিউমোকক্কাল নিউমোনিয়া ও মেনিনজাইটিস থেকে দীর্ঘস্থায়ী সুরক্ষা দেয়।',
    },
    specialPopulations: {
      en: 'Preferred single-step adult vaccine for diabetes, chronic heart/lung/liver/kidney disease, smokers, and immunocompromised adults.',
      bn: 'ডায়াবেটিস, হৃদরোগ, হাঁপানি/সিওপিডি, লিভার ও কিডনি রোগীদের জন্য একক-ডোজের সুবিধাজনক টিকা।',
    },
    aftercare: {
      en: 'Transient muscle ache, headache, or joint pain is self-limiting within 1–3 days.',
      bn: 'সাময়িক পেশী বা মাথাব্যথা ১–৩ দিনের মধ্যে নিজেই সেরে যায়।',
    },
    formulations: 'Prevnar 20 / Apexxnar (Pfizer)',
  },
  'rotavirus-rotarix': {
    platform: {
      en: 'Live-attenuated human monovalent G1P[8] rotavirus vaccine (RV1)',
      bn: 'মৃদু জীবিত হিউম্যান মনোভ্যালেন্ট G1P[8] রোটাভাইরাস টিকা (RV1)',
    },
    route: {
      en: 'Oral (PO) — liquid squeeze tube given gently inside cheek (NEVER inject)',
      bn: 'মুখে খাওয়ার তরল (PO) — গালের ভেতরে ধীরে ধীরে দেওয়া হয় (ইনজেকশন নয়)',
    },
    doseVolume: {
      en: '1.5 mL single oral applicator (ready-to-use liquid)',
      bn: '১.৫ মি.লি. মুখে খাওয়ার টিউব (ব্যবহারের জন্য প্রস্তুত)',
    },
    coldChain: {
      en: '+2°C to +8°C; protect from light; NEVER freeze',
      bn: '+২°সে থেকে +৮°সে; আলো থেকে দূরে রাখুন; ফ্রিজ করবেন না',
    },
    dosingProtocol: {
      en: '2 oral doses at 6 and 10 weeks (minimum age 6 weeks; minimum interval 4 weeks). Complete both doses before 24 weeks of age per strict upper-age rule; do NOT repeat dose if baby spits out.',
      bn: '৬ ও ১০ সপ্তাহে ২ ডোজ (ন্যূনতম বয়স ৬ সপ্তাহ, ব্যবধান ৪ সপ্তাহ)। ২৪ সপ্তাহ বয়সের আগেই ২য় ডোজ শেষ করতে হবে; শিশু বমি/থুতু করলেও পুনরায় ডোজ দেবেন না।',
    },
    immunityProfile: {
      en: '85–95% efficacy against severe hospitalized rotavirus gastroenteritis and cross-protects against G2, G3, G4, G9 strains.',
      bn: 'গুরুতর রোটাভাইরাস ডায়রিয়া ও হাসপাতালে ভর্তি প্রতিরোধে ৮৫–৯৫% কার্যকর এবং বিভিন্ন স্ট্রেইনের বিরুদ্ধে ক্রস-সুরক্ষা দেয়।',
    },
    specialPopulations: {
      en: 'CONTRAINDICATED in SCID (severe combined immunodeficiency) and infants with prior intussusception or uncorrected GI malformation (Meckel diverticulum). Safe to co-administer with OPV and Pentavalent.',
      bn: 'SCID রোগ এবং পূর্বে ইন্টাসাসসেপশন বা অন্ত্রের জন্মগত ত্রুটি থাকলে নিষিদ্ধ। OPV ও পেন্টাভ্যালেন্টের সাথে একসাথে নিরাপদ।',
    },
    aftercare: {
      en: 'Baby can breastfeed immediately before and after. Seek urgent medical care for severe abdominal pain, persistent vomiting, drawing knees to chest, or bloody ("currant jelly") stools.',
      bn: 'টিকার আগে ও পরেই বুকের দুধ খাওয়ানো যাবে। তীব্র পেটব্যথা, ক্রমাগত বমি বা রক্তমিশ্রিত পায়খানা হলে দ্রুত চিকিৎসকের কাছে যান।',
    },
    formulations: 'Rotarix (GSK, WHO PQ)',
  },
  'rotavirus-rotateq': {
    platform: {
      en: 'Live-attenuated human-bovine reassortant pentavalent rotavirus vaccine (G1, G2, G3, G4, P1A[8])',
      bn: 'মৃদু জীবিত পেন্টাভ্যালেন্ট রোটাভাইরাস টিকা (৫টি স্ট্রেইন: G1–G4, P1A[8])',
    },
    route: {
      en: 'Oral (PO) — single-dose dosing tube (NEVER inject)',
      bn: 'মুখে খাওয়ার তরল (PO) — একক ডোজ টিউব (কখনোই ইনজেকশন নয়)',
    },
    doseVolume: {
      en: '2.0 mL ready-to-use oral liquid',
      bn: '২.০ মি.লি. ব্যবহারের জন্য প্রস্তুত মুখে খাওয়ার তরল',
    },
    coldChain: {
      en: '+2°C to +8°C; protect from light; do not freeze',
      bn: '+২°সে থেকে +৮°সে; আলো থেকে দূরে রাখুন; ফ্রিজ করবেন না',
    },
    dosingProtocol: {
      en: '3 oral doses at 6, 10, 14 weeks (or 2, 4, 6 months). Dose 1 must be given before 15 weeks; last dose no later than 32 weeks (8 months) of age.',
      bn: '৬, ১০, ১৪ সপ্তাহে (বা ২, ৪, ৬ মাসে) ৩টি মুখে খাওয়ার ডোজ। ১ম ডোজ ১৫ সপ্তাহের আগে এবং শেষ ডোজ সর্বোচ্চ ৩২ সপ্তাহের মধ্যে সম্পন্ন করতে হবে।',
    },
    immunityProfile: {
      en: '>90% protection against severe rotavirus diarrhea across diverse genotypes in early infancy.',
      bn: 'শৈশবের গুরুতর রোটাভাইরাস ডায়রিয়ার বিরুদ্ধে >৯০% সুরক্ষা প্রদান করে।',
    },
    specialPopulations: {
      en: 'Do not give to infants with SCID, history of intussusception, or severe latex/component allergy; delay during acute moderate-severe gastroenteritis.',
      bn: 'SCID বা ইন্টাসাসসেপশনের ইতিহাস থাকলে নিষিদ্ধ; তীব্র বমি-ডায়রিয়ার সময় সুস্থ হওয়া পর্যন্ত অপেক্ষা করুন।',
    },
    aftercare: {
      en: 'Wash hands thoroughly after diaper changes for 7–14 days due to minor vaccine-virus shedding in stool.',
      bn: '৭–১৪ দিন শিশুর ডায়াপার পাল্টানোর পর হাত সাবান দিয়ে ভালোভাবে ধুয়ে নিন।',
    },
    formulations: 'RotaTeq (MSD / Merck, WHO PQ)',
  },
  'rotavirus-rotavac': {
    platform: {
      en: 'Live-attenuated neonatal 116E oral rotavirus strain (WHO-PQ South Asian formulation)',
      bn: 'মৃদু জীবিত নিওনেটাল 116E স্ট্রেইন মুখে খাওয়ার রোটাভাইরাস টিকা (WHO-PQ)',
    },
    route: {
      en: 'Oral (PO) via dropper/vial — coadministered at EPI visits',
      bn: 'ড্রপারের মাধ্যমে মুখে খাওয়া (PO) — ইপিআই ডোজের সাথে',
    },
    doseVolume: {
      en: '0.5 mL (5 drops) low-volume formulation (Rotavac 5D)',
      bn: '০.৫ মি.লি. (৫ ফোঁটা) অল্প আয়তনের ফর্মুলেশন',
    },
    coldChain: {
      en: 'Rotavac standard: -20°C long term / +2°C to +8°C up to 6 months; Rotavac 5D / Rotasiil: thermostable +2°C to +8°C (Rotasiil up to 25°C limited)',
      bn: 'স্ট্যান্ডার্ড: -২০°সে (বা +২°সে–+৮°সে-এ ৬ মাস); Rotavac 5D ও Rotasiil: +২°সে–+৮°সে তাপমাত্রায় স্থিতিশীল',
    },
    dosingProtocol: {
      en: '3 oral doses at 6, 10, 14 weeks alongside OPV and Pentavalent (minimum 4 weeks between doses; do not initiate after 15 weeks).',
      bn: '৬, ১০ ও ১৪ সপ্তাহে OPV এবং পেন্টাভ্যালেন্টের সাথে ৩ ডোজ (ন্যূনতম ৪ সপ্তাহ ব্যবধান; ১৫ সপ্তাহের পর নতুন করে শুরু করবেন না)।',
    },
    immunityProfile: {
      en: '54–65% efficacy against severe hospitalized rotavirus diarrhea in South Asian low-resource cohorts, preventing thousands of deaths.',
      bn: 'দক্ষিণ এশিয়ার ক্লিনিকাল ট্রায়ালে গুরুতর রোটাভাইরাস ডায়রিয়া ও হাসপাতালে ভর্তি ৫৪–৬৫% পর্যন্ত কমিয়েছে।',
    },
    specialPopulations: {
      en: 'Contraindicated in SCID or prior intussusception; safe in HIV-exposed asymptomatic infants and breastfed babies.',
      bn: 'SCID বা ইন্টাসাসসেপশন থাকলে নিষিদ্ধ; বুকের দুধ খাওয়া শিশুদের জন্য সম্পূর্ণ নিরাপদ।',
    },
    aftercare: {
      en: 'Normal feeding right after drops; watch for persistent inconsolable crying or abdominal distension in the first week after Dose 1.',
      bn: 'ডোজের পরপরই স্বাভাবিক খাওয়ানো যাবে; প্রথম সপ্তাহে অতিরিক্ত কান্না বা পেট ফোলা হলে চিকিৎসককে জানান।',
    },
    formulations: 'Rotavac / Rotavac 5D (Bharat Biotech), Rotasiil (Serum Institute, WHO PQ)',
  },
  'hpv-9valent': {
    platform: {
      en: 'Non-infectious recombinant L1 virus-like particles (HPV types 6, 11, 16, 18, 31, 33, 45, 52, 58)',
      bn: 'রিকম্বিন্যান্ট L1 ভাইরাস-সদৃশ কণা (৯টি টাইপ: ৬, ১১, ১৬, ১৮, ৩১, ৩৩, ৪৫, ৫২, ৫৮)',
    },
    route: {
      en: 'Intramuscular (IM) — deltoid muscle (patient should sit/lie down 15 minutes)',
      bn: 'মাংসপেশিতে (IM) — বাহুর ডেল্টয়েড পেশী (টিকার পর ১৫ মিনিট বসে বিশ্রাম নিন)',
    },
    doseVolume: {
      en: '0.5 mL single prefilled syringe (shake well; cloudy white suspension)',
      bn: '০.৫ মি.লি. প্রি-ফিল্ড সিরিঞ্জ (ব্যবহারের আগে ঝাঁকান)',
    },
    coldChain: {
      en: '+2°C to +8°C; protect from light; NEVER freeze',
      bn: '+২°সে থেকে +৮°সে; আলো থেকে দূরে রাখুন; ফ্রিজ করবেন না',
    },
    dosingProtocol: {
      en: 'Ages 9–14 years: 2 doses (0 and 6–12 months; min interval 5 months). Ages 15–45 years or immunocompromised: 3 doses (0, 2, 6 months). Never restart series if delayed.',
      bn: '৯–১৪ বছর: ২ ডোজ (০ ও ৬–১২ মাস; ন্যূনতম ব্যবধান ৫ মাস)। ১৫–৪৫ বছর বা দুর্বল রোগপ্রতিরোধে: ৩ ডোজ (০, ২, ৬ মাস)। দেরি হলেও সূচি নতুন করে শুরু করতে হয় না।',
    },
    immunityProfile: {
      en: '~90% protection against cervical, vulvar, vaginal, anal cancers + >95% against genital warts (types 6/11) with sustained titers >12+ years.',
      bn: 'সার্ভিক্যাল ও অ্যানো-জেনিটাল ক্যানসারের বিরুদ্ধে ~৯০% এবং জেনিটাল ওয়ার্টস থেকে >৯৫% দীর্ঘমেয়াদী (>১২+ বছর) সুরক্ষা দেয়।',
    },
    specialPopulations: {
      en: 'Defer remaining doses until after delivery if pregnancy occurs (not known teratogenic, but unrecommended during gestation); safe while breastfeeding; avoid in severe yeast allergy.',
      bn: 'গর্ভবতী হলে ডোজ প্রসবের পর দিন; স্তন্যদানকালে সম্পূর্ণ নিরাপদ; তীব্র ইস্ট-অ্যালার্জি থাকলে নিষিদ্ধ।',
    },
    aftercare: {
      en: 'Remain seated for 15 minutes post-injection to prevent syncope (fainting) falls in adolescents; mild arm soreness resolves in 1–2 days.',
      bn: 'কিশোরীদের মাথা ঘোরা বা অজ্ঞান হওয়া এড়াতে টিকার পর ১৫ মিনিট বসে বিশ্রাম নিন।',
    },
    formulations: 'Gardasil 9 (MSD / Merck)',
  },
  'hpv-bivalent': {
    platform: {
      en: 'Recombinant L1 VLP bivalent vaccine targeting oncogenic HPV-16 and HPV-18',
      bn: 'রিকম্বিন্যান্ট L1 VLP বাইভ্যালেন্ট টিকা (ক্যানসার-সৃষ্টিকারী টাইপ ১৬ ও ১৮)',
    },
    route: {
      en: 'Intramuscular (IM) — deltoid muscle',
      bn: 'মাংসপেশিতে (IM) — বাহুর ডেল্টয়েড পেশী',
    },
    doseVolume: {
      en: '0.5 mL single injection',
      bn: '০.৫ মি.লি. একক ইনজেকশন',
    },
    coldChain: {
      en: '+2°C to +8°C; strictly freeze-sensitive',
      bn: '+২°সে থেকে +৮°সে; ফ্রিজ-সংবেদনশীল',
    },
    dosingProtocol: {
      en: 'WHO updated schedule (2022–2026) & Bangladesh EPI campaign: 1-dose (or 2-dose 6 months apart) for girls aged 9–14 years; 2 doses (0, 6 mo) for ages 15–20; 3 doses for immunocompromised/HIV+.',
      bn: 'WHO ও বাংলাদেশ ইপিআই ক্যাম্পেইন: ৯–১৪ বছরের মেয়েদের জন্য ১ ডোজ (বা ৬ মাস ব্যবধানে ২ ডোজ); ১৫–২০ বছরে ২ ডোজ; এইচআইভি/দুর্বল অনাক্রম্যতায় ৩ ডোজ।',
    },
    immunityProfile: {
      en: 'HPV-16 & 18 account for >70% of cervical cancers globally; Cervarix AS04 adjuvant also confers strong cross-protection against types 31, 33, 45.',
      bn: 'বিশ্বের >৭০% জরায়ুমুখ ক্যানসারের জন্য দায়ী HPV-16 ও 18-এর বিরুদ্ধে অত্যন্ত শক্তিশালী সুরক্ষা ও কিছু ক্রস-প্রোটেকশন দেয়।',
    },
    specialPopulations: {
      en: 'Not recommended during pregnancy; safe for lactating mothers and HIV+ individuals (give 2 or 3 doses). Does not replace routine adult VIA/Pap cervical screening.',
      bn: 'গর্ভাবস্থায় সুপারিশকৃত নয়; স্তন্যদানকালে নিরাপদ। প্রাপ্তবয়স্ক হলে নিয়মিত VIA/প্যাপ স্ক্রিনিং চালিয়ে যেতে হবে।',
    },
    aftercare: {
      en: 'Observe seated for 15 minutes; temporary injection-site ache or fatigue passes in 24–48 hours.',
      bn: 'টিকার পর ১৫ মিনিট বসে বিশ্রাম নিন; ইনজেকশনের জায়গায় হালকা ব্যথা ১–২ দিনে সেরে যায়।',
    },
    formulations: 'Cecolin (Innovax, Bangladesh EPI campaign), Cervarix (GSK, WHO PQ)',
  },
  'hepa-hepb-twinrix': {
    platform: {
      en: 'Combined inactivated Hepatitis A (720 EL.U) + recombinant Hepatitis B surface antigen (20 µg HBsAg)',
      bn: 'সমন্বিত নিষ্ক্রিয় হেপাটাইটিস-এ ও রিকম্বিন্যান্ট হেপাটাইটিস-বি (Twinrix)',
    },
    route: {
      en: 'Intramuscular (IM) — adult deltoid only (do not inject into gluteal muscle)',
      bn: 'মাংসপেশিতে (IM) — প্রাপ্তবয়স্কের ডেল্টয়েড পেশী (নিতম্বে দেবেন না)',
    },
    doseVolume: {
      en: '1.0 mL prefilled syringe (adult dose, age 18+)',
      bn: '১.০ মি.লি. প্রি-ফিল্ড সিরিঞ্জ (১৮+ বছর বয়সীদের ডোজ)',
    },
    coldChain: {
      en: '+2°C to +8°C; shake well to white turbid suspension; NEVER freeze',
      bn: '+২°সে থেকে +৮°সে; ব্যবহারের আগে ঝাঁকান; ফ্রিজ করবেন না',
    },
    dosingProtocol: {
      en: 'Standard: 3 doses at 0, 1, and 6 months. Rapid pre-travel schedule: 0, 7, and 21–30 days followed by mandatory 4th booster at 12 months.',
      bn: 'স্বাভাবিক সূচি: ০, ১ ও ৬ মাসে ৩ ডোজ। দ্রুত ভ্রমণ সূচি: ০, ৭, ২১–৩০ দিনে ৩ ডোজ এবং ১২ মাসে অবশ্যই ৪র্থ বুস্টার।',
    },
    immunityProfile: {
      en: '>99% seroconversion for Hep A and >98% for Hep B after completing 3 doses, lasting 20+ years (likely lifelong immune memory).',
      bn: '৩ ডোজ পূর্ণ করলে হেপাটাইটিস-এ >৯৯% এবং বি >৯৮% অ্যান্টিবডি তৈরি হয় এবং ২০+ বছর সুরক্ষা থাকে।',
    },
    specialPopulations: {
      en: 'Recommended for travelers to endemic regions, healthcare staff, chronic liver disease patients, and household contacts. Caution if yeast or neomycin anaphylaxis.',
      bn: 'চিকিৎসাকর্মী, দীর্ঘস্থায়ী লিভারের রোগী ও ভ্রমণকারীদের জন্য আদর্শ; ইস্ট বা নিওমাইসিনে তীব্র অ্যালার্জি থাকলে সতর্কতা।',
    },
    aftercare: {
      en: 'Avoid missing Month 6 (or Month 12 accelerated) dose, as long-term HepB durability requires the final booster.',
      bn: 'দীর্ঘমেয়াদী সুরক্ষার জন্য ৬ষ্ঠ মাসের (বা দ্রুত সূচির ১২ মাসের) শেষ ডোজ অবশ্যই নিন।',
    },
    formulations: 'Twinrix Adult (GSK)',
  },
  'hepatitis-e': {
    platform: {
      en: 'Recombinant Hepatitis E virus capsid antigen (HEV 239 expressed in E. coli)',
      bn: 'রিকম্বিন্যান্ট হেপাটাইটিস-ই ক্যাপসিড অ্যান্টিজেন (HEV 239)',
    },
    route: {
      en: 'Intramuscular (IM) — deltoid muscle',
      bn: 'মাংসপেশিতে (IM) — বাহুর ডেল্টয়েড পেশী',
    },
    doseVolume: {
      en: '0.5 mL single-dose syringe/vial (30 µg antigen)',
      bn: '০.৫ মি.লি. একক ডোজ (৩০ মাইক্রোগ্রাম অ্যান্টিজেন)',
    },
    coldChain: {
      en: '+2°C to +8°C; protect from freezing',
      bn: '+২°সে থেকে +৮°সে; ফ্রিজ করা যাবে না',
    },
    dosingProtocol: {
      en: '3 doses at 0, 1, and 6 months for adults ≥16 years in outbreak/high-endemic areas (WHO SAGE 2024 recommends outbreak use including pregnant women where approved).',
      bn: 'প্রাদুর্ভাব বা উচ্চ-ঝুঁকি এলাকায় ১৬+ বছর বয়সীদের জন্য ০, ১ ও ৬ মাসে ৩ ডোজ (WHO SAGE প্রাদুর্ভাবে ব্যবহারের পরামর্শ দেয়)।',
    },
    immunityProfile: {
      en: '100% efficacy in Phase 3 trials against symptomatic HEV genotype 4/1 over 4.5+ years follow-up; cross-protects against genotype 1.',
      bn: 'ক্লিনিকাল ট্রায়ালে উপসর্গযুক্ত হেপাটাইটিস-ই প্রতিরোধে অত্যন্ত উচ্চ (প্রায় ১০০%) কার্যকারিতা ও ৪.৫+ বছর সুরক্ষা প্রমাণিত।',
    },
    specialPopulations: {
      en: 'Pregnant women face 20–25% case-fatality from HEV fulminant hepatitis; recent Bangladesh (icddr,b) and South Sudan studies strongly support maternal protection in outbreaks.',
      bn: 'গর্ভবতী নারীদের ক্ষেত্রে হেপাটাইটিস-ই প্রাণঘাতী লিভার ফেইলিউর ঘটাতে পারে; বাংলাদেশসহ সাম্প্রতিক গবেষণায় প্রাদুর্ভাবে সুরক্ষামূলক ফলাফল মিলেছে।',
    },
    aftercare: {
      en: 'Practice safe drinking water hygiene (boiled/filtered water) alongside vaccination, as HEV spreads via fecal-oral contamination.',
      bn: 'টিকার পাশাপাশি নিরাপদ ও ফুটানো পানি পান করুন, কারণ হেপাটাইটিস-ই দূষিত পানির মাধ্যমে ছড়ায়।',
    },
    formulations: 'Hecolin (Innovax — licensed in China & Pakistan; outbreak deployment)',
  },
  'hepatitis-b-hbig': {
    platform: {
      en: 'Human Hepatitis B Immunoglobulin (passive hyperimmune anti-HBs IgG antibodies)',
      bn: 'হিউম্যান হেপাটাইটিস-বি ইমিউনোগ্লোবিউলিন (তাৎক্ষণিক প্যাসিভ অ্যান্টি-HBs সুরক্ষা)',
    },
    route: {
      en: 'Intramuscular (IM) — anterolateral thigh (newborn) in OPPOSITE limb from HepB vaccine',
      bn: 'মাংসপেশিতে (IM) — নবজাতকের উরুতে, তবে HepB টিকা থেকে ভিন্ন পায়ে',
    },
    doseVolume: {
      en: '0.5 mL (100–200 IU) for newborns; 0.06 mL/kg (max 5 mL) for adult post-exposure',
      bn: 'নবজাতকের জন্য ০.৫ মি.লি. (১০০–২০০ IU); প্রাপ্তবয়স্ক এক্সপোজারে ০.০৬ মি.লি./কেজি',
    },
    coldChain: {
      en: '+2°C to +8°C; NEVER freeze; do not shake vigorously',
      bn: '+২°সে থেকে +৮°সে; কখনোই ফ্রিজ করবেন না বা জোরে ঝাঁকাবেন না',
    },
    dosingProtocol: {
      en: 'Perinatal PEP: give within 12 hours of birth (up to 7 days) alongside birth-dose HepB vaccine (different limbs) for babies of HBsAg-positive mothers. Needlestick/sexual PEP: within 24h (up to 7–14d) + HepB series.',
      bn: 'HBsAg পজিটিভ মায়ের নবজাতককে জন্মের ১২ ঘণ্টার মধ্যে এক পায়ে HBIG ও অন্য পায়ে জন্মকালীন HepB টিকা দিন। রক্ত/সুঁচের ঝুঁকিতে ২৪ ঘণ্টার মধ্যে দিন।',
    },
    immunityProfile: {
      en: 'Provides immediate passive anti-HBs antibodies bridging the gap until active HepB vaccine takes effect (combined PEP prevents ~90–95% of vertical perinatal infection).',
      bn: 'তাৎক্ষণিক অ্যান্টিবডি দিয়ে মা থেকে শিশুতে সংক্রমণ ~৯০–৯৫% পর্যন্ত প্রতিরোধ করে, যতক্ষণ না HepB টিকা স্থায়ী সুরক্ষা তৈরি করে।',
    },
    specialPopulations: {
      en: 'Essential for newborns of HBsAg+ mothers; infant can safely breastfeed once birth HBIG + HepB dose are given. Space live MMR/Varicella by 3 months after HBIG.',
      bn: 'HBsAg+ মায়ের নবজাতকের জন্মের পর HBIG ও HepB টিকা দিলে মায়ের বুকের দুধ পান নিরাপদ। HBIG নেওয়ার পর লাইভ MMR/ভ্যারিসেলা ৩ মাস পরে দিন।',
    },
    aftercare: {
      en: 'Baby of HBsAg+ mother MUST complete all HepB doses and undergo post-vaccination HBsAg & anti-HBs blood test at 9–12 months of age.',
      bn: '৯–১২ মাস বয়সে শিশুর সব ডোজ শেষে HBsAg ও anti-HBs রক্ত পরীক্ষা করে সুরক্ষা নিশ্চিত করুন।',
    },
    formulations: 'HyperHEP B, HepaGam B, Nabi-HB, Hepabig (WHO-prequalified human Ig)',
  },
  'dengue-dengvaxia': {
    platform: {
      en: 'Live-attenuated recombinant chimeric yellow-fever/dengue tetravalent vaccine (CYD-TDV)',
      bn: 'মৃদু জীবিত কাইমেরিক ইয়েলো-ফিভার/ডেঙ্গু টেট্রাভ্যালেন্ট টিকা (CYD-TDV)',
    },
    route: {
      en: 'Subcutaneous (SC) — upper arm deltoid region after reconstitution',
      bn: 'চামড়ার নিচে (SC) — ডাইলুয়েন্টে মিশিয়ে বাহুর উপরিভাগে',
    },
    doseVolume: {
      en: '0.5 mL SC injection immediately after reconstitution',
      bn: 'মিশ্রণের পরপরই ০.৫ মি.লি. চামড়ার নিচে (SC)',
    },
    coldChain: {
      en: '+2°C to +8°C; protect from light; use within 6 hours (or per label) once reconstituted',
      bn: '+২°সে থেকে +৮°সে; আলো থেকে দূরে রাখুন; মিশ্রণের পর নির্ধারিত সময়ে ব্যবহার করুন',
    },
    dosingProtocol: {
      en: '3 SC doses at 0, 6, and 12 months strictly in ages 9–16 (or 6–16 per local label) ONLY after laboratory confirmation of prior dengue infection.',
      bn: '৯–১৬ বছর বয়সীদের জন্য ০, ৬ ও ১২ মাসে ৩টি ডোজ—তবে কেবল পূর্ববর্তী ডেঙ্গু সংক্রমণ ল্যাব টেস্টে নিশ্চিত হলেই।',
    },
    immunityProfile: {
      en: '~76–82% efficacy against severe/hospitalized dengue ONLY in seropositive recipients; INCREASES severe dengue risk if given to seronegative (dengue-naive) individuals.',
      bn: 'পূর্বে ডেঙ্গু আক্রান্তদের জন্য গুরুতর ডেঙ্গু ও ভর্তি ~৭৬–৮২% কমায়; তবে আগে ডেঙ্গু না হয়ে থাকলে মারাত্মক ডেঙ্গুর ঝুঁকি বাড়াতে পারে।',
    },
    specialPopulations: {
      en: 'CONTRAINDICATED in dengue-seronegative individuals, pregnancy, lactation, and immunocompromised hosts. (Being superseded globally by Qdenga/TAK-003 in many regions.)',
      bn: 'পূর্বে ডেঙ্গু না হলে (সেরোনেগেটিভ), গর্ভবতী, স্তন্যদানকারী ও দুর্বল রোগপ্রতিরোধে সম্পূর্ণ নিষিদ্ধ।',
    },
    aftercare: {
      en: 'Always verify documented IgG ELISA/rapid diagnostic pre-screening result before Dose 1. Seek care promptly for high fever with warning signs.',
      bn: 'প্রথম ডোজের আগে অবশ্যই ডেঙ্গু-পূর্ব সংক্রমণ পরীক্ষা নিশ্চিত করুন; তীব্র জ্বর বা পেটব্যথা হলে দ্রুত হাসপাতালে যান।',
    },
    formulations: 'Dengvaxia (Sanofi Pasteur)',
  },
  chikungunya: {
    platform: {
      en: 'Live-attenuated CHIKV Δ5nsP3 single-strain vaccine (VLA1553)',
      bn: 'মৃদু জীবিত অ্যাটেনুয়েটেড চিকুনগুনিয়া টিকা (VLA1553)',
    },
    route: {
      en: 'Intramuscular (IM) — deltoid muscle after reconstitution',
      bn: 'মাংসপেশিতে (IM) — মিশ্রণের পর বাহুর ডেল্টয়েড পেশীতে',
    },
    doseVolume: {
      en: '0.5 mL single IM dose',
      bn: '০.৫ মি.লি. একক ডোজ',
    },
    coldChain: {
      en: '+2°C to +8°C; protect from light; administer within 2 hours of reconstitution',
      bn: '+২°সে থেকে +৮°সে; আলো থেকে দূরে রাখুন; মিশ্রণের ২ ঘণ্টার মধ্যে দিন',
    },
    dosingProtocol: {
      en: 'Single IM dose for adults ≥18 years traveling to or living in active chikungunya outbreak areas (FDA/EMA 2023–2024; EMA also assessing Vimkunya VLP for ≥12 years).',
      bn: 'চিকুনগুনিয়া প্রাদুর্ভাব বা ঝুঁকিপূর্ণ এলাকায় ১৮+ বছর বয়সী প্রাপ্তবয়স্কদের জন্য একক IM ডোজ।',
    },
    immunityProfile: {
      en: '98.9% seroprotective neutralizing antibody titer achieved by Day 28 and sustained at >96% through 2+ years.',
      bn: 'টিকা দেওয়ার ২৮ দিনের মধ্যে ৯৮.৯% ব্যক্তির সুরক্ষামূলক অ্যান্টিবডি তৈরি হয় এবং ২+ বছর স্থায়ী থাকে।',
    },
    specialPopulations: {
      en: 'CONTRAINDICATED in immunocompromised adults; live vaccine requires caution/deferral in pregnancy unless outbreak risk clearly outweighs chikungunya-like viremia risk.',
      bn: 'দুর্বল রোগপ্রতিরোধে নিষিদ্ধ; লাইভ টিকা হওয়ায় গর্ভাবস্থায় ঝুঁকি-উপকারিতা বিবেচনা করে স্থগিত রাখা হয়।',
    },
    aftercare: {
      en: 'Chikungunya-like mild joint pain, headache, fatigue, or transient fever occurs in ~10–15% within 3–10 days; continue mosquito bite protection.',
      bn: 'টিকার ৩–১০ দিনের মধ্যে হালকা গাঁটব্যথা, মাথাব্যথা বা ক্লান্তি হতে পারে; মশার কামড় প্রতিরোধ অব্যাহত রাখুন।',
    },
    formulations: 'Ixchiq (Valneva)',
  },
  'je-ixiaro': {
    platform: {
      en: 'Inactivated Vero-cell culture-derived SA14-14-2 Japanese Encephalitis virus',
      bn: 'নিষ্ক্রিয় ভেরো-সেল-জাত SA14-14-2 জাপানিজ এনকেফালাইটিস ভাইরাস',
    },
    route: {
      en: 'Intramuscular (IM) — anterolateral thigh (<3 yrs) or deltoid (≥3 yrs)',
      bn: 'মাংসপেশিতে (IM) — উরুর বাইরের দিক (<৩ বছর) বা বাহু (৩+ বছর)',
    },
    doseVolume: {
      en: '0.25 mL (ages 2 months–2 years) or 0.5 mL (ages ≥3 years)',
      bn: '০.২৫ মি.লি. (২ মাস–২ বছর) অথবা ০.৫ মি.লি. (৩+ বছর)',
    },
    coldChain: {
      en: '+2°C to +8°C; protect from light; NEVER freeze',
      bn: '+২°সে থেকে +৮°সে; আলো থেকে দূরে রাখুন; ফ্রিজ করবেন না',
    },
    dosingProtocol: {
      en: '2 doses on Days 0 and 28 (adults 18–65 may use accelerated Day 0 & Day 7 schedule; finish ≥1 week before travel). Give 1 booster at 12–24 months if ongoing exposure.',
      bn: 'দিন ০ ও ২৮-এ ২ ডোজ (১৮–৬৫ বছরে প্রয়োজনে দিন ০ ও ৭-এ দ্রুত সূচি)। চলমান ঝুঁকিতে ১২–২৪ মাসে ১টি বুস্টার।',
    },
    immunityProfile: {
      en: '>95% neutralizing antibody seroprotection by 1 week after Dose 2; booster restores >99% protection for multiple years.',
      bn: '২য় ডোজের ১ সপ্তাহ পর >৯৫% সুরক্ষামূলক অ্যান্টিবডি তৈরি হয়; বুস্টারে >৯৯% দীর্ঘমেয়াদী সুরক্ষা বজায় থাকে।',
    },
    specialPopulations: {
      en: 'Inactivated vaccine safer than live SA14-14-2 in immunocompromised patients; weigh benefit in pregnancy when traveling to endemic rural/paddy areas during monsoon.',
      bn: 'নিষ্ক্রিয় হওয়ায় দুর্বল রোগপ্রতিরোধে তুলনামূলক নিরাপদ; বর্ষায় গ্রামীণ এনডেমিক এলাকায় ভ্রমণে গর্ভবতীরা চিকিৎসকের পরামর্শ নিন।',
    },
    aftercare: {
      en: 'Monitor 15–30 minutes; local arm tenderness or mild headache resolves within 1–2 days.',
      bn: '১৫–৩০ মিনিট পর্যবেক্ষণে থাকুন; বাহু ব্যথা বা হালকা মাথাব্যথা ১–২ দিনে কমে যায়।',
    },
    formulations: 'Ixiaro / Jespect (Valneva), IMOJEV (live alternative), CD.JEVAX (WHO PQ live)',
  },
  'ebola-ervebo': {
    platform: {
      en: 'Live-attenuated recombinant vesicular stomatitis virus expressing Zaire ebolavirus glycoprotein (rVSVΔG-ZEBOV-GP)',
      bn: 'মৃদু জীবিত রিকম্বিন্যান্ট VSV-জায়ার ইবোলা গ্লাইকোপ্রোটিন ভেক্টর টিকা',
    },
    route: {
      en: 'Intramuscular (IM) — deltoid muscle (not in EPI)',
      bn: 'মাংসপেশিতে (IM) — বাহুর ডেল্টয়েড পেশী (ইপিআই বহির্ভূত)',
    },
    doseVolume: {
      en: '1.0 mL single-dose thawed vial',
      bn: '১.০ মি.লি. একক-ডোজ গলানো ভায়াল',
    },
    coldChain: {
      en: 'Ultra-cold -80°C to -60°C long term; +2°C to +8°C up to 2 weeks after thawing; protect from light',
      bn: 'দীর্ঘমেয়াদে -৮০°সে থেকে -৬০°সে; গলানোর পর +২°সে–+৮°সে-এ সর্বোচ্চ ২ সপ্তাহ',
    },
    dosingProtocol: {
      en: 'Single 1.0 mL IM dose for ring vaccination of contacts, frontline responders, and BSL-4 laboratory staff (Zaire species only; no effect on Sudan/Marburg).',
      bn: 'প্রাদুর্ভাবে সংস্পর্শে আসা ব্যক্তি, স্বাস্থ্যকর্মী ও ল্যাব কর্মীদের জন্য একক ১.০ মি.লি. ডোজ (শুধু জায়ার স্ট্রেইনে কার্যকর)।',
    },
    immunityProfile: {
      en: '97.5–100% protective efficacy ≥10 days after vaccination in ring-vaccination trials during West Africa & DRC outbreaks.',
      bn: 'টিকার ১০ দিন পর প্রাদুর্ভাব নিয়ন্ত্রণ ট্রায়ালে ৯৭.৫–১০০% কার্যকারিতা প্রমাণিত।',
    },
    specialPopulations: {
      en: 'WHO SAGE supports ring vaccination in pregnant/lactating women and infants ≥1 year during active Zaire Ebola outbreaks due to >50% disease mortality.',
      bn: 'সক্রিয় ইবোলা প্রাদুর্ভাবে উচ্চ মৃত্যুঝুঁকির কারণে WHO গর্ভবতী, স্তন্যদানকারী ও শিশুদের রিং-ভ্যাকসিনেশনে ব্যবহারের অনুমোদন দেয়।',
    },
    aftercare: {
      en: 'Transient fever, arthralgia, and mild vesicular skin lesions can occur days 1–14; avoid aspirin/salicylates in children and maintain strict PPE in outbreak zones.',
      bn: '১–১৪ দিনের মধ্যে সাময়িক জ্বর ও গাঁটব্যথা হতে পারে; প্রাদুর্ভাব এলাকায় পূর্ণ সুরক্ষা পোশাক (PPE) বজায় রাখুন।',
    },
    formulations: 'Ervebo (MSD / Merck, WHO PQ)',
  },
  'ebola-zabdeno': {
    platform: {
      en: 'Heterologous viral-vector prime-boost: Ad26.ZEBOV (Zabdeno) + MVA-BN-Filo (Mvabea)',
      bn: 'হেটারোলগাস ভাইরাল-ভেক্টর প্রাইম-বুস্ট: Ad26.ZEBOV (জ্যাবডেনো) + MVA-BN-Filo (ম্যাভবিয়া)',
    },
    route: {
      en: 'Intramuscular (IM) — deltoid (or anterolateral thigh in young children)',
      bn: 'মাংসপেশিতে (IM) — ডেল্টয়েড (ছোট শিশুদের ক্ষেত্রে উরুর বাইরের দিক)',
    },
    doseVolume: {
      en: '0.5 mL Dose 1 (Zabdeno), followed by 0.5 mL Dose 2 (Mvabea)',
      bn: '১ম ডোজ ০.৫ মি.লি. (জ্যাবডেনো), এবং ২য় ডোজ ০.৫ মি.লি. (ম্যাভবিয়া)',
    },
    coldChain: {
      en: 'Frozen -85°C to -55°C or -25°C to -15°C; +2°C to +8°C after thaw (months per component)',
      bn: 'ফ্রোজেন -৮৫°সে থেকে -৫৫°সে বা -২৫°সে; গলানোর পর +২°সে–+৮°সে-এ সীমিত সময় সংরক্ষণযোগ্য',
    },
    dosingProtocol: {
      en: 'Prophylactic 2-dose series (not acute ring PEP): Zabdeno on Day 0, then Mvabea ~8 weeks (56 days) later for ages ≥1 year.',
      bn: 'প্রতিরোধমূলক ২-ডোজ সূচি (১+ বছর): দিন ০-তে জ্যাবডেনো এবং ৮ সপ্তাহ (৫৬ দিন) পর ম্যাভবিয়া।',
    },
    immunityProfile: {
      en: 'Non-replicating vectors confer broad antibody and T-cell responses persisting ≥2 years after Dose 2; requires full 2-dose wait (~9–10 weeks) for peak immunity.',
      bn: '২য় ডোজের পর ২+ বছর স্থায়ী অ্যান্টিবডি ও টি-সেল সুরক্ষা দেয়; পূর্ণ সুরক্ষা পেতে ~৯–১০ সপ্তাহ সময় লাগে।',
    },
    specialPopulations: {
      en: 'Used preventively for health workers before deployment; both vectors are non-replicating, avoiding live-vector viremia in immunocompromised individuals.',
      bn: 'মোতায়েনের আগে স্বাস্থ্যকর্মীদের প্রতিরোধে ব্যবহৃত হয়; নন-রেপ্লিকেটিং ভেক্টর হওয়ায় দুর্বল অনাক্রম্যতায় তুলনামূলক নিরাপদ।',
    },
    aftercare: {
      en: 'Keep strict record of Dose 1 and Dose 2 dates so the heterologous boost is never missed.',
      bn: '১ম ও ২য় ডোজের তারিখ সংরক্ষণ করুন যাতে ৮ সপ্তাহের বুস্টার বাদ না পড়ে।',
    },
    formulations: 'Zabdeno + Mvabea (Janssen / Bavarian Nordic, WHO PQ)',
  },
  'polio-nopv2': {
    platform: {
      en: 'Genetically stabilized live-attenuated oral poliovirus type 2 (nOPV2)',
      bn: 'জিনগতভাবে স্থিতিশীল মৃদু জীবিত মুখে খাওয়ার পোলিও টাইপ-২ টিকা (nOPV2)',
    },
    route: {
      en: 'Oral (PO) — 2 drops directly into mouth from multi-dose dropper vial',
      bn: 'মুখে খাওয়ার ফোঁটা (PO) — ড্রপার ভায়াল থেকে সরাসরি ২ ফোঁটা',
    },
    doseVolume: {
      en: '0.1 mL (2 oral drops)',
      bn: '০.১ মি.লি. (২ ফোঁটা)',
    },
    coldChain: {
      en: '-20°C long-term; +2°C to +8°C up to 6 months; strictly monitor WHO VVM-2 before every dose',
      bn: '-২০°সে দীর্ঘমেয়াদী; +২°সে–+৮°সে-এ ৬ মাস; প্রতিটি ডোজের আগে অবশ্যই VVM-2 যাচাই করুন',
    },
    dosingProtocol: {
      en: 'Strictly restricted to WHO-authorized cVDPV2 outbreak campaigns (usually 2 rounds 4 weeks apart for children under 5 years); NOT used in routine EPI.',
      bn: 'শুধুমাত্র WHO-অনুমোদিত cVDPV2 প্রাদুর্ভাব ক্যাম্পেইনে (সাধারণত ৫ বছরের নিচের শিশুদের ৪ সপ্তাহ ব্যবধানে ২ রাউন্ড); নিয়মিত ইপিআই-তে ব্যবহৃত হয় না।',
    },
    immunityProfile: {
      en: 'Induces mucosal gut immunity matching mOPV2/Sabin 2 while carrying ~80% lower risk of reverting to neurovirulence and seeding new cVDPV2 outbreaks.',
      bn: 'অন্ত্রে শক্তিশালী মিউকোসাল সুরক্ষা তৈরি করে এবং সাধারণ সাবিন-২-এর তুলনায় মিউটেশন বা ভ্যাকসিন-জাত পোলিও ঝুঁকি ~৮০% কম।',
    },
    specialPopulations: {
      en: 'Strict vial accountability required globally; immunocompromised children should receive IPV/fIPV instead of OPV where identified.',
      bn: 'রোগপ্রতিরোধ ক্ষমতা গুরুতরভাবে দুর্বল শিশুদের মৌখিক টিকার পরিবর্তে IPV/fIPV দেওয়া উচিত।',
    },
    aftercare: {
      en: 'Observe routine hand hygiene after diaper changes during outbreak campaign weeks.',
      bn: 'ক্যাম্পেইন চলাকালীন ডায়াপার পাল্টানোর পর নিয়মিত হাত ধোয়া বজায় রাখুন।',
    },
    formulations: 'nOPV2 (Bio Farma / Biological E, WHO PQ)',
  },
  'cholera-euvichol': {
    platform: {
      en: 'Killed bivalent whole-cell Vibrio cholerae O1 (Classical + El Tor) & O139',
      bn: 'নিষ্ক্রিয় বাইভ্যালেন্ট হোল-সেল কলেরা টিকা (O1 ও O139)',
    },
    route: {
      en: 'Oral (PO) — plastic single-dose squeeze tube (no buffer needed)',
      bn: 'মুখে খাওয়ার তরল (PO) — প্লাস্টিক টিউব (আলাদা বাফার লাগে না)',
    },
    doseVolume: {
      en: '1.5 mL single oral tube (drink directly; chase with clean water)',
      bn: '১.৫ মি.লি. একক টিউব (সরাসরি পান করিয়ে বিশুদ্ধ পানি দিন)',
    },
    coldChain: {
      en: '+2°C to +8°C; NEVER freeze; CTC/VVM-14 allows short-term ambient campaign use up to 40°C if supervised',
      bn: '+২°সে থেকে +৮°সে; ফ্রিজ করবেন না; VVM-14 তত্ত্বাবধানে স্বল্পমেয়াদী ক্যাম্পেইনে সহনশীল',
    },
    dosingProtocol: {
      en: 'Ages ≥1 year: 2 oral doses 14 days apart (minimum 14 days, max 6 weeks). During acute global stockpile shortages, WHO authorizes 1-dose emergency reactive campaign protection (Euvichol-S simplified 2-strain formulation).',
      bn: '১+ বছর: ১৪ দিন ব্যবধানে ২টি মুখে খাওয়ার ডোজ। তীব্র সংকটে WHO জরুরি ১-ডোজ ক্যাম্পেইন অনুমোদন করে (বাংলাদেশ ও কক্সবাজারে বহুল ব্যবহৃত)।',
    },
    immunityProfile: {
      en: '65–85% protection over the first 6 months–3 years against severe dehydrating cholera (slightly lower in 1–4 year-olds; boost every 2–3 years in endemic zones).',
      bn: 'গুরুতর কলেরা প্রতিরোধে ৬ মাস–৩ বছর পর্যন্ত ৬৫–৮৫% সুরক্ষা দেয় (১–৪ বছরে কিছুটা কম; প্রয়োজনে ২–৩ বছরে বুস্টার)।',
    },
    specialPopulations: {
      en: 'Safe in pregnancy, breastfeeding, and HIV-infected individuals (killed oral bacteria); not for infants <12 months.',
      bn: 'গর্ভাবস্থা, স্তন্যদান ও এইচআইভি আক্রান্তদের জন্য নিরাপদ (নিষ্ক্রিয় ব্যাকটেরিয়া); ১২ মাসের কম বয়সী শিশুর জন্য নয়।',
    },
    aftercare: {
      en: 'Mild transient nausea or abdominal cramping occurs rarely. Maintain ORS readiness, safe water, and handwashing—OCV complements WASH interventions.',
      bn: 'বিরল ক্ষেত্রে সামান্য বমিভাব বা পেট মোচড় হতে পারে। নিরাপদ পানি ও খাবার স্যালাইন (ORS) প্রস্তুতি বজায় রাখুন।',
    },
    formulations: 'Euvichol-Plus / Euvichol-S (EuBiologics, WHO PQ), Shanchol',
  },
  'cholera-dukoral': {
    platform: {
      en: 'Inactivated whole-cell V. cholerae O1 + recombinant cholera toxin B subunit (WC/rBS)',
      bn: 'নিষ্ক্রিয় হোল-সেল কলেরা O1 + রিকম্বিন্যান্ট কলেরা টক্সিন বি সাবইউনিট',
    },
    route: {
      en: 'Oral (PO) — suspension mixed in sodium hydrogen carbonate effervescent buffer',
      bn: 'মুখে খাওয়ার সাসপেনশন (PO) — ইফারভেসেন্ট সোডিয়াম বাইকার্বনেট বাফার পানিতে মিশিয়ে',
    },
    doseVolume: {
      en: '3.0 mL vaccine vial mixed into 150 mL buffer water (75 mL for ages 2–5 yrs)',
      bn: '৩.০ মি.লি. টিকা ১৫০ মি.লি. বাফার পানিতে মিশিয়ে (২–৫ বছরে ৭৫ মি.লি.)',
    },
    coldChain: {
      en: '+2°C to +8°C; NEVER freeze; drink within 2 hours after mixing with buffer',
      bn: '+২°সে থেকে +৮°সে; ফ্রিজ করবেন না; বাফারে মেশানোর ২ ঘণ্টার মধ্যে পান করুন',
    },
    dosingProtocol: {
      en: 'Adults & children ≥6 yrs: 2 doses 1–6 weeks apart. Children 2–5 yrs: 3 doses 1–6 weeks apart. Complete ≥1 week before travel; avoid food/drink 1h before & after.',
      bn: '৬+ বছর: ১–৬ সপ্তাহ ব্যবধানে ২ ডোজ; ২–৫ বছর: ৩ ডোজ। ভ্রমণের অন্তত ১ সপ্তাহ আগে শেষ করুন এবং খাওয়ার ১ ঘণ্টা আগে ও পরে কিছু খাবেন না।',
    },
    immunityProfile: {
      en: '~85% short-term protection against cholera for 6 months (~60% over 2 years), plus partial cross-protection against heat-labile (LT) ETEC traveler diarrhea for ~3 months.',
      bn: '৬ মাস পর্যন্ত ~৮৫% (২ বছরে ~৬০%) কলেরা সুরক্ষা ও ETEC পর্যটক-ডায়রিয়ার বিরুদ্ধে ~৩ মাস আংশিক সুরক্ষা দেয়।',
    },
    specialPopulations: {
      en: 'Killed vaccine generally safe in pregnancy/HIV (note sodium buffer content in severe hypertension or renal failure); do not mix with fruit juice/milk.',
      bn: 'নিষ্ক্রিয় হওয়ায় গর্ভাবস্থায় নিরাপদ; তবে উচ্চ রক্তচাপ বা কিডনি রোগে সোডিয়ামের পরিমাণ বিবেচনা করুন। দুধ/জুস দিয়ে মেশাবেন না।',
    },
    aftercare: {
      en: 'Do not take oral typhoid (Ty21a) capsules simultaneously without spacing—check buffer interactions.',
      bn: 'বাফার মিশ্রণ পাকস্থলীর অম্লতা বদলায়—খাবার বা অন্যান্য ওরাল ক্যাপসুলের সাথে ১ ঘণ্টা ব্যবধান রাখুন।',
    },
    formulations: 'Dukoral (Valneva, WHO PQ)',
  },
  'cholera-vaxchora': {
    platform: {
      en: 'Live-attenuated Vibrio cholerae O1 Classical Inaba strain CVD 103-HgR',
      bn: 'মৃদু জীবিত কলেরা ব্যাকটেরিয়া স্ট্রেইন CVD 103-HgR (একক মুখে খাওয়ার ডোজ)',
    },
    route: {
      en: 'Oral (PO) — single-dose packet reconstituted in bottled/purified water + buffer',
      bn: 'মুখে খাওয়ার তরল (PO) — বোতলজাত বিশুদ্ধ পানিতে বাফার ও টিকা মিশিয়ে',
    },
    doseVolume: {
      en: '100 mL mixed oral suspension (50 mL for ages 2–5 years)',
      bn: '১০০ মি.লি. মিশ্রিত সাসপেনশন (২–৫ বছরে ৫০ মি.লি.)',
    },
    coldChain: {
      en: 'Freezer (-25°C to -15°C) or +2°C to +8°C (check expiry); drink within 15 minutes of mixing',
      bn: 'ফ্রিজার (-২৫°সে থেকে -১৫°সে) বা +২°সে–+৮°সে; মেশানোর ১৫ মিনিটের মধ্যে পান করুন',
    },
    dosingProtocol: {
      en: 'Single oral dose ≥10 days before travel (licensed for ages 2–64). Avoid eating/drinking 60 minutes before & after; avoid systemic antibiotics for 14 days prior and chloroquine for 10 days.',
      bn: '২–৬৪ বছর বয়সীদের ভ্রমণের অন্তত ১০ দিন আগে ১ ডোজ। ৬০ মিনিট আগে-পরে খাবার নেবেন না; ১৪ দিন আগে অ্যান্টিবায়োটিক নেওয়া থাকলে কার্যকরী কম হতে পারে।',
    },
    immunityProfile: {
      en: '~90% protection against severe cholera diarrhea at 10 days post-dose and ~80% at 3 months in human challenge studies.',
      bn: 'টিকার ১০ দিন পর ~৯০% এবং ৩ মাস পর ~৮০% গুরুতর কলেরা ডায়রিয়া প্রতিরোধ করে।',
    },
    specialPopulations: {
      en: 'Avoid in severely immunocompromised patients or those on recent oral antibiotics/chloroquine; limited pregnancy data.',
      bn: 'গুরুতর দুর্বল রোগপ্রতিরোধ বা সাম্প্রতিক অ্যান্টিবায়োটিক/ক্লোরোকুইন সেবনকারীদের জন্য অনুপযুক্ত।',
    },
    aftercare: {
      en: 'Wash hands thoroughly after using toilet for 7 days; seek ORS immediately if travelers diarrhea develops.',
      bn: '৭ দিন শৌচাগার ব্যবহারের পর ভালোভাবে হাত ধুয়ে নিন।',
    },
    formulations: 'Vaxchora (Bavarian Nordic)',
  },
  'td-adult': {
    platform: {
      en: 'Combined adsorbed Tetanus toxoid (≥20–40 IU) + reduced-dose Diphtheria toxoid (≤2–5 IU)',
      bn: 'অ্যাডজর্বড টিটেনাস টক্সয়েড + কম-ডোজের ডিফথেরিয়া টক্সয়েড (Td)',
    },
    route: {
      en: 'Intramuscular (IM) — deltoid muscle (women of childbearing age & adults)',
      bn: 'মাংসপেশিতে (IM) — বাহুর ডেল্টয়েড পেশী (সন্তানধারণে সক্ষম নারী ও প্রাপ্তবয়স্ক)',
    },
    doseVolume: {
      en: '0.5 mL single injection (shake gently)',
      bn: '০.৫ মি.লি. একক ইনজেকশন',
    },
    coldChain: {
      en: '+2°C to +8°C; NEVER freeze; MDVP multi-dose vial usable up to 28 days once opened if sterile/VVM OK',
      bn: '+২°সে থেকে +৮°সে; ফ্রিজ করবেন না; জীবাণুমুক্ত ও VVM ঠিক থাকলে খোলা ভায়াল ২৮ দিন ব্যবহার্য',
    },
    dosingProtocol: {
      en: 'WHO 5-dose female/maternal schedule: Td1 at first contact (≥15 yrs or early pregnancy), Td2 ≥4 wks later, Td3 ≥6 mo after Td2, Td4 ≥1 yr, Td5 ≥1 yr (lifelong protection). Unclean wound PEP: Td if ≥5 yrs since last dose.',
      bn: 'WHO ৫-ডোজ সূচি: Td1 প্রথম সাক্ষাতে, Td2 ৪ সপ্তাহ পর, Td3 ৬ মাস পর, Td4 ১ বছর পর, Td5 আরও ১ বছর পর (আজীবন সুরক্ষা)। ময়লা ক্ষত হলে শেষ ডোজ ৫+ বছর আগে হলে দিন।',
    },
    immunityProfile: {
      en: '95–100% protection against maternal/neonatal tetanus AND protects adults against resurgent diphtheria outbreaks (replacing plain TT globally).',
      bn: 'মাতৃ ও নবজাতক টিটেনাসের পাশাপাশি প্রাপ্তবয়স্কদের ডিফথেরিয়া প্রাদুর্ভাব থেকেও ৯৫–১০০% সুরক্ষা দেয় (একক TT-র আধুনিক বিকল্প)।',
    },
    specialPopulations: {
      en: 'Safe in ALL trimesters of pregnancy and during breastfeeding; transplacental IgG protects the newborn through the first 2 months until Pentavalent begins.',
      bn: 'গর্ভাবস্থার সব পর্যায়ে ও স্তন্যদানকালে সম্পূর্ণ নিরাপদ; গর্ভফুল দিয়ে গিয়ে নবজাতককে পেন্টাভ্যালেন্ট শুরুর আগ পর্যন্ত সুরক্ষা দেয়।',
    },
    aftercare: {
      en: 'Temporary arm soreness for 1–2 days is normal; move the arm normally and apply cool compress if sore.',
      bn: '১–২ দিন হাতে সামান্য ব্যথা স্বাভাবিক; হাত স্বাভাবিকভাবে নাড়াচাড়া করুন এবং প্রয়োজনে ঠান্ডা সেঁক দিন।',
    },
    formulations: 'WHO PQ Adsorbed Td (Serum Institute / Biological E / Sanofi)',
  },
  'dtap-ipv': {
    platform: {
      en: '4-in-1 Diphtheria-Tetanus toxoids, acellular Pertussis (aP) + Inactivated Poliovirus',
      bn: '৪-ইন-১ ডিফথেরিয়া-টিটেনাস টক্সয়েড, অ্যাসেলুলার পার্টুসিস ও নিষ্ক্রিয় পোলিও (DTaP-IPV)',
    },
    route: {
      en: 'Intramuscular (IM) — deltoid (or anterolateral thigh in toddlers)',
      bn: 'মাংসপেশিতে (IM) — বাহুর ডেল্টয়েড (বা ছোট শিশুর উরুর বাইরের দিক)',
    },
    doseVolume: {
      en: '0.5 mL single prefilled syringe',
      bn: '০.৫ মি.লি. প্রি-ফিল্ড সিরিঞ্জ',
    },
    coldChain: {
      en: '+2°C to +8°C; NEVER freeze; shake to uniform cloudy white suspension',
      bn: '+২°সে থেকে +৮°সে; ফ্রিজ করবেন না; ব্যবহারের আগে ঝাঁকান',
    },
    dosingProtocol: {
      en: 'Single preschool booster at 4–6 years (also usable at 16–18 months if HepB/Hib already complete), provided at least 6 months elapsed since previous DTaP/Pentavalent dose.',
      bn: '৪–৬ বছর বয়সে স্কুল-পূর্ব বুস্টার হিসেবে ১ ডোজ (পূর্ববর্তী DTaP/পেন্টাভ্যালেন্ট ডোজ থেকে অন্তত ৬ মাস ব্যবধানে)।',
    },
    immunityProfile: {
      en: 'Boosts neutralizing polio titers and pertussis immunity before primary school entry with much lower local fever than whole-cell DTP.',
      bn: 'স্কুলে ভর্তির আগে পোলিও ও পার্টুসিসের রোগপ্রতিরোধ ক্ষমতা জোরদার করে এবং হোল-সেলের চেয়ে জ্বর অনেক কম হয়।',
    },
    specialPopulations: {
      en: 'Contraindicated if anaphylaxis or unexplained encephalopathy within 7 days after prior pertussis vaccine; not used for routine ≥7–10 yr adolescent boosters (use Tdap instead).',
      bn: 'পূর্ববর্তী পার্টুসিস টিকায় অ্যানাফাইল্যাক্সিস বা এনকেফালোপ্যাথি হলে নিষিদ্ধ; ১০+ বছরে Td/Tdap ব্যবহার্য।',
    },
    aftercare: {
      en: 'Temporary whole-limb swelling can occasionally follow a 4th/5th DTaP dose and resolves spontaneously within 3–5 days.',
      bn: '৪র্থ/৫ম ডোজে কখনো বাহু সাময়িক ফুলে যেতে পারে যা ৩–৫ দিনে নিজ থেকে কমে যায়।',
    },
    formulations: 'Tetraxim (Sanofi), Infanrix-IPV (GSK), Quadracel',
  },
  'dtap-ipv-hib': {
    platform: {
      en: '5-in-1 Acellular Pertussis combination (DTaP-IPV + lyophilized Hib)',
      bn: '৫-ইন-১ অ্যাসেলুলার পার্টুসিস সমন্বয় টিকা (DTaP-IPV + হিব)',
    },
    route: {
      en: 'Intramuscular (IM) — anterolateral thigh (infants)',
      bn: 'মাংসপেশিতে (IM) — শিশুর উরুর বাইরের দিক',
    },
    doseVolume: {
      en: '0.5 mL (mix prefilled DTaP-IPV liquid into lyophilized Hib vial immediately before injection)',
      bn: '০.৫ মি.লি. (লিকুইড সিরিঞ্জ দিয়ে শুষ্ক হিব ভায়াল মিশিয়ে তাৎক্ষণিক প্রয়োগ)',
    },
    coldChain: {
      en: '+2°C to +8°C; NEVER freeze; administer immediately after reconstituting Hib pellet',
      bn: '+২°সে থেকে +৮°সে; ফ্রিজ করবেন না; হিব মিশানোর পরপরই ব্যবহার করুন',
    },
    dosingProtocol: {
      en: '3 primary doses at 6, 10, 14 weeks (or 2, 4, 6 months) + 1 booster at 15–18 months. Pair with standalone Hepatitis B vaccine if HepB not included.',
      bn: '৬, ১০, ১৪ সপ্তাহে (বা ২, ৪, ৬ মাসে) ৩টি প্রাথমিক ডোজ + ১৫–১৮ মাসে বুস্টার। HepB না থাকায় আলাদা HepB ডোজ নিশ্চিত করুন।',
    },
    immunityProfile: {
      en: 'High protective titers against 5 diseases with substantially reduced post-injection fever and inconsolable crying compared with whole-cell Pentavalent.',
      bn: '৫টি রোগের বিরুদ্ধে উচ্চ সুরক্ষা এবং হোল-সেল পেন্টাভ্যালেন্টের তুলনায় টিকাজনিত জ্বর ও ব্যথা উল্লেখযোগ্যভাবে কম।',
    },
    specialPopulations: {
      en: 'Does NOT contain Hepatitis B—verify birth/infant HepB doses separately so the child is not left unprotected against Hep B.',
      bn: 'এতে হেপাটাইটিস-বি নেই—তাই শিশুর জন্মকালীন ও নিয়মিত HepB ডোজ আলাদাভাবে নিশ্চিত করা আবশ্যক।',
    },
    aftercare: {
      en: 'Swirl until Hib powder dissolves completely before injecting; check needle length matches infant thigh muscle.',
      bn: 'ইনজেকশনের আগে হিব পাউডার পুরোপুরি মিশেছে কিনা দেখে নিন; টিকার পর শিশুর স্বাভাবিক খাওয়া চালিয়ে যান।',
    },
    formulations: 'Pentaxim (Sanofi), Pediacel, Infanrix-IPV+Hib',
  },
  'measles-single': {
    platform: {
      en: 'Live-attenuated Edmonston-Zagreb / Schwarz measles virus (monovalent MCV)',
      bn: 'মৃদু জীবিত এডমনস্টন-জাগ্রেব / শোয়ার্জ হাম ভাইরাস (মনোভ্যালেন্ট MCV)',
    },
    route: {
      en: 'Subcutaneous (SC) — upper arm / anterolateral thigh',
      bn: 'চামড়ার নিচে (SC) — বাহু বা উরুর উপরিভাগ',
    },
    doseVolume: {
      en: '0.5 mL reconstituted with manufacturer diluent; discard 6 hours post-reconstitution',
      bn: '০.৫ মি.লি. নির্ধারিত ডাইলুয়েন্টে মিশিয়ে; মিশানোর ৬ ঘণ্টা পর অবশিষ্ট ফেলে দিন',
    },
    coldChain: {
      en: '+2°C to +8°C (or -20°C bulk vial storage; diluent chilled at +2°C to +8°C before mixing); protect from light',
      bn: '+২°সে থেকে +৮°সে (ডাইলুয়েন্ট ঠান্ডা করে মেশান); সূর্যালোক থেকে দূরে রাখুন',
    },
    dosingProtocol: {
      en: 'Routine: 9 months + 2nd dose (usually MR) at 15 months. Outbreak / humanitarian zero-dose (MCV0): 6–8 months (does NOT count toward the 2 routine doses after 9 months; still give MCV1 & MCV2).',
      bn: 'নিয়মিত: ৯ মাস + ১৫ মাসে ২য় ডোজ। প্রাদুর্ভাবে ৬–৮ মাসে অতিরিক্ত জিরো-ডোজ দেওয়া হয় (এটি নিয়মিত ২ ডোজের হিসাবের মধ্যে গণ্য হয় না)।',
    },
    immunityProfile: {
      en: '85% seroconversion at 9 months rising to 95–98% after 2nd dose due to clearance of maternal antibodies.',
      bn: '৯ মাসে ~৮৫% এবং ২য় ডোজের পর ৯৫–৯৮% দীর্ঘমেয়াদী (প্রায় আজীবন) হাম প্রতিরোধ ক্ষমতা তৈরি হয়।',
    },
    specialPopulations: {
      en: 'CONTRAINDICATED in pregnancy and severe cellular immunodeficiency; safe in asymptomatic/treated HIV+ children. Give within 72h of measles exposure as PEP.',
      bn: 'গর্ভাবস্থা ও গুরুতর অনাক্রম্যতা দুর্বলতায় নিষিদ্ধ। হামের সংস্পর্শে আসার ৭২ ঘণ্টার মধ্যে দিলে সংক্রমণ প্রতিরোধ করা যায়।',
    },
    aftercare: {
      en: 'Fever and mild blotchy rash 6–12 days later are benign and non-infectious; Vitamin A is routinely paired in malnourished outbreaks.',
      bn: 'টিকার ৬–১২ দিন পর হালকা জ্বর বা র‍্যাশ স্বাভাবিক ও অসংক্রামক; অপুষ্টিতে ভিটামিন-এ সাপ্লিমেন্ট সহায়ক।',
    },
    formulations: 'WHO PQ Measles Live Attenuated (Serum Institute / Bio Farma / Biken)',
  },
  'rubella-single': {
    platform: {
      en: 'Live-attenuated RA 27/3 Rubella virus vaccine',
      bn: 'মৃদু জীবিত RA 27/3 রুবেলা ভাইরাস টিকা',
    },
    route: {
      en: 'Subcutaneous (SC) — upper arm',
      bn: 'চামড়ার নিচে (SC) — বাহুর উপরিভাগ',
    },
    doseVolume: {
      en: '0.5 mL single reconstituted dose',
      bn: '০.৫ মি.লি. একক ডোজ',
    },
    coldChain: {
      en: '+2°C to +8°C; protect from light; use within 6 hours after reconstitution',
      bn: '+২°সে থেকে +৮°সে; আলো থেকে দূরে রাখুন; মিশানোর ৬ ঘণ্টার মধ্যে ব্যবহার করুন',
    },
    dosingProtocol: {
      en: 'Single catch-up dose for rubella-susceptible non-pregnant women of childbearing age or healthcare workers (usually given as MR or MMR today). Avoid conception for 28 days post-dose.',
      bn: 'সন্তানধারণে সক্ষম অগর্ভবতী নারী বা স্বাস্থ্যকর্মীর সুরক্ষা না থাকলে ১ ডোজ (বর্তমানে অধিকাংশ ক্ষেত্রে MR বা MMR হিসেবে দেওয়া হয়)। টিকার পর ২৮ দিন গর্ভধারণ থেকে বিরত থাকুন।',
    },
    immunityProfile: {
      en: '>95% lifelong immunity after a single dose, preventing Congenital Rubella Syndrome (CRS) in future pregnancies.',
      bn: 'একক ডোজেই >৯৫% আজীবন সুরক্ষা তৈরি করে, যা ভবিষ্যৎ সন্তানের জন্মগত রুবেলা সিনড্রোম (CRS) প্রতিরোধ করে।',
    },
    specialPopulations: {
      en: 'CONTRAINDICATED during pregnancy (though accidental vaccination has not shown fetal CRS harm, counseling still applies) and severe immunodeficiency; completely safe while breastfeeding.',
      bn: 'গর্ভাবস্থায় নিষিদ্ধ (ভুলবশত দেওয়া হলেও ভ্রূণের ক্ষতির প্রমাণ বিরল, তবু সতর্কতা জরুরি); স্তন্যদানকালে সম্পূর্ণ নিরাপদ।',
    },
    aftercare: {
      en: 'Adult women occasionally notice transient mild joint aches (arthralgia) 1–3 weeks later—self-limiting and non-destructive.',
      bn: 'প্রাপ্তবয়স্ক নারীদের ১–৩ সপ্তাহ পর সাময়িক গাঁটব্যথা হতে পারে, যা নিজে থেকেই সেরে যায়।',
    },
    formulations: 'R-Vac / Meruvax II (historically; now predominantly MR / MMR WHO PQ)',
  },
  'zoster-live': {
    platform: {
      en: 'High-titer live-attenuated Oka/Merck varicella-zoster virus (19,400+ PFU)',
      bn: 'উচ্চ-মাত্রার মৃদু জীবিত ওকা ভ্যারিসেলা-জস্টার ভাইরাস টিকা (Zostavax)',
    },
    route: {
      en: 'Subcutaneous (SC) only — deltoid area within 30 minutes of reconstitution',
      bn: 'শুধুমাত্র চামড়ার নিচে (SC) — মিশ্রণের ৩০ মিনিটের মধ্যে বাহুতে',
    },
    doseVolume: {
      en: '0.65 mL single reconstituted dose',
      bn: '০.৬৫ মি.লি. একক ডোজ',
    },
    coldChain: {
      en: '-15°C or colder frozen (refrigerator-stable product +2°C to +8°C in some markets); NEVER refreeze; use within 30 minutes of mixing',
      bn: '-১৫°সে বা +২°সে–+৮°সে (পণ্যানুযায়ী); মিশানোর ৩০ মিনিটের মধ্যেই ব্যবহার্য',
    },
    dosingProtocol: {
      en: 'Legacy single SC dose for immunocompetent adults ≥60 (or ≥50) years. Discontinued/superseded in US/UK/EU by 2-dose Shingrix (RZV) due to much higher & longer efficacy.',
      bn: 'সুস্থ ৬০+ (বা ৫০+) বছর বয়সীদের জন্য একক SC ডোজ। বর্তমানে বেশি কার্যকর ২-ডোজ Shingrix (RZV) দ্বারা বেশিরভাগ দেশে প্রতিস্থাপিত।',
    },
    immunityProfile: {
      en: '~51% shingles reduction (drops to ~38% in age 70+ and wanes markedly by 5–8 years), vs >90% sustained efficacy with Shingrix.',
      bn: 'শিনগলস প্রতিরোধে ~৫১% কার্যকর এবং ৫–৮ বছরে সুরক্ষা কমে যায় (যেখানে Shingrix >৯০% কার্যকর)।',
    },
    specialPopulations: {
      en: 'CONTRAINDICATED in immunocompromised adults, leukemia/lymphoma, high-dose steroids, or pregnancy. Prior Zostavax recipients should still receive 2-dose Shingrix ≥8 weeks later.',
      bn: 'দুর্বল রোগপ্রতিরোধ, ক্যানসার/স্টেরয়েড চিকিৎসা ও গর্ভাবস্থায় নিষিদ্ধ। আগে Zostavax নিয়ে থাকলে ৮+ সপ্তাহ পর Shingrix নেওয়া যায়।',
    },
    aftercare: {
      en: 'Report any spreading vesicular rash; mild site redness or itching resolves in 2–4 days.',
      bn: 'শরীরে ছড়িয়ে পড়া ফোস্কার মতো র‍্যাশ দেখা দিলে চিকিৎসককে জানান।',
    },
    formulations: 'Zostavax (MSD — legacy / discontinued in several markets; Shingrix preferred)',
  },
  'varicella-varizig': {
    platform: {
      en: 'Purified human Varicella-Zoster Immune Globulin (passive anti-VZV IgG)',
      bn: 'পরিশোধিত হিউম্যান ভ্যারিসেলা-জস্টার ইমিউনোগ্লোবিউলিন (প্যাসিভ VZV অ্যান্টিবডি)',
    },
    route: {
      en: 'Intramuscular (IM) — NEVER give intravenously; split large adult volume across multiple muscle sites',
      bn: 'শুধুমাত্র মাংসপেশিতে (IM) — শিরায় দেবেন না; বড় ডোজ একাধিক মাংসপেশিতে ভাগ করে দিন',
    },
    doseVolume: {
      en: '125 IU per 10 kg body weight (min 62.5 IU ≤2 kg, 125 IU 2.1–10 kg, max 625 IU >40 kg)',
      bn: 'প্রতি ১০ কেজিতে ১২৫ IU (সর্বনিম্ন ৬২.৫ IU, সর্বোচ্চ ৬২৫ IU বা ৫ ভায়াল)',
    },
    coldChain: {
      en: '+2°C to +8°C; NEVER freeze; administer promptly once drawn/reconstituted',
      bn: '+২°সে থেকে +৮°সে; ফ্রিজ করবেন না; প্রস্তুত করার পর দ্রুত প্রয়োগ করুন',
    },
    dosingProtocol: {
      en: 'Post-exposure prophylaxis (PEP): single weight-based IM dose as soon as possible within 96 hours (acceptable up to 10 days) after close chickenpox/zoster exposure in high-risk non-immune patients.',
      bn: 'সংস্পর্শে আসার ৯৬ ঘণ্টার মধ্যে (সর্বোচ্চ ১০ দিন পর্যন্ত) ওজন-ভিত্তিক একক IM ডোজ—ঝুঁকিপূর্ণ অ-সুরক্ষিত ব্যক্তিদের জরুরি প্রতিরোধে।',
    },
    immunityProfile: {
      en: 'Reduces severe chickenpox pneumonia, congenital varicella, and mortality during ~3 weeks of passive protection; monitor exposed patient for 28 days (extended incubation).',
      bn: 'তীব্র জলবসন্ত নিউমোনিয়া ও মৃত্যুঝুঁকি কমায়; প্রায় ৩ সপ্তাহ প্যাসিভ সুরক্ষা থাকে এবং রোগীকে ২৮ দিন পর্যবেক্ষণে রাখতে হয়।',
    },
    specialPopulations: {
      en: 'Specifically indicated for: 1) Non-immune pregnant women, 2) Severely immunocompromised patients, 3) Newborns whose mothers developed chickenpox 5 days before to 2 days after delivery, 4) Hospitalized preterm infants.',
      bn: 'অ-সুরক্ষিত গর্ভবতী নারী, গুরুতর ইমিউনোকম্প্রোমাইজড রোগী, প্রসবের ৫ দিন আগে থেকে ২ দিন পর পর্যন্ত মায়ের জলবসন্ত হলে সেই নবজাতক ও অকালজাত শিশুর জন্য নির্দেশিত।',
    },
    aftercare: {
      en: 'Defer active Varicella or MMR vaccination for ≥5 months after VariZIG so antibodies do not neutralize the live vaccine.',
      bn: 'VariZIG নেওয়ার অন্তত ৫ মাস পর লাইভ ভ্যারিসেলা বা MMR টিকা নিন যাতে প্যাসিভ অ্যান্টিবডি টিকার কার্যকারিতা কমিয়ে না দেয়।',
    },
    formulations: 'VariZIG (Kamada / Saol Therapeutics)',
  },
  'influenza-high-dose': {
    platform: {
      en: 'High-Dose Egg-based Quadrivalent (60 µg HA/strain = 4x antigen) or MF59-Adjuvanted Flu',
      bn: 'উচ্চ-মাত্রার (৪-গুণ অ্যান্টিজেন, ৬০ µg/স্ট্রেইন) অথবা MF59-অ্যাডজুভ্যান্টেড ফ্লু টিকা',
    },
    route: {
      en: 'Intramuscular (IM) — deltoid muscle (adults ≥65 years)',
      bn: 'মাংসপেশিতে (IM) — বাহুর ডেল্টয়েড পেশী (৬৫+ বছর বয়সী প্রবীণ)',
    },
    doseVolume: {
      en: '0.7 mL (Fluzone High-Dose) or 0.5 mL (Fluad Adjuvanted) prefilled syringe',
      bn: '০.৭ মি.লি. (ফ্লুজোন হাই-ডোজ) অথবা ০.৫ মি.লি. (ফ্লুয়্যাড অ্যাডজুভ্যান্টেড)',
    },
    coldChain: {
      en: '+2°C to +8°C; protect from light; NEVER freeze',
      bn: '+২°সে থেকে +৮°সে; আলো থেকে দূরে রাখুন; ফ্রিজ করবেন না',
    },
    dosingProtocol: {
      en: 'Single annual IM dose before peak respiratory/monsoon or winter flu season for adults ≥65 years (or ≥18 yrs solid-organ transplant per ACIP).',
      bn: '৬৫+ বছর বয়সী প্রবীণদের জন্য ফ্লু মৌসুমের আগে বছরে ১টি ডোজ (অথবা অঙ্গ-প্রতিস্থাপন রোগীদের জন্য)।',
    },
    immunityProfile: {
      en: '~24% superior relative efficacy over standard-dose flu vaccines in preventing lab-confirmed influenza, pneumonia hospitalization, and cardiac events in older adults.',
      bn: 'প্রবীণদের ক্ষেত্রে সাধারণ ফ্লু টিকার চেয়ে ~২৪% বেশি সুরক্ষা দেয় এবং নিউমোনিয়া ও হার্ট অ্যাটাকজনিত হাসপাতালে ভর্তি কমায়।',
    },
    specialPopulations: {
      en: 'Preferentially recommended for adults ≥65 years to overcome age-related immunosenescence; safe with severe egg allergy (no longer contraindicated).',
      bn: 'বয়সজনিত রোগপ্রতিরোধ ক্ষমতা কমে যাওয়া মোকাবেলায় ৬৫+ বয়সে অগ্রাধিকারযোগ্য; ডিমে অ্যালার্জি থাকলেও নিরাপদ।',
    },
    aftercare: {
      en: 'Slightly higher mild arm tenderness or fatigue than standard dose, resolving in 1–2 days; cannot cause influenza infection.',
      bn: 'হালকা বাহু ব্যথা বা ক্লান্তি ১–২ দিনে সেরে যায়; এই টিকা থেকে ফ্লু রোগ হয় না।',
    },
    formulations: 'Fluzone High-Dose / Efluelda (Sanofi), Fluad (CSL Seqirus)',
  },
  'influenza-laiv': {
    platform: {
      en: 'Cold-adapted, temperature-sensitive live-attenuated quadrivalent/trivalent influenza virus (LAIV)',
      bn: 'কোল্ড-অ্যাডাপ্টেড মৃদু জীবিত নাসারন্ধ্রে স্প্রে-যোগ্য ইনফ্লুয়েঞ্জা টিকা (LAIV)',
    },
    route: {
      en: 'Intranasal spray ONLY — half dose (0.1 mL) sprayed into each nostril while seated upright',
      bn: 'শুধুমাত্র নাকের স্প্রে — সোজা বসে প্রতিটি নাকে ০.১ মি.লি. করে অর্ধেক-অর্ধেক স্প্রে',
    },
    doseVolume: {
      en: '0.2 mL total (0.1 mL per nostril via prefilled nasal sprayer; needle-free)',
      bn: 'মোট ০.২ মি.লি. (প্রতি নাকে ০.১ মি.লি.; সূচবিহীন স্প্রে)',
    },
    coldChain: {
      en: '+2°C to +8°C; protect from light; NEVER freeze; strictly short shelf-life (~18 weeks)',
      bn: '+২°সে থেকে +৮°সে; ফ্রিজ করবেন না; তুলনামূলক কম মেয়াদকাল',
    },
    dosingProtocol: {
      en: 'Annual dose for healthy non-pregnant individuals aged 2–49 years; children 2–8 yrs receiving flu vaccine for the first time need 2 doses ≥4 weeks apart.',
      bn: 'সুস্থ অগর্ভবতী ২–৪৯ বছর বয়সীদের বছরে ১ ডোজ; প্রথমবার টিকা নেওয়া ২–৮ বছরের শিশুর ৪ সপ্তাহ ব্যবধানে ২ ডোজ প্রয়োজন।',
    },
    immunityProfile: {
      en: 'Replicates gently in the cool nasal mucosa (not lungs), inducing local secretory IgA + T-cell immunity that blocks viral shedding.',
      bn: 'নাকের মিউকোসায় স্থানীয় IgA ও টি-সেল সুরক্ষা তৈরি করে (ফুসফুসে বংশবৃদ্ধি করে না) এবং সংক্রমণ ছড়ানো কমায়।',
    },
    specialPopulations: {
      en: 'CONTRAINDICATED in children <2 years, adults ≥50 years, pregnancy, immunocompromised hosts, children on chronic aspirin/salicylates (Reye risk), asthma/wheezing in ages 2–4 yrs, and CSF leaks.',
      bn: '২ বছরের কম, ৫০+ বছর, গর্ভাবস্থা, দুর্বল রোগপ্রতিরোধ, অ্যাসপিরিন সেবনকারী শিশু, হাঁপানি-হুইজিং (২–৪ বছর) বা CSF লিকেজ থাকলে নিষিদ্ধ (এর পরিবর্তে IM শট দিন)।',
    },
    aftercare: {
      en: 'Runny nose, nasal congestion, or mild sore throat for 1–2 days is common; wait ≥48 hours before giving oseltamivir/zanamivir flu antivirals or LAIV is inactivated.',
      bn: '১–২ দিন নাক বন্ধ বা গলা ব্যথা হতে পারে; ফ্লু অ্যান্টিভাইরাল ওষুধ টিকার ৪৮ ঘণ্টার মধ্যে না খাওয়াই ভালো।',
    },
    formulations: 'FluMist / Fluenz (AstraZeneca), Nasovac-S (Serum Institute)',
  },
  'rsv-nirsevimab': {
    platform: {
      en: 'Long-acting recombinant human IgG1κ monoclonal antibody targeting RSV prefusion F protein',
      bn: 'দীর্ঘ-কার্যকর রিকম্বিন্যান্ট মনোক্লোনাল অ্যান্টিবডি (নবজাতক ও শিশুর RSV প্যাসিভ সুরক্ষা)',
    },
    route: {
      en: 'Intramuscular (IM) — anterolateral thigh (does NOT interfere with co-administered EPI vaccines)',
      bn: 'মাংসপেশিতে (IM) — উরুর বাইরের দিক (নিয়মিত শিশু টিকার সাথে একসাথে নিরাপদ)',
    },
    doseVolume: {
      en: '50 mg in 0.5 mL (<5 kg infant); 100 mg in 1.0 mL (≥5 kg infant); 200 mg (2 × 100 mg) for 2nd-season high-risk toddlers',
      bn: '৫ কেজির কমে ৫০ মি.গ্রা. (০.৫ মি.লি.); ৫+ কেজিতে ১০০ মি.গ্রা. (১.০ মি.লি.); ঝুঁকিপূর্ণ ২য় মৌসুমে ২০০ মি.গ্রা.',
    },
    coldChain: {
      en: '+2°C to +8°C in carton; may stay at room temp (≤25°C) up to 8 hours max; NEVER freeze or shake',
      bn: '+২°সে থেকে +৮°সে; ফ্রিজ বা জোরে ঝাঁকাবেন না',
    },
    dosingProtocol: {
      en: 'Single IM injection for all neonates/infants <8 months entering or born during their first RSV season (and high-risk infants 8–19 months entering 2nd season) whose mothers did not receive maternal RSVpreF ≥14 days before birth.',
      bn: 'মায়ের গর্ভাবস্থায় RSV টিকা না নেওয়া থাকলে ৮ মাসের কম বয়সী সব শিশুর জন্য ১টি IM ডোজ (ও ঝুঁকিপূর্ণ ৮–১৯ মাসে ২য় মৌসুম ডোজ)।',
    },
    immunityProfile: {
      en: 'Immediate passive immunity with extended half-life (~71 days), reducing medically attended RSV lower respiratory tract infection and hospitalization by ~75–83% for ≥5 months.',
      bn: 'দেওয়ার সাথে সাথেই প্যাসিভ সুরক্ষা শুরু হয় এবং ~৫+ মাস ধরে শিশুর গুরুতর RSV ব্রঙ্কিওলাইটিস ও হাসপাতালে ভর্তি ৭৫–৮৩% কমায়।',
    },
    specialPopulations: {
      en: 'Unlike palivizumab (monthly), nirsevimab protects BOTH healthy full-term newborns and preterm/CHD/CLD infants with one shot per season.',
      bn: 'সুস্থ পূর্ণ-মেয়াদী নবজাতক এবং অকালজাত বা জন্মগত হৃদরোগ/ফুসফুস রোগী—সবার জন্যই মৌসুমে মাত্র ১ ডোজে কার্যকর।',
    },
    aftercare: {
      en: 'No interference with live or inactivated childhood vaccines; watch rarely for hypersensitivity or transient rash.',
      bn: 'শিশুর অন্যান্য টিকার কার্যকারিতায় কোনো বাধা দেয় না; বিরল অ্যালার্জি ছাড়া তেমন কোনো পার্শ্বপ্রতিক্রিয়া নেই।',
    },
    formulations: 'Beyfortus (Sanofi / AstraZeneca)',
  },
  'rsv-arexvy': {
    platform: {
      en: 'Recombinant RSVPreF3 antigen adjuvanted with AS01E liposomal adjuvant',
      bn: 'রিকম্বিন্যান্ট RSVPreF3 অ্যান্টিজেন ও AS01E অ্যাডজুভ্যান্টযুক্ত টিকা',
    },
    route: {
      en: 'Intramuscular (IM) — deltoid muscle immediately (or within 4 hours) after reconstitution',
      bn: 'মাংসপেশিতে (IM) — মিশ্রণের পর বাহুর ডেল্টয়েড পেশীতে (৪ ঘণ্টার মধ্যে)',
    },
    doseVolume: {
      en: '0.5 mL single reconstituted dose',
      bn: '০.৫ মি.লি. একক ডোজ',
    },
    coldChain: {
      en: '+2°C to +8°C; protect from light; NEVER freeze',
      bn: '+২°সে থেকে +৮°সে; আলো থেকে দূরে রাখুন; ফ্রিজ করবেন না',
    },
    dosingProtocol: {
      en: 'Single IM dose for adults ≥75 years and adults aged 50–74 at elevated risk (COPD, asthma, heart failure, diabetes, chronic kidney/liver disease, nursing homes); repeat booster not routinely annual yet.',
      bn: '৭৫+ বছর বয়সী সবার জন্য এবং ৫০–৭৪ বছর বয়সী হাঁপানি, COPD, হৃদরোগ, ডায়াবেটিস বা কিডনি রোগীদের জন্য ১ ডোজ।',
    },
    immunityProfile: {
      en: '~82.6% efficacy against RSV lower respiratory tract disease and ~94% against severe disease in Season 1, with multi-season protection extending through 2–3 seasons.',
      bn: '১ম মৌসুমে গুরুতর RSV ফুসফুসের সংক্রমণে ~৯৪% পর্যন্ত কার্যকর এবং ২–৩ মৌসুম ধরে সুরক্ষা বজায় রাখে।',
    },
    specialPopulations: {
      en: 'NOT approved for pregnancy (unlike Abrysvo, which is unadjuvanted); monitor rarely for inflammatory neurologic events (GBS) per post-marketing surveillance.',
      bn: 'গর্ভাবস্থার জন্য অনুমোদিত নয় (গর্ভাবস্থায় শুধুমাত্র অ্যাডজুভ্যান্ট-বিহীন Abrysvo প্রযোজ্য)।',
    },
    aftercare: {
      en: 'Injection-site pain, fatigue, or myalgia resolves in 1–3 days; can be given alongside seasonal flu or COVID-19 shots.',
      bn: 'হালকা ব্যথা বা ক্লান্তি ১–৩ দিনে কমে; ফ্লু বা কোভিড টিকার সাথে একই ভিজিটে নেওয়া যায়।',
    },
    formulations: 'Arexvy (GSK)',
  },
  'rabies-pcecv': {
    platform: {
      en: 'Inactivated Purified Chick Embryo Cell Culture Rabies Vaccine (Flury LEP strain)',
      bn: 'নিষ্ক্রিয় পিউরিফায়েড চিক এমব্রিও সেল জলাতঙ্ক টিকা (PCECV)',
    },
    route: {
      en: 'Intramuscular (IM, deltoid/thigh) or WHO 2-site Intradermal (ID, deltoid — Bangladesh public hospitals)',
      bn: 'মাংসপেশিতে (IM) অথবা সরকারি হাসপাতালে সাশ্রয়ী ২-সাইট ত্বকের ভেতরে (ID)',
    },
    doseVolume: {
      en: '1.0 mL IM (entire reconstituted vial) OR 0.1 mL per site (0.2 mL total per visit) ID',
      bn: '১.০ মি.লি. IM (পূর্ণ ভায়াল) অথবা ID পদ্ধতিতে প্রতি বাহুতে ০.১ মি.লি. করে মোট ০.২ মি.লি.',
    },
    coldChain: {
      en: '+2°C to +8°C; use reconstituted vial promptly (within 6–8 hours at +2°C to +8°C if strict asepsis maintained in ID clinics)',
      bn: '+২°সে থেকে +৮°সে; মিশ্রণের পর ৬–৮ ঘণ্টার মধ্যে ব্যবহার্য (ID ক্লিনিকে জীবাণুমুক্তভাবে)',
    },
    dosingProtocol: {
      en: 'WHO IPC 1-week ID PEP (preferred): 2-site ID on Days 0, 3, 7; Essen IM PEP: 4–5 doses (Days 0, 3, 7, 14, ±28). Category III bites ALWAYS need Day-0 Rabies Immunoglobulin (RIG) if never vaccinated.',
      bn: 'WHO ১-সপ্তাহের ID সূচি (বাংলাদেশ সরকারি হাসপাতালে প্রচলিত): ০, ৩ ও ৭ দিনে ২ স্থানে ID; IM সূচি: ০, ৩, ৭, ১৪ (±২৮) দিনে। ক্যাটাগরি-৩ গভীর কামড়ে অবশ্যই প্রথম দিন RIG দিন।',
    },
    immunityProfile: {
      en: 'Virtually 100% effective in preventing fatal rabies encephalitis when combined with immediate 15-minute soap-water wound washing and Day-0 RIG.',
      bn: 'কামড়ের পরপরই ১৫ মিনিট সাবান-পানিতে ক্ষত ধোয়া ও প্রথম দিন RIG-এর সাথে প্রয়োগ করলে প্রায় ১০০% জলাতঙ্ক প্রতিরোধ করে।',
    },
    specialPopulations: {
      en: 'NO contraindications exist for post-exposure prophylaxis—100% safe in pregnancy, newborns, lactation, and severe illness (untreated rabies is universally fatal).',
      bn: 'কামড়ের পর জলাতঙ্ক টিকা নেওয়ার কোনো নিষেধাজ্ঞা নেই—গর্ভাবস্থা, নবজাতক ও স্তন্যদানকারী মায়েদের জন্য সম্পূর্ণ নিরাপদ ও জীবনরক্ষাকারী।',
    },
    aftercare: {
      en: 'Wash bite wound immediately under running tap water and soap for 15 minutes; apply povidone-iodine; NEVER apply chili/herbs or tightly suture fresh deep wounds unless bleeding requires hemostasis after RIG.',
      bn: 'কামড়ের সাথে সাথেই প্রবাহিত পানিতে সাবান দিয়ে অন্তত ১৫ মিনিট ধুয়ে অ্যান্টিসেপটিক দিন; ক্ষতে মরিচ/চুনের প্রলেপ দেবেন না এবং অযথা সেলাই করবেন না।',
    },
    formulations: 'Rabipur (Bavarian Nordic / Chiron), Vaxirab N (Zydus, WHO PQ)',
  },
  'rabies-rig': {
    platform: {
      en: 'Equine (ERIG F(ab′)2 fragments) or Human (HRIG) Rabies Immunoglobulin',
      bn: 'ইকুইন (ERIG) বা হিউম্যান (HRIG) জলাতঙ্ক ইমিউনোগ্লোবিউলিন (তাৎক্ষণিক অ্যান্টিবডি)',
    },
    route: {
      en: 'Local wound infiltration directly into and around EVERY bite/scratch wound (remaining volume IM away from vaccine site ONLY if needed)',
      bn: 'সরাসরি কামড়ের ক্ষত ও তার চারপাশে অনুপ্রবেশ (ইনফিলট্রেশন); বাকি অংশ থাকলে টিকার বিপরীত মাংসপেশিতে',
    },
    doseVolume: {
      en: 'ERIG: 40 IU/kg body weight (max ~3,000 IU); HRIG: 20 IU/kg; Rabies mAb (Rabishield): 3.33 IU/kg',
      bn: 'ERIG: প্রতি কেজিতে ৪০ IU; HRIG: প্রতি কেজিতে ২০ IU; মনোক্লোনাল (র‍্যাবিশিল্ড): ৩.৩৩ IU/কেজি',
    },
    coldChain: {
      en: '+2°C to +8°C; NEVER freeze; do not administer in the same syringe or anatomical site as rabies vaccine',
      bn: '+২°সে থেকে +৮°সে; ফ্রিজ করবেন না; জলাতঙ্ক টিকার সাথে একই সিরিঞ্জ বা একই স্থানে দেবেন না',
    },
    dosingProtocol: {
      en: 'MANDATORY for all WHO Category III exposures (transdermal bites, scratches bleeding, bat exposure, saliva on mucosa/broken skin) in previously unvaccinated patients; give on Day 0 (acceptable up to Day 7 after 1st vaccine dose).',
      bn: 'পূর্বে টিকা না নেওয়া রোগীদের সব ক্যাটাগরি-৩ কামড়ে (রক্তপাত, গভীর ক্ষত, শ্লেষ্মাঝিল্লিতে লালা) প্রথম দিনই (সর্বোচ্চ ৭ম দিনের মধ্যে) দেওয়া অত্যাবশ্যক।',
    },
    immunityProfile: {
      en: 'Neutralizes rabies virus inside the wound within hours before virus enters peripheral nerves and travels to the brain—essential while vaccine takes 7–14 days to mount active antibodies.',
      bn: 'টিকা অ্যান্টিবডি তৈরি করতে ৭–১৪ দিন সময় নেয়; এই সময়ের মধ্যে RIG ক্ষতের ভেতরেই ভাইরাসকে তাৎক্ষণিক ধ্বংস করে স্নায়ুতন্ত্রে যাওয়া আটকায়।',
    },
    specialPopulations: {
      en: 'Safe in pregnancy and infancy; WHO no longer requires routine skin-prick testing before purified F(ab′)2 ERIG (keep adrenaline ready per standard clinic protocol); omit RIG if patient previously completed full PrEP/PEP.',
      bn: 'গর্ভবতী ও শিশুদের জন্য নিরাপদ; পূর্বে পূর্ণ জলাতঙ্ক টিকা নেওয়া থাকলে পুনরায় RIG দেওয়ার প্রয়োজন হয় না।',
    },
    aftercare: {
      en: 'Observe 30 minutes post-infiltration for rare serum sickness or allergy; strictly finish every scheduled rabies vaccine follow-up visit.',
      bn: 'প্রয়োগের পর ৩০ মিনিট পর্যবেক্ষণে থাকুন এবং জলাতঙ্ক টিকার পরবর্তী সব নির্ধারিত ডোজ সময়মতো সম্পন্ন করুন।',
    },
    formulations: 'Equirab / Vinrab (ERIG), HyperRAB / KamRAB / Imogam (HRIG), Rabishield (mAb)',
  },
  'tetanus-tig': {
    platform: {
      en: 'Human Tetanus Immunoglobulin (passive hyperimmune anti-tetanus toxin IgG)',
      bn: 'হিউম্যান টিটেনাস ইমিউনোগ্লোবিউলিন (তাৎক্ষণিক টিটেনাস টক্সিন প্রতিরোধী অ্যান্টিবডি)',
    },
    route: {
      en: 'Intramuscular (IM) — gluteal or anterolateral thigh (separate limb & syringe from Td/TT vaccine)',
      bn: 'মাংসপেশিতে (IM) — Td/TT টিকা থেকে ভিন্ন সিরিঞ্জ ও ভিন্ন মাংসপেশিতে',
    },
    doseVolume: {
      en: '250 IU prophylactic (up to 500 IU for severely contaminated >24h wounds/burns); 3,000–6,000 IU therapeutic',
      bn: 'প্রতিরোধে ২৫০ IU (খুব ময়লা বা >২৪ ঘণ্টার ক্ষতে ৫০০ IU); চিকিৎসায় ৩,০০০–৬,০০০ IU',
    },
    coldChain: {
      en: '+2°C to +8°C; protect from light; NEVER freeze',
      bn: '+২°সে থেকে +৮°সে; আলো থেকে দূরে রাখুন; ফ্রিজ করবেন না',
    },
    dosingProtocol: {
      en: 'Indicated alongside Td/Tdap vaccine for tetanus-prone wounds (soil/rust/manure, crush, burns, puncture, compound fracture) if patient has <3 lifetime tetanus doses or unknown vaccination history.',
      bn: 'মাটি, মরিচা, গোবরযুক্ত গভীর ক্ষত, পোড়া বা থেঁতলানো আঘাতে রোগীর জীবনে ৩টির কম টিটেনাস ডোজ থাকলে বা ইতিহাস অজানা হলে Td টিকার সাথে একই সাথে দিন।',
    },
    immunityProfile: {
      en: 'Immediately binds circulating free tetanospasmin toxin for ~3–4 weeks while active Td toxoid builds endogenous memory.',
      bn: 'তাৎক্ষণিকভাবে রক্তে মুক্ত টিটেনাস টক্সিনকে নিষ্ক্রিয় করে ~৩–৪ সপ্তাহ সুরক্ষা দেয়, যতক্ষণ না Td টিকা স্থায়ী সুরক্ষা গড়ে।',
    },
    specialPopulations: {
      en: 'Safe in pregnancy, neonates, and immunocompromised patients (note immunocompromised patients with dirty wounds always receive TIG regardless of vaccine history).',
      bn: 'গর্ভবতী, নবজাতক ও দুর্বল রোগপ্রতিরোধের রোগীদের জন্য নিরাপদ (ইমিউনোকম্প্রোমাইজড রোগীর ময়লা ক্ষতে টিকা ইতিহাস নির্বিশেষে TIG দিতে হয়)।',
    },
    aftercare: {
      en: 'Clean & debride dead tissue cleanly; complete remaining active Td/Tdap doses at 1 and 6 months if unvaccinated.',
      bn: 'ক্ষত ভালোভাবে পরিষ্কার ও ড্রেসিং করুন; পূর্বে টিকা না থাকলে বাকি Td ডোজগুলো সম্পূর্ণ করুন।',
    },
    formulations: 'HyperTET (Grifols), Tetagam P (CSL Behring), Tetglob',
  },
  'typhoid-typbar-tcv': {
    platform: {
      en: 'Vi capsular polysaccharide covalently conjugated to Tetanus Toxoid carrier (Vi-TT)',
      bn: 'টাইফয়েড Vi পলিস্যাকারাইড–টিটেনাস টক্সয়েড কনজুগেট টিকা (Vi-TT)',
    },
    route: {
      en: 'Intramuscular (IM) — anterolateral thigh (infants <2 yrs) or deltoid (≥2 yrs)',
      bn: 'মাংসপেশিতে (IM) — শিশুর উরুর বাইরের দিক (<২ বছর) বা বাহুর ডেল্টয়েড (২+ বছর)',
    },
    doseVolume: {
      en: '0.5 mL containing 25 µg Vi-polysaccharide conjugate',
      bn: '০.৫ মি.লি. (২৫ মাইক্রোগ্রাম Vi-পলিস্যাকারাইড কনজুগেট)',
    },
    coldChain: {
      en: '+2°C to +8°C; NEVER freeze; open multi-dose vials usable up to 6 hours or per WHO MDVP',
      bn: '+২°সে থেকে +৮°সে; ফ্রিজ করবেন না; ভায়াল খোলার পর নির্ধারিত সময়ে ব্যবহার করুন',
    },
    dosingProtocol: {
      en: 'Single 0.5 mL IM dose from 6 months to 45 years (clinically validated in Dhaka Mirpur cluster-randomized trial showing ~85% effectiveness across children). Can co-administer with MR at 9–15 months.',
      bn: '৬ মাস থেকে ৪৫ বছর পর্যন্ত একক ০.৫ মি.লি. ডোজ (ঢাকার মিরপুরের গবেষণায় শিশুদের মাঝে ~৮৫% কার্যকারিতা প্রমাণিত)। ৯ বা ১৫ মাসের MR টিকার সাথে একসাথে নিরাপদ।',
    },
    immunityProfile: {
      en: 'Generates T-cell-dependent IgG memory even in infants <2 years (unlike unconjugated ViPS), lasting ≥4–7+ years without rapid decay.',
      bn: '২ বছরের কম বয়সী শিশুতেও টি-সেল নির্ভর দীর্ঘমেয়াদী IgG সুরক্ষা তৈরি করে, যা ৪–৭+ বছর স্থায়ী থাকে।',
    },
    specialPopulations: {
      en: 'Safe in infants from 6 months, HIV-exposed children, and lactating mothers; protect against rising extensively drug-resistant (XDR) S. Typhi strains.',
      bn: '৬ মাস বয়স থেকে শিশু ও স্তন্যদানকারীদের জন্য নিরাপদ এবং অ্যান্টিবায়োটিক-প্রতিরোধী (XDR) টাইফয়েড থেকেও সুরক্ষা দেয়।',
    },
    aftercare: {
      en: 'Mild injection-site soreness or low fever clears within 1–2 days; continue clean drinking water habits.',
      bn: 'ইনজেকশনের জায়গায় হালকা ব্যথা বা জ্বর ১–২ দিনে কমে যায়; বিশুদ্ধ পানি পানের অভ্যাস বজায় রাখুন।',
    },
    formulations: 'Typbar-TCV (Bharat Biotech, WHO PQ), TYPHIBEV (Biological E, WHO PQ)',
  },
  'meningococcal-abcwy': {
    platform: {
      en: 'Pentavalent conjugate (MenACWY-TT) + recombinant protein factor-H binding (MenB) vaccine',
      bn: 'পেন্টাভ্যালেন্ট মেনিনগোকক্কাল টিকা (MenACWY কনজুগেট + MenB রিকম্বিন্যান্ট প্রোটিন)',
    },
    route: {
      en: 'Intramuscular (IM) — deltoid muscle immediately after mixing MenB liquid with lyophilized MenACWY',
      bn: 'মাংসপেশিতে (IM) — MenB তরল দিয়ে শুষ্ক MenACWY মিশিয়ে বাহুর ডেল্টয়েড পেশীতে',
    },
    doseVolume: {
      en: '0.5 mL reconstituted dose',
      bn: '০.৫ মি.লি. মিশ্রিত ডোজ',
    },
    coldChain: {
      en: '+2°C to +8°C horizontally; protect from light; NEVER freeze',
      bn: '+২°সে থেকে +৮°সে; আলো থেকে দূরে রাখুন; ফ্রিজ করবেন না',
    },
    dosingProtocol: {
      en: '2 doses given 6 months apart for ages 10–25 years when BOTH MenACWY and MenB protection are indicated at the same visit (replaces two separate injections).',
      bn: '১০–২৫ বছর বয়সীদের একই সাথে MenACWY ও MenB প্রয়োজন হলে ৬ মাস ব্যবধানে ২ ডোজ (দুটো আলাদা ইনজেকশনের বদলে ১টিতে)।',
    },
    immunityProfile: {
      en: 'Covers 5 major meningococcal serogroups (A, B, C, W, Y) responsible for virtually all invasive meningococcal meningitis and septicemia.',
      bn: 'প্রায় সব গুরুতর মেনিনজাইটিস ও সেপ্টিসিমিয়ার জন্য দায়ী ৫টি প্রধান সেরোগ্রুপ (A, B, C, W, Y)-এর বিরুদ্ধে সুরক্ষা দেয়।',
    },
    specialPopulations: {
      en: 'Valuable for college dorm entrants, Hajj/traveling youth, complement deficiencies, eculizumab/ravulizumab users, and asplenia.',
      bn: 'আবাসিক ছাত্র, হজ/ওমরাহ বা বিদেশগামী তরুণ, কমপ্লিমেন্ট ঘাটতি ও প্লীহাহীন রোগীদের জন্য বিশেষ উপযোগী।',
    },
    aftercare: {
      en: 'Local tenderness, fatigue, or headache common in adolescents for 1–2 days; avoid switching MenB component brands mid-series.',
      bn: '১–২ দিন হাতে ব্যথা বা ক্লান্তি হতে পারে; একই ব্র্যান্ড দিয়ে কোর্স সম্পন্ন করুন।',
    },
    formulations: 'Penbraya (Pfizer), Penmenvy (GSK, MenABCWY)',
  },
  'covid19-mrna-updated': {
    platform: {
      en: 'Nucleoside-modified mRNA in lipid nanoparticles targeting current Omicron KP.2 / JN.1 spike variant',
      bn: 'বর্তমান ওমিক্রন KP.2 / JN.1 স্ট্রেইন লক্ষ্য করে তৈরি মডিফায়েড mRNA-লিপিড ন্যানো-পার্টিকেল টিকা',
    },
    route: {
      en: 'Intramuscular (IM) — deltoid (or anterolateral thigh in infants/toddlers)',
      bn: 'মাংসপেশিতে (IM) — বাহুর ডেল্টয়েড (ছোট শিশুর উরুর বাইরের দিক)',
    },
    doseVolume: {
      en: 'Adult/adolescent ≥12 yrs: 0.3 mL (Pfizer 30 µg) or 0.5 mL (Moderna 50 µg); pediatric weight/age-adjusted vials',
      bn: '১২+ বছর: ০.৩ মি.লি. (ফাইজার) বা ০.৫ মি.লি. (মডার্না); শিশুদের জন্য বয়স-নির্দিষ্ট কম ডোজ',
    },
    coldChain: {
      en: 'Ultra-cold -90°C to -60°C (Pfizer) or -50°C to -15°C (Moderna); thawed Pfizer usable up to 10 weeks at +2°C to +8°C',
      bn: 'অতি-শীতল -৯০°সে থেকে -৬০°সে (ফাইজার) বা -২০°সে (মডার্না); গলানোর পর +২°সে–+৮°সে-এ ১০ সপ্তাহ (ফাইজার)',
    },
    dosingProtocol: {
      en: 'Single annual seasonal dose for adults ≥65 years, pregnant women, healthcare workers, and chronic illness; severely immunocompromised patients may receive a 2nd seasonal dose ≥6 months later.',
      bn: '৬৫+ প্রবীণ, গর্ভবতী, স্বাস্থ্যকর্মী ও দীর্ঘস্থায়ী রোগীদের বছরে ১টি আপডেটেড ডোজ; গুরুতর ইমিউনোকম্প্রোমাইজড হলে ৬ মাস পর অতিরিক্ত ডোজ।',
    },
    immunityProfile: {
      en: 'Restores strong neutralizing titers against circulating Omicron sublineages, reducing COVID-19 hospitalization and severe outcomes by ~60–75%.',
      bn: 'প্রচলিত ওমিক্রন সাব-ভ্যারিয়েন্টের বিরুদ্ধে অ্যান্টিবডি সতেজ করে হাসপাতালে ভর্তি ও মৃত্যুঝুঁকি ~৬০–৭৫% কমায়।',
    },
    specialPopulations: {
      en: 'WHO SAGE strongly recommends maternal COVID-19 vaccination during pregnancy (protects both mother & infant <6 months); monitor rare myocarditis (<1:20,000) in young males 12–29 yrs (far lower than infection risk).',
      bn: 'WHO গর্ভাবস্থায় টিকা গ্রহণের জোর সুপারিশ করে (মা ও নবজাতক উভয়ের সুরক্ষায়); ১২–২৯ বছরের ছেলেদের মায়োকার্ডাইটিস ঝুঁকি অত্যন্ত বিরল হলেও বুকে ব্যথা হলে পরীক্ষা করান।',
    },
    aftercare: {
      en: 'Fever, chills, fatigue, or sore arm resolves in 1–2 days; seek urgent ECG/evaluation if unexplained chest pain, palpitations, or shortness of breath appears within 1 week.',
      bn: '১–২ দিনের জ্বর বা ক্লান্তি স্বাভাবিক; টিকার ১ সপ্তাহের মধ্যে বুকে ব্যথা বা শ্বাসকষ্ট হলে দ্রুত চিকিৎসকের শরণাপন্ন হন।',
    },
    formulations: 'Comirnaty Updated (Pfizer-BioNTech, WHO EUL/PQ), Spikevax Updated (Moderna)',
  },
  adenovirus: {
    platform: {
      en: 'Live, non-attenuated enteric-coated oral Adenovirus Types 4 & 7',
      bn: 'এন্টেরিক-কোটেড জীবিত মুখে খাওয়ার অ্যাডেনোভাইরাস টাইপ ৪ ও ৭ ট্যাবলেট',
    },
    route: {
      en: 'Oral (PO) — 2 distinct enteric-coated tablets swallowed WHOLE (NEVER crush or chew)',
      bn: 'মুখে খাওয়া (PO) — ২টি এন্টেরিক-কোটেড ট্যাবলেট পানি দিয়ে আস্ত গিলে খেতে হয় (চাবানো বা গুঁড়ো করা নিষেধ)',
    },
    doseVolume: {
      en: 'Two oral tablets (1 white Type 4 tablet + 1 peach Type 7 tablet) at a single sitting',
      bn: 'একবারে দুটি ট্যাবলেট (১টি টাইপ ৪ + ১টি টাইপ ৭)',
    },
    coldChain: {
      en: '+2°C to +8°C; keep desiccated bottle tightly capped; NEVER freeze',
      bn: '+২°সে থেকে +৮°সে; বোতলের মুখ শক্তভাবে বন্ধ রাখুন; ফ্রিজ করবেন না',
    },
    dosingProtocol: {
      en: 'Restricted exclusively to military recruits & basic trainees aged 17–50 years (single 2-tablet oral dose on Day 0); NOT licensed for general civilian or pediatric use.',
      bn: 'শুধুমাত্র ১৭–৫০ বছর বয়সী সামরিক প্রশিক্ষণার্থীদের জন্য (দিন ০-তে ২টি ট্যাবলেট একসাথে); সাধারণ নাগরিক বা শিশুদের জন্য নয়।',
    },
    immunityProfile: {
      en: '>95–99% protection against acute febrile respiratory illness (ARD) & adenovirus pneumonia inside crowded barracks by safely restricting viral replication to the gut.',
      bn: 'ভাইরাসকে শ্বাসতন্ত্রের বদলে অন্ত্রে সীমাবদ্ধ রেখে সামরিক ব্যারাকে অ্যাডেনোভাইরাসজনিত তীব্র জ্বর ও নিউমোনিয়া >৯৫–৯৯% প্রতিরোধ করে।',
    },
    specialPopulations: {
      en: 'CONTRAINDICATED in pregnancy (prevent pregnancy for 6 weeks), breastfeeding, and immunocompromised individuals; shed live virus in stool up to 28 days—strict hand hygiene mandatory.',
      bn: 'গর্ভবতী, স্তন্যদানকারী ও দুর্বল রোগপ্রতিরোধে নিষিদ্ধ; ২৮ দিন পর্যন্ত মলের সাথে ভাইরাস নিঃসৃত হয় বলে কঠোর হাত ধোয়ার নিয়ম মেনে চলুন।',
    },
    aftercare: {
      en: 'NEVER chew tablets—crushing exposes the upper respiratory tract to live virus; practice meticulous handwashing for 4 weeks.',
      bn: 'ট্যাবলেট কখনোই দাঁত দিয়ে ভাঙবেন না; পুরো ৪ সপ্তাহ নিয়মিত সাবান দিয়ে হাত ধুয়ে নিন।',
    },
    formulations: 'Adenovirus Type 4 and Type 7 Vaccine, Live, Oral (Teva / US DoD)',
  },
};
