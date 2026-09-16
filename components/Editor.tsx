'use client';

import { useState, useRef } from 'react';
import { Video } from '@/types';
import { useQueueStore } from '@/store/useQueueStore';

interface Props { video: Video; onBack: () => void; onDone: () => void; }

const MAX = 6000;

function cleanText(t: string): string {
  return t.replace(/\*\*(.*?)\*\*/g,'$1').replace(/\*(.*?)\*/g,'$1').replace(/#{1,6}\s*/g,'').replace(/_{2}(.*?)_{2}/g,'$1').trim();
}

function dividirEnBloques(texto: string, maxChars: number = 6000): string[] {
  if (texto.length <= maxChars) return [texto];
  const bloques: string[] = [];
  let restante = texto;
  while (restante.length > maxChars) {
    let corte = restante.lastIndexOf('.', maxChars);
    if (corte === -1 || corte < maxChars * 0.5) {
      corte = restante.lastIndexOf(',', maxChars);
      if (corte === -1 || corte < maxChars * 0.5) {
        corte = restante.lastIndexOf(' ', maxChars);
      }
    }
    if (corte === -1) corte = maxChars;
    bloques.push(restante.substring(0, corte + 1).trim());
    restante = restante.substring(corte + 1).trim();
  }
  if (restante.length > 0) bloques.push(restante);
  return bloques;
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

function Dot({ delay }: { delay: string }) {
  return <span style={{display:'inline-block',width:'4px',height:'4px',borderRadius:'50%',background:'var(--acc)',animation:'bou 1.2s infinite',animationDelay:delay}} />;
}

function Loader({ text }: { text: string }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:'7px',fontSize:'12px',color:'var(--acc)',margin:'8px 0'}}>
      <div style={{display:'flex',gap:'3px'}}><Dot delay="0s"/><Dot delay=".2s"/><Dot delay=".4s"/></div>
      {text}
    </div>
  );
}

function ProgressBar({ pct, done }: { pct: number; done: boolean }) {
  return (
    <div style={{height:'3px',background:'var(--b)',margin:'0 20px',borderRadius:'2px',overflow:'hidden'}}>
      <div style={{height:'100%',background:done?'var(--ok)':'var(--acc)',width:`${pct}%`,transition:'width 0.6s ease',borderRadius:'2px'}}/>
    </div>
  );
}

function TranscripcionInput({ onSave }: { onSave: (t: string) => void }) {
  const [text, setText] = useState('');
  return (
    <div style={{marginTop:'8px'}}>
      <div style={{background:'rgba(232,255,0,0.08)',border:'1px solid rgba(232,255,0,0.3)',borderRadius:'8px',padding:'10px 12px',marginBottom:'10px',fontSize:'12px',color:'var(--acc)'}}>
        ⚠ Este vídeo no tiene transcripción todavía. Pégala aquí para generar el guión.
      </div>
      <textarea value={text} onChange={e => setText(e.target.value)}
        placeholder="Pega aquí el texto completo del vídeo de YouTube (con o sin marcas de tiempo)..."
        style={{width:'100%',background:'var(--s2)',border:'1px solid var(--b)',color:'var(--txt)',padding:'12px',borderRadius:'8px',fontSize:'12px',lineHeight:1.6,resize:'vertical',outline:'none',minHeight:'130px',fontFamily:'DM Sans, sans-serif'}}
      />
      <p style={{fontSize:'11px',color:'var(--mut)',marginTop:'4px',marginBottom:'10px'}}>{text.length.toLocaleString()} caracteres</p>
      <button onClick={() => onSave(text)} disabled={!text.trim()}
        style={{background:'var(--acc)',color:'#000',border:'none',padding:'10px 20px',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer',width:'100%',fontFamily:'DM Sans, sans-serif',opacity:!text.trim()?0.4:1}}>
        ✓ Guardar transcripción y continuar
      </button>
    </div>
  );
}

function ResultadoGuion({ finalParts, onDone, onCopyAll }: {
  finalParts: string[];
  onDone: () => void;
  onCopyAll: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  function copyBloque(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key); setTimeout(() => setCopied(null), 2000);
  }

  function copyAll() {
    const texto = finalParts.map((p, i) => {
      const bloques = dividirEnBloques(p);
      return bloques.map((b, bi) =>
        bloques.length > 1 ? `PARTE ${i+1} - Bloque ${bi+1}:\n${b}` : `PARTE ${i+1}:\n${b}`
      ).join('\n\n');
    }).join('\n\n');
    navigator.clipboard.writeText(texto);
    setCopied('all'); setTimeout(() => setCopied(null), 2000);
    onCopyAll();
  }

  return (
    <div style={{background:'var(--s1)',border:'1px solid var(--ok)',borderRadius:'12px',padding:'20px',marginTop:'14px'}}>
      <h3 style={{fontFamily:'Bebas Neue, sans-serif',fontSize:'19px',color:'var(--ok)',letterSpacing:'2px',marginBottom:'14px'}}>✅ GUIÓN COMPLETO LISTO</h3>
      <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
        {finalParts.map((p, i) => {
          const bloques = dividirEnBloques(p);
          return (
            <div key={i}>
              {/* Cabecera de parte */}
              <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
                <span style={{fontFamily:'Bebas Neue, sans-serif',fontSize:'15px',color:'var(--ok)',letterSpacing:'1px'}}>PARTE {i+1}</span>
                {bloques.length > 1 && (
                  <span style={{fontSize:'11px',color:'var(--mut)',background:'var(--s2)',border:'1px solid var(--b)',padding:'1px 8px',borderRadius:'10px'}}>
                    {bloques.length} bloques · {p.length.toLocaleString()} chars total
                  </span>
                )}
              </div>
              {/* Bloques */}
              <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                {bloques.map((bloque, bi) => {
                  const key = `${i}-${bi}`;
                  return (
                    <div key={bi} style={{background:'var(--s2)',border:'1px solid var(--b)',borderRadius:'8px',overflow:'hidden'}}>
                      <div style={{padding:'8px 13px',background:'rgba(0,255,136,.04)',borderBottom:'1px solid var(--b)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                          {bloques.length > 1 && (
                            <span style={{fontSize:'11px',fontWeight:600,color:'var(--ok)',background:'rgba(0,255,136,0.1)',padding:'1px 8px',borderRadius:'8px'}}>
                              Bloque {bi+1}/{bloques.length}
                            </span>
                          )}
                          <span style={{fontSize:'11px',color:'var(--mut)'}}>
                            {bloque.length.toLocaleString()} / 6.000 chars
                          </span>
                          {/* Barra de uso del bloque */}
                          <div style={{width:'60px',height:'4px',background:'var(--b)',borderRadius:'2px',overflow:'hidden'}}>
                            <div style={{height:'100%',background:bloque.length > 5500 ? 'var(--red)' : bloque.length > 4500 ? 'var(--acc)' : 'var(--ok)',width:`${Math.min((bloque.length/6000)*100,100)}%`,borderRadius:'2px'}}/>
                          </div>
                        </div>
                        <button onClick={() => copyBloque(bloque, key)}
                          style={{background:copied===key?'var(--ok)':'var(--s2)',color:copied===key?'#000':'var(--txt)',border:`1px solid ${copied===key?'var(--ok)':'var(--b)'}`,padding:'5px 12px',borderRadius:'6px',fontSize:'11px',cursor:'pointer',fontFamily:'DM Sans, sans-serif',fontWeight:copied===key?600:400,transition:'all .2s'}}>
                          {copied === key ? '✓ Copiado' : '📋 Copiar'}
                        </button>
                      </div>
                      <div style={{padding:'12px 13px',fontSize:'13px',lineHeight:1.7,whiteSpace:'pre-wrap',maxHeight:'260px',overflowY:'auto'}}>
                        {bloque}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{display:'flex',gap:'10px',marginTop:'16px'}}>
        <button onClick={copyAll}
          style={{flex:1,background:copied==='all'?'var(--ok)':'var(--acc)',color:'#000',border:'none',padding:'10px',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:'DM Sans, sans-serif',transition:'all .2s'}}>
          {copied === 'all' ? '✓ ¡Copiado todo!' : '📋 COPIAR GUIÓN COMPLETO'}
        </button>
        <button onClick={onDone}
          style={{flex:1,background:'var(--ok)',color:'#000',border:'none',padding:'10px',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:'DM Sans, sans-serif'}}>
          ✅ Marcar completado y volver
        </button>
      </div>
    </div>
  );
}

export default function Editor({ video, onBack, onDone }: Props) {
  const { updateVideo } = useQueueStore();
  const [currentVideo, setCurrentVideo] = useState<Video>(video);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState('');
  const [parts, setParts] = useState<string[]>([]);
  const [finalParts, setFinalParts] = useState<string[]>(video.guion || []);
  const [pct, setPct] = useState<number[]>([0,0,0,0]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const showResult = video.guion && video.guion.length > 0;

  const steps = [
    { label: 'Transcripción del vídeo', sub: 'Texto original' },
    { label: 'Texto expandido y sin marcas de tiempo', sub: '"Dame este texto muchísimo más largo y sin marca de tiempo"' },
    { label: 'Dividido en 3 partes', sub: '"Divídemelo en 3"' },
    { label: 'Cada parte expandida al máximo', sub: '"Dame este texto muchísimo más largo" × 3' },
  ];

  function startFakeProgress(stepIdx: number, durationMs: number) {
    if (timerRef.current) clearInterval(timerRef.current);
    setPct(prev => { const n=[...prev]; n[stepIdx]=0; return n; });
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const ratio = Math.min(elapsed / durationMs, 1);
      const v = ratio < 0.6 ? ratio*(0.8/0.6) : 0.8+(ratio-0.6)*(0.1/0.4);
      setPct(prev => { const n=[...prev]; n[stepIdx]=Math.min(Math.round(v*100), 90); return n; });
    }, 200);
  }

  function finishProgress(stepIdx: number) {
    if (timerRef.current) clearInterval(timerRef.current);
    setPct(prev => { const n=[...prev]; n[stepIdx]=100; return n; });
  }

  function handleSaveTranscripcion(t: string) {
    updateVideo(currentVideo.id, { transcripcion: t });
    setCurrentVideo(prev => ({ ...prev, transcripcion: t }));
  }

  async function startProcess() {
    if (!currentVideo.transcripcion) return;
    setLoading(true); setError(''); setStep(1);
    try {
      setLoadingText('Expandiendo texto...');
      startFakeProgress(1, 28000);
      const exp = await callGroq('Dame este texto muchísimo más largo y sin marca de tiempo. Muy narrativo y apasionado. En español:\n\n' + trunc(currentVideo.transcripcion, MAX));
      finishProgress(1);
      setExpanded(cleanText(exp)); setStep(2);

      setLoadingText('Dividiendo en 3 partes...');
      startFakeProgress(2, 18000);
      const div = await callGroq('Divídeme en exactamente 3 partes. Devuelve SOLO:\n[PARTE 1]\n(texto)\n[PARTE 2]\n(texto)\n[PARTE 3]\n(texto)\n\nTexto:\n\n' + trunc(exp, MAX));
      finishProgress(2);
      const pts = parseParts(div).map(cleanText);
      setParts(pts); setStep(3);

      const final: string[] = [];
      for (let i = 0; i < 3; i++) {
        setLoadingText(`Expandiendo parte ${i+1} de 3...`);
        const baseStart = Math.round((i/3)*90);
        setPct(prev => { const n=[...prev]; n[3]=baseStart; return n; });
        const partStart = Date.now();
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          const elapsed = Date.now() - partStart;
          const ratio = Math.min(elapsed / 22000, 1);
          const v = ratio < 0.6 ? ratio*(0.8/0.6) : 0.8+(ratio-0.6)*(0.1/0.4);
          setPct(prev => { const n=[...prev]; n[3]=Math.min(baseStart+Math.round(v*(90/3)), 90); return n; });
        }, 200);
        final.push(cleanText(await callGroq('Dame este texto muchísimo más largo. Mínimo 600 palabras. Español, estilo documental deportivo apasionado:\n\n' + trunc(pts[i], MAX))));
        if (timerRef.current) clearInterval(timerRef.current);
        setPct(prev => { const n=[...prev]; n[3]=Math.round(((i+1)/3)*100); return n; });
      }

      setFinalParts(final); setStep(4);
      updateVideo(currentVideo.id, { guion: final, status: 'processing' });
    } catch (e: any) {
      setError(e.message);
      if (timerRef.current) clearInterval(timerRef.current);
    } finally {
      setLoading(false); setLoadingText('');
    }
  }

  function handleDone() { updateVideo(currentVideo.id, { status: 'done' }); onDone(); }

  const brd = (n: number) => step === n ? 'var(--acc)' : step > n ? 'var(--ok)' : 'var(--b)';
  const numBg = (n: number) => step === n ? 'var(--acc)' : step > n ? 'var(--ok)' : 'var(--s2)';
  const numColor = (n: number) => step >= n ? '#000' : 'var(--mut)';
  const badgeText = (n: number) => step === n ? 'En curso...' : step > n ? 'Listo ✓' : 'Esperando';
  const badgeBg = (n: number) => step === n ? 'rgba(232,255,0,.15)' : step > n ? 'rgba(0,255,136,.15)' : 'var(--s2)';
  const badgeColor = (n: number) => step === n ? 'var(--acc)' : step > n ? 'var(--ok)' : 'var(--mut)';

  return (
    <div style={{maxWidth:'760px',margin:'0 auto',padding:'26px 22px'}}>
      <style>{`@keyframes bou{0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1}}`}</style>

      <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'16px'}}>
        <button onClick={onBack} style={{background:'transparent',color:'var(--txt)',border:'1px solid var(--b)',padding:'7px 14px',borderRadius:'8px',fontSize:'12px',cursor:'pointer',fontFamily:'DM Sans, sans-serif'}}>
          ← Volver
        </button>
        <h2 style={{fontFamily:'Bebas Neue, sans-serif',fontSize:'19px',color:'var(--acc)',letterSpacing:'1px',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
          {currentVideo.title.length > 50 ? currentVideo.title.substring(0,50)+'...' : currentVideo.title}
        </h2>
      </div>

      <div style={{background:'var(--s1)',border:'1px solid var(--b)',borderRadius:'10px',padding:'12px',display:'flex',gap:'12px',alignItems:'center',marginBottom:'16px'}}>
        <img src={currentVideo.thumb} alt="" style={{width:'90px',height:'50px',borderRadius:'6px',objectFit:'cover',background:'var(--s2)',flexShrink:0}} />
        <div>
          <div style={{fontSize:'13px',fontWeight:500}}>{currentVideo.title}</div>
          <div style={{fontSize:'11px',color:'var(--mut)',marginTop:'2px'}}>{currentVideo.equipo === 'realmadrid' ? '⚽ Real Madrid' : '🔵 Barcelona'}</div>
        </div>
      </div>

      {showResult && finalParts.length > 0 ? (
        <ResultadoGuion finalParts={finalParts} onDone={handleDone} onCopyAll={() => {}} />
      ) : (
        <>
          {steps.map((s, i) => (
            <div key={i} style={{background:'var(--s1)',border:`1px solid ${brd(i)}`,borderRadius:'11px',marginBottom:'13px',overflow:'hidden',transition:'border-color .3s'}}>
              <div style={{padding:'15px 20px',display:'flex',alignItems:'center',gap:'11px'}}>
                <div style={{width:'29px',height:'29px',borderRadius:'50%',background:numBg(i),border:`1px solid ${brd(i)}`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Bebas Neue, sans-serif',fontSize:'14px',color:numColor(i),flexShrink:0,transition:'all .3s'}}>
                  {step > i ? '✓' : i+1}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:'14px',fontWeight:500}}>{s.label}</div>
                  <div style={{fontSize:'11px',color:'var(--mut)',marginTop:'1px'}}>{s.sub}</div>
                </div>
                <span style={{fontSize:'11px',padding:'3px 9px',borderRadius:'20px',fontWeight:500,background:badgeBg(i),color:badgeColor(i)}}>
                  {badgeText(i)}
                </span>
              </div>

              {i > 0 && (step === i || step > i) && (
                <>
                  <ProgressBar pct={step > i ? 100 : pct[i]} done={step > i} />
                  {step === i && <div style={{padding:'3px 20px 0',fontSize:'11px',color:'var(--acc)',textAlign:'right'}}>{pct[i]}%</div>}
                </>
              )}

              <div style={{padding:'0 20px 15px'}}>
                {i === 0 && (
                  <>
                    {!currentVideo.transcripcion ? (
                      <TranscripcionInput onSave={handleSaveTranscripcion} />
                    ) : (
                      <>
                        <textarea readOnly value={currentVideo.transcripcion}
                          style={{width:'100%',background:'var(--s2)',border:'1px solid var(--b)',color:'var(--mut)',padding:'12px',borderRadius:'8px',fontSize:'12px',lineHeight:1.6,resize:'vertical',outline:'none',minHeight:'80px',marginTop:'8px',fontFamily:'DM Sans, sans-serif'}}
                        />
                        <p style={{fontSize:'11px',color:'var(--mut)',marginTop:'4px',marginBottom:'10px'}}>{currentVideo.transcripcion.length.toLocaleString()} caracteres</p>
                        {step === 0 && (
                          <>
                            <button onClick={startProcess} disabled={loading}
                              style={{background:'var(--acc)',color:'#000',border:'none',padding:'10px 20px',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer',width:'100%',fontFamily:'DM Sans, sans-serif',opacity:loading?0.4:1}}>
                              ▶ GENERAR GUIÓN COMPLETO
                            </button>
                            {error && <p style={{fontSize:'12px',color:'var(--red)',marginTop:'8px'}}>⚠ {error}</p>}
                          </>
                        )}
                      </>
                    )}
                  </>
                )}

                {i === 1 && step > 1 && expanded && (
                  <>
                    <div style={{background:'var(--s2)',border:'1px solid var(--b)',borderRadius:'8px',padding:'12px',fontSize:'13px',lineHeight:1.7,whiteSpace:'pre-wrap',maxHeight:'200px',overflowY:'auto',marginTop:'8px'}}>{expanded}</div>
                  </>
                )}
                {i === 1 && step === 1 && loading && <Loader text={loadingText} />}

                {i === 2 && step > 2 && parts.length > 0 && (
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px',marginTop:'8px'}}>
                    {parts.map((p, pi) => (
                      <div key={pi} style={{background:'var(--s2)',border:'1px solid var(--b)',borderRadius:'8px',padding:'11px'}}>
                        <h4 style={{fontFamily:'Bebas Neue, sans-serif',fontSize:'13px',color:'var(--acc)',marginBottom:'5px',letterSpacing:'1px'}}>PARTE {pi+1}</h4>
                        <p style={{fontSize:'12px',lineHeight:1.6,color:'var(--mut)'}}>{p.substring(0,150)}...</p>
                      </div>
                    ))}
                  </div>
                )}
                {i === 2 && step === 2 && loading && <Loader text={loadingText} />}
                {i === 3 && step === 3 && loading && <Loader text={loadingText} />}
              </div>
            </div>
          ))}

          {finalParts.length > 0 && (
            <ResultadoGuion finalParts={finalParts} onDone={handleDone} onCopyAll={() => {}} />
          )}
        </>
      )}
    </div>
  );
}
