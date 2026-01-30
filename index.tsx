import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

const BRAND_NAME = 'LUCANO DESIGNER3D';
const ADDRESS = 'Rua Betânia N392 Bairro Oliveira';
const CONTACT = 'Tel / WhatsApp: 74 9 91108629';

// Sistema de áudio profissional
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
      const saved = localStorage.getItem('lucano_v32_modern');
      if (!saved) return { client: '', project: '', notes: '', rate: 25, seconds: 0, active: false, goalMinutes: 60, history: [] };
      const parsed = JSON.parse(saved);
      return { ...parsed, active: false, history: Array.isArray(parsed.history) ? parsed.history : [] };
    } catch {
      return { client: '', project: '', notes: '', rate: 25, seconds: 0, active: false, goalMinutes: 60, history: [] };
    }
  });

  const [activeTab, setActiveTab] = useState<'controle' | 'historico'>('controle');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  
  const timerRef = useRef<any>(null);
  const alarmRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('lucano_v32_modern', JSON.stringify(data));
  }, [data]);

  // Lógica do cronômetro progressivo
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

  const handleSave = () => {
    if (data.seconds < 1) return alert("Inicie o cronômetro antes de salvar.");

    const now = new Date();
    const endTime = now.toLocaleString('pt-BR');
    const startTimeDate = new Date(now.getTime() - data.seconds * 1000);
    const startTime = startTimeDate.toLocaleString('pt-BR');

    const entry = {
      id: Date.now().toString(),
      project: String(data.project || "PROJETO SEM TÍTULO"),
      client: String(data.client || "CLIENTE GERAL"),
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

  const resumeHistory = (h: any) => {
    setData((p: any) => ({
      ...p,
      project: String(h.project),
      client: String(h.client),
      notes: String(h.notes),
      rate: Number(h.rate),
      seconds: Number(h.time),
      active: true // Já começa a contar imediatamente
    }));
    setIsAlarmActive(false);
    setActiveTab('controle');
    playSound('start');
  };

  // Exportação Word com Layout Profissional e BOM UTF-8
  const exportWord = (title: string, tableRows: string[][], footerInfo: string, filename: string) => {
    const BOM = "\ufeff";
    let html = `
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <div style="text-align: center; border-bottom: 2px solid #475569; padding-bottom: 10px; margin-bottom: 20px;">
          <h1 style="color: #475569; margin: 0;">${BRAND_NAME}</h1>
          <p style="font-size: 10px; color: #64748b; margin: 5px 0;">${ADDRESS} | ${CONTACT}</p>
        </div>
        <h2 style="text-align: center; background: #f1f5f9; padding: 10px; border-radius: 5px; font-size: 14px;">${title}</h2>
        <table border="1" cellspacing="0" cellpadding="8" style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          ${tableRows.map(row => `
            <tr>
              ${row.map((cell, i) => `
                <td style="${i === 0 ? 'background: #f8fafc; font-weight: bold; width: 30%;' : ''}">${cell}</td>
              `).join('')}
            </tr>
          `).join('')}
        </table>
        <div style="margin-top: 30px; font-weight: bold; text-align: right; border-top: 1px solid #ddd; padding-top: 10px;">
          ${footerInfo}
        </div>
      </body>
      </html>
    `;
    const blob = new Blob([BOM + html], { type: 'application/msword;charset=utf-8' });
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

  const handleExportIndividual = (h: any) => {
    const rows = [
      ["CLIENTE", h.client],
      ["PROJETO", h.project],
      ["INÍCIO", h.startTime],
      ["FIM", h.endTime],
      ["VALOR HORA", cur(h.rate)],
      ["TEMPO TRABALHADO", formatT(h.time)],
      ["VALOR TOTAL", cur(h.total)],
      ["NOTAS", h.notes || "-"]
    ];
    exportWord("RELATÓRIO INDIVIDUAL DE PRODUÇÃO", rows, `TOTAL DO PROJETO: ${cur(h.total)}`, `Relatorio_${h.project}`);
  };

  const handleExportSum = () => {
    const rows = selectedProjects.map(p => [
      `${p.project} (${p.client})`,
      `${p.date} | ${formatT(p.time)} | ${cur(p.total)}`
    ]);
    exportWord("RELATÓRIO DE SOMA UNIFICADA", rows, `SOMA TOTAL ACUMULADA: ${cur(sumTotal)}`, "Relatorio_Soma_Unificada");
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#0f172a] text-slate-100 overflow-hidden font-sans select-none">
      
      {/* HEADER DINÂMICO */}
      <header className="relative py-8 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/20 to-purple-600/20 animate-pulse"></div>
        <div className="relative z-10 text-center">
          <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase drop-shadow-lg">{BRAND_NAME}</h1>
          <div className="text-[10px] font-bold text-cyan-400 mt-2 tracking-widest uppercase opacity-80">
            {ADDRESS} • {CONTACT}
          </div>
        </div>
      </header>

      {/* NAVEGAÇÃO MODERNA */}
      <nav className="flex bg-slate-900/50 backdrop-blur-xl border-y border-white/5 z-20">
        <button onClick={() => setActiveTab('controle')} className={`flex-1 py-5 flex flex-col items-center gap-1 transition-all ${activeTab === 'controle' ? 'text-cyan-400' : 'text-slate-500'}`}>
          <i className={`fas fa-microchip text-xl ${activeTab === 'controle' ? 'animate-bounce' : ''}`}></i>
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">Painel de Controle</span>
          {activeTab === 'controle' && <div className="absolute bottom-0 w-1/2 h-[3px] bg-cyan-400 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.8)]"></div>}
        </button>
        <button onClick={() => setActiveTab('historico')} className={`flex-1 py-5 flex flex-col items-center gap-1 transition-all ${activeTab === 'historico' ? 'text-purple-400' : 'text-slate-500'}`}>
          <i className="fas fa-database text-xl"></i>
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">Banco de Dados</span>
          {activeTab === 'historico' && <div className="absolute bottom-0 w-1/2 h-[3px] bg-purple-400 rounded-full shadow-[0_0_15px_rgba(192,132,252,0.8)]"></div>}
        </button>
      </nav>

      <main className="flex-1 overflow-y-auto px-6 py-8 no-scrollbar bg-slate-950/30">
        
        {activeTab === 'controle' && (
          <div className="space-y-8 animate-in">
            
            {/* CARD DO TIMER (ULTRA MODERN) */}
            <div className={`relative group p-[2px] rounded-[3rem] bg-gradient-to-br from-cyan-500 via-purple-500 to-rose-500 transition-all duration-700 ${isAlarmActive ? 'scale-105 shadow-[0_0_50px_rgba(244,63,94,0.4)]' : 'shadow-2xl shadow-cyan-500/10'}`}>
              <div className="bg-slate-900 rounded-[2.9rem] p-10 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10">
                   <i className="fas fa-bolt text-6xl text-white"></i>
                </div>
                
                <span className="text-[10px] font-black text-cyan-400/60 uppercase tracking-[0.4em] block mb-4">Fluxo de Trabalho Ativo</span>
                
                <div className="text-8xl font-black font-mono text-white tracking-tighter my-2 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                  {formatT(data.seconds)}
                </div>
                
                <div className="text-4xl font-black text-emerald-400 italic mb-10 flex items-center justify-center gap-2">
                   <span className="text-xl text-slate-500 not-italic">Ganho:</span> {cur((data.seconds / 3600) * data.rate)}
                </div>

                {/* BOTÕES DE COMANDO */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <button onClick={() => { setData({...data, active: true}); playSound('start'); setIsAlarmActive(false); }} className="group/btn relative h-16 bg-emerald-500 rounded-2xl overflow-hidden shadow-lg active:scale-95 transition-all">
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                    <span className="relative z-10 font-black text-white tracking-widest text-xs">INICIAR SESSÃO</span>
                  </button>
                  <button onClick={() => { setData({...data, active: false}); playSound('stop'); }} className="group/btn relative h-16 bg-amber-500 rounded-2xl overflow-hidden shadow-lg active:scale-95 transition-all">
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                    <span className="relative z-10 font-black text-white tracking-widest text-xs">PAUSAR FLUXO</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button onClick={handleSave} className="h-16 bg-rose-500 rounded-2xl font-black text-white tracking-widest text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                    <i className="fas fa-cloud-upload-alt"></i> FINALIZAR & SALVAR
                  </button>
                  <button onClick={() => data.history[0] && resumeHistory(data.history[0])} className="h-16 bg-slate-700 rounded-2xl font-black text-white tracking-widest text-xs shadow-lg active:scale-95 transition-all">
                    RETOMAR ÚLTIMO
                  </button>
                </div>

                {/* CONFIGURAÇÃO DE ALERTA RÁPIDA */}
                <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-center gap-6">
                  <span className="text-[10px] font-black text-slate-500 uppercase">Avisar em:</span>
                  <div className="flex items-center gap-3 bg-black/40 p-2 rounded-xl border border-white/5">
                    <input type="number" className="w-14 bg-transparent text-center font-black text-cyan-400 outline-none" value={data.goalMinutes} onChange={e => setData({...data, goalMinutes: parseInt(e.target.value) || 0})} />
                    <span className="text-[9px] font-bold text-slate-600 uppercase">Minutos</span>
                  </div>
                </div>
              </div>
            </div>

            {/* FORMULÁRIO E VALOR DA HORA */}
            <div className="grid gap-6">
              {/* CARD CAMPOS */}
              <div className="bg-slate-900/50 backdrop-blur-md rounded-[2.5rem] p-8 border border-white/5 shadow-xl space-y-6">
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Cliente / Solicitante</label>
                      <input className="w-full bg-slate-950/50 p-4 rounded-2xl border border-white/10 text-white font-bold uppercase text-xs focus:border-cyan-500 transition-all outline-none" placeholder="Digite o nome..." value={data.client} onChange={e => setData({...data, client: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Ambiente / Projeto</label>
                      <input className="w-full bg-slate-950/50 p-4 rounded-2xl border border-white/10 text-white font-bold uppercase text-xs focus:border-cyan-500 transition-all outline-none" placeholder="Ex: Cozinha Gourmet..." value={data.project} onChange={e => setData({...data, project: e.target.value})} />
                    </div>
                 </div>

                 {/* ABA DE VALOR DA HORA INTEGRADA */}
                 <div className="bg-slate-950/40 p-6 rounded-3xl border border-white/5">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Valor de sua Hora:</span>
                      <div className="flex items-center gap-2">
                         <span className="text-2xl font-black text-white italic">R$ {Number(data.rate).toFixed(2).replace('.', ',')}</span>
                         <input type="number" className="w-20 bg-slate-800 border border-white/10 text-center font-black p-2 rounded-xl text-xs text-white" value={data.rate} onChange={e => setData({...data, rate: parseFloat(e.target.value) || 0})} />
                      </div>
                    </div>
                    <input type="range" min="1" max="1000" step="5" className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" value={data.rate} onChange={e => setData({...data, rate: parseInt(e.target.value)})} />
                 </div>

                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Anotações e Detalhes Técnicos</label>
                    <textarea className="w-full bg-slate-950/50 p-5 rounded-3xl border border-white/10 text-xs text-slate-300 font-medium h-28 outline-none resize-none focus:border-purple-500 transition-all" placeholder="Cores de MDF, ferragens, medidas, referências..." value={data.notes} onChange={e => setData({...data, notes: e.target.value})} />
                 </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'historico' && (
          <div className="space-y-8 animate-in pb-24">
            
            {/* CALCULADORA DE SOMA UNIFICADA (TOP PANEL) */}
            {selectedIds.length > 0 && (
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl border border-purple-500/30 shadow-2xl overflow-hidden mb-12 border-l-[12px] border-l-purple-500">
                 <div className="p-8">
                    <h2 className="text-xl font-black italic text-white flex items-center gap-3">
                       <i className="fas fa-calculator text-purple-400"></i> SOMA UNIFICADA
                    </h2>
                    <p className="text-[9px] text-slate-400 uppercase mt-1 tracking-widest">Compilado de projetos selecionados abaixo</p>
                    
                    <div className="grid grid-cols-2 gap-8 mt-8">
                       <div className="bg-black/20 p-5 rounded-2xl border border-white/5">
                          <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">Tempo Total Somado</span>
                          <span className="text-3xl font-black text-cyan-400 font-mono">{formatT(sumSeconds)}</span>
                       </div>
                       <div className="bg-black/20 p-5 rounded-2xl border border-white/5">
                          <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">Valor Total Acumulado</span>
                          <span className="text-3xl font-black text-emerald-400 italic">{cur(sumTotal)}</span>
                       </div>
                    </div>

                    <div className="flex gap-4 mt-8">
                       <button onClick={handleExportSum} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white p-4 rounded-2xl text-[10px] font-black uppercase shadow-lg transition-all flex items-center justify-center gap-3">
                          <i className="fas fa-file-word"></i> Salvar Soma Unificada no Word
                       </button>
                       <button onClick={() => setSelectedIds([])} className="bg-slate-700 hover:bg-slate-600 text-white p-4 rounded-2xl text-[10px] font-black uppercase px-8 transition-all">
                          Limpar
                       </button>
                    </div>
                 </div>
              </div>
            )}

            {/* LISTAGEM DOS PROJETOS */}
            <div className="space-y-12">
              {data.history.length === 0 ? (
                <div className="text-center py-20 opacity-20">
                   <i className="fas fa-folder-open text-8xl mb-4"></i>
                   <p className="font-black uppercase text-sm tracking-widest">Nenhum registro encontrado</p>
                </div>
              ) : data.history.map((h: any) => (
                <div key={String(h.id)} className="relative group">
                  {/* CHECKBOX CUSTOMIZADO */}
                  <div className="absolute top-8 left-[-32px] z-10">
                    <label className="relative flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={selectedIds.includes(h.id)} onChange={() => toggleSelect(h.id)} />
                      <div className="w-7 h-7 bg-slate-800 border-2 border-slate-600 rounded-lg peer-checked:bg-purple-500 peer-checked:border-purple-500 transition-all flex items-center justify-center shadow-lg">
                        <i className="fas fa-check text-white text-xs opacity-0 peer-checked:opacity-100"></i>
                      </div>
                    </label>
                  </div>

                  <div className={`bg-slate-900 rounded-[2.5rem] border transition-all duration-300 overflow-hidden ${selectedIds.includes(h.id) ? 'border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.15)] ring-1 ring-purple-500' : 'border-white/5 hover:border-white/10 shadow-2xl'}`}>
                    <div className="bg-slate-800/50 py-6 px-8 flex justify-between items-center border-b border-white/5">
                      <div>
                        <h2 className="text-xl font-black italic text-white uppercase tracking-tighter">{BRAND_NAME}</h2>
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{h.date} • {h.startTime}</span>
                      </div>
                      <div className="bg-emerald-500/10 text-emerald-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase border border-emerald-500/20">
                        Pago: {cur(h.total)}
                      </div>
                    </div>
                    
                    <div className="p-8">
                      <div className="grid grid-cols-2 gap-y-6 gap-x-12 mb-10">
                         <div>
                            <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">Cliente</span>
                            <span className="text-sm font-black text-white uppercase">{h.client}</span>
                         </div>
                         <div>
                            <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">Ambiente / Projeto</span>
                            <span className="text-sm font-black text-cyan-400 uppercase">{h.project}</span>
                         </div>
                         <div>
                            <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">Tempo de Execução</span>
                            <span className="text-lg font-black text-white font-mono">{formatT(h.time)}</span>
                         </div>
                         <div>
                            <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">Valor da Hora</span>
                            <span className="text-lg font-black text-emerald-500 italic">{cur(h.rate)}</span>
                         </div>
                      </div>

                      {h.notes && (
                         <div className="mb-10 p-5 bg-black/30 rounded-2xl border border-white/5">
                            <span className="text-[9px] font-black text-slate-600 uppercase block mb-2 tracking-widest">Anotações do Projeto</span>
                            <p className="text-xs text-slate-400 leading-relaxed italic">"{h.notes}"</p>
                         </div>
                      )}

                      <div className="grid grid-cols-3 gap-4 pt-8 border-t border-white/5">
                        <button onClick={() => handleExportIndividual(h)} className="h-14 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-[9px] font-black uppercase shadow-lg flex items-center justify-center gap-2 transition-colors">
                          <i className="fas fa-file-word text-blue-400"></i> Salvar Word
                        </button>
                        <button onClick={() => resumeHistory(h)} className="h-14 bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded-2xl text-[9px] font-black uppercase flex items-center justify-center gap-2 transition-colors">
                          <i className="fas fa-play"></i> Continuar
                        </button>
                        <button onClick={() => confirm("Deseja apagar este registro permanentemente?") && setData((p:any) => ({...p, history: p.history.filter((x:any) => x.id !== h.id)}))} className="h-14 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 rounded-2xl text-[9px] font-black uppercase flex items-center justify-center gap-2 transition-colors">
                          <i className="fas fa-trash-alt"></i> Excluir
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

      {/* FOOTER PREMIUM */}
      <footer className="p-4 bg-slate-950 border-t border-white/5 text-center relative z-10">
         <div className="text-[8px] font-black text-slate-600 uppercase tracking-[0.4em] leading-relaxed">
           LUCANO DESIGNER3D PRO V32.0 • SISTEMA DE GESTÃO INTELIGENTE
         </div>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);