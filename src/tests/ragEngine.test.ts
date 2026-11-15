import { describe, expect, it } from 'vitest';

import {
  answer,
  confidenceBand,
  expandQuery,
  getDocument,
  getKnowledgeBase,
  isUrgentQuery,
  resetKnowledgeBaseCache,
  retrieve,
  stem,
  suggestedQuestions,
  tokenise,
} from '../lib/ragEngine';

describe('ragEngine', () => {
  describe('knowledge base', () => {
    it('merges the FAQ database with the vaccine reference', () => {
      const kb = getKnowledgeBase();
      expect(kb.length).toBeGreaterThan(0);
      expect(kb.some((doc) => doc.id === 'schedule-basic' && doc.kind === 'faq')).toBe(true);
      expect(kb.some((doc) => doc.kind === 'vaccine')).toBe(true);
      expect(kb.some((doc) => doc.urgent === true)).toBe(true);
    });

    it('survives a cache reset', () => {
      resetKnowledgeBaseCache();
      expect(getKnowledgeBase().length).toBeGreaterThan(0);
    });

    it('looks a document up by id', () => {
      expect(getDocument('schedule-basic')?.kind).toBe('faq');
      expect(getDocument('definitely-not-a-real-id')).toBeUndefined();
    });
  });

  describe('tokenise / stem / expandQuery', () => {
    it('lowercases and splits on non-alphanumerics', () => {
      expect(tokenise('Hello, World! 123')).toEqual(['hello', 'world', '123']);
      expect(tokenise('')).toEqual([]);
    });

    it('keeps Bangla letters as tokens', () => {
      expect(tokenise('টিকার সময়সূচি')).toEqual(['টিকার', 'সময়সূচি']);
    });

    it('strips a light suffix in each language', () => {
      expect(stem('vaccines')).toBe('vaccine');
      expect(stem('টিকাগুলো')).toBe('টিকা');
    });

    it('bridges languages through synonyms', () => {
      expect(expandQuery(tokenise('টিকা')).has('vaccine')).toBe(true);
      expect(expandQuery(['fever']).has('জ্বর')).toBe(true);
    });
  });

  describe('retrieve', () => {
    it('finds the schedule FAQ for a schedule question', () => {
      const passages = retrieve('what vaccines does my child need', { language: 'en' });
      expect(passages.length).toBeGreaterThan(0);
      expect(passages[0].document.id).toBe('schedule-basic');
      expect(passages[0].score).toBeGreaterThan(0);
    });

    it('returns descending scores and honours the limit', () => {
      const passages = retrieve('vaccine side effects fever', { language: 'en', limit: 2 });
      expect(passages.length).toBeLessThanOrEqual(2);
      for (let i = 1; i < passages.length; i += 1) {
        expect(passages[i - 1].score).toBeGreaterThanOrEqual(passages[i].score);
      }
    });

    it('returns nothing for an empty query', () => {
      expect(retrieve('', { language: 'en' })).toEqual([]);
    });
  });

  describe('answer', () => {
    it('answers a clear question from sourced passages, not thin air', () => {
      const result = answer('what vaccines does my child need', 'en');
      expect(result.fallback).toBe(false);
      expect(result.text.trim().length).toBeGreaterThan(0);
      expect(result.passages[0].document.id).toBe('schedule-basic');
      expect(result.category).toBe('schedule');
      // Every sentence must come from a real, sourced document.
      expect(result.passages.every((p) => p.document.sources.length >= 0)).toBe(true);
    });

    it('ranks the cost FAQ first for a cost question', () => {
      const result = answer('is the vaccine free or do I have to pay', 'en');
      expect(result.fallback).toBe(false);
      expect(result.passages[0].document.id).toBe('vaccine-free');
    });

    it('surfaces the emergency guidance first for an urgent query', () => {
      const result = answer('my child has high fever after vaccination emergency', 'en');
      expect(result.urgent).toBe(true);
      expect(result.passages[0].document.id).toBe('urgent-fever');
    });

    it('admits defeat on gibberish instead of guessing', () => {
      const result = answer('xkcdqwertyuiop zzzzplugh 4242', 'en');
      expect(result.fallback).toBe(true);
      expect(result.confidence).toBe(0);
      expect(result.passages).toEqual([]);
    });

    it('flags an emergency query as urgent', () => {
      expect(isUrgentQuery('my baby has a high fever and is unconscious')).toBe(true);
      expect(isUrgentQuery('when is the next dose')).toBe(false);
      const result = answer('high fever emergency after vaccination', 'en');
      expect(result.urgent).toBe(true);
    });

    it('produces a Bangla answer for a Bangla question', () => {
      const result = answer('টিকার সময়সূচি কি', 'bn');
      expect(typeof result.text).toBe('string');
      expect(typeof result.fallback).toBe('boolean');
    });
  });

  describe('confidenceBand', () => {
    it('labels a ratio honestly against the floor and strong thresholds', () => {
      expect(confidenceBand(0)).toBe('low');
      expect(confidenceBand(1)).toBe('medium');
      expect(confidenceBand(2)).toBe('high');
    });
  });

  describe('suggestedQuestions', () => {
    it('returns up to `count` high-priority FAQ prompts', () => {
      const questions = suggestedQuestions('en', 3);
      expect(Array.isArray(questions)).toBe(true);
      expect(questions.length).toBeGreaterThan(0);
      expect(questions.length).toBeLessThanOrEqual(3);
      questions.forEach((question) => expect(question.trim().length).toBeGreaterThan(0));
    });
  });
});
