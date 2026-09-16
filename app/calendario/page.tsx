'use client';

import { useState } from 'react';
import { useQueueStore } from '@/store/useQueueStore';
import { useCanalesStore } from '@/store/useCanalesStore';
import { Video } from '@/types';

const VIDEOS_POR_DIA = 3;

function getDiasDelMes(año: number, mes: number) {
  return new Date(año, mes + 1, 0).getDate();
}

function getPrimerDia(año: number, mes: number) {
  const dia = new Date(año, mes, 1).getDay();
  return dia === 0 ? 6 : dia - 1;
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS_SEMANA = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

export default function CalendarioPage() {
  const { videos, updateVideo } = useQueueStore();
  const { canales } = useCanalesStore();

  // Usar useState con función para evitar hydration mismatch
  const [mes, setMes] = useState(() => new Date().getMonth());
  const [año, setAño] = useState(() => new Date().getFullYear());
  const [diaHoy] = useState(() => new Date().getDate());
  const [mesHoy] = useState(() => new Date().getMonth());
  const [añoHoy] = useState(() => new Date().getFullYear());
  const [diaSeleccionado, setDiaSeleccionado] = useState<number | null>(null);
  const [canalFiltro, setCanalFiltro] = useState<string>('todos');

  const diasMes = getDiasDelMes(año, mes);
  const primerDia = getPrimerDia(año, mes);

  function getVideosDia(dia: number): Video[] {
    const fecha = `${año}-${String(mes + 1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
    return videos.filter(v => v.fechaPublicacion === fecha);
  }

  function asignarFecha(videoId: string, dia: number) {
    const fecha = `${año}-${String(mes + 1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
    updateVideo(videoId, { fechaPublicacion: fecha });
  }

  function desasignarFecha(videoId: string) {
    updateVideo(videoId, { fechaPublicacion: undefined });
  }

  function asignarAutomatico() {
    const sinFecha = videos.filter(v => !v.fechaPublicacion && v.status !== 'done');
    let diaActual = new Date().getDate();
    let mesActual = new Date().getMonth();
    let añoActual = new Date().getFullYear();

    sinFecha.forEach((video, idx) => {
      const slotDelDia = idx % VIDEOS_POR_DIA;
      if (slotDelDia === 0 && idx > 0) {
        diaActual++;
        const maxDias = getDiasDelMes(añoActual, mesActual);
        if (diaActual > maxDias) {
          diaActual = 1;
          mesActual++;
          if (mesActual > 11) { mesActual = 0; añoActual++; }
        }
      }
      const fecha = `${añoActual}-${String(mesActual + 1).padStart(2,'0')}-${String(diaActual).padStart(2,'0')}`;
      updateVideo(video.id, { fechaPublicacion: fecha });
    });
  }

  function limpiarMes() {
    const prefijo = `${año}-${String(mes + 1).padStart(2,'0')}`;
    videos.forEach(v => {
      if (v.fechaPublicacion?.startsWith(prefijo)) {
        updateVideo(v.id, { fechaPublicacion: undefined });
      }
    });
  }

  const videosDisponibles = videos.filter(v =>
    !v.fechaPublicacion &&
    v.status !== 'done' &&
    (canalFiltro === 'todos' || v.canalId === canalFiltro)
  );

  const totalAsignados = videos.filter(v => {
    const f = v.fechaPublicacion;
    return f && f.startsWith(`${año}-${String(mes + 1).padStart(2,'0')}`);
  }).length;

  function getCanalInfo(canalId: string | null) {
    if (!canalId) return null;
    return canales.find(c => c.id === canalId) || null;
  }

  return (
    <div style={{background:'var(--bg)',minHeight:'100vh',color:'var(--txt)',fontFamily:'DM Sans, sans-serif'}}>
      <header style={{background:'var(--s1)',borderBottom:'1px solid var(--b)',padding:'13px 22px',display:'flex',alignItems:'center',gap:'14px',position:'sticky',top:0,zIndex:100}}>
        <h1 style={{fontFamily:'Bebas Neue, sans-serif',fontSize:'22px',letterSpacing:'2px',color:'var(--acc)'}}>
          ⚽ GUIÓN CREATOR
        </h1>
        <span style={{fontSize:'12px',color:'var(--mut)'}}>Calendario de publicación</span>
        <div style={{marginLeft:'auto',display:'flex',gap:'8px'}}>
          <button
            onClick={asignarAutomatico}
            style={{background:'var(--ok)',color:'#000',border:'none',padding:'8px 14px',borderRadius:'8px',fontSize:'12px',fontWeight:600,cursor:'pointer',fontFamily:'DM Sans, sans-serif'}}
          >
            ⚡ Asignar auto (3/día)
          </button>
          <button
            onClick={limpiarMes}
            style={{background:'transparent',color:'var(--mut)',border:'1px solid var(--b)',padding:'8px 14px',borderRadius:'8px',fontSize:'12px',cursor:'pointer',fontFamily:'DM Sans, sans-serif'}}
          >
            × Limpiar mes
          </button>
        </div>
      </header>

      <div style={{maxWidth:'1200px',margin:'0 auto',padding:'20px 22px',display:'grid',gridTemplateColumns:'1fr 320px',gap:'20px'}}>

        {/* CALENDARIO */}
        <div>
          {/* Navegación mes */}
          <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'16px'}}>
            <button
              onClick={() => { if(mes===0){setMes(11);setAño(y=>y-1);}else setMes(m=>m-1); }}
              style={{background:'var(--s2)',color:'var(--txt)',border:'1px solid var(--b)',padding:'7px 12px',borderRadius:'7px',fontSize:'14px',cursor:'pointer'}}
            >
              ‹
            </button>
            <h2 style={{fontFamily:'Bebas Neue, sans-serif',fontSize:'22px',color:'var(--txt)',letterSpacing:'1px',flex:1,textAlign:'center'}}>
              {MESES[mes]} {año}
            </h2>
            <button
              onClick={() => { if(mes===11){setMes(0);setAño(y=>y+1);}else setMes(m=>m+1); }}
              style={{background:'var(--s2)',color:'var(--txt)',border:'1px solid var(--b)',padding:'7px 12px',borderRadius:'7px',fontSize:'14px',cursor:'pointer'}}
            >
              ›
            </button>
          </div>

          {/* Stats mes */}
          <div style={{display:'flex',gap:'10px',marginBottom:'14px'}}>
            <div style={{background:'var(--s1)',border:'1px solid var(--b)',borderRadius:'8px',padding:'8px 14px',fontSize:'12px',color:'var(--acc)'}}>
              {totalAsignados} vídeos asignados
            </div>
            <div style={{background:'var(--s1)',border:'1px solid var(--b)',borderRadius:'8px',padding:'8px 14px',fontSize:'12px',color:'var(--red)'}}>
              {videosDisponibles.length} sin asignar
            </div>
          </div>

          {/* Cabecera días semana */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'4px',marginBottom:'4px'}}>
            {DIAS_SEMANA.map(d => (
              <div key={d} style={{textAlign:'center',fontSize:'11px',color:'var(--mut)',fontWeight:600,padding:'6px 0'}}>
                {d}
              </div>
            ))}
          </div>

          {/* Grid días */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'4px'}}>
            {Array.from({length: primerDia}).map((_, i) => (
              <div key={`empty-${i}`} style={{minHeight:'90px'}} />
            ))}

            {Array.from({length: diasMes}).map((_, i) => {
              const dia = i + 1;
              const videosDia = getVideosDia(dia);
              const esHoy = dia === diaHoy && mes === mesHoy && año === añoHoy;
              const seleccionado = diaSeleccionado === dia;
              const tieneVideos = videosDia.length > 0;
              const todosGrabados = tieneVideos && videosDia.every(v => v.status === 'done');
              const objetivoCumplido = videosDia.length >= VIDEOS_POR_DIA;

              return (
                <div
                  key={dia}
                  onClick={() => setDiaSeleccionado(seleccionado ? null : dia)}
                  style={{
                    minHeight:'90px',
                    background: seleccionado ? 'rgba(232,255,0,0.08)' : 'var(--s1)',
                    border: `1px solid ${esHoy ? 'var(--acc)' : seleccionado ? 'var(--acc)' : todosGrabados ? 'rgba(0,255,136,0.4)' : tieneVideos ? 'rgba(0,255,136,0.2)' : 'var(--b)'}`,
                    borderRadius:'8px',
                    padding:'6px',
                    cursor:'pointer',
                    transition:'all .2s',
                    position:'relative',
                  }}
                >
                  <div style={{
                    width:'22px',height:'22px',borderRadius:'50%',
                    background: esHoy ? 'var(--acc)' : 'transparent',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:'12px',fontWeight:esHoy?700:500,
                    color: esHoy ? '#000' : 'var(--txt)',
                    marginBottom:'4px',
                  }}>
                    {dia}
                  </div>

                  <div style={{display:'flex',flexDirection:'column',gap:'2px'}}>
                    {videosDia.slice(0,4).map(v => {
                      const canal = getCanalInfo(v.canalId);
                      const grabado = v.status === 'done';
                      const bgColor = grabado ? 'rgba(0,255,136,0.1)' : v.equipo === 'realmadrid' ? 'rgba(232,255,0,0.15)' : 'rgba(165,0,68,0.2)';
                      const txtColor = grabado ? 'var(--ok)' : v.equipo === 'realmadrid' ? 'var(--acc)' : '#ff88aa';

                      return (
                        <div key={v.id} style={{
                          background: bgColor,
                          borderRadius:'3px',
                          padding:'1px 4px',
                          fontSize:'9px',
                          color: txtColor,
                          whiteSpace:'nowrap',
                          overflow:'hidden',
                          textOverflow:'ellipsis',
                          display:'flex',
                          alignItems:'center',
                          gap:'3px',
                          textDecoration: grabado ? 'line-through' : 'none',
                          opacity: grabado ? 0.7 : 1,
                        }}>
                          {grabado ? '✅' : v.equipo === 'realmadrid' ? '⚽' : '🔵'}
                          {canal ? canal.nombre.substring(0,8) : v.title.substring(0,10)}
                        </div>
                      );
                    })}
                    {videosDia.length > 4 && (
                      <div style={{fontSize:'9px',color:'var(--mut)',paddingLeft:'4px'}}>+{videosDia.length - 4} más</div>
                    )}
                  </div>

                  {tieneVideos && (
                    <div style={{
                      position:'absolute',top:'4px',right:'4px',
                      width:'6px',height:'6px',borderRadius:'50%',
                      background: todosGrabados ? 'var(--ok)' : objetivoCumplido ? 'var(--acc)' : 'rgba(232,255,0,0.4)',
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* PANEL LATERAL */}
        <div>
          {diaSeleccionado && (
            <div style={{background:'var(--s1)',border:'1px solid var(--acc)',borderRadius:'12px',padding:'16px',marginBottom:'16px'}}>
              <h3 style={{fontFamily:'Bebas Neue, sans-serif',fontSize:'16px',color:'var(--acc)',letterSpacing:'1px',marginBottom:'12px'}}>
                📅 {diaSeleccionado} DE {MESES[mes].toUpperCase()}
              </h3>

              {getVideosDia(diaSeleccionado).length === 0 ? (
                <p style={{fontSize:'12px',color:'var(--mut)',marginBottom:'10px'}}>No hay vídeos asignados</p>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:'6px',marginBottom:'12px'}}>
                  {getVideosDia(diaSeleccionado).map(v => {
                    const canal = getCanalInfo(v.canalId);
                    const grabado = v.status === 'done';
                    return (
                      <div key={v.id} style={{background:'var(--s2)',borderRadius:'7px',padding:'8px 10px',display:'flex',gap:'8px',alignItems:'center',opacity:grabado?0.7:1}}>
                        <img
                          src={v.thumb} alt=""
                          style={{width:'50px',height:'28px',borderRadius:'4px',objectFit:'cover',flexShrink:0,background:'var(--b)',filter:grabado?'grayscale(0.5)':'none'}}
                          onError={e=>(e.currentTarget.style.display='none')}
                        />
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:'11px',fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',textDecoration:grabado?'line-through':'none',color:grabado?'var(--ok)':'var(--txt)'}}>
                            {grabado ? '✅ ' : ''}{v.title}
                          </div>
                          <div style={{fontSize:'10px',color:'var(--mut)',marginTop:'1px'}}>
                            {v.equipo === 'realmadrid' ? '⚽' : '🔵'} {canal?.nombre || 'Sin canal'}
                          </div>
                        </div>
                        {!grabado && (
                          <button
                            onClick={() => desasignarFecha(v.id)}
                            style={{background:'transparent',color:'var(--mut)',border:'none',fontSize:'14px',cursor:'pointer',flexShrink:0}}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <p style={{fontSize:'11px',color:'var(--mut)',marginBottom:'8px'}}>Añadir vídeo a este día:</p>
              <div style={{display:'flex',flexDirection:'column',gap:'5px',maxHeight:'200px',overflowY:'auto'}}>
                {videosDisponibles.slice(0,20).map(v => (
                  <button
                    key={v.id}
                    onClick={() => asignarFecha(v.id, diaSeleccionado)}
                    style={{background:'var(--s2)',color:'var(--txt)',border:'1px solid var(--b)',borderRadius:'6px',padding:'6px 8px',fontSize:'11px',cursor:'pointer',fontFamily:'DM Sans, sans-serif',textAlign:'left',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}
                  >
                    {v.equipo === 'realmadrid' ? '⚽' : '🔵'} {v.title.substring(0,35)}
                  </button>
                ))}
                {videosDisponibles.length === 0 && (
                  <p style={{fontSize:'11px',color:'var(--mut)'}}>No hay vídeos disponibles</p>
                )}
              </div>
            </div>
          )}

          {/* Filtro canal */}
          <div style={{background:'var(--s1)',border:'1px solid var(--b)',borderRadius:'12px',padding:'14px',marginBottom:'12px'}}>
            <h3 style={{fontFamily:'Bebas Neue, sans-serif',fontSize:'14px',color:'var(--txt)',letterSpacing:'1px',marginBottom:'10px'}}>
              FILTRAR POR CANAL
            </h3>
            <div style={{display:'flex',flexDirection:'column',gap:'5px'}}>
              <button
                onClick={() => setCanalFiltro('todos')}
                style={{background:canalFiltro==='todos'?'var(--acc)':'var(--s2)',color:canalFiltro==='todos'?'#000':'var(--txt)',border:'1px solid var(--b)',borderRadius:'6px',padding:'7px 10px',fontSize:'12px',cursor:'pointer',fontFamily:'DM Sans, sans-serif',textAlign:'left'}}
              >
                📺 Todos los canales
              </button>
              {canales.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCanalFiltro(c.id)}
                  style={{background:canalFiltro===c.id?'var(--acc)':'var(--s2)',color:canalFiltro===c.id?'#000':'var(--txt)',border:'1px solid var(--b)',borderRadius:'6px',padding:'7px 10px',fontSize:'12px',cursor:'pointer',fontFamily:'DM Sans, sans-serif',textAlign:'left',display:'flex',alignItems:'center',gap:'6px'}}
                >
                  {c.logo && (
                    <img src={c.logo} alt="" style={{width:'16px',height:'16px',borderRadius:'3px',objectFit:'cover'}}
                      onError={e=>(e.currentTarget.style.display='none')} />
                  )}
                  {c.equipo === 'realmadrid' ? '⚽' : '🔵'} {c.nombre}
                </button>
              ))}
            </div>
          </div>

          {/* Leyenda */}
          <div style={{background:'var(--s1)',border:'1px solid var(--b)',borderRadius:'12px',padding:'14px'}}>
            <h3 style={{fontFamily:'Bebas Neue, sans-serif',fontSize:'14px',color:'var(--txt)',letterSpacing:'1px',marginBottom:'10px'}}>
              LEYENDA
            </h3>
            <div style={{display:'flex',flexDirection:'column',gap:'6px',fontSize:'11px',color:'var(--mut)'}}>
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'var(--acc)',flexShrink:0}}/>
                Hoy
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'var(--ok)',flexShrink:0}}/>
                Todos grabados ✅
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'var(--acc)',flexShrink:0}}/>
                3+ vídeos asignados
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'rgba(232,255,0,0.4)',flexShrink:0}}/>
                Menos de 3 vídeos
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <div style={{width:'16px',height:'8px',borderRadius:'2px',background:'rgba(232,255,0,0.15)',flexShrink:0}}/>
                Real Madrid
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <div style={{width:'16px',height:'8px',borderRadius:'2px',background:'rgba(165,0,68,0.2)',flexShrink:0}}/>
                Barcelona
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
