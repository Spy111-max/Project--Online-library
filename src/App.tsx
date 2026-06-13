import { useState, useEffect } from 'react';
import {
  getBooks,
  saveBook,
  deleteBook,
  getDecorations,
  saveDecoration,
  deleteDecoration,
  getHighlights,
  saveHighlight,
  deleteHighlight,
  getSettings,
  saveSettings,
  getPageStickers,
  savePageSticker,
  deletePageSticker
} from './utils/db';
import type { Book, Decoration, Highlight, Settings, PageSticker } from './utils/db';
import { Cupboard } from './components/Cupboard';
import { DecorationDrawer } from './components/DecorationDrawer';
import { Reader } from './components/Reader';
import { Library } from 'lucide-react';


function App() {
  const [isLoading, setIsLoading] = useState(true);
  
  // Library States
  const [books, setBooks] = useState<Book[]>([]);
  const [decorations, setDecorations] = useState<Decoration[]>([]);
  
  // Theme States
  const [settings, setSettings] = useState<Settings>({
    cupboardTheme: 'cottagecore',
    backgroundPalette: 'cream',
  });

  // Reading room states
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [activeHighlights, setActiveHighlights] = useState<Highlight[]>([]);
  const [activeStickers, setActiveStickers] = useState<PageSticker[]>([]);

  // 1. Initial Load from IndexedDB
  useEffect(() => {
    const loadAppData = async () => {
      try {
        const dbSettings = await getSettings();
        const dbBooks = await getBooks();
        const dbDecorations = await getDecorations();

        setSettings(dbSettings);
        setBooks(dbBooks);
        setDecorations(dbDecorations);
      } catch (err) {
        console.error('Failed to load application data from IndexedDB:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadAppData();
  }, []);

  // 2. Theme Preferences Handlers
  const handleChangeTheme = async (theme: 'cottagecore' | 'pastel' | 'academic' | 'scandinavian') => {
    const updated = { ...settings, cupboardTheme: theme };
    setSettings(updated);
    await saveSettings(updated);
  };

  const handleChangeBg = async (bg: 'cream' | 'sage' | 'rose' | 'lavender') => {
    const updated = { ...settings, backgroundPalette: bg };
    setSettings(updated);
    await saveSettings(updated);
  };

  // 3. Books Handlers
  const handleAddBook = async (title: string, fileData: ArrayBuffer, totalPages: number) => {
    const newBook: Book = {
      id: crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString() + Math.random().toString()),
      title: title,
      fileData: fileData,
      size: fileData.byteLength,
      totalPages: totalPages,
      currentPage: 1,
      shelfId: 0, // default first shelf
      positionX: 30 + Math.random() * 40, // spread in the middle of shelf
    };

    try {
      await saveBook(newBook);
      setBooks((prev) => [...prev, newBook]);
    } catch (err) {
      console.error('Failed to save book:', err);
      alert('Failed to save book to database.');
    }
  };

  const handleOpenBook = async (bookId: string) => {
    try {
      const highlightsList = await getHighlights(bookId);
      const stickersList = await getPageStickers(bookId);
      setActiveHighlights(highlightsList);
      setActiveStickers(stickersList);
      setActiveBookId(bookId);
    } catch (err) {
      console.error('Failed to load highlights and stickers:', err);
    }
  };

  const handleUpdateBookShelf = async (bookId: string, shelfId: number, positionX: number) => {
    const updatedBooks = books.map((b) => {
      if (b.id === bookId) {
        const updated = { ...b, shelfId, positionX };
        saveBook(updated); // Sync async to IndexedDB
        return updated;
      }
      return b;
    });
    setBooks(updatedBooks);
  };

  const handleUpdateBookProgress = async (bookId: string, currentPage: number) => {
    const updatedBooks = books.map((b) => {
      if (b.id === bookId) {
        const updated = { ...b, currentPage };
        saveBook(updated); // Sync async to IndexedDB
        return updated;
      }
      return b;
    });
    setBooks(updatedBooks);
  };

  const handleDeleteBook = async (bookId: string) => {
    try {
      await deleteBook(bookId);
      setBooks((prev) => prev.filter((b) => b.id !== bookId));
      if (activeBookId === bookId) {
        setActiveBookId(null);
      }
    } catch (err) {
      console.error('Failed to delete book:', err);
    }
  };

  // 4. DIY Decorations Handlers
  const handleAddDecoration = async (
    subType: string,
    type: 'plant' | 'sticker' | 'trinket'
  ) => {
    const isSticker = ['heart', 'star', 'cloud', 'glitter'].includes(subType);
    const newDecor: Decoration = {
      id: crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString() + Math.random().toString()),
      type: type,
      subType: subType,
      positionX: 45 + Math.random() * 10,
      positionY: isSticker ? 40 + Math.random() * 15 : 55, // stickers default to float, plants to shelf 1 (55%)
    };

    try {
      await saveDecoration(newDecor);
      setDecorations((prev) => [...prev, newDecor]);
    } catch (err) {
      console.error('Failed to add decoration:', err);
    }
  };

  const handleUpdateDecorationPosition = async (decorId: string, positionX: number, positionY: number) => {
    const updatedDecors = decorations.map((d) => {
      if (d.id === decorId) {
        const updated = { ...d, positionX, positionY };
        saveDecoration(updated);
        return updated;
      }
      return d;
    });
    setDecorations(updatedDecors);
  };

  const handleDeleteDecoration = async (decorId: string) => {
    try {
      await deleteDecoration(decorId);
      setDecorations((prev) => prev.filter((d) => d.id !== decorId));
    } catch (err) {
      console.error('Failed to delete decoration:', err);
    }
  };

  // 5. Highlights Handlers
  const handleAddHighlight = async (highlight: Highlight) => {
    try {
      await saveHighlight(highlight);
      setActiveHighlights((prev) => {
        const exists = prev.some((h) => h.id === highlight.id);
        if (exists) {
          return prev.map((h) => (h.id === highlight.id ? highlight : h));
        }
        return [...prev, highlight];
      });
    } catch (err) {
      console.error('Failed to save highlight:', err);
    }
  };

  const handleDeleteHighlight = async (id: string) => {
    try {
      await deleteHighlight(id);
      setActiveHighlights((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      console.error('Failed to delete highlight:', err);
    }
  };

  // 6. Page Stickers Handlers
  const handleAddPageSticker = async (sticker: PageSticker) => {
    try {
      await savePageSticker(sticker);
      setActiveStickers((prev) => {
        const exists = prev.some((s) => s.id === sticker.id);
        if (exists) {
          return prev.map((s) => (s.id === sticker.id ? sticker : s));
        }
        return [...prev, sticker];
      });
    } catch (err) {
      console.error('Failed to save page sticker:', err);
    }
  };

  const handleDeletePageSticker = async (id: string) => {
    try {
      await deletePageSticker(id);
      setActiveStickers((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error('Failed to delete page sticker:', err);
    }
  };

  // Map background setting to style class name
  const getBgClass = () => {
    switch (settings.backgroundPalette) {
      case 'sage':
        return 'bg-sage-bg';
      case 'rose':
        return 'bg-rose-bg';
      case 'lavender':
        return 'bg-lavender-bg';
      case 'cream':
      default:
        return 'bg-cream-bg';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-[#FDF6F0] flex flex-col items-center justify-center gap-3 font-quicksand text-[#6b6375]">
        <div className="w-10 h-10 border-4 border-rose-300 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-bold animate-pulse">Entering Cozy Library room...</p>
      </div>
    );
  }

  // Find book details if reading
  const activeBook = books.find((b) => b.id === activeBookId);

  return (
    <div className={`min-h-screen w-full transition-colors duration-500 flex flex-col items-center overflow-x-hidden ${getBgClass()}`}>
      
      {/* 1. ROOM SHELVES VIEW */}
      {!activeBookId ? (
        <div className="w-full flex flex-col items-center relative min-h-screen py-16">
          
          {/* Top Decorative Floating Clouds (adds cozy feel) */}
          <div className="absolute top-10 left-[10%] opacity-40 animate-float pointer-events-none" style={{ animationDelay: '0s' }}>
            <svg viewBox="0 0 100 60" width="80" height="50" fill="#FFF"><path d="M20 35 C15 35, 10 32, 10 27 C10 22, 15 20, 20 20 C22 15, 35 10, 42 16 C48 12, 62 15, 65 22 C72 20, 80 25, 80 32 C80 37, 72 40, 65 40 L20 40 Z" /></svg>
          </div>
          <div className="absolute top-24 right-[12%] opacity-30 animate-float pointer-events-none" style={{ animationDelay: '3s' }}>
            <svg viewBox="0 0 100 60" width="90" height="55" fill="#FFF"><path d="M20 35 C15 35, 10 32, 10 27 C10 22, 15 20, 20 20 C22 15, 35 10, 42 16 C48 12, 62 15, 65 22 C72 20, 80 25, 80 32 C80 37, 72 40, 65 40 L20 40 Z" /></svg>
          </div>

          {/* Title Logo Indicator */}
          <div className="flex items-center gap-2 mb-1 bg-white/45 px-4 py-1.5 rounded-full border border-white/20 shadow-sm backdrop-blur-sm z-10 select-none animate-float">
            <Library className="w-4 h-4 text-rose-300" />
            <span className="text-[10px] font-bold tracking-widest text-[#8c7a6b] uppercase">Cozy Library ✧</span>
          </div>

          {/* DIY Studio Configuration Drawer Trigger */}
          <DecorationDrawer
            onAddBook={handleAddBook}
            onAddDecoration={handleAddDecoration}
            currentTheme={settings.cupboardTheme}
            onChangeTheme={handleChangeTheme}
            currentBg={settings.backgroundPalette}
            onChangeBg={handleChangeBg}
          />

          {/* Bookshelf Cupboard component */}
          <Cupboard
            theme={settings.cupboardTheme}
            books={books}
            decorations={decorations}
            onOpenBook={handleOpenBook}
            onUpdateBookShelf={handleUpdateBookShelf}
            onUpdateDecorationPosition={handleUpdateDecorationPosition}
            onDeleteBook={handleDeleteBook}
            onDeleteDecoration={handleDeleteDecoration}
          />
        </div>
      ) : (
        /* 2. Cozy Cafe Full-Screen Reader view */
        activeBook && (
          <Reader
            book={activeBook}
            highlights={activeHighlights}
            pageStickers={activeStickers}
            onClose={() => setActiveBookId(null)}
            onUpdateProgress={handleUpdateBookProgress}
            onAddHighlight={handleAddHighlight}
            onDeleteHighlight={handleDeleteHighlight}
            onAddPageSticker={handleAddPageSticker}
            onDeletePageSticker={handleDeletePageSticker}
            roomBg={settings.backgroundPalette}
          />
        )
      )}
    </div>
  );
}

export default App;
