'use client';

import { useState, useRef } from 'react';
import { useQueueStore } from '@/store/useQueueStore';
import { useCanalesStore } from '@/store/useCanalesStore';
import { Video } from '@/types';
import Editor from '@/components/Editor';

const MAX = 6000;

function cleanText(t: string): string {
  return t.replace(/\*\*(.*?)\*\*/g,'$1').replace(/\*(.*?)\*/g,'$1').replace(/#{1,6}\s*/g,'').replace(/_{2}(.*?)_{2}/g,'$1').trim();
}

function trunc(t: string, n: number): string {
  if (t.length <= n) return t;
  const c = t.lastIndexOf(' ', n);
  return t.substring(0, c > 0 ? c : n);
}

function parseParts(t: string): string[] {
  const p = ['','',''];
  const rx = /\[PARTE\s*(\d)\]([\s\S]*?)(?=\[PARTE\s*\d\]|$)/gi;
  let m;
  while ((m = rx.exec(t)) !== null) { const i = parseInt(m[1])-1; if (i>=0&&i<3) p[i]=m[2].trim(); }
  if (!p[0]) { const n=Math.floor(t.length/3); p[0]=t.substring(0,n); p[1]=t.substring(n,n*2); p[2]=t.substring(n*2); }
  return p;
}

async function callGroq(prompt: string): Promise<string> {
  while (true) {
    const res = await fetch('/api/groq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: trunc(prompt, 12000) }),
    });
    if (res.status === 429) { await new Promise(r => setTimeout(r, 62000)); continue; }
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error en Groq'); }
    return (await res.json()).text;
  }
}

async function generarGuionCompleto(transcripcion: string): Promise<string[]> {
  const exp = await callGroq('Dame este texto muchísimo más largo y sin marca de tiempo. Muy narrativo y apasionado. En español:\n\n' + trunc(transcripcion, MAX));
  const div = await callGroq('Divídeme en exactamente 3 partes. Devuelve SOLO:\n[PARTE 1]\n(texto)\n[PARTE 2]\n(texto)\n[PARTE 3]\n(texto)\n\nTexto:\n\n' + trunc(exp, MAX));
  const pts = parseParts(div).map(cleanText);
  const final: string[] = [];
  for (const pt of pts) {
    final.push(cleanText(await callGroq('Dame este texto muchísimo más largo. Mínimo 600 palabras. Español, estilo documental deportivo apasionado:\n\n' + trunc(pt, MAX))));
  }
  return final;
}

export default function DashboardPage() {
  const { videos, updateVideo, asignarCanalesAleatorio } = useQueueStore();
  const { canales } = useCanalesStore();
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [vistaCanal, setVistaCanal] = useState<string | null>(null);
  const [generandoTodos, setGenerandoTodos] = useState(false);
  const [batchStatus, setBatchStatus] = useState('');
  const [batchPct, setBatchPct] = useState(0);
  const [batchDone, setBatchDone] = useState(0);
  const stopRef = useRef(false);

  if (editingVideo) {
    return <Editor video={editingVideo} onBack={() => setEditingVideo(null)} onDone={() => setEditingVideo(null)} />;
  }

  const totalPendientes = videos.filter(v => v.status === 'pending').length;
  const totalCompletados = videos.filter(v => v.status === 'done').length;
  const sinAsignar = videos.filter(v => !v.canalId).length;
  const listoParaGenerar = videos.filter(v => v.status === 'pending' && v.transcripcion).length;

  function getVideosCanal(canalId: string) {
    return videos.filter(v => v.canalId === canalId);
  }

  function reasignar(videoId: string, canalId: string) {
    updateVideo(videoId, { canalId });
  }

  async function generarTodos() {
    const pendientes = videos.filter(v => v.status === 'pending' && v.transcripcion);
    if (pendientes.length === 0) return;
    setGenerandoTodos(true);
    stopRef.current = false;
    setBatchDone(0);
    setBatchPct(0);

    for (let i = 0; i < pendientes.length; i++) {
      if (stopRef.current) break;
      const v = pendientes[i];
      setBatchStatus(`Generando guión ${i+1} de ${pendientes.length}: "${v.title.substring(0,40)}..."`);
      setBatchPct(Math.round((i / pendientes.length) * 100));
      updateVideo(v.id, { status: 'processing' });
      try {
        const guion = await generarGuionCompleto(v.transcripcion);
        updateVideo(v.id, { guion, status: 'done' });
        setBatchDone(i+1);
      } catch (e: any) {
        updateVideo(v.id, { status: 'pending' });
        setBatchStatus(`Error en "${v.title.substring(0,30)}": ${e.message}`);
      }
    }

    setBatchPct(100);
    setBatchStatus(`✅ ${batchDone} guiones generados`);
    setGenerandoTodos(false);
  }

  const equipoColor = (equipo: string) => equipo === 'realmadrid' ? '#e8ff00' : '#a50044';
  const equipoLabel = (equipo: string) => equipo === 'realmadrid' ? 'Real Madrid' : 'Barcelona';
  const equipoEmoji = (equipo: string) => equipo === 'realmadrid' ? '⚽' : '🔵';

  return (
    <div style={{background:'var(--bg)',minHeight:'100vh',color:'var(--txt)',fontFamily:'DM Sans, sans-serif'}}>
      <header style={{background:'var(--s1)',borderBottom:'1px solid var(--b)',padding:'15px 26px',display:'flex',alignItems:'center',gap:'14px',position:'sticky',top:0,zIndex:100}}>
        <h1 style={{fontFamily:'Bebas Neue, sans-serif',fontSize:'25px',letterSpacing:'2px',color:'var(--acc)'}}>⚽ GUIÓN CREATOR</h1>
        <span style={{fontSize:'12px',color:'var(--mut)'}}>Dashboard</span>
      </header>

      <div style={{maxWidth:'1100px',margin:'0 auto',padding:'26px 22px'}}>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'20px'}}>
          {[
            { label:'Total vídeos', value: videos.length, color:'var(--txt)' },
            { label:'Pendientes', value: totalPendientes, color:'var(--acc)' },
            { label:'Listos para generar', value: listoParaGenerar, color:'var(--ok)' },
            { label:'Completados', value: totalCompletados, color:'#00ff88' },
          ].map(s => (
            <div key={s.label} style={{background:'var(--s1)',border:'1px solid var(--b)',borderRadius:'10px',padding:'16px'}}>
              <div style={{fontSize:'24px',fontWeight:700,color:s.color,fontFamily:'Bebas Neue, sans-serif'}}>{s.value}</div>
              <div style={{fontSize:'12px',color:'var(--mut)',marginTop:'2px'}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* BOTÓN GENERAR TODOS */}
        {listoParaGenerar > 0 && (
          <div style={{background:'var(--s1)',border:`1px solid ${generandoTodos ? 'var(--acc)' : 'var(--ok)'}`,borderRadius:'12px',padding:'18px 20px',marginBottom:'20px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'14px',flexWrap:'wrap'}}>
              <div style={{flex:1}}>
                <p style={{fontSize:'14px',fontWeight:600,color:'var(--ok)'}}>
                  {generandoTodos ? '⚙ Generando guiones...' : `🚀 ${listoParaGenerar} vídeos listos para generar`}
                </p>
                <p style={{fontSize:'12px',color:'var(--mut)',marginTop:'3px'}}>
                  {generandoTodos ? batchStatus : 'Todos tienen transcripción — genera todos los guiones de una vez'}
                </p>
              </div>
              {generandoTodos ? (
                <button onClick={() => stopRef.current = true}
                  style={{background:'var(--red)',color:'#fff',border:'none',padding:'10px 18px',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:'DM Sans, sans-serif',whiteSpace:'nowrap'}}>
                  ⏹ Detener
                </button>
              ) : (
                <button onClick={generarTodos}
                  style={{background:'var(--ok)',color:'#000',border:'none',padding:'10px 20px',borderRadius:'8px',fontSize:'14px',fontWeight:700,cursor:'pointer',fontFamily:'DM Sans, sans-serif',whiteSpace:'nowrap'}}>
                  ▶▶ GENERAR TODOS ({listoParaGenerar})
                </button>
              )}
            </div>
            {generandoTodos && (
              <div style={{marginTop:'12px'}}>
                <div style={{height:'4px',background:'var(--b)',borderRadius:'2px',overflow:'hidden'}}>
                  <div style={{height:'100%',background:'var(--ok)',width:`${batchPct}%`,transition:'width .5s',borderRadius:'2px'}}/>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',marginTop:'5px',fontSize:'11px',color:'var(--mut)'}}>
                  <span>{batchDone} completados</span>
                  <span>{batchPct}%</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Asignar canales */}
        {sinAsignar > 0 && canales.length > 0 && (
          <div style={{background:'var(--s1)',border:'1px solid var(--acc)',borderRadius:'10px',padding:'14px 18px',marginBottom:'20px',display:'flex',alignItems:'center',gap:'14px'}}>
            <div style={{flex:1}}>
              <p style={{fontSize:'13px',fontWeight:500}}>Hay <strong style={{color:'var(--acc)'}}>{sinAsignar} vídeos</strong> sin canal asignado</p>
            </div>
            <button onClick={() => asignarCanalesAleatorio(canales)}
              style={{background:'var(--acc)',color:'#000',border:'none',padding:'10px 18px',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:'DM Sans, sans-serif',whiteSpace:'nowrap'}}>
              🎲 Asignar aleatoriamente
            </button>
          </div>
        )}

        {canales.length === 0 ? (
          <div style={{textAlign:'center',padding:'60px',color:'var(--mut)',border:'1px dashed var(--b)',borderRadius:'12px'}}>
            <p style={{fontSize:'36px',marginBottom:'12px'}}>📺</p>
            <p style={{fontSize:'15px',fontWeight:500,color:'var(--txt)',marginBottom:'6px'}}>No hay canales configurados</p>
            <p style={{fontSize:'13px'}}>Ve a Mis Canales para añadir tus canales de YouTube</p>
          </div>
        ) : (
          ['realmadrid','barcelona'].map(equipo => {
            const canalesEquipo = canales.filter(c => c.equipo === equipo);
            if (canalesEquipo.length === 0) return null;
            return (
              <div key={equipo} style={{marginBottom:'32px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'16px'}}>
                  <span style={{fontSize:'13px',fontWeight:700,color:equipoColor(equipo),padding:'4px 12px',background:`${equipoColor(equipo)}15`,borderRadius:'20px'}}>
                    {equipoEmoji(equipo)} {equipoLabel(equipo).toUpperCase()}
                  </span>
                  <div style={{height:'1px',flex:1,background:'var(--b)'}}/>
                </div>

                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:'14px'}}>
                  {canalesEquipo.map(canal => {
                    const vids = getVideosCanal(canal.id);
                    const pend = vids.filter(v => v.status === 'pending').length;
                    const done = vids.filter(v => v.status === 'done').length;
                    const isExpanded = vistaCanal === canal.id;

                    return (
                      <div key={canal.id} style={{background:'var(--s1)',border:`1px solid ${isExpanded ? equipoColor(equipo) : 'var(--b)'}`,borderRadius:'12px',overflow:'hidden',transition:'border-color .2s'}}>
                        <div style={{padding:'14px 16px',display:'flex',alignItems:'center',gap:'12px'}}>
                          <div style={{width:'36px',height:'36px',borderRadius:'8px',background:`${equipoColor(equipo)}20`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',flexShrink:0}}>
                            {equipoEmoji(equipo)}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:'13px',fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{canal.nombre}</div>
                            <div style={{fontSize:'11px',color:'var(--mut)',marginTop:'2px'}}>{vids.length} vídeos · {pend} pendientes · {done} completados</div>
                          </div>
                          <button onClick={() => setVistaCanal(isExpanded ? null : canal.id)}
                            style={{background:'var(--s2)',color:'var(--txt)',border:'1px solid var(--b)',padding:'5px 10px',borderRadius:'6px',fontSize:'11px',cursor:'pointer',fontFamily:'DM Sans, sans-serif',flexShrink:0}}>
                            {isExpanded ? '▲' : '▼'}
                          </button>
                        </div>

                        {vids.length > 0 && (
                          <div style={{height:'3px',background:'var(--b)',margin:'0 16px'}}>
                            <div style={{height:'100%',background:equipoColor(equipo),width:`${(done/vids.length)*100}%`,transition:'width .3s',borderRadius:'2px'}}/>
                          </div>
                        )}

                        {isExpanded && (
                          <div style={{padding:'12px 16px',borderTop:'1px solid var(--b)',maxHeight:'400px',overflowY:'auto'}}>
                            {vids.length === 0 ? (
                              <p style={{fontSize:'12px',color:'var(--mut)',textAlign:'center',padding:'20px 0'}}>No hay vídeos asignados</p>
                            ) : (
                              <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                                {vids.map(v => (
                                  <div key={v.id} style={{display:'flex',gap:'10px',alignItems:'center',background:'var(--s2)',borderRadius:'8px',padding:'8px'}}>
                                    <img src={v.thumb} alt="" onError={e=>(e.currentTarget.style.display='none')}
                                      style={{width:'64px',height:'36px',borderRadius:'4px',objectFit:'cover',flexShrink:0,background:'var(--b)'}} />
                                    <div style={{flex:1,minWidth:0}}>
                                      <div style={{fontSize:'11px',fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{v.title}</div>
                                      <span style={{fontSize:'10px',padding:'1px 6px',borderRadius:'8px',fontWeight:500,
                                        background: v.status==='done'?'rgba(0,255,136,.15)':v.transcripcion?'rgba(232,255,0,.15)':'rgba(102,102,102,.2)',
                                        color: v.status==='done'?'var(--ok)':v.transcripcion?'var(--acc)':'var(--mut)'}}>
                                        {v.status==='done'?'✅ Hecho':v.transcripcion?'⏳ Listo':'📝 Sin texto'}
                                      </span>
                                    </div>
                                    <div style={{display:'flex',gap:'4px',flexShrink:0}}>
                                      <button onClick={() => setEditingVideo(v)}
                                        style={{background:'var(--acc)',color:'#000',border:'none',padding:'4px 8px',borderRadius:'5px',fontSize:'10px',cursor:'pointer',fontFamily:'DM Sans, sans-serif'}}>
                                        {v.status==='done'?'Ver':'▶'}
                                      </button>
                                      <select value={v.canalId||''} onChange={e => reasignar(v.id, e.target.value)}
                                        style={{background:'var(--s1)',color:'var(--mut)',border:'1px solid var(--b)',padding:'4px 6px',borderRadius:'5px',fontSize:'10px',cursor:'pointer',fontFamily:'DM Sans, sans-serif'}}>
                                        {canales.filter(c=>c.equipo===v.equipo).map(c=>(
                                          <option key={c.id} value={c.id}>{c.nombre}</option>
                                        ))}
                                      </select>
                                    </div>
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
              </div>
            );
          })
        )}

        {sinAsignar > 0 && (
          <div style={{marginTop:'24px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'12px'}}>
              <div style={{height:'1px',flex:1,background:'var(--b)'}}/>
              <span style={{fontSize:'12px',fontWeight:600,color:'var(--red)',padding:'3px 10px',background:'rgba(255,68,68,0.1)',borderRadius:'20px'}}>⚠ SIN CANAL ({sinAsignar})</span>
              <div style={{height:'1px',flex:1,background:'var(--b)'}}/>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {videos.filter(v=>!v.canalId).map(v=>(
                <div key={v.id} style={{background:'var(--s1)',border:'1px solid var(--red)',borderRadius:'8px',padding:'10px 14px',display:'flex',gap:'10px',alignItems:'center'}}>
                  <img src={v.thumb} alt="" style={{width:'80px',height:'45px',borderRadius:'5px',objectFit:'cover',background:'var(--s2)',flexShrink:0}} />
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'12px',fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{v.title}</div>
                    <div style={{fontSize:'11px',color:'var(--mut)',marginTop:'2px'}}>{equipoEmoji(v.equipo)} {equipoLabel(v.equipo)}</div>
                  </div>
                  <select onChange={e => reasignar(v.id, e.target.value)} defaultValue=""
                    style={{background:'var(--s2)',color:'var(--txt)',border:'1px solid var(--b)',padding:'6px 10px',borderRadius:'7px',fontSize:'12px',cursor:'pointer',fontFamily:'DM Sans, sans-serif'}}>
                    <option value="" disabled>Asignar canal...</option>
                    {canales.filter(c=>c.equipo===v.equipo).map(c=>(
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
