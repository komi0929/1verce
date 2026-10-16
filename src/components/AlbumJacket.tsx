import React from 'react';
import { Disc3 } from 'lucide-react';
import { AlbumJacketStyle, AlbumJacketTheme, Battle } from '../types';
import { getYouTubeThumbnail } from '../utils/youtube';

interface AlbumJacketProps {
  title: string;
  themeTag: string;
  trackCount: number;
  coverBattles: Battle[];
  jacketStyle?: AlbumJacketStyle;
  jacketTheme?: AlbumJacketTheme;
  size?: 'sm' | 'md' | 'lg';
  isPlaying?: boolean;
}

const THEME_ACCENT: Record<
  AlbumJacketTheme,
  {
    border: string;
    badgeBg: string;
    badgeText: string;
    imgFilter: string;
    overlay: string;
  }
> = {
  CRIMSON: {
    border: 'border-[#E50914]/60',
    badgeBg: 'bg-[#E50914]',
    badgeText: 'text-[#FFFFFF]',
    imgFilter: 'contrast-125 saturate-110',
    overlay: 'from-[#0A0A0A] via-[#0A0A0A]/45 to-[#E50914]/20',
  },
  GOLD: {
    border: 'border-amber-400/60',
    badgeBg: 'bg-amber-400',
    badgeText: 'text-[#0A0A0A]',
    imgFilter: 'contrast-125 sepia-[0.25]',
    overlay: 'from-[#0A0A0A] via-[#0A0A0A]/45 to-amber-500/20',
  },
  MONO: {
    border: 'border-[#FFFFFF]/50',
    badgeBg: 'bg-[#FFFFFF]',
    badgeText: 'text-[#0A0A0A]',
    imgFilter: 'grayscale contrast-150',
    overlay: 'from-[#0A0A0A] via-[#0A0A0A]/50 to-transparent',
  },
  CLASSIC: {
    border: 'border-[#3A3A3E]',
    badgeBg: 'bg-[#18181C]',
    badgeText: 'text-[#FFFFFF]',
    imgFilter: 'contrast-110',
    overlay: 'from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent',
  },
};

export const AlbumJacket: React.FC<AlbumJacketProps> = ({
  title,
  themeTag,
  trackCount,
  coverBattles,
  jacketStyle = 'MOSAIC_4',
  jacketTheme = 'CRIMSON',
  size = 'md',
  isPlaying = false,
}) => {
  const theme = THEME_ACCENT[jacketTheme] || THEME_ACCENT.CRIMSON;
  const dims =
    size === 'sm'
      ? 'w-16 h-16'
      : size === 'lg'
      ? 'w-36 h-36 sm:w-44 sm:h-44'
      : 'w-24 h-24';

  const heroBattle = coverBattles[0];

  return (
    <div
      className={`relative ${dims} rounded overflow-hidden bg-[#0A0A0A] border ${theme.border} shrink-0 select-none shadow-xl group`}
    >
      {/* Background Visual Layer (100% Free YouTube CDN Thumbnails) */}
      {coverBattles.length === 0 ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#141418] text-[#48484A]">
          <Disc3 className="w-1/2 h-1/2" />
        </div>
      ) : jacketStyle === 'VINYL_LP' ? (
        <div className="w-full h-full relative flex items-center justify-center bg-[#09090B]">
          {/* Outer Vinyl Grooves */}
          <div
            className={`w-[92%] h-[92%] rounded-full bg-gradient-to-tr from-[#0A0A0A] via-[#222226] to-[#0A0A0A] border border-[#3A3A3E] flex items-center justify-center shadow-inner ${
              isPlaying ? 'animate-spin' : ''
            }`}
            style={{ animationDuration: '6s' }}
          >
            <div className="w-[82%] h-[82%] rounded-full border border-[#FFFFFF]/10 flex items-center justify-center">
              {/* Center Record Label with Thumbnail */}
              <div className="w-[58%] h-[58%] rounded-full overflow-hidden relative border-2 border-[#FFFFFF]/40">
                <img
                  src={getYouTubeThumbnail(heroBattle.youtubeId, 'hq')}
                  alt=""
                  className={`w-full h-full object-cover ${theme.imgFilter}`}
                />
                {/* Center Spindle Hole */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#0A0A0A] border border-[#FFFFFF]/50" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : jacketStyle === 'HERO_SLEEVE' ? (
        <div className="w-full h-full relative">
          <img
            src={getYouTubeThumbnail(heroBattle.youtubeId, 'hq')}
            alt=""
            className={`w-full h-full object-cover ${theme.imgFilter}`}
          />
        </div>
      ) : (
        /* Default: MOSAIC_4 (2x2 Collage) */
        <div className="w-full h-full grid grid-cols-2 grid-rows-2">
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

      {/* Cinematic Vignette & Typography Sleeve Overlay (For md / lg sizes) */}
      <div
        className={`absolute inset-0 bg-gradient-to-t ${theme.overlay} pointer-events-none`}
      />

      {size !== 'sm' && (
        <>
          {/* Top Parental Advisory / 1verce Vinyl Stamp */}
          <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none">
            <span
              className={`px-1.5 py-0.2 rounded-xs font-mono-tech text-[8px] font-black tracking-wider uppercase ${theme.badgeBg} ${theme.badgeText}`}
            >
              {themeTag.slice(0, 12)}
            </span>
            <span className="px-1 bg-[#0A0A0A]/85 border border-[#FFFFFF]/20 font-mono-tech text-[8px] font-bold text-[#FFFFFF]">
              {trackCount}TRK
            </span>
          </div>

          {/* Bottom Sleeve Title */}
          <div className="absolute bottom-1.5 left-1.5 right-1.5 pointer-events-none">
            <div className="font-jp font-black text-[10px] sm:text-xs text-[#FFFFFF] leading-tight line-clamp-2 drop-shadow">
              {title}
            </div>
            <div className="text-[7px] font-mono-tech text-[#FFFFFF]/70 tracking-widest uppercase mt-0.5">
              1VERCE ORIGINAL MIXTAPE
            </div>
          </div>
        </>
      )}
    </div>
  );
};
