import 'server-only';
import { getAdminFirestore } from './admin-firestore';

export type Tier = 'free' | 'premium';

export type SuscripcionInfo = {
  tier: Tier;
  productId: string | null;
  expiraEn: Date | null;
  renovacionAutomatica: boolean;
  plataforma: 'ios' | 'android' | 'web' | null;
};

/**
 * Lee el tier del usuario desde la colección suscripciones/{uid}.
 * Si no existe o la suscripción ha expirado, devuelve tier 'free'.
 */
export async function obtenerSuscripcion(uid: string): Promise<SuscripcionInfo> {
  const defecto: SuscripcionInfo = {
    tier: 'free',
    productId: null,
    expiraEn: null,
    renovacionAutomatica: false,
    plataforma: null,
  };

  try {
    const db = getAdminFirestore();
    const snap = await db.collection('suscripciones').doc(uid).get();
    if (!snap.exists) return defecto;

    const data = snap.data() as Record<string, unknown>;
    const tier = (data.tier === 'premium' ? 'premium' : 'free') as Tier;
    const expiraEnRaw = data.expiraEn as { toDate?: () => Date } | string | number | null | undefined;
    let expiraEn: Date | null = null;
    if (expiraEnRaw) {
      if (typeof expiraEnRaw === 'object' && typeof expiraEnRaw.toDate === 'function') {
        expiraEn = expiraEnRaw.toDate();
      } else if (typeof expiraEnRaw === 'string' || typeof expiraEnRaw === 'number') {
        expiraEn = new Date(expiraEnRaw);
      }
    }

    // Si la suscripción premium ha expirado, degradamos a free
    if (tier === 'premium' && expiraEn && expiraEn.getTime() < Date.now()) {
      return { ...defecto, productId: (data.productId as string) || null };
    }

    return {
      tier,
      productId: (data.productId as string) || null,
      expiraEn,
      renovacionAutomatica: Boolean(data.renovacionAutomatica),
      plataforma: (data.plataforma as SuscripcionInfo['plataforma']) || null,
    };
  } catch (err) {
    console.error('Error leyendo suscripción, se asume free:', err);
    return defecto;
  }
}
