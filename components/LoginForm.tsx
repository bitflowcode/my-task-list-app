"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";

export default function LoginForm() {
  const { user, loginWithEmail, registerWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [modo, setModo] = useState<"login" | "registro">("login");
  const [error, setError] = useState<string | null>(null);

  if (user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (modo === "login") {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password);
      }
    } catch (err) {
      setError("Error al iniciar sesión o registrarse.");
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-6 p-4 border border-gray-200 rounded shadow-sm">
      <h2 className="text-lg font-semibold mb-4 text-center">
        {modo === "login" ? "Iniciar sesión" : "Crear cuenta"}
      </h2>

      {error && (
        <p className="text-red-500 text-sm text-center mb-2">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          placeholder="Correo electrónico"
          className="w-full border px-3 py-2 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Contraseña"
          className="w-full border px-3 py-2 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          {modo === "login" ? "Entrar" : "Registrarse"}
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
          </>
        ) : (
          <>
            ¿Ya tienes cuenta?{" "}
            <button
              onClick={() => setModo("login")}
              className="text-blue-600 hover:underline"
            >
              Inicia sesión
            </button>
          </>
        )}
      </div>
    </div>
  );
}