
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Modality } from '@google/genai';

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
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem('lucano_v22_data');
      if (!saved) return { client: '', project: '', rate: 150, seconds: 0, active: false, history: [], targetSeconds: 0 };
      const parsed = JSON.parse(saved);
      return {
        client: parsed.client || '',
        project: parsed.project || '',
        rate: parsed.rate || 150,
        seconds: parsed.seconds || 0,
        active: false, // Sempre começa pausado
        history: Array.isArray(parsed.history) ? parsed.history : [],
        targetSeconds: parsed.targetSeconds || 0
      };
    } catch {
      return { client: '', project: '', rate: 150, seconds: 0, active: false, history: [], targetSeconds: 0 };
    }
  });

  const [activeTab, setActiveTab] = useState('timer');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [alarmActive, setAlarmActive] = useState(false);
  
  const timerRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sessionPromiseRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);

  useEffect(() => {
    audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg');
    audioRef.current.loop = true;
  }, []);

  useEffect(() => {
    localStorage.setItem('lucano_v22_data', JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    if (data.active) {
      timerRef.current = setInterval(() => {
        setData((prev: any) => {
          const nextSeconds = prev.seconds + 1;
          if (prev.targetSeconds > 0 && nextSeconds === prev.targetSeconds) {
            setAlarmActive(true);
            audioRef.current?.play().catch(() => {});
          }
          return { ...prev, seconds: nextSeconds };
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
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
      time: data.seconds,
      cost: calculateCost(data.seconds),
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
      sessionPromiseRef.current?.then((s:any) => s.close());
      setIsVoiceActive(false);
      return;
    }
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const inputCtx = new AudioContext({ sampleRate: 16000 });
      const outputCtx = new AudioContext({ sampleRate: 24000 });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: 'Você é o assistente virtual de Lucano Designer3D. Seja profissional, direto e ajude com cronometragem e orçamentos.',
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
              sessionPromise.then((s:any) => s.sendRealtimeInput({ media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } }));
            };
            source.connect(proc);
            proc.connect(inputCtx.destination);
            setIsVoiceActive(true);
          },
          onmessage: async (msg:any) => {
            const audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audio) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const buffer = await decodeAudioData(decode(audio), outputCtx, 24000, 1);
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
    } catch { 
      setIsVoiceActive(false);
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#050505] flex flex-col text-white font-sans border-x border-white/5 relative">
      {alarmActive && (
        <div className="fixed inset-0 z-[999] bg-[#d4af37] flex flex-col items-center justify-center p-10 text-center animate-fadeIn">
          <i className="fas fa-crown text-9xl mb-6 text-black"></i>
          <h2 className="text-4xl font-black mb-4 text-black italic uppercase">Meta Atingida!</h2>
          <button onClick={() => { setAlarmActive(false); audioRef.current?.pause(); }} className="bg-black text-[#d4af37] px-14 py-6 rounded-3xl font-black text-xl shadow-2xl active:scale-95 transition-transform">FECHAR ALARME</button>
        </div>
      )}

      <header className="p-8 text-center bg-[#0a0a0a] border-b border-[#d4af37]/20">
        <h1 className="text-2xl font-black italic tracking-tighter text-[#d4af37]">{BRAND.name}</h1>
        <p className="text-[8px] tracking-[0.5em] text-white/30 font-bold uppercase mt-1">{BRAND.tagline}</p>
      </header>

      <nav className="flex bg-[#050505] border-b border-white/5 sticky top-0 z-50">
        {[
          { id: 'timer', label: 'TRABALHO', icon: 'fa-stopwatch' },
          { id: 'ia', label: 'IA VOZ', icon: 'fa-robot' },
          { id: 'history', label: 'RECIBOS', icon: 'fa-file-invoice-dollar' }
        ].map(tab => (
          <button 
            key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-5 flex flex-col items-center gap-2 transition-all ${activeTab === tab.id ? 'text-[#d4af37] border-b-2 border-[#d4af37]' : 'text-zinc-700'}`}
          >
            <i className={`fas ${tab.icon} text-sm`}></i>
            <span className="text-[9px] font-black uppercase tracking-widest">{tab.label}</span>
          </button>
        ))}
      </nav>

      <main className="flex-1 p-6 overflow-y-auto pb-32 no-scrollbar">
        {activeTab === 'timer' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="bg-[#0f0f0f] p-10 rounded-[3rem] text-center border border-white/5 shadow-2xl relative">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Cronômetro Pro</p>
              <div className="text-7xl font-mono font-bold mb-2 tracking-tighter">{formatTime(data.seconds)}</div>
              <div className="text-[#d4af37] font-black text-3xl italic mb-10">{formatBRL(calculateCost(data.seconds))}</div>
              
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setData((p:any) => ({...p, active: true}))} className={`py-5 rounded-2xl font-black text-xs transition-all ${data.active ? 'bg-white/5 text-zinc-800' : 'bg-[#d4af37] text-black shadow-lg shadow-[#d4af37]/20'}`}>START</button>
                <button onClick={() => setData((p:any) => ({...p, active: false}))} className={`py-5 rounded-2xl font-black text-xs transition-all ${!data.active ? 'bg-white/5 text-zinc-800' : 'bg-white/10'}`}>PAUSE</button>
                <button onClick={saveWork} className="col-span-2 py-6 bg-white text-black rounded-[2.5rem] font-black text-[10px] uppercase tracking-[0.2em] mt-2 transition-all active:scale-95 shadow-xl">FINALIZAR SESSÃO</button>
              </div>
            </div>

            <div className="bg-[#0a0a0a] p-8 rounded-[2.5rem] border border-white/5 space-y-5 shadow-inner">
              <input className="w-full p-5 bg-[#020202] border border-white/10 rounded-2xl text-xs font-bold uppercase tracking-widest outline-none focus:border-[#d4af37]/50" value={data.client} onChange={e => setData((p:any) => ({...p, client: e.target.value}))} placeholder="NOME DO CLIENTE" />
              <input className="w-full p-5 bg-[#020202] border border-white/10 rounded-2xl text-xs font-bold uppercase tracking-widest outline-none focus:border-[#d4af37]/50" value={data.project} onChange={e => setData((p:any) => ({...p, project: e.target.value}))} placeholder="NOME DO PROJETO" />
              <div className="grid grid-cols-2 gap-4">
                <select className="w-full p-4 bg-[#020202] border border-white/10 rounded-xl text-xs font-bold text-[#d4af37]" value={data.targetSeconds} onChange={e => setData((p:any) => ({...p, targetSeconds: parseInt(e.target.value)}))}>
                  <option value="0">SEM META</option>
                  <option value="1800">30 MIN</option>
                  <option value="3600">1 HORA</option>
                  <option value="7200">2 HORAS</option>
                </select>
                <input type="number" className="w-full p-4 bg-[#020202] border border-white/10 rounded-xl text-xs font-bold" value={data.rate} onChange={e => setData((p:any) => ({...p, rate: parseInt(e.target.value) || 0}))} placeholder="R$/HORA" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ia' && (
          <div className="flex flex-col items-center justify-center py-20 animate-fadeIn">
            <div className="relative cursor-pointer group" onClick={toggleVoice}>
              <div className={`absolute inset-0 rounded-full blur-[80px] transition-all duration-1000 ${isVoiceActive ? 'bg-red-500 opacity-30 scale-150' : 'bg-[#d4af37] opacity-10'}`}></div>
              <div className={`w-64 h-64 rounded-full flex flex-col items-center justify-center border-[12px] transition-all relative z-10 ${isVoiceActive ? 'bg-red-600 border-red-900/50 animate-pulse' : 'bg-[#0f0f0f] border-white/5'}`}>
                <i className={`fas ${isVoiceActive ? 'fa-stop' : 'fa-microphone'} text-7xl text-white mb-4`}></i>
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">{isVoiceActive ? 'DESLIGAR' : 'FALAR COM IA'}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-5 animate-fadeIn">
            {data.history.length === 0 ? (
              <div className="text-center py-40 opacity-20">NENHUM REGISTRO</div>
            ) : (
              data.history.map((h: any) => (
                <div key={h.id} className="p-8 bg-[#0f0f0f] rounded-[3rem] border border-white/5 shadow-2xl">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h4 className="font-black text-white text-lg uppercase italic">{String(h.project)}</h4>
                      <div className="text-[10px] text-zinc-600 font-black uppercase mt-1">{String(h.client)} • {h.date}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[#d4af37] font-black text-2xl">{formatBRL(h.cost)}</div>
                      <div className="text-[9px] font-black text-zinc-700 uppercase">{formatTime(h.time)}</div>
                    </div>
                  </div>
                  <button onClick={() => {
                      const txt = `💎 *RELATÓRIO LUCANO*\n\nPROJETO: ${h.project}\nCLIENTE: ${h.client}\nTEMPO: ${formatTime(h.time)}\nVALOR: ${formatBRL(h.cost)}`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, '_blank');
                  }} className="w-full py-5 bg-[#25d366] text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4">
                    <i className="fab fa-whatsapp text-xl"></i> ENVIAR RECIBO
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<App />);
}
