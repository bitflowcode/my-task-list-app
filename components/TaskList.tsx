"use client";

import { useEffect, useState } from "react";
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

export default function ListaDeTareas({ carpetaFiltrada }: { carpetaFiltrada: string }) {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [completadas, setCompletadas] = useState<Tarea[]>([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [carpetas, setCarpetas] = useState<string[]>([]);

  const { user } = useAuth();

  const actualizarCarpetas = async () => {
    const predeterminadas = ["Trabajo", "Personal", "Otros"];

    if (!user) {
      setCarpetas(predeterminadas);
      return;
    }

    const q = query(collection(db, "carpetas"), where("userId", "==", user.uid));
    const snapshot = await getDocs(q);
    const personalizadas = snapshot.docs.map((doc) => doc.data().nombre as string);

    setCarpetas(Array.from(new Set([...predeterminadas, ...personalizadas])));
  };

  useEffect(() => {
    const qTareas = query(collection(db, "tareas"), orderBy("titulo"));
    const unsubTareas = onSnapshot(qTareas, (snapshot) => {
      const nuevasTareas = snapshot.docs.map((doc) => ({
        id: doc.id,
        titulo: doc.data().titulo,
        fechaLimite: doc.data().fechaLimite,
        carpeta: doc.data().carpeta,
      }));
      setTareas(nuevasTareas);
    });

    const qCompletadas = query(collection(db, "completadas"), orderBy("titulo"));
    const unsubCompletadas = onSnapshot(qCompletadas, (snapshot) => {
      const tareasHechas = snapshot.docs.map((doc) => ({
        id: doc.id,
        titulo: doc.data().titulo,
      }));
      setCompletadas(tareasHechas);
    });

    actualizarCarpetas();

    return () => {
      unsubTareas();
      unsubCompletadas();
    };
  }, []);

  const agregarTarea = async (titulo: string, fechaLimite: string | null, carpeta?: string) => {
    if (titulo.trim() === "") return;
    await addDoc(collection(db, "tareas"), {
      titulo,
      fechaLimite: fechaLimite || null,
      carpeta: carpeta || null,
    });
    actualizarCarpetas();
  };

  const completarTarea = async (id: string) => {
    const tarea = tareas.find((t) => t.id === id);
    if (!tarea) return;

    await addDoc(collection(db, "completadas"), { titulo: tarea.titulo });
    await deleteDoc(doc(db, "tareas", id));
    actualizarCarpetas();
  };

  const editarTarea = async (
    id: string,
    nuevoTitulo: string,
    nuevaFecha?: string | null,
    nuevaCarpeta?: string | null
  ) => {
    const ref = doc(db, "tareas", id);
    await updateDoc(ref, {
      titulo: nuevoTitulo,
      fechaLimite: nuevaFecha || null,
      carpeta: nuevaCarpeta || null,
    });
    actualizarCarpetas();
  };

  const editarTareaCompletada = async (id: string, nuevoTitulo: string) => {
    const ref = doc(db, "completadas", id);
    await updateDoc(ref, {
      titulo: nuevoTitulo,
    });
  };

  const reenviarATareasPendientes = async (id: string) => {
    const tarea = completadas.find((t) => t.id === id);
    if (!tarea) return;

    await addDoc(collection(db, "tareas"), {
      titulo: tarea.titulo,
      fechaLimite: null,
    });
    await deleteDoc(doc(db, "completadas", id));
    actualizarCarpetas();
  };

  const borrarTareaCompletada = async (id: string) => {
    await deleteDoc(doc(db, "completadas", id));
    actualizarCarpetas();
  };

  const borrarTarea = async (id: string) => {
    await deleteDoc(doc(db, "tareas", id));
    actualizarCarpetas();
  };

  const tareasFiltradas = carpetaFiltrada
    ? tareas.filter((t) => t.carpeta === carpetaFiltrada)
    : tareas;

  return (
    <div className="p-4 w-full max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Lista de tareas</h1>

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
        tareas={completadas}
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