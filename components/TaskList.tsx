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
  where,
  writeBatch,
  limit
} from "firebase/firestore";
import { useAuth } from "../components/AuthProvider";
import FormularioTarea from "./FormularioTarea";
import TareaItem from "./TareaItem";
import ListaTareasCompletadas from "./ListaTareasCompletadas";
import OrdenamientoTareas from './OrdenamientoTareas';
import ListaTareasArrastrable from './ListaTareasArrastrable';

type Tarea = {
  id: string;
  titulo: string;
  fechaLimite?: string | null;
  carpeta?: string;
  orden: number;
};

type TareaCompletada = Tarea & {
  fechaCompletada: string;
};

type Props = {
  carpetaFiltrada: string;
  busqueda: string;
};

type TipoOrdenamiento = 'orden' | 'alfabetico' | 'fecha';

export default function ListaDeTareas({ carpetaFiltrada, busqueda }: Props) {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [completadas, setCompletadas] = useState<TareaCompletada[]>([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [carpetas, setCarpetas] = useState<string[]>([]);
  const [tipoOrdenamiento, setTipoOrdenamiento] = useState<TipoOrdenamiento>('orden');

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
    if (!user?.uid) {
      setTareas([]);
      setCompletadas([]);
      return;
    }

    let unsubTareas: () => void;
    let unsubCompletadas: () => void;

    const iniciarSuscripciones = async () => {
      // Cargar carpetas inmediatamente
      await actualizarCarpetas();
      
      // Consulta base para todas las tareas
      const qTareas = query(
        collection(db, "tareas"),
        where("userId", "==", user.uid)
      );

      unsubTareas = onSnapshot(qTareas, (snapshot) => {
        const nuevasTareas = snapshot.docs.map((doc) => ({
          id: doc.id,
          titulo: doc.data().titulo,
          fechaLimite: doc.data().fechaLimite,
          carpeta: doc.data().carpeta,
          orden: doc.data().orden || 0,
        }));

        // Ordenar las tareas según el tipo de ordenamiento
        const tareasOrdenadas = [...nuevasTareas];
        if (tipoOrdenamiento === 'orden') {
          tareasOrdenadas.sort((a, b) => (a.orden || 0) - (b.orden || 0));
        } else if (tipoOrdenamiento === 'alfabetico') {
          tareasOrdenadas.sort((a, b) => a.titulo.localeCompare(b.titulo));
        } else {
          tareasOrdenadas.sort((a, b) => {
            if (!a.fechaLimite) return 1;
            if (!b.fechaLimite) return -1;
            return new Date(a.fechaLimite).getTime() - new Date(b.fechaLimite).getTime();
          });
        }

        setTareas(tareasOrdenadas);
      });

      // Consulta para tareas completadas
      const qCompletadas = query(
        collection(db, "completadas"),
        where("userId", "==", user.uid),
        orderBy("fechaCompletada", "desc")
      );

      unsubCompletadas = onSnapshot(qCompletadas, (snapshot) => {
        const tareasHechas = snapshot.docs.map((doc) => ({
          id: doc.id,
          titulo: doc.data().titulo,
          carpeta: doc.data().carpeta,
          fechaLimite: doc.data().fechaLimite,
          fechaCompletada: doc.data().fechaCompletada,
          orden: doc.data().orden || 0,
        }));
        setCompletadas(tareasHechas);
      });
    };

    iniciarSuscripciones();

    return () => {
      if (unsubTareas) unsubTareas();
      if (unsubCompletadas) unsubCompletadas();
    };
  }, [user, tipoOrdenamiento]);

  const agregarTarea = async (titulo: string, fechaLimite: string | null, carpeta?: string) => {
    if (titulo.trim() === "") return;
    if (!user?.uid) return;

    try {
      // En lugar de buscar el orden más alto, obtenemos todas las tareas
      const qTareas = query(
        collection(db, "tareas"),
        where("userId", "==", user.uid)
      );
      
      const snapshot = await getDocs(qTareas);
      let ordenMasAlto = 0;

      // Encontrar el orden más alto manualmente
      snapshot.docs.forEach(doc => {
        const orden = doc.data().orden || 0;
        if (orden > ordenMasAlto) {
          ordenMasAlto = orden;
        }
      });

      // Agregar la nueva tarea con el siguiente orden
      const nuevaTarea = {
        titulo,
        fechaLimite: fechaLimite || null,
        carpeta: carpeta || null,
        userId: user.uid,
        orden: ordenMasAlto + 1,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, "tareas"), nuevaTarea);
      console.log("Tarea agregada exitosamente con orden:", ordenMasAlto + 1);
      await actualizarCarpetas();
    } catch (error) {
      console.error("Error al agregar tarea:", error);
    }
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
        fechaLimite: tarea.fechaLimite || null,
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
      // Obtener el orden más alto actual
      const qTareas = query(
        collection(db, "tareas"),
        where("userId", "==", user.uid),
        orderBy("orden", "desc"),
        limit(1)
      );
      
      const snapshot = await getDocs(qTareas);
      let nuevoOrden = 1;
      
      if (!snapshot.empty) {
        const ordenMasAlto = snapshot.docs[0].data().orden || 0;
        nuevoOrden = ordenMasAlto + 1;
      }

      // Agregar la tarea con el nuevo orden
      await addDoc(collection(db, "tareas"), {
        titulo: tarea.titulo,
        fechaLimite: tarea.fechaLimite || null,
        carpeta: tarea.carpeta,
        userId: user.uid,
        orden: nuevoOrden,
        createdAt: new Date().toISOString()
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

  const reordenarTareas = async (nuevasTareas: Tarea[]) => {
    if (!user?.uid) return;

    try {
      console.log("Reordenando tareas...", nuevasTareas);
      
      const batch = writeBatch(db);
      
      // Asignar nuevos órdenes
      nuevasTareas.forEach((tarea, index) => {
        const ref = doc(db, "tareas", tarea.id);
        batch.update(ref, { 
          orden: index + 1,
          userId: user.uid 
        });
      });

      await batch.commit();
      console.log("Tareas reordenadas exitosamente");
    } catch (error) {
      console.error("Error al reordenar tareas:", error);
    }
  };

  const inicializarOrdenTareas = useCallback(async () => {
    if (!user?.uid) return;

    try {
      // Verificar si ya hay tareas con orden
      const qTareas = query(
        collection(db, "tareas"),
        where("userId", "==", user.uid),
        where("orden", ">=", 0),
        limit(1)
      );
      
      const snapshot = await getDocs(qTareas);
      
      // Si ya hay al menos una tarea con orden, no necesitamos inicializar
      if (!snapshot.empty) {
        return;
      }

      console.log("Inicializando orden para tareas existentes...");
      
      // Obtener todas las tareas sin ordenar
      const qTodasTareas = query(
        collection(db, "tareas"),
        where("userId", "==", user.uid)
      );
      
      const snapshotTodas = await getDocs(qTodasTareas);
      const tareasExistentes = snapshotTodas.docs.map(doc => ({
        id: doc.id,
        titulo: doc.data().titulo as string,
        orden: doc.data().orden as number | undefined
      }));

      // Ordenar alfabéticamente para asignar orden inicial
      tareasExistentes.sort((a, b) => a.titulo.localeCompare(b.titulo));

      // Actualizar cada tarea con su nuevo orden
      const batch = writeBatch(db);
      
      tareasExistentes.forEach((tarea, index) => {
        const ref = doc(db, "tareas", tarea.id);
        batch.update(ref, { orden: index + 1 });
      });

      await batch.commit();
      console.log("Orden inicializado para todas las tareas existentes");
    } catch (error) {
      console.error("Error al inicializar orden de tareas:", error);
    }
  }, [user]);

  // Llamar a la función cuando el componente se monta
  useEffect(() => {
    if (user?.uid) {
      inicializarOrdenTareas();
    }
  }, [user, inicializarOrdenTareas]);

  return (
    <div className="p-4 w-full max-w-4xl mx-auto">
      <h2 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">Tareas pendientes</h2>

      <OrdenamientoTareas onCambioOrdenamiento={setTipoOrdenamiento} />

      {tipoOrdenamiento === 'orden' ? (
        <ListaTareasArrastrable
          tareas={tareasFiltradas}
          onReordenar={reordenarTareas}
          onCompletar={completarTarea}
          onEditar={editarTarea}
          onBorrar={borrarTarea}
          carpetas={carpetas}
          onActualizarCarpetas={actualizarCarpetas}
        />
      ) : (
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
      )}

      <ListaTareasCompletadas
        tareas={tareasCompletadasFiltradas}
        onEditar={editarTareaCompletada}
        onReactivar={reenviarATareasPendientes}
        onBorrar={borrarTareaCompletada}
      />

      {/* Espacio extra al final para evitar que el botón + tape contenido */}
      <div className="pb-24"></div>

      <button
        onClick={() => setMostrarModal(true)}
        className="fixed bottom-8 right-8 bg-primary-light dark:bg-primary-dark text-white text-3xl w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 dark:hover:bg-blue-600 z-50"
        aria-label="Agregar tarea"
      >
        +
      </button>

      {mostrarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
          <div className="bg-white dark:bg-card-dark w-full max-w-md rounded-xl shadow-lg dark:shadow-black/20 p-8 relative flex flex-col items-center">
            <button
              onClick={() => setMostrarModal(false)}
              className="absolute top-4 right-6 text-gray-500 dark:text-gray-400 text-2xl hover:text-gray-800 dark:hover:text-white"
            >
              ✕
            </button>
            <h2 className="text-2xl font-semibold mb-6 text-center text-gray-800 dark:text-white">Nueva tarea</h2>
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