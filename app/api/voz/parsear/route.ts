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

const ZONA_HORARIA_USUARIO = 'Europe/Madrid';

function obtenerFechaEnZonaHoraria(fecha: Date, zonaHoraria: string): { y: number; m: number; d: number; diaSemana: number } {
  // Intl.DateTimeFormat permite obtener los componentes de fecha en la zona horaria del usuario,
  // evitando errores cuando el servidor (UTC en Vercel) está en un día distinto al del usuario.
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: zonaHoraria,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const partes = fmt.formatToParts(fecha);
  const get = (tipo: string) => partes.find(p => p.type === tipo)?.value || '';
  const y = Number(get('year'));
  const m = Number(get('month'));
  const d = Number(get('day'));
  const mapaDias: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const diaSemana = mapaDias[get('weekday')] ?? 0;
  return { y, m, d, diaSemana };
}

function formatearISO(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function sumarDiasYFormatear(base: { y: number; m: number; d: number }, dias: number): string {
  // Construimos la fecha como UTC para que las operaciones aritméticas no dependan
  // de la zona horaria del proceso, y devolvemos la fecha "natural" sin desfases.
  const utc = new Date(Date.UTC(base.y, base.m - 1, base.d));
  utc.setUTCDate(utc.getUTCDate() + dias);
  return formatearISO(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate());
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
    const baseHoy = obtenerFechaEnZonaHoraria(hoy, ZONA_HORARIA_USUARIO);
    const hoyStr = formatearISO(baseHoy.y, baseHoy.m, baseHoy.d);

    const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const diaActual = diasSemana[baseHoy.diaSemana];

    // Pre-calculamos las fechas absolutas de los próximos 14 días para que el modelo
    // no tenga que hacer aritmética de fechas (donde gpt-4o-mini comete errores frecuentes).
    const calendarioProximos: string[] = [];
    for (let i = 0; i <= 14; i++) {
      const fechaStr = sumarDiasYFormatear(baseHoy, i);
      const diaSemanaIdx = (baseHoy.diaSemana + i) % 7;
      const nombreDia = diasSemana[diaSemanaIdx];
      let etiqueta = '';
      if (i === 0) etiqueta = ' (hoy)';
      else if (i === 1) etiqueta = ' (mañana)';
      else if (i === 2) etiqueta = ' (pasado mañana)';
      calendarioProximos.push(`  - ${fechaStr} → ${nombreDia}${etiqueta}`);
    }

    // Mapeo explícito de "el <día>" / "este <día>" a la próxima ocurrencia futura del día (>= +1 día).
    const proximaOcurrencia: Record<string, string> = {};
    for (let i = 1; i <= 7; i++) {
      const diaSemanaIdx = (baseHoy.diaSemana + i) % 7;
      const nombreDia = diasSemana[diaSemanaIdx];
      if (!proximaOcurrencia[nombreDia]) {
        proximaOcurrencia[nombreDia] = sumarDiasYFormatear(baseHoy, i);
      }
    }
    const lineasProximaOcurrencia = Object.entries(proximaOcurrencia)
      .map(([dia, fecha]) => `  - "el ${dia}" / "este ${dia}" / "próximo ${dia}" → ${fecha}`)
      .join('\n');

    const systemPrompt = `Eres un asistente que extrae información estructurada de notas de voz en español para una app de tareas.

CONTEXTO TEMPORAL (usa SIEMPRE estas fechas exactas, NO calcules tú):
- Hoy es ${diaActual} ${hoyStr}.
- Calendario de los próximos 14 días:
${calendarioProximos.join('\n')}

Mapeo de expresiones relativas frecuentes (úsalo literalmente):
${lineasProximaOcurrencia}
  - "hoy" → ${hoyStr}
  - "mañana" → ${sumarDiasYFormatear(baseHoy, 1)}
  - "pasado mañana" → ${sumarDiasYFormatear(baseHoy, 2)}
  - "en una semana" → ${sumarDiasYFormatear(baseHoy, 7)}
  - "en dos semanas" → ${sumarDiasYFormatear(baseHoy, 14)}
  - "<día> que viene" → siempre la siguiente ocurrencia tras la próxima (es decir, ocurrencia + 7 días si "<día> que viene" se dice en un día que no es ese mismo día; en general usa la próxima ocurrencia salvo que el usuario indique claramente "la semana que viene")

Reglas de salida:
- Devuelve SIEMPRE un JSON que cumpla el schema indicado.
- "titulo": el texto limpio de la tarea SIN referencias a fecha o carpeta.
- "fechaLimite": formato YYYY-MM-DD o null si no se menciona ninguna fecha. Para fechas absolutas como "el 15 de octubre", asume el año actual o el siguiente si la fecha ya ha pasado.
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
