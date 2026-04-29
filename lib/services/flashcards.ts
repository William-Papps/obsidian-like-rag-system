import { dbAll, dbGet, dbRun } from "@/lib/db";
import { id, now, toCamelRecord } from "@/lib/utils";

export type SavedCard = {
  id: string;
  userId: string;
  noteId: string | null;
  prompt: string;
  answer: string;
  sourceExcerpt: string;
  nextReviewAt: string | null;
  intervalDays: number;
  easeFactor: number;
  reviewCount: number;
  lastReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function saveFlashcard(
  userId: string,
  card: { noteId: string | null; prompt: string; answer: string; sourceExcerpt: string }
): Promise<SavedCard> {
  const cardId = id();
  const created = now();
  await dbRun(
    "insert into flashcards (id, user_id, note_id, prompt, answer, source_excerpt, next_review_at, interval_days, ease_factor, review_count, last_reviewed_at, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [cardId, userId, card.noteId, card.prompt, card.answer, card.sourceExcerpt, created, 1, 2.5, 0, null, created, created]
  );
  return (await dbGet<Record<string, unknown>>("select * from flashcards where id = ?", [cardId]))
    ? (toCamelRecord((await dbGet("select * from flashcards where id = ?", [cardId]))!) as SavedCard)
    : ({} as SavedCard);
}

export async function listDueCards(userId: string): Promise<SavedCard[]> {
  const rows = await dbAll(
    `select * from flashcards
     where user_id = ? and (next_review_at is null or next_review_at <= ?)
     order by coalesce(next_review_at, '1970-01-01') asc
     limit 20`,
    [userId, now()]
  );
  return rows.map((row) => toCamelRecord(row) as SavedCard);
}

export async function listAllCards(userId: string): Promise<SavedCard[]> {
  const rows = await dbAll("select * from flashcards where user_id = ? order by created_at desc", [userId]);
  return rows.map((row) => toCamelRecord(row) as SavedCard);
}

export async function recordCardReview(userId: string, cardId: string, quality: 0 | 1 | 2 | 3 | 4 | 5): Promise<SavedCard | null> {
  const row = await dbGet<Record<string, unknown>>("select * from flashcards where id = ? and user_id = ?", [cardId, userId]);
  if (!row) return null;
  const card = toCamelRecord(row) as SavedCard;

  // SM-2 algorithm
  const newEase = Math.max(1.3, card.easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  let newInterval: number;
  if (quality < 3) {
    newInterval = 1; // reset on failure
  } else if (card.reviewCount === 0) {
    newInterval = 1;
  } else if (card.reviewCount === 1) {
    newInterval = 6;
  } else {
    newInterval = Math.round(card.intervalDays * newEase);
  }

  const nextReview = new Date(Date.now() + newInterval * 24 * 60 * 60 * 1000).toISOString();
  await dbRun(
    "update flashcards set next_review_at = ?, interval_days = ?, ease_factor = ?, review_count = review_count + 1, last_reviewed_at = ?, updated_at = ? where id = ?",
    [nextReview, newInterval, newEase, now(), now(), cardId]
  );

  const updated = await dbGet<Record<string, unknown>>("select * from flashcards where id = ?", [cardId]);
  return updated ? (toCamelRecord(updated) as SavedCard) : null;
}

export async function deleteFlashcard(userId: string, cardId: string) {
  await dbRun("delete from flashcards where id = ? and user_id = ?", [cardId, userId]);
}

export async function getDeckStats(userId: string) {
  const due = await dbGet<{ count: number }>(
    "select count(*) as count from flashcards where user_id = ? and (next_review_at is null or next_review_at <= ?)",
    [userId, now()]
  );
  const total = await dbGet<{ count: number }>("select count(*) as count from flashcards where user_id = ?", [userId]);
  return { due: due?.count ?? 0, total: total?.count ?? 0 };
}
