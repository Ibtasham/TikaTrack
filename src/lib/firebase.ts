import { initializeApp, getApps, type FirebaseOptions } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import bundledConfig from '../../firebase-applet-config.json';

export interface ResolvedFirebaseSetup {
  options: FirebaseOptions;
  firestoreDatabaseId?: string;
  source: 'env' | 'bundled';
}

function readEnvString(env: Record<string, unknown>, key: string): string {
  const value = env[key];
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeDatabaseId(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '(default)') return undefined;
  return trimmed;
}

export function resolveFirebaseConfig(
  env: Record<string, unknown> = (import.meta.env ?? {}) as Record<string, unknown>,
): ResolvedFirebaseSetup {
  const apiKey = readEnvString(env, 'VITE_FIREBASE_API_KEY');
  const projectId = readEnvString(env, 'VITE_FIREBASE_PROJECT_ID');

  // Require both apiKey and projectId together so credentials from two different
  // Firebase projects can never be mixed.
  if (apiKey && projectId) {
    const authDomain =
      readEnvString(env, 'VITE_FIREBASE_AUTH_DOMAIN') || `${projectId}.firebaseapp.com`;
    const storageBucket =
      readEnvString(env, 'VITE_FIREBASE_STORAGE_BUCKET') || `${projectId}.firebasestorage.app`;
    const messagingSenderId = readEnvString(env, 'VITE_FIREBASE_MESSAGING_SENDER_ID');
    const appId = readEnvString(env, 'VITE_FIREBASE_APP_ID');
    const measurementId = readEnvString(env, 'VITE_FIREBASE_MEASUREMENT_ID');
    const explicitDbId = readEnvString(env, 'VITE_FIREBASE_DATABASE_ID');

    const firestoreDatabaseId = explicitDbId
      ? normalizeDatabaseId(explicitDbId)
      : projectId === bundledConfig.projectId
        ? normalizeDatabaseId(bundledConfig.firestoreDatabaseId || '')
        : undefined;

    return {
      source: 'env',
      firestoreDatabaseId,
      options: {
        apiKey,
        authDomain,
        projectId,
        storageBucket,
        ...(messagingSenderId ? { messagingSenderId } : {}),
        ...(appId ? { appId } : {}),
        ...(measurementId ? { measurementId } : {}),
      },
    };
  }

  return {
    source: 'bundled',
    firestoreDatabaseId: normalizeDatabaseId(bundledConfig.firestoreDatabaseId || ''),
    options: bundledConfig,
  };
}

export const resolvedFirebaseSetup = resolveFirebaseConfig();

const app = getApps().length ? getApps()[0] : initializeApp(resolvedFirebaseSetup.options);

export const db = resolvedFirebaseSetup.firestoreDatabaseId
  ? getFirestore(app, resolvedFirebaseSetup.firestoreDatabaseId)
  : getFirestore(app);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  if (typeof window === 'undefined' || import.meta.env?.MODE === 'test') return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();
