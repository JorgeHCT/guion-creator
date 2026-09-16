import { NextRequest, NextResponse } from 'next/server';

async function getChannelIdFromUrl(url: string): Promise<string | null> {
  const channelMatch = url.match(/channel\/([a-zA-Z0-9_-]{24})/);
  if (channelMatch) return channelMatch[1];

  const handleMatch = url.match(/@([a-zA-Z0-9_-]+)/);
  if (handleMatch) {
    try {
      const res = await fetch(`https://www.youtube.com/@${handleMatch[1]}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      const html = await res.text();
      const idMatch = html.match(/"channelId":"([a-zA-Z0-9_-]{24})"/);
      if (idMatch) return idMatch[1];
      const idMatch2 = html.match(/channel\/([a-zA-Z0-9_-]{24})/);
      if (idMatch2) return idMatch2[1];
    } catch (e) {}
  }
  return null;
}

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: 'URL requerida' }, { status: 400 });

  try {
    const channelId = await getChannelIdFromUrl(url);
    if (!channelId) {
      return NextResponse.json({ error: 'No se pudo obtener el ID del canal.' }, { status: 400 });
    }

    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const res = await fetch(rssUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return NextResponse.json({ error: 'Error al obtener RSS' }, { status: 500 });

    const xml = await res.text();

    // Límite de 48 horas
    const hace48h = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const entries: { id: string; title: string; url: string; thumb: string; published: string }[] = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;

    while ((match = entryRegex.exec(xml)) !== null) {
      const entry = match[1];
      const idMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
      const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
      const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);

      if (!idMatch) continue;

      const published = publishedMatch ? publishedMatch[1] : '';

      // Filtrar por 48h — si tiene fecha y es antigua, saltar
      if (published) {
        const fechaVideo = new Date(published);
        if (fechaVideo < hace48h) continue;
      }

      const videoId = idMatch[1];
      entries.push({
        id: videoId,
        title: titleMatch ? titleMatch[1] : 'Sin título',
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumb: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        published,
      });
    }

    const channelNameMatch = xml.match(/<title>([^<]+)<\/title>/);
    const channelName = channelNameMatch ? channelNameMatch[1] : 'Canal';

    return NextResponse.json({ videos: entries, channelName, channelId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}