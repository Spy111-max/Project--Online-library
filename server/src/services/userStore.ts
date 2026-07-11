/**
 * userStore.ts
 * ─────────────────────────────────────────────────────────────
 * A lightweight JSON file–based user store.
 * In production, replace with a real database (PostgreSQL, MongoDB, etc.).
 *
 * All mutations are atomic: the entire file is rewritten after each write.
 * Suitable for development and low-traffic deployments.
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { DbUser } from '../types';

// ── File path ─────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'users.json');

// ── In-memory cache ───────────────────────────────────────────
let _users: Map<string, DbUser> = new Map(); // key = email (lowercase)
let _initialized = false;

/** Load users from disk into the in-memory Map. Called once on first use. */
function ensureInitialized(): void {
  if (_initialized) return;
  _initialized = true;

  // Create data directory if it doesn't exist
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Create empty database file if it doesn't exist
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), 'utf-8');
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const records: DbUser[] = JSON.parse(raw);
    records.forEach((u) => _users.set(u.email, u));
    console.log(`[UserStore] Loaded ${_users.size} user(s) from ${DB_FILE}`);
  } catch (err) {
    console.error('[UserStore] Failed to load database, starting fresh:', err);
    _users = new Map();
  }
}

/** Persist the current in-memory state to disk. */
function persist(): void {
  const records = Array.from(_users.values());
  fs.writeFileSync(DB_FILE, JSON.stringify(records, null, 2), 'utf-8');
}

// ── Public API ────────────────────────────────────────────────

/** Find a user by email (case-insensitive). Returns null if not found. */
export function findByEmail(email: string): DbUser | null {
  ensureInitialized();
  return _users.get(email.toLowerCase().trim()) ?? null;
}

/** Find a user by ID. Returns null if not found. */
export function findById(id: string): DbUser | null {
  ensureInitialized();
  for (const u of _users.values()) {
    if (u.id === id) return u;
  }
  return null;
}

/** Create a new pending (unverified) user. Throws if email already exists. */
export function createUser(
  name: string,
  email: string,
  passwordHash: string,
  otpHash: string,
): DbUser {
  ensureInitialized();
  const key = email.toLowerCase().trim();

  if (_users.has(key)) {
    throw new Error('EMAIL_EXISTS');
  }

  const user: DbUser = {
    id: uuidv4(),
    name: name.trim(),
    email: key,
    passwordHash,
    isVerified: false,
    otpHash,
    otpExpiry: Date.now() + 5 * 60 * 1000, // 5 minutes
    otpPurpose: 'signup',
    createdAt: Date.now(),
  };

  _users.set(key, user);
  persist();
  return user;
}

/** Update arbitrary fields on a user record. */
export function updateUser(email: string, patch: Partial<DbUser>): DbUser {
  ensureInitialized();
  const key = email.toLowerCase().trim();
  const existing = _users.get(key);
  if (!existing) throw new Error('USER_NOT_FOUND');

  const updated: DbUser = { ...existing, ...patch };
  _users.set(key, updated);
  persist();
  return updated;
}

/** Clear OTP fields after use (prevents replay attacks). */
export function clearOtp(email: string): void {
  updateUser(email, { otpHash: null, otpExpiry: null, otpPurpose: null });
}
