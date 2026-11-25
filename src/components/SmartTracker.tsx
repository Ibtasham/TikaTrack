/**
 * Smart Vaccination Tracker
 *
 * Interactive family tracking hub providing:
 * - Family member switcher, creation, and inline editing
 * - Next EPI clinic visit checklist with 1-click dose pre-fill
 * - Dose-by-dose recording & full ledger history
 * - Family timeline, per-member reminders, and catch-up guidance
 * - Post-vaccination care & emergency reference
 */

import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Users,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  Bell,
  Award,
  Pencil,
  CalendarCheck2,
  ClipboardPlus,
  HeartPulse,
  Phone,
  Stethoscope,
  Activity,
} from 'lucide-react';
import { ChildGrowthTracker } from './ChildGrowthTracker';
import { DoseHistory } from './DoseHistory';
import { DoseRecorder } from './DoseRecorder';
import { MemberActions } from './MemberActions';
import { ProtectionMatrix } from './ProtectionMatrix';
import { ConfirmDialog } from './ui/ConfirmDialog';
import {
  analyzeSchedule,
  generateFamilyTimeline,
  calculateVaccinationStats,
  milestoneDoseName,
} from '../lib/smartScheduler';
import { computeGrowthProgress } from '../lib/whoGrowth';
import { createProfile } from '../lib/profileStore';
import { useProfiles } from '../contexts/ProfilesContext';
import { useToast } from '../contexts/ToastContext';
import type { Profile, ProfileRelationship } from '../types';
import {
  loadReminderPreferences,
  saveReminderPreferences,
  generateReminders,
  type ReminderPreferences,
} from '../lib/intelligentReminders';
import { useI18n } from '../i18n';
import { formatAge, formatDate, isValidISODate, localiseNumber, todayISO } from '../lib/format';
import { triggerHaptic } from '../lib/haptics';

type ProfileGender = NonNullable<Profile['gender']>;

interface SmartTrackerProps {
  profiles: Profile[];
  setProfiles: (profiles: Profile[]) => void;
}

const RELATIONSHIPS: ProfileRelationship[] = ['self', 'child', 'spouse', 'parent', 'sibling', 'other'];
const GENDERS: ProfileGender[] = ['female', 'male', 'other'];

export default function SmartTracker({ profiles, setProfiles }: SmartTrackerProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMemberParam = searchParams.get('member');
  const [selectedProfile, setSelectedProfile] = useState<string>(
    () =>
      (initialMemberParam && profiles.some((p) => p.id === initialMemberParam)
        ? initialMemberParam
        : profiles[0]?.id) || '',
  );

  // Add member form state
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileDob, setNewProfileDob] = useState('');
  const [newRelationship, setNewRelationship] = useState<ProfileRelationship>('child');
  const [newGender, setNewGender] = useState<ProfileGender>('female');

  // Edit member form state
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editRelationship, setEditRelationship] = useState<ProfileRelationship>('child');
  const [editGender, setEditGender] = useState<ProfileGender>('female');

  // View & preferences state
  const [viewMode, setViewMode] = useState<'overview' | 'timeline' | 'growth' | 'reminders' | 'catchup'>(
    'overview',
  );
  const [preferences, setPreferences] = useState<ReminderPreferences>(loadReminderPreferences());
  const [showPreferences, setShowPreferences] = useState(false);
  const [showIntelligenceDetails, setShowIntelligenceDetails] = useState(false);
  const [confirmDeleteProfile, setConfirmDeleteProfile] = useState<string | null>(null);

  // Pre-fill state for DoseRecorder (from deep link or Next Visit Checklist)
  const [prefillDose, setPrefillDose] = useState<{
    vaccineId: string;
    doseNumber: string;
    key: number;
  } | null>(() => {
    const vaccine = searchParams.get('vaccine');
    const dose = searchParams.get('dose') ?? '';
    const action = searchParams.get('action');
    if (vaccine || action === 'record') {
      return { vaccineId: vaccine ?? '', doseNumber: dose, key: 1 };
    }
    return null;
  });

  const { t, language } = useI18n();
  const isBangla = language === 'bn';
  const toast = useToast();
  const { updateProfile, recordDoseEvent } = useProfiles();

  // Keep selectedProfile valid whenever profiles hydrate or change externally.
  useEffect(() => {
    if (profiles.length === 0) {
      if (selectedProfile !== '') setSelectedProfile('');
      return;
    }
    if (!profiles.some((p) => p.id === selectedProfile)) {
      setSelectedProfile(profiles[0].id);
    }
  }, [profiles, selectedProfile]);

  // React to deep-link query params (?member=&vaccine=&dose=&action=record)
  useEffect(() => {
    const member = searchParams.get('member');
    const vaccine = searchParams.get('vaccine');
    const dose = searchParams.get('dose') ?? '';
    const action = searchParams.get('action');

    if (member && profiles.some((p) => p.id === member)) {
      setSelectedProfile(member);
      setViewMode('overview');
    }
    if (vaccine || action === 'record') {
      setPrefillDose({
        vaccineId: vaccine ?? '',
        doseNumber: dose,
        key: Date.now(),
      });
      setViewMode('overview');
      // Clean transient action params from the URL so reload doesn't re-trigger
      const next = new URLSearchParams(searchParams);
      next.delete('vaccine');
      next.delete('dose');
      next.delete('action');
      setSearchParams(next, { replace: true });
    }
  }, [profiles, searchParams, setSearchParams]);

  const currentProfile = profiles.find((p) => p.id === selectedProfile);

  // Per-member summary stats for the switcher strip
  const memberSummaries = useMemo(
    () =>
      profiles.map((member) => ({
        member,
        stats: calculateVaccinationStats(member.dateOfBirth, member),
      })),
    [profiles],
  );

  // Comprehensive evidence-driven schedule analysis for active member
  const scheduleAnalysis = useMemo(
    () =>
      currentProfile
        ? analyzeSchedule(currentProfile.dateOfBirth, currentProfile)
        : null,
    [currentProfile],
  );

  // Active member statistics
  const stats = scheduleAnalysis?.stats ?? {
    totalScheduled: 0,
    completed: 0,
    upcoming: 0,
    overdue: 0,
    dueToday: 0,
    progressPercentage: 0,
    dosesRecorded: 0,
    provisional: 0,
    needsReview: 0,
    confirmedCompleted: 0,
    provisionalCompleted: 0,
    dueToDateTotal: 0,
    completedDueToDate: 0,
    ageEligibleProgressPercentage: 100,
    offScheduleDosesRecorded: 0,
    uncertainRecordsCount: 0,
    referenceDate: todayISO(),
    timezone: 'Asia/Dhaka',
  };

  // Personalized schedule & next visit bundle for the active member
  const personalizedSchedule = useMemo(
    () => scheduleAnalysis?.scheduled ?? [],
    [scheduleAnalysis],
  );

  const nextVisitBundle = useMemo(() => {
    const dueNow = personalizedSchedule.filter(
      (d) => d.status === 'overdue' || d.status === 'due-today',
    );
    if (dueNow.length > 0) {
      return { mode: 'dueNow' as const, targetDate: dueNow[0].scheduledDate, doses: dueNow };
    }
    const upcoming = personalizedSchedule.filter((d) => d.status === 'upcoming');
    if (upcoming.length > 0) {
      const nextDate = upcoming[0].scheduledDate;
      return {
        mode: 'upcoming' as const,
        targetDate: nextDate,
        doses: upcoming.filter((d) => d.scheduledDate === nextDate),
      };
    }
    return { mode: 'complete' as const, targetDate: null, doses: [] };
  }, [personalizedSchedule]);

  const catchUpPlan = useMemo(
    () => scheduleAnalysis?.catchUpPlans ?? [],
    [scheduleAnalysis],
  );

  const growthProgress = useMemo(
    () => computeGrowthProgress(currentProfile?.growth ?? []),
    [currentProfile?.growth],
  );

  const familyTimeline = useMemo(() => generateFamilyTimeline(profiles), [profiles]);

  const memberReminders = useMemo(
    () =>
      currentProfile
        ? generateReminders(
            currentProfile.id,
            currentProfile.dateOfBirth,
            currentProfile,
            preferences,
          )
        : [],
    [currentProfile, preferences],
  );

  // Persist generated reminders across members while preserving existing sent/acknowledged flags
  useEffect(() => {
    if (!currentProfile || !preferences.enabled) return;
    try {
      const raw = localStorage.getItem('tikatrack-reminders');
      const existing = raw ? (JSON.parse(raw) as Array<{ id: string; profileId?: string; sent?: boolean; acknowledged?: boolean }>) : [];
      const priorById = new Map(existing.map((r) => [r.id, r]));
      const mergedMember = memberReminders.map((rem) => {
        const prev = priorById.get(rem.id);
        return prev ? { ...rem, sent: Boolean(prev.sent), acknowledged: Boolean(prev.acknowledged) } : rem;
      });
      const otherMembers = existing.filter((r) => r.profileId !== currentProfile.id);
      localStorage.setItem('tikatrack-reminders', JSON.stringify([...otherMembers, ...mergedMember]));
    } catch {
      localStorage.setItem('tikatrack-reminders', JSON.stringify(memberReminders));
    }
  }, [currentProfile, memberReminders, preferences.enabled]);

  const addProfile = () => {
    const result = createProfile({
      name: newProfileName,
      dateOfBirth: newProfileDob,
      relationship: newRelationship,
      gender: newGender,
    });
    if (!result.profile) {
      toast.error(t('tracker.add.title'), t(`tracker.add.error.${result.error ?? 'name'}`));
      return;
    }
    setProfiles([...profiles, result.profile]);
    setSelectedProfile(result.profile.id);
    setNewProfileName('');
    setNewProfileDob('');
    setNewRelationship('child');
    setNewGender('female');
    setShowAddProfile(false);
    triggerHaptic('success');
    toast.success(t('tracker.profileAdded', result.profile.name));
  };

  const openEditProfile = (profile: Profile) => {
    setEditingProfileId(profile.id);
    setEditName(profile.name);
    setEditDob(profile.dateOfBirth);
    setEditRelationship(profile.relationship ?? 'other');
    setEditGender(profile.gender ?? 'other');
  };

  const saveEditProfile = () => {
    if (!editingProfileId) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      toast.error(t('tracker.add.error.empty-name'));
      return;
    }
    if (!isValidISODate(editDob)) {
      toast.error(t('tracker.add.error.invalid-dob'));
      return;
    }
    if (editDob > todayISO()) {
      toast.error(t('tracker.add.error.future-dob'));
      return;
    }
    updateProfile(editingProfileId, {
      name: trimmed,
      dateOfBirth: editDob,
      relationship: editRelationship,
      gender: editGender,
    });
    triggerHaptic('success');
    toast.success(t('tracker.member.updated', trimmed));
    setEditingProfileId(null);
  };

  const deleteProfile = (id: string) => {
    const remaining = profiles.filter((p) => p.id !== id);
    const removed = profiles.find((p) => p.id === id);
    setProfiles(remaining);
    if (selectedProfile === id) setSelectedProfile(remaining[0]?.id || '');
    if (editingProfileId === id) setEditingProfileId(null);
    setConfirmDeleteProfile(null);
    triggerHaptic('remove');
    if (removed) toast.info(t('tracker.profileDeleted', removed.name));
  };

  const updatePreferences = (updates: Partial<ReminderPreferences>) => {
    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);
    saveReminderPreferences(newPreferences);
    triggerHaptic('toggle');
  };

  const handleQuickCompleteDose = (vaccineId: string, doseNumber: number, label: string) => {
    if (!currentProfile) return;
    const today = todayISO();
    const result = recordDoseEvent(currentProfile.id, {
      vaccineId,
      doseNumber,
      date: today,
      provenance: 'manual',
    });
    if (result.error || !result.event) {
      toast.error(t(`tracker.dose.error.${result.error ?? 'missing-vaccine'}`));
      return;
    }
    const isFinalVisitDose = nextVisitBundle.doses.length <= 1;
    triggerHaptic(isFinalVisitDose ? 'milestone' : 'success');
    toast.success(t('tracker.dose.recorded', label), formatDate(today, language));
  };

  const triggerPrefillRecord = (vaccineId: string, doseNumber?: number) => {
    setPrefillDose({
      vaccineId,
      doseNumber: typeof doseNumber === 'number' ? String(doseNumber) : '',
      key: Date.now(),
    });
    document.getElementById('dose-recorder-section')?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  };

  const getAchievements = (profile: Profile) => {
    const memberStats = calculateVaccinationStats(profile.dateOfBirth, profile);
    const achievements = [];

    if (memberStats.completed >= 1)
      achievements.push({ icon: '🎯', title: language === 'en' ? 'First Step' : 'প্রথম পদক্ষেপ' });
    if (memberStats.completed >= 5)
      achievements.push({
        icon: '⭐',
        title: language === 'en' ? 'Rising Star' : 'উদীয়মান তারকা',
      });
    if (memberStats.completed >= 10)
      achievements.push({ icon: '🏆', title: language === 'en' ? 'Champion' : 'চ্যাম্পিয়ন' });
    if (memberStats.progressPercentage === 100)
      achievements.push({
        icon: '👑',
        title: language === 'en' ? 'Perfect Record' : 'নিখুঁত রেকর্ড',
      });
    if (memberStats.overdue === 0)
      achievements.push({ icon: '✅', title: language === 'en' ? 'On Track' : 'সঠিক পথে' });

    return achievements;
  };

  return (
    <div className="animate-slide-up space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between no-print">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/60 dark:text-emerald-300"
            aria-hidden="true"
          >
            <Users className="h-4 w-4" />
          </span>
          <h2 className={`text-lg font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}>
            {t('tracker.members.title')}
            {profiles.length > 0 && (
              <span className="ml-2 text-sm font-medium tabular-nums text-neutral-500 dark:text-neutral-400">
                ({localiseNumber(profiles.length, language)})
              </span>
            )}
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowAddProfile((prev) => !prev)}
            className="btn-primary whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span className={isBangla ? 'font-bangla' : ''}>{t('tracker.addProfile')}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowPreferences((prev) => !prev)}
            className="btn-secondary whitespace-nowrap shrink-0"
            aria-expanded={showPreferences}
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            <span className={isBangla ? 'font-bangla' : ''}>{t('tracker.preferences')}</span>
          </button>
        </div>
      </div>

      {/* Preferences Panel */}
      {showPreferences && (
        <div className="card-padded animate-scale-in no-print">
          <h3
            className={`text-lg font-bold text-neutral-900 dark:text-white mb-4 ${isBangla ? 'font-bangla' : ''}`}
          >
            {t('tracker.reminderSettings')}
          </h3>

          <div className="space-y-4">
            <label className="flex cursor-pointer items-center justify-between gap-4">
              <span
                className={`text-sm font-medium text-neutral-700 dark:text-neutral-200 ${isBangla ? 'font-bangla' : ''}`}
              >
                {t('tracker.enableReminders')}
              </span>
              <input
                type="checkbox"
                checked={preferences.enabled}
                onChange={(e) => updatePreferences({ enabled: e.target.checked })}
                className="h-5 w-5 accent-emerald-600"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between gap-4">
              <span
                className={`text-sm font-medium text-neutral-700 dark:text-neutral-200 ${isBangla ? 'font-bangla' : ''}`}
              >
                {t('tracker.browserNotifications')}
              </span>
              <input
                type="checkbox"
                checked={preferences.browserNotifications}
                onChange={(e) => updatePreferences({ browserNotifications: e.target.checked })}
                className="h-5 w-5 accent-emerald-600"
              />
            </label>

            <div>
              <p
                className={`mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 ${isBangla ? 'font-bangla' : ''}`}
              >
                {t('tracker.daysBefore')}
              </p>
              <div className="flex flex-wrap gap-3">
                {[7, 3, 1].map((days) => (
                  <label
                    key={days}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-700 dark:border-neutral-700 dark:text-neutral-200"
                  >
                    <input
                      type="checkbox"
                      checked={preferences.daysBefore.includes(days)}
                      onChange={(e) => {
                        const newDays = e.target.checked
                          ? [...preferences.daysBefore, days]
                          : preferences.daysBefore.filter((d) => d !== days);
                        updatePreferences({ daysBefore: newDays });
                      }}
                      className="h-4 w-4 accent-emerald-600"
                    />
                    <span className={isBangla ? 'font-bangla' : undefined}>
                      {localiseNumber(days, language)} {language === 'en' ? 'days' : 'দিন'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Profile Panel */}
      {showAddProfile && (
        <div className="card-padded animate-scale-in no-print">
          <h3
            className={`text-lg font-bold text-neutral-900 dark:text-white mb-4 ${isBangla ? 'font-bangla' : ''}`}
          >
            {t('tracker.add.title')}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="add-member-name"
                className={`label ${isBangla ? 'font-bangla' : ''}`}
              >
                {t('tracker.add.name')}
              </label>
              <input
                id="add-member-name"
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                className="input-field"
                placeholder={t('tracker.add.namePlaceholder')}
              />
            </div>
            <div>
              <label htmlFor="add-member-dob" className={`label ${isBangla ? 'font-bangla' : ''}`}>
                {t('tracker.add.dob')}
              </label>
              <input
                id="add-member-dob"
                type="date"
                value={newProfileDob}
                onChange={(e) => setNewProfileDob(e.target.value)}
                className="input-field"
                max={todayISO()}
              />
            </div>
            <div>
              <label htmlFor="add-member-rel" className={`label ${isBangla ? 'font-bangla' : ''}`}>
                {t('tracker.add.relationship')}
              </label>
              <select
                id="add-member-rel"
                value={newRelationship}
                onChange={(e) => setNewRelationship(e.target.value as ProfileRelationship)}
                className="input-field"
              >
                {RELATIONSHIPS.map((rel) => (
                  <option key={rel} value={rel}>
                    {t(`tracker.relationship.${rel}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="add-member-gender"
                className={`label ${isBangla ? 'font-bangla' : ''}`}
              >
                {t('tracker.add.gender')}
              </label>
              <select
                id="add-member-gender"
                value={newGender}
                onChange={(e) => setNewGender(e.target.value as ProfileGender)}
                className="input-field"
              >
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {t(`tracker.gender.${g}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={addProfile} className="btn-primary">
              <span className={isBangla ? 'font-bangla' : ''}>{t('tracker.add.submit')}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAddProfile(false)}
              className="btn-secondary"
            >
              <span className={isBangla ? 'font-bangla' : ''}>{t('tracker.cancel')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Family Member Switcher Strip */}
      {profiles.length > 0 && (
        <div
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 no-print"
          role="tablist"
          aria-label={t('tracker.members.title')}
        >
          {memberSummaries.map(({ member, stats: memberStats }) => {
            const active = member.id === currentProfile?.id;
            const attentionCount = memberStats.overdue + memberStats.dueToday;
            return (
              <button
                key={member.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setSelectedProfile(member.id);
                  setEditingProfileId(null);
                }}
                className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors cursor-pointer ${
                  active
                    ? 'border-emerald-600 bg-emerald-50/60 dark:border-emerald-500 dark:bg-emerald-950/35'
                    : 'border-neutral-200/90 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700'
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                    active
                      ? 'bg-emerald-700 text-white dark:bg-emerald-600'
                      : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200'
                  }`}
                  aria-hidden="true"
                >
                  {member.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-sm font-semibold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
                  >
                    {member.name}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                    <span>{formatAge(member.dateOfBirth, language)}</span>
                    {member.relationship && (
                      <span>· {t(`tracker.relationship.${member.relationship}`)}</span>
                    )}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className="text-xs font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {localiseNumber(memberStats.progressPercentage, language)}%
                  </span>
                  {attentionCount > 0 && (
                    <span className="text-[11px] font-semibold tabular-nums text-red-600 dark:text-red-400">
                      {localiseNumber(attentionCount, language)} {t('tracker.overdue').toLowerCase()}
                    </span>
                  )}
                  {memberStats.needsReview > 0 && (
                    <span
                      className="text-[11px] font-semibold tabular-nums text-amber-700 dark:text-amber-300"
                      title={t('tracker.dose.review.badge')}
                    >
                      {localiseNumber(memberStats.needsReview, language)}{' '}
                      {t('tracker.dose.review.badge').toLowerCase()}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* View Mode Selector */}
      {profiles.length > 0 && (
        <div
          className="segmented-group no-print"
          role="tablist"
          aria-label={t('tracker.title')}
        >
          {(['overview', 'timeline', 'growth', 'reminders', 'catchup'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={viewMode === mode}
              onClick={() => setViewMode(mode)}
              className={`segmented-tab text-xs sm:text-sm ${
                viewMode === mode ? 'segmented-tab-active text-emerald-800 dark:text-emerald-300' : ''
              }`}
            >
              <span className={isBangla ? 'font-bangla' : ''}>{t(`tracker.${mode}`)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Empty State */}
      {profiles.length === 0 && !showAddProfile && (
        <div className="card-padded p-10 text-center">
          <Users className="mx-auto mb-3 h-12 w-12 text-neutral-300 dark:text-neutral-600" />
          <p className={`text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}>
            {t('tracker.noProfiles')}
          </p>
        </div>
      )}

      {/* Overview View */}
      {viewMode === 'overview' && currentProfile && (
        <div className="space-y-6">
          {/* Profile Card */}
          <div className="card-padded">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-xl font-bold text-white sm:h-16 sm:w-16 sm:text-2xl dark:bg-emerald-600">
                  {currentProfile.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2
                    className={`text-xl font-bold text-neutral-900 sm:text-2xl dark:text-white ${isBangla ? 'font-bangla' : ''}`}
                  >
                    {currentProfile.name}
                  </h2>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-neutral-600 sm:text-sm dark:text-neutral-300">
                    <span>
                      {language === 'en' ? 'Born' : 'জন্ম'}:{' '}
                      <span className="tabular-nums">{formatDate(currentProfile.dateOfBirth, language)}</span>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{formatAge(currentProfile.dateOfBirth, language)}</span>
                    {currentProfile.relationship && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{t(`tracker.relationship.${currentProfile.relationship}`)}</span>
                      </>
                    )}
                    {currentProfile.gender && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{t(`tracker.gender.${currentProfile.gender}`)}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 no-print">
                <button
                  type="button"
                  onClick={() =>
                    editingProfileId === currentProfile.id
                      ? setEditingProfileId(null)
                      : openEditProfile(currentProfile)
                  }
                  className="btn-ghost btn-sm"
                  title={t('tracker.member.edit')}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  <span className={isBangla ? 'font-bangla' : undefined}>
                    {t('tracker.member.edit')}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteProfile(currentProfile.id)}
                  className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                  title={t('tracker.member.delete')}
                >
                  <Trash2 className="h-5 w-5" aria-hidden="true" />
                  <span className="sr-only">{t('tracker.member.delete')}</span>
                </button>
              </div>
            </div>

            {/* Inline Edit Member Panel */}
            {editingProfileId === currentProfile.id && (
              <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-900 dark:bg-emerald-950/20 no-print">
                <h3
                  className={`mb-3 font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
                >
                  {t('tracker.edit.title', currentProfile.name)}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="edit-member-name"
                      className={`label ${isBangla ? 'font-bangla' : ''}`}
                    >
                      {t('tracker.add.name')}
                    </label>
                    <input
                      id="edit-member-name"
                      type="text"
                      className="input-field"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="edit-member-dob"
                      className={`label ${isBangla ? 'font-bangla' : ''}`}
                    >
                      {t('tracker.add.dob')}
                    </label>
                    <input
                      id="edit-member-dob"
                      type="date"
                      className="input-field"
                      value={editDob}
                      max={todayISO()}
                      onChange={(e) => setEditDob(e.target.value)}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="edit-member-rel"
                      className={`label ${isBangla ? 'font-bangla' : ''}`}
                    >
                      {t('tracker.add.relationship')}
                    </label>
                    <select
                      id="edit-member-rel"
                      className="input-field"
                      value={editRelationship}
                      onChange={(e) => setEditRelationship(e.target.value as ProfileRelationship)}
                    >
                      {RELATIONSHIPS.map((rel) => (
                        <option key={rel} value={rel}>
                          {t(`tracker.relationship.${rel}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="edit-member-gender"
                      className={`label ${isBangla ? 'font-bangla' : ''}`}
                    >
                      {t('tracker.add.gender')}
                    </label>
                    <select
                      id="edit-member-gender"
                      className="input-field"
                      value={editGender}
                      onChange={(e) => setEditGender(e.target.value as ProfileGender)}
                    >
                      {GENDERS.map((g) => (
                        <option key={g} value={g}>
                          {t(`tracker.gender.${g}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={saveEditProfile} className="btn-primary btn-sm">
                    {t('tracker.member.editSave')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingProfileId(null)}
                    className="btn-secondary btn-sm"
                  >
                    {t('tracker.cancel')}
                  </button>
                </div>
              </div>
            )}

            {/* Progress */}
            <div className="mb-5">
              <div className="mb-1.5 flex justify-between text-xs font-medium">
                <span
                  className={`text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
                >
                  {t('tracker.progress')}
                </span>
                <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {localiseNumber(stats.progressPercentage, language)}%
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all duration-300 dark:bg-emerald-500"
                  style={{ width: `${stats.progressPercentage}%` }}
                />
              </div>
            </div>

            {/* Statistics */}
            <dl className="grid grid-cols-3 divide-x divide-neutral-200/80 rounded-xl border border-neutral-200/80 bg-neutral-50/60 dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900/50">
              <div className="p-3.5 text-center sm:p-4">
                <dd className="flex items-center justify-center gap-1.5 text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{localiseNumber(stats.completed, language)}</span>
                </dd>
                <dt
                  className={`mt-1 text-xs font-medium text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
                >
                  {t('tracker.completed')}
                </dt>
              </div>
              <div className="p-3.5 text-center sm:p-4">
                <dd className="flex items-center justify-center gap-1.5 text-2xl font-bold tabular-nums text-sky-700 dark:text-sky-400">
                  <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{localiseNumber(stats.upcoming, language)}</span>
                </dd>
                <dt
                  className={`mt-1 text-xs font-medium text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
                >
                  {t('tracker.upcoming')}
                </dt>
              </div>
              <div className="p-3.5 text-center sm:p-4">
                <dd className="flex items-center justify-center gap-1.5 text-2xl font-bold tabular-nums text-red-700 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{localiseNumber(stats.overdue, language)}</span>
                </dd>
                <dt
                  className={`mt-1 text-xs font-medium text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
                >
                  {t('tracker.overdue')}
                </dt>
              </div>
            </dl>

            {/* Schedule Intelligence & Clinical Limitations */}
            {scheduleAnalysis && (
              <div className="mt-6 border-t border-neutral-200/80 pt-5 dark:border-neutral-800">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3
                      className={`text-sm font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
                    >
                      {t('tracker.intelligence.title')}
                    </h3>
                    <p
                      className={`mt-0.5 text-xs text-neutral-500 tabular-nums dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
                    >
                      {t(
                        'tracker.intelligence.subtitle',
                        formatDate(scheduleAnalysis.referenceDate, language),
                        scheduleAnalysis.timezone,
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowIntelligenceDetails((prev) => !prev)}
                    aria-expanded={showIntelligenceDetails}
                    className="btn-secondary btn-sm shrink-0 no-print"
                  >
                    <span className={isBangla ? 'font-bangla' : undefined}>
                      {showIntelligenceDetails
                        ? t('tracker.intelligence.hideDetails')
                        : t('tracker.intelligence.toggleDetails')}
                    </span>
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200/80 bg-neutral-50/70 px-3.5 py-2 text-xs dark:border-neutral-800 dark:bg-neutral-900/50">
                  <span className={`font-medium text-neutral-700 dark:text-neutral-200 ${isBangla ? 'font-bangla' : ''}`}>
                    {t('tracker.intelligence.dueProgress')}:{' '}
                    <strong className="tabular-nums text-emerald-700 dark:text-emerald-400">
                      {t(
                        'tracker.intelligence.dueProgressRatio',
                        localiseNumber(scheduleAnalysis.stats.completedDueToDate, language),
                        localiseNumber(scheduleAnalysis.stats.dueToDateTotal, language),
                      )}{' '}
                      ({localiseNumber(scheduleAnalysis.stats.ageEligibleProgressPercentage, language)}%)
                    </strong>
                  </span>
                  <span className={`tabular-nums text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}>
                    {t(
                      'tracker.intelligence.confirmedVsProvisional',
                      localiseNumber(scheduleAnalysis.completedConfirmed.length, language),
                      localiseNumber(scheduleAnalysis.completedProvisional.length, language),
                    )}
                  </span>
                </div>

                <div className="mt-3 grid gap-px overflow-hidden rounded-lg border border-neutral-200/80 bg-neutral-200/80 sm:grid-cols-2 lg:grid-cols-5 dark:border-neutral-800 dark:bg-neutral-800">
                  <div className="bg-white p-3 dark:bg-neutral-950/60">
                    <p className={`text-xs font-semibold text-emerald-700 dark:text-emerald-400 ${isBangla ? 'font-bangla' : ''}`}>
                      {t('tracker.intelligence.bucketCompleted')}
                    </p>
                    <p className="mt-1 text-lg font-bold tabular-nums text-neutral-900 dark:text-white">
                      {localiseNumber(scheduleAnalysis.stats.completed, language)}
                    </p>
                    <p className={`mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}>
                      {t(
                        'tracker.intelligence.bucketCompletedDetail',
                        localiseNumber(scheduleAnalysis.completedConfirmed.length, language),
                        localiseNumber(scheduleAnalysis.completedProvisional.length, language),
                      )}
                    </p>
                  </div>

                  <div className="bg-white p-3 dark:bg-neutral-950/60">
                    <p className={`text-xs font-semibold text-sky-700 dark:text-sky-400 ${isBangla ? 'font-bangla' : ''}`}>
                      {t('tracker.intelligence.bucketUpcoming')}
                    </p>
                    <p className="mt-1 text-lg font-bold tabular-nums text-neutral-900 dark:text-white">
                      {localiseNumber(
                        scheduleAnalysis.dueToday.length + scheduleAnalysis.upcoming.length,
                        language,
                      )}
                    </p>
                    <p className={`mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}>
                      {t(
                        'tracker.intelligence.bucketUpcomingDetail',
                        localiseNumber(scheduleAnalysis.dueToday.length, language),
                        localiseNumber(scheduleAnalysis.upcoming.length, language),
                      )}
                    </p>
                  </div>

                  <div className="bg-white p-3 dark:bg-neutral-950/60">
                    <p className={`text-xs font-semibold text-red-700 dark:text-red-400 ${isBangla ? 'font-bangla' : ''}`}>
                      {t('tracker.intelligence.bucketOverdue')}
                    </p>
                    <p className="mt-1 text-lg font-bold tabular-nums text-neutral-900 dark:text-white">
                      {localiseNumber(scheduleAnalysis.potentiallyOverdue.length, language)}
                    </p>
                    <p className={`mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}>
                      {t('tracker.intelligence.bucketOverdueDetail')}
                    </p>
                  </div>

                  <div className="bg-white p-3 dark:bg-neutral-950/60">
                    <p className={`text-xs font-semibold text-amber-700 dark:text-amber-400 ${isBangla ? 'font-bangla' : ''}`}>
                      {t('tracker.intelligence.bucketUncertain')}
                    </p>
                    <p className="mt-1 text-lg font-bold tabular-nums text-neutral-900 dark:text-white">
                      {localiseNumber(scheduleAnalysis.anomalies.length, language)}
                    </p>
                    <p className={`mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}>
                      {t(
                        'tracker.intelligence.bucketUncertainDetail',
                        localiseNumber(scheduleAnalysis.anomalies.length, language),
                        localiseNumber(scheduleAnalysis.offScheduleEvents.length, language),
                      )}
                    </p>
                  </div>

                  <div className="bg-white p-3 dark:bg-neutral-950/60">
                    <p className={`text-xs font-semibold text-neutral-700 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}>
                      {t('tracker.intelligence.bucketHcw')}
                    </p>
                    <p className="mt-1 text-lg font-bold tabular-nums text-neutral-900 dark:text-white">
                      {localiseNumber(scheduleAnalysis.hcwReviewItems.length, language)}
                    </p>
                    <p className={`mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}>
                      {t(
                        'tracker.intelligence.bucketHcwDetail',
                        localiseNumber(scheduleAnalysis.hcwReviewItems.length, language),
                      )}
                    </p>
                  </div>
                </div>

                {showIntelligenceDetails && (
                  <div className="mt-4 space-y-4 border-t border-neutral-200 pt-4 text-xs dark:border-neutral-800">
                    {scheduleAnalysis.anomalies.length === 0 &&
                    scheduleAnalysis.hcwReviewItems.length === 0 ? (
                      <p className={`text-emerald-700 dark:text-emerald-300 ${isBangla ? 'font-bangla' : ''}`}>
                        {t('tracker.intelligence.noIssues')}
                      </p>
                    ) : null}

                    {scheduleAnalysis.anomalies.length > 0 && (
                      <div>
                        <p className={`mb-1.5 font-semibold text-amber-800 dark:text-amber-300 ${isBangla ? 'font-bangla' : ''}`}>
                          {t('tracker.intelligence.anomalyListTitle')}
                        </p>
                        <ul className="space-y-1 text-neutral-700 dark:text-neutral-300">
                          {scheduleAnalysis.anomalies.map((item) => (
                            <li key={item.id} className={isBangla ? 'font-bangla' : undefined}>
                              • {item.description[language]}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {scheduleAnalysis.hcwReviewItems.length > 0 && (
                      <div>
                        <p className={`mb-1.5 font-semibold text-neutral-800 dark:text-neutral-200 ${isBangla ? 'font-bangla' : ''}`}>
                          {t('tracker.intelligence.hcwListTitle')}
                        </p>
                        <ul className="space-y-1 text-neutral-700 dark:text-neutral-300">
                          {scheduleAnalysis.hcwReviewItems.map((item) => (
                            <li key={item.id} className={isBangla ? 'font-bangla' : undefined}>
                              • {item.summary[language]} ({item.conflictIds.join(', ')})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div>
                      <p className={`mb-1.5 font-semibold text-neutral-800 dark:text-neutral-200 ${isBangla ? 'font-bangla' : ''}`}>
                        {t('tracker.intelligence.limitationsTitle')}
                      </p>
                      <ul className="space-y-1.5 text-neutral-600 dark:text-neutral-300">
                        {scheduleAnalysis.limitations.map((lim) => (
                          <li key={lim.id} className={isBangla ? 'font-bangla' : undefined}>
                            <strong className="text-neutral-800 dark:text-neutral-100">
                              {lim.title[language]}:
                            </strong>{' '}
                            {lim.description[language]}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Next EPI Visit Checklist */}
            <div className="mt-6 border-t border-neutral-200 pt-6 dark:border-neutral-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3
                  className={`flex items-center gap-2 font-semibold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
                >
                  <CalendarCheck2
                    className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
                    aria-hidden="true"
                  />
                  {nextVisitBundle.mode === 'dueNow'
                    ? t('tracker.visit.titleToday')
                    : t('tracker.visit.titleUpcoming')}
                </h3>
                {nextVisitBundle.targetDate && (
                  <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    {t('tracker.visit.dueDate', formatDate(nextVisitBundle.targetDate, language))}
                  </span>
                )}
              </div>

              {nextVisitBundle.doses.length === 0 ? (
                <p
                  className={`mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200 ${isBangla ? 'font-bangla' : ''}`}
                >
                  {t('tracker.visit.allDone')}
                </p>
              ) : (
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {nextVisitBundle.doses.map((dose) => (
                    <li
                      key={dose.scheduledDoseId}
                      className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50/70 p-3 dark:border-neutral-800 dark:bg-neutral-800/50"
                    >
                      <div className="min-w-0">
                        <p
                          className={`truncate font-semibold text-sm text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
                        >
                          {milestoneDoseName(dose, language)}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-neutral-500 dark:text-neutral-400">
                          <span className="tabular-nums">{formatDate(dose.scheduledDate, language)}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={`status-inline ${
                              dose.status === 'overdue'
                                ? 'text-red-700 dark:text-red-400'
                                : dose.status === 'due-today'
                                  ? 'text-amber-700 dark:text-amber-300'
                                  : 'text-sky-700 dark:text-sky-400'
                            }`}
                          >
                            {dose.status === 'overdue'
                              ? t('tracker.status.overdue')
                              : dose.status === 'due-today'
                                ? t('tracker.status.dueToday')
                                : t('tracker.status.upcoming')}
                          </span>
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5 no-print">
                        <button
                          type="button"
                          className="btn-primary btn-sm whitespace-nowrap shrink-0"
                          onClick={() =>
                            handleQuickCompleteDose(
                              dose.vaccineId,
                              dose.doseNumber,
                              milestoneDoseName(dose, language),
                            )
                          }
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{t('tracker.visit.markGiven')}</span>
                        </button>
                        <button
                          type="button"
                          className="btn-secondary btn-sm whitespace-nowrap shrink-0"
                          onClick={() => triggerPrefillRecord(dose.vaccineId, dose.doseNumber)}
                        >
                          <ClipboardPlus className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{t('tracker.visit.recordThis')}</span>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Record what was actually given: one dose at a time. */}
            <div
              id="dose-recorder-section"
              className="mt-6 border-t border-neutral-200 pt-6 dark:border-neutral-800 no-print"
            >
              <DoseRecorder
                key={currentProfile.id}
                profile={currentProfile}
                initialVaccineId={prefillDose?.vaccineId}
                initialDoseNumber={prefillDose?.doseNumber}
                autoOpenKey={prefillDose?.key}
              />
            </div>

            {/* Take the record somewhere useful: calendar, chat app, paper. */}
            <div className="mt-6 border-t border-neutral-200 pt-6 dark:border-neutral-800 no-print">
              <h3
                className={`mb-3 flex items-center gap-2 font-semibold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
              >
                {t('tracker.actions.title')}
              </h3>
              <MemberActions profile={currentProfile} />
            </div>

            {/* Achievements */}
            {getAchievements(currentProfile).length > 0 && (
              <div className="mt-6 border-t border-neutral-200 pt-6 dark:border-neutral-800">
                <h3
                  className={`mb-3 flex items-center gap-2 font-semibold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
                >
                  <Award className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  {language === 'en' ? 'Achievements' : 'অর্জন'}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {getAchievements(currentProfile).map((achievement) => (
                    <div
                      key={`${achievement.icon}-${achievement.title}`}
                      className="flex items-center gap-2 rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-1.5 text-xs font-semibold text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
                    >
                      <span>{achievement.icon}</span>
                      <span className={isBangla ? 'font-bangla' : ''}>{achievement.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Child Growth Tracker quick summary card */}
          <div className="card-padded no-print">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h3
                  className={`flex items-center gap-2 font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
                >
                  <Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  {t('growth.quickCard.title')}
                </h3>
                {growthProgress.checkupCount === 0 ? (
                  <p className={`mt-1 text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}>
                    {t('growth.quickCard.empty')}
                  </p>
                ) : (
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-700 tabular-nums dark:text-neutral-200">
                    {growthProgress.latestWeightKg !== undefined && (
                      <span>
                        <strong className="font-semibold text-neutral-900 dark:text-white">
                          {localiseNumber(growthProgress.latestWeightKg, language)} {isBangla ? 'কেজি' : 'kg'}
                        </strong>
                      </span>
                    )}
                    {growthProgress.latestWeightKg !== undefined && growthProgress.latestHeightCm !== undefined && (
                      <span aria-hidden="true" className="text-neutral-400">·</span>
                    )}
                    {growthProgress.latestHeightCm !== undefined && (
                      <span>
                        <strong className="font-semibold text-neutral-900 dark:text-white">
                          {localiseNumber(growthProgress.latestHeightCm, language)} {isBangla ? 'সেমি' : 'cm'}
                        </strong>
                      </span>
                    )}
                    <span aria-hidden="true" className="text-neutral-400">·</span>
                    <span className="text-neutral-500 dark:text-neutral-400">
                      {t('growth.summary.checkups', localiseNumber(growthProgress.checkupCount, language))}
                    </span>
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setViewMode('growth')}
                className="btn-secondary btn-sm whitespace-nowrap shrink-0"
              >
                <span className={isBangla ? 'font-bangla' : undefined}>{t('growth.quickCard.open')}</span>
              </button>
            </div>
          </div>

          {/* Antigen & Disease Protection Matrix */}
          <div className="card-padded no-print">
            <ProtectionMatrix
              profiles={[currentProfile]}
              selectedProfileId={currentProfile.id}
              compact
            />
          </div>

          {/* Every dose this member has, with correction and deletion. */}
          <DoseHistory profile={currentProfile} />

          {/* Post-Vaccination Care & Safety Reference */}
          <div className="card-padded no-print">
            <h3
              className={`flex items-center gap-2 font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
            >
              <HeartPulse className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              {t('tracker.care.title')}
            </h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                <p
                  className={`text-sm font-bold text-emerald-900 dark:text-emerald-200 ${isBangla ? 'font-bangla' : ''}`}
                >
                  {t('tracker.care.normalTitle')}
                </p>
                <p
                  className={`mt-1.5 text-xs leading-relaxed text-emerald-900/85 dark:text-emerald-100/85 ${isBangla ? 'font-bangla' : ''}`}
                >
                  {t('tracker.care.normalBody')}
                </p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 dark:border-red-900 dark:bg-red-950/30">
                <p
                  className={`flex items-center gap-1.5 text-sm font-bold text-red-900 dark:text-red-200 ${isBangla ? 'font-bangla' : ''}`}
                >
                  <Stethoscope className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {t('tracker.care.urgentTitle')}
                </p>
                <p
                  className={`mt-1.5 text-xs leading-relaxed text-red-900/85 dark:text-red-100/85 ${isBangla ? 'font-bangla' : ''}`}
                >
                  {t('tracker.care.urgentBody')}
                </p>
                <a
                  href="tel:16263"
                  className="btn-sm mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                >
                  <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                  16263
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <div className="card-padded">
          <h2
            className={`mb-6 text-2xl font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
          >
            {t('tracker.timeline')}
          </h2>

          {familyTimeline.length === 0 ? (
            <p
              className={`py-8 text-center text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
            >
              {language === 'en' ? 'No timeline events yet' : 'এখনো কোনো টাইমলাইন ইভেন্ট নেই'}
            </p>
          ) : (
            <div className="relative">
              <div className="absolute top-0 bottom-0 left-6 w-px bg-neutral-200 sm:left-7 dark:bg-neutral-800" />

              <div className="space-y-4">
                {familyTimeline.slice(0, 20).map((event, index) => (
                  <div
                    key={`${event.profileId}-${event.vaccineId}-${event.date}-${index}`}
                    className="relative flex gap-4 sm:gap-5"
                  >
                    <div className="relative z-10 shrink-0">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-xl border sm:h-14 sm:w-14 ${
                          event.status === 'completed'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300'
                            : event.status === 'overdue'
                              ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/70 dark:text-red-300'
                              : event.status === 'due-today'
                                ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/70 dark:text-amber-300'
                                : 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/70 dark:text-sky-300'
                        }`}
                      >
                        {event.status === 'completed' ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : event.status === 'overdue' ? (
                          <AlertCircle className="h-5 w-5" />
                        ) : (
                          <Clock className="h-5 w-5" />
                        )}
                      </div>
                    </div>

                    <div className="flex-1 rounded-xl border border-neutral-200/80 bg-neutral-50/60 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3
                            className={`text-sm font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
                          >
                            {event.doseLabel?.[language] ?? event.vaccineName[language]}
                            {event.scheduled === false && typeof event.doseNumber === 'number' && (
                              <span className="ml-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                                · {t('tracker.dose.number', event.doseNumber)}
                              </span>
                            )}
                            {event.scheduled === false && (
                              <span className="ml-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                                · {t('tracker.dose.offSchedule')}
                              </span>
                            )}
                          </h3>
                          <p
                            className={`mt-0.5 text-xs text-neutral-600 tabular-nums dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
                          >
                            {event.profileName} · {formatDate(event.date, language)}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-semibold ${
                            event.status === 'completed'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : event.status === 'overdue'
                                ? 'text-red-700 dark:text-red-400'
                                : event.status === 'due-today'
                                  ? 'text-amber-700 dark:text-amber-300'
                                  : 'text-sky-700 dark:text-sky-400'
                          }`}
                        >
                          {event.status === 'completed'
                            ? t('tracker.status.completed')
                            : event.status === 'overdue'
                              ? t('tracker.status.overdue')
                              : event.status === 'due-today'
                                ? t('tracker.status.dueToday')
                                : t('tracker.status.upcoming')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Growth & WHO View */}
      {viewMode === 'growth' && currentProfile && <ChildGrowthTracker profile={currentProfile} />}

      {/* Reminders View */}
      {viewMode === 'reminders' && currentProfile && (
        <div className="card-padded">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2
                className={`text-2xl font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
              >
                {t('tracker.reminders')} · {currentProfile.name}
              </h2>
            </div>
            <Link to="/reminders" className="btn-secondary btn-sm no-print">
              <Bell className="h-3.5 w-3.5" aria-hidden="true" />
              {t('nav.reminders')}
            </Link>
          </div>

          {memberReminders.length === 0 ? (
            <p
              className={`py-8 text-center text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
            >
              {t('tracker.status.noneDue')}
            </p>
          ) : (
            <ul className="space-y-2.5">
              {memberReminders.slice(0, 15).map((reminder) => (
                <li
                  key={reminder.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50/70 p-3.5 dark:border-neutral-800 dark:bg-neutral-800/40"
                >
                  <div>
                    <p
                      className={`font-semibold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
                    >
                      {reminder.doseLabel ? reminder.doseLabel[language] : reminder.vaccineId}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {formatDate(reminder.scheduledDate, language)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 no-print">
                    <span
                      className={`status-inline ${
                        reminder.reminderType === 'overdue'
                          ? 'text-red-700 dark:text-red-400'
                          : reminder.reminderType === 'on-due'
                            ? 'text-amber-700 dark:text-amber-300'
                            : 'text-sky-700 dark:text-sky-400'
                      }`}
                    >
                      {reminder.reminderType === 'overdue'
                        ? t('tracker.status.overdue')
                        : reminder.reminderType === 'on-due'
                          ? t('tracker.status.dueToday')
                          : t('tracker.status.upcoming')}
                    </span>
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={() => {
                        setViewMode('overview');
                        triggerPrefillRecord(reminder.vaccineId, reminder.doseNumber);
                      }}
                    >
                      {t('tracker.visit.recordThis')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Catch-Up View */}
      {viewMode === 'catchup' && currentProfile && (
        <div className="card-padded">
          <h2
            className={`mb-2 text-2xl font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
          >
            {t('tracker.catchUpTitle')}
          </h2>
          <p className={`mb-6 text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}>
            {t('tracker.catchUpSubtitle')}
          </p>

          {catchUpPlan.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-emerald-500" aria-hidden="true" />
              <p
                className={`text-lg text-emerald-700 dark:text-emerald-300 ${isBangla ? 'font-bangla' : ''}`}
              >
                {t('tracker.noCatchUp')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {catchUpPlan.map((plan, index) => (
                <div
                  key={`${plan.vaccineId}-${index}`}
                  className="rounded-xl border border-amber-300/90 bg-amber-50/50 p-5 dark:border-amber-800/80 dark:bg-amber-950/25"
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3
                        className={`mb-1 text-lg font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
                      >
                        {plan.vaccineName[language]}
                      </h3>
                      {plan.requiresMedicalAdvice && (
                        <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span className={`text-xs font-semibold ${isBangla ? 'font-bangla' : ''}`}>
                            {t('tracker.medicalAdvice')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <p
                    className={`mb-4 text-sm text-neutral-700 dark:text-neutral-200 ${isBangla ? 'font-bangla' : ''}`}
                  >
                    {plan.explanation[language]}
                  </p>

                  {/* Outstanding doses named by schedule milestone label */}
                  <ul className="mb-4 flex flex-wrap gap-2">
                    {plan.missedDoses.map((doseNumber, doseIndex) => (
                      <li
                        key={doseNumber}
                        className="chip bg-white text-amber-900 border border-amber-300 dark:bg-neutral-900 dark:text-amber-200 dark:border-amber-700"
                      >
                        {plan.missedDoseLabels[doseIndex]
                          ? plan.missedDoseLabels[doseIndex][language]
                          : `${plan.vaccineName[language]} · ${t('tracker.dose.number', doseNumber)}`}
                      </li>
                    ))}
                  </ul>

                  <div className="space-y-1 text-sm text-neutral-800 dark:text-neutral-200">
                    <p className={isBangla ? 'font-bangla' : ''}>
                      <span className="text-neutral-600 dark:text-neutral-400">
                        {t('tracker.catchUp.when')}
                      </span>{' '}
                      <span className="font-semibold">{t('tracker.catchUp.asap')}</span>
                    </p>
                    <p
                      className={`text-xs text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
                    >
                      {t('tracker.catchUp.noInterval')} ({plan.conflictIds.join(', ')})
                    </p>
                    {plan.olderAgeCaveat && (
                      <p
                        className={`mt-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
                      >
                        {t('tracker.catchUp.olderAgeNote')}
                      </p>
                    )}
                    {plan.requiresReview && (
                      <p
                        className={`mt-2 flex items-start gap-2 text-xs font-medium text-amber-800 dark:text-amber-200 ${isBangla ? 'font-bangla' : ''}`}
                      >
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        {t('tracker.catchUp.review')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Removing a member deletes their whole dose history: confirm it. */}
      <ConfirmDialog
        open={confirmDeleteProfile !== null}
        title={t('tracker.member.delete')}
        description={t(
          'tracker.member.deleteBody',
          profiles.find((entry) => entry.id === confirmDeleteProfile)?.name ?? '',
          profiles.find((entry) => entry.id === confirmDeleteProfile)?.events?.length ?? 0,
        )}
        confirmLabel={t('tracker.member.delete')}
        cancelLabel={t('tracker.cancel')}
        tone="danger"
        onConfirm={() => {
          if (confirmDeleteProfile) deleteProfile(confirmDeleteProfile);
        }}
        onCancel={() => setConfirmDeleteProfile(null)}
      />
    </div>
  );
}
