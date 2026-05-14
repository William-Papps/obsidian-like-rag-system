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

export type NoteSharePermission = "view" | "edit";

export type NoteShare = {
  id: string;
  noteId: string;
  ownerUserId: string;
  sharedWithUserId: string;
  sharedWithEmail: string;
  sharedWithName: string;
  permission: NoteSharePermission;
  createdAt: string;
  updatedAt: string;
};

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
  workspaceId?: string | null;
  sharePermission?: NoteSharePermission | null;
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
export type BillingSubscriptionStatus = "free" | "active" | "manual" | "pending_provider" | "inactive" | "canceled";

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
  mode: "hosted" | "local" | "ollama";
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

export type Workspace = {
  id: string;
  name: string;
  ownerUserId: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceMemberRole = "owner" | "editor";

export type WorkspaceMember = {
  workspaceId: string;
  userId: string;
  email: string;
  name: string;
  role: WorkspaceMemberRole;
  joinedAt: string | null;
  createdAt: string;
};

export type WorkspaceWithMembers = Workspace & {
  members: WorkspaceMember[];
  currentUserRole: WorkspaceMemberRole;
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
