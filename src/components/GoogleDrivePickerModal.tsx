import React, { useState, useEffect } from 'react';
import { 
  X, 
  FolderDown, 
  Search, 
  FileText, 
  Loader2, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  FileSpreadsheet, 
  FileCode, 
  HardDrive,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { listGoogleDriveFiles, downloadGoogleDriveFile, GoogleDriveFile } from '../lib/googleDriveService';
import { getAccessToken, signInWithGoogle } from '../lib/firebase';
import { extractTextFromPDF } from '../lib/pdfExtractor';
import { chunkText } from '../lib/documentParser';
import { storeFileBlob } from '../lib/storage';
import { Source, SourceChunk } from '../types';

interface GoogleDrivePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentNotebookId: string;
  onAddSource: (source: Source, chunks: SourceChunk[]) => void;
}

export const GoogleDrivePickerModal: React.FC<GoogleDrivePickerModalProps> = ({
  isOpen,
  onClose,
  currentNotebookId,
  onAddSource,
}) => {
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importingFileId, setImportingFileId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [needsAuth, setNeedsAuth] = useState(false);

  const fetchFiles = async (query = "") => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getAccessToken();
      if (!token) {
        setNeedsAuth(true);
        setIsLoading(false);
        return;
      }
      setNeedsAuth(false);
      const items = await listGoogleDriveFiles(query);
      setFiles(items);
    } catch (err: any) {
      console.error("Error listing Drive files:", err);
      setError(err?.message || "فشل جلب ملفات Google Drive");
      if (err?.message?.includes("تسجيل الدخول") || err?.message?.includes("صلاحية")) {
        setNeedsAuth(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFiles();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      setNeedsAuth(false);
      await fetchFiles();
    } catch (err: any) {
      setError(err?.message || "فشل تسجيل الدخول بواسطة Google");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportFile = async (file: GoogleDriveFile) => {
    setImportingFileId(file.id);
    setStatusMessage(`جاري تحميل "${file.name}" من Google Drive...`);
    try {
      const downloaded = await downloadGoogleDriveFile(file);
      const sourceId = `src_gdrive_${Date.now()}`;
      let textContent = downloaded.content;
      let pages: any[] | undefined = undefined;
      let pageCount = 1;

      // If PDF blob returned, extract full text and pages with OCR support
      if (downloaded.blob && (downloaded.mimeType === 'application/pdf' || file.name.endsWith('.pdf'))) {
        setStatusMessage(`جاري استخراج نصوص صفحات PDF بالذكاء الاصطناعي...`);
        const pdfResult = await extractTextFromPDF(downloaded.blob, (p) => {
          setStatusMessage(p.status);
        });
        textContent = pdfResult.fullText;
        pages = pdfResult.pages;
        pageCount = pdfResult.totalPages;
        await storeFileBlob(sourceId, downloaded.blob, { name: file.name, type: 'application/pdf', notebookId: currentNotebookId });
      }

      const chunks = chunkText(textContent, sourceId, file.name, currentNotebookId);
      const newSource: Source = {
        id: sourceId,
        notebookId: currentNotebookId,
        title: file.name,
        type: downloaded.mimeType,
        size: downloaded.blob?.size || textContent.length,
        status: 'Ready',
        content: textContent,
        pages,
        pageCount,
        wordCount: textContent.split(/\s+/).filter(Boolean).length,
        lineCount: textContent.split('\n').length,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        localFileId: sourceId,
        uri: file.webViewLink,
      };

      onAddSource(newSource, chunks);
      setStatusMessage(`تم استيراد "${file.name}" بنجاح!`);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error("Import error:", err);
      setError(`فشل استيراد الملف: ${err.message || err}`);
    } finally {
      setImportingFileId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150" dir="rtl">
      <div className="bg-white dark:bg-[#14201c] w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-[#22352f] flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-[#22352f] flex items-center justify-between bg-gradient-to-r from-teal-500/10 via-transparent to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>استيراد ملفات من Google Drive</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                  Google Workspace
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                تصفح واستورد مستنداتك وكتب PDF مباشرة إلى دفترك الدراسي
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1c2c26] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Actions Bar */}
        {!needsAuth && (
          <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-[#22352f] flex items-center gap-2 bg-slate-50/60 dark:bg-[#101915]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="البحث بالاسم في Google Drive..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') fetchFiles(searchQuery);
                }}
                className="w-full pr-9 pl-3 py-2 bg-white dark:bg-[#14201c] border border-slate-200 dark:border-[#22352f] rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-teal-600"
              />
            </div>
            <button
              type="button"
              onClick={() => fetchFiles(searchQuery)}
              disabled={isLoading}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">تحديث</span>
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {needsAuth ? (
            <div className="py-12 text-center space-y-4 max-w-sm mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto shadow-inner">
                <HardDrive className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-base text-slate-800 dark:text-slate-100">
                  ربط حساب Google Drive
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  يسمح للمنصة بالوصول بإذن منك إلى ملفاتك ومستنداتك التعليمية لإدراجها في مساحتك الدراسية.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignIn}
                disabled={isLoading}
                className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <HardDrive className="w-4 h-4" />}
                <span>تسجيل الدخول والربط بـ Google Drive</span>
              </button>
            </div>
          ) : isLoading && files.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500">جاري قراءة ملفات Google Drive...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <div className="flex-1">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => fetchFiles()}
                  className="block mt-1 font-bold underline hover:opacity-80"
                >
                  إعادة المحاولة
                </button>
              </div>
            </div>
          ) : files.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <FileText className="w-10 h-10 mx-auto opacity-50" />
              <p className="text-xs font-semibold">لم يتم العثور على ملفات مطابقة في Google Drive.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {files.map((file) => {
                const isPdf = file.mimeType.includes("pdf") || file.name.endsWith(".pdf");
                const isDoc = file.mimeType.includes("document");
                const isSheet = file.mimeType.includes("spreadsheet");
                const isImporting = importingFileId === file.id;

                return (
                  <div
                    key={file.id}
                    className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-[#15231e] border border-slate-200/80 dark:border-[#22352f] hover:border-teal-500 transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#1a2d26] border border-slate-200 dark:border-[#253d34] flex items-center justify-center shrink-0 shadow-2xs">
                        {isPdf ? (
                          <FileText className="w-4 h-4 text-rose-500" />
                        ) : isDoc ? (
                          <FileCode className="w-4 h-4 text-sky-500" />
                        ) : isSheet ? (
                          <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <FileText className="w-4 h-4 text-teal-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 truncate" title={file.name}>
                          {file.name}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span>{isPdf ? "PDF" : isDoc ? "Google Doc" : isSheet ? "Google Sheet" : "ملف"}</span>
                          {file.size && <span>• {Math.round(Number(file.size) / 1024)} KB</span>}
                          {file.modifiedTime && <span>• {new Date(file.modifiedTime).toLocaleDateString("ar-SA")}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {file.webViewLink && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-slate-400 hover:text-teal-600 transition-colors"
                          title="عرض في Google Drive"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleImportFile(file)}
                        disabled={isImporting}
                        className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                      >
                        {isImporting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>استيراد...</span>
                          </>
                        ) : (
                          <>
                            <FolderDown className="w-3.5 h-3.5" />
                            <span>استيراد للدفتر</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Status bar */}
        {statusMessage && (
          <div className="px-5 py-2.5 bg-teal-50 dark:bg-teal-950/70 border-t border-teal-200 dark:border-teal-800 text-xs font-bold text-teal-800 dark:text-teal-200 flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
