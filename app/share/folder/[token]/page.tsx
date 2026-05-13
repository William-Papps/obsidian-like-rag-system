"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, FileText, Folder, FolderOpen } from "lucide-react";
import { MarkdownPreview } from "@/components/markdown";

type FolderNode = { id: string; name: string; parentId: string | null };
type NoteItem = { id: string; title: string; markdownContent: string; folderId: string | null; updatedAt: string };
type ShareData = { folderName: string; folderId: string; folders: FolderNode[]; notes: NoteItem[] };

function FolderTree({
  parentId,
  folders,
  notes,
  selectedNoteId,
  collapsed,
  onSelectNote,
  onToggleFolder,
  depth
}: {
  parentId: string | null;
  folders: FolderNode[];
  notes: NoteItem[];
  selectedNoteId: string | null;
  collapsed: Record<string, boolean>;
  onSelectNote: (id: string) => void;
  onToggleFolder: (id: string) => void;
  depth: number;
}) {
  const subFolders = folders.filter((f) => f.parentId === parentId);
  const subNotes = notes.filter((n) => n.folderId === parentId);

  return (
    <>
      {subFolders.map((folder) => {
        const isCollapsed = collapsed[folder.id] ?? false;
        return (
          <div key={folder.id} style={{ paddingLeft: depth * 12 }}>
            <button
              onClick={() => onToggleFolder(folder.id)}
              className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm text-ink-200 hover:bg-graphite-rail/30"
            >
              {isCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-500" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-500" />
              )}
              {isCollapsed ? (
                <Folder className="h-3.5 w-3.5 shrink-0 text-accent-400/70" />
              ) : (
                <FolderOpen className="h-3.5 w-3.5 shrink-0 text-accent-400/70" />
              )}
              <span className="truncate">{folder.name}</span>
            </button>
            {!isCollapsed && (
              <FolderTree
                parentId={folder.id}
                folders={folders}
                notes={notes}
                selectedNoteId={selectedNoteId}
                collapsed={collapsed}
                onSelectNote={onSelectNote}
                onToggleFolder={onToggleFolder}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
      {subNotes.map((note) => (
        <button
          key={note.id}
          onClick={() => onSelectNote(note.id)}
          style={{ paddingLeft: depth * 12 }}
          className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-graphite-rail/30 ${
            note.id === selectedNoteId ? "bg-accent-500/10 text-accent-200" : "text-ink-300"
          }`}
        >
          <FileText className="h-3.5 w-3.5 shrink-0 text-ink-500" />
          <span className="truncate">{note.title}</span>
        </button>
      ))}
    </>
  );
}

export default function PublicFolderSharePage({ params }: { params: Promise<{ token: string }> }) {
  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setToken(p.token));
  }, [params]);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/public/folder/${token}`)
      .then(async (r) => {
        if (!r.ok) { setError("This folder is not available or the link has expired."); return; }
        const d = await r.json() as ShareData;
        setData(d);
        if (d.notes.length > 0) setSelectedNoteId(d.notes[0].id);
      })
      .catch(() => setError("Failed to load folder."));
  }, [token]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950 text-ink-400">
        <div className="text-center">
          <div className="mb-2 text-4xl">🔒</div>
          <div className="text-lg font-semibold text-ink-200">Not available</div>
          <div className="mt-1 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950 text-ink-500 text-sm">
        Loading…
      </div>
    );
  }

  const selectedNote = data.notes.find((n) => n.id === selectedNoteId) ?? null;

  function toggleFolder(id: string) {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="flex h-screen bg-ink-950 text-ink-100">
      {/* Sidebar */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-graphite-rail">
        <div className="border-b border-graphite-rail px-4 py-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">Shared Folder</div>
          <div className="mt-1 truncate text-sm font-semibold text-ink-100">{data.folderName}</div>
          <div className="mt-0.5 text-xs text-ink-500">{data.notes.length} {data.notes.length === 1 ? "note" : "notes"}</div>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          <FolderTree
            parentId={data.folderId}
            folders={data.folders.filter((f) => f.id !== data.folderId)}
            notes={data.notes}
            selectedNoteId={selectedNoteId}
            collapsed={collapsed}
            onSelectNote={setSelectedNoteId}
            onToggleFolder={toggleFolder}
            depth={0}
          />
        </nav>
      </aside>

      {/* Main */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {selectedNote ? (
          <>
            <header className="border-b border-graphite-rail px-6 py-4">
              <h1 className="text-xl font-bold text-ink-100">{selectedNote.title}</h1>
              <p className="mt-1 text-xs text-ink-500">
                Last updated {new Date(selectedNote.updatedAt).toLocaleDateString()}
              </p>
            </header>
            <div className="flex-1 overflow-auto">
              <div className="mx-auto max-w-3xl">
                <MarkdownPreview markdown={selectedNote.markdownContent} />
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-ink-500">
            Select a note from the sidebar
          </div>
        )}
      </main>
    </div>
  );
}
