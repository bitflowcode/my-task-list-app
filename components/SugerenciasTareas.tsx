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
  const { user } = useAuth();
  const lastUpdateRef = useRef<number>(0);

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
        } else {
          console.log("No se encontraron sugerencias en este intento");
          
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

  if (sugerencias.length === 0 && !cargando) {
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
        <div className="space-y-2">
          {sugerencias.map((sugerencia, index) => (
            <div 
              key={index} 
              className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700"
            >
              <p className="text-sm flex-1">{sugerencia}</p>
              <button 
                onClick={() => onSeleccionarSugerencia(sugerencia)}
                className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
              >
                Añadir
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 