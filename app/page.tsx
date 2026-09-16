'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQueueStore } from '@/store/useQueueStore';
import { useCanalesStore } from '@/store/useCanalesStore';
import { useMonitorStore } from '@/store/useMonitorStore';
import { Video, Canal, CanalMonitorizado } from '@/types';
import Editor from '@/components/Editor';
import AddVideoModal from '@/components/AddVideoModal';

type Vista = 'sinGuion' | 'conGuion' | 'canales' | 'menu';

export default function Home() {
  const { videos, updateVideo, removeVideo, addVideo, asignarCanalesAleatorio } = useQueueStore();
  const { canales } = useCanalesStore();
  const { canales: monitorizados } = useMonitorStore();
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [showArchivo, setShowArchivo] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [vista, setVista] = useState<Vista>('canales');
  const [obteniendo, setObteniendo] = useState(false);
  const [progresoAuto, setProgresoAuto] = useState<{actual: number; total: number; ok: number; fail: number} | null>(null);
  const [canalExpandido, setCanalExpandido] = useState<string | null>(null);

  if (editingVideo) {
    return (
      <div style={{background:'var(--bg)',minHeight:'100vh',color:'var(--txt)',fontFamily:'DM Sans, sans-serif'}}>
        <header style={{background:'var(--s1)',borderBottom:'1px solid var(--b)',padding:'12px 22px',display:'flex',alignItems:'center',gap:'12px',position:'sticky',top:0,zIndex:100}}>
          <button onClick={() => setEditingVideo(null)}
            style={{background:'var(--s2)',color:'var(--txt)',border:'1px solid var(--b)',padding:'7px 14px',borderRadius:'8px',fontSize:'12px',cursor:'pointer',fontFamily:'DM Sans, sans-serif'}}>
            ← Volver
          </button>
          <h1 style={{fontFamily:'Bebas Neue, sans-serif',fontSize:'20px',letterSpacing:'2px',color:'var(--acc)'}}>⚽ GUIÓN CREATOR</h1>
        </header>
        <Editor video={editingVideo} onBack={() => setEditingVideo(null)} onDone={() => setEditingVideo(null)} />
      </div>
    );
  }

  const sinGuion = videos.filter(v => v.status !== 'done' && !v.transcripcion).sort((a, b) => a.createdAt - b.createdAt);
  const conGuion = videos.filter(v => v.status !== 'done' && !!v.transcripcion).sort((a, b) => {
    if (a.fechaPublicacion && b.fechaPublicacion) return a.fechaPublicacion.localeCompare(b.fechaPublicacion);
    if (a.fechaPublicacion) return -1;
    if (b.fechaPublicacion) return 1;
    return a.createdAt - b.createdAt;
  });
  const grabados = videos.filter(v => v.status === 'done').sort((a, b) => b.createdAt - a.createdAt);

  const secciones = [
    { emoji:'📡', label:'Monitor', description:'Detecta vídeos nuevos automáticamente.', href:'/monitor', stat:`${monitorizados.length} canales` },
    { emoji:'📦', label:'Carga Masiva', description:'Sube muchos vídeos de golpe.', href:'/carga', stat:`${sinGuion.length} pendientes` },
    { emoji:'📺', label:'Mis Canales', description:'Configura tus canales de YouTube.', href:'/canales', stat:`${canales.length} canales` },
    { emoji:'📊', label:'Dashboard', description:'Contenido organizado por canal.', href:'/dashboard', stat:`${grabados.length} completados` },
    { emoji:'🖼️', label:'Jugadores', description:'Fotos para arrastrar a Clipchamp.', href:'/jugadores', stat:'Fotos' },
    { emoji:'📅', label:'Calendario', description:'Planifica publicaciones diarias.', href:'/calendario', stat:'3/día' },
  ];

  function getCanalInfo(canalId: string | null) {
    if (!canalId) return null;
    return canales.find(c => c.id === canalId) || null;
  }

  function marcarGrabado(id: string) { updateVideo(id, { status: 'done' }); }

  function nuevoGuionSimilar(video: Video) {
    addVideo({
      id: video.id + '_reciclado_' + Date.now(),
      url: video.url,
      title: '♻️ ' + video.title,
      thumb: video.thumb,
      transcripcion: video.transcripcion,
      status: 'pending',
      guion: null,
      createdAt: Date.now(),
      equipo: video.equipo,
      canalId: null,
    });
    if (canales.length > 0) asignarCanalesAleatorio(canales);
    setShowArchivo(false);
  }

  function eliminarGrabados() {
    if (confirm(`¿Eliminar los ${grabados.length} vídeos grabados?`)) grabados.forEach(v => removeVideo(v.id));
  }

  function eliminarConGuion() {
    if (confirm(`¿Eliminar los ${conGuion.length} vídeos con guión?`)) conGuion.forEach(v => removeVideo(v.id));
  }

  async function obtenerTodasTranscripciones() {
    const pendientes = sinGuion.filter(v => !v.transcripcion);
    if (pendientes.length === 0) return;
    setObteniendo(true);
    setProgresoAuto({ actual: 0, total: pendientes.length, ok: 0, fail: 0 });
    let ok = 0; let fail = 0;
    for (let i = 0; i < pendientes.length; i++) {
      const video = pendientes[i];
      setProgresoAuto({ actual: i + 1, total: pendientes.length, ok, fail });
      try {
        const res = await fetch('/api/transcripcion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId: video.id }),
        });
        const data = await res.json();
        if (res.ok && data.transcripcion && data.transcripcion.length > 50) {
          updateVideo(video.id, { transcripcion: data.transcripcion });
          ok++;
        } else { fail++; }
      } catch (e) { fail++; }
      setProgresoAuto({ actual: i + 1, total: pendientes.length, ok, fail });
      await new Promise(r => setTimeout(r, 500));
    }
    setObteniendo(false);
  }

  function Tab({ id, label, count, color }: { id: Vista; label: string; count?: number; color: string }) {
    const active = vista === id;
    return (
      <button onClick={() => setVista(id)} style={{
        background: active ? color : 'transparent',
        color: active ? '#000' : 'var(--mut)',
        border: `1px solid ${active ? color : 'var(--b)'}`,
        padding: '8px 14px',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'DM Sans, sans-serif',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all .2s',
      }}>
        {label}
        {count !== undefined && (
          <span style={{
            background: active ? 'rgba(0,0,0,0.2)' : 'var(--s2)',
            color: active ? '#000' : 'var(--mut)',
            fontSize: '11px',
            fontWeight: 700,
            padding: '1px 7px',
            borderRadius: '10px',
          }}>
            {count}
          </span>
        )}
      </button>
    );
  }

  function VideoRow({ video, idx, tipo }: { video: Video; idx: number; tipo: 'sinGuion' | 'conGuion' | 'archivo' }) {
    const canal = getCanalInfo(video.canalId);
    const tieneGuion = !!(video.guion && video.guion.length > 0);
    const isArchivo = tipo === 'archivo';
    const borderColor = isArchivo ? 'rgba(0,255,136,0.15)' : tipo === 'conGuion' ? 'rgba(0,255,136,0.25)' : 'var(--b)';

    return (
      <div style={{background:'var(--s1)',border:`1px solid ${borderColor}`,borderRadius:'10px',padding:'12px 14px',display:'flex',gap:'12px',alignItems:'center',opacity:isArchivo?0.7:1}}>
        <div style={{width:'26px',height:'26px',borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:700,
          background:isArchivo?'rgba(0,255,136,0.1)':tipo==='conGuion'?'rgba(0,255,136,0.15)':'var(--s2)',
          border:`1px solid ${isArchivo?'rgba(0,255,136,0.3)':tipo==='conGuion'?'rgba(0,255,136,0.3)':'var(--b)'}`,
          color:isArchivo||tipo==='conGuion'?'var(--ok)':'var(--mut)'}}>
          {isArchivo ? '✓' : idx + 1}
        </div>

        <img src={video.thumb} alt="" onError={e => (e.currentTarget.style.display='none')}
          style={{width:'90px',height:'50px',borderRadius:'6px',objectFit:'cover',flexShrink:0,background:'var(--s2)',filter:isArchivo?'grayscale(0.4)':'none'}} />

        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:'13px',fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',color:isArchivo?'var(--mut)':'var(--txt)'}}>
            {video.title}
          </div>
          <div style={{display:'flex',gap:'8px',marginTop:'4px',flexWrap:'wrap',alignItems:'center'}}>
            <span style={{fontSize:'11px',color:'var(--mut)'}}>{video.equipo === 'realmadrid' ? '⚽ RM' : '🔵 FCB'}</span>
            <a href={video.url} target="_blank" rel="noopener noreferrer" style={{fontSize:'11px',color:'var(--acc)',textDecoration:'none'}}>· 🔗 Ver</a>
            {canal && (
              <span style={{display:'inline-flex',alignItems:'center',gap:'4px',fontSize:'11px',color:'var(--mut)'}}>
                ·
                {canal.logo ? <img src={canal.logo} alt="" style={{width:'13px',height:'13px',borderRadius:'2px',objectFit:'cover'}} onError={e=>(e.currentTarget.style.display='none')} /> : '📺'}
                {canal.nombre}
              </span>
            )}
            {tieneGuion && <span style={{fontSize:'10px',padding:'1px 6px',borderRadius:'8px',background:'rgba(0,255,136,0.1)',color:'var(--ok)',fontWeight:500}}>✍ Guión</span>}
          </div>
        </div>

        <div style={{display:'flex',gap:'5px',flexShrink:0}}>
          {isArchivo ? (
            <>
              <button onClick={() => nuevoGuionSimilar(video)}
                style={{background:'rgba(232,255,0,0.1)',color:'var(--acc)',border:'1px solid rgba(232,255,0,0.3)',padding:'6px 10px',borderRadius:'7px',fontSize:'11px',fontWeight:600,cursor:'pointer',fontFamily:'DM Sans, sans-serif'}}>
                ♻️
              </button>
              <button onClick={() => setEditingVideo(video)}
                style={{background:'var(--s2)',color:'var(--txt)',border:'1px solid var(--b)',padding:'6px 10px',borderRadius:'7px',fontSize:'11px',cursor:'pointer',fontFamily:'DM Sans, sans-serif'}}>
                📄
              </button>
              <button onClick={() => { if(confirm('¿Eliminar?')) removeVideo(video.id); }}
                style={{background:'transparent',color:'var(--mut)',border:'1px solid var(--b)',padding:'6px 10px',borderRadius:'7px',fontSize:'11px',cursor:'pointer',fontFamily:'DM Sans, sans-serif'}}>
                🗑
              </button>
            </>
          ) : tipo === 'sinGuion' ? (
            <>
              <button onClick={() => setEditingVideo(video)}
                style={{background:'var(--acc)',color:'#000',border:'none',padding:'6px 12px',borderRadius:'7px',fontSize:'11px',fontWeight:600,cursor:'pointer',fontFamily:'DM Sans, sans-serif',whiteSpace:'nowrap'}}>
                📝 Añadir guión
              </button>
              <button onClick={() => { if(confirm('¿Eliminar?')) removeVideo(video.id); }}
                style={{background:'transparent',color:'var(--mut)',border:'1px solid var(--b)',padding:'6px 10px',borderRadius:'7px',fontSize:'11px',cursor:'pointer',fontFamily:'DM Sans, sans-serif'}}>
                🗑
              </button>
            </>
          ) : (
            <>
              <button onClick={() => marcarGrabado(video.id)}
                style={{background:'var(--ok)',color:'#000',border:'none',padding:'6px 12px',borderRadius:'7px',fontSize:'11px',fontWeight:600,cursor:'pointer',fontFamily:'DM Sans, sans-serif',whiteSpace:'nowrap'}}>
                ✓ Grabado
              </button>
              <button onClick={() => setEditingVideo(video)}
                style={{background:'var(--s2)',color:'var(--txt)',border:'1px solid var(--b)',padding:'6px 10px',borderRadius:'7px',fontSize:'11px',cursor:'pointer',fontFamily:'DM Sans, sans-serif'}}>
                📄
              </button>
              <button onClick={() => { if(confirm('¿Eliminar?')) removeVideo(video.id); }}
                style={{background:'transparent',color:'var(--mut)',border:'1px solid var(--b)',padding:'6px 10px',borderRadius:'7px',fontSize:'11px',cursor:'pointer',fontFamily:'DM Sans, sans-serif'}}>
                🗑
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  function renderConGuionAgrupado() {
    const conFecha = conGuion.filter(v => v.fechaPublicacion).sort((a, b) =>
      (a.fechaPublicacion || '').localeCompare(b.fechaPublicacion || '')
    );
    const sinFecha = conGuion.filter(v => !v.fechaPublicacion);
    const grupos: Record<string, Video[]> = {};
    conFecha.forEach(v => { const f = v.fechaPublicacion!; if (!grupos[f]) grupos[f] = []; grupos[f].push(v); });
    const hoyStr = new Date().toISOString().split('T')[0];

    return (
      <>
        {Object.entries(grupos).map(([fecha, vids]) => {
          const [añoF, mesF, diaF] = fecha.split('-');
          const fechaObj = new Date(Number(añoF), Number(mesF) - 1, Number(diaF));
          const esHoy = fecha === hoyStr;
          const esPasado = fechaObj < new Date() && !esHoy;
          const label = esHoy ? '📅 HOY' : fechaObj.toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' });
          return (
            <div key={fecha} style={{marginBottom:'20px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
                <span style={{fontSize:'12px',fontWeight:600,color:esHoy?'#000':esPasado?'var(--red)':'var(--ok)',padding:'4px 12px',background:esHoy?'var(--acc)':esPasado?'rgba(255,68,68,0.15)':'rgba(0,255,136,0.1)',borderRadius:'20px',textTransform:'capitalize'}}>
                  {esPasado?'⚠ ':esHoy?'':'📅 '}{label}
                </span>
                <span style={{fontSize:'11px',color:'var(--mut)'}}>{vids.length} vídeos</span>
                <div style={{flex:1,height:'1px',background:'var(--b)'}}/>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                {vids.map((video, idx) => <VideoRow key={video.id} video={video} idx={idx} tipo="conGuion" />)}
              </div>
            </div>
          );
        })}
        {sinFecha.length > 0 && (
          <div style={{marginBottom:'20px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
              <span style={{fontSize:'12px',fontWeight:600,color:'var(--mut)',padding:'4px 12px',background:'rgba(102,102,102,0.1)',borderRadius:'20px'}}>📋 Sin fecha</span>
              <span style={{fontSize:'11px',color:'var(--mut)'}}>{sinFecha.length} vídeos</span>
              <div style={{flex:1,height:'1px',background:'var(--b)'}}/>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {sinFecha.map((video, idx) => <VideoRow key={video.id} video={video} idx={idx} tipo="conGuion" />)}
            </div>
          </div>
        )}
      </>
    );
  }

  // ═══ VISTA CANALES ═══
  function VistaCanales() {
    return (
      <div>
        {/* Stats globales */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'10px',marginBottom:'20px'}}>
          {[
            { label:'Total vídeos', value: videos.length, color:'var(--txt)' },
            { label:'Sin guión', value: sinGuion.length, color:'var(--acc)' },
            { label:'Listos para grabar', value: conGuion.length, color:'var(--ok)' },
            { label:'Grabados', value: grabados.length, color:'var(--mut)' },
          ].map(s => (
            <div key={s.label} style={{background:'var(--s1)',border:'1px solid var(--b)',borderRadius:'10px',padding:'12px 16px'}}>
              <div style={{fontSize:'22px',fontWeight:700,color:s.color,fontFamily:'Bebas Neue, sans-serif'}}>{s.value}</div>
              <div style={{fontSize:'11px',color:'var(--mut)',marginTop:'2px'}}>{s.label}</div>
            </div>
          ))}
        </div>

        {canales.length === 0 ? (
          <div style={{textAlign:'center',padding:'50px',color:'var(--mut)',border:'1px dashed var(--b)',borderRadius:'12px'}}>
            <p style={{fontSize:'32px',marginBottom:'10px'}}>📺</p>
            <p style={{fontSize:'14px',fontWeight:500,color:'var(--txt)',marginBottom:'6px'}}>No tienes canales configurados</p>
            <Link href="/canales" style={{background:'var(--acc)',color:'#000',padding:'9px 18px',borderRadius:'8px',fontSize:'13px',fontWeight:600,textDecoration:'none',display:'inline-block',marginTop:'8px'}}>
              ➕ Añadir canales
            </Link>
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:'14px'}}>
            {canales.map(canal => {
              const videosCanal = videos.filter(v => v.canalId === canal.id);
              const pendientesCanal = videosCanal.filter(v => v.status !== 'done');
              const grabadosCanal = videosCanal.filter(v => v.status === 'done');
              const sinGuionCanal = pendientesCanal.filter(v => !v.transcripcion);
              const conGuionCanal = pendientesCanal.filter(v => !!v.transcripcion);

              // Canal monitorizados vinculado (mismo equipo)
              const canalesMonitorizadosEquipo = monitorizados.filter(m => m.equipo === canal.equipo);
              const isExpanded = canalExpandido === canal.id;
              const equipoColor = canal.equipo === 'realmadrid' ? '#e8ff00' : '#a50044';
              const pct = videosCanal.length > 0 ? Math.round((grabadosCanal.length / videosCanal.length) * 100) : 0;

              return (
                <div key={canal.id} style={{background:'var(--s1)',border:`1px solid ${isExpanded ? equipoColor : 'var(--b)'}`,borderRadius:'12px',overflow:'hidden',transition:'border-color .2s'}}>

                  {/* Header canal */}
                  <div style={{padding:'14px 16px',display:'flex',gap:'12px',alignItems:'center'}}>
                    <div style={{width:'46px',height:'46px',borderRadius:'10px',background:`${equipoColor}15`,border:`1px solid ${equipoColor}30`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden'}}>
                      {canal.logo
                        ? <img src={canal.logo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>(e.currentTarget.style.display='none')} />
                        : <span style={{fontSize:'20px'}}>{canal.equipo === 'realmadrid' ? '⚽' : '🔵'}</span>
                      }
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:'14px',fontWeight:700,color:'var(--txt)',marginBottom:'2px'}}>{canal.nombre}</div>
                      <div style={{fontSize:'11px',color:equipoColor,marginBottom:'3px'}}>{canal.equipo === 'realmadrid' ? 'Real Madrid' : 'Barcelona'}</div>
                      {canal.urlCanal && (
                        <a href={canal.urlCanal} target="_blank" rel="noopener noreferrer"
                          style={{fontSize:'10px',color:'var(--mut)',textDecoration:'none'}}>
                          🔗 {canal.urlCanal.replace('https://www.youtube.com/','').substring(0,30)}
                        </a>
                      )}
                    </div>
                    <button onClick={() => setCanalExpandido(isExpanded ? null : canal.id)}
                      style={{background:'var(--s2)',color:'var(--txt)',border:'1px solid var(--b)',padding:'5px 10px',borderRadius:'6px',fontSize:'11px',cursor:'pointer',fontFamily:'DM Sans, sans-serif',flexShrink:0}}>
                      {isExpanded ? '▲' : '▼'}
                    </button>
                  </div>

                  {/* Stats canal */}
                  <div style={{padding:'0 16px 12px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px'}}>
                    <div style={{background:'var(--s2)',borderRadius:'7px',padding:'8px',textAlign:'center'}}>
                      <div style={{fontSize:'16px',fontWeight:700,color:'var(--acc)',fontFamily:'Bebas Neue, sans-serif'}}>{sinGuionCanal.length}</div>
                      <div style={{fontSize:'10px',color:'var(--mut)'}}>Sin guión</div>
                    </div>
                    <div style={{background:'var(--s2)',borderRadius:'7px',padding:'8px',textAlign:'center'}}>
                      <div style={{fontSize:'16px',fontWeight:700,color:'var(--ok)',fontFamily:'Bebas Neue, sans-serif'}}>{conGuionCanal.length}</div>
                      <div style={{fontSize:'10px',color:'var(--mut)'}}>Listos</div>
                    </div>
                    <div style={{background:'var(--s2)',borderRadius:'7px',padding:'8px',textAlign:'center'}}>
                      <div style={{fontSize:'16px',fontWeight:700,color:'var(--mut)',fontFamily:'Bebas Neue, sans-serif'}}>{grabadosCanal.length}</div>
                      <div style={{fontSize:'10px',color:'var(--mut)'}}>Grabados</div>
                    </div>
                  </div>

                  {/* Barra progreso */}
                  {videosCanal.length > 0 && (
                    <div style={{padding:'0 16px 10px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                        <span style={{fontSize:'10px',color:'var(--mut)'}}>Progreso</span>
                        <span style={{fontSize:'10px',color:'var(--ok)',fontWeight:600}}>{pct}%</span>
                      </div>
                      <div style={{height:'3px',background:'var(--b)',borderRadius:'2px',overflow:'hidden'}}>
                        <div style={{height:'100%',background:equipoColor,width:`${pct}%`,transition:'width .3s',borderRadius:'2px'}}/>
                      </div>
                    </div>
                  )}

                  {/* Canales monitorizados vinculados */}
                  {canalesMonitorizadosEquipo.length > 0 && (
                    <div style={{padding:'8px 16px',borderTop:'1px solid var(--b)',background:'rgba(0,0,0,0.2)'}}>
                      <p style={{fontSize:'10px',color:'var(--mut)',marginBottom:'5px',fontWeight:600}}>📡 COPIANDO DE:</p>
                      <div style={{display:'flex',flexDirection:'column',gap:'3px'}}>
                        {canalesMonitorizadosEquipo.map(m => (
                          <a key={m.id} href={m.url} target="_blank" rel="noopener noreferrer"
                            style={{fontSize:'11px',color:'var(--acc)',textDecoration:'none',display:'flex',alignItems:'center',gap:'4px'}}>
                            🔗 {m.nombre}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Vídeos expandidos */}
                  {isExpanded && (
                    <div style={{borderTop:'1px solid var(--b)',padding:'12px 16px',maxHeight:'300px',overflowY:'auto'}}>
                      {pendientesCanal.length === 0 ? (
                        <p style={{fontSize:'12px',color:'var(--mut)',textAlign:'center',padding:'16px 0'}}>No hay vídeos pendientes</p>
                      ) : (
                        <div style={{display:'flex',flexDirection:'column',gap:'7px'}}>
                          {pendientesCanal.map(v => (
                            <div key={v.id} style={{display:'flex',gap:'8px',alignItems:'center',background:'var(--s2)',borderRadius:'7px',padding:'7px 10px'}}>
                              <img src={v.thumb} alt="" style={{width:'60px',height:'34px',borderRadius:'4px',objectFit:'cover',flexShrink:0,background:'var(--b)'}}
                                onError={e=>(e.currentTarget.style.display='none')} />
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:'11px',fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{v.title}</div>
                                <div style={{display:'flex',gap:'6px',marginTop:'2px',alignItems:'center'}}>
                                  <span style={{fontSize:'10px',padding:'1px 6px',borderRadius:'8px',fontWeight:500,
                                    background:v.transcripcion?'rgba(0,255,136,0.1)':'rgba(232,255,0,0.1)',
                                    color:v.transcripcion?'var(--ok)':'var(--acc)'}}>
                                    {v.transcripcion ? '✍ Con guión' : '📝 Sin guión'}
                                  </span>
                                </div>
                              </div>
                              <button onClick={() => setEditingVideo(v)}
                                style={{background:'var(--acc)',color:'#000',border:'none',padding:'4px 10px',borderRadius:'6px',fontSize:'10px',fontWeight:600,cursor:'pointer',fontFamily:'DM Sans, sans-serif',flexShrink:0}}>
                                {v.transcripcion ? '▶' : '📝'}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Accesos rápidos */}
        <div style={{marginTop:'24px'}}>
          <p style={{fontSize:'12px',color:'var(--mut)',marginBottom:'10px',fontWeight:600}}>ACCESOS RÁPIDOS</p>
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
            {secciones.map(s => (
              <Link key={s.href} href={s.href}
                style={{textDecoration:'none',background:'var(--s1)',border:'1px solid var(--b)',borderRadius:'8px',padding:'8px 14px',fontSize:'12px',color:'var(--txt)',display:'flex',alignItems:'center',gap:'6px'}}>
                {s.emoji} {s.label}
                <span style={{fontSize:'10px',color:'var(--mut)'}}>{s.stat}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{background:'var(--bg)',minHeight:'100vh',color:'var(--txt)',fontFamily:'DM Sans, sans-serif'}}>

      <header style={{background:'var(--s1)',borderBottom:'1px solid var(--b)',padding:'12px 22px',display:'flex',alignItems:'center',gap:'10px',position:'sticky',top:0,zIndex:100}}>
        <button onClick={() => setVista('menu')}
          style={{fontFamily:'Bebas Neue, sans-serif',fontSize:'20px',letterSpacing:'2px',color:vista==='menu'?'var(--acc)':'var(--txt)',background:'transparent',border:'none',cursor:'pointer',padding:0,flexShrink:0}}>
          ⚽ GUIÓN CREATOR
        </button>

        <div style={{width:'1px',height:'18px',background:'var(--b)',flexShrink:0}}/>

        <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
          <Tab id="canales" label="📺 Mis canales" color="#6366f1" />
          <Tab id="sinGuion" label="📝 Sin guión" count={sinGuion.length} color="var(--acc)" />
          <Tab id="conGuion" label="🎬 Listos" count={conGuion.length} color="var(--ok)" />
        </div>

        <div style={{marginLeft:'auto',display:'flex',gap:'8px',alignItems:'center',flexShrink:0}}>
          <button onClick={() => setShowModal(true)}
            style={{background:'var(--acc)',color:'#000',border:'none',padding:'7px 14px',borderRadius:'8px',fontSize:'13px',fontWeight:700,cursor:'pointer',fontFamily:'DM Sans, sans-serif'}}>
            ➕ Añadir
          </button>
        </div>
      </header>

      <div style={{maxWidth:'1000px',margin:'0 auto',padding:'20px 22px'}}>

        {/* ═══ MENÚ ═══ */}
        {vista === 'menu' && (
          <>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px'}}>
              <div>
                <h2 style={{fontFamily:'Bebas Neue, sans-serif',fontSize:'24px',color:'var(--txt)',letterSpacing:'1px'}}>Panel de control</h2>
                <p style={{fontSize:'13px',color:'var(--mut)',marginTop:'4px'}}>Todas las herramientas</p>
              </div>
              <button onClick={() => setVista('canales')}
                style={{background:'var(--s2)',color:'var(--txt)',border:'1px solid var(--b)',padding:'8px 16px',borderRadius:'8px',fontSize:'13px',cursor:'pointer',fontFamily:'DM Sans, sans-serif'}}>
                ← Volver
              </button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px'}}>
              {secciones.map(s => (
                <Link key={s.href} href={s.href}
                  style={{textDecoration:'none',display:'block',background:'var(--s1)',border:'1px solid var(--b)',borderRadius:'12px',padding:'16px',cursor:'pointer'}}>
                  <div style={{fontSize:'24px',marginBottom:'8px'}}>{s.emoji}</div>
                  <div style={{fontSize:'14px',fontWeight:600,color:'var(--txt)',marginBottom:'4px'}}>{s.label}</div>
                  <div style={{fontSize:'12px',color:'var(--mut)',lineHeight:1.5,marginBottom:'8px'}}>{s.description}</div>
                  <div style={{fontSize:'12px',color:'var(--acc)',fontWeight:500}}>{s.stat} →</div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* ═══ MIS CANALES ═══ */}
        {vista === 'canales' && <VistaCanales />}

        {/* ═══ SIN GUIÓN ═══ */}
        {vista === 'sinGuion' && (
          <>
            <div style={{background:'rgba(232,255,0,0.05)',border:'1px solid rgba(232,255,0,0.2)',borderRadius:'10px',padding:'14px 16px',marginBottom:'16px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:progresoAuto?'12px':'0'}}>
                <span style={{fontSize:'13px',color:'var(--acc)',fontWeight:500}}>📝 {sinGuion.length} vídeos sin transcripción</span>
                <div style={{display:'flex',gap:'8px'}}>
                  {sinGuion.length > 0 && (
                    <button onClick={obtenerTodasTranscripciones} disabled={obteniendo}
                      style={{background:obteniendo?'rgba(232,255,0,0.1)':'var(--acc)',color:obteniendo?'var(--acc)':'#000',border:`1px solid ${obteniendo?'rgba(232,255,0,0.3)':'var(--acc)'}`,padding:'7px 14px',borderRadius:'7px',fontSize:'12px',fontWeight:600,cursor:obteniendo?'wait':'pointer',fontFamily:'DM Sans, sans-serif',whiteSpace:'nowrap',opacity:obteniendo?0.7:1}}>
                      {obteniendo ? '⏳ Obteniendo...' : '⚡ Obtener transcripciones auto'}
                    </button>
                  )}
                  {sinGuion.length > 0 && (
                    <button onClick={() => { if(confirm(`¿Eliminar los ${sinGuion.length} vídeos?`)) sinGuion.forEach(v => removeVideo(v.id)); }}
                      style={{background:'transparent',color:'var(--red)',border:'1px solid rgba(255,68,68,0.3)',padding:'7px 12px',borderRadius:'7px',fontSize:'12px',cursor:'pointer',fontFamily:'DM Sans, sans-serif'}}>
                      🗑 Eliminar todos
                    </button>
                  )}
                </div>
              </div>
              {progresoAuto && (
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px',fontSize:'11px',color:'var(--mut)'}}>
                    <span>Procesando {progresoAuto.actual} de {progresoAuto.total} · <span style={{color:'var(--ok)'}}>✅ {progresoAuto.ok}</span> · <span style={{color:'var(--red)'}}>❌ {progresoAuto.fail}</span></span>
                    <span>{Math.round((progresoAuto.actual/progresoAuto.total)*100)}%</span>
                  </div>
                  <div style={{height:'4px',background:'var(--b)',borderRadius:'2px',overflow:'hidden'}}>
                    <div style={{height:'100%',background:obteniendo?'var(--acc)':progresoAuto.ok>0?'var(--ok)':'var(--red)',width:`${(progresoAuto.actual/progresoAuto.total)*100}%`,transition:'width .3s',borderRadius:'2px'}}/>
                  </div>
                  {!obteniendo && <p style={{fontSize:'11px',color:'var(--mut)',marginTop:'6px'}}>✅ Completado — {progresoAuto.ok} obtenidas, {progresoAuto.fail} sin subtítulos</p>}
                </div>
              )}
            </div>

            {sinGuion.length === 0 ? (
              <div style={{textAlign:'center',padding:'60px 20px',color:'var(--mut)',border:'1px dashed var(--b)',borderRadius:'12px'}}>
                <p style={{fontSize:'36px',marginBottom:'10px'}}>✅</p>
                <p style={{fontSize:'14px',fontWeight:500,color:'var(--txt)',marginBottom:'4px'}}>¡Sin pendientes!</p>
                <Link href="/monitor" style={{background:'var(--s1)',color:'var(--txt)',border:'1px solid var(--b)',padding:'9px 18px',borderRadius:'8px',fontSize:'13px',textDecoration:'none',display:'inline-block',marginTop:'8px'}}>
                  📡 Ver Monitor
                </Link>
              </div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                {sinGuion.map((video, idx) => <VideoRow key={video.id} video={video} idx={idx} tipo="sinGuion" />)}
              </div>
            )}
          </>
        )}

        {/* ═══ CON GUIÓN ═══ */}
        {vista === 'conGuion' && (
          <>
            <div style={{background:'rgba(0,255,136,0.05)',border:'1px solid rgba(0,255,136,0.2)',borderRadius:'10px',padding:'12px 16px',marginBottom:'12px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontSize:'13px',color:'var(--ok)',fontWeight:500}}>🎬 Ordenados por fecha de publicación</span>
              <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                <span style={{fontSize:'12px',color:'var(--mut)'}}>{grabados.length} grabados · {Math.round(grabados.length/(videos.length||1)*100)}%</span>
                {conGuion.length > 0 && (
                  <button onClick={eliminarConGuion}
                    style={{background:'transparent',color:'var(--red)',border:'1px solid rgba(255,68,68,0.3)',padding:'5px 12px',borderRadius:'7px',fontSize:'11px',cursor:'pointer',fontFamily:'DM Sans, sans-serif'}}>
                    🗑 Eliminar todos
                  </button>
                )}
              </div>
            </div>

            <div style={{height:'4px',background:'var(--b)',borderRadius:'2px',overflow:'hidden',marginBottom:'16px'}}>
              <div style={{height:'100%',background:'var(--ok)',width:`${(grabados.length/(videos.length||1))*100}%`,transition:'width .4s',borderRadius:'2px'}}/>
            </div>

            {conGuion.length === 0 ? (
              <div style={{textAlign:'center',padding:'60px 20px',color:'var(--mut)',border:'1px dashed var(--b)',borderRadius:'12px',marginBottom:'24px'}}>
                <p style={{fontSize:'36px',marginBottom:'10px'}}>📝</p>
                <p style={{fontSize:'14px',fontWeight:500,color:'var(--txt)',marginBottom:'4px'}}>No hay guiones generados</p>
                <button onClick={() => setVista('sinGuion')}
                  style={{background:'var(--acc)',color:'#000',border:'none',padding:'9px 18px',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:'DM Sans, sans-serif',marginTop:'8px'}}>
                  📝 Ver sin guión ({sinGuion.length})
                </button>
              </div>
            ) : (
              <div style={{marginBottom:'24px'}}>{renderConGuionAgrupado()}</div>
            )}

            {grabados.length > 0 && (
              <>
                <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'12px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'10px',flex:1,cursor:'pointer'}} onClick={() => setShowArchivo(!showArchivo)}>
                    <h2 style={{fontFamily:'Bebas Neue, sans-serif',fontSize:'16px',color:'var(--mut)',letterSpacing:'1px'}}>📦 ARCHIVO</h2>
                    <span style={{fontSize:'12px',color:'var(--mut)',background:'var(--s2)',border:'1px solid var(--b)',padding:'2px 9px',borderRadius:'20px'}}>{grabados.length}</span>
                    <span style={{fontSize:'11px',color:'var(--mut)'}}>{showArchivo ? '▲ Ocultar' : '▼ Ver grabados'}</span>
                  </div>
                  <button onClick={eliminarGrabados}
                    style={{background:'transparent',color:'var(--red)',border:'1px solid rgba(255,68,68,0.3)',padding:'5px 12px',borderRadius:'7px',fontSize:'11px',cursor:'pointer',fontFamily:'DM Sans, sans-serif'}}>
                    🗑 Vaciar archivo
                  </button>
                </div>
                {showArchivo && (
                  <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                    {grabados.map((video, idx) => <VideoRow key={video.id} video={video} idx={idx} tipo="archivo" />)}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {showModal && (
        <AddVideoModal
          onAdd={(video) => { addVideo(video); if (canales.length > 0) asignarCanalesAleatorio(canales); setShowModal(false); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
