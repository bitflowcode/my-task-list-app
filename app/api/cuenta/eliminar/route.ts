import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { guardApi } from '../../../../lib/api-guard';
import { getAdminFirestore } from '../../../../lib/admin-firestore';

export const runtime = 'nodejs';

/**
 * Elimina TODOS los datos del usuario autenticado y su cuenta de Firebase Auth.
 *
 * Flujo:
 *   1. verifyIdToken recibe un ID token que el cliente acaba de obtener tras
 *      re-autenticarse (Firebase exige reautenticación reciente para delete).
 *   2. Se borran en paralelo las colecciones propias del usuario (tareas,
 *      completadas, carpetas), su doc en `usuarios`, su doc en `suscripciones`
 *      y los contadores `cuotas_uso` asociados.
 *   3. Finalmente, se borra el usuario de Firebase Auth con el Admin SDK.
 *
 * Obligatorio para cumplir:
 *   - App Store Review Guidelines 5.1.1(v) (desde junio 2022)
 *   - Google Play Data safety (desde mayo 2024)
 *   - GDPR art. 17 (derecho de supresión)
 */
export async function POST(request: NextRequest) {
  const guard = await guardApi(request, {
    bucket: 'cuenta:eliminar',
    limit: 3,
    windowMs: 60 * 60 * 1000,
  });
  if (!guard.ok) return guard.response;

  const { uid } = guard;
  const db = getAdminFirestore();

  try {
    await Promise.all([
      borrarColeccionPorUserId(db, 'tareas', uid),
      borrarColeccionPorUserId(db, 'completadas', uid),
      borrarColeccionPorUserId(db, 'carpetas', uid),
      borrarColeccionPorField(db, 'cuotas_uso', 'uid', uid),
      db.collection('usuarios').doc(uid).delete(),
      db.collection('suscripciones').doc(uid).delete(),
    ]);

    await getAuth().deleteUser(uid);

    return NextResponse.json({
      ok: true,
      mensaje: 'Tu cuenta y todos tus datos se han eliminado correctamente.',
    });
  } catch (error) {
    console.error('Error al eliminar la cuenta:', error);
    const mensaje =
      error instanceof Error ? error.message : 'Error desconocido al eliminar la cuenta';

    if (mensaje.toLowerCase().includes('requires-recent-login')) {
      return NextResponse.json(
        {
          error:
            'Para eliminar la cuenta necesitas haber iniciado sesión recientemente. Cierra sesión y vuelve a entrar.',
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'No se pudo completar la eliminación. Contacta con soporte.' },
      { status: 500 }
    );
  }
}

/**
 * Borra en lotes de 300 documentos todos los docs de una colección cuyo
 * campo `userId` coincida con el uid dado. Firestore tiene un límite de 500
 * writes por batch; usamos 300 con margen por si en algún momento añadimos
 * operaciones adicionales al mismo batch.
 */
async function borrarColeccionPorUserId(
  db: FirebaseFirestore.Firestore,
  coleccion: string,
  uid: string
): Promise<void> {
  await borrarColeccionPorField(db, coleccion, 'userId', uid);
}

async function borrarColeccionPorField(
  db: FirebaseFirestore.Firestore,
  coleccion: string,
  campo: string,
  valor: string
): Promise<void> {
  const tamanoLote = 300;
  while (true) {
    const snap = await db
      .collection(coleccion)
      .where(campo, '==', valor)
      .limit(tamanoLote)
      .get();

    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    if (snap.size < tamanoLote) break;
  }
}
