This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Configuración de variables de entorno

Además de las variables `NEXT_PUBLIC_FIREBASE_*` para el cliente, los endpoints de IA
requieren credenciales de servidor:

```bash
# API de OpenAI (requerida para /api/categorizar, /api/voz/transcribir y /api/voz/parsear)
OPENAI_API_KEY=sk-...

# Credenciales de Firebase Admin SDK (para verificar el ID token en los endpoints).
# Exporta el JSON completo del service account como una sola línea.
# Obtenlo desde Firebase Console → Project settings → Service accounts → Generate new private key.
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"..."}
```

Alternativamente, en entornos Google Cloud (Cloud Run / Functions) puedes omitir
`FIREBASE_SERVICE_ACCOUNT_JSON` y dejar que el SDK use las credenciales por defecto
de la aplicación (ADC).

**Nunca commitees `.env.local` ni el JSON del service account.** Están listados en `.gitignore`.

## Arquitectura de voz e IA

La app ofrece creación de tareas por voz en modo híbrido:

1. Si el navegador soporta **Web Speech API** (Chrome, Edge, Safari reciente), la
   transcripción ocurre totalmente en el dispositivo (sin coste).
2. Si no está disponible o falla, se graba audio con `MediaRecorder` y se envía a
   `/api/voz/transcribir` que usa **OpenAI Whisper** en el servidor.
3. El texto resultante se envía a `/api/voz/parsear`, donde **GPT-4o-mini**
   extrae un JSON estructurado `{ titulo, fechaLimite, carpeta }`. Si esta
   llamada falla, el cliente degrada a un parser local basado en expresiones
   regulares (100% offline).

### Endpoints de IA

Todos los endpoints bajo `/api/` requieren un Firebase ID token en el header
`Authorization: Bearer <token>` y aplican rate limiting por usuario:

| Endpoint               | Modelo           | Límite por usuario |
| ---------------------- | ---------------- | ------------------ |
| `/api/voz/transcribir` | `whisper-1`      | 30 req / hora      |
| `/api/voz/parsear`     | `gpt-4o-mini`    | 100 req / hora     |
| `/api/categorizar`     | `gpt-4o-mini`    | 100 req / hora     |

El rate limiter actual es en memoria (`lib/rate-limit.ts`). Si se escala a
múltiples instancias (p. ej. Vercel con varias regiones o Lambda), hay que
migrar a un store compartido (Upstash Redis, Vercel KV, etc.) para que el
límite sea efectivo globalmente.

## Seguridad

- **Firestore rules** (`firestore.rules`): cada usuario solo puede leer/escribir
  sus propios documentos en `tareas`, `completadas`, `carpetas` y `usuarios`.
  Las reglas también validan tipos y tamaños máximos para mitigar abuso del
  almacenamiento. Despliega las reglas con:

  ```bash
  firebase deploy --only firestore:rules
  ```

- **Verificación de ID token** (`lib/auth-server.ts`): todos los endpoints de
  IA validan el token mediante Firebase Admin SDK.
- **Rate limiting** (`lib/rate-limit.ts`): por uid, ventana móvil de 1 hora.
- **Validación de inputs**: tamaño máximo de audio (1 MB), tipos MIME
  permitidos, longitud máxima de texto (2000 chars) y de carpetas (60 chars).

## Publicación en tiendas (App Store / Google Play)

Esta es una PWA servida desde Next.js. Para empaquetarla como app nativa
(Capacitor, TWA, etc.) ten en cuenta:

- **Privacy policy**: obligatoria en ambas tiendas. Debe mencionar explícitamente
  que:
  - Se usa OpenAI para transcribir audio y categorizar tareas cuando el
    usuario invoca la función de voz.
  - El audio se envía cifrado (HTTPS) al servidor, se procesa en OpenAI y
    **no se almacena** tras la transcripción.
  - Los datos de tareas se guardan en Firebase Firestore y solo son
    accesibles por el usuario autenticado.
- **Descripciones de permisos**: si empaquetas con Capacitor, configura
  `NSMicrophoneUsageDescription` en `Info.plist` (iOS) y la razón de uso del
  permiso `RECORD_AUDIO` para Google Play.
- **Data safety (Google Play)** y **App Privacy (App Store)**: declara que la
  app recolecta identificadores (Firebase UID), contenido de usuario (tareas)
  y audio (de forma transitoria para transcribirlo).
- **Revisar** que `firestore.rules` está desplegado con las nuevas reglas
  antes de lanzar la app.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
