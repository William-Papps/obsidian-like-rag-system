"use client";

import { markdown } from "@codemirror/lang-markdown";
import CodeMirror from "@uiw/react-codemirror";
import {
  BookOpen,
  Brain,
  Check,
  ChevronDown,
  FilePlus,
  FolderPlus,
  Layers3,
  Loader2,
  MessageSquareText,
  PanelRight,
  Search,
  Settings,
  Sparkles,
  Trash2
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MarkdownPreview } from "@/components/markdown";
import type { AnswerResult, Flashcard, Folder, Note, ProviderSettings, QuizQuestion } from "@/lib/types";

type Bootstrap = {
  user: { id: string; email: string; name: string };
  folders: Folder[];
  notes: Note[];
  settings: ProviderSettings;
  indexStatus: { notes: number; chunks: number; staleNotes: number };
};

type Scope = { type: "all" } | { type: "note"; noteId: string } | { type: "folder"; folderId: string | null };
type Tab = "ask" | "find" | "quiz" | "flashcards" | "summary";

export function Workspace() {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [scope, setScope] = useState<Scope>({ type: "all" });
  const [tab, setTab] = useState<Tab>("ask");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/bootstrap");
    const payload = (await response.json()) as Bootstrap;
    setData(payload);
    setActiveNoteId((current) => current || payload.notes[0]?.id || null);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const activeNote = useMemo(() => data?.notes.find((note) => note.id === activeNoteId) ?? null, [data, activeNoteId]);
  const visibleNotes = useMemo(() => {
    if (!data) return [];
    if (scope.type === "folder") return data.notes.filter((note) => note.folderId === scope.folderId);
    return data.notes;
  }, [data, scope]);

  async function createNote(folderId: string | null = scope.type === "folder" ? scope.folderId : null) {
    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Untitled note", folderId })
    });
    const note = (await response.json()) as Note;
    await refresh();
    setActiveNoteId(note.id);
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
  }

  async function deleteActiveNote() {
    if (!activeNote || !window.confirm(`Delete "${activeNote.title}"?`)) return;
    await fetch(`/api/notes/${activeNote.id}`, { method: "DELETE" });
    await refresh();
    setActiveNoteId(data?.notes.find((note) => note.id !== activeNote.id)?.id ?? null);
  }

  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center bg-ink-950 text-ink-100">
        <div className="flex items-center gap-3 text-sm text-ink-300">
          <Loader2 className="h-4 w-4 animate-spin text-accent-400" />
          Opening workspace
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen overflow-hidden bg-ink-950 text-ink-100">
      <TopBar data={data} onSettings={() => setSettingsOpen(true)} onReindexed={refresh} />
      <div className="grid h-[calc(100vh-57px)] grid-cols-[288px_minmax(420px,1fr)_390px]">
        <aside className="border-r border-white/10 bg-ink-900/92">
          <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-ink-500">Workspace</div>
              <div className="text-sm font-semibold text-ink-100">Study Vault</div>
            </div>
            <div className="flex gap-1">
              <IconButton label="New folder" onClick={createFolder}>
                <FolderPlus className="h-4 w-4" />
              </IconButton>
              <IconButton label="New note" onClick={() => createNote()}>
                <FilePlus className="h-4 w-4" />
              </IconButton>
            </div>
          </div>
          <div className="h-[calc(100%-56px)] overflow-auto px-3 py-4">
            <button
              onClick={() => setScope({ type: "all" })}
              className={`mb-3 flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${
                scope.type === "all" ? "bg-accent-500/15 text-accent-300" : "text-ink-300 hover:bg-white/5"
              }`}
            >
              <span className="flex items-center gap-2">
                <Layers3 className="h-4 w-4" />
                All notes
              </span>
              <span className="text-xs text-ink-500">{data.notes.length}</span>
            </button>
            <div className="space-y-1">
              {data.folders.map((folder) => (
                <FolderRow
                  key={folder.id}
                  folder={folder}
                  count={data.notes.filter((note) => note.folderId === folder.id).length}
                  active={scope.type === "folder" && scope.folderId === folder.id}
                  onClick={() => setScope({ type: "folder", folderId: folder.id })}
                  onCreate={() => createNote(folder.id)}
                  onRefresh={refresh}
                />
              ))}
            </div>
            <div className="mt-5 border-t border-white/10 pt-4">
              <div className="mb-2 px-2 text-xs uppercase tracking-[0.16em] text-ink-500">Notes</div>
              <div className="space-y-1">
                {visibleNotes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => {
                      setActiveNoteId(note.id);
                      setScope({ type: "note", noteId: note.id });
                    }}
                    className={`w-full rounded-md px-3 py-2 text-left ${
                      activeNoteId === note.id ? "bg-white/10 text-white" : "text-ink-300 hover:bg-white/5"
                    }`}
                  >
                    <div className="truncate text-sm font-medium">{note.title}</div>
                    <div className="mt-1 truncate text-xs text-ink-500">{new Date(note.updatedAt).toLocaleString()}</div>
                  </button>
                ))}
                {visibleNotes.length === 0 ? (
                  <div className="rounded-md border border-dashed border-white/12 px-3 py-5 text-sm text-ink-500">
                    No notes in this scope.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </aside>

        <section className="grid min-w-0 grid-rows-[56px_1fr] bg-ink-850">
          {activeNote ? (
            <>
              <div className="flex items-center gap-3 border-b border-white/10 px-5">
                <input
                  value={activeNote.title}
                  onChange={(event) => updateNote(activeNote.id, { title: event.target.value })}
                  className="min-w-0 flex-1 bg-transparent text-lg font-semibold text-white outline-none"
                />
                <select
                  value={activeNote.folderId ?? ""}
                  onChange={(event) => updateNote(activeNote.id, { folderId: event.target.value || null })}
                  className="rounded-md border border-white/10 bg-ink-900 px-2 py-1 text-xs text-ink-300 outline-none"
                >
                  <option value="">No folder</option>
                  {data.folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
                <span className="w-14 text-xs text-ink-500">{saving ? "Saving" : "Saved"}</span>
                <IconButton label="Delete note" onClick={deleteActiveNote}>
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>
              <div className="grid min-h-0 grid-cols-2">
                <div className="min-w-0 border-r border-white/10">
                  <CodeMirror
                    value={activeNote.markdownContent}
                    extensions={[markdown()]}
                    theme="dark"
                    basicSetup={{ foldGutter: false, highlightActiveLine: true }}
                    onChange={(value) => updateNote(activeNote.id, { markdownContent: value })}
                  />
                </div>
                <MarkdownPreview markdown={activeNote.markdownContent} />
              </div>
            </>
          ) : (
            <div className="grid h-full place-items-center text-ink-400">
              <button onClick={() => createNote()} className="rounded-md border border-white/10 px-4 py-2 hover:bg-white/5">
                Create your first note
              </button>
            </div>
          )}
        </section>

        <AssistantPanel
          tab={tab}
          setTab={setTab}
          scope={scope}
          setScope={setScope}
          data={data}
          activeNote={activeNote}
          onReindexed={refresh}
        />
      </div>
      {settingsOpen ? <SettingsModal settings={data.settings} onClose={() => setSettingsOpen(false)} onSaved={refresh} /> : null}
    </main>
  );
}

function TopBar({ data, onSettings, onReindexed }: { data: Bootstrap; onSettings: () => void; onReindexed: () => void }) {
  const [busy, setBusy] = useState(false);
  async function reindex() {
    setBusy(true);
    await fetch("/api/index", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    setBusy(false);
    onReindexed();
  }
  return (
    <header className="flex h-[57px] items-center justify-between border-b border-white/10 bg-ink-950/95 px-4">
      <div className="flex items-center gap-3">
        <div className="grid h-8 w-8 place-items-center rounded-md bg-accent-500/15 text-accent-300">
          <BookOpen className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold">StudyOS Notes</div>
          <div className="text-xs text-ink-500">{data.user.email}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-ink-300">
          {data.indexStatus.chunks} chunks · {data.indexStatus.staleNotes} stale
        </div>
        <button
          onClick={reindex}
          disabled={busy}
          className="flex items-center gap-2 rounded-md bg-accent-500 px-3 py-1.5 text-sm font-semibold text-ink-950 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Reindex
        </button>
        <IconButton label="Settings" onClick={onSettings}>
          <Settings className="h-4 w-4" />
        </IconButton>
      </div>
    </header>
  );
}

function AssistantPanel(props: {
  tab: Tab;
  setTab: (tab: Tab) => void;
  scope: Scope;
  setScope: (scope: Scope) => void;
  data: Bootstrap;
  activeNote: Note | null;
  onReindexed: () => void;
}) {
  const tabs: Array<[Tab, string, React.ReactNode]> = [
    ["ask", "Ask", <MessageSquareText className="h-4 w-4" key="ask" />],
    ["find", "Find", <Search className="h-4 w-4" key="find" />],
    ["quiz", "Quiz", <Check className="h-4 w-4" key="quiz" />],
    ["flashcards", "Cards", <Brain className="h-4 w-4" key="cards" />],
    ["summary", "Summary", <PanelRight className="h-4 w-4" key="summary" />]
  ];

  return (
    <aside className="grid min-h-0 grid-rows-[56px_48px_1fr] border-l border-white/10 bg-ink-900/96">
      <div className="flex items-center justify-between border-b border-white/10 px-4">
        <div>
          <div className="text-sm font-semibold">Study tools</div>
          <div className="text-xs text-ink-500">Grounded in indexed notes</div>
        </div>
        <ScopeSelect {...props} />
      </div>
      <div className="grid grid-cols-5 border-b border-white/10">
        {tabs.map(([id, label, icon]) => (
          <button
            key={id}
            onClick={() => props.setTab(id)}
            className={`flex items-center justify-center gap-1 text-xs ${
              props.tab === id ? "bg-white/8 text-accent-300" : "text-ink-400 hover:bg-white/5"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>
      <div className="min-h-0 overflow-auto p-4">
        {props.tab === "ask" ? <AskTool scope={props.scope} /> : null}
        {props.tab === "find" ? <FindTool /> : null}
        {props.tab === "quiz" ? <QuizTool scope={props.scope} /> : null}
        {props.tab === "flashcards" ? <FlashcardTool scope={props.scope} /> : null}
        {props.tab === "summary" ? <SummaryTool scope={props.scope} /> : null}
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
    <div className="relative">
      <select
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          if (next === "all") setScope({ type: "all" });
          if (next.startsWith("note:")) setScope({ type: "note", noteId: next.slice(5) });
          if (next.startsWith("folder:")) setScope({ type: "folder", folderId: next.slice(7) || null });
        }}
        className="w-36 appearance-none rounded-md border border-white/10 bg-ink-850 py-1.5 pl-2 pr-7 text-xs text-ink-200 outline-none"
      >
        <option value="all">All notes</option>
        {activeNote ? <option value={`note:${activeNote.id}`}>Current note</option> : null}
        {data.folders.map((folder) => (
          <option key={folder.id} value={`folder:${folder.id}`}>
            {folder.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-2 h-3.5 w-3.5 text-ink-500" />
    </div>
  );
}

function AskTool({ scope }: { scope: Scope }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AnswerResult | null>(null);
  const [busy, setBusy] = useState(false);
  async function ask() {
    if (!question.trim()) return;
    setBusy(true);
    const response = await fetch("/api/ask", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question, scope: apiScope(scope) })
    });
    setAnswer(await response.json());
    setBusy(false);
  }
  return (
    <div className="space-y-4">
      <textarea
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="Ask from your indexed notes..."
        className="h-28 w-full resize-none rounded-md border border-white/10 bg-ink-850 p-3 text-sm text-ink-100 outline-none placeholder:text-ink-500"
      />
      <button onClick={ask} disabled={busy} className="w-full rounded-md bg-accent-500 py-2 text-sm font-semibold text-ink-950">
        {busy ? "Retrieving..." : "Ask notes"}
      </button>
      {answer ? (
        <div className="space-y-3">
          <div className="whitespace-pre-wrap rounded-md border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-ink-100">
            {answer.answer}
          </div>
          <SourceList sources={answer.citations} />
        </div>
      ) : null}
    </div>
  );
}

function FindTool() {
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
    <div className="space-y-3">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Exact text search..."
        className="w-full rounded-md border border-white/10 bg-ink-850 px-3 py-2 text-sm outline-none placeholder:text-ink-500"
      />
      <SourceList sources={results.map((result) => ({ ...result, chunkId: result.noteId, similarity: 1 }))} />
    </div>
  );
}

function QuizTool({ scope }: { scope: Scope }) {
  const [items, setItems] = useState<QuizQuestion[]>([]);
  const [open, setOpen] = useState<Record<number, boolean>>({});
  return (
    <StudyList
      label="Generate quiz"
      mode="quiz"
      scope={scope}
      onResult={setItems}
      render={() => (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="rounded-md border border-white/10 bg-white/[0.03] p-3">
              <div className="text-sm font-medium text-ink-100">{item.question}</div>
              <button onClick={() => setOpen({ ...open, [index]: !open[index] })} className="mt-3 text-xs text-accent-300">
                {open[index] ? "Hide answer" : "Reveal answer"}
              </button>
              {open[index] ? <div className="mt-2 text-sm leading-6 text-ink-300">{item.answer}</div> : null}
              <SourceList sources={[item.source]} compact />
            </div>
          ))}
        </div>
      )}
    />
  );
}

function FlashcardTool({ scope }: { scope: Scope }) {
  const [items, setItems] = useState<Flashcard[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [open, setOpen] = useState<Record<number, boolean>>({});
  return (
    <StudyList
      label="Generate flashcards"
      mode="flashcards"
      scope={scope}
      onResult={setItems}
      render={() => (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="rounded-md border border-white/10 bg-white/[0.03] p-3">
              <div className="text-sm font-medium text-ink-100">{item.prompt}</div>
              <input
                value={answers[index] ?? ""}
                onChange={(event) => setAnswers({ ...answers, [index]: event.target.value })}
                placeholder="Type your answer..."
                className="mt-3 w-full rounded-md border border-white/10 bg-ink-850 px-3 py-2 text-sm outline-none"
              />
              <button onClick={() => setOpen({ ...open, [index]: !open[index] })} className="mt-3 text-xs text-accent-300">
                Reveal source answer
              </button>
              {open[index] ? <div className="mt-2 text-sm leading-6 text-ink-300">{item.answer}</div> : null}
              <SourceList sources={[item.source]} compact />
            </div>
          ))}
        </div>
      )}
    />
  );
}

function SummaryTool({ scope }: { scope: Scope }) {
  const [items, setItems] = useState<Array<{ id: string; label: string; text: string; source: AnswerResult["citations"][number] }>>([]);
  return (
    <StudyList
      label="Extract summary"
      mode="summary"
      scope={scope}
      onResult={setItems}
      render={() => (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-md border border-white/10 bg-white/[0.03] p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent-300">{item.label}</div>
              <div className="text-sm leading-6 text-ink-200">{item.text}</div>
              <SourceList sources={[item.source]} compact />
            </div>
          ))}
        </div>
      )}
    />
  );
}

function StudyList<T>({
  label,
  mode,
  scope,
  onResult,
  render
}: {
  label: string;
  mode: "quiz" | "flashcards" | "summary";
  scope: Scope;
  onResult: (items: T[]) => void;
  render: () => React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    const response = await fetch("/api/study", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode, scope: apiScope(scope) })
    });
    onResult(await response.json());
    setBusy(false);
  }
  return (
    <div className="space-y-4">
      <button onClick={run} disabled={busy} className="w-full rounded-md bg-accent-500 py-2 text-sm font-semibold text-ink-950">
        {busy ? "Reading indexed notes..." : label}
      </button>
      {render()}
    </div>
  );
}

function SourceList({
  sources,
  compact = false
}: {
  sources: Array<{ chunkId: string; noteTitle: string; excerpt: string; similarity: number }>;
  compact?: boolean;
}) {
  if (!sources.length) return <div className="text-sm text-ink-500">No source excerpts found.</div>;
  return (
    <div className={`space-y-2 ${compact ? "mt-3" : ""}`}>
      {sources.map((source, index) => (
        <div key={`${source.chunkId}-${index}`} className="rounded-md border border-white/10 bg-ink-850 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="truncate text-xs font-semibold text-accent-300">{source.noteTitle}</div>
            <div className="text-[11px] text-ink-500">{Math.round(source.similarity * 100)}%</div>
          </div>
          <div className="text-xs leading-5 text-ink-300">{source.excerpt}</div>
        </div>
      ))}
    </div>
  );
}

function FolderRow({
  folder,
  count,
  active,
  onClick,
  onCreate,
  onRefresh
}: {
  folder: Folder;
  count: number;
  active: boolean;
  onClick: () => void;
  onCreate: () => void;
  onRefresh: () => void;
}) {
  async function rename() {
    const name = window.prompt("Rename folder", folder.name);
    if (!name) return;
    await fetch(`/api/folders/${folder.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name })
    });
    onRefresh();
  }
  return (
    <div className={`group flex items-center rounded-md ${active ? "bg-accent-500/15" : "hover:bg-white/5"}`}>
      <button onClick={onClick} onDoubleClick={rename} className="min-w-0 flex-1 px-3 py-2 text-left text-sm text-ink-200">
        <span className="truncate">{folder.name}</span>
      </button>
      <span className="px-2 text-xs text-ink-500">{count}</span>
      <button onClick={onCreate} className="px-2 text-ink-500 opacity-0 group-hover:opacity-100">
        <FilePlus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function SettingsModal({
  settings,
  onClose,
  onSaved
}: {
  settings: ProviderSettings;
  onClose: () => void;
  onSaved: () => void;
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
    onClose();
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-lg border border-white/10 bg-ink-900 p-5 shadow-panel">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <div className="text-lg font-semibold">Settings</div>
            <div className="text-sm text-ink-500">Keys are masked in the UI and not returned by API routes.</div>
          </div>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-ink-400 hover:bg-white/5">
            Close
          </button>
        </div>
        <div className="space-y-4">
          <Field label={`OpenAI API key${settings.maskedKey ? ` (${settings.maskedKey})` : ""}`}>
            <input
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="sk-..."
              type="password"
              className="w-full rounded-md border border-white/10 bg-ink-850 px-3 py-2 text-sm outline-none"
            />
          </Field>
          <Field label="OpenAI project ID">
            <input
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              placeholder="Optional"
              className="w-full rounded-md border border-white/10 bg-ink-850 px-3 py-2 text-sm outline-none"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Embedding model">
              <input
                value={embeddingModel}
                onChange={(event) => setEmbeddingModel(event.target.value)}
                className="w-full rounded-md border border-white/10 bg-ink-850 px-3 py-2 text-sm outline-none"
              />
            </Field>
            <Field label="Answer model">
              <input
                value={answerModel}
                onChange={(event) => setAnswerModel(event.target.value)}
                className="w-full rounded-md border border-white/10 bg-ink-850 px-3 py-2 text-sm outline-none"
              />
            </Field>
          </div>
          <div className="rounded-md border border-amber-400/30 bg-amber-400/8 p-3 text-xs leading-5 text-amber-400">
            MVP local storage writes the key to an ignored file under data/secrets. Hosted deployment should replace this with
            encrypted per-user secret storage and real authentication.
          </div>
          <button onClick={save} className="w-full rounded-md bg-accent-500 py-2 text-sm font-semibold text-ink-950">
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

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-md border border-white/10 bg-white/[0.03] text-ink-300 hover:bg-white/8 hover:text-white"
    >
      {children}
    </button>
  );
}

function apiScope(scope: Scope) {
  if (scope.type === "note") return { noteId: scope.noteId };
  if (scope.type === "folder") return { folderId: scope.folderId };
  return {};
}
