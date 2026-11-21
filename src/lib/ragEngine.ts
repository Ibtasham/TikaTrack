/**
 * TikaBot's retrieval engine.
 *
 * A small, deterministic, offline retrieval-augmented generator. There is no
 * model and no network call: the "knowledge base" is the bundled FAQ data plus
 * the vaccine catalogue, and the "generation" step assembles the top-scoring
 * passages into an answer that always carries its source.
 *
 * Why not call an LLM? TikaTrack answers questions about giving medicine to
 * children, on Bangladeshi mobile connections, in two scripts. A hallucinated
 * dose interval is a safety incident, an API key in a static bundle is a leak,
 * and an offline user gets nothing at all. Ranked retrieval over vetted text
 * with a visible source is the right tool here.
 *
 * Scoring is BM25 over whitespace-and-script tokens, with:
 *   - a bilingual index (every document is indexed in both `en` and `bn`),
 *   - synonym/keyword expansion so "জ্বর" and "fever" reach the same document,
 *   - a small boost for high-priority medical guidance,
 *   - an urgency rule that surfaces emergency advice above everything else.
 */

import type { Language } from '../i18n/types.ts';
import { faqDatabase, type FAQEntry } from '../data/tikabot.ts';
import { getVaccineClinicalProfile } from '../data/vaccineClinicalDetails.ts';
import { allVaccines, type Vaccine } from '../data/vaccines.ts';
import { isPublishable, programmeFor } from '../data/evidence/bridge.ts';
import { isDocumentLevelSourceUrl } from '../data/evidence/sources.ts';

export type DocumentKind = 'faq' | 'vaccine';

export interface KnowledgeDocument {
  id: string;
  kind: DocumentKind;
  /** Human-readable label in both languages. */
  title: Record<Language, string>;
  /** The answer text, per language. */
  body: Record<Language, string>;
  /** Extra searchable text that is not shown verbatim (disease names, keywords). */
  keywords: Record<Language, string>;
  category: string;
  priority: 'high' | 'medium' | 'low';
  sources: string[];
  /** Related document ids, used for follow-up suggestions. */
  related: string[];
  /** Emergency content must be surfaced verbatim and above everything else. */
  urgent?: boolean;
}

export interface RetrievedPassage {
  document: KnowledgeDocument;
  score: number;
  /** Words from the query that actually matched, for the "why this answer" line. */
  matchedTerms: string[];
}

export interface BotAnswer {
  /** The text to show the user. */
  text: string;
  /** `true` when nothing scored above the confidence floor. */
  fallback: boolean;
  /** 0..1 — retrieval confidence, shown in the UI as an honesty signal. */
  confidence: number;
  passages: RetrievedPassage[];
  sources: string[];
  relatedIds: string[];
  /** Set when the query looks like an emergency. */
  urgent: boolean;
  category?: string;
}

// ---------------------------------------------------------------------------
// Corpus construction
// ---------------------------------------------------------------------------

const URGENT_CATEGORY = 'urgent';

/** Words that indicate the user may need emergency advice, in both languages. */
const URGENCY_TERMS = [
  'emergency',
  'urgent',
  'ambulance',
  'unconscious',
  'seizure',
  'convulsion',
  'breathing',
  'breathless',
  'swelling',
  'anaphylaxis',
  'allergic reaction',
  'high fever',
  '999',
  'জরুরি',
  'জরুরী',
  'অ্যাম্বুলেন্স',
  'অজ্ঞান',
  'খিঁচুনি',
  'শ্বাসকষ্ট',
  'উচ্চ জ্বর',
  'ফুলে গেছে',
  '৯৯৯',
];

function vaccineToDocument(vaccine: Vaccine): KnowledgeDocument {
  // A homepage is not a citation. Legacy entries pointing at `https://www.who.int`
  // or `https://dghs.gov.bd` no longer appear in the answer's source list.
  const sources = [vaccine.source, vaccine.sourceUrl].filter(
    (value): value is string => typeof value === 'string' && isDocumentLevelSourceUrl(value),
  );
  const clinical = getVaccineClinicalProfile(vaccine);
  return {
    id: `vaccine-${vaccine.id}`,
    kind: 'vaccine',
    title: { en: vaccine.name.en, bn: vaccine.name.bn },
    body: {
      en: [
        `${vaccine.fullName.en} protects against ${vaccine.disease.en}.`,
        `Type: ${clinical.platform.en}. Route: ${clinical.route.en} (${clinical.doseVolume.en}).`,
        `Schedule: ${vaccine.schedule.en}. Dosing & catch-up: ${clinical.dosingProtocol.en}`,
        `Doses: ${vaccine.doses}. Age group: ${vaccine.ageGroup}. Efficacy: ${vaccine.efficacy}. ${clinical.immunityProfile.en}`,
        `Cold chain: ${clinical.coldChain.en}`,
        `Special populations: ${clinical.specialPopulations.en}`,
        `Common side effects: ${vaccine.commonEffects.en}`,
        `Serious side effects: ${vaccine.seriousEffects.en}`,
        `Who should not take it: ${vaccine.contraindications.en}`,
        `Aftercare: ${clinical.aftercare.en}`,
        vaccine.description.en,
      ]
        .filter(Boolean)
        .join(' '),
      bn: [
        `${vaccine.fullName.bn} — ${vaccine.disease.bn} থেকে সুরক্ষা দেয়।`,
        `ধরন: ${clinical.platform.bn}। প্রয়োগের পথ: ${clinical.route.bn} (${clinical.doseVolume.bn})।`,
        `সূচি: ${vaccine.schedule.bn}। ডোজ ও ক্যাচ-আপ: ${clinical.dosingProtocol.bn}`,
        `ডোজ: ${vaccine.doses}। সুরক্ষা ও স্থায়িত্ব: ${clinical.immunityProfile.bn}`,
        `কোল্ড-চেইন: ${clinical.coldChain.bn}`,
        `গর্ভাবস্থা ও বিশেষ গোষ্ঠী: ${clinical.specialPopulations.bn}`,
        `সাধারণ পার্শ্বপ্রতিক্রিয়া: ${vaccine.commonEffects.bn}`,
        `গুরুতর পার্শ্বপ্রতিক্রিয়া: ${vaccine.seriousEffects.bn}`,
        `কাদের নেওয়া উচিত নয়: ${vaccine.contraindications.bn}`,
        `পরবর্তী যত্ন: ${clinical.aftercare.bn}`,
        vaccine.description.bn,
      ]
        .filter(Boolean)
        .join(' '),
    },
    keywords: {
      en: [
        vaccine.id,
        vaccine.disease.en,
        vaccine.category,
        programmeFor(vaccine.id),
        vaccine.ageGroup,
        vaccine.introduced,
        clinical.platform.en,
        clinical.route.en,
        clinical.formulations,
      ]
        .filter(Boolean)
        .join(' '),
      bn: [
        vaccine.id,
        vaccine.disease.bn,
        programmeFor(vaccine.id),
        vaccine.ageGroup,
        clinical.platform.bn,
        clinical.route.bn,
      ]
        .filter(Boolean)
        .join(' '),
    },
    category: vaccine.category,
    // Priority follows the evidence-based classification, not the legacy
    // `category` field: hexavalent and MMR are labelled "routine" in the 2.x
    // dataset but are not national-programme antigens (conflict C-004).
    priority: programmeFor(vaccine.id) === 'bd-nip-routine' ? 'high' : 'medium',
    sources,
    related: [],
  };
}

function faqToDocument(entry: FAQEntry): KnowledgeDocument {
  return {
    id: entry.id,
    kind: 'faq',
    title: entry.question,
    body: entry.answer,
    keywords: {
      en: [entry.id, entry.category].join(' '),
      bn: [entry.id, entry.category].join(' '),
    },
    category: entry.category,
    priority: entry.priority,
    sources: entry.sources ?? [],
    related: entry.relatedQuestions ?? [],
    urgent: entry.category === URGENT_CATEGORY,
  };
}

function buildCorpus(): KnowledgeDocument[] {
  // Research-stage and unlicensed products are kept out of the corpus. A card
  // always opens with "<product> protects against <disease>", which is a claim
  // no licensed product can support for `hiv`, `tb-new` or `cancer-cervical`
  // (conflict C-008). They stay in the catalogue behind an explicit notice.
  const vaccinable = allVaccines.filter((vaccine) => isPublishable(vaccine.id));
  return [...faqDatabase.map(faqToDocument), ...vaccinable.map(vaccineToDocument)];
}

let cachedCorpus: KnowledgeDocument[] | null = null;

/** The full knowledge base. Built once per session from the bundled data. */
export function getKnowledgeBase(): KnowledgeDocument[] {
  if (!cachedCorpus) cachedCorpus = buildCorpus();
  return cachedCorpus;
}

// ---------------------------------------------------------------------------
// Tokenisation
// ---------------------------------------------------------------------------

/**
 * Split text into lowercase searchable tokens.
 *
 * Bangla has no inter-word spaces around many particles and uses a matra-heavy
 * script, so a plain `\w+` regex drops most of it. We keep Unicode letters and
 * digits (including Bangla digits) and split on everything else, which is enough
 * for exact-term matching without pulling in a segmenter.
 */
export function tokenise(text: string): string[] {
  return (text ?? '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}\p{M}]+/u)
    .filter((token) => token.length > 0);
}

/** Very light Bangla/English suffix stripping so "টিকাগুলো" matches "টিকা". */
const STRIP_SUFFIXES = ['গুলো', 'গুলি', 'দের', 'কে', 'তে', 'য়', 'ের', 's', 'es', 'ing', 'ed'];

export function stem(token: string): string {
  for (const suffix of STRIP_SUFFIXES) {
    if (token.length - suffix.length >= 3 && token.endsWith(suffix)) {
      return token.slice(0, -suffix.length);
    }
  }
  return token;
}

/** Terms that mean the same thing across languages or registers. */
const SYNONYMS: Record<string, string[]> = {
  fever: ['জ্বর', 'temperature', 'fevers'],
  জ্বর: ['fever', 'temperature'],
  vaccine: ['টিকা', 'vaccines', 'injection', 'টিকাদান', 'immunisation', 'immunization'],
  টিকা: ['vaccine', 'vaccines', 'injection', 'টিকাদান'],
  side: ['effect', 'effects', 'পার্শ্বপ্রতিক্রিয়া', 'reaction'],
  schedule: ['সূচি', 'routine', 'timing', 'epi', 'ইপিআই'],
  সূচি: ['schedule', 'routine', 'when'],
  missed: ['late', 'delayed', 'skip', 'skipped', 'বাদ', 'বকেয়া', 'overdue', 'catch'],
  free: ['cost', 'price', 'charge', 'বিনামূল্যে', 'টাকা', 'pay'],
  safe: ['safety', 'risk', 'নিরাপদ', 'ঝুঁকি'],
  pregnant: ['pregnancy', 'গর্ভবতী', 'গর্ভাবস্থা'],
  child: ['baby', 'children', 'infant', 'শিশু', 'বাচ্চা', 'সন্তান'],
  শিশু: ['child', 'baby', 'infant'],
  centre: ['center', 'clinic', 'hospital', 'কেন্দ্র', 'where'],
  কেন্দ্র: ['centre', 'center', 'clinic'],
  certificate: ['passport', 'card', 'proof', 'সনদ', 'কার্ড'],
  corona: ['covid', 'করোনা'],
  covid: ['corona', 'করোনা'],
  vaccination: ['vaccine', 'vaccines', 'টিকা', 'টিকাদান', 'immunisation', 'immunization'],
  immunisation: ['vaccine', 'vaccination', 'টিকা', 'টিকাদান'],
  immunization: ['vaccine', 'vaccination', 'টিকা', 'টিকাদান'],
  children: ['child', 'baby', 'শিশু', 'বাচ্চা'],
  babies: ['baby', 'child', 'শিশু', 'বাচ্চা'],
  doses: ['dose', 'ডোজ'],
  schedules: ['schedule', 'সূচি'],
  fevers: ['fever', 'জ্বর'],
};

/** Expand a query with synonyms so a Bangla question finds English documents too. */
/**
 * Common function words.
 *
 * They carry no topical signal, so letting them count as matches inflates the
 * wrong document: "What if my child has a high fever after vaccination?" would
 * otherwise score against any question that happens to start "What … my child".
 * Dropping them keeps BM25 focused on content terms. Only query tokens are
 * filtered — synonyms added on purpose (e.g. `when` for `schedule`) survive.
 */
const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'am',
  'do',
  'does',
  'did',
  'have',
  'has',
  'had',
  'will',
  'would',
  'can',
  'could',
  'should',
  'shall',
  'may',
  'might',
  'must',
  'i',
  'you',
  'he',
  'she',
  'it',
  'we',
  'they',
  'me',
  'him',
  'her',
  'us',
  'them',
  'my',
  'your',
  'his',
  'its',
  'our',
  'their',
  'what',
  'which',
  'who',
  'whom',
  'whose',
  'when',
  'where',
  'why',
  'how',
  'if',
  'then',
  'than',
  'that',
  'this',
  'these',
  'those',
  'of',
  'to',
  'in',
  'on',
  'at',
  'by',
  'for',
  'with',
  'about',
  'into',
  'from',
  'as',
  'so',
  'and',
  'or',
  'but',
  'not',
  'no',
  'nor',
  'please',
  'tell',
  'there',
  'here',
  'very',
  'just',
  'also',
  'any',
  'some',
  'all',
  'after',
  'before',
  'during',
  'while',
  'against',
  'between',
  'above',
  'below',
]);

export function expandQuery(tokens: string[]): Set<string> {
  const expanded = new Set<string>();
  for (const token of tokens) {
    if (STOPWORDS.has(token)) continue;
    expanded.add(token);
    expanded.add(stem(token));
    for (const synonym of SYNONYMS[token] ?? []) {
      expanded.add(synonym);
      expanded.add(stem(synonym));
    }
  }
  return expanded;
}

// ---------------------------------------------------------------------------
// Index + BM25
// ---------------------------------------------------------------------------

interface IndexedDocument {
  document: KnowledgeDocument;
  /** Token frequency per language, so a query in either language can match. */
  terms: Record<Language, Map<string, number>>;
  length: Record<Language, number>;
}

/** BM25 tuning. Standard defaults work well for a corpus this small. */
const BM25_K1 = 1.4;
const BM25_B = 0.75;

/** Titles are the strongest signal — matching one is usually the right answer. */
const TITLE_WEIGHT = 4;
const KEYWORD_WEIGHT = 2;
const PRIORITY_WEIGHT: Record<KnowledgeDocument['priority'], number> = {
  high: 1.25,
  medium: 1,
  low: 0.85,
};

/** Test helper: drop the memoised corpus (e.g. after mocking the data modules). */
export function resetKnowledgeBaseCache(): void {
  cachedCorpus = null;
  cachedIndex = null;
}

function buildTerms(document: KnowledgeDocument, language: Language): Map<string, number> {
  const terms = new Map<string, number>();
  const add = (text: string, weight: number) => {
    for (const raw of tokenise(text)) {
      for (const token of [raw, stem(raw)]) {
        terms.set(token, (terms.get(token) ?? 0) + weight);
      }
    }
  };
  add(document.title[language], TITLE_WEIGHT);
  add(document.body[language], 1);
  add(document.keywords[language], KEYWORD_WEIGHT);
  return terms;
}

let cachedIndex: IndexedDocument[] | null = null;

function getIndex(): IndexedDocument[] {
  if (cachedIndex) return cachedIndex;
  cachedIndex = getKnowledgeBase().map((document) => ({
    document,
    terms: {
      en: buildTerms(document, 'en'),
      bn: buildTerms(document, 'bn'),
    },
    length: {
      en: tokenise(`${document.title.en} ${document.body.en} ${document.keywords.en}`).length,
      bn: tokenise(`${document.title.bn} ${document.body.bn} ${document.keywords.bn}`).length,
    },
  }));
  return cachedIndex;
}

function documentFrequency(term: string): number {
  // A Bangla token can legitimately appear in an English document's keyword
  // list (and vice versa), so both language indexes count towards the DF.
  let count = 0;
  for (const entry of getIndex()) {
    if (entry.terms.en.has(term) || entry.terms.bn.has(term)) count += 1;
  }
  return Math.max(count, 1);
}

// ---------------------------------------------------------------------------
// Retrieval
// ---------------------------------------------------------------------------

export interface RetrieveOptions {
  language: Language;
  /** Maximum passages to return. */
  limit?: number;
}

/**
 * Rank the corpus against a query.
 *
 * Returns passages in descending relevance. Scores are not normalised — callers
 * should compare against `CONFIDENCE_FLOOR` on the *ratio* between the top score
 * and the query's own term weight, which is what `answer()` does.
 */
export function retrieve(query: string, options: RetrieveOptions): RetrievedPassage[] {
  const limit = options.limit ?? 4;
  const { language } = options;
  const other: Language = language === 'en' ? 'bn' : 'en';

  const queryTokens = tokenise(query);
  if (queryTokens.length === 0) return [];

  const terms = expandQuery(queryTokens);
  const index = getIndex();
  const totalDocuments = index.length;

  // Average document length across both languages, for BM25 normalisation.
  const averageLength =
    index.reduce((sum, entry) => sum + entry.length[language] + entry.length[other], 0) /
    Math.max(totalDocuments * 2, 1);

  const idf = new Map<string, number>();
  for (const term of terms) {
    const df = documentFrequency(term);
    idf.set(term, Math.log(1 + (totalDocuments - df + 0.5) / (df + 0.5)));
  }

  const passages: RetrievedPassage[] = [];

  for (const entry of index) {
    let score = 0;
    const matchedTerms: string[] = [];

    for (const term of terms) {
      const weight = idf.get(term) ?? 0;
      if (weight <= 0) continue;

      const frequency =
        (entry.terms[language].get(term) ?? 0) + (entry.terms[other].get(term) ?? 0) * 0.75;
      if (frequency === 0) continue;

      const length = (entry.length[language] + entry.length[other]) / 2 || 1;
      const denominator = frequency + BM25_K1 * (1 - BM25_B + (BM25_B * length) / averageLength);
      score += weight * ((frequency * (BM25_K1 + 1)) / denominator);
      matchedTerms.push(term);
    }

    if (score <= 0) continue;

    score *= PRIORITY_WEIGHT[entry.document.priority];
    // An exact title hit is a much stronger signal than scattered body matches.
    const titleTokens = new Set([
      ...tokenise(entry.document.title[language]),
      ...tokenise(entry.document.title[other]),
    ]);
    const titleHits = [...terms].filter((term) => titleTokens.has(term)).length;
    if (titleHits > 0) score *= 1 + Math.min(titleHits, 4) * 0.18;

    passages.push({ document: entry.document, score, matchedTerms: [...new Set(matchedTerms)] });
  }

  return passages.sort((a, b) => b.score - a.score).slice(0, limit);
}

// ---------------------------------------------------------------------------
// Answer synthesis
// ---------------------------------------------------------------------------

/** Below this ratio of top-score to query size, we say "I don't know". */
const CONFIDENCE_FLOOR = 0.45;
/** Above this, the answer is shown without hedging. */
const CONFIDENCE_STRONG = 1.6;

export function isUrgentQuery(query: string): boolean {
  const text = (query ?? '').toLowerCase();
  return URGENCY_TERMS.some((term) => text.includes(term));
}

function localise(document: KnowledgeDocument, language: Language): string {
  const text = document.body[language]?.trim();
  if (text) return text;
  return document.body[language === 'en' ? 'bn' : 'en']?.trim() ?? '';
}

function localiseTitle(document: KnowledgeDocument, language: Language): string {
  return document.title[language]?.trim() || document.title.en || document.id;
}

/**
 * Answer a question.
 *
 * The reply is assembled from retrieved passages only — never from generated
 * prose — so every sentence in it was written and sourced by a human. When
 * nothing clears the confidence floor the bot says so and points at the
 * hotline, which is the only safe behaviour for a health assistant.
 */
export function answer(
  query: string,
  language: Language,
  options: { limit?: number } = {},
): BotAnswer {
  const passages = retrieve(query, { language, limit: options.limit ?? 3 });
  const urgent = isUrgentQuery(query);

  // Emergency guidance always goes first and is always shown, even on a weak
  // match: the cost of a false positive here is one extra paragraph.
  const ordered = urgent
    ? [...passages].sort(
        (a, b) => Number(b.document.urgent ?? false) - Number(a.document.urgent ?? false),
      )
    : passages;

  if (ordered.length === 0) {
    return {
      text: '',
      fallback: true,
      confidence: 0,
      passages: [],
      sources: [],
      relatedIds: [],
      urgent,
    };
  }

  const top = ordered[0];
  const confidence = Number(
    Math.min(3, top.score / Math.max(Math.sqrt(tokenise(query).length), 1)).toFixed(3),
  );
  const weak = confidence < CONFIDENCE_FLOOR;

  const used = weak ? ordered.slice(0, 1) : ordered.slice(0, 2);
  const parts = used.map((passage) => localise(passage.document, language));

  const sources = [
    ...new Set(used.flatMap((passage) => passage.document.sources).filter(Boolean)),
  ].slice(0, 4);

  const relatedIds = [...new Set(used.flatMap((passage) => passage.document.related))]
    .filter((id) => id !== used[0].document.id)
    .slice(0, 3);

  return {
    text: parts.filter(Boolean).join('\n\n'),
    fallback: weak,
    confidence,
    passages: used,
    sources,
    relatedIds,
    urgent,
    category: top.document.category,
  };
}

/** Titles of the retrieved passages, for the "did you mean" list. */
export function answerTitles(result: BotAnswer, language: Language): string[] {
  return result.passages.map((passage) => localiseTitle(passage.document, language));
}

/** Look up a single document by id (used for related-question chips). */
export function getDocument(id: string): KnowledgeDocument | undefined {
  return getKnowledgeBase().find((document) => document.id === id);
}

/** Suggested opening questions, localised. */
export function suggestedQuestions(language: Language, count = 4): string[] {
  return getKnowledgeBase()
    .filter((document) => document.kind === 'faq' && document.priority === 'high')
    .slice(0, count)
    .map((document) => localiseTitle(document, language));
}

/** Confidence bands, so the UI can label a number honestly. */
export function confidenceBand(confidence: number): 'low' | 'medium' | 'high' {
  if (confidence < CONFIDENCE_FLOOR) return 'low';
  if (confidence < CONFIDENCE_STRONG) return 'medium';
  return 'high';
}
