import React, { useState } from 'react';
import { X, Copy, Check, Share2, ExternalLink } from 'lucide-react';
import { Battle, Verse } from '../types';
import { formatTimestamp, getYouTubeThumbnail } from '../utils/youtube';

interface ShareModalProps {
  battle: Battle;
  onClose: () => void;
  onRecordShare: (battleId: string) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  battle,
  onClose,
  onRecordShare,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  const baseUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : 'https://1verce.app/';
  const deepLinkUrl = `${baseUrl}?battle=${encodeURIComponent(battle.id)}`;

  const sharePostText = `${battle.mcA} vs ${battle.mcB} (${battle.tournament})\n#1verce #MCバトル`;

  const handleCopyDeepLink = async () => {
    try {
      await navigator.clipboard.writeText(deepLinkUrl);
      setCopiedLink(true);
      onRecordShare(battle.id);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCopyFullText = async () => {
    try {
      await navigator.clipboard.writeText(`${sharePostText}\n${deepLinkUrl}`);
      setCopiedText(true);
      onRecordShare(battle.id);
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleShareX = () => {
    onRecordShare(battle.id);
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      sharePostText
    )}&url=${encodeURIComponent(deepLinkUrl)}`;
    window.open(intentUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#121212] border border-[#2C2C2E] rounded-md overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-[#222224] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[#FFFFFF]" />
            <span className="font-mono-tech text-xs font-bold tracking-wider uppercase text-[#FFFFFF]">
              1VERCE SHARE CARD // DEEP LINK GENERATOR
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="シェアモーダルを閉じる"
            className="p-1 text-[#8E8E93] hover:text-[#FFFFFF] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* 1VERCE SHARE CARD VISUAL PREVIEW */}
          <div className="relative aspect-[16/10] w-full rounded overflow-hidden border border-[#2C2C2E] bg-[#0A0A0A] flex flex-col justify-between p-5 select-none">
            {/* High-Contrast Grayscale Real YouTube Thumbnail Background */}
            <img
              src={getYouTubeThumbnail(battle.youtubeId, 'hq')}
              alt={`${battle.mcA} vs ${battle.mcB}`}
              className="absolute inset-0 w-full h-full object-cover grayscale contrast-150 brightness-40 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/65 to-[#0A0A0A]/80" />

            {/* Top Row: Tournament Badge */}
            <div className="relative z-10 flex items-center justify-between">
              <span className="px-2 py-0.5 bg-[#1A1A1A]/90 border border-[#3A3A3C] text-[#FFFFFF] font-jp text-[11px] font-bold">
                {battle.tournament}
              </span>
              <span className="font-display text-sm font-bold tracking-tighter text-[#FFFFFF]">
                1verce
              </span>
            </div>

            {/* Center Row: Matchup */}
            <div className="relative z-10 my-auto py-2">
              <p className="font-jp font-black text-2xl sm:text-3xl text-[#FFFFFF] leading-snug tracking-tight drop-shadow">
                {battle.mcA} <span className="text-[#E50914] font-display">VS</span> {battle.mcB}
              </p>
              <p className="mt-1.5 font-jp font-bold text-xs text-[#8E8E93]">
                {battle.title}
              </p>
            </div>

            {/* Bottom Row: Tournament & 1verce Brand */}
            <div className="relative z-10 pt-2 border-t border-[#FFFFFF]/15 flex items-end justify-between gap-2">
              <div className="text-xs font-mono-tech text-[#FFFFFF]">
                <span className="text-[#8E8E93] font-jp">
                  {battle.stageOrEvent || battle.tournament}
                </span>
              </div>
              <span className="text-[10px] font-mono-tech text-[#8E8E93] uppercase tracking-widest">
                1VERCE ARCHIVE
              </span>
            </div>
          </div>

          {/* Deep Link URL Display */}
          <div className="space-y-1">
            <div className="text-[10px] font-mono-tech uppercase tracking-wider text-[#8E8E93]">
              BATTLE LINK URL
            </div>
            <div className="flex items-center gap-2 bg-[#0A0A0A] border border-[#262628] rounded px-3 py-2">
              <input
                type="text"
                readOnly
                value={deepLinkUrl}
                className="flex-1 bg-transparent text-xs font-mono-tech text-[#FFFFFF] outline-none"
              />
              <button
                type="button"
                onClick={handleCopyDeepLink}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1A1A1A] hover:bg-[#FFFFFF] text-[#FFFFFF] hover:text-[#0A0A0A] text-[11px] font-mono-tech font-bold transition-colors cursor-pointer shrink-0"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>COPIED</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>COPY URL</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Primary Viral Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleShareX}
              className="w-full py-2.5 px-4 rounded bg-[#FFFFFF] hover:bg-[#E5E5EA] text-[#0A0A0A] font-mono-tech text-xs font-extrabold tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>POST TO X (#1verce)</span>
            </button>

            <button
              type="button"
              onClick={handleCopyFullText}
              className="w-full py-2.5 px-4 rounded bg-[#1A1A1A] hover:bg-[#262628] text-[#FFFFFF] border border-[#2C2C2E] font-mono-tech text-xs font-bold tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {copiedText ? (
                <>
                  <Check className="w-4 h-4 text-[#FFFFFF]" />
                  <span>COPIED LYRIC + LINK</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>COPY LYRIC + DEEP LINK</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
