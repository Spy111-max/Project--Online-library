/**
 * authDb.ts
 * ─────────────────────────────────────────────────────────────
 * Manages a "users" object store inside the existing CozyLibraryDB.
 * Passwords are hashed with SHA-256 (WebCrypto API) before storage.
 * The DB version is bumped to 3 to trigger the onupgradeneeded migration.
 */

// Re-uses the same DB name as the main library data.
const DB_NAME = 'CozyLibraryDB';
const DB_VERSION = 3; // ← bumped from 2 to add the "users" store

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export interface UserRecord {
  id: string;           // crypto.randomUUID()
  name: string;
  email: string;        // stored lowercase, used as unique key
  passwordHash: string; // SHA-256 hex digest
  createdAt: number;    // unix ms
}

// ─────────────────────────────────────────────────────────────
// DB initialisation (extends the existing schema)
// ─────────────────────────────────────────────────────────────
function openAuthDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;

      // Existing stores from v1
      if (oldVersion < 1) {
        db.createObjectStore('books', { keyPath: 'id' });
        db.createObjectStore('decorations', { keyPath: 'id' });
        const highlightStore = db.createObjectStore('highlights', { keyPath: 'id' });
        highlightStore.createIndex('bookId', 'bookId', { unique: false });
        db.createObjectStore('settings');
      }

      // v2 migration — page_stickers store
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains('page_stickers')) {
          const stickerStore = db.createObjectStore('page_stickers', { keyPath: 'id' });
          stickerStore.createIndex('bookId', 'bookId', { unique: false });
        }
      }

      // v3 migration — users store
      if (oldVersion < 3) {
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          // Unique index on email for fast lookups and uniqueness enforcement
          userStore.createIndex('email', 'email', { unique: true });
        }
      }
    };
  });
}

// ─────────────────────────────────────────────────────────────
// Crypto helpers
// ─────────────────────────────────────────────────────────────
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ─────────────────────────────────────────────────────────────
// User operations
// ─────────────────────────────────────────────────────────────

/** Returns the user record for the given email (lowercase), or null if not found. */
export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  const db = await openAuthDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('users', 'readonly');
    const store = tx.objectStore('users');
    const index = store.index('email');
    const req = index.get(email.toLowerCase().trim());
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

/** Creates a new user. Throws if the email is already taken. */
export async function createUser(
  name: string,
  email: string,
  password: string
): Promise<UserRecord> {
  const existing = await getUserByEmail(email);
  if (existing) {
    throw new Error('EMAIL_EXISTS');
  }

  const passwordHash = await sha256(password);
  const user: UserRecord = {
    id: crypto.randomUUID(),
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash,
    createdAt: Date.now(),
  };

  const db = await openAuthDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('users', 'readwrite');
    const store = tx.objectStore('users');
    const req = store.add(user);
    req.onsuccess = () => resolve(user);
    req.onerror = () => reject(req.error);
  });
}

/** Verifies credentials. Returns the user on success, throws on failure. */
export async function authenticateUser(
  email: string,
  password: string
): Promise<UserRecord> {
  const user = await getUserByEmail(email);
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  const passwordHash = await sha256(password);
  if (passwordHash !== user.passwordHash) {
    throw new Error('WRONG_PASSWORD');
  }

  return user;
}

/** Updates the stored password for a user (used after OTP verification). */
export async function updateUserPassword(
  email: string,
  newPassword: string
): Promise<void> {
  const user = await getUserByEmail(email);
  if (!user) throw new Error('USER_NOT_FOUND');

  const passwordHash = await sha256(newPassword);
  const updated: UserRecord = { ...user, passwordHash };

  const db = await openAuthDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('users', 'readwrite');
    const store = tx.objectStore('users');
    const req = store.put(updated);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
