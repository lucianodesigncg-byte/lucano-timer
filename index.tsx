import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

const BRAND_NAME = 'LUCANO DESIGNER3D';
const SUBTITLE = 'TEMPO TRABALHADO NESSES PROJETOS';
const CONTACT_INFO = 'RUA BETÂNIA N392 BAIRRO OLIVEIRA\nWhatsApp: 74 9 91108629';

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
      const saved = localStorage.getItem('lucano_v18_final');
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

  useEffect(() => {
    localStorage.setItem('lucano_v18_final', JSON.stringify(data));
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

  // REQ 01 & 04: META ALCANÇADA -> SALVA, ZERA E PULA
  useEffect(() => {
    const goalSec = (data.goalMinutes || 0) * 60;
    if (data.active && goalSec > 0 && data.seconds >= goalSec) {
      handleSave(true);
      playSound('alarm');
    }
  }, [data.seconds, data.active, data.goalMinutes]);

  const formatT = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sc = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sc.toString().padStart(2, '0')}`;
  };

  const cur = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleSave = (fromMeta = false) => {
    const elapsed = data.seconds;
    if (elapsed < 1 && !fromMeta) return;

    const now = new Date();
    const endTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const startTimeDate = new Date(now.getTime() - elapsed * 1000);
    const startTime = startTimeDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const entry = {
      id: Date.now().toString(),
      project: String(data.project || "SEM NOME"),
      client: String(data.client || "SEM CLIENTE"),
      notes: String(data.notes || ""),
      time: Number(elapsed),
      rate: Number(data.rate),
      total: Number((elapsed / 3600) * data.rate),
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

  // REQ 03 & 06: RELATÓRIO INDIVIDUAL E CABEÇALHO
  const exportReport = (h: any, type: 'wa' | 'doc' | 'txt') => {
    const header = `${BRAND_NAME}\n${SUBTITLE}\n${CONTACT_INFO}\n------------------------------\n`;
    const body = `PROJETO: ${h.project}\nCLIENTE: ${h.client}\nDATA: ${h.date}\nINÍCIO: ${h.startTime} | FIM: ${h.endTime}\nVALOR HORA: ${cur(h.rate)}\nTOTAL: ${cur(h.total)}\n------------------------------\nNOTAS: ${h.notes || '-'}`;
    const text = header + body;

    if (type === 'wa') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
    } else {
      const blob = new Blob([text], { type: type === 'txt' ? 'text/plain' : 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Relatorio_${h.project}.${type === 'txt' ? 'txt' : 'doc'}`;
      a.click();
    }
  };

  // REQ 06: RELATÓRIO SOMA COM TABELA
  const exportSum = (type: 'wa' | 'doc' | 'txt') => {
    if (selectedProjects.length === 0) return;
    const header = `${BRAND_NAME}\n${SUBTITLE}\n${CONTACT_INFO}\n\n`;
    let table = `TABELA DE PROJETOS:\n`;
    table += `PROJETO | CLIENTE | INÍCIO | FIM | TOTAL\n`;
    table += `--------------------------------------------------\n`;
    
    selectedProjects.forEach((p: any) => {
      table += `${p.project} | ${p.client} | ${p.startTime} | ${p.endTime} | ${cur(p.total)}\n`;
    });
    
    table += `--------------------------------------------------\n`;
    table += `VALOR TOTAL ACUMULADO: ${cur(sumTotal)}`;
    
    const text = header + table;

    if (type === 'wa') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
    } else {
      const blob = new Blob([text], { type: type === 'txt' ? 'text/plain' : 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Soma_Trabalho_Lucano.${type === 'txt' ? 'txt' : 'doc'}`;
      a.click();
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#f8fafc] text-slate-800 font-sans overflow-hidden select-none">
      
      <header className="bg-[#2c3e50] pt-7 pb-5 text-center shadow-lg z-30">
        <h1 className="text-2xl font-black italic tracking-wider text-white uppercase leading-none">{BRAND_NAME}</h1>
        <p className="text-[7.5px] tracking-[0.3em] text-cyan-400 font-bold opacity-80 mt-1 uppercase">Sincronizador de Projetos 3D</p>
      </header>

      <nav className="flex bg-white border-b border-slate-200 z-20 shadow-sm">
        <button onClick={() => setActiveTab('controle')} className={`flex-1 py-4 flex flex-col items-center gap-1 relative ${activeTab === 'controle' ? 'text-cyan-600' : 'text-slate-400'}`}>
          <i className="fas fa-play-circle text-xl"></i>
          <span className="text-[9px] font-black uppercase tracking-widest text-center">Controle Ativo</span>
          {activeTab === 'controle' && <div className="absolute bottom-0 w-[60%] h-[3px] bg-cyan-600 rounded-t-full mx-auto"></div>}
        </button>
        <button onClick={() => setActiveTab('historico')} className={`flex-1 py-4 flex flex-col items-center gap-1 relative ${activeTab === 'historico' ? 'text-cyan-600' : 'text-slate-400'}`}>
          <i className="fas fa-history text-xl"></i>
          <span className="text-[9px] font-black uppercase tracking-widest text-center">Histórico e Relatório</span>
          {activeTab === 'historico' && <div className="absolute bottom-0 w-[60%] h-[3px] bg-cyan-600 rounded-t-full mx-auto"></div>}
        </button>
      </nav>

      <main className="flex-1 overflow-y-auto px-6 py-4 no-scrollbar bg-[#f8fafc]">
        
        {activeTab === 'controle' && (
          <div className="space-y-5 animate-in slide-in-from-bottom-3">
            
            {/* DISPLAY CRONOMETRO */}
            <div className={`bg-[#34495e] rounded-[2.5rem] p-8 text-center shadow-2xl border border-white/5 relative transition-all duration-500`}>
               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-2">Monitorando Produção</span>
               <div className="text-6xl font-black font-mono text-white tracking-tighter my-1">
                  {formatT(data.seconds)}
               </div>
               <div className="text-2xl font-black text-[#2ecc71] italic mt-1 mb-6">
                 {cur((data.seconds / 3600) * data.rate)}
               </div>
               
               <div className="bg-black/20 rounded-2xl py-2 px-4 mb-8 flex items-center justify-center gap-3 border border-white/5">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Estipular Meta</span>
                  <input type="number" className="w-14 bg-white/10 text-center text-white font-black rounded-lg outline-none border border-white/20 p-1.5 text-xs" value={data.goalMinutes} onChange={e => setData({...data, goalMinutes: parseInt(e.target.value) || 0})} />
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Minutos</span>
               </div>

               <div className="grid grid-cols-2 gap-3 mb-3">
                  <button onClick={() => { setData({...data, active: true}); playSound('start'); }} className="bg-[#27ae60] text-white py-4 rounded-2xl font-black text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all">
                    <i className="fas fa-play"></i> INICIAR
                  </button>
                  <button onClick={() => { setData({...data, active: false}); playSound('stop'); }} className="bg-[#f1c40f] text-white py-4 rounded-2xl font-black text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all">
                    <i className="fas fa-pause"></i> PAUSAR
                  </button>
               </div>
               
               <div className="grid grid-cols-2 gap-3">
                  {/* REQ 01: SALVAR PROJETO AGORA */}
                  <button onClick={() => handleSave(false)} className="bg-[#e74c3c] text-white py-4 rounded-2xl font-black text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all">
                    <i className="fas fa-check"></i> SALVAR PROJETO
                  </button>
                  {/* REQ 05: CONTINUAR PROJETO */}
                  <button onClick={() => data.history[0] && resumeHistory(data.history[0])} className="bg-[#3498db] text-white py-4 rounded-2xl font-black text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all">
                    <i className="fas fa-undo"></i> CONTINUAR PROJETO
                  </button>
               </div>
            </div>

            <div className="bg-white rounded-[2.5rem] p-7 shadow-md border border-slate-100 space-y-5">
               <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1 block">Cliente</label>
                    <input className="w-full bg-[#f8fafc] p-4 rounded-2xl border border-slate-100 font-black uppercase text-xs" placeholder="CLIENTE..." value={data.client} onChange={e => setData({...data, client: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1 block">Projeto</label>
                    <input className="w-full bg-[#f8fafc] p-4 rounded-2xl border border-slate-100 font-black uppercase text-xs" placeholder="AMBIENTE..." value={data.project} onChange={e => setData({...data, project: e.target.value})} />
                  </div>
               </div>
               <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1 block">Notas do Ambiente</label>
                  <textarea className="w-full bg-[#f8fafc] p-4 rounded-2xl border border-slate-100 text-xs text-slate-600 font-medium h-20 outline-none resize-none" placeholder="Detalhes técnicos aqui..." value={data.notes} onChange={e => setData({...data, notes: e.target.value})} />
               </div>
               <div className="bg-[#f8fafc] p-6 rounded-[2rem] border border-slate-100 text-center">
                  <span className="text-[9px] font-black text-cyan-600 italic uppercase block mb-3">Valor da Hora Trabalhada</span>
                  <div className="flex items-center justify-between mb-4 px-2">
                     <span className="text-3xl font-black italic">R$ {Number(data.rate).toFixed(2).replace('.', ',')}</span>
                     <input type="number" className="w-20 bg-white border border-slate-200 text-center font-black p-3 rounded-xl text-sm" value={data.rate} onChange={e => setData({...data, rate: parseFloat(e.target.value) || 0})} />
                  </div>
                  <input type="range" min="1" max="500" className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-600 custom-range" value={data.rate} onChange={e => setData({...data, rate: parseInt(e.target.value)})} />
               </div>
            </div>
          </div>
        )}

        {activeTab === 'historico' && (
          <div className="space-y-4 animate-in slide-in-from-right-3">
            
            {/* REQ 06: CALCULADORA DE SOMA COMPACTA */}
            {selectedIds.length > 0 && (
              <div className="bg-cyan-600 rounded-3xl p-5 shadow-xl text-center sticky top-0 z-40 animate-in zoom-in-95">
                 <span className="text-[8px] font-black text-cyan-100 block mb-1 uppercase tracking-widest">SOMA DOS SELECIONADOS ({selectedIds.length})</span>
                 <div className="text-2xl font-black text-white mb-3">{cur(sumTotal)}</div>
                 <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => exportSum('wa')} className="bg-emerald-500 text-white p-2 rounded-xl text-[8px] font-black uppercase shadow-md"><i className="fab fa-whatsapp"></i> Zap</button>
                    <button onClick={() => exportSum('doc')} className="bg-blue-500 text-white p-2 rounded-xl text-[8px] font-black uppercase shadow-md"><i className="fas fa-file-word"></i> Word</button>
                    <button onClick={() => exportSum('txt')} className="bg-slate-700 text-white p-2 rounded-xl text-[8px] font-black uppercase shadow-md"><i className="fas fa-file-alt"></i> Bloco</button>
                 </div>
              </div>
            )}

            {data.history.map((h: any) => (
              <div key={String(h.id)} className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-md flex items-start gap-4 hover:border-cyan-200 transition-all">
                {/* REQ 02: QUADRINHO DE SELEÇÃO */}
                <input type="checkbox" className="cb-custom mt-1" checked={selectedIds.includes(h.id)} onChange={() => toggleSelect(h.id)} />
                
                <div className="flex-1 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 pr-1">
                      <h4 className="font-black text-xs text-slate-800 uppercase truncate tracking-tight">{String(h.project)}</h4>
                      <p className="text-[9px] font-bold text-cyan-600 uppercase mt-0.5">{String(h.client)}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-[7px] text-slate-400 font-black"><i className="fas fa-calendar mr-1"></i> {String(h.date)}</span>
                        <span className="text-[7px] text-slate-400 font-black"><i className="fas fa-clock mr-1"></i> {h.startTime}-{h.endTime}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[#27ae60] font-black text-lg">{cur(Number(h.total))}</div>
                      <button onClick={() => resumeHistory(h)} className="mt-1 text-[7px] font-black uppercase text-cyan-600 border border-cyan-100 bg-cyan-50 px-3 py-1.5 rounded-lg">RETOMAR</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-50">
                    <button onClick={() => exportReport(h, 'wa')} className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-emerald-50">
                      <i className="fab fa-whatsapp text-emerald-500 text-xs mb-1"></i>
                      <span className="text-[7px] font-black text-slate-500">ZAP</span>
                    </button>
                    <button onClick={() => exportReport(h, 'doc')} className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-blue-50">
                      <i className="fas fa-file-word text-blue-500 text-xs mb-1"></i>
                      <span className="text-[7px] font-black text-slate-500">WORD</span>
                    </button>
                    <button onClick={() => exportReport(h, 'txt')} className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-slate-50">
                      <i className="fas fa-file-alt text-slate-400 text-xs mb-1"></i>
                      <span className="text-[7px] font-black text-slate-500">BLOCO</span>
                    </button>
                    <button onClick={() => confirm("Apagar?") && setData((p:any) => ({...p, history: p.history.filter((x:any) => x.id !== h.id)}))} className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-red-50">
                      <i className="fas fa-trash text-red-500 text-xs mb-1"></i>
                      <span className="text-[7px] font-black text-slate-500">DELETAR</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="p-4 bg-white border-t border-slate-100 text-center z-10">
         <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
           LUCANO DESIGNER3D V18.0 PREMIUM
           <br />
           {CONTACT_INFO.split('\n')[0]}
           <br />
           <span className="text-emerald-500">{CONTACT_INFO.split('\n')[1]}</span>
         </div>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);