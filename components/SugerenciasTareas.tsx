"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthProvider";
import { generarSugerenciasDeTareas } from "../lib/ai";

type Props = {
  onSeleccionarSugerencia: (sugerencia: string) => void;
};

export default function SugerenciasTareas({ onSeleccionarSugerencia }: Props) {
  const [sugerencias, setSugerencias] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);
  const [intentos, setIntentos] = useState(0);
  const [sugerenciaActual, setSugerenciaActual] = useState(0);
  const [textoVisible, setTextoVisible] = useState("");
  const [animacionCompleta, setAnimacionCompleta] = useState(false);
  const [mostrandoSugerencia, setMostrandoSugerencia] = useState(false);
  const { user } = useAuth();
  const lastUpdateRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cargar sugerencias desde Firestore
  useEffect(() => {
    const cargarSugerencias = async () => {
      if (!user?.uid) return;
      
      // Evitar cargar sugerencias muy frecuentemente
      const ahora = Date.now();
      if (ahora - lastUpdateRef.current < 5000 && intentos > 0) {
        return;
      }
      
      lastUpdateRef.current = ahora;
      setCargando(true);
      
      try {
        const nuevasSugerencias = await generarSugerenciasDeTareas(user.uid);
        
        if (nuevasSugerencias.length > 0) {
          console.log("Sugerencias encontradas:", nuevasSugerencias);
          setSugerencias(nuevasSugerencias);
          setSugerenciaActual(0);
          setTextoVisible(""); // Reiniciar el texto para la animación
          setAnimacionCompleta(false);
          setMostrandoSugerencia(true);
        } else {
          console.log("No se encontraron sugerencias en este intento");
          setMostrandoSugerencia(false);
          
          // Si no hay sugerencias y no hemos intentado demasiadas veces, 
          // programar otro intento en unos segundos
          if (intentos < 3) {
            setTimeout(() => {
              setIntentos(prev => prev + 1);
            }, 5000);
          }
        }
      } catch (error) {
        console.error("Error al cargar sugerencias:", error);
      } finally {
        setCargando(false);
      }
    };

    cargarSugerencias();
  }, [user, intentos]);

  // Forzar actualización de sugerencias cada 5 minutos
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      setIntentos(prev => prev + 1);
    }, 300000); // 5 minutos
    
    return () => clearInterval(interval);
  }, [user]);

  // Efecto de escritura y rotación de sugerencias
  useEffect(() => {
    if (!sugerencias.length || cargando || !mostrandoSugerencia) return;
    
    // Limpiar timeouts anteriores
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    const sugerenciaTexto = sugerencias[sugerenciaActual];
    
    // Si la animación está completa, esperar y cambiar a la siguiente sugerencia
    if (animacionCompleta) {
      timeoutRef.current = setTimeout(() => {
        setAnimacionCompleta(false);
        setTextoVisible("");
        setSugerenciaActual((prev) => (prev + 1) % sugerencias.length);
      }, 3500); // Esperar 3.5 segundos antes de cambiar
      
      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }
    
    // Si no hemos terminado de escribir toda la sugerencia
    if (textoVisible.length < sugerenciaTexto.length) {
      timeoutRef.current = setTimeout(() => {
        setTextoVisible(sugerenciaTexto.substring(0, textoVisible.length + 1));
      }, 50); // Velocidad de escritura: 50ms por carácter
    } else {
      // Cuando terminamos de escribir, marcar la animación como completa
      setAnimacionCompleta(true);
    }
    
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [sugerencias, sugerenciaActual, textoVisible, animacionCompleta, cargando, mostrandoSugerencia]);

  if ((sugerencias.length === 0 && !cargando) || !mostrandoSugerencia) {
    return null; // No mostrar nada si no hay sugerencias
  }

  return (
    <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
      <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
        Sugerencias basadas en tus patrones de tareas
      </h3>
      
      {cargando ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Cargando sugerencias...</p>
      ) : (
        <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 min-h-[40px]">
          <p className="text-sm flex-1 min-h-[24px]">
            {textoVisible}
            {!animacionCompleta && <span className="animate-pulse">|</span>}
          </p>
          <button 
            onClick={() => onSeleccionarSugerencia(sugerencias[sugerenciaActual])}
            className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 ml-2 whitespace-nowrap"
          >
            Añadir
          </button>
        </div>
      )}
    </div>
  );
} 