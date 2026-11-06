import "server-only";
import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { firebaseConfig } from "./config";

// Server-side Firebase. Credentials come from FIREBASE_SERVICE_ACCOUNT (the JSON
// key, raw or base64). Against the emulators (FIRESTORE_EMULATOR_HOST set) no key
// is needed.
function adminApp(): App {
  if (getApps().length) return getApp();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  const options = {
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
  };
  if (!raw) return initializeApp(options);
  const json = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  return initializeApp({ ...options, credential: cert(JSON.parse(json)) });
}

// settings() may run only once per Firestore instance; dev reloads and separate
// route bundles re-evaluate this module, so the flag lives on globalThis.
const g = globalThis as unknown as { __immotrimDbReady?: boolean };

export function adminDb(): Firestore {
  const db = getFirestore(adminApp());
  if (!g.__immotrimDbReady) {
    g.__immotrimDbReady = true;
    try {
      db.settings({ ignoreUndefinedProperties: true });
    } catch {
      // Already configured by another bundle.
    }
  }
  return db;
}

export const adminAuth = () => getAuth(adminApp());
export const adminBucket = () => getStorage(adminApp()).bucket();
