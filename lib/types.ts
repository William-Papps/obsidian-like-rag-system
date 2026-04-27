export type Folder = {
  id: string;
  userId: string;
  parentId: string | null;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type UserRole = "user" | "admin" | "owner";

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
  hostedPlan: HostedPlan;
  hostedKeyAvailable: boolean;
  usage: AiUsage[];
  createdAt: string;
  updatedAt: string;
};

export type RuntimeSettings = {
  selfSignupEnabled: boolean;
  hostedAiEnabled: boolean;
  emailVerificationEnabled: boolean;
};

export type HostedPlan = "free" | "starter" | "pro";
export type BillingSubscriptionStatus = "free" | "manual" | "pending_provider" | "inactive" | "canceled";

export type BillingProfile = {
  id: string;
  userId: string;
  billingName: string | null;
  billingEmail: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BillingSubscription = {
  id: string;
  userId: string;
  plan: HostedPlan;
  status: BillingSubscriptionStatus;
  provider: "none" | "manual" | "stripe";
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hostedAccessGrantedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BillingState = {
  profile: BillingProfile;
  subscription: BillingSubscription;
  hostedAccessGranted: boolean;
  checkoutReady: boolean;
  portalReady: boolean;
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
  hostedPlan: HostedPlan;
  subscriptionStatus: BillingSubscriptionStatus;
  hostedAccessGrantedAt: string | null;
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
  mode: "user" | "hosted" | "local";
  apiKey: string | null;
  projectId: string | null;
  settings: ProviderSettings;
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
