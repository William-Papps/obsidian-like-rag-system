import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service â€” EternalNotes",
  description: "Terms of Service for EternalNotes",
};

export default function TermsPage() {
  return (
    <article className="prose-legal">
      <h1>Terms of Service</h1>
      <p className="meta">Last updated: 11 May 2026</p>

      <p>
        These Terms of Service ("Terms") govern your use of EternalNotes ("the Service"), an
        AI-powered note-taking and study platform. By creating an account or using the Service
        you agree to these Terms. If you do not agree, do not use the Service.
      </p>

      <h2>1. Who Can Use EternalNotes</h2>
      <p>
        You must be at least 13 years old to use this Service. By using EternalNotes you confirm
        that you meet this requirement. If you are under 18, you should have permission from a
        parent or guardian.
      </p>

      <h2>2. Your Account</h2>
      <p>
        You are responsible for keeping your login credentials secure. Do not share your password.
        You are responsible for all activity that takes place under your account. Notify us
        immediately at <a href="mailto:discordboteternal@gmail.com">discordboteternal@gmail.com</a> if
        you believe your account has been compromised.
      </p>

      <h2>3. What You Can Use the Service For</h2>
      <p>
        EternalNotes is provided for personal study, note-taking, knowledge management, and
        related lawful purposes. You may upload documents and notes, use AI tools to query
        your content, generate quizzes and flashcards, and collaborate in shared workspaces.
      </p>

      <h2>4. Prohibited Uses</h2>
      <p>You must not use EternalNotes to:</p>
      <ul>
        <li>Upload, store, or process content that is illegal or that you do not have the right to use</li>
        <li>Attempt to gain unauthorised access to any part of the system or another user's data</li>
        <li>Reverse-engineer, scrape, or abuse the platform's APIs</li>
        <li>Upload malware, viruses, or any harmful code</li>
        <li>Harass, impersonate, or harm others</li>
        <li>Violate any applicable laws or regulations</li>
        <li>Use the Service in any way that could damage, overload, or impair its operation</li>
      </ul>
      <p>
        See our <a href="/legal/acceptable-use">Acceptable Use Policy</a> for full details.
      </p>

      <h2>5. AI-Generated Content</h2>
      <p>
        EternalNotes uses AI to help you retrieve, summarise, and quiz yourself on your own
        documents. AI outputs may be incomplete, inaccurate, or misleading. You are responsible
        for verifying any information before relying on it. AI responses are not professional,
        legal, medical, or financial advice. See our <a href="/legal/ai">AI Disclaimer</a> for
        full details.
      </p>

      <h2>6. Your Content</h2>
      <p>
        You own the content you create and upload to EternalNotes. By using the Service you grant
        EternalNotes a limited licence to store and process your content solely to provide the
        Service to you. We do not sell your content or use it to train AI models.
      </p>
      <p>
        You are responsible for ensuring you have the right to upload any documents or files you
        add to the Service.
      </p>

      <h2>7. Service Availability</h2>
      <p>
        EternalNotes is provided on a best-effort basis. We do not guarantee uninterrupted or
        error-free operation. We may perform maintenance, apply updates, or temporarily suspend
        the Service at any time. We are not liable for any loss or inconvenience caused by
        downtime.
      </p>

      <h2>8. Subscriptions and Payments</h2>
      <p>
        EternalNotes currently offers a free tier. Paid plans, where available, are handled
        manually â€” there is no automated billing at this time. Any payment arrangements will
        be communicated to you directly. See our <a href="/legal/refunds">Refund Policy</a> for
        details on cancellations and refunds.
      </p>

      <h2>9. Account Termination</h2>
      <p>
        You may close your account at any time by contacting us. We reserve the right to suspend
        or terminate accounts that violate these Terms, abuse the platform, or cause harm to other
        users or the Service, with or without notice.
      </p>
      <p>
        On termination your data will remain stored for a reasonable period before being deleted,
        unless you request immediate deletion.
      </p>

      <h2>10. Intellectual Property</h2>
      <p>
        The EternalNotes name, logo, and software are owned by EternalNotes. Nothing in these
        Terms transfers ownership of the platform to you. You may not copy, reproduce, or create
        derivative works from the Service without permission.
      </p>

      <h2>11. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, EternalNotes is not liable for any indirect,
        incidental, special, or consequential damages arising from your use of the Service,
        including but not limited to data loss, loss of profits, or reliance on AI-generated
        content.
      </p>
      <p>
        The Service is provided "as is" without warranties of any kind, express or implied.
      </p>

      <h2>12. Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time. When we do, we will update the "Last updated"
        date at the top of this page. Continued use of the Service after changes are posted
        constitutes your acceptance of the updated Terms.
      </p>

      <h2>13. Governing Law</h2>
      <p>
        These Terms are governed by the laws applicable in the jurisdiction where EternalNotes
        operates. Any disputes will be resolved through good-faith negotiation where possible.
      </p>

      <h2>14. Contact</h2>
      <p>
        Questions about these Terms? Reach us at <a href="mailto:discordboteternal@gmail.com">discordboteternal@gmail.com</a> or
        via our <a href="https://discord.gg/6hhxtpzkAE" target="_blank" rel="noopener noreferrer">Discord community</a>.
      </p>
    </article>
  );
}

