import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';

import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  fromFirestoreFamilyProfileDoc,
  isValidFirestoreDocId,
  mergeCloudAndLocalProfiles,
  toFirestoreFamilyProfilePayload,
} from '../lib/cloudProfileMapper';
import { createId } from '../lib/id';
import type { Profile } from '../types';

export interface CloudSyncSessionResult {
  profiles: Profile[];
  syncedAt: string;
}

async function getIdToken(firebaseUser: FirebaseUser): Promise<string> {
  return firebaseUser.getIdToken();
}

export async function ensureFirebaseAccountDocs(
  firebaseUser: FirebaseUser,
  languagePreference: 'en' | 'bn' = 'en',
): Promise<void> {
  const uid = firebaseUser.uid;
  const displayName =
    (firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Family Member')
      .trim()
      .slice(0, 120);
  const email = (firebaseUser.email || `${uid}@firebase.user`).trim().slice(0, 254);

  const privatePath = `users/${uid}/private/account`;
  const publicPath = `users/${uid}/public/profile`;

  try {
    const privateRef = doc(db, 'users', uid, 'private', 'account');
    const privateSnap = await getDoc(privateRef);
    if (!privateSnap.exists()) {
      await setDoc(privateRef, {
        ownerUid: uid,
        email,
        displayName,
        languagePreference,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(privateRef, {
        email,
        displayName,
        languagePreference,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, privatePath);
  }

  try {
    const publicRef = doc(db, 'users', uid, 'public', 'profile');
    const publicSnap = await getDoc(publicRef);
    if (!publicSnap.exists()) {
      await setDoc(publicRef, {
        ownerUid: uid,
        displayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(publicRef, {
        displayName,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, publicPath);
  }
}

export async function syncSessionWithCloudSql(
  firebaseUser: FirebaseUser,
  localProfiles: Profile[],
  deletedIds?: ReadonlyArray<string>,
): Promise<CloudSyncSessionResult> {
  const token = await getIdToken(firebaseUser);
  const res = await fetch('/api/family/sync-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Cloud SQL sync session failed (${res.status})`);
  }

  const data = (await res.json()) as { profiles?: Profile[] };
  const sqlProfiles = Array.isArray(data.profiles) ? data.profiles : [];
  const merged = mergeCloudAndLocalProfiles(localProfiles, sqlProfiles, deletedIds);

  if (merged.length > 0 || (deletedIds && deletedIds.length > 0)) {
    await pushProfilesToCloudSql(firebaseUser, merged);
  }

  return {
    profiles: merged,
    syncedAt: new Date().toISOString(),
  };
}

export async function pushProfilesToCloudSql(
  firebaseUser: FirebaseUser,
  profiles: Profile[],
): Promise<void> {
  const token = await getIdToken(firebaseUser);
  const res = await fetch('/api/family/profiles', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ profiles }),
  });
  if (!res.ok) {
    throw new Error(`Cloud SQL profile sync failed (${res.status})`);
  }
}

export async function deleteProfileFromCloudSql(
  firebaseUser: FirebaseUser,
  profileId: string,
): Promise<void> {
  const token = await getIdToken(firebaseUser);
  const res = await fetch(`/api/family/profiles/${encodeURIComponent(profileId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Cloud SQL delete failed (${res.status})`);
  }
}

export async function pushProfilesToFirestore(uid: string, profiles: Profile[]): Promise<void> {
  for (const profile of profiles) {
    const payload = toFirestoreFamilyProfilePayload(uid, profile);
    if (!isValidFirestoreDocId(payload.id)) continue;
    const path = `users/${uid}/familyProfiles/${payload.id}`;
    try {
      const ref = doc(db, 'users', uid, 'familyProfiles', payload.id);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        const updatePayload: Record<string, unknown> = {
          name: payload.name,
          dateOfBirth: payload.dateOfBirth,
          events: payload.events,
          growth: payload.growth,
          updatedAt: serverTimestamp(),
        };
        if (payload.relationship) updatePayload.relationship = payload.relationship;
        if (payload.gender) updatePayload.gender = payload.gender;
        await updateDoc(ref, updatePayload);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }
}

export async function fetchFirestoreProfiles(uid: string): Promise<Profile[]> {
  const path = `users/${uid}/familyProfiles`;
  try {
    const q = query(collection(db, 'users', uid, 'familyProfiles'), where('ownerUid', '==', uid));
    const snap = await getDocs(q);
    const list: Profile[] = [];
    for (const d of snap.docs) {
      const parsed = fromFirestoreFamilyProfileDoc(d.data());
      if (parsed) list.push(parsed);
    }
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function deleteProfileFromFirestore(uid: string, profileId: string): Promise<void> {
  if (!isValidFirestoreDocId(profileId)) return;
  const path = `users/${uid}/familyProfiles/${profileId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'familyProfiles', profileId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function deleteAllFirebaseUserDocs(uid: string): Promise<void> {
  const safeDelete = async (ref: ReturnType<typeof doc>) => {
    try {
      await deleteDoc(ref);
    } catch {
      /* ignore missing documents */
    }
  };

  try {
    const familySnap = await getDocs(
      query(collection(db, 'users', uid, 'familyProfiles'), where('ownerUid', '==', uid)),
    );
    await Promise.all(familySnap.docs.map((d) => safeDelete(d.ref)));
  } catch {
    /* ignore list permission errors */
  }

  try {
    const notesSnap = await getDocs(
      query(collection(db, 'users', uid, 'studioNotes'), where('ownerUid', '==', uid)),
    );
    await Promise.all(notesSnap.docs.map((d) => safeDelete(d.ref)));
  } catch {
    /* ignore list permission errors */
  }

  await Promise.all([
    safeDelete(doc(db, 'users', uid, 'private', 'account')),
    safeDelete(doc(db, 'users', uid, 'public', 'profile')),
  ]);
}

export function subscribeFirestoreProfiles(
  uid: string,
  onProfiles: (profiles: Profile[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const path = `users/${uid}/familyProfiles`;
  const q = query(collection(db, 'users', uid, 'familyProfiles'), where('ownerUid', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Profile[] = [];
      for (const d of snapshot.docs) {
        const parsed = fromFirestoreFamilyProfileDoc(d.data());
        if (parsed) list.push(parsed);
      }
      onProfiles(list);
    },
    (error) => {
      if (onError) onError(error);
      else handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

export async function saveStudioNoteToFirestore(
  uid: string,
  title: string,
  summary: string,
  modelUsed: string,
): Promise<string> {
  const noteId = createId('note').slice(0, 64);
  const path = `users/${uid}/studioNotes/${noteId}`;
  try {
    await setDoc(doc(db, 'users', uid, 'studioNotes', noteId), {
      id: noteId,
      ownerUid: uid,
      title: title.trim().slice(0, 160) || 'TikaBot Note',
      summary: summary.trim().slice(0, 4000),
      modelUsed: modelUsed.trim().slice(0, 80) || 'gemini-4-hydrogen',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return noteId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}
