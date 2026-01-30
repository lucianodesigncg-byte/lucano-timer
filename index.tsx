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
      const saved = localStorage.getItem('lucano_v38_final');
      if (!saved) return { client: '', project: '', notes: '', rate: 25, seconds: 0, active: false, goalMinutes: 60, history: [] };
      const parsed = JSON.parse(saved);
      return { ...parsed, active: false, history: Array.isArray(parsed.history) ? parsed.history : [] };
    } catch {
      return { client: '', project: '', notes: '', rate: 25, seconds: 0, active: false, goalMinutes: 60, history: [] };
    }
  });

  const [activeTab, setActiveTab] = useState<'controle' | 'historico'>('controle');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAlarmChoice, setShowAlarmChoice] = useState(false);
  const [lastAlarmedAt, setLastAlarmedAt] = useState<number | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);
  
  const timerRef = useRef<any>(null);
  const alarmSoundRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('lucano_v38_final', JSON.stringify(data));
  }, [data]);

  // Lógica do Cronômetro
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

  // Monitoramento da Meta
  useEffect(() => {
    const goalSec = (data.goalMinutes || 0) * 60;
    if (data.active && goalSec > 0 && data.seconds >= goalSec && lastAlarmedAt !== goalSec) {
      setData(prev => ({ ...prev, active: false }));
      setShowAlarmChoice(true);
      setLastAlarmedAt(goalSec);
      playSound('alarm');
    }
  }, [data.seconds, data.active, data.goalMinutes, lastAlarmedAt]);

  useEffect(() => {
    if (showAlarmChoice) {
      alarmSoundRef.current = setInterval(() => playSound('alarm'), 3000);
    } else {
      clearInterval(alarmSoundRef.current);
    }
    return () => clearInterval(alarmSoundRef.current);
  }, [showAlarmChoice]);

  const formatT = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sc = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sc.toString().padStart(2, '0')}`;
  };

  const cur = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // VALIDAÇÃO E TOGGLE DO BOTÃO PRINCIPAL
  const handleToggleTimer = () => {
    if (!data.active) {
      if (!data.client.trim() || !data.project.trim()) {
        setErrorField(!data.client.trim() ? 'client' : 'project');
        playSound('stop');
        setTimeout(() => setErrorField(null), 2000);
        return;
      }
      setData(d => ({ ...d, active: true }));
      playSound('start');
    } else {
      setData(d => ({ ...d, active: false }));
      playSound('stop');
    }
  };

  // SALVAR E RESETAR TUDO
  const handleSave = () => {
    if (data.seconds < 1) {
      alert("Inicie o cronômetro para registrar tempo.");
      return;
    }

    const now = new Date();
    const entry = {
      id: Date.now().toString(),
      project: String(data.project).toUpperCase(),
      client: String(data.client).toUpperCase(),
      notes: String(data.notes),
      time: Number(data.seconds),
      rate: Number(data.rate),
      total: Number((data.seconds / 3600) * data.rate),
      date: now.toLocaleDateString('pt-BR'),
      startTime: new Date(now.getTime() - data.seconds * 1000).toLocaleString('pt-BR'),
      endTime: now.toLocaleString('pt-BR')
    };

    setData((p: any) => ({ 
      ...p, 
      seconds: 0, 
      active: false, 
      client: '',   
      project: '',  
      notes: '',    
      history: [entry, ...p.history] 
    }));
    
    setShowAlarmChoice(false);
    setLastAlarmedAt(null);
    setActiveTab('historico');
    playSound('success');
  };

  const resumeFromHistory = (h: any) => {
    setData((p: any) => ({
      ...p,
      project: String(h.project),
      client: String(h.client),
      notes: String(h.notes),
      rate: Number(h.rate),
      seconds: Number(h.time),
      active: true 
    }));
    setLastAlarmedAt(null);
    setShowAlarmChoice(false);
    setActiveTab('controle');
    playSound('start');
  };

  const exportWord = (title: string, tableRows: string[][], footerInfo: string, filename: string) => {
    const BOM = "\ufeff";
    let html = `
      <html><head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; background: #f1f5f9; padding: 40px;">
        <div style="text-align: center; border-bottom: 3px solid #0ea5e9; padding-bottom: 20px; margin-bottom: 30px;">
          <h1 style="color: #0c4a6e; font-size: 26px; margin: 0;">${BRAND_NAME}</h1>
          <p style="font-size: 11px; color: #64748b;">${ADDRESS} | ${CONTACT}</p>
        </div>
        <h2 style="text-align: center; background: #0c4a6e; color: #fff; padding: 12px; border-radius: 8px; font-size: 14px;">${title}</h2>
        <table border="1" cellspacing="0" cellpadding="12" style="width: 100%; border-collapse: collapse; margin-top: 25px; border: 1px solid #cbd5e1;">
          ${tableRows.map(row => `<tr><td style="background:#f8fafc; font-weight:bold; color:#475569; width:35%;">${row[0]}</td><td style="background:#fff; color:#1e293b;">${row[1]}</td></tr>`).join('')}
        </table>
        <div style="margin-top: 40px; font-weight: bold; text-align: right; border-top: 1px solid #cbd5e1; padding-top: 15px; font-size: 18px; color: #0891b2;">${footerInfo}</div>
      </body></html>`;
    const blob = new Blob([BOM + html], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${filename}.doc`; a.click();
  };

  const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const selectedProjects = data.history.filter((h: any) => selectedIds.includes(h.id));
  const sumTotal = selectedProjects.reduce((acc: number, h: any) => acc + h.total, 0);
  const sumSeconds = selectedProjects.reduce((acc: number, h: any) => acc + h.time, 0);

  return (
    <div className="flex flex-col h-screen w-full bg-[#020617] text-slate-100 overflow-hidden select-none font-sans">
      
      {/* HEADER */}
      <header className="relative py-7 px-8 bg-slate-900 border-b border-cyan-500/20 z-40 shadow-2xl">
        <div className="relative text-center">
          <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]">{BRAND_NAME}</h1>
          <p className="text-[10px] font-bold text-cyan-400 mt-1 uppercase tracking-[0.4em] opacity-70">{ADDRESS} • {CONTACT}</p>
        </div>
      </header>

      {/* NAV */}
      <nav className="flex bg-slate-950 border-b border-white/5 z-30 shadow-lg">
        <button onClick={() => setActiveTab('controle')} className={`flex-1 py-5 flex flex-col items-center gap-1 transition-all relative ${activeTab === 'controle' ? 'text-cyan-400' : 'text-slate-500'}`}>
          <i className="fas fa-clock text-xl"></i>
          <span className="text-[9px] font-black uppercase tracking-widest">Painel Ativo</span>
          {activeTab === 'controle' && <div className="absolute bottom-0 w-full h-[2px] bg-cyan-400 shadow-[0_0_10px_#22d3ee]"></div>}
        </button>
        <button onClick={() => setActiveTab('historico')} className={`flex-1 py-5 flex flex-col items-center gap-1 transition-all relative ${activeTab === 'historico' ? 'text-emerald-400' : 'text-slate-500'}`}>
          <i className="fas fa-database text-xl"></i>
          <span className="text-[9px] font-black uppercase tracking-widest">Registros</span>
          {activeTab === 'historico' && <div className="absolute bottom-0 w-full h-[2px] bg-emerald-400 shadow-[0_0_10px_#10b981]"></div>}
        </button>
      </nav>

      <main className="flex-1 overflow-y-auto px-6 py-8 no-scrollbar relative bg-[radial-gradient(circle_at_50%_50%,_#0f172a_0%,_#020617_100%)]">
        
        {/* MODAL ALERTA META ATINGIDA */}
        {showAlarmChoice && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-8 bg-black/90 backdrop-blur-md">
             <div className="bg-slate-900 border-2 border-amber-500 rounded-[3rem] p-12 text-center shadow-[0_0_80px_rgba(245,158,11,0.4)] animate-in max-w-sm w-full">
                <i className="fas fa-hourglass-end text-amber-500 text-5xl mb-6 animate-bounce"></i>
                <h2 className="text-2xl font-black text-white uppercase mb-4 leading-tight">Meta Atingida!</h2>
                <p className="text-slate-400 text-sm mb-10 italic">Você trabalhou {data.goalMinutes} min.<br/>O que deseja fazer agora?</p>
                <div className="flex flex-col gap-4">
                   <button onClick={() => { setShowAlarmChoice(false); setData(d => ({...d, active: true})); playSound('start'); }} className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-black py-5 rounded-2xl text-[11px] uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3">
                      <i className="fas fa-forward"></i> CONTINUAR TRABALHO
                   </button>
                   {/* NOVO BOTÃO DE SALVAR NO ALERTA */}
                   <button onClick={handleSave} className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black py-5 rounded-2xl text-[11px] uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3">
                      <i className="fas fa-save"></i> SALVAR E ENCERRAR
                   </button>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'controle' && (
          <div className="space-y-8 animate-in max-w-2xl mx-auto">
            
            {/* CARD DO CRONÔMETRO */}
            <div className="bg-slate-900/60 backdrop-blur-2xl rounded-[3.5rem] p-10 text-center shadow-2xl border border-white/5 relative overflow-hidden">
                <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.4em] mb-4 block opacity-60">Engine Lucano v38.0</span>
                <div className={`text-8xl font-black font-mono tracking-tighter my-4 transition-all ${data.active ? 'text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'text-white'}`}>
                  {formatT(data.seconds)}
                </div>
                <div className="text-3xl font-black text-emerald-400 italic mb-10 flex items-center justify-center gap-2">
                   <span className="text-xs text-slate-500 not-italic font-bold uppercase tracking-widest">Saldo:</span> {cur((data.seconds / 3600) * data.rate)}
                </div>

                {/* BOTÃO TOGGLE INICIAR/PAUSAR COM VALIDAÇÃO */}
                <button 
                  onClick={handleToggleTimer}
                  className={`w-full h-24 rounded-3xl font-black text-white text-xs uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4 mb-6 ${data.active ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'}`}
                >
                  <i className={`fas ${data.active ? 'fa-pause animate-pulse' : 'fa-play'} text-2xl`}></i>
                  {data.active ? 'PAUSAR CRONÔMETRO' : 'INICIAR TRABALHO'}
                </button>

                <div className="grid grid-cols-2 gap-4">
                  <button onClick={handleSave} className="h-16 bg-rose-600 hover:bg-rose-500 rounded-2xl font-black text-white text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                    <i className="fas fa-cloud-upload-alt"></i> FINALIZAR & SALVAR
                  </button>
                  <button onClick={() => data.history[0] && resumeFromHistory(data.history[0])} className="h-16 bg-slate-800 hover:bg-slate-700 rounded-2xl font-black text-white text-[10px] uppercase tracking-widest active:scale-95 transition-all">
                    RETOMAR ÚLTIMO
                  </button>
                </div>

                <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-center gap-6">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Alerta de Meta (min):</span>
                  <input type="number" className="w-20 bg-black/60 text-center font-black text-cyan-400 border border-white/10 rounded-xl p-3 outline-none focus:ring-1 ring-cyan-500/50" value={data.goalMinutes} onChange={e => setData(d => ({...d, goalMinutes: parseInt(e.target.value) || 0}))} />
                </div>
            </div>

            {/* FORMULÁRIO COM TRAVA DE VALIDAÇÃO */}
            <div className="bg-slate-900/40 backdrop-blur-md p-10 rounded-[3rem] border border-white/5 space-y-8 shadow-xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className={`text-[9px] font-black uppercase ml-2 tracking-widest transition-colors ${errorField === 'client' ? 'text-rose-500' : 'text-slate-500'}`}>
                      Cliente {errorField === 'client' && '(!) OBRIGATÓRIO'}
                    </label>
                    <input 
                      disabled={data.active}
                      className={`w-full bg-black/40 p-5 rounded-2xl border text-white font-bold uppercase text-xs outline-none transition-all ${errorField === 'client' ? 'border-rose-500 animate-shake' : 'border-white/10 focus:border-cyan-500'} ${data.active ? 'opacity-50' : ''}`}
                      placeholder="NOME DO CLIENTE..." 
                      value={data.client} 
                      onChange={e => setData(d => ({...d, client: e.target.value}))} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[9px] font-black uppercase ml-2 tracking-widest transition-colors ${errorField === 'project' ? 'text-rose-500' : 'text-slate-500'}`}>
                      Projeto {errorField === 'project' && '(!) OBRIGATÓRIO'}
                    </label>
                    <input 
                      disabled={data.active}
                      className={`w-full bg-black/40 p-5 rounded-2xl border text-white font-bold uppercase text-xs outline-none transition-all ${errorField === 'project' ? 'border-rose-500 animate-shake' : 'border-white/10 focus:border-cyan-500'} ${data.active ? 'opacity-50' : ''}`}
                      placeholder="EX: COZINHA PLANEJADA..." 
                      value={data.project} 
                      onChange={e => setData(d => ({...d, project: e.target.value}))} 
                    />
                  </div>
                </div>

                <div className="bg-slate-950/80 p-8 rounded-[2.5rem] border border-white/10 shadow-inner">
                   <div className="flex justify-between items-center mb-5">
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Valor Hora:</span>
                      <div className="flex items-center gap-3">
                        <span className="text-3xl font-black text-white italic">{cur(data.rate)}</span>
                        <input type="number" className="w-24 bg-slate-800 border border-white/10 text-center font-black p-2.5 rounded-xl text-xs text-white" value={data.rate} onChange={e => setData(d => ({...d, rate: parseFloat(e.target.value) || 0}))} />
                      </div>
                   </div>
                   <input type="range" min="1" max="1000" step="5" className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" value={data.rate} onChange={e => setData(d => ({...d, rate: parseInt(e.target.value)}))} />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Memória de Projeto</label>
                  <textarea className="w-full bg-black/40 p-6 rounded-[2rem] border border-white/10 text-xs text-slate-300 font-medium h-32 outline-none resize-none focus:border-purple-500 transition-all leading-relaxed" placeholder="MDF, FERRAGENS, MEDIDAS, OBSERVAÇÕES..." value={data.notes} onChange={e => setData(d => ({...d, notes: e.target.value}))} />
                </div>
            </div>
          </div>
        )}

        {activeTab === 'historico' && (
          <div className="space-y-10 pb-24 animate-in max-w-4xl mx-auto">
            
            {/* CALCULADORA DE SOMA */}
            {selectedIds.length > 0 && (
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[3rem] border-l-[12px] border-emerald-500 p-10 shadow-2xl">
                 <div className="flex items-center justify-between mb-8">
                   <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                      <i className="fas fa-calculator text-emerald-400"></i> Soma Unificada
                   </h2>
                   <button onClick={() => setSelectedIds([])} className="text-slate-500 hover:text-white transition-colors"><i className="fas fa-times text-xl"></i></button>
                 </div>
                 <div className="grid grid-cols-2 gap-6 mb-10">
                    <div className="bg-black/40 p-7 rounded-3xl border border-white/5">
                       <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">Tempo Acumulado</span>
                       <span className="text-3xl font-black text-cyan-400 font-mono tracking-tighter">{formatT(sumSeconds)}</span>
                    </div>
                    <div className="bg-black/40 p-7 rounded-3xl border border-white/5">
                       <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">Valor Total</span>
                       <span className="text-3xl font-black text-emerald-400 italic tracking-tighter">{cur(sumTotal)}</span>
                    </div>
                 </div>
                 <button onClick={() => {
                    const rows = selectedProjects.map(p => [`${p.project} (${p.client})`, `TEMPO: ${formatT(p.time)} | VALOR: ${cur(p.total)}`]);
                    exportWord("RELATÓRIO CONSOLIDADO", rows, `TOTAL ACUMULADO: ${cur(sumTotal)}`, "Soma_Unificada");
                 }} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-6 rounded-2xl text-[11px] uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-3">
                    <i className="fas fa-file-word"></i> Exportar Relatório Unificado
                 </button>
              </div>
            )}

            {/* LISTAGEM HISTÓRICO */}
            <div className="space-y-12">
              {data.history.length === 0 ? (
                <div className="text-center py-28 opacity-10">
                   <i className="fas fa-folder-open text-9xl mb-6"></i>
                   <p className="font-black uppercase text-lg tracking-[0.5em]">Sem Histórico</p>
                </div>
              ) : data.history.map((h: any) => (
                <div key={h.id} className="relative group pl-12">
                  <div className="absolute top-10 left-0 z-10">
                    <label className="relative flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={selectedIds.includes(h.id)} onChange={() => toggleSelect(h.id)} />
                      <div className="w-9 h-9 bg-slate-800 border-2 border-slate-600 rounded-xl peer-checked:bg-cyan-500 peer-checked:border-cyan-500 transition-all flex items-center justify-center shadow-lg">
                        <i className="fas fa-check text-white text-sm opacity-0 peer-checked:opacity-100"></i>
                      </div>
                    </label>
                  </div>

                  <div className={`bg-slate-900/80 rounded-[3rem] border transition-all duration-500 overflow-hidden ${selectedIds.includes(h.id) ? 'border-cyan-500 shadow-[0_0_40px_rgba(34,211,238,0.1)]' : 'border-white/5 hover:border-white/10 shadow-2xl'}`}>
                    <div className="bg-slate-800/60 p-8 flex justify-between items-center border-b border-white/5">
                       <div>
                          <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">{BRAND_NAME}</h3>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{h.date} • {h.startTime}</span>
                       </div>
                       <span className="bg-emerald-500/10 text-emerald-400 px-6 py-2.5 rounded-full text-[11px] font-black uppercase border border-emerald-500/20">
                          {cur(h.total)}
                       </span>
                    </div>
                    
                    <div className="p-10 space-y-8">
                       <div className="grid grid-cols-2 gap-8">
                          <div>
                             <span className="text-[9px] font-black text-slate-500 uppercase block mb-2 tracking-widest">Cliente</span>
                             <span className="text-sm font-black text-white uppercase">{h.client}</span>
                          </div>
                          <div>
                             <span className="text-[9px] font-black text-slate-500 uppercase block mb-2 tracking-widest">Projeto</span>
                             <span className="text-sm font-black text-cyan-400 uppercase">{h.project}</span>
                          </div>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-8 pt-8 border-t border-white/5">
                          <div>
                             <span className="text-[9px] font-black text-slate-500 uppercase block tracking-widest">Tempo Operado</span>
                             <span className="text-2xl font-black text-white font-mono tracking-tighter">{formatT(h.time)}</span>
                          </div>
                          <div className="flex gap-3 items-center justify-end">
                             <button onClick={() => resumeFromHistory(h)} className="flex-1 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-white border border-cyan-500/30 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
                                <i className="fas fa-redo"></i> Continuar
                             </button>
                             <button onClick={() => exportWord("RELATÓRIO INDIVIDUAL", [["CLIENTE", h.client], ["PROJETO", h.project], ["TEMPO", formatT(h.time)], ["TOTAL", cur(h.total)], ["NOTAS", h.notes || "-"]], `TOTAL: ${cur(h.total)}`, `Relatorio_${h.project}`)} className="p-4 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-2xl border border-white/5 transition-all active:scale-95 shadow-md">
                                <i className="fas fa-file-word text-lg"></i>
                             </button>
                             <button onClick={() => confirm("Apagar registro permanentemente?") && setData(d => ({...d, history: d.history.filter((x:any) => x.id !== h.id)}))} className="p-4 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/30 rounded-2xl transition-all active:scale-95 shadow-md">
                                <i className="fas fa-trash-alt text-lg"></i>
                             </button>
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="p-5 bg-slate-950 border-t border-white/5 text-center relative z-20 shadow-[0_-4px_30px_rgba(0,0,0,0.5)]">
         <div className="text-[8px] font-black text-slate-600 uppercase tracking-[0.5em] opacity-40">
           LUCANO DESIGNER3D PRO V38.0 • SISTEMA DE GESTÃO AUTOMATIZADA
         </div>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);