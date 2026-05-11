import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — EternalNotes",
  description: "Privacy Policy for EternalNotes",
};

export default function PrivacyPage() {
  return (
    <article className="prose-legal">
      <h1>Privacy Policy</h1>
      <p className="meta">Last updated: 11 May 2026</p>

      <p>
        This Privacy Policy explains what data EternalNotes collects, how it is used, and your
        rights regarding that data. We have written this in plain language because we think
        privacy policies should be readable.
      </p>

      <h2>1. Who We Are</h2>
      <p>
        EternalNotes is an AI-powered note-taking and study platform. For questions about your
        data, contact us at <a href="mailto:discordboteternal@gmail.com">discordboteternal@gmail.com</a>.
      </p>

      <h2>2. Data We Collect</h2>

      <h3>Account information</h3>
      <p>When you register, we collect:</p>
      <ul>
        <li>Your name</li>
        <li>Your email address</li>
        <li>A hashed version of your password (we never store your password in plain text)</li>
      </ul>

      <h3>Notes and documents</h3>
      <p>
        Any notes you write or documents you upload (PDFs, Word files, text files) are stored
        on the server running EternalNotes. We do not read, sell, or share your content.
        Your content is used solely to provide the Service to you — for example, to answer
        your questions using AI retrieval.
      </p>

      <h3>Usage data</h3>
      <p>
        We record counts of how often you use certain features (Ask, Quiz, Flashcards, etc.)
        to enforce usage quotas and to help us understand which features are being used. This
        data is not linked to any advertising or shared with third parties.
      </p>

      <h3>Session data</h3>
      <p>
        When you log in, we create a session token stored in a secure, HTTP-only cookie
        (named <code>studyos_session</code>). This cookie is used only to keep you logged in
        and expires after 30 days. It is not used for tracking or advertising.
      </p>

      <h3>Browser storage</h3>
      <p>
        We store UI preferences in your browser's <code>localStorage</code> — things like
        your theme choice, panel sizes, and pinned notes. This data never leaves your device
        and is not sent to our servers.
      </p>

      <h2>3. AI Providers</h2>
      <p>
        EternalNotes can operate using different AI backends depending on how it is configured:
      </p>
      <ul>
        <li>
          <strong>Your own OpenAI key (BYOK):</strong> If you provide your own OpenAI API key,
          your queries and document excerpts are sent directly to OpenAI under your own account.
          OpenAI's privacy policy applies.
        </li>
        <li>
          <strong>Local AI via Ollama:</strong> If the platform is configured to use Ollama,
          all AI processing happens locally on the server. No data is sent to external AI services.
        </li>
        <li>
          <strong>Hosted AI key:</strong> If a server-side AI key is configured by the operator,
          your query text and relevant document excerpts may be sent to OpenAI on your behalf.
          Only the information needed to answer your question is sent — not your entire note
          library.
        </li>
      </ul>
      <p>
        We do not use your content to train AI models.
      </p>

      <h2>4. Email</h2>
      <p>
        If email verification or password reset is enabled, we use{" "}
        <a href="https://resend.com" target="_blank" rel="noopener noreferrer">Resend</a> to
        send transactional emails. We do not send marketing emails. Resend may retain metadata
        about sent emails as per their own privacy policy.
      </p>

      <h2>5. Payments</h2>
      <p>
        EternalNotes does not currently use automated payment processing. No payment card
        details are collected or stored by us. If paid plans become available in future,
        this policy will be updated.
      </p>

      <h2>6. Analytics and Tracking</h2>
      <p>
        We do not use any third-party analytics tools (such as Google Analytics, Mixpanel, or
        similar). We do not track you across websites. We do not sell your data.
      </p>

      <h2>7. Data Storage and Security</h2>
      <p>
        All data is stored on the server running EternalNotes, including a SQLite database and
        local file storage for uploaded documents. Your API keys, if provided, are encrypted
        before being stored.
      </p>
      <p>
        Session tokens are hashed before storage. Passwords are hashed using a memory-hard
        algorithm (scrypt). Authentication cookies are flagged as HTTP-only and secure
        (HTTPS-only in production).
      </p>
      <p>
        While we take reasonable steps to protect your data, no system is completely secure.
        We cannot guarantee the absolute security of your information.
      </p>

      <h2>8. Data Retention</h2>
      <p>
        Your account data and content are retained for as long as your account is active. Expired
        sessions are automatically cleaned up. If you request account deletion, we will remove
        your personal data and content within a reasonable timeframe.
      </p>

      <h2>9. Your Rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li>Access the data we hold about you</li>
        <li>Request correction of inaccurate data</li>
        <li>Request deletion of your account and associated data</li>
      </ul>
      <p>
        To exercise any of these rights, contact us at{" "}
        <a href="mailto:discordboteternal@gmail.com">discordboteternal@gmail.com</a>. We do not
        currently have a self-serve data export or deletion tool — requests are handled manually.
      </p>

      <h2>10. Children</h2>
      <p>
        EternalNotes is not intended for children under 13. We do not knowingly collect data
        from children under 13. If you believe a child has registered without permission,
        contact us and we will delete the account promptly.
      </p>

      <h2>11. International Users</h2>
      <p>
        EternalNotes operates on a self-hosted server. The location of your data depends on
        where the server is hosted. By using the Service you acknowledge that your data may
        be stored and processed in a jurisdiction different from your own.
      </p>

      <h2>12. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. When we do, we will update the
        "Last updated" date at the top of this page.
      </p>

      <h2>13. Contact</h2>
      <p>
        Privacy questions or data requests: <a href="mailto:discordboteternal@gmail.com">discordboteternal@gmail.com</a>{" "}
        or our <a href="https://discord.gg/9YHgyNvy9k" target="_blank" rel="noopener noreferrer">Discord community</a>.
      </p>
    </article>
  );
}
