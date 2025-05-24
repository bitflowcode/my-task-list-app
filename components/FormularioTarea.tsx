"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs, addDoc, query, where, orderBy, limit } from "firebase/firestore";
import { useAuth } from "./AuthProvider";
import { categorizarTareaLocal } from "../lib/ai";

type Props = {
  onAgregar: (titulo: string, fechaLimite: string | null, carpeta?: string) => void;
  tareaSugerida?: string;
};

export default function FormularioTarea({ onAgregar, tareaSugerida }: Props) {
  const { user } = useAuth();
  const [nuevaTarea, setNuevaTarea] = useState(tareaSugerida || "");
  const [fechaLimite, setFechaLimite] = useState<string | null>(null);
  const [carpeta, setCarpeta] = useState("");
  const [carpetas, setCarpetas] = useState<string[]>([]);
  const [mostrarInputNuevaCarpeta, setMostrarInputNuevaCarpeta] = useState(false);
  const [nuevaCarpeta, setNuevaCarpeta] = useState("");
  const [sugerenciaCarpeta, setSugerenciaCarpeta] = useState<string | null>(null);
  const [mostrarSugerencia, setMostrarSugerencia] = useState(false);

  useEffect(() => {
    const obtenerCarpetas = async () => {
      const carpetasPredeterminadas = ["Trabajo", "Personal", "Otros"];
      const q = query(collection(db, "carpetas"), where("userId", "==", user?.uid));
      const querySnapshot = await getDocs(q);
      const nombres = querySnapshot.docs.map((doc) => doc.data().nombre as string);
      const combinadas = Array.from(new Set([...carpetasPredeterminadas, ...nombres]));
      setCarpetas(combinadas);
    };
    obtenerCarpetas();
  }, [user]);

  // Función para detectar la carpeta cuando se escribe la tarea
  const detectarCarpeta = useCallback(async (titulo: string) => {
    // Solo si no se ha seleccionado una carpeta manualmente
    if (!carpeta && titulo.length > 3) {
      try {
        // 1. Buscar tareas similares en el historial
        if (user?.uid) {
          console.log("Buscando tareas similares para:", titulo);
          
          // Primero buscar en tareas pendientes
          const qTareas = query(
            collection(db, "tareas"),
            where("userId", "==", user.uid)
          );
          
          const snapshotTareas = await getDocs(qTareas);
          const tareasSimilares = snapshotTareas.docs.filter(doc => {
            const tituloTarea = doc.data().titulo.toLowerCase();
            const nuevaTituloLower = titulo.toLowerCase();
            
            // Comparar si los títulos son muy similares
            return tituloTarea.includes(nuevaTituloLower) || 
                   nuevaTituloLower.includes(tituloTarea) ||
                   tituloTarea === nuevaTituloLower;
          });
          
          // Luego buscar en tareas completadas
          const qCompletadas = query(
            collection(db, "completadas"),
            where("userId", "==", user.uid),
            orderBy("fechaCompletada", "desc"),
            limit(30)
          );
          
          const snapshotCompletadas = await getDocs(qCompletadas);
          const completadasSimilares = snapshotCompletadas.docs.filter(doc => {
            const tituloTarea = doc.data().titulo.toLowerCase();
            const nuevaTituloLower = titulo.toLowerCase();
            
            // Comparar si los títulos son muy similares
            return tituloTarea.includes(nuevaTituloLower) || 
                   nuevaTituloLower.includes(tituloTarea) ||
                   tituloTarea === nuevaTituloLower;
          });
          
          // Combinar resultados
          const todasLasSimilares = [...tareasSimilares, ...completadasSimilares];
          
          if (todasLasSimilares.length > 0) {
            // Encontrar la carpeta más común entre las tareas similares
            const carpetasUsadas: {[key: string]: number} = {};
            
            todasLasSimilares.forEach(doc => {
              const carpetaTarea = doc.data().carpeta;
              if (carpetaTarea) {
                carpetasUsadas[carpetaTarea] = (carpetasUsadas[carpetaTarea] || 0) + 1;
              }
            });
            
            // Encontrar la carpeta más usada
            let carpetaMasUsada = null;
            let maxUso = 0;
            
            Object.entries(carpetasUsadas).forEach(([nombreCarpeta, usos]) => {
              if (usos > maxUso && carpetas.includes(nombreCarpeta)) {
                carpetaMasUsada = nombreCarpeta;
                maxUso = usos;
              }
            });
            
            if (carpetaMasUsada) {
              console.log(`Sugerencia basada en historial: "${carpetaMasUsada}" (${maxUso} usos similares)`);
              setSugerenciaCarpeta(carpetaMasUsada);
              setMostrarSugerencia(true);
              return;
            }
          }
        }
        
        // 2. Si no hay coincidencias, usar el método de palabras clave
        const categoriaDetectada = categorizarTareaLocal(titulo);
        if (categoriaDetectada && carpetas.includes(categoriaDetectada)) {
          console.log(`Sugerencia basada en palabras clave: "${categoriaDetectada}"`);
          setSugerenciaCarpeta(categoriaDetectada);
          setMostrarSugerencia(true);
        } else {
          setSugerenciaCarpeta(null);
          setMostrarSugerencia(false);
        }
      } catch (error) {
        console.error("Error al buscar tareas similares:", error);
        
        // En caso de error, intentar con el método de palabras clave
        const categoriaDetectada = categorizarTareaLocal(titulo);
        if (categoriaDetectada && carpetas.includes(categoriaDetectada)) {
          setSugerenciaCarpeta(categoriaDetectada);
          setMostrarSugerencia(true);
        } else {
          setSugerenciaCarpeta(null);
          setMostrarSugerencia(false);
        }
      }
    }
  }, [carpeta, carpetas, user]);

  // Aplicar la tarea sugerida cuando cambia
  useEffect(() => {
    if (tareaSugerida) {
      setNuevaTarea(tareaSugerida);
      detectarCarpeta(tareaSugerida);
    }
  }, [tareaSugerida, detectarCarpeta]);

  const agregar = () => {
    if (!user) return;
    if (nuevaTarea.trim() === "") return;
    onAgregar(nuevaTarea, fechaLimite, carpeta);
    setNuevaTarea("");
    setFechaLimite(null);
    setCarpeta("");
    setMostrarInputNuevaCarpeta(false);
    setNuevaCarpeta("");
  };

  const manejarSeleccionCarpeta = (valor: string) => {
    if (valor === "__nueva__") {
      setMostrarInputNuevaCarpeta(true);
      setCarpeta("");
    } else {
      setMostrarInputNuevaCarpeta(false);
      setCarpeta(valor);
    }
  };

  const confirmarNuevaCarpeta = async () => {
    if (!user?.uid) return;
    if (nuevaCarpeta.trim() === "") return;
    const nombre = nuevaCarpeta.trim();

    if (!carpetas.includes(nombre) && user?.uid) {
      await addDoc(collection(db, "carpetas"), {
        nombre,
        userId: user.uid,
        createdAt: new Date()
      });
      setCarpetas([...carpetas, nombre]);
    }

    setCarpeta(nombre);
    setNuevaCarpeta("");
    setMostrarInputNuevaCarpeta(false);
  };

  // Aplicar la sugerencia
  const aplicarSugerencia = () => {
    if (sugerenciaCarpeta) {
      setCarpeta(sugerenciaCarpeta);
      setMostrarSugerencia(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-col w-full">
        <label className="text-sm text-gray-700 dark:text-gray-300 mb-1">Nueva tarea</label>
        <input
          type="text"
          placeholder="Escribe aquí tu nueva tarea"
          className="w-full border dark:border-gray-600 rounded px-4 py-3 text-sm dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={nuevaTarea}
          onChange={(e) => {
            setNuevaTarea(e.target.value);
            // Usar un setTimeout para evitar demasiadas llamadas a Firestore mientras se escribe
            if (e.target.value.length > 3) {
              detectarCarpeta(e.target.value).catch(err => 
                console.error("Error al procesar detectarCarpeta:", err)
              );
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") agregar();
          }}
        />
      </div>
      <div className="flex flex-col w-full">
        <label className="text-sm text-gray-700 dark:text-gray-300 mb-1">Fecha límite</label>
        <input
          type="date"
          className="w-full border dark:border-gray-600 rounded px-4 py-3 text-sm dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={fechaLimite || ""}
          onChange={(e) => setFechaLimite(e.target.value)}
        />
      </div>
      <div className="flex flex-col w-full">
        <label className="text-sm text-gray-700 dark:text-gray-300 mb-1">Carpeta</label>
        <select
          value={carpeta}
          onChange={(e) => manejarSeleccionCarpeta(e.target.value)}
          className="w-full border dark:border-gray-600 rounded px-4 py-3 text-sm dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">Sin carpeta</option>
          {carpetas.map((nombre) => (
            <option key={nombre} value={nombre}>
              {nombre}
            </option>
          ))}
          <option value="__nueva__">+ Crear nueva carpeta...</option>
        </select>
        {mostrarSugerencia && sugerenciaCarpeta && (
          <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded text-sm">
            <p>
              Sugerencia: ¿Quieres añadir esta tarea a la carpeta &quot;{sugerenciaCarpeta}&quot;?
            </p>
            <div className="flex gap-2 mt-1">
              <button
                onClick={aplicarSugerencia}
                className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
              >
                Sí, usar esta carpeta
              </button>
              <button
                onClick={() => setMostrarSugerencia(false)}
                className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded"
              >
                No, gracias
              </button>
            </div>
          </div>
        )}
        {mostrarInputNuevaCarpeta && (
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              placeholder="Nombre de la nueva carpeta"
              value={nuevaCarpeta}
              onChange={(e) => setNuevaCarpeta(e.target.value)}
              className="flex-1 border dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={confirmarNuevaCarpeta}
              className="bg-blue-500 dark:bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-600 dark:hover:bg-blue-700 text-sm"
            >
              Añadir
            </button>
          </div>
        )}
      </div>
      <button
        onClick={agregar}
        className="bg-blue-500 dark:bg-blue-600 text-white w-full py-3 rounded-md text-sm font-semibold hover:bg-blue-600 dark:hover:bg-blue-700 transition"
      >
        Agregar
      </button>
    </div>
  );
}