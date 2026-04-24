export type Folder = {
  id: string;
  userId: string;
  parentId: string | null;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type Note = {
  id: string;
  userId: string;
  folderId: string | null;
  title: string;
  markdownContent: string;
  createdAt: string;
  updatedAt: string;
  contentHash: string;
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
  maskedKey: string | null;
  projectId: string | null;
  embeddingModel: string;
  answerModel: string;
  visionModel: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RetrievedChunk = {
  chunkId: string;
  noteId: string;
  noteTitle: string;
  excerpt: string;
  similarity: number;
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
