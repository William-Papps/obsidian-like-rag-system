export async function register() {
  if (process.env.NODE_ENV !== "production") return;

  const weak = ["change-me-for-production", "change-me-too", "studyos-dev-session-secret", "eternalnotes-dev-secret"];

  const randomHex = (bytes = 32) => {
    const buf = new Uint8Array(bytes);
    // Works in both Node and Edge runtimes (Web Crypto).
    globalThis.crypto.getRandomValues(buf);
    return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
  };

  const sessionSecret = process.env.AUTH_SESSION_SECRET?.trim() || "";
  if (!sessionSecret || weak.includes(sessionSecret)) {
    // Don't hard-crash the entire server in production: generate an ephemeral secret so the app can boot.
    // This keeps the project usable even if a deploy forgot env vars, at the cost of invalidating all
    // sessions on restart. For real hosting, set a stable secret in the environment.
    process.env.AUTH_SESSION_SECRET = randomHex(32);
    // eslint-disable-next-line no-console
    console.error(
      "[EternalNotes] AUTH_SESSION_SECRET is missing/weak. Generated an ephemeral secret for this process. " +
        "Set a stable random value in .env.local / server environment to avoid forced logouts on restart."
    );
  }

  const apiKeySecret = process.env.PERSONAL_API_KEY_SECRET?.trim() || "";
  if (!apiKeySecret || weak.includes(apiKeySecret)) {
    process.env.PERSONAL_API_KEY_SECRET = randomHex(32);
    // eslint-disable-next-line no-console
    console.error(
      "[EternalNotes] PERSONAL_API_KEY_SECRET is missing/weak. Generated an ephemeral secret for this process. " +
        "Set a stable random value in .env.local / server environment to avoid invalidating stored secrets on restart."
    );
  }

  const hostedKey = process.env.HOSTED_OPENAI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim() || "";
  // settings.ts normalizes SK-/Sk-/sK- → sk- at runtime, so only flag keys that won't be fixed.
  if (hostedKey && !/^[Ss][Kk]-/.test(hostedKey)) {
    // eslint-disable-next-line no-console
    console.error(
      "[EternalNotes] Hosted OpenAI key does not look like an API key (expected to start with sk-). " +
        "Ask/Index requests will fail until HOSTED_OPENAI_API_KEY (or OPENAI_API_KEY) is corrected."
    );
  }
}
