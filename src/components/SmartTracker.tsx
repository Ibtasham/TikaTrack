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
} from 'lucide-react';
import { ChildGrowthChart } from './ChildGrowthChart';
import { DoseHistory } from './DoseHistory';
import { DoseRecorder } from './DoseRecorder';
import { MemberActions } from './MemberActions';
import { ConfirmDialog } from './ui/ConfirmDialog';
import {
  generateCatchUpPlan,
  generateFamilyTimeline,
  generatePersonalizedSchedule,
  calculateVaccinationStats,
  milestoneDoseName,
} from '../lib/smartScheduler';
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
import { formatAge, formatDate, localiseNumber, todayISO } from '../lib/format';

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
  const { updateProfile } = useProfiles();

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

  // Active member statistics
  const stats = useMemo(
    () =>
      currentProfile
        ? calculateVaccinationStats(currentProfile.dateOfBirth, currentProfile)
        : {
            totalScheduled: 0,
            completed: 0,
            upcoming: 0,
            overdue: 0,
            dueToday: 0,
            progressPercentage: 0,
            dosesRecorded: 0,
            provisional: 0,
            needsReview: 0,
          },
    [currentProfile],
  );

  // Personalized schedule & next visit bundle for the active member
  const personalizedSchedule = useMemo(
    () =>
      currentProfile
        ? generatePersonalizedSchedule(currentProfile.dateOfBirth, currentProfile)
        : [],
    [currentProfile],
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
    () =>
      currentProfile ? generateCatchUpPlan(currentProfile.dateOfBirth, currentProfile) : [],
    [currentProfile],
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

  // Persist generated reminders when member or preferences change
  useEffect(() => {
    if (currentProfile && preferences.enabled) {
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
    if (!editDob || editDob > todayISO()) {
      toast.error(t('tracker.add.error.future-dob'));
      return;
    }
    updateProfile(editingProfileId, {
      name: trimmed,
      dateOfBirth: editDob,
      relationship: editRelationship,
      gender: editGender,
    });
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
    if (removed) toast.info(t('tracker.profileDeleted', removed.name));
  };

  const updatePreferences = (updates: Partial<ReminderPreferences>) => {
    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);
    saveReminderPreferences(newPreferences);
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
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
            aria-hidden="true"
          >
            <Users className="h-5 w-5" />
          </span>
          <h2 className={`text-xl font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}>
            {t('tracker.members.title')}
          </h2>
          {profiles.length > 0 && (
            <span className="badge-neutral tabular-nums">
              {localiseNumber(profiles.length, language)}
            </span>
          )}
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
                className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all cursor-pointer ${
                  active
                    ? 'border-emerald-500 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-500/20 dark:border-emerald-500 dark:bg-emerald-950/40'
                    : 'border-neutral-200 bg-white hover:border-emerald-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-emerald-700'
                }`}
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold ${
                    active
                      ? 'bg-emerald-600 text-white'
                      : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200'
                  }`}
                  aria-hidden="true"
                >
                  {member.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate font-semibold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
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
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-xs font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {localiseNumber(memberStats.progressPercentage, language)}%
                  </span>
                  {attentionCount > 0 && (
                    <span className="badge-overdue tabular-nums">
                      {localiseNumber(attentionCount, language)}
                    </span>
                  )}
                  {memberStats.needsReview > 0 && (
                    <span className="badge-due tabular-nums" title={t('tracker.dose.review.badge')}>
                      !
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
        <div className="flex flex-wrap gap-2 no-print">
          {(['overview', 'timeline', 'growth', 'reminders', 'catchup'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`rounded-xl px-4 py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                viewMode === mode
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'border border-neutral-200 bg-white text-neutral-700 hover:bg-emerald-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800'
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
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-2xl font-bold text-white shadow-md sm:h-20 sm:w-20 sm:text-3xl">
                  {currentProfile.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2
                      className={`text-2xl font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
                    >
                      {currentProfile.name}
                    </h2>
                    {currentProfile.relationship && (
                      <span className="badge-neutral">
                        {t(`tracker.relationship.${currentProfile.relationship}`)}
                      </span>
                    )}
                    {currentProfile.gender && (
                      <span className="badge-neutral">
                        {t(`tracker.gender.${currentProfile.gender}`)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                    {language === 'en' ? 'Born' : 'জন্ম'}:{' '}
                    {formatDate(currentProfile.dateOfBirth, language)} ·{' '}
                    {formatAge(currentProfile.dateOfBirth, language)}
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
            <div className="mb-4">
              <div className="mb-2 flex justify-between text-sm">
                <span
                  className={`text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
                >
                  {t('tracker.progress')}
                </span>
                <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {localiseNumber(stats.progressPercentage, language)}%
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-neutral-200 dark:bg-neutral-800">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                  style={{ width: `${stats.progressPercentage}%` }}
                />
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <div className="rounded-xl bg-emerald-50 p-4 text-center dark:bg-emerald-950/40">
                <CheckCircle2
                  className="mx-auto mb-2 h-7 w-7 text-emerald-600 dark:text-emerald-400"
                  aria-hidden="true"
                />
                <p className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                  {localiseNumber(stats.completed, language)}
                </p>
                <p
                  className={`text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 ${isBangla ? 'font-bangla' : ''}`}
                >
                  {t('tracker.completed')}
                </p>
              </div>
              <div className="rounded-xl bg-blue-50 p-4 text-center dark:bg-blue-950/40">
                <Clock
                  className="mx-auto mb-2 h-7 w-7 text-blue-600 dark:text-blue-400"
                  aria-hidden="true"
                />
                <p className="text-2xl font-bold tabular-nums text-blue-700 dark:text-blue-300">
                  {localiseNumber(stats.upcoming, language)}
                </p>
                <p
                  className={`text-xs sm:text-sm text-blue-700 dark:text-blue-300 ${isBangla ? 'font-bangla' : ''}`}
                >
                  {t('tracker.upcoming')}
                </p>
              </div>
              <div className="rounded-xl bg-red-50 p-4 text-center dark:bg-red-950/40">
                <AlertCircle
                  className="mx-auto mb-2 h-7 w-7 text-red-600 dark:text-red-400"
                  aria-hidden="true"
                />
                <p className="text-2xl font-bold tabular-nums text-red-700 dark:text-red-300">
                  {localiseNumber(stats.overdue, language)}
                </p>
                <p
                  className={`text-xs sm:text-sm text-red-700 dark:text-red-300 ${isBangla ? 'font-bangla' : ''}`}
                >
                  {t('tracker.overdue')}
                </p>
              </div>
            </div>

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
                        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                          <span>{formatDate(dose.scheduledDate, language)}</span>
                          <span
                            className={
                              dose.status === 'overdue'
                                ? 'badge-overdue'
                                : dose.status === 'due-today'
                                  ? 'badge-due'
                                  : 'badge-upcoming'
                            }
                          >
                            {dose.status === 'overdue'
                              ? t('tracker.status.overdue')
                              : dose.status === 'due-today'
                                ? t('tracker.status.dueToday')
                                : t('tracker.status.upcoming')}
                          </span>
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn-secondary btn-sm shrink-0 no-print"
                        onClick={() => triggerPrefillRecord(dose.vaccineId, dose.doseNumber)}
                      >
                        <ClipboardPlus className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{t('tracker.visit.recordThis')}</span>
                      </button>
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
                  {getAchievements(currentProfile).map((achievement, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-100 to-yellow-100 px-4 py-2 text-sm font-semibold text-amber-900 dark:from-amber-950/60 dark:to-yellow-950/50 dark:text-amber-200"
                    >
                      <span>{achievement.icon}</span>
                      <span className={isBangla ? 'font-bangla' : ''}>{achievement.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
              <div className="absolute top-0 bottom-0 left-7 w-0.5 bg-gradient-to-b from-emerald-500 via-teal-500 to-cyan-500 sm:left-8" />

              <div className="space-y-4">
                {familyTimeline.slice(0, 20).map((event, index) => (
                  <div
                    key={`${event.profileId}-${event.vaccineId}-${event.date}-${index}`}
                    className="relative flex gap-4 sm:gap-6 animate-slide-in-right"
                    style={{ animationDelay: `${index * 0.04}s` }}
                  >
                    <div className="relative z-10 shrink-0">
                      <div
                        className={`flex h-14 w-14 items-center justify-center rounded-full shadow-md sm:h-16 sm:w-16 ${
                          event.status === 'completed'
                            ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                            : event.status === 'overdue'
                              ? 'bg-gradient-to-br from-red-500 to-pink-600'
                              : event.status === 'due-today'
                                ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                                : 'bg-gradient-to-br from-blue-500 to-cyan-600'
                        }`}
                      >
                        {event.status === 'completed' ? (
                          <CheckCircle2 className="h-7 w-7 text-white" />
                        ) : event.status === 'overdue' ? (
                          <AlertCircle className="h-7 w-7 text-white" />
                        ) : (
                          <Clock className="h-7 w-7 text-white" />
                        )}
                      </div>
                    </div>

                    <div className="flex-1 rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4 dark:border-neutral-800 dark:bg-neutral-800/50">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3
                            className={`font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
                          >
                            {event.doseLabel?.[language] ?? event.vaccineName[language]}
                            {event.scheduled === false && typeof event.doseNumber === 'number' && (
                              <span className="ml-1 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                                · {t('tracker.dose.number', event.doseNumber)}
                              </span>
                            )}
                            {event.scheduled === false && (
                              <span className="badge badge-neutral ml-2 align-middle">
                                {t('tracker.dose.offSchedule')}
                              </span>
                            )}
                          </h3>
                          <p
                            className={`text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
                          >
                            {event.profileName} • {formatDate(event.date, language)}
                          </p>
                        </div>
                        <span
                          className={
                            event.status === 'completed'
                              ? 'badge-done'
                              : event.status === 'overdue'
                                ? 'badge-overdue'
                                : event.status === 'due-today'
                                  ? 'badge-due'
                                  : 'badge-upcoming'
                          }
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
      {viewMode === 'growth' && currentProfile && <ChildGrowthChart profile={currentProfile} />}

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
                  <div className="flex items-center gap-2 no-print">
                    <span
                      className={
                        reminder.reminderType === 'overdue'
                          ? 'badge-overdue'
                          : reminder.reminderType === 'on-due'
                            ? 'badge-due'
                            : 'badge-upcoming'
                      }
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
                  className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/30"
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3
                        className={`mb-1 text-xl font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
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
                      {t('tracker.catchUp.noInterval')}
                    </p>
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
