import React, { useState } from 'react';
import { MC_PROFILES } from '../data/initialData';
import { getYouTubeThumbnail, isSameMc } from '../utils/youtube';

interface McAvatarProps {
  mcName: string;
  fallbackYoutubeId?: string;
  fallbackFocal?: string;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  isOpponent?: boolean;
}

export const McAvatar: React.FC<McAvatarProps> = ({
  mcName,
  fallbackYoutubeId,
  fallbackFocal = '22% 30%',
  size = 'md',
  selected = false,
  isOpponent = false,
}) => {
  const [imgError, setImgError] = useState(false);

  const profile = MC_PROFILES.find((p) => isSameMc(p.name, mcName));
  const avatarUrl = profile?.avatarUrl;
  const youtubeId = profile?.repYoutubeId || fallbackYoutubeId;
  const focalPosition = profile?.focalPosition || fallbackFocal;

  const sizeClasses = {
    sm: 'w-9 h-9 text-xs',
    md: 'w-14 h-14 text-sm',
    lg: 'w-16 h-16 text-base',
  }[size];

  const ringClass = selected
    ? isOpponent
      ? 'ring-2 ring-[#E50914] ring-offset-2 ring-offset-[#0A0A0A]'
      : 'ring-2 ring-[#FFFFFF] ring-offset-2 ring-offset-[#0A0A0A]'
    : 'ring-1 ring-[#262626] group-hover:ring-[#8E8E93]';

  const initials = mcName.slice(0, 2).toUpperCase();

  return (
    <div
      className={`relative rounded-full overflow-hidden bg-[#121212] flex items-center justify-center shrink-0 transition-all duration-200 ${sizeClasses} ${ringClass}`}
    >
      {avatarUrl && !imgError ? (
        <>
          <img
            src={avatarUrl}
            alt={mcName}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover contrast-110"
            style={{ objectPosition: 'center 20%' }}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 pointer-events-none" />
        </>
      ) : youtubeId && !imgError ? (
        <>
          <img
            src={getYouTubeThumbnail(youtubeId, 'hq')}
            alt={mcName}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover scale-[2.2] contrast-125 saturate-95 transition-transform duration-300 group-hover:scale-[2.35]"
            style={{
              objectPosition: focalPosition,
              transformOrigin: focalPosition,
            }}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none" />
        </>
      ) : (
        <span className="font-display font-bold tracking-tighter text-[#FFFFFF] select-none">
          {initials}
        </span>
      )}
    </div>
  );
};
