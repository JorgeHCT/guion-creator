'use client';

import { useState, useCallback } from 'react';

interface Jugador {
  nombre: string;
  fotos: string[];
  carpeta: string;
}

interface FotoFile {
  nombre: string;
  url: string;
  jugador: string;
}

export default function JugadoresPage() {
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [fotosCache, setFotosCache] = useState<Record<string, FotoFile[]>>({});
  const [buscador, setBuscador] = useState('');
  const [jugadorActivo, setJugadorActivo] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [cargando, setCargando] = useState(false);

  const procesarArchivos = useCallback((files: FileList) => {
    setCargando(true);
    const mapaJugadores: Record<string, { fotos: string[]; urls: FotoFile[] }> = {};

    Array.from(files).forEach(file => {
      const partes = file.webkitRelativePath
        ? file.webkitRelativePath.split('/')
        : file.name.split('/');

      // Buscar la carpeta del jugador (última carpeta antes del archivo)
      let nombreJugador = 'Sin carpeta';
      if (partes.length >= 2) {
        nombreJugador = partes[partes.length - 2];
      }

      const esImagen = file.type.startsWith('image/') ||
        /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name);

      if (!esImagen) return;

      if (!mapaJugadores[nombreJugador]) {
        mapaJugadores[nombreJugador] = { fotos: [], urls: [] };
      }

      const url = URL.createObjectURL(file);
      mapaJugadores[nombreJugador].fotos.push(file.name);
      mapaJugadores[nombreJugador].urls.push({
        nombre: file.name,
        url,
        jugador: nombreJugador,
      });
    });

    const lista: Jugador[] = Object.entries(mapaJugadores)
      .map(([nombre, data]) => ({
        nombre,
        fotos: data.fotos,
        carpeta: nombre,
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));

    const cache: Record<string, FotoFile[]> = {};
    Object.entries(mapaJugadores).forEach(([nombre, data]) => {
      cache[nombre] = data.urls;
    });

    setJugadores(lista);
    setFotosCache(cache);
    setCargando(false);
  }, []);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) {
      procesarArchivos(e.dataTransfer.files);
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      procesarArchivos(e.target.files);
    }
  }

  const jugadoresFiltrados = jugadores.filter(j =>
    j.nombre.toLowerCase().includes(buscador.toLowerCase())
  );

  const totalFotos = jugadores.reduce((acc, j) => acc + j.fotos.length, 0);

  return (
    <div style={{background:'var(--bg)',minHeight:'100vh',color:'var(--txt)',fontFamily:'DM Sans, sans-serif'}}>
      <header style={{background:'var(--s1)',borderBottom:'1px solid var(--b)',padding:'15px 26px',display:'flex',alignItems:'center',gap:'14px',position:'sticky',top:0,zIndex:100}}>
        <h1 style={{fontFamily:'Bebas Neue, sans-serif',fontSize:'25px',letterSpacing:'2px',color:'var(--acc)'}}>⚽ GUIÓN CREATOR</h1>
        <span style={{fontSize:'12px',color:'var(--mut)'}}>Jugadores · Fotos</span>
        {jugadores.length > 0 && (
          <span style={{fontSize:'12px',color:'var(--mut)',marginLeft:'auto'}}>
            <strong style={{color:'var(--txt)'}}>{jugadores.length}</strong> jugadores ·{' '}
            <strong style={{color:'var(--txt)'}}>{totalFotos.toLocaleString()}</strong> fotos
          </span>
        )}
      </header>

      <div style={{maxWidth:'1100px',margin:'0 auto',padding:'26px 22px'}}>

        {/* Zona de subida */}
        {jugadores.length === 0 && (
          <div
            onDrop={onDrop}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            style={{
              border:`2px dashed ${dragging ? 'var(--acc)' : 'var(--b)'}`,
              borderRadius:'16px',
              padding:'60px 20px',
              textAlign:'center',
              background: dragging ? 'rgba(232,255,0,0.04)' : 'var(--s1)',
              transition:'all .2s',
              marginBottom:'20px',
            }}
          >
            <p style={{fontSize:'40px',marginBottom:'12px'}}>📁</p>
            <p style={{fontSize:'16px',fontWeight:600,color:'var(--txt)',marginBottom:'6px'}}>
              Arrastra aquí todas tus carpetas de jugadores
            </p>
            <p style={{fontSize:'13px',color:'var(--mut)',marginBottom:'20px'}}>
              Selecciona todas las carpetas de golpe — las organiza automáticamente por jugador
            </p>
            <label style={{
              background:'var(--acc)',color:'#000',padding:'11px 22px',
              borderRadius:'8px',fontSize:'13px',fontWeight:600,
              cursor:'pointer',display:'inline-block',
            }}>
              📂 Seleccionar carpetas
              <input
                type="file"
                multiple
                // @ts-ignore
                webkitdirectory=""
                directory=""
                onChange={onInputChange}
                style={{display:'none'}}
              />
            </label>
            <p style={{fontSize:'11px',color:'var(--mut)',marginTop:'12px'}}>
              También puedes arrastrar las carpetas directamente aquí
            </p>
          </div>
        )}

        {cargando && (
          <div style={{textAlign:'center',padding:'40px',color:'var(--acc)',fontSize:'14px'}}>
            <div style={{fontSize:'32px',marginBottom:'12px'}}>⏳</div>
            Procesando fotos...
          </div>
        )}

        {/* Lista de jugadores */}
        {jugadores.length > 0 && (
          <>
            <div style={{display:'flex',gap:'12px',marginBottom:'16px',alignItems:'center'}}>
              <input
                type="text"
                value={buscador}
                onChange={e => setBuscador(e.target.value)}
                placeholder="🔍 Buscar jugador..."
                style={{flex:1,background:'var(--s1)',border:'1px solid var(--b)',color:'var(--txt)',padding:'10px 14px',borderRadius:'8px',fontSize:'13px',outline:'none',fontFamily:'DM Sans, sans-serif'}}
              />
              <label style={{
                background:'var(--s2)',color:'var(--txt)',border:'1px solid var(--b)',
                padding:'10px 16px',borderRadius:'8px',fontSize:'13px',
                cursor:'pointer',whiteSpace:'nowrap',
              }}>
                ➕ Añadir más
                <input
                  type="file" multiple
                  // @ts-ignore
                  webkitdirectory="" directory=""
                  onChange={onInputChange}
                  style={{display:'none'}}
                />
              </label>
              <button
                onClick={() => { setJugadores([]); setFotosCache({}); setJugadorActivo(null); }}
                style={{background:'transparent',color:'var(--mut)',border:'1px solid var(--b)',padding:'10px 14px',borderRadius:'8px',fontSize:'13px',cursor:'pointer',fontFamily:'DM Sans, sans-serif',whiteSpace:'nowrap'}}>
                × Limpiar
              </button>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'10px'}}>
              {jugadoresFiltrados.map(jugador => {
                const fotos = fotosCache[jugador.nombre] || [];
                const isActivo = jugadorActivo === jugador.nombre;
                return (
                  <div key={jugador.nombre}>
                    <div
                      onClick={() => setJugadorActivo(isActivo ? null : jugador.nombre)}
                      style={{
                        background:'var(--s1)',
                        border:`1px solid ${isActivo ? 'var(--acc)' : 'var(--b)'}`,
                        borderRadius:'10px',
                        overflow:'hidden',
                        cursor:'pointer',
                        transition:'border-color .2s',
                      }}
                    >
                      {/* Preview fotos */}
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'2px',height:'100px',overflow:'hidden',background:'var(--s2)'}}>
                        {fotos.slice(0,4).map((f, fi) => (
                          <img key={fi} src={f.url} alt={f.nombre}
                            style={{width:'100%',height:'50px',objectFit:'cover'}}
                          />
                        ))}
                        {fotos.length === 0 && (
                          <div style={{gridColumn:'1/-1',display:'flex',alignItems:'center',justifyContent:'center',height:'100px',fontSize:'28px'}}>👤</div>
                        )}
                      </div>
                      <div style={{padding:'10px 12px'}}>
                        <div style={{fontSize:'13px',fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{jugador.nombre}</div>
                        <div style={{fontSize:'11px',color:'var(--mut)',marginTop:'2px'}}>{jugador.fotos.length} fotos</div>
                      </div>
                    </div>

                    {/* Galería expandida */}
                    {isActivo && fotos.length > 0 && (
                      <div style={{background:'var(--s1)',border:'1px solid var(--acc)',borderRadius:'10px',padding:'12px',marginTop:'6px'}}>
                        <p style={{fontSize:'11px',color:'var(--acc)',marginBottom:'8px',fontWeight:600}}>
                          ARRASTRA LAS FOTOS A CLIPCHAMP
                        </p>
                        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'6px',maxHeight:'300px',overflowY:'auto'}}>
                          {fotos.map((f, fi) => (
                            <img
                              key={fi}
                              src={f.url}
                              alt={f.nombre}
                              draggable
                              title={f.nombre}
                              style={{
                                width:'100%',
                                aspectRatio:'16/9',
                                objectFit:'cover',
                                borderRadius:'5px',
                                cursor:'grab',
                                border:'1px solid var(--b)',
                              }}
                            />
                          ))}
                        </div>
                        <p style={{fontSize:'10px',color:'var(--mut)',marginTop:'8px',textAlign:'center'}}>
                          Arrastra cualquier foto directamente a Clipchamp
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}