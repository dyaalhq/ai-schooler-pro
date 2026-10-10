import React, { useState, useEffect, useRef } from 'react';
import { 
  Calculator, 
  Clock, 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  CheckCircle2, 
  Sparkles,
  Award
} from 'lucide-react';
import { FocusSession } from '../types';

interface ToolsViewProps {
  currentNotebookId: string;
  focusSessions: FocusSession[];
  onAddFocusSession: (session: FocusSession) => void;
}

export const ToolsView: React.FC<ToolsViewProps> = ({
  currentNotebookId,
  focusSessions,
  onAddFocusSession,
}) => {
  const [activeTab, setActiveTab] = useState<'calc' | 'timer'>('calc');

  // Calculator State
  const [calcInput, setCalcInput] = useState('');
  const [calcResult, setCalcResult] = useState('');
  const [isDegree, setIsDegree] = useState(true);

  // Timer State
  const [timerDurationMins, setTimerDurationMins] = useState(25);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<any>(null);

  // Scientific calculation handler
  const handleCalcButton = (val: string) => {
    if (val === 'C') {
      setCalcInput('');
      setCalcResult('');
    } else if (val === 'DEL') {
      setCalcInput((prev) => prev.slice(0, -1));
    } else if (val === '=') {
      try {
        let expr = calcInput
          .replace(/×/g, '*')
          .replace(/÷/g, '/')
          .replace(/π/g, 'Math.PI')
          .replace(/e/g, 'Math.E');

        // Functions replacement
        expr = expr.replace(/sin\(([^)]+)\)/g, (_m, arg) => `Math.sin(${isDegree ? `(${arg}) * Math.PI / 180` : arg})`);
        expr = expr.replace(/cos\(([^)]+)\)/g, (_m, arg) => `Math.cos(${isDegree ? `(${arg}) * Math.PI / 180` : arg})`);
        expr = expr.replace(/tan\(([^)]+)\)/g, (_m, arg) => `Math.tan(${isDegree ? `(${arg}) * Math.PI / 180` : arg})`);
        expr = expr.replace(/sqrt\(([^)]+)\)/g, 'Math.sqrt($1)');
        expr = expr.replace(/log\(([^)]+)\)/g, 'Math.log10($1)');
        expr = expr.replace(/ln\(([^)]+)\)/g, 'Math.log($1)');
        expr = expr.replace(/\^/g, '**');

        // eslint-disable-next-line no-eval
        const evaluated = Function(`"use strict"; return (${expr})`)();
        const formatted = Number.isInteger(evaluated) ? evaluated.toString() : parseFloat(evaluated.toFixed(8)).toString();
        setCalcResult(formatted);
      } catch (err) {
        setCalcResult('خطأ رياضي');
      }
    } else {
      setCalcInput((prev) => prev + val);
    }
  };

  // Timer interval handling
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeftSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsRunning(false);

            // Play notification tone using Web Audio API
            if (typeof window !== 'undefined') {
              try {
                const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
                const ctx = new AudioCtx();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.setValueAtTime(587.33, ctx.currentTime);
                osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
                gain.gain.setValueAtTime(0.2, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
                osc.start();
                osc.stop(ctx.currentTime + 0.5);
              } catch {}
            }

            onAddFocusSession({
              id: `focus_${Date.now()}`,
              notebookId: currentNotebookId,
              durationMins: timerDurationMins,
              timestamp: Date.now(),
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning, timerDurationMins, currentNotebookId, onAddFocusSession]);

  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;
  const progressPercent = ((timerDurationMins * 60 - timeLeftSeconds) / (timerDurationMins * 60)) * 100;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="bg-white dark:bg-[#14201c] rounded-3xl border border-slate-200 dark:border-[#22352f] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-teal-600" />
            <span>الأدوات العلمية ومؤقت التركيز</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            حاسبة علمية متقدمة تدعم الزوايا واللوغاريتمات • مؤقت بومودورو مع جلسات التركيز
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('calc')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'calc' ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-50 dark:bg-[#182622] text-slate-600 dark:text-slate-300'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>الحاسبة العلمية</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('timer')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'timer' ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-50 dark:bg-[#182622] text-slate-600 dark:text-slate-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>مؤقت بومودورو</span>
          </button>
        </div>
      </div>

      {/* 1. Scientific Calculator */}
      {activeTab === 'calc' && (
        <div className="bg-white dark:bg-[#14201c] rounded-3xl p-6 border border-slate-200 dark:border-[#22352f] shadow-sm max-w-xl mx-auto space-y-4">
          {/* LCD Screen */}
          <div className="p-4 bg-slate-900 rounded-2xl text-left border border-slate-800 text-white font-mono" dir="ltr">
            <div className="text-[11px] text-teal-400 flex justify-between mb-1">
              <span>{isDegree ? 'DEG' : 'RAD'}</span>
              <span>Scientific FX</span>
            </div>
            <input
              type="text"
              readOnly
              value={calcInput || '0'}
              className="w-full text-right bg-transparent text-xl font-bold tracking-wider text-slate-100 outline-none"
            />
            <div className="text-right text-2xl font-black text-teal-300 min-h-[36px] mt-1">
              {calcResult ? `= ${calcResult}` : ''}
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex justify-between items-center text-xs">
            <button
              type="button"
              onClick={() => setIsDegree(!isDegree)}
              className="px-3 py-1 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold border border-teal-200 dark:border-teal-800 cursor-pointer"
            >
              {isDegree ? 'الزوايا بالدرجات (DEG)' : 'الزوايا بالراديان (RAD)'}
            </button>
          </div>

          {/* Keypad Grid */}
          <div className="grid grid-cols-5 gap-2 text-xs sm:text-sm font-mono font-bold">
            {[
              { label: 'sin', val: 'sin(' },
              { label: 'cos', val: 'cos(' },
              { label: 'tan', val: 'tan(' },
              { label: 'C', val: 'C', red: true },
              { label: 'DEL', val: 'DEL', amber: true },
              { label: '√', val: 'sqrt(' },
              { label: '^', val: '^' },
              { label: '(', val: '(' },
              { label: ')', val: ')' },
              { label: '÷', val: '÷' },
              { label: 'ln', val: 'ln(' },
              { label: '7', val: '7', num: true },
              { label: '8', val: '8', num: true },
              { label: '9', val: '9', num: true },
              { label: '×', val: '×' },
              { label: 'log', val: 'log(' },
              { label: '4', val: '4', num: true },
              { label: '5', val: '5', num: true },
              { label: '6', val: '6', num: true },
              { label: '-', val: '-' },
              { label: 'π', val: 'π' },
              { label: '1', val: '1', num: true },
              { label: '2', val: '2', num: true },
              { label: '3', val: '3', num: true },
              { label: '+', val: '+' },
              { label: 'e', val: 'e' },
              { label: '0', val: '0', num: true },
              { label: '.', val: '.', num: true },
              { label: '%', val: '%', num: true },
              { label: '=', val: '=', primary: true },
            ].map((btn, i) => {
              let style = 'bg-slate-50 dark:bg-[#182622] text-slate-800 dark:text-slate-100 hover:bg-slate-100';
              if (btn.num) style = 'bg-white dark:bg-[#121c19] text-slate-900 dark:text-slate-100 shadow-2xs border border-slate-200 dark:border-[#22352f]';
              if (btn.primary) style = 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm col-span-1';
              if (btn.red) style = 'bg-rose-50 dark:bg-rose-950/40 text-rose-600';
              if (btn.amber) style = 'bg-amber-50 dark:bg-amber-950/40 text-amber-600';

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleCalcButton(btn.val)}
                  className={`h-11 rounded-xl flex items-center justify-center transition active:scale-95 cursor-pointer ${style}`}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Pomodoro Focus Timer */}
      {activeTab === 'timer' && (
        <div className="bg-white dark:bg-[#14201c] rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-[#22352f] shadow-sm max-w-xl mx-auto space-y-6 text-center flex flex-col items-center">
          {/* Duration Presets */}
          <div className="flex flex-wrap justify-center gap-2">
            {[15, 25, 45, 60].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => {
                  setIsRunning(false);
                  setTimerDurationMins(mins);
                  setTimeLeftSeconds(mins * 60);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  timerDurationMins === mins
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-[#182622] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#22352f]'
                }`}
              >
                {mins} دقيقة
              </button>
            ))}
          </div>

          {/* Circular Countdown Ring */}
          <div className="relative w-64 h-64 flex items-center justify-center my-2">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                className="stroke-slate-200 dark:stroke-slate-800"
                strokeWidth="6"
                fill="none"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                className="stroke-teal-600 dark:stroke-teal-400 transition-all duration-1000 ease-linear"
                strokeWidth="6"
                strokeDasharray={264}
                strokeDashoffset={264 - (264 * progressPercent) / 100}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="font-mono text-4xl sm:text-5xl font-black text-slate-900 dark:text-slate-100 tracking-wider">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
              <span className="text-xs font-bold text-teal-600 dark:text-teal-400 mt-2">
                {isRunning ? 'جلسة مذاكرة نشطة' : 'متوقف مؤقتاً'}
              </span>
            </div>
          </div>

          {/* Play / Pause / Reset Actions */}
          <div className="flex items-center gap-3">
            {!isRunning ? (
              <button
                type="button"
                onClick={() => setIsRunning(true)}
                className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-bold text-sm flex items-center gap-2 shadow-md shadow-teal-600/25 transition cursor-pointer active:scale-95"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>بدء الجلسة</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsRunning(false)}
                className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold text-sm flex items-center gap-2 shadow-md shadow-amber-500/25 transition cursor-pointer active:scale-95"
              >
                <Pause className="w-5 h-5 fill-current" />
                <span>إيقاف مؤقت</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsRunning(false);
                setTimeLeftSeconds(timerDurationMins * 60);
              }}
              className="p-3 border border-slate-200 dark:border-[#22352f] hover:bg-slate-50 dark:hover:bg-[#182622] rounded-2xl text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="إعادة ضبط المؤقت"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>

          {/* Completed Sessions Log */}
          <div className="w-full pt-4 border-t border-slate-100 dark:border-[#22352f] text-right">
            <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>جلسات التركيز المكتملة ({focusSessions.length}):</span>
            </h4>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {focusSessions.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">لا توجد جلسات مسجلة بعد.</p>
              ) : (
                focusSessions.map((s) => (
                  <div key={s.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#121c18] border border-slate-200 dark:border-[#22352f] flex justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">جلسة تركيز ({s.durationMins} دقيقة)</span>
                    <span className="text-slate-400 font-mono">{new Date(s.timestamp).toLocaleTimeString('ar-SA')}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
