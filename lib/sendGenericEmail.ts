// lib/sendGenericEmail.ts

type EmailPayload = {
  to?: string;
  subject?: string;
  text?: string;
};

/**
 * Sends a generic notification email (or webhook).
 * - If SEND_EMAIL_ENABLED !== "true", it becomes a no-op.
 * - If SEND_EMAIL_ENDPOINT is missing, it logs and returns (no throw).
 * Customize as needed.
 */
export async function sendGenericEmail(payload: EmailPayload = {}) {
  try {
    if (process.env.SEND_EMAIL_ENABLED !== "true") {
      // No-op in dev unless explicitly enabled
      console.log("[sendGenericEmail] disabled; skipping.");
      return;
    }

    const endpoint = process.env.SEND_EMAIL_ENDPOINT;
    if (!endpoint) {
      console.warn("[sendGenericEmail] SEND_EMAIL_ENDPOINT not set; skipping.");
      return;
    }

    const body = {
      to: payload.to || process.env.DEFAULT_NOTIFY_EMAIL || "",
      subject: payload.subject || "PawPortal: Update",
      text: payload.text || "A pet was marked as adopted.",
    };

    await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("[sendGenericEmail] failed:", err);
    // Never throw: we don't want marking as adopted to fail because email failed.
  }
}
