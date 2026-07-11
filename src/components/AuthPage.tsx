/**
 * AuthPage.tsx
 * ─────────────────────────────────────────────────────────────
 * Split-screen authentication page — backed by Express API.
 *
 * Left  → Library showcase panel
 * Right → Auth card managing 6 states:
 *   login | signup | signup-otp | forgot-request | forgot-otp | forgot-reset
 *
 * All auth calls go through src/utils/authApi.ts → Express backend.
 * Passwords/OTPs are never processed on the client; only sent to backend.
 */

import {
  useState, useRef, useEffect, useCallback,
  type FormEvent, type KeyboardEvent, type ClipboardEvent,
} from 'react';
import {
  Eye, EyeOff, Mail, Lock, User, Shield, ArrowLeft,
  Loader2, CheckCircle2, BookOpen, Upload, Laptop,
  BookMarked, Sparkles, Library, MailCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  apiLogin, apiSignup, apiVerifySignup,
  apiForgotPassword, apiVerifyForgotOtp, apiResetPassword,
  type AuthUser,
} from '../utils/authApi';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type AuthStep =
  | 'login'
  | 'signup'
  | 'signup-otp'       // ← NEW: email verification after registration
  | 'forgot-request'
  | 'forgot-otp'
  | 'forgot-reset';

interface ValidationErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export type { AuthUser };

interface AuthPageProps {
  onAuthSuccess: (user: AuthUser) => void;
}

// ─────────────────────────────────────────────────────────────
// Validation helpers (client-side only — mirrored on backend)
// ─────────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRONG_PW_RE = /^(?=.*[0-9])(?=.*[!@#$%^&*()\-_+=[\]{};':"\\|,.<>/?]).{8,}$/;

function validateEmail(v: string) {
  if (!v.trim()) return 'Email is required.';
  if (!EMAIL_RE.test(v)) return 'Enter a valid email address.';
}
function validatePassword(v: string) {
  if (!v) return 'Password is required.';
  if (v.length < 8) return 'Minimum 8 characters.';
  if (!STRONG_PW_RE.test(v)) return 'Must include a number and a special character.';
}
function getStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' };
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[!@#$%^&*()\-_+=[\]{};':"\\|,.<>/?]/.test(pw)) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (s <= 1) return { score: s, label: 'Very Weak',    color: '#ef4444' };
  if (s === 2) return { score: s, label: 'Weak',         color: '#f97316' };
  if (s === 3) return { score: s, label: 'Fair',         color: '#eab308' };
  if (s === 4) return { score: s, label: 'Strong',       color: '#22c55e' };
  return           { score: s, label: 'Very Strong',   color: '#10b981' };
}

// ─────────────────────────────────────────────────────────────
// Confetti
// ─────────────────────────────────────────────────────────────
const fireLoginConfetti   = () => confetti({ particleCount: 120, spread: 80,  origin: { y: 0.6  }, colors: ['#f9a8d4','#fbcfe8','#fda4af','#fecdd3'] });
const fireSignupConfetti  = () => confetti({ particleCount: 180, spread: 110, origin: { y: 0.55 }, colors: ['#f9a8d4','#c4b5fd','#6ee7b7','#fda4af','#fde68a'] });
const fireResetConfetti   = () => confetti({ particleCount: 100, spread: 70,  origin: { y: 0.65 }, colors: ['#f9a8d4','#fbcfe8','#fda4af'] });

// ─────────────────────────────────────────────────────────────
// Reusable UI primitives
// ─────────────────────────────────────────────────────────────
interface InputFieldProps {
  id: string; label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
  icon: React.ReactNode; error?: string; rightEl?: React.ReactNode;
  autoComplete?: string; disabled?: boolean;
}
function InputField({ id, label, type, value, onChange, placeholder, icon, error, rightEl, autoComplete, disabled }: InputFieldProps) {
  return (
    <div className="flex flex-col gap-1 w-full">
      <label htmlFor={id} className="text-xs font-semibold tracking-wide" style={{ color: '#8c7a6b' }}>{label}</label>
      <div className="relative flex items-center">
        <span className="absolute left-3 text-rose-300 pointer-events-none">{icon}</span>
        <input
          id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} autoComplete={autoComplete} disabled={disabled}
          className={`w-full pl-10 py-2.5 rounded-xl text-sm font-medium outline-none
            transition-all duration-200 bg-white/60 border placeholder-[#c4b5a8] text-[#5a4a42]
            focus:bg-white/90 focus:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed
            ${rightEl ? 'pr-10' : 'pr-4'}
            ${error ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100'
                    : 'border-rose-200/70 focus:border-rose-300 focus:ring-2 focus:ring-rose-100'}`}
          style={{ fontFamily: 'Quicksand, sans-serif' }}
        />
        {rightEl && <span className="absolute right-3">{rightEl}</span>}
      </div>
      {error && <p className="text-xs text-red-500 font-medium flex items-center gap-1">⚠ {error}</p>}
    </div>
  );
}

function PasswordField({ id, label, value, onChange, error, placeholder, disabled, autoComplete }: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  error?: string; placeholder?: string; disabled?: boolean; autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <InputField id={id} label={label} type={show ? 'text' : 'password'} value={value} onChange={onChange}
      placeholder={placeholder ?? '••••••••'} icon={<Lock size={15} />} error={error}
      disabled={disabled} autoComplete={autoComplete ?? 'current-password'}
      rightEl={
        <button type="button" id={`${id}-toggle`} onClick={() => setShow(s => !s)}
          className="text-[#c4b5a8] hover:text-rose-400 transition-colors" tabIndex={-1}
          aria-label={show ? 'Hide password' : 'Show password'}>
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      }
    />
  );
}

function StrengthMeter({ password }: { password: string }) {
  const s = getStrength(password);
  if (!password) return null;
  return (
    <div className="flex flex-col gap-1 mt-1">
      <div className="h-1.5 rounded-full bg-rose-100 overflow-hidden flex gap-0.5">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="h-full flex-1 rounded-full transition-all duration-300"
            style={{ backgroundColor: i <= s.score ? s.color : 'transparent' }} />
        ))}
      </div>
      <p className="text-[10px] font-semibold" style={{ color: s.color }}>{s.label}</p>
    </div>
  );
}

function SubmitButton({ loading, label, id }: { loading: boolean; label: string; id: string }) {
  return (
    <button id={id} type="submit" disabled={loading}
      className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all duration-200
        bg-gradient-to-r from-rose-400 to-pink-400 hover:from-rose-500 hover:to-pink-500
        shadow-md hover:shadow-lg active:scale-[0.98]
        disabled:opacity-70 disabled:cursor-not-allowed disabled:scale-100
        flex items-center justify-center gap-2"
      style={{ letterSpacing: '0.04em' }}>
      {loading && <Loader2 size={16} className="animate-spin" />}
      {loading ? 'Please wait…' : label}
    </button>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 font-medium leading-relaxed">
      ⚠ {msg}
    </p>
  );
}

// ─────────────────────────────────────────────────────────────
// Shared OTP input block (used for both signup-otp + forgot-otp)
// ─────────────────────────────────────────────────────────────
const OTP_LEN  = 6;
const OTP_SECS = 300; // 5 minutes

interface OtpBlockProps {
  email: string;
  onVerified: (payload?: string) => void; // payload = resetToken for forgot flow
  onResend: () => Promise<void>;
  onVerify: (otp: string) => Promise<string | void>;
  onBack: () => void;
  backLabel?: string;
}

function OtpBlock({ email, onVerified, onResend, onVerify, onBack, backLabel = 'Change Email' }: OtpBlockProps) {
  const [digits, setDigits]           = useState<string[]>(Array(OTP_LEN).fill(''));
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [resendLoading, setResendLoad] = useState(false);
  const [timeLeft, setTimeLeft]       = useState(OTP_SECS);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [timeLeft]);

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const handleChange = (i: number, val: string) => {
    const d = val.replace(/\D/g, '').slice(-1);
    const next = [...digits]; next[i] = d; setDigits(next); setError('');
    if (d && i < OTP_LEN - 1) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowLeft'  && i > 0)           refs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < OTP_LEN - 1) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LEN);
    const next = Array(OTP_LEN).fill('');
    pasted.split('').forEach((c, i) => { next[i] = c; });
    setDigits(next);
    refs.current[Math.min(pasted.length, OTP_LEN - 1)]?.focus();
  };

  const handleResend = async () => {
    setResendLoad(true);
    try {
      await onResend();
      setTimeLeft(OTP_SECS);
      setDigits(Array(OTP_LEN).fill(''));
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend. Try again.');
    } finally { setResendLoad(false); }
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    const code = digits.join('');
    if (code.length < OTP_LEN) { setError('Please enter all 6 digits.'); return; }
    setLoading(true);
    try {
      const payload = await onVerify(code);
      onVerified(typeof payload === 'string' ? payload : undefined);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid code. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 w-full">
      <p className="text-xs text-[#a8998e] text-center leading-relaxed">
        A 6-digit code was sent to{' '}
        <span className="font-bold text-rose-400">{email}</span>.
      </p>

      {/* OTP Digit Boxes */}
      <div className="flex gap-2 justify-center" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i} ref={el => { refs.current[i] = el; }}
            id={`otp-digit-${i}`} type="text" inputMode="numeric" maxLength={1}
            value={d} onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)} disabled={loading}
            aria-label={`OTP digit ${i + 1}`}
            className={`w-11 text-center text-lg font-bold rounded-xl border-2 outline-none
              transition-all duration-200 bg-white/60 text-[#5a4a42] caret-rose-400
              focus:bg-white focus:scale-105 focus:shadow-md disabled:opacity-50
              ${d ? 'border-rose-300' : 'border-rose-200/60'}
              ${error ? 'border-red-300' : ''}`}
            style={{ height: '3.25rem', fontFamily: 'Quicksand, sans-serif' }}
          />
        ))}
      </div>

      {error && <p className="text-xs text-red-500 text-center font-medium">⚠ {error}</p>}

      {/* Countdown + Resend */}
      <div className="flex flex-col items-center gap-1.5">
        <div className={`flex items-center gap-1.5 text-sm font-bold ${timeLeft <= 30 ? 'text-red-400' : 'text-[#a8998e]'}`}>
          <Shield size={13} />
          <span>{fmt(timeLeft)}</span>
          <span className="text-xs font-normal">remaining</span>
        </div>
        <button type="button" id="resend-otp" onClick={handleResend}
          disabled={timeLeft > 0 || resendLoading}
          className="text-xs font-bold text-rose-400 hover:text-rose-600 transition-colors
            underline underline-offset-2
            disabled:text-[#c4b5a8] disabled:cursor-not-allowed disabled:no-underline">
          {resendLoading ? 'Resending…' : timeLeft > 0 ? `Resend in ${fmt(timeLeft)}` : 'Resend Code'}
        </button>
      </div>

      <SubmitButton loading={loading} label="Verify Code" id="verify-otp-btn" />
      <button type="button" id="otp-back-btn" onClick={onBack}
        className="flex items-center justify-center gap-1.5 text-xs text-[#a8998e] hover:text-rose-400 transition-colors font-semibold">
        <ArrowLeft size={13} /> {backLabel}
      </button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────
// Left Panel (showcase)
// ─────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: Upload,     title: 'Upload Your PDF Collection', desc: 'Drag & drop any PDF book instantly. Your files stay on your device.' },
  { icon: Laptop,     title: 'Read Seamlessly Anywhere',   desc: 'Smooth reader with zoom, highlights, and page stickers.' },
  { icon: BookMarked, title: 'Organize Your Bookshelf',    desc: 'Drag books across cozy shelves, add plants, trinkets, and themes.' },
];

function ShowcasePanel() {
  return (
    <div className="hidden lg:flex flex-col justify-between h-full p-12 relative overflow-hidden"
      style={{ background: 'linear-gradient(145deg, #1a0a2e 0%, #2d1145 40%, #4a1a6e 80%, #6b2d9e 100%)' }}>
      <div className="absolute top-[-8%] left-[-8%] w-72 h-72 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #fda4af, #f9a8d4)' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #c4b5fd, #818cf8)' }} />

      <div className="relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #fda4af, #f9a8d4)' }}>
            <Library size={20} className="text-white" />
          </div>
          <span className="text-white font-bold text-xl"
            style={{ fontFamily: 'Playfair Display, serif', letterSpacing: '-0.02em' }}>
            Cozy Library
          </span>
        </div>

        {/* Headline */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white leading-tight mb-4"
            style={{ fontFamily: 'Playfair Display, serif', letterSpacing: '-0.03em' }}>
            Your Personal<br />
            <span className="text-transparent bg-clip-text"
              style={{ backgroundImage: 'linear-gradient(90deg, #f9a8d4, #fda4af, #c4b5fd)' }}>
              Digital Sanctuary
            </span>
          </h1>
          <p className="text-white/60 text-sm leading-relaxed font-medium"
            style={{ fontFamily: 'Quicksand, sans-serif' }}>
            A beautifully cozy space to store, read, and organize your personal PDF collection.
          </p>
        </div>

        {/* Features */}
        <div className="flex flex-col gap-5">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex gap-4 items-start">
              <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center mt-0.5"
                style={{ background: 'rgba(253,164,175,0.18)', border: '1px solid rgba(253,164,175,0.25)' }}>
                <Icon size={16} className="text-rose-300" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm mb-0.5" style={{ fontFamily: 'Quicksand, sans-serif' }}>{title}</p>
                <p className="text-white/50 text-xs leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer badge */}
      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.5)', fontFamily: 'Quicksand, sans-serif' }}>
          <Shield size={11} />
          Secured by bcrypt + JWT — emails verified server-side
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Step A — Login
// ─────────────────────────────────────────────────────────────
function LoginStep({ onSuccess, onGoSignup, onGoForgot, onUnverifiedUser, successMessage, onClearSuccess, prefilledEmail }: {
  onSuccess: (u: AuthUser) => void; onGoSignup: () => void; onGoForgot: () => void;
  onUnverifiedUser: (email: string) => void;
  successMessage?: string;
  onClearSuccess?: () => void;
  prefilledEmail?: string;
}) {
  const [email, setEmail]       = useState(prefilledEmail ?? '');
  const [password, setPassword] = useState('');
  const [errors, setErrors]     = useState<ValidationErrors>({});
  const [loading, setLoading]   = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    if (prefilledEmail) {
      setEmail(prefilledEmail);
    }
  }, [prefilledEmail]);

  const validate = () => {
    const e: ValidationErrors = {};
    const em = validateEmail(email); if (em) e.email = em;
    if (!password) e.password = 'Password is required.';
    setErrors(e); return !Object.keys(e).length;
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault(); setApiError('');
    if (onClearSuccess) onClearSuccess();
    if (!validate()) return;
    setLoading(true);
    try {
      const user = await apiLogin(email, password);
      fireLoginConfetti();
      onSuccess(user);
    } catch (err: unknown) {
      const e = err as Error & { code?: string };
      if (e.code === 'USER_NOT_FOUND') setApiError('No account found for this email. Please sign up first.');
      else if (e.code === 'WRONG_PASSWORD') setApiError('Incorrect password. Please try again.');
      else if (e.code === 'NOT_VERIFIED') {
        onUnverifiedUser(email);
      }
      else setApiError(e.message || 'Login failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 w-full">
      {successMessage && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 text-xs text-green-700 font-semibold">
          <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      <InputField id="login-email" label="Email Address" type="email" value={email}
        onChange={v => {
          setEmail(v);
          setErrors(e => ({ ...e, email: undefined }));
          setApiError('');
          if (onClearSuccess) onClearSuccess();
        }}
        placeholder="you@example.com" icon={<Mail size={15} />} error={errors.email}
        autoComplete="email" disabled={loading} />
      <PasswordField id="login-password" label="Password" value={password}
        onChange={v => {
          setPassword(v);
          setErrors(e => ({ ...e, password: undefined }));
          setApiError('');
          if (onClearSuccess) onClearSuccess();
        }}
        error={errors.password} disabled={loading} />
      <div className="flex justify-end -mt-1">
        <button type="button" id="forgot-password-link" onClick={onGoForgot}
          className="text-xs font-semibold text-rose-400 hover:text-rose-600 transition-colors underline underline-offset-2">
          Forgot Password?
        </button>
      </div>
      <ErrorBanner msg={apiError} />
      <SubmitButton loading={loading} label="Sign In to My Library" id="login-submit-btn" />
      <p className="text-center text-xs text-[#a8998e]">
        Don't have an account?{' '}
        <button type="button" id="go-signup-link" onClick={onGoSignup}
          className="font-bold text-rose-400 hover:text-rose-600 transition-colors">Create one</button>
      </p>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────
// Step B — Sign Up (submits → backend sends OTP email)
// ─────────────────────────────────────────────────────────────
function SignupStep({ onOtpSent, onGoLogin }: {
  onOtpSent: (email: string) => void; onGoLogin: () => void;
}) {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [errors, setErrors]     = useState<ValidationErrors>({});
  const [loading, setLoading]   = useState(false);
  const [apiError, setApiError] = useState('');

  const validate = () => {
    const e: ValidationErrors = {};
    if (!name.trim()) e.name = 'Full name is required.';
    const em = validateEmail(email); if (em) e.email = em;
    const pm = validatePassword(password); if (pm) e.password = pm;
    if (!confirm) e.confirmPassword = 'Please confirm your password.';
    else if (confirm !== password) e.confirmPassword = 'Passwords do not match.';
    setErrors(e); return !Object.keys(e).length;
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault(); setApiError('');
    if (!validate()) return;
    setLoading(true);
    try {
      await apiSignup(name, email, password);
      onOtpSent(email); // move to signup-otp step
    } catch (err: unknown) {
      const e = err as Error & { code?: string };
      if (e.code === 'EMAIL_EXISTS') setApiError('An account with this email already exists. Please log in.');
      else setApiError(e.message || 'Sign-up failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3.5 w-full">
      <InputField id="signup-name" label="Full Name" type="text" value={name}
        onChange={v => { setName(v); setErrors(e => ({ ...e, name: undefined })); }}
        placeholder="Your Name" icon={<User size={15} />} error={errors.name}
        autoComplete="name" disabled={loading} />
      <InputField id="signup-email" label="Email Address" type="email" value={email}
        onChange={v => { setEmail(v); setErrors(e => ({ ...e, email: undefined })); setApiError(''); }}
        placeholder="you@example.com" icon={<Mail size={15} />} error={errors.email}
        autoComplete="email" disabled={loading} />
      <div>
        <PasswordField id="signup-password" label="Password" value={password}
          onChange={v => { setPassword(v); setErrors(e => ({ ...e, password: undefined })); }}
          error={errors.password} placeholder="8+ chars, number & symbol"
          autoComplete="new-password" disabled={loading} />
        <StrengthMeter password={password} />
      </div>
      <PasswordField id="signup-confirm" label="Confirm Password" value={confirm}
        onChange={v => { setConfirm(v); setErrors(e => ({ ...e, confirmPassword: undefined })); }}
        error={errors.confirmPassword} placeholder="Re-enter password"
        autoComplete="new-password" disabled={loading} />
      <ErrorBanner msg={apiError} />
      <SubmitButton loading={loading} label="Create Account & Send Code" id="signup-submit-btn" />
      <p className="text-center text-xs text-[#a8998e]">
        Already have an account?{' '}
        <button type="button" id="go-login-link" onClick={onGoLogin}
          className="font-bold text-rose-400 hover:text-rose-600 transition-colors">Sign in</button>
      </p>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────
// Step B2 — Signup OTP Verification
// ─────────────────────────────────────────────────────────────
function SignupOtpStep({ email, onVerified, onBack }: {
  email: string; onVerified: () => void; onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {/* Info banner */}
      <div className="flex items-start gap-3 bg-rose-50/60 border border-rose-200/60 rounded-xl p-3.5 mb-1">
        <MailCheck size={16} className="text-rose-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-[#8c7a6b] leading-relaxed">
          Your account has been created! Verify your email to activate it.
          The code expires in <strong>5 minutes</strong>.
        </p>
      </div>
      <OtpBlock
        email={email}
        onVerified={() => {}} // handled inside onVerify resolve
        onResend={() => apiSignup('', email, '')} // resend triggers backend to resend
        onVerify={async (otp) => {
          await apiVerifySignup(email, otp);
          fireSignupConfetti();
          // Small delay so confetti is visible before state change
          await new Promise(r => setTimeout(r, 400));
          onVerified();
        }}
        onBack={onBack}
        backLabel="Back to Sign Up"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Step C — Forgot: Request OTP
// ─────────────────────────────────────────────────────────────
function ForgotRequestStep({ onOtpSent, onBack }: {
  onOtpSent: (email: string) => void; onBack: () => void;
}) {
  const [email, setEmail]       = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    const em = validateEmail(email); if (em) { setError(em); return; }
    setLoading(true);
    try {
      await apiForgotPassword(email);
      // Always proceed (anti-enumeration — backend returns same response for unknown emails)
      onOtpSent(email);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send code. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 w-full">
      <p className="text-xs text-[#a8998e] leading-relaxed">
        Enter your registered email. If an account exists, a verification code will be sent to it.
      </p>
      <InputField id="forgot-email" label="Registered Email" type="email" value={email}
        onChange={v => { setEmail(v); setError(''); }} placeholder="you@example.com"
        icon={<Mail size={15} />} error={error} autoComplete="email" disabled={loading} />
      <SubmitButton loading={loading} label="Send Verification Code" id="send-otp-btn" />
      <button type="button" id="back-to-login" onClick={onBack}
        className="flex items-center justify-center gap-1.5 text-xs text-[#a8998e] hover:text-rose-400 transition-colors font-semibold">
        <ArrowLeft size={13} /> Back to Login
      </button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────
// Step E — Forgot: Reset Password
// ─────────────────────────────────────────────────────────────
function ForgotResetStep({ email, resetToken, onDone }: {
  email: string; resetToken: string; onDone: () => void;
}) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [errors, setErrors]     = useState<ValidationErrors>({});
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [apiError, setApiError] = useState('');

  const validate = () => {
    const e: ValidationErrors = {};
    const pm = validatePassword(password); if (pm) e.password = pm;
    if (!confirm) e.confirmPassword = 'Please confirm your password.';
    else if (confirm !== password) e.confirmPassword = 'Passwords do not match.';
    setErrors(e); return !Object.keys(e).length;
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault(); setApiError('');
    if (!validate()) return;
    setLoading(true);
    try {
      await apiResetPassword(resetToken, password);
      setSuccess(true);
      fireResetConfetti();
      setTimeout(onDone, 2200);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Password reset failed. Please try again.');
    } finally { setLoading(false); }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="text-green-500" size={36} />
        </div>
        <p className="text-[#5a4a42] font-bold text-base">Password Updated!</p>
        <p className="text-xs text-[#a8998e]">Redirecting to login…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 w-full">
      <p className="text-xs text-[#a8998e] leading-relaxed">
        Set a new password for <span className="font-bold text-rose-400">{email}</span>.
      </p>
      <div>
        <PasswordField id="reset-password" label="New Password" value={password}
          onChange={v => { setPassword(v); setErrors(e => ({ ...e, password: undefined })); }}
          error={errors.password} placeholder="8+ chars, number & symbol"
          autoComplete="new-password" disabled={loading} />
        <StrengthMeter password={password} />
      </div>
      <PasswordField id="reset-confirm" label="Confirm New Password" value={confirm}
        onChange={v => { setConfirm(v); setErrors(e => ({ ...e, confirmPassword: undefined })); }}
        error={errors.confirmPassword} autoComplete="new-password" disabled={loading} />
      <ErrorBanner msg={apiError} />
      <SubmitButton loading={loading} label="Reset Password" id="reset-pw-btn" />
    </form>
  );
}

// ─────────────────────────────────────────────────────────────
// Step header metadata
// ─────────────────────────────────────────────────────────────
function getStepMeta(step: AuthStep) {
  switch (step) {
    case 'login':           return { icon: BookOpen,   title: 'Welcome Back',        subtitle: 'Sign in to your cozy library' };
    case 'signup':          return { icon: Sparkles,   title: 'Join the Library',    subtitle: 'Create your reading sanctuary' };
    case 'signup-otp':      return { icon: MailCheck,  title: 'Verify Your Email',   subtitle: 'Enter the code we sent to activate your account' };
    case 'forgot-request':  return { icon: Mail,       title: 'Forgot Password?',    subtitle: "We'll send a verification code" };
    case 'forgot-otp':      return { icon: Shield,     title: 'Check Your Email',    subtitle: 'Enter the 6-digit reset code' };
    case 'forgot-reset':    return { icon: Lock,       title: 'Set New Password',    subtitle: 'Make it strong and memorable' };
  }
}

// ─────────────────────────────────────────────────────────────
// Root AuthPage
// ─────────────────────────────────────────────────────────────
export function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [step, setStep]               = useState<AuthStep>('login');
  const [signupEmail, setSignupEmail] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken]   = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [emailForLogin, setEmailForLogin]   = useState('');
  const [animKey, setAnimKey]         = useState(0);

  const goTo = useCallback((next: AuthStep) => {
    setStep(next);
    setAnimKey(k => k + 1);
  }, []);

  const meta = getStepMeta(step);
  const StepIcon = meta.icon;
  const isForgotFlow = step === 'forgot-request' || step === 'forgot-otp' || step === 'forgot-reset';
  const isSignupFlow = step === 'signup' || step === 'signup-otp';

  return (
    <div className="min-h-screen w-full flex" style={{ fontFamily: 'Quicksand, sans-serif' }}>
      {/* ── LEFT: showcase ── */}
      <div className="hidden lg:block w-1/2 flex-shrink-0">
        <ShowcasePanel />
      </div>

      {/* ── RIGHT: auth card ── */}
      <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #FDF6F0 0%, #FAECEB 50%, #F2EFFF 100%)' }}>
        {/* Ambient blobs */}
        <div className="absolute top-[-8%] right-[-8%] w-80 h-80 rounded-full opacity-25 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #fda4af, #fbcfe8)' }} />
        <div className="absolute bottom-[-10%] left-[-8%] w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #c4b5fd, #ddd6fe)' }} />

        {/* Card */}
        <div className="relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.75)',
            backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.6)',
            boxShadow: '0 32px 64px -12px rgba(168,130,120,0.18), 0 0 0 1px rgba(255,255,255,0.4)',
          }}>
          {/* Rainbow bar */}
          <div className="h-1.5 w-full"
            style={{ background: 'linear-gradient(90deg, #f9a8d4, #fda4af, #c4b5fd, #6ee7b7, #fde68a)' }} />

          <div className="p-8">
            {/* Header */}
            <div className="flex flex-col items-center mb-7">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-md"
                style={{ background: 'linear-gradient(135deg, #fda4af, #f9a8d4)' }}>
                <StepIcon className="text-white" size={26} />
              </div>
              <h2 className="text-xl font-bold text-center"
                style={{ color: '#5a4a42', fontFamily: 'Playfair Display, serif', letterSpacing: '-0.02em' }}>
                {meta.title}
              </h2>
              <p className="text-xs text-[#a8998e] mt-1 text-center font-medium">{meta.subtitle}</p>

              {/* Progress dots for multi-step flows */}
              {(isForgotFlow || isSignupFlow) && (
                <div className="flex gap-2 mt-3 items-center">
                  {(isForgotFlow
                    ? (['forgot-request','forgot-otp','forgot-reset'] as AuthStep[])
                    : (['signup','signup-otp'] as AuthStep[])
                  ).map((s, i) => (
                    <div key={i} className="rounded-full transition-all duration-300"
                      style={{ width: step === s ? '20px' : '6px', height: '6px',
                        background: step === s ? '#fda4af' : '#f5c7ca' }} />
                  ))}
                </div>
              )}
            </div>

            {/* Step content — keyed for fade-in on transition */}
            <div key={animKey} style={{ animation: 'auth-fade-up 0.28s ease-out both' }}>
              {step === 'login' && (
                <LoginStep
                  onSuccess={onAuthSuccess}
                  onGoSignup={() => goTo('signup')}
                  onGoForgot={() => goTo('forgot-request')}
                  onUnverifiedUser={(email) => {
                    setSignupEmail(email);
                    goTo('signup-otp');
                  }}
                  successMessage={successMessage}
                  onClearSuccess={() => setSuccessMessage('')}
                  prefilledEmail={emailForLogin}
                />
              )}
              {step === 'signup' && (
                <SignupStep
                  onOtpSent={(email) => { setSignupEmail(email); goTo('signup-otp'); }}
                  onGoLogin={() => goTo('login')}
                />
              )}
              {step === 'signup-otp' && (
                <SignupOtpStep
                  email={signupEmail}
                  onVerified={() => {
                    setEmailForLogin(signupEmail);
                    setSuccessMessage('Email verified successfully! Please log in.');
                    goTo('login');
                  }}
                  onBack={() => goTo('signup')}
                />
              )}
              {step === 'forgot-request' && (
                <ForgotRequestStep
                  onOtpSent={(email) => { setForgotEmail(email); goTo('forgot-otp'); }}
                  onBack={() => goTo('login')}
                />
              )}
              {step === 'forgot-otp' && (
                <OtpBlock
                  email={forgotEmail}
                  onVerified={(token) => { if (token) setResetToken(token); goTo('forgot-reset'); }}
                  onResend={() => apiForgotPassword(forgotEmail)}
                  onVerify={(otp) => apiVerifyForgotOtp(forgotEmail, otp)}
                  onBack={() => goTo('forgot-request')}
                />
              )}
              {step === 'forgot-reset' && (
                <ForgotResetStep
                  email={forgotEmail}
                  resetToken={resetToken}
                  onDone={() => {
                    setEmailForLogin(forgotEmail);
                    setSuccessMessage('Password reset successfully! Please log in with your new password.');
                    goTo('login');
                  }}
                />
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-3 text-center text-[10px] text-[#c4b5a8] border-t"
            style={{ borderColor: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.3)' }}>
            🔒 Passwords hashed with bcrypt · OTPs verified server-side
          </div>
        </div>
      </div>
    </div>
  );
}
