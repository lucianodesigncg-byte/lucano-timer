
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';

const InputField = ({ label, icon, ...props }) => (
  <div className="mb-4">
    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
        <i className={`fas ${icon}`}></i>
      </div>
      <input {...props} className="w-full pl-10 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all outline-none text-sm font-medium shadow-sm" />
    </div>
  </div>
);

// Manual audio helpers as per @google/genai guidelines
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
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
}

const App = () => {
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem('sketchtime_data');
      return saved ? JSON.parse(saved) : {
        clientName: '', projectName: '', hourlyRate: 50, elapsedSeconds: 0, isActive: false, sizeNotes: '', clientNotes: ''
      };
    } catch (e) {
      return { clientName: '', projectName: '', hourlyRate: 50, elapsedSeconds: 0, isActive: false, sizeNotes: '', clientNotes: '' };
    }
  });

  const [activeTab, setActiveTab] = useState('project');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const timerRef = useRef(null);
  
  // Refs for Live API management
  const sessionPromiseRef = useRef(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    localStorage.setItem('sketchtime_data', JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    if (data.isActive) {
      timerRef.current = setInterval(() => {
        setData(prev => ({ ...prev, elapsedSeconds: prev.elapsedSeconds + 1 }));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [data.isActive]);

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const calculateCost = () => {
    return ((data.elapsedSeconds / 3600) * data.hourlyRate).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const toggleVoice = async () => {
    if (isVoiceActive) {
      if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => session.close());
      }
      setIsVoiceActive(false);
      return;
    }

    try {
      // Create a new GoogleGenAI instance right before making an API call to follow latest guidelines
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const inputCtx = new AudioContext({ sampleRate: 16000 });
      const outputCtx = new AudioContext({ sampleRate: 24000 });
      inputAudioCtxRef.current = inputCtx;
      outputAudioCtxRef.current = outputCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: 'Você é um assistente sênior de SketchUp. Ajude o usuário com dúvidas técnicas, medidas e gestão de tempo.',
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
          }
        },
        callbacks: {
          onopen: () => {
            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              
              const pcmData = encode(new Uint8Array(int16.buffer));
              // Use session promise to send inputs, preventing race conditions or stale references
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: { data: pcmData, mimeType: 'audio/pcm;rate=16000' } });
              });
            };
            source.connect(processor);
            processor.connect(inputCtx.destination);
            setIsVoiceActive(true);
          },
          onmessage: async (msg) => {
            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
               // Use a running nextStartTime to track the end of the playback queue for smooth audio
               nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
               const audioBuffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
               const source = outputCtx.createBufferSource();
               source.buffer = audioBuffer;
               source.connect(outputCtx.destination);
               source.addEventListener('ended', () => {
                 sourcesRef.current.delete(source);
               });
               source.start(nextStartTimeRef.current);
               nextStartTimeRef.current += audioBuffer.duration;
               sourcesRef.current.add(source);
            }

            if (msg.serverContent?.interrupted) {
              for (const source of sourcesRef.current) {
                try { source.stop(); } catch(e) {}
              }
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error("Live API Error:", e);
            setIsVoiceActive(false);
          },
          onclose: () => {
            setIsVoiceActive(false);
          }
        }
      });
      sessionPromiseRef.current = sessionPromise;
    } catch (err) {
      console.error(err);
      alert("Erro ao acessar microfone ou conectar à API.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 p-4">
      <div className="bg-white p-4 rounded-3xl shadow-sm flex items-center justify-between mb-4 border border-slate-100">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${data.isActive ? 'bg-cyan-500 animate-pulse' : 'bg-slate-200'}`}>
            <i className="fas fa-stopwatch text-white"></i>
          </div>
          <h1 className="font-black text-slate-800 tracking-tighter">SKETCHTIME</h1>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] p-8 shadow-xl text-center mb-4 border border-slate-50">
        <div className="text-5xl font-mono font-black text-slate-900 mb-1">{formatTime(data.elapsedSeconds)}</div>
        <div className="text-lg font-black text-emerald-500 mb-6">{calculateCost()}</div>
        <button 
          onClick={() => setData(p => ({...p, isActive: !p.isActive}))}
          className={`w-full py-4 rounded-2xl font-black text-white shadow-lg transition-transform active:scale-95 ${data.isActive ? 'bg-red-500' : 'bg-slate-900'}`}
        >
          {data.isActive ? 'PARAR' : 'INICIAR'}
        </button>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm flex-1 flex flex-col min-h-[300px]">
        <div className="flex gap-4 border-b mb-4">
          {['project', 'notes', 'voice'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-2 text-[10px] font-black uppercase tracking-widest ${activeTab === tab ? 'text-cyan-500 border-b-2 border-cyan-500' : 'text-slate-300'}`}>
              {tab === 'project' ? 'Dados' : tab === 'notes' ? 'Notas' : 'IA'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'project' && (
            <div>
              <InputField label="Cliente" icon="fa-user" value={data.clientName} onChange={e => setData(p => ({...p, clientName: e.target.value}))} />
              <InputField label="Projeto" icon="fa-cube" value={data.projectName} onChange={e => setData(p => ({...p, projectName: e.target.value}))} />
              <InputField label="Valor/Hora" icon="fa-coins" type="number" value={data.hourlyRate} onChange={e => setData(p => ({...p, hourlyRate: parseFloat(e.target.value) || 0}))} />
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              <textarea placeholder="Medidas..." className="w-full h-24 bg-slate-50 border rounded-2xl p-4 text-sm outline-none" value={data.sizeNotes} onChange={e => setData(p => ({...p, sizeNotes: e.target.value}))} />
              <textarea placeholder="Observações..." className="w-full h-24 bg-slate-50 border rounded-2xl p-4 text-sm outline-none" value={data.clientNotes} onChange={e => setData(p => ({...p, clientNotes: e.target.value}))} />
            </div>
          )}

          {activeTab === 'voice' && (
            <div className="flex flex-col items-center justify-center h-full">
              <button 
                onClick={toggleVoice} 
                className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all ${isVoiceActive ? 'bg-red-500 animate-pulse' : 'bg-cyan-500'}`}
              >
                <i className={`fas ${isVoiceActive ? 'fa-stop' : 'fa-microphone'} text-2xl text-white`}></i>
              </button>
              <p className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Suporte de Voz</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
