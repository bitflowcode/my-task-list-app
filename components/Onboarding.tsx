"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";

type Slide = {
  emoji: string;
  titulo: string;
  descripcion: string;
};

const SLIDES: Slide[] = [
  {
    emoji: "📝",
    titulo: "Organiza tu día en segundos",
    descripcion:
      "Crea tareas, asígnales fecha límite y colócalas en carpetas. Todo se sincroniza entre tus dispositivos automáticamente.",
  },
  {
    emoji: "🎙️",
    titulo: "Dicta por voz en lenguaje natural",
    descripcion:
      "Di algo como \"llamar al dentista el viernes\" y la app extrae el título y la fecha con IA. Si tu navegador no soporta dictado, transcribimos el audio automáticamente.",
  },
  {
    emoji: "🗂️",
    titulo: "Categorización inteligente",
    descripcion:
      "Sugerimos la carpeta más adecuada según el texto de la tarea, usando IA. Puedes aceptarla o cambiarla con un toque.",
  },
  {
    emoji: "🔒",
    titulo: "Privado y tuyo",
    descripcion:
      "Tus tareas solo las ves tú. Puedes exportar todos tus datos o eliminar tu cuenta en cualquier momento desde tu perfil.",
  },
];

const STORAGE_KEY_PREFIX = "onboarding-visto:";

function claveUsuario(uid: string): string {
  return `${STORAGE_KEY_PREFIX}${uid}`;
}

/**
 * Muestra un pequeño tutorial al primer login de cada usuario. Guarda en
 * localStorage que ya lo vio; no se vuelve a mostrar salvo que borre el
 * caché o entre en otro dispositivo (aceptable, es un onboarding corto).
 */
export default function Onboarding() {
  const { user } = useAuth();
  const [indice, setIndice] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (typeof window === "undefined") return;

    const visto = window.localStorage.getItem(claveUsuario(user.uid));
    if (!visto) {
      setIndice(0);
      setVisible(true);
    }
  }, [user]);

  if (!visible || !user) return null;

  const slide = SLIDES[indice];
  const esUltima = indice === SLIDES.length - 1;

  function cerrar() {
    if (user) {
      window.localStorage.setItem(claveUsuario(user.uid), new Date().toISOString());
    }
    setVisible(false);
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm p-6 text-gray-800 dark:text-gray-100">
        <div className="text-center">
          <div className="text-5xl mb-4">{slide.emoji}</div>
          <h2 className="text-xl font-bold mb-2">{slide.titulo}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            {slide.descripcion}
          </p>
        </div>

        <div className="flex justify-center gap-2 mb-5">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === indice ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"
              }`}
            />
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={cerrar}
            className="flex-1 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            Saltar
          </button>
          {esUltima ? (
            <button
              onClick={cerrar}
              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-semibold"
            >
              Empezar
            </button>
          ) : (
            <button
              onClick={() => setIndice(i => i + 1)}
              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-semibold"
            >
              Siguiente
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
