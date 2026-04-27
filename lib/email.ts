import { now } from "@/lib/utils";

const VERIFICATION_TTL_MINUTES = 15;

export async function sendVerificationEmail(input: {
  email: string;
  name: string;
  code: string;
}): Promise<{ debugCode?: string | null }> {
  const subject = "Verify your EternalNotes account";
  const expiresLabel = `${VERIFICATION_TTL_MINUTES} minutes`;
  const text = [
    `Hi ${input.name || "there"},`,
    "",
    `Your EternalNotes verification code is: ${input.code}`,
    "",
    `This code expires in ${expiresLabel}.`,
    "",
    `If you did not request this, you can ignore this email.`,
    "",
    `Sent ${now()}`
  ].join("\n");

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; background:#0e1116; color:#f4f7fb; padding:24px;">
      <div style="max-width:560px; margin:0 auto; border:1px solid #2a3342; background:#141922; border-radius:16px; padding:24px;">
        <div style="font-size:12px; letter-spacing:0.14em; text-transform:uppercase; color:#a78bfa; font-weight:700;">EternalNotes</div>
        <h1 style="margin:12px 0 8px; font-size:24px; line-height:1.2;">Verify your account</h1>
        <p style="margin:0 0 20px; color:#aab4c3; line-height:1.6;">Use this verification code to finish creating your EternalNotes account. The code expires in ${expiresLabel}.</p>
        <div style="font-size:32px; font-weight:700; letter-spacing:0.18em; padding:16px 20px; border-radius:12px; background:#191f2a; border:1px solid #2a3342; text-align:center;">${input.code}</div>
        <p style="margin:20px 0 0; color:#748094; line-height:1.6;">If you did not request this, you can ignore this email.</p>
      </div>
    </div>
  `;

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const emailFrom = process.env.EMAIL_FROM?.trim();
  if (resendKey && emailFrom) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: emailFrom,
        to: input.email,
        reply_to: process.env.EMAIL_REPLY_TO?.trim() || undefined,
        subject,
        text,
        html
      })
    });

    if (!response.ok) {
      const payload = await response.text();
      throw new Error(`Verification email failed: ${payload || response.statusText}`);
    }
    return { debugCode: null };
  }

  const devMode = (process.env.EMAIL_VERIFICATION_DEV_MODE ?? (process.env.NODE_ENV !== "production" ? "true" : "false")).toLowerCase() === "true";
  if (devMode) {
    return { debugCode: input.code };
  }

  throw new Error("Email delivery is not configured. Set RESEND_API_KEY and EMAIL_FROM, or enable EMAIL_VERIFICATION_DEV_MODE for local testing.");
}

export function verificationTtlMinutes() {
  return VERIFICATION_TTL_MINUTES;
}
