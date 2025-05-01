"use client";

import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import ListaDeTareas from "../components/TaskList";
import CalendarioTareas from "../components/CalendarioTareas";
import Navigation from "../components/Navigation";

export default function PaginaPrincipal() {
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [carpetaSeleccionada, setCarpetaSeleccionada] = useState("");
  const [carpetasConTareas, setCarpetasConTareas] = useState<string[]>([]);

  useEffect(() => {
    const cargarCarpetasDesdeFirestore = async () => {
      const snapshot = await getDocs(collection(db, "tareas"));
      const carpetasSet = new Set<string>();

      snapshot.docs.forEach((doc) => {
        const carpeta = doc.data().carpeta;
        if (carpeta) carpetasSet.add(carpeta);
      });

      setCarpetasConTareas(Array.from(carpetasSet));
    };

    cargarCarpetasDesdeFirestore();
  }, []);

  return (
    <div className="relative">
      <Navigation
        mostrarCalendario={mostrarCalendario}
        onToggleCalendario={() => setMostrarCalendario(!mostrarCalendario)}
        carpetas={carpetasConTareas}
        carpetaSeleccionada={carpetaSeleccionada}
        onSeleccionarCarpeta={setCarpetaSeleccionada}
      />
      {mostrarCalendario ? <CalendarioTareas /> : <ListaDeTareas carpetaFiltrada={carpetaSeleccionada} />}
    </div>
  );
}