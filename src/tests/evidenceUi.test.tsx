/**
 * Evidence layer in the UI.
 *
 * Proves that the provenance work is not just data: a user opening a vaccine
 * page sees how the entry is classified, whether it has been reviewed, which
 * documents back it, and which conflicts remain open. Also proves that
 * research-stage products can no longer be served by the assistant.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import App from '../App';
import { getKnowledgeBase } from '../lib/ragEngine';
import { LANGUAGE_STORAGE_KEY } from '../i18n/storage';
import { translations } from '../i18n';

const ERROR_MARKER = 'TikaTrack hit an unexpected error';
const en = translations.en;

function renderAt(path: string) {
  // BrowserRouter reads window.location on mount, so set it first.
  window.history.pushState({}, '', path);
  return render(<App />);
}

describe('vaccine detail evidence panel', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows classification, review status and registered sources for a national antigen', async () => {
    renderAt('/vaccines/mr');
    await waitFor(() => expect(document.getElementById('main-content')).not.toBeNull());
    expect(screen.queryByText(ERROR_MARKER)).toBeNull();

    expect(screen.getByText(en['vaccines.evidence.title'])).toBeTruthy();
    expect(screen.getAllByText(en['vaccines.programme.bd-nip-routine']).length).toBeGreaterThan(0);
    expect(screen.getAllByText(en['vaccines.productStatus.licensed-bd']).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(en['vaccines.review.requires-professional-review']).length,
    ).toBeGreaterThan(0);

    // The source that was actually read, with its publisher, is listed.
    expect(screen.getByText('Immunization in Bangladesh')).toBeTruthy();
    expect(screen.getAllByText(/WHO Country Office for Bangladesh/).length).toBeGreaterThan(0);

    // An effective date does not exist yet, and the page says so instead of guessing.
    expect(screen.getAllByText(en['vaccines.evidence.notEstablished']).length).toBeGreaterThan(0);
  });

  it('surfaces the open conflict instead of picking a side', async () => {
    renderAt('/vaccines/mr');
    await waitFor(() => expect(document.getElementById('main-content')).not.toBeNull());

    expect(screen.getByText(en['vaccines.evidence.conflicts'])).toBeTruthy();
    expect(screen.getAllByText(en['vaccines.evidence.conflictStatus']).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/C-002/).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(new RegExp(en['vaccines.evidence.requiredAction'])).length,
    ).toBeGreaterThan(0);
  });

  it('warns that an unreviewed entry must not be used to time a dose', async () => {
    renderAt('/vaccines/mr');
    await waitFor(() => expect(document.getElementById('main-content')).not.toBeNull());
    expect(screen.getAllByText(en['vaccines.evidence.reviewBanner']).length).toBeGreaterThan(0);
  });

  it('labels a research-stage product as having no licensed vaccine', async () => {
    renderAt('/vaccines/hiv');
    await waitFor(() => expect(document.getElementById('main-content')).not.toBeNull());
    expect(screen.queryByText(ERROR_MARKER)).toBeNull();

    expect(screen.getAllByText(en['vaccines.evidence.researchBanner']).length).toBeGreaterThan(0);
    expect(screen.getAllByText(en['vaccines.productStatus.in-development']).length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getAllByText(en['vaccines.programme.research-not-available']).length,
    ).toBeGreaterThan(0);
    // A research entry has no document-level source and must not pretend otherwise.
    expect(screen.getAllByText(en['vaccines.evidence.noDocumentSource']).length).toBeGreaterThan(0);
  });

  it('stops calling a private-market product part of the national routine', async () => {
    renderAt('/vaccines/hexavalent');
    await waitFor(() => expect(document.getElementById('main-content')).not.toBeNull());

    expect(screen.getAllByText(en['vaccines.programme.private-market-bd']).length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText(en['vaccines.evidence.notInProgramme']).length).toBeGreaterThan(0);
    expect(screen.queryByText(en['vaccines.programme.bd-nip-routine'])).toBeNull();
  });

  it('renders the panel in Bangla when the device language is Bangla', async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'bn');
    renderAt('/vaccines/mr');
    await waitFor(() => expect(document.getElementById('main-content')).not.toBeNull());

    const bn = translations.bn;
    expect(screen.getByText(bn['vaccines.evidence.title'])).toBeTruthy();
    expect(screen.getAllByText(bn['vaccines.programme.bd-nip-routine']).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(bn['vaccines.review.requires-professional-review']).length,
    ).toBeGreaterThan(0);
  });

  it('still renders an unknown vaccine id without crashing', async () => {
    renderAt('/vaccines/not-a-real-vaccine');
    await waitFor(() => expect(document.getElementById('main-content')).not.toBeNull());
    expect(screen.queryByText(ERROR_MARKER)).toBeNull();
  });
});

describe('assistant corpus', () => {
  it('excludes research-stage and unlicensed products', () => {
    const ids = getKnowledgeBase().map((document) => document.id);
    for (const excluded of ['vaccine-hiv', 'vaccine-tb-new', 'vaccine-cancer-cervical']) {
      expect(ids, excluded).not.toContain(excluded);
    }
    expect(ids).toContain('vaccine-bcg');
    expect(ids).toContain('vaccine-mr');
  });

  it('ranks only national-programme antigens as high priority', () => {
    const highPriority = getKnowledgeBase().filter(
      (document) => document.kind === 'vaccine' && document.priority === 'high',
    );
    const ids = highPriority.map((document) => document.id);
    expect(ids).toContain('vaccine-mr');
    expect(ids).not.toContain('vaccine-hexavalent');
    expect(ids).not.toContain('vaccine-mmr');
  });

  it('no longer cites a homepage as a source', () => {
    for (const document of getKnowledgeBase()) {
      for (const source of document.sources) {
        expect(source, document.id).not.toBe('https://www.who.int');
        expect(source, document.id).not.toBe('https://dghs.gov.bd');
        expect(source, document.id).not.toBe('https://www.gavi.org');
      }
    }
  });
});
