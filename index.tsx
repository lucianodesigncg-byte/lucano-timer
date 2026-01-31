import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

const BRAND_NAME = 'LUCANO DESIGNER3D';
const ADDRESS = 'Rua Betânia N392 Bairro Oliveira';
const CONTACT = 'Tel / WhatsApp: 74 9 91108629';

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
      const saved = localStorage.getItem('lucano_v55_storage');
      if (!saved) return { client: '', project: '', notes: '', rate: 25, seconds: 0, active: false, goalMinutes: 0, history: [], sessionGoal: 30 };
      const parsed = JSON.parse(saved);
      return { 
        ...parsed, 
        active: false, 
        history: Array.isArray(parsed.history) ? parsed.history : [],
        sessionGoal: parsed.sessionGoal || 30
      };
    } catch {
      return { client: '', project: '', notes: '', rate: 25, seconds: 0, active: false, goalMinutes: 0, history: [], sessionGoal: 30 };
    }
  });

  const [activeTab, setActiveTab] = useState<'controle' | 'historico'>('controle');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAlarmChoice, setShowAlarmChoice] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [lastAlarmedAt, setLastAlarmedAt] = useState<number | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);
  
  const timerRef = useRef<any>(null);
  const alarmSoundRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('lucano_v55_storage', JSON.stringify(data));
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
    if (data.active && goalSec > 0 && data.seconds >= goalSec) {
      if (lastAlarmedAt !== goalSec) {
        setData(prev => ({ ...prev, active: false }));
        setShowAlarmChoice(true);
        setLastAlarmedAt(goalSec);
        playSound('alarm');
      }
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

  const handleDelete = () => {
    if (!itemToDelete) return;
    setData((prev: any) => ({
      ...prev,
      history: prev.history.filter((h: any) => h.id !== itemToDelete)
    }));
    setSelectedIds(prev => prev.filter(sid => sid !== itemToDelete));
    setItemToDelete(null);
    playSound('stop');
  };

  const handleToggleTimer = () => {
    if (!data.active) {
      if (!data.client.trim() || !data.project.trim()) {
        setErrorField(!data.client.trim() ? 'client' : 'project');
        playSound('stop');
        setTimeout(() => setErrorField(null), 2000);
        return;
      }
      const currentMin = Math.floor(data.seconds / 60);
      const newGoal = currentMin + (data.sessionGoal || 30);
      setData(d => ({ ...d, active: true, goalMinutes: newGoal }));
      setLastAlarmedAt(null);
      playSound('start');
    } else {
      setData(d => ({ ...d, active: false }));
      playSound('stop');
    }
  };

  const handleSave = () => {
    if (data.seconds < 1) return;
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
      goalMinutes: 0,
      history: [entry, ...p.history] 
    }));
    setShowAlarmChoice(false);
    setLastAlarmedAt(null);
    setActiveTab('historico');
    playSound('success');
  };

  const handleResetAndResume = () => {
    const last = data.history.length > 0 ? data.history[0] : null;
    setData((p: any) => ({
      ...p,
      project: last ? last.project : '',
      client: last ? last.client : '',
      notes: last ? last.notes : '',
      rate: last ? last.rate : (p.rate || 25),
      seconds: 0,
      active: false,
      goalMinutes: 0
    }));
    setLastAlarmedAt(null);
    setActiveTab('controle');
    playSound('success');
  };

  const handleContinueProject = (h: any) => {
    setData((p: any) => ({
      ...p,
      project: h.project,
      client: h.client,
      notes: h.notes || '',
      rate: h.rate || 25,
      seconds: h.time,
      active: false,
      goalMinutes: 0
    }));
    setLastAlarmedAt(null);
    setActiveTab('controle');
    playSound('success');
  };

  const exportWordReport = (title: string, entries: any[], isSummary: boolean) => {
    const BOM = "\ufeff";
    const totalValue = entries.reduce((acc, e) => acc + e.total, 0);
    const totalTime = entries.reduce((acc, e) => acc + e.time, 0);
    
    let filename = "";
    if (isSummary) {
      const uniqueClients = Array.from(new Set(entries.map(e => e.client)));
      filename = uniqueClients.length === 1 ? `${uniqueClients[0]} - SOMA` : `DIVERSOS - SOMA`;
    } else {
      filename = `${entries[0].client} - ${entries[0].project}`;
    }

    let bodyHtml = "";

    if (isSummary) {
      bodyHtml = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <thead>
            <tr style="background: #0c4a6e; color: #ffffff;">
              <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: left; font-size: 10px;">CLIENTE/PROJETO</th>
              <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: center; font-size: 10px;">INÍCIO</th>
              <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: center; font-size: 10px;">TÉRMINO</th>
              <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: center; font-size: 10px;">VALOR/H</th>
              <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: center; font-size: 10px;">TEMPO</th>
              <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: right; font-size: 10px;">SUBTOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${entries.map((h, i) => `
              <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="padding: 12px; border: 1px solid #e2e8f0;">
                  <b style="font-size: 12px; color: #0c4a6e; text-transform: uppercase;">${h.client}</b><br/>
                  <span style="font-size: 10px; color: #64748b;">${h.project}</span>
                </td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: center; font-size: 10px;">${h.startTime || '---'}</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: center; font-size: 10px;">${h.endTime || '---'}</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: center; font-size: 11px;">${cur(h.rate)}</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; font-size: 11px;">${formatT(h.time)}</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold; font-size: 12px; color: #0891b2;">${cur(h.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="margin-top: 25px; padding: 25px; background: #0c4a6e; border-radius: 12px; color: #ffffff; text-align: right;">
          <span style="font-size: 10px; opacity: 0.8; text-transform: uppercase; font-weight: bold;">Resumo de Investimento</span><br/>
          <span style="font-size: 12px; opacity: 0.8;">Tempo Total Acumulado: ${formatT(totalTime)}</span><br/>
          <span style="font-size: 34px; font-weight: 900;">${cur(totalValue)}</span>
        </div>
      `;
    } else {
      const h = entries[0];
      bodyHtml = `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; padding: 30px; border-radius: 20px;">
          <h1 style="margin: 0; font-size: 22pt; color: #0f172a; font-weight: 900; text-transform: uppercase;">${h.client}</h1>
          <p style="margin: 5px 0 25px 0; font-size: 14px; color: #0ea5e9; font-weight: 800;">PROJETO: ${h.project}</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
            <tr style="background: #f8fafc;">
              <td style="padding: 15px; border: 1px solid #e2e8f0; width: 50%;">
                <span style="font-size: 9px; color: #94a3b8; font-weight: bold; text-transform: uppercase;">DATA/HORA INÍCIO</span><br/>
                <span style="font-size: 12px; color: #1e293b; font-weight: bold;">${h.startTime || h.date}</span>
              </td>
              <td style="padding: 15px; border: 1px solid #e2e8f0; width: 50%;">
                <span style="font-size: 9px; color: #94a3b8; font-weight: bold; text-transform: uppercase;">DATA/HORA TÉRMINO</span><br/>
                <span style="font-size: 12px; color: #1e293b; font-weight: bold;">${h.endTime || h.date}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 15px; border: 1px solid #e2e8f0;">
                <span style="font-size: 9px; color: #94a3b8; font-weight: bold; text-transform: uppercase;">VALOR DA HORA</span><br/>
                <span style="font-size: 18px; color: #0c4a6e; font-weight: 900;">${cur(h.rate)} /h</span>
              </td>
              <td style="padding: 15px; border: 1px solid #e2e8f0;">
                <span style="font-size: 9px; color: #94a3b8; font-weight: bold; text-transform: uppercase;">TEMPO TOTAL TRABALHADO</span><br/>
                <span style="font-size: 22pt; color: #0ea5e9; font-weight: 900;">${formatT(h.time)}</span>
              </td>
            </tr>
          </table>

          <div style="background: #0c4a6e; padding: 25px; border-radius: 15px; text-align: right; color: #ffffff;">
            <span style="font-size: 11px; opacity: 0.7; font-weight: bold; text-transform: uppercase;">INVESTIMENTO TOTAL</span><br/>
            <span style="font-size: 32pt; font-weight: 900;">${cur(h.total)}</span>
          </div>
          
          ${h.notes ? `
            <div style="margin-top: 25px; padding: 20px; border: 1px dashed #cbd5e1; border-radius: 10px;">
              <span style="font-size: 9px; color: #94a3b8; font-weight: bold; text-transform: uppercase;">ANOTAÇÕES DO PROJETO</span><br/>
              <p style="font-size: 11px; color: #475569; margin-top: 5px;">${h.notes}</p>
            </div>
          ` : ''}
        </div>
      `;
    }

    const html = `
      <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: 'Segoe UI', sans-serif; padding: 40px; color: #334155; background: #ffffff;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
            <tr>
              <td style="width: 70%;">
                <h1 style="color: #0c4a6e; font-size: 32pt; margin: 0; font-weight: 900; text-transform: uppercase; letter-spacing: -2px;">${BRAND_NAME}</h1>
                <p style="font-size: 16px; color: #1e293b; margin: 4px 0; font-weight: 900;">${ADDRESS}</p>
                <p style="font-size: 16px; color: #0ea5e9; margin: 2px 0; font-weight: 900;">${CONTACT}</p>
              </td>
              <td style="width: 30%; text-align: right; vertical-align: top;">
                <p style="font-size: 10px; color: #94a3b8; font-weight: 900; text-transform: uppercase; margin: 0;">Relatório de Auditoria</p>
                <p style="font-size: 12px; color: #1e293b; font-weight: 900; margin: 4px 0;">GERADO EM: ${new Date().toLocaleString('pt-BR')}</p>
              </td>
            </tr>
          </table>
          <hr style="border: 0; border-top: 5px solid #0c4a6e; margin: 15px 0 25px 0;">
          
          ${bodyHtml}

          <div style="margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: center;">
            <p style="font-size: 10px; color: #94a3b8; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">
              ${BRAND_NAME} • ${ADDRESS} • ${CONTACT}
            </p>
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
    playSound('success');
  };

  const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const selectedProjects = data.history.filter((h: any) => selectedIds.includes(h.id));
  const sumTotal = selectedProjects.reduce((acc: number, h: any) => acc + h.total, 0);
  const sumSeconds = selectedProjects.reduce((acc: number, h: any) => acc + h.time, 0);

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-[#020617] text-slate-100 overflow-hidden select-none font-sans">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-20 lg:w-24 bg-slate-900/80 backdrop-blur-xl border-b md:border-b-0 md:border-r border-white/5 flex flex-row md:flex-col items-center justify-around md:justify-center py-4 md:py-8 gap-8 z-50">
        <div className="hidden md:block mb-10">
          <div className="w-12 h-12 bg-cyan-500 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)]">
             <i className="fas fa-cube text-white text-xl"></i>
          </div>
        </div>
        <button onClick={() => setActiveTab('controle')} className={`p-4 rounded-2xl transition-all ${activeTab === 'controle' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
           <i className="fas fa-play-circle text-2xl"></i>
           <span className="md:hidden text-[9px] block mt-1 font-black uppercase tracking-tighter">Painel</span>
        </button>
        <button onClick={() => setActiveTab('historico')} className={`p-4 rounded-2xl transition-all ${activeTab === 'historico' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
           <i className="fas fa-database text-2xl"></i>
           <span className="md:hidden text-[9px] block mt-1 font-black uppercase tracking-tighter">Base</span>
        </button>
        <div className="hidden md:block mt-auto text-slate-700 text-[10px] font-black uppercase [writing-mode:vertical-lr] tracking-widest opacity-30">
           LUCANO V55.3
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto px-4 md:px-10 py-6 md:py-10 no-scrollbar relative bg-[radial-gradient(circle_at_50%_0%,_#0f172a_0%,_#020617_100%)]">
        
        {/* TOP BRANDING MOBILE */}
        <div className="md:hidden flex flex-col items-center mb-10">
           <h1 className="text-xl font-black text-white italic tracking-tighter uppercase">{BRAND_NAME}</h1>
           <p className="text-[8px] font-bold text-cyan-400 tracking-[0.4em]">PREMIUM AUDITOR V55.3</p>
        </div>

        {/* MODAIS */}
        {itemToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
             <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-10 text-center shadow-2xl max-w-sm w-full animate-in">
                <i className="fas fa-trash-alt text-rose-500 text-4xl mb-6"></i>
                <h2 className="text-xl font-black text-white uppercase mb-6">Eliminar Registro?</h2>
                <div className="flex flex-col gap-3">
                   <button onClick={handleDelete} className="w-full bg-rose-600 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white shadow-lg shadow-rose-900/40">Confirmar</button>
                   <button onClick={() => setItemToDelete(null)} className="w-full text-slate-500 py-2 text-[10px] font-black uppercase tracking-widest">Voltar</button>
                </div>
             </div>
          </div>
        )}

        {showAlarmChoice && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-lg">
             <div className="bg-slate-900 border-2 border-amber-500/50 rounded-[3rem] p-12 text-center shadow-2xl max-w-sm w-full animate-in">
                <i className="fas fa-hourglass-end text-amber-500 text-5xl mb-6 animate-pulse"></i>
                <h2 className="text-2xl font-black text-white uppercase mb-2">Meta de Tempo</h2>
                <p className="text-slate-400 text-sm mb-10">Você atingiu o tempo programado para esta sessão.</p>
                <div className="flex flex-col gap-4">
                   <button onClick={() => { setShowAlarmChoice(false); setData(d => ({...d, active: true})); playSound('start'); }} className="w-full bg-emerald-600 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white">Continuar</button>
                   <button onClick={handleSave} className="w-full bg-rose-600 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white">Salvar e Sair</button>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'controle' && (
          <div className="max-w-4xl mx-auto grid lg:grid-cols-2 gap-10 animate-in">
            
            {/* COLUNA 1: DASHBOARD TIMER */}
            <div className="space-y-8">
               <div className="bg-slate-900/40 backdrop-blur-3xl rounded-[3rem] p-10 md:p-14 text-center border border-white/5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                     <i className="fas fa-bolt text-9xl text-cyan-400 rotate-12"></i>
                  </div>
                  
                  <div className="relative">
                     <div className={`text-[42px] md:text-[64px] font-black font-mono tracking-tighter transition-all leading-none ${data.active ? 'text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'text-white'}`}>
                        {formatT(data.seconds)}
                     </div>
                     <div className="text-xl font-black text-emerald-400 mt-4 italic">
                        {cur((data.seconds / 3600) * data.rate)}
                     </div>
                  </div>

                  <div className="mt-10 space-y-4">
                     <button onClick={handleToggleTimer} className={`w-full h-20 rounded-3xl font-black text-white text-[11px] uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-4 ${data.active ? 'bg-amber-600 shadow-lg shadow-amber-900/40' : 'bg-cyan-600 shadow-lg shadow-cyan-900/40 hover:scale-[1.02]'}`}>
                        <i className={`fas ${data.active ? 'fa-pause' : 'fa-play'} text-xl`}></i>
                        {data.active ? 'Interromper' : 'Iniciar Motor'}
                     </button>
                     <div className="grid grid-cols-2 gap-4">
                        <button onClick={handleSave} className="h-14 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/20 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">Finalizar</button>
                        <button onClick={handleResetAndResume} className="h-14 bg-slate-800 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all hover:bg-slate-700">Limpar</button>
                     </div>
                  </div>
               </div>

               {/* PROGRAMAÇÃO DE SESSÃO */}
               <div className="bg-black/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/5">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-6">Programação de Alerta (Minutos)</span>
                  <div className="flex items-center justify-between gap-6 px-4">
                     <button onClick={() => setData({...data, sessionGoal: Math.max(1, (data.sessionGoal || 30) - 15)})} className="w-12 h-12 rounded-xl bg-slate-800 text-white flex items-center justify-center hover:bg-slate-700 active:scale-90 transition-all"><i className="fas fa-minus"></i></button>
                     <input type="number" className="bg-transparent text-center text-3xl font-black text-white outline-none w-20" value={data.sessionGoal || 30} onChange={e => setData({...data, sessionGoal: parseInt(e.target.value) || 0})} />
                     <button onClick={() => setData({...data, sessionGoal: (data.sessionGoal || 30) + 15})} className="w-12 h-12 rounded-xl bg-slate-800 text-white flex items-center justify-center hover:bg-slate-700 active:scale-90 transition-all"><i className="fas fa-plus"></i></button>
                  </div>
               </div>
            </div>

            {/* COLUNA 2: DADOS DO PROJETO */}
            <div className="space-y-8">
               <div className="bg-slate-900/40 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/5 space-y-6">
                  <div className="space-y-1">
                     <label className={`text-[9px] font-black uppercase ml-4 tracking-widest transition-colors ${errorField === 'client' ? 'text-rose-500' : 'text-slate-500'}`}>Cliente de Origem</label>
                     <div className="relative">
                        <i className="fas fa-user-circle absolute left-5 top-1/2 -translate-y-1/2 text-slate-600"></i>
                        <input disabled={data.active} className={`w-full bg-black/60 py-5 pl-14 pr-5 rounded-2xl border text-white font-bold uppercase text-[11px] outline-none transition-all ${errorField === 'client' ? 'border-rose-500 animate-shake' : 'border-white/10 focus:border-cyan-500'}`} placeholder="IDENTIFIQUE O CLIENTE..." value={data.client} onChange={e => setData(d => ({...d, client: e.target.value}))} />
                     </div>
                  </div>
                  
                  <div className="space-y-1">
                     <label className={`text-[9px] font-black uppercase ml-4 tracking-widest transition-colors ${errorField === 'project' ? 'text-rose-500' : 'text-slate-500'}`}>Especificação de Projeto</label>
                     <div className="relative">
                        <i className="fas fa-project-diagram absolute left-5 top-1/2 -translate-y-1/2 text-slate-600"></i>
                        <input disabled={data.active} className={`w-full bg-black/60 py-5 pl-14 pr-5 rounded-2xl border text-white font-bold uppercase text-[11px] outline-none transition-all ${errorField === 'project' ? 'border-rose-500 animate-shake' : 'border-white/10 focus:border-cyan-500'}`} placeholder="EX: COZINHA PLANEJADA..." value={data.project} onChange={e => setData(d => ({...d, project: e.target.value}))} />
                     </div>
                  </div>

                  <div className="bg-black/60 p-6 rounded-2xl border border-white/5">
                     <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest italic">VALOR HORA:</span>
                        <div className="flex items-center gap-2">
                           <span className="text-lg font-black text-white">{cur(data.rate)}</span>
                           <input type="number" className="w-16 bg-slate-800 border-0 text-center font-black p-2 rounded-lg text-[10px] text-white outline-none" value={data.rate} onChange={e => setData(d => ({...d, rate: parseFloat(e.target.value) || 0}))} />
                        </div>
                     </div>
                     <input type="range" min="1" max="1500" step="5" className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500" value={data.rate} onChange={e => setData(d => ({...d, rate: parseInt(e.target.value)}))} />
                  </div>

                  <div className="space-y-1">
                     <label className="text-[9px] font-black text-slate-500 uppercase ml-4 tracking-widest">Anotações do Designer</label>
                     <textarea className="w-full bg-black/60 p-6 rounded-3xl border border-white/10 text-[11px] text-slate-300 font-medium h-24 outline-none resize-none focus:border-cyan-500 transition-all shadow-inner" placeholder="MEDIDAS, MATERIAIS, OBSERVAÇÕES..." value={data.notes} onChange={e => setData(d => ({...d, notes: e.target.value}))} />
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'historico' && (
          <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in">
            
            {/* BARRA DE SELEÇÃO / SOMA */}
            {selectedIds.length > 0 && (
              <div className="bg-cyan-500 p-8 md:p-10 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 mb-10 text-white sticky top-0 z-40">
                 <div className="text-center md:text-left">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-80">SOMA DA SELEÇÃO ({selectedIds.length})</span>
                    <div className="text-2xl font-black italic tracking-tighter leading-tight">{cur(sumTotal)}</div>
                    <div className="text-[11px] font-black uppercase opacity-70 font-mono">{formatT(sumSeconds)} ACUMULADOS</div>
                 </div>
                 <div className="flex gap-4 w-full md:w-auto">
                    <button onClick={() => exportWordReport("CONSOLIDAÇÃO DE INVESTIMENTO", selectedProjects, true)} className="flex-1 md:flex-none px-10 py-5 bg-white text-cyan-700 font-black rounded-2xl text-[11px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg active:scale-95">Exportar Soma</button>
                    <button onClick={() => setSelectedIds([])} className="w-16 h-16 flex items-center justify-center bg-cyan-700 rounded-2xl hover:bg-cyan-800 transition-all"><i className="fas fa-times text-xl"></i></button>
                 </div>
              </div>
            )}

            {/* LISTAGEM DE HISTÓRICO */}
            <div className="grid md:grid-cols-2 lg:grid-cols-1 gap-6">
              {data.history.length === 0 ? (
                <div className="text-center py-20 opacity-20">
                  <i className="fas fa-folder-open text-6xl mb-4"></i>
                  <p className="font-black text-xs uppercase tracking-widest">Base de Dados Vazia</p>
                </div>
              ) : data.history.map((h: any) => (
                <div key={h.id} className={`group flex flex-col lg:flex-row items-stretch lg:items-center gap-6 bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] border p-8 transition-all duration-300 ${selectedIds.includes(h.id) ? 'border-cyan-500 ring-4 ring-cyan-500/10' : 'border-white/5 hover:bg-slate-900/60'}`}>
                  
                  {/* SELEÇÃO */}
                  <div className="flex items-center gap-4">
                     <input type="checkbox" className="sr-only peer" checked={selectedIds.includes(h.id)} onChange={() => toggleSelect(h.id)} />
                     <div onClick={() => toggleSelect(h.id)} className="w-12 h-12 bg-slate-800 border-2 border-slate-700 rounded-2xl peer-checked:bg-cyan-500 peer-checked:border-cyan-500 transition-all flex items-center justify-center cursor-pointer active:scale-90"><i className="fas fa-check text-white text-sm opacity-0 peer-checked:opacity-100"></i></div>
                  </div>

                  {/* CONTEÚDO PRINCIPAL */}
                  <div className="flex-1">
                     <div className="flex items-center gap-3 mb-2">
                        <span className="bg-slate-800 px-3 py-1 rounded-full text-[8px] font-black text-slate-500 uppercase tracking-widest">{h.date}</span>
                        <span className="text-cyan-400 font-black text-[9px] uppercase tracking-[0.2em]">Auditoria Premium</span>
                     </div>
                     <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-1 drop-shadow-md">{h.client}</h3>
                     <p className="text-[11px] font-bold text-slate-400 uppercase italic flex items-center gap-2">
                        <i className="fas fa-angle-right text-cyan-500"></i> {h.project}
                     </p>
                  </div>

                  {/* MÉTRICAS */}
                  <div className="grid grid-cols-2 lg:flex lg:items-center gap-6 lg:gap-10 py-6 lg:py-0 border-y lg:border-y-0 lg:border-x border-white/5 lg:px-10">
                     <div className="text-center lg:text-left">
                        <span className="text-[8px] font-black text-slate-500 uppercase block mb-1 tracking-widest">Tempo</span>
                        <span className="text-lg font-black text-cyan-400 font-mono tracking-tighter">{formatT(h.time)}</span>
                     </div>
                     <div className="text-center lg:text-left">
                        <span className="text-[8px] font-black text-slate-500 uppercase block mb-1 tracking-widest">Investimento</span>
                        <span className="text-lg font-black text-emerald-400 italic tracking-tighter">{cur(h.total)}</span>
                     </div>
                  </div>

                  {/* AÇÕES */}
                  <div className="flex gap-3 justify-center">
                     <button onClick={() => handleContinueProject(h)} title="Reativar" className="w-14 h-14 bg-slate-800 hover:bg-cyan-600 text-cyan-400 hover:text-white rounded-2xl transition-all active:scale-90 flex items-center justify-center"><i className="fas fa-sync-alt"></i></button>
                     <button onClick={() => exportWordReport("RELATÓRIO DE AUDITORIA", [h], false)} title="Exportar Word" className="w-14 h-14 bg-slate-800 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-2xl transition-all active:scale-90 flex items-center justify-center"><i className="fas fa-file-word text-xl"></i></button>
                     <button onClick={() => setItemToDelete(h.id)} title="Excluir" className="w-14 h-14 bg-slate-800 hover:bg-rose-600 text-rose-500 hover:text-white rounded-2xl transition-all active:scale-90 flex items-center justify-center"><i className="fas fa-trash-alt"></i></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="fixed bottom-0 md:bottom-auto md:top-0 right-0 p-6 z-[60] pointer-events-none md:pointer-events-auto">
         <div className="hidden md:flex flex-col items-end opacity-30 hover:opacity-100 transition-opacity">
            <span className="text-[10px] font-black text-white uppercase tracking-[0.5em]">{BRAND_NAME}</span>
            <span className="text-[8px] font-bold text-cyan-400 uppercase tracking-widest">Engine V55.3 Stable</span>
         </div>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);