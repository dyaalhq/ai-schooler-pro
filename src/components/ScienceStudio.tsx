import React, { useState, useEffect, useRef } from 'react';
import { 
  Atom, 
  FlaskConical, 
  Layers, 
  Search, 
  Loader2, 
  ExternalLink, 
  BookOpen, 
  FileText, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Copy, 
  Check, 
  Sparkles, 
  Sigma, 
  Award,
  Download,
  Info
} from 'lucide-react';
import { EducationalContent } from './EducationalContent';

declare global {
  interface Window {
    $3Dmol?: any;
  }
}

interface CompoundData {
  cid?: number;
  name: string;
  molecularFormula?: string;
  molecularWeight?: string;
  iupacName?: string;
  smiles?: string;
  structureImageUrl?: string | null;
  sourceUrl?: string | null;
}

interface ProteinData {
  source: string;
  uniprotAccession?: string;
  pdbId?: string;
  title: string;
  cifUrl?: string;
  pdbUrl?: string;
  plddtUrl?: string;
  organism?: string;
  gene?: string;
}

interface LiteraturePaper {
  title: string;
  summary: string;
  link: string;
  authors: string[];
  published: string;
}

const PRESET_PROTEINS = [
  { id: 'P04637', name: 'TP53 (مكبح الأورام الخلوي)' },
  { id: 'P38398', name: 'BRCA1 (إصلاح الحمض النووي)' },
  { id: 'P00533', name: 'EGFR (مستقبل عامل النمو)' },
  { id: '1BNA', name: '1BNA (الحمض النووي DNA الحلزوني)' },
  { id: '4HHB', name: '4HHB (الهيموغلوبين البشري)' },
];

const PRESET_COMPOUNDS = [
  { name: 'Aspirin', label: 'الأسبرين (C9H8O4)' },
  { name: 'Caffeine', label: 'الكافيين (C8H10N4O2)' },
  { name: 'Glucose', label: 'الجلوكوز (C6H12O6)' },
  { name: 'Water', label: 'الماء (H2O)' },
  { name: 'Penicillin', label: 'البنسلين (مضاد حيوي)' },
];

export const ScienceStudio: React.FC<{
  notebookTitle?: string;
  notebookSubject?: string;
  onSendToChat?: (prompt: string) => void;
  onExportToNote?: (title: string, content: string) => void;
}> = ({ notebookTitle, notebookSubject, onSendToChat, onExportToNote }) => {
  const [subTab, setSubTab] = useState<'3dmol' | 'compounds' | 'equations' | 'papers'>('3dmol');

  // 3D Molecular Viewer State
  const [proteinQuery, setProteinQuery] = useState('P04637');
  const [activeProtein, setActiveProtein] = useState<ProteinData | null>(null);
  const [molStyle, setMolStyle] = useState<'cartoon' | 'stick' | 'sphere' | 'surface'>('cartoon');
  const [colorScheme, setColorScheme] = useState<'plddt' | 'chain' | 'spectrum'>('plddt');
  const [isLoadingMol, setIsLoadingMol] = useState(false);
  const [molError, setMolError] = useState<string | null>(null);
  const molViewerContainerRef = useRef<HTMLDivElement>(null);
  const viewerInstanceRef = useRef<any>(null);

  // Chemistry Compound State
  const [compoundQuery, setCompoundQuery] = useState('Caffeine');
  const [compoundData, setCompoundData] = useState<CompoundData | null>(null);
  const [isLoadingCompound, setIsLoadingCompound] = useState(false);
  const [compoundError, setCompoundError] = useState<string | null>(null);

  // Literature Search State
  const [litQuery, setLitQuery] = useState('quantum physics or CRISPR Cas9');
  const [papers, setPapers] = useState<LiteraturePaper[]>([]);
  const [isLoadingLit, setIsLoadingLit] = useState(false);

  const [copiedText, setCopiedText] = useState(false);

  // Initialize and Render 3Dmol.js viewer
  const render3DStructure = (pdbOrCifData: string, format = 'pdb') => {
    if (!molViewerContainerRef.current || !window.$3Dmol) return;

    molViewerContainerRef.current.innerHTML = '';
    const element = molViewerContainerRef.current;
    const config = { backgroundColor: '#0f172a' };
    const viewer = window.$3Dmol.createViewer(element, config);
    viewerInstanceRef.current = viewer;

    viewer.addModel(pdbOrCifData, format);

    applyViewerStyles(viewer, molStyle, colorScheme);
    viewer.zoomTo();
    viewer.render();
  };

  const applyViewerStyles = (viewer: any, styleType: string, scheme: string) => {
    if (!viewer) return;
    viewer.setStyle({}, {});

    let styleObj: any = {};
    if (styleType === 'cartoon') {
      styleObj = { cartoon: { color: scheme === 'spectrum' ? 'spectrum' : undefined } };
    } else if (styleType === 'stick') {
      styleObj = { stick: { radius: 0.25 } };
    } else if (styleType === 'sphere') {
      styleObj = { sphere: { scale: 0.3 } };
    } else if (styleType === 'surface') {
      styleObj = { cartoon: {} };
      viewer.addSurface(window.$3Dmol.SurfaceType.VDW, { opacity: 0.7, color: 'white' });
    }

    // Apply canonical AlphaFold 4-band pLDDT color scale if requested
    if (scheme === 'plddt') {
      viewer.setStyle({}, styleObj);
      viewer.setColorByProperty({}, 'b', (val: number) => {
        if (val > 90) return '#0053D6'; // Very High (Deep Blue)
        if (val > 70) return '#65CBF3'; // Confident (Light Blue)
        if (val > 50) return '#FFDB13'; // Low (Yellow)
        return '#FF7D45'; // Very Low (Orange)
      });
    } else if (scheme === 'chain') {
      viewer.setStyle({}, { ...styleObj, colorfunc: (atom: any) => atom.chain === 'A' ? '#0d9488' : '#6366f1' });
    } else {
      viewer.setStyle({}, styleObj);
    }

    viewer.render();
  };

  const loadProtein = async (idToLoad?: string) => {
    const target = idToLoad || proteinQuery.trim();
    if (!target) return;
    setIsLoadingMol(true);
    setMolError(null);

    try {
      const res = await fetch(`/api/science/protein/${encodeURIComponent(target)}`);
      if (!res.ok) {
        throw new Error("لم يتم العثور على البنية الجزيئية للبروتين المدخل");
      }
      const data: ProteinData = await res.json();
      setActiveProtein(data);

      // Fetch PDB coordinate text
      const fetchUrl = data.pdbUrl || data.cifUrl;
      if (fetchUrl) {
        const fileRes = await fetch(fetchUrl);
        const fileText = await fileRes.text();
        render3DStructure(fileText, data.pdbUrl ? 'pdb' : 'cif');
      }
    } catch (err: any) {
      console.warn("Protein structure render error:", err);
      setMolError(err?.message || "تعذر تحميل البنية ثلاثية الأبعاد");
    } finally {
      setIsLoadingMol(false);
    }
  };

  const loadCompound = async (nameToLoad?: string) => {
    const target = nameToLoad || compoundQuery.trim();
    if (!target) return;
    setIsLoadingCompound(true);
    setCompoundError(null);

    try {
      const res = await fetch(`/api/science/compound/${encodeURIComponent(target)}`);
      if (!res.ok) {
        throw new Error("لم يتم العثور على المركب في قاعدة بيانات PubChem");
      }
      const data: CompoundData = await res.json();
      setCompoundData(data);
    } catch (err: any) {
      setCompoundError(err?.message || "فشل جلب بيانات المركب");
    } finally {
      setIsLoadingCompound(false);
    }
  };

  const searchLiterature = async () => {
    if (!litQuery.trim()) return;
    setIsLoadingLit(true);
    try {
      const res = await fetch(`/api/science/literature?q=${encodeURIComponent(litQuery)}`);
      const data = await res.json();
      setPapers(data.papers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingLit(false);
    }
  };

  useEffect(() => {
    loadProtein('P04637');
    loadCompound('Caffeine');
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Science Studio Header Ribbon */}
      <div className="bg-gradient-to-r from-teal-900 via-sky-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-teal-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-400/40 text-teal-300 flex items-center justify-center font-bold text-xl shadow-inner">
            <Atom className="w-6 h-6 animate-spin duration-3000" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-400/20 text-teal-200 border border-teal-300/30">
                Google DeepMind Science Skills
              </span>
              <span className="text-xs text-sky-200 font-mono">3Dmol.js • PubChem • AlphaFold</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black mt-1">مختبر العلوم والفيزياء والكيمياء التفاعلي</h2>
            <p className="text-xs text-teal-100/90 mt-0.5">
              استكشاف البنى الجزيئية ثلاثية الأبعاد، محددات المركبات الكيميائية، والمعادلات العلمية
            </p>
          </div>
        </div>

        {/* Sub-Tab Navigation */}
        <div className="flex flex-wrap items-center gap-1.5 bg-black/30 p-1.5 rounded-2xl backdrop-blur-md border border-white/10 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setSubTab('3dmol')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              subTab === '3dmol' ? 'bg-teal-500 text-slate-950 shadow-sm font-black' : 'text-slate-200 hover:text-white'
            }`}
          >
            <Atom className="w-3.5 h-3.5" />
            <span>البنية ثلاثية الأبعاد (3Dmol)</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('compounds')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              subTab === 'compounds' ? 'bg-teal-500 text-slate-950 shadow-sm font-black' : 'text-slate-200 hover:text-white'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>المركبات الكيميائية (PubChem)</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('equations')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              subTab === 'equations' ? 'bg-teal-500 text-slate-950 shadow-sm font-black' : 'text-slate-200 hover:text-white'
            }`}
          >
            <Sigma className="w-3.5 h-3.5" />
            <span>مختبر القوانين والمعادلات</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('papers')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              subTab === 'papers' ? 'bg-teal-500 text-slate-950 shadow-sm font-black' : 'text-slate-200 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>الأوراق والبحوث (arXiv)</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: 3D MOLECULAR & PROTEIN VIEWER (3Dmol.js) */}
      {subTab === '3dmol' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white dark:bg-[#14201c] p-4 rounded-3xl border border-slate-200 dark:border-[#22352f] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input & Quick Example Pills */}
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="رمز البروتين (مثال: TP53, BRCA1, 1BNA, P04637)..."
                  value={proteinQuery}
                  onChange={(e) => setProteinQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') loadProtein();
                  }}
                  className="w-full pr-9 pl-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-[#22352f] bg-slate-50 dark:bg-[#182622] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-teal-500 uppercase"
                />
              </div>
              <button
                type="button"
                onClick={() => loadProtein()}
                disabled={isLoadingMol}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isLoadingMol ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>استكشاف البنية</span>
              </button>

              {/* Presets */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                {PRESET_PROTEINS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setProteinQuery(p.id);
                      loadProtein(p.id);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer shrink-0 ${
                      proteinQuery === p.id
                        ? 'bg-teal-50 dark:bg-teal-950 border-teal-500 text-teal-700 dark:text-teal-300'
                        : 'border-slate-200 dark:border-[#22352f] text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Display & Styling Controls */}
            <div className="flex items-center gap-2">
              <select
                value={molStyle}
                onChange={(e) => {
                  setMolStyle(e.target.value as any);
                  applyViewerStyles(viewerInstanceRef.current, e.target.value, colorScheme);
                }}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#22352f] bg-slate-50 dark:bg-[#182622] text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <option value="cartoon">كارتوني (Cartoon Ribbon)</option>
                <option value="stick">عصوي (Sticks)</option>
                <option value="sphere">كرات ونقاط (Spheres)</option>
                <option value="surface">سطحي (Surface VDW)</option>
              </select>

              <select
                value={colorScheme}
                onChange={(e) => {
                  setColorScheme(e.target.value as any);
                  applyViewerStyles(viewerInstanceRef.current, molStyle, e.target.value);
                }}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#22352f] bg-slate-50 dark:bg-[#182622] text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <option value="plddt">مقياس ثقة AlphaFold (pLDDT)</option>
                <option value="spectrum">طيف لوني (Spectrum)</option>
                <option value="chain">حسب السلاسل (Chains)</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  if (viewerInstanceRef.current) {
                    viewerInstanceRef.current.zoomTo();
                    viewerInstanceRef.current.render();
                  }
                }}
                className="p-2 rounded-xl border border-slate-200 dark:border-[#22352f] bg-slate-50 dark:bg-[#182622] text-slate-600 dark:text-slate-300 hover:text-teal-600 cursor-pointer"
                title="إعادة ضبط زاوية الرؤية"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Viewer & Data Inspector Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* 3D WebGL Canvas Viewport */}
            <div className="lg:col-span-8 bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-xl relative min-h-[460px] flex flex-col justify-between">
              <div
                ref={molViewerContainerRef}
                className="w-full h-[460px] relative select-none"
              />

              {/* In-Canvas Floating Legend for AlphaFold pLDDT 4-tier scale */}
              {colorScheme === 'plddt' && (
                <div className="absolute bottom-3 right-3 left-3 sm:left-auto bg-slate-900/90 backdrop-blur-md p-2.5 rounded-2xl border border-slate-700 text-[10px] text-slate-200 flex flex-wrap items-center gap-2.5 shadow-lg" dir="ltr">
                  <span className="font-bold text-white text-[11px]">pLDDT:</span>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0053D6]" />
                    <span>Very high (&gt;90)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#65CBF3]" />
                    <span>Confident (70-90)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FFDB13]" />
                    <span>Low (50-70)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF7D45]" />
                    <span>Very low (&lt;50)</span>
                  </div>
                </div>
              )}

              {isLoadingMol && (
                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-2">
                  <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
                  <p className="text-xs font-bold">جاري تحميل وتصيير إحداثيات البنية الجزيئية ثلاثية الأبعاد...</p>
                </div>
              )}

              {molError && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-rose-300 gap-2">
                  <p className="text-xs font-bold">{molError}</p>
                  <p className="text-[11px] text-slate-400">جرب كتابة رمز آخر مثل P04637 أو 1BNA</p>
                </div>
              )}
            </div>

            {/* Synchronized Molecular Metadata Inspector */}
            <div className="lg:col-span-4 bg-white dark:bg-[#14201c] rounded-3xl p-5 border border-slate-200 dark:border-[#22352f] shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#1e322b]">
                  <span className="text-xs font-bold text-teal-800 dark:text-teal-300">
                    بيانات البنية البيولوجية
                  </span>
                  {activeProtein?.source && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                      {activeProtein.source}
                    </span>
                  )}
                </div>

                {activeProtein ? (
                  <div className="space-y-2.5 text-xs">
                    <div>
                      <span className="text-slate-400 text-[11px] block">العنوان والتوصيف:</span>
                      <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm mt-0.5 leading-snug">
                        {activeProtein.title}
                      </h4>
                    </div>

                    {activeProtein.gene && (
                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#182622] flex items-center justify-between">
                        <span className="text-slate-500">اسم الجين:</span>
                        <span className="font-bold text-teal-700 dark:text-teal-300 font-mono">{activeProtein.gene}</span>
                      </div>
                    )}

                    {activeProtein.organism && (
                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#182622] flex items-center justify-between">
                        <span className="text-slate-500">الكائن الحي:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{activeProtein.organism}</span>
                      </div>
                    )}

                    {activeProtein.uniprotAccession && (
                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#182622] flex items-center justify-between">
                        <span className="text-slate-500">معرف UniProt:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100 font-mono">{activeProtein.uniprotAccession}</span>
                      </div>
                    )}

                    {/* Direct Links to Repositories */}
                    <div className="pt-2 border-t border-slate-100 dark:border-[#1e322b] space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500 block">المصادر الموثوقة:</span>
                      {activeProtein.uniprotAccession && (
                        <a
                          href={`https://www.uniprot.org/uniprotkb/${activeProtein.uniprotAccession}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 hover:bg-sky-100 transition-colors text-xs font-semibold"
                        >
                          <span>سجل UniProtKB الكامل</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {activeProtein.pdbUrl && (
                        <a
                          href={activeProtein.pdbUrl}
                          download
                          className="flex items-center justify-between p-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 hover:bg-teal-100 transition-colors text-xs font-semibold"
                        >
                          <span>تحميل ملف الإحداثيات (PDB)</span>
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">قم باختيار أو إدخال بروتين لعرض تفاصيله</p>
                )}
              </div>

              {/* Actions */}
              {activeProtein && onSendToChat && (
                <button
                  type="button"
                  onClick={() => onSendToChat(`اشرح لي بالتفصيل البنية البيولوجية والوظيفة الحيوية لبروتين ${activeProtein.title} (${activeProtein.gene || activeProtein.uniprotAccession || ''}) مع القوانين الحركية والارتباطات الإنزيمية.`)}
                  className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>سؤال المعلم الذكي عن هذا البروتين</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: CHEMISTRY COMPOUNDS (PubChem API) */}
      {subTab === 'compounds' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#14201c] p-4 rounded-3xl border border-slate-200 dark:border-[#22352f] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ابحث عن مركب كيميائي (مثل: Caffeine, Aspirin, Glucose)..."
                  value={compoundQuery}
                  onChange={(e) => setCompoundQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') loadCompound();
                  }}
                  className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#22352f] bg-slate-50 dark:bg-[#182622] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>
              <button
                type="button"
                onClick={() => loadCompound()}
                disabled={isLoadingCompound}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isLoadingCompound ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>بحث في PubChem</span>
              </button>

              {/* Presets */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                {PRESET_COMPOUNDS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => {
                      setCompoundQuery(c.name);
                      loadCompound(c.name);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer shrink-0 ${
                      compoundQuery === c.name
                        ? 'bg-teal-50 dark:bg-teal-950 border-teal-500 text-teal-700 dark:text-teal-300'
                        : 'border-slate-200 dark:border-[#22352f] text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Compound Card */}
          {compoundData ? (
            <div className="bg-white dark:bg-[#14201c] rounded-3xl p-6 border border-slate-200 dark:border-[#22352f] shadow-sm grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* 2D Structure Image */}
              <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-[#111c18] rounded-2xl border border-slate-200 dark:border-[#1d2f28]">
                {compoundData.structureImageUrl ? (
                  <img
                    src={compoundData.structureImageUrl}
                    alt={compoundData.name}
                    className="max-h-56 object-contain drop-shadow-md rounded-xl"
                  />
                ) : (
                  <FlaskConical className="w-20 h-20 text-slate-400" />
                )}
                <span className="text-[11px] font-bold text-slate-400 mt-3 font-mono">
                  PubChem CID: {compoundData.cid}
                </span>
              </div>

              {/* Detailed Specs */}
              <div className="md:col-span-8 space-y-3.5 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#1d2f28]">
                    <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
                      {compoundData.name}
                    </h3>
                    {compoundData.molecularFormula && (
                      <span className="text-sm font-black px-3 py-1 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-mono border border-teal-200 dark:border-teal-800">
                        {compoundData.molecularFormula}
                      </span>
                    )}
                  </div>

                  {compoundData.iupacName && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#182622] space-y-1">
                      <span className="text-[11px] font-bold text-slate-400 block">التسمية النظامية (IUPAC Name):</span>
                      <p className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 break-all" dir="ltr">
                        {compoundData.iupacName}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {compoundData.molecularWeight && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#182622] space-y-0.5">
                        <span className="text-[11px] font-bold text-slate-400">الكتلة المولية:</span>
                        <div className="font-mono font-bold text-sm text-teal-700 dark:text-teal-300">
                          {compoundData.molecularWeight} g/mol
                        </div>
                      </div>
                    )}

                    {compoundData.smiles && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#182622] space-y-0.5">
                        <span className="text-[11px] font-bold text-slate-400">الصيغة المبسطة (SMILES):</span>
                        <div className="font-mono text-xs text-slate-700 dark:text-slate-300 truncate" dir="ltr">
                          {compoundData.smiles}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Compound Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 dark:border-[#1d2f28]">
                  {onSendToChat && (
                    <button
                      type="button"
                      onClick={() => onSendToChat(`اشرح لي الخصائص الكيميائية والتفاعلات الأساسية لمركب ${compoundData.name} (${compoundData.molecularFormula || ''}) مع كتابة معادلات الاتزان والتفكك بصيغة KaTeX.`)}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>شرح التفاعلات عبر المعلم الذكي</span>
                    </button>
                  )}
                  {compoundData.sourceUrl && (
                    <a
                      href={compoundData.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 border border-slate-200 dark:border-[#22352f] text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-[#182622] flex items-center gap-1.5 transition-colors"
                    >
                      <span>صفحة المركب في PubChem</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 bg-white dark:bg-[#14201c] rounded-3xl border border-dashed border-slate-200 dark:border-[#22352f]">
              <FlaskConical className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-bold">ابحث عن مركب كيميائي لعرض صيغته وكتلته وتسميته من PubChem</p>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: SCIENTIFIC EQUATIONS & FORMULAS LAB (KaTeX) */}
      {subTab === 'equations' && (
        <div className="bg-white dark:bg-[#14201c] rounded-3xl p-6 border border-slate-200 dark:border-[#22352f] shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#22352f]">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sigma className="w-5 h-5 text-teal-600" />
                <span>موسوعة القوانين والمعادلات العلمية الأساسية</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                معادلات الفيزياء والكيمياء والرياضيات بصيغة LaTeX الرياضية المعيارية مع وحدات القياس (SI)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Physics Laws */}
            <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#16231e] border border-slate-200/80 dark:border-[#1d2f28] space-y-3">
              <h4 className="font-bold text-xs text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-teal-600" />
                <span>قوانين الميكانيكا والحركة (الفيزياء)</span>
              </h4>
              <div className="space-y-2 text-xs">
                <div className="p-3 bg-white dark:bg-[#101915] rounded-xl border border-slate-200/60 dark:border-[#22352f]">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">السرعة المتجهة المتوسطة والتسارع:</span>
                  <EducationalContent content="$$v = \frac{\Delta d}{\Delta t} \quad , \quad a = \frac{\Delta v}{\Delta t}$$" />
                </div>
                <div className="p-3 bg-white dark:bg-[#101915] rounded-xl border border-slate-200/60 dark:border-[#22352f]">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">قانون نيوتن الثاني في الحركة والقوة:</span>
                  <EducationalContent content="$$F = m \cdot a \quad \Longleftrightarrow \quad \text{القوة} = \text{الكتلة} \times \text{التسارع}$$" />
                </div>
                <div className="p-3 bg-white dark:bg-[#101915] rounded-xl border border-slate-200/60 dark:border-[#22352f]">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">طاقة الحركة والشغل الميكانيكي:</span>
                  <EducationalContent content="$$KE = \frac{1}{2} m v^2 \quad , \quad W = F \cdot d \cdot \cos(\theta)$$" />
                </div>
                <div className="p-3 bg-white dark:bg-[#101915] rounded-xl border border-slate-200/60 dark:border-[#22352f]">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">تكافؤ الكتلة والطاقة (أينشتاين):</span>
                  <EducationalContent content="$$E = m \cdot c^2 \quad (c \approx 3 \times 10^8 \text{ m/s})$$" />
                </div>
              </div>
            </div>

            {/* Chemistry & Electromagnetism Laws */}
            <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#16231e] border border-slate-200/80 dark:border-[#1d2f28] space-y-3">
              <h4 className="font-bold text-xs text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
                <FlaskConical className="w-4 h-4 text-sky-600" />
                <span>الكيمياء الفيزيائية والكهرباء</span>
              </h4>
              <div className="space-y-2 text-xs">
                <div className="p-3 bg-white dark:bg-[#101915] rounded-xl border border-slate-200/60 dark:border-[#22352f]">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">ثابت الاتزان الكيميائي (Kc):</span>
                  <EducationalContent content="$$K_c = \frac{[C]^c [D]^d}{[A]^a [B]^b}$$" />
                </div>
                <div className="p-3 bg-white dark:bg-[#101915] rounded-xl border border-slate-200/60 dark:border-[#22352f]">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">الرقم الهيدروجيني وحاصل تأين الماء:</span>
                  <EducationalContent content="$$\text{pH} = -\log_{10}[H^+] \quad , \quad K_w = [H^+][OH^-] = 1.0 \times 10^{-14}$$" />
                </div>
                <div className="p-3 bg-white dark:bg-[#101915] rounded-xl border border-slate-200/60 dark:border-[#22352f]">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">قانون أوم في الدوائر الكهربائية:</span>
                  <EducationalContent content="$$V = I \cdot R \quad \Longleftrightarrow \quad \text{الجهد} = \text{التيار} \times \text{المقاومة}$$" />
                </div>
                <div className="p-3 bg-white dark:bg-[#101915] rounded-xl border border-slate-200/60 dark:border-[#22352f]">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">قانون كولوم للقوى الكهربائية الساكنة:</span>
                  <EducationalContent content="$$F_e = k_e \frac{|q_1 q_2|}{r^2} \quad (k_e \approx 8.99 \times 10^9 \text{ N}\cdot\text{m}^2/\text{C}^2)$$" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: SCIENTIFIC PAPERS & LITERATURE (arXiv) */}
      {subTab === 'papers' && (
        <div className="bg-white dark:bg-[#14201c] rounded-3xl p-6 border border-slate-200 dark:border-[#22352f] shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#22352f]">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-teal-600" />
                <span>محرك استكشاف البحوث والأوراق العلمية (arXiv)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                البحث المباشر في أحدث الأوراق العلمية والأكاديمية العالمية مفتوحة المصدر
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="موضوع البحث (CRISPR, Quantum, Relativity)..."
                value={litQuery}
                onChange={(e) => setLitQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') searchLiterature();
                }}
                className="px-3.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[#22352f] bg-slate-50 dark:bg-[#182622] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-teal-500 w-64"
              />
              <button
                type="button"
                onClick={searchLiterature}
                disabled={isLoadingLit}
                className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isLoadingLit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>بحث</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {papers.length === 0 && !isLoadingLit ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <BookOpen className="w-10 h-10 mx-auto opacity-50" />
                <p className="text-xs font-semibold">اضغط بحث لاستعراض أحدث الأوراق العلمية المحكمة</p>
              </div>
            ) : (
              papers.map((paper, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#16231e] border border-slate-200/80 dark:border-[#1d2f28] space-y-2 hover:border-teal-500 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 leading-snug">
                      {paper.title}
                    </h4>
                    {paper.published && (
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {paper.published}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                    {paper.summary}
                  </p>
                  <div className="pt-2 border-t border-slate-200/60 dark:border-[#22352f] flex items-center justify-between gap-2">
                    <a
                      href={paper.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-bold flex items-center gap-1"
                    >
                      <span>قراءة الورقة الكاملة في arXiv</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    {onSendToChat && (
                      <button
                        type="button"
                        onClick={() => onSendToChat(`لخص واشرح لي الورقة العلمية "${paper.title}" وما هي أبرز استنتاجاتها العلمية ومصطلحاتها الرئيسية.`)}
                        className="px-3 py-1 bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 rounded-lg text-xs font-bold hover:bg-teal-100 flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>تلخيص بالمعلم الذكي</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
