/**
 * Smart Vaccination Scheduler Tests
 *
 * Comprehensive test suite for the intelligent scheduling engine
 */

import { describe, it, expect } from 'vitest';
import { SCHEDULE_VERSION, scheduledDoseIdFor, seriesIdFor } from '../lib/doseLedger';
import {
  calculateAge,
  calculateScheduledDate,
  determineVaccineStatus,
  generatePersonalizedSchedule,
  generateCatchUpPlan,
  calculateVaccinationStats,
  getNextUpcomingVaccination,
  getOverdueVaccinations,
  validateCatchUpSchedule,
} from '../lib/smartScheduler';

describe('Smart Vaccination Scheduler', () => {
  describe('calculateAge', () => {
    it('should calculate age correctly for newborn', () => {
      const today = new Date();
      const dob = today.toISOString().split('T')[0];
      const age = calculateAge(dob);

      expect(age.days).toBe(0);
      expect(age.weeks).toBe(0);
      expect(age.months).toBe(0);
      expect(age.years).toBe(0);
    });

    it('should calculate age correctly for 6 weeks old', () => {
      const today = new Date();
      const dob = new Date(today);
      dob.setDate(dob.getDate() - 42); // 6 weeks = 42 days
      const age = calculateAge(dob.toISOString().split('T')[0]);

      expect(age.days).toBe(42);
      expect(age.weeks).toBe(6);
    });

    it('should calculate age correctly for 9 months old', () => {
      const today = new Date();
      const dob = new Date(today);
      dob.setMonth(dob.getMonth() - 9);
      const age = calculateAge(dob.toISOString().split('T')[0]);

      expect(age.months).toBe(9);
    });

    it('should calculate age correctly for 1 year old', () => {
      const today = new Date();
      const dob = new Date(today);
      dob.setFullYear(dob.getFullYear() - 1);
      const age = calculateAge(dob.toISOString().split('T')[0]);

      expect(age.years).toBe(1);
    });
  });

  describe('calculateScheduledDate', () => {
    it('should calculate scheduled date correctly for birth dose', () => {
      const dob = '2024-01-01';
      const scheduledDate = calculateScheduledDate(dob, 0);

      expect(scheduledDate).toBe('2024-01-01');
    });

    it('should calculate scheduled date correctly for 6 weeks', () => {
      const dob = '2024-01-01';
      const scheduledDate = calculateScheduledDate(dob, 42); // 6 weeks

      expect(scheduledDate).toBe('2024-02-12');
    });

    it('should calculate scheduled date correctly for 9 months', () => {
      const dob = '2024-01-01';
      const scheduledDate = calculateScheduledDate(dob, 270); // ~9 months

      expect(scheduledDate).toBe('2024-09-27');
    });
  });

  describe('determineVaccineStatus', () => {
    it('should return completed when actual date is provided', () => {
      const status = determineVaccineStatus('2024-01-01', '2024-01-01');
      expect(status).toBe('completed');
    });

    it('should return due-today when scheduled date is today', () => {
      const today = new Date().toISOString().split('T')[0];
      const status = determineVaccineStatus(today);
      expect(status).toBe('due-today');
    });

    it('should return overdue when scheduled date is in the past', () => {
      const pastDate = '2020-01-01';
      const status = determineVaccineStatus(pastDate);
      expect(status).toBe('overdue');
    });

    it('should return upcoming when scheduled date is in the future', () => {
      const futureDate = '2030-01-01';
      const status = determineVaccineStatus(futureDate);
      expect(status).toBe('upcoming');
    });
  });

  describe('generatePersonalizedSchedule', () => {
    it('should generate schedule for newborn with no records', () => {
      const dob = new Date().toISOString().split('T')[0];
      const records = {};
      const schedule = generatePersonalizedSchedule(dob, records);

      expect(schedule.length).toBeGreaterThan(0);
      expect(schedule[0].status).toBe('due-today');
    });

    it('should mark completed vaccines correctly', () => {
      const dob = '2024-01-01';
      const records = {
        bcg: { date: '2024-01-01' },
      };
      const schedule = generatePersonalizedSchedule(dob, records);

      const bcgDose = schedule.find((d) => d.vaccineId === 'bcg');
      expect(bcgDose?.status).toBe('completed');
    });

    it('numbers every milestone dose instead of hardcoding 1', () => {
      const dob = '2023-01-01';
      const rows = generatePersonalizedSchedule(dob, {});

      const opv = rows.filter((row) => row.vaccineId === 'opv');
      expect(opv.map((row) => row.doseNumber)).toEqual([1, 2, 3, 4]);
      expect(opv.map((row) => row.scheduledDoseId)).toEqual([
        'opv#1@0d',
        'opv#2@42d',
        'opv#3@70d',
        'opv#4@98d',
      ]);
      expect(opv[0].scheduledDoseCount).toBe(4);

      const pentavalent = rows.filter((row) => row.vaccineId === 'pentavalent');
      expect(pentavalent.map((row) => row.doseNumber)).toEqual([1, 2, 3]);
    });

    it('completes only the dose a legacy record can stand for', () => {
      const dob = '2023-01-01';
      const rows = generatePersonalizedSchedule(dob, { opv: { date: '2023-01-05' } });
      const opv = rows.filter((row) => row.vaccineId === 'opv');

      // The record never said which dose it was, so it fills the first open slot
      // and is labelled provisional — never "the series is finished".
      expect(opv[0].status).toBe('completed');
      expect(opv[0].actualDate).toBe('2023-01-05');
      expect(opv[0].attribution).toBe('provisional');
      expect(opv[0].needsReview).toBe(true);
      expect(opv.slice(1).map((row) => row.status)).toEqual(['overdue', 'overdue', 'overdue']);
      expect(opv.slice(1).every((row) => row.actualDate === undefined)).toBe(true);
    });

    it('attributes a recorded dose number exactly', () => {
      const dob = '2023-01-01';
      const profile = {
        id: 'p-1',
        events: [
          {
            id: 'penta-2',
            profileId: 'p-1',
            vaccineId: 'pentavalent',
            scheduleVersion: SCHEDULE_VERSION,
            seriesId: seriesIdFor('pentavalent'),
            doseNumber: 2,
            scheduledDoseId: scheduledDoseIdFor('pentavalent', 2),
            date: '2023-03-05',
            createdAt: '2023-03-05T09:00:00.000Z',
            provenance: 'manual' as const,
            centre: 'Mohakhali EPI centre',
            batch: 'BX-4471',
          },
        ],
        records: {},
      };

      const rows = generatePersonalizedSchedule(dob, profile).filter(
        (row) => row.vaccineId === 'pentavalent',
      );

      expect(rows.map((row) => row.status)).toEqual(['overdue', 'completed', 'overdue']);
      expect(rows[1].attribution).toBe('exact');
      expect(rows[1].needsReview).toBe(false);
      expect(rows[1].recordId).toBe('penta-2');
      expect(rows[1].centre).toBe('Mohakhali EPI centre');
      expect(rows[1].batch).toBe('BX-4471');
    });

    it('should sort schedule by date', () => {
      const dob = '2024-01-01';
      const records = {};
      const schedule = generatePersonalizedSchedule(dob, records);

      for (let i = 1; i < schedule.length; i++) {
        const prevDate = new Date(schedule[i - 1].scheduledDate);
        const currDate = new Date(schedule[i].scheduledDate);
        expect(currDate.getTime()).toBeGreaterThanOrEqual(prevDate.getTime());
      }
    });

    it('should calculate days until due correctly', () => {
      const today = new Date();
      const dob = new Date(today);
      dob.setDate(dob.getDate() - 30); // 30 days ago
      const records = {};
      const schedule = generatePersonalizedSchedule(dob.toISOString().split('T')[0], records);

      const upcomingDose = schedule.find((d) => d.status === 'upcoming');
      if (upcomingDose) {
        expect(upcomingDose.daysUntilDue).toBeGreaterThan(0);
      }
    });
  });

  describe('generateCatchUpPlan', () => {
    it('should identify overdue vaccines', () => {
      const dob = '2023-01-01'; // Over 1 year ago
      const records = {}; // No vaccines recorded
      const catchUpPlan = generateCatchUpPlan(dob, records);

      expect(catchUpPlan.length).toBeGreaterThan(0);
    });

    it('keeps a single-dose vaccine out of the plan once it is recorded', () => {
      const dob = '2023-01-01';
      const records = { bcg: { date: '2023-01-01' } };
      const catchUpPlan = generateCatchUpPlan(dob, records);

      expect(catchUpPlan.find((p) => p.vaccineId === 'bcg')).toBeUndefined();
    });

    it('lists the remaining doses of a series when only one is recorded', () => {
      const dob = '2023-01-01';
      // One OPV record, position unknown (a 2.x migration). It can fill at most
      // one of OPV's four milestone doses.
      const catchUpPlan = generateCatchUpPlan(dob, { opv: { date: '2023-01-05' } });
      const opvPlan = catchUpPlan.find((p) => p.vaccineId === 'opv');

      expect(opvPlan?.missedDoses).toEqual([2, 3, 4]);
      expect(opvPlan?.missedDoseIds).toEqual(['opv#2@42d', 'opv#3@70d', 'opv#4@98d']);
      // The match was inferred, so the plan says it may be wrong.
      expect(opvPlan?.requiresReview).toBe(true);
    });

    it('drops a series from the plan once every dose is recorded', () => {
      const dob = '2023-01-01';
      const profile = {
        id: 'p-1',
        events: [1, 2, 3].map((doseNumber) => ({
          id: `penta-${doseNumber}`,
          profileId: 'p-1',
          vaccineId: 'pentavalent',
          scheduleVersion: SCHEDULE_VERSION,
          seriesId: seriesIdFor('pentavalent'),
          doseNumber,
          scheduledDoseId: scheduledDoseIdFor('pentavalent', doseNumber),
          date: `2023-0${doseNumber + 1}-05`,
          createdAt: '2023-02-01T00:00:00.000Z',
          provenance: 'manual' as const,
        })),
        records: {},
      };

      const catchUpPlan = generateCatchUpPlan(dob, profile);
      expect(catchUpPlan.find((p) => p.vaccineId === 'pentavalent')).toBeUndefined();
    });

    it('always asks for a health worker and never invents a date or interval', () => {
      const catchUpPlan = generateCatchUpPlan('2022-01-01', {});

      expect(catchUpPlan.length).toBeGreaterThan(0);
      catchUpPlan.forEach((plan) => {
        // No minimum interval between doses is registered for Bangladesh, so the
        // 2.x engine's hardcoded "7 days" and "today + 7 days" are gone rather
        // than replaced by another unsourced number.
        expect(plan.requiresMedicalAdvice).toBe(true);
        expect(plan.minimumInterval).toBeNull();
        expect(plan.recommendedNextDate).toBeNull();
        expect(plan.intervalSource).toBe('none');
        expect(plan.daysOverdue).toBeGreaterThan(0);
        expect(plan.explanation.en).toContain('TikaTrack does not recommend a date');
        expect(plan.explanation.bn.length).toBeGreaterThan(0);
      });
    });
  });

  describe('calculateVaccinationStats', () => {
    it('should calculate statistics correctly', () => {
      const dob = '2024-01-01';
      const records = {
        bcg: { date: '2024-01-01' },
      };
      const stats = calculateVaccinationStats(dob, records);

      expect(stats.completed).toBe(1);
      expect(stats.totalScheduled).toBeGreaterThan(0);
      expect(stats.progressPercentage).toBeGreaterThan(0);
    });

    it('should return zero stats for empty records', () => {
      const dob = new Date().toISOString().split('T')[0];
      const records = {};
      const stats = calculateVaccinationStats(dob, records);

      expect(stats.completed).toBe(0);
      expect(stats.progressPercentage).toBe(0);
    });

    it('should calculate progress percentage correctly', () => {
      const dob = '2024-01-01';
      const records = {
        bcg: { date: '2024-01-01' },
        opv: { date: '2024-01-01' },
      };
      const stats = calculateVaccinationStats(dob, records);

      const expectedPercentage = Math.round((stats.completed / stats.totalScheduled) * 100);
      expect(stats.progressPercentage).toBe(expectedPercentage);
    });
  });

  describe('getNextUpcomingVaccination', () => {
    it('should return next upcoming vaccine', () => {
      const dob = '2024-01-01';
      const records = {
        bcg: { date: '2024-01-01' },
      };
      const next = getNextUpcomingVaccination(dob, records);

      if (next) {
        expect(['upcoming', 'due-today']).toContain(next.status);
      }
    });

    it('should return null when all vaccines are completed', () => {
      const dob = '2020-01-01';
      // Create records for all vaccines
      const records: Record<string, { date: string }> = {};
      const schedule = generatePersonalizedSchedule(dob, {});
      schedule.forEach((dose) => {
        records[dose.vaccineId] = { date: dose.scheduledDate };
      });

      const next = getNextUpcomingVaccination(dob, records);
      expect(next).toBeNull();
    });
  });

  describe('getOverdueVaccinations', () => {
    it('should return overdue vaccines', () => {
      const dob = '2023-01-01'; // Over 1 year ago
      const records = {};
      const overdue = getOverdueVaccinations(dob, records);

      expect(overdue.length).toBeGreaterThan(0);
      overdue.forEach((vaccine) => {
        expect(vaccine.status).toBe('overdue');
      });
    });

    it('should return empty array when no vaccines are overdue', () => {
      const dob = new Date().toISOString().split('T')[0];
      const records = {};
      const overdue = getOverdueVaccinations(dob, records);

      expect(overdue.length).toBe(0);
    });
  });

  describe('validateCatchUpSchedule', () => {
    it('should validate safe catch-up schedule', () => {
      const dob = '2024-01-01';
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const validation = validateCatchUpSchedule(
        dob,
        'bcg',
        futureDate.toISOString().split('T')[0],
        {},
      );

      expect(validation.isValid).toBe(true);
    });

    it('should reject past dates', () => {
      const dob = '2024-01-01';
      const pastDate = '2020-01-01';

      const validation = validateCatchUpSchedule(dob, 'bcg', pastDate, {});

      expect(validation.isValid).toBe(false);
      expect(validation.reason.en).toContain('future');
    });

    it('should reject invalid vaccine IDs', () => {
      const dob = '2024-01-01';
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const validation = validateCatchUpSchedule(
        dob,
        'invalid-vaccine',
        futureDate.toISOString().split('T')[0],
        {},
      );

      expect(validation.isValid).toBe(false);
      expect(validation.reason.en).toContain('not found');
    });

    it('should provide bilingual error messages', () => {
      const dob = '2024-01-01';
      const pastDate = '2020-01-01';

      const validation = validateCatchUpSchedule(dob, 'bcg', pastDate, {});

      expect(validation.reason.en).toBeDefined();
      expect(validation.reason.bn).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle leap year birthdays', () => {
      const dob = '2024-02-29'; // Leap year
      const records = {};
      const schedule = generatePersonalizedSchedule(dob, records);

      expect(schedule.length).toBeGreaterThan(0);
    });

    it('should handle very old profiles', () => {
      const dob = '1990-01-01';
      const records = {};
      const schedule = generatePersonalizedSchedule(dob, records);

      expect(schedule.length).toBeGreaterThan(0);
      const overdue = schedule.filter((d) => d.status === 'overdue');
      expect(overdue.length).toBeGreaterThan(0);
    });

    it('should handle profiles with all vaccines completed', () => {
      const dob = '2020-01-01';
      const records: Record<string, { date: string }> = {};

      // Add all vaccines
      const allVaccineIds = ['bcg', 'opv', 'pentavalent', 'pcv', 'fipv', 'mr', 'tcv'];
      allVaccineIds.forEach((id) => {
        records[id] = { date: '2020-01-01' };
      });

      const stats = calculateVaccinationStats(dob, records);
      expect(stats.completed).toBeGreaterThan(0);
    });

    it('should handle invalid date formats gracefully', () => {
      expect(() => calculateAge('invalid-date')).not.toThrow();
      expect(() => calculateScheduledDate('invalid-date', 0)).not.toThrow();
    });
  });
});
