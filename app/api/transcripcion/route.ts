import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { videoId } = await req.json();
  if (!videoId) return NextResponse.json({ error: 'videoId requerido' }, { status: 400 });

  try {
    // Intentar obtener la lista de subtítulos disponibles desde la página del vídeo
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'es-ES,es;q=0.9',
      },
    });
    const html = await pageRes.text();

    // Extraer la URL de los subtítulos del HTML de YouTube
    const captionMatch = html.match(/"captionTracks":\[.*?"baseUrl":"(.*?)"/);
    if (!captionMatch) {
      return NextResponse.json({ error: 'No hay subtítulos disponibles' }, { status: 404 });
    }

    // Decodificar la URL
    const captionUrl = captionMatch[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/');

    // Descargar los subtítulos
    const subRes = await fetch(captionUrl);
    if (!subRes.ok) {
      return NextResponse.json({ error: 'Error al descargar subtítulos' }, { status: 500 });
    }

    const xml = await subRes.text();

    // Limpiar el XML y extraer solo el texto
    const texto = xml
      .replace(/<text[^>]*>/g, '')
      .replace(/<\/text>/g, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!texto || texto.length < 50) {
      return NextResponse.json({ error: 'Subtítulos vacíos o muy cortos' }, { status: 404 });
    }

    return NextResponse.json({ transcripcion: texto });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}