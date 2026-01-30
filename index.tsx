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
      const saved = localStorage.getItem('lucano_v48_storage');
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
    localStorage.setItem('lucano_v48_storage', JSON.stringify(data));
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

  // EXPORTAÇÃO PREMIUM V48
  const exportWordReport = (title: string, entries: any[], isSummary: boolean) => {
    const BOM = "\ufeff";
    const totalValue = entries.reduce((acc, e) => acc + e.total, 0);
    const totalTime = entries.reduce((acc, e) => acc + e.time, 0);
    
    // Nomenclatura solicitada: Cliente - Projeto
    const filename = isSummary 
      ? `SOMA CONSOLIDADA - ${entries.length} PROJETOS`
      : `${entries[0].client} - ${entries[0].project}`;

    let contentHtml = "";

    if (isSummary) {
      // Layout compacto para caber mais na A4 (Modo Soma)
      contentHtml = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="background: #0c4a6e; color: #ffffff;">
              <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: left; font-size: 11px;">CLIENTE / PROJETO</th>
              <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: center; font-size: 11px;">VALOR HORA</th>
              <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: center; font-size: 11px;">TEMPO</th>
              <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: center; font-size: 11px;">DATA INÍCIO/FIM</th>
              <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: right; font-size: 11px;">SUBTOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${entries.map(h => `
              <tr style="background: #ffffff;">
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 12px;">
                  <b style="font-size: 14px; color: #0f172a;">${h.client}</b><br/>
                  <span style="color: #64748b;">${h.project}</span>
                </td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: center; font-size: 11px;">${cur(h.rate)}</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; font-size: 12px;">${formatT(h.time)}</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: center; font-size: 10px; color: #475569;">
                  ${h.startTime.split(',')[1]}<br/>até<br/>${h.endTime.split(',')[1]}
                </td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold; font-size: 13px; color: #0891b2;">${cur(h.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      // Layout Individual com fontes maiores
      const h = entries[0];
      contentHtml = `
        <div style="border: 2px solid #e2e8f0; padding: 30px; border-radius: 15px; background: #ffffff; margin-top: 20px;">
          <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold; letter-spacing: 2px;">Informações do Cliente</p>
          <h1 style="margin: 5px 0 25px 0; font-size: 26pt; color: #0f172a; font-weight: 900; line-height: 1;">${h.client}</h1>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 15px 0; font-size: 12px; color: #64748b; font-weight: bold; width: 40%;">TÍTULO DO PROJETO</td>
              <td style="padding: 15px 0; font-size: 18px; color: #0f172a; font-weight: 900; text-transform: uppercase;">${h.project}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 15px 0; font-size: 12px; color: #64748b; font-weight: bold;">VALOR DA HORA TRABALHADA</td>
              <td style="padding: 15px 0; font-size: 16px; color: #0f172a; font-weight: bold;">${cur(h.rate)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 15px 0; font-size: 12px; color: #64748b; font-weight: bold;">TEMPO TOTAL DE PRODUÇÃO</td>
              <td style="padding: 15px 0; font-size: 22pt; color: #0ea5e9; font-weight: 900; font-family: monospace;">${formatT(h.time)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 15px 0; font-size: 12px; color: #64748b; font-weight: bold;">DATA E HORA DE INÍCIO</td>
              <td style="padding: 15px 0; font-size: 14pt; color: #334155;">${h.startTime}</td>
            </tr>
            <tr>
              <td style="padding: 15px 0; font-size: 12px; color: #64748b; font-weight: bold;">DATA E HORA DE TÉRMINO</td>
              <td style="padding: 15px 0; font-size: 14pt; color: #334155;">${h.endTime}</td>
            </tr>
          </table>

          ${h.notes ? `
            <div style="background: #f8fafc; padding: 20px; border-radius: 10px; border-left: 5px solid #cbd5e1; margin-bottom: 25px;">
              <p style="margin: 0 0 5px 0; font-size: 10px; color: #64748b; font-weight: bold;">ANOTAÇÕES TÉCNICAS DO PROJETO</p>
              <p style="margin: 0; font-size: 12px; color: #475569; line-height: 1.6;">${h.notes}</p>
            </div>
          ` : ''}

          <div style="background: #0c4a6e; padding: 25px; border-radius: 15px; text-align: right; color: #ffffff;">
            <span style="font-size: 14px; opacity: 0.8; font-weight: bold;">VALOR TOTAL DO INVESTIMENTO</span><br/>
            <span style="font-size: 32pt; font-weight: 900; line-height: 1.2;">${cur(h.total)}</span>
          </div>
        </div>
      `;
    }

    let html = `
      <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; padding: 20px 40px; color: #334155; background: #ffffff;">
          <div style="border-bottom: 5px solid #0c4a6e; padding-bottom: 25px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end;">
            <div style="width: 60%;">
              <h1 style="color: #0c4a6e; font-size: 28pt; margin: 0; font-weight: 900; text-transform: uppercase; letter-spacing: -1px;">${BRAND_NAME}</h1>
              <p style="font-size: 11px; color: #64748b; margin: 5px 0; font-weight: bold;">${ADDRESS} | ${CONTACT}</p>
            </div>
            <div style="width: 35%; text-align: right;">
              <p style="margin: 0; font-size: 10px; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Tipo de Documento</p>
              <h3 style="margin: 0; color: #0ea5e9; font-size: 18px; font-weight: 900; text-transform: uppercase;">${title}</h3>
            </div>
          </div>
          
          ${contentHtml}

          ${isSummary ? `
            <div style="margin-top: 30px; padding: 25px; background: #0c4a6e; border-radius: 15px; color: #ffffff; text-align: right;">
              <p style="margin: 0; font-size: 12px; font-weight: bold; opacity: 0.8;">RESUMO CONSOLIDADO FINAL</p>
              <div style="display: flex; justify-content: flex-end; gap: 40px; margin-top: 10px; align-items: baseline;">
                <div><span style="font-size: 14px; opacity: 0.7;">TOTAL HORAS:</span> <b style="font-size: 20px; font-family: monospace;">${formatT(totalTime)}</b></div>
                <div><span style="font-size: 16px; font-weight: bold;">VALOR TOTAL:</span> <b style="font-size: 30px; font-weight: 900;">${cur(totalValue)}</b></div>
              </div>
            </div>
          ` : ''}

          <div style="margin-top: 50px; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; font-weight: bold;">
            ESTE RELATÓRIO TEM VALOR TÉCNICO E DE CONTROLE DE PRODUÇÃO • GERADO POR LUCANO DESIGNER3D ENGINE PRO V48
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
    <div className="flex flex-col h-screen w-full bg-[#020617] text-slate-100 overflow-hidden select-none font-sans">
      
      {/* HEADER PROFISSIONAL DASHBOARD */}
      <header className="relative py-8 px-10 bg-slate-900 border-b-4 border-cyan-500 z-40 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="relative text-center">
          <h1 className="text-3xl font-black italic tracking-tight text-white uppercase drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">
            {BRAND_NAME}
          </h1>
          <div className="flex items-center justify-center gap-4 mt-2">
            <span className="h-0.5 w-8 bg-cyan-500 opacity-50"></span>
            <p className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.4em] opacity-80">Premium IA Timer V48.0</p>
            <span className="h-0.5 w-8 bg-cyan-500 opacity-50"></span>
          </div>
          <p className="text-[8px] font-bold text-slate-500 mt-3 uppercase tracking-widest">{CONTACT}</p>
        </div>
      </header>

      {/* NAV */}
      <nav className="flex bg-slate-950 border-b border-white/5 z-30 shadow-lg">
        <button onClick={() => setActiveTab('controle')} className={`flex-1 py-5 flex flex-col items-center gap-2 transition-all relative ${activeTab === 'controle' ? 'text-cyan-400 bg-slate-900/50' : 'text-slate-500'}`}>
          <i className="fas fa-microchip text-xl"></i>
          <span className="text-[9px] font-black uppercase tracking-widest">Painel Operacional</span>
          {activeTab === 'controle' && <div className="absolute bottom-0 w-full h-[3px] bg-cyan-400"></div>}
        </button>
        <button onClick={() => setActiveTab('historico')} className={`flex-1 py-5 flex flex-col items-center gap-2 transition-all relative ${activeTab === 'historico' ? 'text-emerald-400 bg-slate-900/50' : 'text-slate-500'}`}>
          <i className="fas fa-layer-group text-xl"></i>
          <span className="text-[9px] font-black uppercase tracking-widest">Base de Dados</span>
          {activeTab === 'historico' && <div className="absolute bottom-0 w-full h-[3px] bg-emerald-400"></div>}
        </button>
      </nav>

      <main className="flex-1 overflow-y-auto px-6 py-8 no-scrollbar relative bg-[radial-gradient(circle_at_50%_50%,_#0f172a_0%,_#020617_100%)]">
        
        {/* MODAL EXCLUIR */}
        {itemToDelete && (
          <div className="absolute inset-0 z-[70] flex items-center justify-center p-8 bg-black/98 backdrop-blur-3xl">
             <div className="bg-slate-900 border-2 border-rose-500/50 rounded-[3rem] p-10 text-center shadow-2xl animate-in max-w-sm w-full">
                <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                   <i className="fas fa-trash-alt text-rose-500 text-3xl"></i>
                </div>
                <h2 className="text-xl font-black text-white uppercase mb-3">Eliminar Registro?</h2>
                <p className="text-slate-500 text-[10px] mb-8 uppercase tracking-widest font-bold">Esta operação é irreversível no sistema Lucano.</p>
                <div className="flex flex-col gap-3">
                   <button onClick={handleDelete} className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black py-5 rounded-2xl text-[11px] uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-rose-900/40">CONFIRMAR EXCLUSÃO</button>
                   <button onClick={() => setItemToDelete(null)} className="w-full text-slate-500 hover:text-white font-black py-3 text-[10px] uppercase tracking-widest">CANCELAR</button>
                </div>
             </div>
          </div>
        )}

        {/* ALERTA META */}
        {showAlarmChoice && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-8 bg-black/95 backdrop-blur-xl">
             <div className="bg-slate-900 border-2 border-amber-500 rounded-[3.5rem] p-12 text-center shadow-[0_0_50px_rgba(245,158,11,0.3)] animate-in max-w-sm w-full">
                <i className="fas fa-bolt text-amber-500 text-5xl mb-6 animate-pulse"></i>
                <h2 className="text-2xl font-black text-white uppercase mb-2">Meta Concluída</h2>
                <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-8">O ciclo programado foi finalizado.</p>
                <div className="flex flex-col gap-4">
                   <button onClick={() => { setShowAlarmChoice(false); setData(d => ({...d, active: true})); playSound('start'); }} className="w-full bg-emerald-600 text-white font-black py-6 rounded-3xl text-[11px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/40 active:scale-95">EXTENDER PRODUÇÃO</button>
                   <button onClick={handleSave} className="w-full bg-rose-600 text-white font-black py-6 rounded-3xl text-[11px] uppercase tracking-widest transition-all shadow-lg shadow-rose-900/40 active:scale-95">SALVAR E SAIR</button>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'controle' && (
          <div className="space-y-6 animate-in max-w-2xl mx-auto">
            {/* PAINEL CRONÔMETRO */}
            <div className="bg-slate-900/70 backdrop-blur-3xl rounded-[4rem] p-12 text-center shadow-2xl border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-1 bg-cyan-500/50 rounded-b-full"></div>
                <div className={`text-[80px] font-black font-mono tracking-tighter my-4 transition-all ${data.active ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]' : 'text-white'}`}>{formatT(data.seconds)}</div>
                <div className="text-3xl font-black text-emerald-400 italic mb-10 flex items-center justify-center gap-3">
                   <span className="text-[11px] text-slate-500 not-italic font-black uppercase tracking-[0.3em]">PRODUÇÃO:</span> {cur((data.seconds / 3600) * data.rate)}
                </div>

                <div className="bg-black/50 p-8 rounded-[2.5rem] border border-white/5 mb-10 group transition-all hover:border-cyan-500/30">
                   <label className="text-[10px] font-black text-slate-500 uppercase block mb-5 tracking-[0.4em]">Programar Próxima Sessão (min):</label>
                   <div className="flex items-center justify-center gap-6">
                      <button onClick={() => setData({...data, sessionGoal: Math.max(1, (data.sessionGoal || 30) - 15)})} className="w-14 h-14 rounded-2xl bg-slate-800 text-white hover:bg-slate-700 active:scale-90 transition-all border border-white/5"><i className="fas fa-minus"></i></button>
                      <input type="number" className="w-24 bg-transparent text-center text-4xl font-black text-white outline-none" value={data.sessionGoal || 30} onChange={e => setData({...data, sessionGoal: parseInt(e.target.value) || 0})} />
                      <button onClick={() => setData({...data, sessionGoal: (data.sessionGoal || 30) + 15})} className="w-14 h-14 rounded-2xl bg-slate-800 text-white hover:bg-slate-700 active:scale-90 transition-all border border-white/5"><i className="fas fa-plus"></i></button>
                   </div>
                </div>

                <button onClick={handleToggleTimer} className={`w-full h-24 rounded-[2rem] font-black text-white text-[12px] uppercase tracking-[0.4em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-5 mb-6 ${data.active ? 'bg-amber-600 shadow-amber-900/40' : 'bg-emerald-600 shadow-emerald-900/40'}`}>
                  <i className={`fas ${data.active ? 'fa-pause' : 'fa-play'} text-2xl`}></i>
                  {data.active ? 'PAUSAR MOTOR' : 'ATIVAR MOTOR IA'}
                </button>

                <div className="grid grid-cols-2 gap-4">
                  <button onClick={handleSave} className="h-16 bg-rose-600 hover:bg-rose-500 rounded-2xl font-black text-white text-[10px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-3 shadow-lg shadow-rose-900/20"><i className="fas fa-save"></i> SALVAR</button>
                  <button onClick={handleResetAndResume} className="h-16 bg-slate-800 hover:bg-slate-700 rounded-2xl font-black text-white text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg border border-white/5">LIMPAR & RETOMAR</button>
                </div>
            </div>

            {/* FORMULÁRIO */}
            <div className="bg-slate-900/50 backdrop-blur-md p-10 rounded-[3.5rem] border border-white/5 space-y-8 shadow-xl">
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className={`text-[9px] font-black uppercase ml-4 tracking-[0.2em] ${errorField === 'client' ? 'text-rose-500' : 'text-slate-500'}`}>Cliente Solicitante</label>
                    <input disabled={data.active} className={`w-full bg-black/60 p-5 rounded-2xl border text-white font-bold uppercase text-[11px] outline-none transition-all ${errorField === 'client' ? 'border-rose-500 animate-shake' : 'border-white/10 focus:border-cyan-500'}`} placeholder="NOME DO CLIENTE..." value={data.client} onChange={e => setData(d => ({...d, client: e.target.value}))} />
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[9px] font-black uppercase ml-4 tracking-[0.2em] ${errorField === 'project' ? 'text-rose-500' : 'text-slate-500'}`}>Especificação do Projeto</label>
                    <input disabled={data.active} className={`w-full bg-black/60 p-5 rounded-2xl border text-white font-bold uppercase text-[11px] outline-none transition-all ${errorField === 'project' ? 'border-rose-500 animate-shake' : 'border-white/10 focus:border-cyan-500'}`} placeholder="TÍTULO DO PROJETO..." value={data.project} onChange={e => setData(d => ({...d, project: e.target.value}))} />
                  </div>
                </div>
                
                <div className="bg-slate-950/80 p-8 rounded-[2.5rem] border border-white/10 shadow-inner">
                   <div className="flex justify-between items-center mb-6">
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest italic">Honorários (Hora):</span>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-black text-white italic">{cur(data.rate)}</span>
                        <input type="number" className="w-20 bg-slate-800 border border-white/10 text-center font-black p-3 rounded-xl text-[12px] text-white" value={data.rate} onChange={e => setData(d => ({...d, rate: parseFloat(e.target.value) || 0}))} />
                      </div>
                   </div>
                   <input type="range" min="1" max="1500" step="10" className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" value={data.rate} onChange={e => setData(d => ({...d, rate: parseInt(e.target.value)}))} />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-4 tracking-[0.2em]">Memorial Descritivo / Anotações</label>
                  <textarea className="w-full bg-black/60 p-6 rounded-[2.5rem] border border-white/10 text-[11px] text-slate-300 font-medium h-32 outline-none resize-none focus:border-purple-500 transition-all shadow-inner" placeholder="INSIRA DETALHES TÉCNICOS, MEDIDAS OU MDF..." value={data.notes} onChange={e => setData(d => ({...d, notes: e.target.value}))} />
                </div>
            </div>
          </div>
        )}

        {activeTab === 'historico' && (
          <div className="space-y-8 pb-24 animate-in max-w-4xl mx-auto">
            {selectedIds.length > 0 && (
              <div className="bg-slate-900 border-l-[12px] border-emerald-500 p-10 rounded-[3rem] shadow-2xl animate-in relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12"></div>
                 <div className="flex items-center justify-between mb-8">
                   <h2 className="text-xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                     <i className="fas fa-calculator text-emerald-500"></i> Consolidado Selecionado
                   </h2>
                   <button onClick={() => setSelectedIds([])} className="w-10 h-10 flex items-center justify-center bg-slate-800 rounded-full text-slate-500 hover:text-white transition-all"><i className="fas fa-times"></i></button>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                    <div className="bg-black/40 p-6 rounded-3xl border border-white/5 shadow-inner">
                       <span className="text-[9px] font-black text-slate-500 uppercase block mb-2 tracking-widest">Cronometria Total</span>
                       <span className="text-2xl font-black text-cyan-400 font-mono tracking-tighter">{formatT(sumSeconds)}</span>
                    </div>
                    <div className="bg-black/40 p-6 rounded-3xl border border-white/5 shadow-inner">
                       <span className="text-[9px] font-black text-slate-500 uppercase block mb-2 tracking-widest">Investimento Total</span>
                       <span className="text-2xl font-black text-emerald-400 italic tracking-tighter">{cur(sumTotal)}</span>
                    </div>
                 </div>
                 <button onClick={() => exportWordReport("RELATÓRIO DE SOMA CONSOLIDADA", selectedProjects, true)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-5 rounded-2xl text-[11px] uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3">
                   <i className="fas fa-file-invoice-dollar text-xl"></i> EXPORTAR SOMA PARA WORD (A4 OPTIMIZED)
                 </button>
              </div>
            )}

            <div className="space-y-8">
              {data.history.length === 0 ? (
                <div className="text-center py-24 opacity-20">
                  <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                    <i className="fas fa-database text-4xl"></i>
                  </div>
                  <p className="font-black uppercase text-xs tracking-[0.5em]">Sem Registros em Memória</p>
                </div>
              ) : data.history.map((h: any) => (
                <div key={h.id} className="relative group pl-12 animate-in">
                  <div className="absolute top-10 left-0 z-10">
                    <input type="checkbox" className="sr-only peer" checked={selectedIds.includes(h.id)} onChange={() => toggleSelect(h.id)} />
                    <div onClick={() => toggleSelect(h.id)} className="w-10 h-10 bg-slate-800 border-2 border-slate-700 rounded-2xl peer-checked:bg-cyan-500 peer-checked:border-cyan-500 transition-all flex items-center justify-center cursor-pointer shadow-xl active:scale-90"><i className="fas fa-check text-white text-sm opacity-0 peer-checked:opacity-100"></i></div>
                  </div>

                  <div className={`bg-slate-900/80 rounded-[3rem] border transition-all duration-300 overflow-hidden shadow-xl ${selectedIds.includes(h.id) ? 'border-cyan-500 ring-2 ring-cyan-500/20' : 'border-white/5 hover:border-white/10'}`}>
                    <div className="bg-slate-800/70 p-8 flex justify-between items-center border-b border-white/5">
                       <div>
                         <h3 className="text-base font-black text-white italic uppercase tracking-tighter group-hover:text-cyan-400 transition-colors">{h.project}</h3>
                         <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{h.date} • {h.client}</span>
                       </div>
                       <div className="text-right">
                         <span className="text-emerald-400 text-lg font-black block">{cur(h.total)}</span>
                         <span className="text-[8px] text-slate-500 font-bold uppercase">{cur(h.rate)}/h</span>
                       </div>
                    </div>
                    
                    <div className="p-8 space-y-8">
                       <div className="grid grid-cols-2 gap-6">
                          <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                            <span className="text-[8px] font-black text-slate-500 uppercase block mb-2 tracking-widest">Início / Conclusão</span>
                            <div className="space-y-1">
                              <span className="text-[10px] font-black text-white block"><i className="fas fa-play text-[8px] text-emerald-500 mr-2"></i>{h.startTime.split(',')[1]}</span>
                              <span className="text-[10px] font-black text-white block"><i className="fas fa-stop text-[8px] text-rose-500 mr-2"></i>{h.endTime.split(',')[1]}</span>
                            </div>
                          </div>
                          <div className="bg-black/30 p-4 rounded-2xl border border-white/5 flex flex-col justify-center">
                            <span className="text-[8px] font-black text-slate-500 uppercase block mb-1 tracking-widest">Tempo Liquído</span>
                            <span className="text-xl font-black text-cyan-400 font-mono tracking-tighter">{formatT(h.time)}</span>
                          </div>
                       </div>
                       
                       <div className="flex gap-3 items-center pt-6 border-t border-white/5">
                          <button onClick={() => handleContinueProject(h)} className="flex-1 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-white border border-cyan-500/20 py-4 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-md">REATIVAR PROJETO</button>
                          
                          <button onClick={() => exportWordReport("RELATÓRIO INDIVIDUAL TÉCNICO", [h], false)} className="w-14 h-14 bg-slate-800 text-cyan-500 rounded-2xl hover:bg-cyan-600 hover:text-white transition-all active:scale-95 shadow-md flex items-center justify-center border border-white/10" title="Exportar Cliente - Projeto">
                            <i className="fas fa-file-word text-xl"></i>
                          </button>
                          
                          <button onClick={(e) => { e.stopPropagation(); setItemToDelete(h.id); }} className="w-14 h-14 bg-rose-600/10 text-rose-500 rounded-2xl hover:bg-rose-600 hover:text-white transition-all active:scale-95 shadow-md flex items-center justify-center border border-rose-500/10">
                            <i className="fas fa-trash-alt text-xl"></i>
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

      <footer className="p-5 bg-slate-950 border-t border-white/5 text-center relative z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
         <div className="text-[8px] font-black text-slate-700 uppercase tracking-[0.6em] opacity-40">LUCANO DESIGNER3D PRO V48.0 • ENGINE DE RELATÓRIOS OTIMIZADA</div>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);