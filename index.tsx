
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Modality } from '@google/genai';

const BRAND = { 
  name: "LUCANO DESIGNER3D", 
  tagline: "GESTÃO DE ELITE & IA",
  version: "V22.0 DIAMANTE",
  support: "5574991108629"
};

const App = () => {
  // Estado inicial robusto
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem('lucano_v22_data');
      if (!saved) return { client: '', project: '', rate: 150, seconds: 0, active: false, history: [], targetSeconds: 0 };
      const p = JSON.parse(saved);
      return {
        client: String(p.client || ''),
        project: String(p.project || ''),
        rate: Number(p.rate || 150),
        seconds: Number(p.seconds || 0),
        active: false,
        history: Array.isArray(p.history) ? p.history : [],
        targetSeconds: Number(p.targetSeconds || 0)
      };
    } catch {
      return { client: '', project: '', rate: 150, seconds: 0, active: false, history: [], targetSeconds: 0 };
    }
  });

  const [activeTab, setActiveTab] = useState('timer');
  const [alarmActive, setAlarmActive] = useState(false);
  const timerRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg');
    audioRef.current.loop = true;
  }, []);

  useEffect(() => {
    localStorage.setItem('lucano_v22_data', JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    if (data.active) {
      timerRef.current = setInterval(() => {
        setData((prev: any) => {
          const next = prev.seconds + 1;
          if (prev.targetSeconds > 0 && next === prev.targetSeconds) {
            setAlarmActive(true);
            audioRef.current?.play().catch(() => {});
          }
          return { ...prev, seconds: next };
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [data.active]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const calculateCost = (s: number) => (s / 3600) * (data.rate || 0);
  const formatBRL = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const saveWork = () => {
    if (data.seconds < 1) return;
    const entry = {
      id: Date.now(),
      project: data.project || 'Sem Título',
      client: data.client || 'Cliente VIP',
      time: data.seconds,
      cost: calculateCost(data.seconds),
      date: new Date().toLocaleDateString('pt-BR')
    };
    setData((prev: any) => ({ 
      ...prev, 
      seconds: 0, 
      active: false, 
      history: [entry, ...(prev.history || [])] 
    }));
    setActiveTab('history');
  };

  return (
    <div className="flex-1 bg-black flex flex-col text-white relative z-10 overflow-hidden border-x border-white/5 max-w-md mx-auto w-full">
      {alarmActive && (
        <div className="fixed inset-0 z-[100] bg-[#d4af37] flex flex-col items-center justify-center p-10 text-center">
          <i className="fas fa-crown text-9xl mb-6 text-black"></i>
          <h2 className="text-4xl font-black mb-4 text-black italic uppercase">Meta Atingida!</h2>
          <button onClick={() => { setAlarmActive(false); audioRef.current?.pause(); }} className="bg-black text-[#d4af37] px-14 py-6 rounded-3xl font-black text-xl active:scale-95 transition-transform">FECHAR</button>
        </div>
      )}

      <header className="p-6 text-center bg-[#050505] border-b border-[#d4af37]/20">
        <h1 className="text-xl font-black italic tracking-tighter text-[#d4af37]">{BRAND.name}</h1>
        <p className="text-[8px] tracking-[0.5em] text-white/30 font-bold uppercase mt-1">{BRAND.tagline}</p>
      </header>

      <nav className="flex bg-black border-b border-white/5">
        {[
          { id: 'timer', label: 'TRABALHO', icon: 'fa-stopwatch' },
          { id: 'history', label: 'RECIBOS', icon: 'fa-file-invoice-dollar' }
        ].map(tab => (
          <button 
            key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-4 flex flex-col items-center gap-1 transition-all ${activeTab === tab.id ? 'text-[#d4af37] border-b-2 border-[#d4af37]' : 'text-zinc-700'}`}
          >
            <i className={`fas ${tab.icon} text-xs`}></i>
            <span className="text-[8px] font-black uppercase tracking-widest">{tab.label}</span>
          </button>
        ))}
      </nav>

      <main className="flex-1 p-6 overflow-y-auto no-scrollbar">
        {activeTab === 'timer' && (
          <div className="space-y-6">
            <div className="bg-[#0a0a0a] p-8 rounded-[3rem] text-center border border-white/5 shadow-2xl">
              <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-4">Cronômetro Pro</p>
              <div className="text-6xl font-mono font-bold mb-2 tracking-tighter">{formatTime(data.seconds)}</div>
              <div className="text-[#d4af37] font-black text-2xl italic mb-8">{formatBRL(calculateCost(data.seconds))}</div>
              
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setData((p:any) => ({...p, active: true}))} className={`py-4 rounded-2xl font-black text-[10px] ${data.active ? 'bg-zinc-900 text-zinc-700' : 'bg-[#d4af37] text-black'}`}>START</button>
                <button onClick={() => setData((p:any) => ({...p, active: false}))} className={`py-4 rounded-2xl font-black text-[10px] ${!data.active ? 'bg-zinc-900 text-zinc-700' : 'bg-white/10 text-white'}`}>PAUSE</button>
                <button onClick={saveWork} className="col-span-2 py-5 bg-white text-black rounded-[2.5rem] font-black text-[9px] uppercase tracking-[0.2em] mt-2 active:scale-95 shadow-xl">FINALIZAR SESSÃO</button>
              </div>
            </div>

            <div className="bg-[#050505] p-6 rounded-[2.5rem] border border-white/5 space-y-4">
              <input className="w-full p-4 bg-black border border-white/10 rounded-2xl text-[10px] font-bold uppercase tracking-widest" value={data.client} onChange={e => setData((p:any) => ({...p, client: e.target.value}))} placeholder="CLIENTE" />
              <input className="w-full p-4 bg-black border border-white/10 rounded-2xl text-[10px] font-bold uppercase tracking-widest" value={data.project} onChange={e => setData((p:any) => ({...p, project: e.target.value}))} placeholder="PROJETO" />
              <div className="grid grid-cols-2 gap-3">
                <select className="w-full p-3 bg-black border border-white/10 rounded-xl text-[10px] font-bold text-[#d4af37]" value={data.targetSeconds} onChange={e => setData((p:any) => ({...p, targetSeconds: parseInt(e.target.value)}))}>
                  <option value="0">SEM META</option>
                  <option value="1800">30 MIN</option>
                  <option value="3600">1 HORA</option>
                </select>
                <input type="number" className="w-full p-3 bg-black border border-white/10 rounded-xl text-[10px] font-bold" value={data.rate} onChange={e => setData((p:any) => ({...p, rate: parseInt(e.target.value) || 0}))} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4 pb-10">
            {data.history.length === 0 ? (
              <div className="text-center py-40 opacity-20 text-[10px] font-black uppercase">Nenhum Registro</div>
            ) : (
              data.history.map((h: any) => (
                <div key={h.id} className="p-6 bg-[#0a0a0a] rounded-[2.5rem] border border-white/5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-black text-white text-sm uppercase italic">{h.project}</h4>
                      <div className="text-[8px] text-zinc-600 font-black uppercase mt-1">{h.client} • {h.date}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[#d4af37] font-black text-xl">{formatBRL(h.cost)}</div>
                      <div className="text-[8px] font-black text-zinc-700 uppercase">{formatTime(h.time)}</div>
                    </div>
                  </div>
                  <button onClick={() => {
                      const txt = `💎 *RECIBO LUCANO*\n\nPROJETO: ${h.project}\nCLIENTE: ${h.client}\nTEMPO: ${formatTime(h.time)}\nVALOR: ${formatBRL(h.cost)}`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, '_blank');
                  }} className="w-full py-4 bg-[#25d366] text-white rounded-2xl text-[8px] font-black uppercase flex items-center justify-center gap-2">
                    <i className="fab fa-whatsapp text-lg"></i> WHATSAPP
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      <footer className="p-4 text-center border-t border-white/5">
        <span className="text-[7px] font-black text-zinc-700 uppercase tracking-[0.4em]">LUCANO DESIGNER3D V22</span>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
