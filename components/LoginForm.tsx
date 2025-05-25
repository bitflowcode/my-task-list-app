"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { auth } from "../lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile
} from "firebase/auth";

export default function LoginForm() {
  const { user, loginWithEmail, registerWithEmail, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [modo, setModo] = useState<"login" | "registro" | "recuperar">("login");
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

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

  const iniciarSesion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Por favor ingresa tu email y contraseña");
      return;
    }

    setCargando(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError("Email o contraseña incorrectos");
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const registrarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !nombre) {
      setError("Por favor completa todos los campos");
      return;
    }

    setCargando(true);
    setError("");

    try {
      const resultado = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(resultado.user, {
        displayName: nombre
      });
    } catch (err) {
      // Error tipado como objeto de Firebase Auth
      const firebaseError = err as { code?: string; message?: string };
      if (firebaseError.code === "auth/email-already-in-use") {
        setError("Este email ya está registrado");
      } else if (firebaseError.code === "auth/weak-password") {
        setError("La contraseña debe tener al menos 6 caracteres");
      } else {
        setError("Error al crear la cuenta");
      }
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const iniciarSesionConGoogle = async () => {
    setCargando(true);
    setError("");

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      setError("Error al iniciar sesión con Google");
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-6 text-center text-gray-800 dark:text-white">
          {modo === "login" ? "Iniciar sesión" : 
           modo === "registro" ? "Crear cuenta" : 
           "Recuperar contraseña"}
        </h2>

        {error && (
          <p className="text-red-500 text-sm mb-4">{error}</p>
        )}

        {mensaje && (
          <p className="text-green-500 text-sm text-center mb-2">{mensaje}</p>
        )}

        <form onSubmit={modo === "login" ? handleSubmit : modo === "registro" ? registrarUsuario : iniciarSesion}>
          {modo === "registro" && (
            <div className="mb-4">
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre
              </label>
              <input
                id="nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full border dark:border-gray-600 rounded px-3 py-2 text-base dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Tu nombre"
              />
            </div>
          )}
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border dark:border-gray-600 rounded px-3 py-2 text-base dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="tu@email.com"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border dark:border-gray-600 rounded px-3 py-2 text-base dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder={modo === "registro" ? "Crea una contraseña" : "Tu contraseña"}
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className={`w-full bg-blue-500 text-white rounded-md py-2 px-4 font-medium hover:bg-blue-600 transition duration-200 mb-4 ${
              cargando ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {cargando
              ? "Cargando..."
              : modo === "login" ? "Entrar" : 
                 modo === "registro" ? "Registrarse" : 
                 "Enviar instrucciones"}
          </button>
        </form>

        <div className="flex items-center my-4">
          <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
          <span className="mx-4 text-sm text-gray-500 dark:text-gray-400">O</span>
          <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
        </div>

        {modo === "login" && (
          <button
            onClick={iniciarSesionConGoogle}
            disabled={cargando}
            className="w-full flex justify-center items-center bg-white border border-gray-300 rounded-md py-2 px-4 font-medium text-gray-700 hover:bg-gray-50 transition duration-200"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M5.26620003,9.76452941 C6.19878754,6.93863203 8.85444915,4.90909091 12,4.90909091 C13.6909091,4.90909091 15.2181818,5.50909091 16.4181818,6.49090909 L19.9090909,3 C17.7818182,1.14545455 15.0545455,0 12,0 C7.27006974,0 3.1977497,2.69829785 1.23999023,6.65002441 L5.26620003,9.76452941 Z"
              />
              <path
                fill="#34A853"
                d="M16.0407269,18.0125889 C14.9509167,18.7163016 13.5660892,19.0909091 12,19.0909091 C8.86648613,19.0909091 6.21911939,17.076871 5.27698177,14.2678769 L1.23746264,17.3349879 C3.19279051,21.2970142 7.26500293,24 12,24 C14.9328362,24 17.7353462,22.9573905 19.834192,20.9995801 L16.0407269,18.0125889 Z"
              />
              <path
                fill="#4A90E2"
                d="M19.834192,20.9995801 C22.0291676,18.9520994 23.4545455,15.903663 23.4545455,12 C23.4545455,11.2909091 23.3454545,10.5818182 23.1272727,9.90909091 L12,9.90909091 L12,14.4545455 L18.4363636,14.4545455 C18.1187732,16.013626 17.2662994,17.2212117 16.0407269,18.0125889 L19.834192,20.9995801 Z"
              />
              <path
                fill="#FBBC05"
                d="M5.27698177,14.2678769 C5.03832634,13.556323 4.90909091,12.7937589 4.90909091,12 C4.90909091,11.2182781 5.03443647,10.4668121 5.26620003,9.76452941 L1.23999023,6.65002441 C0.43658717,8.26043162 0,10.0753848 0,12 C0,13.9195484 0.444780743,15.7301709 1.23746264,17.3349879 L5.27698177,14.2678769 Z"
              />
            </svg>
            Continuar con Google
          </button>
        )}

        <div className="mt-4 text-center">
          {modo === "login" ? (
            <>
              ¿No tienes cuenta?{" "}
              <button
                onClick={() => setModo("registro")}
                className="text-blue-500 hover:underline text-sm font-medium"
              >
                Crear una
              </button>
              <br />
              <button
                onClick={() => setModo("recuperar")}
                className="text-blue-500 hover:underline text-sm font-medium mt-2"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </>
          ) : modo === "registro" ? (
            <>
              ¿Ya tienes cuenta?{" "}
              <button
                onClick={() => setModo("login")}
                className="text-blue-500 hover:underline text-sm font-medium"
              >
                Inicia sesión
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setModo("login")}
                className="text-blue-500 hover:underline text-sm font-medium"
              >
                Volver al inicio de sesión
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}