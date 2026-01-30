import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

const BRAND_NAME = 'LUCANO DESIGNER3D';
const ADDRESS = 'Rua Betânia N392 Bairro Oliveira';
const CONTACT = 'Tel / WhatsApp: 74 9 91108629';

// Sistema de áudio profissional
const playSound = (type: 'start' | 'stop' | 'alarm' | 'success') => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
    const trigger = (freq: number, dur: number, typeWave: OscillatorType = 'sine', vol = 0.2) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = typeWave;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.02);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    };
    if (type === 'start') trigger(880, 0.1);
    if (type === 'stop') trigger(440, 0.1);
    if (type === 'success') { trigger(523, 0.2); setTimeout(() => trigger(659, 0.2), 100); }
    if (type === 'alarm') { 
      trigger(1000, 0.1, 'square', 0.2); 
      setTimeout(() => trigger(1000, 0.1, 'square', 0.2), 200);
    }
  } catch (e) {}
};

const App = () => {
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem('lucano_v33_modern');
      if (!saved) return { client: '', project: '', notes: '', rate: 25, seconds: 0, active: false, goalMinutes: 60, history: [] };
      const parsed = JSON.parse(saved);
      return { ...parsed, active: false, history: Array.isArray(parsed.history) ? parsed.history : [] };
    } catch {
      return { client: '', project: '', notes: '', rate: 25, seconds: 0, active: false, goalMinutes: 60, history: [] };
    }
  });

  const [activeTab, setActiveTab] = useState<'controle' | 'historico'>('controle');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAlarmChoice, setShowAlarmChoice] = useState(false);
  
  const timerRef = useRef<any>(null);
  const alarmRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('lucano_v33_modern', JSON.stringify(data));
  }, [data]);

  // Lógica do cronômetro progressivo
  useEffect(() => {
    if (data.active) {
      timerRef.current = setInterval(() => {
        setData((p: any) => ({ ...p, seconds: p.seconds + 1 }));
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [data.active]);

  // Meta de tempo - Verificação
  useEffect(() => {
    const goalSec = (data.goalMinutes || 0) * 60;
    if (data.active && goalSec > 0 && data.seconds >= goalSec && !showAlarmChoice) {
      setData(prev => ({ ...prev, active: false }));
      setShowAlarmChoice(true);
      playSound('alarm');
    }
  }, [data.seconds, data.active, data.goalMinutes, showAlarmChoice]);

  // Som do Alarme contínuo enquanto decide
  useEffect(() => {
    if (showAlarmChoice) {
      alarmRef.current = setInterval(() => playSound('alarm'), 2500);
    } else {
      clearInterval(alarmRef.current);
    }
    return () => clearInterval(alarmRef.current);
  }, [showAlarmChoice]);

  const formatT = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sc = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sc.toString().padStart(2, '0')}`;
  };

  const cur = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // SALVAR: Adiciona ao histórico e ZERA TUDO (Reset)
  const handleSave = () => {
    if (data.seconds < 1) return alert("Inicie o cronômetro antes de salvar.");

    const now = new Date();
    const entry = {
      id: Date.now().toString(),
      project: String(data.project || "PROJETO SEM TÍTULO"),
      client: String(data.client || "CLIENTE GERAL"),
      notes: String(data.notes || ""),
      time: Number(data.seconds),
      rate: Number(data.rate),
      total: Number((data.seconds / 3600) * data.rate),
      date: now.toLocaleDateString('pt-BR'),
      startTime: new Date(now.getTime() - data.seconds * 1000).toLocaleString('pt-BR'),
      endTime: now.toLocaleString('pt-BR')
    };

    setData((p: any) => ({ 
      ...p, 
      seconds: 0, 
      active: false, 
      client: '',   // Reset Cliente
      project: '',  // Reset Projeto
      notes: '',    // Reset Notas
      history: [entry, ...p.history] 
    }));
    
    setShowAlarmChoice(false);
    setActiveTab('historico');
    playSound('success');
  };

  const resumeHistory = (h: any) => {
    setData((p: any) => ({
      ...p,
      project: String(h.project),
      client: String(h.client),
      notes: String(h.notes),
      rate: Number(h.rate),
      seconds: Number(h.time),
      active: true // Começa a contar automaticamente
    }));
    setShowAlarmChoice(false);
    setActiveTab('controle');
    playSound('start');
  };

  const exportWord = (title: string, tableRows: string[][], footerInfo: string, filename: string) => {
    const BOM = "\ufeff";
    let html = `
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif;">
        <h1 style="text-align: center; color: #475569;">${BRAND_NAME}</h1>
        <h2 style="text-align: center; background: #f1f5f9; padding: 10px;">${title}</h2>
        <table border="1" style="width: 100%; border-collapse: collapse;">
          ${tableRows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
        </table>
        <p style="text-align: right; font-weight: bold;">${footerInfo}</p>
      </body>
      </html>`;
    const blob = new Blob([BOM + html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.doc`;
    a.click();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectedProjects = data.history.filter((h: any) => selectedIds.includes(h.id));
  const sumTotal = selectedProjects.reduce((acc: number, h: any) => acc + h.total, 0);
  const sumSeconds = selectedProjects.reduce((acc: number, h: any) => acc + h.time, 0);

  return (
    <div className="flex flex-col h-screen w-full bg-[#020617] text-slate-100 overflow-hidden select-none">
      
      {/* HEADER DINÂMICO */}
      <header className="relative py-6 px-6 bg-slate-900 border-b border-white/5">
        <div className="text-center">
          <h1 className="text-2xl font-black italic tracking-tighter text-white uppercase">{BRAND_NAME}</h1>
          <div className="text-[10px] font-bold text-cyan-400 mt-1 uppercase opacity-60">
            {ADDRESS} • {CONTACT}
          </div>
        </div>
      </header>

      {/* NAVEGAÇÃO */}
      <nav className="flex bg-slate-950 border-b border-white/5 z-20">
        <button onClick={() => setActiveTab('controle')} className={`flex-1 py-4 flex flex-col items-center gap-1 ${activeTab === 'controle' ? 'text-cyan-400' : 'text-slate-500'}`}>
          <i className="fas fa-clock text-xl"></i>
          <span className="text-[9px] font-black uppercase tracking-widest">Controle Ativo</span>
        </button>
        <button onClick={() => setActiveTab('historico')} className={`flex-1 py-4 flex flex-col items-center gap-1 ${activeTab === 'historico' ? 'text-purple-400' : 'text-slate-500'}`}>
          <i className="fas fa-database text-xl"></i>
          <span className="text-[9px] font-black uppercase tracking-widest">Banco de Dados</span>
        </button>
      </nav>

      <main className="flex-1 overflow-y-auto px-6 py-6 no-scrollbar relative">
        
        {/* MODAL DE ALARME (PARAR OU CONTINUAR) */}
        {showAlarmChoice && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-sm">
             <div className="bg-slate-900 border-2 border-amber-500 rounded-[2.5rem] p-8 text-center shadow-[0_0_50px_rgba(245,158,11,0.3)] animate-bounce-short">
                <i className="fas fa-exclamation-triangle text-amber-500 text-5xl mb-4"></i>
                <h2 className="text-xl font-black text-white uppercase mb-2">Meta de Tempo Atingida!</h2>
                <p className="text-slate-400 text-sm mb-8 italic">O tempo estipulado encerrou.<br/>Deseja continuar o trabalho?</p>
                <div className="grid grid-cols-2 gap-4">
                   <button onClick={() => { setShowAlarmChoice(false); setData({...data, active: true}); playSound('start'); }} className="bg-emerald-600 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest">
                      CONTINUAR
                   </button>
                   <button onClick={() => { setShowAlarmChoice(false); playSound('stop'); }} className="bg-rose-600 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest">
                      PARAR
                   </button>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'controle' && (
          <div className="space-y-6 animate-in">
            
            {/* TIMER CARD */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-center shadow-2xl border border-white/5 relative overflow-hidden">
                <div className="text-[10px] font-black text-cyan-400/60 uppercase tracking-[0.3em] mb-2">Cronômetro de Precisão</div>
                <div className="text-7xl font-black font-mono text-white tracking-tighter my-2">{formatT(data.seconds)}</div>
                <div className="text-3xl font-black text-emerald-400 italic mb-8">{cur((data.seconds / 3600) * data.rate)}</div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <button onClick={() => { setData({...data, active: true}); playSound('start'); setShowAlarmChoice(false); }} className="bg-emerald-600 h-14 rounded-2xl font-black text-white text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                    INICIAR TRABALHO
                  </button>
                  <button onClick={() => { setData({...data, active: false}); playSound('stop'); }} className="bg-amber-600 h-14 rounded-2xl font-black text-white text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                    PAUSAR AGORA
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button onClick={handleSave} className="bg-rose-600 h-14 rounded-2xl font-black text-white text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                    FINALIZAR PROJETO
                  </button>
                  <button onClick={() => data.history[0] && resumeHistory(data.history[0])} className="bg-slate-700 h-14 rounded-2xl font-black text-white text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                    RETOMAR ÚLTIMO
                  </button>
                </div>

                <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-center gap-4">
                  <span className="text-[9px] font-black text-slate-500 uppercase">Alertar em (min):</span>
                  <input type="number" className="w-16 bg-black/40 text-center font-black text-cyan-400 border border-white/10 rounded-xl p-2 outline-none" value={data.goalMinutes} onChange={e => setData({...data, goalMinutes: parseInt(e.target.value) || 0})} />
                </div>
            </div>

            {/* FORMULÁRIO */}
            <div className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1 block">Cliente</label>
                    <input className="w-full bg-black/40 p-4 rounded-2xl border border-white/10 text-white font-bold uppercase text-xs outline-none focus:border-cyan-500 transition-all" placeholder="..." value={data.client} onChange={e => setData({...data, client: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1 block">Projeto</label>
                    <input className="w-full bg-black/40 p-4 rounded-2xl border border-white/10 text-white font-bold uppercase text-xs outline-none focus:border-cyan-500 transition-all" placeholder="..." value={data.project} onChange={e => setData({...data, project: e.target.value})} />
                  </div>
                </div>

                {/* ABA VALOR DA HORA */}
                <div className="bg-slate-950/60 p-5 rounded-3xl border border-white/5">
                   <div className="flex justify-between items-center mb-3">
                      <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Valor da Hora:</span>
                      <span className="text-xl font-black text-white italic">{cur(data.rate)}</span>
                   </div>
                   <input type="range" min="1" max="500" step="5" className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" value={data.rate} onChange={e => setData({...data, rate: parseInt(e.target.value)})} />
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1 block">Notas Técnicas</label>
                  <textarea className="w-full bg-black/40 p-4 rounded-3xl border border-white/10 text-xs text-slate-300 font-medium h-24 outline-none resize-none focus:border-purple-500 transition-all" placeholder="Ferragens, MDF, Medidas..." value={data.notes} onChange={e => setData({...data, notes: e.target.value})} />
                </div>
            </div>
          </div>
        )}

        {activeTab === 'historico' && (
          <div className="space-y-8 pb-20 animate-in">
            
            {/* CALCULADORA DE SOMA UNIFICADA */}
            {selectedIds.length > 0 && (
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl border border-purple-500/30 p-8 shadow-2xl">
                 <h2 className="text-lg font-black text-white mb-4 italic uppercase flex items-center gap-2">
                    <i className="fas fa-calculator text-purple-500"></i> Soma Unificada
                 </h2>
                 <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                       <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Tempo Total</span>
                       <span className="text-2xl font-black text-cyan-400 font-mono">{formatT(sumSeconds)}</span>
                    </div>
                    <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                       <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Valor Total</span>
                       <span className="text-2xl font-black text-emerald-400">{cur(sumTotal)}</span>
                    </div>
                 </div>
                 <button onClick={() => {
                    const rows = selectedProjects.map(p => [`${p.project} (${p.client})`, formatT(p.time), cur(p.total)]);
                    exportWord("SOMA UNIFICADA", rows, `SOMA TOTAL: ${cur(sumTotal)}`, "Relatorio_Unificado");
                 }} className="w-full bg-purple-600 text-white font-black py-4 rounded-2xl text-[10px] uppercase shadow-lg">
                    Exportar Soma para Word
                 </button>
              </div>
            )}

            {/* LISTAGEM HISTÓRICO */}
            <div className="space-y-10">
              {data.history.map((h: any) => (
                <div key={h.id} className="relative group">
                  <div className="absolute top-8 left-[-32px] z-10">
                    <input type="checkbox" className="w-6 h-6 rounded-lg bg-slate-800 border-2 border-slate-600 cursor-pointer accent-purple-500" checked={selectedIds.includes(h.id)} onChange={() => toggleSelect(h.id)} />
                  </div>

                  <div className="bg-slate-900 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                    <div className="bg-slate-800/60 p-6 flex justify-between items-center border-b border-white/5">
                       <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">{h.date}</span>
                       <span className="text-[10px] font-black text-emerald-500">{cur(h.total)}</span>
                    </div>
                    
                    <div className="p-8 space-y-4">
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                             <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Cliente</span>
                             <span className="text-xs font-black text-white">{h.client}</span>
                          </div>
                          <div>
                             <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Projeto</span>
                             <span className="text-xs font-black text-white">{h.project}</span>
                          </div>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                          <div>
                             <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Tempo Total</span>
                             <span className="text-sm font-black text-cyan-400 font-mono">{formatT(h.time)}</span>
                          </div>
                          <div className="flex gap-2">
                             <button onClick={() => resumeHistory(h)} className="flex-1 bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 py-2 rounded-xl text-[9px] font-black uppercase">Continuar</button>
                             <button onClick={() => {
                                exportWord("RELATÓRIO INDIVIDUAL", [["CLIENTE", h.client], ["PROJETO", h.project], ["TEMPO", formatT(h.time)], ["TOTAL", cur(h.total)]], `TOTAL: ${cur(h.total)}`, `Relatorio_${h.project}`);
                             }} className="flex-1 bg-cyan-600/10 text-cyan-400 border border-cyan-500/20 py-2 rounded-xl text-[9px] font-black uppercase">Word</button>
                             <button onClick={() => confirm("Apagar?") && setData({...data, history: data.history.filter((x:any) => x.id !== h.id)})} className="p-2 bg-rose-600/10 text-rose-500 border border-rose-500/20 rounded-xl"><i className="fas fa-trash"></i></button>
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="p-4 bg-slate-950 border-t border-white/5 text-center">
         <div className="text-[8px] font-black text-slate-600 uppercase tracking-[0.4em]">
           LUCANO DESIGNER3D PRO V33.0 • FLUXO INTELIGENTE
         </div>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);