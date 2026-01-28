
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';

const App = () => {
    const COMPANY = { 
        name: "Lucano Designer3d", 
        version: "v14.0 Premium",
        address: "Rua Betânia N392 Bairro Oliveira",
        whatsapp: "74 9 91108629"
    };

    const [data, setData] = useState(() => {
        const saved = localStorage.getItem('lucano_v14_final');
        try {
            const parsed = saved ? JSON.parse(saved) : null;
            return parsed || {
                clientName: '', 
                projectName: '', 
                hourlyRate: 80, 
                elapsedSeconds: 0, 
                targetMinutes: 60,
                customAlarmUrl: null,
                isActive: false, 
                startTime: null,
                notes: '', 
                history: []
            };
        } catch (e) {
            return {
                clientName: '', 
                projectName: '', 
                hourlyRate: 80, 
                elapsedSeconds: 0, 
                targetMinutes: 60,
                customAlarmUrl: null,
                isActive: false, 
                startTime: null,
                notes: '', 
                history: []
            };
        }
    });

    const [activeTab, setActiveTab] = useState('timer');
    const [selectedHistoryIds, setSelectedHistoryIds] = useState<number[]>([]);
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    
    const timerRef = useRef<any>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);
    const alarmAudioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        localStorage.setItem('lucano_v14_final', JSON.stringify(data));
    }, [data]);

    const formatTime = (s: number) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

    const calculateVal = (s: number, rate: number) => (s / 3600) * rate;
    const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const stopAlarm = () => {
        if (alarmAudioRef.current) {
            alarmAudioRef.current.pause();
            alarmAudioRef.current.currentTime = 0;
        }
        setIsAudioPlaying(false);
    };

    const playAlarm = () => {
        const audioUrl = data.customAlarmUrl || 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg';
        if (!alarmAudioRef.current || alarmAudioRef.current.src !== audioUrl) {
            alarmAudioRef.current = new Audio(audioUrl);
            alarmAudioRef.current.loop = true;
        }
        alarmAudioRef.current.play().catch((err) => console.log("Erro ao tocar áudio:", err));
        setIsAudioPlaying(true);
    };

    const triggerSaveAndReset = (secondsToSave: number, isAuto: boolean = false) => {
        if (!isAuto && secondsToSave <= 0) {
            alert("Inicie o cronômetro antes de salvar!");
            return;
        }
        
        stopAlarm();
        
        const timeToReport = secondsToSave;
        const rawVal = calculateVal(timeToReport, data.hourlyRate);
        
        const entry = {
            id: Date.now(),
            client: String(data.clientName || 'Geral'),
            project: String(data.projectName || 'Sem Título'),
            time: Number(timeToReport),
            val: Number(rawVal),
            cost: formatBRL(rawVal),
            hourlyRate: formatBRL(data.hourlyRate),
            startDate: String(data.startTime || new Date().toLocaleString('pt-BR')),
            reportDate: new Date().toLocaleString('pt-BR'),
            notes: String(data.notes || '')
        };

        // Zera tudo: cronômetro e campos de texto (Nome, Projeto, Notas)
        setData(p => ({
            ...p,
            elapsedSeconds: 0,
            isActive: false,
            startTime: null,
            clientName: '', 
            projectName: '',
            notes: '',
            history: [entry, ...p.history]
        }));
        
        setActiveTab('history');
        
        if (isAuto) {
            alert("ALERTA: Meta atingida! O relatório foi salvo e os campos foram limpos para um novo início.");
        } else {
            alert("Relatório salvo e cronômetro resetado! Pronto para o próximo projeto.");
        }
    };

    // Monitor de Meta Atingida - Zera música e salva tudo
    useEffect(() => {
        const targetSeconds = (data.targetMinutes || 0) * 60;
        if (data.isActive && targetSeconds > 0 && data.elapsedSeconds >= targetSeconds) {
            playAlarm();
            triggerSaveAndReset(targetSeconds, true);
        }
    }, [data.elapsedSeconds, data.targetMinutes, data.isActive]);

    const clearHistory = () => {
        if (confirm("ATENÇÃO: Deseja apagar TODO o histórico permanentemente?")) {
            setData(p => ({ ...p, history: [] }));
            setSelectedHistoryIds([]);
        }
    };

    const deleteSelected = () => {
        if (confirm(`Deseja excluir os ${selectedHistoryIds.length} itens selecionados?`)) {
            setData(p => ({
                ...p,
                history: p.history.filter((h: any) => !selectedHistoryIds.includes(h.id))
            }));
            setSelectedHistoryIds([]);
        }
    };

    const resumeProject = (item: any) => {
        if (confirm(`Retomar trabalho para o cliente "${item.client}"?`)) {
            const numericRate = typeof item.hourlyRate === 'string' 
                ? parseFloat(item.hourlyRate.replace(/[^\d,.-]/g, '').replace(',', '.')) 
                : 80;
            
            setData(prev => ({
                ...prev,
                clientName: String(item.client),
                projectName: String(item.project),
                hourlyRate: numericRate,
                notes: String(item.notes || ''),
                elapsedSeconds: 0,
                isActive: false,
                startTime: null
            }));
            setActiveTab('timer');
        }
    };

    useEffect(() => {
        if (data.isActive) {
            if (!data.startTime) {
                setData(p => ({ ...p, startTime: new Date().toLocaleString('pt-BR') }));
            }
            timerRef.current = setInterval(() => {
                setData(prev => ({ ...prev, elapsedSeconds: prev.elapsedSeconds + 1 }));
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [data.isActive]);

    const getWordHeader = () => `
        <div style="background-color: #4b5563; padding: 25px; color: white; text-align: center; border-radius: 10px; margin-bottom: 20px;">
            <h1 style="margin: 0; font-size: 26px; font-weight: 900; letter-spacing: 2px;">${String(COMPANY.name).toUpperCase()}</h1>
            <p style="margin: 8px 0 0 0; font-size: 11px; color: #f3f4f6; font-weight: bold;">
                ${String(COMPANY.address)}
            </p>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #ffffff; font-weight: bold;">
                Tel / <span style="color: #4ade80;">WhatsApp</span>: ${String(COMPANY.whatsapp)}
            </p>
        </div>
    `;

    const exportToWord = (item: any) => {
        const html = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><meta charset='utf-8'></head>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                ${getWordHeader()}
                <h2 style="color: #4b5563; text-align: center; margin-top: 10px; text-transform: uppercase; font-size: 16px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Relatório Individual de Produção</h2>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; border: 1px solid #e5e7eb;">
                    <tr><td style="padding: 12px; font-weight: bold; background: #f9fafb; border: 1px solid #e5e7eb; width: 30%;">CLIENTE:</td><td style="padding: 12px; border: 1px solid #e5e7eb; text-transform: uppercase; font-weight: bold;">${String(item.client).toUpperCase()}</td></tr>
                    <tr><td style="padding: 12px; font-weight: bold; background: #f9fafb; border: 1px solid #e5e7eb;">PROJETO:</td><td style="padding: 12px; border: 1px solid #e5e7eb; text-transform: uppercase; font-weight: bold;">${String(item.project).toUpperCase()}</td></tr>
                    <tr><td style="padding: 12px; font-weight: bold; background: #f9fafb; border: 1px solid #e5e7eb;">DATA INÍCIO:</td><td style="padding: 12px; border: 1px solid #e5e7eb;">${String(item.startDate)}</td></tr>
                    <tr><td style="padding: 12px; font-weight: bold; background: #f9fafb; border: 1px solid #e5e7eb;">DATA FIM:</td><td style="padding: 12px; border: 1px solid #e5e7eb;">${String(item.reportDate)}</td></tr>
                    <tr><td style="padding: 12px; font-weight: bold; background: #f9fafb; border: 1px solid #e5e7eb;">VALOR HORA:</td><td style="padding: 12px; border: 1px solid #e5e7eb;">${String(item.hourlyRate)}</td></tr>
                    <tr style="color: #0891b2;"><td style="padding: 12px; font-weight: bold; background: #f0f9ff; border: 1px solid #e5e7eb;">TEMPO TOTAL:</td><td style="padding: 12px; font-weight: 900; border: 1px solid #e5e7eb;">${formatTime(Number(item.time))}</td></tr>
                    <tr style="color: #16a34a;"><td style="padding: 12px; font-weight: bold; background: #f0fdf4; border: 1px solid #e5e7eb;">VALOR TOTAL:</td><td style="padding: 12px; font-weight: 900; border: 1px solid #e5e7eb;">${String(item.cost)}</td></tr>
                </table>
                <div style="margin-top:30px; border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; background: #fafafa;">
                    <strong style="display:block; color:#4b5563; margin-bottom: 5px; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #eee;">Notas Técnicas Adicionais:</strong>
                    <div style="font-size: 12px; color: #4b5563; padding-top: 5px;">${String(item.notes || 'Sem observações registradas.').replace(/\n/g, '<br/>')}</div>
                </div>
            </body>
            </html>
        `;
        const blob = new Blob([html], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${String(item.client).toUpperCase()} - Relatorio_Individual.doc`;
        link.click();
    };

    const exportUnified = (items: any[]) => {
        const totalSecs = items.reduce((acc, i) => acc + (Number(i.time) || 0), 0);
        const totalMoney = items.reduce((acc, i) => acc + (Number(i.val) || 0), 0);
        const mainClient = items[0]?.client || "SOMA";
        
        const html = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><meta charset='utf-8'></head>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                ${getWordHeader()}
                <h2 style="color: #4b5563; text-align: center; margin-top: 20px; text-transform: uppercase; font-size: 18px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Relatório de Soma Unificada</h2>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; border: 1px solid #e5e7eb;">
                    <tr style="background: #f3f4f6; color: #374151;">
                        <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left;">PROJETO</th>
                        <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left;">CLIENTE</th>
                        <th style="border: 1px solid #d1d5db; padding: 12px; text-align: center;">DATA INÍCIO</th>
                        <th style="border: 1px solid #d1d5db; padding: 12px; text-align: center;">VALOR HORA</th>
                        <th style="border: 1px solid #d1d5db; padding: 12px; text-align: center;">TEMPO</th>
                        <th style="border: 1px solid #d1d5db; padding: 12px; text-align: right;">VALOR TOTAL</th>
                    </tr>
                    ${items.map(i => `
                        <tr>
                            <td style="border: 1px solid #e5e7eb; padding: 12px; font-size: 13px; font-weight: bold; color: #111827; text-transform: uppercase;">${String(i.project).toUpperCase()}</td>
                            <td style="border: 1px solid #e5e7eb; padding: 12px; font-size: 13px; font-weight: bold; color: #0891b2; text-transform: uppercase;">${String(i.client).toUpperCase()}</td>
                            <td style="border: 1px solid #e5e7eb; padding: 12px; text-align:center;">${String(i.startDate).split(',')[0]}</td>
                            <td style="border: 1px solid #e5e7eb; padding: 12px; text-align:center;">${String(i.hourlyRate)}</td>
                            <td style="border: 1px solid #e5e7eb; padding: 12px; text-align:center; font-weight: bold;">${formatTime(Number(i.time))}</td>
                            <td style="border: 1px solid #e5e7eb; padding: 12px; text-align:right; font-weight: bold; color: #16a34a;">${String(i.cost)}</td>
                        </tr>
                    `).join('')}
                    <tr style="background: #f9fafb; font-weight: bold; color: #111827;">
                        <td colspan="4" style="border: 1px solid #d1d5db; padding: 15px; text-align: right; font-size: 14px; text-transform: uppercase;">Soma Acumulada Selecionada:</td>
                        <td style="border: 1px solid #d1d5db; padding: 15px; text-align: center; font-size: 14px; color: #0891b2;">${formatTime(totalSecs)}</td>
                        <td style="border: 1px solid #d1d5db; padding: 15px; text-align: right; font-size: 18px; color: #16a34a;">${formatBRL(totalMoney)}</td>
                    </tr>
                </table>
            </body>
            </html>
        `;
        const blob = new Blob([html], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${String(mainClient).toUpperCase()} - Soma_Geral.doc`;
        link.click();
    };

    const totals = useMemo(() => {
        const selected = data.history.filter((h: any) => selectedHistoryIds.includes(h.id));
        return {
            count: selected.length,
            time: selected.reduce((acc: number, h: any) => acc + (Number(h.time) || 0), 0),
            money: selected.reduce((acc: number, h: any) => acc + (Number(h.val) || 0), 0),
            items: selected
        };
    }, [data.history, selectedHistoryIds]);

    return (
        <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col shadow-2xl relative border-x border-slate-200">
            <header className="bg-slate-700 p-3 text-center border-b-2 border-cyan-500 shrink-0">
                <h1 className="text-white font-black text-base tracking-widest uppercase italic leading-none">{String(COMPANY.name)}</h1>
                <p className="text-[7px] text-cyan-300 font-bold uppercase tracking-[0.4em] mt-1">Sincronizador de Produtividade 3D</p>
            </header>

            <nav className="bg-white flex border-b sticky top-0 z-30 shadow-sm shrink-0">
                {[
                    {id: 'timer', icon: 'fa-play-circle', label: 'Controle'},
                    {id: 'settings', icon: 'fa-music', label: 'Alarme'},
                    {id: 'history', icon: 'fa-history', label: 'Histórico'}
                ].map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id);
                            if (tab.id !== 'settings' && isAudioPlaying) stopAlarm();
                        }}
                        className={`flex-1 py-3 text-center transition-all ${activeTab === tab.id ? 'text-cyan-600 border-b-2 border-cyan-600 bg-cyan-50/10' : 'text-slate-400'}`}
                    >
                        <i className={`fas ${tab.icon} mb-0.5 block text-base`}></i>
                        <span className="text-[8px] font-black uppercase tracking-widest">{String(tab.label)}</span>
                    </button>
                ))}
            </nav>

            <main className="flex-1 p-3 overflow-y-auto pb-48 no-scrollbar">
                {activeTab === 'timer' && (
                    <div className="space-y-3 animate-fadeIn">
                        <div className="bg-slate-700 p-5 rounded-[2.5rem] text-center shadow-xl border border-slate-600 relative overflow-hidden">
                            <h2 className="text-white/30 text-[7px] font-black uppercase tracking-[0.2em] mb-1 italic">TEMPO ATIVO</h2>
                            <div className="font-mono text-5xl font-black text-white tracking-tighter mb-1 leading-none">
                                {formatTime(Number(data.elapsedSeconds))}
                            </div>
                            <div className="text-emerald-400 font-black text-xl mb-4 leading-none italic">
                                {formatBRL(calculateVal(Number(data.elapsedSeconds), Number(data.hourlyRate)))}
                            </div>

                            <div className="flex items-center justify-center gap-3 mb-5 bg-white/5 py-2 px-4 rounded-xl">
                                <span className="text-[7px] font-black text-cyan-300 uppercase tracking-widest">Travar Meta</span>
                                <input 
                                    type="number" className="w-12 p-1 bg-white/10 text-white rounded text-center font-black text-[10px] outline-none border border-white/10"
                                    value={data.targetMinutes} onChange={e => setData(p => ({...p, targetMinutes: parseInt(e.target.value) || 0}))}
                                />
                                <span className="text-[7px] font-black text-cyan-300 uppercase tracking-widest">Minutos</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => { stopAlarm(); setData(p => ({...p, isActive: true})); }} className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase shadow-lg transition-all"><i className="fas fa-play mr-2"></i>INICIAR</button>
                                <button onClick={() => setData(p => ({...p, isActive: false}))} className="py-3 bg-amber-500 hover:bg-amber-400 text-white rounded-xl font-black text-[10px] uppercase shadow-lg transition-all"><i className="fas fa-pause mr-2"></i>PAUSAR</button>
                                <button onClick={() => triggerSaveAndReset(data.elapsedSeconds)} className="col-span-2 py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black text-[11px] uppercase shadow-lg transition-all mt-1"><i className="fas fa-stop mr-2"></i>FINALIZAR E SALVAR</button>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-200 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-0.5">
                                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente</label>
                                    <input placeholder="CLIENTE..." className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold border-slate-100 uppercase" value={data.clientName} onChange={e => setData(p => ({...p, clientName: e.target.value}))} />
                                </div>
                                <div className="space-y-0.5">
                                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Projeto</label>
                                    <input placeholder="AMBIENTE..." className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold border-slate-100 uppercase" value={data.projectName} onChange={e => setData(p => ({...p, projectName: e.target.value}))} />
                                </div>
                            </div>
                            <div className="space-y-0.5">
                                <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Notas Técnicas</label>
                                <textarea placeholder="Pé direito, Paredes, Materiais..." className="w-full p-4 bg-slate-50 rounded-xl text-xs border-slate-100 h-24 resize-none" value={data.notes} onChange={e => setData(p => ({...p, notes: e.target.value}))} />
                            </div>
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <label className="text-[8px] font-black text-cyan-600 uppercase tracking-widest mb-1 block italic">Valor da Hora Trabalhada</label>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-2xl font-black text-slate-900 italic">{formatBRL(Number(data.hourlyRate))}</span>
                                    <input type="number" className="w-16 p-2 bg-white rounded border border-slate-200 text-center font-black text-[10px]" value={data.hourlyRate} onChange={e => setData(p => ({...p, hourlyRate: parseFloat(e.target.value) || 0}))} />
                                </div>
                                <input type="range" min="10" max="1000" step="5" className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer mt-2 accent-cyan-600" value={data.hourlyRate} onChange={e => setData(p => ({...p, hourlyRate: parseInt(e.target.value)}))} />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="space-y-3 animate-fadeIn">
                        <div className="flex justify-between items-center mb-1 px-1">
                            <h2 className="text-slate-600 text-[10px] font-black uppercase tracking-widest italic">HISTÓRICO DE PRODUÇÃO</h2>
                            <button onClick={clearHistory} className="text-[8px] font-black text-red-500 hover:text-red-700 uppercase flex items-center gap-1 transition-colors">
                                <i className="fas fa-trash-alt"></i> Limpar Histórico
                            </button>
                        </div>
                        {data.history.length === 0 ? (
                            <div className="text-center py-12 text-slate-300 bg-white rounded-2xl border border-dashed border-slate-200">
                                <i className="fas fa-history text-3xl mb-2 block opacity-10"></i>
                                <p className="text-[8px] font-black uppercase tracking-widest">Nenhum registro</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {data.history.map((item: any) => (
                                    <div key={String(item.id)} className={`p-4 rounded-2xl border flex items-center gap-4 shadow-sm transition-all ${selectedHistoryIds.includes(item.id) ? 'bg-cyan-50 border-cyan-300' : 'bg-white border-slate-100'}`}>
                                        <input type="checkbox" className="w-6 h-6 rounded accent-cyan-600 cursor-pointer" checked={selectedHistoryIds.includes(item.id)} onChange={() => setSelectedHistoryIds(prev => prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id])} />
                                        <div className="flex-1 min-w-0" onClick={() => setSelectedHistoryIds(prev => prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id])}>
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="font-black text-slate-800 text-[14px] uppercase truncate italic">{String(item.project)}</h4>
                                                <span className="text-[8px] text-slate-400 font-bold uppercase">{String(item.reportDate).split(',')[0]}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                                                <div className="flex items-center gap-1.5">
                                                    <i className="fas fa-user text-cyan-600 text-[9px]"></i>
                                                    <span className="text-slate-700 text-[12px] font-black uppercase">{String(item.client)}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <i className="fas fa-clock text-slate-400 text-[9px]"></i>
                                                    <span className="text-slate-900 text-[11px] font-black">{formatTime(Number(item.time))}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <i className="fas fa-coins text-emerald-600 text-[9px]"></i>
                                                    <span className="text-emerald-700 text-[14px] font-black">{String(item.cost)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2 shrink-0">
                                            <button onClick={(e) => { e.stopPropagation(); resumeProject(item); }} className="w-9 h-9 rounded-xl bg-cyan-600 text-white flex items-center justify-center hover:bg-cyan-700 shadow-md"><i className="fas fa-play text-[10px]"></i></button>
                                            <button onClick={(e) => { e.stopPropagation(); exportToWord(item); }} className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"><i className="fas fa-file-word text-base"></i></button>
                                        </div>
                                    </div>
                                ))}
                                {selectedHistoryIds.length > 0 && (
                                    <button onClick={deleteSelected} className="w-full py-2 bg-red-50 text-red-600 text-[9px] font-black uppercase rounded-xl border border-red-100 hover:bg-red-100 transition-colors">
                                        Excluir Selecionados ({selectedHistoryIds.length})
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
                
                {activeTab === 'settings' && (
                  <div className="space-y-4 animate-fadeIn">
                      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 text-center">
                          <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-6 border-b pb-3 italic">Som do Alarme Personalizado</h3>
                          <div className="space-y-3">
                              <button onClick={() => audioInputRef.current?.click()} className="w-full p-4 flex justify-between items-center rounded-2xl border-2 border-cyan-500 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 transition-colors"><div className="text-left font-black"><span className="text-[10px] uppercase block tracking-tighter">CARREGAR ÁUDIO</span><span className="text-[6px] font-bold opacity-60">MP3 / WAV / OGG</span></div><i className="fas fa-upload text-xl"></i></button>
                              <input type="file" ref={audioInputRef} className="hidden" accept="audio/*" onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                      const reader = new FileReader();
                                      reader.onload = (event) => { setData(p => ({ ...p, customAlarmUrl: event.target?.result as string })); alert("Novo som de alarme configurado!"); };
                                      reader.readAsDataURL(file);
                                  }
                              }} />
                              {data.customAlarmUrl && (
                                  <button onClick={() => isAudioPlaying ? stopAlarm() : playAlarm()} className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase shadow-lg transition-all ${isAudioPlaying ? 'bg-red-500 text-white' : 'bg-slate-700 text-cyan-300'}`}><i className={`fas ${isAudioPlaying ? 'fa-stop-circle' : 'fa-play-circle'} mr-2`}></i>{isAudioPlaying ? 'PARAR TESTE' : 'TESTAR SOM'}</button>
                              )}
                          </div>
                      </div>
                  </div>
                )}
            </main>

            {/* BARRA DE SOMA (CALCULADORA) - COMPACTA E CINZA GRAFITE (SLATE-900) */}
            {activeTab === 'history' && selectedHistoryIds.length > 0 && (
                <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[75%] bg-slate-900 shadow-[0_20px_60px_rgba(0,0,0,0.7)] z-50 animate-fadeIn text-white border border-slate-700 rounded-[1.25rem] p-4 ring-1 ring-white/10">
                    <div className="flex justify-between items-center mb-2 px-0.5">
                        <span className="text-[8px] font-black text-cyan-400 uppercase tracking-widest italic">Soma de Trabalhos</span>
                        <button onClick={() => setSelectedHistoryIds([])} className="text-slate-400 hover:text-white"><i className="fas fa-times-circle text-lg"></i></button>
                    </div>
                    <div className="flex justify-between items-center gap-3">
                        <div className="flex flex-col">
                            <span className="text-[8px] font-bold text-slate-400 uppercase leading-none">Total Tempo</span>
                            <span className="text-xl font-black text-white leading-none mt-1">{formatTime(Number(totals.time))}</span>
                        </div>
                        <div className="flex flex-col text-right">
                            <span className="text-[8px] font-bold text-slate-400 uppercase leading-none">Total Valor</span>
                            <span className="text-2xl font-black text-emerald-400 leading-none mt-1">{formatBRL(Number(totals.money))}</span>
                        </div>
                        <button onClick={() => exportUnified(totals.items)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 shadow-lg active:scale-95 transition-all border-b-4 border-emerald-800">
                            <i className="fas fa-file-word text-base"></i> SALVAR
                        </button>
                    </div>
                </div>
            )}

            <footer className="p-3 bg-white border-t text-center fixed bottom-0 w-full max-w-md z-40 shrink-0">
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.3em] italic mb-0.5 leading-none tracking-widest">{String(COMPANY.name)} {String(COMPANY.version)}</p>
                <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[6px] text-slate-400 font-bold uppercase leading-none">{String(COMPANY.address)}</span>
                    <p className="text-[7px] font-bold mt-0.5 text-slate-500">
                      Tel / <span className="text-emerald-500 font-black">WhatsApp</span>: {String(COMPANY.whatsapp)}
                    </p>
                </div>
            </footer>
        </div>
    );
};

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}
