import React, { useState, useRef } from 'react';
import { 
  Upload, 
  HardDrive, 
  Globe, 
  FileText, 
  Trash2, 
  Eye, 
  Plus, 
  Loader2, 
  BookOpen, 
  ExternalLink, 
  X,
  Search,
  Check
} from 'lucide-react';
import { Source, SourceChunk } from '../types';
import { extractTextFromPDF } from '../lib/pdfExtractor';
import { chunkText } from '../lib/documentParser';
import { storeFileBlob } from '../lib/storage';
import { GoogleDrivePickerModal } from './GoogleDrivePickerModal';

interface SourcesViewProps {
  sources: Source[];
  chunks: SourceChunk[];
  currentNotebookId: string;
  onAddSource: (source: Source, chunks: SourceChunk[]) => void;
  onDeleteSource: (sourceId: string) => void;
  onOpenGoogleDrive: () => void;
  isDriveModalOpen: boolean;
  onCloseDriveModal: () => void;
}

export const SourcesView: React.FC<SourcesViewProps> = ({
  sources,
  chunks,
  currentNotebookId,
  onAddSource,
  onDeleteSource,
  onOpenGoogleDrive,
  isDriveModalOpen,
  onCloseDriveModal,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'gdrive' | 'url' | 'paste'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [previewSource, setPreviewSource] = useState<Source | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsLoading(true);
    for (const file of files) {
      try {
        setStatusMessage(`جاري قراءة وتجهيز: ${file.name}...`);
        const sourceId = `src_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        let textContent = '';
        let pageCount = 1;
        let pages: any[] | undefined = undefined;

        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
          const res = await extractTextFromPDF(file, (p) => setStatusMessage(p.status));
          textContent = res.fullText;
          pages = res.pages;
          pageCount = res.totalPages;
          await storeFileBlob(sourceId, file, { name: file.name, type: file.type, notebookId: currentNotebookId });
        } else {
          textContent = await file.text();
        }

        const generatedChunks = chunkText(textContent, sourceId, file.name, currentNotebookId);
        const newSource: Source = {
          id: sourceId,
          notebookId: currentNotebookId,
          title: file.name,
          type: file.type || 'text/plain',
          size: file.size,
          status: 'Ready',
          content: textContent,
          pages,
          pageCount,
          wordCount: textContent.split(/\s+/).filter(Boolean).length,
          lineCount: textContent.split('\n').length,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          localFileId: sourceId,
        };

        onAddSource(newSource, generatedChunks);
      } catch (err: any) {
        console.error("File upload error:", err);
        alert(`فشل رفع ${file.name}: ${err?.message || err}`);
      }
    }

    setIsLoading(false);
    setStatusMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFetchUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setIsLoading(true);
    setStatusMessage('جاري استيراد محتوى الرابط بالذكاء الاصطناعي...');

    try {
      const sourceId = `src_url_${Date.now()}`;
      const title = urlTitle.trim() || urlInput.replace(/^https?:\/\//, '').slice(0, 30);
      const res = await fetch(urlInput);
      const text = await res.text();

      const newSource: Source = {
        id: sourceId,
        notebookId: currentNotebookId,
        title,
        uri: urlInput,
        type: 'text/html',
        size: text.length,
        status: 'Ready',
        content: text.slice(0, 30000),
        wordCount: text.split(/\s+/).filter(Boolean).length,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const generatedChunks = chunkText(newSource.content, sourceId, title, currentNotebookId);
      onAddSource(newSource, generatedChunks);
      setUrlInput('');
      setUrlTitle('');
    } catch (err: any) {
      alert(`فشل جلب الرابط: ${err.message || 'خطأ في الشبكة'}`);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteText.trim()) return;

    const sourceId = `src_paste_${Date.now()}`;
    const title = pasteTitle.trim() || `مستند ملصق (${new Date().toLocaleTimeString('ar-SA')})`;
    const content = pasteText.trim();

    const generatedChunks = chunkText(content, sourceId, title, currentNotebookId);
    const newSource: Source = {
      id: sourceId,
      notebookId: currentNotebookId,
      title,
      type: 'text/plain',
      size: content.length,
      status: 'Ready',
      content,
      wordCount: content.split(/\s+/).filter(Boolean).length,
      lineCount: content.split('\n').length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    onAddSource(newSource, generatedChunks);
    setPasteTitle('');
    setPasteText('');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header and Add Sources Box */}
      <div className="bg-white dark:bg-[#14201c] rounded-3xl border border-slate-200 dark:border-[#22352f] p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#22352f]">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-teal-600" />
              <span>إدارة المصادر والمستندات والكتب</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              أضف كتب ومحاضرات ومستندات دراسية لاستخدامها في البحث وتوليد الإجابات الدقيقة (RAG)
            </p>
          </div>
          <div className="text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-3 py-1 rounded-xl">
            {sources.length} مصادر مضافة • {chunks.length} مقاطع معرفية
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'upload' ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-50 dark:bg-[#182622] text-slate-600 dark:text-slate-300'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>رفع ملف (PDF / Word)</span>
          </button>

          <button
            type="button"
            onClick={onOpenGoogleDrive}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer bg-slate-50 dark:bg-[#182622] hover:bg-teal-50 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#243932]`}
          >
            <HardDrive className="w-3.5 h-3.5 text-teal-600" />
            <span>استيراد من Google Drive</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'url' ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-50 dark:bg-[#182622] text-slate-600 dark:text-slate-300'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>رابط ويب (URL)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'paste' ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-50 dark:bg-[#182622] text-slate-600 dark:text-slate-300'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>لصق نص مباشر</span>
          </button>
        </div>

        {/* Tab 1: File Upload */}
        {activeTab === 'upload' && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-teal-500/40 hover:border-teal-600 rounded-3xl p-8 text-center cursor-pointer bg-teal-50/20 dark:bg-teal-950/10 hover:bg-teal-50/40 transition-all space-y-3"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="application/pdf,.pdf,.doc,.docx,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center mx-auto shadow-md shadow-teal-600/20">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-slate-100">
                اضغط لاختيار ملفات الكتب أو اسحبها هنا
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                يدعم كتب وملازم PDF، ومستندات Word، والمذكرات النصية مع قراءة متعددة الصفحات.
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: URL */}
        {activeTab === 'url' && (
          <form onSubmit={handleFetchUrl} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="عنوان المستند (اختياري)..."
                value={urlTitle}
                onChange={(e) => setUrlTitle(e.target.value)}
                className="px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#22352f] bg-slate-50 dark:bg-[#182622] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-teal-500"
              />
              <input
                type="url"
                required
                placeholder="https://example.com/article..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="sm:col-span-2 px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#22352f] bg-slate-50 dark:bg-[#182622] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                <span>استيراد الرابط</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Paste Text */}
        {activeTab === 'paste' && (
          <form onSubmit={handlePasteSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="عنوان المستند..."
              value={pasteTitle}
              onChange={(e) => setPasteTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#22352f] bg-slate-50 dark:bg-[#182622] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-teal-500"
            />
            <textarea
              rows={4}
              required
              placeholder="الصق نصوص الدرس أو المحاضرة هنا..."
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-[#22352f] bg-slate-50 dark:bg-[#182622] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-teal-500 resize-none"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                إضافة كنص دراسي
              </button>
            </div>
          </form>
        )}

        {statusMessage && (
          <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 text-xs font-bold flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* Sources List Grid */}
      <div className="space-y-3">
        <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
          المصادر الحالية المعتمدة ({sources.length}):
        </h3>

        {sources.length === 0 ? (
          <div className="bg-white dark:bg-[#14201c] rounded-3xl border border-dashed border-slate-200 dark:border-[#22352f] p-10 text-center text-slate-400 space-y-2">
            <FileText className="w-10 h-10 mx-auto opacity-50" />
            <p className="text-xs font-bold">لا توجد مصادر في هذا الدفتر حتى الآن.</p>
            <p className="text-[11px]">ارفع ملف PDF أو استورد من Google Drive للبدء.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sources.map((src) => {
              const isPdf = src.type.includes('pdf') || src.title.endsWith('.pdf');
              return (
                <div
                  key={src.id}
                  className="bg-white dark:bg-[#14201c] rounded-2xl border border-slate-200 dark:border-[#22352f] p-4 shadow-2xs hover:border-teal-500 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        isPdf ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' : 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300'
                      }`}>
                        {isPdf ? 'مستند PDF' : 'نص'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {src.pageCount ? `${src.pageCount} صفحة` : `${src.wordCount || 0} كلمة`}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug" title={src.title}>
                      {src.title}
                    </h4>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {src.content.slice(0, 160)}...
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-[#22352f] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewSource(src)}
                      className="px-2.5 py-1 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 text-teal-700 dark:text-teal-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>قراءة ومعاينة</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteSource(src.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                      title="حذف المصدر"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Google Drive Picker Modal */}
      <GoogleDrivePickerModal
        isOpen={isDriveModalOpen}
        onClose={onCloseDriveModal}
        currentNotebookId={currentNotebookId}
        onAddSource={onAddSource}
      />

      {/* Preview Reader Modal */}
      {previewSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150" dir="rtl">
          <div className="bg-white dark:bg-[#14201c] w-full max-w-3xl h-[85vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-[#22352f] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-[#22352f] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-teal-600" />
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate max-w-md">
                  {previewSource.title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewSource(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap select-text font-serif">
              {previewSource.content}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
