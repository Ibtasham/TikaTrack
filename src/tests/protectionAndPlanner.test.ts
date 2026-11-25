import { describe, expect, it } from 'vitest';

import { addDays, startOfToday, toISODate } from '../lib/format';
import { buildClinicVisitPlan, buildVisitBriefText } from '../lib/clinicVisitPlanner';
import { createProfile, recordDoseEvent } from '../lib/profileStore';
import {
  computeAntigenProtection,
  computeFamilyProtectionSummary,
} from '../lib/protectionMatrix';

describe('protectionMatrix engine', () => {
  it('computes age-eligible antigen coverage and distinguishes provisional records', () => {
    const today = startOfToday();
    const dob = toISODate(addDays(today, -120)); // ~4 months old
    const created = createProfile({
      name: 'Nusrat',
      dateOfBirth: dob,
      relationship: 'child',
      gender: 'female',
    });
    expect(created.profile).toBeDefined();
    if (!created.profile) return;

    let profiles = [created.profile];
    profiles = recordDoseEvent(profiles, created.profile.id, {
      vaccineId: 'bcg',
      doseNumber: 1,
      date: toISODate(addDays(today, -118)),
    }).profiles;

    profiles = recordDoseEvent(profiles, created.profile.id, {
      vaccineId: 'pentavalent',
      doseNumber: null, // unnumbered provisional record
      date: toISODate(addDays(today, -75)),
    }).profiles;

    const matrix = computeAntigenProtection(profiles[0]);
    const tb = matrix.find((row) => row.id === 'tuberculosis');
    expect(tb?.confirmedCount).toBe(1);
    expect(tb?.eligibleExpectedCount).toBe(1);
    expect(tb?.coveragePercent).toBe(100);
    expect(tb?.status).toBe('protected');

    const dpt = matrix.find((row) => row.id === 'dpt');
    expect(dpt?.provisionalCount).toBe(1);
    expect(dpt?.dueOrOverdueCount).toBe(2); // 10w & 14w doses remain overdue at 120d
    expect(dpt?.status).toBe('partial');

    const measles = matrix.find((row) => row.id === 'measles_rubella');
    expect(measles?.eligibleExpectedCount).toBe(0);
    expect(measles?.upcomingCount).toBe(2);
    expect(measles?.status).toBe('upcoming');
  });

  it('aggregates protection summary across multiple family members', () => {
    const today = startOfToday();
    const baby = createProfile({
      name: 'Baby A',
      dateOfBirth: toISODate(addDays(today, -5)),
      relationship: 'child',
      gender: 'male',
    }).profile!;
    const withBcg = recordDoseEvent([baby], baby.id, {
      vaccineId: 'bcg',
      doseNumber: 1,
      date: toISODate(addDays(today, -4)),
    }).profiles;

    const summary = computeFamilyProtectionSummary(withBcg);
    expect(summary.rows.length).toBeGreaterThanOrEqual(7);
    expect(summary.protectedGroupsCount).toBeGreaterThanOrEqual(1);
  });
});

describe('clinicVisitPlanner engine', () => {
  it('bundles priority overdue doses and upcoming window doses across the family', () => {
    const today = startOfToday();
    // 38 days old: birth doses overdue (if unrecorded), 6-week doses due in 4 days!
    const created = createProfile({
      name: 'Rafi',
      dateOfBirth: toISODate(addDays(today, -38)),
      relationship: 'child',
      gender: 'male',
    });
    expect(created.profile).toBeDefined();
    if (!created.profile) return;

    const plan = buildClinicVisitPlan([created.profile], 30);
    expect(plan.priorityDoses.length).toBeGreaterThanOrEqual(2); // BCG + OPV-0
    expect(plan.windowDoses.length).toBeGreaterThanOrEqual(4); // 6w Pentavalent-1, OPV-1, PCV-1, fIPV-1
    expect(plan.requiresHcwReview).toBe(true);
    expect(plan.involvedMemberNames).toContain('Rafi');

    const briefEn = buildVisitBriefText(plan, ['epi-card'], 'en');
    expect(briefEn).toContain('Rafi');
    expect(briefEn).toContain('[x] Pack physical EPI / Tika card');

    const briefBn = buildVisitBriefText(plan, ['epi-card'], 'bn');
    expect(briefBn).toContain('১৬২৬৩');
  });
});
