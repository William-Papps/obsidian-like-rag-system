"use client";

import { markdown } from "@codemirror/lang-markdown";
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
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  LayoutPanelLeft,
  Layers3,
  Loader2,
  MessageSquareText,
  MoreVertical,
  PanelRight,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2
} from "lucide-react";
import { type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { MarkdownPreview } from "@/components/markdown";
import type { AnswerResult, Flashcard, Folder as FolderType, Note, ProviderSettings, QuizQuestion } from "@/lib/types";

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

export function Workspace() {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [scope, setScope] = useState<Scope>({ type: "all" });
  const [tab, setTab] = useState<Tab>("ask");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [noteView, setNoteView] = useState<NoteView>("write");
  const [draftTitle, setDraftTitle] = useState("");
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<Toast | null>(null);
  const [vaultMenu, setVaultMenu] = useState<VaultMenu>(null);
  const [dragItem, setDragItem] = useState<DragItem>(null);

  const notify = useCallback((message: string, tone: Toast["tone"] = "info") => {
    const next = { id: Date.now(), tone, message };
    setToast(next);
    window.setTimeout(() => {
      setToast((current) => (current?.id === next.id ? null : current));
    }, 2600);
  }, []);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/bootstrap", { cache: "no-store" });
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

  const activeNote = useMemo(() => data?.notes.find((note) => note.id === activeNoteId) ?? null, [data, activeNoteId]);
  const openNoteFromSource = useCallback(
    (noteId: string) => {
      const note = data?.notes.find((item) => item.id === noteId);
      if (!note) {
        notify("Source note is no longer available", "error");
        return;
      }

      setActiveNoteId(noteId);
      setScope({ type: "note", noteId });
      notify(`Opened ${note.title}`, "info");
    },
    [data?.notes, notify]
  );
  const noteFolder = useMemo(
    () => data?.folders.find((folder) => folder.id === activeNote?.folderId)?.name ?? "No folder",
    [activeNote, data]
  );
  const workspaceGridStyle = useMemo<CSSProperties>(() => {
    const left = leftOpen ? "300px" : "0px";
    const right = rightOpen ? "410px" : "0px";
    return {
      gridTemplateColumns: `${left} minmax(0, 1fr) ${right}`
    };
  }, [leftOpen, rightOpen]);

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

  async function createNote(folderId: string | null = scope.type === "folder" ? scope.folderId : null) {
    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Untitled note", folderId })
    });
    const note = (await response.json()) as Note;
    await refresh();
    setActiveNoteId(note.id);
    notify("Note created", "success");
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

  async function createFolder() {
    const name = window.prompt("Folder or class name");
    if (!name) return;
    await fetch("/api/folders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name })
    });
    await refresh();
    notify("Folder created", "success");
  }

  async function renameFolderById(folder: FolderType) {
    const name = window.prompt("Rename folder", folder.name);
    if (!name?.trim()) return;
    await fetch(`/api/folders/${folder.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name })
    });
    await refresh();
    notify("Folder renamed", "success");
  }

  async function deleteFolderById(folder: FolderType) {
    const count = data?.notes.filter((note) => note.folderId === folder.id).length ?? 0;
    const detail = count ? ` ${count} note${count === 1 ? "" : "s"} will move to Unfiled notes.` : "";
    if (!window.confirm(`Delete folder "${folder.name}"?${detail}`)) return;
    await fetch(`/api/folders/${folder.id}`, { method: "DELETE" });
    if (scope.type === "folder" && scope.folderId === folder.id) setScope({ type: "all" });
    await refresh();
    notify("Folder deleted", "info");
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

  async function chooseFolderForNote(note: Note) {
    const target = chooseFolderTarget(data?.folders ?? [], note.folderId);
    if (target.cancelled) return;
    await moveNoteToFolder(note, target.folderId);
  }

  async function chooseFolderForFolder(folder: FolderType) {
    const target = chooseFolderTarget(
      (data?.folders ?? []).filter((item) => item.id !== folder.id),
      folder.parentId
    );
    if (target.cancelled) return;
    await moveFolderById(folder, target.folderId);
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

  async function renameNoteById(note: Note) {
    const title = window.prompt("Rename note", note.title);
    if (!title?.trim()) return;
    await updateNote(note.id, { title });
    if (activeNoteId === note.id) setDraftTitle(title);
    notify("Note renamed", "success");
  }

  async function deleteNoteById(note: Note) {
    if (!window.confirm(`Delete "${note.title}"?`)) return;
    await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
    await refresh();
    if (activeNoteId === note.id) setActiveNoteId(data?.notes.find((item) => item.id !== note.id)?.id ?? null);
    notify("Note deleted", "info");
  }

  async function deleteActiveNote() {
    if (!activeNote) return;
    await deleteNoteById(activeNote);
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
          onRename={() => renameFolderById(folder)}
          onDelete={() => deleteFolderById(folder)}
          onMove={() => chooseFolderForFolder(folder)}
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
                onClick={() => {
                  setActiveNoteId(note.id);
                  setScope({ type: "note", noteId: note.id });
                }}
                onRename={() => renameNoteById(note)}
                onDelete={() => deleteNoteById(note)}
                onMove={() => chooseFolderForNote(note)}
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
        onSettings={() => setSettingsOpen(true)}
        onFind={() => setTab("find")}
        onReindexed={refresh}
        notify={notify}
      />
      <div className="grid h-[calc(100vh-61px)] overflow-hidden transition-[grid-template-columns] duration-300 ease-premium" style={workspaceGridStyle}>
        <aside className={`panel-shell min-h-0 overflow-hidden border-r transition-opacity duration-200 ${leftOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}>
          <div className="flex h-16 items-center justify-between border-b border-ink-700/80 px-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-300/75">Vault</div>
              <div className="mt-0.5 flex items-center gap-2 text-sm font-semibold text-ink-100">
                <BookOpen className="h-4 w-4 text-accent-400" />
                Study Graph
              </div>
            </div>
            <div className="flex gap-1.5">
              <IconButton label="New folder" onClick={createFolder}>
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
                <EmptyState action="Create folder" onAction={createFolder}>
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
                      onClick={() => {
                        setActiveNoteId(note.id);
                        setScope({ type: "note", noteId: note.id });
                      }}
                      onRename={() => renameNoteById(note)}
                      onDelete={() => deleteNoteById(note)}
                      onMove={() => chooseFolderForNote(note)}
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
        </aside>

        <section className="grid min-h-0 min-w-0 grid-rows-[auto_45px_minmax(0,1fr)] overflow-hidden bg-ink-925">
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
              <NoteViewTabs value={noteView} onChange={setNoteView} />
              <div className={`min-h-0 min-w-0 ${noteView === "split" ? "grid grid-cols-2" : "grid grid-cols-1"}`}>
                {(noteView === "write" || noteView === "split") ? (
                <div className={`min-h-0 min-w-0 bg-ink-900/50 ${noteView === "split" ? "border-r border-ink-700/80" : ""}`}>
                  <CodeMirror
                    value={activeNote.markdownContent}
                    extensions={[markdown()]}
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
            <div className="row-span-3 grid h-full place-items-center p-8">
              <EmptyState action="Create note" onAction={() => createNote()}>
                Create a Markdown note, then reindex it for source-grounded study tools.
              </EmptyState>
            </div>
          )}
        </section>

        <div className={`min-w-0 overflow-hidden transition-opacity duration-200 ${rightOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}>
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
      {settingsOpen ? <SettingsModal settings={data.settings} onClose={() => setSettingsOpen(false)} onSaved={refresh} notify={notify} /> : null}
      <VaultContextMenu
        menu={vaultMenu}
        folders={data.folders}
        notes={data.notes}
        onClose={() => setVaultMenu(null)}
        onNewNote={(folderId) => createNote(folderId)}
        onMoveFolder={chooseFolderForFolder}
        onRenameFolder={renameFolderById}
        onDeleteFolder={deleteFolderById}
        onMoveNote={chooseFolderForNote}
        onRenameNote={renameNoteById}
        onDeleteNote={deleteNoteById}
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
  notify: (message: string, tone?: Toast["tone"]) => void;
}) {
  const [busy, setBusy] = useState(false);
  async function reindex() {
    setBusy(true);
    try {
      await fetch("/api/index", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      notify("Index refreshed", "success");
      onReindexed();
    } catch {
      notify("Indexing failed", "error");
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
          <div className="truncate text-sm font-semibold text-ink-100">StudyOS Vault</div>
          <div className="truncate text-xs text-ink-500">Purple workspace / {data.user.email}</div>
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
        <IconButton label="Settings" onClick={onSettings}>
          <Settings className="h-4 w-4" />
        </IconButton>
        <IconButton label={rightOpen ? "Hide study panel" : "Show study panel"} onClick={onToggleRight}>
          {rightOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
        </IconButton>
      </div>
    </header>
  );
}

function NoteViewTabs({ value, onChange }: { value: NoteView; onChange: (value: NoteView) => void }) {
  const tabs: Array<{ id: NoteView; label: string }> = [
    { id: "write", label: "Write" },
    { id: "preview", label: "Preview" },
    { id: "split", label: "Split" }
  ];

  return (
    <div className="flex min-w-0 items-end justify-between gap-3 overflow-hidden border-b border-ink-700/80 bg-ink-950/45 px-5">
      <div className="flex h-full items-end gap-1">
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
      <div className="hidden truncate pb-2 text-xs text-ink-500 2xl:block">Markdown / rendered views</div>
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
  onOpenNote: (noteId: string) => void;
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
      <div className="relative grid min-w-0 grid-cols-5 gap-1 overflow-hidden border-b border-ink-700/80 bg-ink-950/25 p-1.5">
        {tabs.map(([id, label, icon]) => (
          <button
            key={id}
            onClick={() => props.setTab(id)}
            className={`relative flex min-w-0 items-center justify-center gap-1 rounded-md px-1 text-xs font-medium transition-all duration-200 ease-premium ${
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
          {props.tab === "quiz" ? <QuizTool scope={props.scope} notify={props.notify} onOpenNote={props.onOpenNote} /> : null}
          {props.tab === "flashcards" ? <FlashcardTool scope={props.scope} notify={props.notify} onOpenNote={props.onOpenNote} /> : null}
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
  const value = scope.type === "all" ? "all" : scope.type === "note" ? `note:${scope.noteId}` : `folder:${scope.folderId ?? ""}`;
  return (
    <div className="relative shrink-0">
      <select
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          if (next === "all") setScope({ type: "all" });
          if (next.startsWith("note:")) setScope({ type: "note", noteId: next.slice(5) });
          if (next.startsWith("folder:")) setScope({ type: "folder", folderId: next.slice(7) || null });
        }}
        className="control-soft w-36 appearance-none rounded-lg py-2 pl-3 pr-8 text-xs text-ink-200 outline-none"
        aria-label="Study scope"
      >
        <option value="all">All notes</option>
        {activeNote ? <option value={`note:${activeNote.id}`}>Current note</option> : null}
        {data.folders.map((folder) => (
          <option key={folder.id} value={`folder:${folder.id}`}>
            {folder.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-ink-500" />
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
  onOpenNote: (noteId: string) => void;
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
      setAnswer(await response.json());
    } catch {
      notify("Ask request failed", "error");
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

function FindTool({ onOpenNote }: { onOpenNote: (noteId: string) => void }) {
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
      <SourceList sources={results.map((result) => ({ ...result, chunkId: result.noteId, similarity: 1 }))} empty="No exact matches yet." onOpenNote={onOpenNote} />
    </div>
  );
}

function QuizTool({
  scope,
  notify,
  onOpenNote
}: {
  scope: Scope;
  notify: (message: string, tone?: Toast["tone"]) => void;
  onOpenNote: (noteId: string) => void;
}) {
  const [items, setItems] = useState<QuizQuestion[]>([]);
  const [open, setOpen] = useState<Record<number, boolean>>({});
  return (
    <StudyList
      title="Quiz mode"
      description="Questions and answers are extracted from selected sources."
      label="Generate source quiz"
      mode="quiz"
      scope={scope}
      notify={notify}
      onResult={setItems}
      render={(busy) => (
        <div className="space-y-3">
          {busy ? <SkeletonStack /> : null}
          {items.map((item, index) => (
            <div key={index} className="study-card">
              <div className="mb-3 flex items-center justify-between text-xs text-ink-500">
                <span>Question {index + 1} of {items.length}</span>
                <span>{item.source.noteTitle}</span>
              </div>
              <div className="text-sm font-medium leading-6 text-ink-100">{item.question}</div>
              <button onClick={() => setOpen({ ...open, [index]: !open[index] })} className="mt-3 text-xs font-semibold text-accent-300">
                {open[index] ? "Hide source answer" : "Reveal source answer"}
              </button>
              <div className={`grid transition-all duration-300 ease-premium ${open[index] ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                <div className="overflow-hidden">
                  <div className="mt-3 rounded-lg border border-ink-700/80 bg-ink-950/40 p-3 text-sm leading-6 text-ink-300">{item.answer}</div>
                </div>
              </div>
              <SourceList sources={[item.source]} compact onOpenNote={onOpenNote} />
            </div>
          ))}
        </div>
      )}
    />
  );
}

function FlashcardTool({
  scope,
  notify,
  onOpenNote
}: {
  scope: Scope;
  notify: (message: string, tone?: Toast["tone"]) => void;
  onOpenNote: (noteId: string) => void;
}) {
  const [items, setItems] = useState<Flashcard[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [open, setOpen] = useState<Record<number, boolean>>({});
  return (
    <StudyList
      title="Flashcards"
      description="Type an answer, then reveal the source-backed version."
      label="Generate flashcards"
      mode="flashcards"
      scope={scope}
      notify={notify}
      onResult={setItems}
      render={(busy) => (
        <div className="space-y-3">
          {busy ? <SkeletonStack /> : null}
          {items.map((item, index) => (
            <div key={index} className="study-card">
              <div className="mb-3 flex items-center justify-between text-xs text-ink-500">
                <span>Card {index + 1} of {items.length}</span>
                <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-amber-400">Review</span>
              </div>
              <div className="text-sm font-medium leading-6 text-ink-100">{item.prompt}</div>
              <input
                value={answers[index] ?? ""}
                onKeyDown={allowNativeTextShortcuts}
                onChange={(event) => setAnswers({ ...answers, [index]: event.target.value })}
                placeholder="Type your answer..."
                className="control-soft mt-3 w-full rounded-lg px-3 py-2.5 text-sm outline-none placeholder:text-ink-500"
              />
              <button onClick={() => setOpen({ ...open, [index]: !open[index] })} className="mt-3 text-xs font-semibold text-accent-300">
                Reveal source answer
              </button>
              <div className={`grid transition-all duration-300 ease-premium ${open[index] ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                <div className="overflow-hidden">
                  <div className="mt-3 rounded-lg border border-success-400/25 bg-success-400/10 p-3 text-sm leading-6 text-ink-200">{item.answer}</div>
                </div>
              </div>
              <SourceList sources={[item.source]} compact onOpenNote={onOpenNote} />
            </div>
          ))}
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
  onOpenNote: (noteId: string) => void;
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
  render
}: {
  title: string;
  description: string;
  label: string;
  mode: "quiz" | "flashcards" | "summary";
  scope: Scope;
  notify: (message: string, tone?: Toast["tone"]) => void;
  onResult: (items: T[]) => void;
  render: (busy: boolean) => React.ReactNode;
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
      const items = (await response.json()) as T[];
      onResult(items);
      notify(`${items.length} source item${items.length === 1 ? "" : "s"} generated`, "success");
    } catch {
      notify("Study generation failed", "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-4">
      <ToolHeader title={title} description={description} />
      <button onClick={run} disabled={busy} className="primary-action w-full">
        {busy ? "Reading indexed notes..." : label}
      </button>
      {render(busy)}
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
  onOpenNote?: (noteId: string) => void;
}) {
  if (!sources.length) return <div className="surface-soft rounded-xl px-3 py-4 text-sm text-ink-500">{empty}</div>;
  return (
    <div className={`space-y-2.5 ${compact ? "mt-3" : ""}`}>
      {sources.map((source, index) => (
        <details key={`${source.chunkId}-${index}`} className="group rounded-xl border border-ink-700/80 bg-ink-850/80 p-3 open:shadow-glow" open={!compact}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold text-accent-300">{source.noteTitle}</div>
              <div className="mt-1 text-[11px] text-ink-500">Source excerpt {index + 1}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-ink-700 bg-ink-950/40 px-2 py-0.5 text-[11px] text-ink-300">
                {Math.round(source.similarity * 100)}%
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-ink-500 transition-transform group-open:rotate-180" />
            </div>
          </summary>
          <blockquote className="mt-3 border-l-2 border-accent-400/70 pl-3 text-xs leading-5 text-ink-300">{source.excerpt}</blockquote>
          {source.noteId && onOpenNote ? (
            <button
              type="button"
              onClick={() => onOpenNote(source.noteId!)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-950/40 px-2.5 py-1.5 text-xs font-medium text-ink-200 transition-colors hover:border-accent-500/40 hover:bg-accent-500/10 hover:text-accent-200 focus:outline-none focus:ring-2 focus:ring-accent-400/40"
            >
              <FileText className="h-3.5 w-3.5" />
              Open note
            </button>
          ) : null}
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
  onRename,
  onDelete,
  onMove,
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
  onRename: () => void;
  onDelete: () => void;
  onMove: () => void;
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
      <button onClick={onRename} aria-label={`Rename ${folder.name}`} className="grid h-8 w-8 place-items-center text-ink-500 opacity-0 hover:text-accent-300 group-hover:opacity-100">
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button onClick={onDelete} aria-label={`Delete ${folder.name}`} className="grid h-8 w-8 place-items-center text-ink-500 opacity-0 hover:text-danger-400 group-hover:opacity-100">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <button onClick={onMove} aria-label={`Move ${folder.name}`} className="hidden" />
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
  onClick,
  onRename,
  onDelete,
  onMove,
  onDragStart,
  onMenu
}: {
  note: Note;
  active: boolean;
  onClick: () => void;
  onRename: () => void;
  onDelete: () => void;
  onMove: () => void;
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
        <FileText className={`mt-0.5 h-4 w-4 shrink-0 ${active ? "text-accent-300" : "text-ink-500 group-hover:text-ink-300"}`} />
        <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{note.title}</span>
        <span className="mt-1 block truncate text-xs text-ink-500">{new Date(note.updatedAt).toLocaleDateString()}</span>
        </span>
      </button>
      <button onClick={onRename} aria-label={`Rename ${note.title}`} className="grid h-7 w-7 shrink-0 place-items-center text-ink-500 opacity-0 hover:text-accent-300 group-hover:opacity-100">
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button onClick={onDelete} aria-label={`Delete ${note.title}`} className="grid h-7 w-7 shrink-0 place-items-center text-ink-500 opacity-0 hover:text-danger-400 group-hover:opacity-100">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <button onClick={onMove} aria-label={`Move ${note.title}`} className="hidden" />
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
  onMoveFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveNote,
  onRenameNote,
  onDeleteNote
}: {
  menu: VaultMenu;
  folders: FolderType[];
  notes: Note[];
  onClose: () => void;
  onNewNote: (folderId: string | null) => void;
  onMoveFolder: (folder: FolderType) => void;
  onRenameFolder: (folder: FolderType) => void;
  onDeleteFolder: (folder: FolderType) => void;
  onMoveNote: (note: Note) => void;
  onRenameNote: (note: Note) => void;
  onDeleteNote: (note: Note) => void;
}) {
  if (!menu) return null;
  const folder = menu.kind === "folder" ? folders.find((item) => item.id === menu.id) : null;
  const note = menu.kind === "note" ? notes.find((item) => item.id === menu.id) : null;
  if (!folder && !note) return null;

  const viewportWidth = typeof window === "undefined" ? 1200 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 800 : window.innerHeight;
  const left = Math.max(8, Math.min(menu.x, viewportWidth - 230));
  const top = Math.max(8, Math.min(menu.y, viewportHeight - 190));
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

function SettingsModal({
  settings,
  onClose,
  onSaved,
  notify
}: {
  settings: ProviderSettings;
  onClose: () => void;
  onSaved: () => void;
  notify: (message: string, tone?: Toast["tone"]) => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [projectId, setProjectId] = useState(settings.projectId ?? "");
  const [embeddingModel, setEmbeddingModel] = useState(settings.embeddingModel);
  const [answerModel, setAnswerModel] = useState(settings.answerModel);
  async function save() {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ apiKey, projectId, embeddingModel, answerModel })
    });
    await onSaved();
    notify("Settings saved", "success");
    onClose();
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-xl border border-ink-700 bg-ink-900 p-5 shadow-panel">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-ink-100">Settings</div>
            <div className="mt-1 text-sm text-ink-500">Provider config stays local and masked in the interface.</div>
          </div>
          <button onClick={onClose} className="control-soft rounded-lg px-3 py-1.5 text-sm text-ink-300">
            Close
          </button>
        </div>
        <div className="space-y-4">
          <Field label={`OpenAI API key${settings.maskedKey ? ` (${settings.maskedKey})` : ""}`}>
            <input
              value={apiKey}
              onKeyDown={allowNativeTextShortcuts}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="sk-..."
              type="password"
              className="control-soft w-full rounded-lg px-3 py-2.5 text-sm outline-none"
            />
          </Field>
          <Field label="OpenAI project ID">
            <input
              value={projectId}
              onKeyDown={allowNativeTextShortcuts}
              onChange={(event) => setProjectId(event.target.value)}
              placeholder="Optional"
              className="control-soft w-full rounded-lg px-3 py-2.5 text-sm outline-none"
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Embedding model">
              <input
                value={embeddingModel}
                onKeyDown={allowNativeTextShortcuts}
                onChange={(event) => setEmbeddingModel(event.target.value)}
                className="control-soft w-full rounded-lg px-3 py-2.5 text-sm outline-none"
              />
            </Field>
            <Field label="Answer model">
              <input
                value={answerModel}
                onKeyDown={allowNativeTextShortcuts}
                onChange={(event) => setAnswerModel(event.target.value)}
                className="control-soft w-full rounded-lg px-3 py-2.5 text-sm outline-none"
              />
            </Field>
          </div>
          <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs leading-5 text-amber-400">
            MVP local storage writes the key to an ignored file under data/secrets. Hosted deployment should replace this with encrypted per-user secret storage and real authentication.
          </div>
          <button onClick={save} className="primary-action w-full">
            Save settings
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-400">{label}</span>
      {children}
    </label>
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

function chooseFolderTarget(folders: FolderType[], currentFolderId: string | null | undefined) {
  const options = folders.filter((folder) => folder.id !== currentFolderId);
  const list = ["0. Vault root / Unfiled", ...options.map((folder, index) => `${index + 1}. ${folder.name}`)].join("\n");
  const choice = window.prompt(`Move to:\n\n${list}\n\nEnter a number`, "0");
  if (choice === null) return { cancelled: true as const, folderId: null };
  const index = Number.parseInt(choice, 10);
  if (Number.isNaN(index) || index < 0 || index > options.length) return { cancelled: true as const, folderId: null };
  return { cancelled: false as const, folderId: index === 0 ? null : options[index - 1].id };
}

function apiScope(scope: Scope) {
  if (scope.type === "note") return { noteId: scope.noteId };
  if (scope.type === "folder") return { folderId: scope.folderId };
  return {};
}
