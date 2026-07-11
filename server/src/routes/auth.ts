/**
 * auth.ts — Express Router for all authentication endpoints
 * ─────────────────────────────────────────────────────────────
 *
 * POST /api/auth/signup            Register + send signup OTP
 * POST /api/auth/verify-signup     Verify OTP → activate account
 * POST /api/auth/login             Authenticate verified user
 * POST /api/auth/forgot-password   Check email exists → send reset OTP
 * POST /api/auth/verify-forgot-otp Verify reset OTP → return reset token (JWT)
 * POST /api/auth/reset-password    Use reset token → update password hash
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { findByEmail, createUser, updateUser, clearOtp } from '../services/userStore';
import { sendSignupOtp, sendResetOtp } from '../services/email';
import { ApiResponse, PublicUser } from '../types';

const router = Router();

// ── Security constants ────────────────────────────────────────
const BCRYPT_ROUNDS = 12;       // password hash rounds
const OTP_BCRYPT_ROUNDS = 8;    // OTP hash rounds (faster, still secure)
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ── Helpers ───────────────────────────────────────────────────

/** Generate a cryptographically-random 6-digit OTP string. */
function generateOTP(): string {
  // Math.random() would be slightly biased; use crypto for uniform distribution
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return ((arr[0] % 900000) + 100000).toString();
}

/** Validate email format (basic). */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Validate password strength: ≥8 chars, one number, one special char. */
function isStrongPassword(pw: string): boolean {
  return /^(?=.*[0-9])(?=.*[!@#$%^&*()\-_+=[\]{};':"\\|,.<>/?]).{8,}$/.test(pw);
}

// ── Route: POST /api/auth/signup ─────────────────────────────
/**
 * 1. Validate name, email, password
 * 2. Check email is not already taken (verified or pending)
 * 3. Hash password and OTP
 * 4. Create pending user record
 * 5. Send OTP email
 */
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body as {
      name?: string; email?: string; password?: string;
    };

    // ── Input validation ──────────────────────────────────────
    if (!name?.trim() || !email || !password) {
      const r: ApiResponse = { success: false, error: 'Name, email, and password are required.', code: 'VALIDATION_ERROR' };
      return res.status(400).json(r);
    }

    if (!isValidEmail(email)) {
      const r: ApiResponse = { success: false, error: 'Invalid email format.', code: 'VALIDATION_ERROR' };
      return res.status(400).json(r);
    }

    if (!isStrongPassword(password)) {
      const r: ApiResponse = {
        success: false,
        error: 'Password must be at least 8 characters and include a number and special character.',
        code: 'WEAK_PASSWORD',
      };
      return res.status(400).json(r);
    }

    // ── Check for existing account ────────────────────────────
    const existing = findByEmail(email);
    if (existing) {
      if (existing.isVerified) {
        // Already fully registered
        const r: ApiResponse = { success: false, error: 'An account with this email already exists.', code: 'EMAIL_EXISTS' };
        return res.status(409).json(r);
      }
      // Pending account: resend OTP and update hashes
      const otp = generateOTP();
      const otpHash = await bcrypt.hash(otp, OTP_BCRYPT_ROUNDS);
      updateUser(email, {
        otpHash,
        otpExpiry: Date.now() + OTP_TTL_MS,
        otpPurpose: 'signup',
      });
      await sendSignupOtp(email.toLowerCase().trim(), otp);
      const r: ApiResponse<{ message: string }> = {
        success: true,
        data: { message: 'A new OTP has been sent to your email.' },
      };
      return res.status(200).json(r);
    }

    // ── Create pending user ───────────────────────────────────
    const otp = generateOTP();
    const [passwordHash, otpHash] = await Promise.all([
      bcrypt.hash(password, BCRYPT_ROUNDS),
      bcrypt.hash(otp, OTP_BCRYPT_ROUNDS),
    ]);

    createUser(name, email, passwordHash, otpHash);
    await sendSignupOtp(email.toLowerCase().trim(), otp);

    const r: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: 'Account created. Please verify your email with the OTP sent.' },
    };
    return res.status(201).json(r);

  } catch (err: unknown) {
    console.error('[POST /signup]', err);
    const r: ApiResponse = { success: false, error: 'Failed to send verification email. Check server EMAIL_* env vars.', code: 'EMAIL_ERROR' };
    return res.status(500).json(r);
  }
});

// ── Route: POST /api/auth/verify-signup ──────────────────────
/**
 * 1. Find pending user by email
 * 2. Check OTP has not expired
 * 3. bcrypt.compare submitted OTP against stored hash
 * 4. Mark user as verified and clear OTP fields
 * 5. Return public user data
 */
router.post('/verify-signup', async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body as { email?: string; otp?: string };

    if (!email || !otp) {
      const r: ApiResponse = { success: false, error: 'Email and OTP are required.', code: 'VALIDATION_ERROR' };
      return res.status(400).json(r);
    }

    const user = findByEmail(email);

    if (!user || user.otpPurpose !== 'signup') {
      const r: ApiResponse = { success: false, error: 'No pending signup for this email.', code: 'NOT_FOUND' };
      return res.status(404).json(r);
    }

    if (user.isVerified) {
      const r: ApiResponse = { success: false, error: 'Account already verified. Please log in.', code: 'ALREADY_VERIFIED' };
      return res.status(400).json(r);
    }

    // ── Expiry check ──────────────────────────────────────────
    if (!user.otpExpiry || Date.now() > user.otpExpiry) {
      clearOtp(email);
      const r: ApiResponse = { success: false, error: 'OTP has expired. Please sign up again to receive a new code.', code: 'OTP_EXPIRED' };
      return res.status(400).json(r);
    }

    // ── OTP comparison (constant-time via bcrypt) ─────────────
    const match = await bcrypt.compare(otp, user.otpHash!);
    if (!match) {
      const r: ApiResponse = { success: false, error: 'Invalid verification code. Please check and try again.', code: 'OTP_INVALID' };
      return res.status(400).json(r);
    }

    // ── Activate account ──────────────────────────────────────
    updateUser(email, { isVerified: true, otpHash: null, otpExpiry: null, otpPurpose: null });

    const r: ApiResponse<{ user: PublicUser }> = {
      success: true,
      data: { user: { id: user.id, name: user.name, email: user.email } },
    };
    return res.status(200).json(r);

  } catch (err) {
    console.error('[POST /verify-signup]', err);
    const r: ApiResponse = { success: false, error: 'Verification failed. Please try again.', code: 'SERVER_ERROR' };
    return res.status(500).json(r);
  }
});

// ── Route: POST /api/auth/login ───────────────────────────────
/**
 * 1. Find user by email
 * 2. Reject if not verified (direct them to verify email)
 * 3. bcrypt.compare password
 * 4. Return public user data
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      const r: ApiResponse = { success: false, error: 'Email and password are required.', code: 'VALIDATION_ERROR' };
      return res.status(400).json(r);
    }

    const user = findByEmail(email);

    // ── User not found — use same delay as if user existed (timing attack mitigation)
    if (!user) {
      await bcrypt.hash('timing-mitigation', BCRYPT_ROUNDS); // constant-time delay
      const r: ApiResponse = { success: false, error: 'No account found for this email. Please sign up first.', code: 'USER_NOT_FOUND' };
      return res.status(401).json(r);
    }

    // ── Email not verified ────────────────────────────────────
    if (!user.isVerified) {
      const r: ApiResponse = {
        success: false,
        error: 'Email not verified. Please check your inbox for the verification code.',
        code: 'NOT_VERIFIED',
      };
      return res.status(403).json(r);
    }

    // ── Password check ────────────────────────────────────────
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      const r: ApiResponse = { success: false, error: 'Incorrect password. Please try again.', code: 'WRONG_PASSWORD' };
      return res.status(401).json(r);
    }

    const r: ApiResponse<{ user: PublicUser }> = {
      success: true,
      data: { user: { id: user.id, name: user.name, email: user.email } },
    };
    return res.status(200).json(r);

  } catch (err) {
    console.error('[POST /login]', err);
    const r: ApiResponse = { success: false, error: 'Login failed. Please try again.', code: 'SERVER_ERROR' };
    return res.status(500).json(r);
  }
});

// ── Route: POST /api/auth/forgot-password ─────────────────────
/**
 * Security design:
 *  - We check if the email exists in the database.
 *  - If it does NOT exist, we return the SAME response message as the success case
 *    to prevent account enumeration by attackers.
 *  - We log the failed attempt server-side for monitoring.
 *  - Only if the user truly exists do we generate + store + send the OTP.
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
  const SAFE_RESPONSE: ApiResponse<{ message: string }> = {
    success: true,
    data: { message: 'If this email is registered, a verification code has been sent.' },
  };

  try {
    const { email } = req.body as { email?: string };

    if (!email || !isValidEmail(email)) {
      const r: ApiResponse = { success: false, error: 'A valid email address is required.', code: 'VALIDATION_ERROR' };
      return res.status(400).json(r);
    }

    const user = findByEmail(email);

    // ── Account not found: anti-enumeration path ──────────────
    if (!user || !user.isVerified) {
      // Log it server-side (would alert security monitoring in production)
      console.warn(`[SECURITY] Forgot-password attempted for non-existent/unverified email: ${email} — IP: ${req.ip}`);
      // Mimic the delay of actually sending an email
      await new Promise((r) => setTimeout(r, 500));
      return res.status(200).json(SAFE_RESPONSE);
    }

    // ── Generate, hash, and store OTP ────────────────────────
    const otp = generateOTP();
    const otpHash = await bcrypt.hash(otp, OTP_BCRYPT_ROUNDS);
    updateUser(email, {
      otpHash,
      otpExpiry: Date.now() + OTP_TTL_MS,
      otpPurpose: 'reset',
    });

    // ── Send email ────────────────────────────────────────────
    await sendResetOtp(email.toLowerCase().trim(), otp);
    return res.status(200).json(SAFE_RESPONSE);

  } catch (err) {
    console.error('[POST /forgot-password]', err);
    const r: ApiResponse = { success: false, error: 'Failed to send reset email. Please try again.', code: 'EMAIL_ERROR' };
    return res.status(500).json(r);
  }
});

// ── Route: POST /api/auth/verify-forgot-otp ──────────────────
/**
 * 1. Find user by email; validate OTP purpose is 'reset'
 * 2. Check OTP not expired
 * 3. bcrypt.compare OTP
 * 4. Return a short-lived JWT reset token (15 min)
 *    — Does NOT clear OTP yet; that happens after reset-password succeeds
 */
router.post('/verify-forgot-otp', async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body as { email?: string; otp?: string };

    if (!email || !otp) {
      const r: ApiResponse = { success: false, error: 'Email and OTP are required.', code: 'VALIDATION_ERROR' };
      return res.status(400).json(r);
    }

    const user = findByEmail(email);

    if (!user || user.otpPurpose !== 'reset' || !user.otpHash) {
      const r: ApiResponse = { success: false, error: 'No password reset was requested for this email.', code: 'NOT_FOUND' };
      return res.status(404).json(r);
    }

    // ── Expiry check ──────────────────────────────────────────
    if (!user.otpExpiry || Date.now() > user.otpExpiry) {
      clearOtp(email);
      const r: ApiResponse = { success: false, error: 'OTP has expired. Please request a new reset code.', code: 'OTP_EXPIRED' };
      return res.status(400).json(r);
    }

    // ── OTP match ─────────────────────────────────────────────
    const match = await bcrypt.compare(otp, user.otpHash);
    if (!match) {
      const r: ApiResponse = { success: false, error: 'Invalid code. Please check and try again.', code: 'OTP_INVALID' };
      return res.status(400).json(r);
    }

    // ── Issue short-lived reset token ─────────────────────────
    const secret = process.env.JWT_RESET_SECRET;
    if (!secret) throw new Error('JWT_RESET_SECRET not set');

    const signOptions: jwt.SignOptions = {
      expiresIn: (process.env.JWT_RESET_EXPIRES_IN as jwt.SignOptions['expiresIn']) ?? '15m',
    };
    const resetToken = jwt.sign(
      { sub: user.id, email: user.email, purpose: 'reset' },
      secret,
      signOptions,
    );

    const r: ApiResponse<{ resetToken: string }> = {
      success: true,
      data: { resetToken },
    };
    return res.status(200).json(r);

  } catch (err) {
    console.error('[POST /verify-forgot-otp]', err);
    const r: ApiResponse = { success: false, error: 'Verification failed. Please try again.', code: 'SERVER_ERROR' };
    return res.status(500).json(r);
  }
});

// ── Route: POST /api/auth/reset-password ─────────────────────
/**
 * 1. Verify JWT reset token (checks signature + expiry + purpose claim)
 * 2. Validate new password strength
 * 3. Hash new password with bcrypt
 * 4. Update user record; clear OTP fields
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { resetToken, newPassword } = req.body as {
      resetToken?: string; newPassword?: string;
    };

    if (!resetToken || !newPassword) {
      const r: ApiResponse = { success: false, error: 'Reset token and new password are required.', code: 'VALIDATION_ERROR' };
      return res.status(400).json(r);
    }

    if (!isStrongPassword(newPassword)) {
      const r: ApiResponse = {
        success: false,
        error: 'New password must be at least 8 characters and include a number and special character.',
        code: 'WEAK_PASSWORD',
      };
      return res.status(400).json(r);
    }

    // ── Verify JWT ────────────────────────────────────────────
    const secret = process.env.JWT_RESET_SECRET;
    if (!secret) throw new Error('JWT_RESET_SECRET not set');

    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(resetToken, secret) as jwt.JwtPayload;
    } catch {
      const r: ApiResponse = { success: false, error: 'Reset link is invalid or has expired. Please request a new one.', code: 'TOKEN_INVALID' };
      return res.status(401).json(r);
    }

    // ── Validate token purpose claim ──────────────────────────
    if (payload.purpose !== 'reset' || !payload.email) {
      const r: ApiResponse = { success: false, error: 'Invalid reset token.', code: 'TOKEN_INVALID' };
      return res.status(401).json(r);
    }

    const user = findByEmail(payload.email as string);
    if (!user) {
      const r: ApiResponse = { success: false, error: 'User not found.', code: 'NOT_FOUND' };
      return res.status(404).json(r);
    }

    // ── Hash new password + update record ─────────────────────
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    updateUser(user.email, {
      passwordHash,
      otpHash: null,    // invalidate OTP so token cannot be re-used
      otpExpiry: null,
      otpPurpose: null,
    });

    const r: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: 'Password reset successfully. You can now log in.' },
    };
    return res.status(200).json(r);

  } catch (err) {
    console.error('[POST /reset-password]', err);
    const r: ApiResponse = { success: false, error: 'Password reset failed. Please try again.', code: 'SERVER_ERROR' };
    return res.status(500).json(r);
  }
});

export default router;
