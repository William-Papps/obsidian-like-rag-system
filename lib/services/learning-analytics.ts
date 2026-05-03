import { dbAll, dbGet, dbRun } from "@/lib/db";
import { id, now } from "@/lib/utils";

export type AttemptResult = "correct" | "partial" | "incorrect" | "skipped";
export type StudyMode = "quiz" | "flashcard" | "exam";

export type StudyAttempt = {
  id: string;
  userId: string;
  mode: StudyMode;
  noteId: string | null;
  chunkId: string | null;
  prompt: string | null;
  expectedAnswer: string | null;
  userAnswer: string | null;
  score: number | null;
  result: AttemptResult;
  confidence: number | null;
  createdAt: string;
};

export type WeakArea = {
  noteId: string;
  noteTitle: string;
  chunkId: string | null;
  chunkSnippet: string | null;
  attempts: number;
  avgScore: number;
  incorrectCount: number;
  partialCount: number;
  skippedCount: number;
  lastAttemptAt: string;
  reason: string;
};

export type PerformanceSummary = {
  totalAttempts: number;
  correctCount: number;
  partialCount: number;
  incorrectCount: number;
  avgScore: number;
  streakDays: number;
};

export async function recordStudyAttempt(
  userId: string,
  attempt: Omit<StudyAttempt, "id" | "userId" | "createdAt">
): Promise<string> {
  const attemptId = id();
  await dbRun(
    `insert into study_attempts
       (id, user_id, mode, note_id, chunk_id, prompt, expected_answer, user_answer, score, result, confidence, created_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      attemptId,
      userId,
      attempt.mode,
      attempt.noteId,
      attempt.chunkId,
      attempt.prompt,
      attempt.expectedAnswer,
      attempt.userAnswer,
      attempt.score,
      attempt.result,
      attempt.confidence,
      now()
    ]
  );
  return attemptId;
}

export async function getWeakAreas(
  userId: string,
  options: { limit?: number; minAttempts?: number } = {}
): Promise<WeakArea[]> {
  const limit = options.limit ?? 10;
  const minAttempts = options.minAttempts ?? 2;

  const rows = await dbAll<{
    note_id: string;
    note_title: string;
    chunk_id: string | null;
    chunk_snippet: string | null;
    attempts: number;
    avg_score: number;
    incorrect_count: number;
    partial_count: number;
    skipped_count: number;
    last_attempt_at: string;
  }>(
    `select
       sa.note_id,
       coalesce(n.title, 'Unknown note') as note_title,
       sa.chunk_id,
       substr(sa.prompt, 1, 80) as chunk_snippet,
       count(*) as attempts,
       coalesce(avg(sa.score), 0) as avg_score,
       sum(case when sa.result = 'incorrect' then 1 else 0 end) as incorrect_count,
       sum(case when sa.result = 'partial' then 1 else 0 end) as partial_count,
       sum(case when sa.result = 'skipped' then 1 else 0 end) as skipped_count,
       max(sa.created_at) as last_attempt_at
     from study_attempts sa
     left join notes n on n.id = sa.note_id and n.user_id = sa.user_id
     where sa.user_id = ? and sa.note_id is not null
     group by sa.note_id, sa.chunk_id
     having count(*) >= ? and coalesce(avg(sa.score), 0) < 0.75
     order by avg_score asc, last_attempt_at desc
     limit ?`,
    [userId, minAttempts, limit]
  );

  return rows.map((row) => {
    const avgScore = row.avg_score ?? 0;
    let reason = "Repeated errors";
    if (row.incorrect_count > row.partial_count) reason = "Frequently incorrect";
    else if (row.partial_count >= row.incorrect_count) reason = "Consistently partial credit";
    if (row.skipped_count > 0) reason += ` (${row.skipped_count} skipped)`;
    return {
      noteId: row.note_id,
      noteTitle: row.note_title,
      chunkId: row.chunk_id,
      chunkSnippet: row.chunk_snippet,
      attempts: row.attempts,
      avgScore,
      incorrectCount: row.incorrect_count,
      partialCount: row.partial_count,
      skippedCount: row.skipped_count,
      lastAttemptAt: row.last_attempt_at,
      reason
    };
  });
}

export async function getRecentPerformance(userId: string): Promise<PerformanceSummary> {
  const row = await dbGet<{
    total: number;
    correct: number;
    partial: number;
    incorrect: number;
    avg_score: number;
  }>(
    `select
       count(*) as total,
       sum(case when result = 'correct' then 1 else 0 end) as correct,
       sum(case when result = 'partial' then 1 else 0 end) as partial,
       sum(case when result = 'incorrect' then 1 else 0 end) as incorrect,
       coalesce(avg(score), 0) as avg_score
     from study_attempts
     where user_id = ? and created_at >= ?`,
    [userId, new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()]
  );

  const streakRow = await dbGet<{ streak: number }>(
    `with daily as (
       select date(created_at) as day
       from study_attempts
       where user_id = ?
       group by date(created_at)
     ),
     numbered as (
       select day, row_number() over (order by day desc) as rn
       from daily
     )
     select count(*) as streak
     from numbered
     where date(day, '+' || (rn - 1) || ' days') = date('now')`,
    [userId]
  );

  return {
    totalAttempts: row?.total ?? 0,
    correctCount: row?.correct ?? 0,
    partialCount: row?.partial ?? 0,
    incorrectCount: row?.incorrect ?? 0,
    avgScore: row?.avg_score ?? 0,
    streakDays: streakRow?.streak ?? 0
  };
}

export async function getTopicStats(userId: string) {
  const rows = await dbAll<{
    note_id: string;
    note_title: string;
    attempts: number;
    avg_score: number;
    last_attempt_at: string;
  }>(
    `select
       sa.note_id,
       coalesce(n.title, 'Unknown note') as note_title,
       count(*) as attempts,
       coalesce(avg(sa.score), 0) as avg_score,
       max(sa.created_at) as last_attempt_at
     from study_attempts sa
     left join notes n on n.id = sa.note_id and n.user_id = sa.user_id
     where sa.user_id = ? and sa.note_id is not null
     group by sa.note_id
     order by last_attempt_at desc
     limit 30`,
    [userId]
  );

  return rows.map((row) => ({
    noteId: row.note_id,
    noteTitle: row.note_title,
    attempts: row.attempts,
    avgScore: row.avg_score ?? 0,
    lastAttemptAt: row.last_attempt_at
  }));
}

export async function getRecentlyStudiedNoteIds(userId: string, withinHours = 48): Promise<Set<string>> {
  const cutoff = new Date(Date.now() - withinHours * 3600 * 1000).toISOString();
  const rows = await dbAll<{ note_id: string }>(
    "select distinct note_id from study_attempts where user_id = ? and note_id is not null and created_at > ?",
    [userId, cutoff]
  );
  return new Set(rows.map((r) => r.note_id));
}
