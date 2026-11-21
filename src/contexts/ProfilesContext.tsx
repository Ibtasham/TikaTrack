import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { DoseRecord, Profile } from '../types';
import {
  addGrowthMeasurement as addGrowthMeasurementIn,
  createProfile,
  doseHistory,
  mergeImport,
  normaliseProfiles,
  recordDose as recordDoseIn,
  recordDoseEvent as recordDoseEventIn,
  removeDose as removeDoseIn,
  removeDoseEvent as removeDoseEventIn,
  removeGrowthMeasurement as removeGrowthMeasurementIn,
  removeVaccineHistory as removeVaccineHistoryIn,
  resolveDoseReview as resolveDoseReviewIn,
  reviewQueue,
  updateDoseEvent as updateDoseEventIn,
  updateGrowthMeasurement as updateGrowthMeasurementIn,
  type AddGrowthResult,
  type NewProfileInput,
  type CreateProfileResult,
  type ImportResult,
  type RecordDoseResult,
} from '../lib/profileStore';
import type { DoseEventPatch, DoseHistory, NewDoseEventInput } from '../lib/doseLedger';
import type { NewGrowthInput } from '../lib/whoGrowth';
import {
  LEGACY_STORAGE_KEYS,
  readJSON,
  readJSONWithLegacy,
  STORAGE_KEYS,
  STORAGE_PREFIX,
  writeJSON,
} from '../lib/storage';
import {
  MAX_FIRESTORE_ARRAY_ITEMS,
  mergeCloudAndLocalProfiles,
} from '../lib/cloudProfileMapper';
import { useOptionalAuth } from './AuthContext';
import {
  deleteProfileFromCloudSql,
  deleteProfileFromFirestore,
  fetchFirestoreProfiles,
  pushProfilesToCloudSql,
  pushProfilesToFirestore,
  subscribeFirestoreProfiles,
  syncSessionWithCloudSql,
} from '../services/cloudSync';
import { syncWebPushSchedule } from '../lib/pushClient';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

const DELETED_TOMBSTONES_KEY = `${STORAGE_PREFIX}deleted-profiles`;

function loadTombstones(): string[] {
  const raw = readJSON<unknown>(DELETED_TOMBSTONES_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === 'string' && v.length > 0).slice(-200);
}

function saveTombstones(ids: string[]): void {
  writeJSON(DELETED_TOMBSTONES_KEY, [...new Set(ids)].slice(-200));
}

interface ProfilesContextValue {
  profiles: Profile[];
  /** `false` until the first read from storage has completed. */
  ready: boolean;
  /** `false` when localStorage is unavailable (private mode) — data is in-memory only. */
  persistent: boolean;
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  storageWarning: string | null;
  syncNow: () => Promise<void>;
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
  /** Append one validated height/weight measurement to a member's growth log. */
  addGrowthMeasurement: (profileId: string, input: NewGrowthInput) => AddGrowthResult;
  /** Correct an existing height/weight measurement by id. */
  updateGrowthMeasurement: (
    profileId: string,
    measurementId: string,
    input: NewGrowthInput,
  ) => AddGrowthResult;
  /** Remove one height/weight measurement by id. */
  removeGrowthMeasurement: (profileId: string, measurementId: string) => void;
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
  const auth = useOptionalAuth();
  const firebaseUser = auth?.firebaseUser ?? null;
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [ready, setReady] = useState(false);
  const [persistent, setPersistent] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const profilesRef = useRef<Profile[]>(profiles);
  profilesRef.current = profiles;

  const suppressPushRef = useRef(false);
  const pushTimerRef = useRef<number | null>(null);
  const tombstonesRef = useRef<string[]>(loadTombstones());
  const knownCloudIdsRef = useRef<Set<string>>(new Set());

  const storageWarning = useMemo(() => {
    const overloaded = profiles.find(
      (p) =>
        (p.events?.length ?? 0) > MAX_FIRESTORE_ARRAY_ITEMS ||
        (p.growth?.length ?? 0) > MAX_FIRESTORE_ARRAY_ITEMS,
    );
    return overloaded
      ? `${overloaded.name} has exceeded the ${MAX_FIRESTORE_ARRAY_ITEMS}-entry cloud sync limit per record.`
      : null;
  }, [profiles]);

  // Hydrate once, migrating the v1 key and any 2.x profile shape if needed.
  useEffect(() => {
    const stored = readJSONWithLegacy<unknown>(
      STORAGE_KEYS.profiles,
      LEGACY_STORAGE_KEYS.profiles,
      null,
    );
    const loaded = stored === null ? [] : normaliseProfiles(stored);
    const tombstones = new Set(tombstonesRef.current);
    const filtered = tombstones.size > 0 ? loaded.filter((p) => !tombstones.has(p.id)) : loaded;
    profilesRef.current = filtered;
    setProfiles(filtered);
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
      if (event.key === DELETED_TOMBSTONES_KEY) {
        tombstonesRef.current = loadTombstones();
        const deleted = new Set(tombstonesRef.current);
        setProfiles((current) => {
          const next = current.filter((p) => !deleted.has(p.id));
          profilesRef.current = next;
          return next;
        });
        return;
      }
      if (event.key !== STORAGE_KEYS.profiles && event.key !== LEGACY_STORAGE_KEYS.profiles) return;
      const next = normaliseProfiles(event.newValue ? safeParse(event.newValue) : []);
      profilesRef.current = next;
      setProfiles(next);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const syncNow = useCallback(async () => {
    if (!firebaseUser || import.meta.env.MODE === 'test') return;
    setSyncStatus('syncing');
    try {
      const tombstones = tombstonesRef.current;
      const [sqlRes, fsProfiles] = await Promise.all([
        syncSessionWithCloudSql(firebaseUser, profilesRef.current, tombstones),
        fetchFirestoreProfiles(firebaseUser.uid).catch(() => [] as Profile[]),
      ]);

      // Delete tombstoned docs remotely if still lingering in Firestore
      if (tombstones.length > 0 && fsProfiles.length > 0) {
        const fsIds = new Set(fsProfiles.map((p) => p.id));
        await Promise.all(
          tombstones
            .filter((id) => fsIds.has(id))
            .map((id) => deleteProfileFromFirestore(firebaseUser.uid, id).catch(() => undefined)),
        );
      }

      const combined = mergeCloudAndLocalProfiles(sqlRes.profiles, fsProfiles, tombstones);
      knownCloudIdsRef.current = new Set(combined.map((p) => p.id));
      suppressPushRef.current = true;
      profilesRef.current = combined;
      setProfiles(combined);
      await Promise.all([
        pushProfilesToCloudSql(firebaseUser, combined),
        pushProfilesToFirestore(firebaseUser.uid, combined),
      ]);

      // Clear tombstones that are confirmed absent from both remote sources
      const sqlIds = new Set(sqlRes.profiles.map((p) => p.id));
      const fsIdsAfter = new Set(fsProfiles.map((p) => p.id));
      const remainingTombstones = tombstones.filter((id) => sqlIds.has(id) || fsIdsAfter.has(id));
      tombstonesRef.current = remainingTombstones;
      saveTombstones(remainingTombstones);

      setLastSyncedAt(new Date().toISOString());
      setSyncStatus('synced');
    } catch (error) {
      console.error('Cloud sync failed:', error);
      setSyncStatus('error');
    } finally {
      window.setTimeout(() => {
        suppressPushRef.current = false;
      }, 250);
    }
  }, [firebaseUser]);

  // Initial merge + realtime Firestore listener when signed in with Google/Firebase.
  useEffect(() => {
    if (!ready || !firebaseUser || import.meta.env.MODE === 'test') {
      if (!firebaseUser) {
        knownCloudIdsRef.current = new Set();
        setSyncStatus('idle');
      }
      return;
    }

    let cancelled = false;
    void syncNow();

    const unsubscribe = subscribeFirestoreProfiles(
      firebaseUser.uid,
      (remoteProfiles) => {
        if (cancelled) return;
        const remoteIds = new Set(remoteProfiles.map((p) => p.id));
        const deletedRemotely = [...knownCloudIdsRef.current].filter((id) => !remoteIds.has(id));
        knownCloudIdsRef.current = remoteIds;

        if (deletedRemotely.length > 0) {
          tombstonesRef.current = [...new Set([...tombstonesRef.current, ...deletedRemotely])].slice(-200);
          saveTombstones(tombstonesRef.current);
        }

        const merged = mergeCloudAndLocalProfiles(
          profilesRef.current,
          remoteProfiles,
          tombstonesRef.current,
        );
        if (JSON.stringify(merged) !== JSON.stringify(profilesRef.current)) {
          suppressPushRef.current = true;
          profilesRef.current = merged;
          setProfiles(merged);
          window.setTimeout(() => {
            suppressPushRef.current = false;
          }, 250);
        }
      },
      () => {
        /* non-fatal listener error */
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [firebaseUser, ready, syncNow]);

  // Debounced background push to Cloud SQL + Firestore whenever local profiles mutate while authenticated.
  useEffect(() => {
    if (!ready || !firebaseUser || suppressPushRef.current || import.meta.env.MODE === 'test') {
      return;
    }
    if (pushTimerRef.current !== null) {
      window.clearTimeout(pushTimerRef.current);
    }
    pushTimerRef.current = window.setTimeout(() => {
      setSyncStatus('syncing');
      void Promise.all([
        pushProfilesToCloudSql(firebaseUser, profiles),
        pushProfilesToFirestore(firebaseUser.uid, profiles),
      ])
        .then(() => {
          setLastSyncedAt(new Date().toISOString());
          setSyncStatus('synced');
        })
        .catch(() => {
          setSyncStatus('error');
        });
    }, 650);

    return () => {
      if (pushTimerRef.current !== null) {
        window.clearTimeout(pushTimerRef.current);
      }
    };
  }, [profiles, ready, firebaseUser]);

  // Keep active Web Push 48-hour reminder queue synced when family records change.
  useEffect(() => {
    if (!ready || import.meta.env.MODE === 'test') return;
    const timer = window.setTimeout(() => {
      const lang = localStorage.getItem(STORAGE_KEYS.language) === 'bn' ? 'bn' : 'en';
      void syncWebPushSchedule({
        profiles,
        language: lang,
        firebaseUser,
      });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [profiles, ready, firebaseUser]);

  const addProfile = useCallback((input: NewProfileInput): CreateProfileResult => {
    const result = createProfile(input);
    if (result.profile) {
      const created = result.profile;
      const next = [...profilesRef.current, created];
      profilesRef.current = next;
      setProfiles(next);
    }
    return result;
  }, []);

  const updateProfile = useCallback(
    (id: string, patch: Partial<Omit<Profile, 'id' | 'records' | 'events'>>) => {
      const next = profilesRef.current.map((profile) =>
        profile.id === id
          ? { ...profile, ...patch, updatedAt: new Date().toISOString() }
          : profile,
      );
      profilesRef.current = next;
      setProfiles(next);
    },
    [],
  );

  const deleteProfile = useCallback(
    (id: string) => {
      tombstonesRef.current = [...new Set([...tombstonesRef.current, id])].slice(-200);
      saveTombstones(tombstonesRef.current);
      knownCloudIdsRef.current.delete(id);
      const next = profilesRef.current.filter((profile) => profile.id !== id);
      profilesRef.current = next;
      setProfiles(next);
      if (firebaseUser && import.meta.env.MODE !== 'test') {
        void Promise.all([
          deleteProfileFromCloudSql(firebaseUser, id),
          deleteProfileFromFirestore(firebaseUser.uid, id),
        ]).catch(() => {
          /* non-fatal background deletion */
        });
      }
    },
    [firebaseUser],
  );

  const recordDoseEvent = useCallback(
    (profileId: string, input: NewDoseEventInput): RecordDoseResult => {
      const result = recordDoseEventIn(profilesRef.current, profileId, input);
      if (!result.error) {
        profilesRef.current = result.profiles;
        setProfiles(result.profiles);
      }
      return result;
    },
    [],
  );

  const recordDose = useCallback((profileId: string, vaccineId: string, dose: DoseRecord) => {
    const next = recordDoseIn(profilesRef.current, profileId, vaccineId, dose);
    profilesRef.current = next;
    setProfiles(next);
  }, []);

  const updateDoseEvent = useCallback(
    (profileId: string, eventId: string, patch: DoseEventPatch) => {
      const next = updateDoseEventIn(profilesRef.current, profileId, eventId, patch);
      profilesRef.current = next;
      setProfiles(next);
    },
    [],
  );

  const resolveDoseReview = useCallback(
    (profileId: string, eventId: string, doseNumber: number | null) => {
      const next = resolveDoseReviewIn(profilesRef.current, profileId, eventId, doseNumber);
      profilesRef.current = next;
      setProfiles(next);
    },
    [],
  );

  const removeDoseEvent = useCallback((profileId: string, eventId: string) => {
    const next = removeDoseEventIn(profilesRef.current, profileId, eventId);
    profilesRef.current = next;
    setProfiles(next);
  }, []);

  const removeDose = useCallback((profileId: string, vaccineId: string, eventId: string) => {
    const next = removeDoseIn(profilesRef.current, profileId, vaccineId, eventId);
    profilesRef.current = next;
    setProfiles(next);
  }, []);

  const removeVaccineHistory = useCallback((profileId: string, vaccineId: string) => {
    const next = removeVaccineHistoryIn(profilesRef.current, profileId, vaccineId);
    profilesRef.current = next;
    setProfiles(next);
  }, []);

  const addGrowthMeasurement = useCallback((profileId: string, input: NewGrowthInput): AddGrowthResult => {
    const result = addGrowthMeasurementIn(profilesRef.current, profileId, input);
    if (!result.error) {
      profilesRef.current = result.profiles;
      setProfiles(result.profiles);
    }
    return result;
  }, []);

  const updateGrowthMeasurement = useCallback(
    (profileId: string, measurementId: string, input: NewGrowthInput): AddGrowthResult => {
      const result = updateGrowthMeasurementIn(
        profilesRef.current,
        profileId,
        measurementId,
        input,
      );
      if (!result.error) {
        profilesRef.current = result.profiles;
        setProfiles(result.profiles);
      }
      return result;
    },
    [],
  );

  const removeGrowthMeasurement = useCallback((profileId: string, measurementId: string) => {
    const next = removeGrowthMeasurementIn(profilesRef.current, profileId, measurementId);
    profilesRef.current = next;
    setProfiles(next);
  }, []);

  const replaceAll = useCallback((nextRaw: Profile[]) => {
    const prevIds = new Set(profilesRef.current.map((p) => p.id));
    const next = normaliseProfiles(nextRaw);
    const nextIds = new Set(next.map((p) => p.id));
    const dropped = [...prevIds].filter((id) => !nextIds.has(id));
    if (dropped.length > 0) {
      tombstonesRef.current = [...new Set([...tombstonesRef.current, ...dropped])].slice(-200);
      saveTombstones(tombstonesRef.current);
    }
    profilesRef.current = next;
    setProfiles(next);
  }, []);

  const importJSON = useCallback((raw: string) => {
    const result = mergeImport(profilesRef.current, raw);
    if (result.ok) {
      const importedIds = new Set(result.profiles.map((p) => p.id));
      if (tombstonesRef.current.length > 0) {
        tombstonesRef.current = tombstonesRef.current.filter((id) => !importedIds.has(id));
        saveTombstones(tombstonesRef.current);
      }
      profilesRef.current = result.profiles;
      setProfiles(result.profiles);
    }
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
      syncStatus,
      lastSyncedAt,
      storageWarning,
      syncNow,
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
      addGrowthMeasurement,
      updateGrowthMeasurement,
      removeGrowthMeasurement,
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
      syncStatus,
      lastSyncedAt,
      storageWarning,
      syncNow,
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
      addGrowthMeasurement,
      updateGrowthMeasurement,
      removeGrowthMeasurement,
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
