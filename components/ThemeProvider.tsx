"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
};

const ThemeContext = createContext<ThemeContextType>({
  theme: "system",
  setTheme: () => {},
  resolvedTheme: "light",
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  // Función para determinar el tema basado en la preferencia del sistema
  const getSystemTheme = (): "light" | "dark" => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches 
      ? "dark" 
      : "light";
  };

  // Aplicar el tema actual
  const applyTheme = (newTheme: "light" | "dark") => {
    setResolvedTheme(newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // Cargar tema guardado o detectar preferencia del sistema
  useEffect(() => {
    // Verificar tema guardado
    const savedTheme = localStorage.getItem("theme") as Theme;
    
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  // Efecto para aplicar el tema cuando cambia o cuando detectamos el tema del sistema
  useEffect(() => {
    if (theme === "system") {
      // Aplicar tema según la preferencia del sistema
      applyTheme(getSystemTheme());
      
      // Escuchar cambios en la preferencia del sistema
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme(getSystemTheme());
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Aplicar tema explícito
      applyTheme(theme as "light" | "dark");
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
} 