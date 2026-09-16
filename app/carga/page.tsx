'use client';

import { useState } from 'react';
import { useQueueStore } from '@/store/useQueueStore';
import { useCanalesStore } from '@/store/useCanalesStore';
import { Video } from '@/types';

function getVideoId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

interface VideoForm {
  url: string;
  equipo: 'realmadrid' | 'barcelona';
  title: string;
  thumb: string;
  loaded: boolean;
  loading: boolean;
  error: string;
}

function emptyForm(): VideoForm {
  return { url:'', equipo:'realmadrid', title:'', thumb:'', loaded:false, loading:false, error:'' };
}

export default function CargaPage() {
  const { addVideos, asignarCanalesAleatorio } = useQueueStore();
  const { canales } = useCanalesStore();
  const [forms, setForms] = useState<VideoForm[]>([emptyForm()]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(0);

  function updateForm(i: number, updates: Partial<VideoForm>) {
    setForms(prev => prev.map((f, idx) => idx === i ? { ...f, ...updates } : f));
  }

  async function loadVideo(i: number) {
    const url = forms[i].url.trim();
    const vid = getVideoId(url);
    if (!vid) { updateForm(i, { error: 'URL no válida' }); return; }
    updateForm(i, { loading: true, error: '' });
    let title = 'Vídeo de YouTube';
    let thumb = `https://img.youtube.com/vi/${vid}/mqdefault.jpg`;
    try {
      const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json`);
      if (r.ok) { const d = await r.json(); title = d.title || title; thumb = d.thumbnail_url || thumb; }
    } catch (e) {}
    updateForm(i, { title, thumb, loaded: true, loading: false });
  }

  async function guardarTodo() {
    const validos = forms.filter(f => f.loaded);
    if (validos.length === 0) return;
    setSaving(true);
    const nuevos: Video[] = validos.map(f => ({
      id: getVideoId(f.url)! + '_' + Date.now() + Math.random(),
      url: f.url.trim(),
      title: f.title,
      thumb: f.thumb,
      transcripcion: '',
      status: 'pending' as const,
      guion: null,
      createdAt: Date.now(),
      equipo: f.equipo,
      canalId: null,
    }));
    addVideos(nuevos);
    if (canales.length > 0) asignarCanalesAleatorio(canales);
    setSaved(nuevos.length);
    setSaving(false);
    setForms([emptyForm()]);
  }

  const listos = forms.filter(f => f.loaded).length;

  return (
    <div style={{background:'var(--bg)',minHeight:'100vh',color:'var(--txt)',fontFamily:'DM Sans, sans-serif'}}>
      <header style={{background:'var(--s1)',borderBottom:'1px solid var(--b)',padding:'15px 26px',display:'flex',alignItems:'center',gap:'14px',position:'sticky',top:0,zIndex:100}}>
        <h1 style={{fontFamily:'Bebas Neue, sans-serif',fontSize:'25px',letterSpacing:'2px',color:'var(--acc)'}}>⚽ GUIÓN CREATOR</h1>
        <span style={{fontSize:'12px',color:'var(--mut)'}}>Carga masiva</span>
      </header>

      <div style={{maxWidth:'860px',margin:'0 auto',padding:'26px 22px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px'}}>
          <div>
            <h2 style={{fontFamily:'Bebas Neue, sans-serif',fontSize:'22px',color:'var(--acc)',letterSpacing:'1px'}}>CARGA MASIVA</h2>
            <p style={{fontSize:'12px',color:'var(--mut)',marginTop:'2px'}}>Añade muchos vídeos de golpe — solo enlace y equipo, sin transcripción</p>
          </div>
          <div style={{display:'flex',gap:'8px'}}>
            <button onClick={() => setForms(prev => [...prev, emptyForm()])}
              style={{background:'var(--s2)',color:'var(--txt)',border:'1px solid var(--b)',padding:'9px 16px',borderRadius:'8px',fontSize:'13px',cursor:'pointer',fontFamily:'DM Sans, sans-serif'}}>
              ➕ Añadir
            </button>
            <button onClick={guardarTodo} disabled={listos === 0 || saving}
              style={{background:'var(--acc)',color:'#000',border:'none',padding:'9px 16px',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:'DM Sans, sans-serif',opacity:listos===0?0.4:1}}>
              {saving ? 'Guardando...' : `✓ Guardar ${listos} vídeos`}
            </button>
          </div>
        </div>

        {saved > 0 && (
          <div style={{background:'rgba(0,255,136,0.1)',border:'1px solid var(--ok)',borderRadius:'10px',padding:'12px 16px',marginBottom:'16px',fontSize:'13px',color:'var(--ok)'}}>
            ✅ {saved} vídeos guardados y asignados a canales correctamente
          </div>
        )}

        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          {forms.map((form, i) => (
            <div key={i} style={{background:'var(--s1)',border:`1px solid ${form.loaded ? 'var(--ok)' : 'var(--b)'}`,borderRadius:'10px',padding:'14px',transition:'border-color .2s'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr auto auto auto',gap:'8px',alignItems:'end'}}>
                <div>
                  <label style={{fontSize:'11px',color:'var(--mut)',display:'block',marginBottom:'4px'}}>Enlace de YouTube</label>
                  <input type="text" value={form.url} onChange={e => updateForm(i, {url:e.target.value, loaded:false})}
                    onKeyDown={e => e.key==='Enter' && loadVideo(i)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    style={{width:'100%',background:'var(--s2)',border:'1px solid var(--b)',color:'var(--txt)',padding:'8px 11px',borderRadius:'7px',fontSize:'12px',outline:'none',fontFamily:'DM Sans, sans-serif'}}
                  />
                </div>
                <div>
                  <label style={{fontSize:'11px',color:'var(--mut)',display:'block',marginBottom:'4px'}}>Equipo</label>
                  <select value={form.equipo} onChange={e => updateForm(i, {equipo:e.target.value as any})}
                    style={{background:'var(--s2)',border:'1px solid var(--b)',color:'var(--txt)',padding:'8px 11px',borderRadius:'7px',fontSize:'12px',outline:'none',fontFamily:'DM Sans, sans-serif',cursor:'pointer'}}>
                    <option value="realmadrid">⚽ RM</option>
                    <option value="barcelona">🔵 FCB</option>
                  </select>
                </div>
                <button onClick={() => loadVideo(i)} disabled={!form.url.trim() || form.loading}
                  style={{background:'var(--acc)',color:'#000',border:'none',padding:'8px 14px',borderRadius:'7px',fontSize:'12px',fontWeight:600,cursor:'pointer',fontFamily:'DM Sans, sans-serif',opacity:!form.url.trim()?0.4:1}}>
                  {form.loading ? '...' : form.loaded ? '✓' : 'Cargar'}
                </button>
                {forms.length > 1 && (
                  <button onClick={() => setForms(prev => prev.filter((_,idx) => idx !== i))}
                    style={{background:'transparent',color:'var(--mut)',border:'none',fontSize:'16px',cursor:'pointer',padding:'0 4px'}}>
                    ✕
                  </button>
                )}
              </div>
              {form.error && <p style={{fontSize:'11px',color:'var(--red)',marginTop:'6px'}}>⚠ {form.error}</p>}
              {form.loaded && (
                <div style={{display:'flex',gap:'10px',alignItems:'center',background:'var(--s2)',borderRadius:'7px',padding:'8px',marginTop:'8px'}}>
                  <img src={form.thumb} alt="" style={{width:'72px',height:'40px',borderRadius:'4px',objectFit:'cover',background:'var(--b)',flexShrink:0}} />
                  <div style={{fontSize:'12px',fontWeight:500,color:'var(--ok)'}}>{form.title}</div>
                </div>
              )}
            </div>
          ))}
        </div>

        {forms.length > 0 && (
          <div style={{marginTop:'16px',display:'flex',justifyContent:'center',gap:'10px'}}>
            <button onClick={() => setForms(prev => [...prev, emptyForm()])}
              style={{background:'var(--s2)',color:'var(--txt)',border:'1px solid var(--b)',padding:'10px 20px',borderRadius:'8px',fontSize:'13px',cursor:'pointer',fontFamily:'DM Sans, sans-serif'}}>
              ➕ Añadir otro vídeo
            </button>
            <button onClick={guardarTodo} disabled={listos===0||saving}
              style={{background:'var(--acc)',color:'#000',border:'none',padding:'10px 20px',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:'DM Sans, sans-serif',opacity:listos===0?0.4:1}}>
              {saving ? 'Guardando...' : `✓ Guardar ${listos} vídeos`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
