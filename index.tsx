
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

const BRAND = { 
  name: "LUCANO DESIGNER3D", 
  tagline: "GESTÃO DE TEMPO PRO"
};

const App = () => {
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem('lucano_timer_v22');
      if (!saved) return { client: '', project: '', rate: 100, seconds: 0, active: false, history: [] };
      return JSON.parse(saved);
    } catch {
      return { client: '', project: '', rate: 100, seconds: 0, active: false, history: [] };
    }
  });

  const [activeTab, setActiveTab] = useState('timer');
  const timerRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('lucano_timer_v22', JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    if (data.active) {
      timerRef.current = setInterval(() => {
        setData((prev: any) => ({ ...prev, seconds: prev.seconds + 1 }));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [data.active]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const calculateCost = (s: number) => (s / 3600) * (data.rate || 0);
  const formatBRL = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const saveSession = () => {
    if (data.seconds < 1) return;
    const newEntry = {
      id: Date.now(),
      project: data.project || "Projeto s/ Título",
      client: data.client || "Cliente VIP",
      time: data.seconds,
      cost: calculateCost(data.seconds),
      date: new Date().toLocaleDateString('pt-BR')
    };
    setData((prev: any) => ({
      ...prev,
      seconds: 0,
      active: false,
      history: [newEntry, ...(prev.history || [])]
    }));
    setActiveTab('history');
  };

  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full bg-[#0f172a] shadow-2xl h-screen">
      <header className="p-6 text-center border-b border-white/10 bg-[#0f172a]">
        <h1 className="text-xl font-extrabold tracking-tighter text-cyan-400">{BRAND.name}</h1>
        <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mt-1">{BRAND.tagline}</p>
      </header>

      <nav className="flex border-b border-white/5 bg-[#0a0f1d]">
        <button 
          onClick={() => setActiveTab('timer')}
          className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest flex flex-col items-center gap-1 ${activeTab === 'timer' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-600'}`}
        >
          <i className="fas fa-stopwatch text-sm"></i> Cronômetro
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-600'}`}
        >
          <i className="fas fa-list text-sm"></i> Histórico
        </button>
      </nav>

      <main className="flex-1 p-5 overflow-y-auto no-scrollbar bg-[#0f172a]">
        {activeTab === 'timer' && (
          <div className="space-y-6">
            <div className="timer-card rounded-[2.5rem] p-8 text-center shadow-xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tempo de Trabalho</span>
              <div className="text-6xl font-mono font-bold my-4 text-white tracking-tighter">{formatTime(data.seconds)}</div>
              <div className="text-emerald-400 text-xl font-bold mb-8 italic">{formatBRL(calculateCost(data.seconds))}</div>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setData((p:any) => ({...p, active: true}))}
                  className={`py-4 rounded-2xl font-black text-xs transition-all ${data.active ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/20 active:scale-95'}`}
                >
                  START
                </button>
                <button 
                  onClick={() => setData((p:any) => ({...p, active: false}))}
                  className={`py-4 rounded-2xl font-black text-xs transition-all ${!data.active ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-white text-black active:scale-95'}`}
                >
                  PAUSE
                </button>
                <button 
                  onClick={saveSession}
                  className="col-span-2 py-5 bg-emerald-500 text-black rounded-3xl font-black text-[10px] uppercase tracking-widest mt-2 active:scale-95 transition-transform"
                >
                  SALVAR E FINALIZAR
                </button>
              </div>
            </div>

            <div className="bg-[#1e293b]/30 p-6 rounded-3xl border border-white/5 space-y-4">
              <input 
                className="w-full p-4 bg-[#0a0f1d] border border-white/10 rounded-2xl text-xs font-bold text-white outline-none focus:border-cyan-500/50" 
                value={data.client}
                onChange={e => setData({...data, client: e.target.value})}
                placeholder="NOME DO CLIENTE" 
              />
              <input 
                className="w-full p-4 bg-[#0a0f1d] border border-white/10 rounded-2xl text-xs font-bold text-white outline-none focus:border-cyan-500/50" 
                value={data.project}
                onChange={e => setData({...data, project: e.target.value})}
                placeholder="TITULO DO PROJETO" 
              />
              <div className="flex items-center gap-2 p-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase flex-1">Valor Hora R$</label>
                <input 
                  type="number"
                  className="w-24 p-3 bg-[#0a0f1d] border border-white/10 rounded-xl text-xs font-bold text-white text-center" 
                  value={data.rate}
                  onChange={e => setData({...data, rate: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4 pb-10">
            {data.history.length === 0 ? (
              <div className="text-center py-40 text-slate-600 text-[10px] font-bold uppercase tracking-widest">Nenhum registro salvo</div>
            ) : (
              data.history.map((h: any) => (
                <div key={h.id} className="p-5 bg-[#1e293b]/50 rounded-3xl border border-white/5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white text-sm">{h.project}</h4>
                      <p className="text-[9px] text-slate-500 uppercase font-bold">{h.client} • {h.date}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-cyan-400 font-bold text-lg">{formatBRL(h.cost)}</div>
                      <div className="text-[9px] text-slate-500 font-mono">{formatTime(h.time)}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        const msg = `*RELATÓRIO DE TRABALHO*\n\n💎 *${BRAND.name}*\n\nPROJETO: ${h.project}\nCLIENTE: ${h.client}\nTEMPO: ${formatTime(h.time)}\nVALOR: ${formatBRL(h.cost)}`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                      }}
                      className="flex-1 py-3 bg-[#25d366] text-white rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2"
                    >
                      <i className="fab fa-whatsapp text-lg"></i> Enviar Recibo
                    </button>
                    <button 
                      onClick={() => setData((p:any) => ({...p, history: p.history.filter((x:any) => x.id !== h.id)}))}
                      className="w-12 h-12 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center active:scale-95"
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      <footer className="p-4 bg-[#0a0f1d] border-t border-white/5 text-center">
        <span className="text-[8px] font-bold text-slate-700 uppercase tracking-widest">Lucano Designer3d - V22 ESTÁVEL</span>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
