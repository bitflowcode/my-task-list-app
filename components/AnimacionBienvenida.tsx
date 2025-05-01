"use client";

import { useEffect, useState } from "react";
import Lottie from "lottie-react";

export default function AnimacionBienvenida() {
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    fetch("/animaciones/tareas-animacion.json")
      .then((res) => res.json())
      .then(setAnimationData)
      .catch(console.error);
  }, []);

  if (!animationData) return null;

  return (
    <div className="flex justify-center mb-4">
      <Lottie animationData={animationData} loop={true} style={{ height: 180 }} />
    </div>
  );
}