import React, { useState } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  MessageSquare, 
  FileText, 
  Atom, 
  Layers, 
  Calculator, 
  ArrowLeft, 
  HardDrive, 
  Radio, 
  CheckCircle2, 
  ListTodo, 
  Plus, 
  Zap, 
  BrainCircuit, 
  Clock, 
  Award,
  ExternalLink
} from 'lucide-react';
import { Notebook, Source, ChatSession, Flashcard, TodoItem, NoteItem } from '../types';

interface HomeViewProps {
  currentNotebook: Notebook;
  sources: Source[];
  chatSession: ChatSession;
  flashcards: Flashcard[];
  notes: NoteItem[];
  todos: TodoItem[];
  onToggleTodo: (id: string) => void;
  onAddTodo: (text: string) => void;
  onNavigateTab: (tab: string) => void;
  onOpenLiveVoice: () => void;
  onOpenGoogleDrive: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  currentNotebook,
  sources,
  chatSession,
  flashcards,
  notes,
  todos,
  onToggleTodo,
  onAddTodo,
  onNavigateTab,
  onOpenLiveVoice,
  onOpenGoogleDrive,
}) => {
  const [newTodoInput, setNewTodoInput] = useState('');

  const handleAddTodoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoInput.trim()) return;
    onAddTodo(newTodoInput.trim());
    setNewTodoInput('');
  };

  const quickPrompts = [
    { text: 'اشرح لي أهم القوانين والمفاهيم في هذا الدفتر بأسلوب مبسط', icon: Sparkles, tag: 'شرح شامل' },
    { text: 'اختبر فهمي بـ 5 أسئلة اختيار من متعدد (MCQ) مع التعليل العلمي', icon: BrainCircuit, tag: 'اختبار تجريبي' },
    { text: 'استخرج لي أهم 5 مصطلحات علمية وتعريفاتها المعيارية', icon: BookOpen, tag: 'مصطلحات' },
    { text: 'حل مسألة رياضية خطوة بخطوة مع توضيح القوانين المستخدمة', icon: Calculator, tag: 'حل مسائل' },
  ];

  const totalWords = sources.reduce((acc, s) => acc + (s.wordCount || 0), 0);
  const completedTodos = todos.filter((t) => t.done).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* 1. Hero Banner */}
      <section className="bg-gradient-to-br from-[#0c534e] via-[#0f766e] to-[#115e59] text-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-teal-950/15 relative overflow-hidden border border-teal-500/30">
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-md border border-white/10">
              <BookOpen className="w-3.5 h-3.5 text-amber-300" />
              <span>الدفتر: {currentNotebook.name}</span>
              <span className="text-teal-300">•</span>
              <span className="text-teal-200">{currentNotebook.subject}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenLiveVoice}
                className="px-3 py-1 rounded-full bg-emerald-500/30 hover:bg-emerald-500/40 text-emerald-200 border border-emerald-400/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                <span>محادثة صوتية حية (Live API)</span>
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              أهلاً بك في منصة المعلم الذكي للدراسة
            </h1>
            <p className="text-xs sm:text-sm text-teal-100/90 leading-relaxed max-w-2xl font-medium">
              {currentNotebook.description || 'منصة تعليمية متكاملة مستوحاة من NotebookLM لدراسة واستيعاب المواد وتلخيصها ومحاكاتها بالذكاء الاصطناعي.'}
            </p>
          </div>

          {/* Vitals Metrics Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-md border border-white/10">
              <div className="text-[11px] text-teal-200 font-medium">المصادر والكتب</div>
              <div className="text-xl font-black mt-0.5">{sources.length}</div>
              <div className="text-[10px] text-teal-300/80">وثائق مجهزة للتحليل</div>
            </div>
            <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-md border border-white/10">
              <div className="text-[11px] text-teal-200 font-medium">الملاحظات والملخصات</div>
              <div className="text-xl font-black mt-0.5">{notes.length}</div>
              <div className="text-[10px] text-teal-300/80">مدونات دراسية</div>
            </div>
            <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-md border border-white/10">
              <div className="text-[11px] text-teal-200 font-medium">كروت الحفظ السريع</div>
              <div className="text-xl font-black mt-0.5">{flashcards.length}</div>
              <div className="text-[10px] text-teal-300/80">تكرار متباعد (Spaced)</div>
            </div>
            <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-md border border-white/10">
              <div className="text-[11px] text-teal-200 font-medium">مهام اليوم المنجزة</div>
              <div className="text-xl font-black mt-0.5">{completedTodos}/{todos.length}</div>
              <div className="text-[10px] text-teal-300/80">إنجاز المهام الدراسية</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Three Main Pillar Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Card 1: Gemini Chatbot */}
        <div
          onClick={() => onNavigateTab('chat')}
          className="group bg-white dark:bg-[#14201c] rounded-3xl border border-slate-200 dark:border-[#22352f] p-5 shadow-xs hover:border-teal-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <span>المعلم الذكي (Gemini)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold">
                  Pro & Flash
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                حوار تفاعلي متعدد الأدوار يدعم معادلات KaTeX، والتفكير العميق، والبحث الحي في Google.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs font-bold text-teal-600 dark:text-teal-400 pt-4 mt-4 border-t border-slate-100 dark:border-[#22352f]">
            <span>بدء المحادثة</span>
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 2: Science Studio */}
        <div
          onClick={() => onNavigateTab('science')}
          className="group bg-white dark:bg-[#14201c] rounded-3xl border border-slate-200 dark:border-[#22352f] p-5 shadow-xs hover:border-sky-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
              <Atom className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <span>مختبر العلوم والتصوير 3D</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold">
                  Science Skills
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                استعراض البنى الجزيئية ثلاثية الأبعاد بـ 3Dmol.js، وبحث المركبات الكيميائية بـ PubChem، وأوراق arXiv.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs font-bold text-sky-600 dark:text-sky-400 pt-4 mt-4 border-t border-slate-100 dark:border-[#22352f]">
            <span>دخول المختبر العلمي</span>
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 3: Sources & Google Drive */}
        <div
          onClick={() => onNavigateTab('sources')}
          className="group bg-white dark:bg-[#14201c] rounded-3xl border border-slate-200 dark:border-[#22352f] p-5 shadow-xs hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <span>المصادر والكتب والمستندات</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                  {sources.length} مصادر
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                رفع ملفات PDF، واستيراد المستندات مباشرة من Google Drive واستخراج النصوص بالذكاء الاصطناعي.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400 pt-4 mt-4 border-t border-slate-100 dark:border-[#22352f]">
            <span>إدارة المصادر و Drive</span>
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          </div>
        </div>
      </section>

      {/* 3. Quick AI Prompt Starters */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
          <Zap className="w-4 h-4 text-amber-500" />
          <span>انطلاقة سريعة للدراسة الذكية:</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onNavigateTab('chat')}
              className="p-3.5 bg-white dark:bg-[#14201c] rounded-2xl border border-slate-200 dark:border-[#22352f] hover:border-teal-500 text-right text-xs text-slate-700 dark:text-slate-200 font-semibold transition-all shadow-2xs hover:shadow-xs flex items-center justify-between gap-3 cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="p-1.5 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 shrink-0">
                  <p.icon className="w-4 h-4" />
                </span>
                <span className="truncate">{p.text}</span>
              </div>
              <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md shrink-0">
                {p.tag}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 4. Today's Study Tasks */}
      <section className="bg-white dark:bg-[#14201c] rounded-3xl border border-slate-200 dark:border-[#22352f] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#22352f]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <ListTodo className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                المهام والأهداف الدراسية لليوم
              </h3>
              <p className="text-[11px] text-slate-400">
                أنجزت {completedTodos} من أصل {todos.length} مهام
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('studio')}
            className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>استوديو المذاكرة</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Add Todo */}
        <form onSubmit={handleAddTodoSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="إضافة هدف دراسي جديد (مثال: حل مسائل الفيزياء ص 45)..."
            value={newTodoInput}
            onChange={(e) => setNewTodoInput(e.target.value)}
            className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#22352f] bg-slate-50 dark:bg-[#182622] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-teal-600"
          />
          <button
            type="submit"
            disabled={!newTodoInput.trim()}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة</span>
          </button>
        </form>

        {/* Todo List */}
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {todos.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">لا توجد مهام حالياً. أضف هدفاً دراسياً لليوم!</p>
          ) : (
            todos.map((todo) => (
              <div
                key={todo.id}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                  todo.done
                    ? 'bg-slate-50/60 dark:bg-[#121b18]/60 border-slate-200/60 dark:border-[#1d2b25] opacity-75'
                    : 'bg-white dark:bg-[#16231f] border-slate-200 dark:border-[#22352f]'
                }`}
              >
                <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={todo.done}
                    onChange={() => onToggleTodo(todo.id)}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-600 shrink-0"
                  />
                  <span
                    className={`text-xs font-semibold truncate ${
                      todo.done ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    {todo.text}
                  </span>
                </label>
                {todo.done && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    مكتمل ✓
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
