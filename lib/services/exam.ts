import { dbAll, dbGet, dbRun } from "@/lib/db";
import { generateQuiz } from "@/lib/rag/study";
import { evaluateQuizAnswer } from "@/lib/rag/evaluate";
import { resolveAiContext } from "@/lib/services/ai-access";
import { recordStudyAttempt } from "@/lib/services/learning-analytics";
import { id, now } from "@/lib/utils";
import OpenAI from "openai";

export type ExamScope = { noteId?: string; folderId?: string | null };

export type ExamSession = {
  id: string;
  userId: string;
  scopeLabel: string | null;
  status: "active" | "finished";
  startedAt: string;
  finishedAt: string | null;
  durationSeconds: number | null;
  score: number | null;
  totalQuestions: number;
  correctCount: number;
};

export type ExamQuestion = {
  id: string;
  sessionId: string;
  noteId: string | null;
  chunkId: string | null;
  noteTitle: string | null;
  question: string;
  // expected_answer is NEVER sent to the client during the exam
  userAnswer: string | null;
  score: number | null;
  result: string | null;
  confidence: number | null;
  answeredAt: string | null;
};

export type ExamQuestionForClient = Omit<ExamQuestion, never> & { index: number; total: number };

type ExamQuestionRow = {
  id: string;
  session_id: string;
  note_id: string | null;
  chunk_id: string | null;
  note_title: string | null;
  question: string;
  expected_answer: string;
  user_answer: string | null;
  score: number | null;
  result: string | null;
  confidence: number | null;
  answered_at: string | null;
};

function rowToQuestion(row: ExamQuestionRow): ExamQuestion {
  return {
    id: row.id,
    sessionId: row.session_id,
    noteId: row.note_id,
    chunkId: row.chunk_id,
    noteTitle: row.note_title,
    question: row.question,
    userAnswer: row.user_answer,
    score: row.score,
    result: row.result,
    confidence: row.confidence,
    answeredAt: row.answered_at
  };
}

export async function startExam(
  userId: string,
  scope: ExamScope,
  scopeLabel: string,
  questionCount = 5
): Promise<{ session: ExamSession; firstQuestion: ExamQuestionForClient }> {
  const sessionId = id();

  await dbRun(
    `insert into exam_sessions (id, user_id, scope_label, scope_json, status, started_at, total_questions)
     values (?, ?, ?, ?, 'active', ?, ?)`,
    [sessionId, userId, scopeLabel, JSON.stringify(scope), now(), questionCount]
  );

  // Generate questions using existing quiz logic, one at a time to get diverse chunks.
  const questions: { question: string; answer: string; noteId: string; chunkId: string; noteTitle: string }[] = [];
  const usedChunks = new Set<string>();

  for (let attempt = 0; attempt < questionCount * 3 && questions.length < questionCount; attempt++) {
    const quiz = await generateQuiz(userId, scope);
    if (!quiz[0]) continue;
    const src = quiz[0].source;
    if (usedChunks.has(src.chunkId)) continue;
    usedChunks.add(src.chunkId);
    questions.push({
      question: quiz[0].question,
      answer: quiz[0].answer,
      noteId: src.noteId,
      chunkId: src.chunkId,
      noteTitle: src.noteTitle
    });
  }

  if (questions.length === 0) {
    await dbRun("delete from exam_sessions where id = ?", [sessionId]);
    throw new Error("Not enough indexed content to generate exam questions. Index some notes first.");
  }

  // Store all questions server-side; expected_answer is never sent to client.
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    await dbRun(
      `insert into exam_questions
         (id, session_id, note_id, chunk_id, note_title, question, expected_answer)
       values (?, ?, ?, ?, ?, ?, ?)`,
      [id(), sessionId, q.noteId, q.chunkId, q.noteTitle, q.question, q.answer]
    );
  }

  // Update actual question count in case we generated fewer than requested.
  await dbRun("update exam_sessions set total_questions = ? where id = ?", [questions.length, sessionId]);

  const firstRow = await dbGet<ExamQuestionRow>(
    "select * from exam_questions where session_id = ? order by rowid asc limit 1",
    [sessionId]
  );

  const session = await getSession(userId, sessionId);
  return {
    session: session!,
    firstQuestion: { ...rowToQuestion(firstRow!), index: 1, total: questions.length }
  };
}

export async function answerQuestion(
  userId: string,
  sessionId: string,
  questionId: string,
  userAnswer: string,
  confidence: number
): Promise<{ result: string; score: number; nextQuestion: ExamQuestionForClient | null }> {
  const session = await getSession(userId, sessionId);
  if (!session) throw new Error("Session not found.");
  if (session.status !== "active") throw new Error("This exam session is already finished.");

  const row = await dbGet<ExamQuestionRow>(
    "select * from exam_questions where id = ? and session_id = ?",
    [questionId, sessionId]
  );
  if (!row) throw new Error("Question not found.");
  if (row.user_answer !== null) throw new Error("Question already answered.");

  const evaluation = await evaluateQuizAnswer(userId, {
    question: row.question,
    userAnswer,
    expectedAnswer: row.expected_answer,
    sourceExcerpt: row.expected_answer
  });

  const scoreMap = { correct: 1.0, partial: 0.5, incorrect: 0.0 } as const;
  const score = scoreMap[evaluation.verdict];

  await dbRun(
    "update exam_questions set user_answer = ?, score = ?, result = ?, confidence = ?, answered_at = ? where id = ?",
    [userAnswer, score, evaluation.verdict, confidence, now(), questionId]
  );

  // Find next unanswered question.
  const allRows = await dbAll<ExamQuestionRow>(
    "select * from exam_questions where session_id = ? order by rowid asc",
    [sessionId]
  );
  const currentIndex = allRows.findIndex((r) => r.id === questionId);
  const nextRow = allRows.slice(currentIndex + 1).find((r) => r.user_answer === null) ?? null;
  const nextIndex = nextRow ? allRows.indexOf(nextRow) + 1 : null;

  return {
    result: evaluation.verdict,
    score,
    nextQuestion: nextRow ? { ...rowToQuestion(nextRow), index: nextIndex!, total: allRows.length } : null
  };
}

export async function finishExam(
  userId: string,
  sessionId: string
): Promise<{ session: ExamSession; review: ExamReviewItem[] }> {
  const session = await getSession(userId, sessionId);
  if (!session) throw new Error("Session not found.");
  if (session.status !== "active") throw new Error("Session already finished.");

  const rows = await dbAll<ExamQuestionRow>(
    "select * from exam_questions where session_id = ? order by rowid asc",
    [sessionId]
  );

  const answered = rows.filter((r) => r.user_answer !== null);
  const correctCount = answered.filter((r) => r.result === "correct").length;
  const totalAnswered = answered.length;
  const overallScore = totalAnswered > 0 ? answered.reduce((s, r) => s + (r.score ?? 0), 0) / totalAnswered : 0;
  const durationSeconds = Math.round((Date.now() - new Date(session.startedAt).getTime()) / 1000);

  await dbRun(
    `update exam_sessions
     set status = 'finished', finished_at = ?, duration_seconds = ?, score = ?, correct_count = ?
     where id = ?`,
    [now(), durationSeconds, overallScore, correctCount, sessionId]
  );

  // Record each answered question as a study_attempt.
  for (const row of answered) {
    await recordStudyAttempt(userId, {
      mode: "exam",
      noteId: row.note_id,
      chunkId: row.chunk_id,
      prompt: row.question,
      expectedAnswer: row.expected_answer,
      userAnswer: row.user_answer,
      score: row.score,
      result: (row.result as "correct" | "partial" | "incorrect") ?? "incorrect",
      confidence: row.confidence
    });
  }

  // Build review — now it's safe to include expected answers.
  const ai = await resolveAiContext(userId, "ask").catch(() => null);
  const review: ExamReviewItem[] = await Promise.all(
    rows.map(async (row) => {
      const advice = await generateAdvice(ai, row);
      return {
        questionId: row.id,
        question: row.question,
        userAnswer: row.user_answer ?? "(no answer)",
        expectedAnswer: row.expected_answer,
        score: row.score ?? 0,
        result: row.result ?? "skipped",
        confidence: row.confidence,
        noteTitle: row.note_title,
        advice
      };
    })
  );

  const finishedSession = await getSession(userId, sessionId);
  return { session: finishedSession!, review };
}

export type ExamReviewItem = {
  questionId: string;
  question: string;
  userAnswer: string;
  expectedAnswer: string;
  score: number;
  result: string;
  confidence: number | null;
  noteTitle: string | null;
  advice: string;
};

async function generateAdvice(
  ai: Awaited<ReturnType<typeof resolveAiContext>> | null,
  row: ExamQuestionRow
): Promise<string> {
  if (!ai?.apiKey || row.result === "correct") {
    if (row.result === "correct") return "Well done — your answer matched the key concept.";
    return "Review the source note section and try to recall the key term or definition.";
  }
  try {
    const client = new OpenAI({ apiKey: ai.apiKey });
    const response = await client.chat.completions.create({
      model: ai.settings.answerModel,
      temperature: 0.2,
      max_tokens: 80,
      messages: [
        {
          role: "system",
          content:
            "You give one short study-improvement tip (1–2 sentences) based on a wrong or partial quiz answer. " +
            "Reference only the expected answer given. Do not give away the full answer. Do not write essays."
        },
        {
          role: "user",
          content: `Question: ${row.question}\nExpected answer: ${row.expected_answer}\nStudent answered: ${row.user_answer ?? "(skipped)"}\nVerdict: ${row.result}`
        }
      ]
    });
    return response.choices[0]?.message.content?.trim() || "Review your notes on this topic.";
  } catch {
    return "Review the source note section for this topic.";
  }
}

async function getSession(userId: string, sessionId: string): Promise<ExamSession | null> {
  const row = await dbGet<{
    id: string; user_id: string; scope_label: string | null; status: string;
    started_at: string; finished_at: string | null; duration_seconds: number | null;
    score: number | null; total_questions: number; correct_count: number;
  }>("select * from exam_sessions where id = ? and user_id = ?", [sessionId, userId]);
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    scopeLabel: row.scope_label,
    status: row.status as "active" | "finished",
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    durationSeconds: row.duration_seconds,
    score: row.score,
    totalQuestions: row.total_questions,
    correctCount: row.correct_count
  };
}
