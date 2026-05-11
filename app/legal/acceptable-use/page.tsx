import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acceptable Use Policy — EternalNotes",
  description: "Acceptable Use Policy for EternalNotes",
};

export default function AcceptableUsePage() {
  return (
    <article className="prose-legal">
      <h1>Acceptable Use Policy</h1>
      <p className="meta">Last updated: 11 May 2026</p>

      <p>
        This Acceptable Use Policy ("AUP") sets out what you may and may not do when using
        EternalNotes. It exists to keep the platform safe, functional, and fair for everyone.
        This AUP is part of our <a href="/legal/terms">Terms of Service</a>.
      </p>

      <h2>1. Permitted Uses</h2>
      <p>You may use EternalNotes to:</p>
      <ul>
        <li>Create, organise, and study your own notes and documents</li>
        <li>Upload documents you own or have rights to use</li>
        <li>Use AI tools to query and learn from your own content</li>
        <li>Collaborate with others in shared workspaces you have been invited to</li>
        <li>Build study materials such as quizzes and flashcards from your content</li>
      </ul>

      <h2>2. Prohibited Content</h2>
      <p>You must not upload, store, or process content that:</p>
      <ul>
        <li>Is illegal under any applicable law</li>
        <li>Infringes the copyright, trademark, or intellectual property rights of others</li>
        <li>Contains malware, viruses, or malicious code</li>
        <li>Is sexually explicit involving minors</li>
        <li>Contains threats, harassment, or hate speech targeting individuals or groups</li>
        <li>You do not have permission to use or distribute</li>
      </ul>

      <h2>3. Prohibited Behaviour</h2>
      <p>You must not:</p>
      <ul>
        <li>Attempt to gain unauthorised access to any account, system, or data that is not yours</li>
        <li>Scrape, crawl, or extract data from the platform using automated tools without permission</li>
        <li>Use the Service to send spam or unsolicited communications to others</li>
        <li>Share your account credentials with others or allow others to access your account</li>
        <li>Attempt to reverse-engineer, decompile, or otherwise extract the source code of the platform</li>
        <li>Intentionally overload or disrupt the platform's infrastructure</li>
        <li>Impersonate another person or entity</li>
        <li>Circumvent any rate limits, quotas, or access controls</li>
        <li>Use the platform to facilitate any activity that violates the law</li>
      </ul>

      <h2>4. AI Usage</h2>
      <p>
        When using AI features, you must not attempt to manipulate AI outputs in ways that
        cause harm to others, generate illegal content, or circumvent safety measures.
        AI tools are provided to help you learn from your own content — not to produce
        content intended to deceive, harm, or violate the rights of others.
      </p>

      <h2>5. Workspace Conduct</h2>
      <p>
        If you use shared workspaces, you must treat other members respectfully and not
        use the workspace to share prohibited content or harass other members.
      </p>

      <h2>6. Enforcement</h2>
      <p>
        Violation of this AUP may result in suspension or termination of your account,
        with or without prior notice, depending on the severity of the violation. We reserve
        the right to remove content that violates this policy.
      </p>

      <h2>7. Reporting Violations</h2>
      <p>
        If you believe someone is violating this policy, please report it at{" "}
        <a href="mailto:discordboteternal@gmail.com">discordboteternal@gmail.com</a> or
        via our <a href="https://discord.gg/9YHgyNvy9k" target="_blank" rel="noopener noreferrer">Discord</a>.
      </p>

      <h2>8. Changes to This Policy</h2>
      <p>
        We may update this AUP as the platform evolves. The "Last updated" date reflects
        the most recent revision.
      </p>
    </article>
  );
}
