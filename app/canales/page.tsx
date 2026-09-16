'use client';

import { useState } from 'react';
import { useCanalesStore } from '@/store/useCanalesStore';
import { Canal } from '@/types';

export default function CanalesPage() {
  const { canales, addCanal, removeCanal, updateCanal } = useCanalesStore();
  const [showForm, setShowForm] = useState(false);
  const [nombre, setNombre] = useState('');
  const [equipo, setEquipo] = useState<'realmadrid' | 'barcelona'>('realmadrid');
  const [descripcion, setDescripcion] = useState('');
  const [urlCanal, setUrlCanal] = useState('');
  const [logo, setLogo] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const madridCanales = canales.filter(c => c.equipo === 'realmadrid');
  const barcelonaCanales = canales.filter(c => c.equipo === 'barcelona');

  function resetForm() {
    setNombre(''); setEquipo('realmadrid'); setDescripcion('');
    setUrlCanal(''); setLogo(''); setEditingId(null);
  }

  function handleAdd() {
    if (!nombre.trim()) return;
    if (editingId) {
      updateCanal(editingId, { nombre, equipo, descripcion, urlCanal, logo });
      setEditingId(null);
    } else {
      addCanal({
        id: Date.now().toString(),
        nombre: nombre.trim(),
        equipo,
        descripcion: descripcion.trim(),
        urlCanal: urlCanal.trim(),
        logo: logo.trim(),
        createdAt: Date.now(),
      });
    }
    resetForm();
    setShowForm(false);
  }

  function handleEdit(canal: Canal) {
    setNombre(canal.nombre);
    setEquipo(canal.equipo);
    setDescripcion(canal.descripcion);
    setUrlCanal(canal.urlCanal || '');
    setLogo(canal.logo || '');
    setEditingId(canal.id);
    setShowForm(true);
  }

  function CanalCard({ canal }: { canal: Canal }) {
    const color = canal.equipo === 'realmadrid' ? '#e8ff00' : '#a50044';
    const label = canal.equipo === 'realmadrid' ? 'Real Madrid' : 'Barcelona';
    return (
      <div style={{background:'var(--s1)',border:'1px solid var(--b)',borderRadius:'10px',padding:'14px',display:'flex',alignItems:'center',gap:'14px'}}>
        {/* Logo o placeholder */}
        <div style={{width:'52px',height:'52px',borderRadius:'10px',background:`${color}15`,border:`1px solid ${color}33`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden'}}>
          {canal.logo ? (
            <img src={canal.logo} alt={canal.nombre} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'9px'}} onError={e => (e.currentTarget.style.display='none')} />
          ) : (
            <span style={{fontSize:'22px'}}>{canal.equipo === 'realmadrid' ? '⚽' : '🔵'}</span>
          )}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:'14px',fontWeight:600,color:'var(--txt)',marginBottom:'2px'}}>{canal.nombre}</div>
          <div style={{fontSize:'11px',color,marginBottom:'3px'}}>{label}</div>
          {canal.descripcion && <div style={{fontSize:'11px',color:'var(--mut)',marginBottom:'3px'}}>{canal.descripcion}</div>}
          {canal.urlCanal && (
            <a href={canal.urlCanal} target="_blank" rel="noopener noreferrer"
              style={{fontSize:'11px',color:'var(--acc)',textDecoration:'none'}}>
              🔗 {canal.urlCanal.replace('https://','').substring(0,40)}
            </a>
          )}
        </div>
        <div style={{display:'flex',gap:'6px',flexShrink:0}}>
          <button onClick={() => handleEdit(canal)}
            style={{background:'var(--s2)',color:'var(--txt)',border:'1px solid var(--b)',padding:'6px 11px',borderRadius:'7px',fontSize:'12px',cursor:'pointer',fontFamily:'DM Sans, sans-serif'}}>
            ✏️
          </button>
          <button onClick={() => removeCanal(canal.id)}
            style={{background:'transparent',color:'var(--mut)',border:'1px solid var(--b)',padding:'6px 11px',borderRadius:'7px',fontSize:'12px',cursor:'pointer',fontFamily:'DM Sans, sans-serif'}}>
            🗑
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{background:'var(--bg)',minHeight:'100vh',color:'var(--txt)',fontFamily:'DM Sans, sans-serif'}}>
      <header style={{background:'var(--s1)',borderBottom:'1px solid var(--b)',padding:'15px 26px',display:'flex',alignItems:'center',gap:'14px',position:'sticky',top:0,zIndex:100}}>
        <h1 style={{fontFamily:'Bebas Neue, sans-serif',fontSize:'25px',letterSpacing:'2px',color:'var(--acc)'}}>⚽ GUIÓN CREATOR</h1>
        <span style={{fontSize:'12px',color:'var(--mut)'}}>Mis Canales</span>
      </header>

      <div style={{maxWidth:'800px',margin:'0 auto',padding:'26px 22px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'24px'}}>
          <div>
            <h2 style={{fontFamily:'Bebas Neue, sans-serif',fontSize:'22px',color:'var(--acc)',letterSpacing:'1px'}}>MIS CANALES</h2>
            <p style={{fontSize:'12px',color:'var(--mut)',marginTop:'2px'}}>
              {canales.length} canales · {madridCanales.length} Real Madrid · {barcelonaCanales.length} Barcelona
            </p>
          </div>
          <button onClick={() => { resetForm(); setShowForm(!showForm); }}
            style={{background:'var(--acc)',color:'#000',border:'none',padding:'10px 18px',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:'DM Sans, sans-serif'}}>
            {showForm ? '✕ Cancelar' : '➕ Añadir canal'}
          </button>
        </div>

        {showForm && (
          <div style={{background:'var(--s1)',border:'1px solid var(--acc)',borderRadius:'12px',padding:'22px',marginBottom:'22px'}}>
            <h3 style={{fontFamily:'Bebas Neue, sans-serif',fontSize:'16px',color:'var(--acc)',letterSpacing:'1px',marginBottom:'18px'}}>
              {editingId ? '✏️ EDITAR CANAL' : '➕ NUEVO CANAL'}
            </h3>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'12px'}}>
              <div>
                <label style={{fontSize:'12px',color:'var(--mut)',display:'block',marginBottom:'5px'}}>Nombre del canal *</label>
                <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                  placeholder="Ej: MadridNoticias"
                  style={{width:'100%',background:'var(--s2)',border:'1px solid var(--b)',color:'var(--txt)',padding:'9px 12px',borderRadius:'7px',fontSize:'13px',outline:'none',fontFamily:'DM Sans, sans-serif'}} />
              </div>
              <div>
                <label style={{fontSize:'12px',color:'var(--mut)',display:'block',marginBottom:'5px'}}>Equipo *</label>
                <select value={equipo} onChange={e => setEquipo(e.target.value as any)}
                  style={{width:'100%',background:'var(--s2)',border:'1px solid var(--b)',color:'var(--txt)',padding:'9px 12px',borderRadius:'7px',fontSize:'13px',outline:'none',fontFamily:'DM Sans, sans-serif',cursor:'pointer'}}>
                  <option value="realmadrid">⚽ Real Madrid</option>
                  <option value="barcelona">🔵 Barcelona</option>
                </select>
              </div>
            </div>

            <div style={{marginBottom:'12px'}}>
              <label style={{fontSize:'12px',color:'var(--mut)',display:'block',marginBottom:'5px'}}>URL del canal de YouTube</label>
              <input type="text" value={urlCanal} onChange={e => setUrlCanal(e.target.value)}
                placeholder="https://www.youtube.com/@tucanal"
                style={{width:'100%',background:'var(--s2)',border:'1px solid var(--b)',color:'var(--txt)',padding:'9px 12px',borderRadius:'7px',fontSize:'13px',outline:'none',fontFamily:'DM Sans, sans-serif'}} />
            </div>

            <div style={{marginBottom:'12px'}}>
              <label style={{fontSize:'12px',color:'var(--mut)',display:'block',marginBottom:'5px'}}>URL del logo (imagen)</label>
              <input type="text" value={logo} onChange={e => setLogo(e.target.value)}
                placeholder="https://... (enlace directo a la imagen del logo)"
                style={{width:'100%',background:'var(--s2)',border:'1px solid var(--b)',color:'var(--txt)',padding:'9px 12px',borderRadius:'7px',fontSize:'13px',outline:'none',fontFamily:'DM Sans, sans-serif'}} />
              {logo && (
                <div style={{marginTop:'8px',display:'flex',alignItems:'center',gap:'10px'}}>
                  <img src={logo} alt="preview" style={{width:'40px',height:'40px',borderRadius:'8px',objectFit:'cover',background:'var(--b)'}}
                    onError={e => (e.currentTarget.style.opacity='0.3')} />
                  <span style={{fontSize:'11px',color:'var(--mut)'}}>Vista previa del logo</span>
                </div>
              )}
            </div>

            <div style={{marginBottom:'16px'}}>
              <label style={{fontSize:'12px',color:'var(--mut)',display:'block',marginBottom:'5px'}}>Descripción (opcional)</label>
              <input type="text" value={descripcion} onChange={e => setDescripcion(e.target.value)}
                placeholder="Ej: Canal principal de noticias del Madrid"
                style={{width:'100%',background:'var(--s2)',border:'1px solid var(--b)',color:'var(--txt)',padding:'9px 12px',borderRadius:'7px',fontSize:'13px',outline:'none',fontFamily:'DM Sans, sans-serif'}} />
            </div>

            <button onClick={handleAdd} disabled={!nombre.trim()}
              style={{background:'var(--acc)',color:'#000',border:'none',padding:'10px 20px',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:'DM Sans, sans-serif',opacity:!nombre.trim()?0.4:1}}>
              {editingId ? '✓ Guardar cambios' : '✓ Añadir canal'}
            </button>
          </div>
        )}

        {['realmadrid','barcelona'].map(eq => {
          const lista = eq === 'realmadrid' ? madridCanales : barcelonaCanales;
          const color = eq === 'realmadrid' ? '#e8ff00' : '#a50044';
          const label = eq === 'realmadrid' ? '⚽ REAL MADRID' : '🔵 BARCELONA';
          return (
            <div key={eq} style={{marginBottom:'24px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'12px'}}>
                <div style={{height:'1px',flex:1,background:'var(--b)'}}/>
                <span style={{fontSize:'12px',fontWeight:600,color,padding:'3px 10px',background:`${color}15`,borderRadius:'20px'}}>
                  {label} ({lista.length})
                </span>
                <div style={{height:'1px',flex:1,background:'var(--b)'}}/>
              </div>
              {lista.length === 0 ? (
                <div style={{textAlign:'center',padding:'30px',color:'var(--mut)',fontSize:'13px',border:'1px dashed var(--b)',borderRadius:'10px'}}>
                  No hay canales. Añade uno arriba.
                </div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                  {lista.map(c => <CanalCard key={c.id} canal={c} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}