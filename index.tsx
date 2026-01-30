import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

const BRAND_NAME = 'LUCANO DESIGNER3D';
const ADDRESS = 'Rua Betânia N392 Bairro Oliveira';
const CONTACT = 'Tel / WhatsApp: 74 9 91108629';

// Sons de alerta e feedback
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
      const saved = localStorage.getItem('lucano_v30_final');
      if (!saved) return { client: '', project: '', notes: '', rate: 15, seconds: 0, active: false, goalMinutes: 1, history: [] };
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        active: false,
        history: Array.isArray(parsed.history) ? parsed.history : []
      };
    } catch {
      return { client: '', project: '', notes: '', rate: 15, seconds: 0, active: false, goalMinutes: 1, history: [] };
    }
  });

  const [activeTab, setActiveTab] = useState<'controle' | 'historico'>('controle');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  
  const timerRef = useRef<any>(null);
  const alarmRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('lucano_v30_final', JSON.stringify(data));
  }, [data]);

  // Cronômetro Progressivo
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

  // Meta de Alarme
  useEffect(() => {
    const goalSec = (data.goalMinutes || 0) * 60;
    if (data.active && goalSec > 0 && data.seconds >= goalSec) {
      setData(prev => ({ ...prev, active: false, seconds: goalSec }));
      setIsAlarmActive(true);
    }
  }, [data.seconds, data.active, data.goalMinutes]);

  // Loop do Alarme
  useEffect(() => {
    if (isAlarmActive) {
      playSound('alarm');
      alarmRef.current = setInterval(() => playSound('alarm'), 2500);
    } else {
      clearInterval(alarmRef.current);
    }
    return () => clearInterval(alarmRef.current);
  }, [isAlarmActive]);

  const formatT = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sc = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sc.toString().padStart(2, '0')}`;
  };

  const cur = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // SALVAR: Limpa o cronômetro e adiciona ao histórico
  const handleSave = () => {
    if (data.seconds < 1) return alert("Nada para salvar.");

    const now = new Date();
    const endTime = now.toLocaleString('pt-BR');
    const startTimeDate = new Date(now.getTime() - data.seconds * 1000);
    const startTime = startTimeDate.toLocaleString('pt-BR');

    const entry = {
      id: Date.now().toString(),
      project: String(data.project || "SEM NOME"),
      client: String(data.client || "SEM CLIENTE"),
      notes: String(data.notes || ""),
      time: Number(data.seconds),
      rate: Number(data.rate),
      total: Number((data.seconds / 3600) * data.rate),
      date: now.toLocaleDateString('pt-BR'),
      startTime,
      endTime
    };

    setData((p: any) => ({ 
      ...p, 
      seconds: 0, 
      active: false, 
      history: [entry, ...p.history] 
    }));
    
    setIsAlarmActive(false);
    setActiveTab('historico');
    playSound('success');
  };

  // CONTINUAR: Retoma do tempo salvo e continua contando
  const resumeHistory = (h: any) => {
    setData((p: any) => ({
      ...p,
      project: String(h.project),
      client: String(h.client),
      notes: String(h.notes),
      rate: Number(h.rate),
      seconds: Number(h.time),
      active: true // Volta a contar imediatamente
    }));
    setIsAlarmActive(false);
    setActiveTab('controle');
    playSound('start');
  };

  // EXPORTAÇÃO WORD (Com BOM UTF-8 para abrir direto sem erro)
  const exportWord = (content: string, filename: string) => {
    const BOM = "\ufeff"; 
    const blob = new Blob([BOM + content], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectedProjects = data.history.filter((h: any) => selectedIds.includes(h.id));
  const sumTotal = selectedProjects.reduce((acc: number, h: any) => acc + h.total, 0);
  const sumSeconds = selectedProjects.reduce((acc: number, h: any) => acc + h.time, 0);

  const getIndividualText = (h: any) => {
    return `${BRAND_NAME}\n${ADDRESS}\n${CONTACT}\n\nRELATÓRIO DE PRODUÇÃO\n\nCLIENTE: ${h.client}\nPROJETO: ${h.project}\nINÍCIO: ${h.startTime}\nFIM: ${h.endTime}\nVALOR HORA: ${cur(h.rate)}\nTEMPO: ${formatT(h.time)}\nVALOR TOTAL: ${cur(h.total)}\n\nNOTAS: ${h.notes || '-'}`;
  };

  const getSumText = () => {
    let t = `${BRAND_NAME}\n${ADDRESS}\n${CONTACT}\n\nRELATÓRIO DE SOMA UNIFICADA\n\nPROJETO | CLIENTE | DATA | TEMPO | TOTAL\n`;
    selectedProjects.forEach(p => t += `${p.project} | ${p.client} | ${p.date} | ${formatT(p.time)} | ${cur(p.total)}\n`);
    t += `\nSOMA ACUMULADA: ${formatT(sumSeconds)} | ${cur(sumTotal)}`;
    return t;
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#f8fafc] text-slate-900 overflow-hidden select-none">
      
      {/* CABEÇALHO PADRÃO */}
      <header className="header-premium shadow-lg z-30">
        <h1 className="text-2xl font-black italic tracking-tighter text-white uppercase">{BRAND_NAME}</h1>
        <div className="text-[10px] font-bold text-slate-200 mt-2">
          {ADDRESS}<br />
          Tel / WhatsApp: 74 9 91108629
        </div>
      </header>

      {/* NAVEGAÇÃO */}
      <nav className="flex bg-white border-b border-slate-300 z-20">
        <button onClick={() => setActiveTab('controle')} className={`flex-1 py-4 flex flex-col items-center gap-1 relative ${activeTab === 'controle' ? 'text-slate-900' : 'text-slate-400'}`}>
          <i className="fas fa-clock text-xl"></i>
          <span className="text-[10px] font-black uppercase tracking-widest">Controle</span>
          {activeTab === 'controle' && <div className="absolute bottom-0 w-full h-[4px] bg-slate-600"></div>}
        </button>
        <button onClick={() => setActiveTab('historico')} className={`flex-1 py-4 flex flex-col items-center gap-1 relative ${activeTab === 'historico' ? 'text-slate-900' : 'text-slate-400'}`}>
          <i className="fas fa-calculator text-xl"></i>
          <span className="text-[10px] font-black uppercase tracking-widest">Histórico</span>
          {activeTab === 'historico' && <div className="absolute bottom-0 w-full h-[4px] bg-slate-600"></div>}
        </button>
      </nav>

      <main className="flex-1 overflow-y-auto px-6 py-5 no-scrollbar">
        
        {activeTab === 'controle' && (
          <div className="space-y-5 animate-in">
            
            {/* TIMER */}
            <div className={`bg-[#334155] rounded-[2.5rem] p-10 text-center shadow-2xl border border-white/10 relative ${isAlarmActive ? 'ring-8 ring-red-500 animate-pulse' : ''}`}>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">TEMPO EM PRODUÇÃO</span>
               <div className="text-7xl font-black font-mono text-white tracking-tighter my-2">
                  {formatT(data.seconds)}
               </div>
               <div className="text-3xl font-black text-[#00a8cc] italic mb-8">
                 {cur((data.seconds / 3600) * data.rate)}
               </div>
               
               <div className="bg-black/20 rounded-2xl py-3 px-5 mb-10 flex items-center justify-center gap-4 border border-white/10">
                  <span className="text-[9px] font-black text-slate-300 uppercase">Alertar em (Min):</span>
                  <input type="number" className="w-16 bg-white/10 text-center text-white font-black rounded-lg outline-none border border-white/20 p-1.5 text-xs" value={data.goalMinutes} onChange={e => setData({...data, goalMinutes: parseInt(e.target.value) || 0})} />
               </div>

               <div className="grid grid-cols-2 gap-4 mb-4">
                  <button onClick={() => { setData({...data, active: true}); playSound('start'); setIsAlarmActive(false); }} className="bg-[#27ae60] text-white py-5 rounded-2xl font-black text-[11px] tracking-widest shadow-xl active:scale-95">
                    INICIAR
                  </button>
                  <button onClick={() => { setData({...data, active: false}); playSound('stop'); }} className="bg-[#f1c40f] text-white py-5 rounded-2xl font-black text-[11px] tracking-widest shadow-xl active:scale-95">
                    PAUSAR
                  </button>
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                  <button onClick={handleSave} className="bg-[#e74c3c] text-white py-5 rounded-2xl font-black text-[11px] tracking-widest shadow-xl active:scale-95">
                    SALVAR
                  </button>
                  <button onClick={() => data.history[0] && resumeHistory(data.history[0])} className="bg-[#3498db] text-white py-5 rounded-2xl font-black text-[11px] tracking-widest shadow-xl active:scale-95">
                    CONTINUAR
                  </button>
               </div>
            </div>

            {/* FORMULÁRIO E ANOTAÇÕES */}
            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 space-y-5">
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Cliente</label>
                    <input className="w-full bg-[#f8fafc] p-4 rounded-2xl border border-slate-200 font-black uppercase text-xs" placeholder="NOME..." value={data.client} onChange={e => setData({...data, client: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Projeto</label>
                    <input className="w-full bg-[#f8fafc] p-4 rounded-2xl border border-slate-200 font-black uppercase text-xs" placeholder="AMBIENTE..." value={data.project} onChange={e => setData({...data, project: e.target.value})} />
                  </div>
               </div>
               <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Anotações Técnicas</label>
                  <textarea className="w-full bg-[#f8fafc] p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 font-medium h-24 outline-none resize-none" placeholder="Cores, MDF, Medidas..." value={data.notes} onChange={e => setData({...data, notes: e.target.value})} />
               </div>
            </div>
          </div>
        )}

        {activeTab === 'historico' && (
          <div className="space-y-8 animate-in pb-20">
            
            {/* CALCULADORA DE SOMA UNIFICADA (LAYOUT IMAGEM 2) */}
            {selectedIds.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-400 shadow-2xl overflow-hidden mb-12">
                 <div className="header-premium py-6">
                    <h2 className="text-xl font-black italic">{BRAND_NAME}</h2>
                    <p className="text-[9px] text-slate-200 uppercase tracking-widest">Soma Unificada</p>
                 </div>
                 <div className="p-3 overflow-x-auto">
                    <table className="sum-table">
                       <thead>
                          <tr>
                             <th>Projeto</th>
                             <th>Cliente</th>
                             <th>Tempo</th>
                             <th>Total</th>
                          </tr>
                       </thead>
                       <tbody>
                          {selectedProjects.map(p => (
                             <tr key={p.id}>
                                <td>{p.project}</td>
                                <td className="text-cyan-premium font-black">{p.client}</td>
                                <td className="font-black text-cyan-premium">{formatT(p.time)}</td>
                                <td className="text-green-premium font-black">{cur(p.total)}</td>
                             </tr>
                          ))}
                          <tr className="bg-slate-50 border-t-2 border-slate-300">
                             <td colSpan={2} className="text-right font-black py-4 uppercase text-[10px]">Total Calculado:</td>
                             <td className="font-black text-cyan-premium text-base">{formatT(sumSeconds)}</td>
                             <td className="font-black text-green-premium text-base">{cur(sumTotal)}</td>
                          </tr>
                       </tbody>
                    </table>
                 </div>
                 <div className="flex p-3 bg-slate-100 gap-2 border-t border-slate-300">
                    <button onClick={() => exportWord(getSumText(), 'Relatorio_Soma')} className="flex-1 bg-[#3498db] text-white p-3 rounded-xl text-[10px] font-black uppercase shadow-md">Salvar Soma no Word</button>
                    <button onClick={() => setSelectedIds([])} className="bg-slate-500 text-white p-3 rounded-xl text-[10px] font-black uppercase shadow-md px-6">Limpar</button>
                 </div>
              </div>
            )}

            {/* LISTAGEM (LAYOUT IMAGEM 1) */}
            <div className="space-y-12">
              {data.history.map((h: any) => (
                <div key={String(h.id)} className="relative">
                  {/* CAIXINHA DE SELEÇÃO */}
                  <div className="absolute top-4 left-[-26px] z-10">
                    <input type="checkbox" className="cb-custom" checked={selectedIds.includes(h.id)} onChange={() => toggleSelect(h.id)} />
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-400 shadow-xl overflow-hidden">
                    <div className="header-premium py-6">
                      <h2 className="text-2xl font-black italic uppercase">{BRAND_NAME}</h2>
                      <p className="text-[9px] text-slate-300 mt-1 uppercase">{ADDRESS}</p>
                      <p className="text-[9px] text-slate-300">{CONTACT}</p>
                    </div>
                    
                    <h3 className="text-center py-5 font-black text-[11px] text-slate-500 border-b border-slate-200 uppercase tracking-widest bg-slate-50">Relatório de Produção</h3>
                    
                    <div className="p-6">
                      <table className="report-table">
                        <tbody>
                          <tr><td>Cliente:</td><td>{h.client}</td></tr>
                          <tr><td>Projeto:</td><td>{h.project}</td></tr>
                          <tr><td>Início/Fim:</td><td>{h.startTime} - {h.endTime}</td></tr>
                          <tr><td className="text-cyan-premium">Tempo:</td><td className="text-cyan-premium">{formatT(h.time)}</td></tr>
                          <tr className="bg-green-soft"><td className="text-green-premium">Valor:</td><td className="text-green-premium">{cur(h.total)}</td></tr>
                        </tbody>
                      </table>

                      <div className="grid grid-cols-3 gap-3 mt-8 border-t border-slate-100 pt-6">
                        <button onClick={() => exportWord(getIndividualText(h), `Relatorio_${h.project}`)} className="bg-[#3498db] text-white py-4 rounded-xl text-[9px] font-black uppercase shadow-md">Salvar Word</button>
                        <button onClick={() => resumeHistory(h)} className="bg-[#00a8cc] text-white py-4 rounded-xl text-[9px] font-black uppercase shadow-md">Continuar</button>
                        <button onClick={() => confirm("Apagar?") && setData((p:any) => ({...p, history: p.history.filter((x:any) => x.id !== h.id)}))} className="bg-red-500 text-white py-4 rounded-xl text-[9px] font-black uppercase shadow-md">Excluir</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="p-4 bg-white border-t border-slate-300 text-center z-10">
         <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
           LUCANO DESIGNER3D V30.0 - GESTÃO PREMIUM
         </div>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);