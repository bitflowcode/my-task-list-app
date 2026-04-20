import 'server-only';
import { NextResponse } from 'next/server';
import { verifyIdToken, AuthError } from './auth-server';
import { checkRateLimit } from './rate-limit';

export type GuardResult =
  | { ok: true; uid: string; rateLimit: { limit: number; remaining: number; resetAt: number } }
  | { ok: false; response: NextResponse };

export type GuardOptions = {
  bucket: string;
  limit: number;
  windowMs: number;
};

/**
 * Verifica auth (Firebase ID token) y aplica rate limit por uid.
 * Si algo falla, devuelve una NextResponse lista para retornar desde la ruta.
 */
export async function guardApi(request: Request, opts: GuardOptions): Promise<GuardResult> {
  let uid: string;
  try {
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

  return {
    ok: true,
    uid,
    rateLimit: {
      limit: result.limit,
      remaining: result.remaining,
      resetAt: result.resetAt,
    },
  };
}

/** Añade headers informativos de rate limit a una NextResponse. */
export function aplicarHeadersRateLimit(
  response: NextResponse,
  info: { limit: number; remaining: number; resetAt: number }
): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(info.limit));
  response.headers.set('X-RateLimit-Remaining', String(info.remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(info.resetAt / 1000)));
  return response;
}
