import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { DoseRecord, Profile } from '../types';
import {
  createProfile,
  doseHistory,
  mergeImport,
  normaliseProfiles,
  recordDose as recordDoseIn,
  recordDoseEvent as recordDoseEventIn,
  removeDose as removeDoseIn,
  removeDoseEvent as removeDoseEventIn,
  removeVaccineHistory as removeVaccineHistoryIn,
  resolveDoseReview as resolveDoseReviewIn,
  reviewQueue,
  updateDoseEvent as updateDoseEventIn,
  type NewProfileInput,
  type CreateProfileResult,
  type ImportResult,
  type RecordDoseResult,
} from '../lib/profileStore';
import type { DoseEventPatch, DoseHistory, NewDoseEventInput } from '../lib/doseLedger';
import { LEGACY_STORAGE_KEYS, readJSONWithLegacy, STORAGE_KEYS, writeJSON } from '../lib/storage';

interface ProfilesContextValue {
  profiles: Profile[];
  /** `false` until the first read from storage has completed. */
  ready: boolean;
  /** `false` when localStorage is unavailable (private mode) — data is in-memory only. */
  persistent: boolean;
  addProfile: (input: NewProfileInput) => CreateProfileResult;
  updateProfile: (id: string, patch: Partial<Omit<Profile, 'id' | 'records' | 'events'>>) => void;
  deleteProfile: (id: string) => void;
  /**
   * Append one administered dose. Every call adds a **new** event: recording a
   * second dose of the same vaccine never overwrites the first.
   */
  recordDoseEvent: (profileId: string, input: NewDoseEventInput) => RecordDoseResult;
  /** 2.x-shaped convenience wrapper over {@link recordDoseEvent}. */
  recordDose: (profileId: string, vaccineId: string, dose: DoseRecord) => void;
  /** Correct one dose (date, dose number, centre, batch, notes…). */
  updateDoseEvent: (profileId: string, eventId: string, patch: DoseEventPatch) => void;
  /** Confirm which dose an ambiguous record was — clears its review flag. */
  resolveDoseReview: (profileId: string, eventId: string, doseNumber: number | null) => void;
  /** Delete one dose. The vaccine's other doses stay. */
  removeDoseEvent: (profileId: string, eventId: string) => void;
  /** Delete one dose, scoped by vaccine so a stale id cannot hit another series. */
  removeDose: (profileId: string, vaccineId: string, eventId: string) => void;
  /** Delete every dose of one vaccine. Distinct, and confirmed separately. */
  removeVaccineHistory: (profileId: string, vaccineId: string) => void;
  replaceAll: (next: Profile[]) => void;
  importJSON: (raw: string) => ImportResult;
  getProfile: (id: string | null | undefined) => Profile | undefined;
  /** Per-vaccine dose state for one profile, straight from the ledger. */
  historyFor: (profile: Profile | undefined | null) => DoseHistory;
  /** Doses across every member that a human should confirm. */
  needsReview: Array<{ profile: Profile; count: number }>;
}

const ProfilesContext = createContext<ProfilesContextValue | null>(null);

export function ProfilesProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [ready, setReady] = useState(false);
  const [persistent, setPersistent] = useState(true);

  // Hydrate once, migrating the v1 key and any 2.x profile shape if needed.
  useEffect(() => {
    const stored = readJSONWithLegacy<unknown>(
      STORAGE_KEYS.profiles,
      LEGACY_STORAGE_KEYS.profiles,
      null,
    );
    setProfiles(stored === null ? [] : normaliseProfiles(stored));
    setReady(true);
  }, []);

  // Persist on every change (after hydration).
  useEffect(() => {
    if (!ready) return;
    const ok = writeJSON(STORAGE_KEYS.profiles, profiles);
    setPersistent(ok);
  }, [profiles, ready]);

  // Keep multiple tabs in sync.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEYS.profiles && event.key !== LEGACY_STORAGE_KEYS.profiles) return;
      setProfiles(normaliseProfiles(event.newValue ? safeParse(event.newValue) : []));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const addProfile = useCallback((input: NewProfileInput): CreateProfileResult => {
    const result = createProfile(input);
    if (result.profile) {
      const created = result.profile;
      setProfiles((current) => [...current, created]);
    }
    return result;
  }, []);

  const updateProfile = useCallback(
    (id: string, patch: Partial<Omit<Profile, 'id' | 'records' | 'events'>>) => {
      setProfiles((current) =>
        current.map((profile) =>
          profile.id === id
            ? { ...profile, ...patch, updatedAt: new Date().toISOString() }
            : profile,
        ),
      );
    },
    [],
  );

  const deleteProfile = useCallback((id: string) => {
    setProfiles((current) => current.filter((profile) => profile.id !== id));
  }, []);

  const recordDoseEvent = useCallback(
    (profileId: string, input: NewDoseEventInput): RecordDoseResult => {
      let result: RecordDoseResult = { profiles: [], error: 'missing-vaccine' };
      setProfiles((current) => {
        result = recordDoseEventIn(current, profileId, input);
        return result.error ? current : result.profiles;
      });
      return result;
    },
    [],
  );

  const recordDose = useCallback((profileId: string, vaccineId: string, dose: DoseRecord) => {
    setProfiles((current) => recordDoseIn(current, profileId, vaccineId, dose));
  }, []);

  const updateDoseEvent = useCallback(
    (profileId: string, eventId: string, patch: DoseEventPatch) => {
      setProfiles((current) => updateDoseEventIn(current, profileId, eventId, patch));
    },
    [],
  );

  const resolveDoseReview = useCallback(
    (profileId: string, eventId: string, doseNumber: number | null) => {
      setProfiles((current) => resolveDoseReviewIn(current, profileId, eventId, doseNumber));
    },
    [],
  );

  const removeDoseEvent = useCallback((profileId: string, eventId: string) => {
    setProfiles((current) => removeDoseEventIn(current, profileId, eventId));
  }, []);

  const removeDose = useCallback((profileId: string, vaccineId: string, eventId: string) => {
    setProfiles((current) => removeDoseIn(current, profileId, vaccineId, eventId));
  }, []);

  const removeVaccineHistory = useCallback((profileId: string, vaccineId: string) => {
    setProfiles((current) => removeVaccineHistoryIn(current, profileId, vaccineId));
  }, []);

  const replaceAll = useCallback((next: Profile[]) => {
    setProfiles(normaliseProfiles(next));
  }, []);

  const importJSON = useCallback((raw: string) => {
    let result: ImportResult = { ok: false, reason: 'unparseable' };
    setProfiles((current) => {
      result = mergeImport(current, raw);
      return result.ok ? result.profiles : current;
    });
    // `result` is assigned synchronously by the updater above.
    return result;
  }, []);

  const getProfile = useCallback(
    (id: string | null | undefined) => profiles.find((profile) => profile.id === id),
    [profiles],
  );

  const historyFor = useCallback((profile: Profile | undefined | null) => doseHistory(profile), []);

  const needsReview = useMemo(
    () => reviewQueue(profiles).map(({ profile, events }) => ({ profile, count: events.length })),
    [profiles],
  );

  const value = useMemo<ProfilesContextValue>(
    () => ({
      profiles,
      ready,
      persistent,
      addProfile,
      updateProfile,
      deleteProfile,
      recordDoseEvent,
      recordDose,
      updateDoseEvent,
      resolveDoseReview,
      removeDoseEvent,
      removeDose,
      removeVaccineHistory,
      replaceAll,
      importJSON,
      getProfile,
      historyFor,
      needsReview,
    }),
    [
      profiles,
      ready,
      persistent,
      addProfile,
      updateProfile,
      deleteProfile,
      recordDoseEvent,
      recordDose,
      updateDoseEvent,
      resolveDoseReview,
      removeDoseEvent,
      removeDose,
      removeVaccineHistory,
      replaceAll,
      importJSON,
      getProfile,
      historyFor,
      needsReview,
    ],
  );

  return <ProfilesContext.Provider value={value}>{children}</ProfilesContext.Provider>;
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function useProfiles(): ProfilesContextValue {
  const context = useContext(ProfilesContext);
  if (!context) {
    throw new Error('useProfiles must be used inside <ProfilesProvider>');
  }
  return context;
}
