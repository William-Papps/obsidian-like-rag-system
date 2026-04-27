import { dbAll, dbRun } from "@/lib/db";
import type { StudyActivity } from "@/lib/types";
import { id, now, toCamelRecord } from "@/lib/utils";

export async function recordStudyActivity(userId: string, kind: StudyActivity["kind"], input?: { scopeLabel?: string | null; noteTitle?: string | null }) {
  await dbRun("insert into study_activity (id, user_id, kind, scope_label, note_title, created_at) values (?, ?, ?, ?, ?, ?)", [
    id(),
    userId,
    kind,
    input?.scopeLabel ?? null,
    input?.noteTitle ?? null,
    now()
  ]);
}

export async function listStudyActivity(userId: string, limit = 20) {
  const rows = await dbAll("select * from study_activity where user_id = ? order by created_at desc limit ?", [userId, limit]);
  return rows.map((row) => toCamelRecord(row) as StudyActivity);
}
