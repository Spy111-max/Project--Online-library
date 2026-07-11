/**
 * email.ts
 * ─────────────────────────────────────────────────────────────
 * Nodemailer transport setup + branded HTML email templates
 * for the Virtual Library authentication system.
 *
 * Environment variables required (see server/.env.example):
 *   EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_USER, EMAIL_PASS, EMAIL_FROM
 */

import nodemailer, { Transporter } from 'nodemailer';

// ── Lazy singleton transport ──────────────────────────────────
let _transport: Transporter | null = null;

function getTransport(): Transporter | null {
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_USER, EMAIL_PASS } = process.env;

  if (
    !EMAIL_USER ||
    !EMAIL_PASS ||
    EMAIL_USER === 'your_gmail@gmail.com' ||
    EMAIL_PASS === 'your_16_char_app_password'
  ) {
    return null;
  }

  if (_transport) return _transport;

  _transport = nodemailer.createTransport({
    host: EMAIL_HOST ?? 'smtp.gmail.com',
    port: Number(EMAIL_PORT ?? 587),
    secure: EMAIL_SECURE === 'true', // true = TLS on port 465; false = STARTTLS on 587
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  });

  _transport.verify((err) => {
    if (err) {
      console.error('[Mailer] SMTP connection failed:', err.message);
    } else {
      console.log('[Mailer] SMTP connection verified ✓');
    }
  });

  return _transport;
}

// ── HTML Email Templates ──────────────────────────────────────

/**
 * Generates a cozy, library-themed OTP email.
 * Uses only inline styles for maximum email client compatibility.
 */
function buildOtpHtml(otp: string, purpose: 'signup' | 'reset'): string {
  const heading =
    purpose === 'signup'
      ? 'Verify your new account'
      : 'Reset your password';

  const subtext =
    purpose === 'signup'
      ? 'You are one step away from entering your cozy reading sanctuary.'
      : 'Use the code below to securely reset your Cozy Library password.';

  return /* html */ `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cozy Library — ${heading}</title>
</head>
<body style="margin:0;padding:0;background:#0f0720;font-family:Georgia,'Times New Roman',serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0720;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;border-radius:20px;overflow:hidden;
          background:linear-gradient(160deg,#1e0d38 0%,#2d1145 60%,#3d1960 100%);
          border:1px solid rgba(249,168,212,0.15);">

          <!-- ── Header ── -->
          <tr>
            <td style="padding:36px 40px 28px;text-align:center;
              background:linear-gradient(135deg,#4a1a6e,#6b2d9e);
              border-bottom:1px solid rgba(249,168,212,0.2);">
              <span style="font-size:32px;line-height:1;">📚</span>
              <h1 style="margin:12px 0 0;font-size:22px;font-weight:700;
                color:#f9a8d4;letter-spacing:-0.5px;">Cozy Library</h1>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.55);
                font-family:'Helvetica Neue',Arial,sans-serif;">${heading}</p>
            </td>
          </tr>

          <!-- ── Body ── -->
          <tr>
            <td style="padding:36px 40px;text-align:center;">
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;
                color:rgba(255,255,255,0.7);font-family:'Helvetica Neue',Arial,sans-serif;">
                ${subtext}
              </p>

              <!-- OTP Box -->
              <div style="display:inline-block;background:rgba(253,164,175,0.1);
                border:2px solid rgba(253,164,175,0.35);border-radius:16px;
                padding:22px 40px;margin:8px 0 28px;">
                <p style="margin:0 0 6px;font-size:11px;font-weight:600;
                  color:rgba(249,168,212,0.6);letter-spacing:3px;text-transform:uppercase;
                  font-family:'Helvetica Neue',Arial,sans-serif;">Your verification code</p>
                <span style="font-size:42px;font-weight:700;letter-spacing:14px;
                  color:#f9a8d4;font-family:'Courier New',Courier,monospace;">
                  ${otp}
                </span>
              </div>

              <p style="margin:0 0 8px;font-size:13px;color:rgba(255,255,255,0.4);
                font-family:'Helvetica Neue',Arial,sans-serif;">
                ⏱ This code expires in <strong style="color:rgba(249,168,212,0.7);">5 minutes</strong>.
              </p>
              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.25);
                font-family:'Helvetica Neue',Arial,sans-serif;">
                Do not share this code with anyone.
              </p>
            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td style="padding:20px 40px 28px;text-align:center;
              border-top:1px solid rgba(249,168,212,0.1);">
              <p style="margin:0;font-size:11px;line-height:1.5;
                color:rgba(255,255,255,0.2);font-family:'Helvetica Neue',Arial,sans-serif;">
                If you didn't request this, you can safely ignore this email.<br/>
                Your account security is our priority. 🔒
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

/** Helper to print green formatted OTP code to server console when SMTP is disabled/failing. */
function logDevOtp(toEmail: string, otp: string, flow: string): void {
  console.log('\n┌────────────────────────────────────────────────────────┐');
  console.log(`│ [DEV FALLBACK] OTP CODE GENERATED                      │`);
  console.log(`│ Flow:  ${flow.padEnd(46)} │`);
  console.log(`│ To:    ${toEmail.padEnd(46)} │`);
  console.log(`│ Code:  \x1b[32;1m${otp}\x1b[0m (valid for 5 minutes)                 │`);
  console.log('└────────────────────────────────────────────────────────┘\n');
}

// ── Public send functions ─────────────────────────────────────

/** Send a signup email verification OTP. */
export async function sendSignupOtp(toEmail: string, otp: string): Promise<void> {
  const transport = getTransport();
  if (!transport) {
    logDevOtp(toEmail, otp, 'Signup');
    return;
  }
  try {
    await transport.sendMail({
      from: process.env.EMAIL_FROM ?? `"Cozy Library 📚" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `${otp} — Your Cozy Library verification code`,
      text: `Your Cozy Library signup verification code is: ${otp}\n\nThis code expires in 5 minutes. Do not share it with anyone.`,
      html: buildOtpHtml(otp, 'signup'),
    });
    console.log(`[Mailer] Signup OTP sent to ${toEmail}`);
  } catch (err: any) {
    console.error(`[Mailer] Failed to send email via SMTP: ${err.message}`);
    logDevOtp(toEmail, otp, 'Signup (SMTP Fallback)');
  }
}

/** Send a password-reset OTP. */
export async function sendResetOtp(toEmail: string, otp: string): Promise<void> {
  const transport = getTransport();
  if (!transport) {
    logDevOtp(toEmail, otp, 'Reset Password');
    return;
  }
  try {
    await transport.sendMail({
      from: process.env.EMAIL_FROM ?? `"Cozy Library 📚" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `${otp} — Reset your Cozy Library password`,
      text: `Your Cozy Library password reset code is: ${otp}\n\nThis code expires in 5 minutes. Do not share it with anyone.`,
      html: buildOtpHtml(otp, 'reset'),
    });
    console.log(`[Mailer] Reset OTP sent to ${toEmail}`);
  } catch (err: any) {
    console.error(`[Mailer] Failed to send email via SMTP: ${err.message}`);
    logDevOtp(toEmail, otp, 'Reset Password (SMTP Fallback)');
  }
}
