import React, { useState, useEffect, useRef } from 'react';
import * as pdfjs from 'pdfjs-dist';
import type { Book, Highlight, PageSticker } from '../utils/db';
import { HighlightsSidebar } from './HighlightsSidebar';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Bookmark,
  ZoomIn,
  ZoomOut,
  Smile,
  Scroll,
  Headphones
} from 'lucide-react';
import { CozyAudio } from '../utils/audio';
import confetti from 'canvas-confetti';

interface ReaderProps {
  book: Book;
  highlights: Highlight[];
  pageStickers: PageSticker[];
  onClose: () => void;
  onUpdateProgress: (bookId: string, page: number) => void;
  onAddHighlight: (highlight: Highlight) => void;
  onDeleteHighlight: (id: string) => void;
  onAddPageSticker: (sticker: PageSticker) => void;
  onDeletePageSticker: (id: string) => void;
  roomBg: 'cream' | 'sage' | 'rose' | 'lavender';
}

const EMOJI_STICKERS = ['❤️', '✨', '🌟', '☁️', '🌸', '☕', '😊', '😢'];

// ==========================================
// INDIVIDUAL PAGE RENDERING COMPONENT
// ==========================================
interface ReaderPageProps {
  pdfDoc: any;
  pageNumber: number;
  scale: number;
  isReflowMode: boolean;
  textSize: number;
  fontFamily: 'sans' | 'serif' | 'comic';
  lineHeight: 'normal' | 'relaxed' | 'loose';
  themeColors: any;
  highlights: Highlight[];
  stickers: PageSticker[];
  onAddHighlight: (color: string, text: string, range: Range) => void;
  onDeleteSticker: (id: string) => void;
  onUpdateStickerPosition: (id: string, x: number, y: number) => void;
  lazyRender?: boolean;
}

const ReaderPage: React.FC<ReaderPageProps> = ({
  pdfDoc,
  pageNumber,
  scale,
  isReflowMode,
  textSize,
  fontFamily,
  lineHeight,
  themeColors,
  highlights,
  stickers,
  onAddHighlight,
  onDeleteSticker,
  onUpdateStickerPosition,
  lazyRender = false,
}) => {
  const [pageObj, setPageObj] = useState<any>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [pageTextItems, setPageTextItems] = useState<any[]>([]);
  const [reflowText, setReflowText] = useState('');
  const [isPageLoading, setIsPageLoading] = useState(true);

  // Selection popup coords
  const [selectionCoords, setSelectionCoords] = useState<{
    x: number;
    y: number;
    text: string;
    range: Range;
  } | null>(null);

  // Sticker dragging state
  const [draggingStickerId, setDraggingStickerId] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);

  const highlighterColors = [
    { name: 'Rose', value: 'rgba(227, 196, 194, 0.65)' },
    { name: 'Sage', value: 'rgba(194, 211, 198, 0.65)' },
    { name: 'Lavender', value: 'rgba(209, 201, 233, 0.65)' },
    { name: 'Buttercream', value: 'rgba(242, 230, 180, 0.65)' },
  ];

  // Load PDFPage object
  useEffect(() => {
    if (!pdfDoc) return;
    let active = true;

    const loadPageObj = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (active) {
          setPageObj(page);
        }
      } catch (err) {
        console.error(`Error loading page ${pageNumber}:`, err);
      }
    };

    loadPageObj();
    return () => {
      active = false;
    };
  }, [pdfDoc, pageNumber]);

  // Render Page Canvas & Extract Text
  useEffect(() => {
    if (!pageObj || lazyRender) return;
    let active = true;
    let renderTask: any = null;

    const render = async () => {
      setIsPageLoading(true);
      try {
        const viewport = pageObj.getViewport({ scale });
        setViewportSize({ width: viewport.width, height: viewport.height });

        // Canvas Render
        if (!isReflowMode) {
          const canvas = canvasRef.current;
          if (canvas) {
            const context = canvas.getContext('2d');
            if (context) {
              canvas.width = viewport.width;
              canvas.height = viewport.height;

              const renderContext = {
                canvasContext: context,
                viewport: viewport,
              };

              renderTask = pageObj.render(renderContext);
              await renderTask.promise;
            }
          }
        }

        if (!active) return;

        // Text extraction
        const textContent = await pageObj.getTextContent();
        if (!active) return;

        // Viewport coordinate mapping
        const items = textContent.items
          .filter((item: any) => typeof item.str === 'string')
          .map((item: any) => {
            const [x, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
            const fontHeight = Math.abs(item.transform[3]) * scale;
            const textWidth = item.width * scale;

            return {
              str: item.str,
              x,
              y,
              width: textWidth,
              height: fontHeight,
            };
          });

        setPageTextItems(items);

        // Concatenate plain text for Reflow Mode
        let textMerged = '';
        textContent.items.forEach((item: any) => {
          if (typeof item.str === 'string') {
            const trimmed = item.str.trim();
            if (trimmed) {
              if (textMerged.endsWith('-')) {
                textMerged = textMerged.slice(0, -1) + trimmed;
              } else {
                textMerged += (textMerged ? ' ' : '') + trimmed;
              }
            }
          }
        });
        setReflowText(textMerged);
        setIsPageLoading(false);
      } catch (err) {
        console.error('Error rendering viewport:', err);
        setIsPageLoading(false);
      }
    };

    render();

    return () => {
      active = false;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pageObj, scale, isReflowMode, lazyRender]);

  // Selection detection
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setSelectionCoords(null);
      return;
    }

    const text = selection.toString().trim();
    if (!text || text.length < 2) {
      setSelectionCoords(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const rects = range.getClientRects();
    if (rects.length === 0) return;

    const firstRect = rects[0];
    const containerRect = pageContainerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    setSelectionCoords({
      x: firstRect.left - containerRect.left + firstRect.width / 2,
      y: firstRect.top - containerRect.top - 48,
      text: text,
      range: range.cloneRange(),
    });
  };

  const handleClearSelection = () => {
    window.getSelection()?.removeAllRanges();
    setSelectionCoords(null);
  };

  const applyHighlight = (color: string) => {
    if (!selectionCoords) return;
    onAddHighlight(color, selectionCoords.text, selectionCoords.range);
    handleClearSelection();
  };

  // Sticker dragging handlers
  const handleStickerDragStart = (e: React.PointerEvent, stickerId: string, currentX: number, currentY: number) => {
    e.stopPropagation();
    if (!pageContainerRef.current) return;
    
    const rect = pageContainerRef.current.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;

    const stickerX = (currentX / 100) * rect.width;
    const stickerY = (currentY / 100) * rect.height;

    setDraggingStickerId(stickerId);
    dragOffset.current = {
      x: pointerX - stickerX,
      y: pointerY - stickerY,
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleStickerDragMove = (e: React.PointerEvent) => {
    if (!draggingStickerId || !pageContainerRef.current) return;
    e.stopPropagation();

    const rect = pageContainerRef.current.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;

    const newX = pointerX - dragOffset.current.x;
    const newY = pointerY - dragOffset.current.y;

    const newXPercent = Math.max(2, Math.min(98, (newX / rect.width) * 100));
    const newYPercent = Math.max(2, Math.min(98, (newY / rect.height) * 100));

    onUpdateStickerPosition(draggingStickerId, newXPercent, newYPercent);
  };

  const handleStickerDragEnd = (e: React.PointerEvent) => {
    if (!draggingStickerId) return;
    e.stopPropagation();
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setDraggingStickerId(null);
  };

  // Reflow text rendering
  const renderReflowHighlightedText = (text: string, pageHighlights: Highlight[]) => {
    if (!text) {
      return (
        <p className="text-center italic opacity-40 py-12">
          (This page appears to contain no text details. Switch to Canvas Mode to view.)
        </p>
      );
    }

    if (pageHighlights.length === 0) return <p className="leading-loose tracking-wide whitespace-pre-line">{text}</p>;

    const sortedHl = [...pageHighlights].sort((a, b) => b.text.length - a.text.length);
    let parts: { text: string; hlColor?: string }[] = [{ text }];

    sortedHl.forEach((hl) => {
      const match = hl.text;
      if (!match) return;

      const nextParts: typeof parts = [];
      parts.forEach((part) => {
        if (part.hlColor) {
          nextParts.push(part);
          return;
        }

        let index = part.text.toLowerCase().indexOf(match.toLowerCase());
        let lastIndex = 0;

        while (index !== -1) {
          if (index > lastIndex) {
            nextParts.push({ text: part.text.substring(lastIndex, index) });
          }

          nextParts.push({
            text: part.text.substring(index, index + match.length),
            hlColor: hl.color,
          });

          lastIndex = index + match.length;
          index = part.text.toLowerCase().indexOf(match.toLowerCase(), lastIndex);
        }

        if (lastIndex < part.text.length) {
          nextParts.push({ text: part.text.substring(lastIndex) });
        }
      });
      parts = nextParts;
    });

    return (
      <p className="leading-loose tracking-wide whitespace-pre-line">
        {parts.map((p, idx) => {
          if (p.hlColor) {
            return (
              <mark
                key={idx}
                style={{ backgroundColor: p.hlColor, mixBlendMode: 'multiply' }}
                className="rounded-sm px-0.5"
              >
                {p.text}
              </mark>
            );
          }
          return <span key={idx}>{p.text}</span>;
        })}
      </p>
    );
  };

  if (lazyRender) {
    return (
      <div
        data-page-container
        data-page={pageNumber}
        className={`w-[600px] h-[800px] max-w-full rounded-2xl border flex flex-col items-center justify-center font-quicksand ${themeColors.pageBg} ${themeColors.pageBorder} opacity-60`}
      >
        <div className="w-8 h-8 rounded-full border-4 border-rose-300 border-t-transparent animate-spin mb-2"></div>
        <span className="text-xs font-bold">Page {pageNumber}</span>
      </div>
    );
  }

  return (
    <div
      ref={pageContainerRef}
      data-page-container
      data-page={pageNumber}
      onMouseUp={handleTextSelection}
      onPointerUp={handleTextSelection}
      className="relative select-text"
      style={{
        width: isReflowMode ? '100%' : 'auto',
        maxWidth: isReflowMode ? '640px' : 'none',
      }}
    >
      {/* CANVAS VIEW */}
      {!isReflowMode ? (
        <div
          className={`relative rounded-2xl shadow-xl overflow-hidden border transition-all duration-300 ${themeColors.pageBorder}`}
          style={{ width: viewportSize.width, height: viewportSize.height }}
        >
          {isPageLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/5 backdrop-blur-xs z-30">
              <div className="w-6 h-6 border-2 border-rose-300 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full pointer-events-none select-none transition-all duration-300 ${themeColors.canvasFilter}`}
          />

          {/* Selection block text overlay */}
          <div
            className="absolute inset-0 select-text text-transparent origin-left top-0 w-full h-full pointer-events-auto"
            style={{ mixBlendMode: 'multiply' }}
          >
            {pageTextItems.map((item, idx) => (
              <span
                key={idx}
                className="absolute leading-none inline-block whitespace-pre"
                style={{
                  left: `${(item.x / viewportSize.width) * 100}%`,
                  top: `${((item.y - item.height) / viewportSize.height) * 100}%`,
                  width: `${(item.width / viewportSize.width) * 100}%`,
                  height: `${(item.height / viewportSize.height) * 100}%`,
                  fontSize: `${item.fontSize}px`,
                  transformOrigin: 'left top',
                }}
              >
                {item.str}
              </span>
            ))}
          </div>

          {/* Highlights overlays */}
          {highlights.map((hl) => (
            <div key={hl.id} className="absolute inset-0 pointer-events-none select-none">
              {hl.rects.map((rect, idx) => (
                <div
                  key={idx}
                  className="absolute rounded-sm mix-blend-multiply"
                  style={{
                    left: `${rect.left}%`,
                    top: `${rect.top}%`,
                    width: `${rect.width}%`,
                    height: `${rect.height}%`,
                    backgroundColor: hl.color,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      ) : (
        /* REFLOW VIEW (Open book spine details) */
        <div
          className={`w-full rounded-3xl shadow-lg border p-10 pl-14 font-quicksand transition-all duration-300 relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-3.5 before:bg-gradient-to-r before:from-black/10 before:to-transparent before:border-r before:border-black/5 ${
            themeColors.pageBg
          } ${themeColors.pageText} ${themeColors.pageBorder} ${
            fontFamily === 'serif'
              ? 'font-playfair'
              : fontFamily === 'comic'
              ? 'font-comic'
              : 'font-quicksand'
          }`}
          style={{
            fontSize: `${textSize}px`,
            lineHeight: lineHeight === 'normal' ? '1.4' : lineHeight === 'loose' ? '2.0' : '1.7',
          }}
        >
          {isPageLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2 opacity-50">
              <div className="w-5 h-5 border-2 border-rose-300 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs">Extracting page...</span>
            </div>
          ) : (
            renderReflowHighlightedText(reflowText, highlights)
          )}
        </div>
      )}

      {/* Emoji Stickers Rendering */}
      {stickers.map((st) => (
        <div
          key={st.id}
          className="absolute z-40 group select-none cursor-grab"
          style={{
            left: `${st.positionX}%`,
            top: `${st.positionY}%`,
            transform: 'translate(-50%, -50%)',
            touchAction: 'none',
          }}
          onPointerDown={(e) => handleStickerDragStart(e, st.id, st.positionX, st.positionY)}
          onPointerMove={handleStickerDragMove}
          onPointerUp={handleStickerDragEnd}
        >
          <span className="text-2xl drop-shadow-md select-none pointer-events-none">{st.emoji}</span>
          {/* Delete sticker tag button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteSticker(st.id);
            }}
            className="absolute -top-2 -right-2 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 transition-all text-[8px] cursor-pointer shadow border border-white"
          >
            ✕
          </button>
        </div>
      ))}

      {/* Selection Floating highlighter popover */}
      {selectionCoords && (
        <div
          className="absolute z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-xl glassmorphism border border-white/40 -translate-x-1/2 select-none pointer-events-auto"
          style={{
            left: `${selectionCoords.x}px`,
            top: `${selectionCoords.y}px`,
          }}
        >
          {highlighterColors.map((color) => (
            <button
              key={color.name}
              onClick={() => applyHighlight(color.value)}
              className="w-6 h-6 rounded-full border border-black/10 hover:scale-125 hover:shadow transition-all cursor-pointer shadow-inner"
              style={{ backgroundColor: color.value }}
              title={`Highlight ${color.name}`}
            />
          ))}
          <div className="w-[1px] h-4 bg-black/10 mx-1"></div>
          <button
            onClick={handleClearSelection}
            className="text-[10px] font-bold font-quicksand text-stone-600 hover:text-stone-900 px-1 hover:underline cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

// ==========================================
// MAIN READER COMPONENT
// ==========================================
export const Reader: React.FC<ReaderProps> = ({
  book,
  highlights,
  pageStickers,
  onClose,
  onUpdateProgress,
  onAddHighlight,
  onDeleteHighlight,
  onAddPageSticker,
  onDeletePageSticker,
  roomBg,
}) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNumber, setPageNumber] = useState(book.currentPage || 1);
  const [scale, setScale] = useState(1.2);

  // Settings states
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'sepia'>('light');
  const [isReflowMode, setIsReflowMode] = useState(false);
  const [scrollMode, setScrollMode] = useState<'page' | 'scroll'>('page');
  const [fontFamily, setFontFamily] = useState<'sans' | 'serif' | 'comic'>('sans');
  const [textSize, setTextSize] = useState(18); // px
  const [lineHeight, setLineHeight] = useState<'normal' | 'relaxed' | 'loose'>('relaxed');

  // Drawer / Popover views
  const [showSettingsPopover, setShowSettingsPopover] = useState(false);
  const [showHighlightsSidebar, setShowHighlightsSidebar] = useState(false);
  const [showEmojiDrawer, setShowEmojiDrawer] = useState(false);
  const [showAudioPopover, setShowAudioPopover] = useState(false);

  // Audio settings states
  const [audioStates, setAudioStates] = useState(CozyAudio.getStates());
  const [audioVolumes, setAudioVolumes] = useState(CozyAudio.getVolumes());

  const readerContainerRef = useRef<HTMLDivElement>(null);

  // Stop all ambient sounds when exiting/unmounting the reader room
  useEffect(() => {
    return () => {
      CozyAudio.stopAll();
    };
  }, []);

  const handleToggleAudio = (type: 'rain' | 'fire' | 'music') => {
    const nextPlay = !audioStates[type];
    if (type === 'rain') CozyAudio.toggleRain(nextPlay);
    if (type === 'fire') CozyAudio.toggleFire(nextPlay);
    if (type === 'music') CozyAudio.toggleMusic(nextPlay);
    setAudioStates(CozyAudio.getStates());
  };

  const handleVolumeChange = (type: 'rain' | 'fire' | 'music', val: number) => {
    CozyAudio.setVolume(type, val);
    setAudioVolumes(CozyAudio.getVolumes());
  };

  // Load PDF Document
  useEffect(() => {
    let active = true;
    const loadPdf = async () => {
      try {
        const loadingTask = pdfjs.getDocument({ data: book.fileData.slice(0) });
        const pdf = await loadingTask.promise;
        if (active) {
          setPdfDoc(pdf);
        }
      } catch (err) {
        console.error('Error loading PDF:', err);
        alert('Could not render the PDF document.');
      }
    };
    loadPdf();
    return () => {
      active = false;
    };
  }, [book]);

  // Update Reading Progress & Trigger Confetti celebration
  useEffect(() => {
    onUpdateProgress(book.id, pageNumber);

    if (pdfDoc && pageNumber === pdfDoc.numPages && pdfDoc.numPages > 1) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.85 },
        colors: ['#FDA4AF', '#C2D3C6', '#D1C9E9', '#FDE047'],
      });
    }
  }, [pageNumber, pdfDoc]);

  // IntersectionObserver for vertical scrolling mode
  useEffect(() => {
    if (scrollMode !== 'scroll' || !pdfDoc || !readerContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageNum = parseInt(entry.target.getAttribute('data-page') || '1');
            setPageNumber(pageNum);
          }
        });
      },
      {
        root: readerContainerRef.current,
        threshold: 0.35, // visible if at least 35% on screen
      }
    );

    // Give Vite render thread a moment to layout the pages
    const timer = setTimeout(() => {
      const containers = document.querySelectorAll('[data-page-container]');
      containers.forEach((el) => observer.observe(el));
    }, 150);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [scrollMode, pdfDoc, isReflowMode, scale]);

  // Handle emoji reactions placements
  const handlePlaceEmoji = (emoji: string) => {
    const newSticker: PageSticker = {
      id: crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString() + Math.random().toString()),
      bookId: book.id,
      pageNumber: pageNumber,
      emoji: emoji,
      positionX: 45 + Math.random() * 10, // centered with minor noise
      positionY: 45 + Math.random() * 10,
    };
    onAddPageSticker(newSticker);
    setShowEmojiDrawer(false);
  };

  const handleUpdateStickerPositionInState = (stickerId: string, positionX: number, positionY: number) => {
    // Parent components/IndexedDB handle database storage. We pass update calls directly
    const sticker = pageStickers.find((s) => s.id === stickerId);
    if (sticker) {
      onAddPageSticker({
        ...sticker,
        positionX,
        positionY,
      });
    }
  };

  // Highlighting callback mapping
  const handleAddHighlightFromPage = (colorValue: string, textSnippet: string, range: Range) => {
    const containerElement = document.querySelector(`[data-page-container][data-page="${pageNumber}"]`);
    if (!containerElement) return;

    const containerRect = containerElement.getBoundingClientRect();
    const clientRects = range.getClientRects();

    // In Reflow Mode, highlight is inline text based, so we do not save canvas-aligned coordinate rects.
    const rects = isReflowMode
      ? []
      : Array.from(clientRects).map((r) => ({
          left: ((r.left - containerRect.left) / containerRect.width) * 100,
          top: ((r.top - containerRect.top) / containerRect.height) * 100,
          width: (r.width / containerRect.width) * 100,
          height: (r.height / containerRect.height) * 100,
        }));

    const newHighlight: Highlight = {
      id: crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString() + Math.random().toString()),
      bookId: book.id,
      pageNumber: pageNumber,
      rects: rects,
      color: colorValue,
      text: textSnippet,
      createdAt: Date.now(),
    };

    onAddHighlight(newHighlight);
  };

  // Dynamic aesthetic class styles
  // Theme color styles dynamically matched to the active room background color
  const getThemeColors = () => {
    switch (themeMode) {
      case 'dark':
        switch (roomBg) {
          case 'sage':
            return {
              bg: 'bg-[#1C2520]',
              text: 'text-[#DFECE2]',
              pageBg: 'bg-[#24302A]',
              pageText: 'text-[#DFECE2]',
              pageBorder: 'border-[#2D3E35]',
              headerBg: 'bg-[#24302A]/90 border-b border-[#2D3E35]',
              popoverBg: 'bg-[#24302A] border-[#2D3E35] text-[#DFECE2]',
              canvasFilter: 'invert-[0.9] hue-rotate-[110deg] contrast-[1.1] brightness-[0.95]',
            };
          case 'rose':
            return {
              bg: 'bg-[#2A1E1E]',
              text: 'text-[#F5EBEA]',
              pageBg: 'bg-[#332727]',
              pageText: 'text-[#F5EBEA]',
              pageBorder: 'border-[#423333]',
              headerBg: 'bg-[#332727]/90 border-b border-[#423333]',
              popoverBg: 'bg-[#332727] border-[#423333] text-[#F5EBEA]',
              canvasFilter: 'invert-[0.9] hue-rotate-[330deg] contrast-[1.1] brightness-[0.95]',
            };
          case 'lavender':
            return {
              bg: 'bg-[#1F1A2E]',
              text: 'text-[#EDE9FB]',
              pageBg: 'bg-[#29233D]',
              pageText: 'text-[#EDE9FB]',
              pageBorder: 'border-[#382F54]',
              headerBg: 'bg-[#29233D]/90 border-b border-[#382F54]',
              popoverBg: 'bg-[#29233D] border-[#382F54] text-[#EDE9FB]',
              canvasFilter: 'invert-[0.9] hue-rotate-[240deg] contrast-[1.1] brightness-[0.95]',
            };
          case 'cream':
          default:
            return {
              bg: 'bg-[#231F1E]',
              text: 'text-[#E6DFDA]',
              pageBg: 'bg-[#2E2A29]',
              pageText: 'text-[#E6DFDA]',
              pageBorder: 'border-[#3E3836]',
              headerBg: 'bg-[#2E2A29]/90 border-b border-[#3E3836]',
              popoverBg: 'bg-[#2E2A29] border-[#3E3836] text-[#E6DFDA]',
              canvasFilter: 'invert-[0.9] hue-rotate-[0deg] contrast-[1.15] brightness-[0.95]',
            };
        }
      case 'sepia':
        switch (roomBg) {
          case 'sage':
            return {
              bg: 'bg-[#DFE8E0]',
              text: 'text-[#3C4E41]',
              pageBg: 'bg-[#D0DDD2]',
              pageText: 'text-[#3C4E41]',
              pageBorder: 'border-[#BACCC0]',
              headerBg: 'bg-[#D0DDD2]/90 border-b border-[#BACCC0]',
              popoverBg: 'bg-[#D0DDD2] border-[#BACCC0] text-[#3C4E41]',
              canvasFilter: 'sepia-[0.4] saturate-[0.8] contrast-[0.95] brightness-[1.01]',
            };
          case 'rose':
            return {
              bg: 'bg-[#F2DFDD]',
              text: 'text-[#634948]',
              pageBg: 'bg-[#E5CECB]',
              pageText: 'text-[#634948]',
              pageBorder: 'border-[#D9BDB9]',
              headerBg: 'bg-[#E5CECB]/90 border-b border-[#D9BDB9]',
              popoverBg: 'bg-[#E5CECB] border-[#D9BDB9] text-[#634948]',
              canvasFilter: 'sepia-[0.4] hue-rotate-[340deg] saturate-[0.9] contrast-[0.95] brightness-[1.01]',
            };
          case 'lavender':
            return {
              bg: 'bg-[#EBE5FA]',
              text: 'text-[#4E456B]',
              pageBg: 'bg-[#DED4F5]',
              pageText: 'text-[#4E456B]',
              pageBorder: 'border-[#CDBCF0]',
              headerBg: 'bg-[#DED4F5]/90 border-b border-[#CDBCF0]',
              popoverBg: 'bg-[#DED4F5] border-[#CDBCF0] text-[#4E456B]',
              canvasFilter: 'sepia-[0.3] hue-rotate-[240deg] saturate-[0.8] contrast-[0.95] brightness-[1.01]',
            };
          case 'cream':
          default:
            return {
              bg: 'bg-[#F5ECCF]',
              text: 'text-[#4A3B32]',
              pageBg: 'bg-[#EFE5C9]',
              pageText: 'text-[#5C4A3F]',
              pageBorder: 'border-[#dcd0ad]',
              headerBg: 'bg-[#EFE5C9]/95 border-b border-[#dcd0ad]',
              popoverBg: 'bg-[#EFE5C9] border-[#dcd0ad] text-[#5C4A3F]',
              canvasFilter: 'sepia-[0.55] contrast-[0.9] saturate-[1.1] brightness-[1.02]',
            };
        }
      case 'light':
      default:
        switch (roomBg) {
          case 'sage':
            return {
              bg: 'bg-[#E8EFE9]',
              text: 'text-[#2F3E33]',
              pageBg: 'bg-white',
              pageText: 'text-[#2F3E33]',
              pageBorder: 'border-[#C2D3C6]/50',
              headerBg: 'bg-white/80 backdrop-blur-md border-b border-[#C2D3C6]/30',
              popoverBg: 'bg-white border-[#C2D3C6] text-[#2F3E33]',
              canvasFilter: 'none',
            };
          case 'rose':
            return {
              bg: 'bg-[#FAECEB]',
              text: 'text-[#543A39]',
              pageBg: 'bg-white',
              pageText: 'text-[#543A39]',
              pageBorder: 'border-[#E3C4C2]/50',
              headerBg: 'bg-white/80 backdrop-blur-md border-b border-[#E3C4C2]/30',
              popoverBg: 'bg-white border-[#E3C4C2] text-[#543A39]',
              canvasFilter: 'none',
            };
          case 'lavender':
            return {
              bg: 'bg-[#F2EFFF]',
              text: 'text-[#3A3354]',
              pageBg: 'bg-white',
              pageText: 'text-[#3A3354]',
              pageBorder: 'border-[#D1C9E9]/50',
              headerBg: 'bg-white/80 backdrop-blur-md border-b border-[#D1C9E9]/30',
              popoverBg: 'bg-white border-[#D1C9E9] text-[#3A3354]',
              canvasFilter: 'none',
            };
          case 'cream':
          default:
            return {
              bg: 'bg-[#FDF6F0]',
              text: 'text-stone-700',
              pageBg: 'bg-white',
              pageText: 'text-stone-600',
              pageBorder: 'border-orange-100/50',
              headerBg: 'bg-white/80 backdrop-blur-md border-b border-orange-100/30',
              popoverBg: 'bg-white border-orange-100 text-stone-700',
              canvasFilter: 'none',
            };
        }
    }
  };

  const colors = getThemeColors();

  // Navigation pages triggers
  const handlePrevPage = () => {
    if (scrollMode === 'scroll') {
      const prevEl = document.querySelector(`[data-page-container][data-page="${pageNumber - 1}"]`);
      prevEl?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setPageNumber((p) => Math.max(1, p - 1));
    }
  };

  const handleNextPage = () => {
    if (scrollMode === 'scroll') {
      const nextEl = document.querySelector(`[data-page-container][data-page="${pageNumber + 1}"]`);
      nextEl?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setPageNumber((p) => Math.min(pdfDoc.numPages, p + 1));
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-start overflow-hidden transition-all duration-500 ${colors.bg} ${colors.text}`}
    >
      {/* Reader Navigation Header */}
      <header className={`w-full py-4 px-6 flex items-center justify-between z-30 ${colors.headerBg}`}>
        {/* Back to Cupboard */}
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-black/5 active:scale-95 transition-all text-xs font-bold font-quicksand cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Shelves</span>
        </button>

        {/* Center Navigation */}
        <div className="flex items-center gap-4 font-quicksand">
          <button
            disabled={pageNumber <= 1}
            onClick={handlePrevPage}
            className="p-1.5 rounded-full hover:bg-black/5 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <span className="text-sm font-bold tracking-wide">
            {pageNumber} / {pdfDoc ? pdfDoc.numPages : '...'}
          </span>

          <button
            disabled={!pdfDoc || pageNumber >= pdfDoc.numPages}
            onClick={handleNextPage}
            className="p-1.5 rounded-full hover:bg-black/5 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Tools */}
        <div className="flex items-center gap-2 relative">
          
          {/* Scrolling Mode quick toggle (Page vs Scroll) */}
          <button
            onClick={() => setScrollMode((m) => (m === 'page' ? 'scroll' : 'page'))}
            className={`p-2 rounded-full hover:bg-black/5 transition-all cursor-pointer ${
              scrollMode === 'scroll' ? 'bg-rose-100 text-rose-500' : ''
            }`}
            title={`Toggle Scrolling Mode (${scrollMode === 'scroll' ? 'Vertical Scroll' : 'Page Flipping'})`}
          >
            <Scroll className="w-4 h-4" />
          </button>

          {/* Emoji Reaction Drawer Trigger */}
          <div className="relative">
            <button
              onClick={() => {
                setShowEmojiDrawer(!showEmojiDrawer);
                setShowSettingsPopover(false);
                setShowHighlightsSidebar(false);
              }}
              className={`p-2 rounded-full hover:bg-black/5 transition-all cursor-pointer ${
                showEmojiDrawer ? 'bg-black/5' : ''
              }`}
              title="React with Emoji Sticker"
            >
              <Smile className="w-4 h-4" />
            </button>

            {/* Emoji catalog popup */}
            {showEmojiDrawer && (
              <div
                className={`absolute right-0 mt-2 p-3.5 rounded-2xl shadow-xl border z-40 flex flex-col gap-2.5 font-quicksand w-52 ${colors.popoverBg}`}
              >
                <div className="flex justify-between items-center border-b border-black/5 pb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Stick Emoji reaction</span>
                  <button onClick={() => setShowEmojiDrawer(false)} className="text-[10px] hover:text-rose-400">✕</button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {EMOJI_STICKERS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handlePlaceEmoji(emoji)}
                      className="text-2xl hover:scale-125 transition-transform p-1.5 rounded-lg hover:bg-black/5 cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <span className="text-[9px] opacity-50 text-center leading-normal">
                  Spawns emoji on the page. Drag to place exactly on paragraphs!
                </span>
              </div>
            )}
          </div>

          {/* Zoom Controls (Canvas only) */}
          {!isReflowMode && (
            <div className="flex items-center border border-black/5 rounded-full px-1 py-0.5 bg-black/5">
              <button
                onClick={() => setScale((s) => Math.max(0.6, s - 0.15))}
                className="p-1 hover:bg-black/10 rounded-full transition-colors cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-bold px-1.5 w-10 text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={() => setScale((s) => Math.min(2.5, s + 0.15))}
                className="p-1 hover:bg-black/10 rounded-full transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Ambient Soundscapes Headphones Controller */}
          <div className="relative">
            <button
              onClick={() => {
                setShowAudioPopover(!showAudioPopover);
                setShowSettingsPopover(false);
                setShowHighlightsSidebar(false);
                setShowEmojiDrawer(false);
              }}
              className={`p-2 rounded-full hover:bg-black/5 transition-all cursor-pointer ${
                showAudioPopover ? 'bg-black/5' : ''
              } ${audioStates.rain || audioStates.fire || audioStates.music ? 'text-rose-400 animate-pulse' : ''}`}
              title="Cozy Soundscapes & Ambient Music"
            >
              <Headphones className="w-4 h-4" />
            </button>

            {/* Audio mixer popover */}
            {showAudioPopover && (
              <div
                className={`absolute right-0 mt-2 w-72 rounded-2xl p-4 shadow-xl border z-40 flex flex-col gap-4 font-quicksand ${colors.popoverBg}`}
              >
                <div className="flex justify-between items-center pb-2 border-b border-black/5">
                  <h4 className="font-bold text-xs flex items-center gap-1.5">
                    <Headphones className="w-4 h-4 text-rose-300" />
                    <span>Cozy Atmosphere ✧</span>
                  </h4>
                  <button
                    onClick={() => setShowAudioPopover(false)}
                    className="text-[10px] font-bold opacity-60 hover:opacity-100"
                  >
                    Done
                  </button>
                </div>

                {/* Sound 1: Rain Patter */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-stone-700 flex items-center gap-1">
                      <span>🌧️</span> Rain Patter
                    </span>
                    <button
                      onClick={() => handleToggleAudio('rain')}
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full cursor-pointer transition-colors ${
                        audioStates.rain
                          ? 'bg-rose-100 text-rose-600'
                          : 'bg-black/5 text-stone-500 hover:bg-black/10'
                      }`}
                    >
                      {audioStates.rain ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  {audioStates.rain && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[9px] opacity-50">Vol</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={audioVolumes.rain}
                        onChange={(e) => handleVolumeChange('rain', parseFloat(e.target.value))}
                        className="w-full accent-rose-300 cursor-pointer h-1 rounded-lg bg-black/5 appearance-none"
                      />
                    </div>
                  )}
                </div>

                {/* Sound 2: Hearth Crackle */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-black/5">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-stone-700 flex items-center gap-1">
                      <span>🔥</span> Hearth Crackle
                    </span>
                    <button
                      onClick={() => handleToggleAudio('fire')}
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full cursor-pointer transition-colors ${
                        audioStates.fire
                          ? 'bg-rose-100 text-rose-600'
                          : 'bg-black/5 text-stone-500 hover:bg-black/10'
                      }`}
                    >
                      {audioStates.fire ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  {audioStates.fire && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[9px] opacity-50">Vol</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={audioVolumes.fire}
                        onChange={(e) => handleVolumeChange('fire', parseFloat(e.target.value))}
                        className="w-full accent-rose-300 cursor-pointer h-1 rounded-lg bg-black/5 appearance-none"
                      />
                    </div>
                  )}
                </div>

                {/* Sound 3: Lofi Music */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-black/5">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-stone-700 flex items-center gap-1">
                      <span>🎹</span> Cozy Lofi Chords
                    </span>
                    <button
                      onClick={() => handleToggleAudio('music')}
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full cursor-pointer transition-colors ${
                        audioStates.music
                          ? 'bg-rose-100 text-rose-600'
                          : 'bg-black/5 text-stone-500 hover:bg-black/10'
                      }`}
                    >
                      {audioStates.music ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  {audioStates.music && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[9px] opacity-50">Vol</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={audioVolumes.music}
                        onChange={(e) => handleVolumeChange('music', parseFloat(e.target.value))}
                        className="w-full accent-rose-300 cursor-pointer h-1 rounded-lg bg-black/5 appearance-none"
                      />
                    </div>
                  )}
                </div>

                <div className="text-[9px] opacity-50 text-center border-t border-black/5 pt-2">
                  Natively generated real-time soundscapes using browser synthesis. Play together to mix your perfect atmosphere!
                </div>
              </div>
            )}
          </div>

          {/* Preferences */}
          <button
            onClick={() => {
              setShowSettingsPopover(!showSettingsPopover);
              setShowHighlightsSidebar(false);
              setShowEmojiDrawer(false);
            }}
            className={`p-2 rounded-full hover:bg-black/5 transition-all cursor-pointer ${
              showSettingsPopover ? 'bg-black/5' : ''
            }`}
            title="Reading Room Settings"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Settings popover */}
          {showSettingsPopover && (
            <div
              className={`absolute right-0 mt-14 w-72 rounded-2xl p-4 shadow-xl border z-40 flex flex-col gap-4 font-quicksand ${colors.popoverBg}`}
            >
              <div className="flex justify-between items-center pb-2 border-b border-black/5">
                <h4 className="font-bold text-xs">Room Preferences</h4>
                <button
                  onClick={() => setShowSettingsPopover(false)}
                  className="text-[10px] font-bold opacity-60 hover:opacity-100"
                >
                  Done
                </button>
              </div>

              {/* Layout Mode */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Layout Mode</span>
                <div className="grid grid-cols-2 gap-1 bg-black/5 p-0.5 rounded-xl">
                  <button
                    onClick={() => setIsReflowMode(false)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      !isReflowMode ? 'bg-white text-stone-700 shadow-sm' : 'opacity-65 hover:opacity-100'
                    }`}
                  >
                    Canvas View
                  </button>
                  <button
                    onClick={() => setIsReflowMode(true)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isReflowMode ? 'bg-white text-stone-700 shadow-sm' : 'opacity-65 hover:opacity-100'
                    }`}
                  >
                    Cozy Reflow
                  </button>
                </div>
              </div>

              {/* Scroll mode selector */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Scrolling Style</span>
                <div className="grid grid-cols-2 gap-1 bg-black/5 p-0.5 rounded-xl">
                  <button
                    onClick={() => setScrollMode('page')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      scrollMode === 'page' ? 'bg-white text-stone-700 shadow-sm' : 'opacity-65 hover:opacity-100'
                    }`}
                  >
                    Page Flip
                  </button>
                  <button
                    onClick={() => setScrollMode('scroll')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      scrollMode === 'scroll' ? 'bg-white text-stone-700 shadow-sm' : 'opacity-65 hover:opacity-100'
                    }`}
                  >
                    Vertical Scroll
                  </button>
                </div>
              </div>

              {/* Comfort mode selection */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Comfort Mode</span>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'light', label: 'Light', color: 'bg-white text-stone-700 border-orange-100' },
                    { id: 'sepia', label: 'Sepia', color: 'bg-[#EFE5C9] text-[#4A3B32] border-[#dcd0ad]' },
                    { id: 'dark', label: 'Espresso', color: 'bg-[#2E2A29] text-stone-100 border-stone-800' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setThemeMode(t.id as any)}
                      className={`py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                        themeMode === t.id
                          ? 'ring-2 ring-rose-300 border-transparent shadow-sm'
                          : 'hover:scale-[1.02]'
                      } ${t.color}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Typography controls */}
              {isReflowMode && (
                <div className="flex flex-col gap-3 pt-2 border-t border-black/5 animate-fade-in">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Typography</span>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { id: 'sans', label: 'Sans', font: 'font-quicksand' },
                        { id: 'serif', label: 'Serif', font: 'font-playfair' },
                        { id: 'comic', label: 'Dyslexic', font: 'font-comic' },
                      ].map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setFontFamily(f.id as any)}
                          className={`py-1 rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
                            fontFamily === f.id
                              ? 'border-rose-300 bg-rose-50/20 text-rose-500'
                              : 'border-black/5 hover:bg-black/5'
                          } ${f.font}`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font size */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Text Size</span>
                      <span className="text-[10px] font-bold">{textSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="14"
                      max="32"
                      value={textSize}
                      onChange={(e) => setTextSize(parseInt(e.target.value))}
                      className="w-full accent-rose-300 cursor-pointer"
                    />
                  </div>

                  {/* Line height */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Line Spacing</span>
                    <div className="grid grid-cols-3 gap-1 bg-black/5 p-0.5 rounded-lg">
                      {[
                        { id: 'normal', label: 'Snug' },
                        { id: 'relaxed', label: 'Cozy' },
                        { id: 'loose', label: 'Airy' },
                      ].map((lh) => (
                        <button
                          key={lh.id}
                          onClick={() => setLineHeight(lh.id as any)}
                          className={`py-1 rounded-md text-[10px] font-bold cursor-pointer transition-all ${
                            lineHeight === lh.id
                              ? 'bg-white text-stone-700 shadow-sm'
                              : 'opacity-65 hover:opacity-100'
                          }`}
                        >
                          {lh.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Highlights Sidebar */}
          <button
            onClick={() => {
              setShowHighlightsSidebar(!showHighlightsSidebar);
              setShowSettingsPopover(false);
              setShowEmojiDrawer(false);
            }}
            className={`p-2 rounded-full hover:bg-black/5 transition-all cursor-pointer ${
              showHighlightsSidebar ? 'bg-black/5' : ''
            }`}
            title="Saved Highlights"
          >
            <Bookmark className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main scrolling/page layout view area */}
      <div
        ref={readerContainerRef}
        className="flex-1 w-full overflow-y-auto flex flex-col items-center py-8 px-4 gap-8 scroll-smooth"
      >
        {!pdfDoc ? (
          <div className="flex flex-col items-center justify-center gap-2 opacity-50 py-24 font-quicksand">
            <div className="w-6 h-6 border-2 border-rose-300 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs">Preparing cozy pages...</p>
          </div>
        ) : scrollMode === 'scroll' ? (
          /* VERTICAL SCROLL MODE (Lazy render canvas blocks) */
          Array.from({ length: pdfDoc.numPages }).map((_, idx) => {
            const pageNo = idx + 1;
            const isNearVisible = Math.abs(pageNo - pageNumber) <= 1; // render visible and adjacent pages

            return (
              <div key={pageNo} className="flex flex-col items-center gap-2">
                <span className="text-[10px] font-bold opacity-30 select-none">PAGE {pageNo}</span>
                <ReaderPage
                  pdfDoc={pdfDoc}
                  pageNumber={pageNo}
                  scale={scale}
                  isReflowMode={isReflowMode}
                  textSize={textSize}
                  fontFamily={fontFamily}
                  lineHeight={lineHeight}
                  themeColors={colors}
                  highlights={highlights.filter((h) => h.pageNumber === pageNo)}
                  stickers={pageStickers.filter((s) => s.pageNumber === pageNo)}
                  onAddHighlight={handleAddHighlightFromPage}
                  onDeleteSticker={onDeletePageSticker}
                  onUpdateStickerPosition={handleUpdateStickerPositionInState}
                  lazyRender={!isNearVisible}
                />
              </div>
            );
          })
        ) : (
          /* COZY PAGE FLIP MODE (Single page layout) */
          <div className="flex flex-col items-center">
            <ReaderPage
              pdfDoc={pdfDoc}
              pageNumber={pageNumber}
              scale={scale}
              isReflowMode={isReflowMode}
              textSize={textSize}
              fontFamily={fontFamily}
              lineHeight={lineHeight}
              themeColors={colors}
              highlights={highlights.filter((h) => h.pageNumber === pageNumber)}
              stickers={pageStickers.filter((s) => s.pageNumber === pageNumber)}
              onAddHighlight={handleAddHighlightFromPage}
              onDeleteSticker={onDeletePageSticker}
              onUpdateStickerPosition={handleUpdateStickerPositionInState}
            />
          </div>
        )}
      </div>

      {/* Highlights Sidebar drawer */}
      <HighlightsSidebar
        isOpen={showHighlightsSidebar}
        onClose={() => setShowHighlightsSidebar(false)}
        highlights={highlights}
        onDeleteHighlight={onDeleteHighlight}
        onNavigateToPage={(p) => {
          if (scrollMode === 'scroll') {
            const pageEl = document.querySelector(`[data-page-container][data-page="${p}"]`);
            pageEl?.scrollIntoView({ behavior: 'smooth' });
          } else {
            setPageNumber(p);
          }
          setShowHighlightsSidebar(false);
        }}
        themeMode={themeMode}
      />
    </div>
  );
};
