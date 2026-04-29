export async function register() {
  if (process.env.NODE_ENV !== "production") return;

  const weak = ["change-me-for-production", "change-me-too", "studyos-dev-session-secret", "eternalnotes-dev-secret"];

  const sessionSecret = process.env.AUTH_SESSION_SECRET?.trim() || "";
  if (!sessionSecret || weak.includes(sessionSecret)) {
    throw new Error(
      "[EternalNotes] AUTH_SESSION_SECRET is not set or is a default value. " +
        "Set a strong random secret in .env.local before running in production."
    );
  }

  const apiKeySecret = process.env.PERSONAL_API_KEY_SECRET?.trim() || "";
  if (!apiKeySecret || weak.includes(apiKeySecret)) {
    throw new Error(
      "[EternalNotes] PERSONAL_API_KEY_SECRET is not set or is a default value. " +
        "Set a strong random secret in .env.local before running in production."
    );
  }
}
