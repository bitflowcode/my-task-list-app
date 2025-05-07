"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";

export default function LoginForm() {
  const { user, loginWithEmail, registerWithEmail, resetPassword, loginWithGoogle } = useAuth();
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

        {modo === "login" && (
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">O</span>
            </div>
          </div>
        )}

        {modo === "login" && (
          <button
            type="button"
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-2 rounded hover:bg-gray-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continuar con Google
          </button>
        )}
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