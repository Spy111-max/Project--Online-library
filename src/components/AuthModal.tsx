import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Eye, EyeOff, Mail, Lock, User, Shield, ArrowLeft,
  Loader2, CheckCircle2, BookOpen, Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import emailjs from '@emailjs/browser';
import { EMAILJS_CONFIG } from '../utils/emailjs.config';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type AuthStep = 'login' | 'signup' | 'forgot-request' | 'forgot-otp' | 'forgot-reset';

interface ValidationErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  otp?: string;
}

interface AuthModalProps {
  onAuthSuccess: (user: { name: string; email: string }) => void;
}

// ─────────────────────────────────────────────────────────────
// Validation Helpers
// ─────────────────────────────────────────────────────────────
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const strongPasswordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>/?]).{8,}$/;

function validateEmail(email: string): string | undefined {
  if (!email.trim()) return 'Email is required.';
  if (!emailRegex.test(email)) return 'Please enter a valid email address.';
}

function validatePassword(password: string): string | undefined {
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!strongPasswordRegex.test(password))
    return 'Must include at least one number and one special character.';
}

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>/?]/.test(password)) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;

  if (score <= 1) return { score, label: 'Very Weak', color: '#ef4444' };
  if (score === 2) return { score, label: 'Weak', color: '#f97316' };
  if (score === 3) return { score, label: 'Fair', color: '#eab308' };
  if (score === 4) return { score, label: 'Strong', color: '#22c55e' };
  return { score, label: 'Very Strong', color: '#10b981' };
}

// ─────────────────────────────────────────────────────────────
// OTP Store — module-level so it persists across re-renders
// ─────────────────────────────────────────────────────────────
let _currentOtp = '';
let _otpExpiry = 0; // unix ms timestamp

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─────────────────────────────────────────────────────────────
// API Handlers
// ─────────────────────────────────────────────────────────────
async function handleLogin(email: string, _password: string): Promise<{ name: string; email: string }> {
  // TODO: replace with real backend call
  await new Promise((res) => setTimeout(res, 800));
  return { name: email.split('@')[0], email };
}

async function handleSignUp(name: string, email: string, _password: string): Promise<{ name: string; email: string }> {
  // TODO: replace with real backend call
  await new Promise((res) => setTimeout(res, 800));
  return { name, email };
}

/** Generates a fresh OTP, stores it with a 5-min expiry, and emails it via EmailJS. */
async function sendOTPEmail(email: string): Promise<void> {
  const otp = generateOTP();
  _currentOtp = otp;
  _otpExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes

  await emailjs.send(
    EMAILJS_CONFIG.SERVICE_ID,
    EMAILJS_CONFIG.TEMPLATE_ID,
    { to_email: email, otp_code: otp },
    EMAILJS_CONFIG.PUBLIC_KEY
  );
}

/** Verifies the entered OTP against the stored one. Throws on mismatch or expiry. */
function verifyOTP(entered: string): void {
  if (Date.now() > _otpExpiry) {
    _currentOtp = '';
    throw new Error('OTP expired.');
  }
  if (entered !== _currentOtp) {
    throw new Error('Invalid OTP.');
  }
  _currentOtp = ''; // consume the OTP
}

async function handleResetPassword(_email: string, _newPassword: string): Promise<void> {
  // TODO: replace with real backend call
  await new Promise((res) => setTimeout(res, 800));
}

// ─────────────────────────────────────────────────────────────
// Reusable Sub-components
// ─────────────────────────────────────────────────────────────
interface InputFieldProps {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon: React.ReactNode;
  error?: string;
  rightEl?: React.ReactNode;
  autoComplete?: string;
  disabled?: boolean;
}

function InputField({
  id, label, type, value, onChange, placeholder, icon, error, rightEl, autoComplete, disabled
}: InputFieldProps) {
  return (
    <div className="flex flex-col gap-1 w-full">
      <label htmlFor={id} className="text-xs font-semibold tracking-wide" style={{ color: '#8c7a6b' }}>
        {label}
      </label>
      <div className="relative flex items-center">
        <span className="absolute left-3 text-rose-300 pointer-events-none">{icon}</span>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          className={`w-full pl-10 pr-${rightEl ? '10' : '4'} py-2.5 rounded-xl text-sm font-medium outline-none transition-all duration-200
            bg-white/50 border placeholder-[#c4b5a8] text-[#5a4a42]
            focus:bg-white/80 focus:shadow-sm
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error
              ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100'
              : 'border-rose-200/70 focus:border-rose-300 focus:ring-2 focus:ring-rose-100'
            }`}
          style={{ fontFamily: 'Quicksand, sans-serif' }}
        />
        {rightEl && (
          <span className="absolute right-3">{rightEl}</span>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-500 font-medium flex items-center gap-1" id={`${id}-error`}>
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}

function PasswordField({
  id, label, value, onChange, error, placeholder, disabled
}: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  error?: string; placeholder?: string; disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <InputField
      id={id}
      label={label}
      type={show ? 'text' : 'password'}
      value={value}
      onChange={onChange}
      placeholder={placeholder ?? '••••••••'}
      icon={<Lock size={15} />}
      error={error}
      disabled={disabled}
      autoComplete={id.includes('confirm') ? 'new-password' : id.includes('new') ? 'new-password' : 'current-password'}
      rightEl={
        <button
          type="button"
          id={`${id}-toggle`}
          onClick={() => setShow((s) => !s)}
          className="text-[#c4b5a8] hover:text-rose-400 transition-colors"
          tabIndex={-1}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      }
    />
  );
}

function SubmitButton({ loading, label, id }: { loading: boolean; label: string; id: string }) {
  return (
    <button
      id={id}
      type="submit"
      disabled={loading}
      className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all duration-200
        bg-gradient-to-r from-rose-400 to-pink-400 hover:from-rose-500 hover:to-pink-500
        shadow-md hover:shadow-lg active:scale-[0.98]
        disabled:opacity-70 disabled:cursor-not-allowed disabled:scale-100
        flex items-center justify-center gap-2"
      style={{ letterSpacing: '0.04em' }}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : null}
      {loading ? 'Please wait…' : label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Step A: Login
// ─────────────────────────────────────────────────────────────
function LoginStep({
  onSuccess, onGoSignup, onGoForgot
}: {
  onSuccess: (user: { name: string; email: string }) => void;
  onGoSignup: () => void;
  onGoForgot: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const validate = (): boolean => {
    const e: ValidationErrors = {};
    const emailErr = validateEmail(email);
    if (emailErr) e.email = emailErr;
    if (!password) e.password = 'Password is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setApiError('');
    if (!validate()) return;
    setLoading(true);
    try {
      const user = await handleLogin(email, password);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#f9a8d4', '#fbcfe8', '#fda4af', '#fecdd3'] });
      onSuccess(user);
    } catch {
      setApiError('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 w-full">
      <InputField
        id="login-email"
        label="Email Address"
        type="email"
        value={email}
        onChange={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: undefined })); }}
        placeholder="you@example.com"
        icon={<Mail size={15} />}
        error={errors.email}
        autoComplete="email"
        disabled={loading}
      />
      <PasswordField
        id="login-password"
        label="Password"
        value={password}
        onChange={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: undefined })); }}
        error={errors.password}
        disabled={loading}
      />

      <div className="flex justify-end -mt-1">
        <button
          type="button"
          id="forgot-password-link"
          onClick={onGoForgot}
          className="text-xs font-semibold text-rose-400 hover:text-rose-600 transition-colors underline underline-offset-2"
        >
          Forgot Password?
        </button>
      </div>

      {apiError && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 font-medium">
          {apiError}
        </p>
      )}

      <SubmitButton loading={loading} label="Sign In to Library" id="login-submit-btn" />

      <p className="text-center text-xs text-[#a8998e]">
        Don't have an account?{' '}
        <button
          type="button"
          id="go-signup-link"
          onClick={onGoSignup}
          className="font-bold text-rose-400 hover:text-rose-600 transition-colors"
        >
          Create one
        </button>
      </p>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────
// Step B: Sign Up
// ─────────────────────────────────────────────────────────────
function SignupStep({
  onSuccess, onGoLogin
}: {
  onSuccess: (user: { name: string; email: string }) => void;
  onGoLogin: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const strength = getPasswordStrength(password);

  const validate = (): boolean => {
    const e: ValidationErrors = {};
    if (!name.trim()) e.name = 'Full name is required.';
    const emailErr = validateEmail(email);
    if (emailErr) e.email = emailErr;
    const pwdErr = validatePassword(password);
    if (pwdErr) e.password = pwdErr;
    if (!confirmPassword) e.confirmPassword = 'Please confirm your password.';
    else if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setApiError('');
    if (!validate()) return;
    setLoading(true);
    try {
      const user = await handleSignUp(name, email, password);
      confetti({ particleCount: 160, spread: 100, origin: { y: 0.55 }, colors: ['#f9a8d4', '#c4b5fd', '#6ee7b7', '#fda4af', '#fde68a'] });
      onSuccess(user);
    } catch {
      setApiError('Sign-up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3.5 w-full">
      <InputField
        id="signup-name"
        label="Full Name"
        type="text"
        value={name}
        onChange={(v) => { setName(v); setErrors((e) => ({ ...e, name: undefined })); }}
        placeholder="Your Name"
        icon={<User size={15} />}
        error={errors.name}
        autoComplete="name"
        disabled={loading}
      />
      <InputField
        id="signup-email"
        label="Email Address"
        type="email"
        value={email}
        onChange={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: undefined })); }}
        placeholder="you@example.com"
        icon={<Mail size={15} />}
        error={errors.email}
        autoComplete="email"
        disabled={loading}
      />
      <div className="flex flex-col gap-1">
        <PasswordField
          id="signup-password"
          label="Password"
          value={password}
          onChange={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: undefined })); }}
          error={errors.password}
          placeholder="Min 8 chars, number & symbol"
          disabled={loading}
        />
        {/* Password Strength Bar */}
        {password.length > 0 && (
          <div className="flex flex-col gap-1 mt-1">
            <div className="h-1.5 rounded-full bg-rose-100 overflow-hidden flex gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-full flex-1 rounded-full transition-all duration-300"
                  style={{ backgroundColor: i <= strength.score ? strength.color : 'transparent' }}
                />
              ))}
            </div>
            <p className="text-[10px] font-semibold" style={{ color: strength.color }}>
              {strength.label}
            </p>
          </div>
        )}
      </div>
      <PasswordField
        id="signup-confirm-password"
        label="Confirm Password"
        value={confirmPassword}
        onChange={(v) => { setConfirmPassword(v); setErrors((e) => ({ ...e, confirmPassword: undefined })); }}
        error={errors.confirmPassword}
        placeholder="Re-enter your password"
        disabled={loading}
      />

      {apiError && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 font-medium">
          {apiError}
        </p>
      )}

      <SubmitButton loading={loading} label="Create My Library Account" id="signup-submit-btn" />

      <p className="text-center text-xs text-[#a8998e]">
        Already have an account?{' '}
        <button
          type="button"
          id="go-login-link"
          onClick={onGoLogin}
          className="font-bold text-rose-400 hover:text-rose-600 transition-colors"
        >
          Sign in
        </button>
      </p>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────
// Step C: Forgot Password — Request OTP
// ─────────────────────────────────────────────────────────────
function ForgotRequestStep({
  onOtpSent, onBack
}: {
  onOtpSent: (email: string) => void;
  onBack: () => void;
}) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const emailErr = validateEmail(email);
    if (emailErr) { setError(emailErr); return; }
    setLoading(true);
    try {
      await sendOTPEmail(email);
      onOtpSent(email);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('service_id') || msg.includes('template') || msg.includes('public_key') || msg.includes('Invalid')) {
        setError('EmailJS is not configured yet. Please fill in your credentials in emailjs.config.ts.');
      } else {
        setError('Failed to send OTP. Please check your email and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 w-full">
      <p className="text-xs text-[#a8998e] leading-relaxed">
        Enter the email address linked to your account. We'll send a 6-digit code to verify it's you.
      </p>
      <InputField
        id="forgot-email"
        label="Email Address"
        type="email"
        value={email}
        onChange={(v) => { setEmail(v); setError(''); }}
        placeholder="you@example.com"
        icon={<Mail size={15} />}
        error={error}
        autoComplete="email"
        disabled={loading}
      />
      <SubmitButton loading={loading} label="Send OTP" id="send-otp-btn" />
      <button
        type="button"
        id="back-to-login-from-forgot"
        onClick={onBack}
        className="flex items-center justify-center gap-1.5 text-xs text-[#a8998e] hover:text-rose-400 transition-colors font-semibold"
      >
        <ArrowLeft size={13} /> Back to Login
      </button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────
// Step D: Forgot Password — Verify OTP
// ─────────────────────────────────────────────────────────────
const OTP_LENGTH = 6;
const OTP_TIMER_SECONDS = 300; // 5 minutes

function ForgotOtpStep({
  email, onVerified, onBack
}: {
  email: string; onVerified: () => void; onBack: () => void;
}) {
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(OTP_TIMER_SECONDS);
  const [resendLoading, setResendLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError('');
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    const newOtp = [...Array(OTP_LENGTH).fill('')];
    paste.split('').forEach((c, i) => { newOtp[i] = c; });
    setOtp(newOtp);
    const nextEmpty = paste.length < OTP_LENGTH ? paste.length : OTP_LENGTH - 1;
    inputRefs.current[nextEmpty]?.focus();
  };

  // handleResendSend is defined below (after handleSubmit) — kept in declaration order

  const handleResendSend = async () => {
    setResendLoading(true);
    try {
      await sendOTPEmail(email);
      setTimeLeft(OTP_TIMER_SECONDS);
      setOtp(Array(OTP_LENGTH).fill(''));
      setError('');
    } catch {
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const code = otp.join('');
    if (code.length < OTP_LENGTH) { setError('Please enter all 6 digits.'); return; }
    setLoading(true);
    try {
      verifyOTP(code);
      onVerified();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid OTP.';
      setError(msg + ' Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 w-full">
      <div className="text-center">
        <p className="text-xs text-[#a8998e] leading-relaxed">
          A 6-digit code was sent to{' '}
          <span className="font-bold text-rose-400">{email}</span>.
        </p>
      </div>

      {/* OTP Inputs */}
      <div className="flex gap-2 justify-center" onPaste={handlePaste}>
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            id={`otp-digit-${i}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            disabled={loading}
            className={`w-11 h-13 text-center text-lg font-bold rounded-xl border-2 outline-none transition-all duration-200
              bg-white/60 text-[#5a4a42] caret-rose-400
              focus:bg-white focus:scale-105 focus:shadow-md
              disabled:opacity-50
              ${digit ? 'border-rose-300 bg-rose-50/40' : 'border-rose-200/60'}
              ${error ? 'border-red-300' : ''}`}
            style={{ fontFamily: 'Quicksand, sans-serif', height: '3.25rem' }}
            aria-label={`OTP digit ${i + 1}`}
          />
        ))}
      </div>

      {error && (
        <p className="text-xs text-red-500 text-center font-medium">⚠ {error}</p>
      )}

      {/* Countdown Timer */}
      <div className="flex flex-col items-center gap-1.5">
        <div className={`flex items-center gap-1.5 text-sm font-bold ${timeLeft <= 30 ? 'text-red-400' : 'text-[#a8998e]'}`}>
          <Shield size={13} />
          <span>{formatTime(timeLeft)}</span>
          <span className="text-xs font-normal">remaining</span>
        </div>
        <button
          type="button"
          id="resend-otp-btn"
          onClick={handleResendSend}
          disabled={timeLeft > 0 || resendLoading}
          className="text-xs font-bold text-rose-400 hover:text-rose-600 transition-colors
            disabled:text-[#c4b5a8] disabled:cursor-not-allowed disabled:no-underline
            underline underline-offset-2"
        >
          {resendLoading ? 'Resending…' : timeLeft > 0 ? `Resend available in ${formatTime(timeLeft)}` : 'Resend OTP'}
        </button>
      </div>

      <SubmitButton loading={loading} label="Verify OTP" id="verify-otp-btn" />
      <button
        type="button"
        id="back-to-forgot-request"
        onClick={onBack}
        className="flex items-center justify-center gap-1.5 text-xs text-[#a8998e] hover:text-rose-400 transition-colors font-semibold"
      >
        <ArrowLeft size={13} /> Change Email
      </button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────
// Step E: Forgot Password — Reset Password
// ─────────────────────────────────────────────────────────────
function ForgotResetStep({
  email, onReset
}: {
  email: string; onReset: () => void;
}) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState('');
  const strength = getPasswordStrength(password);

  const validate = (): boolean => {
    const e: ValidationErrors = {};
    const pwdErr = validatePassword(password);
    if (pwdErr) e.password = pwdErr;
    if (!confirmPassword) e.confirmPassword = 'Please confirm your password.';
    else if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setApiError('');
    if (!validate()) return;
    setLoading(true);
    try {
      await handleResetPassword(email, password);
      setSuccess(true);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.65 }, colors: ['#f9a8d4', '#fbcfe8', '#fda4af'] });
      setTimeout(onReset, 2000);
    } catch {
      setApiError('Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="text-green-500" size={36} />
        </div>
        <p className="text-[#5a4a42] font-bold text-base text-center">Password Reset!</p>
        <p className="text-xs text-[#a8998e] text-center">Redirecting you to login…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 w-full">
      <p className="text-xs text-[#a8998e] leading-relaxed">
        Create a strong new password for <span className="font-bold text-rose-400">{email}</span>.
      </p>

      <div className="flex flex-col gap-1">
        <PasswordField
          id="new-password"
          label="New Password"
          value={password}
          onChange={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: undefined })); }}
          error={errors.password}
          placeholder="Min 8 chars, number & symbol"
          disabled={loading}
        />
        {password.length > 0 && (
          <div className="flex flex-col gap-1 mt-1">
            <div className="h-1.5 rounded-full bg-rose-100 overflow-hidden flex gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-full flex-1 rounded-full transition-all duration-300"
                  style={{ backgroundColor: i <= strength.score ? strength.color : 'transparent' }}
                />
              ))}
            </div>
            <p className="text-[10px] font-semibold" style={{ color: strength.color }}>
              {strength.label}
            </p>
          </div>
        )}
      </div>

      <PasswordField
        id="reset-confirm-password"
        label="Confirm New Password"
        value={confirmPassword}
        onChange={(v) => { setConfirmPassword(v); setErrors((e) => ({ ...e, confirmPassword: undefined })); }}
        error={errors.confirmPassword}
        disabled={loading}
      />

      {apiError && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 font-medium">
          {apiError}
        </p>
      )}

      <SubmitButton loading={loading} label="Reset Password" id="reset-password-btn" />
    </form>
  );
}

// ─────────────────────────────────────────────────────────────
// Modal Header meta per step
// ─────────────────────────────────────────────────────────────
function getStepMeta(step: AuthStep) {
  switch (step) {
    case 'login':
      return { title: 'Welcome Back', subtitle: 'Sign in to your cozy library', icon: BookOpen };
    case 'signup':
      return { title: 'Join the Library', subtitle: 'Create your personal reading sanctuary', icon: Sparkles };
    case 'forgot-request':
      return { title: 'Forgot Password?', subtitle: 'No worries — we\'ll help you in', icon: Mail };
    case 'forgot-otp':
      return { title: 'Check Your Email', subtitle: 'Enter the 6-digit code we sent', icon: Shield };
    case 'forgot-reset':
      return { title: 'Set New Password', subtitle: 'Make it strong and memorable', icon: Lock };
  }
}

// ─────────────────────────────────────────────────────────────
// Root Auth Modal
// ─────────────────────────────────────────────────────────────
export function AuthModal({ onAuthSuccess }: AuthModalProps) {
  const [step, setStep] = useState<AuthStep>('login');
  const [forgotEmail, setForgotEmail] = useState('');

  // Animated step transitions
  const [animKey, setAnimKey] = useState(0);
  const changeStep = useCallback((next: AuthStep) => {
    setStep(next);
    setAnimKey((k) => k + 1);
  }, []);

  const meta = getStepMeta(step);
  const StepIcon = meta.icon;

  return (
    /* Full-screen backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #FDF6F0 0%, #FAECEB 40%, #F2EFFF 100%)',
        fontFamily: 'Quicksand, sans-serif',
      }}
    >
      {/* Ambient blobs */}
      <div className="absolute top-[-10%] left-[-8%] w-96 h-96 rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #fda4af, #fbcfe8)' }} />
      <div className="absolute bottom-[-12%] right-[-8%] w-80 h-80 rounded-full opacity-25 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #c4b5fd, #ddd6fe)' }} />
      <div className="absolute top-[40%] right-[15%] w-48 h-48 rounded-full opacity-20 blur-2xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #6ee7b7, #a7f3d0)' }} />

      {/* Glass Card */}
      <div
        className="relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
        style={{
          background: 'rgba(255, 255, 255, 0.72)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.55)',
          boxShadow: '0 32px 64px -12px rgba(168, 130, 120, 0.2), 0 0 0 1px rgba(255,255,255,0.4)',
        }}
      >
        {/* Top gradient bar */}
        <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #f9a8d4, #fda4af, #c4b5fd, #6ee7b7)' }} />

        <div className="p-8">
          {/* Header */}
          <div className="flex flex-col items-center mb-7">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-md"
              style={{ background: 'linear-gradient(135deg, #fda4af, #f9a8d4)' }}
            >
              <StepIcon className="text-white" size={26} />
            </div>
            <h1
              className="text-xl font-bold text-center"
              style={{ color: '#5a4a42', fontFamily: 'Playfair Display, serif', letterSpacing: '-0.02em' }}
            >
              {meta.title}
            </h1>
            <p className="text-xs text-[#a8998e] mt-1 text-center font-medium">{meta.subtitle}</p>

            {/* Progress dots */}
            {(step === 'forgot-request' || step === 'forgot-otp' || step === 'forgot-reset') && (
              <div className="flex gap-2 mt-3">
                {(['forgot-request', 'forgot-otp', 'forgot-reset'] as AuthStep[]).map((s, i) => (
                  <div
                    key={i}
                    className="rounded-full transition-all duration-300"
                    style={{
                      width: step === s ? '20px' : '6px',
                      height: '6px',
                      background: step === s ? '#fda4af' : '#f5c7ca',
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Step content — keyed for fade-in on step change */}
          <div
            key={animKey}
            style={{ animation: 'auth-fade-up 0.3s ease-out both' }}
          >
            {step === 'login' && (
              <LoginStep
                onSuccess={onAuthSuccess}
                onGoSignup={() => changeStep('signup')}
                onGoForgot={() => changeStep('forgot-request')}
              />
            )}
            {step === 'signup' && (
              <SignupStep
                onSuccess={onAuthSuccess}
                onGoLogin={() => changeStep('login')}
              />
            )}
            {step === 'forgot-request' && (
              <ForgotRequestStep
                onOtpSent={(email) => { setForgotEmail(email); changeStep('forgot-otp'); }}
                onBack={() => changeStep('login')}
              />
            )}
            {step === 'forgot-otp' && (
              <ForgotOtpStep
                email={forgotEmail}
                onVerified={() => changeStep('forgot-reset')}
                onBack={() => changeStep('forgot-request')}
              />
            )}
            {step === 'forgot-reset' && (
              <ForgotResetStep
                email={forgotEmail}
                onReset={() => changeStep('login')}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-8 py-3 text-center text-[10px] text-[#c4b5a8] border-t"
          style={{ borderColor: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.3)' }}
        >
          🔒 Your data stays local — we never share your information.
        </div>
      </div>
    </div>
  );
}
