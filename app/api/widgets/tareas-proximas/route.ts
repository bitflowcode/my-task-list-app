import { NextRequest, NextResponse } from 'next/server';
import { guardApi } from '../../../../lib/api-guard';
import { getAdminFirestore } from '../../../../lib/admin-firestore';

export const runtime = 'nodejs';
export const revalidate = 0;

type TareaWidget = {
  id: string;
  titulo: string;
  fechaLimite: string | null;
  carpeta: string | null;
};

/**
 * Endpoint que devuelve hasta 5 próximas tareas del usuario, ordenadas
 * por fecha límite ascendente. Consumido por:
 *   - Widget iOS (WidgetKit + Timeline Provider)
 *   - Widget Android (Glance AppWidget)
 *
 * Respuesta cacheada 15 min a nivel CDN para ahorrar lecturas de
 * Firestore cuando el SO actualiza el widget con frecuencia.
 */
export async function GET(request: NextRequest) {
  const guard = await guardApi(request, {
    bucket: 'widgets:tareas-proximas',
    limit: 60,
    windowMs: 60 * 60 * 1000,
  });
  if (!guard.ok) return guard.response;

  try {
    const db = getAdminFirestore();
    const snap = await db
      .collection('tareas')
      .where('userId', '==', guard.uid)
      .get();

    const hoyIso = new Date().toISOString().slice(0, 10);

    const tareas: TareaWidget[] = snap.docs
      .map(d => {
        const data = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          titulo: String(data.titulo || ''),
          fechaLimite: (data.fechaLimite as string) || null,
          carpeta: (data.carpeta as string) || null,
        };
      })
      .filter(t => !t.fechaLimite || t.fechaLimite >= hoyIso)
      .sort((a, b) => {
        const fa = a.fechaLimite || '9999-12-31';
        const fb = b.fechaLimite || '9999-12-31';
        return fa.localeCompare(fb);
      })
      .slice(0, 5);

    return NextResponse.json(
      { tareas, actualizadoEn: new Date().toISOString() },
      {
        headers: {
          'Cache-Control': 'private, max-age=900',
        },
      }
    );
  } catch (error) {
    console.error('Error al leer tareas para widget:', error);
    return NextResponse.json(
      { error: 'No se pudieron obtener las tareas próximas' },
      { status: 500 }
    );
  }
}
