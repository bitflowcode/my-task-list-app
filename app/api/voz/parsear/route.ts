import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { guardApi, aplicarHeadersRateLimit } from '../../../../lib/api-guard';
import { LIMITES } from '../../../../lib/rate-limit';

export const runtime = 'nodejs';

const MAX_TEXTO = 2000;
const MAX_CARPETAS = 50;
const MAX_LONGITUD_CARPETA = 60;

type ResultadoParseo = {
  titulo: string;
  fechaLimite: string | null;
  carpeta: string | null;
};

function formatearFechaLocal(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function POST(request: NextRequest) {
  const guard = await guardApi(request, {
    bucket: 'voz:parsear',
    limit: LIMITES.PARSEAR.limit,
    windowMs: LIMITES.PARSEAR.windowMs,
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

    const texto: unknown = (body as Record<string, unknown>).texto;
    const carpetasDisponiblesRaw: unknown = (body as Record<string, unknown>).carpetasDisponibles;

    if (typeof texto !== 'string' || !texto.trim()) {
      return NextResponse.json({ error: 'Se requiere el campo "texto"' }, { status: 400 });
    }
    if (texto.length > MAX_TEXTO) {
      return NextResponse.json(
        { error: `El texto supera el máximo de ${MAX_TEXTO} caracteres` },
        { status: 400 }
      );
    }

    let carpetasDisponibles: string[] = [];
    if (Array.isArray(carpetasDisponiblesRaw)) {
      carpetasDisponibles = carpetasDisponiblesRaw
        .filter((c): c is string => typeof c === 'string')
        .map(c => c.trim())
        .filter(c => c.length > 0 && c.length <= MAX_LONGITUD_CARPETA)
        .slice(0, MAX_CARPETAS);
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const hoy = new Date();
    const hoyStr = formatearFechaLocal(hoy);
    const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const diaActual = diasSemana[hoy.getDay()];

    const systemPrompt = `Eres un asistente que extrae información estructurada de notas de voz en español para una app de tareas.
- La fecha de hoy es ${hoyStr} (${diaActual}).
- Interpreta expresiones relativas ("hoy", "mañana", "pasado mañana", "el jueves que viene", "el próximo lunes", "en dos semanas", "el 15 de octubre", "antes del viernes", etc.).
- Devuelve SIEMPRE un JSON que cumpla el schema indicado.
- "titulo": el texto limpio de la tarea SIN referencias a fecha o carpeta.
- "fechaLimite": formato YYYY-MM-DD o null si no se menciona ninguna fecha.
- "carpeta": DEBE ser una de las carpetas disponibles (coincidencia exacta, respetando mayúsculas/minúsculas del listado). Si no hay referencia clara a ninguna, devuelve null. No inventes carpetas nuevas.`;

    const userPrompt = `Carpetas disponibles: ${
      carpetasDisponibles.length > 0 ? carpetasDisponibles.join(', ') : '(ninguna)'
    }

Texto de la nota de voz:
"""
${texto.trim()}
"""`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 300,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'tarea_parseada',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              titulo: { type: 'string' },
              fechaLimite: {
                type: ['string', 'null'],
                description: 'Fecha en formato YYYY-MM-DD o null',
              },
              carpeta: {
                type: ['string', 'null'],
                description: 'Nombre exacto de una de las carpetas disponibles, o null',
              },
            },
            required: ['titulo', 'fechaLimite', 'carpeta'],
          },
        },
      },
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json({ error: 'Respuesta vacía del modelo' }, { status: 502 });
    }

    let parsed: ResultadoParseo;
    try {
      parsed = JSON.parse(raw) as ResultadoParseo;
    } catch {
      return NextResponse.json({ error: 'Respuesta no parseable' }, { status: 502 });
    }

    const titulo = typeof parsed.titulo === 'string' ? parsed.titulo.trim() : '';
    if (!titulo) {
      return NextResponse.json({ error: 'El modelo no pudo extraer un título' }, { status: 422 });
    }

    let fechaLimite: string | null = null;
    if (typeof parsed.fechaLimite === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.fechaLimite)) {
      fechaLimite = parsed.fechaLimite;
    }

    let carpeta: string | null = null;
    if (typeof parsed.carpeta === 'string' && carpetasDisponibles.includes(parsed.carpeta)) {
      carpeta = parsed.carpeta;
    }

    const resp = NextResponse.json({ titulo, fechaLimite, carpeta });
    return aplicarHeadersRateLimit(resp, guard.rateLimit);
  } catch (error) {
    console.error('Error al parsear texto de voz:', error);
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 });
  }
}
