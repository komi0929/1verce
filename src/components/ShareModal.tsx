import React, { useState } from 'react';
import { X, Copy, Check, Share2, ExternalLink, Clock } from 'lucide-react';
import { Battle } from '../types';
import {
  formatTimestamp,
  getYouTubeThumbnail,
  parseTimestampInput,
} from '../utils/youtube';

interface ShareModalProps {
  battle: Battle;
  initialSeconds?: number;
  onClose: () => void;
  onRecordShare: (battleId: string) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  battle,
  initialSeconds = 0,
  onClose,
  onRecordShare,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [includeTime, setIncludeTime] = useState<boolean>(initialSeconds > 0);
  const [timeInputStr, setTimeInputStr] = useState<string>(
    formatTimestamp(initialSeconds)
  );

  const parsedSec = parseTimestampInput(timeInputStr);
  const baseUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : 'https://1verce.vercel.app/';

  const deepLinkUrl =
    includeTime && parsedSec > 0
      ? `${baseUrl}?battle=${encodeURIComponent(battle.id)}&t=${parsedSec}`
      : `${baseUrl}?battle=${encodeURIComponent(battle.id)}`;

  const sharePostText =
    includeTime && parsedSec > 0
      ? `${battle.mcA} vs ${battle.mcB} (${
          battle.tournament
        }) [${formatTimestamp(parsedSec)}〜]\n#1verce #MCバトル`
      : `${battle.mcA} vs ${battle.mcB} (${battle.tournament})\n#1verce #MCバトル`;

  const canNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

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

  const handleNativeShare = async () => {
    if (!canNativeShare) return;
    try {
      await navigator.share({
        title: `${battle.mcA} vs ${battle.mcB} | 1verce`,
        text: sharePostText,
        url: deepLinkUrl,
      });
      onRecordShare(battle.id);
    } catch {
      // User cancelled share sheet
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#121216] border border-[#2C2C34] rounded-xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-[#22222A] flex items-center justify-between bg-[#0A0A0D]">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[#E50914]" />
            <span className="font-jp text-xs font-black tracking-wider text-[#FFFFFF]">
              このバトルを共有 // SHARE BATTLE CARD
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="シェアモーダルを閉じる"
            className="p-1 text-[#8E8E93] hover:text-[#FFFFFF] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* 1VERCE SHARE CARD VISUAL PREVIEW */}
          <div className="relative aspect-[16/10] w-full rounded-lg overflow-hidden border border-[#2C2C34] bg-[#0A0A0A] flex flex-col justify-between p-5 select-none">
            <img
              src={getYouTubeThumbnail(battle.youtubeId, 'hq')}
              alt={`${battle.mcA} vs ${battle.mcB}`}
              className="absolute inset-0 w-full h-full object-cover grayscale contrast-150 brightness-40 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/65 to-[#0A0A0A]/80" />

            {/* Top Row: Tournament Badge */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded bg-[#1A1A1A]/90 border border-[#3A3A3C] text-[#FFFFFF] font-jp text-[11px] font-bold">
                  {battle.tournament}
                </span>
                {includeTime && parsedSec > 0 && (
                  <span className="px-2 py-0.5 rounded bg-[#E50914] text-[#FFFFFF] font-mono-tech text-[10px] font-bold">
                    {formatTimestamp(parsedSec)}〜
                  </span>
                )}
              </div>
              <span className="font-display text-sm font-bold tracking-tighter text-[#FFFFFF]">
                1verce
              </span>
            </div>

            {/* Center Row: Matchup */}
            <div className="relative z-10 my-auto py-2">
              <p className="font-jp font-black text-2xl sm:text-3xl text-[#FFFFFF] leading-snug tracking-tight drop-shadow">
                {battle.mcA}{' '}
                <span className="text-[#E50914] font-display">VS</span>{' '}
                {battle.mcB}
              </p>
              <p className="mt-1.5 font-jp font-bold text-xs text-[#8E8E93] line-clamp-1">
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

          {/* Optional Timestamp Direct Jump Setting */}
          <div className="flex items-center justify-between gap-2 bg-[#0A0A0E] border border-[#262630] rounded-lg px-3 py-2">
            <label className="flex items-center gap-2 text-xs font-jp text-[#FFFFFF] cursor-pointer">
              <input
                type="checkbox"
                checked={includeTime}
                onChange={(e) => setIncludeTime(e.target.checked)}
                className="accent-[#E50914] w-3.5 h-3.5 cursor-pointer"
              />
              <Clock className="w-3.5 h-3.5 text-[#E50914]" />
              <span>指定の秒数から再生するリンクを共有</span>
            </label>
            <input
              type="text"
              value={timeInputStr}
              onChange={(e) => {
                setTimeInputStr(e.target.value);
                setIncludeTime(true);
              }}
              placeholder="00:00"
              className="w-16 bg-[#16161C] border border-[#2C2C34] rounded px-2 py-0.5 text-xs font-mono-tech font-bold text-[#FFFFFF] text-center outline-none focus:border-[#FFFFFF]"
            />
          </div>

          {/* Deep Link URL Display */}
          <div className="space-y-1">
            <div className="text-[10px] font-jp font-bold text-[#8E8E93]">
              ダイレクト共有URL
            </div>
            <div className="flex items-center gap-2 bg-[#0A0A0E] border border-[#262630] rounded-lg px-3 py-2">
              <input
                type="text"
                readOnly
                value={deepLinkUrl}
                className="flex-1 bg-transparent text-xs font-mono-tech text-[#FFFFFF] outline-none"
              />
              <button
                type="button"
                onClick={handleCopyDeepLink}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1A1A22] hover:bg-[#FFFFFF] text-[#FFFFFF] hover:text-[#0A0A0A] text-[11px] font-jp font-bold transition-colors cursor-pointer shrink-0"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>コピー済</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>URLコピー</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Primary Viral Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {canNativeShare && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="sm:col-span-2 w-full py-2.5 px-4 rounded-lg bg-[#E50914] hover:bg-[#F40612] text-[#FFFFFF] font-jp text-xs font-black tracking-wide flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>スマホの共有メニューで送る (LINE / X / Instagram)</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleShareX}
              className="w-full py-2.5 px-4 rounded-lg bg-[#FFFFFF] hover:bg-[#E5E5EA] text-[#0A0A0A] font-jp text-xs font-black tracking-wide flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>X (Twitter) にポスト</span>
            </button>

            <button
              type="button"
              onClick={handleCopyFullText}
              className="w-full py-2.5 px-4 rounded-lg bg-[#1A1A22] hover:bg-[#262630] text-[#FFFFFF] border border-[#2C2C34] font-jp text-xs font-bold tracking-wide flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {copiedText ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>テキスト＋URLをコピーしました</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>対戦カード＋URLをコピー</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
