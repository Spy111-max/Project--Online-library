
// --- PLANTS ---

export const SucculentIcon = () => (
  <svg viewBox="0 0 60 70" className="w-12 h-14 drop-shadow-sm select-none" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Potted soil and pot */}
    <ellipse cx="30" cy="52" rx="18" ry="4" fill="#a18072" />
    <path d="M12 48C12 48 14 66 30 66C46 66 48 48 48 48H12Z" fill="#F4E7DE" stroke="#E3C4C2" strokeWidth="1.5" />
    {/* Pot rim */}
    <rect x="10" y="44" width="40" height="5" rx="2.5" fill="#E3C4C2" />
    {/* Succulent leaves */}
    <path d="M30 14C30 14 24 24 30 30C36 24 30 14 30 14Z" fill="#8cb89f" stroke="#7aa38b" strokeWidth="1" />
    <path d="M18 22C18 22 16 32 24 36C32 32 18 22 18 22Z" fill="#a4cca4" stroke="#8cb89f" strokeWidth="1" />
    <path d="M42 22C42 22 44 32 36 36C28 32 42 22 42 22Z" fill="#a4cca4" stroke="#8cb89f" strokeWidth="1" />
    <path d="M14 34C14 34 10 42 22 44C34 42 14 34 14 34Z" fill="#bce0bc" stroke="#a4cca4" strokeWidth="1" />
    <path d="M46 34C46 34 50 42 38 44C26 42 46 34 46 34Z" fill="#bce0bc" stroke="#a4cca4" strokeWidth="1" />
    {/* Tiny flower on top */}
    <circle cx="30" cy="14" r="2.5" fill="#FDA4AF" />
    <circle cx="30" cy="14" r="1" fill="#FDE047" />
  </svg>
);

export const HangingIvyIcon = () => (
  <svg viewBox="0 0 70 90" className="w-16 h-20 drop-shadow-sm select-none" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Potted basket */}
    <path d="M15 15 L20 30 C22 35, 48 35, 50 30 L55 15 Z" fill="#D8B48F" stroke="#B58D63" strokeWidth="1.5" />
    {/* Hanging wires */}
    <line x1="35" y1="2" x2="20" y2="15" stroke="#8c7a6b" strokeWidth="1" />
    <line x1="35" y1="2" x2="50" y2="15" stroke="#8c7a6b" strokeWidth="1" />
    <line x1="35" y1="2" x2="35" y2="16" stroke="#8c7a6b" strokeWidth="1" />
    {/* Ivy vines hanging down */}
    <path d="M22 28 Q 18 45, 20 65 Q 22 75, 18 85" stroke="#7ba88a" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M35 30 Q 38 55, 33 75 Q 30 80, 32 88" stroke="#5b8f6d" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M48 28 Q 52 48, 47 68 Q 45 78, 49 84" stroke="#7ba88a" strokeWidth="1.5" strokeLinecap="round" />
    {/* Ivy Leaves */}
    {/* Left vine leaves */}
    <path d="M17 38 C12 36, 12 44, 18 42 Z" fill="#9bc3a9" stroke="#7ba88a" />
    <path d="M22 48 C27 46, 27 54, 21 52 Z" fill="#7ba88a" stroke="#5b8f6d" />
    <path d="M17 62 C12 60, 12 68, 18 66 Z" fill="#9bc3a9" stroke="#7ba88a" />
    {/* Center vine leaves */}
    <path d="M31 42 C26 40, 28 48, 33 46 Z" fill="#5b8f6d" stroke="#3f6f50" />
    <path d="M37 58 C42 56, 40 64, 35 62 Z" fill="#7ba88a" stroke="#5b8f6d" />
    <path d="M30 72 C25 70, 27 78, 32 76 Z" fill="#9bc3a9" stroke="#7ba88a" />
    {/* Right vine leaves */}
    <path d="M49 38 C54 36, 54 44, 48 42 Z" fill="#9bc3a9" stroke="#7ba88a" />
    <path d="M45 52 C40 50, 42 58, 47 56 Z" fill="#7ba88a" stroke="#5b8f6d" />
    <path d="M50 68 C55 66, 53 74, 48 72 Z" fill="#9bc3a9" stroke="#7ba88a" />
  </svg>
);

export const TulipsIcon = () => (
  <svg viewBox="0 0 50 80" className="w-12 h-20 drop-shadow-sm select-none" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Glass Vase */}
    <path d="M15 40 L17 74 C18 78, 32 78, 33 74 L35 40 Z" fill="rgba(240, 248, 255, 0.4)" stroke="#A5F3FC" strokeWidth="1.5" />
    {/* Water Line */}
    <path d="M16 55 C16 55, 25 56, 34 55" stroke="#7DD3FC" strokeWidth="1.5" fill="rgba(125, 211, 252, 0.3)" />
    {/* Stems */}
    <path d="M25 22 Q 23 42, 24 62" stroke="#68a379" strokeWidth="2" strokeLinecap="round" />
    <path d="M18 25 Q 21 40, 22 62" stroke="#68a379" strokeWidth="2" strokeLinecap="round" />
    <path d="M32 24 Q 28 41, 26 62" stroke="#68a379" strokeWidth="2" strokeLinecap="round" />
    {/* Green Leaves */}
    <path d="M14 42 Q 22 35, 22 48" fill="#80b891" />
    <path d="M36 38 Q 28 32, 28 45" fill="#80b891" />
    {/* Tulip Blooms */}
    {/* Center Tulip */}
    <g transform="translate(20, 10)">
      <path d="M5 12 C1 12, -2 4, 3 0 C5 3, 5 3, 7 0 C12 4, 9 12, 5 12Z" fill="#FDA4AF" stroke="#F43F5E" strokeWidth="0.75" />
      <path d="M5 12 C3 12, 1 8, 5 2 C9 8, 7 12, 5 12Z" fill="#F43F5E" />
    </g>
    {/* Left Tulip */}
    <g transform="translate(12, 14) rotate(-15)">
      <path d="M5 12 C1 12, -2 4, 3 0 C5 3, 5 3, 7 0 C12 4, 9 12, 5 12Z" fill="#FECDD3" stroke="#FB7185" strokeWidth="0.75" />
      <path d="M5 12 C3 12, 1 8, 5 2 C9 8, 7 12, 5 12Z" fill="#FB7185" />
    </g>
    {/* Right Tulip */}
    <g transform="translate(27, 13) rotate(15)">
      <path d="M5 12 C1 12, -2 4, 3 0 C5 3, 5 3, 7 0 C12 4, 9 12, 5 12Z" fill="#FDA4AF" stroke="#F43F5E" strokeWidth="0.75" />
      <path d="M5 12 C3 12, 1 8, 5 2 C9 8, 7 12, 5 12Z" fill="#F43F5E" />
    </g>
  </svg>
);

// --- STICKERS ---

export const HeartSticker = () => (
  <svg viewBox="0 0 40 40" className="w-10 h-10 select-none animate-float" style={{ animationDelay: '0s' }} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 8 C8 8, 4 12, 4 18 C4 26, 16 34, 20 36 C24 34, 36 26, 36 18 C36 12, 32 8, 28 8 C24 8, 21 11, 20 13 C19 11, 16 8, 12 8 Z" fill="#FCA5A5" stroke="#FFFFFF" strokeWidth="2.5" />
    {/* Sticker white border shadow */}
    <path d="M14 11 C11 11, 8 14, 8 18" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const StarSticker = () => (
  <svg viewBox="0 0 40 40" className="w-10 h-10 select-none animate-float" style={{ animationDelay: '1.5s' }} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Star shape */}
    <path d="M20 2 L25 13 L37 14 L28 22 L31 34 L20 28 L9 34 L12 22 L3 14 L15 13 Z" fill="#FDE047" stroke="#FFFFFF" strokeWidth="2.5" strokeLinejoin="round" />
    {/* Cute Face */}
    <circle cx="16" cy="18" r="1.5" fill="#374151" />
    <circle cx="24" cy="18" r="1.5" fill="#374151" />
    <path d="M18 22 Q 20 24, 22 22" stroke="#374151" strokeWidth="1.2" strokeLinecap="round" />
    {/* Rosy Cheeks */}
    <ellipse cx="13" cy="19.5" rx="1.5" ry="1" fill="#FDA4AF" />
    <ellipse cx="27" cy="19.5" rx="1.5" ry="1" fill="#FDA4AF" />
  </svg>
);

export const CloudSticker = () => (
  <svg viewBox="0 0 45 35" className="w-12 h-9 select-none animate-float" style={{ animationDelay: '3s' }} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 12 C10 12, 6 15, 6 20 C6 25, 12 28, 18 28 C20 28, 30 28, 34 28 C38 28, 40 25, 40 21 C40 17, 36 14, 32 14 C30 9, 20 8, 17 12 Z" fill="#93C5FD" stroke="#FFFFFF" strokeWidth="2.5" strokeLinejoin="round" />
    <circle cx="18" cy="19" r="1" fill="#374151" />
    <circle cx="28" cy="19" r="1" fill="#374151" />
    <path d="M21 22 Q 23 23, 25 22" stroke="#374151" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

export const GlitterSticker = () => (
  <svg viewBox="0 0 40 40" className="w-10 h-10 select-none" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Sparkle 1 */}
    <path d="M20 5 Q 20 15, 10 15 Q 20 15, 20 25 Q 20 15, 30 15 Q 20 15, 20 5 Z" fill="#DDD6FE" stroke="#FFFFFF" strokeWidth="1.5" />
    {/* Sparkle 2 (small) */}
    <path d="M30 25 Q 30 29, 26 29 Q 30 29, 30 33 Q 30 29, 34 29 Q 30 29, 30 25 Z" fill="#F5F3FF" stroke="#FFFFFF" strokeWidth="1" />
    {/* Sparkle 3 (very small) */}
    <path d="M10 26 Q 10 28.5, 7.5 28.5 Q 10 28.5, 10 31 Q 10 28.5, 12.5 28.5 Q 10 28.5, 10 26 Z" fill="#E8E8FF" stroke="#FFFFFF" strokeWidth="1" />
  </svg>
);

// --- TRINKETS ---

export const KeychainIcon = () => (
  <svg viewBox="0 0 40 80" className="w-10 h-20 drop-shadow-sm select-none" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Keychain Ring */}
    <circle cx="20" cy="10" r="8" stroke="#C5A880" strokeWidth="2" />
    {/* Hanging chains */}
    <line x1="20" y1="18" x2="20" y2="35" stroke="#A88B60" strokeWidth="1.5" strokeDasharray="2 2" />
    {/* Moon charm */}
    <path d="M20 38 C26 38, 32 44, 30 52 C28 58, 20 60, 18 56 C24 54, 24 44, 20 38 Z" fill="#FDE047" stroke="#A88B60" strokeWidth="1" />
    {/* Star charm (dangling slightly lower on side chain) */}
    <path d="M12 55 L14 60 L19 60 L15 63 L17 68 L12 65 L7 68 L9 63 L5 60 L10 60 Z" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="0.75" />
  </svg>
);

export const FairyLightsIcon = () => (
  <svg viewBox="0 0 120 40" className="w-28 h-10 select-none animate-pulse-glow" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Wire */}
    <path d="M5 10 Q 35 30, 60 10 Q 85 30, 115 10" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round" />
    {/* Bulbs */}
    {/* Bulb 1 */}
    <g transform="translate(18, 17)">
      <rect x="-1.5" y="-3" width="3" height="3" fill="#a1a1aa" />
      <circle cx="0" cy="3" r="5" fill="#fef08a" />
    </g>
    {/* Bulb 2 */}
    <g transform="translate(38, 20)">
      <rect x="-1.5" y="-3" width="3" height="3" fill="#a1a1aa" />
      <circle cx="0" cy="3" r="5" fill="#fef08a" />
    </g>
    {/* Bulb 3 */}
    <g transform="translate(60, 10)">
      <rect x="-1.5" y="-3" width="3" height="3" fill="#a1a1aa" />
      <circle cx="0" cy="3" r="5" fill="#fef08a" />
    </g>
    {/* Bulb 4 */}
    <g transform="translate(82, 20)">
      <rect x="-1.5" y="-3" width="3" height="3" fill="#a1a1aa" />
      <circle cx="0" cy="3" r="5" fill="#fef08a" />
    </g>
    {/* Bulb 5 */}
    <g transform="translate(102, 17)">
      <rect x="-1.5" y="-3" width="3" height="3" fill="#a1a1aa" />
      <circle cx="0" cy="3" r="5" fill="#fef08a" />
    </g>
  </svg>
);

export const CandleIcon = () => (
  <svg viewBox="0 0 40 60" className="w-10 h-15 drop-shadow-sm select-none" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Amber jar */}
    <rect x="8" y="24" width="24" height="32" rx="3" fill="#92400e" stroke="#78350f" strokeWidth="1.5" />
    {/* Jar neck */}
    <rect x="11" y="20" width="18" height="4" fill="#78350f" />
    {/* Label */}
    <rect x="12" y="32" width="16" height="16" rx="1" fill="#FDF6F0" />
    {/* Tiny label details */}
    <line x1="15" y1="36" x2="25" y2="36" stroke="#c2d3c6" strokeWidth="1" />
    <line x1="17" y1="40" x2="23" y2="40" stroke="#c2d3c6" strokeWidth="1" />
    <line x1="16" y1="44" x2="24" y2="44" stroke="#c2d3c6" strokeWidth="1" />
    {/* Wax layer inside jar */}
    <rect x="9.5" y="25" width="21" height="6" fill="#FDF6F0" opacity="0.8" />
    {/* Wick */}
    <line x1="20" y1="18" x2="20" y2="25" stroke="#4b5563" strokeWidth="1.5" />
    {/* Candle Flame (animated) */}
    <g className="animate-flicker" style={{ transformOrigin: '20px 18px' }}>
      <path d="M20 2 C20 2, 24 10, 20 18 C16 10, 20 2, 20 2 Z" fill="#F59E0B" />
      <path d="M20 6 C20 6, 22 11, 20 16 C18 11, 20 6, 20 6 Z" fill="#EF4444" />
      <circle cx="20" cy="14" r="2" fill="#FCD34D" />
    </g>
  </svg>
);

// --- BOOK GRAPHICS ---

export const BookIcon = ({ title, progress }: { title: string; progress: number }) => {
  // Generate a soft cozy cover color based on the title string
  const colors = [
    { bg: 'bg-[#e3c4c2]', border: 'border-[#c49a97]', text: 'text-[#4e3c3b]', ribbon: '#fca5a5' }, // rose
    { bg: 'bg-[#c2d3c6]', border: 'border-[#9fb5a4]', text: 'text-[#2a382e]', ribbon: '#86efac' }, // sage
    { bg: 'bg-[#d1c9e9]', border: 'border-[#aba0d3]', text: 'text-[#2c234b]', ribbon: '#c084fc' }, // lavender
    { bg: 'bg-[#ebdcb9]', border: 'border-[#d0bc8f]', text: 'text-[#4a3d20]', ribbon: '#fcd34d' }, // buttercream
    { bg: 'bg-[#c3d7eb]', border: 'border-[#9ebcdb]', text: 'text-[#23354b]', ribbon: '#93c5fd' }, // pastel blue
  ];

  let sum = 0;
  for (let i = 0; i < title.length; i++) {
    sum += title.charCodeAt(i);
  }
  const color = colors[sum % colors.length];

  // Truncate title for cover display
  const displayTitle = title.length > 25 ? title.substring(0, 22) + '...' : title;

  return (
    <div className={`relative w-16 h-24 rounded-r-md rounded-l-sm flex flex-col justify-between p-2 shadow-md cursor-pointer hover:shadow-xl hover:-translate-y-2 transition-all duration-300 border-l-4 ${color.bg} ${color.border} border-t border-r border-b`}>
      {/* Book details line decoration */}
      <div className="absolute left-1 top-0 bottom-0 w-[1px] bg-black/10"></div>
      
      {/* Title */}
      <div className={`text-[9px] font-bold tracking-tight text-center leading-normal break-words mt-1 ${color.text}`}>
        {displayTitle}
      </div>

      {/* Progress bar and bookmark ribbon */}
      <div className="w-full mt-auto">
        {progress > 0 && (
          <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden mt-1">
            <div className="h-full bg-white/70" style={{ width: `${progress}%` }}></div>
          </div>
        )}
        
        {progress >= 100 && (
          <div className="absolute top-0 right-2 w-2 h-4" style={{ backgroundColor: color.ribbon, clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 75%, 0% 100%)' }}></div>
        )}
      </div>
    </div>
  );
};
