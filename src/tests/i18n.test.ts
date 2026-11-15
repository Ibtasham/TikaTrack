import { describe, expect, it } from 'vitest';

import { translations } from '../i18n';

/**
 * Every dictionary module on disk, loaded eagerly.
 *
 * Comparing the *files* against the *runtime table* catches the easy-to-miss
 * bug where a namespace file exists but was never imported into `i18n/index`,
 * so its keys silently render as raw strings at runtime.
 */
const enModules = import.meta.glob<{ en: Record<string, string> }>('../i18n/dictionaries/*.en.ts', {
  eager: true,
});
const bnModules = import.meta.glob<{ bn: Record<string, string> }>('../i18n/dictionaries/*.bn.ts', {
  eager: true,
});

/** Positional placeholders like `{0}`, `{1}` that a translation interpolates. */
function placeholders(value: string): string[] {
  return (value.match(/\{\d+\}/g) ?? []).sort();
}

describe('i18n dictionaries', () => {
  const en = translations.en;
  const bn = translations.bn;
  const enKeys = Object.keys(en).sort();
  const bnKeys = Object.keys(bn).sort();

  it('aggregate every dictionary file into the runtime table', () => {
    const enSet = new Set(enKeys);
    const bnSet = new Set(bnKeys);

    const orphanedEn: string[] = [];
    for (const mod of Object.values(enModules)) {
      for (const key of Object.keys(mod.en)) {
        if (!enSet.has(key)) orphanedEn.push(key);
      }
    }
    const orphanedBn: string[] = [];
    for (const mod of Object.values(bnModules)) {
      for (const key of Object.keys(mod.bn)) {
        if (!bnSet.has(key)) orphanedBn.push(key);
      }
    }

    expect(orphanedEn).toEqual([]);
    expect(orphanedBn).toEqual([]);
  });

  it('have identical key sets in English and Bangla', () => {
    const missingInBangla = enKeys.filter((key) => !(key in bn));
    const missingInEnglish = bnKeys.filter((key) => !(key in en));
    expect(missingInBangla).toEqual([]);
    expect(missingInEnglish).toEqual([]);
  });

  it('have no empty translations', () => {
    const empty = enKeys.filter((key) => !en[key]?.trim() || !bn[key]?.trim());
    expect(empty).toEqual([]);
  });

  it('use the same positional placeholders in both languages', () => {
    const mismatched = enKeys.filter(
      (key) => key in bn && placeholders(en[key]).join() !== placeholders(bn[key]).join(),
    );
    expect(mismatched).toEqual([]);
  });

  it('ship a substantial, non-trivial catalogue', () => {
    expect(enKeys.length).toBeGreaterThan(300);
    expect(enKeys.length).toBe(bnKeys.length);
  });
});
