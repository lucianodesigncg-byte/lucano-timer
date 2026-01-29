import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

const BRAND_NAME = 'LUCANO DESIGNER3D';

const playSound = (type: 'start' | 'stop' | 'alarm' | 'success') => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
    const trigger = (freq: number, dur: number, typeWave: OscillatorType = 'sine', vol = 0.1) => {
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
    if (type === 'start') trigger(880, 0.15);
    if (type === 'stop') trigger(440, 0.15);
    if (type === 'success') { trigger(523, 0.2); setTimeout(() => trigger(659, 0.3), 100); }
    if (type === 'alarm') { 
      trigger(1000, 0.1, 'square', 0.15); 
      setTimeout(() => trigger(1000, 0.1, 'square', 0.15), 200);
    }
  } catch (e) { console.warn("Audio Context error", e); }
};

const App = () => {
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem('lucano_master_v12');
      if (!saved) return { client: '', project: '', notes: '', rate: 120, seconds: 0, active: false, goalMinutes: 0, history: [] };
      const parsed = JSON.parse(saved);
      // Garantir que history seja sempre um array e contenha dados limpos
      return {
        ...parsed,
        history: Array.isArray(parsed.history) ? parsed.history : []
      };
    } catch {
      return { client: '', project: '', notes: '', rate: 120, seconds: 0, active: false, goalMinutes: 0, history: [] };
    }
  });

  const [activeTab, setActiveTab] = useState('tracker');
  const [showCalc, setShowCalc] = useState(false);
  const [calc, setCalc] = useState({ h: 0, e: 0 });
  const [isAlarm, setIsAlarm] = useState(false);
  
  const timerRef = useRef<any>(null);
  const beepRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('lucano_master_v12', JSON.stringify(data));
  }, [data]);

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

  useEffect(() => {
    const goalSec = (data.goalMinutes || 0) * 60;
    if (data.active && goalSec > 0 && data.seconds >= goalSec && !isAlarm) {
      setIsAlarm(true);
      playSound('alarm');
    }
  }, [data.seconds, data.active, data.goalMinutes, isAlarm]);

  useEffect(() => {
    if (isAlarm) {
      beepRef.current = setInterval(() => playSound('alarm'), 3000);
    } else {
      clearInterval(beepRef.current);
    }
    return () => clearInterval(beepRef.current);
  }, [isAlarm]);

  const formatT = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sc = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sc.toString().padStart(2, '0')}`;
  };

  const getPrice = (s: number) => (s / 3600) * (data.rate || 0);
  const cur = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleSave = () => {
    if (data.seconds < 1) return;
    playSound('success');
    const entry = {
      id: Date.now().toString(), // Salvar ID como string para evitar bugs
      project: String(data.project || "PROJETO S/ NOME"),
      client: String(data.client || "CLIENTE S/ NOME"),
      notes: String(data.notes || ""),
      time: Number(data.seconds),
      rate: Number(data.rate),
      total: Number(getPrice(data.seconds)),
      date: new Date().toLocaleDateString('pt-BR')
    };
    setData((p: any) => ({ 
      ...p, 
      seconds: 0, 
      active: false, 
      history: [entry, ...p.history] 
    }));
    setActiveTab('arquivo');
  };

  const resumeProject = (h: any) => {
    if (data.seconds > 0 && !confirm("Substituir o cronômetro atual?")) return;
    setData((p: any) => ({
      ...p,
      project: String(h.project),
      client: String(h.client),
      notes: String(h.notes),
      rate: Number(h.rate),
      seconds: Number(h.time),
      active: false
    }));
    setActiveTab('tracker');
    playSound('start');
  };

  const exportDoc = (h: any, type: 'txt' | 'doc') => {
    const content = `${BRAND_NAME} - RELATÓRIO\n\nPROJETO: ${h.project}\nCLIENTE: ${h.client}\nDATA: ${h.date}\nTEMPO: ${formatT(h.time)}\nVALOR HORA: ${cur(h.rate)}\nTOTAL: ${cur(h.total)}\n\nNOTAS:\n${h.notes || '-'}`;
    const blob = new Blob([content], { type: type === 'txt' ? 'text/plain' : 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Relatorio_${h.project}.${type}`;
    a.click();
  };

  const shareWA = (h: any) => {
    const msg = `*RELATÓRIO LUCANO DESIGNER3D*\n*Projeto:* ${h.project}\n*Cliente:* ${h.client}\n*Tempo:* ${formatT(h.time)}\n*Total:* ${cur(h.total)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#0d1525] text-white font-sans overflow-hidden select-none">
      
      {/* HEADER */}
      <header className="pt-8 pb-4 text-center">
        <h1 className="text-2xl font-black italic tracking-tighter uppercase">{BRAND_NAME}</h1>
        <p className="text-[8px] tracking-[0.4em] text-cyan-400 font-bold opacity-60">MASTER TRACKER CONTROL</p>
      </header>

      {/* ABAS */}
      <nav className="flex px-6 gap-3 py-4">
        <button onClick={() => setActiveTab('tracker')} className={`flex-1 py-4 rounded-2xl text-[10px] font-black tracking-widest transition-all ${activeTab === 'tracker' ? 'bg-[#0891b2] shadow-lg shadow-cyan-900/40' : 'bg-[#1a2536] text-slate-500'}`}>TRACKER</button>
        <button onClick={() => setActiveTab('arquivo')} className={`flex-1 py-4 rounded-2xl text-[10px] font-black tracking-widest transition-all ${activeTab === 'arquivo' ? 'bg-[#0891b2] shadow-lg shadow-cyan-900/40' : 'bg-[#1a2536] text-slate-500'}`}>ARQUIVO</button>
        <button onClick={() => setShowCalc(!showCalc)} className={`w-12 flex items-center justify-center rounded-2xl bg-[#1a2536] border border-white/5 ${showCalc ? 'text-cyan-400' : 'text-slate-500'}`}>
          <i className="fas fa-calculator"></i>
        </button>
      </nav>

      <main className="flex-1 overflow-y-auto px-6 pb-8 no-scrollbar relative">
        
        {/* CALCULADORA */}
        {showCalc && (
          <div className="absolute top-0 inset-x-6 z-50 bg-[#1e293b] border border-cyan-500/30 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Calculadora Rápida</span>
                <button onClick={() => setShowCalc(false)} className="text-slate-500 hover:text-white"><i className="fas fa-times"></i></button>
             </div>
             <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                   <label className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Horas Est.</label>
                   <input type="number" className="w-full bg-black/40 p-3 rounded-xl text-xs font-bold border border-white/5 outline-none" value={calc.h} onChange={e => setCalc({...calc, h: parseFloat(e.target.value) || 0})} />
                </div>
                <div>
                   <label className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Extras R$</label>
                   <input type="number" className="w-full bg-black/40 p-3 rounded-xl text-xs font-bold border border-white/5 outline-none" value={calc.e} onChange={e => setCalc({...calc, e: parseFloat(e.target.value) || 0})} />
                </div>
             </div>
             <div className="bg-cyan-500/10 p-4 rounded-2xl text-center border border-cyan-500/20">
                <span className="text-[9px] font-bold text-cyan-400 block mb-1">ORÇAMENTO FINAL</span>
                <div className="text-2xl font-black">{cur((calc.h * data.rate) + calc.e)}</div>
             </div>
          </div>
        )}

        {activeTab === 'tracker' ? (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            
            {/* TIMER */}
            <div className={`bg-[#1a2536] rounded-[2.5rem] p-10 text-center border border-white/5 shadow-2xl relative transition-all duration-500 ${isAlarm ? 'ring-4 ring-red-500' : ''}`}>
               <div className={`text-7xl font-black font-mono my-2 tracking-tighter ${data.active ? 'text-white timer-glow' : 'text-slate-600'}`}>
                  {formatT(data.seconds)}
               </div>
               <div className="text-3xl font-black text-[#4ade80] mt-1 mb-8">{cur(getPrice(data.seconds))}</div>
               
               <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => { setData({...data, active: !data.active}); playSound(data.active ? 'stop' : 'start'); }} className={`py-5 rounded-2xl font-black text-[11px] tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 ${data.active ? 'bg-white text-black' : 'bg-[#0891b2] text-white shadow-lg shadow-cyan-900/40'}`}>
                    <i className={`fas ${data.active ? 'fa-pause' : 'fa-play'}`}></i> {data.active ? 'PAUSAR' : 'INICIAR'}
                  </button>
                  <button onClick={handleSave} className="py-5 bg-[#10b981] text-white rounded-2xl font-black text-[11px] tracking-widest active:scale-95 flex items-center justify-center gap-3 shadow-lg shadow-emerald-900/40">
                    <i className="fas fa-check"></i> SALVAR
                  </button>
               </div>
               {isAlarm && (
                 <button onClick={() => setIsAlarm(false)} className="w-full mt-4 py-3 bg-red-600 rounded-xl text-[10px] font-black uppercase">Desligar Alerta</button>
               )}
            </div>

            {/* CAMPOS */}
            <div className="bg-[#1a2536]/50 p-6 rounded-[2.5rem] border border-white/5 space-y-5">
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1 block">R$ Valor Hora</label>
                     <input type="number" className="w-full bg-[#0d1525] p-4 rounded-2xl border border-white/5 font-black text-white text-base outline-none focus:border-cyan-500/50" value={data.rate} onChange={e => setData({...data, rate: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div>
                     <label className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1 block">Meta Alerta (Min)</label>
                     <input type="number" className="w-full bg-[#0d1525] p-4 rounded-2xl border border-white/5 font-black text-white text-base outline-none focus:border-red-500/50" value={data.goalMinutes || ''} onChange={e => setData({...data, goalMinutes: parseInt(e.target.value) || 0})} />
                  </div>
               </div>
               <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1 block">Cliente</label>
                  <input className="w-full bg-[#0d1525] p-4 rounded-2xl border border-white/5 font-black uppercase text-xs outline-none focus:border-cyan-500/50" placeholder="NOME DO CLIENTE" value={data.client} onChange={e => setData({...data, client: e.target.value})} />
               </div>
               <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1 block">Projeto</label>
                  <input className="w-full bg-[#0d1525] p-4 rounded-2xl border border-white/5 font-black uppercase text-xs outline-none focus:border-cyan-500/50" placeholder="TÍTULO DO PROJETO" value={data.project} onChange={e => setData({...data, project: e.target.value})} />
               </div>
               <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1 block">Anotações do Projeto</label>
                  <textarea className="w-full bg-[#0d1525] p-4 rounded-2xl border border-white/5 text-xs text-slate-300 font-medium h-28 outline-none resize-none leading-relaxed" placeholder="Medidas, referências e observações..." value={data.notes} onChange={e => setData({...data, notes: e.target.value})} />
               </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5 animate-in slide-in-from-right-4">
            {data.history.map((h: any) => (
              <div key={String(h.id)} className="bg-[#1a2536] p-6 rounded-[2.5rem] border border-white/5 space-y-4 shadow-xl">
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-3">
                    <h4 className="font-black text-sm text-white uppercase truncate tracking-tight">{String(h.project)}</h4>
                    <p className="text-[11px] font-bold text-cyan-400 uppercase tracking-wide">{String(h.client)}</p>
                    <div className="flex gap-4 mt-3">
                       <span className="text-[9px] text-slate-500 font-black uppercase"><i className="fas fa-calendar mr-1 opacity-50"></i> {String(h.date)}</span>
                       <span className="text-[9px] text-slate-500 font-black uppercase"><i className="fas fa-clock mr-1 opacity-50"></i> {formatT(Number(h.time))}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#4ade80] font-black text-xl">{cur(Number(h.total))}</div>
                    <button onClick={() => resumeProject(h)} className="mt-3 text-[9px] font-black uppercase text-cyan-400 border border-cyan-400/20 px-4 py-2 rounded-xl hover:bg-cyan-600 hover:text-white transition-all">RETOMAR</button>
                  </div>
                </div>

                {h.notes && (
                   <div className="p-4 bg-black/40 rounded-2xl text-[10px] text-slate-400 italic border-l-4 border-cyan-500/30 leading-relaxed">
                      {String(h.notes)}
                   </div>
                )}

                <div className="grid grid-cols-4 gap-3 pt-3 border-t border-white/5">
                   <button onClick={() => shareWA(h)} className="flex flex-col items-center justify-center p-3 bg-emerald-500/5 rounded-2xl hover:bg-emerald-500/20">
                      <i className="fab fa-whatsapp text-emerald-400 text-base mb-1"></i>
                      <span className="text-[8px] font-black uppercase">Whats</span>
                   </button>
                   <button onClick={() => exportDoc(h, 'txt')} className="flex flex-col items-center justify-center p-3 bg-slate-500/5 rounded-2xl hover:bg-slate-500/20">
                      <i className="fas fa-file-alt text-slate-400 text-base mb-1"></i>
                      <span className="text-[8px] font-black uppercase">TXT</span>
                   </button>
                   <button onClick={() => exportDoc(h, 'doc')} className="flex flex-col items-center justify-center p-3 bg-blue-500/5 rounded-2xl hover:bg-blue-500/20">
                      <i className="fas fa-file-word text-blue-400 text-base mb-1"></i>
                      <span className="text-[8px] font-black uppercase">Word</span>
                   </button>
                   <button onClick={() => confirm("Apagar?") && setData((p:any) => ({...p, history: p.history.filter((x:any) => x.id !== h.id)}))} className="flex flex-col items-center justify-center p-3 bg-red-500/5 rounded-2xl hover:bg-red-500/20">
                      <i className="fas fa-trash text-red-500 text-base mb-1"></i>
                      <span className="text-[8px] font-black uppercase">Apagar</span>
                   </button>
                </div>
              </div>
            ))}
            {data.history.length === 0 && (
              <div className="text-center py-20 opacity-20">
                <i className="fas fa-archive text-5xl mb-4 block"></i>
                <p className="text-[10px] font-black uppercase tracking-widest">Sem Histórico</p>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="p-4 bg-black/40 text-center border-t border-white/5">
         <span className="text-[9px] font-black text-slate-700 uppercase tracking-[0.4em]">PRO MASTER CONTROL • V12.0</span>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);