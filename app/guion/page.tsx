'use client';

import { useState } from 'react';
import { useQueueStore } from '@/store/useQueueStore';
import { useCanalesStore } from '@/store/useCanalesStore';
import { Video } from '@/types';
import AddVideoModal from '@/components/AddVideoModal';
import Editor from '@/components/Editor';

function QueueCard({ video, onEdit, onRemove }: { video: Video; onEdit: (v: Video) => void; onRemove: (id: string) => void }) {
  const borderColor = video.status === 'done' ? 'var(--ok)' : video.status === 'processing' ? 'var(--acc)' : 'var(--b)';
  const badgeText = video.status === 'pending' ? (video.transcripcion ? '⏳ Listo para generar' : '📝 Sin transcripción') : video.status === 'done' ? '✅ Completado' : '🔄 Procesando';
  const badgeBg = video.status === 'pending' ? (video.transcripcion ? 'rgba(232,255,0,.15)' : 'rgba(102,102,102,.2)') : video.status === 'done' ? 'rgba(0,255,136,.15)' : 'rgba(232,255,0,.15)';
  const badgeColor = video.status === 'pending' ? (video.transcripcion ? 'var(--acc)' : 'var(--mut)') : video.status === 'done' ? 'var(--ok)' : 'var(--acc)';

  return (
    <div style={{background:'var(--s1)',border:`1px solid ${borderColor}`,borderRadius:'10px',display:'flex',gap:'13px',padding:'13px',alignItems:'center',transition:'border-color .2s'}}>
      <img src={video.thumb} alt={video.title} onError={e => (e.currentTarget.style.display='none')}
        style={{width:'108px',height:'60px',borderRadius:'6px',objectFit:'cover',flexShrink:0,background:'var(--s2)'}} />
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:'13px',fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',marginBottom:'3px'}}>{video.title}</div>
        <div style={{fontSize:'11px',color:'var(--mut)',marginBottom:'5px'}}>{video.equipo === 'realmadrid' ? '⚽ Real Madrid' : '🔵 Barcelona'}</div>
        <span style={{display:'inline-block',fontSize:'11px',padding:'2px 8px',borderRadius:'10px',fontWeight:500,background:badgeBg,color:badgeColor}}>{badgeText}</span>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:'6px',flexShrink:0}}>
        <button onClick={() => onEdit(video)}
          style={{background:'var(--acc)',color:'#000',border:'none',padding:'6px 11px',borderRadius:'7px',fontSize:'12px',fontWeight:600,cursor:'pointer',fontFamily:'DM Sans, sans-serif'}}>
          {video.status === 'done' ? '📄 Ver' : video.transcripcion ? '▶ Generar' : '📝 Añadir texto'}
        </button>
        <button onClick={() => onRemove(video.id)}
          style={{background:'transparent',color:'var(--mut)',border:'1px solid var(--b)',padding:'6px 11px',borderRadius:'7px',fontSize:'12px',cursor:'pointer',fontFamily:'DM Sans, sans-serif'}}>
          🗑 Eliminar
        </button>
      </div>
    </div>
  );
}

export default function GuionPage() {
  const { videos, addVideo, removeVideo, clearDone, clearAll, asignarCanalesAleatorio } = useQueueStore();
  const { canales } = useCanalesStore();
  const [showModal, setShowModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);

  const pending = videos.filter(v => v.status === 'pending').length;
  const done = videos.filter(v => v.status === 'done').length;
  const sinTranscripcion = videos.filter(v => !v.transcripcion && v.status === 'pending').length;

  function handleAdd(video: Video) {
    addVideo(video);
    if (canales.length > 0) asignarCanalesAleatorio(canales);
    setShowModal(false);
  }

  if (editingVideo) {
    return <Editor video={editingVideo} onBack={() => setEditingVideo(null)} onDone={() => setEditingVideo(null)} />;
  }

  return (
    <div style={{background:'var(--bg)',minHeight:'100vh',color:'var(--txt)',fontFamily:'DM Sans, sans-serif'}}>
      <header style={{background:'var(--s1)',borderBottom:'1px solid var(--b)',padding:'15px 26px',display:'flex',alignItems:'center',gap:'14px',position:'sticky',top:0,zIndex:100}}>
        <h1 style={{fontFamily:'Bebas Neue, sans-serif',fontSize:'25px',letterSpacing:'2px',color:'var(--acc)'}}>⚽ GUIÓN CREATOR</h1>
        <span style={{fontSize:'12px',color:'var(--mut)'}}>Cola de vídeos</span>
      </header>

      <div style={{maxWidth:'960px',margin:'0 auto',padding:'26px 22px'}}>
        <div style={{background:'var(--s1)',border:'1px solid var(--b)',borderRadius:'12px',padding:'18px 22px',marginBottom:'14px',display:'flex',gap:'10px',alignItems:'center'}}>
          <span style={{fontSize:'13px',color:'var(--mut)',flex:1}}>Añade vídeos — solo enlace y equipo. La transcripción la puedes añadir después.</span>
          <button onClick={() => setShowModal(true)}
            style={{background:'var(--acc)',color:'#000',border:'none',padding:'10px 18px',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:'DM Sans, sans-serif'}}>
            ➕ Añadir vídeo
          </button>
        </div>

        {videos.length > 0 && (
          <div style={{background:'var(--s1)',border:'1px solid var(--b)',borderRadius:'10px',padding:'14px 20px',marginBottom:'14px',display:'flex',alignItems:'center',gap:'14px',flexWrap:'wrap'}}>
            <span style={{fontSize:'13px',color:'var(--mut)',flex:1}}>
              <strong style={{color:'var(--txt)'}}>{videos.length}</strong> vídeos ·{' '}
              <strong style={{color:'var(--acc)'}}>{pending}</strong> pendientes ·{' '}
              <strong style={{color:'var(--ok)'}}>{done}</strong> completados
              {sinTranscripcion > 0 && <> · <strong style={{color:'var(--red)'}}>{sinTranscripcion}</strong> sin transcripción</>}
            </span>
            <div style={{display:'flex',gap:'8px'}}>
              {done > 0 && (
                <button onClick={clearDone} style={{background:'transparent',color:'var(--mut)',border:'1px solid var(--b)',padding:'6px 12px',borderRadius:'7px',fontSize:'12px',cursor:'pointer',fontFamily:'DM Sans, sans-serif'}}>
                  🗑 Limpiar completados
                </button>
              )}
              <button onClick={() => { if(confirm('¿Vaciar toda la cola?')) clearAll(); }}
                style={{background:'transparent',color:'var(--mut)',border:'1px solid var(--b)',padding:'6px 12px',borderRadius:'7px',fontSize:'12px',cursor:'pointer',fontFamily:'DM Sans, sans-serif'}}>
                × Vaciar todo
              </button>
            </div>
          </div>
        )}

        {videos.length === 0 ? (
          <div style={{textAlign:'center',padding:'60px 20px',color:'var(--mut)'}}>
            <span style={{fontSize:'40px',display:'block',marginBottom:'12px'}}>🎬</span>
            <p style={{fontSize:'15px',fontWeight:500,color:'var(--txt)',marginBottom:'6px'}}>No hay vídeos en la cola</p>
            <p style={{fontSize:'13px',marginBottom:'20px'}}>Empieza añadiendo vídeos con su enlace de YouTube</p>
            <button onClick={() => setShowModal(true)}
              style={{background:'var(--acc)',color:'#000',border:'none',padding:'10px 20px',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:'DM Sans, sans-serif'}}>
              ➕ Añadir primer vídeo
            </button>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
            {videos.map(video => (
              <QueueCard key={video.id} video={video} onEdit={setEditingVideo} onRemove={removeVideo} />
            ))}
          </div>
        )}
      </div>

      {showModal && <AddVideoModal onAdd={handleAdd} onClose={() => setShowModal(false)} />}
    </div>
  );
}
