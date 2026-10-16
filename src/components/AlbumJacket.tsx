import React from 'react';
import { Disc3 } from 'lucide-react';
import { AlbumJacketStyle, AlbumJacketTheme, Battle } from '../types';
import { getYouTubeThumbnail } from '../utils/youtube';

interface AlbumJacketProps {
  title: string;
  themeTag: string;
  trackCount: number;
  coverBattles: Battle[];
  activeTrackBattle?: Battle | null;
  jacketStyle?: AlbumJacketStyle;
  jacketTheme?: AlbumJacketTheme;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isPlaying?: boolean;
  showVinylPeek?: boolean;
}

const THEME_ACCENT: Record<
  AlbumJacketTheme,
  {
    border: string;
    badgeBg: string;
    badgeText: string;
    imgFilter: string;
    overlay: string;
    labelRing: string;
    glow: string;
  }
> = {
  CRIMSON: {
    border: 'border-[#E50914]/50',
    badgeBg: 'bg-[#E50914]',
    badgeText: 'text-[#FFFFFF]',
    imgFilter: 'contrast-115 saturate-110',
    overlay: 'from-[#08080A]/95 via-[#08080A]/30 to-[#E50914]/15',
    labelRing: 'border-[#E50914]',
    glow: 'shadow-[#E50914]/20',
  },
  GOLD: {
    border: 'border-amber-400/50',
    badgeBg: 'bg-amber-400',
    badgeText: 'text-[#0A0A0A]',
    imgFilter: 'contrast-115 sepia-[0.18]',
    overlay: 'from-[#08080A]/95 via-[#08080A]/30 to-amber-500/15',
    labelRing: 'border-amber-400',
    glow: 'shadow-amber-500/20',
  },
  MONO: {
    border: 'border-[#FFFFFF]/40',
    badgeBg: 'bg-[#FFFFFF]',
    badgeText: 'text-[#0A0A0A]',
    imgFilter: 'grayscale contrast-135',
    overlay: 'from-[#08080A]/95 via-[#08080A]/35 to-transparent',
    labelRing: 'border-[#FFFFFF]',
    glow: 'shadow-white/15',
  },
  CLASSIC: {
    border: 'border-[#3A3A3E]',
    badgeBg: 'bg-[#242429]',
    badgeText: 'text-[#FFFFFF]',
    imgFilter: 'contrast-105',
    overlay: 'from-[#08080A]/95 via-[#08080A]/30 to-transparent',
    labelRing: 'border-zinc-400',
    glow: 'shadow-black/60',
  },
};

export const AlbumJacket: React.FC<AlbumJacketProps> = ({
  title,
  themeTag,
  trackCount,
  coverBattles,
  activeTrackBattle,
  jacketStyle = 'VINYL_LP',
  jacketTheme = 'CRIMSON',
  size = 'md',
  isPlaying = false,
  showVinylPeek = false,
}) => {
  const theme = THEME_ACCENT[jacketTheme] || THEME_ACCENT.CRIMSON;
  const cleanTag = (themeTag || 'BEST BOUTS').split('::')[0];

  const dims =
    size === 'sm'
      ? 'w-16 h-16'
      : size === 'lg'
      ? 'w-32 h-32 sm:w-40 sm:h-40'
      : size === 'xl'
      ? 'w-52 h-52 sm:w-64 sm:h-64'
      : 'w-24 h-24';

  const heroBattle = activeTrackBattle || coverBattles[0];

  return (
    <div
      className={`relative inline-flex items-center select-none shrink-0 group ${
        showVinylPeek
          ? size === 'sm'
            ? 'pr-5'
            : size === 'md'
            ? 'pr-8'
            : 'pr-11'
          : ''
      }`}
    >
      {/* MD Vinyl Peeking Disc Layer (Record peeking out from the right of the sleeve) */}
      {showVinylPeek && (
        <div
          className={`absolute right-0 top-1/2 -translate-y-1/2 ${
            size === 'sm'
              ? 'w-14 h-14'
              : size === 'md'
              ? 'w-22 h-22'
              : 'w-28 h-28 sm:w-36 sm:h-36'
          } rounded-full bg-[#09090B] border border-[#2C2C32] shadow-2xl flex items-center justify-center transition-transform duration-500 ${
            isPlaying
              ? 'translate-x-1.5 animate-spin'
              : 'group-hover:translate-x-1'
          }`}
          style={{
            animationDuration: '5.5s',
            backgroundImage:
              'conic-gradient(from 35deg, #0B0B0E 0deg, #23232A 40deg, #0B0B0E 80deg, #0B0B0E 180deg, #23232A 220deg, #0B0B0E 260deg, #0B0B0E 360deg)',
          }}
        >
          {/* Micro Grooves */}
          <div className="w-[88%] h-[88%] rounded-full border border-white/10 flex items-center justify-center">
            <div className="w-[74%] h-[74%] rounded-full border border-white/5 flex items-center justify-center">
              {/* Center Record Label */}
              <div
                className={`w-[54%] h-[54%] rounded-full overflow-hidden relative border-2 ${theme.labelRing} bg-[#141418]`}
              >
                {heroBattle && (
                  <img
                    src={getYouTubeThumbnail(heroBattle.youtubeId, 'hq')}
                    alt=""
                    className={`w-full h-full object-cover ${theme.imgFilter}`}
                  />
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#070708] border border-white/50 shadow-inner" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Square Record Sleeve */}
      <div
        className={`relative z-10 ${dims} rounded-[6px] overflow-hidden bg-[#0E0E11] border ${theme.border} ring-1 ring-inset ring-white/15 shadow-2xl ${theme.glow}`}
      >
        {coverBattles.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#141418] text-[#48484A]">
            <Disc3 className="w-1/2 h-1/2" />
          </div>
        ) : jacketStyle === 'VINYL_LP' ? (
          <div className="w-full h-full relative flex items-center justify-center bg-[#09090C]">
            {/* Ambient Blurred Thumbnail Background */}
            {heroBattle && (
              <img
                src={getYouTubeThumbnail(heroBattle.youtubeId, 'hq')}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-30 blur-md scale-125 pointer-events-none"
              />
            )}
            {/* Outer Vinyl Disc inside Cutout Sleeve */}
            <div
              className={`relative z-10 w-[88%] h-[88%] rounded-full border border-[#383840] flex items-center justify-center shadow-2xl ${
                isPlaying ? 'animate-spin' : ''
              }`}
              style={{
                animationDuration: '5.5s',
                backgroundImage:
                  'conic-gradient(from 40deg, #09090B 0deg, #272730 42deg, #09090B 85deg, #09090B 180deg, #272730 222deg, #09090B 265deg, #09090B 360deg)',
              }}
            >
              <div className="w-[84%] h-[84%] rounded-full border border-white/10 flex items-center justify-center">
                <div className="w-[72%] h-[72%] rounded-full border border-white/10 flex items-center justify-center">
                  {/* Center Record Label with Thumbnail */}
                  <div
                    className={`w-[64%] h-[64%] rounded-full overflow-hidden relative border-2 ${theme.labelRing} shadow-inner`}
                  >
                    {heroBattle && (
                      <img
                        src={getYouTubeThumbnail(heroBattle.youtubeId, 'hq')}
                        alt=""
                        className={`w-full h-full object-cover ${theme.imgFilter}`}
                      />
                    )}
                    {/* Center Spindle Hole */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#08080A] border border-white/60 shadow-inner" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : jacketStyle === 'HERO_SLEEVE' ? (
          <div className="w-full h-full relative">
            {heroBattle && (
              <img
                src={getYouTubeThumbnail(heroBattle.youtubeId, 'hq')}
                alt=""
                className={`w-full h-full object-cover ${theme.imgFilter}`}
              />
            )}
          </div>
        ) : (
          /* MOSAIC_4 (2x2 Collage) */
          <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-[1px] bg-[#0A0A0A]">
            {Array.from({ length: 4 }).map((_, idx) => {
              const b = coverBattles[idx % coverBattles.length];
              return (
                <img
                  key={idx}
                  src={getYouTubeThumbnail(b.youtubeId, 'hq')}
                  alt=""
                  className={`w-full h-full object-cover ${theme.imgFilter}`}
                />
              );
            })}
          </div>
        )}

        {/* Paper Sleeve Vignette & Gloss Texture */}
        <div
          className={`absolute inset-0 bg-gradient-to-t ${theme.overlay} pointer-events-none`}
        />
        <div
          className="absolute inset-0 pointer-events-none opacity-25"
          style={{
            backgroundImage:
              'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, transparent 40%, transparent 100%)',
          }}
        />

        {size !== 'sm' && (
          <>
            {/* Top Obi / Label Stamp */}
            <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none z-20">
              <span
                className={`px-1.5 py-0.5 rounded-[2px] font-mono-tech text-[8px] font-black tracking-wider uppercase shadow ${theme.badgeBg} ${theme.badgeText}`}
              >
                {cleanTag.slice(0, 14)}
              </span>
              <span className="px-1.5 py-0.5 rounded-[2px] bg-[#0A0A0A]/90 border border-white/20 font-mono-tech text-[8px] font-bold text-[#FFFFFF]">
                {trackCount} TRK
              </span>
            </div>

            {/* Bottom Sleeve Title */}
            <div className="absolute bottom-1.5 left-2 right-2 pointer-events-none z-20">
              <div className="font-jp font-black text-[10px] sm:text-xs text-[#FFFFFF] leading-tight line-clamp-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                {title}
              </div>
              <div className="text-[7px] font-mono-tech text-[#FFFFFF]/70 tracking-widest uppercase mt-0.5 flex items-center justify-between">
                <span>1VERCE VINYL</span>
                <span>33⅓ RPM</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
