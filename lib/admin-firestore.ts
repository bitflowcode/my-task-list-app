import 'server-only';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getApps, initializeApp, cert, applicationDefault, App } from 'firebase-admin/app';

let adminApp: App | null = null;
let firestoreInstance: Firestore | null = null;

function getAdminApp(): App {
  if (adminApp) return adminApp;

  const existing = getApps();
  if (existing.length > 0) {
    adminApp = existing[0];
    return adminApp;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    const parsed = JSON.parse(serviceAccountJson);
    adminApp = initializeApp({
      credential: cert({
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key,
      }),
    });
    return adminApp;
  }

  adminApp = initializeApp({ credential: applicationDefault() });
  return adminApp;
}

export function getAdminFirestore(): Firestore {
  if (firestoreInstance) return firestoreInstance;
  firestoreInstance = getFirestore(getAdminApp());
  return firestoreInstance;
}
