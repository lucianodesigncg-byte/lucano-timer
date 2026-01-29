import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

const BRAND_NAME = 'LUCANO DESIGNER3D';
const SUBTITLE = 'SINCRONIZADOR DE PRODUTIVIDADE 3D';

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
    if (type === 'start') trigger(880, 0.1);
    if (type === 'stop') trigger(440, 0.1);
    if (type === 'success') { trigger(523, 0.2); setTimeout(() => trigger(659, 0.2), 100); }
    if (type === 'alarm') { 
      trigger(1000, 0.1, 'square', 0.15); 
      setTimeout(() => trigger(1000, 0.1, 'square', 0.15), 200);
    }
  } catch (e) {}
};

const App = () => {
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem('lucano_v16_prod');
      if (!saved) return { client: '', project: '', notes: '', rate: 15, seconds: 0, active: false, goalMinutes: 1, history: [] };
      const parsed = JSON.parse(saved);
      return {
        client: String(parsed.client || ''),
        project: String(parsed.project || ''),
        notes: String(parsed.notes || ''),
        rate: Number(parsed.rate || 15),
        seconds: Number(parsed.seconds || 0),
        active: false,
        goalMinutes: Number(parsed.goalMinutes || 1),
        history: Array.isArray(parsed.history) ? parsed.history : []
      };
    } catch {
      return { client: '', project: '', notes: '', rate: 15, seconds: 0, active: false, goalMinutes: 1, history: [] };
    }
  });

  const [activeTab, setActiveTab] = useState<'controle' | 'alarme' | 'historico'>('controle');
  const [calc, setCalc] = useState({ h: 0, e: 0 });
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  
  const timerRef = useRef<any>(null);
  const beepRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('lucano_v16_prod', JSON.stringify(data));
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
      playSound('alarm');
    }
  }, [data.seconds, data.active, data.goalMinutes, isAlarmActive]);

  useEffect(() => {
    if (isAlarmActive) {
      beepRef.current = setInterval(() => playSound('alarm'), 3000);
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

  const cur = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleSave = () => {
    if (data.seconds < 1) return;
    playSound('success');
    const entry = {
      id: Date.now().toString(),
      project: String(data.project || "PROJETO S/ NOME"),
      client: String(data.client || "CLIENTE S/ NOME"),
      notes: String(data.notes || ""),
      time: Number(data.seconds),
      rate: Number(data.rate),
      total: Number((data.seconds / 3600) * data.rate),
      date: new Date().toLocaleDateString('pt-BR')
    };
    setData((p: any) => ({ ...p, seconds: 0, active: false, history: [entry, ...p.history] }));
    setActiveTab('historico');
  };

  const resumeHistory = (h: any) => {
    if (data.seconds > 0 && !confirm("Deseja substituir o cronômetro atual?")) return;
    setData((p: any) => ({
      ...p,
      project: String(h.project),
      client: String(h.client),
      notes: String(h.notes),
      rate: Number(h.rate),
      seconds: Number(h.time),
      active: false
    }));
    setActiveTab('controle');
    playSound('start');
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#f8fafc] text-slate-800 font-sans overflow-hidden select-none">
      
      <header className="bg-[#2c3e50] pt-7 pb-5 text-center shadow-lg z-20">
        <h1 className="text-2xl font-black italic tracking-wider text-white uppercase leading-none">{BRAND_NAME}</h1>
        <p className="text-[7.5px] tracking-[0.3em] text-cyan-400 font-bold opacity-80 mt-1 uppercase">{SUBTITLE}</p>
      </header>

      <nav className="flex bg-white border-b border-slate-200 z-10 shadow-sm">
        <button onClick={() => setActiveTab('controle')} className={`flex-1 py-4 flex flex-col items-center gap-1 relative ${activeTab === 'controle' ? 'text-cyan-600' : 'text-slate-400'}`}>
          <i className="fas fa-play-circle text-xl"></i>
          <span className="text-[9px] font-black uppercase tracking-widest">Controle</span>
          {activeTab === 'controle' && <div className="absolute bottom-0 w-[60%] h-[3px] bg-cyan-600 rounded-t-full mx-auto"></div>}
        </button>
        <button onClick={() => setActiveTab('alarme')} className={`flex-1 py-4 flex flex-col items-center gap-1 relative ${activeTab === 'alarme' ? 'text-cyan-600' : 'text-slate-400'}`}>
          <i className="fas fa-music text-xl"></i>
          <span className="text-[9px] font-black uppercase tracking-widest">Alarme</span>
          {activeTab === 'alarme' && <div className="absolute bottom-0 w-[60%] h-[3px] bg-cyan-600 rounded-t-full mx-auto"></div>}
        </button>
        <button onClick={() => setActiveTab('historico')} className={`flex-1 py-4 flex flex-col items-center gap-1 relative ${activeTab === 'historico' ? 'text-cyan-600' : 'text-slate-400'}`}>
          <i className="fas fa-history text-xl"></i>
          <span className="text-[9px] font-black uppercase tracking-widest">Histórico</span>
          {activeTab === 'historico' && <div className="absolute bottom-0 w-[60%] h-[3px] bg-cyan-600 rounded-t-full mx-auto"></div>}
        </button>
      </nav>

      <main className="flex-1 overflow-y-auto px-6 py-6 no-scrollbar bg-[#f8fafc]">
        
        {activeTab === 'controle' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-3">
            <div className={`bg-[#34495e] rounded-[2.5rem] p-8 text-center shadow-2xl border border-white/5 relative overflow-hidden transition-all duration-500 ${isAlarmActive ? 'ring-4 ring-red-500 shadow-red-500/30' : ''}`}>
               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-2">Tempo Ativo</span>
               <div className="text-6xl font-black font-mono text-white tracking-tighter drop-shadow-lg my-1">
                  {formatT(data.seconds)}
               </div>
               <div className="text-2xl font-black text-[#2ecc71] italic mt-1 mb-6 drop-shadow-sm">
                 {cur((data.seconds / 3600) * data.rate)}
               </div>
               
               <div className="bg-black/20 rounded-2xl py-2 px-4 mb-8 flex items-center justify-center gap-3 border border-white/5">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Travar Meta</span>
                  <input type="number" className="w-14 bg-white/10 text-center text-white font-black rounded-lg outline-none border border-white/20 p-1.5 text-xs" value={data.goalMinutes} onChange={e => setData({...data, goalMinutes: parseInt(e.target.value) || 0})} />
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Minutos</span>
               </div>

               <div className="grid grid-cols-2 gap-3 mb-3">
                  <button onClick={() => { setData({...data, active: true}); playSound('start'); }} className="bg-[#27ae60] text-white py-4 rounded-2xl font-black text-[10px] tracking-widest flex items-center justify-center gap-3 active:scale-95 shadow-lg">
                    <i className="fas fa-play"></i> INICIAR
                  </button>
                  <button onClick={() => { setData({...data, active: false}); playSound('stop'); }} className="bg-[#f1c40f] text-white py-4 rounded-2xl font-black text-[10px] tracking-widest flex items-center justify-center gap-3 active:scale-95 shadow-lg">
                    <i className="fas fa-pause"></i> PAUSAR
                  </button>
               </div>
               <button onClick={handleSave} className="w-full bg-[#e74c3c] text-white py-4 rounded-2xl font-black text-[10px] tracking-widest flex items-center justify-center gap-3 active:scale-95 shadow-xl">
                  <i className="fas fa-square"></i> FINALIZAR E SALVAR
               </button>
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 shadow-md border border-slate-100 space-y-6">
               <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1 mb-2 block tracking-widest">Cliente</label>
                    <input className="w-full bg-[#f8fafc] p-4 rounded-2xl border border-slate-100 font-black uppercase text-xs outline-none focus:border-cyan-500/50" placeholder="CLIENTE..." value={data.client} onChange={e => setData({...data, client: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1 mb-2 block tracking-widest">Projeto</label>
                    <input className="w-full bg-[#f8fafc] p-4 rounded-2xl border border-slate-100 font-black uppercase text-xs outline-none focus:border-cyan-500/50" placeholder="AMBIENTE..." value={data.project} onChange={e => setData({...data, project: e.target.value})} />
                  </div>
               </div>
               <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1 mb-2 block tracking-widest">Notas Técnicas</label>
                  <textarea className="w-full bg-[#f8fafc] p-4 rounded-2xl border border-slate-100 text-xs text-slate-600 font-medium h-32 outline-none resize-none leading-relaxed" placeholder="Pé direito, Paredes, Materiais..." value={data.notes} onChange={e => setData({...data, notes: e.target.value})} />
               </div>
               <div className="bg-[#f8fafc] p-7 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <span className="text-[9px] font-black text-cyan-600 italic uppercase block mb-3 tracking-widest">Valor da Hora Trabalhada</span>
                  <div className="flex items-center justify-between mb-5">
                     <span className="text-3xl font-black italic text-slate-900">R$ {Number(data.rate).toFixed(2).replace('.', ',')}</span>
                     <input type="number" className="w-20 bg-white border border-slate-200 text-center font-black p-3 rounded-xl text-sm" value={data.rate} onChange={e => setData({...data, rate: parseFloat(e.target.value) || 0})} />
                  </div>
                  <input type="range" min="1" max="500" className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-600 custom-range" value={data.rate} onChange={e => setData({...data, rate: parseInt(e.target.value)})} />
               </div>
            </div>
          </div>
        )}

        {activeTab === 'alarme' && (
           <div className="space-y-6 animate-in fade-in">
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 text-slate-400">Configuração de Alerta</h3>
                 <div className="flex items-center gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <div className="w-12 h-12 bg-cyan-100 rounded-2xl flex items-center justify-center">
                       <i className="fas fa-bell text-cyan-600 text-xl"></i>
                    </div>
                    <div className="flex-1">
                       <p className="text-[11px] font-black uppercase text-slate-700">Notificar Meta de Tempo</p>
                       <p className="text-[9px] text-slate-500">O sistema emitirá um sinal sonoro ao atingir.</p>
                    </div>
                    <button onClick={() => setIsAlarmActive(false)} className={`w-14 h-7 rounded-full relative transition-all ${data.goalMinutes > 0 ? 'bg-cyan-600' : 'bg-slate-300'}`}>
                       <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${data.goalMinutes > 0 ? 'right-1' : 'left-1'}`}></div>
                    </button>
                 </div>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 text-slate-400">Calculadora de Custos</h3>
                 <div className="grid grid-cols-2 gap-4 mb-4">
                    <input type="number" placeholder="HORAS..." className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-sm border border-slate-100 outline-none" value={calc.h || ''} onChange={e => setCalc({...calc, h: parseFloat(e.target.value) || 0})} />
                    <input type="number" placeholder="EXTRAS R$..." className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-sm border border-slate-100 outline-none" value={calc.e || ''} onChange={e => setCalc({...calc, e: parseFloat(e.target.value) || 0})} />
                 </div>
                 <div className="bg-cyan-600 rounded-[2rem] p-6 text-center shadow-lg">
                    <span className="text-[9px] font-black text-cyan-200 block mb-1 tracking-widest uppercase">ORÇAMENTO TOTAL ESTIMADO</span>
                    <div className="text-3xl font-black text-white">{cur((calc.h * data.rate) + calc.e)}</div>
                 </div>
              </div>
           </div>
        )}

        {activeTab === 'historico' && (
          <div className="space-y-5 animate-in slide-in-from-right-3">
            {data.history.map((h: any) => (
              <div key={String(h.id)} className="bg-white p-7 rounded-[2.5rem] border border-slate-200 shadow-md space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-3">
                    <h4 className="font-black text-sm text-slate-800 uppercase truncate tracking-tight">{String(h.project || 'Sem Título')}</h4>
                    <p className="text-[10px] font-bold text-cyan-600 uppercase mt-0.5 tracking-wide">{String(h.client || 'Sem Cliente')}</p>
                    <div className="flex gap-4 mt-3">
                      <p className="text-[9px] text-slate-400 font-black uppercase"><i className="fas fa-calendar-alt mr-1 opacity-50"></i> {String(h.date || '')}</p>
                      <p className="text-[9px] text-slate-400 font-black uppercase"><i className="fas fa-clock mr-1 opacity-50"></i> {formatT(Number(h.time || 0))}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#27ae60] font-black text-2xl drop-shadow-sm">{cur(Number(h.total || 0))}</div>
                    <button onClick={() => resumeHistory(h)} className="mt-3 text-[9px] font-black uppercase text-cyan-600 border border-cyan-100 bg-cyan-50 px-5 py-2 rounded-xl">RETOMAR</button>
                  </div>
                </div>
                {h.notes && (
                   <div className="p-4 bg-slate-50 rounded-2xl text-[10px] text-slate-500 italic border-l-4 border-cyan-500/30 leading-relaxed font-medium">
                      "{String(h.notes)}"
                   </div>
                )}
                <div className="grid grid-cols-4 gap-3 pt-3 border-t border-slate-50">
                   <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`*RELATÓRIO LUCANO DESIGNER3D*\n*Projeto:* ${h.project}\n*Total:* ${cur(h.total)}`)}`)} className="flex flex-col items-center justify-center p-3 rounded-2xl hover:bg-emerald-50 transition-all">
                      <i className="fab fa-whatsapp text-emerald-500 text-lg mb-1"></i>
                      <span className="text-[8px] font-black uppercase text-slate-500">Zap</span>
                   </button>
                   <button onClick={() => confirm("Apagar?") && setData((p:any) => ({...p, history: p.history.filter((x:any) => x.id !== h.id)}))} className="flex flex-col items-center justify-center p-3 rounded-2xl hover:bg-red-50 transition-all">
                      <i className="fas fa-trash text-red-500 text-lg mb-1"></i>
                      <span className="text-[8px] font-black uppercase text-slate-500">Deletar</span>
                   </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="p-6 bg-white border-t border-slate-100 text-center z-10 shadow-inner">
         <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
           LUCANO DESIGNER3D V16.0 PREMIUM
           <br />
           <span className="opacity-60 font-bold">RUA BETÂNIA N392 BAIRRO OLIVEIRA</span>
           <br />
           Tel / <span className="text-emerald-500 font-black">WhatsApp:</span> 74 9 91108629
         </div>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);