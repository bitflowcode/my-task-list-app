"use client";

import { useEffect, useState, useCallback } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  getDocs,
  where
} from "firebase/firestore";
import { useAuth } from "../components/AuthProvider";
import FormularioTarea from "./FormularioTarea";
import TareaItem from "./TareaItem";
import ListaTareasCompletadas from "./ListaTareasCompletadas";

type Tarea = {
  id: string;
  titulo: string;
  fechaLimite?: string | null;
  carpeta?: string;
};

type Props = {
  carpetaFiltrada: string;
  busqueda: string;
};

export default function ListaDeTareas({ carpetaFiltrada, busqueda }: Props) {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [completadas, setCompletadas] = useState<Tarea[]>([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [carpetas, setCarpetas] = useState<string[]>([]);

  const { user } = useAuth();

  const actualizarCarpetas = useCallback(async () => {
    if (!user) {
      setCarpetas([]);
      return;
    }

    try {
      console.log("Iniciando actualización de carpetas...");
      
      // Obtener carpetas de tareas pendientes
      const qTareas = query(collection(db, "tareas"), where("userId", "==", user.uid));
      const snapshotTareas = await getDocs(qTareas);
      const carpetasDeTareas = snapshotTareas.docs
        .map((doc) => doc.data().carpeta)
        .filter((carpeta): carpeta is string => carpeta !== null && carpeta !== undefined && carpeta !== "");
      
      console.log("Carpetas de tareas pendientes:", carpetasDeTareas);

      // Obtener carpetas de tareas completadas
      const qCompletadas = query(collection(db, "completadas"), where("userId", "==", user.uid));
      const snapshotCompletadas = await getDocs(qCompletadas);
      const carpetasDeCompletadas = snapshotCompletadas.docs
        .map((doc) => doc.data().carpeta)
        .filter((carpeta): carpeta is string => carpeta !== null && carpeta !== undefined && carpeta !== "");
      
      console.log("Carpetas de tareas completadas:", carpetasDeCompletadas);

      // Obtener carpetas de la colección carpetas
      const qCarpetas = query(collection(db, "carpetas"), where("userId", "==", user.uid));
      const snapshotCarpetas = await getDocs(qCarpetas);
      const carpetasGuardadas = snapshotCarpetas.docs
        .map((doc) => doc.data().nombre)
        .filter((nombre): nombre is string => nombre !== null && nombre !== undefined && nombre !== "");
      
      console.log("Carpetas guardadas:", carpetasGuardadas);

      // Combinar todas las carpetas y obtener valores únicos
      const todasLasCarpetas = Array.from(new Set([
        ...carpetasDeTareas,
        ...carpetasDeCompletadas,
        ...carpetasGuardadas
      ]));

      console.log("Todas las carpetas únicas:", todasLasCarpetas);
      setCarpetas(todasLasCarpetas);
    } catch (error) {
      console.error("Error al cargar carpetas:", error);
      setCarpetas([]);
    }
  }, [user]);

  useEffect(() => {
    const qTareas = query(
      collection(db, "tareas"),
      where("userId", "==", user?.uid),
      orderBy("titulo")
    );
    const unsubTareas = onSnapshot(qTareas, (snapshot) => {
      const nuevasTareas = snapshot.docs.map((doc) => ({
        id: doc.id,
        titulo: doc.data().titulo,
        fechaLimite: doc.data().fechaLimite,
        carpeta: doc.data().carpeta,
      }));
      setTareas(nuevasTareas);
    });

    const qCompletadas = query(
      collection(db, "completadas"),
      where("userId", "==", user?.uid),
      orderBy("fechaCompletada", "desc")
    );
    const unsubCompletadas = onSnapshot(qCompletadas, (snapshot) => {
      const tareasHechas = snapshot.docs.map((doc) => ({
        id: doc.id,
        titulo: doc.data().titulo,
        carpeta: doc.data().carpeta,
        fechaCompletada: doc.data().fechaCompletada,
      }));
      setCompletadas(tareasHechas);
    });

    actualizarCarpetas();

    return () => {
      unsubTareas();
      unsubCompletadas();
    };
  }, [user, actualizarCarpetas]);

  const agregarTarea = async (titulo: string, fechaLimite: string | null, carpeta?: string) => {
    if (titulo.trim() === "") return;
    if (!user?.uid) return;
    await addDoc(collection(db, "tareas"), {
      titulo,
      fechaLimite: fechaLimite || null,
      carpeta: carpeta || null,
      userId: user.uid,
    });
    actualizarCarpetas();
  };

  const completarTarea = async (id: string) => {
    const tarea = tareas.find((t) => t.id === id);
    if (!tarea || !user?.uid) return;

    try {
      // Primero agregamos la tarea completada
      await addDoc(collection(db, "completadas"), {
        titulo: tarea.titulo,
        userId: user.uid,
        carpeta: tarea.carpeta,
        fechaLimite: tarea.fechaLimite,
        fechaCompletada: new Date().toISOString()
      });
      
      // Luego eliminamos la tarea pendiente
      await deleteDoc(doc(db, "tareas", id));
      
      // Actualizamos las carpetas
      await actualizarCarpetas();
    } catch (error) {
      console.error("Error al completar tarea:", error);
    }
  };

  const editarTarea = async (
    id: string,
    nuevoTitulo: string,
    nuevaFecha?: string | null,
    nuevaCarpeta?: string | null
  ) => {
    if (!user?.uid) return;

    try {
      const ref = doc(db, "tareas", id);
      await updateDoc(ref, {
        titulo: nuevoTitulo,
        fechaLimite: nuevaFecha || null,
        carpeta: nuevaCarpeta || null,
        userId: user.uid,
      });
    } catch (error) {
      console.error("Error al editar tarea:", error);
    }
  };

  const editarTareaCompletada = async (id: string, nuevoTitulo: string) => {
    const ref = doc(db, "completadas", id);
    await updateDoc(ref, {
      titulo: nuevoTitulo,
    });
  };

  const reenviarATareasPendientes = async (id: string) => {
    const tarea = completadas.find((t) => t.id === id);
    if (!tarea || !user?.uid) return;

    try {
      await addDoc(collection(db, "tareas"), {
        titulo: tarea.titulo,
        fechaLimite: tarea.fechaLimite || null,
        carpeta: tarea.carpeta,
        userId: user.uid,
      });
      await deleteDoc(doc(db, "completadas", id));
      await actualizarCarpetas();
    } catch (error) {
      console.error("Error al reactivar tarea:", error);
    }
  };

  const borrarTareaCompletada = async (id: string) => {
    await deleteDoc(doc(db, "completadas", id));
    actualizarCarpetas();
  };

  const borrarTarea = async (id: string) => {
    await deleteDoc(doc(db, "tareas", id));
    actualizarCarpetas();
  };

  const tareasFiltradas = tareas
    .filter((t) => !carpetaFiltrada || t.carpeta === carpetaFiltrada)
    .filter((t) => 
      !busqueda || 
      t.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      (t.carpeta && t.carpeta.toLowerCase().includes(busqueda.toLowerCase()))
    );

  const tareasCompletadasFiltradas = completadas
    .filter((t) => !carpetaFiltrada || t.carpeta === carpetaFiltrada)
    .filter((t) => 
      !busqueda || 
      t.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      (t.carpeta && t.carpeta.toLowerCase().includes(busqueda.toLowerCase()))
    );

  return (
    <div className="p-4 w-full max-w-4xl mx-auto">

      <h2 className="text-lg font-semibold mb-2">Tareas pendientes</h2>

      <ul className="space-y-2">
        {tareasFiltradas.map((tarea, index) => (
          <TareaItem
            key={tarea.id}
            tarea={tarea}
            index={index}
            onCompletar={() => completarTarea(tarea.id)}
            onEditar={editarTarea}
            onBorrar={() => borrarTarea(tarea.id)}
            carpetas={carpetas}
            onActualizarCarpetas={actualizarCarpetas}
          />
        ))}
      </ul>

      <ListaTareasCompletadas
        tareas={tareasCompletadasFiltradas}
        onEditar={editarTareaCompletada}
        onReactivar={reenviarATareasPendientes}
        onBorrar={borrarTareaCompletada}
      />

      <button
        onClick={() => setMostrarModal(true)}
        className="fixed bottom-8 right-8 bg-blue-600 text-white text-3xl w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700"
        aria-label="Agregar tarea"
      >
        +
      </button>

      {mostrarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
          <div className="bg-white w-full max-w-md rounded-xl shadow-lg p-8 relative flex flex-col items-center">
            <button
              onClick={() => setMostrarModal(false)}
              className="absolute top-4 right-6 text-gray-500 text-2xl hover:text-gray-800"
            >
              ✕
            </button>
            <h2 className="text-2xl font-semibold mb-6 text-center">Nueva tarea</h2>
            <FormularioTarea
              onAgregar={(titulo, fechaLimite, carpeta) => {
                agregarTarea(titulo, fechaLimite, carpeta);
                setMostrarModal(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}