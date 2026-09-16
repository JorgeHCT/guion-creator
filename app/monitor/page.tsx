'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMonitorStore } from '@/store/useMonitorStore';
import { useQueueStore } from '@/store/useQueueStore';
import { useCanalesStore } from '@/store/useCanalesStore';
import { CanalMonitorizado, Video } from '@/types';

export default function MonitorPage() {
  const { canales, addCanal, removeCanal, updateUltimoVideo } = useMonitorStore();
  const { videos, addVideo, asignarCanalesAleatorio } = useQueueStore();
  const { canales: misCanales } = useCanalesStore();

  const [url, setUrl] = useState('');
  const [equipo, setEquipo] = useState<'realmadrid' | 'barcelona'>('realmadrid');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [comprobando, setComprobando] = useState<string | null>(null);
  const [ultimaComprobacion, setUltimaComprobacion] = useState<Date | null>(null);
  const [nuevosEncontrados, setNuevosEncontrados] = useState<{title: string; conTranscripcion: boolean}[]>([]);

  async function añadirCanal() {
    if (!url.trim()) return;
    setCargando(true);
    setError('');
    try {
      const res = await fetch('/api/rss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const ultimoId = data.videos[0]?.id || null;
      const canal: CanalMonitorizado = {
        id: Date.now().toString(),
        url: url.trim(),
        nombre: data.channelName,
        equipo,
        ultimoVideoId: ultimoId,
        createdAt: Date.now(),
      };
      addCanal(canal);
      setUrl('');
    } catch (e: any) {
      setError(e.message || 'Error al añadir canal');
    } finally {
      setCargando(false);
    }
  }

  const comprobarCanal = useCallback(async (canal: CanalMonitorizado, silencioso = false) => {
    if (!silencioso) setComprobando(canal.id);
    try {
      const res = await fetch('/api/rss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: canal.url }),
      });
      const data = await res.json();
      if (!res.ok) return;

      const videosExistentes = new Set(videos.map((v) => v.id.split('_')[0]));
      const nuevos = data.videos.filter(
        (v: any) => v.id !== canal.ultimoVideoId && !videosExistentes.has(v.id)
      );

      if (nuevos.length > 0) {
        const encontrados: {title: string; conTranscripcion: boolean}[] = [];

        for (const v of nuevos) {
          // Intentar obtener transcripción automáticamente
          let transcripcion = '';
          let conTranscripcion = false;
          try {
            const tRes = await fetch('/api/transcripcion', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ videoId: v.id }),
            });
            if (tRes.ok) {
              const tData = await tRes.json();
              transcripcion = tData.transcripcion || '';
              conTranscripcion = transcripcion.length > 50;
            }
          } catch (e) {}

          const nuevo: Video = {
            id: v.id,
            url: v.url,
            title: v.title,
            thumb: v.thumb,
            transcripcion,
            status: 'pending',
            guion: null,
            createdAt: Date.now(),
            equipo: canal.equipo,
            canalId: null,
          };
          addVideo(nuevo);
          encontrados.push({ title: v.title, conTranscripcion });
        }

        if (misCanales.length > 0) asignarCanalesAleatorio(misCanales);
        updateUltimoVideo(canal.id, data.videos[0].id);
        setNuevosEncontrados(prev => [...prev, ...encontrados]);
      }
    } catch (e) {
    } finally {
      if (!silencioso) setComprobando(null);
    }
  }, [videos, addVideo, asignarCanalesAleatorio, misCanales, updateUltimoVideo]);

  async function comprobarTodos() {
    setNuevosEncontrados([]);
    for (const canal of canales) {
      await comprobarCanal(canal);
    }
    setUltimaComprobacion(new Date());
  }

  useEffect(() => {
    if (canales.length === 0) return;
    const interval = setInterval(() => {
      canales.forEach((c) => comprobarCanal(c, true));
      setUltimaComprobacion(new Date());
    }, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [canales, comprobarCanal]);

  return (
    <div style={{background:'var(--bg)',minHeight:'100vh',color:'var(--txt)',fontFamily:'DM Sans, sans-serif'}}>
      <header style={{background:'var(--s1)',borderBottom:'1px solid var(--b)',padding:'15px 26px',display:'flex',alignItems:'center',gap:'14px',position:'sticky',top:0,zIndex:100}}>
        <h1 style={{fontFamily:'Bebas Neue, sans-serif',fontSize:'25px',letterSpacing:'2px',color:'var(--acc)'}}>
          ⚽ GUIÓN CREATOR
        </h1>
        <span style={{fontSize:'12px',color:'var(--mut)'}}>Monitor de canales</span>
        {ultimaComprobacion && (
          <span style={{fontSize:'11px',color:'var(--mut)',marginLeft:'auto'}}>
            Última comprobación: {ultimaComprobacion.toLocaleTimeString()}
          </span>
        )}
      </header>

      <div style={{maxWidth:'800px',margin:'0 auto',padding:'26px 22px'}}>

        {/* Info automatización */}
        <div style={{background:'rgba(0,255,136,0.05)',border:'1px solid rgba(0,255,136,0.2)',borderRadius:'10px',padding:'14px 18px',marginBottom:'20px'}}>
          <p style={{fontSize:'13px',color:'var(--ok)',fontWeight:600,marginBottom:'4px'}}>⚡ Automatización activa</p>
          <p style={{fontSize:'12px',color:'var(--mut)'}}>
            Cada hora se comprueban los canales. Cuando hay vídeos nuevos se añaden automáticamente
            a la cola e intentan obtener la transcripción de los subtítulos de YouTube.
          </p>
        </div>

        {/* Añadir canal */}
        <div style={{background:'var(--s1)',border:'1px solid var(--b)',borderRadius:'12px',padding:'20px',marginBottom:'20px'}}>
          <h2 style={{fontFamily:'Bebas Neue, sans-serif',fontSize:'18px',color:'var(--acc)',letterSpacing:'1px',marginBottom:'14px'}}>
            ➕ AÑADIR CANAL A MONITORIZAR
          </h2>
          <div style={{display:'grid',gridTemplateColumns:'1fr auto auto',gap:'10px',alignItems:'end'}}>
            <div>
              <label style={{fontSize:'12px',color:'var(--mut)',display:'block',marginBottom:'5px'}}>
                Enlace del canal de YouTube
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && añadirCanal()}
                placeholder="https://www.youtube.com/@canal"
                style={{width:'100%',background:'var(--s2)',border:'1px solid var(--b)',color:'var(--txt)',padding:'10px 13px',borderRadius:'8px',fontSize:'13px',outline:'none',fontFamily:'DM Sans, sans-serif'}}
              />
            </div>
            <div>
              <label style={{fontSize:'12px',color:'var(--mut)',display:'block',marginBottom:'5px'}}>Equipo</label>
              <select
                value={equipo}
                onChange={(e) => setEquipo(e.target.value as 'realmadrid' | 'barcelona')}
                style={{background:'var(--s2)',border:'1px solid var(--b)',color:'var(--txt)',padding:'10px 13px',borderRadius:'8px',fontSize:'13px',outline:'none',fontFamily:'DM Sans, sans-serif',cursor:'pointer'}}
              >
                <option value="realmadrid">⚽ Real Madrid</option>
                <option value="barcelona">🔵 Barcelona</option>
              </select>
            </div>
            <button
              onClick={añadirCanal}
              disabled={!url.trim() || cargando}
              style={{background:'var(--acc)',color:'#000',border:'none',padding:'10px 18px',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:'DM Sans, sans-serif',opacity:!url.trim()?0.4:1,whiteSpace:'nowrap'}}
            >
              {cargando ? '...' : 'Añadir'}
            </button>
          </div>
          {error && <p style={{fontSize:'12px',color:'var(--red)',marginTop:'8px'}}>⚠ {error}</p>}
        </div>

        {/* Notificaciones */}
        {nuevosEncontrados.length > 0 && (
          <div style={{background:'rgba(0,255,136,0.08)',border:'1px solid var(--ok)',borderRadius:'10px',padding:'14px 18px',marginBottom:'16px'}}>
            <p style={{fontSize:'13px',fontWeight:600,color:'var(--ok)',marginBottom:'8px'}}>
              🎉 {nuevosEncontrados.length} vídeo{nuevosEncontrados.length > 1 ? 's' : ''} nuevo{nuevosEncontrados.length > 1 ? 's' : ''} añadido{nuevosEncontrados.length > 1 ? 's' : ''}
            </p>
            {nuevosEncontrados.map((v, i) => (
              <div key={i} style={{display:'flex',alignItems:'center',gap:'8px',marginTop:'4px'}}>
                <span style={{fontSize:'12px',color:'var(--mut)'}}>· {v.title}</span>
                {v.conTranscripcion
                  ? <span style={{fontSize:'10px',padding:'1px 7px',borderRadius:'8px',background:'rgba(0,255,136,0.1)',color:'var(--ok)',fontWeight:500}}>✍ Transcripción auto</span>
                  : <span style={{fontSize:'10px',padding:'1px 7px',borderRadius:'8px',background:'rgba(102,102,102,0.15)',color:'var(--mut)',fontWeight:500}}>📝 Sin transcripción</span>
                }
              </div>
            ))}
          </div>
        )}

        {/* Lista canales */}
        {canales.length === 0 ? (
          <div style={{textAlign:'center',padding:'60px 20px',color:'var(--mut)',border:'1px dashed var(--b)',borderRadius:'12px'}}>
            <p style={{fontSize:'36px',marginBottom:'12px'}}>📡</p>
            <p style={{fontSize:'15px',fontWeight:500,color:'var(--txt)',marginBottom:'6px'}}>
              No hay canales monitorizados
            </p>
            <p style={{fontSize:'13px'}}>
              Añade los canales de YouTube que quieres replicar automáticamente
            </p>
          </div>
        ) : (
          <>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px'}}>
              <div>
                <h2 style={{fontFamily:'Bebas Neue, sans-serif',fontSize:'18px',color:'var(--txt)',letterSpacing:'1px'}}>
                  📡 CANALES MONITORIZADOS ({canales.length})
                </h2>
                <p style={{fontSize:'12px',color:'var(--mut)',marginTop:'2px'}}>
                  Se comprueban automáticamente cada hora · Transcripción automática activada
                </p>
              </div>
              <button
                onClick={comprobarTodos}
                style={{background:'var(--s2)',color:'var(--txt)',border:'1px solid var(--b)',padding:'9px 16px',borderRadius:'8px',fontSize:'13px',cursor:'pointer',fontFamily:'DM Sans, sans-serif',display:'flex',alignItems:'center',gap:'6px'}}
              >
                🔄 Comprobar ahora
              </button>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
              {canales.map((canal) => (
                <div
                  key={canal.id}
                  style={{background:'var(--s1)',border:'1px solid var(--b)',borderRadius:'10px',padding:'14px 16px',display:'flex',alignItems:'center',gap:'14px'}}
                >
                  <div style={{width:'40px',height:'40px',borderRadius:'8px',background:canal.equipo==='realmadrid'?'rgba(232,255,0,0.1)':'rgba(165,0,68,0.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',flexShrink:0}}>
                    {canal.equipo === 'realmadrid' ? '⚽' : '🔵'}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'14px',fontWeight:600,color:'var(--txt)',marginBottom:'2px'}}>
                      {canal.nombre}
                    </div>
                    <a
                      href={canal.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{fontSize:'11px',color:'var(--acc)',textDecoration:'none'}}
                    >
                      🔗 {canal.url.replace('https://','').substring(0,50)}
                    </a>
                    <div style={{display:'flex',gap:'8px',marginTop:'4px',alignItems:'center'}}>
                      <span style={{fontSize:'11px',color:'var(--mut)'}}>
                        {canal.equipo === 'realmadrid' ? 'Real Madrid' : 'Barcelona'}
                      </span>
                      {comprobando === canal.id && (
                        <span style={{fontSize:'11px',color:'var(--acc)'}}>⏳ Comprobando y obteniendo transcripciones...</span>
                      )}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:'6px',flexShrink:0}}>
                    <button
                      onClick={() => comprobarCanal(canal)}
                      style={{background:'var(--s2)',color:'var(--txt)',border:'1px solid var(--b)',padding:'6px 12px',borderRadius:'7px',fontSize:'12px',cursor:'pointer',fontFamily:'DM Sans, sans-serif'}}
                    >
                      🔄
                    </button>
                    <button
                      onClick={() => removeCanal(canal.id)}
                      style={{background:'transparent',color:'var(--mut)',border:'1px solid var(--b)',padding:'6px 12px',borderRadius:'7px',fontSize:'12px',cursor:'pointer',fontFamily:'DM Sans, sans-serif'}}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
