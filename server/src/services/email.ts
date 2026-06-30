// ============================================================
// EMAIL SERVICE — SendGrid send via REST API
//
// Transport: SendGrid REST API (https://api.sendgrid.com/v3/mail/send),
// called directly via fetch with a Bearer token — mirrors the Dreadnought
// Command Center and lightspeed-talent-assessment implementations.
// No SDK/package dependency (plain fetch).
//
// SANDBOX MODE (default): when no SENDGRID_API_KEY is set, emails are logged
// to the console only — nothing is sent and no SendGrid account is needed.
// This keeps non-prod safe by default.
//
// TO GO LIVE: set SENDGRID_API_KEY (+ EMAIL_FROM, EMAIL_FROM_NAME,
// EMAIL_REPLY_TO, HR_EMAIL) in the Railway environment.
// ============================================================

const SENDGRID_SEND_URL = 'https://api.sendgrid.com/v3/mail/send';
const FROM_ADDRESS = process.env.EMAIL_FROM ?? 'bsf@st6partners.com';
const FROM_NAME = process.env.EMAIL_FROM_NAME ?? 'AI Engagement';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  /** Optional label for logging / future automated templates. */
  templateId?: string;
  /** Optional reply-to address; defaults to EMAIL_REPLY_TO when set. */
  replyTo?: string;
}

/** True when a SendGrid key is configured (i.e. emails actually send). */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.SENDGRID_API_KEY);
}

/** Current email configuration — used by the admin test surface. */
export function emailConfig() {
  return {
    configured: isEmailConfigured(),
    from: process.env.EMAIL_FROM ?? FROM_ADDRESS,
    fromName: process.env.EMAIL_FROM_NAME ?? FROM_NAME,
    replyTo: process.env.EMAIL_REPLY_TO ?? null,
    hrEmail: process.env.HR_EMAIL ?? null,
  };
}

function buildSendGridBody(payload: EmailPayload) {
  const replyTo = payload.replyTo ?? process.env.EMAIL_REPLY_TO;
  const body: Record<string, unknown> = {
    personalizations: [{ to: [{ email: payload.to }] }],
    from: { email: process.env.EMAIL_FROM ?? FROM_ADDRESS, name: process.env.EMAIL_FROM_NAME ?? FROM_NAME },
    subject: payload.subject,
    content: [{ type: 'text/html', value: payload.html }],
  };
  if (replyTo) body.reply_to = { email: replyTo };
  return body;
}

/**
 * Send an email and THROW on failure. Returns { sandbox } so callers (e.g. the
 * admin test form) can tell the user whether it really went out or was logged.
 */
export async function sendEmailOrThrow(payload: EmailPayload): Promise<{ sandbox: boolean }> {
  if (!isEmailConfigured()) {
    console.log(`[EMAIL SANDBOX] Template: ${payload.templateId ?? 'n/a'} | To: ${payload.to} | Subject: ${payload.subject}`);
    return { sandbox: true };
  }
  const response = await fetch(SENDGRID_SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildSendGridBody(payload)),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`SendGrid rejected email (${response.status}): ${text || response.statusText}`);
  }
  return { sandbox: false };
}

/**
 * Fire-and-forget send for automated emails. Never throws — logs and continues
 * so a delivery hiccup cannot break the calling workflow.
 */
export async function sendEmail(payload: EmailPayload): Promise<void> {
  try {
    await sendEmailOrThrow(payload);
  } catch (err) {
    console.error(`[EMAIL ERROR] Failed to send ${payload.templateId ?? 'email'} to ${payload.to}:`, err);
  }
}
