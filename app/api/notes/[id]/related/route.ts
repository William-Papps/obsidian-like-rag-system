import { NextResponse } from "next/server";
import { withAuthenticatedUser } from "@/lib/auth";
import { dbAll } from "@/lib/db";
import { cosine } from "@/lib/rag/embeddings";

export const dynamic = "force-dynamic";

type ChunkRow = {
  note_id: string;
  title: string;
  vector_blob: Buffer | null;
  vector_json: string | null;
};

function decodeVector(row: Pick<ChunkRow, "vector_blob" | "vector_json">): number[] {
  if (row.vector_blob) {
    const buf = Buffer.isBuffer(row.vector_blob) ? row.vector_blob : Buffer.from(row.vector_blob as unknown as ArrayBuffer);
    return Array.from(new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4));
  }
  try { return JSON.parse(row.vector_json ?? "[]"); } catch { return []; }
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuthenticatedUser(async (user) => {
    const { id } = await params;

    const targetChunks = await dbAll<ChunkRow>(
      "select note_id, '' as title, vector_blob, vector_json from chunks where user_id = ? and note_id = ? and embedded = 1",
      [user.id, id]
    );

    if (targetChunks.length === 0) return NextResponse.json([]);

    const targetVectors = targetChunks.map(decodeVector).filter((v) => v.length > 0);
    if (targetVectors.length === 0) return NextResponse.json([]);

    // Average all chunk vectors to get a note-level representation
    const dim = targetVectors[0].length;
    const avgVector = new Array<number>(dim).fill(0);
    for (const vec of targetVectors) {
      for (let i = 0; i < dim; i++) avgVector[i] += vec[i] / targetVectors.length;
    }

    const otherChunks = await dbAll<ChunkRow>(
      `select c.note_id, n.title, c.vector_blob, c.vector_json
       from chunks c join notes n on n.id = c.note_id
       where c.user_id = ? and c.note_id != ? and c.embedded = 1`,
      [user.id, id]
    );

    // Per-note: keep highest chunk similarity score
    const noteScores = new Map<string, { title: string; score: number }>();
    for (const chunk of otherChunks) {
      const vec = decodeVector(chunk);
      if (vec.length !== dim) continue;
      const score = cosine(avgVector, vec);
      const prev = noteScores.get(chunk.note_id);
      if (!prev || score > prev.score) noteScores.set(chunk.note_id, { title: chunk.title, score });
    }

    const related = [...noteScores.entries()]
      .map(([noteId, { title, score }]) => ({ noteId, title, score }))
      .filter((r) => r.score > 0.25)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return NextResponse.json(related);
  });
}
