import React from 'react';
import type { Highlight } from '../utils/db';
import { Trash2, BookMarked, ChevronRight } from 'lucide-react';

interface HighlightsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  highlights: Highlight[];
  onDeleteHighlight: (id: string) => void;
  onNavigateToPage: (pageNumber: number) => void;
  themeMode: 'light' | 'dark' | 'sepia';
}

export const HighlightsSidebar: React.FC<HighlightsSidebarProps> = ({
  isOpen,
  onClose,
  highlights,
  onDeleteHighlight,
  onNavigateToPage,
  themeMode,
}) => {
  const getThemeClasses = () => {
    switch (themeMode) {
      case 'dark':
        return {
          container: 'bg-[#2E2A29] text-stone-100 border-l border-stone-800',
          item: 'bg-[#232120] hover:bg-[#1E1C1B] border-stone-800',
          text: 'text-stone-300',
          meta: 'text-stone-500',
        };
      case 'sepia':
        return {
          container: 'bg-[#EFE5C9] text-[#4A3B32] border-l border-[#dcd0ad]',
          item: 'bg-[#F5ECCF] hover:bg-[#ebdca6] border-[#dcd0ad]',
          text: 'text-[#5C4A3F]',
          meta: 'text-[#8A7568]',
        };
      case 'light':
      default:
        return {
          container: 'bg-[#FDF6F0] text-stone-700 border-l border-orange-100',
          item: 'bg-white hover:bg-orange-50/30 border-orange-100/50',
          text: 'text-stone-600',
          meta: 'text-stone-400',
        };
    }
  };

  const colors = getThemeClasses();

  // Sort highlights by page number, then creation date
  const sortedHighlights = [...highlights].sort((a, b) => {
    if (a.pageNumber !== b.pageNumber) {
      return a.pageNumber - b.pageNumber;
    }
    return a.createdAt - b.createdAt;
  });

  return (
    <div
      className={`fixed top-0 right-0 bottom-0 z-50 w-80 shadow-2xl flex flex-col transition-all duration-500 ease-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      } ${colors.container}`}
    >
      {/* Header */}
      <div className="p-5 flex items-center justify-between border-b border-black/5 font-quicksand">
        <div className="flex items-center gap-2">
          <BookMarked className="w-5 h-5 text-rose-300" />
          <h3 className="font-bold text-base">Highlights ({highlights.length})</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-black/5 transition-colors cursor-pointer text-xs font-bold"
        >
          Close
        </button>
      </div>

      {/* Highlights List */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 font-quicksand">
        {sortedHighlights.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center gap-2">
            <BookMarked className="w-8 h-8 opacity-25" />
            <p className="text-xs opacity-50">Select some text inside the book to highlight and save quotes!</p>
          </div>
        ) : (
          sortedHighlights.map((hl) => (
            <div
              key={hl.id}
              onClick={() => onNavigateToPage(hl.pageNumber)}
              className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer shadow-sm relative group flex flex-col gap-2 ${colors.item}`}
            >
              {/* Top metadata */}
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold ${colors.meta}`}>PAGE {hl.pageNumber}</span>
                <div className="flex items-center gap-1">
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-black/5 shadow-inner"
                    style={{ backgroundColor: hl.color }}
                  ></div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteHighlight(hl.id);
                    }}
                    className="p-1 rounded-full text-rose-400 opacity-0 group-hover:opacity-100 hover:bg-rose-50 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Snippet text */}
              <p className={`text-xs italic leading-relaxed break-words font-medium ${colors.text}`}>
                "{hl.text}"
              </p>

              {/* Click instruction visual */}
              <div className="flex items-center gap-1 text-[9px] font-bold text-rose-300 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                <span>Jump to page</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
