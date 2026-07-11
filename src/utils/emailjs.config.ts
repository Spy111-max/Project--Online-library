// ─────────────────────────────────────────────────────────────
// EmailJS Configuration
// ─────────────────────────────────────────────────────────────
// Sign up at https://www.emailjs.com/ (free tier: 200 emails/month)
// Then fill in the values below from your EmailJS dashboard.
//
// SETUP STEPS:
// 1. Go to https://emailjs.com → "Email Services" → Connect Gmail / Outlook / etc.
// 2. Copy your  SERVICE ID  from the service card
// 3. Go to "Email Templates" → Create a new template with these exact variables:
//       To Email   : {{to_email}}
//       Subject    : Your Cozy Library OTP Code
//       Body       : Your verification code is: {{otp_code}}
//                    This code expires in 5 minutes.
// 4. Copy your  TEMPLATE ID
// 5. Go to "Account" → "General" → copy your  PUBLIC KEY
// ─────────────────────────────────────────────────────────────

export const EMAILJS_CONFIG = {
  SERVICE_ID: 'YOUR_SERVICE_ID',    // e.g. 'service_abc123'
  TEMPLATE_ID: 'YOUR_TEMPLATE_ID', // e.g. 'template_xyz789'
  PUBLIC_KEY: 'YOUR_PUBLIC_KEY',   // e.g. 'user_XXXXXXXXXXXXXXX'
} as const;
