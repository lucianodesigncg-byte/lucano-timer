import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

const BRAND_NAME = 'LUCANO DESIGNER3D';

const playSound = (type: 'start' | 'stop' | 'alarm' | 'success') => {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const trigger = (freq: number, dur: number, typeWave: OscillatorType = 'sine', vol = 0.1) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = typeWave;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.05);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  };
  if (type === 'start') trigger(880, 0.2);
  if (type === 'stop') trigger(440, 0.2);
  if (type === 'success') { trigger(523.25, 0.4); setTimeout(() => trigger(783.99, 0.6), 200); }
  if (type === 'alarm') { trigger(1200, 0.1, 'square', 0.15); setTimeout(() => trigger(1200, 0.1, 'square', 0.15), 150); }
};

const App = () => {
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem('lucano_v7_master');
      return saved ? JSON.parse(saved) : { 
        client: '', project: '', notes: '', rate: 120, seconds: 0, active: false, goalMinutes: 0, history: [] 
      };
    } catch {
      return { client: '', project: '', notes: '', rate: 120, seconds: 0, active: false, goalMinutes: 0, history: [] };
    }
  });

  const [activeTab, setActiveTab] = useState('timer');
  const [isAlarmRinging, setIsAlarmRinging] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [calcInput, setCalcInput] = useState({ hours: 0, extra: 0 });
  
  const intervalRef = useRef<any>(null);
  const alarmIntervalRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('lucano_v7_master', JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    if (data.active) {
      intervalRef.current = setInterval(() => {
        setData((prev: any) => ({ ...prev, seconds: prev.seconds + 1 }));
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [data.active]);

  useEffect(() => {
    const goalSec = (data.goalMinutes || 0) * 60;
    if (data.active && goalSec > 0 && data.seconds >= goalSec && !isAlarmRinging) {
      setIsAlarmRinging(true);
      window.alert(`⏰ META ATINGIDA!\nProjeto: ${data.project}\nTempo: ${data.goalMinutes} min`);
    }
  }, [data.seconds, data.active, data.goalMinutes]);

  useEffect(() => {
    if (isAlarmRinging) {
      playSound('alarm');
      alarmIntervalRef.current = setInterval(() => playSound('alarm'), 2000);
    } else {
      clearInterval(alarmIntervalRef.current);
    }
    return () => clearInterval(alarmIntervalRef.current);
  }, [isAlarmRinging]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const calculateTotal = (s: number) => (s / 3600) * (data.rate || 0);
  const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const saveToHistory = () => {
    if (data.seconds < 1) return alert("Inicie o cronômetro primeiro.");
    playSound('success');
    const entry = {
      id: Date.now(),
      project: data.project || "SEM TÍTULO",
      client: data.client || "AVULSO",
      notes: data.notes || "",
      time: data.seconds,
      rate: data.rate,
      total: calculateTotal(data.seconds),
      date: new Date().toLocaleDateString('pt-BR')
    };
    setData((p: any) => ({ ...p, seconds: 0, active: false, history: [entry, ...p.history] }));
    setActiveTab('history');
  };

  const retomarProjeto = (h: any) => {
    if (data.seconds > 0 && !confirm("Você já tem um tempo rodando. Deseja substituí-lo?")) return;
    setData((p: any) => ({
      ...p,
      project: h.project,
      client: h.client,
      notes: h.notes,
      rate: h.rate,
      seconds: h.time,
      active: false
    }));
    setActiveTab('timer');
    playSound('start');
  };

  const exportFile = (h: any, type: 'txt' | 'doc') => {
    const content = `RELATÓRIO DE PRODUÇÃO - ${BRAND_NAME}\n\nPROJETO: ${h.project}\nCLIENTE: ${h.client}\nTEMPO: ${formatTime(h.time)}\nVALOR/HORA: ${formatBRL(h.rate)}\nTOTAL: ${formatBRL(h.total)}\nDATA: ${h.date}\n\nANOTAÇÕES:\n${h.notes || 'Nenhuma anotação.'}`;
    const blob = new Blob([content], { type: type === 'txt' ? 'text/plain' : 'application/msword' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Relatorio_${h.project}_${h.date}.${type === 'txt' ? 'txt' : 'doc'}`;
    link.click();
  };

  const sendWhatsApp = (h: any) => {
    const msg = `*RELATÓRIO ${BRAND_NAME}*\n\n*Projeto:* ${h.project}\n*Cliente:* ${h.client}\n*Tempo:* ${formatTime(h.time)}\n*Total:* ${formatBRL(h.total)}\n\n*Notas:* ${h.notes}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
  };

  return (
    <div className={`flex flex-col h-screen w-full transition-all ${isAlarmRinging ? 'bg-red-950' : 'bg-[#0f172a]'} text-white overflow-hidden font-sans`}>
      
      {/* Header */}
      <header className="p-6 text-center border-b border-white/5 bg-black/20">
        <h1 className="text-xl font-black tracking-widest italic">{BRAND_NAME}</h1>
        <p className="text-[8px] tracking-[0.3em] text-cyan-400 opacity-70">PROFESSIONAL WORKFLOW SYSTEM</p>
      </header>

      {/* Tabs */}
      <nav className="flex p-4 gap-2 bg-black/40">
        <button onClick={() => setActiveTab('timer')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'timer' ? 'bg-cyan-600 shadow-lg shadow-cyan-900/40' : 'text-slate-500 hover:bg-white/5'}`}>TRACKER</button>
        <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-cyan-600 shadow-lg shadow-cyan-900/40' : 'text-slate-500 hover:bg-white/5'}`}>ARQUIVO</button>
        <button onClick={() => setShowCalc(!showCalc)} className={`w-12 flex items-center justify-center rounded-xl bg-slate-800 text-cyan-400 border border-white/10 ${showCalc ? 'bg-cyan-600 text-white' : ''}`} title="Calculadora de Orçamento">
          <i className="fas fa-calculator"></i>
        </button>
      </nav>

      <main className="flex-1 overflow-y-auto p-4 no-scrollbar relative">
        
        {/* Calculadora Flutuante */}
        {showCalc && (
          <div className="absolute top-4 left-4 right-4 z-50 glass-card p-6 rounded-[2rem] border-cyan-500/30 animate-in fade-in zoom-in-95">
             <div className="flex justify-between mb-4">
                <h3 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Calculadora de Estimativa</h3>
                <button onClick={() => setShowCalc(false)}><i className="fas fa-times text-slate-500"></i></button>
             </div>
             <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-500 uppercase">Horas Estimadas</label>
                    <input type="number" className="w-full bg-black/50 border border-white/10 p-2 rounded-lg text-sm font-black" value={calcInput.hours} onChange={e => setCalcInput({...calcInput, hours: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-500 uppercase">Extras R$</label>
                    <input type="number" className="w-full bg-black/50 border border-white/10 p-2 rounded-lg text-sm font-black" value={calcInput.extra} onChange={e => setCalcInput({...calcInput, extra: parseFloat(e.target.value) || 0})} />
                  </div>
                </div>
                <div className="bg-cyan-500/10 p-4 rounded-xl border border-cyan-500/20 text-center">
                  <span className="text-[9px] font-black text-cyan-400 uppercase block mb-1">Total Orçado</span>
                  <div className="text-2xl font-black text-white">{formatBRL((calcInput.hours * data.rate) + calcInput.extra)}</div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'timer' ? (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            {/* Timer Card */}
            <div className={`glass-card rounded-[2.5rem] p-8 text-center relative overflow-hidden transition-all duration-300 ${isAlarmRinging ? 'border-red-500 shadow-2xl' : ''}`}>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 block">Sessão Ativa</span>
              <div className={`text-6xl font-black font-mono my-2 tracking-tighter ${data.active ? 'text-cyan-400 timer-glow' : 'text-slate-600'}`}>
                {formatTime(data.seconds)}
              </div>
              <div className="text-emerald-400 text-2xl font-black mb-8">{formatBRL(calculateTotal(data.seconds))}</div>
              
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setData({...data, active: !data.active})} className={`py-5 rounded-2xl font-black text-[10px] tracking-widest flex items-center justify-center gap-3 transition-all ${data.active ? 'bg-white text-black' : 'bg-cyan-600 text-white shadow-xl shadow-cyan-900/30'}`}>
                  <i className={`fas ${data.active ? 'fa-pause' : 'fa-play'}`}></i> {data.active ? 'PAUSAR' : 'INICIAR'}
                </button>
                <button onClick={saveToHistory} className="py-5 bg-emerald-500 text-black rounded-2xl font-black text-[10px] tracking-widest flex items-center justify-center gap-3">
                  <i className="fas fa-save"></i> SALVAR
                </button>
              </div>
              
              {isAlarmRinging && (
                <button onClick={() => setIsAlarmRinging(false)} className="w-full mt-4 py-3 bg-red-600 text-white rounded-xl font-black text-[10px] animate-pulse uppercase">Parar Alarme</button>
              )}
            </div>

            {/* Inputs */}
            <div className="bg-black/20 p-6 rounded-[2rem] border border-white/5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Valor/Hora</label>
                  <input type="number" className="w-full bg-black/40 border border-white/10 p-3 rounded-xl font-black text-cyan-400" value={data.rate} onChange={e => setData({...data, rate: parseInt(e.target.value) || 0})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Meta Min.</label>
                  <input type="number" className="w-full bg-black/40 border border-white/10 p-3 rounded-xl font-black text-red-400" value={data.goalMinutes || ''} onChange={e => setData({...data, goalMinutes: parseInt(e.target.value) || 0})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Cliente</label>
                <input className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs font-bold text-white uppercase" value={data.client} onChange={e => setData({...data, client: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Projeto / Ambiente</label>
                <input className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs font-bold text-white uppercase" value={data.project} onChange={e => setData({...data, project: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Anotações e Medidas</label>
                <textarea className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs font-medium text-slate-300 h-24 outline-none resize-none" placeholder="Pé direito, revestimentos, detalhes técnicos..." value={data.notes} onChange={e => setData({...data, notes: e.target.value})} />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-in slide-in-from-right-4">
            {data.history.map((h: any) => (
              <div key={h.id} className="glass-card p-5 rounded-3xl border border-white/5 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="max-w-[60%]">
                    <h4 className="font-black text-white text-xs uppercase truncate">{h.project}</h4>
                    <p className="text-[9px] text-cyan-400 font-bold uppercase">{h.client}</p>
                    <p className="text-[8px] text-slate-600 mt-1">{h.date} • {formatTime(h.time)}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-emerald-400 font-black text-base">{formatBRL(h.total)}</div>
                    <button onClick={() => retomarProjeto(h)} className="text-[8px] font-black uppercase text-cyan-400 hover:text-white mt-2 border border-cyan-400/30 px-2 py-1 rounded-lg transition-all">Continuar Trabalho</button>
                  </div>
                </div>

                {h.notes && <div className="p-3 bg-black/40 rounded-xl text-[10px] text-slate-400 font-medium italic">"{h.notes}"</div>}

                <div className="grid grid-cols-4 gap-2">
                  <button onClick={() => sendWhatsApp(h)} className="py-2 bg-emerald-600 text-white rounded-xl text-[8px] font-black uppercase flex items-center justify-center gap-1"><i className="fab fa-whatsapp"></i> WhatsApp</button>
                  <button onClick={() => exportFile(h, 'txt')} className="py-2 bg-slate-700 text-white rounded-xl text-[8px] font-black uppercase flex items-center justify-center gap-1">TXT</button>
                  <button onClick={() => exportFile(h, 'doc')} className="py-2 bg-blue-700 text-white rounded-xl text-[8px] font-black uppercase flex items-center justify-center gap-1">WORD</button>
                  <button onClick={() => confirm("Excluir?") && setData((p:any) => ({...p, history: p.history.filter((x:any) => x.id !== h.id)}))} className="py-2 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center"><i className="fas fa-trash"></i></button>
                </div>
              </div>
            ))}
            {data.history.length === 0 && <div className="text-center py-20 opacity-20"><i className="fas fa-folder-open text-4xl block mb-2"></i><p className="text-xs font-black uppercase">Vazio</p></div>}
          </div>
        )}
      </main>

      <footer className="p-4 bg-black/30 text-center border-t border-white/5">
        <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Lucano V7.0 MASTER - Premium Interface</span>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);