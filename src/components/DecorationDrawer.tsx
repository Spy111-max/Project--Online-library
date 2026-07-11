import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
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

interface DecorationDrawerProps {
  onAddDecoration: (subType: string, type: 'plant' | 'sticker' | 'trinket') => void;
  currentTheme: 'cottagecore' | 'pastel' | 'academic' | 'scandinavian';
  onChangeTheme: (theme: 'cottagecore' | 'pastel' | 'academic' | 'scandinavian') => void;
  currentBg: 'cream' | 'sage' | 'rose' | 'lavender';
  onChangeBg: (bg: 'cream' | 'sage' | 'rose' | 'lavender') => void;
}

export const DecorationDrawer: React.FC<DecorationDrawerProps> = ({
  onAddDecoration,
  currentTheme,
  onChangeTheme,
  currentBg,
  onChangeBg,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'decorations' | 'style'>('decorations');

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
                <div className="flex flex-col gap-2.5">
                  {[
                    {
                      id: 'cottagecore',
                      label: 'Cozy Cottagecore',
                      desc: 'Warm oak wood, rustic charm',
                      previewClass: 'border-[#8b5a2b] wood-cottagecore',
                      shelfClass: 'wood-cottagecore-shelf',
                    },
                    {
                      id: 'pastel',
                      label: 'Minimalist Pastel',
                      desc: 'Matte white cupboard shelves',
                      previewClass: 'border-white/80 bg-gradient-to-b from-[#FFF5F5] to-[#F5F5FF] shadow-inner',
                      shelfClass: 'wood-pastel-shelf',
                    },
                    {
                      id: 'academic',
                      label: 'Dark Academic',
                      desc: 'Sophisticated vintage dark mahogany',
                      previewClass: 'border-[#1f1209] wood-academic',
                      shelfClass: 'wood-academic-shelf',
                    },
                    {
                      id: 'scandinavian',
                      label: 'Scandinavian Birch',
                      desc: 'Light birch wood & airy borders',
                      previewClass: 'border-[#dfd0be] wood-scandi',
                      shelfClass: 'wood-scandi-shelf',
                    },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => onChangeTheme(t.id as any)}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-3.5 ${
                        currentTheme === t.id
                          ? 'border-rose-300 bg-rose-50/40 shadow-sm'
                          : 'border-black/5 bg-white/40 hover:bg-white/60'
                      }`}
                    >
                      {/* Mini Bookshelf Preview */}
                      <div className={`w-12 h-14 flex-shrink-0 border-[3.5px] rounded-lg relative flex flex-col justify-around p-1 shadow-sm ${t.previewClass}`}>
                        <div className={`h-[3.5px] w-full rounded-[1px] ${t.shelfClass}`}></div>
                        <div className={`h-[3.5px] w-full rounded-[1px] ${t.shelfClass}`}></div>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-[#6b6375]">{t.label}</span>
                        <span className="text-[10px] text-[#a29ca8] mt-0.5">{t.desc}</span>
                      </div>
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
