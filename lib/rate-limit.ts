import 'server-only';

/**
 * Rate limiter en memoria por clave (p. ej. uid o bucket).
 *
 * Limitaciones:
 *  - Válido solo para despliegues single-instance (p. ej. un contenedor Next.js).
 *  - En entornos serverless con múltiples instancias (Vercel multi-región, Lambda),
 *    cada instancia tiene su propio contador y el límite efectivo será mayor al configurado.
 *    Para esos casos, reemplazar por Upstash Redis / Vercel KV.
 */

type Entrada = {
  count: number;
  resetAt: number;
};

type Bucket = Map<string, Entrada>;

const buckets: Map<string, Bucket> = new Map();

function getBucket(nombre: string): Bucket {
  let bucket = buckets.get(nombre);
  if (!bucket) {
    bucket = new Map();
    buckets.set(nombre, bucket);
  }
  return bucket;
}

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: number;
};

export type RateLimitOptions = {
  bucket: string;
  key: string;
  limit: number;
  windowMs: number;
};

export function checkRateLimit(opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const bucket = getBucket(opts.bucket);
  const actual = bucket.get(opts.key);

  if (!actual || actual.resetAt <= now) {
    const nuevo: Entrada = { count: 1, resetAt: now + opts.windowMs };
    bucket.set(opts.key, nuevo);
    return {
      allowed: true,
      limit: opts.limit,
      remaining: opts.limit - 1,
      retryAfterSeconds: 0,
      resetAt: nuevo.resetAt,
    };
  }

  if (actual.count >= opts.limit) {
    return {
      allowed: false,
      limit: opts.limit,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((actual.resetAt - now) / 1000)),
      resetAt: actual.resetAt,
    };
  }

  actual.count += 1;
  return {
    allowed: true,
    limit: opts.limit,
    remaining: opts.limit - actual.count,
    retryAfterSeconds: 0,
    resetAt: actual.resetAt,
  };
}

/**
 * Limpia entradas vencidas. Se ejecuta perezosamente en cada check;
 * expuesto por si se quiere llamar desde un cron.
 */
export function limpiarEntradasVencidas(): number {
  const now = Date.now();
  let eliminadas = 0;
  for (const bucket of buckets.values()) {
    for (const [k, v] of bucket.entries()) {
      if (v.resetAt <= now) {
        bucket.delete(k);
        eliminadas++;
      }
    }
  }
  return eliminadas;
}

// Limites pre-configurados por endpoint (en requests por hora por usuario).
export const LIMITES = {
  TRANSCRIBIR: { limit: 30, windowMs: 60 * 60 * 1000 },
  PARSEAR:     { limit: 100, windowMs: 60 * 60 * 1000 },
  CATEGORIZAR: { limit: 100, windowMs: 60 * 60 * 1000 },
} as const;
