import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Share2,
  Bookmark,
  Check,
  Square,
  ArrowUpRight,
  Disc3,
} from 'lucide-react';
import { Battle } from '../types';
import { formatTimestamp, getYouTubeThumbnail } from '../utils/youtube';
import { formatDuration, getBattleFormat, getDurationSec } from '../lib/battleFormat';
import { YouTubePlayer } from './YouTubePlayer';

interface BattleCardProps {
  battle: Battle;
  isPlaying: boolean;
  seekSeconds: number;
  seekNonce: number;
  isSaved: boolean;
  albumCountForBattle: number;
  onStartPlay: (battleId: string, seconds?: number) => void;
  onStopPlay: (battleId: string) => void;
  onProgress?: (seconds: number) => void;
  onVideoEnded?: (battleId: string) => void;
  onToggleSave: (battleId: string) => void;
  onOpenShare: (battle: Battle, currentSeconds?: number) => void;
  onOpenAlbumPicker: (
    battle: Battle,
    startSeconds?: number,
    note?: string
  ) => void;
}

const BattleCardComponent: React.FC<BattleCardProps> = ({
  battle,
  isPlaying,
  seekSeconds,
  seekNonce,
  isSaved,
  albumCountForBattle,
  onStartPlay,
  onStopPlay,
  onProgress,
  onVideoEnded,
  onToggleSave,
  onOpenShare,
  onOpenAlbumPicker,
}) => {
  const [thumbQuality, setThumbQuality] = useState<'hq' | 'mq'>('hq');
  const [thumbFailed, setThumbFailed] = useState(false);

  // Real-time playback state synced with YouTube IFrame API
  const [currentSeconds, setCurrentSeconds] = useState<number>(seekSeconds || 0);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [isPlayerPaused, setIsPlayerPaused] = useState<boolean>(false);
  const [togglePlayNonce, setTogglePlayNonce] = useState<number>(0);
  const [desiredPaused, setDesiredPaused] = useState<boolean>(false);

  useEffect(() => {
    setThumbQuality('hq');
    setThumbFailed(false);
  }, [battle.youtubeId]);

  useEffect(() => {
    if (isPlaying) {
      setCurrentSeconds(seekSeconds || 0);
      setIsPlayerPaused(false);
      setDesiredPaused(false);
    }
  }, [isPlaying, seekSeconds, seekNonce]);

  const handlePlayerTimeUpdate = (
    curSec: number,
    durSec: number,
    paused: boolean
  ) => {
    const secInt = Math.floor(curSec);
    setCurrentSeconds(secInt);
    if (durSec > 0) {
      setVideoDuration(Math.floor(durSec));
    }
    setIsPlayerPaused(paused);
    if (secInt >= 5 && secInt % 3 === 0) {
      onProgress?.(secInt);
    }
  };

  const handleTogglePause = () => {
    const nextPaused = !isPlayerPaused;
    setDesiredPaused(nextPaused);
    setIsPlayerPaused(nextPaused);
    setTogglePlayNonce(Date.now());
  };

  const activeTimeForLink = isPlaying ? currentSeconds : seekSeconds || 0;
  const format = getBattleFormat(battle);
  const durationLabel = formatDuration(getDurationSec(battle));

  return (
    <article
      id={`battle-${battle.id}`}
      className={`bg-[#121212] border transition-colors rounded-xl overflow-hidden ${
        isPlaying
          ? 'border-[#FFFFFF]/60 ring-1 ring-[#FFFFFF]/20 shadow-2xl'
          : 'border-[#222224] hover:border-[#363638]'
      }`}
    >
      {/* 1. Visual Area (16:9 for Full Match / 9:14 reel for Shorts) */}
      <div
        className={`relative w-full bg-[#0A0A0A] overflow-hidden ${
          format === 'SHORT'
            ? 'aspect-[9/13] max-h-[520px] max-w-[360px] mx-auto rounded-lg my-1'
            : 'aspect-video'
        }`}
      >
        {isPlaying ? (
          <YouTubePlayer
            youtubeId={battle.youtubeId}
            startSeconds={seekSeconds}
            seekNonce={seekNonce}
            togglePlayNonce={togglePlayNonce}
            desiredPaused={desiredPaused}
            title={battle.title}
            onTimeUpdate={handlePlayerTimeUpdate}
            onEnded={() => onVideoEnded?.(battle.id)}
          />
        ) : (
          <div
            onClick={() => onStartPlay(battle.id, 0)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onStartPlay(battle.id, 0);
              }
            }}
            className="group relative w-full h-full cursor-pointer select-none"
          >
            {!thumbFailed ? (
              <img
                src={getYouTubeThumbnail(battle.youtubeId, thumbQuality)}
                alt={battle.title}
                onLoad={(e) => {
                  const img = e.currentTarget;
                  // YouTube returns a 120x90 grey dummy placeholder image when no thumbnail exists
                  if (img.naturalWidth > 0 && img.naturalWidth <= 120) {
                    if (thumbQuality === 'hq') {
                      setThumbQuality('mq');
                    } else {
                      setThumbFailed(true);
                    }
                  }
                }}
                onError={() => {
                  if (thumbQuality === 'hq') {
                    setThumbQuality('mq');
                  } else {
                    setThumbFailed(true);
                  }
                }}
                className="w-full h-full object-cover contrast-105 group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-[#1A1A1A] flex flex-col items-center justify-center gap-2 text-[#8E8E93]">
                <Play className="w-10 h-10 opacity-40" />
                <span className="text-xs font-mono-tech uppercase">
                  Play on YouTube
                </span>
              </div>
            )}

            {/* Cinematic Gradient Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent pointer-events-none" />

            {/* Play Button Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-14 h-14 rounded-full bg-[#0A0A0A]/75 border border-[#FFFFFF]/30 group-hover:border-[#FFFFFF] group-hover:bg-[#FFFFFF] text-[#FFFFFF] group-hover:text-[#0A0A0A] flex items-center justify-center transition-all shadow-xl group-hover:scale-110">
                <Play className="w-6 h-6 fill-current translate-x-0.5" />
              </div>
            </div>

            {/* Top Tournament Tag & Match Info Badge */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded bg-[#0A0A0A]/90 border border-[#2C2C2E] font-mono-tech text-[11px] font-bold text-[#FFFFFF] tracking-wider uppercase backdrop-blur-sm">
                  {battle.tournament}
                </span>
                <span className="px-2 py-0.5 rounded bg-[#1A1A1A]/80 border border-[#2C2C2E] font-jp text-[10px] text-[#8E8E93]">
                  {battle.stageOrEvent}
                </span>
                {battle.year && (
                  <span className="px-1.5 py-0.5 rounded bg-[#1A1A1A]/80 border border-[#2C2C2E] font-mono-tech text-[10px] text-[#8E8E93]">
                    {battle.year}年
                  </span>
                )}
                {battle.isUserSubmitted && (
                  <span className="px-2 py-0.5 rounded bg-[#E50914]/90 text-[#FFFFFF] font-mono-tech text-[10px] font-bold tracking-wider uppercase">
                    NEW ARCHIVE
                  </span>
                )}
                {format === 'SHORT' && (
                  <span className="px-2 py-0.5 rounded bg-[#FFFFFF] text-[#0A0A0A] font-jp text-[10px] font-black">
                    ショート
                  </span>
                )}
                {format === 'CLIP' && (
                  <span className="px-2 py-0.5 rounded bg-[#FFFFFF] text-[#0A0A0A] font-jp text-[10px] font-black">
                    切り抜き・関連
                  </span>
                )}
              </div>
              {durationLabel && (
                <span className="shrink-0 px-1.5 py-0.5 rounded bg-[#0A0A0A]/85 font-mono-tech text-[10px] font-bold text-[#FFFFFF] backdrop-blur-sm">
                  {durationLabel}
                </span>
              )}
            </div>

            {/* Bottom Matchup Typography Overlay */}
            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
              <div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-jp font-black text-xl sm:text-2xl text-[#FFFFFF] tracking-tight drop-shadow">
                    {battle.mcA}
                  </span>
                  <span className="font-display font-bold text-sm sm:text-base text-[#E50914] tracking-widest uppercase">
                    VS
                  </span>
                  <span className="font-jp font-black text-xl sm:text-2xl text-[#FFFFFF] tracking-tight drop-shadow">
                    {battle.mcB}
                  </span>
                </div>
                <p className="text-[11px] text-[#8E8E93] font-jp line-clamp-1 mt-0.5">
                  {battle.title}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Playback Control & Interactive Scrub Bar while Playing */}
      {isPlaying && (
        <div className="bg-[#161619] border-b border-[#2C2C30] px-3 sm:px-4 py-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTogglePause}
                className="px-2.5 py-1 rounded bg-[#FFFFFF] hover:bg-[#E5E5EA] text-[#0A0A0A] text-[11px] font-jp font-black flex items-center gap-1 cursor-pointer transition-colors"
                title={isPlayerPaused ? '再生を再開' : '一時停止'}
              >
                {isPlayerPaused ? (
                  <>
                    <Play className="w-3 h-3 fill-current" />
                    <span>再開</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3 h-3 fill-current" />
                    <span>一時停止</span>
                  </>
                )}
              </button>

              <span className="px-2 py-0.5 rounded bg-[#0A0A0A] border border-[#2C2C2E] text-xs font-mono-tech font-bold text-[#FFFFFF]">
                {formatTimestamp(currentSeconds)}
                {videoDuration > 0 && (
                  <span className="text-[#8E8E93] font-normal">
                    {' '}
                    / {formatTimestamp(videoDuration)}
                  </span>
                )}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onStopPlay(battle.id)}
              className="px-2.5 py-1 rounded bg-[#242428] text-[#8E8E93] hover:text-[#FFFFFF] text-[11px] font-jp flex items-center gap-1 cursor-pointer transition-colors"
              title="再生を停止"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>停止</span>
            </button>
          </div>

          {videoDuration > 0 && (
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={videoDuration}
                value={Math.min(currentSeconds, videoDuration)}
                onChange={(e) => {
                  const sec = Number(e.target.value);
                  setCurrentSeconds(sec);
                  onStartPlay(battle.id, sec);
                }}
                aria-label="再生位置をシーク"
                className="w-full h-1.5 bg-[#2C2C34] rounded-lg appearance-none cursor-pointer accent-[#E50914]"
              />
            </div>
          )}
        </div>
      )}

      {/* Action & Curate Bar (+ ALBUM / SAVED / SHARE / OPEN ON YOUTUBE) */}
      <div className="px-3 sm:px-4 py-2.5 bg-[#0E0E10] border-t border-[#1F1F21] flex items-center justify-between gap-2 flex-wrap">
        <button
          type="button"
          onClick={() =>
            onOpenAlbumPicker(battle, isPlaying ? currentSeconds : 0)
          }
          className={`px-3 py-1 rounded-lg text-xs font-jp font-bold border flex items-center gap-1.5 transition-colors cursor-pointer ${
            albumCountForBattle > 0
              ? 'bg-[#FFFFFF] text-[#0A0A0A] border-[#FFFFFF]'
              : 'bg-[#161618] text-[#FFFFFF] border-[#2C2C2E] hover:border-[#FFFFFF]'
          }`}
        >
          <Disc3 className="w-3.5 h-3.5" />
          <span>
            {albumCountForBattle > 0
              ? isPlaying && currentSeconds > 0
                ? `レコード収録済 (${albumCountForBattle}) • ${formatTimestamp(
                    currentSeconds
                  )}〜`
                : `レコード収録済 (${albumCountForBattle})`
              : isPlaying && currentSeconds > 0
              ? `+ レコードへ収録 [${formatTimestamp(currentSeconds)}〜]`
              : '+ レコードへ収録'}
          </span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onToggleSave(battle.id)}
            aria-label={isSaved ? '保存を解除' : 'お気に入りに保存'}
            className={`px-2.5 py-1 rounded-lg text-xs font-jp font-bold border flex items-center gap-1 transition-colors cursor-pointer ${
              isSaved
                ? 'bg-[#FFFFFF] text-[#0A0A0A] border-[#FFFFFF]'
                : 'bg-[#161618] text-[#8E8E93] border-[#262628] hover:text-[#FFFFFF]'
            }`}
          >
            {isSaved ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Bookmark className="w-3.5 h-3.5" />
            )}
            <span>{isSaved ? '保存済' : '保存'}</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenShare(battle, isPlaying ? currentSeconds : 0)}
            aria-label="バトルをシェア"
            className="px-2.5 py-1 rounded-lg text-xs font-jp font-bold bg-[#1A1A1C] hover:bg-[#FFFFFF] text-[#FFFFFF] hover:text-[#0A0A0A] border border-[#2C2C2E] transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>共有</span>
          </button>

          <a
            href={`https://www.youtube.com/watch?v=${
              battle.youtubeId
            }&t=${Math.floor(activeTimeForLink)}s`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="YouTubeで動画を開く"
            title="YouTubeで開く"
            className="p-1.5 rounded-lg bg-[#161618] border border-[#262628] text-[#8E8E93] hover:text-[#FFFFFF] transition-colors"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
};

export const BattleCard = React.memo(BattleCardComponent);
