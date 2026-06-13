import React, { useState, useRef } from 'react';
import type { Book, Decoration } from '../utils/db';
import {
  SucculentIcon,
  HangingIvyIcon,
  TulipsIcon,
  HeartSticker,
  StarSticker,
  CloudSticker,
  GlitterSticker,
  KeychainIcon,
  FairyLightsIcon,
  CandleIcon,
  BookIcon
} from './AestheticAssets';
import { Trash2 } from 'lucide-react';

interface CupboardProps {
  theme: 'cottagecore' | 'pastel' | 'academic' | 'scandinavian';
  books: Book[];
  decorations: Decoration[];
  onOpenBook: (bookId: string) => void;
  onUpdateBookShelf: (bookId: string, shelfId: number, positionX: number) => void;
  onUpdateDecorationPosition: (decorId: string, positionX: number, positionY: number) => void;
  onDeleteBook: (bookId: string) => void;
  onDeleteDecoration: (decorId: string) => void;
}

const SHELF_TOPS = [30, 55, 80]; // percentages from top of the cupboard

export const Cupboard: React.FC<CupboardProps> = ({
  theme,
  books,
  decorations,
  onOpenBook,
  onUpdateBookShelf,
  onUpdateDecorationPosition,
  onDeleteBook,
  onDeleteDecoration,
}) => {
  const cupboardRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0, time: 0 });

  // Dragging state
  const [dragging, setDragging] = useState<{
    id: string;
    type: 'book' | 'decor';
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const [tempCoords, setTempCoords] = useState({ x: 0, y: 0 });
  const [isOverTrash, setIsOverTrash] = useState(false);
  const trashRef = useRef<HTMLDivElement>(null);

  // Cupboard theme classes
  const getThemeClasses = () => {
    switch (theme) {
      case 'cottagecore':
        return {
          cabinet: 'border-[16px] border-[#8b5a2b] bg-[#FAF5F0] rounded-3xl shadow-2xl relative overflow-hidden wood-cottagecore',
          shelfWood: 'wood-cottagecore-shelf',
          lighting: 'absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-yellow-100/30 to-transparent pointer-events-none z-10',
          title: 'text-[#5c2e16] font-bold',
          caption: 'text-[#8b5a2b]',
        };
      case 'pastel':
        return {
          cabinet: 'border-[16px] border-[#ffffff] bg-gradient-to-b from-[#FFF5F5] to-[#F5F5FF] rounded-3xl shadow-xl relative overflow-hidden wood-pastel',
          shelfWood: 'wood-pastel-shelf',
          lighting: 'absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-rose-200/10 to-transparent pointer-events-none z-10',
          title: 'text-[#a27b8c] font-bold',
          caption: 'text-[#c6a4b4]',
        };
      case 'academic':
        return {
          cabinet: 'border-[16px] border-[#1f1209] bg-[#221815] rounded-3xl shadow-2xl relative overflow-hidden wood-academic',
          shelfWood: 'wood-academic-shelf',
          lighting: 'absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-orange-400/15 via-orange-400/5 to-transparent pointer-events-none z-10',
          title: 'text-[#ebdcb9] font-bold',
          caption: 'text-[#a48e71]',
        };
      case 'scandinavian':
        return {
          cabinet: 'border-[12px] border-[#dfd0be] bg-[#F9FAFB] rounded-3xl shadow-lg relative overflow-hidden wood-scandi',
          shelfWood: 'wood-scandi-shelf',
          lighting: 'absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-blue-100/20 to-transparent pointer-events-none z-10',
          title: 'text-[#57534e] font-bold',
          caption: 'text-[#a8a29e]',
        };
    }
  };

  const currentTheme = getThemeClasses();

  // Render decorative SVGs
  const renderDecorationIcon = (subType: string) => {
    switch (subType) {
      case 'succulent':
        return <SucculentIcon />;
      case 'ivy':
        return <HangingIvyIcon />;
      case 'tulip':
        return <TulipsIcon />;
      case 'heart':
        return <HeartSticker />;
      case 'star':
        return <StarSticker />;
      case 'cloud':
        return <CloudSticker />;
      case 'glitter':
        return <GlitterSticker />;
      case 'keychain':
        return <KeychainIcon />;
      case 'fairy_lights':
        return <FairyLightsIcon />;
      case 'candle':
        return <CandleIcon />;
      default:
        return null;
    }
  };

  // Pointer Handlers
  const handlePointerDown = (
    e: React.PointerEvent,
    itemId: string,
    itemType: 'book' | 'decor',
    currX: number,
    currY: number
  ) => {
    if (!cupboardRef.current) return;
    e.stopPropagation();

    // Store drag origin
    dragStart.current = { x: e.clientX, y: e.clientY, time: Date.now() };

    const rect = cupboardRef.current.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;

    // Convert percentage to pixel coordinates
    const itemX = (currX / 100) * rect.width;
    const itemY = (currY / 100) * rect.height;

    setDragging({
      id: itemId,
      type: itemType,
      offsetX: pointerX - itemX,
      offsetY: pointerY - itemY,
    });

    setTempCoords({ x: currX, y: currY });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || !cupboardRef.current) return;
    e.stopPropagation();

    const rect = cupboardRef.current.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;

    // Calculate new position
    const newX = pointerX - dragging.offsetX;
    const newY = pointerY - dragging.offsetY;

    // Convert back to percentages and bound (0 - 100)
    const newXPercent = Math.max(2, Math.min(98, (newX / rect.width) * 100));
    const newYPercent = Math.max(2, Math.min(98, (newY / rect.height) * 100));

    setTempCoords({ x: newXPercent, y: newYPercent });

    // Check if dragging over the trash bin
    if (trashRef.current) {
      const trashRect = trashRef.current.getBoundingClientRect();
      const isOver =
        e.clientX >= trashRect.left &&
        e.clientX <= trashRect.right &&
        e.clientY >= trashRect.top &&
        e.clientY <= trashRect.bottom;
      setIsOverTrash(isOver);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragging) return;
    e.stopPropagation();
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    const clickDist = Math.sqrt(
      Math.pow(e.clientX - dragStart.current.x, 2) +
      Math.pow(e.clientY - dragStart.current.y, 2)
    );
    const clickDuration = Date.now() - dragStart.current.time;

    // Determine if it was a quick click/tap rather than a dragging motion
    // Relaxed distance to 15px and duration to 600ms for robust responsiveness
    if (clickDist < 15 && clickDuration < 600) {
      if (dragging.type === 'book') {
        onOpenBook(dragging.id);
      }
      setDragging(null);
      setIsOverTrash(false);
      return;
    }

    if (isOverTrash) {
      if (dragging.type === 'book') {
        onDeleteBook(dragging.id);
      } else {
        onDeleteDecoration(dragging.id);
      }
    } else {
      let finalX = tempCoords.x;
      let finalY = tempCoords.y;

      const matchedDecor = decorations.find((d) => d.id === dragging.id);
      const isSticker =
        dragging.type === 'decor' &&
        matchedDecor &&
        ['heart', 'star', 'cloud', 'glitter', 'fairy_lights'].includes(matchedDecor.subType);

      if (dragging.type === 'book') {
        // Snap to nearest shelf
        const nearestShelfIdx = SHELF_TOPS.reduce((prevIdx, currTop, idx) => {
          return Math.abs(currTop - finalY) < Math.abs(SHELF_TOPS[prevIdx] - finalY) ? idx : prevIdx;
        }, 0);
        onUpdateBookShelf(dragging.id, nearestShelfIdx, finalX);
      } else {
        if (!isSticker) {
          // Snap non-sticker decorations to nearest shelf
          const nearestShelfTop = SHELF_TOPS.reduce((prev, curr) => {
            return Math.abs(curr - finalY) < Math.abs(prev - finalY) ? curr : prev;
          }, SHELF_TOPS[0]);
          finalY = nearestShelfTop;
        }
        onUpdateDecorationPosition(dragging.id, finalX, finalY);
      }
    }

    setDragging(null);
    setIsOverTrash(false);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-2xl px-4 py-8">
      {/* Decorative Title Area */}
      <div className="text-center mb-6">
        <h2 className={`text-3xl font-quicksand font-bold tracking-wide ${currentTheme.title}`}>
          My Cozy Library
        </h2>
        <p className={`text-sm font-medium mt-1 font-quicksand ${currentTheme.caption}`}>
          Place books on shelves, decorate with plants, candle light or stickers, and click to read.
        </p>
      </div>

      {/* Main Cupboard Cabinet */}
      <div
        ref={cupboardRef}
        onPointerMove={handlePointerMove}
        className={`w-full aspect-[4/5] ${currentTheme.cabinet}`}
        style={{ touchAction: 'none' }}
      >
        {/* Soft glowing lighting effect */}
        <div className={currentTheme.lighting}></div>

        {/* Shelves rendering */}
        {SHELF_TOPS.map((top, idx) => (
          <div
            key={idx}
            className={`absolute left-2 right-2 h-4 z-10 rounded ${currentTheme.shelfWood}`}
            style={{ top: `${top}%` }}
          >
            {/* Shelf Under-Shadow */}
            <div className="absolute top-4 left-0 right-0 h-6 bg-gradient-to-b from-black/20 to-transparent pointer-events-none"></div>
          </div>
        ))}

        {/* Placed Books Rendering */}
        {books.map((book) => {
          // If being dragged currently, display at pointer position
          const isDraggingThis = dragging && dragging.type === 'book' && dragging.id === book.id;
          const leftPercent = isDraggingThis ? tempCoords.x : book.positionX;
          
          // Calculate bottom position relative to snapped shelf
          const shelfTop = SHELF_TOPS[book.shelfId];
          const bottomPercent = isDraggingThis ? 100 - tempCoords.y : 100 - shelfTop;

          // Calculate reading percentage
          const progressPercent = book.totalPages > 0 ? (book.currentPage / book.totalPages) * 100 : 0;

          return (
            <div
              key={book.id}
              className="absolute z-20 group"
              style={{
                left: `${leftPercent}%`,
                bottom: `${bottomPercent}%`,
                transform: 'translateX(-50%)',
                cursor: dragging ? 'grabbing' : 'grab',
                opacity: isDraggingThis && isOverTrash ? 0.4 : 1,
                transition: isDraggingThis ? 'none' : 'bottom 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.1), left 0.1s linear',
              }}
              onPointerDown={(e) =>
                handlePointerDown(
                  e,
                  book.id,
                  'book',
                  book.positionX,
                  isDraggingThis ? tempCoords.y : shelfTop
                )
              }
              onPointerUp={handlePointerUp}
              onDoubleClick={() => onOpenBook(book.id)}
            >
              {/* Cozy floating label on hover */}
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#faeceb] text-[#543a39] border border-[#e3c4c2] text-[10px] font-bold px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap shadow-md font-quicksand z-30">
                Read ✧
              </div>
              <BookIcon title={book.title} progress={progressPercent} />
            </div>
          );
        })}

        {/* Placed Decorations Rendering */}
        {decorations.map((decor) => {
          const isDraggingThis = dragging && dragging.type === 'decor' && dragging.id === decor.id;
          const leftPercent = isDraggingThis ? tempCoords.x : decor.positionX;
          const isSticker = ['heart', 'star', 'cloud', 'glitter', 'fairy_lights'].includes(decor.subType);

          // Stickers position by TOP, shelves decorations by BOTTOM
          const topPercent = isDraggingThis ? tempCoords.y : decor.positionY;
          const bottomPercent = 100 - topPercent;

          const positionStyle = isSticker
            ? { left: `${leftPercent}%`, top: `${topPercent}%`, transform: 'translate(-50%, -50%)' }
            : { left: `${leftPercent}%`, bottom: `${bottomPercent}%`, transform: 'translateX(-50%)' };

          return (
            <div
              key={decor.id}
              className={`absolute ${isSticker ? 'z-5' : 'z-20'}`}
              style={{
                ...positionStyle,
                cursor: dragging ? 'grabbing' : 'grab',
                opacity: isDraggingThis && isOverTrash ? 0.4 : 1,
                transition: isDraggingThis ? 'none' : 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.1)',
              }}
              onPointerDown={(e) =>
                handlePointerDown(e, decor.id, 'decor', decor.positionX, decor.positionY)
              }
              onPointerUp={handlePointerUp}
            >
              {renderDecorationIcon(decor.subType)}
            </div>
          );
        })}

        {/* Drag Trash Bin Zone */}
        {dragging && (
          <div
            ref={trashRef}
            className={`absolute bottom-4 right-4 z-40 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
              isOverTrash
                ? 'bg-rose-500 text-white scale-125 shadow-lg shadow-rose-500/50'
                : 'bg-white/70 text-rose-500 shadow-md backdrop-blur-sm hover:scale-110'
            }`}
          >
            <Trash2 className={`w-7 h-7 ${isOverTrash ? 'animate-bounce' : ''}`} />
          </div>
        )}
      </div>
    </div>
  );
};
