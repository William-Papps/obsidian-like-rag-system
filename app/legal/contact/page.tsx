import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact & Legal â€” EternalNotes",
  description: "Contact information and legal enquiries for EternalNotes",
};

export default function ContactPage() {
  return (
    <article className="prose-legal">
      <h1>Contact &amp; Legal</h1>
      <p className="meta">Last updated: 11 May 2026</p>

      <p>
        If you have questions about EternalNotes, need support, or want to make a legal or
        privacy enquiry, here is how to reach us.
      </p>

      <h2>General Support</h2>
      <p>
        The fastest way to get help is through our Discord community, where the team is
        active and can respond quickly.
      </p>
      <p>
        <a href="https://discord.gg/YOUR_DISCORD_INVITE" target="_blank" rel="noopener noreferrer">
          Join the EternalNotes Discord â†’
        </a>
      </p>

      <h2>Email</h2>
      <p>
        For formal enquiries, privacy requests, legal notices, or anything you prefer to
        handle by email:
      </p>
      <p>
        <a href="mailto:contact@example.com">contact@example.com</a>
      </p>
      <p>We aim to respond within 2 business days.</p>

      <h2>Privacy and Data Requests</h2>
      <p>
        To request access to your data, correction of your data, or deletion of your account,
        email us at <a href="mailto:contact@example.com">contact@example.com</a> with
        the subject line "Data Request" and include the email address associated with your account.
        We handle these requests manually and will respond within a reasonable timeframe.
      </p>

      <h2>Reporting Abuse or Policy Violations</h2>
      <p>
        To report content or behaviour that violates our{" "}
        <a href="/legal/acceptable-use">Acceptable Use Policy</a>, contact us by email or Discord.
        Please include as much detail as possible so we can investigate promptly.
      </p>

      <h2>Legal Notices</h2>
      <p>
        For legal correspondence, please use the email address above. We do not have a
        registered business address to disclose at this time.
      </p>

      <h2>Feedback</h2>
      <p>
        You can also submit feedback directly within the app using the feedback button in
        the sidebar. We read all submissions.
      </p>
    </article>
  );
}



