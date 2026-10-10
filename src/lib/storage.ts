import { 
  Notebook, 
  Source, 
  SourceChunk, 
  ChatSession, 
  NoteItem, 
  Flashcard, 
  TodoItem, 
  FocusSession, 
  UserProfile 
} from '../types';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { doc, setDoc, getDoc, getDocs, collection } from 'firebase/firestore';

export interface AppState {
  notebooks: Notebook[];
  currentNotebookId: string;
  sources: Source[];
  chunks: SourceChunk[];
  chatSessions: ChatSession[];
  notes: NoteItem[];
  flashcards: Flashcard[];
  todos: TodoItem[];
  focusSessions: FocusSession[];
  userProfile?: UserProfile | null;
  settings: {
    theme: 'light' | 'dark';
    userName: string;
    sound: string;
  };
}

const STORAGE_KEY = 'almoallim_smart_study_state_v3';

export function createDefaultState(): AppState {
  const defaultNb: Notebook = {
    id: 'nb_science_physics',
    name: 'الفيزياء والعلوم العامة',
    subject: 'العلوم الطبيعية والفيزياء',
    description: 'دفتر دراسي تفاعلي لمذاكرة الفيزياء، الكيمياء، القوانين الرياضية وتلخيص المحاضرات بالذكاء الاصطناعي.',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    sourceIds: [],
    noteIds: [],
    chatSessionIds: ['chat_default'],
    progress: 35,
  };

  const defaultSession: ChatSession = {
    id: 'chat_default',
    notebookId: 'nb_science_physics',
    title: 'محادثة تعليمية مع المعلم الذكي',
    created: Date.now(),
    updated: Date.now(),
    messages: [
      {
        id: 'msg_welcome',
        role: 'ai',
        text: `مرحباً بك في **المعلم - المساعد الأكاديمي الذكي**! 🎓✨\n\nأنا هنا لمساعدتك في المذاكرة، الشرح الأكاديمي، وحل المسائل العلمية المعقدة مع ميزات متقدمة:\n\n1. **مختبر العلوم التفاعلي (Science Skills)**: عرض البنى الجزيئية والبروتينات ثلاثية الأبعاد بـ 3Dmol.js وبحث PubChem و arXiv.\n2. **Google Drive**: تصفح واستيراد كتبك ومستنداتك ومحاضراتك بضغطة زر.\n3. **تحليل الصور والفيديو**: ارفع صورة مسألة أو مخطط أو مقطع فيديو لتحليله بدقة عالية.\n4. **تفريغ الصوت الذكي والمحادثة الصوتية الحية**: تحدث معي مباشرة أو فرغ تسجيلاتك الصوتية إلى نصوص.\n5. **وضع التفكير المعمق (High Thinking)**: لحل أصعب المسائل الرياضية والاشتقاقات الفيزيائية.\n\nكيف يمكنني مساعدتك في درسك اليوم؟`,
        date: Date.now(),
        notebookId: 'nb_science_physics',
        sessionId: 'chat_default',
        modelUsed: 'gemini-3.5-flash',
      },
    ],
  };

  const sampleNotes: NoteItem[] = [
    {
      id: 'note_1',
      notebookId: 'nb_science_physics',
      subject: 'الفيزياء',
      title: 'قوانين نيوتن وحفظ كمية الحركة',
      tags: ['فيزياء', 'ميكانيكا', 'قوانين'],
      text: `# ملخص قوانين نيوتن في الحركة\n\n### 1. القانون الأول (القصور الذاتي)\nالجسم الساكن يبقى ساكناً، والجسم المتحرك في خط مستقيم بسرعة ثابتة يبقى كذلك ما لم تؤثر عليه قوة محصلة خارجية: $$\\sum \\vec{F} = 0$$\n\n### 2. القانون الثاني (قانون التسارع)\n$$F = m \\cdot a$$\n- $F$: القوة المحصلة بالنيوتن ($N$)\n- $m$: كتلة الجسم بالكيلوغرام ($kg$)\n- $a$: التسارع بالمتر لكل ثانية مربعة ($m/s^2$)\n\n### 3. القانون الثالث (الفعل ورد الفعل)\nلكل قوة فعل قوة رد فعل مساوية لها في المقدار ومضادة لها في الاتجاه.`,
      created: Date.now() - 86400000,
      updated: Date.now() - 86400000,
    },
  ];

  const sampleFlashcards: Flashcard[] = [
    {
      id: 'fc_1',
      notebookId: 'nb_science_physics',
      front: 'ما هي الصيغة الرياضية لقانون نيوتن الثاني؟',
      back: 'F = m · a (القوة المحصلة = الكتلة × التسارع)',
      level: 1,
      nextReview: Date.now() + 86400000,
      topic: 'فيزياء',
    },
    {
      id: 'fc_2',
      notebookId: 'nb_science_physics',
      front: 'ما هو ثابت حاصل تأين الماء Kw عند درجة حرارة 25°C؟',
      back: 'Kw = [H⁺][OH⁻] = 1.0 × 10⁻¹⁴ mol²/L²',
      level: 2,
      nextReview: Date.now() + 172800000,
      topic: 'كيمياء',
    },
  ];

  const sampleTodos: TodoItem[] = [
    {
      id: 'todo_1',
      notebookId: 'nb_science_physics',
      text: 'مراجعة اشتقاق طاقة الحركة وقوانين التصادم',
      dueDate: new Date().toISOString().slice(0, 10),
      done: false,
      createdAt: Date.now(),
    },
    {
      id: 'todo_2',
      notebookId: 'nb_science_physics',
      text: 'اختبار تجريبي في استوديو المذاكرة (MCQ)',
      dueDate: new Date().toISOString().slice(0, 10),
      done: false,
      createdAt: Date.now(),
    },
  ];

  return {
    notebooks: [defaultNb],
    currentNotebookId: 'nb_science_physics',
    sources: [],
    chunks: [],
    chatSessions: [defaultSession],
    notes: sampleNotes,
    flashcards: sampleFlashcards,
    todos: sampleTodos,
    focusSessions: [],
    userProfile: null,
    settings: {
      theme: 'light',
      userName: 'طالب متميز',
      sound: 'chime',
    },
  };
}

export function loadAppState(): AppState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.notebooks && parsed.notebooks.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Error reading local state:", e);
  }
  const initial = createDefaultState();
  saveAppState(initial);
  return initial;
}

export function saveAppState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Error saving local state:", e);
  }
}

// Sync user state with Cloud Firestore when user is authenticated
export async function syncToFirestore(state: AppState): Promise<boolean> {
  const currentUser = auth.currentUser;
  if (!currentUser) return false;

  try {
    const userRef = doc(db, 'users', currentUser.uid);
    await setDoc(userRef, {
      userId: currentUser.uid,
      email: currentUser.email || '',
      displayName: currentUser.displayName || state.settings.userName,
      photoURL: currentUser.photoURL || '',
      updatedAt: new Date().toISOString(),
      stateSummary: {
        notebookCount: state.notebooks.length,
        notesCount: state.notes.length,
        flashcardsCount: state.flashcards.length,
      },
    }, { merge: true });

    // Save current active notebook to Firestore
    const currentNb = state.notebooks.find(n => n.id === state.currentNotebookId) || state.notebooks[0];
    if (currentNb) {
      const nbRef = doc(db, 'notebooks', currentNb.id);
      await setDoc(nbRef, {
        id: currentNb.id,
        ownerId: currentUser.uid,
        name: currentNb.name,
        subject: currentNb.subject,
        description: currentNb.description,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}`);
    return false;
  }
}

// Load user data from Cloud Firestore
export async function loadFromFirestore(): Promise<Partial<AppState> | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;

  try {
    const userRef = doc(db, 'users', currentUser.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return null;

    return {
      userProfile: {
        uid: currentUser.uid,
        email: currentUser.email || '',
        displayName: currentUser.displayName || '',
        photoURL: currentUser.photoURL || '',
      },
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
    return null;
  }
}

// IndexedDB for large files (PDFs, Audio, Images)
const IDB_NAME = 'AlMoallimApp_FilesDB';
const IDB_VERSION = 1;

function openFilesDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('blobs')) {
        db.createObjectStore('blobs', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function storeFileBlob(id: string, file: File | Blob, metadata: Record<string, any> = {}): Promise<void> {
  try {
    const db = await openFilesDB();
    const tx = db.transaction('blobs', 'readwrite');
    tx.objectStore('blobs').put({ id, blob: file, ...metadata, savedAt: Date.now() });
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("storeFileBlob error:", err);
  }
}

export async function getFileBlob(id: string): Promise<Blob | null> {
  try {
    const db = await openFilesDB();
    const tx = db.transaction('blobs', 'readonly');
    const req = tx.objectStore('blobs').get(id);
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result?.blob || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("getFileBlob error:", err);
    return null;
  }
}

export async function deleteFileBlob(id: string): Promise<void> {
  try {
    const db = await openFilesDB();
    const tx = db.transaction('blobs', 'readwrite');
    tx.objectStore('blobs').delete(id);
  } catch (err) {
    console.warn("deleteFileBlob error:", err);
  }
}
