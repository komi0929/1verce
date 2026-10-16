import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Share2,
  Bookmark,
  Check,
  X,
  Square,
  ArrowUpRight,
  Disc3,
  Pencil,
  Trash2,
  Flame,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Battle, Verse } from '../types';
import {
  formatTimestamp,
  getYouTubeThumbnail,
  parseTimestampInput,
} from '../utils/youtube';
import { YouTubePlayer } from './YouTubePlayer';

interface BattleCardProps {
  battle: Battle;
  isPlaying: boolean;
  seekSeconds: number;
  seekNonce: number;
  activeVerseId: string | null;
  isSaved: boolean;
  albumCountForBattle: number;
  userLikedVerses: Record<string, boolean>;
  highlightedMc: string | null;
  onStartPlay: (battleId: string, seconds?: number, verseId?: string) => void;
  onStopPlay: (battleId: string) => void;
  onVideoEnded?: (battleId: string) => void;
  onStampPunchline: (
    battleId: string,
    seconds: number,
    mc: string,
    optionalText?: string
  ) => { verseId: string; mergedExisting: boolean; finalSeconds: number };
  onUpdateVerse: (
    battleId: string,
    verseId: string,
    updates: { seconds?: number; text?: string; mc?: string }
  ) => void;
  onDeleteVerse: (battleId: string, verseId: string) => void;
  onLikeVerse: (battleId: string, verseId: string) => void;
  onToggleSave: (battleId: string) => void;
  onOpenShare: (battle: Battle, verse?: Verse) => void;
  onOpenAlbumPicker: (
    battle: Battle,
    startSeconds?: number,
    note?: string
  ) => void;
  onSelectMcFilter?: (mc: string) => void;
}

export const DEFAULT_PUNCHLINE_PLACEHOLDER = 'パンチライン（秒数刻印）';

export const BattleCard: React.FC<BattleCardProps> = ({
  battle,
  isPlaying,
  seekSeconds,
  seekNonce,
  activeVerseId,
  isSaved,
  albumCountForBattle,
  userLikedVerses,
  onStartPlay,
  onStopPlay,
  onVideoEnded,
  onStampPunchline,
  onUpdateVerse,
  onDeleteVerse,
  onLikeVerse,
  onToggleSave,
  onOpenShare,
  onOpenAlbumPicker,
}) => {
  const [thumbQuality, setThumbQuality] = useState<'maxres' | 'hq'>('maxres');
  const [thumbFailed, setThumbFailed] = useState(false);

  // Real-time playback state synced with YouTube IFrame API
  const [currentSeconds, setCurrentSeconds] = useState<number>(seekSeconds || 0);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [isPlayerPaused, setIsPlayerPaused] = useState<boolean>(false);

  // Editing / Fine-tuning a specific punchline
  const [editingVerseId, setEditingVerseId] = useState<string | null>(null);
  const [editLyricText, setEditLyricText] = useState<string>('');
  const [feedbackBanner, setFeedbackBanner] = useState<{
    verseId: string;
    merged: boolean;
    seconds: number;
  } | null>(null);

  // Optional manual timestamp form when video is not playing
  const [isManualFormOpen, setIsManualFormOpen] = useState(false);
  const [manualTimeInput, setManualTimeInput] = useState('01:00');
  const [manualTextInput, setManualTextInput] = useState('');
  const [manualMc, setManualMc] = useState<string>(battle.mcA);

  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setManualMc(battle.mcA);
  }, [battle.mcA]);

  useEffect(() => {
    if (isPlaying) {
      setCurrentSeconds(seekSeconds || 0);
    }
  }, [isPlaying, seekSeconds, seekNonce]);

  const handlePlayerTimeUpdate = (
    curSec: number,
    durSec: number,
    paused: boolean
  ) => {
    setCurrentSeconds(Math.floor(curSec));
    if (durSec > 0) {
      setVideoDuration(Math.floor(durSec));
    }
    setIsPlayerPaused(paused);
  };

  // Single-Concept 1-TAP PUNCHLINE STAMP (With automatic ±6s deduplication & Like merge!)
  const handleOneTapPunchline = (mc: string) => {
    const targetSec = isPlaying
      ? isPlayerPaused
        ? Math.max(0, Math.floor(currentSeconds))
        : Math.max(0, Math.floor(currentSeconds - 3))
      : 0;

    const result = onStampPunchline(battle.id, targetSec, mc);

    setFeedbackBanner({
      verseId: result.verseId,
      merged: result.mergedExisting,
      seconds: result.finalSeconds,
    });
    setEditingVerseId(result.verseId);

    const existing = battle.verses.find((v) => v.id === result.verseId);
    setEditLyricText(
      existing && existing.text !== DEFAULT_PUNCHLINE_PLACEHOLDER
        ? existing.text
        : ''
    );

    setTimeout(() => {
      editInputRef.current?.focus();
    }, 60);
  };

  // Fine-tune timestamp by delta (-5s, -3s, -1s, +1s, +3s) and immediately preview seek
  const handleNudgeTimestamp = (verse: Verse, deltaSeconds: number) => {
    const nextSec = Math.max(0, verse.seconds + deltaSeconds);
    onUpdateVerse(battle.id, verse.id, { seconds: nextSec });
    onStartPlay(battle.id, nextSec, verse.id);
  };

  const handleSaveEditedVerse = (e: React.FormEvent, verse: Verse) => {
    e.preventDefault();
    const trimmed = editLyricText.trim();
    if (trimmed) {
      onUpdateVerse(battle.id, verse.id, { text: trimmed });
    }
    setEditingVerseId(null);
    setFeedbackBanner(null);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sec = parseTimestampInput(manualTimeInput);
    const result = onStampPunchline(
      battle.id,
      sec,
      manualMc,
      manualTextInput.trim() || undefined
    );
    setFeedbackBanner({
      verseId: result.verseId,
      merged: result.mergedExisting,
      seconds: result.finalSeconds,
    });
    setManualTextInput('');
    setIsManualFormOpen(false);
  };

  const sortedVerses = [...battle.verses].sort((a, b) => a.seconds - b.seconds);

  return (
    <article
      id={`battle-${battle.id}`}
      className={`bg-[#121212] border transition-colors rounded-md overflow-hidden ${
        isPlaying
          ? 'border-[#FFFFFF]/60 ring-1 ring-[#FFFFFF]/20 shadow-2xl'
          : 'border-[#222224] hover:border-[#363638]'
      }`}
    >
      {/* 1. Visual Area (16:9) */}
      <div className="relative aspect-video w-full bg-[#0A0A0A] overflow-hidden">
        {isPlaying ? (
          <YouTubePlayer
            youtubeId={battle.youtubeId}
            startSeconds={seekSeconds}
            seekNonce={seekNonce}
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
                onError={() => {
                  if (thumbQuality === 'maxres') {
                    setThumbQuality('hq');
                  } else {
                    setThumbFailed(true);
                  }
                }}
                className="w-full h-full object-cover contrast-105 group-hover:scale-102 transition-transform duration-300"
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
                {battle.isUserSubmitted && (
                  <span className="px-2 py-0.5 rounded bg-[#E50914]/90 text-[#FFFFFF] font-mono-tech text-[10px] font-bold tracking-wider uppercase">
                    USER ADDED
                  </span>
                )}
              </div>

              {sortedVerses.length > 0 && (
                <span className="px-2.5 py-0.5 rounded bg-[#E50914] text-[#FFFFFF] font-jp text-[10px] font-black shadow">
                  🔥 パンチライン {sortedVerses.length}
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

      {/* 2. Live 1-TAP PUNCHLINE CONSOLE (Appears while playing, 1 single unified concept) */}
      {isPlaying && (
        <div className="bg-[#161619] border-b border-[#2C2C30] px-3 sm:px-4 py-3 space-y-2.5">
          {/* Row 1: Real-time YouTube Sync Clock + Timeline Bar + Stop */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isPlayerPaused
                    ? 'bg-amber-400'
                    : 'bg-[#E50914] animate-live-dot'
                }`}
              />
              <span className="text-[11px] font-mono-tech font-extrabold tracking-wider text-[#FFFFFF]">
                {isPlayerPaused ? 'PAUSED' : 'PLAYING'}
              </span>
              <span className="px-2 py-0.5 rounded bg-[#0A0A0A] border border-[#2C2C2E] text-xs font-mono-tech font-bold text-[#FFFFFF]">
                {formatTimestamp(currentSeconds)}
                {videoDuration > 0 && (
                  <span className="text-[#8E8E93] font-normal">
                    {' '}
                    / {formatTimestamp(videoDuration)}
                  </span>
                )}
              </span>
              <span className="hidden sm:inline text-[11px] font-jp text-[#8E8E93]">
                （YouTubeシークバー完全連動）
              </span>
            </div>

            <button
              onClick={() => onStopPlay(battle.id)}
              className="px-2 py-1 rounded bg-[#242428] text-[#8E8E93] hover:text-[#FFFFFF] text-[11px] font-jp flex items-center gap-1 cursor-pointer"
              title="再生を停止"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>停止</span>
            </button>
          </div>

          {/* Visual Highlight Timeline Bar */}
          {videoDuration > 0 && (
            <div className="relative h-2 bg-[#0A0A0A] rounded-full border border-[#262628]">
              <div
                className="h-full bg-[#FFFFFF]/30 rounded-full transition-all duration-200"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(0, (currentSeconds / videoDuration) * 100)
                  )}%`,
                }}
              />
              {sortedVerses.map((v) => {
                const pct = Math.min(
                  98,
                  Math.max(1, (v.seconds / videoDuration) * 100)
                );
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => onStartPlay(battle.id, v.seconds, v.id)}
                    style={{ left: `${pct}%` }}
                    title={`[${formatTimestamp(v.seconds)}] ${v.mc}: ${v.text} (🔥${v.likes})`}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#E50914] border border-white hover:scale-150 transition-transform cursor-pointer z-10"
                  />
                );
              })}
            </div>
          )}

          {/* Row 2: THE 1-TAP PUNCHLINE BUTTONS (1 tap per MC = instant stamp or auto-merge like!) */}
          <div className="bg-[#0E0E11] border border-[#2A2A2E] rounded-md p-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2 text-[11px] font-jp">
              <span className="text-[#FFFFFF] font-bold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-[#E50914] fill-current" />
                <span>
                  1タップ・パンチライン刻印（文字入力不要・
                  {isPlayerPaused ? '現在秒数' : '3秒前'}を自動記録）
                </span>
              </span>
              <span className="text-[10px] text-[#8E8E93] hidden sm:inline">
                ※近い秒数が既にある場合は自動で「いいね！」に合算されます
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[battle.mcA, battle.mcB].map((mc) => (
                <button
                  key={mc}
                  type="button"
                  onClick={() => handleOneTapPunchline(mc)}
                  className="py-2.5 px-3 rounded bg-gradient-to-r from-[#E50914] to-[#B80710] hover:from-[#FF1F2A] hover:to-[#E50914] text-[#FFFFFF] font-jp text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 shadow-lg active:scale-97 transition-all cursor-pointer border border-[#FF4D4D]/40"
                >
                  <Flame className="w-4 h-4 fill-current shrink-0" />
                  <span className="truncate">
                    {mc} のパンチライン！
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. Punchline Index (Registered Punchlines & Upvotes) */}
      <div className="p-3 sm:p-4 space-y-2.5">
        <div className="flex items-center justify-between border-b border-[#1E1E20] pb-2">
          <div className="flex items-center gap-2">
            <span className="font-jp text-xs font-black text-[#FFFFFF] flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-[#E50914]" />
              <span>パンチライン ({sortedVerses.length})</span>
            </span>
            <span className="text-[11px] font-jp text-[#8E8E93]">
              / 秒数タップでそのバースから即再生
            </span>
          </div>

          {!isPlaying && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsManualFormOpen((prev) => !prev)}
                className="flex items-center gap-1 text-[11px] font-jp text-[#8E8E93] hover:text-[#FFFFFF] transition-colors cursor-pointer px-2 py-0.5 rounded border border-[#262628] hover:border-[#48484A]"
              >
                <Clock className="w-3 h-3" />
                <span>秒数指定</span>
              </button>
              <button
                type="button"
                onClick={() => onStartPlay(battle.id, 0)}
                className="flex items-center gap-1 text-[11px] font-jp font-black text-[#FFFFFF] bg-[#E50914] hover:bg-[#FF1F2A] transition-colors cursor-pointer px-2.5 py-1 rounded shadow"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>再生して1タップ刻印</span>
              </button>
            </div>
          )}
        </div>

        {/* Manual Timestamp Input Drawer (when paused/not playing) */}
        {isManualFormOpen && !isPlaying && (
          <form
            onSubmit={handleManualSubmit}
            className="bg-[#161618] border border-[#2C2C2E] rounded p-3 space-y-2.5 animate-fadeIn"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-jp text-[#8E8E93]">
                  パンチライン秒数:
                </label>
                <input
                  type="text"
                  value={manualTimeInput}
                  onChange={(e) => setManualTimeInput(e.target.value)}
                  placeholder="01:15"
                  className="w-16 bg-[#0A0A0A] border border-[#2C2C2E] rounded px-2 py-1 text-xs font-mono-tech text-[#FFFFFF] text-center outline-none focus:border-[#FFFFFF]"
                />
                <div className="flex items-center gap-1 ml-1">
                  {[battle.mcA, battle.mcB].map((mc) => (
                    <button
                      key={mc}
                      type="button"
                      onClick={() => setManualMc(mc)}
                      className={`px-2.5 py-0.5 rounded text-xs font-jp cursor-pointer ${
                        manualMc === mc
                          ? 'bg-[#FFFFFF] text-[#0A0A0A] font-black'
                          : 'bg-[#0A0A0A] text-[#8E8E93]'
                      }`}
                    >
                      {mc}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsManualFormOpen(false)}
                className="text-[#8E8E93] hover:text-[#FFFFFF] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={manualTextInput}
                onChange={(e) => setManualTextInput(e.target.value)}
                placeholder="リリックや熱いフレーズ（空欄のままでも秒数だけで登録可能）..."
                className="flex-1 bg-[#0A0A0A] border border-[#2C2C2E] rounded px-2.5 py-1.5 text-xs font-jp text-[#FFFFFF] outline-none focus:border-[#FFFFFF]"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded bg-[#E50914] text-[#FFFFFF] font-jp text-xs font-black cursor-pointer"
              >
                刻印する
              </button>
            </div>
          </form>
        )}

        {/* Punchlines List */}
        {sortedVerses.length === 0 ? (
          <div className="bg-[#151518] border border-dashed border-[#2A2A2E] rounded p-3.5 text-center">
            {isPlaying ? (
              <p className="text-xs font-jp text-[#E5E5EA]">
                👆 ヤバいバースが来たら、上の赤い{' '}
                <strong className="text-[#FF4D4D]">
                  「🔥 {battle.mcA} / {battle.mcB} のパンチライン！」
                </strong>{' '}
                ボタンを1タップしてください（文字入力不要で即座に刻まれます）。
              </p>
            ) : (
              <button
                type="button"
                onClick={() => onStartPlay(battle.id, 0)}
                className="w-full text-xs font-jp text-[#8E8E93] hover:text-[#FFFFFF] flex items-center justify-center gap-2 py-1 cursor-pointer transition-colors"
              >
                <Flame className="w-4 h-4 text-[#E50914]" />
                <span>
                  まだパンチラインが未登録です — 動画を再生して1タップで最初のパンチラインを刻む
                </span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {sortedVerses.map((verse) => {
              const isActiveVerse =
                isPlaying &&
                (activeVerseId === verse.id ||
                  Math.abs(currentSeconds - verse.seconds) < 5);
              const isLiked = Boolean(userLikedVerses[verse.id]);
              const isEditing = editingVerseId === verse.id;
              const isFeedbackTarget = feedbackBanner?.verseId === verse.id;
              const isPlaceholderText =
                verse.text === DEFAULT_PUNCHLINE_PLACEHOLDER;

              return (
                <div
                  key={verse.id}
                  className={`rounded transition-all p-2.5 space-y-2 ${
                    isActiveVerse
                      ? 'bg-[#1E1A1C] border border-[#E50914]/60 shadow-sm'
                      : 'bg-[#151517] hover:bg-[#19191C] border border-[#222225]'
                  }`}
                >
                  {/* Deduplication / Stamp Confirmation Toast */}
                  {isFeedbackTarget && feedbackBanner && (
                    <div className="px-2.5 py-1.5 rounded bg-[#E50914]/15 border border-[#E50914]/40 text-xs font-jp text-[#FFFFFF] flex items-center justify-between gap-2 animate-fadeIn">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#FF4D4D] shrink-0" />
                        <span>
                          {feedbackBanner.merged
                            ? `近い秒数 [${formatTimestamp(
                                feedbackBanner.seconds
                              )}] が既に登録されていたため、重複を作らず「🔥 いいね！(+1)」に合算しました！`
                            : `[${formatTimestamp(
                                feedbackBanner.seconds
                              )}] にパンチラインを刻印しました！`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFeedbackBanner(null)}
                        className="text-[10px] text-[#8E8E93] hover:text-[#FFFFFF] cursor-pointer shrink-0"
                      >
                        閉じる
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                    <button
                      type="button"
                      onClick={() =>
                        onStartPlay(battle.id, verse.seconds, verse.id)
                      }
                      className="flex-1 text-left flex items-baseline gap-2.5 cursor-pointer group/verse min-w-0"
                    >
                      <span
                        className={`font-mono-tech text-xs font-extrabold shrink-0 px-2 py-0.5 rounded transition-colors ${
                          isActiveVerse
                            ? 'bg-[#E50914] text-[#FFFFFF]'
                            : 'bg-[#0A0A0A] text-[#FFFFFF] border border-[#2C2C2E] group-hover/verse:bg-[#FFFFFF] group-hover/verse:text-[#0A0A0A]'
                        }`}
                      >
                        ▶ [{formatTimestamp(verse.seconds)}]
                      </span>

                      <div className="flex-1 min-w-0">
                        <span className="font-jp font-black text-xs text-[#FF6B6B] mr-2">
                          {verse.mc}
                        </span>
                        <span
                          className={`text-sm font-jp leading-snug ${
                            isPlaceholderText
                              ? 'text-[#8E8E93] italic'
                              : 'font-bold text-[#FFFFFF]'
                          }`}
                        >
                          {isPlaceholderText
                            ? '🔥 パンチライン（タップで再生 / ✏️から歌詞メモ追記可）'
                            : `"${verse.text}"`}
                        </span>
                      </div>
                    </button>

                    {/* Action Controls: Prominent いいね！ Button + Album + Edit + Share */}
                    <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                      <button
                        type="button"
                        onClick={() => onLikeVerse(battle.id, verse.id)}
                        title="このパンチラインにいいね！"
                        className={`px-2.5 py-1 rounded text-xs font-jp font-black border flex items-center gap-1 transition-all active:scale-95 cursor-pointer ${
                          isLiked
                            ? 'bg-[#E50914] text-[#FFFFFF] border-[#E50914] shadow'
                            : 'bg-[#121214] text-[#FFFFFF] border-[#2C2C30] hover:border-[#E50914]'
                        }`}
                      >
                        <Flame
                          className={`w-3.5 h-3.5 ${
                            isLiked ? 'fill-current' : 'text-[#E50914]'
                          }`}
                        />
                        <span>いいね！</span>
                        <span className="font-mono-tech ml-0.5">
                          {verse.likes}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onOpenAlbumPicker(
                            battle,
                            verse.seconds,
                            `[${formatTimestamp(verse.seconds)}] ${verse.mc}: ${verse.text}`
                          )
                        }
                        title="このパンチライン秒数をマイアルバムに追加"
                        className="p-1.5 rounded bg-[#121214] border border-[#26262A] text-[#8E8E93] hover:text-[#FFFFFF] transition-colors cursor-pointer"
                      >
                        <Disc3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (isEditing) {
                            setEditingVerseId(null);
                            setFeedbackBanner(null);
                          } else {
                            setEditingVerseId(verse.id);
                            setEditLyricText(
                              isPlaceholderText ? '' : verse.text
                            );
                          }
                        }}
                        title="秒数の微調整・リリック追記"
                        className={`p-1.5 rounded border transition-colors cursor-pointer ${
                          isEditing
                            ? 'bg-[#FFFFFF] text-[#0A0A0A] border-[#FFFFFF]'
                            : 'bg-[#121214] border-[#26262A] text-[#8E8E93] hover:text-[#FFFFFF]'
                        }`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenShare(battle, verse)}
                        title="このパンチラインをシェア"
                        className="p-1.5 rounded bg-[#121214] border border-[#26262A] text-[#8E8E93] hover:text-[#FFFFFF] transition-colors cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Instant Timestamp Nudge & Optional Lyric Edit Drawer */}
                  {isEditing && (
                    <div className="pt-2 border-t border-[#26262A] space-y-2 animate-fadeIn">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[11px] font-jp text-[#8E8E93] mr-1">
                            開始秒数を微調整（押すと即座にその秒数から確認再生）:
                          </span>
                          {([-5, -3, -1, +1, +3] as const).map((delta) => (
                            <button
                              key={delta}
                              type="button"
                              onClick={() => handleNudgeTimestamp(verse, delta)}
                              className="px-2 py-0.5 rounded bg-[#0A0A0A] hover:bg-[#FFFFFF] text-[#FFFFFF] hover:text-[#0A0A0A] border border-[#2C2C2E] font-mono-tech text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              {delta > 0 ? `+${delta}秒` : `${delta}秒`}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => onDeleteVerse(battle.id, verse.id)}
                          className="text-[11px] font-jp text-[#FF4D4D] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>削除</span>
                        </button>
                      </div>

                      <form
                        onSubmit={(e) => handleSaveEditedVerse(e, verse)}
                        className="flex items-center gap-1.5"
                      >
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editLyricText}
                          onChange={(e) => setEditLyricText(e.target.value)}
                          placeholder="パンチラインの歌詞や一言メモを入力（任意・空欄のままでもOK）..."
                          className="flex-1 bg-[#0A0A0A] border border-[#2C2C2E] focus:border-[#FFFFFF] rounded px-2.5 py-1.5 text-xs font-jp text-[#FFFFFF] outline-none"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 rounded bg-[#FFFFFF] text-[#0A0A0A] font-jp text-xs font-black shrink-0 cursor-pointer"
                        >
                          歌詞を保存
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingVerseId(null);
                            setFeedbackBanner(null);
                          }}
                          className="px-2.5 py-1.5 rounded bg-[#242428] text-[#8E8E93] hover:text-[#FFFFFF] font-jp text-xs shrink-0 cursor-pointer"
                        >
                          閉じる
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Action & Curate Bar (+ ALBUM / SAVED / SHARE / OPEN ON YOUTUBE) */}
      <div className="px-3 sm:px-4 py-2.5 bg-[#0E0E10] border-t border-[#1F1F21] flex items-center justify-between gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => onOpenAlbumPicker(battle, 0)}
          className={`px-3 py-1 rounded text-xs font-jp font-bold border flex items-center gap-1.5 transition-colors cursor-pointer ${
            albumCountForBattle > 0
              ? 'bg-[#FFFFFF] text-[#0A0A0A] border-[#FFFFFF]'
              : 'bg-[#161618] text-[#FFFFFF] border-[#2C2C2E] hover:border-[#FFFFFF]'
          }`}
        >
          <Disc3 className="w-3.5 h-3.5" />
          <span>
            {albumCountForBattle > 0
              ? `マイアルバム収録済 (${albumCountForBattle})`
              : '+ マイアルバムに追加'}
          </span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onToggleSave(battle.id)}
            aria-label={isSaved ? '保存を解除' : 'お気に入りに保存'}
            className={`px-2.5 py-1 rounded text-xs font-mono-tech border flex items-center gap-1 transition-colors cursor-pointer ${
              isSaved
                ? 'bg-[#FFFFFF] text-[#0A0A0A] border-[#FFFFFF] font-bold'
                : 'bg-[#161618] text-[#8E8E93] border-[#262628] hover:text-[#FFFFFF]'
            }`}
          >
            {isSaved ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Bookmark className="w-3.5 h-3.5" />
            )}
            <span className="hidden xs:inline">SAVED</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenShare(battle, sortedVerses[0])}
            aria-label="バトルをシェア"
            className="px-3 py-1 rounded text-xs font-mono-tech font-bold bg-[#1A1A1C] hover:bg-[#FFFFFF] text-[#FFFFFF] hover:text-[#0A0A0A] border border-[#2C2C2E] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>SHARE</span>
          </button>

          <a
            href={`https://www.youtube.com/watch?v=${battle.youtubeId}&t=${Math.floor(
              seekSeconds || 0
            )}s`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="YouTubeで動画を開く"
            title="OPEN ON YOUTUBE"
            className="p-1.5 rounded bg-[#161618] border border-[#262628] text-[#8E8E93] hover:text-[#FFFFFF] transition-colors"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
};
