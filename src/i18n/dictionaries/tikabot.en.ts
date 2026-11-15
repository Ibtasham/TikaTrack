/* ---------------------------------------------------------------------------
 * English strings.
 *
 * Kept in sync with the other language file: `npm run test` fails when a key
 * exists in one language but not the other.
 * ------------------------------------------------------------------------- */
import type { TranslationDictionary } from '../types';

export const en: TranslationDictionary = {
  'tikabot.title': 'TikaBot Assistant',
  'tikabot.subtitle': 'Ask questions about vaccines and vaccination',
  'tikabot.placeholder': 'Type your question...',
  'tikabot.disclaimer':
    'TikaBot provides general information only. For medical advice, consult your healthcare provider.',
  'tikabot.greeting':
    'আসসালামু আলাইকুম! I am TikaBot. Ask me about vaccine schedules, side effects, catch-up doses or where to get vaccinated.',
  'tikabot.suggestions': 'Try asking',
  'tikabot.thinking': 'TikaBot is looking that up…',
  'tikabot.fallback':
    'I could not find that in the Bangladesh immunisation guidance I have. Try rephrasing, or ask about a specific vaccine, dose spacing or side effects.',
  'tikabot.confidence': 'Confidence',
  'tikabot.relatedQuestions': 'You might also ask',
  'tikabot.send': 'Send',
  'tikabot.inputPlaceholder': 'Type your question in English or বাংলা…',
  'tikabot.clear': 'Start a new chat',
  'tikabot.history': 'Earlier in this chat',
  'tikabot.offline':
    'TikaBot runs entirely in your browser from a bundled knowledge base. No question is sent to a server.',
  'tikabot.context.about': 'Answering for',
  'tikabot.context.everyone': 'General questions',
  'tikabot.context.hint': 'Pick a family member and TikaBot adds what your own saved record says.',
  'tikabot.context.title': 'From your record on this device',
  'tikabot.context.source': 'Calculated from your saved data — not from the sources listed below.',
  'tikabot.copyAnswer': 'Copy answer',
  'tikabot.copied': 'Copied',
  'tikabot.topics.label': 'Browse by topic',
  'tikabot.topics.epi': 'EPI Schedule',
  'tikabot.topics.epiQuery': 'What is the Bangladesh EPI vaccination schedule for babies?',
  'tikabot.topics.effects': 'Side effects & fever',
  'tikabot.topics.effectsQuery':
    'What side effects are normal after vaccination and when to worry?',
  'tikabot.topics.missed': 'Missed doses',
  'tikabot.topics.missedQuery': 'What should I do if a vaccine dose was missed or delayed?',
  'tikabot.topics.tt': 'Pregnancy & TT',
  'tikabot.topics.ttQuery': 'When is the TT vaccine given to women and during pregnancy?',
  'tikabot.topics.travel': 'Travel & adult',
  'tikabot.topics.travelQuery': 'Which vaccines are needed for Hajj, Umrah or international travel?',
};
