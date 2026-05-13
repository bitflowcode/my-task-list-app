import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore } from '../../../../lib/admin-firestore';

export const runtime = 'nodejs';

/**
 * Webhook de RevenueCat.
 *
 * Configuración requerida en el dashboard de RevenueCat:
 *   Project settings → Integrations → Webhook
 *   - URL: https://<tu-dominio>/api/revenuecat/webhook
 *   - Authorization header: añadir cabecera "Authorization: Bearer <secret>"
 *     con el valor de la variable de entorno REVENUECAT_WEBHOOK_SECRET.
 *
 * Eventos que manejamos (https://www.revenuecat.com/docs/webhooks):
 *   - INITIAL_PURCHASE, RENEWAL, NON_RENEWING_PURCHASE, UNCANCELLATION,
 *     PRODUCT_CHANGE, RESUBSCRIPTION → premium activo
 *   - CANCELLATION (con pérdida de entitlement inmediata), EXPIRATION → free
 *   - OTHER: se registran pero no alteran el estado
 *
 * El documento `suscripciones/{uid}` se actualiza con Admin SDK (las reglas
 * de Firestore prohíben la escritura desde cliente). El cliente solo lo lee
 * mediante un onSnapshot (ver lib/useSuscripcion.ts).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!secret) {
    console.error('REVENUECAT_WEBHOOK_SECRET no está configurado');
    return NextResponse.json({ error: 'Webhook mal configurado' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization') || '';
  const expected = `Bearer ${secret}`;
  if (authHeader !== expected) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const evento = body.event as Record<string, unknown> | undefined;
  if (!evento) {
    return NextResponse.json({ error: 'Evento ausente' }, { status: 400 });
  }

  const tipo = String(evento.type || '');
  const appUserId = String(evento.app_user_id || evento.original_app_user_id || '');
  if (!appUserId) {
    return NextResponse.json({ error: 'app_user_id ausente' }, { status: 400 });
  }

  const productId = (evento.product_id as string) || null;
  const expirationAtMs = Number(evento.expiration_at_ms) || null;
  const storeRaw = String(evento.store || '').toLowerCase();
  const plataforma: 'ios' | 'android' | 'web' | null =
    storeRaw.includes('app_store')
      ? 'ios'
      : storeRaw.includes('play_store')
      ? 'android'
      : storeRaw.includes('stripe') || storeRaw.includes('web')
      ? 'web'
      : null;

  const EVENTOS_ACTIVOS = new Set([
    'INITIAL_PURCHASE',
    'RENEWAL',
    'NON_RENEWING_PURCHASE',
    'UNCANCELLATION',
    'PRODUCT_CHANGE',
    'RESUBSCRIPTION',
    'TRIAL_STARTED',
    'TRIAL_CONVERTED',
  ]);

  const EVENTOS_FINALIZADORES = new Set(['EXPIRATION', 'BILLING_ISSUE']);

  const db = getAdminFirestore();
  const ref = db.collection('suscripciones').doc(appUserId);

  try {
    if (EVENTOS_ACTIVOS.has(tipo)) {
      await ref.set(
        {
          tier: 'premium',
          productId,
          expiraEn: expirationAtMs ? Timestamp.fromMillis(expirationAtMs) : null,
          renovacionAutomatica: tipo !== 'CANCELLATION',
          plataforma,
          actualizadoEn: Timestamp.now(),
          ultimoEvento: tipo,
          revenueCatUserId: appUserId,
        },
        { merge: true }
      );
    } else if (tipo === 'CANCELLATION') {
      // Cancelación: mantiene acceso hasta expiraEn, pero renovación automática off
      await ref.set(
        {
          renovacionAutomatica: false,
          ultimoEvento: tipo,
          actualizadoEn: Timestamp.now(),
        },
        { merge: true }
      );
    } else if (EVENTOS_FINALIZADORES.has(tipo)) {
      await ref.set(
        {
          tier: 'free',
          renovacionAutomatica: false,
          ultimoEvento: tipo,
          actualizadoEn: Timestamp.now(),
        },
        { merge: true }
      );
    } else {
      await ref.set(
        {
          ultimoEvento: tipo,
          actualizadoEn: Timestamp.now(),
        },
        { merge: true }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error procesando webhook RevenueCat:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
