import "server-only";

// Transactional mail through Resend's HTTP API. Without RESEND_API_KEY nothing
// is sent and the caller learns that from the return value.
const FROM = process.env.MAIL_FROM ?? "Immotrim <hallo@immotrim.com>";

export type Mail = { to: string; subject: string; html: string; text: string; replyTo?: string };

export async function sendMail(mail: Mail): Promise<"sent" | "not-configured" | "failed"> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return "not-configured";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [mail.to],
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
      }),
    });
    if (!res.ok) {
      console.error("[mail failed]", mail.subject, res.status, (await res.text()).slice(0, 300));
      return "failed";
    }
    return "sent";
  } catch (e) {
    console.error("[mail failed]", mail.subject, e);
    return "failed";
  }
}

export const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
