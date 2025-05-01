"use client";

import Lottie from "lottie-react";

export default function AnimacionBienvenida() {
  return (
    <div className="flex justify-center mb-4">
      <Lottie
        animationData={require("../../public/animaciones/tareas-animacion.json")}
        loop={true}
        style={{ height: 180 }}
      />
    </div>
  );
}