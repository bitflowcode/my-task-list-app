"use client";

import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import ListaDeTareas from "../components/TaskList";
import CalendarioTareas from "../components/CalendarioTareas";
import Navigation from "../components/Navigation";
import LoginForm from "../components/LoginForm";
import { useAuth } from "../components/AuthProvider";
import Lottie from "lottie-react";
import animacionTareas from "../public/animaciones/tareas-animacion.json";

export default function PaginaPrincipal() {
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [carpetaSeleccionada, setCarpetaSeleccionada] = useState("");
  const [carpetasConTareas, setCarpetasConTareas] = useState<string[]>([]);
  const { user } = useAuth();

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
    <>
      <div className="max-w-md mx-auto mt-10 text-center">
        <h1 className="text-2xl font-bold mb-2">Bienvenido a Mi Lista de Tareas</h1>
        <div className="flex justify-center mb-4">
          <Lottie animationData={animacionTareas} loop={true} style={{ height: 180 }} />
        </div>
        <p className="text-gray-600 text-sm mb-4">
          Organiza tus tareas por carpetas y fechas límite. Accede a tus pendientes desde cualquier dispositivo de forma segura.
        </p>

      </div>
      <LoginForm />
      {user && (
        <div className="relative">
          <p className="text-center text-sm text-gray-600 mb-2">
            Bienvenido, {user.displayName || user.email}
          </p>
          <Navigation
            mostrarCalendario={mostrarCalendario}
            onToggleCalendario={() => setMostrarCalendario(!mostrarCalendario)}
            carpetas={carpetasConTareas}
            carpetaSeleccionada={carpetaSeleccionada}
            onSeleccionarCarpeta={setCarpetaSeleccionada}
          />
          {mostrarCalendario ? (
            <CalendarioTareas />
          ) : (
            <ListaDeTareas carpetaFiltrada={carpetaSeleccionada} />
          )}
        </div>
      )}
    </>
  );
}