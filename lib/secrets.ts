import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const PREFIX = "enc:v1";

export function encryptSecret(plaintext: string) {
  const key = secretKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":");
}

export function decryptSecret(payload: string) {
  if (!payload.startsWith(`${PREFIX}:`)) return payload;
  const [, , ivRaw, tagRaw, dataRaw] = payload.split(":");
  const decipher = createDecipheriv("aes-256-gcm", secretKey(), Buffer.from(ivRaw, "base64"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataRaw, "base64")), decipher.final()]).toString("utf8");
}

function secretKey() {
  const source = process.env.PERSONAL_API_KEY_SECRET?.trim() || process.env.AUTH_SESSION_SECRET || "eternalnotes-dev-secret";
  return createHash("sha256").update(source).digest();
}
