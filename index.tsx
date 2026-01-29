import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

const BRAND_NAME = 'LUCANO DESIGNER3D';

const playSound = (type: 'start' | 'stop' | 'alarm' | 'success') => {
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
  if (type === 'start') trigger(880, 0.2);
  if (type === 'stop') trigger(440, 0.2);
  if (type === 'success') { trigger(523, 0.3); setTimeout(() => trigger(659, 0.4), 150); }
  if (type === 'alarm') { 
    trigger(1000, 0.1, 'square', 0.2); 
    setTimeout(() => trigger(1000, 0.1, 'square', 0.2), 200);
  }
};

const App = () => {
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem('lucano_master_v10');
      return saved ? JSON.parse(saved) : { 
        client: '', project: '', notes: '', rate: 20, seconds: 0, active: false, goalMinutes: 1, history: [] 
      };
    } catch {
      return { client: '', project: '', notes: '', rate: 20, seconds: 0, active: false, goalMinutes: 1, history: [] };
    }
  });

  const [activeTab, setActiveTab] = useState('tracker');
  const [showCalc, setShowCalc] = useState(false);
  const [calc, setCalc] = useState({ horas: 0, extras: 0 });
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  
  const timerRef = useRef<any>(null);
  const beepRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('lucano_master_v10', JSON.stringify(data));
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
    if (data.active && goalSec > 0 && data.seconds >= goalSec && !isAlarmActive) {
      setIsAlarmActive(true);
      window.alert(`🔔 ALARME: META ATINGIDA!\nProjeto: ${data.project}`);
    }
  }, [data.seconds, data.active, data.goalMinutes]);

  useEffect(() => {
    if (isAlarmActive) {
      playSound('alarm');
      beepRef.current = setInterval(() => playSound('alarm'), 2000);
    } else {
      clearInterval(beepRef.current);
    }
    return () => clearInterval(beepRef.current);
  }, [isAlarmActive]);

  const formatT = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sc = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sc.toString().padStart(2, '0')}`;
  };

  const getPrice = (s: number) => (s / 3600) * (data.rate || 0);
  const toBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleSave = () => {
    if (data.seconds < 1) return;
    playSound('success');
    const entry = {
      id: Date.now(),
      project: data.project || "PROJETO SEM NOME",
      client: data.client || "CLIENTE AVULSO",
      notes: data.notes || "",
      time: data.seconds,
      rate: data.rate,
      total: getPrice(data.seconds),
      date: new Date().toLocaleDateString('pt-BR')
    };
    setData((p: any) => ({ ...p, seconds: 0, active: false, history: [entry, ...p.history] }));
    setActiveTab('arquivo');
  };

  const resumeHistory = (h: any) => {
    if (data.seconds > 0 && !confirm("Deseja continuar este projeto e descartar o tempo atual?")) return;
    setData((p: any) => ({
      ...p,
      project: h.project,
      client: h.client,
      notes: h.notes,
      rate: h.rate,
      seconds: h.time,
      active: false
    }));
    setActiveTab('tracker');
    playSound('start');
  };

  const exportFile = (h: any, type: 'txt' | 'doc') => {
    const content = `LUCANO DESIGNER3D - RELATÓRIO\n\nPROJETO: ${h.project}\nCLIENTE: ${h.client}\nTEMPO: ${formatT(h.time)}\nVALOR HORA: ${toBRL(h.rate)}\nTOTAL: ${toBRL(h.total)}\nDATA: ${h.date}\n\nANOTAÇÕES:\n${h.notes || '-'}`;
    const blob = new Blob([content], { type: type === 'txt' ? 'text/plain' : 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Relatorio_${h.project}.${type}`;
    a.click();
  };

  const shareWA = (h: any) => {
    const msg = `*RELATÓRIO LUCANO DESIGNER3D*\n\n*Projeto:* ${h.project}\n*Cliente:* ${h.client}\n*Tempo:* ${formatT(h.time)}\n*Total:* ${toBRL(h.total)}\n\n*Notas:* ${h.notes || '-'}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#0d1525] text-white font-sans overflow-hidden">
      
      {/* HEADER */}
      <header className="pt-8 pb-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-slate-500 shadow-[0_0_10px_white]"></div>
          <h1 className="text-2xl font-black italic tracking-tighter uppercase">{BRAND_NAME}</h1>
        </div>
        <p className="text-[8px] tracking-[0.4em] text-cyan-400 font-bold opacity-70">TIME INTELLIGENCE SYSTEM</p>
      </header>

      {/* TABS - IGUAL AO PRINT */}
      <nav className="flex px-6 gap-3 mb-6">
        <button onClick={() => setActiveTab('tracker')} className={`flex-1 py-4 rounded-2xl text-[10px] font-black tracking-[0.2em] transition-all shadow-lg ${activeTab === 'tracker' ? 'bg-[#0891b2]' : 'bg-[#1a2536] text-slate-500'}`}>TRACKER</button>
        <button onClick={() => setActiveTab('arquivo')} className={`flex-1 py-4 rounded-2xl text-[10px] font-black tracking-[0.2em] transition-all shadow-lg ${activeTab === 'arquivo' ? 'bg-[#0891b2]' : 'bg-[#1a2536] text-slate-500'}`}>ARQUIVO</button>
      </nav>

      <main className="flex-1 overflow-y-auto px-6 pb-8 no-scrollbar relative">
        
        {/* CALCULADORA */}
        {showCalc && (
          <div className="absolute top-0 inset-x-6 z-50 bg-[#1e293b] border border-cyan-500/30 rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95">
             <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Calculadora de Orçamento</span>
                <button onClick={() => setShowCalc(false)} className="text-slate-500"><i className="fas fa-times"></i></button>
             </div>
             <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                   <label className="text-[8px] font-bold text-slate-500 uppercase block mb-1 ml-1">Horas Est.</label>
                   <input type="number" className="w-full bg-black/40 p-3 rounded-xl text-sm font-bold border border-white/5 outline-none" value={calc.horas} onChange={e => setCalc({...calc, horas: parseFloat(e.target.value) || 0})} />
                </div>
                <div>
                   <label className="text-[8px] font-bold text-slate-500 uppercase block mb-1 ml-1">Extras R$</label>
                   <input type="number" className="w-full bg-black/40 p-3 rounded-xl text-sm font-bold border border-white/5 outline-none" value={calc.extras} onChange={e => setCalc({...calc, extras: parseFloat(e.target.value) || 0})} />
                </div>
             </div>
             <div className="bg-cyan-500/10 p-4 rounded-2xl text-center border border-cyan-500/20">
                <span className="text-[9px] font-bold text-cyan-400 block mb-1 tracking-widest">ORÇAMENTO ESTIMADO</span>
                <div className="text-2xl font-black">{toBRL((calc.horas * data.rate) + calc.extras)}</div>
             </div>
          </div>
        )}

        {activeTab === 'tracker' ? (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            
            {/* TIMER CARD PRINCIPAL */}
            <div className={`bg-[#1a2536] rounded-[2.5rem] p-10 text-center border border-white/5 shadow-2xl relative transition-all duration-500 ${isAlarmActive ? 'ring-4 ring-red-500/50 scale-[1.02]' : ''}`}>
               <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em] block mb-4">Sessão em Andamento</span>
               <div className={`text-7xl font-black font-mono my-2 tracking-tighter ${data.active ? 'text-white timer-glow' : 'text-slate-600'}`}>
                  {formatT(data.seconds)}
               </div>
               <div className="text-3xl font-black text-[#4ade80] mt-1 mb-8 drop-shadow-lg">{toBRL(getPrice(data.seconds))}</div>
               
               <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => { setData({...data, active: !data.active}); playSound(data.active ? 'stop' : 'start'); }} className={`py-5 rounded-2xl font-black text-[11px] tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 ${data.active ? 'bg-white text-black' : 'bg-[#0891b2] text-white'}`}>
                    <i className={`fas ${data.active ? 'fa-pause' : 'fa-play'}`}></i> {data.active ? 'PAUSAR' : 'INICIAR'}
                  </button>
                  <button onClick={handleSave} className="py-5 bg-[#10b981] text-white rounded-2xl font-black text-[11px] tracking-widest active:scale-95 flex items-center justify-center gap-3 shadow-lg shadow-emerald-900/20">
                    <i className="fas fa-check"></i> SALVAR
                  </button>
               </div>

               {isAlarmActive && (
                 <button onClick={() => setIsAlarmActive(false)} className="w-full mt-5 py-4 bg-red-600 rounded-2xl text-[10px] font-black uppercase animate-pulse shadow-xl shadow-red-900/40">Parar Alarme</button>
               )}
            </div>

            {/* FORMULÁRIO DE DADOS */}
            <div className="bg-[#1a2536]/50 p-6 rounded-[2.5rem] border border-white/5 space-y-6">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                     <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Valor/Hora</label>
                     <div className="flex items-center bg-[#0d1525] p-4 rounded-2xl border border-white/5">
                        <span className="text-cyan-400 text-xs font-black mr-2">R$</span>
                        <input type="number" className="bg-transparent w-full font-black text-white outline-none text-base" value={data.rate} onChange={e => setData({...data, rate: parseFloat(e.target.value) || 0})} />
                     </div>
                  </div>
                  <div className="space-y-1">
                     <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Meta (Min)</label>
                     <div className="flex items-center bg-[#0d1525] p-4 rounded-2xl border border-white/5">
                        <i className="fas fa-clock text-red-500 text-xs mr-3 opacity-50"></i>
                        <input type="number" className="bg-transparent w-full font-black text-white outline-none text-base" value={data.goalMinutes || ''} onChange={e => setData({...data, goalMinutes: parseInt(e.target.value) || 0})} />
                     </div>
                  </div>
               </div>
               
               <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Cliente / Empresa</label>
                  <input className="w-full bg-[#0d1525] p-4 rounded-2xl border border-white/5 font-black uppercase text-xs tracking-wider outline-none focus:border-cyan-500/50" placeholder="DIGITE O NOME DO CLIENTE" value={data.client} onChange={e => setData({...data, client: e.target.value})} />
               </div>
               
               <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Projeto / Ambiente</label>
                  <input className="w-full bg-[#0d1525] p-4 rounded-2xl border border-white/5 font-black uppercase text-xs tracking-wider outline-none focus:border-cyan-500/50" placeholder="EX: COZINHA DE LUXO" value={data.project} onChange={e => setData({...data, project: e.target.value})} />
               </div>

               <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Anotações e Medidas</label>
                  <textarea className="w-full bg-[#0d1525] p-4 rounded-2xl border border-white/5 text-xs text-slate-300 font-medium h-32 outline-none resize-none leading-relaxed placeholder:opacity-20" placeholder="Pé direito, revestimentos, medidas da parede, etc..." value={data.notes} onChange={e => setData({...data, notes: e.target.value})} />
               </div>

               <button onClick={() => setShowCalc(true)} className="w-full py-4 bg-[#1a2536] border border-white/10 rounded-2xl text-[9px] font-black uppercase tracking-widest text-cyan-400 hover:bg-cyan-900/20 transition-all flex items-center justify-center gap-2">
                 <i className="fas fa-calculator"></i> Abrir Calculadora de Orçamento
               </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 animate-in slide-in-from-right-4">
            {data.history.map((h: any) => (
              <div key={h.id} className="bg-[#1a2536] p-6 rounded-[2.5rem] border border-white/5 space-y-4 shadow-xl">
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-4">
                    <h4 className="font-black text-xs text-white uppercase truncate tracking-wider">{h.project}</h4>
                    <p className="text-[10px] font-bold text-cyan-400 uppercase mt-1">{h.client}</p>
                    <div className="flex gap-4 mt-3">
                       <span className="text-[8px] text-slate-500 font-black uppercase"><i className="fas fa-calendar mr-1 opacity-40"></i> {h.date}</span>
                       <span className="text-[8px] text-slate-500 font-black uppercase"><i className="fas fa-stopwatch mr-1 opacity-40"></i> {formatT(h.time)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#4ade80] font-black text-xl drop-shadow-md">{toBRL(h.total)}</div>
                    <button onClick={() => resumeHistory(h)} className="mt-3 text-[8px] font-black uppercase text-cyan-400 border border-cyan-400/20 px-4 py-2 rounded-xl hover:bg-cyan-600 hover:text-white transition-all">RETOMAR</button>
                  </div>
                </div>

                {h.notes && (
                   <div className="p-4 bg-black/40 rounded-2xl text-[10px] text-slate-400 italic border-l-4 border-cyan-500/30 line-clamp-2 leading-relaxed">
                      "{h.notes}"
                   </div>
                )}

                <div className="grid grid-cols-4 gap-3 pt-3 border-t border-white/5">
                   <button onClick={() => shareWA(h)} className="flex flex-col items-center justify-center p-3 bg-emerald-500/10 rounded-2xl hover:bg-emerald-500/20 transition-all">
                      <i className="fab fa-whatsapp text-emerald-400 text-base mb-1"></i>
                      <span className="text-[7px] font-black uppercase text-emerald-400">WhatsApp</span>
                   </button>
                   <button onClick={() => exportFile(h, 'txt')} className="flex flex-col items-center justify-center p-3 bg-slate-500/10 rounded-2xl hover:bg-slate-500/20 transition-all">
                      <i className="fas fa-file-alt text-slate-400 text-base mb-1"></i>
                      <span className="text-[7px] font-black uppercase text-slate-400">TXT</span>
                   </button>
                   <button onClick={() => exportFile(h, 'doc')} className="flex flex-col items-center justify-center p-3 bg-blue-500/10 rounded-2xl hover:bg-blue-500/20 transition-all">
                      <i className="fas fa-file-word text-blue-400 text-base mb-1"></i>
                      <span className="text-[7px] font-black uppercase text-blue-400">Word</span>
                   </button>
                   <button onClick={() => confirm("Apagar registro?") && setData((p:any) => ({...p, history: p.history.filter((x:any) => x.id !== h.id)}))} className="flex flex-col items-center justify-center p-3 bg-red-500/10 rounded-2xl hover:bg-red-500/20 transition-all">
                      <i className="fas fa-trash text-red-500 text-base mb-1"></i>
                      <span className="text-[7px] font-black uppercase text-red-500">Apagar</span>
                   </button>
                </div>
              </div>
            ))}
            {data.history.length === 0 && (
              <div className="text-center py-24 opacity-20">
                <i className="fas fa-folder-open text-6xl mb-4 block"></i>
                <p className="text-[10px] font-black uppercase tracking-[0.4em]">Histórico Vazio</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="p-5 bg-black/40 text-center border-t border-white/5">
         <span className="text-[9px] font-black text-slate-700 uppercase tracking-[0.4em]">LUCANO V10.0 MASTER • 2024 PRO</span>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);