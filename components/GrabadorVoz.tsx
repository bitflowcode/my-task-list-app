"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { authedPostJson, authedPostFormData } from "../lib/api-client";

type ResultadoVoz = {
  texto: string;
  fechaLimite: string | null;
  carpeta: string | null;
};

type Props = {
  onResultado: (resultado: ResultadoVoz) => void;
  carpetasDisponibles: string[];
};

// Tipos para la Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

type ModoVoz = "webspeech" | "mediarecorder" | "ninguno";

const esSoportadoReconocimientoVoz = () => {
  if (typeof window === 'undefined') return false;
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
};

const esSoportadoMediaRecorder = () => {
  if (typeof window === 'undefined') return false;
  return typeof window.MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
};

const esIOS = () => {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
};

// Elegir el mejor mimeType disponible para MediaRecorder
const elegirMimeType = (): string | undefined => {
  if (typeof window === 'undefined' || typeof window.MediaRecorder === 'undefined') {
    return undefined;
  }
  const candidatos = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  for (const tipo of candidatos) {
    if (MediaRecorder.isTypeSupported(tipo)) return tipo;
  }
  return undefined;
};

export default function GrabadorVoz({ onResultado, carpetasDisponibles }: Props) {
  const [escuchando, setEscuchando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [texto, setTexto] = useState("");
  const [modo, setModo] = useState<ModoVoz>("ninguno");
  const [error, setError] = useState<string | null>(null);
  const [tiempoRestante, setTiempoRestante] = useState(0);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcripcionFinalRef = useRef<string>("");

  // Elegir el modo disponible al montar
  useEffect(() => {
    if (esSoportadoReconocimientoVoz()) {
      setModo("webspeech");
    } else if (esSoportadoMediaRecorder()) {
      setModo("mediarecorder");
    } else {
      setModo("ninguno");
    }
  }, []);

  // Calcular fecha para un día de la semana específico
  const calcularFechaParaDiaSemana = useCallback((nombreDia: string, esSiguiente: boolean = false): Date => {
    const diasSemana: { [key: string]: number } = {
      'domingo': 0, 'lunes': 1, 'martes': 2, 'miércoles': 3,
      'jueves': 4, 'viernes': 5, 'sábado': 6
    };

    const hoy = new Date();
    const diaActual = hoy.getDay();
    const diaObjetivo = diasSemana[nombreDia.toLowerCase()];

    if (diaObjetivo === undefined) return hoy;

    let diasParaAñadir = diaObjetivo - diaActual;

    if (diasParaAñadir <= 0 && esSiguiente) {
      diasParaAñadir += 7;
    } else if (diasParaAñadir < 0 && !esSiguiente) {
      diasParaAñadir += 7;
    }

    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() + diasParaAñadir);
    return fecha;
  }, []);

  // Análisis local con regex (fallback si falla el parseo con IA)
  const analizarTextoLocal = useCallback((texto: string): ResultadoVoz => {
    const resultado: ResultadoVoz = {
      texto: texto,
      fechaLimite: null,
      carpeta: null,
    };

    const textoLower = texto.toLowerCase();
    let textoLimpio = texto;

    const patronesHoy = [/\bhoy\b/i, /el día de hoy/i];
    const patronesManana = [/\bmañana\b/i, /el día de mañana/i];
    const patronesFechaPara = [
      /para el (\d{1,2}) de ([a-záéíóúñ]+)/i,
      /para el día (\d{1,2}) de ([a-záéíóúñ]+)/i,
      /para el próximo (\d{1,2}) de ([a-záéíóúñ]+)/i,
      /el (\d{1,2}) de ([a-záéíóúñ]+)/i,
      /el día (\d{1,2}) de ([a-záéíóúñ]+)/i,
    ];

    const patronDiaSemana = /(antes del|el|este|para el|próximo|siguiente) (lunes|martes|miércoles|jueves|viernes|sábado|domingo)( que viene)?/i;
    const patronProximaSemana = /(la |para la |en la )?(próxima|siguiente) semana/i;

    if (carpetasDisponibles.length > 0) {
      const patronCarpeta = new RegExp(`(?:en|para) la carpeta (${carpetasDisponibles.join('|')})`, 'i');
      const coincidenciaCarpeta = textoLower.match(patronCarpeta);
      if (coincidenciaCarpeta && coincidenciaCarpeta[1]) {
        resultado.carpeta = coincidenciaCarpeta[1];
        textoLimpio = textoLimpio.replace(new RegExp(coincidenciaCarpeta[0], 'i'), '').trim();
      }
    }

    const hoy = new Date();
    const manana = new Date();
    manana.setDate(hoy.getDate() + 1);

    if (patronesHoy.some(patron => patron.test(textoLower))) {
      resultado.fechaLimite = hoy.toISOString().split('T')[0];
      textoLimpio = textoLimpio.replace(/\b(?:para )?hoy\b/i, '').trim();
    } else if (patronesManana.some(patron => patron.test(textoLower))) {
      resultado.fechaLimite = manana.toISOString().split('T')[0];
      textoLimpio = textoLimpio.replace(/\b(?:para )?mañana\b/i, '').trim();
    } else if (patronProximaSemana.test(textoLower)) {
      const proximaSemana = new Date(hoy);
      proximaSemana.setDate(hoy.getDate() + 7);
      resultado.fechaLimite = proximaSemana.toISOString().split('T')[0];
      textoLimpio = textoLimpio.replace(patronProximaSemana, '').trim();
    } else if (patronDiaSemana.test(textoLower)) {
      const coincidencia = textoLower.match(patronDiaSemana);
      if (coincidencia) {
        const prefijo = coincidencia[1].toLowerCase();
        const diaSemana = coincidencia[2].toLowerCase();
        const esProximo = coincidencia[3] !== undefined ||
          prefijo.includes('próximo') ||
          prefijo.includes('siguiente');

        const fecha = calcularFechaParaDiaSemana(diaSemana, esProximo);
        if (prefijo === 'antes del') {
          fecha.setDate(fecha.getDate() - 1);
        }

        resultado.fechaLimite = fecha.toISOString().split('T')[0];
        textoLimpio = textoLimpio.replace(coincidencia[0], '').trim();
      }
    } else {
      const meses: { [key: string]: number } = {
        'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
        'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11,
      };
      for (const patron of patronesFechaPara) {
        const coincidencia = textoLower.match(patron);
        if (coincidencia) {
          const dia = parseInt(coincidencia[1]);
          const mes = meses[coincidencia[2].toLowerCase()];
          if (!isNaN(dia) && mes !== undefined) {
            const fecha = new Date();
            fecha.setDate(dia);
            fecha.setMonth(mes);
            if (fecha < hoy) {
              fecha.setFullYear(fecha.getFullYear() + 1);
            }
            resultado.fechaLimite = fecha.toISOString().split('T')[0];
            textoLimpio = textoLimpio.replace(new RegExp(coincidencia[0], 'i'), '').trim();
            break;
          }
        }
      }
    }

    resultado.texto = textoLimpio;
    return resultado;
  }, [carpetasDisponibles, calcularFechaParaDiaSemana]);

  // Parsear texto con IA (con fallback a análisis local)
  const parsearTextoConIA = useCallback(async (textoFinal: string): Promise<ResultadoVoz> => {
    try {
      const data = await authedPostJson<{
        titulo?: string;
        fechaLimite?: string | null;
        carpeta?: string | null;
      }>('/api/voz/parsear', { texto: textoFinal, carpetasDisponibles });

      if (typeof data?.titulo === 'string' && data.titulo.trim()) {
        return {
          texto: data.titulo.trim(),
          fechaLimite: typeof data.fechaLimite === 'string' ? data.fechaLimite : null,
          carpeta: typeof data.carpeta === 'string' ? data.carpeta : null,
        };
      }
      throw new Error('Respuesta inválida');
    } catch (err) {
      console.warn('Parseo con IA falló, usando análisis local:', err);
      return analizarTextoLocal(textoFinal);
    }
  }, [carpetasDisponibles, analizarTextoLocal]);

  const finalizarConTexto = useCallback(async (textoFinal: string) => {
    const limpio = textoFinal.trim();
    if (!limpio) return;
    setProcesando(true);
    try {
      const resultado = await parsearTextoConIA(limpio);
      onResultado(resultado);
    } finally {
      setProcesando(false);
    }
  }, [onResultado, parsearTextoConIA]);

  const limpiarMediaRecorder = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
  }, []);

  const detenerEscucha = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log("Error al detener reconocimiento:", e);
      }
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.log("Error al detener MediaRecorder:", e);
      }
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setEscuchando(false);
  }, []);

  // Temporizador visual (máximo 30 segundos)
  useEffect(() => {
    if (!escuchando) return;

    setTiempoRestante(30);

    const intervalId = setInterval(() => {
      setTiempoRestante(prev => {
        if (prev <= 1) {
          detenerEscucha();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [escuchando, detenerEscucha]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* ignore */ }
        recognitionRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
    };
  }, []);

  const chequearPermisosMicrofono = async (): Promise<boolean> => {
    try {
      if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
        const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (status.state === 'denied') {
          setError("El permiso del micrófono está bloqueado. Habilítalo en la configuración del navegador para este sitio.");
          return false;
        }
      }
    } catch {
      // API no soportada; se pedirá permiso al usar getUserMedia.
    }
    return true;
  };

  // --- Modo Web Speech API ---
  const iniciarWebSpeech = async () => {
    try {
      const Ctor = (window as unknown as {
        SpeechRecognition?: new () => SpeechRecognition;
        webkitSpeechRecognition?: new () => SpeechRecognition;
      }).SpeechRecognition || (window as unknown as {
        webkitSpeechRecognition?: new () => SpeechRecognition;
      }).webkitSpeechRecognition;

      if (!Ctor) throw new Error("SpeechRecognition no disponible");

      const recognition = new Ctor();
      recognitionRef.current = recognition;

      recognition.lang = 'es-ES';
      // En iOS Safari, continuous: true se corta al primer silencio.
      recognition.continuous = !esIOS();
      recognition.interimResults = true;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalChunk = "";
        let interim = "";
        for (let i = 0; i < event.results.length; i++) {
          const r = event.results[i];
          if (r.isFinal) {
            finalChunk += r[0].transcript + ' ';
          } else {
            interim += r[0].transcript;
          }
        }
        if (finalChunk) {
          transcripcionFinalRef.current = (transcripcionFinalRef.current + ' ' + finalChunk).trim();
        }
        setTexto((transcripcionFinalRef.current + ' ' + interim).trim());
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        let mensajeError = `Error de reconocimiento: ${event.error}`;
        if (event.error === 'not-allowed') {
          mensajeError = "No se ha concedido permiso para usar el micrófono.";
        } else if (event.error === 'no-speech') {
          mensajeError = "No se detectó ninguna voz. Por favor, intenta hablar más alto.";
        } else if (event.error === 'aborted') {
          mensajeError = "El reconocimiento de voz fue interrumpido.";
        } else if (event.error === 'audio-capture') {
          mensajeError = "No se pudo acceder al micrófono.";
        } else if (event.error === 'network') {
          mensajeError = "Error de red durante el reconocimiento de voz.";
        }
        setError(mensajeError);
        setEscuchando(false);
        recognitionRef.current = null;
      };

      recognition.onend = () => {
        setEscuchando(false);
        const textoFinal = transcripcionFinalRef.current.trim();
        recognitionRef.current = null;
        if (textoFinal) {
          void finalizarConTexto(textoFinal);
        }
      };

      if (navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(t => t.stop());
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Permiso denegado';
          setError(`No se pudo acceder al micrófono: ${msg}. Verifica los permisos del navegador.`);
          setEscuchando(false);
          recognitionRef.current = null;
          return;
        }
      }

      recognition.start();
    } catch (err) {
      console.error("Error al iniciar Web Speech API:", err);
      // Intentar fallback a MediaRecorder + Whisper si está disponible
      if (esSoportadoMediaRecorder()) {
        setModo("mediarecorder");
        setError(null);
        await iniciarMediaRecorder();
      } else {
        setError("Error al iniciar el reconocimiento de voz. Tu navegador podría no ser compatible.");
        setEscuchando(false);
      }
    }
  };

  // --- Modo MediaRecorder + Whisper ---
  const iniciarMediaRecorder = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = elegirMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onerror = (e) => {
        console.error("Error de MediaRecorder:", e);
        setError("Error al grabar el audio.");
        setEscuchando(false);
        limpiarMediaRecorder();
      };

      recorder.onstop = async () => {
        const chunks = audioChunksRef.current;
        const tipo = recorder.mimeType || 'audio/webm';
        limpiarMediaRecorder();

        if (chunks.length === 0) {
          setError("No se grabó audio.");
          return;
        }

        const blob = new Blob(chunks, { type: tipo });
        if (blob.size === 0) {
          setError("El audio grabado está vacío.");
          return;
        }

        setProcesando(true);
        try {
          const extension = tipo.includes('mp4') ? 'm4a' : tipo.includes('ogg') ? 'ogg' : 'webm';
          const formData = new FormData();
          formData.append('audio', new File([blob], `nota.${extension}`, { type: tipo }));

          const data = await authedPostFormData<{ texto?: string }>(
            '/api/voz/transcribir',
            formData
          );
          const textoTranscrito = typeof data?.texto === 'string' ? data.texto.trim() : '';
          if (!textoTranscrito) {
            setError("No se pudo transcribir el audio. Intenta de nuevo hablando más claro.");
            return;
          }
          setTexto(textoTranscrito);
          const resultado = await parsearTextoConIA(textoTranscrito);
          onResultado(resultado);
        } catch (err) {
          console.error("Error al transcribir:", err);
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          setError(`No se pudo transcribir el audio: ${msg}`);
        } finally {
          setProcesando(false);
        }
      };

      recorder.start();
    } catch (err) {
      console.error("Error al iniciar MediaRecorder:", err);
      const msg = err instanceof Error ? err.message : 'Permiso denegado';
      setError(`No se pudo acceder al micrófono: ${msg}. Verifica los permisos del navegador.`);
      setEscuchando(false);
      limpiarMediaRecorder();
    }
  };

  const iniciarEscucha = async () => {
    if (modo === 'ninguno') {
      setError("Tu navegador no soporta reconocimiento de voz ni grabación de audio.");
      return;
    }

    setError(null);
    setTexto("");
    transcripcionFinalRef.current = "";

    const permisoOk = await chequearPermisosMicrofono();
    if (!permisoOk) return;

    setEscuchando(true);

    if (modo === 'webspeech') {
      await iniciarWebSpeech();
    } else {
      await iniciarMediaRecorder();
    }
  };

  if (modo === 'ninguno') {
    return (
      <div className="rounded-lg border p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-sm">
        <p>Tu navegador no soporta el reconocimiento de voz ni la grabación de audio.</p>
        <p className="mt-1">Por favor, intenta con Chrome, Firefox o Safari en su versión más reciente.</p>
      </div>
    );
  }

  const deshabilitado = procesando || (escuchando && tiempoRestante === 0);

  return (
    <div className="relative mb-4">
      <div className="flex gap-2">
        <button
          onClick={escuchando ? detenerEscucha : iniciarEscucha}
          disabled={deshabilitado}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-full disabled:opacity-60 disabled:cursor-not-allowed ${
            escuchando
              ? "bg-red-500 text-white animate-pulse"
              : "bg-blue-500 hover:bg-blue-600 text-white"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="currentColor"
            viewBox="0 0 16 16"
          >
            <path d="M8 11a3 3 0 0 0 3-3V4a3 3 0 0 0-6 0v4a3 3 0 0 0 3 3z" />
            <path d="M13 8c0 2.03-1.2 3.8-3 4.58v1.42h-4v-1.42c-1.8-.78-3-2.55-3-4.58h2a3 3 0 0 0 6 0h2z" />
          </svg>
          {escuchando ? `Detener (${tiempoRestante}s)` : procesando ? "Procesando..." : "Hablar"}
        </button>

        {escuchando && (
          <button
            onClick={detenerEscucha}
            className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-full"
          >
            Listo
          </button>
        )}
      </div>

      {escuchando && (
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Habla claramente. Di &quot;para hoy escribir&quot;, &quot;el jueves que viene llamar a&quot; o menciona una fecha y carpeta.
          {modo === 'mediarecorder' && (
            <span className="block text-xs mt-1">Usando transcripción en servidor.</span>
          )}
        </div>
      )}

      {procesando && !escuchando && (
        <div className="mt-2 text-sm text-blue-600 dark:text-blue-400">
          Procesando audio...
        </div>
      )}

      {texto && (
        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
          <p className="text-sm font-medium mb-1">Texto reconocido:</p>
          <p className="text-sm">{texto}</p>
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          {error.includes('permiso') && (
            <p className="text-xs mt-1 text-red-700 dark:text-red-300">
              Verifica que has concedido permiso al micrófono en la configuración de tu navegador.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
