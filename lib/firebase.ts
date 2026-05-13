import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  type AppCheck,
} from "firebase/app-check";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// App Check web. En nativo (Capacitor) se usa un plugin distinto que se
// registra aparte. Aquí solo inicializamos cuando:
//   1. Estamos en navegador (no SSR).
//   2. NO estamos dentro de Capacitor (evita doble registro).
//   3. La site key de reCAPTCHA v3 está definida en .env.
let appCheck: AppCheck | null = null;
if (typeof window !== "undefined") {
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor;
  const esNativo = Boolean(cap?.isNativePlatform?.());
  const siteKey = process.env.NEXT_PUBLIC_APPCHECK_RECAPTCHA_SITE_KEY;

  if (!esNativo && siteKey) {
    try {
      // @ts-expect-error - debug token solo en desarrollo
      if (process.env.NODE_ENV === "development") self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } catch (err) {
      console.warn("No se pudo inicializar App Check:", err);
    }
  }
}

export { db, auth, appCheck };