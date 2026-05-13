import 'server-only';
import { NextResponse } from 'next/server';
import { verifyIdToken, AuthError, verificarAppCheck } from './auth-server';
import { checkRateLimit } from './rate-limit';
import { obtenerSuscripcion, Tier } from './suscripcion-server';
import {
  consumirCuota,
  CuotaExcedidaError,
  RecursoIA,
  LIMITES_TIER,
  HARD_CAP,
} from './cuotas';

export type GuardResult =
  | {
      ok: true;
      uid: string;
      tier: Tier;
      rateLimit: { limit: number; remaining: number; resetAt: number };
      cuota?: { nuevoConsumo: number; restanteTier: number; restanteHardCap: number };
    }
  | { ok: false; response: NextResponse };

export type GuardOptions = {
  bucket: string;
  limit: number;
  windowMs: number;
  /**
   * Si se indica, consume cuota mensual persistente del recurso
   * antes de ejecutar la llamada. Si se excede, responde 402 o 403.
   */
  recursoCuota?: RecursoIA;
};

/**
 * Verifica auth (Firebase ID token), rate limit en memoria por uid y,
 * opcionalmente, consume cuota mensual persistente (Firestore). Si algo
 * falla devuelve una NextResponse lista para retornar desde la ruta.
 */
export async function guardApi(request: Request, opts: GuardOptions): Promise<GuardResult> {
  let uid: string;
  try {
    await verificarAppCheck(request);
    const decoded = await verifyIdToken(request);
    uid = decoded.uid;
  } catch (err) {
    const status = err instanceof AuthError ? err.status : 401;
    const message = err instanceof Error ? err.message : 'No autorizado';
    return {
      ok: false,
      response: NextResponse.json({ error: message }, { status }),
    };
  }

  const result = checkRateLimit({
    bucket: opts.bucket,
    key: uid,
    limit: opts.limit,
    windowMs: opts.windowMs,
  });

  if (!result.allowed) {
    const resp = NextResponse.json(
      { error: 'Has superado el límite de peticiones. Intenta de nuevo más tarde.' },
      { status: 429 }
    );
    resp.headers.set('Retry-After', String(result.retryAfterSeconds));
    resp.headers.set('X-RateLimit-Limit', String(result.limit));
    resp.headers.set('X-RateLimit-Remaining', '0');
    resp.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));
    return { ok: false, response: resp };
  }

  let tier: Tier = 'free';
  let cuotaInfo: { nuevoConsumo: number; restanteTier: number; restanteHardCap: number } | undefined;

  if (opts.recursoCuota) {
    const suscripcion = await obtenerSuscripcion(uid);
    tier = suscripcion.tier;

    try {
      cuotaInfo = await consumirCuota({ uid, tier, recurso: opts.recursoCuota });
    } catch (err) {
      if (err instanceof CuotaExcedidaError) {
        const limTier = LIMITES_TIER[tier][opts.recursoCuota];
        const limHard = HARD_CAP[opts.recursoCuota];

        if (err.motivo === 'hard_cap') {
          const resp = NextResponse.json(
            {
              error:
                'Has alcanzado el límite máximo de uso de este recurso para el mes actual. Si crees que es un error, contacta con soporte.',
              motivo: 'hard_cap',
              recurso: opts.recursoCuota,
              limite: limHard,
            },
            { status: 403 }
          );
          return { ok: false, response: resp };
        }

        const resp = NextResponse.json(
          {
            error:
              tier === 'free'
                ? 'Has agotado la cuota gratuita de este recurso para el mes actual. Actualiza a premium para uso ilimitado.'
                : 'Has agotado la cuota mensual del plan premium para este recurso.',
            motivo: 'cuota_tier',
            tier,
            recurso: opts.recursoCuota,
            limite: limTier,
            upgradeDisponible: tier === 'free',
          },
          { status: 402 }
        );
        return { ok: false, response: resp };
      }
      throw err;
    }
  } else {
    const suscripcion = await obtenerSuscripcion(uid);
    tier = suscripcion.tier;
  }

  return {
    ok: true,
    uid,
    tier,
    rateLimit: {
      limit: result.limit,
      remaining: result.remaining,
      resetAt: result.resetAt,
    },
    cuota: cuotaInfo,
  };
}

export function aplicarHeadersRateLimit(
  response: NextResponse,
  info: { limit: number; remaining: number; resetAt: number }
): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(info.limit));
  response.headers.set('X-RateLimit-Remaining', String(info.remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(info.resetAt / 1000)));
  return response;
}

export function aplicarHeadersCuota(
  response: NextResponse,
  info: { restanteTier: number; restanteHardCap: number; nuevoConsumo: number }
): NextResponse {
  response.headers.set('X-Quota-Used', String(info.nuevoConsumo));
  response.headers.set('X-Quota-Remaining-Tier', String(info.restanteTier));
  response.headers.set('X-Quota-Remaining-HardCap', String(info.restanteHardCap));
  return response;
}
