import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy â€” EternalNotes",
  description: "Refund and Cancellation Policy for EternalNotes",
};

export default function RefundsPage() {
  return (
    <article className="prose-legal">
      <h1>Refund &amp; Cancellation Policy</h1>
      <p className="meta">Last updated: 11 May 2026</p>

      <h2>1. Current Billing Model</h2>
      <p>
        EternalNotes currently operates on a free-tier model. Paid plan upgrades, where available,
        are arranged manually â€” there is no automated subscription billing or card processing
        at this time. No payment card details are collected or stored by EternalNotes.
      </p>

      <h2>2. Free Tier</h2>
      <p>
        The free tier of EternalNotes is available at no charge and can be used indefinitely.
        There is nothing to cancel or refund on a free account.
      </p>

      <h2>3. Paid Plans</h2>
      <p>
        If you have been manually upgraded to a paid plan, the following applies:
      </p>
      <ul>
        <li>
          <strong>Cancellation:</strong> You can request cancellation of your paid plan at any
          time by contacting us at{" "}
          <a href="mailto:contact@example.com">contact@example.com</a> or
          via <a href="https://discord.gg/YOUR_DISCORD_INVITE" target="_blank" rel="noopener noreferrer">Discord</a>.
          Your access will continue until the end of the paid period.
        </li>
        <li>
          <strong>Refunds:</strong> Refund requests are handled on a case-by-case basis. We
          do not offer automatic refunds. If you believe you have been charged incorrectly or
          have a genuine reason for a refund, contact us and we will review it fairly.
        </li>
        <li>
          <strong>Renewals:</strong> As billing is currently manual, there are no automatic
          renewals. You will not be charged without explicit agreement.
        </li>
      </ul>

      <h2>4. Future Automated Billing</h2>
      <p>
        If automated subscription billing is introduced in future, this policy will be updated
        to cover renewal dates, billing cycles, pro-rata refunds, and cancellation flows. You
        will be notified before any automated billing is enabled for your account.
      </p>

      <h2>5. Account Deletion</h2>
      <p>
        Deleting your account does not automatically trigger a refund of any amount paid.
        Contact us before deleting your account if you have an active paid arrangement.
      </p>

      <h2>6. Contact</h2>
      <p>
        Billing or refund queries: <a href="mailto:contact@example.com">contact@example.com</a>{" "}
        or <a href="https://discord.gg/YOUR_DISCORD_INVITE" target="_blank" rel="noopener noreferrer">Discord</a>.
        We aim to respond within 2 business days.
      </p>
    </article>
  );
}



