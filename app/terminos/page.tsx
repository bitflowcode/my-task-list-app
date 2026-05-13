import Link from "next/link";

export const metadata = {
  title: "Términos y Condiciones - Mi Lista de Tareas",
  description:
    "Términos y condiciones de uso de la aplicación Mi Lista de Tareas.",
};

export default function PaginaTerminos() {
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

      <h1 className="text-3xl font-bold mb-2">Términos y Condiciones</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
        Última actualización: 20 de abril de 2026
      </p>

      <section className="space-y-6 leading-relaxed">
        <h2 className="text-2xl font-semibold">1. Aceptación</h2>
        <p>
          Al crear una cuenta o usar Mi Lista de Tareas (en adelante,
          &quot;la App&quot;) aceptas estos Términos y Condiciones en su
          totalidad. Si no estás de acuerdo, no uses la App.
        </p>

        <h2 className="text-2xl font-semibold mt-8">2. Descripción del servicio</h2>
        <p>
          La App es una herramienta de productividad personal que permite
          crear, organizar y consultar tareas con la opción de usar voz e
          inteligencia artificial para agilizar la introducción de datos.
          Incluye funciones gratuitas y funciones premium accesibles por
          suscripción.
        </p>

        <h2 className="text-2xl font-semibold mt-8">3. Registro y cuenta</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            Debes tener al menos 14 años. Si eres menor, necesitas el
            consentimiento de tu padre, madre o tutor.
          </li>
          <li>
            Eres responsable de mantener la seguridad de tu contraseña y de
            toda actividad realizada con tu cuenta.
          </li>
          <li>
            La App no está pensada para almacenar información sensible
            (datos de salud, bancarios, confesiones religiosas, etc.). No
            uses la App para ello.
          </li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8">4. Suscripción premium</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            La suscripción premium se contrata a través de App Store (Apple)
            o Google Play (Google). Los precios, impuestos y condiciones de
            pago son los mostrados por cada tienda en el momento de la
            compra.
          </li>
          <li>
            La suscripción se <strong>renueva automáticamente</strong> por el
            mismo periodo al final de cada ciclo, salvo que la canceles con
            al menos 24 horas de antelación desde la configuración de tu
            cuenta en App Store o Google Play.
          </li>
          <li>
            La gestión, cancelación y reembolso de la suscripción se hace
            exclusivamente desde la tienda correspondiente; nosotros no
            podemos reembolsar pagos procesados por Apple o Google.
          </li>
          <li>
            Si tu suscripción expira, tu cuenta continúa funcionando con las
            limitaciones del plan gratuito, sin pérdida de tus tareas.
          </li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8">5. Uso aceptable</h2>
        <p>Al usar la App te comprometes a NO:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            Intentar saltarte los límites de uso, acceder a cuentas ajenas o
            interferir con el servicio.
          </li>
          <li>
            Usar la App para actividades ilegales, difundir contenido de
            odio, acoso, pornografía o material protegido por copyright sin
            autorización.
          </li>
          <li>
            Automatizar o revender las funciones de IA (transcripción,
            categorización) como si fueran tuyas.
          </li>
          <li>
            Enviar audio con voz de terceros sin su consentimiento.
          </li>
        </ul>
        <p>
          Nos reservamos el derecho a suspender o cerrar cuentas que
          incumplan estos términos, especialmente si se detecta abuso
          automatizado de la IA.
        </p>

        <h2 className="text-2xl font-semibold mt-8">6. Propiedad intelectual</h2>
        <p>
          El código, diseño, logotipos y marcas de la App son propiedad del
          responsable del tratamiento. El contenido que tú generas (tareas)
          es tuyo; nos concedes la licencia mínima necesaria para
          almacenarlo, sincronizarlo y procesarlo con los servicios de IA
          descritos en la Política de Privacidad.
        </p>

        <h2 className="text-2xl font-semibold mt-8">7. Limitación de responsabilidad</h2>
        <p>
          La App se proporciona &quot;tal cual&quot;. No garantizamos que
          esté libre de errores o interrupciones. En la máxima medida
          permitida por la ley, no seremos responsables de daños indirectos,
          pérdida de datos o lucro cesante derivados del uso o
          imposibilidad de uso de la App.
        </p>
        <p>
          Esta cláusula no limita tus derechos como consumidor bajo la
          legislación española y europea, ni la responsabilidad por dolo o
          negligencia grave.
        </p>

        <h2 className="text-2xl font-semibold mt-8">8. IA y exactitud</h2>
        <p>
          Las funciones de transcripción por voz y categorización por IA
          pueden cometer errores. Te recomendamos revisar siempre el título,
          la fecha y la carpeta antes de guardar una tarea. No nos hacemos
          responsables de las consecuencias de actuar basándose únicamente
          en lo que la IA haya generado.
        </p>

        <h2 className="text-2xl font-semibold mt-8">9. Baja y eliminación de cuenta</h2>
        <p>
          Puedes dar de baja tu cuenta en cualquier momento desde el
          apartado &quot;Perfil&quot; de la App. La eliminación borra de
          forma permanente tus tareas, carpetas y datos asociados. Si
          tenías una suscripción activa, recuerda cancelarla también en la
          tienda correspondiente para detener futuros cobros.
        </p>

        <h2 className="text-2xl font-semibold mt-8">10. Cambios</h2>
        <p>
          Podemos modificar estos Términos. La versión vigente estará
          siempre accesible en esta URL. Si los cambios afectan
          significativamente a tus derechos, te avisaremos dentro de la
          App con antelación razonable.
        </p>

        <h2 className="text-2xl font-semibold mt-8">11. Ley aplicable y jurisdicción</h2>
        <p>
          Estos Términos se rigen por la legislación española. Para las
          controversias relativas a consumidores, los tribunales
          competentes son los del domicilio del usuario. Para el resto, las
          partes se someten a los juzgados y tribunales de Madrid, España.
        </p>

        <h2 className="text-2xl font-semibold mt-8">12. Contacto</h2>
        <p>
          Dudas o reclamaciones: escribe a{" "}
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
          href="/privacidad"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          Política de Privacidad
        </Link>
      </footer>
    </div>
  );
}
