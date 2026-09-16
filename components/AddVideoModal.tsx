'use client';

import { useState } from 'react';
import { Video } from '@/types';

interface Props {
  onAdd: (video: Video) => void;
  onClose: () => void;
}

function getVideoId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

export default function AddVideoModal({ onAdd, onClose }: Props) {
  const [url, setUrl] = useState('');
  const [equipo, setEquipo] = useState<'realmadrid' | 'barcelona'>('realmadrid');
  const [loading, setLoading] = useState(false);
  const [videoInfo, setVideoInfo] = useState<{ title: string; thumb: string; id: string } | null>(null);
  const [error, setError] = useState('');

  async function loadVideo() {
    const vid = getVideoId(url.trim());
    if (!vid) { setError('URL no válida — pega un enlace de YouTube'); return; }
    setLoading(true); setError('');
    let title = 'Vídeo de YouTube';
    let thumb = `https://img.youtube.com/vi/${vid}/mqdefault.jpg`;
    try {
      const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json`);
      if (r.ok) { const d = await r.json(); title = d.title || title; thumb = d.thumbnail_url || thumb; }
    } catch (e) {}
    setVideoInfo({ title, thumb, id: vid });
    setLoading(false);
  }

  function handleAdd() {
    if (!videoInfo) { setError('Carga primero el vídeo pulsando "Cargar"'); return; }
    onAdd({
      id: videoInfo.id,
      url: url.trim(),
      title: videoInfo.title,
      thumb: videoInfo.thumb,
      transcripcion: '',
      status: 'pending',
      guion: null,
      createdAt: Date.now(),
      equipo,
      canalId: null,
    });
    onClose();
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}}>
      <div style={{background:'var(--s1)',border:'1px solid var(--b)',borderRadius:'14px',width:'100%',maxWidth:'500px',padding:'24px'}}>
        <h3 style={{fontFamily:'Bebas Neue, sans-serif',fontSize:'20px',color:'var(--acc)',letterSpacing:'1px',marginBottom:'18px'}}>
          ➕ AÑADIR VÍDEO
        </h3>

        <label style={{fontSize:'12px',color:'var(--mut)',display:'block',marginBottom:'5px'}}>Enlace de YouTube</label>
        <div style={{display:'flex',gap:'8px',marginBottom:'14px'}}>
          <input type="text" value={url} onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadVideo()}
            placeholder="https://www.youtube.com/watch?v=..."
            style={{flex:1,background:'var(--s2)',border:'1px solid var(--b)',color:'var(--txt)',padding:'10px 13px',borderRadius:'8px',fontSize:'13px',outline:'none',fontFamily:'DM Sans, sans-serif'}}
          />
          <button onClick={loadVideo} disabled={loading}
            style={{background:'var(--acc)',color:'#000',border:'none',padding:'10px 18px',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer',opacity:loading?0.5:1,fontFamily:'DM Sans, sans-serif'}}>
            {loading ? '...' : 'Cargar'}
          </button>
        </div>

        {videoInfo && (
          <div style={{display:'flex',gap:'12px',alignItems:'center',background:'var(--s2)',borderRadius:'8px',padding:'12px',marginBottom:'14px'}}>
            <img src={videoInfo.thumb} alt="" style={{width:'96px',height:'54px',borderRadius:'6px',objectFit:'cover'}} />
            <p style={{fontSize:'13px',fontWeight:500}}>{videoInfo.title}</p>
          </div>
        )}

        <label style={{fontSize:'12px',color:'var(--mut)',display:'block',marginBottom:'5px'}}>Equipo</label>
        <select value={equipo} onChange={e => setEquipo(e.target.value as any)}
          style={{width:'100%',background:'var(--s2)',border:'1px solid var(--b)',color:'var(--txt)',padding:'10px 13px',borderRadius:'8px',fontSize:'13px',outline:'none',fontFamily:'DM Sans, sans-serif',cursor:'pointer',marginBottom:'18px'}}>
          <option value="realmadrid">⚽ Real Madrid</option>
          <option value="barcelona">🔵 Barcelona</option>
        </select>

        {error && <p style={{fontSize:'12px',color:'var(--red)',marginBottom:'12px'}}>⚠ {error}</p>}

        <div style={{display:'flex',gap:'10px'}}>
          <button onClick={onClose}
            style={{flex:1,background:'transparent',color:'var(--txt)',border:'1px solid var(--b)',padding:'10px',borderRadius:'8px',fontSize:'13px',cursor:'pointer',fontFamily:'DM Sans, sans-serif'}}>
            Cancelar
          </button>
          <button onClick={handleAdd} disabled={!videoInfo}
            style={{flex:1,background:'var(--acc)',color:'#000',border:'none',padding:'10px',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer',opacity:!videoInfo?0.4:1,fontFamily:'DM Sans, sans-serif'}}>
            Guardar en cola
          </button>
        </div>
      </div>
    </div>
  );
}
