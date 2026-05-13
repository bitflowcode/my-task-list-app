import { NextRequest, NextResponse } from 'next/server';
import { getMessaging } from 'firebase-admin/messaging';
import { getAdminFirestore } from '../../../../lib/admin-firestore';

export const runtime = 'nodejs';

/**
 * Cron job de recordatorios. Se ejecuta cada hora (config en vercel.json).
 *
 * Busca tareas con fechaLimite que vence hoy y envía una notificación push
 * al token FCM registrado en `usuarios/{uid}.fcm.token`. Para no duplicar
 * envíos, marca la tarea con `notificadaEn` y no reintenta si ya tiene
 * valor para el día actual.
 *
 * Autenticación: usa la variable CRON_SECRET. Vercel la inyecta como
 * `Authorization: Bearer $CRON_SECRET` automáticamente cuando configuras
 * el cron con `vercel.json`.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization') || '';
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const db = getAdminFirestore();
  const hoy = new Date();
  const hoyIso = hoy.toISOString().slice(0, 10);

  try {
    const snap = await db
      .collection('tareas')
      .where('fechaLimite', '==', hoyIso)
      .get();

    const mensajesPorEnviar: Array<{
      uid: string;
      token: string;
      titulo: string;
      tareaId: string;
    }> = [];

    for (const docSnap of snap.docs) {
      const tarea = docSnap.data() as Record<string, unknown>;
      const uid = tarea.userId as string | undefined;
      if (!uid) continue;

      const notificadaEn = tarea.notificadaEn as string | undefined;
      if (notificadaEn === hoyIso) continue;

      const usuarioSnap = await db.collection('usuarios').doc(uid).get();
      const usuario = usuarioSnap.data() as Record<string, unknown> | undefined;
      const fcm = usuario?.fcm as { token?: string } | undefined;
      if (!fcm?.token) continue;

      mensajesPorEnviar.push({
        uid,
        token: fcm.token,
        titulo: String(tarea.titulo || 'Tarea pendiente'),
        tareaId: docSnap.id,
      });
    }

    const messaging = getMessaging();
    let enviadas = 0;
    let errores = 0;

    for (const m of mensajesPorEnviar) {
      try {
        await messaging.send({
          token: m.token,
          notification: {
            title: 'Tarea para hoy',
            body: m.titulo,
          },
          data: { tareaId: m.tareaId },
          webpush: {
            fcmOptions: { link: '/' },
          },
        });
        await db.collection('tareas').doc(m.tareaId).update({
          notificadaEn: hoyIso,
        });
        enviadas++;
      } catch (err) {
        console.warn('Error enviando push a', m.token, err);
        errores++;
      }
    }

    return NextResponse.json({ ok: true, enviadas, errores, total: mensajesPorEnviar.length });
  } catch (error) {
    console.error('Error en cron recordatorios:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
