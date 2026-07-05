import { Resend } from 'resend';
import * as config from '../config/env';

export interface EmailPayload {
    to: string;
    subject: string;
    html: string;
    /** Plain-text fallback. Shown by clients that don't render HTML. */
    text?: string;
}

let resendClient: Resend | null = null;

const getClient = (): Resend | null => {
    if (!config.RESEND_API_KEY) return null;
    if (!resendClient) resendClient = new Resend(config.RESEND_API_KEY);
    return resendClient;
};

/**
 * Core send primitive. All typed helpers call this.
 *
 * - Production: always sends.
 * - Development: skips send and logs unless ENABLE_DEVELOPMENT_EMAIL=true.
 * - No RESEND_API_KEY: logs a warning and skips.
 */
const send = async (payload: EmailPayload): Promise<void> => {
    if (config.NODE_ENV === 'development' && !config.ENABLE_DEVELOPMENT_EMAIL) {
        console.log('[emailService] Dev mode — email skipped (set ENABLE_DEVELOPMENT_EMAIL=true to send for real)');
        console.log('[emailService] Would have sent:', {
            to: payload.to,
            subject: payload.subject,
        });
        return;
    }

    const client = getClient();
    if (!client) {
        console.warn('[emailService] RESEND_API_KEY is not set — email not sent.');
        return;
    }

    const { error } = await client.emails.send({
        from: config.EMAIL_FROM,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        ...(payload.text ? { text: payload.text } : {}),
    });

    if (error) {
        console.error('[emailService] Resend API error:', error);
        throw new Error(`Failed to send email: ${error.message}`);
    }
};

export interface PasswordResetEmailOptions {
    to: string;
    firstName: string;
    resetLink: string;
}

const sendPasswordResetEmail = async (opts: PasswordResetEmailOptions): Promise<void> => {
    const { to, firstName, resetLink } = opts;

    await send({
        to,
        subject: 'Reset your KinMeet password',
        html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your KinMeet password</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f0eb;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f0eb;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:#1b2a4a;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">KinMeet</h1>
              <p style="margin:6px 0 0;color:#7ec8c8;font-size:13px;">Connect with your homeland community abroad</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 8px;color:#1b2a4a;font-size:16px;font-weight:600;">Hi ${firstName},</p>
              <p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.6;">
                We received a request to reset your password. Click the button below to choose a new one.
                This link will expire in <strong>1 hour</strong>.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 28px;">
                    <a href="${resetLink}"
                       style="display:inline-block;background-color:#e05a47;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:8px;letter-spacing:0.3px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;line-height:1.5;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 24px;word-break:break-all;">
                <a href="${resetLink}" style="color:#e05a47;font-size:13px;">${resetLink}</a>
              </p>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 20px;" />
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;">
                If you didn't request a password reset, you can safely ignore this email — your password won't change.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">&copy; ${new Date().getFullYear()} KinMeet. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
        text: `Hi ${firstName},\n\nWe received a request to reset your KinMeet password.\n\nClick the link below to set a new password (expires in 1 hour):\n${resetLink}\n\nIf you didn't request this, you can safely ignore this email.\n\n— The KinMeet team`,
    });
};

export const emailService = {
    send,
    sendPasswordResetEmail,
};
