"use client";

/**
 * Inicializa plugins nativos de Capacitor cuando la app corre dentro de
 * una WebView (iOS/Android). En web devuelve inmediatamente.
 * Los módulos se cargan dinámicamente para no inflar el bundle web.
 */
export async function inicializarCapacitor(): Promise<void> {
  if (typeof window === "undefined") return;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor;
  if (!cap?.isNativePlatform?.()) return;

  try {
    const [splashMod, statusMod] = await Promise.all([
      import("@capacitor/splash-screen"),
      import("@capacitor/status-bar"),
    ]);

    await splashMod.SplashScreen.hide().catch(() => {});

    await statusMod.StatusBar.setStyle({ style: statusMod.Style.Default }).catch(() => {});
  } catch (err) {
    console.warn("No se pudieron inicializar plugins nativos:", err);
  }
}
