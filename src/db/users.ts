import { eq } from 'drizzle-orm';
import { db, isDatabaseConfigured } from './index.ts';
import { users } from './schema.ts';

export async function getOrCreateUser(uid: string, email: string, displayName?: string | null) {
  if (!isDatabaseConfigured()) {
    return {
      id: 0,
      uid,
      email,
      displayName: displayName ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName ?? null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          displayName: displayName ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database user upsert failed:', error);
    throw new Error('Failed to synchronize user account.', { cause: error });
  }
}

export async function getUserByUid(uid: string) {
  if (!isDatabaseConfigured()) return null;
  try {
    const rows = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error('Database user lookup failed:', error);
    throw new Error('Failed to load user account.', { cause: error });
  }
}
