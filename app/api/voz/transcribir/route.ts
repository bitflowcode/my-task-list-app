import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { guardApi, aplicarHeadersRateLimit, aplicarHeadersCuota } from '../../../../lib/api-guard';
import { LIMITES } from '../../../../lib/rate-limit';

export const runtime = 'nodejs';

const MAX_AUDIO_BYTES = 1_024 * 1_024; // 1 MB (~30s a bitrate típico de voz)
const TIPOS_PERMITIDOS = new Set([
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/ogg',
  'audio/ogg;codecs=opus',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
]);

export async function POST(request: NextRequest) {
  const guard = await guardApi(request, {
    bucket: 'voz:transcribir',
    limit: LIMITES.TRANSCRIBIR.limit,
    windowMs: LIMITES.TRANSCRIBIR.windowMs,
    recursoCuota: 'whisper',
  });
  if (!guard.ok) return guard.response;

  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'API de OpenAI no configurada' },
        { status: 500 }
      );
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Se esperaba multipart/form-data con el campo "audio"' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const audioEntry = formData.get('audio');
    // En Node/Next el tipo es FormDataEntryValue (string | File). Validamos por duck-typing.
    if (
      !audioEntry ||
      typeof audioEntry === 'string' ||
      typeof (audioEntry as Blob).size !== 'number' ||
      typeof (audioEntry as Blob).arrayBuffer !== 'function'
    ) {
      return NextResponse.json(
        { error: 'Falta el archivo de audio' },
        { status: 400 }
      );
    }
    const audio = audioEntry as Blob & { name?: string; type: string };

    const size = audio.size;
    if (size === 0) {
      return NextResponse.json({ error: 'Audio vacío' }, { status: 400 });
    }
    if (size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: `El audio supera el tamaño máximo permitido (${MAX_AUDIO_BYTES} bytes)` },
        { status: 413 }
      );
    }

    const mime = (audio.type || '').toLowerCase();
    // Algunos navegadores envían el MIME vacío; si está presente, validamos.
    if (mime && !TIPOS_PERMITIDOS.has(mime)) {
      return NextResponse.json(
        { error: `Tipo de audio no soportado: ${mime}` },
        { status: 415 }
      );
    }

    // Aseguramos un File con nombre para que la API de OpenAI detecte el formato.
    const nombre = audio.name && audio.name.length > 0 ? audio.name : 'audio.webm';
    const fileParaOpenAI = new File([audio], nombre, { type: mime || 'audio/webm' });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const transcripcion = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file: fileParaOpenAI,
      language: 'es',
      response_format: 'text',
      temperature: 0,
    });

    const texto =
      typeof transcripcion === 'string'
        ? transcripcion
        : (transcripcion as { text?: string }).text || '';

    const resp = NextResponse.json({ texto: texto.trim() });
    aplicarHeadersRateLimit(resp, guard.rateLimit);
    if (guard.cuota) aplicarHeadersCuota(resp, guard.cuota);
    return resp;
  } catch (error) {
    console.error('Error al transcribir audio:', error);
    return NextResponse.json(
      { error: 'Error al procesar el audio' },
      { status: 500 }
    );
  }
}
