export interface Notebook {
  id: string;
  name: string;
  subject: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  sourceIds: string[];
  noteIds: string[];
  chatSessionIds: string[];
  progress: number;
}

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'purple' | 'rose';

export interface SourceAnnotation {
  id: string;
  sourceId: string;
  sourceTitle?: string;
  pageNumber: number;
  selectedText: string;
  note?: string;
  color: HighlightColor;
  createdAt: number;
}

export type SourceStatus = 'Uploading' | 'Processing' | 'Ready' | 'Failed';

export interface Source {
  id: string;
  notebookId: string;
  title: string;
  uri?: string;
  type: string;
  size: number;
  status: SourceStatus;
  errorMessage?: string;
  content: string;
  wordCount?: number;
  lineCount?: number;
  pageCount?: number;
  pages?: Array<{ pageNumber: number; text: string }>;
  annotations?: SourceAnnotation[];
  createdAt: number;
  updatedAt: number;
  localFileId?: string;
}

export interface SourceChunk {
  id: string;
  sourceId: string;
  sourceTitle: string;
  notebookId: string;
  text: string;
  pageNumber?: number | null;
  section?: string;
}

export interface Citation {
  sourceId: string;
  sourceTitle: string;
  uri?: string;
  pageNumber?: number | null;
  section?: string;
  quote?: string;
  confidenceScore?: number;
}

export interface GroundingSource {
  title: string;
  uri: string;
  domain?: string;
  snippet?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  date: number;
  notebookId: string;
  sessionId: string;
  citations?: Citation[];
  groundingSources?: GroundingSource[];
  modelUsed?: string;
  image?: string;
  video?: string;
  isThinking?: boolean;
}

export interface ChatSession {
  id: string;
  notebookId: string;
  title: string;
  created: number;
  updated: number;
  updatedAt?: number;
  messages: ChatMessage[];
}

export interface NoteItem {
  id: string;
  notebookId: string;
  subject: string;
  title: string;
  tags: string[];
  text: string;
  created: number;
  updated: number;
}

export interface Flashcard {
  id: string;
  notebookId: string;
  front: string;
  back: string;
  level: number;
  nextReview: number;
  topic?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'mcq' | 'tf';
  options: string[];
  answer: number;
  explanation: string;
}

export interface TodoItem {
  id: string;
  notebookId: string;
  text: string;
  dueDate?: string;
  done: boolean;
  createdAt: number;
}

export interface FocusSession {
  id: string;
  notebookId: string;
  durationMins: number;
  timestamp: number;
}

export type AIMode = 'general' | 'fast' | 'complex' | 'thinking';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}
