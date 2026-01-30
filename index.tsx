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
      const saved = localStorage.getItem('lucano_v17_final');
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
  const beepRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('lucano_v17_final', JSON.stringify(data));
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

  // REGRA: META ALCANÇADA (REQ 01 & 04)
  useEffect(() => {
    const goalSec = (data.goalMinutes || 0) * 60;
    if (data.active && goalSec > 0 && data.seconds >= goalSec) {
      // Finaliza automaticamente
      handleSave(true);
      playSound('alarm');
      setIsAlarmActive(true);
    }
  }, [data.seconds, data.active, data.goalMinutes]);

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

  const handleSave = (fromMeta = false) => {
    const elapsed = fromMeta ? (data.goalMinutes * 60) : data.seconds;
    if (elapsed < 1 && !fromMeta) return;

    const entry = {
      id: Date.now().toString(),
      project: String(data.project || "SEM NOME"),
      client: String(data.client || "SEM CLIENTE"),
      notes: String(data.notes || ""),
      time: Number(elapsed),
      rate: Number(data.rate),
      total: Number((elapsed / 3600) * data.rate),
      date: new Date().toLocaleDateString('pt-BR')
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
      active: false
    }));
    setActiveTab('controle');
    playSound('start');
  };

  const resumeLast = () => {
    if (data.history.length === 0) return alert("Nenhum histórico disponível.");
    resumeHistory(data.history[0]);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectedProjects = data.history.filter((h: any) => selectedIds.includes(h.id));
  const sumTotal = selectedProjects.reduce((acc: number, h: any) => acc + h.total, 0);

  const exportReport = (h: any, type: 'wa' | 'doc' | 'txt') => {
    const text = `*RELATÓRIO LUCANO DESIGNER3D*\nProjeto: ${h.project}\nCliente: ${h.client}\nTempo: ${formatT(h.time)}\nValor Hora: ${cur(h.rate)}\nTotal: ${cur(h.total)}\nNotas: ${h.notes || '-'}`;
    if (type === 'wa') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
    } else {
      const blob = new Blob([text.replace(/\*/g, '')], { type: type === 'txt' ? 'text/plain' : 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Relatorio_${h.project}.${type === 'txt' ? 'txt' : 'doc'}`;
      a.click();
    }
  };

  const exportSum = (type: 'wa' | 'doc' | 'txt') => {
    if (selectedProjects.length === 0) return;
    let text = `*SOMA DE PROJETOS SELECIONADOS - ${BRAND_NAME}*\n\n`;
    selectedProjects.forEach((p: any) => {
      text += `- ${p.project} (${p.client}): ${cur(p.total)}\n`;
    });
    text += `\n*TOTAL GERAL: ${cur(sumTotal)}*`;

    if (type === 'wa') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
    } else {
      const blob = new Blob([text.replace(/\*/g, '')], { type: type === 'txt' ? 'text/plain' : 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Soma_Projetos_Lucano.${type === 'txt' ? 'txt' : 'doc'}`;
      a.click();
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#f8fafc] text-slate-800 font-sans overflow-hidden select-none">
      
      {/* HEADER PREMIUM */}
      <header className="bg-[#2c3e50] pt-7 pb-5 text-center shadow-lg z-30">
        <h1 className="text-2xl font-black italic tracking-wider text-white uppercase leading-none">{BRAND_NAME}</h1>
        <p className="text-[7.5px] tracking-[0.3em] text-cyan-400 font-bold opacity-80 mt-1 uppercase">{SUBTITLE}</p>
      </header>

      {/* ABAS */}
      <nav className="flex bg-white border-b border-slate-200 z-20 shadow-sm">
        <button onClick={() => setActiveTab('controle')} className={`flex-1 py-4 flex flex-col items-center gap-1 relative ${activeTab === 'controle' ? 'text-cyan-600' : 'text-slate-400'}`}>
          <i className="fas fa-play-circle text-xl"></i>
          <span className="text-[9px] font-black uppercase tracking-widest">Controle</span>
          {activeTab === 'controle' && <div className="absolute bottom-0 w-[60%] h-[3px] bg-cyan-600 rounded-t-full mx-auto"></div>}
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
            
            {/* CARD CRONOMETRO */}
            <div className={`bg-[#34495e] rounded-[2.5rem] p-8 text-center shadow-2xl border border-white/5 relative overflow-hidden transition-all duration-500 ${isAlarmActive ? 'ring-4 ring-red-500 shadow-red-500/30' : ''}`}>
               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-2">Tempo Ativo</span>
               <div className="text-6xl font-black font-mono text-white tracking-tighter my-1">
                  {formatT(data.seconds)}
               </div>
               <div className="text-2xl font-black text-[#2ecc71] italic mt-1 mb-6">
                 {cur((data.seconds / 3600) * data.rate)}
               </div>
               
               {/* TRAVAR META */}
               <div className="bg-black/20 rounded-2xl py-2 px-4 mb-8 flex items-center justify-center gap-3 border border-white/5">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Travar Meta</span>
                  <input type="number" className="w-14 bg-white/10 text-center text-white font-black rounded-lg outline-none border border-white/20 p-1.5 text-xs focus:border-cyan-400" value={data.goalMinutes} onChange={e => setData({...data, goalMinutes: parseInt(e.target.value) || 0})} />
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Minutos</span>
               </div>

               <div className="grid grid-cols-2 gap-3 mb-3">
                  <button onClick={() => { setData({...data, active: true}); playSound('start'); setIsAlarmActive(false); }} className="bg-[#27ae60] hover:bg-[#2ecc71] text-white py-4 rounded-2xl font-black text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all">
                    <i className="fas fa-play"></i> INICIAR
                  </button>
                  <button onClick={() => { setData({...data, active: false}); playSound('stop'); }} className="bg-[#f1c40f] hover:bg-[#f39c12] text-white py-4 rounded-2xl font-black text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all">
                    <i className="fas fa-pause"></i> PAUSAR
                  </button>
               </div>
               
               <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => handleSave(false)} className="bg-[#e74c3c] hover:bg-[#c0392b] text-white py-4 rounded-2xl font-black text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all">
                    <i className="fas fa-check"></i> SALVAR
                  </button>
                  {/* REQ 05: BOTÃO RETOMAR */}
                  <button onClick={resumeLast} className="bg-[#3498db] hover:bg-[#2980b9] text-white py-4 rounded-2xl font-black text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all">
                    <i className="fas fa-undo"></i> RETOMAR ÚLTIMO
                  </button>
               </div>

               {isAlarmActive && (
                 <button onClick={() => setIsAlarmActive(false)} className="w-full mt-4 py-3 bg-red-600 text-white rounded-xl text-[9px] font-black uppercase animate-pulse">Parar Alarme</button>
               )}
            </div>

            {/* FORMULÁRIO */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-md border border-slate-100 space-y-6">
               <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Cliente</label>
                    <input className="w-full bg-[#f8fafc] p-4 rounded-2xl border border-slate-100 font-black uppercase text-xs outline-none focus:border-cyan-500/50" placeholder="CLIENTE..." value={data.client} onChange={e => setData({...data, client: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Projeto</label>
                    <input className="w-full bg-[#f8fafc] p-4 rounded-2xl border border-slate-100 font-black uppercase text-xs outline-none focus:border-cyan-500/50" placeholder="AMBIENTE..." value={data.project} onChange={e => setData({...data, project: e.target.value})} />
                  </div>
               </div>
               <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Notas Técnicas</label>
                  <textarea className="w-full bg-[#f8fafc] p-4 rounded-2xl border border-slate-100 text-xs text-slate-600 font-medium h-24 outline-none resize-none leading-relaxed" placeholder="Pé direito, Paredes..." value={data.notes} onChange={e => setData({...data, notes: e.target.value})} />
               </div>
               <div className="bg-[#f8fafc] p-6 rounded-[2.5rem] border border-slate-100">
                  <span className="text-[9px] font-black text-cyan-600 italic uppercase block mb-3 tracking-widest text-center">Valor da Hora Trabalhada</span>
                  <div className="flex items-center justify-between mb-4">
                     <span className="text-3xl font-black italic">R$ {Number(data.rate).toFixed(2).replace('.', ',')}</span>
                     <input type="number" className="w-20 bg-white border border-slate-200 text-center font-black p-3 rounded-xl text-sm" value={data.rate} onChange={e => setData({...data, rate: parseFloat(e.target.value) || 0})} />
                  </div>
                  <input type="range" min="1" max="500" className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-600 custom-range" value={data.rate} onChange={e => setData({...data, rate: parseInt(e.target.value)})} />
               </div>
            </div>
          </div>
        )}

        {activeTab === 'historico' && (
          <div className="space-y-6 animate-in slide-in-from-right-3">
            
            {/* REQ 06: CALCULADORA DE SOMA NO HISTÓRICO */}
            {selectedIds.length > 0 && (
              <div className="bg-cyan-600 rounded-[2rem] p-6 shadow-xl text-center sticky top-0 z-40 animate-in zoom-in-95">
                 <span className="text-[9px] font-black text-cyan-100 block mb-1 tracking-widest uppercase">PROJETOS SELECIONADOS ({selectedIds.length})</span>
                 <div className="text-3xl font-black text-white mb-4">{cur(sumTotal)}</div>
                 <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => exportSum('wa')} className="bg-emerald-500 text-white p-2 rounded-xl text-[8px] font-black uppercase flex items-center justify-center gap-1 shadow-md"><i className="fab fa-whatsapp"></i> Zap</button>
                    <button onClick={() => exportSum('doc')} className="bg-blue-500 text-white p-2 rounded-xl text-[8px] font-black uppercase flex items-center justify-center gap-1 shadow-md"><i className="fas fa-file-word"></i> Word</button>
                    <button onClick={() => exportSum('txt')} className="bg-slate-700 text-white p-2 rounded-xl text-[8px] font-black uppercase flex items-center justify-center gap-1 shadow-md"><i className="fas fa-file-alt"></i> Bloco</button>
                 </div>
              </div>
            )}

            {data.history.map((h: any) => (
              <div key={String(h.id)} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-md flex items-start gap-4 hover:border-cyan-200 transition-all">
                {/* REQ 02: QUADRINHO DE SELEÇÃO */}
                <input type="checkbox" className="cb-custom mt-1" checked={selectedIds.includes(h.id)} onChange={() => toggleSelect(h.id)} />
                
                <div className="flex-1 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 pr-2">
                      <h4 className="font-black text-sm text-slate-800 uppercase truncate leading-tight">{String(h.project)}</h4>
                      <p className="text-[10px] font-bold text-cyan-600 uppercase mt-0.5">{String(h.client)}</p>
                      <div className="flex gap-3 mt-2">
                        <span className="text-[8px] text-slate-400 font-black"><i className="fas fa-calendar-alt mr-1"></i> {String(h.date)}</span>
                        <span className="text-[8px] text-slate-400 font-black"><i className="fas fa-clock mr-1"></i> {formatT(Number(h.time))}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[#27ae60] font-black text-xl drop-shadow-sm">{cur(Number(h.total))}</div>
                      <button onClick={() => resumeHistory(h)} className="mt-2 text-[8px] font-black uppercase text-cyan-600 border border-cyan-100 bg-cyan-50 px-4 py-1.5 rounded-lg">RETOMAR</button>
                    </div>
                  </div>

                  {/* REQ 03: OPÇÕES DE SALVAMENTO INDIVIDUAL */}
                  <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-50">
                    <button onClick={() => exportReport(h, 'wa')} className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-emerald-50">
                      <i className="fab fa-whatsapp text-emerald-500 text-sm mb-1"></i>
                      <span className="text-[7px] font-black text-slate-500">ZAP</span>
                    </button>
                    <button onClick={() => exportReport(h, 'doc')} className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-blue-50">
                      <i className="fas fa-file-word text-blue-500 text-sm mb-1"></i>
                      <span className="text-[7px] font-black text-slate-500">WORD</span>
                    </button>
                    <button onClick={() => exportReport(h, 'txt')} className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-slate-50">
                      <i className="fas fa-file-alt text-slate-400 text-sm mb-1"></i>
                      <span className="text-[7px] font-black text-slate-500">TXT</span>
                    </button>
                    <button onClick={() => confirm("Apagar?") && setData((p:any) => ({...p, history: p.history.filter((x:any) => x.id !== h.id)}))} className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-red-50">
                      <i className="fas fa-trash text-red-500 text-sm mb-1"></i>
                      <span className="text-[7px] font-black text-slate-500">DELETAR</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {data.history.length === 0 && (
              <div className="text-center py-20 opacity-20">
                <i className="fas fa-archive text-6xl mb-4 block"></i>
                <p className="text-[10px] font-black uppercase tracking-[0.4em]">Histórico Vazio</p>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="p-5 bg-white border-t border-slate-100 text-center z-10 shadow-inner">
         <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
           LUCANO DESIGNER3D V17.0 PREMIUM
           <br />
           <span className="opacity-50 font-bold">RUA BETÂNIA N392 BAIRRO OLIVEIRA</span>
           <br />
           WhatsApp: <span className="text-emerald-500">74 9 91108629</span>
         </div>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);