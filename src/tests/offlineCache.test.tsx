import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FamilyDashboard } from '../components/FamilyDashboard';
import { ProfilesProvider, useProfiles } from '../contexts/ProfilesContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { I18nProvider } from '../i18n';
import { LANGUAGE_STORAGE_KEY } from '../i18n/storage';
import {
  getOfflineCacheStatus,
  readCachedEpiScheduleFromServiceWorker,
  readCachedProfilesFromServiceWorker,
  syncProfilesToServiceWorker,
  syncScheduleToServiceWorker,
} from '../lib/offlineCache';
import { createProfile, recordDose } from '../lib/profileStore';

function installFakeCaches() {
  const store = new Map<string, Map<string, Response>>();

  const fakeCaches = {
    async open(name: string) {
      let bucket = store.get(name);
      if (!bucket) {
        bucket = new Map<string, Response>();
        store.set(name, bucket);
      }
      return {
        async put(req: RequestInfo | URL, res: Response) {
          const key = typeof req === 'string' ? req : req instanceof URL ? req.href : req.url;
          bucket!.set(key, res.clone());
        },
        async match(req: RequestInfo | URL) {
          const key = typeof req === 'string' ? req : req instanceof URL ? req.href : req.url;
          const hit = bucket!.get(key);
          return hit ? hit.clone() : undefined;
        },
      };
    },
    async match(req: RequestInfo | URL) {
      const key = typeof req === 'string' ? req : req instanceof URL ? req.href : req.url;
      for (const bucket of store.values()) {
        const hit = bucket.get(key);
        if (hit) return hit.clone();
      }
      return undefined;
    },
    async keys() {
      return [...store.keys()];
    },
    async delete(name: string) {
      return store.delete(name);
    },
  };

  Object.defineProperty(globalThis, 'caches', {
    value: fakeCaches,
    configurable: true,
    writable: true,
  });

  return store;
}

function DashboardHarness() {
  const { profiles, ready } = useProfiles();
  if (!ready) return <div>Loading...</div>;
  return <FamilyDashboard profiles={profiles} />;
}

describe('offlineCache Service Worker bridge & offline dashboard', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
    installFakeCaches();
  });

  afterEach(() => {
    delete (globalThis as { caches?: unknown }).caches;
    delete (navigator as { serviceWorker?: unknown }).serviceWorker;
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  it('caches national EPI schedule and user profiles into Service Worker Cache Storage and notifies active controller', async () => {
    const postMessage = vi.fn();
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        controller: { postMessage },
      },
      configurable: true,
      writable: true,
    });

    const created = createProfile({
      name: 'Zara Karim',
      dateOfBirth: '2026-01-10',
      relationship: 'child',
      gender: 'female',
    });
    if (!created.profile) throw new Error('Profile creation failed');
    const profiles = recordDose([created.profile], created.profile.id, 'bcg', {
      date: '2026-01-10',
      doseNumber: 1,
    });

    await expect(syncScheduleToServiceWorker()).resolves.toBe(true);
    await expect(syncProfilesToServiceWorker(profiles)).resolves.toBe(true);

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'CACHE_EPI_SCHEDULE' }),
    );
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'CACHE_PROFILES', profiles }),
    );

    const scheduleCached = await readCachedEpiScheduleFromServiceWorker();
    expect(scheduleCached?.milestones.length).toBeGreaterThanOrEqual(6);
    expect(scheduleCached?.vaccines.length).toBeGreaterThan(5);

    const profilesCached = await readCachedProfilesFromServiceWorker();
    expect(profilesCached?.count).toBe(1);
    expect(profilesCached?.profiles[0].name).toBe('Zara Karim');

    const status = await getOfflineCacheStatus();
    expect(status.scheduleCached).toBe(true);
    expect(status.profilesCached).toBe(true);
    expect(status.cachedProfileCount).toBe(1);
  });

  it('hydrates ProfilesProvider from Service Worker cache and renders FamilyDashboard when offline with empty localStorage', async () => {
    const created = createProfile({
      name: 'Tariq Hasan',
      dateOfBirth: '2026-02-01',
      relationship: 'child',
      gender: 'male',
    });
    if (!created.profile) throw new Error('Profile creation failed');
    const seeded = recordDose([created.profile], created.profile.id, 'bcg', {
      date: '2026-02-01',
      doseNumber: 1,
    });

    // Seed Service Worker Cache Storage, then clear localStorage and go offline.
    await syncScheduleToServiceWorker();
    await syncProfilesToServiceWorker(seeded);
    localStorage.clear();
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');

    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
    });

    render(
      <MemoryRouter>
        <ThemeProvider>
          <I18nProvider>
            <ProfilesProvider>
              <DashboardHarness />
            </ProfilesProvider>
          </I18nProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('Tariq Hasan').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('Vaccination progress over time')).toBeTruthy();
  });
});
