import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import App from '../App';
import { lifespanSchedule, lifeStageForAgeDays } from '../data/lifespanSchedule';
import { allVaccines } from '../data/vaccines';
import { translations } from '../i18n';
import { LANGUAGE_STORAGE_KEY } from '../i18n/storage';

const en = translations.en;
const bn = translations.bn;

function renderAt(path: string) {
  window.history.pushState({}, '', path);
  return render(<App />);
}

describe('All-Ages lifespan vaccination schedule', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('references valid vaccines across every milestone with EN & BN labels', () => {
    const vaccineIds = new Set(allVaccines.map((v) => v.id));
    expect(lifespanSchedule.length).toBeGreaterThanOrEqual(14);

    for (const milestone of lifespanSchedule) {
      expect(milestone.age.en.length).toBeGreaterThan(2);
      expect(/[\u0980-\u09FF]/.test(milestone.age.bn)).toBe(true);
      expect(/[\u0980-\u09FF]/.test(milestone.summary.bn)).toBe(true);
      expect(milestone.vaccines.length).toBeGreaterThan(0);

      for (const item of milestone.vaccines) {
        expect(vaccineIds.has(item.id), `unknown vaccine id ${item.id} in ${milestone.id}`).toBe(
          true,
        );
        expect(item.doseLabel.en.length).toBeGreaterThan(1);
        expect(/[\u0980-\u09FF]/.test(item.doseLabel.bn)).toBe(true);
        expect(/[\u0980-\u09FF]/.test(item.note.bn)).toBe(true);
      }
    }
  });

  it('maps chronological age days to the right life-stage key across 0 to 80 years', () => {
    expect(lifeStageForAgeDays(0)).toBe('infant');
    expect(lifeStageForAgeDays(400)).toBe('toddler');
    expect(lifeStageForAgeDays(1800)).toBe('child');
    expect(lifeStageForAgeDays(4500)).toBe('adolescent');
    expect(lifeStageForAgeDays(10950)).toBe('adult');
    expect(lifeStageForAgeDays(20000)).toBe('midlife');
    expect(lifeStageForAgeDays(25550)).toBe('senior');
  });

  it('renders Birth through Seniors 65+, Pregnancy, and Hajj/Travel milestones on /schedule', async () => {
    renderAt('/schedule');
    await waitFor(() => expect(document.getElementById('main-content')).not.toBeNull());

    expect(screen.getByText(/At Birth \(0–14 days\)/)).toBeTruthy();
    expect(screen.getByText(/4–6 Years \(School Entry\)/)).toBeTruthy();
    expect(screen.getByText(/9–14 Years \(Pre-Teen\)/)).toBeTruthy();
    expect(screen.getByText(/19–49 Years \(Adults\)/)).toBeTruthy();
    expect(screen.getByText(/50–64 Years \(Mature Adult\)/)).toBeTruthy();
    expect(screen.getByText(/65\+ Years \(Seniors\)/)).toBeTruthy();
    expect(screen.getByText(/Pregnancy \(Any Trimester/)).toBeTruthy();
    expect(screen.getByText(/Hajj, Travel & High-Risk Occupations/)).toBeTruthy();
  });

  it('filters cleanly by Seniors 65+ and BD EPI programme scope', async () => {
    renderAt('/schedule');
    await waitFor(() => expect(document.getElementById('main-content')).not.toBeNull());

    fireEvent.click(screen.getByRole('button', { name: new RegExp(en['schedule.stage.senior']) }));
    expect(screen.getByText(/PCV20 \(or PCV15 \+ PPSV23\)/)).toBeTruthy();
    expect(screen.queryByText(/At Birth \(0–14 days\)/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: new RegExp(en['schedule.stage.all']) }));
    fireEvent.click(screen.getByRole('button', { name: en['schedule.scope.epi'] }));
    expect(screen.getByText(/Pentavalent-1/)).toBeTruthy();
    expect(screen.getByText(/HPV \(EPI Girls 10–14 yrs\)/)).toBeTruthy();
    expect(screen.queryByText(/Shingles \/ RZV/)).toBeNull();
  });

  it('detects custom adult birth date, displays stage focus CTA, and renders Bangla mode', async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'bn');
    renderAt('/schedule');
    await waitFor(() => expect(document.getElementById('main-content')).not.toBeNull());

    const dobInput = screen.getByLabelText(bn['schedule.enterBirthDate']);
    fireEvent.change(dobInput, { target: { value: '1958-01-01' } });

    await waitFor(() => expect(screen.getByText(bn['schedule.currentFocusTitle'])).toBeTruthy());
    const jumpBtn = screen.getByRole('button', { name: bn['schedule.jumpToCurrentStage'] });
    fireEvent.click(jumpBtn);

    expect(screen.getByText(/৬৫\+ বছর \(প্রবীণ নাগরিক\)/)).toBeTruthy();
    expect(screen.getByText(/পিসিভি-২০/)).toBeTruthy();
  });
});
