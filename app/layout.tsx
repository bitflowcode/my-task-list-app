"use client";

import { useEffect } from "react";
import "./globals.css";
import { ThemeProvider } from "../components/ThemeProvider";
import { AuthProvider } from "../components/AuthProvider";
import ThemeToggle from "../components/ThemeToggle";
import { initializeAI } from "../lib/ai";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Inicializar componentes de IA
    initializeAI();
  }, []);

  return (
    <html lang="es">
      <head>
        <title>Mi Lista de Tareas</title>
        <meta name="description" content="Aplicación para gestionar tareas" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="application-name" content="Mi Lista de Tareas" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Mi Lista de Tareas" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-gray-50 dark:bg-gray-900 min-h-screen">
        <ThemeProvider>
          <AuthProvider>
            <header className="fixed top-0 right-0 p-4 z-10">
              <ThemeToggle />
            </header>
            <main className="min-h-screen pt-14 pb-10">{children}</main>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}