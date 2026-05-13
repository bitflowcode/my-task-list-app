import 'server-only';
import { getAdminFirestore } from './admin-firestore';
import { Tier } from './suscripcion-server';

export type RecursoIA = 'whisper' | 'parseo' | 'categorizacion';

type LimitesPorTier = Record<RecursoIA, number>;

/**
 * Límites mensuales por recurso y tier. Se aplican con ventana natural de mes
 * calendario en zona horaria de referencia Europe/Madrid (ver zonaHorariaMes).
 */
export const LIMITES_TIER: Record<Tier, LimitesPorTier> = {
  free: {
    whisper: 10,
    parseo: 30,
    categorizacion: 100,
  },
  premium: {
    whisper: 300,
    parseo: 1500,
    categorizacion: 1500,
  },
};

/**
 * Hard cap global absoluto por recurso. Cualquier usuario (incluido premium)
 * que los supere se considera potencial abusador y se le bloquea el recurso
 * durante el resto del mes. Protege contra bots o credenciales filtradas.
 */
export const HARD_CAP: LimitesPorTier = {
  whisper: 500,
  parseo: 2500,
  categorizacion: 2500,
};

export class CuotaExcedidaError extends Error {
  motivo: 'tier' | 'hard_cap';
  recurso: RecursoIA;
  usado: number;
  limite: number;
  tier: Tier;

  constructor(opts: {
    motivo: 'tier' | 'hard_cap';
    recurso: RecursoIA;
    usado: number;
    limite: number;
    tier: Tier;
  }) {
    super(
      opts.motivo === 'tier'
        ? `Cuota mensual del tier ${opts.tier} agotada para ${opts.recurso} (${opts.usado}/${opts.limite})`
        : `Hard cap global alcanzado para ${opts.recurso} (${opts.usado}/${opts.limite})`
    );
    this.motivo = opts.motivo;
    this.recurso = opts.recurso;
    this.usado = opts.usado;
    this.limite = opts.limite;
    this.tier = opts.tier;
  }
}

const ZONA_REFERENCIA = 'Europe/Madrid';

/**
 * Devuelve el identificador de mes en formato YYYYMM según la zona horaria
 * de referencia. Usarlo como parte del doc id asegura que a primero de mes
 * los contadores se reinician automáticamente.
 */
export function mesActualId(fecha: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA_REFERENCIA,
    year: 'numeric',
    month: '2-digit',
  });
  const partes = fmt.formatToParts(fecha);
  const y = partes.find(p => p.type === 'year')?.value || '';
  const m = partes.find(p => p.type === 'month')?.value || '';
  return `${y}${m}`;
}

export function cuotaDocId(uid: string, mes: string = mesActualId()): string {
  return `${uid}_${mes}`;
}

export type EstadoCuota = {
  tier: Tier;
  mes: string;
  usado: Record<RecursoIA, number>;
  limites: LimitesPorTier;
  hardCap: LimitesPorTier;
};

/**
 * Lee el estado actual de consumo del usuario sin modificarlo.
 * Útil para la pantalla de perfil.
 */
export async function leerEstadoCuota(uid: string, tier: Tier): Promise<EstadoCuota> {
  const db = getAdminFirestore();
  const mes = mesActualId();
  const snap = await db.collection('cuotas_uso').doc(cuotaDocId(uid, mes)).get();
  const data = (snap.exists ? (snap.data() as Record<string, unknown>) : {}) || {};

  const usado: Record<RecursoIA, number> = {
    whisper: Number(data.whisper) || 0,
    parseo: Number(data.parseo) || 0,
    categorizacion: Number(data.categorizacion) || 0,
  };

  return {
    tier,
    mes,
    usado,
    limites: LIMITES_TIER[tier],
    hardCap: HARD_CAP,
  };
}

/**
 * Incrementa atómicamente el contador del recurso para el mes actual.
 * Antes de incrementar verifica tanto el límite del tier como el hard cap.
 * Si alguno se supera, lanza CuotaExcedidaError sin modificar nada.
 */
export async function consumirCuota(opts: {
  uid: string;
  tier: Tier;
  recurso: RecursoIA;
  cantidad?: number;
}): Promise<{ nuevoConsumo: number; restanteTier: number; restanteHardCap: number }> {
  const { uid, tier, recurso } = opts;
  const cantidad = opts.cantidad ?? 1;
  if (cantidad <= 0) {
    return { nuevoConsumo: 0, restanteTier: LIMITES_TIER[tier][recurso], restanteHardCap: HARD_CAP[recurso] };
  }

  const db = getAdminFirestore();
  const mes = mesActualId();
  const ref = db.collection('cuotas_uso').doc(cuotaDocId(uid, mes));

  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const data = (snap.exists ? (snap.data() as Record<string, unknown>) : {}) || {};
    const consumoPrevio = Number(data[recurso]) || 0;
    const nuevoConsumo = consumoPrevio + cantidad;

    const limiteTier = LIMITES_TIER[tier][recurso];
    const limiteHard = HARD_CAP[recurso];

    if (nuevoConsumo > limiteHard) {
      throw new CuotaExcedidaError({
        motivo: 'hard_cap',
        recurso,
        usado: consumoPrevio,
        limite: limiteHard,
        tier,
      });
    }
    if (nuevoConsumo > limiteTier) {
      throw new CuotaExcedidaError({
        motivo: 'tier',
        recurso,
        usado: consumoPrevio,
        limite: limiteTier,
        tier,
      });
    }

    tx.set(
      ref,
      {
        uid,
        mes,
        [recurso]: nuevoConsumo,
        actualizadoEn: new Date(),
      },
      { merge: true }
    );

    return {
      nuevoConsumo,
      restanteTier: Math.max(0, limiteTier - nuevoConsumo),
      restanteHardCap: Math.max(0, limiteHard - nuevoConsumo),
    };
  });
}
