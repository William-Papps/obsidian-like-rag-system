"use client";

import { markdown } from "@codemirror/lang-markdown";
import { EditorSelection, RangeSetBuilder } from "@codemirror/state";
import { Decoration, EditorView, ViewPlugin, type DecorationSet, type ViewUpdate } from "@codemirror/view";
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
  Command,
  FilePlus,
  FileStack,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  GripVertical,
  LayoutPanelLeft,
  Layers3,
  Loader2,
  LogOut,
  MessageSquareText,
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
  Table2,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MarkdownPreview } from "@/components/markdown";
import { DocumentImportModal } from "@/components/document-import-modal";
import type { AnswerResult, Flashcard, Folder as FolderType, Note, ProviderSettings, QuizEvaluation, QuizQuestion } from "@/lib/types";

type Bootstrap = {
  user: { id: string; email: string; name: string };
  folders: FolderType[];
  notes: Note[];
  settings: ProviderSettings;
  indexStatus: { notes: number; chunks: number; staleNotes: number };
};

type Scope = { type: "all" } | { type: "note"; noteId: string } | { type: "folder"; folderId: string | null };
type Tab = "ask" | "find" | "quiz" | "flashcards" | "summary";
type NoteView = "write" | "preview" | "split";
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

export function Workspace() {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [scope, setScope] = useState<Scope>({ type: "all" });
  const [tab, setTab] = useState<Tab>("ask");
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [leftWidth, setLeftWidth] = useState(() => readStoredNumber("studyos:leftWidth", 300, 240, 420));
  const [rightWidth, setRightWidth] = useState(() => readStoredNumber("studyos:rightWidth", 410, 340, 560));
  const [noteView, setNoteView] = useState<NoteView>("write");
  const [draftTitle, setDraftTitle] = useState("");
  const [openNoteIds, setOpenNoteIds] = useState<string[]>([]);
  const [pinnedNoteIds, setPinnedNoteIds] = useState<string[]>(() => readStoredJson("studyos:pinnedNotes", []));
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<Toast | null>(null);
  const [vaultMenu, setVaultMenu] = useState<VaultMenu>(null);
  const [dragItem, setDragItem] = useState<DragItem>(null);
  const [sourceHighlight, setSourceHighlight] = useState<SourceHighlight | null>(null);
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [editorCursor, setEditorCursor] = useState(0);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [inputDialog, setInputDialog] = useState<InputDialogState>(null);
  const [moveDialog, setMoveDialog] = useState<MoveDialogState>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [tableDialog, setTableDialog] = useState<TableDialogState>(null);
  const [formatting, setFormatting] = useState(false);
  const [pastingImage, setPastingImage] = useState(false);

  const notify = useCallback((message: string, tone: Toast["tone"] = "info") => {
    const next = { id: Date.now(), tone, message };
    setToast(next);
    window.setTimeout(() => {
      setToast((current) => (current?.id === next.id ? null : current));
    }, 2600);
  }, []);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/bootstrap", { cache: "no-store" });
    if (response.status === 401) {
      window.location.href = "/auth";
      return;
    }
    const payload = (await response.json()) as Bootstrap;
    const [folders, notes, indexStatus] = await Promise.all([
      fetch("/api/folders", { cache: "no-store" }).then((result) => result.json() as Promise<FolderType[]>),
      fetch("/api/notes", { cache: "no-store" }).then((result) => result.json() as Promise<Note[]>),
      fetch("/api/index", { cache: "no-store" }).then((result) => result.json() as Promise<Bootstrap["indexStatus"]>)
    ]);
    const next = { ...payload, folders, notes, indexStatus };
    setData(next);
    setActiveNoteId((current) => current || next.notes[0]?.id || null);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  useEffect(() => {
    window.localStorage.setItem("studyos:pinnedNotes", JSON.stringify(pinnedNoteIds));
  }, [pinnedNoteIds]);

  useEffect(() => {
    const close = () => setVaultMenu(null);
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
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const activeNote = useMemo(() => data?.notes.find((note) => note.id === activeNoteId) ?? null, [data, activeNoteId]);
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
  const recentNotes = useMemo(
    () => (data?.notes ?? []).filter((note) => !pinnedNoteIds.includes(note.id)).slice(0, 5),
    [data?.notes, pinnedNoteIds]
  );
  const selectNote = useCallback((noteId: string, options?: { updateScope?: boolean }) => {
    setActiveNoteId(noteId);
    if (options?.updateScope !== false) {
      setScope({ type: "note", noteId });
    }
    setOpenNoteIds((current) => [noteId, ...current.filter((id) => id !== noteId)].slice(0, 8));
  }, []);
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
    const left = leftOpen ? `${leftWidth}px` : "0px";
    const right = rightOpen ? `${rightWidth}px` : "0px";
    return {
      gridTemplateColumns: `${left} minmax(0, 1fr) ${right}`
    };
  }, [leftOpen, leftWidth, rightOpen, rightWidth]);

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
  const currentTableContext = editorView ? getTableContext(editorView.state.doc.toString(), editorCursor) : null;

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

  async function createNoteWithTitle(title: string, folderId: string | null = scope.type === "folder" ? scope.folderId : null) {
    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, folderId })
    });
    const note = (await response.json()) as Note;
    await refresh();
    selectNote(note.id);
    notify("Note created", "success");
  }

  function createNote(folderId: string | null = scope.type === "folder" ? scope.folderId : null) {
    setInputDialog({
      title: "Create note",
      label: "Note name",
      placeholder: "e.g. Lecture 03 - Networks",
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

  const replaceActiveMarkdown = useCallback(
    async (markdownContent: string) => {
      if (!activeNote) return;
      await updateNote(activeNote.id, { markdownContent });
    },
    [activeNote]
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

  const pasteClipboardImage = useCallback(
    async (file: File, view: EditorView) => {
      setPastingImage(true);
      try {
        const formData = new FormData();
        formData.append("file", file, file.name || "clipboard-image.png");
        const response = await fetch("/api/convert", { method: "POST", body: formData });
        const body = (await response.json().catch(() => ({}))) as { markdown?: string; error?: string; warnings?: string[] };
        if (!response.ok || !body.markdown) throw new Error(body.error || "Clipboard image import failed");
        const selection = view.state.selection.main;
        const currentText = view.state.doc.toString();
        const insert = `${selection.from > 0 ? "\n\n" : ""}${body.markdown}\n`;
        const nextText = `${currentText.slice(0, selection.from)}${insert}${currentText.slice(selection.to)}`;
        const cursor = selection.from + insert.length;
        await applyEditorText(nextText, { anchor: cursor });
        for (const warning of body.warnings ?? []) notify(warning, "info");
        notify("Clipboard image converted into Markdown note text", "success");
      } catch (error) {
        notify(error instanceof Error ? error.message : "Clipboard image import failed", "error");
      } finally {
        setPastingImage(false);
      }
    },
    [applyEditorText, notify]
  );

  const editorExtensions = useMemo(() => {
    const extensions = [
      markdown(),
      EditorView.lineWrapping,
      EditorView.domEventHandlers({
        paste: (event, view) => {
          const items = Array.from(event.clipboardData?.items ?? []);
          const imageItem = items.find((item) => item.type.startsWith("image/"));
          if (!imageItem) return false;
          const file = imageItem.getAsFile();
          if (!file || !activeNote) return false;
          event.preventDefault();
          void pasteClipboardImage(file, view);
          return true;
        }
      })
    ];
    if (!editorHighlight?.excerpt.trim()) return extensions;
    return [...extensions, createSourceHighlightExtension(editorHighlight.excerpt)];
  }, [activeNote, editorHighlight, pasteClipboardImage]);

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

  async function insertCodeBlock() {
    if (!editorView || !activeNote) return;
    const selection = editorView.state.selection.main;
    const currentText = editorView.state.doc.toString();
    const selected = currentText.slice(selection.from, selection.to);
    const block = `\`\`\`text\n${selected}\n\`\`\``;
    await replaceSelectionWith(block);
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

  function createFolder(parentId: string | null = null) {
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
      body: JSON.stringify({ name, parentId })
    });
    await refresh();
    notify("Folder created", "success");
  }

  function createLectureWorkflow(folder: FolderType) {
    setInputDialog({
      title: "Create lecture workspace",
      label: "Lecture folder name",
      placeholder: `Lecture ${new Date().toLocaleDateString()}`,
      value: `Lecture ${new Date().toLocaleDateString()}`,
      submitLabel: "Create lecture",
      onSubmit: async (lectureName) => {
        const trimmedName = lectureName.trim();
        if (!trimmedName) return;
        await createLectureWorkspace(folder, trimmedName);
      }
    });
  }

  async function createLectureWorkspace(folder: FolderType, lectureName: string) {
    const folderResponse = await fetch("/api/folders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: lectureName.trim(), parentId: folder.id })
    });
    const lectureFolder = (await folderResponse.json()) as FolderType;
    const templates = [
      {
        title: `${lectureName.trim()} - Slides`,
        markdownContent: `# ${lectureName.trim()} - Slides\n\nAdd slide facts here. Keep each slide as source text the assistant can cite.\n\n## Slide 1\n\n- `
      },
      {
        title: `${lectureName.trim()} - Notes`,
        markdownContent: `# ${lectureName.trim()} - Notes\n\n## Key ideas\n\n- \n\n## Questions\n\n- `
      },
      {
        title: `${lectureName.trim()} - Revision`,
        markdownContent: `# ${lectureName.trim()} - Revision\n\n## Things to remember\n\n- \n\n## Practice questions\n\n- `
      }
    ];
    let firstNote: Note | null = null;
    for (const template of templates) {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...template, folderId: lectureFolder.id })
      });
      firstNote ??= (await response.json()) as Note;
    }
    await refresh();
    setCollapsedFolders((current) => ({ ...current, [folder.id]: false, [lectureFolder.id]: false }));
    if (firstNote) selectNote(firstNote.id);
    notify("Lecture workspace created", "success");
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

  function chooseFolderForNote(note: Note) {
    setMoveDialog({
      title: `Move "${note.title}"`,
      description: "Choose a destination folder for this note.",
      submitLabel: "Move note",
      currentFolderId: note.folderId,
      allowRootLabel: "Vault root / Unfiled notes",
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
      allowRootLabel: "Vault root",
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

  async function reindexScope(input: { noteId?: string; folderId?: string | null }, label: string) {
    notify(`Indexing ${label}`, "info");
    const response = await fetch("/api/index", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input)
    });
    if (!response.ok) {
      notify("Indexing failed", "error");
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
          Opening study workspace
        </div>
      </main>
    );
  }

  const rootFolders = data.folders.filter((folder) => !folder.parentId);
  const renderFolderNode = (folder: FolderType, depth = 0): ReactNode => {
    const folderNotes = data.notes.filter((note) => note.folderId === folder.id);
    const childFolders = data.folders.filter((child) => child.parentId === folder.id);
    const collapsed = collapsedFolders[folder.id] ?? false;
    return (
      <div key={folder.id} className="rounded-lg" style={{ marginLeft: depth ? 12 : 0 }}>
        <FolderRow
          folder={folder}
          count={folderNotes.length + childFolders.length}
          collapsed={collapsed}
          active={scope.type === "folder" && scope.folderId === folder.id}
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
    <main className="h-screen overflow-hidden bg-ink-950 text-ink-100">
      <TopBar
        data={data}
        leftOpen={leftOpen}
        rightOpen={rightOpen}
        onToggleLeft={() => setLeftOpen((open) => !open)}
        onToggleRight={() => setRightOpen((open) => !open)}
        onSettings={() => {
          window.location.href = "/account";
        }}
        onFind={() => setCommandOpen(true)}
        onReindexed={refresh}
        onImport={() => setImportModalOpen(true)}
        onLogout={async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          window.location.href = "/auth";
        }}
        notify={notify}
      />
      <div className="grid h-[calc(100vh-61px)] overflow-hidden transition-[grid-template-columns] duration-300 ease-premium" style={workspaceGridStyle}>
        <aside className={`panel-shell relative min-h-0 overflow-hidden border-r transition-opacity duration-200 ${leftOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}>
          <div className="flex h-16 items-center justify-between border-b border-ink-700/80 px-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-300/75">Vault</div>
              <div className="mt-0.5 flex items-center gap-2 text-sm font-semibold text-ink-100">
                <BookOpen className="h-4 w-4 text-accent-400" />
                Study Graph
              </div>
            </div>
            <div className="flex gap-1.5">
              <IconButton label="New folder" onClick={() => createFolder()}>
                <FolderPlus className="h-4 w-4" />
              </IconButton>
              <IconButton label="New note" onClick={() => createNote()}>
                <FilePlus className="h-4 w-4" />
              </IconButton>
            </div>
          </div>

          <div className="h-[calc(100%-64px)] overflow-auto px-3 py-4">
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
              <span className="rounded-full bg-white/6 px-2 py-0.5 text-xs text-ink-300">{data.notes.length}</span>
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
                        activeNoteId === note.id ? "bg-accent-500/10 text-accent-200" : "text-ink-500 hover:bg-white/[0.04] hover:text-ink-200"
                      }`}
                    >
                      <Clock3 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{note.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                void handleDropOnRoot();
              }}
            >
              <SectionLabel label="Classes" />
            </div>
            <div className="space-y-1.5">
              {rootFolders.map((folder) => renderFolderNode(folder))}
              {rootFolders.length === 0 ? (
                <EmptyState action="Create folder" onAction={() => createFolder()}>
                  Group notes by class, exam, or topic.
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
                {data.notes
                  .filter((note) => !note.folderId)
                  .map((note) => (
                    <NoteRow
                      key={note.id}
                      note={note}
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
          </div>
          <ResizeHandle side="left" onPointerDown={(event) => resizePanel("left", event)} />
        </aside>

        <section className="grid min-h-0 min-w-0 grid-rows-[auto_42px_45px_minmax(0,1fr)] overflow-hidden bg-ink-925">
          {activeNote ? (
            <>
              <div className="min-w-0 border-b border-ink-700/80 bg-ink-925/95 px-5 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <input
                    value={draftTitle}
                    onKeyDown={allowNativeTextShortcuts}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    onBlur={() => {
                      if (draftTitle !== activeNote.title) void updateNote(activeNote.id, { title: draftTitle });
                    }}
                    className="min-w-0 flex-1 rounded-md bg-transparent px-1 text-xl font-semibold text-white outline-none placeholder:text-ink-500"
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
                  <IconButton label="Delete note" onClick={deleteActiveNote} tone="danger">
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </div>
                <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 overflow-hidden text-xs text-ink-500">
                  <Pill icon={<Folder className="h-3.5 w-3.5" />} label={noteFolder} />
                  <Pill icon={<Clock3 className="h-3.5 w-3.5" />} label={`Updated ${new Date(activeNote.updatedAt).toLocaleString()}`} />
                  <Pill icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Source of truth" accent />
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
              />
              <div className={`h-full min-h-0 min-w-0 overflow-hidden ${noteView === "split" ? "grid grid-cols-2" : "grid grid-cols-1"}`}>
                {(noteView === "write" || noteView === "split") ? (
                <div className={`h-full min-h-0 min-w-0 overflow-hidden bg-ink-900/50 ${noteView === "split" ? "border-r border-ink-700/80" : ""}`}>
                  <CodeMirror
                    className="h-full"
                    height="100%"
                    onCreateEditor={setEditorView}
                    onUpdate={(update) => setEditorCursor(update.state.selection.main.head)}
                    value={activeNote.markdownContent}
                    extensions={editorExtensions}
                    theme="dark"
                    basicSetup={{ foldGutter: false, highlightActiveLine: true }}
                    onChange={(value) => updateNote(activeNote.id, { markdownContent: value })}
                  />
                </div>
                ) : null}
                {(noteView === "preview" || noteView === "split") ? (
                <div className="min-h-0 min-w-0 overflow-hidden bg-ink-925">
                  <MarkdownPreview markdown={activeNote.markdownContent} />
                </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="row-span-4 grid h-full place-items-center p-8">
              <EmptyState action="Create note" onAction={() => createNote()}>
                Create a Markdown note, then reindex it for source-grounded study tools.
              </EmptyState>
            </div>
          )}
        </section>

        <div className={`relative min-w-0 overflow-hidden transition-opacity duration-200 ${rightOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}>
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
        onDeleteNote={requestDeleteNote}
        onReindexNote={(note) => reindexScope({ noteId: note.id }, note.title)}
        onTogglePinNote={togglePinNote}
        pinnedNoteIds={pinnedNoteIds}
      />
      {toast ? <ToastView toast={toast} /> : null}
    </main>
  );
}

function TopBar({
  data,
  leftOpen,
  rightOpen,
  onToggleLeft,
  onToggleRight,
  onSettings,
  onFind,
  onReindexed,
  onImport,
  onLogout,
  notify
}: {
  data: Bootstrap;
  leftOpen: boolean;
  rightOpen: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  onSettings: () => void;
  onFind: () => void;
  onReindexed: () => void;
  onImport: () => void;
  onLogout: () => void | Promise<void>;
  notify: (message: string, tone?: Toast["tone"]) => void;
}) {
  const [busy, setBusy] = useState(false);
  async function reindex() {
    setBusy(true);
    try {
      const response = await fetch("/api/index", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Indexing failed");
      notify("Index refreshed", "success");
      onReindexed();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Indexing failed", "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <header className="flex h-[61px] items-center justify-between border-b border-ink-700/80 bg-ink-950/90 px-3 backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-2">
        <IconButton label={leftOpen ? "Hide vault" : "Show vault"} onClick={onToggleLeft}>
          <LayoutPanelLeft className="h-4 w-4" />
        </IconButton>
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-accent-500/30 bg-accent-500/15 text-accent-300 shadow-glow">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-ink-100">EternalNotes</div>
          <div className="truncate text-xs text-ink-500">Private study workspace / {data.user.email}</div>
        </div>
      </div>

      <button
        onClick={onFind}
        className="control-soft mx-3 hidden h-9 min-w-[260px] max-w-2xl flex-1 items-center gap-2 rounded-xl px-3 text-left text-sm text-ink-500 lg:flex"
      >
        <Search className="h-4 w-4 text-ink-500" />
        Search notes, classes, excerpts
        <span className="ml-auto flex items-center gap-1 rounded-md border border-ink-700/80 bg-ink-925 px-1.5 py-0.5 text-[11px] text-ink-500">
          <Command className="h-3 w-3" />
          Find
        </span>
      </button>

      <div className="flex items-center gap-2">
        <IndexBadge status={data.indexStatus} busy={busy} />
        <button
          onClick={reindex}
          disabled={busy}
          className="flex h-9 items-center gap-2 rounded-lg bg-accent-500 px-3 text-sm font-semibold text-ink-950 shadow-glow hover:bg-accent-400 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          <span className="hidden sm:inline">Reindex</span>
        </button>
        <IconButton label="Import document" onClick={onImport}>
          <Upload className="h-4 w-4" />
        </IconButton>
        <IconButton label="Account" onClick={onSettings}>
          <Settings className="h-4 w-4" />
        </IconButton>
        <IconButton label="Sign out" onClick={onLogout}>
          <LogOut className="h-4 w-4" />
        </IconButton>
        <IconButton label={rightOpen ? "Hide study panel" : "Show study panel"} onClick={onToggleRight}>
          {rightOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
        </IconButton>
      </div>
    </header>
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
    <div className="flex min-w-0 items-end gap-1 overflow-x-auto border-b border-ink-700/80 bg-ink-950/60 px-3 pt-1">
      {notes.map((note) => {
        const active = note.id === activeNoteId;
        const pinned = pinnedNoteIds.includes(note.id);
        return (
          <div
            key={note.id}
            className={`group flex h-9 min-w-[140px] max-w-[220px] items-center gap-2 rounded-t-lg border border-b-0 px-2.5 ${
              active ? "border-accent-500/35 bg-ink-925 text-white shadow-glow" : "border-ink-700/60 bg-ink-900/50 text-ink-400 hover:bg-ink-850/80 hover:text-ink-100"
            }`}
          >
            <button onClick={() => onTogglePin(note)} aria-label={pinned ? `Unpin ${note.title}` : `Pin ${note.title}`} className="shrink-0 text-ink-500 hover:text-accent-300">
              {pinned ? <Pin className="h-3.5 w-3.5 text-accent-300" /> : <FileText className="h-3.5 w-3.5" />}
            </button>
            <button onClick={() => onSelect(note.id)} className="min-w-0 flex-1 truncate text-left text-xs font-medium">
              {note.title}
            </button>
            <button onClick={() => onClose(note.id)} aria-label={`Close ${note.title}`} className="grid h-5 w-5 shrink-0 place-items-center rounded text-ink-500 opacity-0 hover:bg-white/8 hover:text-white group-hover:opacity-100">
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
  pastingImage
}: {
  value: NoteView;
  onChange: (value: NoteView) => void;
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
}) {
  const tabs: Array<{ id: NoteView; label: string }> = [
    { id: "write", label: "Write" },
    { id: "preview", label: "Preview" },
    { id: "split", label: "Split" }
  ];

  return (
    <div className="flex min-w-0 items-end justify-between gap-3 overflow-x-auto overflow-y-hidden border-b border-ink-700/80 bg-ink-950/45 px-5">
      <div className="flex h-full min-w-max items-end gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`h-9 rounded-t-lg border border-b-0 px-4 text-sm font-medium ${
              value === tab.id
                ? "border-ink-700 bg-ink-925 text-ink-100 shadow-glow"
                : "border-transparent text-ink-500 hover:bg-ink-850/70 hover:text-ink-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="hidden min-w-max items-center gap-1 pb-1.5 lg:flex">
        <button onClick={onInsertHeading} className="rounded-md px-2 py-1 text-xs font-semibold text-ink-400 hover:bg-white/6 hover:text-white">
          H2
        </button>
        <button onClick={onInsertList} className="rounded-md px-2 py-1 text-xs font-semibold text-ink-400 hover:bg-white/6 hover:text-white">
          List
        </button>
        <button onClick={onInsertQuote} className="rounded-md px-2 py-1 text-xs font-semibold text-ink-400 hover:bg-white/6 hover:text-white">
          Quote
        </button>
        <button onClick={onInsertCode} className="rounded-md px-2 py-1 text-xs font-semibold text-ink-400 hover:bg-white/6 hover:text-white">
          Code
        </button>
        <button onClick={onInsertTable} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-ink-400 hover:bg-white/6 hover:text-white">
          <Table2 className="h-3.5 w-3.5" />
          Table
        </button>
        {onAddTableRow ? (
          <button onClick={onAddTableRow} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-ink-400 hover:bg-white/6 hover:text-white">
            <Rows3 className="h-3.5 w-3.5" />
            Row +
          </button>
        ) : null}
        {onDeleteTableRow ? (
          <button onClick={onDeleteTableRow} className="rounded-md px-2 py-1 text-xs font-semibold text-ink-400 hover:bg-white/6 hover:text-white">
            Row -
          </button>
        ) : null}
        {onAddTableColumn ? (
          <button onClick={onAddTableColumn} className="rounded-md px-2 py-1 text-xs font-semibold text-ink-400 hover:bg-white/6 hover:text-white">
            Col +
          </button>
        ) : null}
        {onDeleteTableColumn ? (
          <button onClick={onDeleteTableColumn} className="rounded-md px-2 py-1 text-xs font-semibold text-ink-400 hover:bg-white/6 hover:text-white">
            Col -
          </button>
        ) : null}
        {onFormat ? (
          <button onClick={onFormat} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-ink-400 hover:bg-white/6 hover:text-white">
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
  const tabs: Array<[Tab, string, React.ReactNode]> = [
    ["ask", "Ask", <MessageSquareText className="h-4 w-4" key="ask" />],
    ["find", "Find", <Search className="h-4 w-4" key="find" />],
    ["quiz", "Quiz", <Check className="h-4 w-4" key="quiz" />],
    ["flashcards", "Cards", <Brain className="h-4 w-4" key="cards" />],
    ["summary", "Summary", <PanelRight className="h-4 w-4" key="summary" />]
  ];

  return (
    <aside className="panel-shell grid h-full min-h-0 grid-rows-[72px_54px_minmax(0,1fr)] overflow-hidden border-l">
      <div className="flex min-w-0 items-center justify-between gap-2 border-b border-ink-700/80 px-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink-100">Right sidebar</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-500">
            <ShieldCheck className="h-3.5 w-3.5 text-accent-400" />
            Grounded in source excerpts
          </div>
        </div>
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <ScopeSelect {...props} />
          <IconButton label="Hide study panel" onClick={props.onHide}>
            <PanelRightClose className="h-4 w-4" />
          </IconButton>
        </div>
      </div>
      <div className="relative flex min-w-0 gap-1 overflow-x-auto overflow-y-hidden border-b border-ink-700/80 bg-ink-950/25 p-1.5">
        {tabs.map(([id, label, icon]) => (
          <button
            key={id}
            onClick={() => props.setTab(id)}
            className={`relative flex min-w-[3rem] shrink-0 items-center justify-center gap-1 rounded-md px-2 text-xs font-medium transition-all duration-200 ease-premium ${
              props.tab === id ? "bg-ink-800 text-accent-300 shadow-sm" : "text-ink-500 hover:bg-white/[0.04] hover:text-ink-100"
            }`}
          >
            {icon}
            <span className="hidden truncate 2xl:inline">{label}</span>
          </button>
        ))}
      </div>
      <div className="min-h-0 overflow-auto p-4">
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
        </div>
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
      <SearchableScopePicker scope={scope} setScope={setScope} data={data} activeNote={activeNote} ariaLabel="Study scope" compact />
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
                            <div className="mt-0.5 text-xs text-ink-500">{option.kind === "folder" ? "Folder scope" : option.kind === "note" ? "Single note" : "Full vault"}</div>
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
  const [answer, setAnswer] = useState<AnswerResult | null>(null);
  const [busy, setBusy] = useState(false);
  async function ask() {
    if (!question.trim()) return;
    setBusy(true);
    setAnswer(null);
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, scope: apiScope(scope) })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Ask request failed");
      setAnswer(body as AnswerResult);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Ask request failed", "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-4">
      <ToolHeader title="Ask your notes" description="Answers are limited to indexed source excerpts." />
      <textarea
        value={question}
        onKeyDown={allowNativeTextShortcuts}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="Ask a question supported by your notes..."
        className="control-soft h-32 w-full resize-none rounded-xl p-3 text-sm leading-6 text-ink-100 outline-none placeholder:text-ink-500"
      />
      <button onClick={ask} disabled={busy || !question.trim()} className="primary-action w-full">
        {busy ? "Retrieving sources..." : "Answer from selected sources"}
      </button>
      {busy ? <SkeletonStack /> : null}
      {answer ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <MetricPill label="Sources" value={String(answer.citations.length)} />
            <MetricPill label="Scope" value={scopeLabel(scope)} />
            <MetricPill label="Mode" value={answer.unsupported ? "Related" : "Grounded"} />
          </div>
          <div
            className={`rounded-xl border p-4 text-sm leading-6 ${
              answer.unsupported ? "border-danger-400/30 bg-danger-400/10 text-ink-100" : "border-accent-500/20 bg-accent-500/10 text-ink-100"
            }`}
          >
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent-300">
              {answer.unsupported ? <AlertCircle className="h-4 w-4 text-danger-400" /> : <ShieldCheck className="h-4 w-4" />}
              Grounded answer
            </div>
            <div className="whitespace-pre-wrap">{answer.answer}</div>
          </div>
          {answer.unsupported && answer.citations.length > 0 ? (
            <div className="rounded-xl border border-accent-500/20 bg-accent-500/8 p-3">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-300">Closest related information</div>
              <div className="mt-1 text-xs leading-5 text-ink-400">
                The direct answer was not supported by your notes. These are the nearest indexed excerpts.
              </div>
            </div>
          ) : null}
          <SourceList sources={answer.citations} onOpenNote={onOpenNote} />
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
      title="Quiz mode"
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
          {!busy && !currentItem ? <EmptyToolState message="Generate one quiz question at a time from your indexed notes." /> : null}
          {currentItem ? (
            <div className="study-card">
              <div className="mb-3 flex items-center justify-between text-xs text-ink-500">
                <span>Question</span>
                <span>{currentItem.source.noteTitle}</span>
              </div>
              <div className="text-sm font-medium leading-6 text-ink-100">{currentItem.question}</div>
              <textarea
                value={answers[currentIndex] ?? ""}
                onKeyDown={allowNativeTextShortcuts}
                onChange={(event) => setAnswers((current) => ({ ...current, [currentIndex]: event.target.value }))}
                placeholder="Type your answer from memory..."
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
                  className="rounded-xl border border-ink-700 bg-ink-950/40 px-4 py-2 text-sm font-semibold text-ink-200 hover:border-accent-500/30 hover:bg-accent-500/10 hover:text-white disabled:opacity-60"
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
  const [open, setOpen] = useState<Record<number, boolean>>({});
  function handleItems(next: Flashcard[]) {
    setItems(next.slice(0, 1));
    setOpen({});
  }
  const currentIndex = 0;
  const currentItem = items[0];
  return (
    <StudyList
      title="Flashcards"
      description="Recall the answer mentally, then reveal the source-backed version."
      label="Generate flashcard"
      mode="flashcards"
      scope={localScope}
      controls={<StudyScopePicker scope={localScope} setScope={setLocalScope} data={data} activeNote={activeNote} label="Flashcard source" />}
      notify={notify}
      onResult={handleItems}
      render={(busy, rerun) => (
        <div className="space-y-3">
          {busy ? <SkeletonStack /> : null}
          {!busy && !currentItem ? <EmptyToolState message="Generate one flashcard at a time from your indexed notes." /> : null}
          {currentItem ? (
            <div className="study-card">
              <div className="mb-3 flex items-center justify-between text-xs text-ink-500">
                <span>Flashcard</span>
                <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-amber-400">Review</span>
              </div>
              <div className="text-sm font-medium leading-6 text-ink-100">{currentItem.prompt}</div>
              <button onClick={() => setOpen({ ...open, [currentIndex]: !open[currentIndex] })} className="mt-5 text-xs font-semibold text-accent-300">
                {open[currentIndex] ? "Hide answer" : "Reveal answer"}
              </button>
              <div className={`grid transition-all duration-300 ease-premium ${open[currentIndex] ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                <div className="overflow-hidden">
                  <div className="mt-3 rounded-lg border border-success-400/25 bg-success-400/10 p-3 text-sm leading-6 text-ink-200">{currentItem.answer}</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void rerun()}
                  disabled={busy}
                  className="rounded-xl border border-ink-700 bg-ink-950/40 px-4 py-2 text-sm font-semibold text-ink-200 hover:border-accent-500/30 hover:bg-accent-500/10 hover:text-white disabled:opacity-60"
                >
                  New flashcard
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
      title="Extractive summary"
      description="Summary items are direct excerpts from selected notes."
      label="Extract source summary"
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
        {busy ? "Reading indexed notes..." : label}
      </button>
      {render(busy, run)}
    </div>
  );
}

function SourceList({
  sources,
  compact = false,
  empty = "No source excerpts found.",
  onOpenNote
}: {
  sources: Array<{ chunkId: string; noteId?: string; noteTitle: string; excerpt: string; similarity: number }>;
  compact?: boolean;
  empty?: string;
  onOpenNote?: (source: SourceRef) => void;
}) {
  if (!sources.length) return <div className="surface-soft rounded-xl px-3 py-4 text-sm text-ink-500">{empty}</div>;
  return (
    <div className={`space-y-2.5 ${compact ? "mt-3" : ""}`}>
      {sources.map((source, index) => (
        <details key={`${source.chunkId}-${index}`} className="group rounded-xl border border-ink-700/80 bg-ink-850/80 p-3 open:shadow-glow" open={!compact}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold text-accent-300">{source.noteTitle}</div>
              <div className="mt-1 text-[11px] text-ink-500">{sourceContextLabel(source, index)}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-ink-700 bg-ink-950/40 px-2 py-0.5 text-[11px] text-ink-300">
                {Math.round(source.similarity * 100)}%
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-ink-500 transition-transform group-open:rotate-180" />
            </div>
          </summary>
          <blockquote className="mt-3 border-l-2 border-accent-400/70 pl-3 text-xs leading-5 text-ink-300">{cleanSourceExcerpt(source.excerpt)}</blockquote>
          <div className="mt-3 flex flex-wrap gap-2">
            {source.noteId && onOpenNote ? (
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
      className={`group flex items-center rounded-lg border ${
        active ? "border-accent-500/25 bg-accent-500/10" : dragActive ? "border-transparent hover:border-accent-500/30 hover:bg-accent-500/8" : "border-transparent hover:bg-white/[0.04]"
      }`}
    >
      <button onClick={onToggle} aria-label={collapsed ? "Expand folder" : "Collapse folder"} className="grid h-9 w-8 place-items-center text-ink-500 hover:text-ink-100">
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      <button onClick={onClick} onDoubleClick={onRename} className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left text-sm text-ink-200">
        {collapsed ? <Folder className="h-4 w-4 text-blue-400" /> : <FolderOpen className="h-4 w-4 text-blue-400" />}
        <span className="truncate">{folder.name}</span>
      </button>
      <span className="px-2 text-xs text-ink-500">{count}</span>
      <button onClick={onCreate} aria-label={`New note in ${folder.name}`} className="grid h-8 w-8 place-items-center text-ink-500 opacity-0 hover:text-accent-300 group-hover:opacity-100">
        <FilePlus className="h-3.5 w-3.5" />
      </button>
      <button onClick={onCreateFolder} aria-label={`New folder in ${folder.name}`} className="grid h-8 w-8 place-items-center text-ink-500 opacity-0 hover:text-accent-300 group-hover:opacity-100">
        <FolderPlus className="h-3.5 w-3.5" />
      </button>
      <button onClick={onRename} aria-label={`Rename ${folder.name}`} className="grid h-8 w-8 place-items-center text-ink-500 opacity-0 hover:text-accent-300 group-hover:opacity-100">
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button onClick={onDelete} aria-label={`Delete ${folder.name}`} className="grid h-8 w-8 place-items-center text-ink-500 opacity-0 hover:text-danger-400 group-hover:opacity-100">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <button onClick={onMove} aria-label={`Move ${folder.name}`} className="hidden" />
      <button onClick={onReindex} aria-label={`Reindex ${folder.name}`} className="hidden" />
      <button onClick={onCreateLecture} aria-label={`New lecture in ${folder.name}`} className="hidden" />
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
  );
}

function NoteRow({
  note,
  active,
  pinned,
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
      draggable
      onDragStart={onDragStart}
      onContextMenu={onMenu}
      className={`group flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition-all duration-200 ease-premium ${
        active ? "border-accent-500/30 bg-accent-500/10 text-white shadow-glow" : "border-transparent text-ink-300 hover:bg-white/[0.04] hover:text-ink-100"
      }`}
    >
      <button onClick={onClick} onDoubleClick={onRename} className="flex min-w-0 flex-1 items-start gap-2 text-left">
        {pinned ? <Pin className="mt-0.5 h-4 w-4 shrink-0 text-accent-300" /> : <FileText className={`mt-0.5 h-4 w-4 shrink-0 ${active ? "text-accent-300" : "text-ink-500 group-hover:text-ink-300"}`} />}
        <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{note.title}</span>
        <span className="mt-1 block truncate text-xs text-ink-500">{new Date(note.updatedAt).toLocaleDateString()}</span>
        </span>
      </button>
      <button onClick={onTogglePin} aria-label={pinned ? `Unpin ${note.title}` : `Pin ${note.title}`} className="grid h-7 w-7 shrink-0 place-items-center text-ink-500 opacity-0 hover:text-accent-300 group-hover:opacity-100">
        {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
      </button>
      <button onClick={onRename} aria-label={`Rename ${note.title}`} className="grid h-7 w-7 shrink-0 place-items-center text-ink-500 opacity-0 hover:text-accent-300 group-hover:opacity-100">
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button onClick={onDelete} aria-label={`Delete ${note.title}`} className="grid h-7 w-7 shrink-0 place-items-center text-ink-500 opacity-0 hover:text-danger-400 group-hover:opacity-100">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <button onClick={onMove} aria-label={`Move ${note.title}`} className="hidden" />
      <button onClick={onReindex} aria-label={`Reindex ${note.title}`} className="hidden" />
      <button
        onClick={(event) => {
          event.stopPropagation();
          onMenu(event);
        }}
        aria-label={`More actions for ${note.title}`}
        className="grid h-7 w-7 shrink-0 place-items-center text-ink-500 hover:text-ink-100"
      >
        <MoreVertical className="h-3.5 w-3.5" />
      </button>
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
  const itemClass = "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-ink-200 hover:bg-accent-500/12 hover:text-white";
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
            New lecture workspace
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
  if (!open) return null;
  const normalized = query.trim().toLowerCase();
  const filteredNotes = notes.filter((note) => !normalized || note.title.toLowerCase().includes(normalized)).slice(0, 8);
  const filteredFolders = folders.filter((folder) => !normalized || folder.name.toLowerCase().includes(normalized)).slice(0, 4);
  const actions = [
    { label: "Create note", run: onCreateNote },
    { label: "Create folder", run: onCreateFolder },
    { label: "Import document", run: onOpenImport },
    { label: "Open account", run: onOpenAccount },
    { label: "Reindex vault", run: () => void onReindex() }
  ].filter((item) => !normalized || item.label.toLowerCase().includes(normalized));

  return (
    <div className="fixed inset-0 z-[75] bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-auto mt-[10vh] w-full max-w-2xl rounded-2xl border border-ink-700 bg-ink-900 shadow-panel" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-ink-700/80 p-4">
          <input
            autoFocus
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Jump to a note or run a command..."
            className="w-full bg-transparent text-base text-ink-100 outline-none placeholder:text-ink-500"
          />
        </div>
        <div className="max-h-[65vh] overflow-auto p-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">Actions</div>
          <div className="space-y-2">
            {actions.map((action) => (
              <button key={action.label} onClick={action.run} className="flex w-full items-center justify-between rounded-xl border border-ink-700/80 px-3 py-3 text-left text-sm text-ink-200 hover:bg-white/[0.04]">
                <span>{action.label}</span>
                <span className="text-xs text-ink-500">Command</span>
              </button>
            ))}
          </div>
          <div className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">Notes</div>
          <div className="space-y-2">
            {filteredNotes.map((note) => (
              <button key={note.id} onClick={() => onOpenNote(note.id)} className="flex w-full items-center justify-between rounded-xl border border-ink-700/80 px-3 py-3 text-left text-sm text-ink-200 hover:bg-white/[0.04]">
                <span className="truncate">{note.title}</span>
                <span className="text-xs text-ink-500">Note</span>
              </button>
            ))}
          </div>
          {filteredFolders.length ? (
            <>
              <div className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">Folders</div>
              <div className="space-y-2">
                {filteredFolders.map((folder) => (
                  <div key={folder.id} className="rounded-xl border border-ink-700/80 px-3 py-3 text-sm text-ink-400">
                    {folderPath(folder.id, folders)}
                  </div>
                ))}
              </div>
            </>
          ) : null}
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
          <div className="mt-1 text-sm text-ink-500">Folders help group notes by class, lecture, or topic.</div>
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
            className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-400 disabled:opacity-60"
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
            className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-400 disabled:opacity-60"
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
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
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
          <button onClick={() => void handleSubmit()} disabled={busy} className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-400 disabled:opacity-60">
            {busy ? "Inserting..." : "Insert table"}
          </button>
        </div>
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
    <div className="rounded-lg border border-ink-700/80 bg-ink-950/35 px-2.5 py-2">
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
  onClick: () => void;
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
          : "border-ink-700/80 text-ink-300 hover:border-accent-500/30 hover:bg-white/[0.06] hover:text-white"
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
    <div className="surface-soft rounded-xl p-4 text-sm leading-6 text-ink-400">
      <div>{children}</div>
      <button onClick={onAction} className="mt-3 rounded-lg border border-accent-500/30 bg-accent-500/10 px-3 py-1.5 text-xs font-semibold text-accent-300 hover:bg-accent-500/20">
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

function cleanSourceExcerpt(excerpt: string) {
  return excerpt.replace(/^Note:\s*.*$/gim, "").replace(/^Section:\s*.*$/gim, "").trim();
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
