import OpenAI from "openai";
import { getProviderSettings, readUserApiKey } from "@/lib/services/settings";

export type QuizEvaluation = {
  correct: boolean;
  verdict: "correct" | "partial" | "incorrect";
  feedback: string;
};

export async function evaluateQuizAnswer(
  userId: string,
  input: { question: string; userAnswer: string; expectedAnswer: string; sourceExcerpt: string }
): Promise<QuizEvaluation> {
  const trimmedAnswer = input.userAnswer.trim();
  if (!trimmedAnswer) {
    return {
      correct: false,
      verdict: "incorrect",
      feedback: "No answer entered yet."
    };
  }

  const apiKey = readUserApiKey(userId);
  if (!apiKey) return evaluateHeuristically(trimmedAnswer, input.expectedAnswer, input.question);

  const settings = await getProviderSettings(userId);
  const client = new OpenAI({ apiKey, project: settings.projectId || undefined });
  const response = await client.chat.completions.create({
    model: settings.answerModel,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Judge whether the user's quiz answer correctly answers the quiz question using the expected answer and source excerpt from the notes. Only use the provided question, expected answer, and source excerpt. Accept equivalent wording if it means the same thing. Do not require unrelated extra details from the source excerpt if the user directly answered the question. Return JSON with keys correct (boolean), verdict ('correct'|'partial'|'incorrect'), and feedback (short string)."
      },
      {
        role: "user",
        content: JSON.stringify({
          question: input.question,
          expectedAnswer: input.expectedAnswer,
          sourceExcerpt: input.sourceExcerpt,
          userAnswer: trimmedAnswer
        })
      }
    ]
  });

  const raw = response.choices[0]?.message.content?.trim();
  if (!raw) return evaluateHeuristically(trimmedAnswer, input.expectedAnswer, input.question);

  try {
    const parsed = JSON.parse(raw) as Partial<QuizEvaluation>;
    return {
      correct: Boolean(parsed.correct),
      verdict: parsed.verdict === "correct" || parsed.verdict === "partial" ? parsed.verdict : "incorrect",
      feedback: typeof parsed.feedback === "string" && parsed.feedback.trim() ? parsed.feedback.trim() : defaultFeedback(Boolean(parsed.correct))
    };
  } catch {
    return evaluateHeuristically(trimmedAnswer, input.expectedAnswer, input.question);
  }
}

function evaluateHeuristically(userAnswer: string, expectedAnswer: string, question: string): QuizEvaluation {
  const expectedTerms = tokenize(expectedAnswer);
  const answerTerms = tokenize(userAnswer);
  const questionTerms = tokenize(question);
  const overlap = expectedTerms.filter((term) => answerTerms.includes(term));
  const ratio = expectedTerms.length ? overlap.length / expectedTerms.length : 0;
  const keyExpectedTerms = expectedTerms.filter((term) => !questionTerms.includes(term));
  const keyOverlap = keyExpectedTerms.filter((term) => answerTerms.includes(term));
  const keyRatio = keyExpectedTerms.length ? keyOverlap.length / keyExpectedTerms.length : ratio;

  if (ratio >= 0.72 || keyRatio >= 0.72 || normalized(userAnswer) === normalized(expectedAnswer)) {
    return { correct: true, verdict: "correct", feedback: "Matches the source meaning." };
  }
  if (ratio >= 0.4 || keyRatio >= 0.4) {
    return { correct: false, verdict: "partial", feedback: "Partly right, but you missed some source details." };
  }
  if (normalized(question).includes("primary function") && keyExpectedTerms.length && keyRatio >= 0.5) {
    return { correct: true, verdict: "correct", feedback: "Answers the function asked in the question." };
  }
  return { correct: false, verdict: "incorrect", feedback: "Does not match the source answer closely enough." };
}

function tokenize(value: string) {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((term) => term.length > 2)
    )
  );
}

function normalized(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function defaultFeedback(correct: boolean) {
  return correct ? "Matches the source meaning." : "Does not match the source answer closely enough.";
}
