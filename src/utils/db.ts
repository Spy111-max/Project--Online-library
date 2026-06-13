const DB_NAME = 'CozyLibraryDB';
const DB_VERSION = 2;

export interface Book {
  id: string;
  title: string;
  fileData: ArrayBuffer;
  size: number;
  totalPages: number;
  currentPage: number;
  shelfId: number;
  positionX: number; // percentage (0 - 100)
}

export interface Decoration {
  id: string;
  type: 'plant' | 'sticker' | 'trinket';
  subType: string; // 'succulent' | 'ivy' | 'tulip' | 'heart' | 'star' | 'cloud' | 'glitter' | 'keychain' | 'fairy_lights' | 'candle'
  positionX: number; // percentage (0 - 100) relative to cupboard
  positionY: number; // percentage (0 - 100) relative to cupboard
}

export interface Highlight {
  id: string;
  bookId: string;
  pageNumber: number;
  rects: Array<{ left: number; top: number; width: number; height: number }>;
  color: string;
  text: string;
  createdAt: number;
}

export interface PageSticker {
  id: string;
  bookId: string;
  pageNumber: number;
  emoji: string;
  positionX: number; // percentage (0 - 100)
  positionY: number; // percentage (0 - 100)
}

export interface Settings {
  cupboardTheme: 'cottagecore' | 'pastel' | 'academic' | 'scandinavian';
  backgroundPalette: 'cream' | 'sage' | 'rose' | 'lavender';
}

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event: any) => {
      const db = request.result;
      const oldVersion = event.oldVersion;

      if (oldVersion < 1) {
        db.createObjectStore('books', { keyPath: 'id' });
        db.createObjectStore('decorations', { keyPath: 'id' });
        const highlightStore = db.createObjectStore('highlights', { keyPath: 'id' });
        highlightStore.createIndex('bookId', 'bookId', { unique: false });
        db.createObjectStore('settings');
      }

      if (!db.objectStoreNames.contains('page_stickers')) {
        const stickerStore = db.createObjectStore('page_stickers', { keyPath: 'id' });
        stickerStore.createIndex('bookId', 'bookId', { unique: false });
      }
    };
  });
};


// --- Books Operations ---
export const getBooks = async (): Promise<Book[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('books', 'readonly');
    const store = transaction.objectStore('books');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveBook = async (book: Book): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('books', 'readwrite');
    const store = transaction.objectStore('books');
    const request = store.put(book);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const deleteBook = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['books', 'highlights', 'page_stickers'], 'readwrite');
    
    // Delete book
    const bookStore = transaction.objectStore('books');
    bookStore.delete(id);

    // Delete associated highlights
    const highlightStore = transaction.objectStore('highlights');
    const index = highlightStore.index('bookId');
    const request = index.openCursor(IDBKeyRange.only(id));
    
    request.onsuccess = (event: any) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    // Delete associated page stickers
    const stickerStore = transaction.objectStore('page_stickers');
    const stickerIndex = stickerStore.index('bookId');
    const stickerRequest = stickerIndex.openCursor(IDBKeyRange.only(id));

    stickerRequest.onsuccess = (event: any) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

// --- Decorations Operations ---
export const getDecorations = async (): Promise<Decoration[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('decorations', 'readonly');
    const store = transaction.objectStore('decorations');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveDecoration = async (decor: Decoration): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('decorations', 'readwrite');
    const store = transaction.objectStore('decorations');
    const request = store.put(decor);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const deleteDecoration = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('decorations', 'readwrite');
    const store = transaction.objectStore('decorations');
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const saveDecorationsList = async (decorations: Decoration[]): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('decorations', 'readwrite');
    const store = transaction.objectStore('decorations');
    
    // Clear all first
    store.clear();
    
    // Put all
    decorations.forEach(d => store.put(d));

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

// --- Highlights Operations ---
export const getHighlights = async (bookId: string): Promise<Highlight[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('highlights', 'readonly');
    const store = transaction.objectStore('highlights');
    const index = store.index('bookId');
    const request = index.getAll(IDBKeyRange.only(bookId));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveHighlight = async (highlight: Highlight): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('highlights', 'readwrite');
    const store = transaction.objectStore('highlights');
    const request = store.put(highlight);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const deleteHighlight = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('highlights', 'readwrite');
    const store = transaction.objectStore('highlights');
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// --- Settings Operations ---
export const getSettings = async (): Promise<Settings> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('settings', 'readonly');
    const store = transaction.objectStore('settings');
    const request = store.get('app_settings');

    request.onsuccess = () => {
      const defaultSettings: Settings = {
        cupboardTheme: 'cottagecore',
        backgroundPalette: 'cream',
      };
      resolve(request.result || defaultSettings);
    };
    request.onerror = () => reject(request.error);
  });
};

export const saveSettings = async (settings: Settings): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('settings', 'readwrite');
    const store = transaction.objectStore('settings');
    const request = store.put(settings, 'app_settings');

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// --- Page Stickers Operations ---
export const getPageStickers = async (bookId: string): Promise<PageSticker[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('page_stickers', 'readonly');
    const store = transaction.objectStore('page_stickers');
    const index = store.index('bookId');
    const request = index.getAll(IDBKeyRange.only(bookId));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const savePageSticker = async (sticker: PageSticker): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('page_stickers', 'readwrite');
    const store = transaction.objectStore('page_stickers');
    const request = store.put(sticker);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const deletePageSticker = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('page_stickers', 'readwrite');
    const store = transaction.objectStore('page_stickers');
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
