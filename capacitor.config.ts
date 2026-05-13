// @ts-nocheck
// Next.js 15 intenta type-checkear este fichero pese al `exclude` del
// tsconfig.json y en Vercel falla porque `@capacitor/cli` no está
// disponible en NODE_ENV=production. Como este archivo solo lo lee el
// CLI de Capacitor en tu máquina (cap sync, cap open) y nunca se
// importa desde el código de la app, deshabilitamos el type-check.
import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Modo "hybrid live": la app nativa carga la URL de Vercel en una WebView.
 * Ventajas:
 *   - No necesitamos `next export` (nuestras API routes seguirán en Vercel).
 *   - Cada deploy a Vercel actualiza la app sin necesidad de re-enviar a las
 *     tiendas (salvo cambios nativos, assets o permisos).
 *
 * Trade-off: la app necesita conexión a internet. Firebase ya requiere
 * conexión para cargar datos iniciales, así que el coste adicional es bajo.
 *
 * Si en el futuro quieres una versión offline-first, habría que:
 *   1. Configurar `output: 'export'` en next.config.js (rompería las API
 *      routes; habría que moverlas a Firebase Functions).
 *   2. Generar el build estático en `out/` y apuntar `webDir` ahí.
 */
const config: CapacitorConfig = {
  appId: 'com.edurodriguez.mislistatareas',
  appName: 'Mi Lista de Tareas',
  webDir: 'public',
  server: {
    url: 'https://pintick.app',
    cleartext: false,
    androidScheme: 'https',
  },
  ios: {
    scheme: 'Mi Lista de Tareas',
    contentInset: 'always',
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
