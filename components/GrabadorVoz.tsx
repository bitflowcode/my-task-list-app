"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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

// Definimos un tipo para SpeechRecognition para evitar usar 'any'
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

// Verifica si el navegador soporta la API de reconocimiento de voz
const esSoportadoReconocimientoVoz = () => {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
};

export default function GrabadorVoz({ onResultado, carpetasDisponibles }: Props) {
  const [escuchando, setEscuchando] = useState(false);
  const [texto, setTexto] = useState("");
  const [esCompatible, setEsCompatible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tiempoRestante, setTiempoRestante] = useState(0);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Verificar compatibilidad al cargar el componente
  useEffect(() => {
    setEsCompatible(esSoportadoReconocimientoVoz());
  }, []);

  // Temporizador para la grabación (máximo 30 segundos)
  useEffect(() => {
    if (escuchando) {
      setTiempoRestante(30);
      
      // Actualizar contador cada segundo
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
    }
  }, [escuchando]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      detenerEscucha();
    };
  }, []);

  // Calcular fecha para un día de la semana específico
  const calcularFechaParaDiaSemana = useCallback((nombreDia: string, esSiguiente: boolean = false): Date => {
    const diasSemana: {[key: string]: number} = {
      'domingo': 0, 'lunes': 1, 'martes': 2, 'miércoles': 3, 
      'jueves': 4, 'viernes': 5, 'sábado': 6
    };
    
    const hoy = new Date();
    const diaActual = hoy.getDay(); // 0-6 (domingo-sábado)
    const diaObjetivo = diasSemana[nombreDia.toLowerCase()];
    
    if (diaObjetivo === undefined) return hoy;
    
    let diasParaAñadir = diaObjetivo - diaActual;
    
    // Si el día ya pasó esta semana o es hoy y queremos el de la próxima semana
    if (diasParaAñadir <= 0 && esSiguiente) {
      diasParaAñadir += 7;
    }
    // Si el día ya pasó esta semana y no especificamos "siguiente/próximo", asumimos la próxima
    else if (diasParaAñadir < 0 && !esSiguiente) {
      diasParaAñadir += 7;
    }
    
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() + diasParaAñadir);
    return fecha;
  }, []);

  // Analizar el texto para extraer información de la tarea
  const analizarTexto = useCallback((texto: string): ResultadoVoz => {
    const resultado: ResultadoVoz = {
      texto: texto,
      fechaLimite: null,
      carpeta: null
    };

    // Texto para análisis (en minúsculas)
    const textoLower = texto.toLowerCase();
    let textoLimpio = texto;

    // Expresiones regulares para buscar fechas en español
    const patronesHoy = [/hoy/i, /el día de hoy/i];
    const patronesManana = [/mañana/i, /el día de mañana/i];
    const patronesFechaPara = [
      /para el (\d{1,2}) de ([a-zá-úñ]+)/i,
      /para el día (\d{1,2}) de ([a-zá-úñ]+)/i,
      /para el próximo (\d{1,2}) de ([a-zá-úñ]+)/i,
      /el (\d{1,2}) de ([a-zá-úñ]+)/i,
      /el día (\d{1,2}) de ([a-zá-úñ]+)/i
    ];

    // Patrones para días de la semana
    const patronDiaSemana = /(antes del|el|este|para el|próximo|siguiente) (lunes|martes|miércoles|jueves|viernes|sábado|domingo)( que viene)?/i;
    const patronProximaSemana = /(la |para la |en la )?(próxima|siguiente) semana/i;
    
    // Buscar "para" o "en" seguido de una carpeta
    const patronCarpeta = new RegExp(`(?:en|para) la carpeta (${carpetasDisponibles.join('|')})`, 'i');
    const coincidenciaCarpeta = textoLower.match(patronCarpeta);
    
    if (coincidenciaCarpeta && coincidenciaCarpeta[1]) {
      resultado.carpeta = coincidenciaCarpeta[1];
      // Eliminar la referencia a la carpeta del texto
      textoLimpio = textoLimpio.replace(new RegExp(coincidenciaCarpeta[0], 'i'), '').trim();
    }

    // Determinar la fecha límite
    const hoy = new Date();
    const manana = new Date();
    manana.setDate(hoy.getDate() + 1);

    // Comprobar "hoy"
    if (patronesHoy.some(patron => patron.test(textoLower))) {
      resultado.fechaLimite = hoy.toISOString().split('T')[0];
      textoLimpio = textoLimpio.replace(/(?:para )? hoy/i, '').trim();
    } 
    // Comprobar "mañana"
    else if (patronesManana.some(patron => patron.test(textoLower))) {
      resultado.fechaLimite = manana.toISOString().split('T')[0];
      textoLimpio = textoLimpio.replace(/(?:para )? mañana/i, '').trim();
    }
    // Comprobar "próxima semana"
    else if (patronProximaSemana.test(textoLower)) {
      const proximaSemana = new Date(hoy);
      proximaSemana.setDate(hoy.getDate() + 7);
      resultado.fechaLimite = proximaSemana.toISOString().split('T')[0];
      textoLimpio = textoLimpio.replace(patronProximaSemana, '').trim();
    }
    // Comprobar días de la semana ("jueves que viene", "próximo lunes", etc.)
    else if (patronDiaSemana.test(textoLower)) {
      const coincidencia = textoLower.match(patronDiaSemana);
      if (coincidencia) {
        const prefijo = coincidencia[1].toLowerCase(); // "antes del", "el", "próximo", etc.
        const diaSemana = coincidencia[2].toLowerCase(); // "lunes", "martes", etc.
        const esProximo = coincidencia[3] !== undefined || 
                          prefijo.includes('próximo') || 
                          prefijo.includes('siguiente');
        
        // Calcular la fecha para ese día de la semana
        const fecha = calcularFechaParaDiaSemana(diaSemana, esProximo);
        
        // Si es "antes del", retroceder un día
        if (prefijo === 'antes del') {
          fecha.setDate(fecha.getDate() - 1);
        }
        
        resultado.fechaLimite = fecha.toISOString().split('T')[0];
        textoLimpio = textoLimpio.replace(coincidencia[0], '').trim();
      }
    }
    // Comprobar fechas con día y mes
    else {
      const meses: {[key: string]: number} = {
        'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
        'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
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
            
            // Si la fecha ya pasó este año, asumimos que es para el próximo año
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

    // Asignar el texto limpio como título de la tarea
    resultado.texto = textoLimpio;
    
    return resultado;
  }, [carpetasDisponibles, calcularFechaParaDiaSemana]);

  const detenerEscucha = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log("Error al detener reconocimiento:", e);
      }
    }
    setEscuchando(false);
  };

  const iniciarEscucha = () => {
    if (!esCompatible) {
      setError("Tu navegador no soporta reconocimiento de voz");
      return;
    }

    setError(null);
    setTexto("");
    setEscuchando(true);

    try {
      // @ts-expect-error - TypeScript no reconoce webkitSpeechRecognition globalmente
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      // Configurar el reconocimiento
      recognition.lang = 'es-ES';
      recognition.continuous = true; // Mantener escuchando
      recognition.interimResults = true; // Mostrar resultados parciales

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const last = event.results.length - 1;
        const textoReconocido = event.results[last][0].transcript;
        setTexto(textoReconocido);
        
        // Si es un resultado final, procesar
        if (event.results[last].isFinal) {
          // Detener el reconocimiento después de un resultado final
          // Esto es útil especialmente para Safari
          timerRef.current = setTimeout(() => {
            detenerEscucha();
            // Analizar el texto y extraer la información de la tarea
            const resultado = analizarTexto(textoReconocido);
            onResultado(resultado);
          }, 500);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        let mensajeError = `Error de reconocimiento: ${event.error}`;
        
        // Mensajes de error más amigables
        if (event.error === 'not-allowed') {
          mensajeError = "No se ha concedido permiso para usar el micrófono. Por favor, verifica la configuración de tu navegador.";
        } else if (event.error === 'no-speech') {
          mensajeError = "No se detectó ninguna voz. Por favor, intenta hablar más alto.";
        } else if (event.error === 'aborted') {
          mensajeError = "El reconocimiento de voz fue interrumpido.";
        }
        
        setError(mensajeError);
        setEscuchando(false);
      };

      recognition.onend = () => {
        setEscuchando(false);
      };

      // Intentar obtener permiso explícitamente (para Chrome)
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(() => {
            recognition.start();
          })
          .catch(err => {
            setError(`No se pudo acceder al micrófono: ${err.message}. Verifica los permisos del navegador.`);
            setEscuchando(false);
          });
      } else {
        recognition.start();
      }
    } catch (err) {
      console.error("Error al iniciar el reconocimiento de voz:", err);
      setError("Error al iniciar el reconocimiento de voz. Tu navegador podría no ser compatible.");
      setEscuchando(false);
    }
  };

  if (!esCompatible) {
    return (
      <div className="rounded-lg border p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-sm">
        <p>Tu navegador no soporta el reconocimiento de voz.</p>
        <p className="mt-1">Por favor, intenta con Chrome o Safari en su versión más reciente.</p>
      </div>
    );
  }

  return (
    <div className="relative mb-4">
      <div className="flex gap-2">
        <button
          onClick={escuchando ? detenerEscucha : iniciarEscucha}
          disabled={escuchando && tiempoRestante === 0}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-full ${
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
          {escuchando ? `Detener (${tiempoRestante}s)` : "Hablar"}
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
          Habla claramente. Di &quot;para hoy&quot;, &quot;el jueves que viene&quot; o menciona una fecha y carpeta.
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