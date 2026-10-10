import React, { useState } from 'react';
import { 
  BookOpen, 
  MessageSquare, 
  FileText, 
  Sparkles, 
  Atom, 
  Calculator, 
  Plus, 
  Check, 
  Trash2, 
  X, 
  HardDrive, 
  FolderPlus,
  Radio,
  Layers,
  GraduationCap
} from 'lucide-react';
import { Notebook } from '../types';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  notebooks: Notebook[];
  currentNotebook: Notebook;
  onSelectNotebook: (id: string) => void;
  onCreateNotebook: (name: string, subject: string, desc: string) => void;
  onDeleteNotebook: (id: string) => void;
  onOpenGoogleDrive: () => void;
  onOpenLiveVoice: () => void;
  isOpen: boolean;
  onClose: () => void;
  sourceCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  notebooks,
  currentNotebook,
  onSelectNotebook,
  onCreateNotebook,
  onDeleteNotebook,
  onOpenGoogleDrive,
  onOpenLiveVoice,
  isOpen,
  onClose,
  sourceCount,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newNbName, setNewNbName] = useState('');
  const [newNbSubject, setNewNbSubject] = useState('');
  const [newNbDesc, setNewNbDesc] = useState('');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNbName.trim()) return;
    onCreateNotebook(newNbName.trim(), newNbSubject.trim() || 'عام', newNbDesc.trim());
    setNewNbName('');
    setNewNbSubject('');
    setNewNbDesc('');
    setShowCreateModal(false);
  };

  const navItems = [
    { id: 'home', label: 'الرئيسية والمتابعة', icon: BookOpen },
    { id: 'chat', label: 'المعلم الذكي (Gemini)', icon: MessageSquare, badge: 'AI' },
    { id: 'sources', label: 'المصادر والكتب', icon: FileText, count: sourceCount },
    { id: 'studio', label: 'استوديو المذاكرة والتلخيص', icon: Sparkles },
    { id: 'science', label: 'مختبر العلوم والتصوير 3D', icon: Atom, badge: '3D' },
    { id: 'tools', label: 'الأدوات والحاسبة العلمية', icon: Calculator },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 right-0 z-50 w-72 bg-white dark:bg-[#121b18] border-l border-slate-200/90 dark:border-[#22352f] flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full'
        } lg:static lg:w-64 xl:w-72 lg:z-10`}
      >
        {/* Brand App Header */}
        <div className="p-4 border-b border-slate-200/80 dark:border-[#22352f] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-700 via-teal-600 to-emerald-500 text-white flex items-center justify-center font-black text-lg shadow-md shadow-teal-700/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="font-black text-base text-slate-800 dark:text-slate-100 leading-tight">
                المعلم الذكي
              </div>
              <div className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">
                Smart Scholar AI • NotebookLM
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Notebook Selector Card */}
        <div className="p-3 border-b border-slate-200/80 dark:border-[#22352f]">
          <div className="p-3 bg-slate-50 dark:bg-[#182622] rounded-2xl border border-slate-200/80 dark:border-[#243a33] space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold">
              <span>الدفتر الدراسي الحالي:</span>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                title="إنشاء دفتر جديد"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>دفتر جديد</span>
              </button>
            </div>

            <div className="truncate">
              <div className="font-extrabold text-sm text-slate-800 dark:text-slate-100 truncate">
                {currentNotebook.name}
              </div>
              <div className="text-[11px] text-teal-600 dark:text-teal-400 truncate mt-0.5">
                {currentNotebook.subject}
              </div>
            </div>

            {/* Google Drive and Live voice shortcuts */}
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                type="button"
                onClick={onOpenGoogleDrive}
                className="py-1.5 px-2 bg-white dark:bg-[#121c19] hover:bg-teal-50 dark:hover:bg-teal-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <HardDrive className="w-3 h-3 text-teal-600" />
                <span>Google Drive</span>
              </button>
              <button
                type="button"
                onClick={onOpenLiveVoice}
                className="py-1.5 px-2 bg-white dark:bg-[#121c19] hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <Radio className="w-3 h-3 text-emerald-500" />
                <span>صوت حي</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#0f766e] text-white shadow-md shadow-teal-700/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#182622] hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-teal-600 dark:text-teal-400'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {item.count !== undefined && item.count > 0 && (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-bold font-mono ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-[#1a2d26] text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200/80 dark:border-[#22352f] text-center text-[10px] text-slate-400">
          <span>منصة المعلم الذكية 2026 • مدعوم بنماذج Gemini</span>
        </div>
      </aside>

      {/* Create Notebook Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150" dir="rtl">
          <div className="bg-white dark:bg-[#14201c] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-[#22352f] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#22352f]">
              <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-teal-600" />
                <span>إنشاء دفتر دراسي جديد</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  اسم الدفتر:
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: الكيمياء العضوية، ميكانيكا الكم..."
                  value={newNbName}
                  onChange={(e) => setNewNbName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#22352f] bg-slate-50 dark:bg-[#182622] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-teal-600"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  المادة / التخصص الأكاديمي:
                </label>
                <input
                  type="text"
                  placeholder="مثال: فيزياء، كيمياء، أحياء، رياضيات..."
                  value={newNbSubject}
                  onChange={(e) => setNewNbSubject(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#22352f] bg-slate-50 dark:bg-[#182622] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  الوصف أو الأهداف التعليمية:
                </label>
                <textarea
                  rows={3}
                  placeholder="وصف مختصر لمحتوى الدفتر..."
                  value={newNbDesc}
                  onChange={(e) => setNewNbDesc(e.target.value)}
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-[#22352f] bg-slate-50 dark:bg-[#182622] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-teal-600 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-[#182622] cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  إنشاء الدفتر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
