import 'server-only';
import { getApps, initializeApp, cert, applicationDefault, App } from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';

let adminApp: App | null = null;

function getAdminApp(): App {
  if (adminApp) return adminApp;

  const existing = getApps();
  if (existing.length > 0) {
    adminApp = existing[0];
    return adminApp;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    try {
      const parsed = JSON.parse(serviceAccountJson);
      adminApp = initializeApp({
        credential: cert({
          projectId: parsed.project_id,
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key,
        }),
      });
      return adminApp;
    } catch (err) {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT_JSON presente pero no es un JSON válido: ' +
          (err instanceof Error ? err.message : String(err))
      );
    }
  }

  // Fallback a ADC (útil en Cloud Run / Functions). Requiere GOOGLE_APPLICATION_CREDENTIALS.
  adminApp = initializeApp({ credential: applicationDefault() });
  return adminApp;
}

/**
 * Verifica el Firebase ID token presente en el header Authorization: Bearer <token>
 * y devuelve el token decodificado. Lanza Error si no es válido o falta.
 */
export async function verifyIdToken(request: Request): Promise<DecodedIdToken> {
  const header = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    throw new AuthError('Falta el token de autenticación', 401);
  }
  const token = header.slice(7).trim();
  if (!token) {
    throw new AuthError('Token vacío', 401);
  }

  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token, true);
    return decoded;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new AuthError(`Token inválido: ${msg}`, 401);
  }
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}
