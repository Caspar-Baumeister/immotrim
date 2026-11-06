// Public Firebase web config. These values identify the project; they are not
// secrets (access is enforced by security rules and the server).
// On immotrim.com the Google sign-in runs through our own domain (next.config.ts
// proxies /__/auth to Firebase), so the popup shows immotrim.com.
function authDomain(): string {
  if (typeof window !== "undefined" && window.location.hostname.endsWith("immotrim.com")) {
    return window.location.host;
  }
  return "immo-2d39f.firebaseapp.com";
}

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyBm5hAWbiukQJTgwu55yPPyOtiJoMr-GhE",
  authDomain: authDomain(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "immo-2d39f",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "immo-2d39f.firebasestorage.app",
  messagingSenderId: "456946093935",
  appId: "1:456946093935:web:a3ed911419ae4a448e629a",
};

// Local development against the Firebase emulators (`npm run emulators`).
export const useEmulators = process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "1";
