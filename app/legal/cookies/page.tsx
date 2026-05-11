import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy — EternalNotes",
  description: "Cookie Policy for EternalNotes",
};

export default function CookiesPage() {
  return (
    <article className="prose-legal">
      <h1>Cookie Policy</h1>
      <p className="meta">Last updated: 11 May 2026</p>

      <p>
        This page explains how EternalNotes uses cookies and browser storage. We keep
        this minimal — there is no advertising, no cross-site tracking, and no third-party
        analytics cookies.
      </p>

      <h2>1. What Is a Cookie?</h2>
      <p>
        A cookie is a small piece of data stored in your browser by a website. Cookies can
        be used for many purposes — from keeping you logged in to tracking your behaviour
        across the internet. EternalNotes only uses cookies for the former.
      </p>

      <h2>2. Cookies We Use</h2>

      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Purpose</th>
              <th>Duration</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>studyos_session</code></td>
              <td>Keeps you logged in. Contains a hashed session token — not your password or any personal data.</td>
              <td>30 days</td>
              <td>Essential</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        This is the only cookie set by EternalNotes. It is marked <strong>HTTP-only</strong>
        (cannot be accessed by JavaScript) and <strong>Secure</strong> (only sent over HTTPS
        in production). It is used solely for authentication.
      </p>

      <h2>3. Browser Storage (localStorage)</h2>
      <p>
        EternalNotes also stores some data in your browser's <code>localStorage</code>. This
        is not a cookie — it stays on your device and is never sent to our servers. It is used
        to remember your preferences between sessions:
      </p>
      <ul>
        <li>Theme preference (light or dark)</li>
        <li>Panel sizes and open/closed state</li>
        <li>Pinned notes</li>
        <li>Recently visited notes</li>
        <li>Selected code language for the editor</li>
      </ul>
      <p>
        You can clear this data at any time by clearing your browser's site data for EternalNotes.
      </p>

      <h2>4. Cookies We Do NOT Use</h2>
      <p>EternalNotes does not use:</p>
      <ul>
        <li>Advertising or tracking cookies</li>
        <li>Analytics cookies (Google Analytics, Mixpanel, etc.)</li>
        <li>Social media tracking pixels</li>
        <li>Any third-party cookies</li>
      </ul>

      <h2>5. Managing Cookies</h2>
      <p>
        Because the session cookie is essential for the Service to function, you cannot opt out
        of it while remaining logged in. If you delete the cookie, you will be logged out.
      </p>
      <p>
        You can manage or delete cookies through your browser settings. Most browsers allow
        you to view, block, or delete cookies. Blocking essential cookies will prevent the
        Service from working correctly.
      </p>

      <h2>6. Changes to This Policy</h2>
      <p>
        We may update this Cookie Policy if we add new features that use cookies or browser
        storage. The "Last updated" date at the top of this page will reflect any changes.
      </p>

      <h2>7. Contact</h2>
      <p>
        Questions? <a href="mailto:discordboteternal@gmail.com">discordboteternal@gmail.com</a>{" "}
        or <a href="https://discord.gg/9YHgyNvy9k" target="_blank" rel="noopener noreferrer">Discord</a>.
      </p>
    </article>
  );
}
