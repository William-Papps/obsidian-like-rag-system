export type Folder = {
  id: string;
  userId: string;
  parentId: string | null;
  name: string;
  workspaceId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UserRole = "user" | "admin" | "owner";

export type DocStatus = "draft" | "active" | "archived";
export type DocType = "note" | "document";

export type Note = {
  id: string;
  userId: string;
  folderId: string | null;
  title: string;
  markdownContent: string;
  createdAt: string;
  updatedAt: string;
  contentHash: string;
  sortOrder?: number | null;
  department?: string | null;
  effectiveDate?: string | null;
  docStatus?: DocStatus | null;
  docType?: DocType | null;
  sourceDocumentId?: string | null;
};

export type Chunk = {
  id: string;
  userId: string;
  noteId: string;
  noteTitle: string;
  chunkText: string;
  chunkIndex: number;
  contentHash: string;
  embedded: boolean;
  vectorId: string | null;
  vectorJson: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProviderSettings = {
  id: string;
  userId: string;
  provider: "openai";
  projectId: string | null;
  embeddingModel: string;
  answerModel: string;
  visionModel: string | null;
  usage: AiUsage[];
  createdAt: string;
  updatedAt: string;
};

export type RuntimeSettings = {
  selfSignupEnabled: boolean;
  emailVerificationEnabled: boolean;
};

export type ManagedUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  disabledAt: string | null;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminUserSummary = ManagedUser & {
  aiUsageThisMonth: number;
};

export type AuditLog = {
  id: string;
  actorUserId: string | null;
  level: "info" | "warn" | "error";
  event: string;
  metadataJson: string | null;
  createdAt: string;
};

export type StudyActivity = {
  id: string;
  userId: string;
  kind: "ask" | "quiz_generated" | "quiz_checked" | "flashcard_generated" | "summary_generated" | "import";
  scopeLabel: string | null;
  noteTitle: string | null;
  createdAt: string;
};

export type AiFeature = "ask" | "quiz" | "flashcards" | "summary" | "ocr" | "index";

export type AiUsage = {
  feature: AiFeature;
  used: number;
  limit: number | null;
  remaining: number | null;
};

export type AiContext = {
  mode: "local" | "ollama";
  apiKey: string | null;
  projectId: string | null;
  ollamaBaseUrl?: string;
  settings: ProviderSettings;
};

export type DocumentFile = {
  id: string;
  userId: string;
  title: string;
  filename: string;
  fileType: 'pdf' | 'docx' | 'txt';
  fileSize: number;
  pageCount: number | null;
  contentHash: string;
  shadowNoteId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RetrievedChunk = {
  chunkId: string;
  noteId: string;
  noteTitle: string;
  excerpt: string;
  similarity: number;
  pageNumber?: number | null;
  documentId?: string | null;
};

export type AnswerResult = {
  answer: string;
  citations: RetrievedChunk[];
  unsupported: boolean;
};

export type QuizQuestion = {
  question: string;
  answer: string;
  source: RetrievedChunk;
};

export type QuizEvaluation = {
  correct: boolean;
  verdict: "correct" | "partial" | "incorrect";
  feedback: string;
};

export type Flashcard = {
  prompt: string;
  answer: string;
  source: RetrievedChunk;
};

export type FeedbackCategory = "bug" | "feature" | "general";

export type UserFeedback = {
  id: string;
  userId: string;
  name: string;
  email: string;
  category: FeedbackCategory;
  message: string;
  createdAt: string;
};
