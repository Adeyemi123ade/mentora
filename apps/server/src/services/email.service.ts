import { env } from '../env.js';
import { AppError } from '../lib/AppError.js';

// Sends via the Gmail API (HTTPS, port 443) authenticated as GOOGLE_SENDER_EMAIL through a
// stored OAuth2 refresh token — not Brevo. Brevo can't authenticate a Gmail address it
// doesn't control the DNS for, so it silently substitutes its own generic sending domain;
// Gmail's spam/phishing filters then treat "verification code" mail arriving that way as a
// high-confidence phishing pattern and discard it outright (confirmed via Brevo's own
// delivery logs: accepted + delivered, but never findable in the recipient's mailbox at all,
// not even spam). Sending genuinely through Google's own infrastructure as the real Gmail
// account avoids that entirely. HTTPS avoids the separate SMTP-port-blocking issue on Render
// that an earlier attempt at Brevo's SMTP relay hit.
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
const REQUEST_TIMEOUT_MS = 15_000;

const hasRealCredentials = Boolean(
  env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET && env.GOOGLE_OAUTH_REFRESH_TOKEN,
);
const senderEmail = env.GOOGLE_SENDER_EMAIL ?? env.BREVO_SENDER_EMAIL ?? 'no-reply@mentora.dev';

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 30_000) {
    return cachedAccessToken.token;
  }

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET!,
      refresh_token: env.GOOGLE_OAUTH_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Google token refresh failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedAccessToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function buildRawMessage(to: string, subject: string, text: string, html: string): string {
  const boundary = `mentora_${Date.now()}`;
  const message = [
    `From: Mentora <${senderEmail}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    text,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    '',
    html,
    '',
    `--${boundary}--`,
  ].join('\r\n');

  return base64UrlEncode(message);
}

async function sendViaGmail(
  to: string,
  subject: string,
  text: string,
  html: string,
  failureCode: string,
  failureMessage: string,
): Promise<void> {
  if (!hasRealCredentials) {
    console.error('[email] Gmail OAuth credentials are not configured; email was not sent.');
    throw new AppError(503, 'Email delivery is not configured. Please contact Mentora support.', 'SMTP_NOT_CONFIGURED');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const accessToken = await getAccessToken();
    const res = await fetch(GMAIL_SEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: buildRawMessage(to, subject, text, html) }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[email] Gmail API request failed (${res.status}) for ${to}:`, body);
      throw new AppError(502, failureMessage, failureCode);
    }

    console.log(`[email] Sent to ${to} via Gmail API.`);
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error(`[email] Failed to send email to ${to} via Gmail API:`, err);
    throw new AppError(502, failureMessage, failureCode);
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  await sendViaGmail(
    to,
    'Your Mentora verification code',
    `Your Mentora verification code is ${code}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #0f172a;">Verify your email</h2>
        <p style="color: #334155;">Use the 6-digit code below to finish creating your Mentora account. It expires in 10 minutes.</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 8px; color: #0f172a; margin: 24px 0;">${code}</p>
        <p style="color: #64748b; font-size: 13px;">If you didn't request this code, you can safely ignore this email.</p>
      </div>
    `,
    'OTP_EMAIL_FAILED',
    'Your verification code could not be delivered. Please try resending it.',
  );
}

export async function sendAdminInviteEmail(to: string, inviterName: string, actionLink: string): Promise<void> {
  await sendViaGmail(
    to,
    `${inviterName} invited you to administer Mentora`,
    `${inviterName} has invited you to become an administrator on Mentora. Set your password to accept: ${actionLink} (this link expires in 10 minutes and can only be used once). If you weren't expecting this, you can ignore this email.`,
    `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #0f172a;">You've been invited to Mentora</h2>
        <p style="color: #334155;"><strong>${inviterName}</strong> has invited you to become an administrator on Mentora.</p>
        <p style="margin: 24px 0;"><a href="${actionLink}" style="background: #2563eb; color: #ffffff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 700;">Set your password</a></p>
        <p style="color: #64748b; font-size: 13px;">This link expires in 10 minutes and can only be used once. If you weren't expecting this invite, you can safely ignore this email.</p>
      </div>
    `,
    'INVITE_EMAIL_FAILED',
    'The invite email could not be delivered. Please try again.',
  );
}

export async function sendPasswordResetEmail(to: string, code: string): Promise<void> {
  await sendViaGmail(
    to,
    'Your Mentora password reset code',
    `Your Mentora password reset code is ${code}. It expires in 10 minutes. If you didn't request this, you can ignore this email — your password will not change.`,
    `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #0f172a;">Reset your password</h2>
        <p style="color: #334155;">Use the 6-digit code below to reset your Mentora password. It expires in 10 minutes.</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 8px; color: #0f172a; margin: 24px 0;">${code}</p>
        <p style="color: #64748b; font-size: 13px;">If you didn't request this, you can safely ignore this email — your password will not change.</p>
      </div>
    `,
    'RESET_EMAIL_FAILED',
    'Your password reset email could not be delivered. Please try again.',
  );
}
