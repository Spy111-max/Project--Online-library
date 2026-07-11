/**
 * authApi.ts
 * ─────────────────────────────────────────────────────────────
 * Typed fetch wrappers for all auth backend endpoints.
 * Throws Error with machine-readable `code` for UI error mapping.
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001') + '/api/auth';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface ApiSuccess<T> { success: true; data: T; }
interface ApiError      { success: false; error: string; code?: string; }
type ApiEnvelope<T>   = ApiSuccess<T> | ApiError;

// ─────────────────────────────────────────────────────────────
// Core fetch helper
// ─────────────────────────────────────────────────────────────
async function post<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    // Network-level failure (server down, no CORS, etc.)
    throw Object.assign(
      new Error('Cannot reach the server. Make sure the backend is running on port 3001.'),
      { code: 'NETWORK_ERROR' },
    );
  }

  const json = (await res.json()) as ApiEnvelope<T>;

  if (!json.success) {
    const errorData = json as ApiError;
    throw Object.assign(new Error(errorData.error ?? 'Request failed'), {
      code: errorData.code,
    });
  }

  return (json as ApiSuccess<T>).data;
}

// ─────────────────────────────────────────────────────────────
// Public API functions
// ─────────────────────────────────────────────────────────────

/** Register a new user. Backend sends OTP email. */
export async function apiSignup(
  name: string, email: string, password: string,
): Promise<void> {
  await post<{ message: string }>('/signup', { name, email, password });
}

/** Verify the signup OTP. Returns the activated user on success. */
export async function apiVerifySignup(
  email: string, otp: string,
): Promise<AuthUser> {
  const data = await post<{ user: AuthUser }>('/verify-signup', { email, otp });
  return data.user;
}

/** Authenticate a verified user. Returns user data. */
export async function apiLogin(
  email: string, password: string,
): Promise<AuthUser> {
  const data = await post<{ user: AuthUser }>('/login', { email, password });
  return data.user;
}

/**
 * Request a password-reset OTP.
 * Always resolves (anti-enumeration: backend returns same msg whether email exists or not).
 */
export async function apiForgotPassword(email: string): Promise<void> {
  await post<{ message: string }>('/forgot-password', { email });
}

/** Verify reset OTP. Returns a short-lived JWT reset token. */
export async function apiVerifyForgotOtp(
  email: string, otp: string,
): Promise<string> {
  const data = await post<{ resetToken: string }>('/verify-forgot-otp', { email, otp });
  return data.resetToken;
}

/** Reset password using the JWT reset token. */
export async function apiResetPassword(
  resetToken: string, newPassword: string,
): Promise<void> {
  await post<{ message: string }>('/reset-password', { resetToken, newPassword });
}
