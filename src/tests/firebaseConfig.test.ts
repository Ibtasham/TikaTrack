import { describe, expect, it } from 'vitest';

import bundledConfig from '../../firebase-applet-config.json';
import { resolveFirebaseConfig } from '../lib/firebase';

describe('resolveFirebaseConfig', () => {
  it('falls back to firebase-applet-config.json when VITE_FIREBASE_* overrides are absent', () => {
    const setup = resolveFirebaseConfig({});
    expect(setup.source).toBe('bundled');
    expect(setup.options.projectId).toBe(bundledConfig.projectId);
    expect(setup.options.authDomain).toBe(bundledConfig.authDomain);
    const expectedDb =
      bundledConfig.firestoreDatabaseId && bundledConfig.firestoreDatabaseId !== '(default)'
        ? bundledConfig.firestoreDatabaseId
        : undefined;
    expect(setup.firestoreDatabaseId).toBe(expectedDb);
    expect(setup.options.projectId).toBe('tikatrack-7680c');
  });

  it('ignores partial overrides so credentials from different projects are never mixed', () => {
    const onlyProject = resolveFirebaseConfig({ VITE_FIREBASE_PROJECT_ID: 'tikatrack-7680c' });
    expect(onlyProject.source).toBe('bundled');
    expect(onlyProject.options.projectId).toBe(bundledConfig.projectId);

    const onlyKey = resolveFirebaseConfig({ VITE_FIREBASE_API_KEY: 'AIzaSyTestOnlyKey' });
    expect(onlyKey.source).toBe('bundled');
    expect(onlyKey.options.apiKey).toBe(bundledConfig.apiKey);
  });

  it('switches to the overridden project and defaults Firestore to (default) when database ID is omitted', () => {
    const setup = resolveFirebaseConfig({
      VITE_FIREBASE_API_KEY: 'AIzaSyTestCustomKey',
      VITE_FIREBASE_PROJECT_ID: 'tikatrack-7680c',
      VITE_FIREBASE_APP_ID: '1:123456:web:abcdef',
    });

    expect(setup.source).toBe('env');
    expect(setup.options).toMatchObject({
      apiKey: 'AIzaSyTestCustomKey',
      projectId: 'tikatrack-7680c',
      authDomain: 'tikatrack-7680c.firebaseapp.com',
      storageBucket: 'tikatrack-7680c.firebasestorage.app',
      appId: '1:123456:web:abcdef',
    });
    expect(setup.firestoreDatabaseId).toBeUndefined();
  });

  it('honors explicit authDomain, storageBucket, senderId, and custom database ID', () => {
    const setup = resolveFirebaseConfig({
      VITE_FIREBASE_API_KEY: 'AIzaSyTestCustomKey',
      VITE_FIREBASE_AUTH_DOMAIN: 'custom-auth.example.com',
      VITE_FIREBASE_PROJECT_ID: 'tikatrack-7680c',
      VITE_FIREBASE_STORAGE_BUCKET: 'tikatrack-7680c.appspot.com',
      VITE_FIREBASE_MESSAGING_SENDER_ID: '99887766',
      VITE_FIREBASE_APP_ID: '1:99887766:web:xyz',
      VITE_FIREBASE_DATABASE_ID: '(default)',
    });

    expect(setup.source).toBe('env');
    expect(setup.options).toMatchObject({
      authDomain: 'custom-auth.example.com',
      storageBucket: 'tikatrack-7680c.appspot.com',
      messagingSenderId: '99887766',
    });
    expect(setup.firestoreDatabaseId).toBeUndefined();

    const namedDb = resolveFirebaseConfig({
      VITE_FIREBASE_API_KEY: 'AIzaSyTestCustomKey',
      VITE_FIREBASE_PROJECT_ID: 'tikatrack-7680c',
      VITE_FIREBASE_DATABASE_ID: 'custom-db',
    });
    expect(namedDb.firestoreDatabaseId).toBe('custom-db');
  });
});
