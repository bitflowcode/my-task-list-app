import OpenAI from 'openai';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';

// Variable para controlar si estamos en el navegador o en el servidor
const isClient = typeof window !== 'undefined';

// Para la versión gratuita, usamos Ollama (que es local) o Groq (que tiene opciones gratuitas)
// Alternativa 1: API de OpenAI (de pago)
let openai: OpenAI | null = null;

export function initializeAI() {
  // Solo inicializar en el servidor, nunca en el cliente
  if (!isClient && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      // dangerouslyAllowBrowser eliminado para prevenir exposición de la API key
    });
  }
}

// Categorizar tareas automáticamente - Ahora solo debe llamarse desde el servidor
export async function categorizarTarea(titulo: string, descripcion?: string): Promise<string | null> {
  if (isClient) {
    console.error("Esta función solo debe ser llamada desde el servidor");
    return null;
  }
  
  if (!openai) {
    console.log("API de IA no configurada");
    return null;
  }

  try {
    const carpetasDisponibles = ["Trabajo", "Personal", "Estudio", "Hogar", "Salud", "Compras"]; // Ejemplo

    const prompt = `
      Título de la tarea: ${titulo}
      ${descripcion ? `Descripción: ${descripcion}` : ''}
      
      Basado en el título${descripcion ? ' y descripción' : ''} de la tarea, ¿en cuál de las siguientes carpetas encajaría mejor?
      Carpetas disponibles: ${carpetasDisponibles.join(', ')}
      
      Responde solo con el nombre de la carpeta.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Modelo más económico
      messages: [
        { role: "system", content: "Eres un asistente que ayuda a categorizar tareas." },
        { role: "user", content: prompt }
      ],
      max_tokens: 50,
      temperature: 0.3,
    });

    const sugerencia = response.choices[0].message.content?.trim();
    
    // Verificar si la sugerencia es una de las carpetas disponibles
    if (sugerencia && carpetasDisponibles.includes(sugerencia)) {
      return sugerencia;
    }
    
    return null;
  } catch (error) {
    console.error("Error al categorizar la tarea:", error);
    return null;
  }
}

// Versión alternativa que no requiere API key (usando reglas simples)
// Esta sí puede ejecutarse en el cliente
export function categorizarTareaLocal(titulo: string): string | null {
  const tituloLower = titulo.toLowerCase();
  
  // Palabras clave para diferentes categorías
  const categorias: {[key: string]: string[]} = {
    "Trabajo": ["reunión", "proyecto", "cliente", "informe", "email", "correo", "presentación"],
    "Personal": ["amigo", "familia", "cita", "cumpleaños", "regalo"],
    "Estudio": ["estudiar", "examen", "curso", "libro", "leer", "aprender"],
    "Hogar": ["limpiar", "cocina", "compra", "reparar", "casa", "jardín"],
    "Salud": ["médico", "ejercicio", "entrenar", "cita", "medicamento"],
    "Compras": ["comprar", "tienda", "supermercado", "lista"]
  };
  
  // Buscar coincidencias
  for (const [categoria, palabrasClave] of Object.entries(categorias)) {
    if (palabrasClave.some(palabra => tituloLower.includes(palabra))) {
      return categoria;
    }
  }
  
  return null;
}

// Generar sugerencias de tareas basadas en patrones
export async function generarSugerenciasDeTareas(userId: string): Promise<string[]> {
  try {
    console.log("Buscando sugerencias para el usuario:", userId);
    
    // 1. Obtener tareas completadas recientemente (últimas 30 para más datos)
    const qCompletadas = query(
      collection(db, "completadas"),
      where("userId", "==", userId),
      orderBy("fechaCompletada", "desc"),
      limit(30)
    );
    
    const snapshotCompletadas = await getDocs(qCompletadas);
    const tareasCompletadas = snapshotCompletadas.docs.map(doc => ({
      id: doc.id,
      titulo: doc.data().titulo,
      carpeta: doc.data().carpeta,
      fechaCompletada: doc.data().fechaCompletada
    }));
    
    console.log(`Encontradas ${tareasCompletadas.length} tareas completadas`);
    
    // 2. Obtener tareas pendientes actuales
    const qPendientes = query(
      collection(db, "tareas"),
      where("userId", "==", userId)
    );
    
    const snapshotPendientes = await getDocs(qPendientes);
    const tareasPendientes = snapshotPendientes.docs.map(doc => doc.data().titulo);
    
    console.log(`Encontradas ${tareasPendientes.length} tareas pendientes`);
    
    // 3. Analizar patrones (versión simple sin IA)
    const sugerencias: string[] = [];
    
    // A. Buscar tareas recurrentes (ahora solo necesitan aparecer 1 vez)
    const tareasRecurrentes: {[key: string]: number} = {};
    
    tareasCompletadas.forEach(tarea => {
      const tituloBase = tarea.titulo
        .replace(/\d+\/\d+\/\d+/, '') // Eliminar fechas
        .replace(/\d{1,2}:\d{2}/, '')  // Eliminar horas
        .trim();
      
      tareasRecurrentes[tituloBase] = (tareasRecurrentes[tituloBase] || 0) + 1;
    });
    
    // Ahora sugerimos incluso tareas que solo aparecen una vez, si no están ya en la lista de pendientes
    Object.keys(tareasRecurrentes).forEach(tituloBase => {
      // Verificar que no está ya en pendientes y que no es demasiado genérica (menos de 3 caracteres)
      if (tituloBase.length > 3 && 
          !tareasPendientes.some(t => t.includes(tituloBase)) && 
          !sugerencias.includes(tituloBase)) {
        sugerencias.push(tituloBase);
      }
    });
    
    // B. Sugerir tareas basadas en días de la semana
    const hoy = new Date();
    const diaDeLaSemana = hoy.getDay(); // 0 es Domingo, 1 es Lunes, etc.
    
    const diasSemana = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    const diaActual = diasSemana[diaDeLaSemana];
    
    tareasCompletadas.forEach(tarea => {
      const tituloLower = tarea.titulo.toLowerCase();
      // Si la tarea tiene el día de la semana actual
      if (tituloLower.includes(diaActual)) {
        const sugerencia = tarea.titulo;
        if (!tareasPendientes.includes(sugerencia) && !sugerencias.includes(sugerencia)) {
          sugerencias.push(sugerencia);
        }
      }
    });
    
    // C. Añadir algunas tareas populares si no hay suficientes sugerencias
    if (sugerencias.length < 2 && tareasCompletadas.length > 0) {
      // Tomar algunas de las tareas completadas más recientes como inspiración
      tareasCompletadas.slice(0, 5).forEach(tarea => {
        if (!tareasPendientes.includes(tarea.titulo) && !sugerencias.includes(tarea.titulo)) {
          sugerencias.push(tarea.titulo);
        }
      });
    }
    
    console.log(`Generadas ${sugerencias.length} sugerencias`, sugerencias);
    
    // Limitar y mezclar las sugerencias para variedad
    const sugerenciasMezcladas = sugerencias
      .sort(() => 0.5 - Math.random()) // Mezclar aleatoriamente
      .slice(0, 3);                    // Tomar hasta 3
    
    return sugerenciasMezcladas;
    
  } catch (error) {
    console.error("Error al generar sugerencias:", error);
    return [];
  }
} 