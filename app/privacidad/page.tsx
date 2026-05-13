import Link from "next/link";

export const metadata = {
  title: "Política de Privacidad - Mi Lista de Tareas",
  description:
    "Información sobre el tratamiento de datos personales de la aplicación Mi Lista de Tareas.",
};

export default function PaginaPrivacidad() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 text-gray-800 dark:text-gray-100">
      <nav className="mb-6 text-sm">
        <Link
          href="/"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          &larr; Volver a la app
        </Link>
      </nav>

      <h1 className="text-3xl font-bold mb-2">Política de Privacidad</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
        Última actualización: 20 de abril de 2026
      </p>

      <section className="space-y-6 leading-relaxed">
        <p>
          Esta Política de Privacidad describe cómo Mi Lista de Tareas (en
          adelante, &quot;la App&quot;) recoge, usa y protege tus datos
          personales. La App está dirigida a usuarios particulares y es
          operada por un autónomo/empresa individual establecido en España.
        </p>

        <h2 className="text-2xl font-semibold mt-8">1. Responsable del tratamiento</h2>
        <p>
          Eduardo Rodríguez (autónomo, España) es el responsable del
          tratamiento de los datos personales recogidos a través de la App.
          Para cualquier consulta sobre tus datos puedes contactar por
          correo electrónico a{" "}
          <a
            href="mailto:edurodriguezg@gmail.com"
            className="text-blue-600 dark:text-blue-400 underline"
          >
            edurodriguezg@gmail.com
          </a>
          .
        </p>

        <h2 className="text-2xl font-semibold mt-8">2. Datos que recogemos</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Datos de cuenta</strong>: dirección de correo electrónico,
            nombre mostrado, identificador único de usuario (UID) y marca
            temporal de creación/último acceso, proporcionados al registrarte
            con email y contraseña o con Google.
          </li>
          <li>
            <strong>Contenido generado</strong>: títulos, fechas límite y
            carpetas de las tareas que creas dentro de la App.
          </li>
          <li>
            <strong>Datos de uso de IA</strong>: contadores mensuales de
            llamadas a servicios de IA (transcripción y categorización) por
            usuario, para aplicar los límites del plan.
          </li>
          <li>
            <strong>Audio</strong> (solo si usas la función de voz): el audio
            se transmite de forma cifrada a OpenAI para transcribirlo y{" "}
            <strong>no se almacena en nuestros servidores</strong>. OpenAI,
            según su política, no usa los datos de la API para entrenar modelos
            y los retiene solo durante 30 días para detección de abusos.
          </li>
          <li>
            <strong>Datos de suscripción</strong> (si adquieres premium): se
            gestionan a través de App Store / Google Play. Nosotros solo
            guardamos el estado de tu suscripción (activa / expirada, plan,
            fecha de renovación) sin datos de pago.
          </li>
          <li>
            <strong>Datos técnicos</strong>: dirección IP, tipo de dispositivo
            y sistema operativo de forma transitoria para prestar el servicio.
            No se usan cookies de seguimiento.
          </li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8">3. Finalidad y base legal</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Ejecución del contrato</strong> (art. 6.1.b RGPD): para
            darte acceso a la cuenta, guardar tus tareas, sincronizarlas
            entre dispositivos y procesar tu suscripción.
          </li>
          <li>
            <strong>Interés legítimo</strong> (art. 6.1.f RGPD): para
            prevenir abusos del servicio (rate limiting y cuotas) y mantener
            la seguridad de la App.
          </li>
          <li>
            <strong>Consentimiento</strong> (art. 6.1.a RGPD): para procesar
            audio con OpenAI al usar la función de voz. Puedes retirar el
            consentimiento en cualquier momento dejando de usar esa función.
          </li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8">4. Encargados del tratamiento</h2>
        <p>Compartimos datos con los siguientes proveedores, únicamente en la medida necesaria para prestar el servicio:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Google Ireland Ltd.</strong> (Firebase Authentication y
            Firestore): autenticación y almacenamiento de la base de datos de
            tareas, dentro del Espacio Económico Europeo.
          </li>
          <li>
            <strong>OpenAI, L.L.C.</strong> (EE. UU., con Cláusulas
            Contractuales Tipo de la UE): transcripción de audio (Whisper) y
            análisis de texto (GPT-4o-mini).
          </li>
          <li>
            <strong>Vercel, Inc.</strong>: hosting del servicio web.
          </li>
          <li>
            <strong>RevenueCat, Inc.</strong>: gestión técnica de la
            suscripción (los pagos los procesan Apple y Google).
          </li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8">5. Transferencias internacionales</h2>
        <p>
          Las transferencias a proveedores en EE. UU. se realizan amparadas
          por el Data Privacy Framework UE-EE. UU. o, en su defecto, por las
          Cláusulas Contractuales Tipo aprobadas por la Comisión Europea.
        </p>

        <h2 className="text-2xl font-semibold mt-8">6. Conservación de los datos</h2>
        <p>
          Tus datos se conservan mientras mantengas tu cuenta activa. Si
          decides{" "}
          <strong>
            eliminar tu cuenta desde el apartado &quot;Perfil&quot;
          </strong>
          , todos tus datos (tareas, carpetas, perfil, cuotas, suscripción)
          se borran de forma permanente e inmediata. Las copias de seguridad
          rotatorias pueden conservar una imagen de los datos por un máximo
          de 30 días adicionales.
        </p>

        <h2 className="text-2xl font-semibold mt-8">7. Tus derechos</h2>
        <p>
          Puedes ejercer los derechos de <strong>Acceso</strong>,{" "}
          <strong>Rectificación</strong>, <strong>Cancelación (supresión)</strong>,{" "}
          <strong>Oposición</strong>, <strong>Limitación del tratamiento</strong> y{" "}
          <strong>Portabilidad</strong> de los datos:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            Desde el apartado <strong>&quot;Perfil&quot;</strong> de la App,
            puedes editar tu nombre, exportar todos tus datos en JSON y
            eliminar tu cuenta.
          </li>
          <li>
            También puedes escribir a{" "}
            <a
              href="mailto:edurodriguezg@gmail.com"
              className="text-blue-600 dark:text-blue-400 underline"
            >
              edurodriguezg@gmail.com
            </a>{" "}
            indicando el derecho que quieres ejercer.
          </li>
          <li>
            Tienes derecho a presentar una reclamación ante la Agencia
            Española de Protección de Datos ({" "}
            <a
              href="https://www.aepd.es"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 underline"
            >
              www.aepd.es
            </a>
            ).
          </li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8">8. Menores de edad</h2>
        <p>
          La App no está dirigida a menores de 14 años. Si eres menor,
          necesitas el consentimiento de tu padre, madre o tutor para usarla.
          No recabamos intencionadamente datos de menores.
        </p>

        <h2 className="text-2xl font-semibold mt-8">9. Seguridad</h2>
        <p>
          Aplicamos medidas técnicas y organizativas razonables: cifrado en
          tránsito (HTTPS/TLS), verificación de token en cada llamada,
          reglas de Firestore que impiden el acceso cruzado entre usuarios,
          rate limiting y cuotas mensuales para prevenir abusos.
        </p>

        <h2 className="text-2xl font-semibold mt-8">10. Cambios</h2>
        <p>
          Podemos actualizar esta política para reflejar cambios legales o
          del servicio. Publicaremos la versión vigente en esta misma
          URL y notificaremos cambios relevantes dentro de la App.
        </p>

        <h2 className="text-2xl font-semibold mt-8">11. Contacto</h2>
        <p>
          Para cualquier cuestión relacionada con esta política o con el
          tratamiento de tus datos, escribe a{" "}
          <a
            href="mailto:edurodriguezg@gmail.com"
            className="text-blue-600 dark:text-blue-400 underline"
          >
            edurodriguezg@gmail.com
          </a>
          .
        </p>
      </section>

      <footer className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
        <Link
          href="/terminos"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          Términos y Condiciones
        </Link>
      </footer>
    </div>
  );
}
