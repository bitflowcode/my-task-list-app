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

> **Nota sobre zonas horarias**: el parseo de expresiones relativas
> ("el viernes", "mañana", etc.) usa `Europe/Madrid` como zona horaria de
> referencia (constante `ZONA_HORARIA_USUARIO` en
> [app/api/voz/parsear/route.ts](app/api/voz/parsear/route.ts)). El
> servidor pre-calcula el calendario de los próximos 14 días en esa zona y
> lo inyecta en el prompt, para evitar errores aritméticos del modelo. Si
> en el futuro se publica la app para usuarios fuera de España, la zona
> horaria debería enviarse desde el cliente según la ubicación del
> dispositivo (`Intl.DateTimeFormat().resolvedOptions().timeZone`).

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

## Monetización y cuotas

- **Tiers**: `free` y `premium`. El documento `suscripciones/{uid}` guarda el
  estado (gestionado por el webhook de RevenueCat en `/api/revenuecat/webhook`).
  El usuario solo tiene permiso de lectura sobre el suyo.
- **Cuotas mensuales persistentes**: la colección `cuotas_uso/{uid}_{YYYYMM}`
  almacena el consumo de IA del mes. Los endpoints de IA consumen cuota
  transaccionalmente (`lib/cuotas.ts`). Límites por tier en
  `LIMITES_TIER` y hard cap global en `HARD_CAP`.
- **Respuestas 402 / 403**: al exceder la cuota del tier se devuelve 402
  (indicando `upgradeDisponible`) y al exceder el hard cap se devuelve 403
  con la cuenta efectivamente bloqueada hasta fin de mes.
- **Paywall**: `components/Paywall.tsx` se muestra automáticamente al
  recibir un 402 vía `lib/paywall-bus.ts`. El componente `<RequierePremium>`
  envuelve funcionalidad premium en cliente.

## Perfil y GDPR

- `components/PerfilUsuario.tsx` (modal accesible desde la barra de navegación):
  editar nombre, ver miembro desde, ver uso del mes, exportar datos, cerrar
  sesión y **eliminar cuenta** (doble confirmación con reauth).
- `/api/cuenta/exportar` (GET): descarga un JSON con todo el perfil, tareas,
  completadas, carpetas, suscripción y cuotas del usuario.
- `/api/cuenta/eliminar` (POST): borra en cascada todas las colecciones del
  usuario y llama `auth.deleteUser()`. Requiere un ID token con `auth_time`
  reciente (Firebase reauthentication).
- Páginas legales estáticas: [/privacidad](app/privacidad/page.tsx) y
  [/terminos](app/terminos/page.tsx), accesibles sin autenticar.

## Notificaciones, widgets, analytics

- **FCM**: `lib/notificaciones.ts` (cliente) + `public/firebase-messaging-sw.js`
  (SW web) + cron horario `/api/cron/recordatorios` declarado en
  `vercel.json`. Necesita `CRON_SECRET` y `NEXT_PUBLIC_FCM_VAPID_KEY`. Ver
  [docs/publicacion/notificaciones.md](docs/publicacion/notificaciones.md).
- **Widgets iOS/Android**: el endpoint `/api/widgets/tareas-proximas`
  devuelve hasta 5 tareas próximas para ser consumido por un Widget
  Extension (WidgetKit) o un AppWidget Glance. Esqueletos Swift/Kotlin en
  [docs/publicacion/widgets.md](docs/publicacion/widgets.md).
- **Analytics**: Firebase Analytics + PostHog unificados en
  `lib/analytics.ts`. Se inicializan desde `app/layout.tsx` y se
  auto-deshabilitan si no hay claves configuradas.
- **Onboarding**: `components/Onboarding.tsx` muestra un tutorial de 4
  slides en el primer login (persistido en `localStorage`).

## App Check

Firebase App Check está integrado tanto en cliente (`lib/firebase.ts` con
reCAPTCHA v3 en web) como en servidor (`lib/auth-server.ts` →
`verificarAppCheck`). Controla la aplicación con la variable de entorno
`APPCHECK_ENFORCE`:

- Sin configurar o `APPCHECK_ENFORCE=0`: modo **monitor**, registra en
  consola los tokens inválidos pero no bloquea la petición.
- `APPCHECK_ENFORCE=1`: modo **enforce**, rechaza peticiones sin token o
  con token inválido con `401`.

Ver guía completa en [docs/publicacion/app-check.md](docs/publicacion/app-check.md).

## Publicación en tiendas (App Store / Google Play)

Documentación detallada en `docs/publicacion/`:

- [capacitor.md](docs/publicacion/capacitor.md): comandos `cap:add:ios`,
  `cap:add:android`, permisos, plugins y assets.
- [iap-productos.md](docs/publicacion/iap-productos.md): creación de
  productos `premium_monthly` (2,99€) y `premium_yearly` (24,99€) con
  trial de 7 días en App Store Connect, Google Play Console y RevenueCat.
- [envio.md](docs/publicacion/envio.md): checklist pre-envío, metadata y
  proceso de revisión Apple/Google.
- [app-check.md](docs/publicacion/app-check.md): configuración de
  reCAPTCHA v3 (web), App Attest (iOS) y Play Integrity (Android).
- [notificaciones.md](docs/publicacion/notificaciones.md): setup de FCM
  en web y móvil.
- [widgets.md](docs/publicacion/widgets.md): widgets de pantalla de
  inicio con las próximas tareas.

### Requisitos legales



Esta es una PWA servida desde Next.js empaquetada como app nativa con
Capacitor:

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
