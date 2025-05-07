"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";

export default function LoginForm() {
  const { user, loginWithEmail, registerWithEmail, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [modo, setModo] = useState<"login" | "registro" | "recuperar">("login");
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  if (user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    try {
      if (modo === "login") {
        await loginWithEmail(email, password);
      } else if (modo === "registro") {
        await registerWithEmail(email, password, nombre);
      } else if (modo === "recuperar") {
        await resetPassword(email);
        setMensaje("Se ha enviado un correo con instrucciones para recuperar tu contraseña.");
        setModo("login");
      }
    } catch {
      setError("Error al iniciar sesión o registrarse.");
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-6 p-4 border border-gray-200 rounded shadow-sm">
      <h2 className="text-lg font-semibold mb-4 text-center">
        {modo === "login" ? "Iniciar sesión" : 
         modo === "registro" ? "Crear cuenta" : 
         "Recuperar contraseña"}
      </h2>

      {error && (
        <p className="text-red-500 text-sm text-center mb-2">{error}</p>
      )}

      {mensaje && (
        <p className="text-green-500 text-sm text-center mb-2">{mensaje}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {modo === "registro" && (
          <input
            type="text"
            placeholder="Nombre"
            className="w-full border px-3 py-2 rounded"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        )}
        <input
          type="email"
          placeholder="Correo electrónico"
          className="w-full border px-3 py-2 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        {modo !== "recuperar" && (
          <input
            type="password"
            placeholder="Contraseña"
            className="w-full border px-3 py-2 rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        )}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          {modo === "login" ? "Entrar" : 
           modo === "registro" ? "Registrarse" : 
           "Enviar instrucciones"}
        </button>
      </form>

      <div className="text-center mt-4 text-sm">
        {modo === "login" ? (
          <>
            ¿No tienes cuenta?{" "}
            <button
              onClick={() => setModo("registro")}
              className="text-blue-600 hover:underline"
            >
              Crear una
            </button>
            <br />
            <button
              onClick={() => setModo("recuperar")}
              className="text-blue-600 hover:underline mt-2"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </>
        ) : modo === "registro" ? (
          <>
            ¿Ya tienes cuenta?{" "}
            <button
              onClick={() => setModo("login")}
              className="text-blue-600 hover:underline"
            >
              Inicia sesión
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setModo("login")}
              className="text-blue-600 hover:underline"
            >
              Volver al inicio de sesión
            </button>
          </>
        )}
      </div>
    </div>
  );
}