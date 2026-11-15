import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  BookOpen,
  Check,
  Copy,
  Eraser,
  Loader2,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';

import { useProfiles } from '../contexts/ProfilesContext';
import { useToast } from '../contexts/ToastContext';
import { usePersistentState } from '../hooks';
import { useI18n } from '../i18n';
import { buildBotContext, renderBotContext, shouldPersonalise } from '../lib/botContext';
import { copyToClipboard } from '../lib/exporters';
import { createMessageId } from '../lib/id';
import {
  answer,
  confidenceBand,
  getDocument,
  getKnowledgeBase,
  suggestedQuestions,
} from '../lib/ragEngine';
import { faqDatabase } from '../data/tikabot';
import type { ChatMessage } from '../types';
import type { Language } from '../i18n/types';

const HISTORY_KEY = 'tikatrack.tikabot-history';
const CONTEXT_KEY = 'tikatrack.tikabot-context-profile';
const MAX_HISTORY = 40;

/** Shape persisted in localStorage; validated on read so junk cannot crash us. */
function isStoredMessages(value: unknown): value is ChatMessage[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (entry) =>
      entry &&
      typeof entry === 'object' &&
      typeof (entry as ChatMessage).id === 'string' &&
      typeof (entry as ChatMessage).text === 'string' &&
      ((entry as ChatMessage).role === 'user' || (entry as ChatMessage).role === 'bot'),
  );
}

interface PersistedBotMessage extends ChatMessage {
  sources?: string[];
  relatedQuestions?: string[];
}

/**
 * `/tikabot` — the assistant.
 *
 * Answers come from `ragEngine`, which ranks the bundled FAQ data and the
 * vaccine catalogue and returns *quotations*, never generated prose. Two rules
 * follow from that and should not be relaxed:
 *
 *   - every answer shows its source, and a low-confidence match says so;
 *   - an urgent query always surfaces the emergency guidance and the hotline,
 *     even when the retrieval score is weak.
 *
 * The "typing" delay is a short timeout so the transcript does not feel like it
 * glitched; it is tracked and cleared on unmount, which the original app's
 * bare `setTimeout` was not.
 */
export default function TikabotPage() {
  const { t, language } = useI18n();
  const toast = useToast();
  const isBangla = language === 'bn';

  const [messages, setMessages] = usePersistentState<ChatMessage[]>(
    HISTORY_KEY,
    [],
    isStoredMessages,
  );
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { profiles } = useProfiles();
  const [contextProfileId, setContextProfileId] = usePersistentState<string | null>(
    CONTEXT_KEY,
    null,
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimer = useRef<number | null>(null);

  const suggestions = useMemo(() => suggestedQuestions(language, 4), [language]);

  /**
   * The member this conversation is about, if the user picked one.
   *
   * Recomputed whenever the record or the language changes, so the block never
   * quotes a stale age after someone records a dose mid-conversation.
   */
  const personalContext = useMemo(() => {
    const member = profiles.find((profile) => profile.id === contextProfileId);
    return member ? buildBotContext(member, language) : null;
  }, [profiles, contextProfileId, language]);
  // Corpus size is stable for the session; compute it once for the honesty panel.
  const corpusSize = useMemo(() => getKnowledgeBase().length, []);

  // Related-question chips resolve ids from the FAQ database into text.
  const relatedLookup = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of faqDatabase) map.set(entry.id, entry.question[language]);
    return map;
  }, [language]);

  useEffect(() => {
    return () => {
      if (typingTimer.current !== null) window.clearTimeout(typingTimer.current);
    };
  }, []);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, thinking]);

  const ask = useCallback(
    (question: string) => {
      const text = question.trim();
      if (!text || thinking) return;

      const userMessage: ChatMessage = {
        id: createMessageId(),
        role: 'user',
        text,
        createdAt: Date.now(),
      };
      setMessages((previous) => [...previous, userMessage].slice(-MAX_HISTORY));
      setDraft('');
      setThinking(true);

      const result = answer(text, language as Language);

      // Only for questions about timing, or when the corpus had nothing: a
      // sourced answer about side effects should not be diluted with schedule
      // arithmetic the user did not ask for.
      const personalised =
        personalContext && (shouldPersonalise(text) || result.fallback)
          ? renderBotContext(personalContext, language)
          : undefined;

      // Retrieval is synchronous; the delay is purely conversational pacing.
      typingTimer.current = window.setTimeout(() => {
        const related = result.relatedIds
          .map((id) => getDocument(id)?.title[language as Language] ?? relatedLookup.get(id))
          .filter((value): value is string => Boolean(value))
          .slice(0, 3);

        const botMessage: PersistedBotMessage = {
          id: createMessageId(),
          role: 'bot',
          text: result.fallback ? t('tikabot.fallback') : result.text,
          category: result.category,
          confidence: result.confidence,
          sources: result.sources,
          relatedQuestions: related,
          personalised,
          createdAt: Date.now(),
        };

        setMessages((previous) => [...previous, botMessage].slice(-MAX_HISTORY));
        setThinking(false);
        typingTimer.current = null;
        inputRef.current?.focus();
      }, 320);
    },
    [language, personalContext, relatedLookup, setMessages, t, thinking],
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    ask(draft);
  };

  const handleClear = () => {
    setMessages([]);
    setDraft('');
  };

  const handleCopyAnswer = async (id: string, text: string, personalised?: string) => {
    const payload = personalised ? `${text}\n\n${personalised}` : text;
    const ok = await copyToClipboard(payload);
    if (ok) {
      setCopiedId(id);
      toast.success(t('tikabot.copied'));
      window.setTimeout(() => {
        setCopiedId((current) => (current === id ? null : current));
      }, 1800);
    } else {
      toast.error(t('common.status.error'));
    }
  };

  const band = (confidence?: number) =>
    confidence === undefined ? 'low' : confidenceBand(confidence);

  const bandClass = (confidence?: number) => {
    switch (band(confidence)) {
      case 'high':
        return 'badge-done';
      case 'medium':
        return 'badge-upcoming';
      default:
        return 'badge-due';
    }
  };

  return (
    <div className="page-shell max-w-4xl">
      <header className="no-print">
        <p className="flex items-center gap-2 text-sm font-semibold tracking-wide text-emerald-700 uppercase dark:text-emerald-400">
          <Bot className="h-4 w-4" aria-hidden="true" />
          {t('nav.tikabot')}
        </p>
        <h1 className={`section-title mt-2 ${isBangla ? 'font-bangla' : ''}`}>
          {t('tikabot.title')}
        </h1>
        <p className={`section-subtitle ${isBangla ? 'font-bangla' : ''}`}>
          {t('tikabot.subtitle')}
        </p>
      </header>

      <div className="card mt-6 flex h-[70vh] min-h-[32rem] flex-col overflow-hidden">
        {/* --- Transcript -------------------------------------------------- */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          <div className="flex gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              aria-hidden="true"
            >
              <Bot className="h-5 w-5" />
            </span>
            <div className="card max-w-[85%] rounded-tl-none bg-neutral-50 p-3 text-sm dark:bg-neutral-800">
              <p className={isBangla ? 'font-bangla' : undefined}>{t('tikabot.greeting')}</p>
            </div>
          </div>

          {messages.length === 0 && (
            <div className="space-y-4 pl-12">
              <div>
                <p
                  className={`text-xs font-semibold text-neutral-500 uppercase dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
                >
                  {t('tikabot.topics.label')}
                </p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {(['epi', 'effects', 'missed', 'tt', 'travel'] as const).map((topic) => (
                    <li key={topic}>
                      <button
                        type="button"
                        className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-200 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300"
                        onClick={() => ask(t(`tikabot.topics.${topic}Query`))}
                      >
                        <span className={isBangla ? 'font-bangla' : undefined}>
                          {t(`tikabot.topics.${topic}`)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p
                  className={`text-xs font-semibold text-neutral-500 uppercase dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
                >
                  {t('tikabot.suggestions')}
                </p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {suggestions.map((question) => (
                    <li key={question}>
                      <button
                        type="button"
                        className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-50 dark:border-emerald-900 dark:bg-neutral-900 dark:text-emerald-300 dark:hover:bg-neutral-800"
                        onClick={() => ask(question)}
                      >
                        <span className={isBangla ? 'font-bangla' : undefined}>{question}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {messages.map((message) => {
            const isUser = message.role === 'user';
            const bot = message as PersistedBotMessage;
            return (
              <div key={message.id} className={`flex gap-3 ${isUser ? 'justify-end' : ''}`}>
                {!isUser && (
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    aria-hidden="true"
                  >
                    <Bot className="h-5 w-5" />
                  </span>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-sm ${
                    isUser
                      ? 'rounded-tr-none bg-emerald-600 text-white'
                      : 'card rounded-tl-none bg-neutral-50 dark:bg-neutral-800'
                  }`}
                >
                  <p
                    className={`whitespace-pre-line ${isBangla ? 'font-bangla' : ''}`}
                    lang={language}
                  >
                    {message.text}
                  </p>

                  {bot.personalised && (
                    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-900 dark:bg-emerald-950/40">
                      <p
                        className={`flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 ${isBangla ? 'font-bangla' : ''}`}
                      >
                        <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('tikabot.context.title')}
                      </p>
                      <p
                        className="mt-1.5 whitespace-pre-line text-xs text-emerald-950 dark:text-emerald-100"
                        lang={language}
                      >
                        {bot.personalised}
                      </p>
                      <p
                        className={`mt-2 text-[11px] text-emerald-900/70 dark:text-emerald-200/70 ${isBangla ? 'font-bangla' : ''}`}
                      >
                        {t('tikabot.context.source')}
                      </p>
                    </div>
                  )}

                  {!isUser && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-neutral-200 pt-2 dark:border-neutral-700">
                      {bot.confidence !== undefined && (
                        <span
                          className={bandClass(bot.confidence)}
                          title={`${t('tikabot.confidence')}: ${Math.round(bot.confidence * 100)}%`}
                        >
                          <Sparkles className="h-3 w-3" aria-hidden="true" />
                          {t('tikabot.confidence')} {Math.round(bot.confidence * 100)}%
                        </span>
                      )}
                      {bot.sources?.map((source) => (
                        <span key={source} className="badge-neutral">
                          <BookOpen className="h-3 w-3" aria-hidden="true" />
                          {source}
                        </span>
                      ))}
                      <button
                        type="button"
                        onClick={() => void handleCopyAnswer(message.id, message.text, bot.personalised)}
                        className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-200/70 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
                        aria-label={t('tikabot.copyAnswer')}
                      >
                        {copiedId === message.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        <span className={isBangla ? 'font-bangla' : undefined}>
                          {copiedId === message.id ? t('tikabot.copied') : t('tikabot.copyAnswer')}
                        </span>
                      </button>
                    </div>
                  )}

                  {!isUser && bot.relatedQuestions && bot.relatedQuestions.length > 0 && (
                    <div className="mt-3">
                      <p
                        className={`text-xs text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
                      >
                        {t('tikabot.relatedQuestions')}
                      </p>
                      <ul className="mt-1.5 flex flex-wrap gap-1.5">
                        {bot.relatedQuestions.map((question) => (
                          <li key={question}>
                            <button
                              type="button"
                              className="rounded-full border border-neutral-200 px-2.5 py-1 text-xs text-neutral-700 transition-colors hover:border-emerald-300 hover:text-emerald-700 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-emerald-700 dark:hover:text-emerald-300"
                              onClick={() => ask(question)}
                            >
                              <span className={isBangla ? 'font-bangla' : undefined}>
                                {question}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!isUser && bot.confidence !== undefined && band(bot.confidence) === 'low' && (
                    <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className={isBangla ? 'font-bangla' : undefined}>
                        {t('tracker.medicalAdvice')}
                      </span>
                    </p>
                  )}
                </div>

                {isUser && (
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-200"
                    aria-hidden="true"
                  >
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                )}
              </div>
            );
          })}

          {thinking && (
            <div className="flex gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                aria-hidden="true"
              >
                <Bot className="h-5 w-5" />
              </span>
              <div className="card rounded-tl-none bg-neutral-50 p-3 text-sm text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden="true" />
                <span className={isBangla ? 'font-bangla' : undefined}>
                  {t('tikabot.thinking')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* --- Who is this about? ------------------------------------------ */}
        {profiles.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-neutral-200 bg-white px-3 py-2 sm:px-4 dark:border-neutral-800 dark:bg-neutral-900">
            <label
              htmlFor="tikabot-context"
              className={`flex items-center gap-1.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
            >
              <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
              {t('tikabot.context.about')}
            </label>
            <select
              id="tikabot-context"
              className="input-field w-auto min-h-[36px] py-1 text-xs"
              value={contextProfileId ?? ''}
              onChange={(event) => setContextProfileId(event.target.value || null)}
            >
              <option value="">{t('tikabot.context.everyone')}</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
            <span
              className={`text-[11px] text-neutral-400 dark:text-neutral-500 ${isBangla ? 'font-bangla' : ''}`}
            >
              {t('tikabot.context.hint')}
            </span>
          </div>
        )}

        {/* --- Composer ---------------------------------------------------- */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-neutral-200 bg-white p-3 sm:p-4 dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div className="flex items-end gap-2">
            <label className="sr-only" htmlFor="tikabot-input">
              {t('tikabot.inputPlaceholder')}
            </label>
            <textarea
              id="tikabot-input"
              ref={inputRef}
              rows={1}
              className="input-field max-h-32 min-h-[44px] flex-1 resize-y"
              placeholder={t('tikabot.inputPlaceholder')}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                // Enter sends, Shift+Enter inserts a newline.
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  ask(draft);
                }
              }}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={thinking || draft.trim().length === 0}
              aria-label={t('tikabot.send')}
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t('tikabot.send')}</span>
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={handleClear}
              disabled={messages.length === 0}
              aria-label={t('tikabot.clear')}
              title={t('tikabot.clear')}
            >
              <Eraser className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            <span className={isBangla ? 'font-bangla' : undefined}>{t('tikabot.disclaimer')}</span>{' '}
            <a className="link" href="tel:16263">
              16263
            </a>
          </p>
        </form>
      </div>

      {/* --- How it works / honesty panel ---------------------------------- */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 no-print">
        <div className="card-padded">
          <h2
            className={`flex items-center gap-2 font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
          >
            <ShieldCheck
              className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
              aria-hidden="true"
            />
            {t('tikabot.offline')}
          </h2>
          <p
            className={`mt-2 text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
          >
            {t('about.tech.body')}
          </p>
          <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
            {t('common.label.results', corpusSize)}
          </p>
        </div>

        <div className="card-padded border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30">
          <h2
            className={`flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200 ${isBangla ? 'font-bangla' : ''}`}
          >
            <Phone className="h-5 w-5" aria-hidden="true" />
            {t('about.hotline')}
          </h2>
          <p
            className={`mt-2 text-sm text-amber-900/90 dark:text-amber-100/90 ${isBangla ? 'font-bangla' : ''}`}
          >
            {t('tracker.medicalAdvice')}
          </p>
          <a href="tel:16263" className="btn mt-4 bg-amber-600 text-white hover:bg-amber-700">
            <Phone className="h-4 w-4" aria-hidden="true" />
            16263
          </a>
        </div>
      </div>
    </div>
  );
}
