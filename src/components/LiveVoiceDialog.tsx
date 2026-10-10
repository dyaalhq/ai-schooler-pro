import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Radio, 
  Loader2, 
  AlertCircle, 
  Square, 
  Play, 
  RotateCcw,
  Headphones,
  Check
} from 'lucide-react';

interface LiveVoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  notebookTitle?: string;
}

export const LiveVoiceDialog: React.FC<LiveVoiceDialogProps> = ({
  isOpen,
  onClose,
  notebookTitle,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingQueueRef = useRef<boolean>(false);

  // Convert raw Float32 microphone data to 16kHz 16-bit PCM Base64
  const float32ToPcmBase64 = (float32Array: Float32Array): string => {
    const pcm16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    const uint8 = new Uint8Array(pcm16.buffer);
    let binary = '';
    for (let i = 0; i < uint8.byteLength; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    return btoa(binary);
  };

  // Play queued 24kHz PCM audio chunks from Gemini 3.8 Live
  const playNextAudioChunk = () => {
    if (audioQueueRef.current.length === 0 || !outputAudioCtxRef.current) {
      isPlayingQueueRef.current = false;
      setIsAiSpeaking(false);
      return;
    }

    isPlayingQueueRef.current = true;
    setIsAiSpeaking(true);
    const chunk = audioQueueRef.current.shift()!;
    const ctx = outputAudioCtxRef.current;
    const buffer = ctx.createBuffer(1, chunk.length, 24000);
    buffer.getChannelData(0).set(chunk);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => {
      playNextAudioChunk();
    };
    source.start();
  };

  const enqueuePcmAudio = (base64Audio: string) => {
    try {
      const binary = atob(base64Audio);
      const uint8 = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        uint8[i] = binary.charCodeAt(i);
      }
      const int16 = new Int16Array(uint8.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }
      audioQueueRef.current.push(float32);
      if (!isPlayingQueueRef.current) {
        playNextAudioChunk();
      }
    } catch (e) {
      console.warn("PCM decoding error:", e);
    }
  };

  const startLiveConversation = async () => {
    setErrorMsg(null);
    audioQueueRef.current = [];
    isPlayingQueueRef.current = false;

    try {
      // 1. Initialize AudioContexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      inputAudioCtxRef.current = new AudioContextClass({ sampleRate: 16000 });
      outputAudioCtxRef.current = new AudioContextClass({ sampleRate: 24000 });

      // 2. Request microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      micStreamRef.current = stream;

      // 3. Connect WebSocket to server Live API bridge
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/api/gemini/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsRecording(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "audio" && msg.audio) {
            enqueuePcmAudio(msg.audio);
          } else if (msg.type === "interrupted") {
            // Stop current playback immediately if user spoke over model
            audioQueueRef.current = [];
            isPlayingQueueRef.current = false;
            setIsAiSpeaking(false);
          } else if (msg.type === "error") {
            setErrorMsg(msg.error);
          }
        } catch (e) {
          console.warn("WS Parse error:", e);
        }
      };

      ws.onerror = () => {
        setErrorMsg("تعذر الاتصال بخدمة المحادثة الصوتية المباشرة (Live API)");
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsRecording(false);
      };

      // 4. Attach microphone processor node
      const inputSource = inputAudioCtxRef.current.createMediaStreamSource(stream);
      const processor = inputAudioCtxRef.current.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (!isRecording || ws.readyState !== WebSocket.OPEN) return;
        const channelData = e.inputBuffer.getChannelData(0);
        
        // Calculate rough volume level for animation
        let sum = 0;
        for (let i = 0; i < channelData.length; i++) {
          sum += Math.abs(channelData[i]);
        }
        setAudioLevel(Math.min(1, (sum / channelData.length) * 5));

        const base64Chunk = float32ToPcmBase64(channelData);
        ws.send(JSON.stringify({ type: "audio", audio: base64Chunk }));
      };

      inputSource.connect(processor);
      processor.connect(inputAudioCtxRef.current.destination);

    } catch (err: any) {
      console.error("Live Audio init error:", err);
      setErrorMsg(err?.message || "يرجى منح الإذن للمايكروفون لبدء المحادثة الصوتية.");
      setIsConnected(false);
      setIsRecording(false);
    }
  };

  const stopLiveConversation = () => {
    setIsRecording(false);
    setIsConnected(false);
    setIsAiSpeaking(false);
    audioQueueRef.current = [];

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close().catch(() => {});
      outputAudioCtxRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  useEffect(() => {
    if (isOpen) {
      startLiveConversation();
    } else {
      stopLiveConversation();
    }
    return () => {
      stopLiveConversation();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200" dir="rtl">
      <div className="bg-gradient-to-b from-[#132e29] to-[#091512] text-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-teal-500/40 relative flex flex-col items-center text-center space-y-6">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            stopLiveConversation();
            onClose();
          }}
          className="absolute top-4 left-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Title */}
        <div className="space-y-1.5 pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-400/30">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
            <span>Gemini 3.8 Live API • مباشر وفوري</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black tracking-tight">المحادثة الصوتية التفاعلية</h3>
          <p className="text-xs text-teal-100/80 max-w-sm">
            تحدث بحرية بصوتك مع المعلم الذكي. استمع للشروحات وتفاعل معه لحظيًا بالصوت المباشر.
          </p>
        </div>

        {/* Large Visual Pulse Orb / Waveform */}
        <div className="relative w-44 h-44 flex items-center justify-center my-4">
          {/* Animated Glowing Rings */}
          <div 
            className={`absolute inset-0 rounded-full bg-teal-500/20 transition-transform duration-100 ${
              isAiSpeaking ? 'animate-ping scale-110 bg-teal-400/30' : isRecording ? 'scale-105' : 'scale-100'
            }`}
            style={{
              transform: isRecording && !isAiSpeaking ? `scale(${1 + audioLevel * 0.4})` : undefined
            }}
          />
          <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-teal-600 via-emerald-500 to-teal-400 opacity-80 blur-md animate-pulse" />

          {/* Core Orb Center */}
          <div className="relative z-10 w-28 h-28 rounded-full bg-slate-950 border-2 border-teal-300/60 shadow-2xl flex flex-col items-center justify-center gap-1">
            {isAiSpeaking ? (
              <>
                <Volume2 className="w-8 h-8 text-teal-300 animate-bounce" />
                <span className="text-[10px] font-bold text-teal-200">المعلم يتحدث...</span>
              </>
            ) : isRecording ? (
              <>
                <Mic className="w-8 h-8 text-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-300">يستمع إليك...</span>
              </>
            ) : (
              <>
                <Headphones className="w-8 h-8 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-400">متوقف</span>
              </>
            )}
          </div>
        </div>

        {/* Real-time Visual Audio Wave Bars */}
        <div className="flex items-center gap-1.5 h-8">
          {[40, 75, 100, 60, 90, 45, 80, 50, 70, 95, 60, 40].map((h, idx) => (
            <div
              key={idx}
              className={`w-1 rounded-full transition-all duration-150 ${
                isAiSpeaking
                  ? 'bg-teal-300'
                  : isRecording
                  ? 'bg-emerald-400'
                  : 'bg-slate-700'
              }`}
              style={{
                height: isAiSpeaking 
                  ? `${Math.max(8, (h * Math.random()) % 28 + 6)}px`
                  : isRecording
                  ? `${Math.max(6, (h * audioLevel * 2) % 30 + 4)}px`
                  : '6px',
              }}
            />
          ))}
        </div>

        {/* Status / Error Notifications */}
        {errorMsg ? (
          <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-2xl text-xs text-rose-200 flex items-center gap-2 text-right">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        ) : (
          <p className="text-xs text-teal-200/90 font-medium">
            {isConnected 
              ? 'الاتصال المباشر نشط. ابدأ بالتحدث واطرح أي سؤال في درسك!' 
              : 'جاري الاتصال بقناة الصوت المباشرة...'}
          </p>
        )}

        {/* Controls Bar */}
        <div className="flex items-center justify-center gap-3 pt-2">
          {isConnected ? (
            <button
              type="button"
              onClick={stopLiveConversation}
              className="px-6 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-700/30 transition-all cursor-pointer active:scale-95"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>إيقاف المحادثة</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={startLiveConversation}
              className="px-6 py-2.5 rounded-2xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-teal-500/30 transition-all cursor-pointer active:scale-95"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>إعادة الاتصال</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              stopLiveConversation();
              onClose();
            }}
            className="px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-200 font-bold text-xs transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
