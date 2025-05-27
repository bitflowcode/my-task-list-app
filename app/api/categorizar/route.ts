import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación (opcional, depende de cómo está configurada tu app)
    // const session = await getServerSession();
    // if (!session) {
    //   return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    // }

    // Obtener datos de la solicitud
    const body = await request.json();
    const { titulo, descripcion, carpetasDisponibles } = body;

    if (!titulo) {
      return NextResponse.json({ error: "Se requiere un título" }, { status: 400 });
    }

    // Verificar API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: "API de OpenAI no configurada", 
        resultadoLocal: null 
      }, { status: 500 });
    }

    // Inicialización segura de OpenAI en el servidor (solo cuando se necesita)
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Crear el prompt para OpenAI
    const prompt = `
      Título de la tarea: ${titulo}
      ${descripcion ? `Descripción: ${descripcion}` : ''}
      
      Basado en el título${descripcion ? ' y descripción' : ''} de la tarea, ¿en cuál de las siguientes carpetas encajaría mejor?
      Carpetas disponibles: ${(carpetasDisponibles || ["Trabajo", "Personal", "Estudio", "Hogar", "Salud", "Compras"]).join(', ')}
      
      Responde solo con el nombre de la carpeta.
    `;

    // Llamar a la API de OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "Eres un asistente que ayuda a categorizar tareas." },
        { role: "user", content: prompt }
      ],
      max_tokens: 50,
      temperature: 0.3,
    });

    const sugerencia = response.choices[0].message.content?.trim();
    
    // Verificar si la sugerencia es una de las carpetas disponibles
    if (sugerencia && (carpetasDisponibles || []).includes(sugerencia)) {
      return NextResponse.json({ carpeta: sugerencia });
    }
    
    return NextResponse.json({ carpeta: null });
  } catch (error) {
    console.error("Error al categorizar la tarea:", error);
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 });
  }
} 