import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { safeStringify } from './utils';

const app = initializeApp(firebaseConfig);
const dbId = (firebaseConfig as any).firestoreDatabaseId;

// Use initializeFirestore to enable long polling which is more reliable in some cloud environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, dbId && dbId !== '(default)' ? dbId : undefined);

export const auth = getAuth(app);

// Test connection to Firestore
async function testConnection() {
  try {
    // Attempt to fetch a non-existent document from the server to test connectivity
    await getDocFromServer(doc(db, 'stats', 'connection_test'));
    // Connection successful
  } catch (error) {
    if (error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('network-request-failed'))) {
      console.warn("Firestore connection check failed: the client is offline or network error. The app will continue in degraded mode.");
    } else {
      console.warn("Firestore connection test warning:", error);
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.toLowerCase().includes('quota exceeded') || msg.toLowerCase().includes('resource-exhausted')) {
        window.dispatchEvent(new CustomEvent('firestore-quota-exceeded', {
          detail: { error: msg, operationType: 'get', path: 'stats/connection_test' }
        }));
        import('firebase/firestore').then(({ disableNetwork }) => {
          disableNetwork(db).catch(console.error);
        });
      }
    }
  }
}
testConnection();

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
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  
  const errorMessage = safeStringify(errInfo);
  const lowercaseError = errorMessage.toLowerCase();
  
  // Handle and dispatch Quota Exceeded & Resource Exhaustion errors
  if (lowercaseError.includes('quota exceeded') || lowercaseError.includes('resource-exhausted') || lowercaseError.includes('quota_exceeded')) {
    console.warn('Firestore Applet Quota Exceeded. Prompting UI fallback alert.');
    window.dispatchEvent(new CustomEvent('firestore-quota-exceeded', {
      detail: { error: errInfo.error, operationType, path }
    }));
    import('firebase/firestore').then(({ disableNetwork }) => {
      disableNetwork(db).catch(console.error);
    });
    return;
  }

  // Do not throw for non-critical errors to prevent app crashes
  if (errorMessage.includes('PERMISSION_DENIED') || errorMessage.includes('Missing or insufficient permissions')) {
     console.warn('Firestore Sync Degradation: Using local fallback (Permission issue).');
     return;
  }

  // Also ignore NOT_FOUND errors
  if (errorMessage.includes('NOT_FOUND') || (error instanceof Error && error.message.includes('NOT_FOUND'))) {
    return;
  }

  console.error('Firestore Error: ', errorMessage);

  // For other errors, we might still want to know, but throwing can crash React loops.
  // We'll log it and return instead of throwing.
}
