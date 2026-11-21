import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import App from '../App';
import { allVaccines } from '../data/vaccines';
import {
  getVaccineClinicalProfile,
  vaccineClinicalProfiles,
} from '../data/vaccineClinicalDetails';
import { translations } from '../i18n';
import { LANGUAGE_STORAGE_KEY } from '../i18n/storage';
import { answer, resetKnowledgeBaseCache } from '../lib/ragEngine';

const en = translations.en;
const bn = translations.bn;

const LOCALIZED_CLINICAL_FIELDS = [
  'platform',
  'route',
  'doseVolume',
  'coldChain',
  'dosingProtocol',
  'immunityProfile',
  'specialPopulations',
  'aftercare',
] as const;

function renderAt(path: string) {
  window.history.pushState({}, '', path);
  return render(<App />);
}

describe('vaccine clinical pharmacology monographs', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('covers all 90 vaccines with complete English and Bangla clinical profiles', () => {
    expect(allVaccines.length).toBe(90);

    for (const vaccine of allVaccines) {
      const explicit = vaccineClinicalProfiles[vaccine.id];
      expect(explicit, `missing explicit clinical profile for ${vaccine.id}`).toBeDefined();

      const profile = getVaccineClinicalProfile(vaccine);
      expect(profile.formulations.trim().length).toBeGreaterThan(2);

      for (const field of LOCALIZED_CLINICAL_FIELDS) {
        const value = profile[field];
        expect(value.en.trim().length, `${vaccine.id}.${field}.en empty`).toBeGreaterThan(3);
        expect(value.bn.trim().length, `${vaccine.id}.${field}.bn empty`).toBeGreaterThan(3);
        expect(
          /[\u0980-\u09FF]/.test(value.bn),
          `${vaccine.id}.${field}.bn lacks Bangla script`,
        ).toBe(true);
      }
    }
  });

  it('renders full clinical pharmacology sections on VaccineDetailPage (BCG & TCV)', async () => {
    renderAt('/vaccines/bcg');
    await waitFor(() => expect(document.getElementById('main-content')).not.toBeNull());

    expect(screen.getByText(en['vaccines.detail.clinicalSpecs'])).toBeTruthy();
    expect(screen.getByText(en['vaccines.detail.platform'])).toBeTruthy();
    expect(screen.getByText(en['vaccines.detail.route'])).toBeTruthy();
    expect(screen.getByText(en['vaccines.detail.doseVolume'])).toBeTruthy();
    expect(screen.getByText(en['vaccines.detail.coldChain'])).toBeTruthy();
    expect(screen.getByText(en['vaccines.detail.dosingProtocol'])).toBeTruthy();
    expect(screen.getByText(en['vaccines.detail.immunityProfile'])).toBeTruthy();
    expect(screen.getByText(en['vaccines.detail.specialPopulations'])).toBeTruthy();
    expect(screen.getByText(en['vaccines.detail.aftercare'])).toBeTruthy();
    expect(screen.getByText(/Intradermal \(ID\) strictly/)).toBeTruthy();
    expect(screen.getByText(/VVM-30/)).toBeTruthy();

    renderAt('/vaccines/tcv');
    await waitFor(() => expect(screen.getAllByText(/Typbar-TCV/).length).toBeGreaterThan(0));
  });

  it('renders clinical pharmacology details in Bangla when Bangla is selected', async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'bn');
    renderAt('/vaccines/bcg');
    await waitFor(() => expect(document.getElementById('main-content')).not.toBeNull());

    expect(screen.getByText(bn['vaccines.detail.clinicalSpecs'])).toBeTruthy();
    expect(screen.getByText(bn['vaccines.detail.dosingProtocol'])).toBeTruthy();
    expect(screen.getByText(bn['vaccines.detail.aftercare'])).toBeTruthy();
  });

  it('opens VaccineModal from the catalogue with clinical pharmacology & monograph link', async () => {
    renderAt('/vaccines');
    await waitFor(() => expect(document.getElementById('main-content')).not.toBeNull());

    const quickViewBtn = await screen.findByRole('button', { name: /Quick view: BCG/i });
    fireEvent.click(quickViewBtn);

    const dialog = await waitFor(() => screen.getByRole('dialog', { name: /BCG/i }));
    const modal = within(dialog);
    expect(modal.getByText(/Live-attenuated bacterial vaccine/)).toBeTruthy();
    expect(modal.getByText(/discard 6 hours after reconstitution/)).toBeTruthy();
    expect(modal.getByRole('link', { name: en['vaccines.detail.openFullProfile'] })).toBeTruthy();
  });

  it('indexes clinical pharmacology and cold-chain guidance in TikaBot RAG answers', () => {
    resetKnowledgeBaseCache();
    const result = answer('BCG intradermal dose volume cold chain VVM-30 reconstitution', 'en');
    expect(result.fallback).toBe(false);
    expect(result.passages.length).toBeGreaterThan(0);
    expect(result.passages.some((p) => p.document.id === 'vaccine-bcg')).toBe(true);
    expect(result.text).toMatch(/Intradermal|0\.05 mL|VVM-30|6 hours/i);
  });
});
