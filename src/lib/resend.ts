/**
 * Thin Resend REST wrapper. No-ops (with a log line) when RESEND_API_KEY is
 * unset so local dev and tests never send real email.
 */

const RESEND_API_BASE = process.env.RESEND_API_BASE ?? "https://api.resend.com";
const FROM_ADDRESS = process.env.RESEND_FROM ?? "Legent <hello@legent.getkryxai.com>";

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ sent: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info(`[resend] skipped (no API key): "${params.subject}" -> ${params.to}`);
    return { sent: false };
  }

  const res = await fetch(`${RESEND_API_BASE}/emails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    // Email failures must never break the calling flow (e.g. a paid webhook).
    console.error(`[resend] send failed (${res.status}) for "${params.subject}"`);
    return { sent: false };
  }

  return { sent: true };
}

export function earlyAccessWelcomeEmail(name: string | null): { subject: string; html: string } {
  const greeting = name ? `Hey ${name},` : "Hey,";
  return {
    subject: "Welcome to Legent Early Access 🎉",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
        <h2 style="color:#8B5CF6">Welcome to Legent Early Access</h2>
        <p>${greeting}</p>
        <p>Your payment went through and your account is now on the
        <strong>Early Access</strong> tier — that locks in a lifetime
        <strong>40% discount</strong> on Pro pricing when it launches.</p>
        <p>What you get today:</p>
        <ul>
          <li>Connect X and LinkedIn</li>
          <li>AI feedback on every post before it goes out</li>
          <li>Scheduling that actually publishes</li>
        </ul>
        <p><a href="${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/dashboard"
              style="background:#8B5CF6;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">
          Open your dashboard</a></p>
        <p style="color:#666;font-size:13px">— Ankit, founder of Legent</p>
      </div>
    `,
  };
}
