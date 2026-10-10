import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  Zap, 
  BrainCircuit, 
  Globe, 
  Image as ImageIcon, 
  Video, 
  Mic, 
  MicOff, 
  Radio, 
  RotateCcw, 
  Copy, 
  Check, 
  Trash2, 
  Paperclip, 
  X, 
  Loader2, 
  Bot, 
  User, 
  ExternalLink,
  BookOpen,
  ArrowDown,
  Info
} from 'lucide-react';
import { ChatMessage, ChatSession, AIMode, Source, SourceChunk } from '../types';
import { sendMessageToGemini, transcribeAudioWithGemini } from '../lib/geminiService';
import { EducationalContent } from './EducationalContent';

interface ChatViewProps {
  session: ChatSession;
  allSessions: ChatSession[];
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  currentNotebookId: string;
  notebookTitle?: string;
  notebookSubject?: string;
  sources: Source[];
  onSendMessage: (userText: string, aiText: string, modelUsed: string) => void;
  onOpenLiveVoice: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  session,
  allSessions,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  currentNotebookId,
  notebookTitle,
  notebookSubject,
  sources,
  onSendMessage,
  onOpenLiveVoice,
}) => {
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Model & Capabilities Toggles
  const [selectedModelType, setSelectedModelType] = useState<AIMode>('general'); // general | fast | complex | thinking
  const [enableHighThinking, setEnableHighThinking] = useState(false);
  const [enableSearchGrounding, setEnableSearchGrounding] = useState(false);

  // Multimodal Media Attachments
  const [attachedImage, setAttachedImage] = useState<{ data: string; mimeType: string; previewUrl: string; name: string } | null>(null);
  const [attachedVideo, setAttachedVideo] = useState<{ data: string; mimeType: string; previewUrl: string; name: string } | null>(null);

  // Audio Recording (gemini-3.5-transcribe)
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [session.messages, isGenerating]);

  // Handle Photo / Image selection
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      setAttachedImage({
        data: base64,
        mimeType: file.type || 'image/jpeg',
        previewUrl: result,
        name: file.name,
      });
      // Automatically switch to complex vision model
      if (!enableHighThinking) setSelectedModelType('complex');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle Video selection
  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 40 * 1024 * 1024) {
      alert("حجم الفيديو كبير جداً. يرجى اختيار مقطع أقل من 40 ميغابايت للمعاينة المباشرة.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      setAttachedVideo({
        data: base64,
        mimeType: file.type || 'video/mp4',
        previewUrl: result,
        name: file.name,
      });
      setSelectedModelType('complex');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Microphone Audio Recording for Gemini 3.5 Transcribe
  const startRecordingAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        stream.getTracks().forEach((track) => track.stop());
        
        // Convert to Base64 and transcribe with gemini-3.5-transcribe
        setIsTranscribing(true);
        try {
          const reader = new FileReader();
          reader.onload = async () => {
            const base64 = (reader.result as string).split(',')[1];
            const transcript = await transcribeAudioWithGemini(base64, 'audio/mp3');
            setInput((prev) => (prev ? `${prev} ${transcript.text}` : transcript.text));
            setIsTranscribing(false);
          };
          reader.readAsDataURL(audioBlob);
        } catch (err: any) {
          console.error("Transcription error:", err);
          alert(`فشل تفريغ الصوت: ${err?.message || 'خطأ غير معروف'}`);
          setIsTranscribing(false);
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecordingAudio(true);
    } catch (err: any) {
      alert("يرجى منح الإذن للمايكروفون لبدء التسجيل.");
    }
  };

  const stopRecordingAudio = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
    }
  };

  // Submit User Message
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const promptText = input.trim();
    if (!promptText && !attachedImage && !attachedVideo) return;
    if (isGenerating) return;

    const userPrompt = promptText || (attachedImage ? 'تحليل الصورة المرفقة' : 'تحليل مقطع الفيديو المرفق');
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    setIsGenerating(true);

    // Save temporary media copies for API request
    const imgPayload = attachedImage ? { data: attachedImage.data, mimeType: attachedImage.mimeType } : undefined;
    const vidPayload = attachedVideo ? { data: attachedVideo.data, mimeType: attachedVideo.mimeType } : undefined;
    setAttachedImage(null);
    setAttachedVideo(null);

    // Build context with current notebook sources if any
    let sourcesContext = '';
    if (sources && sources.length > 0) {
      const activeSources = sources.filter((s) => s.notebookId === currentNotebookId).slice(0, 4);
      if (activeSources.length > 0) {
        sourcesContext = `\n\n--- مصادر ومذكرات الدفتر الدراسي (${notebookTitle || ''}) ---\n` +
          activeSources.map((s) => `### ${s.title}:\n${s.content.slice(0, 4000)}`).join('\n\n');
      }
    }

    const systemInstruction = `أنت 'المعلم الذكي'، مساعد تعليمي وأكاديمي خبير ومرشد دراسي في مادة: ${notebookSubject || 'العلوم والدراسة العامة'}.
أجب بدقة باللغة العربية، وادعم إجاباتك بقوانين ومعادلات KaTeX و LaTeX الرياضية ($...$ للمضمن و $$...$$ للكتل)، ورتب الخطوات والشروحات بطريقة منظمة ومنهجية مستوحاة من أسلوب NotebookLM.
${sourcesContext}`;

    // Format conversation history
    const historyPayload = session.messages.slice(-10).map((m) => ({
      role: m.role === 'user' ? ('user' as const) : ('model' as const),
      text: m.text,
    }));

    try {
      const response = await sendMessageToGemini({
        prompt: userPrompt,
        history: historyPayload,
        modelType: enableHighThinking ? 'thinking' : selectedModelType,
        systemInstruction,
        image: imgPayload,
        video: vidPayload,
        enableSearch: enableSearchGrounding,
        thinkingLevel: enableHighThinking ? 'HIGH' : undefined,
      });

      onSendMessage(userPrompt, response.text, response.modelUsed);
    } catch (err: any) {
      console.error("Chat error:", err);
      onSendMessage(
        userPrompt,
        `⚠️ **عذراً، حدث خطأ أثناء المعالجة:**\n\n${err?.message || 'تعذر الاتصال بخدمة الذكاء الاصطناعي.'}`,
        'gemini-3.5-flash'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] bg-white dark:bg-[#121c18] rounded-3xl border border-slate-200/90 dark:border-[#22352f] shadow-sm overflow-hidden relative">
      {/* Top Header: Session & Intelligence Controls Bar */}
      <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-[#15231e] border-b border-slate-200/80 dark:border-[#22352f] flex flex-wrap items-center justify-between gap-2.5 shrink-0 z-10">
        {/* Left: Sessions Dropdown */}
        <div className="flex items-center gap-2 min-w-0">
          <select
            value={session.id}
            onChange={(e) => onSelectSession(e.target.value)}
            className="text-xs font-bold px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#263c33] bg-white dark:bg-[#121c18] text-slate-800 dark:text-slate-100 outline-none cursor-pointer max-w-[180px] sm:max-w-xs truncate"
          >
            {allSessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onNewSession}
            className="px-2.5 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 hover:bg-teal-100 text-xs font-bold transition cursor-pointer"
            title="محادثة جديدة"
          >
            + جديدة
          </button>
        </div>

        {/* Right: AI Intelligence Capabilities Toggles */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {/* Model Mode Selector */}
          <div className="flex items-center bg-white dark:bg-[#121c18] p-0.5 rounded-xl border border-slate-200 dark:border-[#263c33] font-bold">
            <button
              type="button"
              onClick={() => setSelectedModelType('general')}
              className={`px-2 py-1 rounded-lg transition ${
                selectedModelType === 'general' && !enableHighThinking
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-teal-600'
              }`}
              title="gemini-3.5-flash (عام ومتزن)"
            >
              عام (Flash)
            </button>
            <button
              type="button"
              onClick={() => setSelectedModelType('fast')}
              className={`px-2 py-1 rounded-lg transition ${
                selectedModelType === 'fast' && !enableHighThinking
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-teal-600'
              }`}
              title="gemini-3.1-flash-lite (فائق السرعة وخفيف اللاتنسي)"
            >
              <Zap className="w-3 h-3 inline mr-0.5" />
              سريع (Lite)
            </button>
            <button
              type="button"
              onClick={() => setSelectedModelType('complex')}
              className={`px-2 py-1 rounded-lg transition ${
                selectedModelType === 'complex' && !enableHighThinking
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-teal-600'
              }`}
              title="gemini-3.1-pro-preview (مهام معقدة واستدلال عميق)"
            >
              متقدم (Pro)
            </button>
          </div>

          {/* High Thinking Mode Toggle */}
          <button
            type="button"
            onClick={() => setEnableHighThinking(!enableHighThinking)}
            className={`px-2.5 py-1 rounded-xl font-bold flex items-center gap-1 transition cursor-pointer ${
              enableHighThinking
                ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400'
                : 'bg-white dark:bg-[#121c18] border border-slate-200 dark:border-[#263c33] text-slate-600 dark:text-slate-400 hover:text-indigo-600'
            }`}
            title="وضع التفكير العميق (gemini-3.1-pro-preview مع ThinkingLevel.HIGH)"
          >
            <BrainCircuit className="w-3.5 h-3.5 text-amber-300" />
            <span>تفكير عميق</span>
          </button>

          {/* Google Search Grounding Toggle */}
          <button
            type="button"
            onClick={() => setEnableSearchGrounding(!enableSearchGrounding)}
            className={`px-2.5 py-1 rounded-xl font-bold flex items-center gap-1 transition cursor-pointer ${
              enableSearchGrounding
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white dark:bg-[#121c18] border border-slate-200 dark:border-[#263c33] text-slate-600 dark:text-slate-400 hover:text-emerald-600'
            }`}
            title="البحث المباشر في Google (gemini-3.5-flash with googleSearch)"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Google Search</span>
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        {session.messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${isUser ? 'mr-auto flex-row-reverse' : 'ml-auto'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                  isUser
                    ? 'bg-teal-700 text-white'
                    : 'bg-gradient-to-tr from-teal-600 to-emerald-500 text-white font-black'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div className="space-y-1.5 flex-1 min-w-0">
                <div
                  className={`p-4 sm:p-5 rounded-3xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                    isUser
                      ? 'bg-teal-700 text-white rounded-tl-sm whitespace-pre-wrap font-medium'
                      : 'bg-slate-50 dark:bg-[#16231e] text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-[#22352f] rounded-tr-sm'
                  }`}
                >
                  <EducationalContent content={msg.text} />

                  {/* Grounding Sources */}
                  {msg.groundingSources && msg.groundingSources.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-[#22352f] space-y-1.5">
                      <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5" />
                        <span>مصادر بحث Google الموثوقة:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.groundingSources.map((g, gi) => (
                          <a
                            key={gi}
                            href={g.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] px-2.5 py-1 rounded-xl bg-white dark:bg-[#121c18] border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-50 flex items-center gap-1.5"
                          >
                            <span className="truncate max-w-[150px]">{g.title || g.uri}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer metadata & actions */}
                <div className="flex items-center justify-between px-1 text-[10px] text-slate-400">
                  <div className="flex items-center gap-2">
                    {msg.modelUsed && (
                      <span className="font-mono bg-slate-100 dark:bg-[#182622] px-1.5 py-0.5 rounded">
                        {msg.modelUsed}
                      </span>
                    )}
                    <span>{new Date(msg.date).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(msg.text, msg.id)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded transition"
                    title="نسخ النص"
                  >
                    {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {isGenerating && (
          <div className="flex gap-3 max-w-3xl ml-auto animate-in fade-in duration-200">
            <div className="w-8 h-8 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold text-xs shrink-0 animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-3xl bg-slate-50 dark:bg-[#16231e] border border-slate-200/80 dark:border-[#22352f] text-xs text-teal-700 dark:text-teal-300 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
              <span>{enableHighThinking ? 'المعلم يفكر بعمق ويحلل المسألة الرياضية...' : 'المعلم يكتب الإجابة...'}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Container */}
      <div className="p-3 sm:p-4 bg-white/95 dark:bg-[#121c18]/95 border-t border-slate-200/80 dark:border-[#22352f] shrink-0 space-y-2">
        {/* Media Attachments Preview */}
        {(attachedImage || attachedVideo || isTranscribing) && (
          <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-[#16231e] rounded-2xl border border-slate-200 dark:border-[#22352f]">
            {attachedImage && (
              <div className="flex items-center gap-2 bg-white dark:bg-[#121c18] px-2.5 py-1.5 rounded-xl border text-xs">
                <img src={attachedImage.previewUrl} alt="Preview" className="w-7 h-7 rounded-lg object-cover" />
                <span className="truncate max-w-[120px] font-bold text-[11px]">{attachedImage.name}</span>
                <button type="button" onClick={() => setAttachedImage(null)} className="text-slate-400 hover:text-rose-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {attachedVideo && (
              <div className="flex items-center gap-2 bg-white dark:bg-[#121c18] px-2.5 py-1.5 rounded-xl border text-xs">
                <Video className="w-5 h-5 text-indigo-500" />
                <span className="truncate max-w-[120px] font-bold text-[11px]">{attachedVideo.name}</span>
                <button type="button" onClick={() => setAttachedVideo(null)} className="text-slate-400 hover:text-rose-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {isTranscribing && (
              <div className="flex items-center gap-2 text-xs text-teal-600 font-bold px-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري تفريغ الصوت بنموذج gemini-3.5-transcribe...</span>
              </div>
            )}
          </div>
        )}

        {/* Hidden File Inputs */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageFileChange}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleVideoFileChange}
        />

        {/* Textarea & Multimodal Trigger Buttons */}
        <form onSubmit={handleSubmit} className="flex items-end gap-2 bg-slate-50 dark:bg-[#16231e] border border-slate-200 dark:border-[#22352f] rounded-2xl p-2 focus-within:border-teal-500 transition-all shadow-2xs">
          {/* Photos / Image Understanding Trigger */}
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="p-2 text-slate-500 hover:text-teal-600 rounded-xl hover:bg-white dark:hover:bg-[#121c18] transition cursor-pointer shrink-0"
            title="تحليل صورة أو مسألة رياضية (gemini-3.1-pro-preview)"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          {/* Video Understanding Trigger */}
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className="p-2 text-slate-500 hover:text-indigo-600 rounded-xl hover:bg-white dark:hover:bg-[#121c18] transition cursor-pointer shrink-0"
            title="تحليل مقطع فيديو تعليمي (gemini-3.1-pro-preview)"
          >
            <Video className="w-4 h-4" />
          </button>

          {/* Microphone Recording (gemini-3.5-transcribe) */}
          <button
            type="button"
            onClick={isRecordingAudio ? stopRecordingAudio : startRecordingAudio}
            className={`p-2 rounded-xl transition cursor-pointer shrink-0 ${
              isRecordingAudio
                ? 'bg-rose-600 text-white animate-pulse'
                : 'text-slate-500 hover:text-teal-600 hover:bg-white dark:hover:bg-[#121c18]'
            }`}
            title={isRecordingAudio ? 'إيقاف التسجيل وتفريغ الصوت' : 'تفريغ صوتي بالمايكروفون (gemini-3.5-transcribe)'}
          >
            {isRecordingAudio ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Text Area */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={
              enableHighThinking
                ? 'اطرح مسألة معقدة وسيقوم النموذج بالتفكير والاستدلال المعمق...'
                : 'اسأل المعلم الذكي عن أي مفهوم أو مسألة علمية (Shift+Enter لسطر جديد)...'
            }
            className="flex-1 bg-transparent px-2 py-1 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-none max-h-32 min-h-[38px] leading-relaxed"
          />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isGenerating || (!input.trim() && !attachedImage && !attachedVideo)}
            className="p-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition-all cursor-pointer shrink-0 active:scale-95"
            title="إرسال"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 rotate-180" />}
          </button>
        </form>
      </div>
    </div>
  );
};
