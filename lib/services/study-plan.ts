import { dbAll } from "@/lib/db";
import { listDueCards } from "@/lib/services/flashcards";
import { getWeakAreas, getRecentlyStudiedNoteIds } from "@/lib/services/learning-analytics";

export type PlanItemType = "flashcard" | "quiz" | "review";
export type PlanItemSource = "due" | "weak_area" | "fresh_chunk" | "recent_note";

export type StudyPlanItem = {
  type: PlanItemType;
  source: PlanItemSource;
  cardId?: string;
  noteId: string | null;
  chunkId?: string | null;
  title: string;
  reason: string;
};

export async function buildStudyPlan(userId: string): Promise<StudyPlanItem[]> {
  const items: StudyPlanItem[] = [];

  // 1. Up to 3 due flashcards.
  const dueCards = await listDueCards(userId);
  for (const card of dueCards.slice(0, 3)) {
    const noteTitle = card.noteId
      ? (await dbAll<{ title: string }>("select title from notes where id = ? and user_id = ?", [card.noteId, userId]))[0]?.title ?? "Unknown note"
      : "Saved card";
    items.push({
      type: "flashcard",
      source: "due",
      cardId: card.id,
      noteId: card.noteId,
      title: noteTitle,
      reason: `Due for review (reviewed ${card.reviewCount} time${card.reviewCount !== 1 ? "s" : ""})`
    });
  }

  // 2. Up to 3 weak-area quiz items.
  const weakAreas = await getWeakAreas(userId, { limit: 5 });
  for (const area of weakAreas.slice(0, 3)) {
    if (items.some((i) => i.noteId === area.noteId && i.type === "quiz")) continue;
    items.push({
      type: "quiz",
      source: "weak_area",
      noteId: area.noteId,
      chunkId: area.chunkId,
      title: area.noteTitle,
      reason: area.reason + ` (avg ${Math.round(area.avgScore * 100)}% over ${area.attempts} attempt${area.attempts !== 1 ? "s" : ""})`
    });
  }

  // 3. Up to 2 fresh chunks (chunks from notes never or rarely studied).
  const recentNoteIds = await getRecentlyStudiedNoteIds(userId, 48);
  const freshRows = await dbAll<{ note_id: string; note_title: string; chunk_id: string }>(
    `select c.note_id, n.title as note_title, c.id as chunk_id
     from chunks c
     join notes n on n.id = c.note_id and n.user_id = c.user_id
     where c.user_id = ?
     order by c.created_at asc
     limit 50`,
    [userId]
  );
  let freshAdded = 0;
  for (const row of freshRows) {
    if (freshAdded >= 2) break;
    if (recentNoteIds.has(row.note_id)) continue;
    if (items.some((i) => i.noteId === row.note_id)) continue;
    items.push({
      type: "review",
      source: "fresh_chunk",
      noteId: row.note_id,
      chunkId: row.chunk_id,
      title: row.note_title,
      reason: "New material not reviewed recently"
    });
    freshAdded++;
  }

  // 4. Up to 2 recent notes to keep current content fresh.
  const recentNotes = await dbAll<{ id: string; title: string }>(
    "select id, title from notes where user_id = ? order by updated_at desc limit 10",
    [userId]
  );
  let recentAdded = 0;
  for (const note of recentNotes) {
    if (recentAdded >= 2) break;
    if (items.some((i) => i.noteId === note.id)) continue;
    items.push({
      type: "review",
      source: "recent_note",
      noteId: note.id,
      title: note.title,
      reason: "Recently updated note"
    });
    recentAdded++;
  }

  return items.slice(0, 10);
}
