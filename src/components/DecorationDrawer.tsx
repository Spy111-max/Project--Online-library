import React, { useState, useRef } from 'react';
import { Upload, Sparkles, X, Plus } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';
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
} from './AestheticAssets';

// Configure the pdfjs worker in Vite
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

interface DecorationDrawerProps {
  onAddBook: (title: string, fileData: ArrayBuffer, totalPages: number) => void;
  onAddDecoration: (subType: string, type: 'plant' | 'sticker' | 'trinket') => void;
  currentTheme: 'cottagecore' | 'pastel' | 'academic' | 'scandinavian';
  onChangeTheme: (theme: 'cottagecore' | 'pastel' | 'academic' | 'scandinavian') => void;
  currentBg: 'cream' | 'sage' | 'rose' | 'lavender';
  onChangeBg: (bg: 'cream' | 'sage' | 'rose' | 'lavender') => void;
}

export const DecorationDrawer: React.FC<DecorationDrawerProps> = ({
  onAddBook,
  onAddDecoration,
  currentTheme,
  onChangeTheme,
  currentBg,
  onChangeBg,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'books' | 'decorations' | 'style'>('books');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // DIY items list
  const decorItems = {
    plants: [
      { id: 'succulent', label: 'Mini Succulent', type: 'plant' as const, Icon: SucculentIcon },
      { id: 'ivy', label: 'Hanging Ivy', type: 'plant' as const, Icon: HangingIvyIcon },
      { id: 'tulip', label: 'Tulip Vase', type: 'plant' as const, Icon: TulipsIcon },
    ],
    stickers: [
      { id: 'heart', label: 'Sweet Heart', type: 'sticker' as const, Icon: HeartSticker },
      { id: 'star', label: 'Sleepy Star', type: 'sticker' as const, Icon: StarSticker },
      { id: 'cloud', label: 'Dreamy Cloud', type: 'sticker' as const, Icon: CloudSticker },
      { id: 'glitter', label: 'Fairy Glitter', type: 'sticker' as const, Icon: GlitterSticker },
    ],
    trinkets: [
      { id: 'candle', label: 'Mini Candle', type: 'trinket' as const, Icon: CandleIcon },
      { id: 'keychain', label: 'Brass Keychain', type: 'trinket' as const, Icon: KeychainIcon },
      { id: 'fairy_lights', label: 'Fairy Lights', type: 'trinket' as const, Icon: FairyLightsIcon },
    ],
  };

  // Handle PDF Upload
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
      // Use PDF.js to load the document and extract page count
      // We slice(0) the buffer to send a copy to the worker, keeping the original intact for DB save.
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer.slice(0) });
      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;

      // Clean title from .pdf suffix
      const cleanTitle = file.name.replace(/\.pdf$/i, '');
      onAddBook(cleanTitle, arrayBuffer, totalPages);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error(err);
      alert('Apologies, there was an error reading your PDF. Make sure it is not corrupted.');
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
      // We slice(0) the buffer to send a copy to the worker, keeping the original intact for DB save.
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer.slice(0) });
      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;

      const cleanTitle = file.name.replace(/\.pdf$/i, '');
      onAddBook(cleanTitle, arrayBuffer, totalPages);
    } catch (err) {
      console.error(err);
      alert('Apologies, there was an error reading your PDF.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-6 left-6 z-40 flex items-center gap-2 px-5 py-3 rounded-full shadow-lg glassmorphism text-[#6b6375] font-quicksand font-bold hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
      >
        <Sparkles className="w-5 h-5 text-rose-300 animate-spin-slow" />
        <span>DIY Studio ✧</span>
      </button>

      {/* Slide-out Drawer Panel */}
      <div
        className={`fixed top-0 left-0 bottom-0 z-50 w-80 glassmorphism shadow-2xl flex flex-col transition-all duration-500 ease-out border-r border-white/20 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-5 flex items-center justify-between border-b border-black/5">
          <div>
            <h3 className="font-quicksand font-bold text-lg text-[#6b6375]">DIY Cozy Studio</h3>
            <p className="text-xs text-[#a29ca8]">Customize your reading space</p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-full hover:bg-black/5 text-[#6b6375] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-black/5 text-sm font-bold font-quicksand">
          <button
            onClick={() => setActiveTab('books')}
            className={`flex-1 py-3 text-center border-b-2 transition-all cursor-pointer ${
              activeTab === 'books'
                ? 'border-rose-300 text-rose-500'
                : 'border-transparent text-[#6b6375] hover:text-rose-400'
            }`}
          >
            Books
          </button>
          <button
            onClick={() => setActiveTab('decorations')}
            className={`flex-1 py-3 text-center border-b-2 transition-all cursor-pointer ${
              activeTab === 'decorations'
                ? 'border-rose-300 text-rose-500'
                : 'border-transparent text-[#6b6375] hover:text-rose-400'
            }`}
          >
            DIY Decor
          </button>
          <button
            onClick={() => setActiveTab('style')}
            className={`flex-1 py-3 text-center border-b-2 transition-all cursor-pointer ${
              activeTab === 'style'
                ? 'border-rose-300 text-rose-500'
                : 'border-transparent text-[#6b6375] hover:text-rose-400'
            }`}
          >
            Style
          </button>
        </div>

        {/* Scrollable Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 font-quicksand">
          
          {/* TAB 1: BOOK UPLOADER */}
          {activeTab === 'books' && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <h4 className="text-sm font-bold text-[#6b6375] mb-1">Add a PDF Book</h4>
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed border-[#d1c9e9] hover:border-[#aba0d3] bg-[#fdf6f0]/60 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-center cursor-pointer transition-all duration-300 ${
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
                    <div className="w-8 h-8 rounded-full border-4 border-rose-300 border-t-transparent animate-spin"></div>
                    <span className="text-xs text-[#a29ca8] font-medium">Analyzing pages...</span>
                  </div>
                ) : (
                  <>
                    <div className="p-3 bg-rose-50 rounded-full text-rose-400">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#6b6375]">Drag & Drop PDF</p>
                      <p className="text-xs text-[#a29ca8] mt-1">or click to browse local files</p>
                    </div>
                  </>
                )}
              </div>
              <p className="text-[11px] leading-relaxed text-[#a29ca8] text-center px-2">
                Books are processed and stored locally in your browser. Large files may take a brief moment.
              </p>
            </div>
          )}

          {/* TAB 2: DIY DECORATIONS */}
          {activeTab === 'decorations' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              {/* Plants */}
              <div>
                <h5 className="text-xs font-bold text-[#8c7a6b] uppercase tracking-wider mb-3">Plants</h5>
                <div className="grid grid-cols-2 gap-3">
                  {decorItems.plants.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onAddDecoration(item.id, item.type)}
                      className="flex flex-col items-center justify-center p-3 rounded-2xl border border-black/5 bg-white/40 hover:bg-rose-50/50 hover:border-rose-200 transition-all cursor-pointer group text-center"
                      title={`Click to add ${item.label}`}
                    >
                      <div className="h-16 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 mb-1">
                        <item.Icon />
                      </div>
                      <span className="text-[10px] font-bold text-[#6b6375] group-hover:text-rose-500 transition-colors leading-tight">
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Stickers */}
              <div>
                <h5 className="text-xs font-bold text-[#8c7a6b] uppercase tracking-wider mb-3">Stickers</h5>
                <div className="grid grid-cols-2 gap-3">
                  {decorItems.stickers.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onAddDecoration(item.id, item.type)}
                      className="flex flex-col items-center justify-center p-3 rounded-2xl border border-black/5 bg-white/40 hover:bg-rose-50/50 hover:border-rose-200 transition-all cursor-pointer group text-center"
                      title={`Click to add ${item.label}`}
                    >
                      <div className="h-16 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 mb-1">
                        <item.Icon />
                      </div>
                      <span className="text-[10px] font-bold text-[#6b6375] group-hover:text-rose-500 transition-colors leading-tight">
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Trinkets */}
              <div>
                <h5 className="text-xs font-bold text-[#8c7a6b] uppercase tracking-wider mb-3">Cute Trinkets</h5>
                <div className="grid grid-cols-2 gap-3">
                  {decorItems.trinkets.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onAddDecoration(item.id, item.type)}
                      className="flex flex-col items-center justify-center p-3 rounded-2xl border border-black/5 bg-white/40 hover:bg-rose-50/50 hover:border-rose-200 transition-all cursor-pointer group text-center"
                      title={`Click to add ${item.label}`}
                    >
                      <div className="h-16 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 mb-1">
                        <item.Icon />
                      </div>
                      <span className="text-[10px] font-bold text-[#6b6375] group-hover:text-rose-500 transition-colors leading-tight">
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: THEMES & STYLE */}
          {activeTab === 'style' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              {/* Cupboard Style */}
              <div>
                <h5 className="text-xs font-bold text-[#8c7a6b] uppercase tracking-wider mb-3">Cabinet Design</h5>
                <div className="flex flex-col gap-2">
                  {[
                    { id: 'cottagecore', label: 'Cozy Cottagecore', desc: 'Warm oak wood, rustic charm' },
                    { id: 'pastel', label: 'Minimalist Pastel', desc: 'Matte white cupboard shelves' },
                    { id: 'academic', label: 'Dark Academic', desc: 'Sophisticated vintage dark mahogany' },
                    { id: 'scandinavian', label: 'Scandinavian Birch', desc: 'Light birch wood wood & airy borders' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => onChangeTheme(t.id as any)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col ${
                        currentTheme === t.id
                          ? 'border-rose-300 bg-rose-50/40 shadow-sm'
                          : 'border-black/5 bg-white/40 hover:bg-white/60'
                      }`}
                    >
                      <span className="text-xs font-bold text-[#6b6375]">{t.label}</span>
                      <span className="text-[10px] text-[#a29ca8] mt-0.5">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Background Color */}
              <div>
                <h5 className="text-xs font-bold text-[#8c7a6b] uppercase tracking-wider mb-3">Room Background</h5>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'cream', label: 'Cream/Blush', color: 'bg-[#FDF6F0] border-[#F4E7DE]' },
                    { id: 'sage', label: 'Sage Green', color: 'bg-[#E8EFE9] border-[#C2D3C6]' },
                    { id: 'rose', label: 'Dusty Rose', color: 'bg-[#FAECEB] border-[#E3C4C2]' },
                    { id: 'lavender', label: 'Lavender', color: 'bg-[#F2EFFF] border-[#D1C9E9]' },
                  ].map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => onChangeBg(bg.id as any)}
                      className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all text-xs font-bold text-[#6b6375] ${
                        currentBg === bg.id
                          ? 'border-rose-400 bg-white shadow-sm ring-1 ring-rose-200'
                          : 'border-black/5 bg-white/40 hover:bg-white/60'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border ${bg.color}`}></div>
                      <span>{bg.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
};
