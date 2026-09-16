import Groq from 'groq-sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();
  if (!prompt) return NextResponse.json({ error: 'Prompt requerido' }, { status: 400 });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'API key no configurada' }, { status: 500 });

  try {
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Eres un guionista profesional. Escribe siempre en texto corrido, sin numeraciones, sin listas, sin viñetas, sin asteriscos, sin markdown. Solo párrafos narrativos fluidos.'
        },
        { role: 'user', content: prompt }
      ],
      model: 'openai/gpt-oss-20b',
      max_tokens: 4000,
      temperature: 0.8,
    });
    const text = completion.choices[0].message.content || '';
    return NextResponse.json({ text });
  } catch (error: any) {
    console.error('Groq error:', error?.message);
    if (error?.status === 429) return NextResponse.json({ error: 'RATE_LIMIT' }, { status: 429 });
    return NextResponse.json({ error: error.message || 'Error desconocido' }, { status: 500 });
  }
}