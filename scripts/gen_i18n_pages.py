#!/usr/bin/env python3
"""Append the keys the routed pages need to the existing i18n dictionaries.

Existing keys are never touched, so re-running is safe. Every key is added to
both `en` and `bn` (the parity test in src/tests/i18n.test.ts fails otherwise).
"""
import os

DICT = 'src/i18n/dictionaries'

# namespace -> {key: (english, bangla)}
ADDITIONS = {
    'nav': {
        'nav.home': ('Home', 'হোম'),
        'nav.vaccines': ('Vaccines', 'টিকা'),
        'nav.schedule': ('Schedule', 'সূচি'),
        'nav.tracker': ('Tracker', 'ট্র্যাকার'),
        'nav.centres': ('Centres', 'কেন্দ্র'),
        'nav.tikabot': ('TikaBot', 'টিকাবট'),
        'nav.auth': ('Account', 'অ্যাকাউন্ট'),
        'nav.about': ('About', 'পরিচিতি'),
        'nav.privacy': ('Privacy & data', 'গোপনীয়তা ও তথ্য'),
    },
    'home': {
        'home.hero.title': ('Every vaccine, on time, for every member of your family.',
                            'পরিবারের সবার জন্য প্রতিটি টিকা, সঠিক সময়ে।'),
        'home.hero.subtitle': (
            'Source-backed schedules for Bangladesh, catch-up planning, dose tracking and 99 verified centres — in English and বাংলা, and it all works offline.',
            'বাংলাদেশের জন্য নির্ভরযোগ্য সূত্রসহ টিকাদান সূচি, ক্যাচ-আপ পরিকল্পনা, ডোজ ট্র্যাকিং এবং ৯৯টি যাচাই করা কেন্দ্র — ইংরেজি ও বাংলায়, এবং সবকিছু অফলাইনে কাজ করে।'),
        'home.hero.primary': ('Browse the schedule', 'সূচি দেখুন'),
        'home.hero.secondary': ('Add a family member', 'পরিবারের সদস্য যোগ করুন'),
        'home.hero.tertiary': ('Ask TikaBot', 'টিকাবটকে জিজ্ঞাসা করুন'),
        'home.features.schedule.title': ('Age-based schedule', 'বয়সভিত্তিক সূচি'),
        'home.features.schedule.body': (
            'The Bangladesh EPI schedule from birth to 15 months, plus catch-up planning when a dose was missed.',
            'জন্ম থেকে ১৫ মাস পর্যন্ত বাংলাদেশের ইপিআই সূচি, এবং কোনো ডোজ বাদ পড়লে ক্যাচ-আপ পরিকল্পনা।'),
        'home.features.tracker.title': ('Family tracking', 'পরিবার ট্র্যাকিং'),
        'home.features.tracker.body': (
            'Keep a record for every member. Doses, dates, centres and notes stay on your device.',
            'প্রতিটি সদস্যের রেকর্ড রাখুন। ডোজ, তারিখ, কেন্দ্র ও নোট আপনার ডিভাইসেই থাকে।'),
        'home.features.centres.title': ('Verified centres', 'যাচাই করা কেন্দ্র'),
        'home.features.centres.body': (
            'Government, private, NGO and hospital centres with phone numbers, hours and the source they were checked against.',
            'সরকারি, বেসরকারি, এনজিও ও হাসপাতাল কেন্দ্র — ফোন নম্বর, সময় এবং কোন সূত্র থেকে যাচাই করা হয়েছে তা সহ।'),
        'home.features.bot.title': ('TikaBot assistant', 'টিকাবট সহকারী'),
        'home.features.bot.body': (
            'Ask about side effects, spacing between doses or what to do if you are behind. Answers cite their source.',
            'পার্শ্বপ্রতিক্রিয়া, ডোজের ব্যবধান বা পিছিয়ে পড়লে কী করবেন — জিজ্ঞাসা করুন। উত্তরে সূত্র উল্লেখ থাকে।'),
        'home.features.passport.title': ('Digital passport', 'ডিজিটাল পাসপোর্ট'),
        'home.features.passport.body': (
            'Generate a signed QR certificate for a member and verify it again offline, with no server involved.',
            'একটি স্বাক্ষরিত QR সনদ তৈরি করুন এবং সার্ভার ছাড়াই অফলাইনে তা যাচাই করুন।'),
        'home.features.analytics.title': ('Progress analytics', 'অগ্রগতি বিশ্লেষণ'),
        'home.features.analytics.body': (
            'See completion rates, what is due next and where the family is behind, with printable charts.',
            'সম্পন্ন হার, পরবর্তী ডোজ এবং কোথায় পিছিয়ে আছেন — ছবিসহ দেখুন, প্রিন্টও করা যায়।'),
        'home.quick.title': ('Jump straight in', 'সরাসরি শুরু করুন'),
        'home.cta.title': ('Start with one family member', 'একজন পরিবারের সদস্য দিয়ে শুরু করুন'),
        'home.cta.body': (
            'It takes about twenty seconds. Nothing is uploaded, and you can export or erase everything at any time.',
            'মাত্র বিশ সেকেন্ড লাগে। কিছুই আপলোড হয় না, এবং যেকোনো সময় সব তথ্য এক্সপোর্ট বা মুছে ফেলতে পারেন।'),
        'home.cta.button': ('Open the tracker', 'ট্র্যাকার খুলুন'),
        'home.banner.notPersistent': (
            'This browser is blocking local storage, so nothing you enter will be saved. Private windows cause this.',
            'এই ব্রাউজার লোকাল স্টোরেজ বন্ধ রেখেছে, তাই আপনি যা লিখবেন তা সংরক্ষিত হবে না। প্রাইভেট উইন্ডোতে এমন হয়।'),
    },
    'vaccines': {
        'vaccines.searchPlaceholder': ('Search by vaccine or disease…', 'টিকা বা রোগ দিয়ে খুঁজুন…'),
        'vaccines.filter.category': ('Category', 'ধরন'),
        'vaccines.filter.ageGroup': ('Age group', 'বয়সগ্রুপ'),
        'vaccines.filter.sort': ('Sort by', 'সাজান'),
        'vaccines.sort.name': ('Name (A–Z)', 'নাম (অ–হ)'),
        'vaccines.sort.category': ('Category', 'ধরন'),
        'vaccines.sort.introduced': ('Year introduced', 'প্রবর্তনের বছর'),
        'vaccines.category.routine': ('Routine EPI', 'নিয়মিত ইপিআই'),
        'vaccines.category.campaign': ('Campaign', 'ক্যাম্পেইন'),
        'vaccines.category.special': ('Special group', 'বিশেষ গ্রুপ'),
        'vaccines.category.recommended': ('Recommended', 'সুপারিশকৃত'),
        'vaccines.category.non_routine': ('Non-routine', 'অনিয়মিত'),
        'vaccines.count': ('{0} vaccines', '{0} টি টিকা'),
        'vaccines.empty': ('No vaccine matches that search.', 'এই অনুসন্ধানে কোনো টিকা পাওয়া যায়নি।'),
        'vaccines.clearFilters': ('Clear filters', 'ফিল্টার মুছুন'),
        'vaccines.doses': ('{0} doses', '{0} ডোজ'),
        'vaccines.efficacy': ('Efficacy', 'কার্যকারিতা'),
        'vaccines.notFound.title': ('Vaccine not found', 'টিকা পাওয়া যায়নি'),
        'vaccines.notFound.body': ('No vaccine has the identifier “{0}”.', '“{0}” নামে কোনো টিকা নেই।'),
        'vaccines.detail.disease': ('Protects against', 'যে রোগ থেকে রক্ষা করে'),
        'vaccines.detail.schedule': ('When it is given', 'কখন দেওয়া হয়'),
        'vaccines.detail.ageGroup': ('Age group', 'বয়সগ্রুপ'),
        'vaccines.detail.introduced': ('Introduced in Bangladesh', 'বাংলাদেশে প্রবর্তন'),
        'vaccines.detail.doseCount': ('Number of doses', 'ডোজ সংখ্যা'),
        'vaccines.detail.description': ('About this vaccine', 'এই টিকা সম্পর্কে'),
        'vaccines.detail.diseaseRisk': ('Why it matters', 'কেন জরুরি'),
        'vaccines.detail.commonEffects': ('Common side effects', 'সাধারণ পার্শ্বপ্রতিক্রিয়া'),
        'vaccines.detail.seriousEffects': ('Serious side effects', 'গুরুতর পার্শ্বপ্রতিক্রিয়া'),
        'vaccines.detail.contraindications': ('Who should not take it', 'কাদের নেওয়া উচিত নয়'),
        'vaccines.detail.source': ('Source', 'সূত্র'),
        'vaccines.detail.viewSource': ('View the source', 'সূত্র দেখুন'),
        'vaccines.detail.compare': ('Add to comparison', 'তুলনায় যোগ করুন'),
        'vaccines.detail.compared': ('In comparison', 'তুলনায় আছে'),
        'vaccines.detail.recordDose': ('Record a dose', 'ডোজ যুক্ত করুন'),
        'vaccines.detail.medicalDisclaimer': (
            'TikaTrack summarises published guidance. It is not medical advice — confirm any decision with a registered health worker.',
            'টিকাট্র্যাক প্রকাশ্য নির্দেশিকার সারসংক্ষেপ দেয়। এটি চিকিৎসা পরামর্শ নয় — যেকোনো সিদ্ধান্তের আগে একজন নিবন্ধিত স্বাস্থ্যকর্মীর সঙ্গে কথা বলুন।'),
    },
    'tracker': {
        'tracker.title': ('Family tracker', 'পরিবার ট্র্যাকার'),
        'tracker.subtitle': ('Everyone you look after, in one place.', 'আপনি যাদের দেখাশোনা করেন, সবাই এক জায়গায়।'),
        'tracker.add.title': ('Add a family member', 'পরিবারের সদস্য যোগ করুন'),
        'tracker.add.name': ('Full name', 'পুরো নাম'),
        'tracker.add.namePlaceholder': ('e.g. Ayesha Rahman', 'যেমন: আয়েশা রহমান'),
        'tracker.add.dob': ('Date of birth', 'জন্ম তারিখ'),
        'tracker.add.relationship': ('Relationship', 'সম্পর্ক'),
        'tracker.add.gender': ('Gender', 'লিঙ্গ'),
        'tracker.add.submit': ('Add member', 'সদস্য যোগ করুন'),
        'tracker.add.error.name': ('Please enter a name.', 'অনুগ্রহ করে একটি নাম লিখুন।'),
        'tracker.add.error.dob': ('Please enter a valid date of birth.', 'অনুগ্রহ করে একটি সঠিক জন্ম তারিখ দিন।'),
        'tracker.add.error.dobFuture': ('Date of birth cannot be in the future.', 'জন্ম তারিখ ভবিষ্যতের হতে পারে না।'),
        'tracker.add.error.duplicate': ('{0} is already in your list.', '{0} ইতিমধ্যে আপনার তালিকায় আছে।'),
        'tracker.relationship.self': ('Self', 'নিজে'),
        'tracker.relationship.child': ('Child', 'সন্তান'),
        'tracker.relationship.spouse': ('Spouse', 'স্বামী/স্ত্রী'),
        'tracker.relationship.parent': ('Parent', 'বাবা/মা'),
        'tracker.relationship.sibling': ('Sibling', 'ভাই/বোন'),
        'tracker.relationship.other': ('Other', 'অন্যান্য'),
        'tracker.gender.female': ('Female', 'নারী'),
        'tracker.gender.male': ('Male', 'পুরুষ'),
        'tracker.gender.other': ('Other', 'অন্যান্য'),
        'tracker.empty.title': ('No family members yet', 'এখনো কোনো সদস্য নেই'),
        'tracker.empty.body': (
            'Add the people you look after and TikaTrack will work out what is due, what is overdue and what comes next.',
            'যাদের দেখাশোনা করেন তাদের যোগ করুন — কী বকেয়া, কী এসে গেছে এবং এরপর কী, টিকাট্রাক নিজেই হিসাব করবে।'),
        'tracker.member.age': ('Age', 'বয়স'),
        'tracker.member.progress': ('Progress', 'অগ্রগতি'),
        'tracker.member.next': ('Next dose', 'পরবর্তী ডোজ'),
        'tracker.member.overdueCount': ('{0} overdue', '{0} টি বকেয়া'),
        'tracker.member.openSchedule': ('Open schedule', 'সূচি খুলুন'),
        'tracker.member.recordDose': ('Record dose', 'ডোজ যুক্ত করুন'),
        'tracker.member.edit': ('Edit details', 'তথ্য সম্পাদনা'),
        'tracker.member.delete': ('Remove member', 'সদস্য মুছুন'),
        'tracker.edit.title': ('Edit {0}', '{0} সম্পাদনা'),
        'tracker.dose.title': ('Record a dose for {0}', '{0}-এর ডোজ যুক্ত করুন'),
        'tracker.dose.vaccine': ('Vaccine', 'টিকা'),
        'tracker.dose.date': ('Date given', 'প্রদানের তারিখ'),
        'tracker.dose.centre': ('Centre', 'কেন্দ্র'),
        'tracker.dose.notes': ('Notes', 'নোট'),
        'tracker.dose.notesPlaceholder': ('Batch number, next appointment…', 'ব্যাচ নম্বর, পরবর্তী অ্যাপয়েন্টমেন্ট…'),
        'tracker.dose.submit': ('Save dose', 'ডোজ সংরক্ষণ'),
        'tracker.dose.remove': ('Remove this dose', 'এই ডোজ মুছুন'),
        'tracker.dose.recorded': ('Dose recorded for {0}.', '{0}-এর ডোজ সংরক্ষিত হয়েছে।'),
        'tracker.dose.alreadyRecorded': (
            '{0} already has a dose recorded for {1}. Saving will replace it.',
            '{1}-এর জন্য {0}-এর একটি ডোজ ইতিমধ্যে সংরক্ষিত আছে। সংরক্ষণ করলে তা প্রতিস্থাপিত হবে।'),
        'tracker.export.title': ('Back up your data', 'তথ্য ব্যাকআপ করুন'),
        'tracker.export.body': (
            'Download every profile as JSON, or the current view as CSV. Keep the JSON file somewhere safe — it is the only copy.',
            'সব প্রোফাইল JSON আকারে, অথবা বর্তমান তালিকা CSV আকারে ডাউনলোড করুন। JSON ফাইলটি নিরাপদে রাখুন — এটিই একমাত্র কপি।'),
        'tracker.export.json': ('Download JSON', 'JSON ডাউনলোড'),
        'tracker.export.csv': ('Download CSV', 'CSV ডাউনলোড'),
        'tracker.import.placeholder': ('Paste the exported JSON here…', 'এক্সপোর্ট করা JSON এখানে দিন…'),
        'tracker.import.invalid': ('That file is not a TikaTrack export.', 'এটি টিকাট্র্যাকের এক্সপোর্ট ফাইল নয়।'),
        'tracker.import.merged': ('Imported {0} of {1} profiles.', '{1} টির মধ্যে {0} টি প্রোফাইল ইমপোর্ট হয়েছে।'),
        'tracker.import.duplicates': ('{0} already existed and were skipped.', '{0} টি আগে থেকেই ছিল, বাদ দেওয়া হয়েছে।'),
        'tracker.danger.title': ('Erase everything', 'সব মুছে ফেলুন'),
        'tracker.danger.body': (
            'This deletes every profile, dose and reminder from this browser. It cannot be undone.',
            'এটি এই ব্রাউজারের সব প্রোফাইল, ডোজ ও রিমাইন্ডার মুছে ফেলবে। ফিরিয়ে আনা যাবে না।'),
        'tracker.danger.button': ('Delete all local data', 'সব লোকাল তথ্য মুছুন'),
        'tracker.danger.done': ('All local TikaTrack data was deleted.', 'সব লোকাল টিকাট্র্যাক তথ্য মুছে ফেলা হয়েছে।'),
        'tracker.storage.usage': ('Using about {0} in this browser', 'এই ব্রাউজারে প্রায় {0} ব্যবহৃত হচ্ছে'),
        'tracker.status.upcoming': ('Upcoming', 'আসন্ন'),
        'tracker.status.overdue': ('Overdue', 'বকেয়া'),
        'tracker.status.completed': ('Completed', 'সম্পন্ন'),
        'tracker.status.dueToday': ('Due today', 'আজই'),
        'tracker.status.noneDue': ('Nothing due', 'কিছু বকেয়া নেই'),
    },
    'centres': {
        'centres.filter.division': ('Division', 'বিভাগ'),
        'centres.filter.district': ('District', 'জেলা'),
        'centres.filter.type': ('Type', 'ধরন'),
        'centres.filter.verifiedOnly': ('Verified only', 'শুধু যাচাইকৃত'),
        'centres.type.government': ('Government', 'সরকারি'),
        'centres.type.private': ('Private', 'বেসরকারি'),
        'centres.type.ngo': ('NGO', 'এনজিও'),
        'centres.type.hospital': ('Hospital', 'হাসপাতাল'),
        'centres.allDivisions': ('All divisions', 'সব বিভাগ'),
        'centres.allDistricts': ('All districts', 'সব জেলা'),
        'centres.allTypes': ('All types', 'সব ধরন'),
        'centres.openMaps': ('Open in Maps', 'ম্যাপে খুলুন'),
        'centres.copyPhone': ('Copy phone number', 'ফোন নম্বর কপি করুন'),
        'centres.source': ('Verified against', 'যাচাইয়ের সূত্র'),
        'centres.unverified': ('Not independently verified', 'স্বতন্ত্রভাবে যাচাই করা হয়নি'),
        'centres.sort.name': ('Name', 'নাম'),
        'centres.sort.district': ('District', 'জেলা'),
        'centres.sort.type': ('Type', 'ধরন'),
        'centres.filters.active': ('{0} filters active', '{0} টি ফিল্টার চালু'),
        'centres.export': ('Download this list (CSV)', 'এই তালিকা ডাউনলোড করুন (CSV)'),
        'centres.disclaimer': (
            'Opening hours and phone numbers change. Call before you travel, and use the 16263 hotline if a centre is unresponsive.',
            'সময় ও ফোন নম্বর বদলাতে পারে। যাওয়ার আগে ফোন করুন, এবং কেন্দ্র সাড়া না দিলে ১৬২৬৩ হটলাইনে যোগাযোগ করুন।'),
    },
    'tikabot': {
        'tikabot.greeting': (
            'আসসালামু আলাইকুম! I am TikaBot. Ask me about vaccine schedules, side effects, catch-up doses or where to get vaccinated.',
            'আসসালামু আলাইকুম! আমি টিকাবট। টিকার সূচি, পার্শ্বপ্রতিক্রিয়া, বকেয়া ডোজ বা কোথায় টিকা নেবেন — যা খুশি জিজ্ঞাসা করুন।'),
        'tikabot.suggestions': ('Try asking', 'এগুলো জিজ্ঞাসা করে দেখুন'),
        'tikabot.thinking': ('TikaBot is looking that up…', 'টিকাবট খুঁজে দেখছে…'),
        'tikabot.fallback': (
            'I could not find that in the Bangladesh immunisation guidance I have. Try rephrasing, or ask about a specific vaccine, dose spacing or side effects.',
            'আমার কাছে থাকা বাংলাদেশের টিকাদান নির্দেশিকায় এটি খুঁজে পাইনি। অন্যভাবে জিজ্ঞাসা করুন, অথবা নির্দিষ্ট টিকা, ডোজের ব্যবধান বা পার্শ্বপ্রতিক্রিয়া সম্পর্কে জানতে চান।'),
        'tikabot.confidence': ('Confidence', 'নির্ভুলতা'),
        'tikabot.relatedQuestions': ('You might also ask', 'এগুলোও জিজ্ঞাসা করতে পারেন'),
        'tikabot.send': ('Send', 'পাঠান'),
        'tikabot.inputPlaceholder': ('Type your question in English or বাংলা…', 'ইংরেজি বা বাংলায় প্রশ্ন লিখুন…'),
        'tikabot.clear': ('Start a new chat', 'নতুন কথোপকথন শুরু করুন'),
        'tikabot.history': ('Earlier in this chat', 'এই কথোপকথনের আগের অংশ'),
        'tikabot.offline': (
            'TikaBot runs entirely in your browser from a bundled knowledge base. No question is sent to a server.',
            'টিকাবট সম্পূর্ণভাবে আপনার ব্রাউজারে, সংরক্ষিত নলেজ বেস থেকে চলে। কোনো প্রশ্ন সার্ভারে পাঠানো হয় না।'),
    },
    'about': {
        'about.subtitle': ('What TikaTrack is, what it is not, and where the data comes from.',
                           'টিকাট্র্যাক কী, কী নয়, এবং তথ্য কোথা থেকে আসে।'),
        'about.mission.title': ('Why it exists', 'কেন এটি তৈরি'),
        'about.mission.body': (
            'Vaccination guidance in Bangladesh is published across PDFs, circulars and hotline scripts, in two languages, and it changes. TikaTrack pulls the parts families actually need into one offline-first place.',
            'বাংলাদেশের টিকাদান নির্দেশিকা নানা PDF, সার্কুলার ও হটলাইন স্ক্রিপ্টে, দুই ভাষায় ছড়ানো এবং বদলাতে থাকে। পরিবারের যে অংশটুকু সত্যিই দরকার, টিকাট্র্যাক সেটাকে একটি অফলাইন-ফার্স্ট জায়গায় নিয়ে আসে।'),
        'about.whatItIs.title': ('What TikaTrack does', 'টিকাট্র্যাক যা করে'),
        'about.whatItIs.body': (
            'It stores your family’s vaccination records in this browser, calculates what is due from the national schedule, and helps you find a centre. Everything runs locally.',
            'এটি আপনার পরিবারের টিকার রেকর্ড এই ব্রাউজারে রাখে, জাতীয় সূচি থেকে কী বকেয়া তা হিসাব করে, এবং কেন্দ্র খুঁজতে সাহায্য করে। সবকিছু লোকালি চলে।'),
        'about.whatItIsNot.title': ('What TikaTrack is not', 'টিকাট্র্যাক যা নয়'),
        'about.whatItIsNot.body': (
            'It is not a government service, not a medical authority and not a substitute for a health worker. It cannot book appointments or issue official certificates.',
            'এটি সরকারি সেবা নয়, চিকিৎসা কর্তৃপক্ষ নয়, এবং স্বাস্থ্যকর্মীর বিকল্প নয়। এটি অ্যাপয়েন্টমেন্ট বুক করতে বা সরকারি সনদ দিতে পারে না।'),
        'about.sources.title': ('Where the data comes from', 'তথ্যের উৎস'),
        'about.sources.body': (
            'Every vaccine and centre entry carries the source it was checked against — DGHS and the EPI programme, WHO and UNICEF country documents, and published manufacturer guidance.',
            'প্রতিটি টিকা ও কেন্দ্রের তথ্যের সঙ্গে তার যাচাইয়ের সূত্র দেওয়া আছে — ডিজিএইচএস ও ইপিআই কর্মসূচি, WHO ও ইউনিসেফের দেশীয় নথি, এবং প্রকাশ্য প্রস্তুতকারক নির্দেশিকা।'),
        'about.tech.title': ('How it is built', 'কীভাবে তৈরি'),
        'about.tech.body': (
            'React, TypeScript and Tailwind, bundled with Vite. State lives in localStorage; optional Supabase sync switches on only when you configure it. The QR certificates are generated on-device.',
            'React, TypeScript ও Tailwind, Vite দিয়ে বান্ডল করা। স্টেট localStorage-এ থাকে; ঐচ্ছিক Supabase সিঙ্ক শুধু তখনই চালু হয় যখন আপনি কনফিগার করেন। QR সনদ ডিভাইসেই তৈরি হয়।'),
        'about.disclaimer.title': ('Medical disclaimer', 'চিকিৎসা সংক্রান্ত সতর্কতা'),
        'about.disclaimer.body': (
            'Information here is summarised from published guidance and may lag behind the latest circular. Always confirm with a registered health worker or by calling 16263.',
            'এখানকার তথ্য প্রকাশ্য নির্দেশিকা থেকে নেওয়া এবং সর্বশেষ সার্কুলারের চেয়ে পিছিয়ে থাকতে পারে। সবসময় একজন নিবন্ধিত স্বাস্থ্যকর্মী বা ১৬২৬৩ নম্বরে নিশ্চিত হয়ে নিন।'),
        'about.links.title': ('Official resources', 'সরকারি উৎস'),
        'about.hotline': ('National health hotline', 'জাতীয় স্বাস্থ্য হটলাইন'),
        'about.version': ('Version', 'সংস্করণ'),
        'about.license': ('Released under the MIT licence', 'MIT লাইসেন্সের অধীনে প্রকাশিত'),
    },
    'footer': {
        'footer.product': ('Product', 'প্রোডাক্ট'),
        'footer.resources': ('Resources', 'উৎস'),
        'footer.legal': ('Legal', 'আইনগত'),
        'footer.rights': ('Released under the MIT licence. Not affiliated with the Government of Bangladesh.',
                          'MIT লাইসেন্সে প্রকাশিত। বাংলাদেশ সরকারের সঙ্গে সম্পর্কিত নয়।'),
        'footer.disclaimer': (
            'TikaTrack is an information tool, not a medical service. Call 16263 for health advice.',
            'টিকাট্র্যাক একটি তথ্য সরঞ্জাম, চিকিৎসা সেবা নয়। স্বাস্থ্য পরামর্শের জন্য ১৬২৬৩ নম্বরে কল করুন।'),
    },
    'auth': {
        'auth.optional.title': ('Optional account', 'ঐচ্ছিক অ্যাকাউন্ট'),
        'auth.optional.body': (
            'TikaTrack works fully without an account — everything stays in this browser. Create one only if you want to sync the same data across devices.',
            'অ্যাকাউন্ট ছাড়াই টিকাট্র্যাক পুরোপুরি কাজ করে — সবকিছু এই ব্রাউজারে থাকে। একই তথ্য কয়েকটি ডিভাইসে রাখতে চাইলে তবেই অ্যাকাউন্ট খুলুন।'),
        'auth.localMode': ('Local mode — data stays on this device',
                           'লোকাল মোড — তথ্য এই ডিভাইসেই থাকে'),
        'auth.cloudMode': ('Cloud sync — connected to {0}', 'ক্লাউড সিঙ্ক — {0}-এর সঙ্গে যুক্ত'),
        'auth.cloudNotConfigured': (
            'Cloud sync is not configured on this deployment. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable it.',
            'এই ডিপ্লয়মেন্টে ক্লাউড সিঙ্ক কনফিগার করা নেই। চালু করতে VITE_SUPABASE_URL ও VITE_SUPABASE_ANON_KEY সেট করুন।'),
        'auth.signedInAs': ('Signed in as {0}', '{0} হিসেবে সাইন ইন করা'),
        'auth.localAccountNotice': (
            'This is a local account. Your password is hashed in this browser and never sent anywhere — which also means there is no recovery if you forget it. Export a backup.',
            'এটি একটি লোকাল অ্যাকাউন্ট। আপনার পাসওয়ার্ড এই ব্রাউজারে হ্যাশ করা থাকে এবং কোথাও পাঠানো হয় না — অর্থাৎ ভুলে গেলে ফেরানোর উপায় নেই। একটি ব্যাকআপ রাখুন।'),
        'auth.passwordStrength': ('Password strength', 'পাসওয়ার্ডের শক্তি'),
        'auth.strength.weak': ('Weak', 'দুর্বল'),
        'auth.strength.fair': ('Fair', 'মোটামুটি'),
        'auth.strength.good': ('Good', 'ভালো'),
        'auth.strength.strong': ('Strong', 'শক্তিশালী'),
        'auth.family.title': ('Family sharing', 'পরিবার শেয়ারিং'),
        'auth.family.body': (
            'Family sharing needs cloud sync. Configure Supabase, then create a family and invite members.',
            'পরিবার শেয়ারিংয়ের জন্য ক্লাউড সিঙ্ক দরকার। Supabase কনফিগার করে একটি পরিবার তৈরি করুন ও সদস্যদের আমন্ত্রণ জানান।'),
        'auth.family.create': ('Create a family', 'পরিবার তৈরি করুন'),
        'auth.family.name': ('Family name', 'পরিবারের নাম'),
        'auth.family.members': ('Members', 'সদস্যরা'),
        'auth.family.invite': ('Invite by email', 'ইমেইলে আমন্ত্রণ'),
        'auth.family.role.owner': ('Owner', 'মালিক'),
        'auth.family.role.parent': ('Parent', 'অভিভাবক'),
        'auth.family.role.caregiver': ('Caregiver', 'যত্নকারী'),
        'auth.family.role.viewer': ('Viewer', 'দর্শক'),
        'auth.signedOut': ('You are signed out.', 'আপনি সাইন আউট করেছেন।'),
        'auth.error.required': ('Please fill in every field.', 'অনুগ্রহ করে সব ঘর পূরণ করুন।'),
    },
    'passport': {
        'passport.whatIsThis': ('About this certificate', 'এই সনদ সম্পর্কে'),
        'passport.whatIsThis.body': (
            'The QR code holds the member’s name, date of birth and recorded doses, plus a checksum. It is generated on this device and can be verified again on any device running TikaTrack — no server, no account.',
            'QR কোডে সদস্যের নাম, জন্ম তারিখ ও সংরক্ষিত ডোজ, সঙ্গে একটি চেকসাম থাকে। এটি এই ডিভাইসেই তৈরি হয় এবং টিকাট্র্যাক চালু থাকা যেকোনো ডিভাইসে যাচাই করা যায় — সার্ভার বা অ্যাকাউন্ট লাগে না।'),
        'passport.warning': (
            'This is a personal record, not an official government certificate. It cannot be used for travel or employment checks.',
            'এটি একটি ব্যক্তিগত রেকর্ড, সরকারি সনদ নয়। ভ্রমণ বা চাকরির যাচাইয়ের জন্য এটি ব্যবহার করা যাবে না।'),
        'passport.member': ('Member', 'সদস্য'),
        'passport.dob': ('Date of birth', 'জন্ম তারিখ'),
        'passport.generated': ('Generated', 'তৈরির সময়'),
        'passport.noDoses': ('This member has no recorded doses yet.', 'এই সদস্যের এখনো কোনো ডোজ সংরক্ষিত নেই।'),
        'passport.verify.help': (
            'Paste the text inside a TikaTrack certificate QR code to check that it has not been altered.',
            'টিকাট্র্যাক সনদের QR কোডের ভেতরের টেক্সট দিন — এটি পরিবর্তন করা হয়েছে কি না যাচাই হবে।'),
        'passport.verify.error.empty': ('Paste a certificate payload first.', 'আগে একটি সনদের পেলোড দিন।'),
        'passport.verify.error.format': ('That payload is not a TikaTrack certificate.', 'এটি টিকাট্র্যাক সনদের পেলোড নয়।'),
        'passport.verify.doses': ('{0} recorded doses', '{0} টি সংরক্ষিত ডোজ'),
    },
    'analytics': {
        'analytics.export.title': ('Take these numbers with you', 'এই হিসাব সঙ্গে নিন'),
        'analytics.export.csv': ('Download CSV', 'CSV ডাউনলোড'),
        'analytics.member.all': ('All members', 'সব সদস্য'),
        'analytics.coverage': ('Coverage by vaccine category', 'টিকার ধরন অনুযায়ী কভারেজ'),
        'analytics.noChartData': ('Not enough recorded doses to chart yet.', 'এখনো ছবি আঁকার মতো ডোজ সংরক্ষিত হয়নি।'),
        'analytics.ageGroup': ('By age group', 'বয়সগ্রুপ অনুযায়ী'),
        'analytics.recentActivity': ('Recent activity', 'সাম্প্রতিক কার্যক্রম'),
        'analytics.lastDose': ('Last recorded dose', 'সর্বশেষ সংরক্ষিত ডোজ'),
        'analytics.nextMilestone': ('Next milestone', 'পরবর্তী ধাপ'),
        'analytics.days': ('{0} days', '{0} দিন'),
    },
    'reminders': {
        'reminders.howItWorks.title': ('How reminders work', 'রিমাইন্ডার কীভাবে কাজ করে'),
        'reminders.howItWorks.body': (
            'TikaTrack builds reminders from each member’s schedule and stores them in this browser. If you allow notifications, due reminders are shown while the app is open — nothing is scheduled while it is closed.',
            'টিকাট্র্যাক প্রতিটি সদস্যের সূচি থেকে রিমাইন্ডার তৈরি করে এই ব্রাউজারে রাখে। নোটিফিকেশনের অনুমতি দিলে অ্যাপ খোলা থাকার সময় বকেয়া রিমাইন্ডার দেখানো হয় — অ্যাপ বন্ধ থাকলে কিছু নির্ধারিত হয় না।'),
        'reminders.permission.hint': (
            'Notifications are optional. TikaTrack still lists due reminders on this page without them.',
            'নোটিফিকেশন ঐচ্ছিক। অনুমতি না দিলেও এই পেজে বকেয়া রিমাইন্ডার দেখানো হবে।'),
        'reminders.refresh': ('Recalculate reminders', 'রিমাইন্ডার নতুন করে হিসাব করুন'),
        'reminders.refreshed': ('Reminders recalculated for {0} members.', '{0} জন সদস্যের জন্য রিমাইন্ডার নতুন করে হিসাব হয়েছে।'),
        'reminders.none.title': ('Nothing scheduled', 'কিছুই নির্ধারিত নেই'),
        'reminders.none.body': ('Add a family member with a date of birth and reminders appear here.',
                                'জন্ম তারিখসহ একজন সদস্য যোগ করুন, রিমাইন্ডার এখানে দেখা যাবে।'),
        'reminders.settings.hint': ('Changes are saved to this browser automatically.',
                                     'পরিবর্তনগুলো এই ব্রাউজারে স্বয়ংক্রিয়ভাবে সংরক্ষিত হয়।'),
        'reminders.item.profile': ('For {0}', '{0}-এর জন্য'),
    },
    'compare': {
        'compare.addFirst': ('Add at least one vaccine to see a side-by-side comparison.',
                             'পাশাপাশি তুলনা দেখতে অন্তত একটি টিকা যোগ করুন।'),
        'compare.addSecond': ('Add a second vaccine to compare them.',
                              'তুলনা করতে আরেকটি টিকা যোগ করুন।'),
        'compare.browse': ('Browse vaccines', 'টিকার তালিকা দেখুন'),
        'compare.remove': ('Remove', 'সরান'),
        'compare.attribute': ('Attribute', 'বৈশিষ্ট্য'),
    },
    'error': {
        'error.boundary.title': ('This page hit an error', 'এই পেজে একটি সমস্যা হয়েছে'),
        'error.boundary.body': (
            'Your saved data is untouched — this is a rendering problem. Reloading usually fixes it.',
            'আপনার সংরক্ষিত তথ্য অক্ষত আছে — এটি একটি রেন্ডারিং সমস্যা। রিলোড করলে সাধারণত ঠিক হয়ে যায়।'),
        'error.offline.title': ('You appear to be offline', 'আপনি অফলাইনে আছেন বলে মনে হচ্ছে'),
        'error.offline.body': (
            'TikaTrack keeps working from what is already stored in this browser, but new lookups may fail.',
            'ব্রাউজারে সংরক্ষিত তথ্য দিয়ে টিকাট্র্যাক চলতে থাকবে, তবে নতুন অনুসন্ধান ব্যর্থ হতে পারে।'),
    },
    'notFound': {
        'notFound.subtitle': ('That page does not exist. It may have moved, or the link may be mistyped.',
                              'এই পেজটি নেই। হয়তো সরে গেছে, অথবা লিংকে ভুল আছে।'),
        'notFound.suggestions': ('Or try one of these', 'অথবা এগুলো দেখুন'),
    },
}



def ts_string(value: str) -> str:
    escaped = value.replace('\\', '\\\\').replace("'", "\\'")
    return f"'{escaped}'"


def existing_keys(path):
    keys = set()
    with open(path, encoding='utf-8') as handle:
        for line in handle:
            stripped = line.strip()
            if stripped.startswith("'"):
                key = stripped[1:stripped.index("'", 1)]
                keys.add(key)
    return keys


def append_keys(namespace, additions, lang, export_name):
    path = os.path.join(DICT, f'{namespace}.{lang}.ts')
    with open(path, encoding='utf-8') as handle:
        source = handle.read()
    have = existing_keys(path)
    new = [(k, v) for k, v in additions.items() if k not in have]
    if not new:
        print(f'  {path}: nothing to add ({len(have)} keys)')
        return len(have)

    closing = source.rstrip()
    assert closing.endswith('};'), f'{path} does not end with a dictionary literal'
    body = closing[:-2].rstrip('\n')
    lines = [f'  {ts_string(k)}: {ts_string(v[0 if lang == "en" else 1])},' for k, v in new]
    updated = body + '\n' + '\n'.join(lines) + '\n};\n'
    with open(path, 'w', encoding='utf-8') as handle:
        handle.write(updated)
    total = len(have) + len(new)
    print(f'  {path}: +{len(new)} keys -> {total}')
    return total


def main():
    totals = {}
    for namespace, additions in ADDITIONS.items():
        print(namespace)
        en = append_keys(namespace, additions, 'en', 'en')
        bn = append_keys(namespace, additions, 'bn', 'bn')
        if en != bn:
            raise SystemExit(f'key-count mismatch for {namespace}: en={en} bn={bn}')
        totals[namespace] = en
    print('\nnamespace key counts:', totals)


if __name__ == '__main__':
    main()
