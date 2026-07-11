/**
 * types.ts — Shared TypeScript interfaces for the auth server
 */

// ─────────────────────────────────────────────────────────────
// User stored in the JSON database
// ─────────────────────────────────────────────────────────────
export interface DbUser {
  id: string;
  name: string;
  email: string;          // lowercase + trimmed; unique index
  passwordHash: string;   // bcrypt hash (12 rounds)
  isVerified: boolean;    // true once email-OTP is confirmed

  // OTP fields — null when no pending verification
  otpHash: string | null;   // bcrypt hash of the raw 6-digit OTP
  otpExpiry: number | null; // unix ms timestamp (Date.now() + 5min)
  otpPurpose: 'signup' | 'reset' | null;

  createdAt: number; // unix ms
}

// ─────────────────────────────────────────────────────────────
// Safe public representation (no hashes, no OTP fields)
// ─────────────────────────────────────────────────────────────
export interface PublicUser {
  id: string;
  name: string;
  email: string;
}

// ─────────────────────────────────────────────────────────────
// Standard JSON API envelope
// ─────────────────────────────────────────────────────────────
export interface ApiSuccess<T = undefined> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string; // machine-readable error code for the frontend
}

export type ApiResponse<T = undefined> = ApiSuccess<T> | ApiError;
