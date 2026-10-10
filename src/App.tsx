import React, { useState, useEffect } from 'react';
import { 
  loadAppState, 
  saveAppState, 
  syncToFirestore, 
  AppState 
} from './lib/storage';
import { 
  Notebook, 
  Source, 
  SourceChunk, 
  ChatSession, 
  ChatMessage, 
  Flashcard, 
  TodoItem, 
  NoteItem, 
  FocusSession,
  UserProfile 
} from './types';
import { 
  BookOpen, 
  MessageSquare, 
  FileText, 
  Sparkles, 
  Atom, 
  Calculator 
} from 'lucide-react';
import { initAuth, signInWithGoogle, logoutUser } from './lib/firebase';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { HomeView } from './components/HomeView';
import { ChatView } from './components/ChatView';
import { SourcesView } from './components/SourcesView';
import { StudyStudioView } from './components/StudyStudioView';
import { ScienceStudio } from './components/ScienceStudio';
import { ToolsView } from './components/ToolsView';
import { LiveVoiceDialog } from './components/LiveVoiceDialog';
import { GoogleDrivePickerModal } from './components/GoogleDrivePickerModal';

export function App() {
  const [appState, setAppState] = useState<AppState>(() => loadAppState());
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(appState.userProfile || null);

  // Sync state to localStorage on every change
  useEffect(() => {
    saveAppState(appState);
    // Background sync to Cloud Firestore if user is authenticated
    if (userProfile) {
      syncToFirestore(appState).catch(() => {});
    }
  }, [appState, userProfile]);

  // Dark Mode Class Management on html tag
  useEffect(() => {
    if (appState.settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [appState.settings.theme]);

  // Initialize Firebase Auth listener on app boot
  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        const profile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'طالب متميز',
          photoURL: user.photoURL || undefined,
        };
        setUserProfile(profile);
        setAppState((prev) => ({ ...prev, userProfile: profile }));
      },
      () => {
        setUserProfile(null);
        setAppState((prev) => ({ ...prev, userProfile: null }));
      }
    );

    return () => unsubscribe();
  }, []);

  // Theme Toggle
  const handleToggleTheme = () => {
    const nextTheme = appState.settings.theme === 'dark' ? 'light' : 'dark';
    setAppState((prev) => ({
      ...prev,
      settings: { ...prev.settings, theme: nextTheme },
    }));
  };

  // Google Sign-in Handler
  const handleSignInGoogle = async () => {
    try {
      const res = await signInWithGoogle();
      const profile: UserProfile = {
        uid: res.user.uid,
        email: res.user.email || '',
        displayName: res.user.displayName || 'طالب متميز',
        photoURL: res.user.photoURL || undefined,
      };
      setUserProfile(profile);
      setAppState((prev) => ({ ...prev, userProfile: profile }));
    } catch (err) {
      console.error("Sign-in error:", err);
    }
  };

  // Google Sign-out Handler
  const handleSignOutGoogle = async () => {
    await logoutUser();
    setUserProfile(null);
    setAppState((prev) => ({ ...prev, userProfile: null }));
  };

  // Current Notebook resolution
  const currentNotebook = appState.notebooks.find(
    (n) => n.id === appState.currentNotebookId
  ) || appState.notebooks[0];

  // Scoped notebook sources & sessions
  const notebookSources = appState.sources.filter(
    (s) => s.notebookId === currentNotebook.id
  );
  const notebookChunks = appState.chunks.filter(
    (c) => c.notebookId === currentNotebook.id
  );
  const notebookSessions = appState.chatSessions.filter(
    (s) => s.notebookId === currentNotebook.id
  );
  const currentChatSession = notebookSessions[0] || {
    id: `chat_${currentNotebook.id}_default`,
    notebookId: currentNotebook.id,
    title: 'محادثة المعلم الذكي',
    created: Date.now(),
    updated: Date.now(),
    messages: [],
  };
  const notebookNotes = appState.notes.filter(
    (n) => n.notebookId === currentNotebook.id
  );
  const notebookFlashcards = appState.flashcards.filter(
    (f) => f.notebookId === currentNotebook.id
  );
  const notebookTodos = appState.todos.filter(
    (t) => t.notebookId === currentNotebook.id
  );
  const notebookFocusSessions = appState.focusSessions.filter(
    (f) => f.notebookId === currentNotebook.id
  );

  // Notebook Handlers
  const handleSelectNotebook = (id: string) => {
    setAppState((prev) => ({ ...prev, currentNotebookId: id }));
  };

  const handleCreateNotebook = (name: string, subject: string, description: string) => {
    const newId = `nb_${Date.now()}`;
    const newNb: Notebook = {
      id: newId,
      name,
      subject,
      description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sourceIds: [],
      noteIds: [],
      chatSessionIds: [`chat_${newId}_1`],
      progress: 0,
    };

    const newSession: ChatSession = {
      id: `chat_${newId}_1`,
      notebookId: newId,
      title: 'محادثة تعليمية جديدة',
      created: Date.now(),
      updated: Date.now(),
      messages: [
        {
          id: `msg_${Date.now()}`,
          role: 'ai',
          text: `أهلاً بك في دفتر **${name}**! يمكنك الآن رفع الكتب الدراسية أو استيرادها من Google Drive للبدء فوراً.`,
          date: Date.now(),
          notebookId: newId,
          sessionId: `chat_${newId}_1`,
          modelUsed: 'gemini-3.5-flash',
        },
      ],
    };

    setAppState((prev) => ({
      ...prev,
      notebooks: [...prev.notebooks, newNb],
      currentNotebookId: newId,
      chatSessions: [...prev.chatSessions, newSession],
    }));
  };

  const handleDeleteNotebook = (id: string) => {
    if (appState.notebooks.length <= 1) {
      alert("لا يمكن حذف الدفتر الوحيد المتبقي.");
      return;
    }
    const remaining = appState.notebooks.filter((n) => n.id !== id);
    setAppState((prev) => ({
      ...prev,
      notebooks: remaining,
      currentNotebookId: remaining[0].id,
      sources: prev.sources.filter((s) => s.notebookId !== id),
      chunks: prev.chunks.filter((c) => c.notebookId !== id),
      chatSessions: prev.chatSessions.filter((cs) => cs.notebookId !== id),
      notes: prev.notes.filter((n) => n.notebookId !== id),
      flashcards: prev.flashcards.filter((f) => f.notebookId !== id),
      todos: prev.todos.filter((t) => t.notebookId !== id),
      focusSessions: prev.focusSessions.filter((fs) => fs.notebookId !== id),
    }));
  };

  // Sources Handlers
  const handleAddSource = (source: Source, chunks: SourceChunk[]) => {
    setAppState((prev) => ({
      ...prev,
      sources: [source, ...prev.sources.filter((s) => s.id !== source.id)],
      chunks: [...prev.chunks.filter((c) => c.sourceId !== source.id), ...chunks],
    }));
  };

  const handleDeleteSource = (sourceId: string) => {
    setAppState((prev) => ({
      ...prev,
      sources: prev.sources.filter((s) => s.id !== sourceId),
      chunks: prev.chunks.filter((c) => c.sourceId !== sourceId),
    }));
  };

  // Chat Sessions Handlers
  const handleSelectSession = (sessionId: string) => {
    setAppState((prev) => {
      const idx = prev.chatSessions.findIndex((s) => s.id === sessionId);
      if (idx === -1) return prev;
      const target = prev.chatSessions[idx];
      const rest = prev.chatSessions.filter((s) => s.id !== sessionId);
      return { ...prev, chatSessions: [target, ...rest] };
    });
  };

  const handleNewSession = () => {
    const newSessionId = `chat_${currentNotebook.id}_${Date.now()}`;
    const newSession: ChatSession = {
      id: newSessionId,
      notebookId: currentNotebook.id,
      title: `محادثة ${new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`,
      created: Date.now(),
      updated: Date.now(),
      messages: [],
    };
    setAppState((prev) => ({
      ...prev,
      chatSessions: [newSession, ...prev.chatSessions],
    }));
  };

  const handleDeleteSession = (sessionId: string) => {
    setAppState((prev) => ({
      ...prev,
      chatSessions: prev.chatSessions.filter((s) => s.id !== sessionId),
    }));
  };

  const handleSendMessage = (userText: string, aiText: string, modelUsed: string) => {
    const userMsg: ChatMessage = {
      id: `msg_u_${Date.now()}`,
      role: 'user',
      text: userText,
      date: Date.now(),
      notebookId: currentNotebook.id,
      sessionId: currentChatSession.id,
    };

    const aiMsg: ChatMessage = {
      id: `msg_ai_${Date.now() + 1}`,
      role: 'ai',
      text: aiText,
      date: Date.now() + 1,
      notebookId: currentNotebook.id,
      sessionId: currentChatSession.id,
      modelUsed,
    };

    setAppState((prev) => {
      const updatedSessions = prev.chatSessions.map((s) => {
        if (s.id === currentChatSession.id) {
          return {
            ...s,
            title: s.messages.length === 0 ? userText.slice(0, 24) + '...' : s.title,
            messages: [...s.messages, userMsg, aiMsg],
            updated: Date.now(),
          };
        }
        return s;
      });
      return { ...prev, chatSessions: updatedSessions };
    });
  };

  // Study Tools Handlers
  const handleAddNote = (title: string, text: string, tags: string[] = []) => {
    const newNote: NoteItem = {
      id: `note_${Date.now()}`,
      notebookId: currentNotebook.id,
      subject: currentNotebook.subject || 'عام',
      title,
      tags: tags.length > 0 ? tags : ['ملاحظة'],
      text,
      created: Date.now(),
      updated: Date.now(),
    };
    setAppState((prev) => ({ ...prev, notes: [newNote, ...prev.notes] }));
  };

  const handleDeleteNote = (id: string) => {
    setAppState((prev) => ({
      ...prev,
      notes: prev.notes.filter((n) => n.id !== id),
    }));
  };

  const handleAddFlashcards = (newCards: Flashcard[]) => {
    setAppState((prev) => ({
      ...prev,
      flashcards: [...newCards, ...prev.flashcards],
    }));
  };

  const handleReviewCard = (cardId: string, known: boolean) => {
    setAppState((prev) => {
      const updated = prev.flashcards.map((c) => {
        if (c.id === cardId) {
          const nextLvl = known ? c.level + 1 : 0;
          return {
            ...c,
            level: nextLvl,
            nextReview: Date.now() + (known ? Math.pow(2, nextLvl) * 86400000 : 3600000),
          };
        }
        return c;
      });
      return { ...prev, flashcards: updated };
    });
  };

  const handleAddTodo = (text: string) => {
    const newTodo: TodoItem = {
      id: `todo_${Date.now()}`,
      notebookId: currentNotebook.id,
      text,
      done: false,
      createdAt: Date.now(),
    };
    setAppState((prev) => ({ ...prev, todos: [newTodo, ...prev.todos] }));
  };

  const handleToggleTodo = (id: string) => {
    setAppState((prev) => ({
      ...prev,
      todos: prev.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    }));
  };

  const handleDeleteTodo = (id: string) => {
    setAppState((prev) => ({
      ...prev,
      todos: prev.todos.filter((t) => t.id !== id),
    }));
  };

  const handleAddFocusSession = (session: FocusSession) => {
    setAppState((prev) => ({
      ...prev,
      focusSessions: [session, ...prev.focusSessions],
    }));
  };

  // Quick Chat Question Starter from Science Studio or other tabs
  const handleSendPromptToChat = (prompt: string) => {
    setCurrentTab('chat');
  };

  return (
    <div className="flex h-screen bg-[#f8fbfa] dark:bg-[#0c1311] text-[#17201e] dark:text-[#eef7f4] font-sans antialiased overflow-hidden" dir="rtl">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        notebooks={appState.notebooks}
        currentNotebook={currentNotebook}
        onSelectNotebook={handleSelectNotebook}
        onCreateNotebook={handleCreateNotebook}
        onDeleteNotebook={handleDeleteNotebook}
        onOpenGoogleDrive={() => setIsDriveModalOpen(true)}
        onOpenLiveVoice={() => setIsLiveVoiceOpen(true)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        sourceCount={notebookSources.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          onToggleSidebar={() => setIsSidebarOpen(true)}
          currentTab={currentTab}
          currentNotebook={currentNotebook}
          notebooks={appState.notebooks}
          onSelectNotebook={handleSelectNotebook}
          isDark={appState.settings.theme === 'dark'}
          onToggleTheme={handleToggleTheme}
          onOpenLiveVoice={() => setIsLiveVoiceOpen(true)}
          onOpenGoogleDrive={() => setIsDriveModalOpen(true)}
          userProfile={userProfile}
          onSignInGoogle={handleSignInGoogle}
          onSignOutGoogle={handleSignOutGoogle}
        />

        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6">
          {currentTab === 'home' && (
            <HomeView
              currentNotebook={currentNotebook}
              sources={notebookSources}
              chatSession={currentChatSession}
              flashcards={notebookFlashcards}
              notes={notebookNotes}
              todos={notebookTodos}
              onToggleTodo={handleToggleTodo}
              onAddTodo={handleAddTodo}
              onNavigateTab={setCurrentTab}
              onOpenLiveVoice={() => setIsLiveVoiceOpen(true)}
              onOpenGoogleDrive={() => setIsDriveModalOpen(true)}
            />
          )}

          {currentTab === 'chat' && (
            <ChatView
              session={currentChatSession}
              allSessions={notebookSessions}
              onSelectSession={handleSelectSession}
              onNewSession={handleNewSession}
              onDeleteSession={handleDeleteSession}
              currentNotebookId={currentNotebook.id}
              notebookTitle={currentNotebook.name}
              notebookSubject={currentNotebook.subject}
              sources={notebookSources}
              onSendMessage={handleSendMessage}
              onOpenLiveVoice={() => setIsLiveVoiceOpen(true)}
            />
          )}

          {currentTab === 'sources' && (
            <SourcesView
              sources={notebookSources}
              chunks={notebookChunks}
              currentNotebookId={currentNotebook.id}
              onAddSource={handleAddSource}
              onDeleteSource={handleDeleteSource}
              onOpenGoogleDrive={() => setIsDriveModalOpen(true)}
              isDriveModalOpen={isDriveModalOpen}
              onCloseDriveModal={() => setIsDriveModalOpen(false)}
            />
          )}

          {currentTab === 'studio' && (
            <StudyStudioView
              currentNotebook={currentNotebook}
              sources={notebookSources}
              notes={notebookNotes}
              flashcards={notebookFlashcards}
              todos={notebookTodos}
              onAddNote={handleAddNote}
              onDeleteNote={handleDeleteNote}
              onAddFlashcards={handleAddFlashcards}
              onReviewCard={handleReviewCard}
              onAddTodo={handleAddTodo}
              onToggleTodo={handleToggleTodo}
              onDeleteTodo={handleDeleteTodo}
            />
          )}

          {currentTab === 'science' && (
            <ScienceStudio
              notebookTitle={currentNotebook.name}
              notebookSubject={currentNotebook.subject}
              onSendToChat={handleSendPromptToChat}
              onExportToNote={handleAddNote}
            />
          )}

          {currentTab === 'tools' && (
            <ToolsView
              currentNotebookId={currentNotebook.id}
              focusSessions={notebookFocusSessions}
              onAddFocusSession={handleAddFocusSession}
            />
          )}
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <nav
          aria-label="التنقل الرئيسي"
          className="lg:hidden bg-white/95 dark:bg-[#121b18]/95 backdrop-blur-md border-t border-slate-200/90 dark:border-[#22352f] px-2 py-1.5 flex items-center justify-around shrink-0 z-30 shadow-lg"
        >
          <button
            type="button"
            onClick={() => setCurrentTab('home')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              currentTab === 'home'
                ? 'text-teal-700 dark:text-teal-300 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span className="text-[10px]">الرئيسية</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentTab('chat')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all cursor-pointer relative ${
              currentTab === 'chat'
                ? 'text-teal-700 dark:text-teal-300 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-[10px]">المعلم</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentTab('sources')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all cursor-pointer relative ${
              currentTab === 'sources'
                ? 'text-teal-700 dark:text-teal-300 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="text-[10px]">المصادر</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentTab('studio')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              currentTab === 'studio'
                ? 'text-teal-700 dark:text-teal-300 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px]">المذاكرة</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentTab('science')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              currentTab === 'science'
                ? 'text-teal-700 dark:text-teal-300 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Atom className="w-4 h-4" />
            <span className="text-[10px]">العلوم 3D</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentTab('tools')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              currentTab === 'tools'
                ? 'text-teal-700 dark:text-teal-300 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span className="text-[10px]">الأدوات</span>
          </button>
        </nav>
      </div>

      {/* Global Google Drive File Picker & Importer Modal */}
      {isDriveModalOpen && (
        <GoogleDrivePickerModal
          isOpen={isDriveModalOpen}
          onClose={() => setIsDriveModalOpen(false)}
          currentNotebookId={currentNotebook.id}
          onAddSource={handleAddSource}
        />
      )}

      {/* Global Real-time Live API Voice Conversation Dialog */}
      {isLiveVoiceOpen && (
        <LiveVoiceDialog
          isOpen={isLiveVoiceOpen}
          onClose={() => setIsLiveVoiceOpen(false)}
          notebookTitle={currentNotebook.name}
        />
      )}
    </div>
  );
}

export default App;
