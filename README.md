# ⚽ Guión Creator

Generador automático de guiones para creadores de contenido de fútbol en YouTube.

## Instalación

1. Instala las dependencias:
```bash
npm install
```

2. Crea el archivo `.env.local` con tu API key de Groq:
```bash
cp .env.local.example .env.local
```
Edita `.env.local` y pon tu key de Groq (empieza por `gsk_...`)

3. Arranca el servidor:
```bash
npm run dev
```

4. Abre http://localhost:3000

## Cómo conseguir la API key de Groq

1. Ve a https://console.groq.com
2. Crea una cuenta gratis
3. Ve a "API Keys" → "Create API Key"
4. Copia la key y pégala en `.env.local`

## Uso

1. Haz clic en "Añadir vídeo"
2. Pega el enlace de YouTube
3. Haz clic en "Cargar" para obtener título y miniatura
4. Pega la transcripción del vídeo
5. Guarda en la cola
6. Repite con todos los vídeos que quieras
7. Haz clic en "▶ Empezar" en cada vídeo para generar el guión

## Deploy en Vercel

1. Sube el proyecto a GitHub
2. Conecta el repositorio en https://vercel.com
3. Añade la variable de entorno `GROQ_API_KEY` en Vercel
4. Deploy automático
