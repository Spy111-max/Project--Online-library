import { useState, useEffect, useCallback, useRef } from 'react';
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
import { AuthPage, type AuthUser } from './components/AuthPage';
import { Library, LogOut, Upload, X } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';

// Configure the pdfjs worker in Vite
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();



function App() {
  // ── Auth State ──
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    const saved = sessionStorage.getItem('cozy_library_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  // Profile Customization States
  const [profilePic, setProfilePic] = useState('🐻');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileUploadInputRef = useRef<HTMLInputElement>(null);

  // PDF Upload States (visible on main page)
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Load profile picture and persist session when user changes
  useEffect(() => {
    if (authUser) {
      setProfilePic(localStorage.getItem(`profile_pic_${authUser.email}`) || '🐻');
      sessionStorage.setItem('cozy_library_user', JSON.stringify(authUser));
    } else {
      sessionStorage.removeItem('cozy_library_user');
    }
  }, [authUser]);

  const handleSelectEmoji = (emoji: string) => {
    setProfilePic(emoji);
    if (authUser) {
      localStorage.setItem(`profile_pic_${authUser.email}`, emoji);
    }
  };

  const handleProfileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      setProfilePic(base64data);
      if (authUser) {
        localStorage.setItem(`profile_pic_${authUser.email}`, base64data);
      }
    };
    reader.readAsDataURL(file);
  };

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
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Oh dear! Please upload a PDF file.');
      return;
    }

    setIsUploading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer.slice(0) });
      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;

      const cleanTitle = file.name.replace(/\.pdf$/i, '');
      await handleAddBook(cleanTitle, arrayBuffer, totalPages);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error(err);
      alert('Apologies, there was an error reading your PDF.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Oh dear! Please upload a PDF file.');
      return;
    }

    setIsUploading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer.slice(0) });
      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;

      const cleanTitle = file.name.replace(/\.pdf$/i, '');
      await handleAddBook(cleanTitle, arrayBuffer, totalPages);
    } catch (err) {
      console.error(err);
      alert('Apologies, there was an error reading your PDF.');
    } finally {
      setIsUploading(false);
    }
  };

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

  const handleUpdateBookProgress = useCallback(async (bookId: string, currentPage: number) => {
    setBooks((prev) => {
      const updated = prev.map((b) => {
        if (b.id === bookId) {
          const u = { ...b, currentPage };
          saveBook(u); // fire-and-forget async write
          return u;
        }
        return b;
      });
      return updated;
    });
  }, []); // no deps — setBooks and saveBook are stable

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

  const getThemeTextClass = () => {
    switch (settings.cupboardTheme) {
      case 'cottagecore':
        return {
          title: 'text-[#5c2e16]',
          subtitle: 'text-[#8b5a2b]/80',
        };
      case 'pastel':
        return {
          title: 'text-[#a27b8c]',
          subtitle: 'text-[#c6a4b4]/80',
        };
      case 'academic':
        return {
          title: 'text-[#ebdcb9]',
          subtitle: 'text-[#a48e71]/80',
        };
      case 'scandinavian':
        return {
          title: 'text-[#57534e]',
          subtitle: 'text-[#a8a29e]/80',
        };
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

  // ── Auth Gate ──
  if (!authUser) {
    return <AuthPage onAuthSuccess={(user) => setAuthUser(user)} />;
  }

  const themeText = getThemeTextClass();

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

          {/* Top Right: Profile & Logout */}
          <div className="fixed top-6 right-6 z-40 flex items-center gap-3">
            {/* Logout button */}
            <button
              id="logout-btn"
              title="Log out"
              onClick={() => setAuthUser(null)}
              className="p-2.5 rounded-full shadow-md bg-white/60 hover:bg-white/80 hover:text-rose-500 border border-white/20 backdrop-blur-sm transition-all text-[#6b6375] cursor-pointer"
            >
              <LogOut size={16} />
            </button>

            {/* Profile Avatar Button */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-12 h-12 rounded-full overflow-hidden border-2 border-rose-300 shadow-md bg-white hover:scale-105 transition-all cursor-pointer flex items-center justify-center text-2xl select-none"
              >
                {profilePic ? (
                  profilePic.startsWith('data:') ? (
                    <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span>{profilePic}</span>
                  )
                ) : (
                  <span>🐻</span>
                )}
              </button>

              {/* Profile dropdown menu */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-3 w-64 rounded-2xl shadow-xl border border-white/20 backdrop-blur-md p-4 bg-white/90 z-50 flex flex-col gap-3.5 font-quicksand">
                  <div className="flex justify-between items-center border-b border-black/5 pb-2">
                    <span className="text-xs font-bold text-[#6b6375]">Customize Profile</span>
                    <button onClick={() => setShowProfileMenu(false)} className="text-[#a29ca8] hover:text-[#6b6375]">
                      <X size={14} />
                    </button>
                  </div>

                  {/* Preset Avatars */}
                  <div>
                    <span className="text-[10px] font-bold text-[#8c7a6b] uppercase tracking-wider block mb-2">Preset Avatars</span>
                    <div className="grid grid-cols-4 gap-2">
                      {['🐻', '🐱', '🦊', '🐨', '🐼', '🐰', '🐸', '🦄', '🦁', '🦉', '🐷', '🐧'].map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            handleSelectEmoji(emoji);
                            setShowProfileMenu(false);
                          }}
                          className="w-10 h-10 rounded-xl bg-white hover:bg-rose-50 border border-black/5 hover:border-rose-200 transition-all flex items-center justify-center text-xl cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Photo Upload */}
                  <div className="border-t border-black/5 pt-3 flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-[#8c7a6b] uppercase tracking-wider block">Custom Photo</span>
                    <button
                      onClick={() => {
                        profileUploadInputRef.current?.click();
                      }}
                      className="w-full py-2 border border-dashed border-[#d1c9e9] hover:border-[#aba0d3] bg-[#fdf6f0]/40 rounded-xl text-xs font-bold text-[#6b6375] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Upload size={13} />
                      <span>Upload Image</span>
                    </button>
                    <input
                      type="file"
                      ref={profileUploadInputRef}
                      onChange={(e) => {
                        handleProfileUpload(e);
                        setShowProfileMenu(false);
                      }}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Header Title */}
          <div className="text-center mb-6 z-10">
            <h1 className={`text-4xl md:text-5xl font-lora italic font-medium tracking-wide select-none transition-colors duration-500 ${themeText.title}`}>
              Your Cozy Space
            </h1>
            <p className={`text-xs font-semibold tracking-wider uppercase mt-1 font-quicksand transition-colors duration-500 ${themeText.subtitle}`}>
              Cozy Library & DIY Reading Room
            </p>
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

          {/* Cupboard and Upload layout */}
          <div className="w-full max-w-6xl px-4 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-8 z-10">
            {/* Left Column: Cupboard */}
            <div className="flex-1 flex flex-col items-center">
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

            {/* Right Column: Book Uploader */}
            <div className="w-full lg:w-72 flex flex-col gap-4 mt-8 lg:mt-16 font-quicksand">
              <div className="glassmorphism p-5 rounded-3xl border border-white/20 shadow-md flex flex-col gap-4">
                <div>
                  <h3 className="font-bold text-[#6b6375] text-sm">Add Book to Shelf</h3>
                  <p className="text-[11px] text-[#a29ca8] mt-0.5">Drag and drop any PDF book here</p>
                </div>

                {/* Dotted Upload Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed border-[#d1c9e9] hover:border-[#aba0d3] bg-[#fdf6f0]/40 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-center cursor-pointer transition-all duration-300 ${
                    isUploading ? 'opacity-55 pointer-events-none' : ''
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf"
                    className="hidden"
                  />

                  {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 rounded-full border-3 border-rose-300 border-t-transparent animate-spin"></div>
                      <span className="text-[10px] text-[#a29ca8] font-medium">Analyzing pages...</span>
                    </div>
                  ) : (
                    <>
                      <div className="p-2.5 bg-rose-50 rounded-full text-rose-400">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#6b6375]">Drag & Drop PDF</p>
                        <p className="text-[10px] text-[#a29ca8] mt-0.5">or click to browse files</p>
                      </div>
                    </>
                  )}
                </div>

                <p className="text-[10px] leading-relaxed text-[#a29ca8] text-center">
                  Books are processed entirely in your browser and saved to your device.
                </p>
              </div>
            </div>
          </div>
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
