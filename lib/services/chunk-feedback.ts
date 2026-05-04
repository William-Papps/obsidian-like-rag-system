import { dbAll, dbRun, type DbValue } from "@/lib/db";
import { id, now } from "@/lib/utils";

export type ChunkEventType =
  | "retrieved"
  | "used_in_answer"
  | "weak_retrieval"
  | "correct_attempt"
  | "incorrect_attempt";

export async function recordChunkEvent(
  userId: string,
  chunkId: string,
  noteId: string | null,
  eventType: ChunkEventType,
  score?: number
): Promise<void> {
  await dbRun(
    "insert into chunk_feedback (id, user_id, chunk_id, note_id, event_type, score, created_at) values (?, ?, ?, ?, ?, ?, ?)",
    [id(), userId, chunkId, noteId, eventType, score ?? null, now()]
  );
}

export async function recordChunkEvents(
  userId: string,
  events: Array<{ chunkId: string; noteId: string | null; eventType: ChunkEventType; score?: number }>
): Promise<void> {
  if (!events.length) return;
  const placeholders = events.map(() => "(?, ?, ?, ?, ?, ?, ?)").join(", ");
  const params: DbValue[] = [];
  for (const ev of events) {
    params.push(id(), userId, ev.chunkId, ev.noteId ?? null, ev.eventType, ev.score ?? null, now());
  }
  await dbRun(
    `insert into chunk_feedback (id, user_id, chunk_id, note_id, event_type, score, created_at) values ${placeholders}`,
    params
  );
}

// Returns a boost in [-0.05, +0.05] per chunk based on recent correct/incorrect attempts.
// Requires at least 3 attempts to apply a boost (avoid noise from small samples).
export async function getChunkBoostsForUser(userId: string): Promise<Map<string, number>> {
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const rows = await dbAll<{ chunk_id: string; correct: number; incorrect: number; total: number }>(
    `select
       chunk_id,
       sum(case when event_type = 'correct_attempt' then 1 else 0 end) as correct,
       sum(case when event_type = 'incorrect_attempt' then 1 else 0 end) as incorrect,
       count(*) as total
     from chunk_feedback
     where user_id = ?
       and event_type in ('correct_attempt', 'incorrect_attempt')
       and created_at > ?
     group by chunk_id
     having count(*) >= 3`,
    [userId, since]
  );

  const boosts = new Map<string, number>();
  for (const row of rows) {
    const successRate = row.correct / row.total;
    // Scale from [-0.05, +0.05]; cosine similarity remains dominant factor.
    boosts.set(row.chunk_id, Math.max(-0.05, Math.min(0.05, (successRate - 0.5) * 0.1)));
  }
  return boosts;
}

export async function getChunkFeedbackStats(
  userId: string,
  chunkIds: string[]
): Promise<Map<string, { events: number; weakCount: number; successRate: number }>> {
  if (!chunkIds.length) return new Map();
  const placeholders = chunkIds.map(() => "?").join(", ");
  const rows = await dbAll<{
    chunk_id: string;
    events: number;
    weak_count: number;
    correct: number;
    incorrect: number;
  }>(
    `select
       chunk_id,
       count(*) as events,
       sum(case when event_type = 'weak_retrieval' then 1 else 0 end) as weak_count,
       sum(case when event_type = 'correct_attempt' then 1 else 0 end) as correct,
       sum(case when event_type = 'incorrect_attempt' then 1 else 0 end) as incorrect
     from chunk_feedback
     where user_id = ? and chunk_id in (${placeholders})
     group by chunk_id`,
    [userId, ...chunkIds]
  );

  const result = new Map<string, { events: number; weakCount: number; successRate: number }>();
  for (const row of rows) {
    const attempts = row.correct + row.incorrect;
    result.set(row.chunk_id, {
      events: row.events,
      weakCount: row.weak_count,
      successRate: attempts > 0 ? row.correct / attempts : 0
    });
  }
  return result;
}
