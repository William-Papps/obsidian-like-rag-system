"use client";

import { markdown } from "@codemirror/lang-markdown";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { sql } from "@codemirror/lang-sql";
import { EditorSelection, RangeSetBuilder } from "@codemirror/state";
import { Decoration, EditorView, ViewPlugin, WidgetType, type DecorationSet, type ViewUpdate } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import {
  AlertCircle,
  BookOpen,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock3,
  Code2,
  Command,
  Copy,
  Download,
  FilePlus,
  FileStack,
  FileText,
  Filter,
  Folder,
  FolderOpen,
  FolderPlus,
  GripVertical,
  Info,
  ImagePlus,
  LayoutPanelLeft,
  Layers3,
  Link,
  List,
  Loader2,
  LogOut,
  Maximize2,
  MessageSquareText,
  Minimize2,
  MoreVertical,
  PanelRight,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Pin,
  PinOff,
  Rows3,
  RotateCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Square,
  SquareCheck,
  Table2,
  Tag,
  Trash2,
  Trophy,
  Upload,
  UserPlus,
  Users,
  X
} from "lucide-react";
import { Component, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MarkdownPreview } from "@/components/markdown";
import { DocumentImportModal } from "@/components/document-import-modal";
import type { AnswerResult, DocumentFile, Flashcard, Folder as FolderType, Note, NoteShare, NoteSharePermission, ProviderSettings, QuizEvaluation, QuizQuestion, WorkspaceWithMembers } from "@/lib/types";

class PanelErrorBoundary extends Component<{ children: ReactNode; label: string }, { error: Error | null }> {
  constructor(props: { children: ReactNode; label: string }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="rounded-xl border border-danger-400/30 bg-danger-400/10 p-4 text-sm text-ink-300">
          <div className="mb-1 font-semibold text-danger-400">{this.props.label} encountered an error</div>
          <div className="text-xs text-ink-500">{this.state.error.message}</div>
          <button
            className="mt-3 text-xs text-accent-300 underline"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

type Bootstrap = {
  user: { id: string; email: string; name: string };
  folders: FolderType[];
  notes: Note[];
  settings: ProviderSettings;
  indexStatus: { notes: number; chunks: number; staleNotes: number };
  noteTags: Record<string, string[]>;
  workspaces: WorkspaceWithMembers[];
  documents: DocumentFile[];
};

type Scope = { type: "all" } | { type: "note"; noteId: string } | { type: "folder"; folderId: string | null };
type Tab = "ask" | "find" | "quiz" | "flashcards" | "summary" | "today" | "exam";
type NoteView = "write" | "preview" | "split" | "code";
type CodeLanguage = "plaintext" | "typescript" | "javascript" | "python" | "html" | "css" | "sql" | "json";
type Toast = { id: number; tone: "success" | "info" | "error"; message: string };
type VaultMenu = { kind: "folder" | "note"; id: string; x: number; y: number } | null;
type DragItem = { kind: "folder" | "note"; id: string } | null;
type SourceRef = { noteId: string; noteTitle: string; excerpt: string; similarity: number; view?: NoteView };
type SourceHighlight = SourceRef & { token: number };
type InputDialogState = {
  title: string;
  label: string;
  placeholder?: string;
  value: string;
  submitLabel: string;
  onSubmit: (value: string) => Promise<void> | void;
} | null;
type MoveDialogState = {
  title: string;
  description: string;
  submitLabel: string;
  currentFolderId: string | null | undefined;
  allowRootLabel: string;
  options: FolderType[];
  onSubmit: (folderId: string | null) => Promise<void> | void;
} | null;
type ConfirmState = {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "danger" | "default";
  onConfirm: () => Promise<void> | void;
} | null;
type TableDialogState = {
  rows: number;
  columns: number;
} | null;

const SYMBOL_GROUPS: { label: string; symbols: string[] }[] = [
  { label: "Common Math",    symbols: ["∑","∏","∫","∬","∂","∇","√","∛","∜","∞","±","×","÷","·","°","‰","∝","∎"] },
  { label: "Relations",     symbols: ["≈","≠","≡","≤","≥","≪","≫","∼","≅","≃","⊂","⊃","⊆","⊇","∈","∉","∅","⊄","⊊"] },
  { label: "Logic & Sets",  symbols: ["∧","∨","¬","⊤","⊥","⊢","⊨","∀","∃","∄","∴","∵","∪","∩","⊕","⊗"] },
  { label: "Greek lower",   symbols: ["α","β","γ","δ","ε","ζ","η","θ","ι","κ","λ","μ","ν","ξ","π","ρ","σ","τ","υ","φ","χ","ψ","ω"] },
  { label: "Greek upper",   symbols: ["Γ","Δ","Θ","Λ","Ξ","Π","Σ","Υ","Φ","Χ","Ψ","Ω"] },
  { label: "Arrows",        symbols: ["→","←","↑","↓","↔","↕","⇒","⇐","⇑","⇓","⇔","↦","⟹","⟺","↗","↘","↙","↖","⟶","⟵"] },
  { label: "Superscripts",  symbols: ["⁰","¹","²","³","⁴","⁵","⁶","⁷","⁸","⁹","ⁿ","ⁱ","⁺","⁻"] },
  { label: "Subscripts",    symbols: ["₀","₁","₂","₃","₄","₅","₆","₇","₈","₉","₊","₋","₌","₍","₎"] },
  { label: "Fractions",     symbols: ["½","⅓","¼","¾","⅔","⅛","⅜","⅝","⅞","⅙","⅚","⅟"] },
  { label: "Geometry",      symbols: ["∠","∡","∢","⊾","⊿","△","▲","▽","▼","◇","◆","□","■","○","●","⊙","⊚"] },
  { label: "Misc",          symbols: ["©","®","™","€","£","¥","¢","§","¶","†","‡","•","…","″","′","℃","℉","Å"] },
];

export function Workspace() {
  const [data, setData] = useState<Bootstrap | null>(null);
  const dataRef = useRef<Bootstrap | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const activeNoteRef = useRef<Note | null>(null);
  const [saving, setSaving] = useState(false);
  const [scope, setScope] = useState<Scope>({ type: "all" });
  const [tab, setTab] = useState<Tab>("ask");
  const [leftOpen, setLeftOpen] = useState(() => readStoredJson("studyos:leftOpen", false));
  const [rightOpen, setRightOpen] = useState(() => readStoredJson("studyos:rightOpen", true));
  const [railPinned, setRailPinned] = useState(() => readStoredJson("studyos:railPinned", false));
  const [leftWidth, setLeftWidth] = useState(() => readStoredNumber("studyos:leftWidth", 300, 240, 420));
  const [rightWidth, setRightWidth] = useState(() => readStoredNumber("studyos:rightWidth", 410, 340, 560));
  const [noteView, setNoteView] = useState<NoteView>("write");
  const [codeLanguage, setCodeLanguage] = useState<CodeLanguage>(() => readStoredJson("studyos:codeLanguage", "typescript"));
  const [codeSnippet, setCodeSnippet] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftMarkdown, setDraftMarkdown] = useState("");
  const draftMarkdownRef = useRef("");
  const [editorSeed, setEditorSeed] = useState("");
  const [openNoteIds, setOpenNoteIds] = useState<string[]>([]);
  const [pinnedNoteIds, setPinnedNoteIds] = useState<string[]>(() => readStoredJson("studyos:pinnedNotes", []));
  const [vaultRootId, setVaultRootId] = useState<string>(() => readStoredJson("studyos:vaultRootId", "__all__"));
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<Toast | null>(null);
  const [vaultMenu, setVaultMenu] = useState<VaultMenu>(null);
  const [dragItem, setDragItem] = useState<DragItem>(null);
  const [sourceHighlight, setSourceHighlight] = useState<SourceHighlight | null>(null);
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const editorCursorRef = useRef(0);
  const [cursorInTable, setCursorInTable] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [inputDialog, setInputDialog] = useState<InputDialogState>(null);
  const [moveDialog, setMoveDialog] = useState<MoveDialogState>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [tableDialog, setTableDialog] = useState<TableDialogState>(null);
  const [formatting, setFormatting] = useState(false);
  const [pastingImage, setPastingImage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [mobileTab, setMobileTab] = useState<"vault" | "editor" | "study">("editor");
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 1024);
  const [reindexingAll, setReindexingAll] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [docUploading, setDocUploading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyVersions, setHistoryVersions] = useState<{ id: string; noteId: string; title: string; createdAt: string }[]>([]);
  const [historyRestoring, setHistoryRestoring] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [vaultSearch, setVaultSearch] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(new Set());
  const [recentlyVisitedIds, setRecentlyVisitedIds] = useState<string[]>(() => readStoredJson("studyos:recentVisited", []));
  const [tocOpen, setTocOpen] = useState(false);
  const [symbolsOpen, setSymbolsOpen] = useState(false);
  const [symbolsQuery, setSymbolsQuery] = useState("");
  const symbolInsertPosRef = useRef<number>(0);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [workspaceModal, setWorkspaceModal] = useState<"manage" | "invite" | "create" | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [noteShares, setNoteShares] = useState<NoteShare[]>([]);
  const [shareEmail, setShareEmail] = useState("");
  const [sharePermission, setSharePermission] = useState<NoteSharePermission>("edit");
  const [shareLoading, setShareLoading] = useState(false);
  const [inlineAI, setInlineAI] = useState<{
    query: string;
    loading: boolean;
    pos: number;
    x: number;
    y: number;
    preview?: string;
  } | null>(null);
  const openInlineAIRef = useRef<(view: EditorView) => void>(() => {});
  const [relatedNotes, setRelatedNotes] = useState<{ noteId: string; title: string; score: number }[]>([]);
  const [suggestingTags, setSuggestingTags] = useState(false);
  const [suggestedTagsState, setSuggestedTagsState] = useState<{ suggested: string[]; existingTags: { id: string; name: string; color: string }[] } | null>(null);
  const [suggestTagsOpen, setSuggestTagsOpen] = useState(false);
  const [cmTheme, setCmTheme] = useState<"dark" | "light">(() => {
    try { return JSON.parse(localStorage.getItem("studyos:theme") ?? '"purple"') === "light" ? "light" : "dark"; }
    catch { return "dark"; }
  });

  editorViewRef.current = editorView;


  const notify = useCallback((message: string, tone: Toast["tone"] = "info") => {
    const next = { id: Date.now(), tone, message };
    setToast(next);
    window.setTimeout(() => {
      setToast((current) => (current?.id === next.id ? null : current));
    }, 2600);
  }, []);

  const refresh = useCallback(async (wsId?: string | null) => {
    const currentWsId = wsId !== undefined ? wsId : activeWorkspaceId;
    const response = await fetch("/api/bootstrap", { cache: "no-store" });
    if (response.status === 401) {
      window.location.href = "/auth";
      return;
    }
    const payload = (await response.json()) as Bootstrap;

    // Bootstrap already includes personal-workspace folders, notes, and indexStatus.
    // Only fetch workspace-specific overrides when actually inside a workspace.
    let folders = payload.folders;
    let notes = payload.notes;
    if (currentWsId) {
      const wsParam = `?workspaceId=${currentWsId}`;
      [folders, notes] = await Promise.all([
        fetch(`/api/folders${wsParam}`, { cache: "no-store" }).then((r) => r.json() as Promise<FolderType[]>),
        fetch(`/api/notes${wsParam}`, { cache: "no-store" }).then((r) => r.json() as Promise<Note[]>)
      ]);
    }

    const next = { ...payload, folders, notes };
    dataRef.current = next;
    setData(next);
    setActiveNoteId((current) => current || next.notes[0]?.id || null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspaceId]);

  // Keep dataRef in sync so saveActiveMarkdownDebounced can read it without a dependency
  useEffect(() => { dataRef.current = data; }, [data]);

  const switchWorkspace = useCallback(async (wsId: string | null) => {
    setActiveWorkspaceId(wsId);
    setActiveNoteId(null);
    setOpenNoteIds([]);
    setVaultRootId("__all__");
    await refresh(wsId);
  }, [refresh]);

  const sendInvite = useCallback(async (workspaceId: string, email: string) => {
    setInviteLoading(true);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Failed to send invite");
      setInviteToken(body.token);
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to send invite", "error");
    } finally {
      setInviteLoading(false);
    }
  }, [notify, refresh]);

  const openShareModal = useCallback(async (noteId: string) => {
    setShareEmail("");
    setShareLoading(false);
    const res = await fetch(`/api/notes/${noteId}/shares`);
    if (res.ok) setNoteShares(await res.json() as NoteShare[]);
    setShareModalOpen(true);
  }, []);

  const doShareNote = useCallback(async (noteId: string) => {
    if (!shareEmail.trim()) return;
    setShareLoading(true);
    try {
      const res = await fetch(`/api/notes/${noteId}/shares`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: shareEmail.trim(), permission: sharePermission })
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to share");
      setNoteShares((prev) => {
        const filtered = prev.filter((s) => s.sharedWithUserId !== body.sharedWithUserId);
        return [...filtered, body as NoteShare];
      });
      setShareEmail("");
      notify(`Shared with ${body.sharedWithEmail}`, "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to share", "error");
    } finally {
      setShareLoading(false);
    }
  }, [shareEmail, sharePermission, notify]);

  const revokeShare = useCallback(async (noteId: string, userId: string) => {
    const res = await fetch(`/api/notes/${noteId}/shares/${userId}`, { method: "DELETE" });
    if (res.ok) setNoteShares((prev) => prev.filter((s) => s.sharedWithUserId !== userId));
  }, []);

  const updateSharePermission = useCallback(async (noteId: string, userId: string, permission: NoteSharePermission) => {
    const res = await fetch(`/api/notes/${noteId}/shares/${userId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ permission })
    });
    if (res.ok) setNoteShares((prev) => prev.map((s) => s.sharedWithUserId === userId ? { ...s, permission } : s));
  }, []);

  const reindexAll = useCallback(async () => {
    if (!data) return;
    setReindexingAll(true);
    try {
      const response = await fetch("/api/index", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Indexing failed");
      notify("Index refreshed", "success");
      await refresh();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Indexing failed", "error");
    } finally {
      setReindexingAll(false);
    }
  }, [data, notify, refresh]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  useEffect(() => {
    window.localStorage.setItem("studyos:pinnedNotes", JSON.stringify(pinnedNoteIds));
  }, [pinnedNoteIds]);

  useEffect(() => {
    window.localStorage.setItem("studyos:leftOpen", JSON.stringify(leftOpen));
  }, [leftOpen]);

  useEffect(() => {
    window.localStorage.setItem("studyos:rightOpen", JSON.stringify(rightOpen));
  }, [rightOpen]);

  useEffect(() => {
    window.localStorage.setItem("studyos:codeLanguage", JSON.stringify(codeLanguage));
  }, [codeLanguage]);

  useEffect(() => {
    window.localStorage.setItem("studyos:vaultRootId", JSON.stringify(vaultRootId));
  }, [vaultRootId]);

  useEffect(() => {
    window.localStorage.setItem("studyos:railPinned", JSON.stringify(railPinned));
  }, [railPinned]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== "studyos:theme") return;
      try {
        const t = JSON.parse(e.newValue ?? '"purple"') as string;
        document.documentElement.setAttribute("data-theme", t);
        setCmTheme(t === "light" ? "light" : "dark");
      } catch { /* ignore */ }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const close = () => { setVaultMenu(null); setTocOpen(false); setSymbolsOpen(false); };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("click", close);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        setZenMode((z) => !z);
      }
      if (event.key === "Escape" && zenMode) {
        setZenMode(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [zenMode]);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const activeNote = useMemo(() => data?.notes.find((note) => note.id === activeNoteId) ?? null, [data, activeNoteId]);
  activeNoteRef.current = activeNote;
  const activeWorkspace = useMemo(() => data?.workspaces.find((w) => w.id === activeWorkspaceId) ?? null, [data, activeWorkspaceId]);
  const openNotes = useMemo(
    () =>
      [
        ...(activeNote ? [activeNote] : []),
        ...openNoteIds.map((id) => data?.notes.find((note) => note.id === id)).filter((note): note is Note => Boolean(note))
      ].filter((note, index, notes) => notes.findIndex((item) => item.id === note.id) === index),
    [activeNote, data?.notes, openNoteIds]
  );
  const pinnedNotes = useMemo(
    () => pinnedNoteIds.map((id) => data?.notes.find((note) => note.id === id)).filter((note): note is Note => Boolean(note)),
    [data?.notes, pinnedNoteIds]
  );
  const topLevelFolders = useMemo(() => (data?.folders ?? []).filter((folder) => !folder.parentId), [data?.folders]);
  const vaultRootFolder = useMemo(() => {
    if (!data) return null;
    if (vaultRootId === "__all__") return null;
    return data.folders.find((folder) => folder.id === vaultRootId) ?? null;
  }, [data, vaultRootId]);
  const recentNotes = useMemo(
    () => recentlyVisitedIds
      .map((id) => data?.notes.find((note) => note.id === id))
      .filter((note): note is Note => Boolean(note) && !pinnedNoteIds.includes(note!.id))
      .slice(0, 5),
    [recentlyVisitedIds, data?.notes, pinnedNoteIds]
  );
  const selectNote = useCallback((noteId: string, options?: { updateScope?: boolean }) => {
    setActiveNoteId(noteId);
    if (options?.updateScope !== false) {
      setScope({ type: "note", noteId });
    }
    setOpenNoteIds((current) => [noteId, ...current.filter((id) => id !== noteId)].slice(0, 8));
    setRecentlyVisitedIds((current) => {
      const next = [noteId, ...current.filter((id) => id !== noteId)].slice(0, 15);
      window.localStorage.setItem("studyos:recentVisited", JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    setDraftTitle(activeNote?.title ?? "");
    const md = activeNote?.markdownContent ?? "";
    draftMarkdownRef.current = md;
    setDraftMarkdown(md);
    setEditorSeed(md);
    setHistoryOpen(false);
  }, [activeNote?.id]);
  const openNoteFromSource = useCallback(
    (source: SourceRef) => {
      const note = data?.notes.find((item) => item.id === source.noteId);
      if (!note) {
        notify("Source note is no longer available", "error");
        return;
      }

      setNoteView(source.view ?? "write");
      selectNote(source.noteId, { updateScope: false });
      setSourceHighlight({ ...source, token: Date.now() });
      notify(`Opened ${note.title}`, "info");
    },
    [data?.notes, notify, selectNote]
  );
  const togglePinNote = useCallback((note: Note) => {
    setPinnedNoteIds((current) => (current.includes(note.id) ? current.filter((id) => id !== note.id) : [note.id, ...current]));
  }, []);
  const noteFolder = useMemo(
    () => data?.folders.find((folder) => folder.id === activeNote?.folderId)?.name ?? "No folder",
    [activeNote, data]
  );
  const workspaceGridStyle = useMemo<CSSProperties>(() => {
    if (isMobile) return { gridTemplateColumns: "1fr" };
    if (zenMode) return { gridTemplateColumns: "0px minmax(0, 1fr) 0px" };
    const left = leftOpen ? `${leftWidth}px` : "0px";
    const right = rightOpen ? `${rightWidth}px` : "0px";
    return {
      gridTemplateColumns: `${left} minmax(0, 1fr) ${right}`
    };
  }, [isMobile, zenMode, leftOpen, leftWidth, rightOpen, rightWidth]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraftTitle(activeNote?.title ?? "");
  }, [activeNote?.id, activeNote?.title]);

  useEffect(() => {
    if (!activeNote || draftTitle === activeNote.title) return;
    const timer = window.setTimeout(() => {
      void updateNote(activeNote.id, { title: draftTitle });
    }, 450);
    return () => window.clearTimeout(timer);
    // updateNote intentionally stays local so title selection/caret state is not reset on every keydown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNote?.id, activeNote?.title, draftTitle]);

  useEffect(() => {
    if (!sourceHighlight) return;
    const timer = window.setTimeout(() => {
      setSourceHighlight((current) => (current?.token === sourceHighlight.token ? null : current));
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [sourceHighlight]);

  const editorHighlight = useMemo(() => {
    if (!activeNote || sourceHighlight?.noteId !== activeNote.id) return null;
    return sourceHighlight;
  }, [activeNote, sourceHighlight]);
  const currentTableContext = (editorView && cursorInTable)
    ? getTableContext(editorView.state.doc.toString(), editorCursorRef.current)
    : null;

  const tocHeadings = useMemo(() => {
    const headings: { level: number; text: string; pos: number }[] = [];
    let pos = 0;
    for (const line of draftMarkdown.split("\n")) {
      const match = /^(#{1,6})\s+(.+)$/.exec(line);
      if (match) headings.push({ level: match[1].length, text: match[2].trim(), pos });
      pos += line.length + 1;
    }
    return headings;
  }, [draftMarkdown]);

  function jumpToHeading(pos: number) {
    if (!editorView) return;
    if (noteView !== "write" && noteView !== "split") setNoteView("write");
    editorView.dispatch({
      selection: { anchor: pos },
      effects: EditorView.scrollIntoView(pos, { y: "start" })
    });
    editorView.focus();
    setTocOpen(false);
  }

  useEffect(() => {
    if (!editorView || !activeNote || !editorHighlight) return;
    const frame = window.requestAnimationFrame(() => {
      const range = findExcerptRange(editorView.state.doc.toString(), editorHighlight.excerpt);
      if (!range) return;
      editorView.dispatch({
        effects: EditorView.scrollIntoView(range.from, { y: "center" })
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeNote, editorHighlight, editorView]);

  function contextFolderId() {
    if (scope.type === "folder") return scope.folderId;
    if (activeNote?.folderId) return activeNote.folderId;
    if (vaultRootId !== "__all__") return vaultRootId;
    return null;
  }

  async function createNoteWithTitle(title: string, folderId: string | null = contextFolderId()) {
    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, folderId, workspaceId: activeWorkspaceId })
    });
    const note = (await response.json()) as Note;
    // Add the note to local state, select it, and seed the editor all in one batch
    // so the editor switches content immediately without waiting for the effect chain.
    setData((d) => d ? { ...d, notes: [...d.notes, note] } : d);
    selectNote(note.id);
    const md = note.markdownContent ?? "";
    draftMarkdownRef.current = md;
    setDraftMarkdown(md);
    setEditorSeed(md);
    setDraftTitle(note.title);
    notify("Note created", "success");
    void refresh();
  }

  function createNote(folderId: string | null = contextFolderId()) {
    setInputDialog({
      title: "Create note",
      label: "Note name",
      placeholder: "e.g. Q3 Market Analysis",
      value: "",
      submitLabel: "Create note",
      onSubmit: async (value) => {
        await createNoteWithTitle(value.trim() || "Untitled note", folderId);
      }
    });
  }

  async function updateNote(noteId: string, input: Partial<Note>) {
    setSaving(true);
    const response = await fetch(`/api/notes/${noteId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input)
    });
    const note = (await response.json()) as Note;
    setData((current) =>
      current ? { ...current, notes: current.notes.map((item) => (item.id === note.id ? note : item)) } : current
    );
    setSaving(false);
  }

  const markdownSaveTimer = useRef<number | null>(null);
  const markdownSaveSeq = useRef(0);

  const saveActiveMarkdownDebounced = useCallback(
    (noteId: string, markdownContent: string) => {
      if (!dataRef.current) return;
      setSaving(true);
      if (markdownSaveTimer.current) window.clearTimeout(markdownSaveTimer.current);
      const seq = ++markdownSaveSeq.current;
      markdownSaveTimer.current = window.setTimeout(async () => {
        try {
          await fetch(`/api/notes/${noteId}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ markdownContent })
          });
          // Update notes list after save so sidebar stays in sync
          setData((current) =>
            current
              ? {
                  ...current,
                  notes: current.notes.map((n) =>
                    n.id === noteId ? { ...n, markdownContent, updatedAt: new Date().toISOString() } : n
                  )
                }
              : current
          );
        } finally {
          if (markdownSaveSeq.current === seq) setSaving(false);
        }
      }, 450);
    },
    [] // no dependency on data — reads via dataRef
  );

  const onEditorChange = useCallback(
    (markdownContent: string) => {
      if (!activeNoteRef.current) return;
      draftMarkdownRef.current = markdownContent;
      setDraftMarkdown(markdownContent);
      saveActiveMarkdownDebounced(activeNoteRef.current.id, markdownContent);
    },
    [saveActiveMarkdownDebounced]
  );

  const cursorInTableRef = useRef(false);
  cursorInTableRef.current = cursorInTable;

  const onEditorUpdate = useCallback((update: import("@codemirror/view").ViewUpdate) => {
    const pos = update.state.selection.main.head;
    editorCursorRef.current = pos;
    const inTable = !!getTableContext(update.state.doc.toString(), pos);
    if (inTable !== cursorInTableRef.current) setCursorInTable(inTable);
  }, []);

  // Cold path — toolbar actions, version restore, imports. Immediate state update is fine.
  const replaceActiveMarkdown = useCallback(
    async (markdownContent: string) => {
      if (!activeNote) return;
      draftMarkdownRef.current = markdownContent;
      setDraftMarkdown(markdownContent);
      saveActiveMarkdownDebounced(activeNote.id, markdownContent);
    },
    [activeNote, saveActiveMarkdownDebounced]
  );

  const applyEditorText = useCallback(
    async (nextText: string, selection?: { anchor: number; head?: number }) => {
      if (!editorView || !activeNote) return;
      const currentText = editorView.state.doc.toString();
      if (currentText === nextText) return;
      editorView.dispatch({
        changes: { from: 0, to: currentText.length, insert: nextText },
        selection: selection ? EditorSelection.single(selection.anchor, selection.head ?? selection.anchor) : undefined
      });
      await replaceActiveMarkdown(nextText);
    },
    [activeNote, editorView, replaceActiveMarkdown]
  );

  openInlineAIRef.current = (view: EditorView) => {
    const pos = view.state.selection.main.head;
    const coords = view.coordsAtPos(pos);
    if (!coords) return;
    setInlineAI({ query: "", loading: false, pos, x: coords.left, y: coords.bottom + 6 });
  };

  async function submitInlineAI() {
    if (!inlineAI || !inlineAI.query.trim() || !activeNote) return;
    const { query } = inlineAI;
    setInlineAI((s) => s ? { ...s, loading: true, preview: "" } : null);
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: query, scope: { noteId: activeNote.id } })
      });
      if (!response.ok || !response.body) throw new Error("AI request failed");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let answer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.startsWith("data: ") ? part.slice(6) : part;
          if (!line.trim()) continue;
          try {
            const ev = JSON.parse(line) as { type: string; data?: unknown };
            if (ev.type === "chunk") {
              answer += ev.data as string;
              setInlineAI((s) => s ? { ...s, preview: answer } : null);
            }
          } catch { continue; }
        }
      }
      setInlineAI((s) => s ? { ...s, loading: false, preview: answer.trim() } : null);
    } catch (error) {
      notify(error instanceof Error ? error.message : "AI request failed", "error");
      setInlineAI((s) => s ? { ...s, loading: false } : null);
    }
  }

  async function applyInlineAIPreview() {
    if (!inlineAI?.preview || !editorView) return;
    const { pos, preview } = inlineAI;
    const insert = `\n\n> **AI:** ${preview}\n\n`;
    const currentText = editorView.state.doc.toString();
    const nextText = `${currentText.slice(0, pos)}${insert}${currentText.slice(pos)}`;
    await applyEditorText(nextText, { anchor: pos + insert.length });
    setInlineAI(null);
  }

  const pasteClipboardImage = useCallback(
    async (file: File, view: EditorView) => {
      setPastingImage(true);
      try {
        const name = file.name && file.name.trim() ? file.name : `clipboard-${new Date().toISOString().replace(/[:.]/g, "-")}.png`;
        const named = new File([file], name, { type: file.type || "image/png" });
        await uploadNoteImage(named);
      } catch (error) {
        notify(error instanceof Error ? error.message : "Clipboard image paste failed", "error");
      } finally {
        setPastingImage(false);
      }
    },
    [uploadNoteImage, notify]
  );

  const imagePreviewExtension = useMemo(() => createMarkdownImagePreviewExtension(), []);

  // Stable ref so wikilink autocomplete always sees current notes without recreating the extension.

  const codeLanguageExtension = useMemo(() => {
    switch (codeLanguage) {
      case "typescript":
        return javascript({ typescript: true, jsx: true });
      case "javascript":
        return javascript({ typescript: false, jsx: true });
      case "python":
        return python();
      case "html":
        return html();
      case "css":
        return css();
      case "sql":
        return sql();
      case "json":
        return javascript({ typescript: false });
      case "plaintext":
      default:
        return [];
    }
  }, [codeLanguage]);

  const editorExtensions = useMemo(() => {
    const extensions = [
      markdown(),
      EditorView.lineWrapping,
      imagePreviewExtension,
      EditorView.domEventHandlers({
        click: (_event, view) => {
          const pos = view.state.selection.main.head;
          const doc = view.state.doc.toString();
          const placeholders: RegExp[] = [
            /\[!(?:info|warning|note|tip|danger)\] (Title)/g,
            /> (Write your key idea here\.)/g,
            /> (Quoted source)/g,
          ];
          for (const pattern of placeholders) {
            let m: RegExpExecArray | null;
            while ((m = pattern.exec(doc)) !== null) {
              const start = m.index + m[0].indexOf(m[1]);
              const end = start + m[1].length;
              if (pos >= start && pos <= end) {
                view.dispatch({ selection: { anchor: start, head: end } });
                return true;
              }
            }
          }
          return false;
        },
        mousedown: (event, view) => {
          const target = event.target as HTMLElement | null;
          const preview = target?.closest?.("[data-md-img-preview='1']") as HTMLElement | null;
          if (!preview) return false;
          event.preventDefault();
          // Try to select the underlying markdown image token so Ctrl+X/C/V works naturally.
          const pos = view.posAtDOM(preview, 0);
          const line = view.state.doc.lineAt(pos);
          const text = line.text;
          const match = /!\[([^\]]*)\]\(([^)]+)\)\.?/.exec(text);
          if (!match || typeof match.index !== "number") return true;
          const from = line.from + match.index;
          const to = from + match[0].length;
          view.dispatch({ selection: { anchor: from, head: to } });
          return true;
        },
        keydown: (event, view) => {
          // Ctrl+/ → inline AI
          if ((event.ctrlKey || event.metaKey) && event.key === "/") {
            event.preventDefault();
            openInlineAIRef.current(view);
            return true;
          }
          // If an image token is selected, ignore normal typing so we don't insert characters before `![...]`.
          const sel = view.state.selection.main;
          if (sel.from === sel.to) return false;
          const selected = view.state.sliceDoc(sel.from, sel.to).trim();
          const isImageToken = /^!\[[^\]]*\]\([^)]+\)\.?$/.test(selected);
          if (!isImageToken) return false;

          const key = event.key;
          const typingChar = key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
          if (typingChar) {
            event.preventDefault();
            return true;
          }
          return false;
        },
        paste: (event, view) => {
          const items = Array.from(event.clipboardData?.items ?? []);
          const imageItem = items.find((item) => item.type.startsWith("image/"));
          if (!imageItem) return false;
          const file = imageItem.getAsFile();
          if (!file || !activeNoteRef.current) return false;
          event.preventDefault();
          void pasteClipboardImage(file, view);
          return true;
        }
      })
    ];
    if (!editorHighlight?.excerpt.trim()) return extensions;
    return [...extensions, createSourceHighlightExtension(editorHighlight.excerpt)];
  }, [editorHighlight, imagePreviewExtension, pasteClipboardImage]);

  const codeEditorExtensions = useMemo(() => {
    const base = [EditorView.lineWrapping, codeLanguageExtension].flat();
    return base;
  }, [codeLanguageExtension]);

  async function replaceSelectionWith(text: string) {
    if (!editorView || !activeNote) return;
    const selection = editorView.state.selection.main;
    const currentText = editorView.state.doc.toString();
    const nextText = `${currentText.slice(0, selection.from)}${text}${currentText.slice(selection.to)}`;
    const cursor = selection.from + text.length;
    await applyEditorText(nextText, { anchor: cursor });
  }

  async function wrapSelection(prefix: string, suffix = "") {
    if (!editorView || !activeNote) return;
    const selection = editorView.state.selection.main;
    const currentText = editorView.state.doc.toString();
    const selected = currentText.slice(selection.from, selection.to);
    const insert = `${prefix}${selected}${suffix}`;
    const nextText = `${currentText.slice(0, selection.from)}${insert}${currentText.slice(selection.to)}`;
    const start = selection.from + prefix.length;
    const end = start + selected.length;
    await applyEditorText(nextText, { anchor: start, head: end });
  }

  async function insertHeading() {
    await wrapSelection("## ", "");
  }

  async function insertListItem() {
    if (!editorView || !activeNote) return;
    const selection = editorView.state.selection.main;
    const currentText = editorView.state.doc.toString();
    const line = editorView.state.doc.lineAt(selection.from);
    const prefix = line.from === selection.from ? "- " : "\n- ";
    await replaceSelectionWith(prefix);
  }

  async function insertQuote() {
    if (!editorView || !activeNote) return;
    const selection = editorView.state.selection.main;
    const currentText = editorView.state.doc.toString();
    const selected = currentText.slice(selection.from, selection.to) || "Quoted source";
    const quoted = selected
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
    await replaceSelectionWith(quoted);
  }

  async function insertCalloutBox() {
    if (!editorView || !activeNote) return;
    const selection = editorView.state.selection.main;
    const currentText = editorView.state.doc.toString();
    const selected = currentText.slice(selection.from, selection.to).trim();
    const titlePlaceholder = "Title";
    const body = selected || "Write your key idea here.";
    const block =
      `> [!info] ${titlePlaceholder}\n` +
      body.split("\n").map((line) => `> ${line}`).join("\n");
    const nextText = `${currentText.slice(0, selection.from)}${block}${currentText.slice(selection.to)}`;
    // Auto-select "Title" so user can type straight over it
    const titleStart = selection.from + 10; // "> [!info] " = 10 chars
    const titleEnd = titleStart + titlePlaceholder.length;
    await applyEditorText(nextText, { anchor: titleStart, head: titleEnd });
  }

  async function insertCodeBlock() {
    if (!editorView || !activeNote) return;
    const selection = editorView.state.selection.main;
    const currentText = editorView.state.doc.toString();
    const selected = currentText.slice(selection.from, selection.to);
    const block = `\`\`\`text\n${selected}\n\`\`\``;
    await replaceSelectionWith(block);
  }

  async function insertSnippetFromCodeTab() {
    try {
      if (!activeNote) return;
      const snippet = codeSnippet.trimEnd();
      if (!snippet) return notify("Paste or type some code first", "info");
      const lang =
        codeLanguage === "typescript" ? "ts" :
        codeLanguage === "javascript" ? "js" :
        codeLanguage === "python" ? "python" :
        codeLanguage === "html" ? "html" :
        codeLanguage === "css" ? "css" :
        codeLanguage === "sql" ? "sql" :
        codeLanguage === "json" ? "json" :
        "";

      // If the snippet contains ``` already, use a longer fence.
      const fenceMarker = snippet.includes("```") ? "````" : "```";
      const fence = `${fenceMarker}${lang}\n${snippet}\n${fenceMarker}`;

      const currentText = draftMarkdownRef.current;
      const cursor = clamp(editorCursorRef.current, 0, currentText.length);
      const before = currentText.slice(0, cursor);
      const lead = cursor > 0 && !before.endsWith("\n\n") ? (before.endsWith("\n") ? "\n" : "\n\n") : "";
      const insert = `${lead}${fence}\n\n`;
      const nextText = `${before}${insert}${currentText.slice(cursor)}`;
      await replaceActiveMarkdown(nextText);
      setCodeSnippet("");
      setNoteView("write");
      notify("Snippet inserted", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to insert snippet", "error");
    }
  }

  async function formatActiveMarkdown() {
    if (!activeNote) return;
    setFormatting(true);
    try {
      const response = await fetch("/api/format", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ markdown: activeNote.markdownContent })
      });
      const body = (await response.json().catch(() => ({}))) as { markdown?: string; error?: string; mode?: string };
      if (!response.ok || !body.markdown) throw new Error(body.error || "Unable to format Markdown");
      await applyEditorText(body.markdown);
      notify(body.mode === "ai" ? "Markdown formatted with AI cleanup" : "Markdown formatted", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to format Markdown", "error");
    } finally {
      setFormatting(false);
    }
  }

  async function uploadNoteImage(file: File) {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/images", { method: "POST", body: formData });
      const body = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !body.url) throw new Error(body.error || "Upload failed");
      const alt = file.name.replace(/\.[^/.]+$/, "");
      const mdUrl = body.url.startsWith("/api/images/") ? body.url.replace("/api/images/", "/_img/") : body.url;
      if (!editorView || !activeNote) return;
      const selection = editorView.state.selection.main;
      const currentText = editorView.state.doc.toString();
      const before = currentText.slice(0, selection.from);
      const needsLead = selection.from > 0 && !before.endsWith("\n\n");
      const lead = needsLead ? (before.endsWith("\n") ? "\n" : "\n\n") : "";
      const insert = `${lead}![${alt}](${mdUrl})\n\n`;
      const nextText = `${before}${insert}${currentText.slice(selection.to)}`;
      const cursor = selection.from + insert.length;
      await applyEditorText(nextText, { anchor: cursor });
      notify("Image uploaded", "success");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Image upload failed", "error");
    } finally {
      setUploadingImage(false);
    }
  }

  async function insertTable(rows: number, columns: number) {
    await replaceSelectionWith(buildMarkdownTable(rows, columns));
  }

  async function addTableRow() {
    if (!editorView || !currentTableContext) return;
    const next = insertTableRow(editorView.state.doc.toString(), currentTableContext);
    await applyEditorText(next.text, { anchor: next.selection });
  }

  async function removeTableRow() {
    if (!editorView || !currentTableContext) return;
    const next = deleteTableRow(editorView.state.doc.toString(), currentTableContext);
    if (!next) return notify("Table needs at least one body row", "info");
    await applyEditorText(next.text, { anchor: next.selection });
  }

  async function addTableColumn() {
    if (!editorView || !currentTableContext) return;
    const next = insertTableColumn(editorView.state.doc.toString(), currentTableContext);
    await applyEditorText(next.text, { anchor: next.selection });
  }

  async function removeTableColumn() {
    if (!editorView || !currentTableContext) return;
    const next = deleteTableColumn(editorView.state.doc.toString(), currentTableContext);
    if (!next) return notify("Table needs at least one column", "info");
    await applyEditorText(next.text, { anchor: next.selection });
  }

  async function importDocument(markdown: string, fileName: string, options: { importMode: "single" | "split"; title?: string }) {
    // Extract title from filename or use first line of content
    let title = options.title?.trim() || fileName.replace(/\.[^/.]+$/, "").replace(/-/g, " ");
    if (!title || title === "pasted-content") {
      const firstLine = markdown.split("\n")[0].replace(/^#+\s*/, "").trim();
      title = firstLine || "Imported document";
    }

    const folderId = scope.type === "folder" ? scope.folderId : null;
    const importedNotes =
      options.importMode === "split" ? splitImportedMarkdown(markdown, title) : [{ title, markdownContent: markdown }];
    let firstNote: Note | null = null;
    for (const importedNote of importedNotes) {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: importedNote.title, folderId, markdownContent: importedNote.markdownContent })
      });
      const note = (await response.json()) as Note;
      firstNote ??= note;
    }
    await refresh();
    if (firstNote) selectNote(firstNote.id);
    notify(importedNotes.length > 1 ? `Imported ${importedNotes.length} notes` : `Document imported as "${title}"`, "success");
  }

  function createFolder(parentId: string | null = contextFolderId()) {
    setInputDialog({
      title: parentId ? "Create nested folder" : "Create folder",
      label: parentId ? "Folder name" : "Folder or class name",
      placeholder: parentId ? "e.g. Week 04" : "e.g. SDV503",
      value: "",
      submitLabel: "Create folder",
      onSubmit: async (value) => {
        await createFolderWithName(value.trim() || "Untitled folder", parentId);
      }
    });
  }

  async function createFolderWithName(name: string, parentId: string | null = null) {
    await fetch("/api/folders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, parentId, workspaceId: activeWorkspaceId })
    });
    await refresh();
    notify("Folder created", "success");
  }

  function createLectureWorkflow(folder: FolderType) {
    setInputDialog({
      title: "Create project workspace",
      label: "Project name",
      placeholder: `Project ${new Date().toLocaleDateString()}`,
      value: `Project ${new Date().toLocaleDateString()}`,
      submitLabel: "Create project",
      onSubmit: async (projectName) => {
        const trimmedName = projectName.trim();
        if (!trimmedName) return;
        await createProjectWorkspace(folder, trimmedName);
      }
    });
  }

  async function createProjectWorkspace(folder: FolderType, projectName: string) {
    const folderResponse = await fetch("/api/folders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: projectName.trim(), parentId: folder.id, workspaceId: activeWorkspaceId })
    });
    const projectFolder = (await folderResponse.json()) as FolderType;
    const templates = [
      {
        title: `${projectName.trim()} - Source Material`,
        markdownContent: `# ${projectName.trim()} - Source Material\n\nAdd research, reports, or reference documents here. The AI will cite from this content.\n\n## Document 1\n\n- `
      },
      {
        title: `${projectName.trim()} - Notes`,
        markdownContent: `# ${projectName.trim()} - Notes\n\n## Key points\n\n- \n\n## Action items\n\n- `
      },
      {
        title: `${projectName.trim()} - Briefing`,
        markdownContent: `# ${projectName.trim()} - Briefing\n\n## Summary\n\n- \n\n## Open questions\n\n- `
      }
    ];
    let firstNote: Note | null = null;
    for (const template of templates) {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...template, folderId: projectFolder.id, workspaceId: activeWorkspaceId })
      });
      firstNote ??= (await response.json()) as Note;
    }
    await refresh();
    setCollapsedFolders((current) => ({ ...current, [folder.id]: false, [projectFolder.id]: false }));
    if (firstNote) selectNote(firstNote.id);
    notify("Project workspace created", "success");
  }

  function renameFolderById(folder: FolderType) {
    setInputDialog({
      title: "Rename folder",
      label: "Folder name",
      placeholder: folder.name,
      value: folder.name,
      submitLabel: "Rename folder",
      onSubmit: async (name) => {
        if (!name.trim()) return;
        await fetch(`/api/folders/${folder.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name })
        });
        await refresh();
        notify("Folder renamed", "success");
      }
    });
  }

  async function deleteFolderById(folder: FolderType) {
    setData((current) =>
      current
        ? {
            ...current,
            folders: current.folders.filter((item) => item.id !== folder.id)
          }
        : current
    );
    await fetch(`/api/folders/${folder.id}`, { method: "DELETE" });
    if (scope.type === "folder" && scope.folderId === folder.id) setScope({ type: "all" });
    await refresh();
    notify("Folder deleted", "info");
  }

  function requestDeleteFolder(folder: FolderType) {
    const count = data?.notes.filter((note) => note.folderId === folder.id).length ?? 0;
    const detail = count ? `${count} note${count === 1 ? "" : "s"} will move to Unfiled notes.` : "This removes the folder from your workspace.";
    setConfirmState({
      title: `Delete "${folder.name}"?`,
      description: detail,
      confirmLabel: "Delete folder",
      tone: "danger",
      onConfirm: () => deleteFolderById(folder)
    });
  }

  async function moveFolderById(folder: FolderType, parentId: string | null) {
    if (parentId === folder.id) return notify("A folder cannot move into itself", "error");
    const response = await fetch(`/api/folders/${folder.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ parentId })
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      notify(payload?.error ?? "Folder could not be moved", "error");
      return;
    }
    await refresh();
    notify(parentId ? "Folder moved" : "Folder moved to vault root", "success");
  }

  async function moveNoteToFolder(note: Note, folderId: string | null) {
    await updateNote(note.id, { folderId });
    await refresh();
    notify(folderId ? "Note moved" : "Note moved to Unfiled notes", "success");
  }

  async function bulkDeleteSelected() {
    const ids = [...bulkSelectedIds];
    if (!ids.length) return;
    setConfirmState({
      title: `Delete ${ids.length} note${ids.length === 1 ? "" : "s"}?`,
      description: "This removes the selected notes and their indexed chunks.",
      confirmLabel: "Delete all",
      tone: "danger",
      onConfirm: async () => {
        for (const id of ids) {
          await fetch(`/api/notes/${id}`, { method: "DELETE" });
        }
        setBulkSelectedIds(new Set());
        setBulkMode(false);
        await refresh();
        notify(`${ids.length} note${ids.length === 1 ? "" : "s"} deleted`, "info");
      }
    });
  }

  function bulkMoveSelected() {
    const ids = [...bulkSelectedIds];
    if (!ids.length) return;
    setMoveDialog({
      title: `Move ${ids.length} note${ids.length === 1 ? "" : "s"}`,
      description: "Choose a destination folder.",
      submitLabel: "Move notes",
      currentFolderId: undefined,
      allowRootLabel: "Workspace root / Unfiled documents",
      options: data?.folders ?? [],
      onSubmit: async (folderId) => {
        for (const id of ids) {
          await fetch(`/api/notes/${id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ folderId })
          });
        }
        setBulkSelectedIds(new Set());
        setBulkMode(false);
        await refresh();
        notify(`${ids.length} note${ids.length === 1 ? "" : "s"} moved`, "success");
      }
    });
  }

  async function duplicateNoteById(note: Note) {
    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: `${note.title} (copy)`, folderId: note.folderId, markdownContent: note.markdownContent })
    });
    const newNote = (await response.json()) as Note;
    await refresh();
    selectNote(newNote.id);
    notify(`"${note.title}" duplicated`, "success");
  }

  function chooseFolderForNote(note: Note) {
    setMoveDialog({
      title: `Move "${note.title}"`,
      description: "Choose a destination folder for this note.",
      submitLabel: "Move note",
      currentFolderId: note.folderId,
      allowRootLabel: "Workspace root / Unfiled documents",
      options: data?.folders ?? [],
      onSubmit: async (folderId) => {
        await moveNoteToFolder(note, folderId);
      }
    });
  }

  function chooseFolderForFolder(folder: FolderType) {
    setMoveDialog({
      title: `Move "${folder.name}"`,
      description: "Choose a destination folder for this folder.",
      submitLabel: "Move folder",
      currentFolderId: folder.parentId,
      allowRootLabel: "Workspace root",
      options: (data?.folders ?? []).filter((item) => item.id !== folder.id),
      onSubmit: async (folderId) => {
        await moveFolderById(folder, folderId);
      }
    });
  }

  async function handleDropOnFolder(targetFolder: FolderType) {
    if (!dragItem) return;
    if (dragItem.kind === "note") {
      const note = data?.notes.find((item) => item.id === dragItem.id);
      if (note) await moveNoteToFolder(note, targetFolder.id);
    } else {
      const folder = data?.folders.find((item) => item.id === dragItem.id);
      if (folder) await moveFolderById(folder, targetFolder.id);
    }
    setDragItem(null);
  }

  async function handleDropOnRoot() {
    if (!dragItem) return;
    if (dragItem.kind === "note") {
      const note = data?.notes.find((item) => item.id === dragItem.id);
      if (note) await moveNoteToFolder(note, null);
    } else {
      const folder = data?.folders.find((item) => item.id === dragItem.id);
      if (folder) await moveFolderById(folder, null);
    }
    setDragItem(null);
  }

  function renameNoteById(note: Note) {
    setInputDialog({
      title: "Rename note",
      label: "Note name",
      placeholder: note.title,
      value: note.title,
      submitLabel: "Rename note",
      onSubmit: async (title) => {
        if (!title.trim()) return;
        await updateNote(note.id, { title });
        if (activeNoteId === note.id) setDraftTitle(title);
        notify("Note renamed", "success");
      }
    });
  }

  async function deleteNoteById(note: Note) {
    setData((current) =>
      current
        ? {
            ...current,
            notes: current.notes.filter((item) => item.id !== note.id)
          }
        : current
    );
    await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
    setOpenNoteIds((current) => current.filter((id) => id !== note.id));
    setPinnedNoteIds((current) => current.filter((id) => id !== note.id));
    if (activeNoteId === note.id) {
      const nextActiveId = data?.notes.find((item) => item.id !== note.id)?.id ?? null;
      setActiveNoteId(nextActiveId);
    }
    await refresh();
    notify("Note deleted", "info");
  }

  function requestDeleteNote(note: Note) {
    setConfirmState({
      title: `Delete "${note.title}"?`,
      description: "This removes the note and its indexed chunks from your workspace.",
      confirmLabel: "Delete note",
      tone: "danger",
      onConfirm: () => deleteNoteById(note)
    });
  }

  async function deleteActiveNote() {
    if (!activeNote) return;
    requestDeleteNote(activeNote);
  }

  function exportActiveNote() {
    if (!activeNote) return;
    const blob = new Blob([activeNote.markdownContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${activeNote.title.replace(/[/\\:*?"<>|]/g, "-")}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function exportVaultAsZip() {
    if (!data) return;
    const { default: JSZip } = await import("jszip") as { default: typeof import("jszip") };
    const zip = new JSZip();
    for (const note of vaultNotes) {
      const folder = data.folders.find((f) => f.id === note.folderId);
      const dir = folder ? `${folder.name}/` : "";
      const filename = `${note.title.replace(/[/\\:*?"<>|]/g, "-")}.md`;
      zip.file(dir + filename, note.markdownContent);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "vault-export.zip";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const [publicToken, setPublicToken] = useState<string | null>(null);
  const [publicLinkLoading, setPublicLinkLoading] = useState(false);

  useEffect(() => {
    setPublicToken(null);
    if (!activeNoteId) return;
    fetch(`/api/notes/${activeNoteId}/public-link`)
      .then(async (r) => { if (r.ok) { const d = await r.json() as { token: string | null }; setPublicToken(d.token); } })
      .catch(() => {});
  }, [activeNoteId]);

  async function togglePublicLink() {
    if (!activeNote) return;
    setPublicLinkLoading(true);
    try {
      if (publicToken) {
        await fetch(`/api/notes/${activeNote.id}/public-link`, { method: "DELETE" });
        setPublicToken(null);
        notify("Public link disabled", "info");
      } else {
        const res = await fetch(`/api/notes/${activeNote.id}/public-link`, { method: "POST" });
        const body = await res.json() as { token: string };
        setPublicToken(body.token);
        await navigator.clipboard.writeText(`${window.location.origin}/share/${body.token}`);
        notify("Public link copied to clipboard", "success");
      }
    } finally {
      setPublicLinkLoading(false);
    }
  }

  const backlinks = useMemo(() => {
    if (!activeNote || !data) return [];
    const titleLower = activeNote.title.toLowerCase();
    return data.notes.filter(
      (note) =>
        note.id !== activeNote.id &&
        note.markdownContent.toLowerCase().includes(`[[${titleLower}]]`)
    );
  }, [activeNote, data]);

  const allTags = useMemo(() => {
    if (!data?.noteTags) return [];
    const tagSet = new Set<string>();
    for (const tags of Object.values(data.noteTags)) {
      for (const tag of tags) tagSet.add(tag);
    }
    return [...tagSet].sort();
  }, [data?.noteTags]);

  useEffect(() => {
    setRelatedNotes([]);
    setSuggestedTagsState(null);
    setSuggestTagsOpen(false);
    if (!activeNoteId) return;
    let cancelled = false;
    fetch(`/api/notes/${activeNoteId}/related`).then(async (r) => {
      if (!r.ok || cancelled) return;
      const data = await r.json() as { noteId: string; title: string; score: number }[];
      if (!cancelled) setRelatedNotes(data);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [activeNoteId]);

  const vaultNotes = useMemo(() => {
    if (!data) return [];
    let notes = data.notes;
    if (selectedTag) notes = notes.filter((n) => (data.noteTags[n.id] ?? []).includes(selectedTag));
    if (vaultSearch.trim()) {
      const q = vaultSearch.toLowerCase();
      notes = notes.filter((n) => n.title.toLowerCase().includes(q));
    }
    return notes;
  }, [data, selectedTag, vaultSearch]);

  const wordCount = useMemo(() => {
    const text = draftMarkdown
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`[^`]+`/g, "")
      .replace(/[#*_~\[\]()!|]/g, " ")
      .trim();
    return text ? text.split(/\s+/).filter(Boolean).length : 0;
  }, [draftMarkdown]);

  const readingMinutes = Math.max(1, Math.ceil(wordCount / 200));

  async function suggestTagsForNote() {
    if (!activeNote) return;
    setSuggestingTags(true);
    setSuggestTagsOpen(true);
    try {
      const res = await fetch(`/api/notes/${activeNote.id}/suggest-tags`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        notify(body.error ?? "Could not suggest tags", "error");
        setSuggestTagsOpen(false);
        return;
      }
      const body = await res.json() as { suggested: string[]; existingTags: { id: string; name: string; color: string }[] };
      setSuggestedTagsState(body);
    } finally {
      setSuggestingTags(false);
    }
  }

  async function applyTag(tagName: string, existingTagsFromSuggest: { id: string; name: string; color: string }[]) {
    if (!activeNote) return;
    const existing = existingTagsFromSuggest.find((t) => t.name.toLowerCase() === tagName.toLowerCase());
    const currentNoteTags = data?.noteTags[activeNote.id] ?? [];
    if (currentNoteTags.includes(tagName)) return;
    let tagId: string;
    if (existing) {
      tagId = existing.id;
    } else {
      const res = await fetch("/api/tags", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: tagName }) });
      if (!res.ok) { notify("Failed to create tag", "error"); return; }
      const newTag = await res.json() as { id: string };
      tagId = newTag.id;
    }
    await fetch(`/api/notes/${activeNote.id}/tags`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tagId }) });
    setData((d) => {
      if (!d) return d;
      const prev = d.noteTags[activeNote.id] ?? [];
      return { ...d, noteTags: { ...d.noteTags, [activeNote.id]: [...prev, tagName] } };
    });
    notify(`Tag "${tagName}" applied`, "success");
  }

  async function reindexScope(input: { noteId?: string; folderId?: string | null }, label: string) {
    notify(`Indexing ${label}`, "info");
    const response = await fetch("/api/index", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input)
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      notify(body?.error || "Indexing failed", "error");
      return;
    }
    await refresh();
    notify(`${label} indexed`, "success");
  }

  function resizePanel(side: "left" | "right", event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = side === "left" ? leftWidth : rightWidth;
    let lastWidth = startWidth;
    const onMove = (moveEvent: globalThis.MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const next = side === "left" ? clamp(startWidth + delta, 240, 420) : clamp(startWidth - delta, 340, 560);
      lastWidth = next;
      if (side === "left") setLeftWidth(next);
      else setRightWidth(next);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      const leftValue = side === "left" ? lastWidth : undefined;
      const rightValue = side === "right" ? lastWidth : undefined;
      if (leftValue !== undefined) window.localStorage.setItem("studyos:leftWidth", String(leftValue));
      if (rightValue !== undefined) window.localStorage.setItem("studyos:rightWidth", String(rightValue));
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function closeNoteTab(noteId: string) {
    setOpenNoteIds((current) => {
      const next = current.filter((id) => id !== noteId);
      if (activeNoteId === noteId) setActiveNoteId(next[0] ?? data?.notes.find((note) => note.id !== noteId)?.id ?? null);
      return next;
    });
  }

  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center bg-ink-950 text-ink-100">
        <div className="surface-soft shimmer flex w-72 items-center gap-3 rounded-lg px-4 py-3 text-sm text-ink-300 shadow-panel">
          <Loader2 className="h-4 w-4 animate-spin text-accent-400" />
          Opening workspace
        </div>
      </main>
    );
  }

  const rootFolders = data.folders.filter((folder) => !folder.parentId);
  const renderFolderNode = (folder: FolderType, depth = 0): ReactNode => {
    const folderNotes = vaultNotes.filter((note) => note.folderId === folder.id);
    const childFolders = data.folders.filter((child) => child.parentId === folder.id);
    const collapsed = collapsedFolders[folder.id] ?? false;
    return (
      <div key={folder.id} className="rounded-lg" style={{ marginLeft: depth ? 12 : 0 }}>
        <FolderRow
          folder={folder}
          count={folderNotes.length + childFolders.length}
          collapsed={collapsed}
          active={scope.type === "folder" && scope.folderId === folder.id}
          depth={depth}
          dragActive={dragItem?.id !== folder.id}
          onClick={() => setScope({ type: "folder", folderId: folder.id })}
          onToggle={() => setCollapsedFolders((current) => ({ ...current, [folder.id]: !collapsed }))}
          onCreate={() => createNote(folder.id)}
          onCreateFolder={() => createFolder(folder.id)}
          onCreateLecture={() => createLectureWorkflow(folder)}
          onRename={() => renameFolderById(folder)}
          onDelete={() => requestDeleteFolder(folder)}
          onMove={() => chooseFolderForFolder(folder)}
          onReindex={() => reindexScope({ folderId: folder.id }, folder.name)}
          onDragStart={() => setDragItem({ kind: "folder", id: folder.id })}
          onDrop={() => handleDropOnFolder(folder)}
          onMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setVaultMenu({ kind: "folder", id: folder.id, x: event.clientX, y: event.clientY });
          }}
        />
        <div className={`overflow-hidden pl-4 transition-[max-height,opacity] duration-300 ease-premium ${collapsed ? "max-h-0 opacity-0" : "max-h-[720px] opacity-100"}`}>
          <div className="ml-2 mt-1 space-y-1 border-l border-ink-700/70 pl-2">
            {childFolders.map((child) => renderFolderNode(child, depth + 1))}
            {folderNotes.map((note) => (
              <NoteRow
                key={note.id}
                note={note}
                active={activeNoteId === note.id}
                pinned={pinnedNoteIds.includes(note.id)}
                bulkMode={bulkMode}
                bulkSelected={bulkSelectedIds.has(note.id)}
                onToggleBulk={() => setBulkSelectedIds((prev) => { const next = new Set(prev); next.has(note.id) ? next.delete(note.id) : next.add(note.id); return next; })}
                onClick={() => selectNote(note.id)}
                onTogglePin={() => togglePinNote(note)}
                onRename={() => renameNoteById(note)}
                onDelete={() => requestDeleteNote(note)}
                onMove={() => chooseFolderForNote(note)}
                onReindex={() => reindexScope({ noteId: note.id }, note.title)}
                onDragStart={() => setDragItem({ kind: "note", id: note.id })}
                onMenu={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setVaultMenu({ kind: "note", id: note.id, x: event.clientX, y: event.clientY });
                }}
              />
            ))}
            {!childFolders.length && !folderNotes.length ? <div className="px-2 py-2 text-xs text-ink-500">Drop notes or folders here</div> : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="flex h-screen overflow-hidden bg-ink-950 text-ink-100">
      <SideRail
        data={data}
        railPinned={railPinned}
        setRailPinned={setRailPinned}
        leftOpen={leftOpen}
        rightOpen={rightOpen}
        tab={tab}
        onSetTab={(next) => {
          setTab(next);
          setRightOpen(true);
          if (isMobile) setMobileTab("study");
        }}
        onToggleLeft={() => {
          setLeftOpen((open) => !open);
          if (isMobile) setMobileTab("vault");
        }}
        onToggleRight={() => {
          setRightOpen((open) => !open);
          if (isMobile) setMobileTab("study");
        }}
        onFind={() => setCommandOpen(true)}
        onReindex={reindexAll}
        reindexing={reindexingAll}
        onImport={() => setImportModalOpen(true)}
        onFeedback={() => setFeedbackOpen(true)}
        onNewFolder={() => createFolder()}
        onNewNote={() => createNote()}
        onAccount={() => {
          window.location.href = "/account";
        }}
        onLogout={async () => {
          await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
          window.location.href = "/auth";
        }}
      />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <div
          className="grid flex-1 overflow-hidden transition-[grid-template-columns] duration-300 ease-premium"
          style={{ ...workspaceGridStyle, height: isMobile ? "calc(100vh - 56px)" : "100vh" }}
        >
        <aside className={`panel-shell relative min-h-0 overflow-hidden border-r transition-opacity duration-200 ${leftOpen && !zenMode ? "opacity-100" : "pointer-events-none opacity-0"} ${isMobile && mobileTab !== "vault" ? "hidden" : ""}`}>
          <div className="border-b border-white/[0.06] bg-ink-950/40 px-3 py-2">
            {/* Breadcrumb: Workspace › Folder  +  actions */}
            <div className="flex min-w-0 items-center gap-1">
              {activeWorkspace ? <Users className="h-3 w-3 shrink-0 text-accent-400" /> : <BookOpen className="h-3 w-3 shrink-0 text-accent-400" />}
              <select
                aria-label="Active workspace"
                value={activeWorkspaceId ?? "__personal__"}
                onChange={(event) => void switchWorkspace(event.target.value === "__personal__" ? null : event.target.value)}
                className="control-soft min-w-0 bg-transparent text-xs font-semibold text-ink-100 outline-none"
              >
                <option value="__personal__">Personal</option>
                {(data?.workspaces ?? []).map((ws) => (
                  <option key={ws.id} value={ws.id}>{ws.name}</option>
                ))}
              </select>
              <ChevronRight className="h-3 w-3 shrink-0 text-ink-600" />
              <select
                aria-label="Workspace root"
                value={vaultRootId}
                onChange={(event) => { setVaultRootId(event.target.value); setCollapsedFolders({}); setLeftOpen(true); }}
                className="control-soft min-w-0 flex-1 bg-transparent text-xs text-ink-400 outline-none"
              >
                <option value="__all__">All documents</option>
                {topLevelFolders.map((folder) => (
                  <option key={folder.id} value={folder.id}>{folder.name}</option>
                ))}
              </select>
              <div className="ml-1 flex shrink-0 items-center gap-0.5">
                <IconButton label="New note" onClick={() => createNote()}>
                  <FilePlus className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton label="New folder" onClick={() => createFolder()}>
                  <FolderPlus className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton label="Export vault as zip" onClick={() => void exportVaultAsZip()}>
                  <Download className="h-3.5 w-3.5" />
                </IconButton>
              </div>
            </div>
          </div>

          <div className="border-b border-ink-700/40 px-3 py-2">
            <div className="flex items-center gap-2 rounded-lg border border-ink-700/50 bg-ink-900/60 px-2.5 py-1.5">
              <Search className="h-3.5 w-3.5 shrink-0 text-ink-500" />
              <input
                type="text"
                value={vaultSearch}
                onChange={(e) => setVaultSearch(e.target.value)}
                placeholder="Filter notes…"
                className="min-w-0 flex-1 bg-transparent text-xs text-ink-100 placeholder-ink-600 outline-none"
              />
              {vaultSearch && (
                <button onClick={() => setVaultSearch("")} className="text-ink-600 hover:text-ink-300">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          <div className="h-[calc(100%-85px)] overflow-auto px-3 py-4">
            {bulkMode && bulkSelectedIds.size > 0 ? (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-accent-500/25 bg-accent-500/10 px-3 py-2">
                <span className="flex-1 text-xs font-semibold text-accent-300">{bulkSelectedIds.size} selected</span>
                <button onClick={() => void bulkMoveSelected()} className="rounded px-2 py-1 text-xs font-medium text-ink-300 hover:text-ink-100">Move</button>
                <button onClick={() => void bulkDeleteSelected()} className="rounded px-2 py-1 text-xs font-medium text-danger-400 hover:text-danger-300">Delete</button>
              </div>
            ) : null}
            {allTags.length > 0 ? (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {selectedTag ? (
                  <button
                    onClick={() => setSelectedTag(null)}
                    className="flex items-center gap-1 rounded-full border border-accent-500/40 bg-accent-500/15 px-2 py-0.5 text-xs font-semibold text-accent-300"
                  >
                    <Tag className="h-3 w-3" />
                    {selectedTag}
                    <X className="h-3 w-3" />
                  </button>
                ) : (
                  allTags.slice(0, 8).map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(tag)}
                      className="flex items-center gap-1 rounded-full border border-ink-700/60 bg-ink-900/40 px-2 py-0.5 text-xs text-ink-400 hover:border-accent-500/30 hover:text-ink-200"
                    >
                      <Tag className="h-3 w-3" />
                      {tag}
                    </button>
                  ))
                )}
              </div>
            ) : null}
            {vaultSearch.trim() ? (
              <div className="space-y-1">
                {vaultNotes.length === 0 ? (
                  <div className="px-2 py-6 text-center text-xs text-ink-500">No notes match &ldquo;{vaultSearch}&rdquo;</div>
                ) : vaultNotes.map((note) => (
                  <NoteRow
                    key={note.id}
                    note={note}
                    active={activeNoteId === note.id}
                    pinned={pinnedNoteIds.includes(note.id)}
                    bulkMode={bulkMode}
                    bulkSelected={bulkSelectedIds.has(note.id)}
                    onToggleBulk={() => setBulkSelectedIds((prev) => { const next = new Set(prev); next.has(note.id) ? next.delete(note.id) : next.add(note.id); return next; })}
                    onClick={() => { selectNote(note.id); setVaultSearch(""); }}
                    onTogglePin={() => togglePinNote(note)}
                    onRename={() => renameNoteById(note)}
                    onDelete={() => requestDeleteNote(note)}
                    onMove={() => chooseFolderForNote(note)}
                    onReindex={() => reindexScope({ noteId: note.id }, note.title)}
                    onDragStart={() => setDragItem({ kind: "note", id: note.id })}
                    onMenu={(event) => { event.preventDefault(); event.stopPropagation(); setVaultMenu({ kind: "note", id: note.id, x: event.clientX, y: event.clientY }); }}
                  />
                ))}
              </div>
            ) : vaultRootFolder ? (
              <>
                <button
                  onClick={() => {
                    setVaultRootId("__all__");
                    setScope({ type: "all" });
                  }}
                  className="control-soft mb-4 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-ink-300 hover:text-ink-100"
                >
                  <Layers3 className="h-4 w-4" />
                  Back to all notes
                </button>

                <div className="space-y-1.5">{renderFolderNode(vaultRootFolder)}</div>
              </>
            ) : (
              <>
                <button
                  onClick={() => setScope({ type: "all" })}
                  className={`group mb-4 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm ${
                    scope.type === "all"
                      ? "border border-accent-500/30 bg-accent-500/10 text-accent-300 shadow-glow"
                      : "control-soft text-ink-300"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Layers3 className="h-4 w-4" />
                    All notes
                  </span>
                  <span className="rounded-full bg-white/6 px-2 py-0.5 text-xs text-ink-300">{vaultNotes.length}</span>
                </button>

                {pinnedNotes.length ? (
                  <div className="mb-5">
                    <SectionLabel label="Pinned" />
                    <div className="space-y-1">
                      {pinnedNotes.map((note) => (
                        <NoteRow
                          key={note.id}
                          note={note}
                          active={activeNoteId === note.id}
                          pinned
                          bulkMode={bulkMode}
                          bulkSelected={bulkSelectedIds.has(note.id)}
                          onToggleBulk={() => setBulkSelectedIds((prev) => { const next = new Set(prev); next.has(note.id) ? next.delete(note.id) : next.add(note.id); return next; })}
                          onClick={() => selectNote(note.id)}
                          onTogglePin={() => togglePinNote(note)}
                          onRename={() => renameNoteById(note)}
                          onDelete={() => requestDeleteNote(note)}
                          onMove={() => chooseFolderForNote(note)}
                          onReindex={() => reindexScope({ noteId: note.id }, note.title)}
                          onDragStart={() => setDragItem({ kind: "note", id: note.id })}
                          onMenu={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setVaultMenu({ kind: "note", id: note.id, x: event.clientX, y: event.clientY });
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}

                {recentNotes.length ? (
                  <div className="mb-5">
                    <SectionLabel label="Recent" />
                    <div className="space-y-1">
                      {recentNotes.slice(0, 3).map((note) => (
                        <button
                          key={note.id}
                          onClick={() => selectNote(note.id)}
                          className={`flex w-full min-w-0 items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs ${
                            activeNoteId === note.id
                              ? "bg-accent-500/10 text-accent-200"
                              : "text-ink-500 hover:bg-white/[0.04] hover:text-ink-200"
                          }`}
                        >
                          <Clock3 className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{note.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {(() => {
                  const sharedNotes = vaultNotes.filter((n) => n.userId !== data.user.id);
                  if (!sharedNotes.length) return null;
                  return (
                    <div className="mb-5">
                      <SectionLabel label="Shared with me" />
                      <div className="space-y-1">
                        {sharedNotes.map((note) => (
                          <div key={note.id} className="group relative flex items-center gap-1">
                            <button
                              onClick={() => selectNote(note.id)}
                              className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-all ${
                                activeNoteId === note.id
                                  ? "border-accent-500/30 bg-accent-500/10 text-ink-100"
                                  : "border-transparent text-ink-300 hover:bg-white/[0.04] hover:text-ink-100"
                              }`}
                            >
                              <FileText className="h-3.5 w-3.5 shrink-0 text-ink-500" />
                              <span className="min-w-0 flex-1 truncate text-sm font-medium">{note.title}</span>
                              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                note.sharePermission === "edit"
                                  ? "bg-accent-500/15 text-accent-300"
                                  : "bg-ink-700/60 text-ink-400"
                              }`}>
                                {note.sharePermission === "edit" ? "Edit" : "View"}
                              </span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    void handleDropOnRoot();
                  }}
                >
                  <SectionLabel label="Projects" />
                </div>
                <div className="space-y-1.5">
                  {rootFolders.map((folder) => renderFolderNode(folder))}
                  {rootFolders.length === 0 ? (
                    <EmptyState action="Create folder" onAction={() => createFolder()}>
                      Group documents by project, team, or topic.
                    </EmptyState>
                  ) : null}
                </div>

                <div
                  className="mt-5"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    void handleDropOnRoot();
                  }}
                >
                  <SectionLabel label="Unfiled notes" />
                  <div className="space-y-1">
                    {vaultNotes
                      .filter((note) => !note.folderId)
                      .map((note) => (
                        <NoteRow
                          key={note.id}
                          note={note}
                          bulkMode={bulkMode}
                          bulkSelected={bulkSelectedIds.has(note.id)}
                          onToggleBulk={() => setBulkSelectedIds((prev) => { const next = new Set(prev); next.has(note.id) ? next.delete(note.id) : next.add(note.id); return next; })}
                          active={activeNoteId === note.id}
                          pinned={pinnedNoteIds.includes(note.id)}
                          onClick={() => selectNote(note.id)}
                          onTogglePin={() => togglePinNote(note)}
                          onRename={() => renameNoteById(note)}
                          onDelete={() => requestDeleteNote(note)}
                          onMove={() => chooseFolderForNote(note)}
                          onReindex={() => reindexScope({ noteId: note.id }, note.title)}
                          onDragStart={() => setDragItem({ kind: "note", id: note.id })}
                          onMenu={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setVaultMenu({ kind: "note", id: note.id, x: event.clientX, y: event.clientY });
                          }}
                        />
                      ))}
                  </div>
                </div>
              </>
            )}
          </div>
          {/* Documents section */}
          <div className="mt-5 border-t border-white/[0.06] pt-4">
            <button
              onClick={() => setDocsOpen((o) => !o)}
              className="flex w-full items-center justify-between px-1 pb-2 text-[11px] font-semibold uppercase tracking-widest text-ink-400 hover:text-ink-200"
            >
              <span>Documents</span>
              <div className="flex items-center gap-1.5">
                <label
                  onClick={(e) => e.stopPropagation()}
                  className="cursor-pointer rounded p-0.5 hover:bg-white/[0.06]"
                  title="Upload document (PDF, DOCX, TXT)"
                >
                  <Upload className="h-3.5 w-3.5 text-ink-400 hover:text-ink-100" />
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    className="hidden"
                    disabled={docUploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      if (file.size > 50 * 1024 * 1024) {
                        notify("File too large (max 50 MB)", "error");
                        return;
                      }
                      setDocUploading(true);
                      setDocsOpen(true);
                      try {
                        const fd = new FormData();
                        fd.append("file", file);
                        const res = await fetch("/api/documents", { method: "POST", body: fd });
                        if (!res.ok) {
                          const body = await res.json().catch(() => ({}));
                          throw new Error((body as { error?: string }).error ?? "Upload failed");
                        }
                        notify("Document uploaded and indexed", "success");
                        refresh();
                      } catch (err) {
                        notify(err instanceof Error ? err.message : "Upload failed", "error");
                      } finally {
                        setDocUploading(false);
                      }
                    }}
                  />
                </label>
                {docsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </div>
            </button>
            {docsOpen && (
              <div className="space-y-1">
                {docUploading && (
                  <div className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-ink-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Uploading...
                  </div>
                )}
                {data.documents.length === 0 && !docUploading && (
                  <div className="px-2 py-2 text-xs text-ink-500">No documents yet. Upload a PDF, DOCX, or TXT file.</div>
                )}
                {data.documents.map((doc) => (
                  <div key={doc.id} className="group flex items-center gap-1.5 rounded-lg px-2 py-1.5 hover:bg-white/[0.04]">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-ink-500" />
                    <span className="min-w-0 flex-1 truncate text-xs text-ink-300" title={doc.title}>{doc.title}</span>
                    <span className="shrink-0 rounded bg-ink-700/50 px-1 py-0.5 text-[10px] uppercase text-ink-500">{doc.fileType}</span>
                    {doc.pageCount != null && (
                      <span className="shrink-0 text-[10px] text-ink-600">{doc.pageCount}p</span>
                    )}
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
                          if (!res.ok) throw new Error("Delete failed");
                          notify("Document deleted", "info");
                          refresh();
                        } catch {
                          notify("Failed to delete document", "error");
                        }
                      }}
                      className="hidden shrink-0 rounded p-0.5 text-ink-600 hover:text-danger-400 group-hover:block"
                      title="Delete document"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <ResizeHandle side="left" onPointerDown={(event) => resizePanel("left", event)} />
        </aside>

        <section className={`grid min-h-0 min-w-0 grid-rows-[auto_42px_45px_minmax(0,1fr)_auto] overflow-hidden bg-ink-925 ${isMobile && mobileTab !== "editor" ? "hidden" : ""}`}>
          {activeNote ? (
            <>
              <div className="min-w-0 border-b border-white/[0.06] bg-ink-950/60 px-5 py-3 backdrop-blur-sm">
                <div className="flex min-w-0 items-center gap-3">
                  <input
                    value={draftTitle}
                    onKeyDown={allowNativeTextShortcuts}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    onFocus={() => { if (draftTitle === "Untitled note") setDraftTitle(""); }}
                    onBlur={() => {
                      if (!draftTitle.trim()) { setDraftTitle(activeNote.title); return; }
                      if (draftTitle !== activeNote.title) void updateNote(activeNote.id, { title: draftTitle });
                    }}
                    placeholder="Note title"
                    className="min-w-0 flex-1 rounded-md bg-transparent px-1 text-xl font-semibold text-ink-100 outline-none placeholder:text-ink-500"
                  />
                  <select
                    value={activeNote.folderId ?? ""}
                    onChange={(event) => updateNote(activeNote.id, { folderId: event.target.value || null })}
                    className="control-soft hidden w-36 shrink-0 rounded-md px-2.5 py-1.5 text-xs text-ink-300 outline-none sm:block"
                  >
                    <option value="">No folder</option>
                    {data.folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                  <SaveBadge saving={saving} stale={data.indexStatus.staleNotes > 0} />
                  <IconButton label="Export as Markdown" onClick={exportActiveNote}>
                    <Download className="h-4 w-4" />
                  </IconButton>
                  <IconButton
                    label={publicToken ? "Public link active — click to copy or disable" : "Create public share link"}
                    onClick={() => {
                      if (publicToken) {
                        void navigator.clipboard.writeText(`${window.location.origin}/share/${publicToken}`);
                        notify("Public link copied", "success");
                      } else {
                        void togglePublicLink();
                      }
                    }}
                  >
                    <Link className={`h-4 w-4 ${publicToken ? "text-accent-300" : ""}`} />
                  </IconButton>
                  {publicToken && (
                    <IconButton label="Disable public link" onClick={() => void togglePublicLink()} tone="danger">
                      <X className="h-4 w-4" />
                    </IconButton>
                  )}
                  <div className="relative">
                    <IconButton label={tocOpen ? "Close table of contents" : "Table of contents"} onClick={() => setTocOpen((o) => !o)}>
                      <List className={`h-4 w-4 ${tocOpen ? "text-accent-300" : ""}`} />
                    </IconButton>
                    {tocOpen && tocHeadings.length > 0 ? (
                      <div className="absolute right-0 top-[calc(100%+6px)] z-40 w-64 overflow-hidden rounded-xl border border-ink-700/90 bg-ink-925 shadow-panel">
                        <div className="border-b border-ink-700/80 px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-ink-400">
                          Table of contents
                        </div>
                        <div className="max-h-72 overflow-auto p-2">
                          {tocHeadings.map((h, i) => (
                            <button
                              key={i}
                              onClick={() => jumpToHeading(h.pos)}
                              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-ink-300 hover:bg-white/[0.05] hover:text-ink-100"
                              style={{ paddingLeft: `${(h.level - 1) * 12 + 8}px` }}
                            >
                              <span className="shrink-0 font-mono text-[10px] text-ink-600">{"#".repeat(h.level)}</span>
                              <span className="truncate">{h.text}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : tocOpen && tocHeadings.length === 0 ? (
                      <div className="absolute right-0 top-[calc(100%+6px)] z-40 w-56 rounded-xl border border-ink-700/90 bg-ink-925 p-3 shadow-panel">
                        <div className="text-xs text-ink-500">No headings found. Add <code className="text-ink-400">## Heading</code> to your note.</div>
                      </div>
                    ) : null}
                  </div>
                  {/* Symbol picker */}
                  <div className="relative">
                    <IconButton label="Insert symbol" onClick={(e) => { e.stopPropagation(); if (editorView) symbolInsertPosRef.current = editorView.state.selection.main.from; setSymbolsOpen((o) => !o); setSymbolsQuery(""); }}>
                      <span className={`text-base leading-none font-serif ${symbolsOpen ? "text-accent-300" : ""}`}>∑</span>
                    </IconButton>
                    {symbolsOpen && (
                      <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-[calc(100%+6px)] z-50 w-80 overflow-hidden rounded-xl border border-ink-700/90 bg-ink-925 shadow-panel">
                        <div className="border-b border-ink-700/80 p-2">
                          <input
                            autoFocus
                            value={symbolsQuery}
                            onChange={(e) => setSymbolsQuery(e.target.value)}
                            placeholder="Search symbols…"
                            className="w-full rounded-lg bg-ink-900/60 px-2.5 py-1.5 text-xs text-ink-100 outline-none placeholder:text-ink-500"
                          />
                        </div>
                        <div className="max-h-72 overflow-y-auto p-2 space-y-3">
                          {SYMBOL_GROUPS.map((group) => {
                            const hits = symbolsQuery.trim()
                              ? group.symbols.filter((s) => s.includes(symbolsQuery) || group.label.toLowerCase().includes(symbolsQuery.toLowerCase()))
                              : group.symbols;
                            if (!hits.length) return null;
                            return (
                              <div key={group.label}>
                                <div className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-widest text-ink-500">{group.label}</div>
                                <div className="flex flex-wrap gap-0.5">
                                  {hits.map((sym) => (
                                    <button
                                      key={sym}
                                      title={sym}
                                      onClick={() => {
                                        if (editorView && activeNote) {
                                          const pos = symbolInsertPosRef.current;
                                          editorView.dispatch({
                                            changes: { from: pos, to: pos, insert: sym },
                                            selection: EditorSelection.cursor(pos + sym.length)
                                          });
                                          void replaceActiveMarkdown(editorView.state.doc.toString());
                                          editorView.focus();
                                        }
                                        setSymbolsOpen(false);
                                      }}
                                      className="h-8 w-8 rounded-md text-center text-base text-ink-200 hover:bg-accent-500/20 hover:text-accent-300 font-serif"
                                    >
                                      {sym}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  <IconButton label={zenMode ? "Exit zen mode (Ctrl+Shift+Z)" : "Zen mode (Ctrl+Shift+Z)"} onClick={() => setZenMode((z) => !z)}>
                    {zenMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </IconButton>
                  <IconButton
                    label="Version history"
                    onClick={async () => {
                      if (historyOpen) { setHistoryOpen(false); return; }
                      const res = await fetch(`/api/notes/${activeNote.id}/versions`);
                      setHistoryVersions(await res.json() as typeof historyVersions);
                      setHistoryOpen(true);
                    }}
                  >
                    <RotateCw className="h-4 w-4" />
                  </IconButton>
                  {activeNote.userId === data.user.id ? (
                    <IconButton label="Share note" onClick={() => void openShareModal(activeNote.id)}>
                      <UserPlus className="h-4 w-4" />
                    </IconButton>
                  ) : (
                    <span className={`rounded-lg border px-2 py-1 text-xs font-semibold ${
                      activeNote.sharePermission === "edit"
                        ? "border-accent-500/30 bg-accent-500/10 text-accent-300"
                        : "border-ink-700/60 bg-ink-800/50 text-ink-400"
                    }`}>
                      {activeNote.sharePermission === "edit" ? "Can edit" : "View only"}
                    </span>
                  )}
                  {activeNote.userId === data.user.id ? (
                    <IconButton label="Delete note" onClick={deleteActiveNote} tone="danger">
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  ) : null}
                </div>
                {historyOpen && activeNote ? (
                  <div className="mx-4 mb-2 rounded-xl border border-ink-700/80 bg-ink-900 p-3 text-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-widest text-ink-400">Version history</span>
                      <button onClick={() => setHistoryOpen(false)} className="text-ink-500 hover:text-ink-200"><X className="h-3.5 w-3.5" /></button>
                    </div>
                    {historyVersions.length === 0 ? (
                      <div className="text-xs text-ink-500">No saved versions yet. Versions are captured automatically when content changes.</div>
                    ) : historyVersions.map((v) => (
                      <div key={v.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-ink-800/60">
                        <div className="text-xs text-ink-300">{new Date(v.createdAt).toLocaleString()}</div>
                        <button
                          disabled={historyRestoring}
                          onClick={async () => {
                            if (!confirm("Restore this version? The current content will be saved as a new version first.")) return;
                            setHistoryRestoring(true);
                            try {
                              const res = await fetch(`/api/notes/${activeNote.id}/versions`, {
                                method: "POST",
                                headers: { "content-type": "application/json" },
                                body: JSON.stringify({ versionId: v.id })
                              });
                              if (res.ok) {
                                const restored = await res.json() as Note;
                                setData((d) => d ? { ...d, notes: d.notes.map((n) => n.id === restored.id ? restored : n) } : d);
                                setDraftMarkdown(restored.markdownContent);
                                setEditorSeed(restored.markdownContent);
                                setDraftTitle(restored.title);
                                setHistoryOpen(false);
                                notify("Version restored", "success");
                              }
                            } finally { setHistoryRestoring(false); }
                          }}
                          className="text-xs text-accent-300 hover:underline disabled:opacity-50"
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 overflow-hidden text-xs text-ink-500">
                  <Pill icon={<Folder className="h-3.5 w-3.5" />} label={noteFolder} />
                  <Pill icon={<Clock3 className="h-3.5 w-3.5" />} label={`Updated ${new Date(activeNote.updatedAt).toLocaleString()}`} />
                  <Pill icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Verified source" accent />
                  {backlinks.length > 0 ? (
                    <span className="group relative inline-flex max-w-full items-center gap-1.5 rounded-full border border-ink-700/80 bg-ink-850/70 px-2.5 py-1 text-ink-400 hover:border-accent-500/25 hover:text-accent-300 cursor-pointer">
                      <Link className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{backlinks.length} backlink{backlinks.length !== 1 ? "s" : ""}</span>
                      <div className="pointer-events-none absolute left-0 top-full z-30 mt-1 hidden min-w-[180px] rounded-xl border border-ink-700/80 bg-ink-900 p-2 shadow-panel group-hover:block">
                        {backlinks.map((bl) => (
                          <button
                            key={bl.id}
                            onClick={() => selectNote(bl.id)}
                            className="block w-full truncate rounded px-2 py-1 text-left text-xs text-ink-200 hover:bg-white/[0.06]"
                          >
                            {bl.title}
                          </button>
                        ))}
                      </div>
                    </span>
                  ) : null}
                  {relatedNotes.length > 0 ? (
                    <span className="group relative inline-flex max-w-full items-center gap-1.5 rounded-full border border-ink-700/80 bg-ink-850/70 px-2.5 py-1 text-ink-400 hover:border-accent-500/25 hover:text-accent-300 cursor-pointer">
                      <Sparkles className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{relatedNotes.length} related</span>
                      <div className="pointer-events-none absolute left-0 top-full z-30 mt-1 hidden min-w-[200px] rounded-xl border border-ink-700/80 bg-ink-900 p-2 shadow-panel group-hover:block">
                        <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-ink-500">Related notes</div>
                        {relatedNotes.map((r) => (
                          <button
                            key={r.noteId}
                            onClick={() => selectNote(r.noteId)}
                            className="flex w-full items-center justify-between gap-2 truncate rounded px-2 py-1 text-left text-xs text-ink-200 hover:bg-white/[0.06]"
                          >
                            <span className="truncate">{r.title}</span>
                            <span className="shrink-0 text-[10px] text-ink-500">{Math.round(r.score * 100)}%</span>
                          </button>
                        ))}
                      </div>
                    </span>
                  ) : null}
                  {/* Suggest tags */}
                  <div className="relative">
                    <button
                      onClick={() => { if (!suggestTagsOpen) void suggestTagsForNote(); else setSuggestTagsOpen(false); }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-ink-700/80 bg-ink-850/70 px-2.5 py-1 text-ink-400 hover:border-accent-500/25 hover:text-accent-300"
                    >
                      <Tag className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-xs">{suggestingTags ? "Thinking…" : "Suggest tags"}</span>
                    </button>
                    {suggestTagsOpen && suggestedTagsState && (
                      <div className="absolute left-0 top-full z-40 mt-1 min-w-[200px] rounded-xl border border-ink-700/80 bg-ink-900 p-3 shadow-panel">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">AI suggested tags</span>
                          <button onClick={() => setSuggestTagsOpen(false)} className="text-ink-600 hover:text-ink-300"><X className="h-3 w-3" /></button>
                        </div>
                        {suggestedTagsState.suggested.length === 0 ? (
                          <div className="text-xs text-ink-500">No suggestions available.</div>
                        ) : suggestedTagsState.suggested.map((tag) => {
                          const alreadyApplied = (data.noteTags[activeNote.id] ?? []).includes(tag);
                          return (
                            <div key={tag} className="flex items-center justify-between gap-2 rounded px-1 py-1">
                              <span className="text-xs text-ink-200">{tag}</span>
                              {alreadyApplied ? (
                                <span className="text-[10px] text-ink-500">Applied</span>
                              ) : (
                                <button
                                  onClick={() => void applyTag(tag, suggestedTagsState.existingTags)}
                                  className="rounded-md bg-accent-500/20 px-2 py-0.5 text-[10px] font-semibold text-accent-300 hover:bg-accent-500/30"
                                >
                                  Apply
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <EditorNoteTabs
                notes={openNotes}
                activeNoteId={activeNote.id}
                pinnedNoteIds={pinnedNoteIds}
                onSelect={selectNote}
                onClose={closeNoteTab}
                onTogglePin={(note) => togglePinNote(note)}
              />
              <NoteViewTabs
                value={noteView}
                onChange={setNoteView}
                codeLanguage={codeLanguage}
                onChangeCodeLanguage={setCodeLanguage}
                onInsertSnippet={noteView === "code" ? () => void insertSnippetFromCodeTab() : undefined}
                onInsertCallout={noteView !== "code" ? () => void insertCalloutBox() : undefined}
                onInsertHeading={() => void insertHeading()}
                onInsertList={() => void insertListItem()}
                onInsertQuote={() => void insertQuote()}
                onInsertCode={() => void insertCodeBlock()}
                onInsertTable={() => setTableDialog({ rows: 3, columns: 3 })}
                onAddTableRow={currentTableContext ? () => void addTableRow() : undefined}
                onDeleteTableRow={currentTableContext ? () => void removeTableRow() : undefined}
                onAddTableColumn={currentTableContext ? () => void addTableColumn() : undefined}
                onDeleteTableColumn={currentTableContext ? () => void removeTableColumn() : undefined}
                onFormat={activeNote ? () => void formatActiveMarkdown() : undefined}
                formatting={formatting}
                pastingImage={pastingImage}
                uploadingImage={uploadingImage}
                onUploadImage={activeNote ? (file) => void uploadNoteImage(file) : undefined}
              />
              <div className={`h-full min-h-0 min-w-0 overflow-hidden ${noteView === "split" ? "grid grid-cols-2" : "grid grid-cols-1"}`}>
                {(noteView === "write" || noteView === "split") ? (
                <div
                  className={`h-full min-h-0 min-w-0 overflow-hidden bg-ink-900/50 ${noteView === "split" ? "border-r border-ink-700/80" : ""}`}
                  onFocus={() => {
                    const isStarter = draftMarkdownRef.current.trimEnd() === "# Untitled document\n\nAdd your content here. Index this document to make it queryable by the AI tools.";
                    if (isStarter) void replaceActiveMarkdown("");
                  }}
                >
                  <CodeMirror
                    className="h-full"
                    height="100%"
                    onCreateEditor={setEditorView}
                    onUpdate={onEditorUpdate}
                    value={editorSeed}
                    extensions={editorExtensions}
                    theme={cmTheme}
                    basicSetup={{ foldGutter: false, highlightActiveLine: true, autocompletion: false }}
                    onChange={onEditorChange}
                  />
                </div>
                ) : null}
                {noteView === "code" ? (
                  <div className="h-full min-h-0 min-w-0 overflow-hidden bg-ink-900/50">
                    <CodeMirror
                      className="h-full"
                      height="100%"
                      value={codeSnippet}
                      extensions={codeEditorExtensions}
                      theme={cmTheme}
                      basicSetup={{ foldGutter: false, highlightActiveLine: true }}
                      onChange={(value) => setCodeSnippet(value)}
                    />
                  </div>
                ) : null}
                {(noteView === "preview" || noteView === "split") ? (
                <div className="min-h-0 min-w-0 overflow-hidden bg-ink-925">
                  <MarkdownPreview
                    markdown={draftMarkdown}
                    onWikilinkClick={(title) => {
                      const target = data.notes.find((n) => n.title.toLowerCase() === title.toLowerCase());
                      if (target) selectNote(target.id);
                      else notify(`No note found: "${title}"`, "info");
                    }}
                  />
                </div>
                ) : null}
              </div>
              {noteView !== "code" && (
                <div className="flex items-center gap-4 border-t border-ink-700/30 px-4 py-1 text-[11px] text-ink-600">
                  <span>{wordCount.toLocaleString()} words</span>
                  <span>{readingMinutes} min read</span>
                  <span>{draftMarkdown.length.toLocaleString()} chars</span>
                </div>
              )}
            </>
          ) : (
            <div className="row-span-5 grid h-full place-items-center p-8">
              <div className="relative w-full max-w-md text-center">
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-500/10 blur-[80px]" />
                <div className="relative mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-500/30 bg-accent-500/15 shadow-glow">
                  <Sparkles className="h-6 w-6 text-accent-400" />
                </div>
                <div className="relative text-xl font-bold tracking-tight text-ink-100">Start writing</div>
                <div className="relative mt-2 text-sm leading-6 text-ink-500">Create a document, index it, then ask questions from your knowledge base using the AI tools panel.</div>
                <button
                  onClick={() => createNote()}
                  className="relative mt-5 inline-flex items-center gap-2 rounded-xl bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition-colors hover:bg-accent-400"
                >
                  <FilePlus className="h-4 w-4" />
                  Create note
                </button>
              </div>
            </div>
          )}
        </section>

        {inlineAI && (
          <div
            style={{ position: "fixed", top: inlineAI.y, left: inlineAI.x, zIndex: 60, minWidth: 340, maxWidth: 460 }}
            className="rounded-xl border border-accent-500/30 bg-ink-925 shadow-panel"
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="border-b border-ink-700/60 px-3 py-2 text-xs font-semibold text-accent-300">Ask AI — inserts answer at cursor (Ctrl+/)</div>
            {inlineAI.preview == null ? (
              <>
                <textarea
                  autoFocus
                  rows={2}
                  value={inlineAI.query}
                  onChange={(e) => setInlineAI((s) => s ? { ...s, query: e.target.value } : null)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submitInlineAI(); }
                    if (e.key === "Escape") setInlineAI(null);
                  }}
                  placeholder="Ask a question… (Enter to generate, Esc to close)"
                  disabled={inlineAI.loading}
                  className="w-full resize-none bg-transparent p-3 text-sm text-ink-100 outline-none placeholder:text-ink-500"
                />
                <div className="flex items-center justify-end gap-3 border-t border-ink-700/60 px-3 py-2">
                  {inlineAI.loading && <span className="text-xs text-ink-500">Generating…</span>}
                  <button onClick={() => setInlineAI(null)} className="text-xs text-ink-500 hover:text-ink-300">Cancel</button>
                  <button
                    onClick={() => void submitInlineAI()}
                    disabled={inlineAI.loading || !inlineAI.query.trim()}
                    className="rounded-lg bg-accent-600 px-3 py-1 text-xs font-semibold text-ink-100 disabled:opacity-40 hover:bg-accent-500"
                  >Generate</button>
                </div>
              </>
            ) : (
              <>
                <div className="max-h-48 overflow-y-auto p-3 text-sm text-ink-200 whitespace-pre-wrap">
                  {inlineAI.preview || <span className="text-ink-500 animate-pulse">Generating…</span>}
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-ink-700/60 px-3 py-2">
                  <button
                    onClick={() => setInlineAI((s) => s ? { ...s, preview: undefined } : null)}
                    className="text-xs text-ink-500 hover:text-ink-300"
                    disabled={inlineAI.loading}
                  >Retry</button>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setInlineAI(null)} className="text-xs text-ink-500 hover:text-ink-300">Discard</button>
                    <button
                      onClick={() => void applyInlineAIPreview()}
                      disabled={inlineAI.loading || !inlineAI.preview}
                      className="rounded-lg bg-accent-600 px-3 py-1 text-xs font-semibold text-ink-100 disabled:opacity-40 hover:bg-accent-500"
                    >Insert</button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <div className={`relative min-w-0 overflow-hidden transition-opacity duration-200 ${rightOpen && !zenMode ? "opacity-100" : "pointer-events-none opacity-0"} ${isMobile && mobileTab !== "study" ? "hidden" : ""}`}>
          <ResizeHandle side="right" onPointerDown={(event) => resizePanel("right", event)} />
          <AssistantPanel
              tab={tab}
              setTab={setTab}
              scope={scope}
              setScope={setScope}
              data={data}
              activeNote={activeNote}
              notify={notify}
              onOpenNote={openNoteFromSource}
              onHide={() => setRightOpen(false)}
            />
        </div>
      </div>
      <DocumentImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={importDocument}
        notify={notify}
      />
      {feedbackOpen ? (
        <FeedbackModal
          onClose={() => setFeedbackOpen(false)}
          onSent={() => { setFeedbackOpen(false); notify("Feedback sent — thank you!", "success"); }}
        />
      ) : null}
      <CommandPalette
        open={commandOpen}
        query={commandQuery}
        onQueryChange={setCommandQuery}
        onClose={() => {
          setCommandOpen(false);
          setCommandQuery("");
        }}
        notes={data.notes}
        folders={data.folders}
        onOpenNote={(noteId) => {
          selectNote(noteId);
          setCommandOpen(false);
          setCommandQuery("");
        }}
        onCreateNote={() => {
          createNote();
          setCommandOpen(false);
          setCommandQuery("");
        }}
        onCreateFolder={() => {
          createFolder();
          setCommandOpen(false);
          setCommandQuery("");
        }}
        onOpenAccount={() => {
          window.location.href = "/account";
        }}
        onOpenImport={() => {
          setImportModalOpen(true);
          setCommandOpen(false);
          setCommandQuery("");
        }}
        onReindex={async () => {
          await fetch("/api/index", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
          await refresh();
          notify("Index refreshed", "success");
          setCommandOpen(false);
          setCommandQuery("");
        }}
      />
      <TextInputModal
        state={inputDialog}
        onClose={() => setInputDialog(null)}
        onChange={(value) => setInputDialog((current) => (current ? { ...current, value } : current))}
        onSubmit={async () => {
          if (!inputDialog?.value.trim()) return;
          await inputDialog.onSubmit(inputDialog.value);
          setInputDialog(null);
        }}
      />
      <MoveTargetModal
        key={moveDialog ? `${moveDialog.title}:${moveDialog.currentFolderId ?? "__root__"}` : "move-dialog"}
        state={moveDialog}
        onClose={() => setMoveDialog(null)}
      />
      <ConfirmModal
        confirmState={confirmState}
        onClose={() => setConfirmState(null)}
      />
      <TableInsertModal
        key={tableDialog ? `${tableDialog.rows}:${tableDialog.columns}` : "table-dialog"}
        state={tableDialog}
        onClose={() => setTableDialog(null)}
        onSubmit={async (rows, columns) => {
          await insertTable(rows, columns);
          setTableDialog(null);
        }}
      />
      <VaultContextMenu
        menu={vaultMenu}
        folders={data.folders}
        notes={data.notes}
        onClose={() => setVaultMenu(null)}
        onNewNote={(folderId) => createNote(folderId)}
        onNewFolder={(parentId) => createFolder(parentId)}
        onNewLecture={createLectureWorkflow}
        onMoveFolder={chooseFolderForFolder}
        onRenameFolder={renameFolderById}
        onDeleteFolder={requestDeleteFolder}
        onReindexFolder={(folder) => reindexScope({ folderId: folder.id }, folder.name)}
        onMoveNote={chooseFolderForNote}
        onRenameNote={renameNoteById}
        onDuplicateNote={(note) => void duplicateNoteById(note)}
        onDeleteNote={requestDeleteNote}
        onReindexNote={(note) => reindexScope({ noteId: note.id }, note.title)}
        onTogglePinNote={togglePinNote}
        pinnedNoteIds={pinnedNoteIds}
      />
      {workspaceModal === "create" ? (
        <WorkspaceCreateModal
          onClose={() => setWorkspaceModal(null)}
          onCreate={async (name, description) => {
            const response = await fetch("/api/workspaces", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ name, description })
            });
            const ws = await response.json();
            if (!response.ok) { notify(ws.error || "Failed to create workspace", "error"); return; }
            await refresh();
            await switchWorkspace(ws.id);
            setWorkspaceModal(null);
            notify(`Workspace "${name}" created`, "success");
          }}
        />
      ) : null}
      {workspaceModal === "manage" && activeWorkspace ? (
        <WorkspaceManageModal
          workspace={activeWorkspace}
          userId={data.user.id}
          inviteEmail={inviteEmail}
          inviteToken={inviteToken}
          inviteLoading={inviteLoading}
          onInviteEmailChange={setInviteEmail}
          onSendInvite={() => void sendInvite(activeWorkspace.id, inviteEmail)}
          onCopyToken={(token) => { void navigator.clipboard.writeText(`${window.location.origin}/workspace/join?token=${token}`); notify("Invite link copied", "success"); }}
          onRemoveMember={async (userId) => {
            await fetch(`/api/workspaces/${activeWorkspace.id}/members/${userId}`, { method: "DELETE" });
            await refresh();
            notify("Member removed", "success");
          }}
          onDeleteWorkspace={async () => {
            setWorkspaceModal(null);
            setConfirmState({
              title: "Delete workspace",
              description: `Delete "${activeWorkspace.name}"? Notes will remain as personal notes.`,
              confirmLabel: "Delete workspace",
              tone: "danger",
              onConfirm: async () => {
                await fetch(`/api/workspaces/${activeWorkspace.id}`, { method: "DELETE" });
                await switchWorkspace(null);
                await refresh();
                notify("Workspace deleted", "success");
              }
            });
          }}
          onClose={() => setWorkspaceModal(null)}
        />
      ) : null}
      {shareModalOpen && activeNote && activeNote.userId === data.user.id ? (
        <ShareModal
          note={activeNote}
          shares={noteShares}
          email={shareEmail}
          permission={sharePermission}
          loading={shareLoading}
          onEmailChange={setShareEmail}
          onPermissionChange={setSharePermission}
          onShare={() => void doShareNote(activeNote.id)}
          onRevoke={(userId) => void revokeShare(activeNote.id, userId)}
          onUpdatePermission={(userId, perm) => void updateSharePermission(activeNote.id, userId, perm)}
          onClose={() => setShareModalOpen(false)}
        />
      ) : null}
      {toast ? <ToastView toast={toast} /> : null}
      {isMobile ? (
        <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-ink-700/80 bg-ink-950/95 backdrop-blur-lg">
          <button
            onClick={() => setMobileTab("vault")}
            className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${mobileTab === "vault" ? "text-accent-300" : "text-ink-500"}`}
          >
            <BookOpen className="h-5 w-5" />
            Docs
          </button>
          <button
            onClick={() => setMobileTab("editor")}
            className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${mobileTab === "editor" ? "text-accent-300" : "text-ink-500"}`}
          >
            <FileText className="h-5 w-5" />
            Editor
          </button>
          <button
            onClick={() => { setMobileTab("study"); setRightOpen(true); }}
            className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${mobileTab === "study" ? "text-accent-300" : "text-ink-500"}`}
          >
            <Brain className="h-5 w-5" />
            Tools
          </button>
        </nav>
      ) : null}
      </div>
    </main>
  );
}

function SideRail(props: {
  data: Bootstrap;
  railPinned: boolean;
  setRailPinned: (value: boolean) => void;
  leftOpen: boolean;
  rightOpen: boolean;
  tab: Tab;
  onSetTab: (tab: Tab) => void;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  onFind: () => void;
  onReindex: () => void | Promise<void>;
  reindexing: boolean;
  onImport: () => void;
  onFeedback: () => void;
  onNewNote: () => void;
  onNewFolder: () => void;
  onAccount: () => void;
  onLogout: () => void | Promise<void>;
}) {
  const [hovering, setHovering] = useState(false);
  const expanded = props.railPinned || hovering;

  function RailIconButton({
    label,
    onClick,
    children,
    active,
    tone,
    compact
  }: {
    label: string;
    onClick: () => void;
    children: React.ReactNode;
    active?: boolean;
    tone?: "default" | "danger";
    compact?: boolean;
  }) {
    return (
      <div className="group relative flex justify-center">
        <button
          aria-label={label}
          onClick={onClick}
          className={`grid h-11 w-11 place-items-center rounded-full border text-sm transition-colors ${
            active
              ? "border-accent-500/35 bg-accent-500/15 text-accent-200 shadow-glow"
              : tone === "danger"
                ? "border-ink-800/70 bg-white/[0.02] text-ink-400 hover:border-danger-400/30 hover:bg-danger-400/10 hover:text-danger-300"
                : "border-ink-800/70 bg-white/[0.02] text-ink-200 hover:border-accent-500/25 hover:bg-white/[0.05] hover:text-ink-100"
          }`}
        >
          {children}
        </button>

        <div className="pointer-events-none absolute left-[56px] top-1/2 z-50 hidden -translate-y-1/2 whitespace-nowrap sm:block">
          <div className="relative translate-x-[-6px] opacity-0 transition-all duration-150 ease-out group-hover:translate-x-0 group-hover:opacity-100">
            <div className="absolute -left-1 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border border-ink-700/80 bg-ink-925" />
            <div className="rounded-xl border border-ink-700/80 bg-ink-925 px-3 py-1.5 text-xs font-semibold text-ink-100 shadow-panel">
              {label}
            </div>
          </div>
        </div>

        {expanded && !compact ? (
          <div className="ml-3 hidden min-w-0 flex-1 items-center sm:flex">
            <span className="truncate text-sm font-medium text-ink-200">{label}</span>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <aside
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={`z-20 flex h-screen shrink-0 flex-col border-r border-ink-700/80 bg-ink-950/95 py-3 backdrop-blur-xl transition-[width] duration-200 ease-premium ${
        expanded ? "w-[232px]" : "w-[64px]"
      }`}
    >
      <div className={`flex shrink-0 items-center gap-3 px-2 ${expanded ? "" : "justify-center"}`}>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-accent-500/35 bg-gradient-to-br from-accent-500/20 to-accent-600/10 text-accent-300 shadow-glow">
          <Sparkles className="h-4 w-4" />
        </div>
        {expanded ? (
          <div className="min-w-0">
            <div className="truncate bg-gradient-to-r from-accent-300 to-accent-400 bg-clip-text text-sm font-bold tracking-tight text-transparent">EternalNotes</div>
            <div className="truncate text-xs text-ink-500">{props.data.user.email}</div>
          </div>
        ) : null}
        {expanded ? (
          <div className="ml-auto">
            <RailIconButton
              label={props.railPinned ? "Unpin sidebar" : "Pin sidebar"}
              onClick={() => props.setRailPinned(!props.railPinned)}
              active={props.railPinned}
              compact
            >
              <Pin className="h-4 w-4" />
            </RailIconButton>
          </div>
        ) : null}
      </div>

      <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${expanded ? "px-3" : "px-2"}`}>
        {/* Document nav */}
        <div className={`flex flex-col gap-1 pt-3 ${expanded ? "" : "items-center"}`}>
          <RailIconButton label={props.leftOpen ? "Hide documents" : "Show documents"} onClick={props.onToggleLeft} active={props.leftOpen}>
            <LayoutPanelLeft className="h-4 w-4" />
          </RailIconButton>
          <RailIconButton label="New note" onClick={props.onNewNote}>
            <FilePlus className="h-4 w-4" />
          </RailIconButton>
          <RailIconButton label="New folder" onClick={props.onNewFolder}>
            <FolderPlus className="h-4 w-4" />
          </RailIconButton>
        </div>
        {/* Divider */}
        <div className={`my-3 border-t border-ink-700/50 ${expanded ? "" : "mx-2"}`} />
        {/* AI tools panel toggle */}
        <div className={`flex flex-col gap-1 ${expanded ? "" : "items-center"}`}>
          <RailIconButton label={props.rightOpen ? "Hide AI tools" : "AI tools"} onClick={props.onToggleRight} active={props.rightOpen}>
            {props.rightOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </RailIconButton>
        </div>
      </div>

      <div className={`w-full shrink-0 border-t border-ink-700/70 pt-3 ${expanded ? "px-3" : "px-2"}`}>
        <div className={`flex flex-col gap-1 ${expanded ? "" : "items-center"}`}>
          <RailIconButton
            label={props.reindexing ? "Reindexing..." : "Reindex"}
            onClick={() => void props.onReindex()}
            active={props.reindexing}
          >
            {props.reindexing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          </RailIconButton>
          <RailIconButton label="Import document" onClick={props.onImport}>
            <Upload className="h-4 w-4" />
          </RailIconButton>
          <RailIconButton label="Send feedback" onClick={props.onFeedback}>
            <MessageSquareText className="h-4 w-4" />
          </RailIconButton>
          <div className="group relative flex justify-center">
            <a
              href="https://discord.gg/9YHgyNvy9k"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Discord community"
              className="grid h-11 w-11 place-items-center rounded-full border border-ink-800/70 bg-white/[0.02] text-ink-200 transition-colors hover:border-[#5865F2]/40 hover:bg-[#5865F2]/10 hover:text-[#5865F2]"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026c.462-.62.874-1.275 1.226-1.963.021-.04.001-.088-.041-.104a13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z"/>
              </svg>
            </a>
            <div className="pointer-events-none absolute left-[56px] top-1/2 z-50 hidden -translate-y-1/2 whitespace-nowrap sm:block">
              <div className="relative translate-x-[-6px] opacity-0 transition-all duration-150 ease-out group-hover:translate-x-0 group-hover:opacity-100">
                <div className="absolute -left-1 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border border-ink-700/80 bg-ink-925" />
                <div className="rounded-xl border border-ink-700/80 bg-ink-925 px-3 py-1.5 text-xs font-semibold text-ink-100 shadow-panel">
                  Discord community
                </div>
              </div>
            </div>
            {expanded ? (
              <div className="ml-3 hidden min-w-0 flex-1 items-center sm:flex">
                <span className="truncate text-sm font-medium text-ink-200">Discord community</span>
              </div>
            ) : null}
          </div>
          <RailIconButton label="Account" onClick={props.onAccount}>
            <Settings className="h-4 w-4" />
          </RailIconButton>
          <RailIconButton label="Sign out" onClick={() => void props.onLogout()} tone="danger">
            <LogOut className="h-4 w-4" />
          </RailIconButton>
        </div>
      </div>
    </aside>
  );
}

function EditorNoteTabs({
  notes,
  activeNoteId,
  pinnedNoteIds,
  onSelect,
  onClose,
  onTogglePin
}: {
  notes: Note[];
  activeNoteId: string;
  pinnedNoteIds: string[];
  onSelect: (noteId: string) => void;
  onClose: (noteId: string) => void;
  onTogglePin: (note: Note) => void;
}) {
  return (
    <div className="flex min-w-0 items-end gap-1 overflow-x-auto border-b border-white/[0.06] bg-ink-950/50 px-3 pt-1">
      {notes.map((note) => {
        const active = note.id === activeNoteId;
        const pinned = pinnedNoteIds.includes(note.id);
        return (
          <div
            key={note.id}
            className={`group flex h-9 min-w-[140px] max-w-[220px] items-center gap-2 rounded-t-lg border border-b-0 px-2.5 ${
              active ? "border-accent-500/30 border-b-transparent bg-ink-900/80 text-ink-100 shadow-[0_0_12px_rgba(139,92,246,0.08)]" : "border-white/[0.06] bg-ink-900/30 text-ink-500 hover:bg-ink-900/60 hover:text-ink-200"
            }`}
          >
            <button onClick={() => onTogglePin(note)} aria-label={pinned ? `Unpin ${note.title}` : `Pin ${note.title}`} className="shrink-0 text-ink-500 hover:text-accent-300">
              {pinned ? <Pin className="h-3.5 w-3.5 text-accent-300" /> : <FileText className="h-3.5 w-3.5" />}
            </button>
            <button onClick={() => onSelect(note.id)} className="min-w-0 flex-1 truncate text-left text-xs font-medium">
              {note.title}
            </button>
            <button onClick={() => onClose(note.id)} aria-label={`Close ${note.title}`} className="grid h-5 w-5 shrink-0 place-items-center rounded text-ink-500 opacity-0 hover:bg-white/8 hover:text-ink-100 group-hover:opacity-100">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function NoteViewTabs({
  value,
  onChange,
  codeLanguage,
  onChangeCodeLanguage,
  onInsertSnippet,
  onInsertCallout,
  onInsertHeading,
  onInsertList,
  onInsertQuote,
  onInsertCode,
  onInsertTable,
  onAddTableRow,
  onDeleteTableRow,
  onAddTableColumn,
  onDeleteTableColumn,
  onFormat,
  formatting,
  pastingImage,
  uploadingImage,
  onUploadImage
}: {
  value: NoteView;
  onChange: (value: NoteView) => void;
  codeLanguage?: CodeLanguage;
  onChangeCodeLanguage?: (lang: CodeLanguage) => void;
  onInsertSnippet?: () => void;
  onInsertCallout?: () => void;
  onInsertHeading: () => void;
  onInsertList: () => void;
  onInsertQuote: () => void;
  onInsertCode: () => void;
  onInsertTable: () => void;
  onAddTableRow?: () => void;
  onDeleteTableRow?: () => void;
  onAddTableColumn?: () => void;
  onDeleteTableColumn?: () => void;
  onFormat?: () => void;
  formatting: boolean;
  pastingImage: boolean;
  uploadingImage: boolean;
  onUploadImage?: (file: File) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tabs: Array<{ id: NoteView; label: string }> = [
    { id: "write", label: "Write" },
    { id: "preview", label: "Preview" },
    { id: "split", label: "Split" },
    { id: "code", label: "Code" }
  ];

  return (
    <div className="flex min-w-0 items-center justify-between gap-3 overflow-x-auto overflow-y-hidden border-b border-white/[0.06] bg-ink-950/30 px-5">
      <div className="flex h-full min-w-max items-center gap-1 py-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`h-7 rounded-lg px-3.5 text-xs font-semibold transition-colors ${
              value === tab.id
                ? "border border-accent-500/25 bg-accent-500/12 text-accent-300"
                : "border border-transparent text-ink-500 hover:text-ink-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="hidden min-w-max items-center gap-2 py-1.5 lg:flex">
        {value === "code" && codeLanguage && onChangeCodeLanguage ? (
          <>
            <select
              value={codeLanguage}
              onChange={(e) => onChangeCodeLanguage(e.target.value as CodeLanguage)}
              className="control-soft h-7 rounded-md px-2 text-xs font-semibold text-ink-300 outline-none"
              aria-label="Code language"
            >
              <option value="typescript">TypeScript</option>
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
              <option value="sql">SQL</option>
              <option value="json">JSON</option>
              <option value="plaintext">Plain text</option>
            </select>
            {onInsertSnippet ? (
              <button
                onClick={onInsertSnippet}
                className="inline-flex items-center gap-1 rounded-md border border-accent-500/25 bg-accent-500/10 px-2 py-1 text-xs font-semibold text-accent-200 hover:bg-accent-500/15"
              >
                <Code2 className="h-3.5 w-3.5" />
                Insert snippet
              </button>
            ) : null}
          </>
        ) : null}
        <button onClick={onInsertHeading} className="rounded-md px-2 py-1 text-xs font-semibold text-ink-400 hover:bg-white/6 hover:text-ink-100">
          H2
        </button>
        <button onClick={onInsertList} className="rounded-md px-2 py-1 text-xs font-semibold text-ink-400 hover:bg-white/6 hover:text-ink-100">
          List
        </button>
        <button onClick={onInsertQuote} className="rounded-md px-2 py-1 text-xs font-semibold text-ink-400 hover:bg-white/6 hover:text-ink-100">
          Quote
        </button>
        {onInsertCallout ? (
          <button onClick={onInsertCallout} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-ink-400 hover:bg-white/6 hover:text-ink-100">
            <Info className="h-3.5 w-3.5" />
            Box
          </button>
        ) : null}
        <button onClick={onInsertCode} className="rounded-md px-2 py-1 text-xs font-semibold text-ink-400 hover:bg-white/6 hover:text-ink-100">
          Code
        </button>
        <button onClick={onInsertTable} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-ink-400 hover:bg-white/6 hover:text-ink-100">
          <Table2 className="h-3.5 w-3.5" />
          Table
        </button>
        {onAddTableRow ? (
          <button onClick={onAddTableRow} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-ink-400 hover:bg-white/6 hover:text-ink-100">
            <Rows3 className="h-3.5 w-3.5" />
            Row +
          </button>
        ) : null}
        {onDeleteTableRow ? (
          <button onClick={onDeleteTableRow} className="rounded-md px-2 py-1 text-xs font-semibold text-ink-400 hover:bg-white/6 hover:text-ink-100">
            Row -
          </button>
        ) : null}
        {onAddTableColumn ? (
          <button onClick={onAddTableColumn} className="rounded-md px-2 py-1 text-xs font-semibold text-ink-400 hover:bg-white/6 hover:text-ink-100">
            Col +
          </button>
        ) : null}
        {onDeleteTableColumn ? (
          <button onClick={onDeleteTableColumn} className="rounded-md px-2 py-1 text-xs font-semibold text-ink-400 hover:bg-white/6 hover:text-ink-100">
            Col -
          </button>
        ) : null}
        {onUploadImage ? (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-ink-400 hover:bg-white/6 hover:text-ink-100 disabled:opacity-50"
            >
              {uploadingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
              Image
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUploadImage(file);
                e.target.value = "";
              }}
            />
          </>
        ) : null}
        {onFormat ? (
          <button onClick={onFormat} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-ink-400 hover:bg-white/6 hover:text-ink-100">
            {formatting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Format
          </button>
        ) : null}
        {pastingImage ? <span className="text-xs font-medium text-accent-300">Importing pasted image...</span> : null}
      </div>
    </div>
  );
}

function AssistantPanel(props: {
  tab: Tab;
  setTab: (tab: Tab) => void;
  scope: Scope;
  setScope: (scope: Scope) => void;
  data: Bootstrap;
  activeNote: Note | null;
  notify: (message: string, tone?: Toast["tone"]) => void;
  onOpenNote: (source: SourceRef) => void;
  onHide: () => void;
}) {
  const tabs: Array<[Tab, string, string, React.ReactNode]> = [
    ["ask", "Ask", "Ask", <MessageSquareText className="h-4 w-4" key="ask" />],
    ["find", "Find", "Find", <Search className="h-4 w-4" key="find" />],
    ["quiz", "Knowledge Check", "Check", <Check className="h-4 w-4" key="quiz" />],
    ["flashcards", "Training Cards", "Training", <Brain className="h-4 w-4" key="cards" />],
    ["summary", "Briefing", "Briefing", <PanelRight className="h-4 w-4" key="summary" />],
    ["today", "Planner", "Planner", <BookOpen className="h-4 w-4" key="today" />],
    ["exam", "Assessment", "Assess", <Trophy className="h-4 w-4" key="exam" />]
  ];

  return (
    <aside className="panel-shell grid h-full min-h-0 grid-rows-[72px_70px_minmax(0,1fr)] overflow-hidden border-l">
      <div className="flex min-w-0 items-center justify-between gap-2 border-b border-white/[0.06] px-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-accent-500/30 bg-accent-500/15">
              <Sparkles className="h-3.5 w-3.5 text-accent-400" />
            </div>
            <div className="text-sm font-semibold text-ink-100">Knowledge Tools</div>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-500">
            <ShieldCheck className="h-3 w-3 text-accent-400/70" />
            Cited from your documents
          </div>
        </div>
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <ScopeSelect {...props} />
          <IconButton label="Hide tools panel" onClick={props.onHide}>
            <PanelRightClose className="h-4 w-4" />
          </IconButton>
        </div>
      </div>
      <div className="relative flex min-w-0 overflow-x-auto overflow-y-hidden border-b border-white/[0.06] bg-white/[0.015]">
        {tabs.map(([id, fullLabel, shortLabel, icon]) => (
          <button
            key={id}
            onClick={() => props.setTab(id)}
            title={fullLabel}
            className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-all duration-150 ${
              props.tab === id
                ? "text-accent-300 after:absolute after:bottom-0 after:left-1 after:right-1 after:h-[2px] after:rounded-full after:bg-accent-500"
                : "text-ink-500 hover:text-ink-300"
            }`}
          >
            <span className={props.tab === id ? "text-accent-400" : ""}>{icon}</span>
            <span>{shortLabel}</span>
          </button>
        ))}
      </div>
      <div className="min-h-0 overflow-auto p-4">
        <PanelErrorBoundary label={props.tab}>
          <div key={props.tab} className="animate-[fadeIn_220ms_ease-out]">
            {props.tab === "ask" ? <AskTool scope={props.scope} notify={props.notify} onOpenNote={props.onOpenNote} /> : null}
            {props.tab === "find" ? <FindTool onOpenNote={props.onOpenNote} /> : null}
            {props.tab === "quiz" ? (
              <QuizTool
                key={`quiz:${scopeKey(props.scope)}`}
                scope={props.scope}
                data={props.data}
                activeNote={props.activeNote}
                notify={props.notify}
                onOpenNote={props.onOpenNote}
              />
            ) : null}
            {props.tab === "flashcards" ? (
              <FlashcardTool
                key={`flashcards:${scopeKey(props.scope)}`}
                scope={props.scope}
                data={props.data}
                activeNote={props.activeNote}
                notify={props.notify}
                onOpenNote={props.onOpenNote}
              />
            ) : null}
            {props.tab === "summary" ? <SummaryTool scope={props.scope} notify={props.notify} onOpenNote={props.onOpenNote} /> : null}
            {props.tab === "today" ? <StudyPlanTool notify={props.notify} /> : null}
            {props.tab === "exam" ? <ExamTool scope={props.scope} data={props.data} notify={props.notify} /> : null}
          </div>
        </PanelErrorBoundary>
      </div>
    </aside>
  );
}

function ScopeSelect({
  scope,
  setScope,
  data,
  activeNote
}: {
  scope: Scope;
  setScope: (scope: Scope) => void;
  data: Bootstrap;
  activeNote: Note | null;
}) {
  return (
    <div className="shrink-0">
      <SearchableScopePicker scope={scope} setScope={setScope} data={data} activeNote={activeNote} ariaLabel="Document scope" compact />
    </div>
  );
}

function StudyScopePicker({
  scope,
  setScope,
  data,
  activeNote,
  label
}: {
  scope: Scope;
  setScope: (scope: Scope) => void;
  data: Bootstrap;
  activeNote: Note | null;
  label: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">{label}</label>
      <SearchableScopePicker scope={scope} setScope={setScope} data={data} activeNote={activeNote} ariaLabel={label} />
    </div>
  );
}

function SearchableScopePicker({
  scope,
  setScope,
  data,
  activeNote,
  ariaLabel,
  compact = false
}: {
  scope: Scope;
  setScope: (scope: Scope) => void;
  data: Bootstrap;
  activeNote: Note | null;
  ariaLabel: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointer(event: globalThis.MouseEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }
    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", handlePointer);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handlePointer);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const options = useMemo(() => {
    const base: Array<{ id: string; label: string; kind: "all" | "folder" | "note"; scope: Scope; group: string }> = [
      { id: "all", label: "All notes", kind: "all", scope: { type: "all" }, group: "Quick access" }
    ];
    if (activeNote) {
      base.push({
        id: `note:${activeNote.id}`,
        label: `Current note: ${activeNote.title}`,
        kind: "note",
        scope: { type: "note", noteId: activeNote.id },
        group: "Quick access"
      });
    }
    for (const folder of data.folders) {
      base.push({
        id: `folder:${folder.id}`,
        label: folderPath(folder.id, data.folders),
        kind: "folder",
        scope: { type: "folder", folderId: folder.id },
        group: "Folders"
      });
    }
    for (const note of data.notes) {
      const folderName = note.folderId ? folderPath(note.folderId, data.folders) : "Unfiled";
      base.push({
        id: `note:${note.id}`,
        label: `${note.title} (${folderName})`,
        kind: "note",
        scope: { type: "note", noteId: note.id },
        group: "Notes"
      });
    }
    return base;
  }, [activeNote, data.folders, data.notes]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((option) => option.label.toLowerCase().includes(normalized));
  }, [options, query]);

  const groups = useMemo(() => {
    const entries = new Map<string, typeof filtered>();
    for (const option of filtered) {
      const current = entries.get(option.group) ?? [];
      current.push(option);
      entries.set(option.group, current);
    }
    return Array.from(entries.entries());
  }, [filtered]);

  const selectedLabel = useMemo(() => scopeDisplayLabel(scope, activeNote, data.folders, data.notes), [scope, activeNote, data.folders, data.notes]);

  function choose(next: Scope) {
    setScope(next);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`control-soft inline-flex w-full items-center justify-between gap-2 rounded-lg pr-3 text-left text-ink-200 ${
          compact ? "min-w-[9rem] py-2 pl-3 text-xs" : "py-2.5 pl-3 text-sm"
        }`}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-ink-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 overflow-hidden rounded-xl border border-ink-700/90 bg-ink-925 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
          <div className="border-b border-ink-700/80 p-3">
            <div className="control-soft flex items-center gap-2 rounded-lg px-3 py-2">
              <Search className="h-4 w-4 text-ink-500" />
              <input
                autoFocus
                value={query}
                onKeyDown={allowNativeTextShortcuts}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search folders or notes..."
                className="min-w-0 flex-1 bg-transparent text-sm text-ink-100 outline-none placeholder:text-ink-500"
              />
            </div>
          </div>
          <div className="max-h-72 overflow-auto p-2">
            {groups.length ? (
              <div className="space-y-3">
                {groups.map(([group, groupOptions]) => (
                  <div key={group} className="space-y-1">
                    <div className="px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">{group}</div>
                    {groupOptions.map((option) => {
                      const active = scopeKey(option.scope) === scopeKey(scope);
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => choose(option.scope)}
                          className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm ${
                            active ? "bg-accent-500/14 text-accent-200" : "text-ink-200 hover:bg-white/[0.04]"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="truncate">{option.label}</div>
                            <div className="mt-0.5 text-xs text-ink-500">{option.kind === "folder" ? "Folder scope" : option.kind === "note" ? "Single note" : "Full workspace"}</div>
                          </div>
                          {active ? <Check className="h-4 w-4 shrink-0" /> : null}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            ) : (
              <div className="surface-soft rounded-lg px-3 py-4 text-sm text-ink-400">No matching folders or notes.</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AskTool({
  scope,
  notify,
  onOpenNote
}: {
  scope: Scope;
  notify: (message: string, tone?: Toast["tone"]) => void;
  onOpenNote: (source: SourceRef) => void;
}) {
  const [question, setQuestion] = useState("");
  const [citations, setCitations] = useState<AnswerResult["citations"]>([]);
  const [streamedText, setStreamedText] = useState("");
  const [done, setDone] = useState(false);
  const [lowConfidence, setLowConfidence] = useState(false);
  const [explanation, setExplanation] = useState<AnswerResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [recentQueries, setRecentQueries] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("ask:recent") ?? "[]") as string[]; } catch { return []; }
  });
  const [showRecent, setShowRecent] = useState(false);

  const answerText = streamedText.trim();
  const unsupported = done && (answerText === "NOT_FOUND" || answerText.startsWith("NOT_FOUND") || answerText === "" || (citations.length === 0 && !answerText.startsWith("-")));
  const displayAnswer = unsupported ? (answerText === "NOT_FOUND" || answerText === "" ? "Not found in the knowledge base. Add or index documents that directly support this question, then try again." : answerText) : answerText;

  async function ask() {
    if (!question.trim()) return;
    setBusy(true);
    setStreamedText("");
    setCitations([]);
    setDone(false);
    setLowConfidence(false);
    setExplanation(null);
    setShowRecent(false);
    const q = question.trim();
    setRecentQueries((prev) => {
      const next = [q, ...prev.filter((x) => x !== q)].slice(0, 8);
      try { localStorage.setItem("ask:recent", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, scope: apiScope(scope) })
      });
      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || "Ask request failed");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done: readerDone, value } = await reader.read();
        if (readerDone) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.startsWith("data: ") ? part.slice(6) : part;
          if (!line.trim()) continue;
          try {
            const ev = JSON.parse(line) as { type: string; data?: unknown };
            if (ev.type === "citations") {
              setCitations(ev.data as AnswerResult["citations"]);
              if ((ev as { meta?: { lowConfidence?: boolean } }).meta?.lowConfidence) setLowConfidence(true);
            }
            else if (ev.type === "chunk") setStreamedText((t) => t + (ev.data as string));
            else if (ev.type === "done") setDone(true);
            else if (ev.type === "error") throw new Error(ev.data as string);
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue;
            throw parseErr;
          }
        }
      }
      setDone(true);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Ask request failed", "error");
    } finally {
      setBusy(false);
    }
  }

  async function explainPlain() {
    if (!question.trim() || unsupported) return;
    setExplaining(true);
    try {
      const response = await fetch("/api/ask/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, answer: displayAnswer })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((body as { error?: string }).error || "Paraphrase request failed");
      setExplanation(body as AnswerResult);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Paraphrase request failed", "error");
    } finally {
      setExplaining(false);
    }
  }

  const showResult = streamedText.length > 0 || (done && citations.length > 0);

  return (
    <div className="space-y-4">
      <ToolHeader title="Ask your knowledge base" description="Your indexed documents answer the question. Use Paraphrase for a plain-English restatement." />
      <div className="relative">
        <textarea
          value={question}
          onKeyDown={(e) => {
            allowNativeTextShortcuts(e);
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void ask(); }
          }}
          onFocus={() => { if (recentQueries.length > 0 && !question.trim()) setShowRecent(true); }}
          onBlur={() => window.setTimeout(() => setShowRecent(false), 150)}
          onChange={(event) => { setQuestion(event.target.value); if (event.target.value.trim()) setShowRecent(false); }}
          placeholder="Ask a question… (Ctrl+Enter to submit)"
          className="control-soft h-32 w-full resize-none rounded-xl p-3 text-sm leading-6 text-ink-100 outline-none placeholder:text-ink-500"
        />
        {showRecent && recentQueries.length > 0 ? (
          <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-xl border border-ink-700/80 bg-ink-900 p-1 shadow-panel">
            <div className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">Recent</div>
            {recentQueries.map((q) => (
              <button
                key={q}
                onMouseDown={(e) => { e.preventDefault(); setQuestion(q); setShowRecent(false); }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-ink-200 hover:bg-white/[0.05]"
              >
                <RotateCw className="h-3 w-3 shrink-0 text-ink-500" />
                <span className="truncate">{q}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <button onClick={ask} disabled={busy || !question.trim()} className="primary-action w-full">
        {busy ? "Asking..." : "Ask"}
      </button>
      {busy && !showResult ? <SkeletonStack /> : null}
      {showResult ? (
        <div className="space-y-4">
          {citations.length > 0 && !done ? (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">Searching sources…</div>
              <SourceList sources={citations} compact query={question} onOpenNote={onOpenNote} />
            </div>
          ) : null}
          {streamedText ? (
            unsupported ? (
              <div className="rounded-xl border border-ink-700/60 bg-ink-850/60 p-4 text-sm text-ink-400">{displayAnswer}</div>
            ) : (
              <div className="rounded-xl border border-ink-700/80 bg-ink-850/80 p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent-300">Answer</div>
                <div className="space-y-1.5 text-sm leading-6 text-ink-100">
                  {displayAnswer.split("\n").filter((l) => l.trim()).map((line, i) => (
                    <div key={i}>{line.startsWith("- ") ? line.slice(2) : line}</div>
                  ))}
                  {!done ? <span className="inline-block h-4 w-0.5 animate-pulse bg-accent-300 align-middle" /> : null}
                </div>
              </div>
            )
          ) : null}

          {done && lowConfidence && !unsupported ? (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-300">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              Weak match — these excerpts may not directly address the question.
            </div>
          ) : null}

          {done && !unsupported ? (
            <div className="flex items-center gap-2">
              <button onClick={explainPlain} disabled={explaining} className="secondary-action">
                {explaining ? "Paraphrasing..." : "Paraphrase"}
              </button>
              <div className="text-xs text-ink-500">Rewrites the answer as a simple example.</div>
            </div>
          ) : null}

          {explanation ? (
            <div className="rounded-xl border border-accent-500/20 bg-accent-500/10 p-4 text-sm leading-6 text-ink-100">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent-300">Paraphrase</div>
              <div className="whitespace-pre-wrap">{explanation.answer}</div>
            </div>
          ) : null}

          {done && citations.length > 0 ? (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">Best sources</div>
              <SourceList sources={citations} compact query={question} onOpenNote={onOpenNote} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function FindTool({ onOpenNote }: { onOpenNote: (source: SourceRef) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ noteId: string; noteTitle: string; excerpt: string }>>([]);
  useEffect(() => {
    const timer = window.setTimeout(async () => {
      if (!query.trim()) return setResults([]);
      const response = await fetch(`/api/notes?q=${encodeURIComponent(query)}`);
      setResults(await response.json());
    }, 220);
    return () => window.clearTimeout(timer);
  }, [query]);
  return (
    <div className="space-y-4">
      <ToolHeader title="Find exact text" description="Search stored Markdown without semantic expansion." />
      <div className="control-soft flex items-center gap-2 rounded-xl px-3 py-2.5">
        <Search className="h-4 w-4 text-ink-500" />
        <input
          value={query}
          onKeyDown={allowNativeTextShortcuts}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search source text..."
          className="min-w-0 flex-1 bg-transparent text-sm text-ink-100 outline-none placeholder:text-ink-500"
        />
      </div>
      <SourceList
        sources={results.map((result) => ({ ...result, chunkId: result.noteId, similarity: 1 }))}
        empty="No exact matches yet."
        query={query}
        onOpenNote={onOpenNote}
      />
    </div>
  );
}

function QuizTool({
  scope,
  data,
  activeNote,
  notify,
  onOpenNote
}: {
  scope: Scope;
  data: Bootstrap;
  activeNote: Note | null;
  notify: (message: string, tone?: Toast["tone"]) => void;
  onOpenNote: (source: SourceRef) => void;
}) {
  const [items, setItems] = useState<QuizQuestion[]>([]);
  const [localScope, setLocalScope] = useState<Scope>(scope);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [grading, setGrading] = useState<Record<number, boolean>>({});
  const [results, setResults] = useState<Record<number, QuizEvaluation>>({});
  async function grade(item: QuizQuestion, index: number) {
    const userAnswer = answers[index]?.trim();
    if (!userAnswer) return;
    setGrading((current) => ({ ...current, [index]: true }));
    try {
      const response = await fetch("/api/study/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question: item.question,
          userAnswer,
          expectedAnswer: item.answer,
          sourceExcerpt: item.source.excerpt
        })
      });
      const evaluation = (await response.json()) as QuizEvaluation;
      setResults((current) => ({ ...current, [index]: evaluation }));
    } catch {
      notify("Quiz grading failed", "error");
    } finally {
      setGrading((current) => ({ ...current, [index]: false }));
    }
  }
  function handleItems(next: QuizQuestion[]) {
    setItems(next.slice(0, 1));
    setAnswers({});
    setGrading({});
    setResults({});
  }
  const currentIndex = 0;
  const currentItem = items[0];
  return (
    <StudyList
      title="Knowledge Check"
      description="Type your answer, then compare it against the source-backed answer."
      label="Generate question"
      mode="quiz"
      scope={localScope}
      controls={<StudyScopePicker scope={localScope} setScope={setLocalScope} data={data} activeNote={activeNote} label="Question source" />}
      notify={notify}
      onResult={handleItems}
      render={(busy, rerun) => (
        <div className="space-y-3">
          {busy ? <SkeletonStack /> : null}
          {!busy && !currentItem ? <EmptyToolState message="Generate one knowledge check question at a time from your indexed documents." /> : null}
          {currentItem ? (
            <div className="study-card">
              <div className="mb-3 flex items-center justify-between text-xs text-ink-500">
                <span>Question</span>
                <span>{currentItem.source.noteTitle}</span>
              </div>
              <div className="text-sm font-medium leading-6 text-ink-100">{currentItem.question}</div>
              <textarea
                value={answers[currentIndex] ?? ""}
                onKeyDown={(e) => {
                  allowNativeTextShortcuts(e);
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void grade(currentItem, currentIndex); }
                }}
                onChange={(event) => setAnswers((current) => ({ ...current, [currentIndex]: event.target.value }))}
                placeholder="Type your answer from memory… (Ctrl+Enter to check)"
                className="control-soft mt-5 min-h-[104px] w-full resize-none rounded-lg px-3 py-2.5 text-sm leading-6 text-ink-100 outline-none placeholder:text-ink-500"
              />
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => void grade(currentItem, currentIndex)}
                  disabled={grading[currentIndex] || !(answers[currentIndex] ?? "").trim()}
                  className="primary-action px-4"
                >
                  {grading[currentIndex] ? "Checking..." : "Check answer"}
                </button>
                <button
                  type="button"
                  onClick={() => void rerun()}
                  disabled={busy}
                  className="rounded-xl border border-ink-700 bg-ink-950/40 px-4 py-2 text-sm font-semibold text-ink-200 hover:border-accent-500/30 hover:bg-accent-500/10 hover:text-ink-100 disabled:opacity-60"
                >
                  New question
                </button>
                {results[currentIndex] ? (
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                      results[currentIndex].verdict === "correct"
                        ? "border-success-400/25 bg-success-400/10 text-success-400"
                        : results[currentIndex].verdict === "partial"
                          ? "border-amber-400/25 bg-amber-400/10 text-amber-400"
                          : "border-danger-400/25 bg-danger-400/10 text-danger-400"
                    }`}
                  >
                    {results[currentIndex].verdict === "correct" ? "Correct" : results[currentIndex].verdict === "partial" ? "Close" : "Not yet"}
                  </span>
                ) : null}
              </div>
              {results[currentIndex] ? (
                <div className="mt-3 rounded-lg border border-ink-700/80 bg-ink-950/40 p-3 text-sm leading-6 text-ink-300">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-accent-300">Feedback</div>
                  <div>{results[currentIndex].feedback}</div>
                </div>
              ) : null}
              {results[currentIndex] ? (
                <div className="mt-3 rounded-lg border border-ink-700/80 bg-ink-950/30 p-3">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-accent-300">Source answer</div>
                  <div className="text-sm leading-6 text-ink-300">{currentItem.answer}</div>
                </div>
              ) : null}
              <SourceList sources={[currentItem.source]} compact onOpenNote={onOpenNote} />
            </div>
          ) : null}
        </div>
      )}
    />
  );
}

type DueCard = { id: string; prompt: string; answer: string; sourceExcerpt: string; noteId: string | null };

function FlashcardTool({
  scope,
  data,
  activeNote,
  notify,
  onOpenNote
}: {
  scope: Scope;
  data: Bootstrap;
  activeNote: Note | null;
  notify: (message: string, tone?: Toast["tone"]) => void;
  onOpenNote: (source: SourceRef) => void;
}) {
  const [items, setItems] = useState<Flashcard[]>([]);
  const [localScope, setLocalScope] = useState<Scope>(scope);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"generate" | "review">("generate");
  const [dueCards, setDueCards] = useState<DueCard[]>([]);
  const [dueIndex, setDueIndex] = useState(0);
  const [dueOpen, setDueOpen] = useState(false);
  const [dueStats, setDueStats] = useState<{ due: number; total: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [rating, setRating] = useState(false);

  useEffect(() => {
    fetch("/api/deck?mode=stats")
      .then((r) => r.json())
      .then((s) => setDueStats(s as { due: number; total: number }))
      .catch(() => null);
  }, [mode]);

  async function startReview() {
    const res = await fetch("/api/deck?mode=due");
    const cards = (await res.json()) as DueCard[];
    setDueCards(cards);
    setDueIndex(0);
    setDueOpen(false);
    setMode("review");
  }

  async function saveToDecк(card: Flashcard) {
    setSaving(true);
    try {
      await fetch("/api/deck", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ noteId: card.source.noteId ?? null, prompt: card.prompt, answer: card.answer, sourceExcerpt: card.source.excerpt })
      });
      notify("Saved to deck", "success");
      const s = await fetch("/api/deck?mode=stats").then((r) => r.json());
      setDueStats(s as { due: number; total: number });
    } catch {
      notify("Failed to save card", "error");
    } finally {
      setSaving(false);
    }
  }

  async function rateCard(cardId: string, quality: number) {
    setRating(true);
    try {
      await fetch(`/api/deck/${cardId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quality })
      });
      const next = dueIndex + 1;
      if (next >= dueCards.length) {
        notify(`Review complete — ${dueCards.length} card${dueCards.length !== 1 ? "s" : ""} reviewed`, "success");
        setMode("generate");
        const s = await fetch("/api/deck?mode=stats").then((r) => r.json());
        setDueStats(s as { due: number; total: number });
      } else {
        setDueIndex(next);
        setDueOpen(false);
      }
    } catch {
      notify("Failed to record rating", "error");
    } finally {
      setRating(false);
    }
  }

  const currentItem = items[0];

  useEffect(() => {
    if (mode !== "review") return;
    const card = dueCards[dueIndex];
    if (!card) return;
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.key === " ") { e.preventDefault(); setDueOpen((v) => !v); }
      if (e.key === "1") void rateCard(card.id, 0);
      if (e.key === "2") void rateCard(card.id, 2);
      if (e.key === "3") void rateCard(card.id, 4);
      if (e.key === "4") void rateCard(card.id, 5);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, dueCards, dueIndex, dueOpen]);

  if (mode === "review") {
    const card = dueCards[dueIndex];
    if (!card) {
      return (
        <div className="space-y-3">
          <ToolHeader title="Training Card Review" description="All due cards have been reviewed." />
          <EmptyToolState message="No cards due — check back tomorrow." />
          <button onClick={() => setMode("generate")} className="secondary-action">Back to generate</button>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        <ToolHeader title="Training Card Review" description={`Card ${dueIndex + 1} of ${dueCards.length} · Space=flip · 1-4=rate`} />
        <div className="study-card">
          <div className="mb-3 flex items-center justify-between text-xs text-ink-500">
            <span>Due card</span>
            <button onClick={() => setMode("generate")} className="text-ink-500 hover:text-ink-300">Exit</button>
          </div>
          <div className="text-sm font-medium leading-6 text-ink-100">{card.prompt}</div>
          <button onClick={() => setDueOpen((v) => !v)} className="mt-5 text-xs font-semibold text-accent-300">
            {dueOpen ? "Hide answer" : "Reveal answer"}
          </button>
          <div className={`grid transition-all duration-300 ease-premium ${dueOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
            <div className="overflow-hidden">
              <div className="mt-3 rounded-lg border border-success-400/25 bg-success-400/10 p-3 text-sm leading-6 text-ink-200">{card.answer}</div>
              {dueOpen ? (
                <div className="mt-4 space-y-2">
                  <div className="text-xs text-ink-500">How well did you recall this?</div>
                  <div className="flex flex-wrap gap-2">
                    {([["Again", 0, "bg-danger-400/10 text-danger-400 border-danger-400/30"], ["Hard", 2, "bg-amber-400/10 text-amber-400 border-amber-400/30"], ["Good", 4, "bg-success-400/10 text-success-400 border-success-400/30"], ["Easy", 5, "bg-accent-500/10 text-accent-300 border-accent-500/30"]] as [string, number, string][]).map(([label, q, cls]) => (
                      <button
                        key={label}
                        disabled={rating}
                        onClick={() => void rateCard(card.id, q)}
                        className={`rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-60 ${cls}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <StudyList
      title="Training Cards"
      description="Recall the answer mentally, then reveal the source-backed version."
      label="Generate card"
      mode="flashcards"
      scope={localScope}
      controls={
        <div className="flex flex-wrap items-center gap-2">
          <StudyScopePicker scope={localScope} setScope={setLocalScope} data={data} activeNote={activeNote} label="Flashcard source" />
          {dueStats && dueStats.due > 0 ? (
            <button onClick={() => void startReview()} className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-400/20">
              Review {dueStats.due} due
            </button>
          ) : null}
        </div>
      }
      notify={notify}
      onResult={(next: Flashcard[]) => { setItems(next.slice(0, 1)); setOpen(false); }}
      render={(busy, rerun) => (
        <div className="space-y-3">
          {busy ? <SkeletonStack /> : null}
          {!busy && !currentItem ? <EmptyToolState message="Generate one training card at a time from your indexed documents." /> : null}
          {currentItem ? (
            <div className="study-card">
              <div className="mb-3 flex items-center justify-between text-xs text-ink-500">
                <span>Training Card</span>
                <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-amber-400">Review</span>
              </div>
              <div className="text-sm font-medium leading-6 text-ink-100">{currentItem.prompt}</div>
              <button onClick={() => setOpen((v) => !v)} className="mt-5 text-xs font-semibold text-accent-300">
                {open ? "Hide answer" : "Reveal answer"}
              </button>
              <div className={`grid transition-all duration-300 ease-premium ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                <div className="overflow-hidden">
                  <div className="mt-3 rounded-lg border border-success-400/25 bg-success-400/10 p-3 text-sm leading-6 text-ink-200">{currentItem.answer}</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => void rerun()} disabled={busy} className="rounded-xl border border-ink-700 bg-ink-950/40 px-4 py-2 text-sm font-semibold text-ink-200 hover:border-accent-500/30 hover:bg-accent-500/10 hover:text-ink-100 disabled:opacity-60">
                  New card
                </button>
                <button type="button" onClick={() => void saveToDecк(currentItem)} disabled={saving} className="rounded-xl border border-accent-500/30 bg-accent-500/10 px-4 py-2 text-sm font-semibold text-accent-300 hover:bg-accent-500/20 disabled:opacity-60">
                  {saving ? "Saving..." : "Save to deck"}
                </button>
              </div>
              <SourceList sources={[currentItem.source]} compact onOpenNote={onOpenNote} />
            </div>
          ) : null}
        </div>
      )}
    />
  );
}

function SummaryTool({
  scope,
  notify,
  onOpenNote
}: {
  scope: Scope;
  notify: (message: string, tone?: Toast["tone"]) => void;
  onOpenNote: (source: SourceRef) => void;
}) {
  const [items, setItems] = useState<Array<{ id: string; label: string; text: string; source: AnswerResult["citations"][number] }>>([]);
  return (
    <StudyList
      title="Briefing"
      description="Key excerpts pulled directly from your indexed documents."
      label="Generate briefing"
      mode="summary"
      scope={scope}
      notify={notify}
      onResult={setItems}
      render={(busy) => (
        <div className="space-y-3">
          {busy ? <SkeletonStack /> : null}
          {items.map((item) => (
            <div key={item.id} className="study-card">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent-300">{item.label}</div>
              <blockquote className="border-l-2 border-accent-400/70 pl-3 text-sm leading-6 text-ink-200">{item.text}</blockquote>
              <SourceList sources={[item.source]} compact onOpenNote={onOpenNote} />
            </div>
          ))}
        </div>
      )}
    />
  );
}

// ── Study Plan (Today tab) ─────────────────────────────────────────────────────

type PlanItem = {
  type: "flashcard" | "quiz" | "review";
  source: string;
  cardId?: string;
  noteId: string | null;
  chunkId?: string | null;
  title: string;
  reason: string;
};

type RecentPerf = {
  totalAttempts: number;
  avgScore: number;
  streakDays: number;
};

function StudyPlanTool({ notify }: { notify: (m: string, tone?: Toast["tone"]) => void }) {
  const [items, setItems] = useState<PlanItem[] | null>(null);
  const [perf, setPerf] = useState<RecentPerf | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("plan_dismissed") ?? "[]")); } catch { return new Set(); }
  });

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/study-plan");
      if (!res.ok) throw new Error("Failed to load study plan");
      const body = await res.json();
      setItems(body.items);
      setPerf(body.performance);
    } catch {
      notify("Could not load study plan", "error");
    } finally {
      setLoading(false);
    }
  }

  function dismiss(key: string) {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(key);
      try { localStorage.setItem("plan_dismissed", JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }

  const visible = (items ?? []).filter((item) => !dismissed.has(itemKey(item)));

  function itemKey(item: PlanItem) {
    return `${item.type}:${item.cardId ?? item.noteId ?? ""}:${item.chunkId ?? ""}`;
  }

  const typeLabel: Record<PlanItem["type"], string> = { flashcard: "Training Card", quiz: "Knowledge Check", review: "Review" };
  const typeColor: Record<PlanItem["type"], string> = {
    flashcard: "text-accent-300",
    quiz: "text-emerald-400",
    review: "text-amber-400"
  };

  return (
    <div className="space-y-4">
      <ToolHeader title="Work Planner" description="Recommended items based on due cards, weak areas, and fresh content." />
      {perf && perf.totalAttempts > 0 ? (
        <div className="flex gap-3 rounded-xl border border-ink-700/80 bg-ink-900/50 p-3 text-xs">
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-bold text-accent-300">{Math.round(perf.avgScore * 100)}%</span>
            <span className="text-ink-500">avg score</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-bold text-ink-100">{perf.totalAttempts}</span>
            <span className="text-ink-500">attempts</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-bold text-amber-400">{perf.streakDays}</span>
            <span className="text-ink-500">day streak</span>
          </div>
        </div>
      ) : null}
      {loading ? <SkeletonStack /> : null}
      {!loading && visible.length === 0 ? (
        <div className="rounded-xl border border-ink-700/60 bg-ink-900/30 p-4 text-center text-sm text-ink-500">
          {items === null ? "Loading…" : "Nothing due — index documents and use Training Cards to build your review queue."}
        </div>
      ) : null}
      <div className="space-y-3">
        {visible.map((item) => (
          <div key={itemKey(item)} className="study-card flex items-start gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className={`text-xs font-semibold uppercase tracking-[0.12em] ${typeColor[item.type]}`}>
                {typeLabel[item.type]}
              </div>
              <div className="truncate text-sm font-medium text-ink-100">{item.title}</div>
              <div className="text-xs text-ink-500">{item.reason}</div>
            </div>
            <button
              onClick={() => dismiss(itemKey(item))}
              className="shrink-0 rounded p-1 text-ink-600 hover:text-ink-300"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      {!loading ? (
        <button onClick={() => void load()} className="w-full rounded-lg border border-ink-700/60 py-2 text-xs text-ink-400 hover:text-ink-200">
          Refresh plan
        </button>
      ) : null}
    </div>
  );
}

// ── Exam Mode tab ─────────────────────────────────────────────────────────────

type ExamSession = {
  id: string;
  scopeLabel: string | null;
  status: "active" | "finished";
  score: number | null;
  totalQuestions: number;
  correctCount: number;
  durationSeconds: number | null;
};

type ExamQuestion = {
  id: string;
  sessionId: string;
  question: string;
  noteTitle: string | null;
  userAnswer: string | null;
  score: number | null;
  result: string | null;
  index: number;
  total: number;
};

type ExamReviewItem = {
  questionId: string;
  question: string;
  userAnswer: string;
  expectedAnswer: string;
  score: number;
  result: string;
  noteTitle: string | null;
  advice: string;
};

function ExamTool({
  scope,
  data,
  notify
}: {
  scope: Scope;
  data: Bootstrap;
  notify: (m: string, tone?: Toast["tone"]) => void;
}) {
  const [phase, setPhase] = useState<"setup" | "active" | "review">("setup");
  const [session, setSession] = useState<ExamSession | null>(null);
  const [question, setQuestion] = useState<ExamQuestion | null>(null);
  const [answer, setAnswer] = useState("");
  const [confidence, setConfidence] = useState(3);
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [review, setReview] = useState<ExamReviewItem[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [questionCount, setQuestionCount] = useState(5);

  useEffect(() => {
    if (phase === "active") {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  function fmtTime(s: number) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  function buildScopeLabel() {
    if (scope.type === "note") {
      const note = data.notes.find((n) => n.id === scope.noteId);
      return note?.title ?? "Current note";
    }
    if (scope.type === "folder") {
      const folder = data.folders.find((f) => f.id === scope.folderId);
      return folder?.name ?? "Current folder";
    }
    return "All notes";
  }

  async function startExam() {
    setStarting(true);
    try {
      const scopeLabel = buildScopeLabel();
      const body: Record<string, unknown> = { scopeLabel, questionCount };
      if (scope.type === "note") body.noteId = scope.noteId;
      if (scope.type === "folder") body.folderId = scope.folderId ?? null;
      const res = await fetch("/api/exam/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to start exam");
      setSession(json.session);
      setQuestion(json.firstQuestion);
      setAnswer("");
      setConfidence(3);
      setElapsed(0);
      setPhase("active");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to start exam", "error");
    } finally {
      setStarting(false);
    }
  }

  async function submitAnswer() {
    if (!session || !question || !answer.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/exam/answer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, questionId: question.id, userAnswer: answer.trim(), confidence })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit answer");
      if (json.nextQuestion) {
        setQuestion(json.nextQuestion);
        setAnswer("");
        setConfidence(3);
      } else {
        await finishExam();
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to submit", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function finishExam() {
    if (!session) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/exam/finish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: session.id })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to finish exam");
      setSession(json.session);
      setReview(json.review);
      setPhase("review");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to finish exam", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const confidenceLabels = ["", "Guessing", "Unsure", "Fairly sure", "Confident", "Certain"];

  if (phase === "setup") {
    return (
      <div className="space-y-4">
        <ToolHeader title="Assessment" description="Answer questions from memory. Expected answers are only revealed at the end." />
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-ink-400">Scope</label>
            <div className="rounded-lg border border-ink-700/60 bg-ink-900/40 px-3 py-2 text-sm text-ink-200">
              {buildScopeLabel()}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-400">Questions</label>
            <div className="flex gap-2">
              {[3, 5, 10, 15].map((n) => (
                <button
                  key={n}
                  onClick={() => setQuestionCount(n)}
                  className={`flex-1 rounded-lg border py-1.5 text-sm font-medium transition-colors ${
                    questionCount === n
                      ? "border-accent-500/40 bg-accent-500/15 text-accent-200"
                      : "border-ink-700/60 text-ink-400 hover:text-ink-200"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={() => void startExam()}
          disabled={starting}
          className="w-full rounded-xl bg-accent-500 py-2.5 text-sm font-semibold text-ink-100 transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {starting ? "Generating questions…" : "Start Assessment"}
        </button>
      </div>
    );
  }

  if (phase === "active" && question) {
    const progressPct = Math.round(((question.index - 1) / question.total) * 100);
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-400">
            Question {question.index} / {question.total}
          </span>
          <span className="font-mono text-xs text-ink-500">{fmtTime(elapsed)}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-800">
          <div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: `${progressPct}%` }} />
        </div>
        {question.noteTitle ? (
          <div className="text-xs text-ink-500">From: {question.noteTitle}</div>
        ) : null}
        <div className="rounded-xl border border-ink-700/60 bg-ink-900/50 p-3 text-sm leading-relaxed text-ink-100">
          {question.question}
        </div>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type your answer…"
          rows={4}
          className="w-full resize-none rounded-xl border border-ink-700/60 bg-ink-900/40 p-3 text-sm text-ink-100 placeholder-ink-600 focus:border-accent-500/50 focus:outline-none"
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void submitAnswer(); }}
        />
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs text-ink-400">
            <span>Confidence</span>
            <span className="text-ink-300">{confidenceLabels[confidence]}</span>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            value={confidence}
            onChange={(e) => setConfidence(Number(e.target.value))}
            className="w-full accent-accent-400"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void submitAnswer()}
            disabled={submitting || !answer.trim()}
            className="flex-1 rounded-xl bg-accent-500 py-2.5 text-sm font-semibold text-ink-100 transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : question.index === question.total ? "Submit & Finish" : "Next →"}
          </button>
          <button
            onClick={() => void finishExam()}
            disabled={submitting}
            className="rounded-xl border border-ink-700/60 px-3 py-2.5 text-xs text-ink-500 hover:text-ink-200 disabled:opacity-50"
          >
            End exam
          </button>
        </div>
      </div>
    );
  }

  if (phase === "review" && session) {
    const pct = Math.round((session.score ?? 0) * 100);
    const scoreColor = pct >= 80 ? "text-emerald-400" : pct >= 50 ? "text-amber-400" : "text-danger-400";
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-ink-700/60 bg-ink-900/50 p-4 text-center">
          <div className={`mb-1 text-4xl font-bold ${scoreColor}`}>{pct}%</div>
          <div className="text-xs text-ink-400">
            {session.correctCount} / {session.totalQuestions} correct
            {session.durationSeconds ? ` · ${fmtTime(session.durationSeconds)}` : ""}
          </div>
        </div>
        <div className="space-y-3">
          {review.map((item, i) => {
            const verdict = item.result === "correct" ? "correct" : item.result === "partial" ? "partial" : "incorrect";
            const borderColor = verdict === "correct" ? "border-emerald-500/30" : verdict === "partial" ? "border-amber-500/30" : "border-danger-400/30";
            const badgeColor = verdict === "correct" ? "text-emerald-400" : verdict === "partial" ? "text-amber-400" : "text-danger-400";
            return (
              <div key={item.questionId} className={`rounded-xl border bg-ink-900/40 p-3 ${borderColor}`}>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <span className="text-xs font-medium text-ink-400">Q{i + 1}</span>
                  <span className={`text-xs font-semibold uppercase ${badgeColor}`}>{verdict}</span>
                </div>
                <div className="mb-2 text-sm text-ink-100">{item.question}</div>
                <div className="mb-1 text-xs text-ink-500">Your answer:</div>
                <div className="mb-2 text-xs text-ink-300">{item.userAnswer}</div>
                <div className="mb-1 text-xs text-ink-500">Expected:</div>
                <div className="mb-2 text-xs text-ink-300">{item.expectedAnswer}</div>
                {item.advice && verdict !== "correct" ? (
                  <div className="flex gap-2 rounded-lg bg-ink-800/50 p-2 text-xs text-ink-400">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                    {item.advice}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        <button
          onClick={() => { setPhase("setup"); setSession(null); setQuestion(null); setReview([]); }}
          className="w-full rounded-xl border border-ink-700/60 py-2.5 text-sm text-ink-300 hover:text-ink-100"
        >
          New exam
        </button>
      </div>
    );
  }

  return null;
}

function StudyList<T>({
  title,
  description,
  label,
  mode,
  scope,
  notify,
  onResult,
  render,
  controls
}: {
  title: string;
  description: string;
  label: string;
  mode: "quiz" | "flashcards" | "summary";
  scope: Scope;
  notify: (message: string, tone?: Toast["tone"]) => void;
  onResult: (items: T[]) => void;
  render: (busy: boolean, rerun: () => Promise<void>) => React.ReactNode;
  controls?: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try {
      const response = await fetch("/api/study", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, scope: apiScope(scope) })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Study generation failed");
      const items = body as T[];
      onResult(items);
      notify(`${items.length} source item${items.length === 1 ? "" : "s"} generated`, "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Study generation failed", "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-4">
      <ToolHeader title={title} description={description} />
      {controls}
      <button onClick={run} disabled={busy} className="primary-action w-full">
        {busy ? "Searching knowledge base..." : label}
      </button>
      {render(busy, run)}
    </div>
  );
}

function SourceList({
  sources,
  compact = false,
  empty = "No source excerpts found.",
  query,
  onOpenNote
}: {
  sources: Array<{ chunkId: string; noteId?: string; noteTitle: string; excerpt: string; similarity: number; pageNumber?: number | null; documentId?: string | null }>;
  compact?: boolean;
  empty?: string;
  query?: string;
  onOpenNote?: (source: SourceRef) => void;
}) {
  if (!sources.length) return <div className="surface-soft rounded-xl px-3 py-4 text-sm text-ink-500">{empty}</div>;
  return (
    <div className={`space-y-2.5 ${compact ? "mt-3" : ""}`}>
      {sources.map((source, index) => (
        <details key={`${source.chunkId}-${index}`} className="group rounded-xl border border-ink-700/80 bg-ink-850/80 p-3 open:shadow-glow" open={!compact}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-xs font-semibold text-accent-300">{source.noteTitle}</span>
                {source.pageNumber != null && (
                  <span className="shrink-0 rounded bg-ink-700/60 px-1.5 py-0.5 text-[10px] font-semibold text-ink-300">
                    Page {source.pageNumber}
                  </span>
                )}
              </div>
              <div className="mt-1 text-[11px] text-ink-500">{sourceContextLabel(source, index)}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-ink-700 bg-ink-950/40 px-2 py-0.5 text-[11px] text-ink-300">
                {Math.round(source.similarity * 100)}%
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-ink-500 transition-transform group-open:rotate-180" />
            </div>
          </summary>
          <blockquote className="mt-3 border-l-2 border-accent-400/70 pl-3 text-xs leading-5 text-ink-300">
            {cleanSourceExcerpt(source.excerpt, query)}
          </blockquote>
          <div className="mt-3 flex flex-wrap gap-2">
            {source.documentId ? (
              <button
                type="button"
                onClick={() => window.open(`/api/documents/${source.documentId}/file#page=${source.pageNumber ?? 1}`, '_blank')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-950/40 px-2.5 py-1.5 text-xs font-medium text-ink-200 transition-colors hover:border-accent-500/40 hover:bg-accent-500/10 hover:text-accent-200 focus:outline-none focus:ring-2 focus:ring-accent-400/40"
              >
                <FileText className="h-3.5 w-3.5" />
                View document{source.pageNumber != null ? ` (p.${source.pageNumber})` : ""}
              </button>
            ) : source.noteId && onOpenNote ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    onOpenNote({
                      noteId: source.noteId!,
                      noteTitle: source.noteTitle,
                      excerpt: source.excerpt,
                      similarity: source.similarity,
                      view: "write"
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-950/40 px-2.5 py-1.5 text-xs font-medium text-ink-200 transition-colors hover:border-accent-500/40 hover:bg-accent-500/10 hover:text-accent-200 focus:outline-none focus:ring-2 focus:ring-accent-400/40"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Open in editor
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onOpenNote({
                      noteId: source.noteId!,
                      noteTitle: source.noteTitle,
                      excerpt: source.excerpt,
                      similarity: source.similarity,
                      view: "preview"
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-950/40 px-2.5 py-1.5 text-xs font-medium text-ink-200 transition-colors hover:border-accent-500/40 hover:bg-accent-500/10 hover:text-accent-200 focus:outline-none focus:ring-2 focus:ring-accent-400/40"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Open in preview
                </button>
              </>
            ) : null}
          </div>
        </details>
      ))}
    </div>
  );
}

function FolderRow({
  folder,
  count,
  collapsed,
  active,
  depth,
  onClick,
  onToggle,
  onCreate,
  onCreateFolder,
  onCreateLecture,
  onRename,
  onDelete,
  onMove,
  onReindex,
  onDragStart,
  onDrop,
  dragActive,
  onMenu
}: {
  folder: FolderType;
  count: number;
  collapsed: boolean;
  active: boolean;
  depth: number;
  onClick: () => void;
  onToggle: () => void;
  onCreate: () => void;
  onCreateFolder: () => void;
  onCreateLecture: () => void;
  onRename: () => void;
  onDelete: () => void;
  onMove: () => void;
  onReindex: () => void;
  onDragStart: () => void;
  onDrop: () => void;
  dragActive: boolean;
  onMenu: (event: MouseEvent) => void;
}) {
  const compactActions = depth >= 1;
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={(event) => {
        if (dragActive) event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
      onContextMenu={onMenu}
      className={`group relative flex items-start rounded-lg border ${
        active ? "border-accent-500/25 bg-accent-500/10" : dragActive ? "border-transparent hover:border-accent-500/30 hover:bg-accent-500/8" : "border-transparent hover:bg-white/[0.04]"
      }`}
    >
      <button onClick={onToggle} aria-label={collapsed ? "Expand folder" : "Collapse folder"} className="mt-0.5 grid h-9 w-8 place-items-center text-ink-500 hover:text-ink-100">
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      <button onClick={onClick} onDoubleClick={onRename} className="flex min-w-0 flex-1 items-start gap-2 py-2 text-left text-sm text-ink-200">
        {collapsed ? <Folder className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" /> : <FolderOpen className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />}
        <span
          title={folder.name}
          className="min-w-0 flex-1 pr-2 leading-5 text-ink-100 [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden group-hover:pr-44"
        >
          {folder.name}
        </span>
      </button>
      <button onClick={onMove} aria-label={`Move ${folder.name}`} className="hidden" />
      <button onClick={onReindex} aria-label={`Reindex ${folder.name}`} className="hidden" />
      <button onClick={onCreateLecture} aria-label={`New project in ${folder.name}`} className="hidden" />
      <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-1.5 opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto">
        <span className="rounded-full border border-ink-700/70 bg-white/[0.03] px-2 py-0.5 text-xs text-ink-400">{count}</span>
        {!compactActions ? (
          <>
            <button onClick={onCreate} aria-label={`New note in ${folder.name}`} className="grid h-8 w-8 place-items-center text-ink-500 hover:text-accent-300">
              <FilePlus className="h-3.5 w-3.5" />
            </button>
            <button onClick={onCreateFolder} aria-label={`New folder in ${folder.name}`} className="grid h-8 w-8 place-items-center text-ink-500 hover:text-accent-300">
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
            <button onClick={onRename} aria-label={`Rename ${folder.name}`} className="grid h-8 w-8 place-items-center text-ink-500 hover:text-accent-300">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={onDelete} aria-label={`Delete ${folder.name}`} className="grid h-8 w-8 place-items-center text-ink-500 hover:text-danger-400">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        ) : null}
        <button
          onClick={(event) => {
            event.stopPropagation();
            onMenu(event);
          }}
          aria-label={`More actions for ${folder.name}`}
          className="grid h-8 w-8 place-items-center text-ink-500 hover:text-ink-100"
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function NoteRow({
  note,
  active,
  pinned,
  bulkMode = false,
  bulkSelected = false,
  onToggleBulk,
  onClick,
  onTogglePin,
  onRename,
  onDelete,
  onMove,
  onReindex,
  onDragStart,
  onMenu
}: {
  note: Note;
  active: boolean;
  pinned: boolean;
  bulkMode?: boolean;
  bulkSelected?: boolean;
  onToggleBulk?: () => void;
  onClick: () => void;
  onTogglePin: () => void;
  onRename: () => void;
  onDelete: () => void;
  onMove: () => void;
  onReindex: () => void;
  onDragStart: () => void;
  onMenu: (event: MouseEvent) => void;
}) {
  return (
    <div
      draggable={!bulkMode}
      onDragStart={onDragStart}
      onContextMenu={onMenu}
      className={`group relative flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-all duration-150 ${
        bulkSelected ? "border-accent-500/40 bg-accent-500/12" : active ? "border-accent-500/25 bg-accent-500/10 text-ink-100 shadow-[0_0_12px_rgba(139,92,246,0.08)]" : "border-transparent text-ink-300 hover:border-white/[0.05] hover:bg-white/[0.035] hover:text-ink-100"
      }`}
    >
      {bulkMode ? (
        <button onClick={onToggleBulk} className="mt-0.5 shrink-0">
          {bulkSelected ? <SquareCheck className="h-4 w-4 text-accent-300" /> : <Square className="h-4 w-4 text-ink-500" />}
        </button>
      ) : null}
      <button onClick={bulkMode ? onToggleBulk : onClick} onDoubleClick={onRename} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        {!bulkMode && (pinned ? <Pin className="h-3.5 w-3.5 shrink-0 text-accent-300" /> : <FileText className={`h-3.5 w-3.5 shrink-0 ${active ? "text-accent-300" : "text-ink-500 group-hover:text-ink-300"}`} />)}
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-100 group-hover:pr-24">{note.title}</span>
        <span className="shrink-0 text-[10px] tabular-nums text-ink-600">{new Date(note.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
      </button>
      <button onClick={onMove} aria-label={`Move ${note.title}`} className="hidden" />
      <button onClick={onReindex} aria-label={`Reindex ${note.title}`} className="hidden" />
      <div className="absolute right-1 top-2 flex items-center gap-1 opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto">
        <button onClick={onTogglePin} aria-label={pinned ? `Unpin ${note.title}` : `Pin ${note.title}`} className="grid h-7 w-7 place-items-center text-ink-500 hover:text-accent-300">
          {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
        </button>
        <button onClick={onRename} aria-label={`Rename ${note.title}`} className="grid h-7 w-7 place-items-center text-ink-500 hover:text-accent-300">
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button onClick={onDelete} aria-label={`Delete ${note.title}`} className="grid h-7 w-7 place-items-center text-ink-500 hover:text-danger-400">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation();
            onMenu(event);
          }}
          aria-label={`More actions for ${note.title}`}
          className="grid h-7 w-7 place-items-center text-ink-500 hover:text-ink-100"
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function VaultContextMenu({
  menu,
  folders,
  notes,
  onClose,
  onNewNote,
  onNewFolder,
  onNewLecture,
  onMoveFolder,
  onRenameFolder,
  onDeleteFolder,
  onReindexFolder,
  onMoveNote,
  onRenameNote,
  onDuplicateNote,
  onDeleteNote,
  onReindexNote,
  onTogglePinNote,
  pinnedNoteIds
}: {
  menu: VaultMenu;
  folders: FolderType[];
  notes: Note[];
  onClose: () => void;
  onNewNote: (folderId: string | null) => void;
  onNewFolder: (parentId: string | null) => void;
  onNewLecture: (folder: FolderType) => void;
  onMoveFolder: (folder: FolderType) => void;
  onRenameFolder: (folder: FolderType) => void;
  onDeleteFolder: (folder: FolderType) => void;
  onReindexFolder: (folder: FolderType) => void;
  onMoveNote: (note: Note) => void;
  onRenameNote: (note: Note) => void;
  onDuplicateNote: (note: Note) => void;
  onDeleteNote: (note: Note) => void;
  onReindexNote: (note: Note) => void;
  onTogglePinNote: (note: Note) => void;
  pinnedNoteIds: string[];
}) {
  if (!menu) return null;
  const folder = menu.kind === "folder" ? folders.find((item) => item.id === menu.id) : null;
  const note = menu.kind === "note" ? notes.find((item) => item.id === menu.id) : null;
  if (!folder && !note) return null;

  const viewportWidth = typeof window === "undefined" ? 1200 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 800 : window.innerHeight;
  const left = Math.max(8, Math.min(menu.x, viewportWidth - 230));
  const top = Math.max(8, Math.min(menu.y, viewportHeight - 330));
  const itemClass = "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-ink-200 hover:bg-accent-500/12 hover:text-ink-100";
  const dangerClass = "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-danger-400 hover:bg-danger-400/10";

  return (
    <div
      onClick={(event) => event.stopPropagation()}
      className="fixed z-[80] w-56 rounded-xl border border-ink-700 bg-ink-900/98 p-1.5 shadow-panel backdrop-blur"
      style={{ left, top }}
    >
      <div className="border-b border-ink-700/70 px-3 py-2">
        <div className="truncate text-xs font-semibold text-ink-100">{folder?.name ?? note?.title}</div>
        <div className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-ink-500">{folder ? "Folder" : "Note"}</div>
      </div>
      {folder ? (
        <>
          <button
            className={itemClass}
            onClick={() => {
              onClose();
              onNewNote(folder.id);
            }}
          >
            <FilePlus className="h-4 w-4 text-accent-300" />
            New note here
          </button>
          <button
            className={itemClass}
            onClick={() => {
              onClose();
              onNewFolder(folder.id);
            }}
          >
            <FolderPlus className="h-4 w-4 text-accent-300" />
            New folder here
          </button>
          <button
            className={itemClass}
            onClick={() => {
              onClose();
              onNewLecture(folder);
            }}
          >
            <FileStack className="h-4 w-4 text-accent-300" />
            New project workspace
          </button>
          <button
            className={itemClass}
            onClick={() => {
              onClose();
              onRenameFolder(folder);
            }}
          >
            <Pencil className="h-4 w-4 text-accent-300" />
            Rename folder
          </button>
          <button
            className={itemClass}
            onClick={() => {
              onClose();
              onMoveFolder(folder);
            }}
          >
            <FolderOpen className="h-4 w-4 text-accent-300" />
            Move folder...
          </button>
          <button
            className={itemClass}
            onClick={() => {
              onClose();
              onReindexFolder(folder);
            }}
          >
            <RotateCw className="h-4 w-4 text-accent-300" />
            Reindex folder
          </button>
          <button
            className={dangerClass}
            onClick={() => {
              onClose();
              onDeleteFolder(folder);
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete folder
          </button>
        </>
      ) : null}
      {note ? (
        <>
          <button
            className={itemClass}
            onClick={() => {
              onClose();
              onTogglePinNote(note);
            }}
          >
            {pinnedNoteIds.includes(note.id) ? <PinOff className="h-4 w-4 text-accent-300" /> : <Pin className="h-4 w-4 text-accent-300" />}
            {pinnedNoteIds.includes(note.id) ? "Unpin note" : "Pin note"}
          </button>
          <button
            className={itemClass}
            onClick={() => {
              onClose();
              onRenameNote(note);
            }}
          >
            <Pencil className="h-4 w-4 text-accent-300" />
            Rename note
          </button>
          <button
            className={itemClass}
            onClick={() => {
              onClose();
              onDuplicateNote(note);
            }}
          >
            <Copy className="h-4 w-4 text-accent-300" />
            Duplicate note
          </button>
          <button
            className={itemClass}
            onClick={() => {
              onClose();
              onMoveNote(note);
            }}
          >
            <FolderOpen className="h-4 w-4 text-accent-300" />
            Move note...
          </button>
          <button
            className={itemClass}
            onClick={() => {
              onClose();
              onReindexNote(note);
            }}
          >
            <RotateCw className="h-4 w-4 text-accent-300" />
            Reindex note
          </button>
          <button
            className={dangerClass}
            onClick={() => {
              onClose();
              onDeleteNote(note);
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete note
          </button>
        </>
      ) : null}
    </div>
  );
}

function CommandPalette({
  open,
  query,
  onQueryChange,
  onClose,
  notes,
  folders,
  onOpenNote,
  onCreateNote,
  onCreateFolder,
  onOpenAccount,
  onOpenImport,
  onReindex
}: {
  open: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  notes: Note[];
  folders: FolderType[];
  onOpenNote: (noteId: string) => void;
  onCreateNote: () => void;
  onCreateFolder: () => void;
  onOpenAccount: () => void;
  onOpenImport: () => void;
  onReindex: () => Promise<void>;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const normalized = query.trim().toLowerCase();
  const filteredNotes = notes.filter((note) => !normalized || note.title.toLowerCase().includes(normalized)).slice(0, 8);
  const filteredFolders = folders.filter((folder) => !normalized || folder.name.toLowerCase().includes(normalized)).slice(0, 4);
  const actions = [
    { label: "Create note", run: onCreateNote },
    { label: "Create folder", run: onCreateFolder },
    { label: "Import document", run: onOpenImport },
    { label: "Open account", run: onOpenAccount },
    { label: "Reindex workspace", run: () => void onReindex() }
  ].filter((item) => !normalized || item.label.toLowerCase().includes(normalized));

  type CmdItem =
    | { kind: "action"; label: string; run: () => void }
    | { kind: "note"; id: string; label: string }
    | { kind: "folder"; id: string; label: string };

  const allItems: CmdItem[] = [
    ...actions.map((a) => ({ kind: "action" as const, label: a.label, run: a.run })),
    ...filteredNotes.map((n) => ({ kind: "note" as const, id: n.id, label: n.title })),
    ...filteredFolders.map((f) => ({ kind: "folder" as const, id: f.id, label: folderPath(f.id, folders) }))
  ];

  // Reset selection when query changes or palette opens
  useEffect(() => { setSelectedIndex(0); }, [query, open]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-cmd-idx="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  function runSelected() {
    const item = allItems[selectedIndex];
    if (!item) return;
    if (item.kind === "action") item.run();
    else if (item.kind === "note") onOpenNote(item.id);
  }

  if (!open) return null;

  const activeItemClass = "bg-accent-500/14 border-accent-500/30 text-ink-100";
  const baseItemClass = "border-ink-700/80 text-ink-200 hover:bg-white/[0.04]";

  let globalIdx = 0;

  function renderItem(item: CmdItem, idx: number, badge: string) {
    const isActive = idx === selectedIndex;
    const key = item.kind === "note" || item.kind === "folder" ? item.id : item.label;
    const run = item.kind === "action" ? item.run : item.kind === "note" ? () => onOpenNote(item.id) : undefined;
    return (
      <button
        key={key}
        data-cmd-idx={idx}
        onClick={run}
        disabled={item.kind === "folder"}
        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${isActive ? activeItemClass : baseItemClass} ${item.kind === "folder" ? "cursor-default opacity-60" : ""}`}
      >
        <span className="truncate">{item.label}</span>
        <span className={`shrink-0 text-xs ${isActive ? "text-accent-400" : "text-ink-500"}`}>{badge}</span>
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[75] bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-auto mt-[10vh] w-full max-w-2xl rounded-2xl border border-ink-700 bg-ink-900 shadow-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-ink-700/80 p-4">
          <input
            autoFocus
            value={query}
            onChange={(event) => { onQueryChange(event.target.value); setSelectedIndex(0); }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setSelectedIndex((i) => Math.min(i + 1, allItems.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setSelectedIndex((i) => Math.max(i - 1, 0));
              } else if (event.key === "Enter") {
                event.preventDefault();
                runSelected();
              } else if (event.key === "Escape") {
                onClose();
              }
            }}
            placeholder="Jump to a note or run a command..."
            className="w-full bg-transparent text-base text-ink-100 outline-none placeholder:text-ink-500"
          />
        </div>
        <div ref={listRef} className="max-h-[65vh] overflow-auto p-3">
          {actions.length > 0 ? (
            <>
              <div className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">Actions</div>
              <div className="space-y-1">
                {actions.map((action) => {
                  const idx = globalIdx++;
                  return renderItem({ kind: "action", label: action.label, run: action.run }, idx, "Command");
                })}
              </div>
            </>
          ) : null}
          {filteredNotes.length > 0 ? (
            <>
              <div className="mb-1.5 mt-4 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">Notes</div>
              <div className="space-y-1">
                {filteredNotes.map((note) => {
                  const idx = globalIdx++;
                  return renderItem({ kind: "note", id: note.id, label: note.title }, idx, "Note");
                })}
              </div>
            </>
          ) : null}
          {filteredFolders.length ? (
            <>
              <div className="mb-1.5 mt-4 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">Folders</div>
              <div className="space-y-1">
                {filteredFolders.map((folder) => {
                  const idx = globalIdx++;
                  return renderItem({ kind: "folder", id: folder.id, label: folderPath(folder.id, folders) }, idx, "Folder");
                })}
              </div>
            </>
          ) : null}
          {allItems.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-ink-500">No results for "{query}"</div>
          ) : null}
        </div>
        <div className="border-t border-ink-700/60 px-4 py-2 text-[11px] text-ink-600">
          <span className="mr-3">↑↓ navigate</span>
          <span className="mr-3">↵ open</span>
          <span>Esc close</span>
        </div>
      </div>
    </div>
  );
}

function FeedbackModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [category, setCategory] = useState<"bug" | "feature" | "general">("general");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!message.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ category, message: message.trim() })
      });
      if (!res.ok) throw new Error("Failed to send");
      onSent();
    } catch {
      setError("Could not send feedback. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-ink-700 bg-ink-900 shadow-panel">
        <div className="flex items-center justify-between border-b border-ink-700/80 px-5 py-4">
          <div>
            <div className="text-lg font-semibold text-ink-100">Send feedback</div>
            <div className="mt-0.5 text-xs text-ink-500">Help us improve — your message goes directly to the team.</div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-800 hover:text-ink-200">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div>
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-ink-500">Category</span>
            <div className="flex gap-2">
              {(["general", "feature", "bug"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    category === cat
                      ? cat === "bug" ? "border-danger-400/50 bg-danger-400/15 text-danger-300"
                        : cat === "feature" ? "border-accent-500/50 bg-accent-500/15 text-accent-300"
                        : "border-ink-500/50 bg-ink-700 text-ink-200"
                      : "border-ink-700 text-ink-500 hover:border-ink-600 hover:text-ink-300"
                  }`}
                >
                  {cat === "bug" ? "Bug report" : cat === "feature" ? "Feature request" : "General"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-ink-500">Message</span>
            <textarea
              autoFocus
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                category === "bug" ? "Describe what happened and how to reproduce it…"
                : category === "feature" ? "Describe the feature and the problem it would solve…"
                : "Share your thoughts…"
              }
              rows={5}
              className="control-soft w-full resize-none rounded-lg px-3 py-2.5 text-sm text-ink-100 outline-none placeholder:text-ink-500"
            />
            <div className="mt-1 text-right text-xs text-ink-600">{message.length}/2000</div>
          </div>
          {error ? <div className="rounded-lg border border-danger-400/30 bg-danger-400/10 px-3 py-2 text-xs text-danger-400">{error}</div> : null}
        </div>
        <div className="flex items-center justify-between border-t border-ink-700/80 px-5 py-4">
          <a
            href="https://discord.gg/9YHgyNvy9k"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-ink-500 hover:text-[#5865F2] transition-colors"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026c.462-.62.874-1.275 1.226-1.963.021-.04.001-.088-.041-.104a13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z"/>
            </svg>
            Chat on Discord
          </a>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={busy}
              className="rounded-lg border border-ink-700/80 px-4 py-2 text-sm font-medium text-ink-300 hover:bg-ink-800 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={() => void submit()}
              disabled={busy || !message.trim() || message.length > 2000}
              className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-ink-100 hover:bg-accent-400 disabled:opacity-60"
            >
              {busy ? "Sending…" : "Send feedback"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TextInputModal({
  state,
  onClose,
  onChange,
  onSubmit
}: {
  state: InputDialogState;
  onClose: () => void;
  onChange: (value: string) => void;
  onSubmit: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);

  if (!state) return null;
  const draft = state;

  async function handleSubmit() {
    if (!draft.value.trim()) return;
    setBusy(true);
    try {
      await onSubmit();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-ink-700 bg-ink-900 shadow-panel">
        <div className="border-b border-ink-700/80 px-5 py-4">
          <div className="text-lg font-semibold text-ink-100">{draft.title}</div>
          <div className="mt-1 text-sm text-ink-500">Folders help organize documents by project, team, or topic.</div>
        </div>
        <div className="px-5 py-4">
          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-ink-500">{draft.label}</span>
            <input
              autoFocus
              value={draft.value}
              onKeyDown={(event) => {
                allowNativeTextShortcuts(event);
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleSubmit();
                }
              }}
              onChange={(event) => onChange(event.target.value)}
              placeholder={draft.placeholder ?? "Enter a value"}
              className="control-soft w-full rounded-lg px-3 py-2.5 text-sm text-ink-100 outline-none placeholder:text-ink-500"
            />
          </label>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-ink-700/80 px-5 py-4">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-ink-700/80 px-4 py-2 text-sm font-medium text-ink-300 hover:bg-ink-800 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleSubmit()}
            disabled={busy || !draft.value.trim()}
            className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-ink-100 hover:bg-accent-400 disabled:opacity-60"
          >
            {busy ? "Saving..." : draft.submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function MoveTargetModal({
  state,
  onClose
}: {
  state: MoveDialogState;
  onClose: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string>(state?.currentFolderId ?? "__root__");
  const [busy, setBusy] = useState(false);

  if (!state) return null;
  const dialog = state;
  const options = dialog.options.filter((folder) => folder.id !== dialog.currentFolderId);

  async function handleSubmit() {
    setBusy(true);
    try {
      await dialog.onSubmit(selectedId === "__root__" ? null : selectedId);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-ink-700 bg-ink-900 shadow-panel">
        <div className="border-b border-ink-700/80 px-5 py-4">
          <div className="text-lg font-semibold text-ink-100">{dialog.title}</div>
          <div className="mt-1 text-sm text-ink-500">{dialog.description}</div>
        </div>
        <div className="max-h-[340px] space-y-2 overflow-auto px-5 py-4">
          <button
            onClick={() => setSelectedId("__root__")}
            className={`flex w-full items-center justify-between rounded-lg border px-3 py-3 text-left text-sm ${
              selectedId === "__root__" ? "border-accent-500/40 bg-accent-500/10 text-accent-200" : "border-ink-700/80 bg-ink-950/35 text-ink-300 hover:bg-ink-850"
            }`}
          >
            <span>{dialog.allowRootLabel}</span>
            {selectedId === "__root__" ? <Check className="h-4 w-4" /> : null}
          </button>
          {options.map((folder) => (
            <button
              key={folder.id}
              onClick={() => setSelectedId(folder.id)}
              className={`flex w-full items-center justify-between rounded-lg border px-3 py-3 text-left text-sm ${
                selectedId === folder.id ? "border-accent-500/40 bg-accent-500/10 text-accent-200" : "border-ink-700/80 bg-ink-950/35 text-ink-300 hover:bg-ink-850"
              }`}
            >
              <span className="truncate">{folder.name}</span>
              {selectedId === folder.id ? <Check className="h-4 w-4" /> : null}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-ink-700/80 px-5 py-4">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-ink-700/80 px-4 py-2 text-sm font-medium text-ink-300 hover:bg-ink-800 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleSubmit()}
            disabled={busy}
            className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-ink-100 hover:bg-accent-400 disabled:opacity-60"
          >
            {busy ? "Moving..." : dialog.submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({
  confirmState,
  onClose
}: {
  confirmState: ConfirmState;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  if (!confirmState) return null;
  const dialog = confirmState;

  async function handleConfirm() {
    setBusy(true);
    try {
      await dialog.onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-ink-700 bg-ink-900 shadow-panel">
        <div className="border-b border-ink-700/80 px-5 py-4">
          <div className="text-lg font-semibold text-ink-100">{confirmState.title}</div>
          <div className="mt-1 text-sm leading-6 text-ink-400">{confirmState.description}</div>
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-4">
          <button
            onClick={() => {
              setBusy(false);
              onClose();
            }}
            disabled={busy}
            className="rounded-lg border border-ink-700/80 px-4 py-2 text-sm font-medium text-ink-300 hover:bg-ink-800 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={busy}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-ink-100 disabled:opacity-60 ${
              dialog.tone === "danger" ? "bg-danger-400 hover:bg-red-400" : "bg-accent-500 hover:bg-accent-400"
            }`}
          >
            {busy ? "Working..." : dialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function TableInsertModal({
  state,
  onClose,
  onSubmit
}: {
  state: TableDialogState;
  onClose: () => void;
  onSubmit: (rows: number, columns: number) => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState(state?.rows ?? 3);
  const [columns, setColumns] = useState(state?.columns ?? 3);

  if (!state) return null;

  async function handleSubmit() {
    setBusy(true);
    try {
      await onSubmit(Math.max(1, rows), Math.max(1, columns));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-ink-700 bg-ink-900 shadow-panel">
        <div className="border-b border-ink-700/80 px-5 py-4">
          <div className="text-lg font-semibold text-ink-100">Insert table</div>
          <div className="mt-1 text-sm text-ink-500">Choose the starting size. You can add or remove rows and columns later from the editor toolbar.</div>
        </div>
        <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-ink-500">Rows</span>
            <input
              autoFocus
              type="number"
              min={1}
              max={12}
              value={rows}
              onChange={(event) => setRows(Number(event.target.value) || 1)}
              className="control-soft w-full rounded-lg px-3 py-2.5 text-sm text-ink-100 outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-ink-500">Columns</span>
            <input
              type="number"
              min={1}
              max={8}
              value={columns}
              onChange={(event) => setColumns(Number(event.target.value) || 1)}
              className="control-soft w-full rounded-lg px-3 py-2.5 text-sm text-ink-100 outline-none"
            />
          </label>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-ink-700/80 px-5 py-4">
          <button onClick={onClose} disabled={busy} className="rounded-lg border border-ink-700/80 px-4 py-2 text-sm font-medium text-ink-300 hover:bg-ink-800 disabled:opacity-60">
            Cancel
          </button>
          <button onClick={() => void handleSubmit()} disabled={busy} className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-ink-100 hover:bg-accent-400 disabled:opacity-60">
            {busy ? "Inserting..." : "Insert table"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ShareModal({
  note, shares, email, permission, loading,
  onEmailChange, onPermissionChange, onShare, onRevoke, onUpdatePermission, onClose
}: {
  note: Note;
  shares: NoteShare[];
  email: string;
  permission: NoteSharePermission;
  loading: boolean;
  onEmailChange: (v: string) => void;
  onPermissionChange: (v: NoteSharePermission) => void;
  onShare: () => void;
  onRevoke: (userId: string) => void;
  onUpdatePermission: (userId: string, perm: NoteSharePermission) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-2xl border border-ink-700/80 bg-ink-900 p-6 shadow-panel" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink-100">Share note</h2>
            <p className="mt-0.5 truncate text-sm text-ink-500">{note.title}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-500 hover:bg-white/5 hover:text-ink-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Add person */}
        <div className="flex gap-2">
          <input
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onShare()}
            placeholder="Email address"
            type="email"
            className="flex-1 rounded-xl border border-ink-700/80 bg-ink-950/60 px-3 py-2 text-sm text-ink-100 placeholder-ink-600 outline-none focus:border-accent-500/50"
          />
          <select
            value={permission}
            onChange={(e) => onPermissionChange(e.target.value as NoteSharePermission)}
            className="rounded-xl border border-ink-700/80 bg-ink-950/60 px-2 py-2 text-sm text-ink-200 outline-none"
          >
            <option value="edit">Can edit</option>
            <option value="view">Can view</option>
          </select>
          <button
            onClick={onShare}
            disabled={loading || !email.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-accent-500 px-3 py-2 text-sm font-semibold text-ink-100 hover:bg-accent-400 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
            Share
          </button>
        </div>

        {/* Current shares */}
        {shares.length > 0 ? (
          <div className="mt-5">
            <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-500">People with access</div>
            <div className="space-y-2">
              {shares.map((share) => (
                <div key={share.sharedWithUserId} className="flex items-center gap-3 rounded-xl border border-ink-700/60 bg-ink-800/40 px-3 py-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-500/20 text-sm font-semibold text-accent-300">
                    {share.sharedWithName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-ink-100">{share.sharedWithName}</div>
                    <div className="truncate text-xs text-ink-500">{share.sharedWithEmail}</div>
                  </div>
                  <select
                    value={share.permission}
                    onChange={(e) => onUpdatePermission(share.sharedWithUserId, e.target.value as NoteSharePermission)}
                    className="rounded-lg border border-ink-700/60 bg-ink-900 px-2 py-1 text-xs text-ink-200 outline-none"
                  >
                    <option value="edit">Can edit</option>
                    <option value="view">Can view</option>
                  </select>
                  <button
                    onClick={() => onRevoke(share.sharedWithUserId)}
                    className="rounded-lg p-1.5 text-ink-500 hover:bg-danger-400/10 hover:text-danger-400"
                    aria-label="Remove access"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-center text-sm text-ink-600">Only you have access to this note.</p>
        )}
      </div>
    </div>
  );
}

function WorkspaceCreateModal({
  onClose,
  onCreate
}: {
  onClose: () => void;
  onCreate: (name: string, description: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) return;
    setBusy(true);
    try { await onCreate(name.trim(), description.trim()); } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-ink-700 bg-ink-900 shadow-panel" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-ink-700/80 px-5 py-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-accent-400" />
            <div className="text-lg font-semibold text-ink-100">Create team workspace</div>
          </div>
          <div className="mt-1 text-sm text-ink-500">A shared space where team members can collaborate on notes and documents.</div>
        </div>
        <div className="space-y-4 px-5 py-4">
          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-ink-500">Workspace name</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleSubmit(); }}
              placeholder="e.g. Product Team"
              className="control-soft w-full rounded-lg px-3 py-2.5 text-sm text-ink-100 outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-ink-500">Description (optional)</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this workspace for?"
              className="control-soft w-full rounded-lg px-3 py-2.5 text-sm text-ink-100 outline-none"
            />
          </label>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-ink-700/80 px-5 py-4">
          <button onClick={onClose} disabled={busy} className="rounded-lg border border-ink-700/80 px-4 py-2 text-sm font-medium text-ink-300 hover:bg-ink-800 disabled:opacity-60">Cancel</button>
          <button onClick={() => void handleSubmit()} disabled={busy || !name.trim()} className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-ink-100 hover:bg-accent-400 disabled:opacity-60">
            {busy ? "Creating..." : "Create workspace"}
          </button>
        </div>
      </div>
    </div>
  );
}

function WorkspaceManageModal({
  workspace,
  userId,
  inviteEmail,
  inviteToken,
  inviteLoading,
  onInviteEmailChange,
  onSendInvite,
  onCopyToken,
  onRemoveMember,
  onDeleteWorkspace,
  onClose
}: {
  workspace: WorkspaceWithMembers;
  userId: string;
  inviteEmail: string;
  inviteToken: string | null;
  inviteLoading: boolean;
  onInviteEmailChange: (v: string) => void;
  onSendInvite: () => void;
  onCopyToken: (token: string) => void;
  onRemoveMember: (userId: string) => Promise<void>;
  onDeleteWorkspace: () => void;
  onClose: () => void;
}) {
  const isOwner = workspace.currentUserRole === "owner";
  const [removingId, setRemovingId] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-ink-700 bg-ink-900 shadow-panel" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-ink-700/80 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-accent-400" />
              <div className="text-lg font-semibold text-ink-100">{workspace.name}</div>
            </div>
            {workspace.description ? <div className="mt-0.5 text-sm text-ink-500">{workspace.description}</div> : null}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-800 hover:text-ink-200"><X className="h-4 w-4" /></button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {isOwner ? (
            <div className="border-b border-ink-700/40 px-5 py-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Invite member</div>
              {inviteToken ? (
                <div className="rounded-lg border border-accent-500/20 bg-accent-500/10 p-3">
                  <div className="mb-2 text-xs text-ink-400">Invite link generated — share with your colleague:</div>
                  <div className="mb-2 break-all rounded bg-ink-800 px-2 py-1.5 font-mono text-xs text-accent-300">{`${typeof window !== "undefined" ? window.location.origin : ""}/workspace/join?token=${inviteToken}`}</div>
                  <button onClick={() => onCopyToken(inviteToken)} className="flex items-center gap-1.5 text-xs font-medium text-accent-300 hover:text-accent-200">
                    <Copy className="h-3 w-3" />
                    Copy invite link
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => onInviteEmailChange(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") onSendInvite(); }}
                    placeholder="colleague@company.com"
                    className="control-soft flex-1 rounded-lg px-3 py-2 text-sm text-ink-100 outline-none"
                  />
                  <button
                    onClick={onSendInvite}
                    disabled={inviteLoading || !inviteEmail.trim()}
                    className="rounded-lg bg-accent-500 px-3 py-2 text-sm font-semibold text-ink-100 hover:bg-accent-400 disabled:opacity-60"
                  >
                    {inviteLoading ? "Sending..." : "Invite"}
                  </button>
                </div>
              )}
            </div>
          ) : null}

          <div className="px-5 py-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Members ({workspace.members.length})</div>
            <div className="space-y-2">
              {workspace.members.map((member) => (
                <div key={member.userId} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-700 text-xs font-semibold text-ink-200">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-ink-200">{member.name}</div>
                    <div className="truncate text-xs text-ink-500">{member.email}</div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${member.role === "owner" ? "bg-accent-500/15 text-accent-300" : "bg-ink-700/60 text-ink-400"}`}>
                    {member.role}
                  </span>
                  {(isOwner && member.userId !== userId) || (member.userId === userId && !isOwner) ? (
                    <button
                      onClick={async () => {
                        setRemovingId(member.userId);
                        try { await onRemoveMember(member.userId); } finally { setRemovingId(null); }
                      }}
                      disabled={removingId === member.userId}
                      className="shrink-0 rounded p-1 text-ink-600 hover:text-danger-400 disabled:opacity-40"
                      title={member.userId === userId ? "Leave workspace" : "Remove member"}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>

        {isOwner ? (
          <div className="flex items-center justify-between border-t border-ink-700/80 px-5 py-4">
            <button onClick={onDeleteWorkspace} className="text-xs font-medium text-danger-500 hover:text-danger-400">Delete workspace</button>
            <button onClick={onClose} className="rounded-lg border border-ink-700/80 px-4 py-2 text-sm font-medium text-ink-300 hover:bg-ink-800">Done</button>
          </div>
        ) : (
          <div className="flex justify-end border-t border-ink-700/80 px-5 py-4">
            <button onClick={onClose} className="rounded-lg border border-ink-700/80 px-4 py-2 text-sm font-medium text-ink-300 hover:bg-ink-800">Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyToolState({ message }: { message: string }) {
  return <div className="surface-soft rounded-xl px-3 py-4 text-sm leading-6 text-ink-400">{message}</div>;
}

function ResizeHandle({ side, onPointerDown }: { side: "left" | "right"; onPointerDown: (event: MouseEvent<HTMLButtonElement>) => void }) {
  return (
    <button
      aria-label={`Resize ${side} panel`}
      onMouseDown={onPointerDown}
      className={`absolute top-0 z-20 hidden h-full w-2 cursor-col-resize place-items-center text-ink-600 hover:bg-accent-500/10 hover:text-accent-300 lg:grid ${
        side === "left" ? "-right-1" : "-left-1"
      }`}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-2.5 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500">{label}</div>
      <div className="mt-0.5 truncate text-xs font-semibold text-ink-200">{value}</div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
  tone = "default"
}: {
  label: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`grid h-9 w-9 place-items-center rounded-lg border bg-white/[0.03] ${
        tone === "danger"
          ? "border-danger-400/20 text-ink-400 hover:bg-danger-400/10 hover:text-danger-400"
          : "border-ink-700/80 text-ink-300 hover:border-accent-500/30 hover:bg-white/[0.06] hover:text-ink-100"
      }`}
    >
      {children}
    </button>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">{label}</div>;
}

function ToolHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <div className="text-sm font-semibold text-ink-100">{title}</div>
      <div className="mt-1 text-xs leading-5 text-ink-500">{description}</div>
    </div>
  );
}

function EmptyState({ children, action, onAction }: { children: React.ReactNode; action: string; onAction: () => void }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 text-sm leading-6 text-ink-400">
      <div>{children}</div>
      <button onClick={onAction} className="mt-3 rounded-lg border border-accent-500/30 bg-accent-500/12 px-3 py-1.5 text-xs font-semibold text-accent-300 transition-colors hover:bg-accent-500/20">
        {action}
      </button>
    </div>
  );
}

function Pill({ icon, label, accent = false }: { icon: React.ReactNode; label: string; accent?: boolean }) {
  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 ${accent ? "border-accent-500/25 bg-accent-500/10 text-accent-300" : "border-ink-700/80 bg-ink-850/70 text-ink-400"}`}>
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </span>
  );
}

function SaveBadge({ saving, stale }: { saving: boolean; stale: boolean }) {
  return (
    <span
      className={`hidden h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs sm:inline-flex ${
        stale ? "border-amber-400/25 bg-amber-400/10 text-amber-400" : "border-success-400/20 bg-success-400/10 text-success-400"
      }`}
    >
      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Circle className="h-2.5 w-2.5 fill-current" />}
      {saving ? "Saving" : stale ? "Needs reindex" : "Indexed"}
    </span>
  );
}

function IndexBadge({ status, busy }: { status: Bootstrap["indexStatus"]; busy: boolean }) {
  const stale = status.staleNotes > 0;
  return (
    <div
      className={`hidden items-center gap-2 rounded-lg border px-3 py-1.5 text-xs md:flex ${
        stale ? "border-amber-400/25 bg-amber-400/10 text-amber-400" : "border-success-400/20 bg-success-400/10 text-success-400"
      }`}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
      {status.chunks} chunks / {status.staleNotes} stale
    </div>
  );
}

function SkeletonStack() {
  return (
    <div className="space-y-2">
      <div className="shimmer h-16 rounded-xl bg-white/[0.04]" />
      <div className="shimmer h-24 rounded-xl bg-white/[0.035]" />
      <div className="shimmer h-12 rounded-xl bg-white/[0.03]" />
    </div>
  );
}

function ToastView({ toast }: { toast: Toast }) {
  const tone =
    toast.tone === "success"
      ? "border-success-400/25 bg-success-400/10 text-success-400"
      : toast.tone === "error"
        ? "border-danger-400/25 bg-danger-400/10 text-danger-400"
        : "border-accent-500/25 bg-accent-500/10 text-accent-300";
  return (
    <div className={`fixed bottom-4 right-4 z-50 rounded-xl border px-4 py-3 text-sm shadow-panel animate-[toastIn_220ms_ease-out] ${tone}`}>
      {toast.message}
    </div>
  );
}

function allowNativeTextShortcuts(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
  if (!event.ctrlKey && !event.metaKey) return;
  const key = event.key.toLowerCase();
  if (["a", "c", "v", "x", "z", "y"].includes(key)) {
    event.stopPropagation();
  }
}

function createSourceHighlightExtension(excerpt: string) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildSourceDecorations(view.state.doc.toString(), excerpt);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildSourceDecorations(update.state.doc.toString(), excerpt);
        }
      }
    },
    {
      decorations: (value) => value.decorations
    }
  );
}

function createMarkdownImagePreviewExtension() {
  class ImagePreviewWidget extends WidgetType {
    constructor(private readonly src: string, private readonly alt: string) {
      super();
    }
    eq(other: ImagePreviewWidget) {
      return other.src === this.src && other.alt === this.alt;
    }
    toDOM() {
      const wrap = document.createElement("span");
      wrap.dataset.mdImgPreview = "1";
      wrap.style.display = "block";
      wrap.style.margin = "10px 0";
      wrap.style.padding = "10px";
      wrap.style.border = "1px solid rgba(148, 163, 184, 0.14)";
      wrap.style.borderRadius = "12px";
      wrap.style.background = "rgba(255,255,255,0.03)";
      wrap.style.maxWidth = "560px";

      const img = document.createElement("img");
      img.src = this.src;
      img.alt = this.alt;
      img.loading = "lazy";
      img.style.display = "block";
      img.style.maxWidth = "100%";
      img.style.maxHeight = "260px";
      img.style.borderRadius = "10px";
      img.style.objectFit = "contain";
      wrap.appendChild(img);

      return wrap;
    }
  }

  function normalizeImageSrc(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("/api/images/")) return trimmed;
    if (trimmed.startsWith("/_img/")) return trimmed.replace("/_img/", "/api/images/");
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
    return null;
  }

  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.build(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.build(update.view);
        }
      }

      build(view: EditorView) {
        const builder = new RangeSetBuilder<Decoration>();
        for (const { from, to } of view.visibleRanges) {
          let pos = from;
          while (pos <= to) {
            const line = view.state.doc.lineAt(pos);
            const text = line.text;
            const matches = [...text.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)];
            for (const match of matches) {
              const alt = match[1] ?? "";
              const raw = match[2] ?? "";
              const src = normalizeImageSrc(raw);
              if (!src) continue;
              const matchIndex = typeof match.index === "number" ? match.index : 0;
              const matchFrom = line.from + matchIndex;
              const matchTo = matchFrom + match[0].length;
              const trimmed = text.trim();
              const isOnlyThingOnLine = trimmed === match[0] || trimmed === `${match[0]}.`;

              if (isOnlyThingOnLine) {
                builder.add(
                  line.from,
                  line.to,
                  Decoration.replace({
                    widget: new ImagePreviewWidget(src, alt)
                  })
                );
              } else {
                builder.add(
                  matchTo,
                  matchTo,
                  Decoration.widget({
                    widget: new ImagePreviewWidget(src, alt),
                    side: 1
                  })
                );
              }
            }
            pos = line.to + 1;
            if (line.to >= to) break;
          }
        }
        return builder.finish();
      }
    },
    {
      decorations: (value) => value.decorations
    }
  );
}

function buildSourceDecorations(content: string, excerpt: string) {
  const range = findExcerptRange(content, excerpt);
  if (!range) return Decoration.none;

  const builder = new RangeSetBuilder<Decoration>();
  const lineFrom = lineStart(content, range.from);
  const lineTo = lineEnd(content, range.to);
  builder.add(lineFrom, lineTo, Decoration.mark({ class: "cm-source-highlight" }));
  return builder.finish();
}

function findExcerptRange(content: string, excerpt: string) {
  const candidates = Array.from(
    new Set([
      excerpt.trim(),
      ...excerpt
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length >= 20)
    ])
  );

  for (const candidate of candidates) {
    if (!candidate) continue;
    const from = content.indexOf(candidate);
    if (from >= 0) return { from, to: from + candidate.length };
  }

  return null;
}

function lineStart(content: string, index: number) {
  const lineBreak = content.lastIndexOf("\n", Math.max(0, index) - 1);
  return lineBreak >= 0 ? lineBreak + 1 : 0;
}

function lineEnd(content: string, index: number) {
  const lineBreak = content.indexOf("\n", index);
  return lineBreak >= 0 ? lineBreak : content.length;
}

function scopeLabel(scope: Scope) {
  if (scope.type === "note") return "Note";
  if (scope.type === "folder") return "Folder";
  return "All";
}

type TableContext = {
  start: number;
  end: number;
  lines: string[];
  rowIndex: number;
  columnIndex: number;
};

function buildMarkdownTable(rows: number, columns: number) {
  const safeRows = Math.max(1, rows);
  const safeColumns = Math.max(1, columns);
  const header = `| ${Array.from({ length: safeColumns }, (_, index) => `Column ${index + 1}`).join(" | ")} |`;
  const separator = `| ${Array.from({ length: safeColumns }, () => "---").join(" | ")} |`;
  const body = Array.from({ length: safeRows }, () => `| ${Array.from({ length: safeColumns }, () => " ").join(" | ")} |`).join("\n");
  return `${header}\n${separator}\n${body}`;
}

function getTableContext(text: string, cursor: number): TableContext | null {
  const lines = text.split("\n");
  let offset = 0;
  let lineIndex = 0;
  for (; lineIndex < lines.length; lineIndex += 1) {
    const nextOffset = offset + lines[lineIndex].length;
    if (cursor <= nextOffset || lineIndex === lines.length - 1) break;
    offset = nextOffset + 1;
  }

  if (!looksLikeTableRow(lines[lineIndex])) return null;
  let startLine = lineIndex;
  while (startLine > 0 && looksLikeTableRow(lines[startLine - 1])) startLine -= 1;
  let endLine = lineIndex;
  while (endLine < lines.length - 1 && looksLikeTableRow(lines[endLine + 1])) endLine += 1;
  const tableLines = lines.slice(startLine, endLine + 1);
  if (tableLines.length < 2 || !isSeparatorRow(tableLines[1])) return null;

  const rowStartOffset = lines.slice(0, lineIndex).join("\n").length + (lineIndex > 0 ? 1 : 0);
  const columnIndex = tableColumnIndex(lines[lineIndex], Math.max(0, cursor - rowStartOffset));
  return {
    start: lines.slice(0, startLine).join("\n").length + (startLine > 0 ? 1 : 0),
    end: lines.slice(0, endLine + 1).join("\n").length,
    lines: tableLines,
    rowIndex: lineIndex - startLine,
    columnIndex
  };
}

function insertTableRow(text: string, context: TableContext) {
  const lines = [...context.lines];
  const columnCount = parseTableRow(lines[0]).length;
  const insertAt = Math.max(2, context.rowIndex + 1);
  lines.splice(insertAt, 0, serializeTableRow(Array.from({ length: columnCount }, () => " ")));
  return replaceTableBlock(text, context, lines, insertAt);
}

function deleteTableRow(text: string, context: TableContext) {
  if (context.lines.length <= 3) return null;
  const lines = [...context.lines];
  const target = Math.max(2, context.rowIndex);
  lines.splice(target, 1);
  return replaceTableBlock(text, context, lines, Math.max(2, target - 1));
}

function insertTableColumn(text: string, context: TableContext) {
  const insertAt = context.columnIndex + 1;
  const lines = context.lines.map((line, index) => {
    const cells = parseTableRow(line);
    cells.splice(insertAt, 0, index === 1 ? "---" : index === 0 ? `Column ${insertAt + 1}` : " ");
    return serializeTableRow(cells);
  });
  return replaceTableBlock(text, context, lines, context.rowIndex, insertAt);
}

function deleteTableColumn(text: string, context: TableContext) {
  const columnCount = parseTableRow(context.lines[0]).length;
  if (columnCount <= 1) return null;
  const removeAt = Math.min(context.columnIndex, columnCount - 1);
  const lines = context.lines.map((line) => {
    const cells = parseTableRow(line);
    cells.splice(removeAt, 1);
    return serializeTableRow(cells);
  });
  return replaceTableBlock(text, context, lines, context.rowIndex, Math.max(0, removeAt - 1));
}

function replaceTableBlock(text: string, context: TableContext, lines: string[], rowIndex: number, columnIndex = 0) {
  const nextBlock = lines.join("\n");
  const nextText = `${text.slice(0, context.start)}${nextBlock}${text.slice(context.end)}`;
  const selection = tableCellAnchor(lines, rowIndex, columnIndex);
  return { text: nextText, selection: context.start + selection };
}

function tableCellAnchor(lines: string[], rowIndex: number, columnIndex: number) {
  const safeRowIndex = Math.max(0, Math.min(lines.length - 1, rowIndex));
  const prefix = lines.slice(0, safeRowIndex).join("\n");
  const row = lines[safeRowIndex];
  const cellMatches = Array.from(row.matchAll(/\|/g));
  const cellStart = cellMatches[Math.min(columnIndex, Math.max(0, cellMatches.length - 2))]?.index ?? 0;
  return prefix.length + (safeRowIndex > 0 ? 1 : 0) + cellStart + 2;
}

function parseTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function serializeTableRow(cells: string[]) {
  return `| ${cells.map((cell) => cell || " ").join(" | ")} |`;
}

function looksLikeTableRow(line: string) {
  return line.includes("|") && parseTableRow(line).length > 1;
}

function isSeparatorRow(line: string) {
  return parseTableRow(line).every((cell) => /^:?-{3,}:?$/.test(cell));
}

function tableColumnIndex(line: string, columnOffset: number) {
  const bars = Array.from(line.matchAll(/\|/g)).map((match) => match.index ?? 0);
  for (let index = 0; index < bars.length - 1; index += 1) {
    if (columnOffset <= bars[index + 1]) return index;
  }
  return Math.max(0, bars.length - 2);
}

function scopeDisplayLabel(scope: Scope, activeNote: Note | null, folders: FolderType[], notes: Note[]) {
  if (scope.type === "all") return "All notes";
  if (scope.type === "note") {
    if (activeNote && activeNote.id === scope.noteId) return "Current note";
    return notes.find((note) => note.id === scope.noteId)?.title ?? "Selected note";
  }
  if (!scope.folderId) return "Unfiled notes";
  return folderPath(scope.folderId, folders);
}

function folderPath(folderId: string, folders: FolderType[]) {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const parts: string[] = [];
  let current = byId.get(folderId) ?? null;
  while (current) {
    parts.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) ?? null : null;
  }
  return parts.join(" / ") || "Folder";
}

function sourceContextLabel(
  source: { excerpt: string; similarity: number },
  index: number
) {
  const section = source.excerpt.match(/^Section:\s*(.+)$/m)?.[1]?.trim();
  if (section) return `Section: ${section}`;
  return `Matching excerpt ${index + 1}`;
}

function cleanSourceExcerpt(excerpt: string, query?: string) {
  const raw = excerpt.replace(/^Note:\s*.*$/gim, "").replace(/^Section:\s*.*$/gim, "").trim();
  if (!raw) return raw;

  const lines = raw.split(/\r?\n/).map((line) => line.trimEnd());
  const stop = new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "but",
    "by",
    "for",
    "from",
    "how",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "so",
    "that",
    "the",
    "their",
    "then",
    "this",
    "to",
    "what",
    "when",
    "where",
    "why",
    "with",
    "you"
  ]);

  const tokens = (query ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !stop.has(t))
    .slice(0, 12);

  const hasTokens = tokens.length > 0;

  const scored = lines
    .map((line, idx) => {
      const lower = line.toLowerCase();
      const score = hasTokens ? tokens.reduce((sum, t) => sum + (lower.includes(t) ? 1 : 0), 0) : 0;
      const structural =
        /^#{1,6}\s+/.test(line) ||
        /^>\s*\[!/.test(line) ||
        /^>\s+/.test(line) ||
        /^[-*]\s+/.test(line) ||
        /^\d+\.\s+/.test(line) ||
        line.trimStart().startsWith("```");
      return { idx, line, score, structural };
    })
    .filter((row) => row.line.trim().length > 0);

  let picked: number[] = [];
  const matches = scored.filter((row) => row.score > 0);
  if (matches.length) {
    picked = [...matches].sort((a, b) => b.score - a.score || a.idx - b.idx).slice(0, 10).map((row) => row.idx);
  } else {
    picked = scored.filter((row) => row.structural).slice(0, 10).map((row) => row.idx);
  }

  // Keep at most one small code block (first) if present.
  const codeStart = lines.findIndex((line) => line.trimStart().startsWith("```"));
  if (codeStart >= 0) {
    const codeEnd = lines.findIndex((line, i) => i > codeStart && line.trimStart().startsWith("```"));
    const snippetStart = Math.max(0, codeStart - 1);
    const snippetEnd = Math.min(lines.length - 1, codeEnd > codeStart ? Math.min(codeEnd + 1, codeStart + 14) : codeStart + 14);
    for (let i = snippetStart; i <= snippetEnd; i += 1) picked.push(i);
  }

  const uniq = Array.from(new Set(picked)).sort((a, b) => a - b);
  const out: string[] = [];
  for (const idx of uniq) {
    const line = lines[idx];
    if (!line) continue;
    out.push(line);
    if (out.length >= 14) break;
  }

  if (!out.length) out.push(...lines.filter((l) => l.trim()).slice(0, 6));

  let text = out.join("\n").trim();
  const maxChars = 650;
  if (text.length > maxChars) text = `${text.slice(0, maxChars).trimEnd()}…`;
  return text;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function readStoredNumber(key: string, fallback: number, min: number, max: number) {
  if (typeof window === "undefined") return fallback;
  const value = Number.parseInt(window.localStorage.getItem(key) ?? "", 10);
  return Number.isNaN(value) ? fallback : clamp(value, min, max);
}

function readStoredJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const value = window.localStorage.getItem(key);
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    window.localStorage.removeItem(key);
    return fallback;
  }
}

function apiScope(scope: Scope) {
  if (scope.type === "note") return { noteId: scope.noteId };
  if (scope.type === "folder") return { folderId: scope.folderId };
  return {};
}

function scopeKey(scope: Scope) {
  if (scope.type === "note") return `note:${scope.noteId}`;
  if (scope.type === "folder") return `folder:${scope.folderId ?? ""}`;
  return "all";
}

function splitImportedMarkdown(markdown: string, fallbackTitle: string) {
  const lines = markdown.split(/\r?\n/);
  const sections: Array<{ title: string; markdownContent: string }> = [];
  let currentTitle = fallbackTitle;
  let buffer: string[] = [];

  for (const line of lines) {
    const heading = /^(#{1,2})\s+(.+)$/.exec(line);
    if (heading && buffer.length) {
      sections.push({ title: currentTitle, markdownContent: buffer.join("\n").trim() });
      currentTitle = heading[2].trim();
      buffer = [line];
      continue;
    }
    if (heading && !buffer.length) currentTitle = heading[2].trim();
    buffer.push(line);
  }

  if (buffer.length) sections.push({ title: currentTitle, markdownContent: buffer.join("\n").trim() });
  return sections.filter((section) => section.markdownContent.trim());
}
