import { NextRequest, NextResponse } from 'next/server';
import { guardApi } from '../../../../lib/api-guard';
import { getAdminFirestore } from '../../../../lib/admin-firestore';

export const runtime = 'nodejs';

/**
 * Devuelve un JSON con TODOS los datos del usuario autenticado.
 * Requerido por GDPR (derecho de portabilidad, art. 20 RGPD).
 */
export async function GET(request: NextRequest) {
  const guard = await guardApi(request, {
    bucket: 'cuenta:exportar',
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!guard.ok) return guard.response;

  try {
    const db = getAdminFirestore();
    const uid = guard.uid;

    const [tareasSnap, completadasSnap, carpetasSnap, perfilSnap, suscripcionSnap] = await Promise.all([
      db.collection('tareas').where('userId', '==', uid).get(),
      db.collection('completadas').where('userId', '==', uid).get(),
      db.collection('carpetas').where('userId', '==', uid).get(),
      db.collection('usuarios').doc(uid).get(),
      db.collection('suscripciones').doc(uid).get(),
    ]);

    const serializar = (d: FirebaseFirestore.DocumentSnapshot | FirebaseFirestore.QueryDocumentSnapshot) => ({
      id: d.id,
      ...(d.data() || {}),
    });

    const cuotasSnap = await db.collection('cuotas_uso')
      .where('uid', '==', uid)
      .get();

    const payload = {
      version: 1,
      exportadoEn: new Date().toISOString(),
      usuario: {
        uid,
        tier: guard.tier,
        perfil: perfilSnap.exists ? perfilSnap.data() : null,
      },
      suscripcion: suscripcionSnap.exists ? suscripcionSnap.data() : null,
      tareas: tareasSnap.docs.map(serializar),
      completadas: completadasSnap.docs.map(serializar),
      carpetas: carpetasSnap.docs.map(serializar),
      cuotas: cuotasSnap.docs.map(serializar),
    };

    const json = JSON.stringify(payload, null, 2);
    const nombreArchivo = `mi-lista-tareas-export-${uid}-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;

    return new NextResponse(json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error al exportar datos:', error);
    return NextResponse.json(
      { error: 'No se pudieron exportar los datos. Intenta de nuevo más tarde.' },
      { status: 500 }
    );
  }
}
