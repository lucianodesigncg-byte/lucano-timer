import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

const BRAND_NAME = 'LUCANO DESIGNER3D';
const ADDRESS = 'Rua Betânia N392 Bairro Oliveira';
const CONTACT = 'Tel / WhatsApp: 74 9 91108629';

// Sistema de áudio para o alarme
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
      const saved = localStorage.getItem('lucano_v25_final');
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

  const [activeTab, setActiveTab] = useState<'controle' | 'historico'>('controle');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  
  const timerRef = useRef<any>(null);
  const alarmRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('lucano_v25_final', JSON.stringify(data));
  }, [data]);

  // Cronômetro progressivo
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

  // Meta de tempo
  useEffect(() => {
    const goalSec = (data.goalMinutes || 0) * 60;
    if (data.active && goalSec > 0 && data.seconds >= goalSec) {
      setData(prev => ({ ...prev, active: false, seconds: goalSec }));
      setIsAlarmActive(true);
    }
  }, [data.seconds, data.active, data.goalMinutes]);

  // Alarme em loop
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

  // SALVAR PROJETO: Para alarme, zera cronômetro e salva no histórico
  const handleSave = () => {
    if (data.seconds < 1) return alert("Nenhum tempo para salvar.");

    const now = new Date();
    const endTime = now.toLocaleString('pt-BR');
    const startTimeDate = new Date(now.getTime() - data.seconds * 1000);
    const startTime = startTimeDate.toLocaleString('pt-BR');

    const entry = {
      id: Date.now().toString(),
      project: String(data.project || "PROJETO SEM NOME"),
      client: String(data.client || "CLIENTE NÃO INFORMADO"),
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
      seconds: 0, // Zera após salvar
      active: false, 
      history: [entry, ...p.history] 
    }));
    
    setIsAlarmActive(false); // Para o alarme
    setActiveTab('historico');
    playSound('success');
  };

  // CONTINUAR: Retoma tempo acumulado e volta a contar
  const resumeHistory = (h: any) => {
    setData((p: any) => ({
      ...p,
      project: String(h.project),
      client: String(h.client),
      notes: String(h.notes),
      rate: Number(h.rate),
      seconds: Number(h.time), // Retoma o tempo
      active: true // Já começa contando
    }));
    setIsAlarmActive(false);
    setActiveTab('controle');
    playSound('start');
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectedProjects = data.history.filter((h: any) => selectedIds.includes(h.id));
  const sumTotal = selectedProjects.reduce((acc: number, h: any) => acc + h.total, 0);
  const sumSeconds = selectedProjects.reduce((acc: number, h: any) => acc + h.time, 0);

  // EXPORTAÇÃO WORD (Com BOM UTF-8 para evitar erro de codificação)
  const exportWord = (content: string, name: string) => {
    const BOM = "\ufeff"; // Byte Order Mark para UTF-8
    const blob = new Blob([BOM + content], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateIndividualText = (h: any) => {
    return `${BRAND_NAME}\n${ADDRESS}\n${CONTACT}\n\nRELATÓRIO INDIVIDUAL DE PRODUÇÃO\n\nCLIENTE: ${h.client}\nPROJETO: ${h.project}\nINÍCIO: ${h.startTime}\nFIM: ${h.endTime}\nVALOR HORA: ${cur(h.rate)}\nTEMPO TOTAL: ${formatT(h.time)}\nVALOR TOTAL: ${cur(h.total)}\n\nNOTAS TÉCNICAS:\n${h.notes || '-'}`;
  };

  const generateSumText = () => {
    let t = `${BRAND_NAME}\n${ADDRESS}\n${CONTACT}\n\nRELATÓRIO DE SOMA UNIFICADA\n\nPROJETO | CLIENTE | DATA | TEMPO | TOTAL\n`;
    selectedProjects.forEach(p => {
      t += `${p.project} | ${p.client} | ${p.date} | ${formatT(p.time)} | ${cur(p.total)}\n`;
    });
    t += `\nSOMA ACUMULADA: ${formatT(sumSeconds)} | ${cur(sumTotal)}`;
    return t;
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#f8fafc] text-slate-900 font-sans overflow-hidden select-none">
      
      {/* CABEÇALHO SLATE GRAY */}
      <header className="header-premium shadow-lg z-30">
        <h1 className="text-2xl font-black italic tracking-tighter text-white uppercase">{BRAND_NAME}</h1>
        <div className="text-[10px] font-bold text-slate-200 mt-2">
          {ADDRESS}<br />
          Tel / <span className="text-[#27ae60]">WhatsApp:</span> 74 9 91108629
        </div>
      </header>

      {/* ABAS */}
      <nav className="flex bg-white border-b border-slate-300 z-20">
        <button onClick={() => setActiveTab('controle')} className={`flex-1 py-4 flex flex-col items-center gap-1 relative ${activeTab === 'controle' ? 'text-slate-900' : 'text-slate-400'}`}>
          <i className="fas fa-play-circle text-xl"></i>
          <span className="text-[10px] font-black uppercase tracking-widest">Controle Ativo</span>
          {activeTab === 'controle' && <div className="absolute bottom-0 w-full h-[4px] bg-slate-600"></div>}
        </button>
        <button onClick={() => setActiveTab('historico')} className={`flex-1 py-4 flex flex-col items-center gap-1 relative ${activeTab === 'historico' ? 'text-slate-900' : 'text-slate-400'}`}>
          <i className="fas fa-file-invoice-dollar text-xl"></i>
          <span className="text-[10px] font-black uppercase tracking-widest">Histórico Trabalho</span>
          {activeTab === 'historico' && <div className="absolute bottom-0 w-full h-[4px] bg-slate-600"></div>}
        </button>
      </nav>

      <main className="flex-1 overflow-y-auto px-6 py-5 no-scrollbar">
        
        {activeTab === 'controle' && (
          <div className="space-y-5 animate-in">
            
            {/* CARD DO CRONÔMETRO */}
            <div className={`bg-[#334155] rounded-[2.5rem] p-10 text-center shadow-2xl border border-white/10 relative transition-all duration-500 ${isAlarmActive ? 'ring-[12px] ring-red-500 animate-pulse' : ''}`}>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">GESTÃO DE PRODUÇÃO</span>
               <div className="text-7xl font-black font-mono text-white tracking-tighter my-2">
                  {formatT(data.seconds)}
               </div>
               <div className="text-3xl font-black text-[#2ecc71] italic mb-8">
                 {cur((data.seconds / 3600) * data.rate)}
               </div>
               
               <div className="bg-black/20 rounded-2xl py-3 px-5 mb-10 flex items-center justify-center gap-4 border border-white/10">
                  <span className="text-[9px] font-black text-slate-300 uppercase">Estipular Meta (Min):</span>
                  <input type="number" className="w-16 bg-white/10 text-center text-white font-black rounded-lg outline-none border border-white/20 p-1.5 text-xs" value={data.goalMinutes} onChange={e => setData({...data, goalMinutes: parseInt(e.target.value) || 0})} />
               </div>

               <div className="grid grid-cols-2 gap-4 mb-4">
                  <button onClick={() => { setData({...data, active: true}); playSound('start'); setIsAlarmActive(false); }} className="bg-[#27ae60] text-white py-5 rounded-2xl font-black text-[11px] tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all">
                    <i className="fas fa-play"></i> INICIAR
                  </button>
                  <button onClick={() => { setData({...data, active: false}); playSound('stop'); }} className="bg-[#f1c40f] text-white py-5 rounded-2xl font-black text-[11px] tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all">
                    <i className="fas fa-pause"></i> PAUSAR
                  </button>
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                  <button onClick={handleSave} className="bg-[#e74c3c] text-white py-5 rounded-2xl font-black text-[11px] tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 border-2 border-white/20">
                    <i className="fas fa-save"></i> SALVAR PROJETO
                  </button>
                  <button onClick={() => data.history[0] && resumeHistory(data.history[0])} className="bg-[#3498db] text-white py-5 rounded-2xl font-black text-[11px] tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95">
                    <i className="fas fa-undo"></i> CONTINUAR TRABALHO
                  </button>
               </div>
            </div>

            {/* ENTRADA DE DADOS */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200 space-y-5">
               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block">Cliente</label>
                    <input className="w-full bg-[#f8fafc] p-4 rounded-2xl border border-slate-200 font-black uppercase text-xs" placeholder="CLIENTE..." value={data.client} onChange={e => setData({...data, client: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block">Projeto</label>
                    <input className="w-full bg-[#f8fafc] p-4 rounded-2xl border border-slate-200 font-black uppercase text-xs" placeholder="AMBIENTE..." value={data.project} onChange={e => setData({...data, project: e.target.value})} />
                  </div>
               </div>
               <div className="bg-[#f8fafc] p-5 rounded-[2rem] border border-slate-200 text-center">
                  <span className="text-[9px] font-black text-slate-500 uppercase block mb-3 tracking-widest">Valor da Hora Trabalhada</span>
                  <div className="flex items-center justify-between mb-3 px-2">
                     <span className="text-3xl font-black italic">R$ {Number(data.rate).toFixed(2).replace('.', ',')}</span>
                     <input type="number" className="w-20 bg-white border border-slate-300 text-center font-black p-3 rounded-xl text-sm" value={data.rate} onChange={e => setData({...data, rate: parseFloat(e.target.value) || 0})} />
                  </div>
                  <input type="range" min="1" max="500" className="w-full h-1.5 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-slate-700" value={data.rate} onChange={e => setData({...data, rate: parseInt(e.target.value)})} />
               </div>
            </div>
          </div>
        )}

        {activeTab === 'historico' && (
          <div className="space-y-8 animate-in pb-20">
            
            {/* CALCULADORA DE SOMA UNIFICADA (IMAGEM 2) */}
            {selectedIds.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-400 shadow-2xl overflow-hidden mb-12 animate-in">
                 <div className="header-premium py-6">
                    <h2 className="text-xl font-black italic tracking-tighter uppercase">{BRAND_NAME}</h2>
                    <p className="text-[9px] text-slate-200 mt-1 uppercase tracking-widest">Calculadora de Soma Unificada</p>
                 </div>
                 
                 <div className="p-3 overflow-x-auto">
                    <table className="sum-table">
                       <thead>
                          <tr>
                             <th>Projeto</th>
                             <th>Cliente</th>
                             <th>Data</th>
                             <th>Valor Hora</th>
                             <th>Tempo</th>
                             <th>Valor Total</th>
                          </tr>
                       </thead>
                       <tbody>
                          {selectedProjects.map(p => (
                             <tr key={p.id}>
                                <td>{p.project}</td>
                                <td className="text-cyan-premium font-black">{p.client}</td>
                                <td className="text-[10px]">{p.date}</td>
                                <td>{cur(p.rate)}</td>
                                <td className="font-black text-cyan-premium">{formatT(p.time)}</td>
                                <td className="text-green-premium font-black">{cur(p.total)}</td>
                             </tr>
                          ))}
                          <tr className="bg-slate-50 border-t-2 border-slate-300">
                             <td colSpan={4} className="text-right font-black py-5 uppercase text-[10px]">Soma Acumulada Selecionada:</td>
                             <td className="font-black text-cyan-premium text-base">{formatT(sumSeconds)}</td>
                             <td className="font-black text-green-premium text-base">{cur(sumTotal)}</td>
                          </tr>
                       </tbody>
                    </table>
                 </div>

                 <div className="grid grid-cols-3 gap-2 p-3 bg-slate-100 border-t border-slate-300">
                    <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(generateSumText())}`)} className="bg-[#27ae60] text-white p-3 rounded-xl text-[10px] font-black uppercase shadow-md flex items-center justify-center gap-2"><i className="fab fa-whatsapp"></i> Zap</button>
                    <button onClick={() => exportWord(generateSumText(), 'Relatorio_Unificado')} className="bg-[#3498db] text-white p-3 rounded-xl text-[10px] font-black uppercase shadow-md flex items-center justify-center gap-2"><i className="fas fa-file-word"></i> Word</button>
                    <button onClick={() => setSelectedIds([])} className="bg-slate-500 text-white p-3 rounded-xl text-[10px] font-black uppercase shadow-md">Limpar</button>
                 </div>
              </div>
            )}

            {/* LISTAGEM DOS RELATÓRIOS INDIVIDUAIS (IMAGEM 1) */}
            <div className="space-y-12">
              {data.history.map((h: any) => (
                <div key={String(h.id)} className="relative">
                  {/* CHECKBOX DE SELEÇÃO */}
                  <div className="absolute top-4 left-[-26px] z-10">
                    <input type="checkbox" className="cb-custom" checked={selectedIds.includes(h.id)} onChange={() => toggleSelect(h.id)} />
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-400 shadow-xl overflow-hidden">
                    <div className="header-premium py-6">
                      <h2 className="text-2xl font-black italic tracking-tighter uppercase">{BRAND_NAME}</h2>
                      <p className="text-[9px] text-slate-300 mt-1 uppercase">{ADDRESS}</p>
                      <p className="text-[9px] text-slate-300">{CONTACT}</p>
                    </div>
                    
                    <h3 className="text-center py-5 font-black text-[11px] text-slate-500 border-b border-slate-200 uppercase tracking-widest bg-slate-50">Relatório Individual de Produção</h3>
                    
                    <div className="p-6">
                      <table className="report-table">
                        <tbody>
                          <tr><td>Cliente:</td><td>{h.client}</td></tr>
                          <tr><td>Projeto:</td><td>{h.project}</td></tr>
                          <tr><td>Data Início:</td><td>{h.startTime}</td></tr>
                          <tr><td>Data Fim:</td><td>{h.endTime}</td></tr>
                          <tr><td>Valor Hora:</td><td>{cur(h.rate)}</td></tr>
                          <tr><td className="text-cyan-premium">Tempo Total:</td><td className="text-cyan-premium">{formatT(h.time)}</td></tr>
                          <tr className="bg-green-soft"><td className="text-green-premium">Valor Total:</td><td className="text-green-premium">{cur(h.total)}</td></tr>
                        </tbody>
                      </table>

                      <div className="grid grid-cols-4 gap-3 mt-8 border-t border-slate-100 pt-6">
                        <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(generateIndividualText(h))}`)} className="flex flex-col items-center justify-center p-3 rounded-2xl hover:bg-emerald-50 text-[#27ae60] transition-colors">
                          <i className="fab fa-whatsapp text-2xl"></i>
                          <span className="text-[8px] font-black uppercase mt-2">Zap</span>
                        </button>
                        <button onClick={() => exportWord(generateIndividualText(h), `Relatorio_${h.project}`)} className="flex flex-col items-center justify-center p-3 rounded-2xl hover:bg-blue-50 text-[#3498db] transition-colors">
                          <i className="fas fa-file-word text-2xl"></i>
                          <span className="text-[8px] font-black uppercase mt-2">Word</span>
                        </button>
                        <button onClick={() => resumeHistory(h)} className="flex flex-col items-center justify-center p-3 rounded-2xl hover:bg-cyan-50 text-[#00a8cc] transition-colors">
                          <i className="fas fa-play-circle text-2xl"></i>
                          <span className="text-[8px] font-black uppercase mt-2">Continuar</span>
                        </button>
                        <button onClick={() => confirm("Apagar registro?") && setData((p:any) => ({...p, history: p.history.filter((x:any) => x.id !== h.id)}))} className="flex flex-col items-center justify-center p-3 rounded-2xl hover:bg-red-50 text-red-500 transition-colors">
                          <i className="fas fa-trash-alt text-2xl"></i>
                          <span className="text-[8px] font-black uppercase mt-2">Excluir</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="p-4 bg-white border-t border-slate-300 text-center z-10 shadow-inner">
         <div className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] leading-relaxed">
           LUCANO DESIGNER3D V25.0 - GESTÃO PREMIUM AI
         </div>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);