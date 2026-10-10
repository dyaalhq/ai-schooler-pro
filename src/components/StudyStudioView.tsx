import React, { useState } from 'react';
import { 
  Sparkles, 
  HelpCircle, 
  Layers, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Loader2, 
  Copy, 
  Check, 
  Edit3, 
  BookOpen, 
  Clock, 
  Download,
  Award,
  ListTodo
} from 'lucide-react';
import { Source, SourceChunk, NoteItem, Flashcard, QuizQuestion, TodoItem, Notebook } from '../types';
import { sendMessageToGemini } from '../lib/geminiService';
import { EducationalContent } from './EducationalContent';

interface StudyStudioViewProps {
  currentNotebook: Notebook;
  sources: Source[];
  notes: NoteItem[];
  flashcards: Flashcard[];
  todos: TodoItem[];
  onAddNote: (title: string, text: string, tags?: string[]) => void;
  onDeleteNote: (id: string) => void;
  onAddFlashcards: (cards: Flashcard[]) => void;
  onReviewCard: (cardId: string, known: boolean) => void;
  onAddTodo: (text: string) => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
}

export const StudyStudioView: React.FC<StudyStudioViewProps> = ({
  currentNotebook,
  sources,
  notes,
  flashcards,
  todos,
  onAddNote,
  onDeleteNote,
  onAddFlashcards,
  onReviewCard,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'quiz' | 'cards' | 'notes'>('summary');

  // Summary State
  const [summaryText, setSummaryText] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Quiz State
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Flashcards State
  const [isGeneratingCards, setIsGeneratingCards] = useState(false);
  const [flippedCardId, setFlippedCardId] = useState<string | null>(null);

  // Note creation
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteTags, setNewNoteTags] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Get combined text from sources
  const getSourcesContent = () => {
    return sources.map((s) => `### ${s.title}:\n${s.content.slice(0, 8000)}`).join('\n\n');
  };

  // Generate 3-Pillar Academic Summary
  const handleGenerateSummary = async () => {
    const text = getSourcesContent();
    if (!text.trim()) {
      alert("يرجى إضافة مصادر أو مستندات أولاً لتلخيصها.");
      return;
    }

    setIsSummarizing(true);
    try {
      const prompt = `أنت 'المعلم الذكي'. يرجى إعداد ملخص دراسي أكاديمي شامل ودقيق باللغة العربية لمحتوى هذا الدفتر الدراسي (${currentNotebook.name} - ${currentNotebook.subject})، مع الالتزام التام بالأقسام الثلاثة المنهجية التالية:

## 1. المفاهيم الأساسية (Main Concepts)
- تفصيل المحاور النظرية الكبرى والتعريفات المعيارية والمصطلحات.

## 2. الخلاصات والنتائج المحورية (Key Takeaways)
- أبرز النقاط التي يجب على الطالب حفظها واستيعابها بدقة.

## 3. المنهجية والخطوات الإجرائية (Methodology & Steps)
- القوانين العلمية والمعادلات بصيغة KaTeX ($...$ و $$...$$) وطريقة التطبيق والحلول خطوة بخطوة.

نصوص المصادر:
${text}`;

      const res = await sendMessageToGemini({
        prompt,
        modelType: 'general',
      });

      setSummaryText(res.text);
    } catch (err: any) {
      alert(`فشل توليد التلخيص: ${err?.message || err}`);
    } finally {
      setIsSummarizing(false);
    }
  };

  // Generate Interactive MCQ Quiz
  const handleGenerateQuiz = async () => {
    const text = getSourcesContent();
    if (!text.trim()) {
      alert("يرجى إضافة مصادر أولاً لتوليد الاختبار التجريبي.");
      return;
    }

    setIsGeneratingQuiz(true);
    setQuizSubmitted(false);
    setUserAnswers({});

    try {
      const prompt = `أنشئ اختباراً تجريبياً تفاعلياً من 5 أسئلة اختيار من متعدد (MCQ) يختبر فهم واستيعاب الطالب لنصوص المذاكرة التالية. أرجع الناتج بصيغة JSON فقط متبوعاً بمصفوفة questions:
[
  {
    "id": "q1",
    "question": "نص السؤال هنا؟",
    "type": "mcq",
    "options": ["الخيار 1", "الخيار 2", "الخيار 3", "الخيار 4"],
    "answer": 0,
    "explanation": "شرح علمي دقيق لسبب صحة هذا الخيار."
  }
]

المحتوى التعليمي:
${text.slice(0, 15000)}`;

      const res = await sendMessageToGemini({
        prompt,
        modelType: 'general',
      });

      let jsonStr = res.text.replace(/```(?:json)?\s*/gi, '').replace(/\s*```/g, '').trim();
      const parsed = JSON.parse(jsonStr);
      const qList = Array.isArray(parsed) ? parsed : parsed.questions || [];
      setQuizQuestions(qList);
    } catch (err: any) {
      console.warn("Quiz generation parse error:", err);
      // Fallback sample questions
      setQuizQuestions([
        {
          id: 'q_fb_1',
          question: `ما هو المفهوم العلمي الأبرز في دراسة ${currentNotebook.subject}؟`,
          type: 'mcq',
          options: ['المبدأ التأسيسي وتوازن القوى', 'الحركة العشوائية دون قيود', 'التغير اللحظي غير المتزن', 'انعدام التأثير المتبادل'],
          answer: 0,
          explanation: 'المبدأ التأسيسي وتوازن القوى هو الركيزة المنهجية التي تنطلق منها النظريات الأكاديمية.',
        },
      ]);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  // Generate Flashcards
  const handleGenerateFlashcards = async () => {
    const text = getSourcesContent();
    if (!text.trim()) {
      alert("يرجى إضافة مصادر لتوليد كروت المذاكرة.");
      return;
    }

    setIsGeneratingCards(true);
    try {
      const prompt = `أنشئ 6 كروت استذكار سريعة (Flashcards) بصيغة سؤال وجواب من المحتوى التالي. أرجع الناتج بصيغة JSON فقط:
[
  { "front": "السؤال أو المفهوم على الوجه الأول", "back": "الإجابة النموذجية والمختصرة على الوجه الثاني" }
]

المحتوى:
${text.slice(0, 15000)}`;

      const res = await sendMessageToGemini({
        prompt,
        modelType: 'general',
      });

      let jsonStr = res.text.replace(/```(?:json)?\s*/gi, '').replace(/\s*```/g, '').trim();
      const parsed = JSON.parse(jsonStr);
      const cardsList = Array.isArray(parsed) ? parsed : parsed.cards || [];

      const newCards: Flashcard[] = cardsList.map((c: any, idx: number) => ({
        id: `fc_${Date.now()}_${idx}`,
        notebookId: currentNotebook.id,
        front: c.front,
        back: c.back,
        level: 0,
        nextReview: Date.now(),
        topic: currentNotebook.subject,
      }));

      onAddFlashcards(newCards);
    } catch (err) {
      console.error(err);
      alert("فشل توليد الكروت بالذكاء الاصطناعي.");
    } finally {
      setIsGeneratingCards(false);
    }
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(summaryText);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim() || !newNoteText.trim()) return;
    const tags = newNoteTags.split(',').map((t) => t.trim()).filter(Boolean);
    onAddNote(newNoteTitle.trim(), newNoteText.trim(), tags);
    setNewNoteTitle('');
    setNewNoteText('');
    setNewNoteTags('');
    setIsAddingNote(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Studio Header & Tab Switcher */}
      <div className="bg-white dark:bg-[#14201c] rounded-3xl border border-slate-200 dark:border-[#22352f] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-600" />
            <span>استوديو المذاكرة والتلخيص والتقييم الذكي</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            توليد ملخصات ثلاثية الأركان، اختبارات تجريبية، كروت التكرار المتباعد، وتدوين الملاحظات
          </p>
        </div>

        {/* Studio Sub-Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 dark:bg-[#182622] p-1.5 rounded-2xl border border-slate-200 dark:border-[#263c33]">
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'summary' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>التلخيص الأكاديمي</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('quiz')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'quiz' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>اختبار (MCQ)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cards')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'cards' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>الكروت ({flashcards.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'notes' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>الملاحظات ({notes.length})</span>
          </button>
        </div>
      </div>

      {/* 1. Academic 3-Pillar Summary Tab */}
      {activeTab === 'summary' && (
        <div className="bg-white dark:bg-[#14201c] rounded-3xl p-6 border border-slate-200 dark:border-[#22352f] shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#22352f]">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-slate-100">
                التلخيص الأكاديمي المنهجي (3-Pillar Academic Summary)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                تلخيص منظم ومكثف: المفاهيم الأساسية • الخلاصات المحورية • المنهجية والقوانين
              </p>
            </div>
            <div className="flex items-center gap-2">
              {summaryText && (
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#22352f] hover:bg-slate-50 text-xs font-bold flex items-center gap-1 text-slate-600 dark:text-slate-300"
                >
                  {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSummary ? 'تم النسخ!' : 'نسخ التلخيص'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleGenerateSummary}
                disabled={isSummarizing || sources.length === 0}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSummarizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>توليد التلخيص المنهجي</span>
              </button>
            </div>
          </div>

          {summaryText ? (
            <div className="p-5 sm:p-7 rounded-2xl bg-slate-50 dark:bg-[#101915] border border-slate-200/80 dark:border-[#22352f] leading-relaxed">
              <EducationalContent content={summaryText} />
            </div>
          ) : (
            <div className="py-16 text-center text-slate-400 space-y-2 border border-dashed border-slate-200 dark:border-[#22352f] rounded-2xl">
              <FileText className="w-10 h-10 mx-auto opacity-50" />
              <p className="text-xs font-bold">لم يتم توليد تلخيص بعد.</p>
              <p className="text-[11px]">اضغط على "توليد التلخيص المنهجي" لتحليل وتلخيص كافة مصادر الدفتر.</p>
            </div>
          )}
        </div>
      )}

      {/* 2. Interactive MCQ Quiz Tab */}
      {activeTab === 'quiz' && (
        <div className="bg-white dark:bg-[#14201c] rounded-3xl p-6 border border-slate-200 dark:border-[#22352f] shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#22352f]">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-slate-100">
                الاختبارات التجريبية وأسئلة الاختيار من متعدد
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                توليد أسئلة تقييمية مع إجابات نموذجية وشروحات علمية مفصلة
              </p>
            </div>
            <button
              type="button"
              onClick={handleGenerateQuiz}
              disabled={isGeneratingQuiz || sources.length === 0}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isGeneratingQuiz ? <Loader2 className="w-4 h-4 animate-spin" /> : <HelpCircle className="w-4 h-4" />}
              <span>توليد اختبار جديد</span>
            </button>
          </div>

          {quizQuestions.length > 0 ? (
            <div className="space-y-4">
              {quizQuestions.map((q, idx) => {
                const userAns = userAnswers[q.id];
                const isAnswered = userAns !== undefined;
                const isCorrect = userAns === q.answer;

                return (
                  <div key={q.id || idx} className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#121c18] border border-slate-200 dark:border-[#22352f] space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100">
                        {idx + 1}. {q.question}
                      </h4>
                      {quizSubmitted && (
                        <span>
                          {isCorrect ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-500" />
                          )}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options?.map((opt, optIdx) => {
                        const isSelected = userAns === optIdx;
                        let optStyle = 'border-slate-200 dark:border-[#263c33] bg-white dark:bg-[#16231e] hover:border-teal-500';
                        if (quizSubmitted) {
                          if (optIdx === q.answer) {
                            optStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold';
                          } else if (isSelected && !isCorrect) {
                            optStyle = 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200';
                          }
                        } else if (isSelected) {
                          optStyle = 'border-teal-600 bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-200 font-bold';
                        }

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            disabled={quizSubmitted}
                            onClick={() => setUserAnswers({ ...userAnswers, [q.id]: optIdx })}
                            className={`p-3 rounded-xl border text-right text-xs transition-all flex items-center gap-2 cursor-pointer ${optStyle}`}
                          >
                            <span className="w-5 h-5 rounded-full border flex items-center justify-center font-bold text-[10px] shrink-0">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span className="truncate">{opt}</span>
                          </button>
                        );
                      })}
                    </div>

                    {quizSubmitted && q.explanation && (
                      <div className="p-3 bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900 rounded-xl text-xs text-teal-900 dark:text-teal-200 leading-relaxed">
                        <strong>التعليل العلمي:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}

              {!quizSubmitted && (
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setQuizSubmitted(true)}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                  >
                    تصحيح الاختبار وعرض النتيجة
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-16 text-center text-slate-400 space-y-2 border border-dashed border-slate-200 dark:border-[#22352f] rounded-2xl">
              <HelpCircle className="w-10 h-10 mx-auto opacity-50" />
              <p className="text-xs font-bold">لا توجد أسئلة حالياً.</p>
              <p className="text-[11px]">اضغط على "توليد اختبار جديد" لإنشاء أسئلة من محتوى مصادرك.</p>
            </div>
          )}
        </div>
      )}

      {/* 3. Flashcards Tab */}
      {activeTab === 'cards' && (
        <div className="bg-white dark:bg-[#14201c] rounded-3xl p-6 border border-slate-200 dark:border-[#22352f] shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#22352f]">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-slate-100">
                كروت الحفظ والتكرار المتباعد (Spaced Repetition)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                اضغط على الكارت لقلبه ومراجعة الإجابة وتثبيت الحفظ
              </p>
            </div>
            <button
              type="button"
              onClick={handleGenerateFlashcards}
              disabled={isGeneratingCards || sources.length === 0}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isGeneratingCards ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>توليد كروت جديدة</span>
            </button>
          </div>

          {flashcards.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {flashcards.map((card) => {
                const isFlipped = flippedCardId === card.id;
                return (
                  <div
                    key={card.id}
                    onClick={() => setFlippedCardId(isFlipped ? null : card.id)}
                    className="p-5 rounded-2xl bg-slate-50 dark:bg-[#121c18] border border-slate-200 dark:border-[#22352f] hover:border-teal-500 cursor-pointer min-h-[170px] flex flex-col justify-between transition-all shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mb-2">
                        <span className="text-teal-600 dark:text-teal-400">
                          {isFlipped ? 'الإجابة (الظهر)' : 'السؤال (الوجه)'}
                        </span>
                        <span>مستوى الإتقان: {card.level}</span>
                      </div>
                      <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">
                        {isFlipped ? card.back : card.front}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-[#22352f] flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[10px] text-slate-400">اضغط لقلب الكارت</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onReviewCard(card.id, false)}
                          className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 text-[10px] font-bold"
                        >
                          يحتاج مراجعة
                        </button>
                        <button
                          type="button"
                          onClick={() => onReviewCard(card.id, true)}
                          className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold"
                        >
                          أتقنته ✓
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center text-slate-400 space-y-2 border border-dashed border-slate-200 dark:border-[#22352f] rounded-2xl">
              <Layers className="w-10 h-10 mx-auto opacity-50" />
              <p className="text-xs font-bold">لا توجد كروت استذكار حتى الآن.</p>
              <p className="text-[11px]">اضغط على "توليد كروت جديدة" لإنشاء كروت تلقائياً من مصادر الدفتر.</p>
            </div>
          )}
        </div>
      )}

      {/* 4. Notes Tab */}
      {activeTab === 'notes' && (
        <div className="bg-white dark:bg-[#14201c] rounded-3xl p-6 border border-slate-200 dark:border-[#22352f] shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#22352f]">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-slate-100">
                الملاحظات والملخصات الدراسية ({notes.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                سجل أفكارك وخلاصاتك العلمية مع دعم التنسيق ومعادلات KaTeX
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingNote(!isAddingNote)}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{isAddingNote ? 'إغلاق المحرر' : 'ملاحظة جديدة'}</span>
            </button>
          </div>

          {/* Add Note Form */}
          {isAddingNote && (
            <form onSubmit={handleAddNoteSubmit} className="p-4 rounded-2xl bg-slate-50 dark:bg-[#121c18] border border-slate-200 dark:border-[#22352f] space-y-3">
              <input
                type="text"
                required
                placeholder="عنوان الملاحظة..."
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#22352f] bg-white dark:bg-[#14201c] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-teal-500 font-bold"
              />
              <input
                type="text"
                placeholder="وسوم مفصولة بفواصل (مثل: فيزياء, قانون, مهم)..."
                value={newNoteTags}
                onChange={(e) => setNewNoteTags(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#22352f] bg-white dark:bg-[#14201c] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-teal-500"
              />
              <textarea
                rows={5}
                required
                placeholder="محتوى الملاحظة... يدعم Markdown ومعادلات KaTeX ($E=mc^2$)"
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-[#22352f] bg-white dark:bg-[#14201c] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-teal-500 leading-relaxed resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingNote(false)}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-200 dark:hover:bg-[#182622]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  حفظ الملاحظة
                </button>
              </div>
            </form>
          )}

          {/* Notes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {notes.map((note) => (
              <div
                key={note.id}
                className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#121c18] border border-slate-200 dark:border-[#22352f] space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                      {note.title}
                    </h4>
                    <button
                      type="button"
                      onClick={() => onDeleteNote(note.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded transition cursor-pointer"
                      title="حذف الملاحظة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {note.tags && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {note.tags.map((tag, tIdx) => (
                        <span key={tIdx} className="text-[10px] px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="text-xs leading-relaxed max-h-48 overflow-y-auto">
                    <EducationalContent content={note.text} />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-[#22352f] text-[10px] text-slate-400">
                  {new Date(note.created).toLocaleDateString('ar-SA')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
