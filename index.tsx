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
      const saved = localStorage.getItem('lucano_v8_pro');
      return saved ? JSON.parse(saved) : { 
        client: '', project: '', notes: '', rate: 120, seconds: 0, active: false, goalMinutes: 0, history: [] 
      };
    } catch {
      return { client: '', project: '', notes: '', rate: 120, seconds: 0, active: false, goalMinutes: 0, history: [] };
    }
  });

  const [activeTab, setActiveTab] = useState('tracker');
  const [showCalc, setShowCalc] = useState(false);
  const [calcData, setCalcData] = useState({ hours: 0, extra: 0 });
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  
  const intervalRef = useRef<any>(null);
  const alarmBeepRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('lucano_v8_pro', JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    if (data.active) {
      intervalRef.current = setInterval(() => {
        setData((prev: any) => ({ ...prev, seconds: prev.seconds + 1 }));
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [data.active]);

  useEffect(() => {
    const goalSec = (data.goalMinutes || 0) * 60;
    if (data.active && goalSec > 0 && data.seconds >= goalSec && !isAlarmActive) {
      setIsAlarmActive(true);
      window.alert(`🔔 META ATINGIDA!\nProjeto: ${data.project}\nTempo: ${data.goalMinutes} min`);
    }
  }, [data.seconds, data.active, data.goalMinutes]);

  useEffect(() => {
    if (isAlarmActive) {
      playSound('alarm');
      alarmBeepRef.current = setInterval(() => playSound('alarm'), 2000);
    } else {
      clearInterval(alarmBeepRef.current);
    }
    return () => clearInterval(alarmBeepRef.current);
  }, [isAlarmActive]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const calculateTotal = (s: number) => (s / 3600) * (data.rate || 0);
  const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleSave = () => {
    if (data.seconds < 1) return;
    playSound('success');
    const entry = {
      id: Date.now(),
      project: data.project || "PROJETO SEM NOME",
      client: data.client || "CLIENTE INDEFINIDO",
      notes: data.notes,
      time: data.seconds,
      rate: data.rate,
      total: calculateTotal(data.seconds),
      date: new Date().toLocaleDateString('pt-BR')
    };
    setData((p: any) => ({ ...p, seconds: 0, active: false, history: [entry, ...p.history] }));
    setActiveTab('arquivo');
  };

  const resumeProject = (h: any) => {
    if (data.seconds > 0 && !confirm("Deseja pausar o atual e retomar este?")) return;
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

  const exportDoc = (h: any, ext: 'txt' | 'doc') => {
    const content = `LUCANO DESIGNER3D - RELATÓRIO PROFISSIONAL\n\nPROJETO: ${h.project}\nCLIENTE: ${h.client}\nTEMPO TOTAL: ${formatTime(h.time)}\nVALOR HORA: ${formatBRL(h.rate)}\nTOTAL: ${formatBRL(h.total)}\nDATA: ${h.date}\n\nANOTAÇÕES:\n${h.notes || 'Nenhuma anotação registrada.'}`;
    const blob = new Blob([content], { type: ext === 'txt' ? 'text/plain' : 'application/msword' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Relatorio_${h.project}_${h.date}.${ext}`;
    link.click();
  };

  const shareWA = (h: any) => {
    const msg = `*RELATÓRIO DE TRABALHO*\n*Projeto:* ${h.project}\n*Cliente:* ${h.client}\n*Tempo:* ${formatTime(h.time)}\n*Total:* ${formatBRL(h.total)}\n\n*Notas:* ${h.notes || '-'}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#020617] text-slate-100 overflow-hidden font-sans select-none">
      
      {/* HEADER PREMIUM */}
      <header className="pt-8 pb-4 px-6 text-center border-b border-white/5 bg-gradient-to-b from-black/40 to-transparent">
        <h1 className="text-2xl font-black italic tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">{BRAND_NAME}</h1>
        <p className="text-[7px] tracking-[0.4em] text-cyan-500 font-bold uppercase mt-1 opacity-80">Intelligence Time System</p>
      </header>

      {/* NAVEGAÇÃO */}
      <nav className="flex px-6 py-4 gap-3">
        <button onClick={() => setActiveTab('tracker')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'tracker' ? 'bg-cyan-600 shadow-[0_0_20px_rgba(8,145,178,0.4)] border border-cyan-400/50' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}>TRACKER</button>
        <button onClick={() => setActiveTab('arquivo')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'arquivo' ? 'bg-cyan-600 shadow-[0_0_20px_rgba(8,145,178,0.4)] border border-cyan-400/50' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}>ARQUIVO</button>
        <button onClick={() => setShowCalc(!showCalc)} className={`w-12 flex items-center justify-center rounded-2xl transition-all ${showCalc ? 'bg-amber-500 text-black' : 'bg-white/5 text-amber-500 border border-amber-500/20'}`}>
          <i className="fas fa-calculator text-sm"></i>
        </button>
      </nav>

      <main className="flex-1 overflow-y-auto px-6 pb-8 no-scrollbar relative">
        
        {/* CALCULADORA OVERLAY */}
        {showCalc && (
          <div className="absolute inset-x-6 top-0 z-50 glass-card p-6 rounded-3xl border-amber-500/30 animate-in slide-in-from-top-4 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[9px] font-black text-amber-500 uppercase">Calculadora de Orçamento</span>
              <button onClick={() => setShowCalc(false)} className="text-slate-500 hover:text-white"><i className="fas fa-times"></i></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="space-y-1">
                <label className="text-[7px] font-black uppercase text-slate-500 ml-1">Horas Est.</label>
                <input type="number" className="w-full bg-black/40 border border-white/10 p-2 rounded-lg text-sm font-bold outline-none focus:border-amber-500/50" value={calcData.hours} onChange={e => setCalcData({...calcData, hours: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="space-y-1">
                <label className="text-[7px] font-black uppercase text-slate-500 ml-1">Extras R$</label>
                <input type="number" className="w-full bg-black/40 border border-white/10 p-2 rounded-lg text-sm font-bold outline-none focus:border-amber-500/50" value={calcData.extra} onChange={e => setCalcData({...calcData, extra: parseFloat(e.target.value) || 0})} />
              </div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-center">
              <span className="text-[8px] font-black text-amber-500 uppercase block">Total Estimado</span>
              <div className="text-xl font-black text-white">{formatBRL((calcData.hours * data.rate) + calcData.extra)}</div>
            </div>
          </div>
        )}

        {activeTab === 'tracker' ? (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            
            {/* TIMER CARD */}
            <div className={`glass-card rounded-[2.5rem] p-8 text-center relative overflow-hidden transition-all duration-500 ${isAlarmActive ? 'border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.2)]' : 'border-white/5'}`}>
              <div className="absolute top-4 left-1/2 -translate-x-1/2">
                <div className={`w-2 h-2 rounded-full ${data.active ? 'bg-cyan-500 animate-pulse' : 'bg-slate-700'}`}></div>
              </div>
              
              <div className={`text-6xl font-black font-mono tracking-tighter my-4 ${data.active ? 'text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.3)]' : 'text-slate-600'}`}>
                {formatTime(data.seconds)}
              </div>
              
              <div className="text-2xl font-black text-emerald-400 mb-8">{formatBRL(calculateTotal(data.seconds))}</div>
              
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => { setData({...data, active: !data.active}); playSound(data.active ? 'stop' : 'start'); }}
                  className={`py-5 rounded-3xl font-black text-[10px] tracking-widest transition-all active:scale-95 ${data.active ? 'bg-white text-black' : 'bg-cyan-600 text-white shadow-xl shadow-cyan-900/40'}`}
                >
                  <i className={`fas ${data.active ? 'fa-pause' : 'fa-play'} mr-2`}></i> {data.active ? 'PAUSAR' : 'INICIAR'}
                </button>
                <button 
                  onClick={handleSave}
                  className="py-5 bg-emerald-500 text-black rounded-3xl font-black text-[10px] tracking-widest active:scale-95 flex items-center justify-center"
                >
                  <i className="fas fa-check-circle mr-2"></i> SALVAR
                </button>
              </div>

              {isAlarmActive && (
                <button onClick={() => setIsAlarmActive(false)} className="w-full mt-4 py-3 bg-red-600 text-white rounded-xl font-black text-[9px] uppercase tracking-tighter">Desativar Alerta</button>
              )}
            </div>

            {/* FORMULÁRIO */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card p-4 rounded-2xl border-white/5">
                  <label className="text-[8px] font-black text-slate-500 uppercase mb-2 block">Valor Hora</label>
                  <div className="flex items-center text-cyan-400 font-black">
                    <span className="text-[10px] mr-1">R$</span>
                    <input type="number" className="bg-transparent w-full outline-none text-base" value={data.rate} onChange={e => setData({...data, rate: parseFloat(e.target.value) || 0})} />
                  </div>
                </div>
                <div className="glass-card p-4 rounded-2xl border-white/5">
                  <label className="text-[8px] font-black text-slate-500 uppercase mb-2 block">Meta (Min)</label>
                  <div className="flex items-center text-rose-400 font-black">
                    <i className="fas fa-clock text-[10px] mr-2 opacity-50"></i>
                    <input type="number" className="bg-transparent w-full outline-none text-base" value={data.goalMinutes || ''} onChange={e => setData({...data, goalMinutes: parseInt(e.target.value) || 0})} />
                  </div>
                </div>
              </div>

              <div className="glass-card p-5 rounded-3xl border-white/5 space-y-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-500 uppercase block">Cliente / Empresa</label>
                  <input className="w-full bg-black/30 border border-white/5 p-3 rounded-xl text-xs font-bold uppercase outline-none focus:border-cyan-500/30" placeholder="Digite o cliente..." value={data.client} onChange={e => setData({...data, client: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-500 uppercase block">Projeto / Ambiente</label>
                  <input className="w-full bg-black/30 border border-white/5 p-3 rounded-xl text-xs font-bold uppercase outline-none focus:border-cyan-500/30" placeholder="Ex: Cozinha Gourmet" value={data.project} onChange={e => setData({...data, project: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-500 uppercase block">Anotações e Detalhes</label>
                  <textarea 
                    className="w-full bg-black/30 border border-white/5 p-3 rounded-xl text-[11px] font-medium text-slate-300 h-28 outline-none focus:border-cyan-500/30 resize-none leading-relaxed" 
                    placeholder="Anote medidas, referências ou detalhes técnicos aqui..."
                    value={data.notes}
                    onChange={e => setData({...data, notes: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-in slide-in-from-right-4">
            {data.history.map((h: any) => (
              <div key={h.id} className="glass-card p-6 rounded-[2.5rem] border-white/5 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-4">
                    <h4 className="font-black text-xs uppercase text-white truncate">{h.project}</h4>
                    <p className="text-[9px] font-bold text-cyan-400 uppercase tracking-tight">{h.client}</p>
                    <div className="flex gap-3 mt-2">
                      <span className="text-[8px] text-slate-500 uppercase font-bold"><i className="fas fa-calendar mr-1"></i> {h.date}</span>
                      <span className="text-[8px] text-slate-500 uppercase font-bold"><i className="fas fa-clock mr-1"></i> {formatTime(h.time)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-emerald-400 font-black text-lg">{formatBRL(h.total)}</div>
                    <button onClick={() => resumeProject(h)} className="mt-2 text-[8px] font-black uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-400/20 px-3 py-1.5 rounded-lg hover:bg-cyan-500 hover:text-white transition-all">Retomar</button>
                  </div>
                </div>

                {h.notes && (
                  <div className="p-3 bg-black/40 rounded-xl text-[10px] text-slate-400 font-medium italic border-l-2 border-cyan-500/30 line-clamp-2">
                    {h.notes}
                  </div>
                )}

                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/5">
                  <button onClick={() => shareWA(h)} className="flex flex-col items-center justify-center p-2 bg-emerald-500/10 rounded-xl hover:bg-emerald-500/20 transition-all">
                    <i className="fab fa-whatsapp text-emerald-400 mb-1"></i>
                    <span className="text-[6px] font-black uppercase text-emerald-400">WhatsApp</span>
                  </button>
                  <button onClick={() => exportDoc(h, 'txt')} className="flex flex-col items-center justify-center p-2 bg-slate-500/10 rounded-xl hover:bg-slate-500/20 transition-all">
                    <i className="fas fa-file-alt text-slate-300 mb-1"></i>
                    <span className="text-[6px] font-black uppercase text-slate-300">TXT</span>
                  </button>
                  <button onClick={() => exportDoc(h, 'doc')} className="flex flex-col items-center justify-center p-2 bg-blue-500/10 rounded-xl hover:bg-blue-500/20 transition-all">
                    <i className="fas fa-file-word text-blue-400 mb-1"></i>
                    <span className="text-[6px] font-black uppercase text-blue-400">Word</span>
                  </button>
                  <button onClick={() => confirm("Excluir registro?") && setData((p:any) => ({...p, history: p.history.filter((x:any) => x.id !== h.id)}))} className="flex flex-col items-center justify-center p-2 bg-red-500/10 rounded-xl hover:bg-red-500/20 transition-all">
                    <i className="fas fa-trash text-red-400 mb-1"></i>
                    <span className="text-[6px] font-black uppercase text-red-400">Apagar</span>
                  </button>
                </div>
              </div>
            ))}
            {data.history.length === 0 && (
              <div className="text-center py-24 opacity-20">
                <i className="fas fa-archive text-5xl mb-4 block"></i>
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Arquivo Vazio</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="p-4 bg-black/40 text-center border-t border-white/5 flex flex-col gap-1">
        <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Lucano V8.0 PRO Master</span>
        <div className="flex justify-center gap-4 text-[7px] font-bold text-slate-700 uppercase">
          <span>SketchUp Native Plugin</span>
          <span>•</span>
          <span>Cloud Sync Active</span>
        </div>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);