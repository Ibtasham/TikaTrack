import { and, desc, eq, notInArray } from 'drizzle-orm';
import { db, isDatabaseConfigured } from './index.ts';
import {
  childProfiles,
  growthMeasurements,
  pushSubscriptions,
  studioSessions,
  users,
  vaccinations,
} from './schema.ts';
import type { Profile } from '../types/index.ts';

export async function listProfilesByUser(uid: string): Promise<Profile[]> {
  if (!isDatabaseConfigured()) return [];
  try {
    const rows = await db
      .select()
      .from(childProfiles)
      .where(eq(childProfiles.userUid, uid))
      .orderBy(childProfiles.createdAt);

    return rows.map((row) => row.profileData);
  } catch (error) {
    console.error('Database profile list failed:', error);
    throw new Error('Failed to load synced family profiles.', { cause: error });
  }
}

export async function syncProfilesForUser(uid: string, profiles: Profile[]): Promise<Profile[]> {
  if (!isDatabaseConfigured()) return profiles;
  try {
    await db.transaction(async (tx) => {
      const keepIds = profiles.map((p) => `${uid}__${p.id}`);

      if (keepIds.length === 0) {
        await tx.delete(childProfiles).where(eq(childProfiles.userUid, uid));
      } else {
        await tx
          .delete(childProfiles)
          .where(and(eq(childProfiles.userUid, uid), notInArray(childProfiles.id, keepIds)));
      }

      for (const profile of profiles) {
        const scopedProfileId = `${uid}__${profile.id}`;
        await tx
          .insert(childProfiles)
          .values({
            id: scopedProfileId,
            userUid: uid,
            name: profile.name,
            dateOfBirth: profile.dateOfBirth,
            relationship: profile.relationship ?? null,
            gender: profile.gender ?? null,
            profileData: profile,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: childProfiles.id,
            set: {
              name: profile.name,
              dateOfBirth: profile.dateOfBirth,
              relationship: profile.relationship ?? null,
              gender: profile.gender ?? null,
              profileData: profile,
              updatedAt: new Date(),
            },
          });

        await tx.delete(vaccinations).where(eq(vaccinations.profileId, scopedProfileId));
        if (profile.events && profile.events.length > 0) {
          await tx.insert(vaccinations).values(
            profile.events.map((ev) => ({
              id: `${scopedProfileId}__${ev.id}`,
              profileId: scopedProfileId,
              userUid: uid,
              vaccineId: ev.vaccineId,
              doseNumber: ev.doseNumber ?? null,
              administeredDate: ev.date,
              centre: ev.centre ?? null,
              status: 'completed',
              updatedAt: new Date(),
            })),
          );
        }

        await tx.delete(growthMeasurements).where(eq(growthMeasurements.profileId, scopedProfileId));
        if (profile.growth && profile.growth.length > 0) {
          await tx.insert(growthMeasurements).values(
            profile.growth.map((gm) => ({
              id: `${scopedProfileId}__${gm.id}`,
              profileId: scopedProfileId,
              userUid: uid,
              measuredDate: gm.date,
              heightCm: gm.heightCm ?? null,
              weightKg: gm.weightKg ?? null,
              notes: gm.notes ?? null,
            })),
          );
        }
      }
    });

    return listProfilesByUser(uid);
  } catch (error) {
    console.error('Database profile sync failed:', error);
    throw new Error('Failed to synchronize family profiles.', { cause: error });
  }
}

export async function removeProfileForUser(uid: string, profileId: string): Promise<void> {
  if (!isDatabaseConfigured()) return;
  try {
    await db
      .delete(childProfiles)
      .where(and(eq(childProfiles.id, `${uid}__${profileId}`), eq(childProfiles.userUid, uid)));
  } catch (error) {
    console.error('Database profile delete failed:', error);
    throw new Error('Failed to delete synced profile.', { cause: error });
  }
}

export async function deleteAccountDataForUser(uid: string): Promise<void> {
  if (!isDatabaseConfigured()) return;
  try {
    await db.transaction(async (tx) => {
      await tx.delete(pushSubscriptions).where(eq(pushSubscriptions.userUid, uid));
      await tx.delete(studioSessions).where(eq(studioSessions.userUid, uid));
      await tx.delete(vaccinations).where(eq(vaccinations.userUid, uid));
      await tx.delete(growthMeasurements).where(eq(growthMeasurements.userUid, uid));
      await tx.delete(childProfiles).where(eq(childProfiles.userUid, uid));
      await tx.delete(users).where(eq(users.uid, uid));
    });
  } catch (error) {
    console.error('Database account deletion failed:', error);
    throw new Error('Failed to delete synced account data.', { cause: error });
  }
}

export async function logStudioSession(
  uid: string,
  mode: string,
  prompt: string,
  responseText: string,
  modelUsed: string,
) {
  if (!isDatabaseConfigured()) return null;
  try {
    const inserted = await db
      .insert(studioSessions)
      .values({
        userUid: uid,
        mode,
        prompt: prompt.slice(0, 2000),
        responseText: responseText.slice(0, 8000),
        modelUsed,
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error('Database studio log failed:', error);
    throw new Error('Failed to save studio consultation.', { cause: error });
  }
}

export async function listStudioSessions(uid: string) {
  if (!isDatabaseConfigured()) return [];
  try {
    return await db
      .select()
      .from(studioSessions)
      .where(eq(studioSessions.userUid, uid))
      .orderBy(desc(studioSessions.createdAt))
      .limit(25);
  } catch (error) {
    console.error('Database studio list failed:', error);
    throw new Error('Failed to fetch studio history.', { cause: error });
  }
}
