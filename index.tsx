import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

const BRAND_NAME = 'LUCANO DESIGNER3D';
const ADDRESS = 'Rua Betânia N392 Bairro Oliveira';
const CONTACT = 'Tel / WhatsApp: 74 9 91108629';

// Função de áudio para o alarme
const playSound = (type: 'start' | 'stop' | 'alarm' | 'success') => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
    const trigger = (freq: number, dur: number, typeWave: OscillatorType = 'sine', vol = 0.15) => {
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
      const saved = localStorage.getItem('lucano_v20_prod');
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
  const alarmIntervalRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('lucano_v20_prod', JSON.stringify(data));
  }, [data]);

  // Cronômetro
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

  // Regra de Meta Alcançada
  useEffect(() => {
    const goalSec = (data.goalMinutes || 0) * 60;
    if (data.active && goalSec > 0 && data.seconds >= goalSec) {
      // Quando termina o tempo: para o cronômetro e ativa o alarme contínuo
      setData(prev => ({ ...prev, active: false, seconds: goalSec }));
      setIsAlarmActive(true);
    }
  }, [data.seconds, data.active, data.goalMinutes]);

  // Alarme contínuo (loop até salvar)
  useEffect(() => {
    if (isAlarmActive) {
      playSound('alarm');
      alarmIntervalRef.current = setInterval(() => playSound('alarm'), 2500);
    } else {
      clearInterval(alarmIntervalRef.current);
    }
    return () => clearInterval(alarmIntervalRef.current);
  }, [isAlarmActive]);

  const formatT = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sc = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sc.toString().padStart(2, '0')}`;
  };

  const cur = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // SALVAR PROJETO (Req: Para o alarme e gera relatório)
  const handleSave = () => {
    if (data.seconds < 1) return alert("Nenhum tempo registrado para salvar.");

    const now = new Date();
    const endTimeStr = now.toLocaleString('pt-BR');
    const startTimeDate = new Date(now.getTime() - data.seconds * 1000);
    const startTimeStr = startTimeDate.toLocaleString('pt-BR');

    const entry = {
      id: Date.now().toString(),
      project: String(data.project || "SEM NOME"),
      client: String(data.client || "SEM CLIENTE"),
      notes: String(data.notes || ""),
      time: Number(data.seconds),
      rate: Number(data.rate),
      total: Number((data.seconds / 3600) * data.rate),
      date: now.toLocaleDateString('pt-BR'),
      startTime: startTimeStr,
      endTime: endTimeStr
    };

    setData((p: any) => ({ 
      ...p, 
      seconds: 0, // Zera o cronômetro
      active: false, 
      history: [entry, ...p.history] 
    }));
    
    setIsAlarmActive(false); // Para o alarme
    setActiveTab('historico');
    playSound('success');
  };

  const resumeHistory = (h: any) => {
    setData((p: any) => ({
      ...p,
      project: String(h.project),
      client: String(h.client),
      notes: String(h.notes),
      rate: Number(h.rate),
      seconds: 0, // Inicia do zero ao retomar novo ciclo
      active: false
    }));
    setActiveTab('controle');
    playSound('start');
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectedProjects = data.history.filter((h: any) => selectedIds.includes(h.id));
  const sumTotal = selectedProjects.reduce((acc: number, h: any) => acc + h.total, 0);
  const sumSeconds = selectedProjects.reduce((acc: number, h: any) => acc + h.time, 0);

  // Formatação de texto para exportação
  const getIndividualText = (h: any) => {
    return `${BRAND_NAME}\n${ADDRESS}\n${CONTACT}\n\nRELATÓRIO INDIVIDUAL DE PRODUÇÃO\n\nCLIENTE: ${h.client}\nPROJETO: ${h.project}\nDATA INÍCIO: ${h.startTime}\nDATA FIM: ${h.endTime}\nVALOR HORA: ${cur(h.rate)}\nTEMPO TOTAL: ${formatT(h.time)}\nVALOR TOTAL: ${cur(h.total)}\n\nNOTAS: ${h.notes || '-'}`;
  };

  const getSumText = () => {
    let t = `${BRAND_NAME}\n${ADDRESS}\n${CONTACT}\n\nRELATÓRIO DE SOMA UNIFICADA\n\nPROJETO | CLIENTE | DATA | TOTAL\n`;
    selectedProjects.forEach(p => t += `${p.project} | ${p.client} | ${p.date} | ${cur(p.total)}\n`);
    t += `\nSOMA ACUMULADA: ${formatT(sumSeconds)} | ${cur(sumTotal)}`;
    return t;
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#f1f5f9] text-slate-800 font-sans overflow-hidden select-none">
      
      {/* HEADER PRINCIPAL */}
      <header className="header-premium shadow-lg z-30">
        <h1 className="text-2xl font-black italic tracking-tighter text-white uppercase">{BRAND_NAME}</h1>
        <div className="text-[9px] font-bold text-slate-200 mt-1">
          {ADDRESS}<br />
          {CONTACT}
        </div>
      </header>

      {/* ABAS */}
      <nav className="flex bg-white border-b border-slate-300 z-20">
        <button onClick={() => setActiveTab('controle')} className={`flex-1 py-4 flex flex-col items-center gap-1 relative ${activeTab === 'controle' ? 'text-slate-900' : 'text-slate-400'}`}>
          <i className="fas fa-play-circle text-xl"></i>
          <span className="text-[9px] font-black uppercase tracking-widest">Controle</span>
          {activeTab === 'controle' && <div className="absolute bottom-0 w-full h-[3px] bg-slate-600"></div>}
        </button>
        <button onClick={() => setActiveTab('historico')} className={`flex-1 py-4 flex flex-col items-center gap-1 relative ${activeTab === 'historico' ? 'text-slate-900' : 'text-slate-400'}`}>
          <i className="fas fa-file-invoice-dollar text-xl"></i>
          <span className="text-[9px] font-black uppercase tracking-widest">Relatórios</span>
          {activeTab === 'historico' && <div className="absolute bottom-0 w-full h-[3px] bg-slate-600"></div>}
        </button>
      </nav>

      <main className="flex-1 overflow-y-auto px-5 py-4 no-scrollbar">
        
        {activeTab === 'controle' && (
          <div className="space-y-4 animate-in">
            
            {/* DISPLAY DE TEMPO */}
            <div className={`bg-[#334155] rounded-[2.5rem] p-8 text-center shadow-xl border border-white/10 relative transition-all duration-500 ${isAlarmActive ? 'ring-8 ring-red-500 animate-pulse' : ''}`}>
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">PRODUÇÃO ATIVA</span>
               <div className="text-6xl font-black font-mono text-white tracking-tighter my-2">
                  {formatT(data.seconds)}
               </div>
               <div className="text-2xl font-black text-[#2ecc71] italic mb-6">
                 {cur((data.seconds / 3600) * data.rate)}
               </div>
               
               <div className="bg-black/20 rounded-2xl py-3 px-4 mb-8 flex items-center justify-center gap-3 border border-white/5">
                  <span className="text-[8px] font-black text-slate-300 uppercase">Estipular Meta (Min):</span>
                  <input type="number" className="w-16 bg-white/10 text-center text-white font-black rounded-lg outline-none border border-white/20 p-1 text-xs" value={data.goalMinutes} onChange={e => setData({...data, goalMinutes: parseInt(e.target.value) || 0})} />
               </div>

               <div className="grid grid-cols-2 gap-3 mb-3">
                  <button onClick={() => { setData({...data, active: true}); playSound('start'); setIsAlarmActive(false); }} className="bg-[#27ae60] text-white py-4 rounded-2xl font-black text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-lg active:scale-95">
                    <i className="fas fa-play"></i> INICIAR
                  </button>
                  <button onClick={() => { setData({...data, active: false}); playSound('stop'); }} className="bg-[#f1c40f] text-white py-4 rounded-2xl font-black text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-lg active:scale-95">
                    <i className="fas fa-pause"></i> PAUSAR
                  </button>
               </div>
               
               <div className="grid grid-cols-2 gap-3">
                  <button onClick={handleSave} className="bg-[#e74c3c] text-white py-4 rounded-2xl font-black text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 border-2 border-white/20">
                    <i className="fas fa-save"></i> SALVAR PROJETO
                  </button>
                  <button onClick={() => data.history[0] && resumeHistory(data.history[0])} className="bg-[#3498db] text-white py-4 rounded-2xl font-black text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95">
                    <i className="fas fa-undo"></i> CONTINUAR TRABALHO
                  </button>
               </div>
            </div>

            {/* FORMULÁRIO */}
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200 space-y-4">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1 block">Cliente</label>
                    <input className="w-full bg-[#f8fafc] p-3 rounded-xl border border-slate-200 font-black uppercase text-xs" placeholder="CLIENTE..." value={data.client} onChange={e => setData({...data, client: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1 block">Projeto</label>
                    <input className="w-full bg-[#f8fafc] p-3 rounded-xl border border-slate-200 font-black uppercase text-xs" placeholder="AMBIENTE..." value={data.project} onChange={e => setData({...data, project: e.target.value})} />
                  </div>
               </div>
               <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1 block">Notas Técnicas Adicionais</label>
                  <textarea className="w-full bg-[#f8fafc] p-3 rounded-xl border border-slate-200 text-[10px] text-slate-600 font-medium h-20 outline-none resize-none" placeholder="Detalhes do projeto..." value={data.notes} onChange={e => setData({...data, notes: e.target.value})} />
               </div>
               <div className="bg-[#f8fafc] p-4 rounded-2xl border border-slate-200 text-center">
                  <span className="text-[8px] font-black text-cyan-600 uppercase block mb-2 tracking-widest">Valor da Hora Trabalhada</span>
                  <div className="flex items-center justify-between mb-2">
                     <span className="text-2xl font-black italic">R$ {Number(data.rate).toFixed(2).replace('.', ',')}</span>
                     <input type="number" className="w-16 bg-white border border-slate-300 text-center font-black p-2 rounded-lg text-xs" value={data.rate} onChange={e => setData({...data, rate: parseFloat(e.target.value) || 0})} />
                  </div>
                  <input type="range" min="1" max="500" className="w-full h-1 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-slate-600" value={data.rate} onChange={e => setData({...data, rate: parseInt(e.target.value)})} />
               </div>
            </div>
          </div>
        )}

        {activeTab === 'historico' && (
          <div className="space-y-8 animate-in pb-10">
            
            {/* RELATÓRIO DE SOMA UNIFICADA (Req: Imagem 2) */}
            {selectedIds.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-400 shadow-2xl overflow-hidden mb-10">
                 <div className="header-premium py-4">
                    <h2 className="text-lg font-black italic">{BRAND_NAME}</h2>
                    <p className="text-[8px] text-slate-200">{ADDRESS}</p>
                    <p className="text-[8px] text-slate-200">{CONTACT}</p>
                 </div>
                 
                 <div className="p-3 text-center border-b bg-slate-50">
                    <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest">Relatório de Soma Unificada</h3>
                 </div>

                 <div className="overflow-x-auto">
                    <table className="sum-table">
                       <thead>
                          <tr>
                             <th>Projeto</th>
                             <th>Cliente</th>
                             <th>Data Início</th>
                             <th>Valor Hora</th>
                             <th>Tempo</th>
                             <th>Valor Total</th>
                          </tr>
                       </thead>
                       <tbody>
                          {selectedProjects.map(p => (
                             <tr key={p.id}>
                                <td>{p.project}</td>
                                <td className="text-cyan-600">{p.client}</td>
                                <td>{p.startTime.split(',')[0]}</td>
                                <td>{cur(p.rate)}</td>
                                <td className="font-black">{formatT(p.time)}</td>
                                <td className="text-green-600">{cur(p.total)}</td>
                             </tr>
                          ))}
                          <tr className="bg-slate-50 border-t-2 border-slate-300">
                             <td colSpan={4} className="text-right font-black py-4 uppercase text-[9px]">Soma Acumulada Selecionada:</td>
                             <td className="font-black text-cyan-600 text-sm">{formatT(sumSeconds)}</td>
                             <td className="font-black text-green-600 text-sm">{cur(sumTotal)}</td>
                          </tr>
                       </tbody>
                    </table>
                 </div>

                 <div className="grid grid-cols-3 gap-1 p-2 bg-slate-100 border-t border-slate-300">
                    <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(getSumText())}`)} className="bg-emerald-500 text-white p-2 rounded-lg text-[8px] font-black uppercase shadow-sm"><i className="fab fa-whatsapp"></i> Whatsapp</button>
                    <button onClick={() => alert("Relatório salvo no Histórico do Plugin")} className="bg-blue-600 text-white p-2 rounded-lg text-[8px] font-black uppercase shadow-sm"><i className="fas fa-save"></i> Salvar Relatório</button>
                    <button onClick={() => setSelectedIds([])} className="bg-slate-500 text-white p-2 rounded-lg text-[8px] font-black uppercase shadow-sm">Limpar Seleção</button>
                 </div>
              </div>
            )}

            {/* RELATÓRIO INDIVIDUAL (Req: Imagem 1) */}
            <div className="space-y-10">
              {data.history.map((h: any) => (
                <div key={String(h.id)} className="relative group">
                  <div className="absolute top-4 left-[-20px] z-10">
                    <input type="checkbox" className="cb-custom" checked={selectedIds.includes(h.id)} onChange={() => toggleSelect(h.id)} />
                  </div>

                  <div className="bg-white rounded-xl border border-slate-400 shadow-md overflow-hidden">
                    <div className="header-premium py-5">
                      <h2 className="text-xl font-black italic tracking-tighter uppercase">{BRAND_NAME}</h2>
                      <p className="text-[8px] text-slate-200 mt-1">{ADDRESS}</p>
                      <p className="text-[8px] text-slate-200">{CONTACT}</p>
                    </div>
                    
                    <div className="p-3 text-center border-b border-slate-100 bg-slate-50">
                      <h3 className="font-black text-[10px] text-slate-500 uppercase tracking-widest">Relatório Individual de Produção</h3>
                    </div>
                    
                    <div className="p-4">
                      <table className="report-table">
                        <tbody>
                          <tr><td>Cliente:</td><td>{h.client}</td></tr>
                          <tr><td>Projeto:</td><td>{h.project}</td></tr>
                          <tr><td>Data Início:</td><td>{h.startTime}</td></tr>
                          <tr><td>Data Fim:</td><td>{h.endTime}</td></tr>
                          <tr><td>Valor Hora:</td><td>{cur(h.rate)}</td></tr>
                          <tr><td className="text-cyan-premium">Tempo Total:</td><td className="text-cyan-premium">{formatT(h.time)}</td></tr>
                          <tr className="bg-green-50"><td className="text-green-premium">Valor Total:</td><td className="text-green-premium">{cur(h.total)}</td></tr>
                        </tbody>
                      </table>

                      {h.notes && (
                        <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="text-[8px] font-black text-slate-400 block mb-1 uppercase">Notas Técnicas Adicionais:</span>
                          <p className="text-[10px] text-slate-600 italic leading-relaxed">{h.notes}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-5 gap-2 mt-5 border-t border-slate-100 pt-4">
                        <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(getIndividualText(h))}`)} className="flex flex-col items-center p-2 rounded-xl hover:bg-emerald-50 text-emerald-600">
                          <i className="fab fa-whatsapp text-lg"></i>
                          <span className="text-[7px] font-black uppercase mt-1">Zap</span>
                        </button>
                        <button onClick={() => resumeHistory(h)} className="flex flex-col items-center p-2 rounded-xl hover:bg-cyan-50 text-cyan-600">
                          <i className="fas fa-redo text-lg"></i>
                          <span className="text-[7px] font-black uppercase mt-1">Retomar</span>
                        </button>
                        <button onClick={() => confirm("Apagar?") && setData((p:any) => ({...p, history: p.history.filter((x:any) => x.id !== h.id)}))} className="flex flex-col items-center p-2 rounded-xl hover:bg-red-50 text-red-500">
                          <i className="fas fa-trash text-lg"></i>
                          <span className="text-[7px] font-black uppercase mt-1">Excluir</span>
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

      <footer className="p-3 bg-white border-t border-slate-300 text-center z-10 shadow-inner">
         <div className="text-[7px] font-black text-slate-400 uppercase tracking-[0.3em] leading-relaxed">
           LUCANO DESIGNER3D V19.0 - SISTEMA PROFISSIONAL
         </div>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);