import React from 'react';
import { Play, X, RotateCcw } from 'lucide-react';
import { Battle } from '../types';
import { formatTimestamp, getYouTubeThumbnail } from '../utils/youtube';

interface ResumePlaybackBannerProps {
  battle: Battle;
  seconds: number;
  onResume: (battleId: string, seconds: number) => void;
  onDismiss: () => void;
}

export const ResumePlaybackBanner: React.FC<ResumePlaybackBannerProps> = ({
  battle,
  seconds,
  onResume,
  onDismiss,
}) => {
  return (
    <aside
      aria-label="前回の再生を再開"
      className="bg-gradient-to-r from-[#1C1C1F] to-[#121214] border border-[#2C2C32] rounded-xl p-2.5 sm:p-3 flex items-center justify-between gap-3 shadow-lg animate-fadeIn"
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="relative w-12 h-12 rounded-lg bg-[#0A0A0A] overflow-hidden shrink-0 border border-[#2A2A2E]">
          <img
            src={getYouTubeThumbnail(battle.youtubeId, 'hq')}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-[#000000]/30 flex items-center justify-center">
            <RotateCcw className="w-4 h-4 text-[#FFFFFF]" />
          </div>
        </div>
        <div className="min-w-0 flex-1 font-jp">
          <div className="flex items-center gap-1.5 text-[10px] text-[#A1A1A6]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E50914]" />
            <span className="font-bold">前回の続きから再生できます</span>
            <span className="font-mono-tech font-bold text-[#FFFFFF]">
              ({formatTimestamp(seconds)}〜)
            </span>
          </div>
          <p className="text-xs font-black text-[#FFFFFF] truncate mt-0.5">
            {battle.mcA} vs {battle.mcB}
          </p>
          <p className="text-[10px] text-[#6C6C70] truncate">
            {battle.tournament} {battle.stageOrEvent}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => onResume(battle.id, seconds)}
          className="px-3 py-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#E5E5EA] text-[#0A0A0A] font-jp font-black text-xs flex items-center gap-1 shadow cursor-pointer transition-transform active:scale-95"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>再開</span>
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="案内を閉じる"
          className="p-1.5 text-[#6C6C70] hover:text-[#FFFFFF] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
