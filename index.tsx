import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

const BRAND_NAME = 'LUCANO DESIGNER3D';

// Utilitário de Áudio Sintetizado (Gera som sem precisar de arquivos externos)
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
  if (type === 'success') {
    trigger(523.25, 0.4);
    setTimeout(() => trigger(659.25, 0.4), 100);
    setTimeout(() => trigger(783.99, 0.6), 200);
  }
  if (type === 'alarm') {
    // Bipe triplo potente
    trigger(1200, 0.1, 'square', 0.15);
    setTimeout(() => trigger(1200, 0.1, 'square', 0.15), 150);
    setTimeout(() => trigger(1200, 0.1, 'square', 0.15), 300);
  }
};

const App = () => {
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem('lucano_pro_v6_final');
      return saved ? JSON.parse(saved) : { 
        client: '', 
        project: '', 
        rate: 120, 
        seconds: 0, 
        active: false, 
        goalMinutes: 0,
        history: [] 
      };
    } catch {
      return { client: '', project: '', rate: 120, seconds: 0, active: false, goalMinutes: 0, history: [] };
    }
  });

  const [activeTab, setActiveTab] = useState('timer');
  const [isAlarmRinging, setIsAlarmRinging] = useState(false);
  const intervalRef = useRef<any>(null);
  const alarmIntervalRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('lucano_pro_v6_final', JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    if (data.active) {
      intervalRef.current = setInterval(() => {
        setData((prev: any) => ({ ...prev, seconds: prev.seconds + 1 }));
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [data.active]);

  // ALERTA DE SISTEMA: O window.alert força o SketchUp/Windows a dar foco na janela
  useEffect(() => {
    const goalSeconds = (data.goalMinutes || 0) * 60;
    if (data.active && goalSeconds > 0 && data.seconds >= goalSeconds && !isAlarmRinging) {
      setIsAlarmRinging(true);
      
      // O Alerta trava a execução e faz o Windows notificar o usuário
      setTimeout(() => {
        window.alert(`⏰ ALERTA LUCANO DESIGNER3D\n\nSua meta de ${data.goalMinutes} minutos para o projeto "${data.project || 'Atual'}" foi atingida!`);
      }, 100);
    }
  }, [data.seconds, data.active, data.goalMinutes, isAlarmRinging, data.project]);

  useEffect(() => {
    if (isAlarmRinging) {
      playSound('alarm');
      alarmIntervalRef.current = setInterval(() => {
        playSound('alarm');
      }, 2000);
    } else {
      if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
    }
    return () => { if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current); };
  }, [isAlarmRinging]);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const calculateTotal = (s: number) => (s / 3600) * (data.rate || 0);
  const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const toggleTimer = () => {
    if (!data.active) playSound('start');
    else playSound('stop');
    setData((p: any) => ({ ...p, active: !p.active }));
  };

  const saveToHistory = () => {
    if (data.seconds < 1) return alert("Inicie o cronômetro primeiro.");
    playSound('success');
    setIsAlarmRinging(false);
    
    const entry = {
      id: Date.now(),
      project: data.project || "PROJETO SEM TÍTULO",
      client: data.client || "CLIENTE AVULSO",
      time: data.seconds,
      total: calculateTotal(data.seconds),
      date: new Date().toLocaleDateString('pt-BR')
    };

    setData((prev: any) => ({
      ...prev,
      seconds: 0,
      active: false,
      history: [entry, ...prev.history]
    }));
    setActiveTab('history');
  };

  const sendWhatsApp = (h: any) => {
    const msg = `*RELATÓRIO DE PRODUÇÃO*\n💎 *${BRAND_NAME}*\n\n*Projeto:* ${h.project}\n*Cliente:* ${h.client}\n*Tempo Total:* ${formatTime(h.time)}\n*Investimento:* ${formatBRL(h.total)}\n*Data:* ${h.date}\n\n_Gerado via Lucano Pro IA_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
  };

  return (
    <div className={`flex flex-col h-full w-full max-w-md mx-auto transition-colors duration-500 ${isAlarmRinging ? 'bg-red-950' : 'bg-[#0f172a]'} shadow-2xl relative overflow-hidden`}>
      
      <header className="pt-8 pb-4 px-6 text-center z-10">
        <div className="flex justify-center items-center gap-2 mb-1">
          <div className={`w-2 h-2 rounded-full ${data.active ? 'bg-emerald-400 active-pulse' : 'bg-slate-600'}`}></div>
          <h1 className="text-xl font-black tracking-[0.15em] text-white italic">{BRAND_NAME}</h1>
        </div>
        <p className="text-[9px] uppercase tracking-[0.4em] text-cyan-400/50 font-bold">Time Intelligence System</p>
      </header>

      <nav className="flex px-6 mb-4 z-10">
        <div className="flex w-full bg-black/40 p-1 rounded-2xl border border-white/5">
          <button onClick={() => setActiveTab('timer')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'timer' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500'}`}>TRACKER</button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500'}`}>ARQUIVO</button>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto no-scrollbar px-6 pb-6 z-10">
        {activeTab === 'timer' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className={`glass-card rounded-[2.5rem] p-8 text-center relative overflow-hidden transition-all duration-300 ${isAlarmRinging ? 'border-red-500 shadow-[0_0_60px_rgba(239,68,68,0.4)]' : ''}`}>
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent ${isAlarmRinging ? 'via-red-500' : 'via-cyan-400/30'} to-transparent`}></div>
              
              <span className={`text-[10px] font-black uppercase tracking-widest mb-4 block ${isAlarmRinging ? 'text-red-400 animate-pulse' : 'text-slate-500'}`}>
                {isAlarmRinging ? '⚠️ ALERTA: META ATINGIDA' : 'Sessão em Andamento'}
              </span>
              
              <div className={`text-6xl font-black font-mono my-4 text-white timer-glow tracking-tighter ${data.active ? 'text-cyan-400' : 'text-slate-500'}`}>
                {formatTime(data.seconds)}
              </div>
              
              <div className="text-emerald-400 text-2xl font-black mb-8 tracking-tight">
                {formatBRL(calculateTotal(data.seconds))}
              </div>

              {isAlarmRinging && (
                <button 
                  onClick={() => setIsAlarmRinging(false)}
                  className="w-full mb-6 py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest animate-pulse border-2 border-red-400 shadow-xl"
                >
                  <i className="fas fa-volume-mute mr-2"></i> PARAR ALARME
                </button>
              )}

              <div className="grid grid-cols-2 gap-4">
                <button onClick={toggleTimer} className={`btn-press py-5 rounded-2xl font-black text-[10px] tracking-widest transition-all flex items-center justify-center gap-3 ${data.active ? 'bg-white text-black' : 'bg-cyan-600 text-white shadow-xl shadow-cyan-900/50'}`}>
                  <i className={`fas ${data.active ? 'fa-pause' : 'fa-play'}`}></i>
                  {data.active ? 'PAUSAR' : 'INICIAR'}
                </button>
                <button onClick={saveToHistory} className="btn-press py-5 bg-emerald-500 text-black rounded-2xl font-black text-[10px] tracking-widest shadow-xl flex items-center justify-center gap-3">
                  <i className="fas fa-check-double"></i> SALVAR
                </button>
              </div>
            </div>

            <div className="space-y-4 bg-black/20 p-6 rounded-[2rem] border border-white/5">
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Valor/Hora</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400 text-[10px] font-black">R$</span>
                      <input type="number" className="w-full bg-black/40 border border-white/10 p-3 pl-8 rounded-xl text-right font-black text-cyan-400 text-sm outline-none" value={data.rate} onChange={e => setData({...data, rate: parseInt(e.target.value) || 0})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Meta (Min)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400 text-[10px]"><i className="fas fa-clock"></i></span>
                      <input type="number" className="w-full bg-black/40 border border-white/10 p-3 pl-8 rounded-xl text-right font-black text-red-400 text-sm outline-none" placeholder="0" value={data.goalMinutes || ''} onChange={e => setData({...data, goalMinutes: parseInt(e.target.value) || 0})} />
                    </div>
                  </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Cliente / Empresa</label>
                <input className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-xs font-bold text-white outline-none" placeholder="EX: ARQ. MARINA..." value={data.client} onChange={e => setData({...data, client: e.target.value.toUpperCase()})} />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Projeto / Ambiente</label>
                <input className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-xs font-bold text-white outline-none" placeholder="EX: COZINHA LOFT..." value={data.project} onChange={e => setData({...data, project: e.target.value.toUpperCase()})} />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pb-10 animate-in slide-in-from-right-4 duration-500">
             {data.history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-20"><i className="fas fa-folder-open text-4xl mb-4"></i><p className="text-[10px] font-black uppercase">Sem registros</p></div>
            ) : (
              data.history.map((h: any) => (
                <div key={h.id} className="glass-card p-5 rounded-3xl border border-white/5 animate-in fade-in zoom-in-95">
                  <div className="flex justify-between items-start mb-4">
                    <div className="max-w-[60%]">
                      <h4 className="font-black text-white text-xs truncate uppercase">{h.project}</h4>
                      <p className="text-[9px] text-cyan-400 font-bold uppercase">{h.client}</p>
                      <p className="text-[8px] text-slate-600 font-bold mt-1 italic">{h.date}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-black text-base">{formatBRL(h.total)}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{formatTime(h.time)}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => sendWhatsApp(h)} className="btn-press flex-1 py-3 bg-[#25D366] text-white rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2"><i className="fab fa-whatsapp"></i> WhatsApp</button>
                    <button onClick={() => confirm("Excluir?") && setData((p:any) => ({...p, history: p.history.filter((x:any) => x.id !== h.id)}))} className="btn-press w-12 h-12 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center"><i className="fas fa-trash-alt"></i></button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      <footer className="p-4 bg-black/40 border-t border-white/5 text-center z-10">
        <span className="text-[8px] font-bold text-slate-600 uppercase tracking-[0.4em]">Lucano V6.0 PRO - Pop-up Alarm Active</span>
      </footer>
      <div className={`absolute -top-24 -right-24 w-64 h-64 ${isAlarmRinging ? 'bg-red-600/20' : 'bg-cyan-600/10'} rounded-full blur-[80px] pointer-events-none transition-colors duration-500`}></div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);