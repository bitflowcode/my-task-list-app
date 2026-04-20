import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { guardApi, aplicarHeadersRateLimit } from '../../../lib/api-guard';
import { LIMITES } from '../../../lib/rate-limit';

export const runtime = 'nodejs';

const MAX_TITULO = 500;
const MAX_DESCRIPCION = 2000;
const MAX_CARPETAS = 50;
const MAX_LONGITUD_CARPETA = 60;

export async function POST(request: NextRequest) {
  const guard = await guardApi(request, {
    bucket: 'categorizar',
    limit: LIMITES.CATEGORIZAR.limit,
    windowMs: LIMITES.CATEGORIZAR.windowMs,
  });
  if (!guard.ok) return guard.response;

  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'API de OpenAI no configurada' },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }

    const { titulo, descripcion, carpetasDisponibles } = body as {
      titulo?: unknown;
      descripcion?: unknown;
      carpetasDisponibles?: unknown;
    };

    if (typeof titulo !== 'string' || !titulo.trim()) {
      return NextResponse.json({ error: 'Se requiere un título' }, { status: 400 });
    }
    if (titulo.length > MAX_TITULO) {
      return NextResponse.json(
        { error: `El título supera el máximo de ${MAX_TITULO} caracteres` },
        { status: 400 }
      );
    }
    if (descripcion !== undefined && descripcion !== null) {
      if (typeof descripcion !== 'string') {
        return NextResponse.json({ error: 'Descripción inválida' }, { status: 400 });
      }
      if (descripcion.length > MAX_DESCRIPCION) {
        return NextResponse.json(
          { error: `La descripción supera el máximo de ${MAX_DESCRIPCION} caracteres` },
          { status: 400 }
        );
      }
    }

    let carpetas: string[] = ['Trabajo', 'Personal', 'Estudio', 'Hogar', 'Salud', 'Compras'];
    if (Array.isArray(carpetasDisponibles)) {
      const filtradas = carpetasDisponibles
        .filter((c): c is string => typeof c === 'string')
        .map(c => c.trim())
        .filter(c => c.length > 0 && c.length <= MAX_LONGITUD_CARPETA)
        .slice(0, MAX_CARPETAS);
      if (filtradas.length > 0) {
        carpetas = filtradas;
      }
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `Título de la tarea: ${titulo}
${typeof descripcion === 'string' && descripcion.trim() ? `Descripción: ${descripcion}` : ''}

Basado en el título${typeof descripcion === 'string' && descripcion.trim() ? ' y descripción' : ''} de la tarea, ¿en cuál de las siguientes carpetas encajaría mejor?
Carpetas disponibles: ${carpetas.join(', ')}

Responde solo con el nombre de la carpeta.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Eres un asistente que ayuda a categorizar tareas en español.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 20,
      temperature: 0.2,
    });

    const sugerencia = response.choices[0]?.message?.content?.trim();

    const resp = NextResponse.json({
      carpeta: sugerencia && carpetas.includes(sugerencia) ? sugerencia : null,
    });
    return aplicarHeadersRateLimit(resp, guard.rateLimit);
  } catch (error) {
    console.error('Error al categorizar la tarea:', error);
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 });
  }
}
