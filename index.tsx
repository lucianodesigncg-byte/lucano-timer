
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Modality } from '@google/genai';

// --- Utilitários de Áudio ---
const decode = (base64: string) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
};

const encode = (bytes: Uint8Array) => {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};

const BRAND = { 
  name: "LUCANO DESIGNER3D", 
  tagline: "GESTÃO DE ELITE & IA",
  version: "V22.0 DIAMANTE",
  support: "5574991108629"
};

const App = () => {
  // Estado inicial ultra-protegido contra corrupção de localStorage
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem('lucano_v22_data');
      if (!saved) return { client: '', project: '', rate: 150, seconds: 0, active: false, history: [], targetSeconds: 0 };
      const parsed = JSON.parse(saved);
      return {
        client: String(parsed.client || ''),
        project: String(parsed.project || ''),
        rate: Number(parsed.rate || 150),
        seconds: Number(parsed.seconds || 0),
        active: false, // Forçar pausado no boot
        history: Array.isArray(parsed.history) ? parsed.history : [],
        targetSeconds: Number(parsed.targetSeconds || 0)
      };
    } catch (e) {
      console.error("Erro ao carregar dados:", e);
      return { client: '', project: '', rate: 150, seconds: 0, active: false, history: [], targetSeconds: 0 };
    }
  });

  const [activeTab, setActiveTab] = useState('timer');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [alarmActive, setAlarmActive] = useState(false);
  
  const timerRef = useRef<any>(null);
  const audioAlarmRef = useRef<HTMLAudioElement | null>(null);
  const sessionPromiseRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);

  // Inicializa alarme
  useEffect(() => {
    audioAlarmRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg');
    audioAlarmRef.current.loop = true;
  }, []);

  // Salva dados no disco
  useEffect(() => {
    localStorage.setItem('lucano_v22_data', JSON.stringify(data));
  }, [data]);

  // Lógica do cronômetro com cleanup
  useEffect(() => {
    if (data.active) {
      timerRef.current = setInterval(() => {
        setData((prev: any) => {
          const nextSeconds = prev.seconds + 1;
          if (prev.targetSeconds > 0 && nextSeconds === prev.targetSeconds) {
            setAlarmActive(true);
            audioAlarmRef.current?.play().catch(() => {});
          }
          return { ...prev, seconds: nextSeconds };
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [data.active]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const calculateCost = (s: number) => (s / 3600) * (data.rate || 0);
  const formatBRL = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const saveWork = () => {
    if (data.seconds < 2) return;
    const entry = {
      id: Date.now(),
      project: String(data.project || 'Projeto Premium'),
      client: String(data.client || 'Cliente VIP'),
      time: Number(data.seconds),
      cost: Number(calculateCost(data.seconds)),
      date: new Date().toLocaleDateString('pt-BR')
    };
    setData((prev: any) => ({ 
      ...prev, 
      seconds: 0, 
      active: false, 
      history: [entry, ...(prev.history || [])] 
    }));
    setActiveTab('history');
  };

  const toggleVoice = async () => {
    if (isVoiceActive) {
      if (sessionPromiseRef.current) sessionPromiseRef.current.then((s: any) => s.close());
      setIsVoiceActive(false);
      return;
    }
    try {
      const apiKey = (process && process.env && process.env.API_KEY) || "";
      const ai = new GoogleGenAI({ apiKey });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const inputCtx = new AudioContext({ sampleRate: 16000 });
      const outputCtx = new AudioContext({ sampleRate: 24000 });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: 'Você é o assistente virtual de Lucano Designer3D. Responda de forma curta e profissional sobre produtividade.',
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } }
        },
        callbacks: {
          onopen: () => {
            const source = inputCtx.createMediaStreamSource(stream);
            const proc = inputCtx.createScriptProcessor(4096, 1, 1);
            proc.onaudioprocess = (e) => {
              const input = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(input.length);
              for (let i = 0; i < input.length; i++) int16[i] = input[i] * 32768;
              sessionPromise.then((s: any) => s.sendRealtimeInput({ media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } }));
            };
            source.connect(proc);
            proc.connect(inputCtx.destination);
            setIsVoiceActive(true);
          },
          onmessage: async (msg: any) => {
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputCtx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
            }
          },
          onclose: () => setIsVoiceActive(false),
          onerror: () => setIsVoiceActive(false)
        }
      });
      sessionPromiseRef.current = sessionPromise;
    } catch (e) { 
      console.error("Erro voz:", e);
      setIsVoiceActive(false);
    }
  };

  return (
    <div className="flex-1 bg-black flex flex-col text-white relative z-10 overflow-hidden">
      {/* Alarme de Meta */}
      {alarmActive && (
        <div className="fixed inset-0 z-[1000] bg-[#d4af37] flex flex-col items-center justify-center p-10 text-center animate-fadeIn">
          <i className="fas fa-crown text-9xl mb-6 text-black"></i>
          <h2 className="text-4xl font-black mb-4 text-black italic uppercase">Meta Atingida!</h2>
          <button 
            onClick={() => { setAlarmActive(false); audioAlarmRef.current?.pause(); }} 
            className="bg-black text-[#d4af37] px-14 py-6 rounded-3xl font-black text-xl shadow-2xl active:scale-95 transition-transform"
          >
            FECHAR ALARME
          </button>
        </div>
      )}

      {/* Header Fixo */}
      <header className="p-6 text-center bg-[#0a0a0a] border-b border-[#d4af37]/20">
        <h1 className="text-xl font-black italic tracking-tighter text-[#d4af37]">{String(BRAND.name)}</h1>
        <p className="text-[8px] tracking-[0.5em] text-white/30 font-bold uppercase mt-1">{String(BRAND.tagline)}</p>
      </header>

      {/* Navegação */}
      <nav className="flex bg-black border-b border-white/5">
        {[
          { id: 'timer', label: 'TIMER', icon: 'fa-stopwatch' },
          { id: 'ia', label: 'VOZ IA', icon: 'fa-robot' },
          { id: 'history', label: 'LISTA', icon: 'fa-file-invoice-dollar' }
        ].map(tab => (
          <button 
            key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-4 flex flex-col items-center gap-1 transition-all ${activeTab === tab.id ? 'text-[#d4af37] border-b-2 border-[#d4af37]' : 'text-zinc-700'}`}
          >
            <i className={`fas ${tab.icon} text-xs`}></i>
            <span className="text-[8px] font-black uppercase tracking-widest">{String(tab.label)}</span>
          </button>
        ))}
      </nav>

      {/* Conteúdo Principal */}
      <main className="flex-1 p-6 overflow-y-auto no-scrollbar">
        {activeTab === 'timer' && (
          <div className="space-y-6 animate-fadeIn pb-10">
            <div className="bg-[#0f0f0f] p-8 rounded-[3rem] text-center border border-white/5 shadow-2xl relative overflow-hidden">
              <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-4">Tempo de Produção</p>
              <div className="text-6xl font-mono font-bold mb-2 tracking-tighter">{String(formatTime(data.seconds))}</div>
              <div className="text-[#d4af37] font-black text-2xl italic mb-8">{String(formatBRL(calculateCost(data.seconds)))}</div>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setData((p: any) => ({...p, active: true}))} 
                  className={`py-4 rounded-2xl font-black text-[10px] transition-all ${data.active ? 'bg-white/5 text-zinc-800' : 'bg-[#d4af37] text-black shadow-lg shadow-[#d4af37]/20'}`}
                >
                  START
                </button>
                <button 
                  onClick={() => setData((p: any) => ({...p, active: false}))} 
                  className={`py-4 rounded-2xl font-black text-[10px] transition-all ${!data.active ? 'bg-white/5 text-zinc-800' : 'bg-white/10'}`}
                >
                  PAUSE
                </button>
                <button 
                  onClick={saveWork} 
                  className="col-span-2 py-5 bg-white text-black rounded-[2.5rem] font-black text-[9px] uppercase tracking-[0.2em] mt-2 active:scale-95 transition-all shadow-xl"
                >
                  FINALIZAR PROJETO
                </button>
              </div>
            </div>

            <div className="bg-[#0a0a0a] p-6 rounded-[2.5rem] border border-white/5 space-y-4">
              <input 
                className="w-full p-4 bg-black border border-white/10 rounded-2xl text-[10px] font-bold uppercase tracking-widest outline-none focus:border-[#d4af37]/50" 
                value={String(data.client)} 
                onChange={e => setData((p: any) => ({...p, client: e.target.value}))} 
                placeholder="CLIENTE" 
              />
              <input 
                className="w-full p-4 bg-black border border-white/10 rounded-2xl text-[10px] font-bold uppercase tracking-widest outline-none focus:border-[#d4af37]/50" 
                value={String(data.project)} 
                onChange={e => setData((p: any) => ({...p, project: e.target.value}))} 
                placeholder="PROJETO" 
              />
              <div className="grid grid-cols-2 gap-3">
                <select 
                  className="w-full p-3 bg-black border border-white/10 rounded-xl text-[10px] font-bold text-[#d4af37]" 
                  value={Number(data.targetSeconds)} 
                  onChange={e => setData((p: any) => ({...p, targetSeconds: parseInt(e.target.value)}))}
                >
                  <option value="0">SEM META</option>
                  <option value="1800">30 MIN</option>
                  <option value="3600">1 HORA</option>
                  <option value="7200">2 HORAS</option>
                </select>
                <input 
                  type="number" 
                  className="w-full p-3 bg-black border border-white/10 rounded-xl text-[10px] font-bold outline-none" 
                  value={Number(data.rate)} 
                  onChange={e => setData((p: any) => ({...p, rate: parseInt(e.target.value) || 0}))} 
                  placeholder="R$/H"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ia' && (
          <div className="flex flex-col items-center justify-center py-20 animate-fadeIn space-y-8">
            <h2 className="text-[#d4af37] font-black text-xl italic uppercase tracking-tighter">Diamond Voice</h2>
            <div className="relative cursor-pointer" onClick={toggleVoice}>
              <div className={`absolute inset-0 rounded-full blur-[80px] transition-all duration-1000 ${isVoiceActive ? 'bg-red-500 opacity-30 scale-150' : 'bg-[#d4af37] opacity-10'}`}></div>
              <div className={`w-52 h-52 rounded-full flex flex-col items-center justify-center border-[10px] transition-all relative z-10 ${isVoiceActive ? 'bg-red-600 border-red-900/50 animate-pulse' : 'bg-[#0f0f0f] border-white/5'}`}>
                <i className={`fas ${isVoiceActive ? 'fa-stop' : 'fa-microphone'} text-5xl text-white mb-4`}></i>
                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/40">{isVoiceActive ? 'PARAR' : 'ATIVAR'}</span>
              </div>
            </div>
            <p className="text-[9px] text-zinc-600 uppercase font-black text-center tracking-widest">Controle por voz ativado</p>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4 animate-fadeIn pb-10">
            {data.history.length === 0 ? (
              <div className="text-center py-40 opacity-20 text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-4">
                 <i className="fas fa-gem text-5xl"></i>
                 Lista Vazia
              </div>
            ) : (
              data.history.map((h: any) => (
                <div key={h.id} className="p-6 bg-[#0f0f0f] rounded-[2.5rem] border border-white/5 shadow-2xl group hover:border-[#d4af37]/30 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-black text-white text-sm uppercase italic group-hover:text-[#d4af37]">{String(h.project)}</h4>
                      <div className="text-[8px] text-zinc-600 font-black uppercase mt-1">{String(h.client)} • {String(h.date)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[#d4af37] font-black text-xl">{String(formatBRL(h.cost))}</div>
                      <div className="text-[8px] font-black text-zinc-700 uppercase">{String(formatTime(h.time))}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        const txt = `💎 *RECIBO LUCANO*\n\nPROJETO: ${h.project.toUpperCase()}\nCLIENTE: ${h.client.toUpperCase()}\nTEMPO: ${formatTime(h.time)}\nVALOR: ${formatBRL(h.cost)}`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, '_blank');
                      }} 
                      className="flex-1 py-4 bg-[#25d366] text-white rounded-2xl text-[8px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                    >
                      <i className="fab fa-whatsapp text-lg"></i> WHATSAPP
                    </button>
                    <button 
                      onClick={() => setData((p: any) => ({...p, history: p.history.filter((x: any) => x.id !== h.id)}))}
                      className="w-12 h-12 flex items-center justify-center text-red-500/20 hover:text-red-500 bg-white/5 rounded-2xl border border-white/5"
                    >
                      <i className="fas fa-trash-alt text-xs"></i>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      <footer className="p-4 bg-[#0a0a0a] border-t border-white/5 text-center">
        <span className="text-[7px] font-black text-zinc-700 uppercase tracking-[0.4em]">
          LUCANO DESIGNER3D © {new Date().getFullYear()}
        </span>
      </footer>
    </div>
  );
};

// Renderização Principal
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
