export type ColdChainPartId =
  | 'carrier'
  | 'icepacks'
  | 'probe'
  | 'tray'
  | 'vial-bcg'
  | 'vial-penta'
  | 'vial-pcv'
  | 'vial-mr';

export type ThermalMode = 'nominal' | 'excursion';

export interface ColdChainPartSpec {
  id: ColdChainPartId;
  title: { en: string; bn: string };
  role: { en: string; bn: string };
  spec: { en: string; bn: string };
  nominalRange: string;
}

export const COLD_CHAIN_PARTS: Record<ColdChainPartId, ColdChainPartSpec> = {
  carrier: {
    id: 'carrier',
    title: {
      en: 'WHO PQS Insulated Vaccine Carrier',
      bn: 'WHO PQS ইনসুলেটেড ভ্যাকসিন ক্যারিয়ার',
    },
    role: {
      en: 'Polyurethane foam core maintains +2°C to +8°C for up to 36–48 hours during EPI outreach sessions.',
      bn: 'পলিউরেথেন ফোম স্তর আউটরিচ টিকাদান কেন্দ্রে ৩৬–৪৮ ঘণ্টা পর্যন্ত +২°সে থেকে +৮°সে তাপমাত্রা ধরে রাখে।',
    },
    spec: {
      en: '40mm CFC-free PU wall · airtight EPDM lid gasket',
      bn: '৪০ মিমি পিইউ ইনসুলেশন · বায়ুরোধী ইপিডিএম গ্যাস্কেট',
    },
    nominalRange: '+2.0°C – +8.0°C',
  },
  icepacks: {
    id: 'icepacks',
    title: {
      en: 'Conditioned Ice-Pack Array (4×)',
      bn: 'কন্ডিশন্ড আইস-প্যাক অ্যারে (৪টি)',
    },
    role: {
      en: 'Conditioned at 0°C until water sloshes inside before packing — prevents freeze damage to Penta, PCV & TT vials.',
      bn: 'প্যাক করার আগে ০°সে-তে কন্ডিশন করা হয় যাতে ভেতরের বরফ সামান্য নড়ে — এতে পেন্টা, পিসিভি ও টিটি টিকা জমে নষ্ট হয় না।',
    },
    spec: {
      en: '4× 0.4L HDPE coolant packs · perimeter thermal ring',
      bn: '৪× ০.৪ লিটার এইচডিপিই কুল্যান্ট প্যাক · চারপাশে শীতল বলয়',
    },
    nominalRange: '0.0°C conditioned',
  },
  probe: {
    id: 'probe',
    title: {
      en: 'Digital 30-Day Telemetry Probe',
      bn: 'ডিজিটাল ৩০-দিন টেলিমেট্রি প্রোব',
    },
    role: {
      en: 'Continuously samples chamber temperature every 5 minutes and flags high (>+8°C) or freeze (<−0.5°C) excursions.',
      bn: 'প্রতি ৫ মিনিটে তাপমাত্রা মাপে এবং +৮°সে-এর উপরে বা −০.৫°সে-এর নিচে গেলে সতর্ক সংকেত দেখায়।',
    },
    spec: {
      en: '±0.2°C thermistor · 30-day min/max memory',
      bn: '±০.২°সে থার্মিস্টর · ৩০ দিনের মিনিমাম/ম্যাক্সিমাম মেমোরি',
    },
    nominalRange: 'Alarm < −0.5°C / > +8.0°C',
  },
  tray: {
    id: 'tray',
    title: {
      en: 'Anodized Foam & Vial Divider Tray',
      bn: 'অ্যানোডাইজড ভায়াল ও ফোম ডিভাইডার ট্রে',
    },
    role: {
      en: 'Suspends glass vials away from direct contact with ice-pack walls while keeping opened multi-dose vials upright.',
      bn: 'কাচের ভায়ালকে সরাসরি বরফের সংস্পর্শ থেকে দূরে রাখে এবং খোলা ভায়াল সোজা অবস্থায় ধরে রাখে।',
    },
    spec: {
      en: 'Perforated tray · direct-freeze isolation barrier',
      bn: 'ছিদ্রযুক্ত ট্রে · সরাসরি বরফ-স্পর্শ প্রতিরোধক',
    },
    nominalRange: 'Zero freeze contact',
  },
  'vial-bcg': {
    id: 'vial-bcg',
    title: {
      en: 'BCG Lyophilized Vial (VVM-14)',
      bn: 'বিসিজি ফ্রিজ-ড্রাইড ভায়াল (ভিভিএম-১৪)',
    },
    role: {
      en: 'Tuberculosis vaccine given at birth. Reconstituted vial must be discarded within 6 hours of mixing and kept on a foam pad.',
      bn: 'জন্মের পরপরই প্রদেয় যক্ষ্মার টিকা। গুলে ফেলার ৬ ঘণ্টার মধ্যে ব্যবহার করতে হয় এবং ফোম প্যাডে ঠান্ডা রাখতে হয়।',
    },
    spec: {
      en: 'Multi-dose vial · Discard 6h after reconstitution',
      bn: 'মাল্টি-ডোজ ভায়াল · গুলার ৬ ঘণ্টা পর বাতিলযোগ্য',
    },
    nominalRange: '+2.0°C – +8.0°C',
  },
  'vial-penta': {
    id: 'vial-penta',
    title: {
      en: 'Pentavalent DTP-HepB-Hib (Freeze-Sensitive)',
      bn: 'পেন্টাভ্যালেন্ট ডিটিপি-হেপবি-হিব (ফ্রিজ-সংবেদনশীল)',
    },
    role: {
      en: 'Never freeze. Freezing destroys adjuvant potency irreversibly — perform the Shake Test if exposed below 0°C.',
      bn: 'কখনই জমতে দেবেন না। জমে গেলে টিকার কার্যকারিতা চিরতরে নষ্ট হয় — ০°সে-এর নিচে গেলে শেক টেস্ট করতে হয়।',
    },
    spec: {
      en: 'Freeze-sensitive · Aluminum adjuvant suspension',
      bn: 'ফ্রিজ-সংবেদনশীল · অ্যালুমিনিয়াম অ্যাডজুভেন্ট',
    },
    nominalRange: 'STRICT +2°C – +8°C',
  },
  'vial-pcv': {
    id: 'vial-pcv',
    title: {
      en: 'PCV-10 Pneumococcal Vial',
      bn: 'পিসিভি-১০ নিউমোকক্কাল ভায়াল',
    },
    role: {
      en: 'Protects infants against severe pneumonia and meningitis at 6, 10, and 18 weeks. Strictly freeze-sensitive.',
      bn: '৬, ১০ ও ১৮ সপ্তাহ বয়সে শিশুকে মারাত্মক নিউমোনিয়া ও মেনিনজাইটিস থেকে সুরক্ষা দেয়। জমে গেলে নষ্ট হয়।',
    },
    spec: {
      en: '3-dose EPI series · Keep strictly unfrozen',
      bn: '৩-ডোজ ইপিআই সূচি · জমতে দেওয়া যাবে না',
    },
    nominalRange: 'STRICT +2°C – +8°C',
  },
  'vial-mr': {
    id: 'vial-mr',
    title: {
      en: 'Measles-Rubella (MR) Vial (VVM-14)',
      bn: 'হাম-রুবেলা (এমআর) ভায়াল (ভিভিএম-১৪)',
    },
    role: {
      en: 'Administered at 9 and 15 months. Protected from UV light in amber/shielded tray; check VVM inner square before use.',
      bn: '৯ ও ১৫ মাসে প্রদেয়। সূর্যালোক থেকে আড়ালে রাখতে হয় এবং ব্যবহারের আগে ভিভিএম-এর ভেতরের বর্গক্ষেত্র পরীক্ষা করতে হয়।',
    },
    spec: {
      en: 'Light-sensitive · Discard 6h after mixing',
      bn: 'আলো-সংবেদনশীল · গুলার ৬ ঘণ্টা পর বাতিলযোগ্য',
    },
    nominalRange: '+2.0°C – +8.0°C',
  },
};
