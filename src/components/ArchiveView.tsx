import React, { useState, useMemo } from 'react';
import { Play, Share2, Disc3, Flame } from 'lucide-react';
import { Battle, Verse } from '../types';
import { formatTimestamp, getYouTubeThumbnail } from '../utils/youtube';

interface ArchiveViewProps {
  battles: Battle[];
  userLikedVerses: Record<string, boolean>;
  onJumpToBattleVerse: (
    battleId: string,
    seconds: number,
    verseId: string
  ) => void;
  onLikeVerse: (battleId: string, verseId: string) => void;
  onOpenShare: (battle: Battle, verse: Verse) => void;
  onOpenAlbumPicker: (battle: Battle, startSeconds?: number, note?: string) => void;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({
  battles,
  userLikedVerses,
  onJumpToBattleVerse,
  onLikeVerse,
  onOpenShare,
  onOpenAlbumPicker,
}) => {
  const [sortBy, setSortBy] = useState<'LIKES' | 'LATEST' | 'REPLAYS'>(
    'LIKES'
  );

  const flattenedVerses = useMemo(() => {
    const items: Array<{ verse: Verse; battle: Battle }> = [];
    for (const battle of battles) {
      for (const verse of battle.verses) {
        items.push({ verse, battle });
      }
    }

    return items.sort((a, b) => {
      if (sortBy === 'REPLAYS') return b.verse.replays - a.verse.replays;
      if (sortBy === 'LIKES') {
        if (b.verse.likes !== a.verse.likes) return b.verse.likes - a.verse.likes;
      }
      return (
        new Date(b.verse.createdAt).getTime() -
        new Date(a.verse.createdAt).getTime()
      );
    });
  }, [battles, sortBy]);

  return (
    <div className="space-y-3">
      {/* Sub-filter bar for Archive */}
      <div className="bg-[#121212] border border-[#222224] rounded p-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-mono-tech text-[#8E8E93]">
            <Flame className="w-4 h-4 text-[#E50914]" />
            <span>
              STAMPED PUNCHLINES:{' '}
              <strong className="text-[#FFFFFF] font-bold">
                {flattenedVerses.length}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-1">
            {(
              [
                { id: 'LIKES', label: '🔥 いいね！順' },
                { id: 'LATEST', label: '新着順' },
                { id: 'REPLAYS', label: '再生順' },
              ] as const
            ).map((mode) => (
              <button
                key={mode.id}
                onClick={() => setSortBy(mode.id)}
                className={`px-2.5 py-1 rounded text-[11px] font-jp font-bold transition-colors cursor-pointer ${
                  sortBy === mode.id
                    ? 'bg-[#FFFFFF] text-[#0A0A0A]'
                    : 'bg-[#1A1A1A] text-[#8E8E93] hover:text-[#FFFFFF]'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Verse Cards */}
      {flattenedVerses.length === 0 ? (
        <div className="bg-[#121212] border border-[#222224] rounded-md p-8 text-center space-y-2">
          <Flame className="w-6 h-6 text-[#E50914] mx-auto" />
          <div className="font-jp font-bold text-sm text-[#FFFFFF]">
            まだ刻印されたパンチラインがありません
          </div>
          <p className="text-xs font-jp text-[#8E8E93]">
            バトル動画を再生中に「🔥 パンチライン！」ボタンを1タップすると、ここに自分の刻印コレクションが自動で溜まっていきます。
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {flattenedVerses.map(({ verse, battle }, index) => {
            const rank = String(index + 1).padStart(2, '0');
            const isLiked = Boolean(userLikedVerses[verse.id]);

            return (
              <div
                key={verse.id}
                className="group bg-[#121212] border border-[#222224] hover:border-[#48484A] rounded-md p-3 sm:p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 flex-1">
                  {/* Rank & Real Thumbnail Mini Preview */}
                  <div
                    onClick={() =>
                      onJumpToBattleVerse(battle.id, verse.seconds, verse.id)
                    }
                    className="relative w-24 h-16 rounded overflow-hidden bg-[#0A0A0A] border border-[#2C2C2E] shrink-0 cursor-pointer"
                  >
                    <img
                      src={getYouTubeThumbnail(battle.youtubeId, 'hq')}
                      alt={battle.title}
                      className="w-full h-full object-cover contrast-125 group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                      <Play className="w-5 h-5 text-[#FFFFFF] fill-current" />
                    </div>
                    <span className="absolute top-1 left-1 px-1 bg-[#0A0A0A]/90 text-[10px] font-mono-tech font-bold text-[#FFFFFF]">
                      #{rank}
                    </span>
                  </div>

                  {/* Verse Text & Metadata */}
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() =>
                          onJumpToBattleVerse(
                            battle.id,
                            verse.seconds,
                            verse.id
                          )
                        }
                        className="px-1.5 py-0.5 rounded bg-[#FFFFFF] text-[#0A0A0A] font-mono-tech text-xs font-extrabold hover:bg-[#E50914] hover:text-[#FFFFFF] transition-colors cursor-pointer"
                      >
                        [{formatTimestamp(verse.seconds)}]
                      </button>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-jp font-bold border bg-[#E50914]/20 text-[#FF6B6B] border-[#E50914]/50">
                        🔥 パンチライン
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-[#1A1A1A] border border-[#2C2C2E] text-[10px] font-jp font-bold text-[#FFFFFF]">
                        {battle.tournament}
                      </span>
                      <span className="text-xs font-jp text-[#8E8E93] truncate">
                        {battle.mcA} vs {battle.mcB}
                      </span>
                    </div>

                    <button
                      onClick={() =>
                        onJumpToBattleVerse(battle.id, verse.seconds, verse.id)
                      }
                      className="text-left block w-full cursor-pointer"
                    >
                      <p className="font-jp font-black text-sm sm:text-base text-[#FFFFFF] leading-snug group-hover:underline">
                        {verse.text}
                      </p>
                    </button>

                    <div className="flex items-center gap-3 text-[11px] font-mono-tech text-[#8E8E93]">
                      <span className="font-jp font-bold text-[#FFFFFF]">
                        — {verse.mc}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center justify-end gap-1.5 shrink-0 border-t sm:border-t-0 border-[#1F1F21] pt-2 sm:pt-0">
                  <button
                    onClick={() =>
                      onJumpToBattleVerse(battle.id, verse.seconds, verse.id)
                    }
                    className="px-3 py-1.5 rounded bg-[#1A1A1A] hover:bg-[#FFFFFF] text-[#FFFFFF] hover:text-[#0A0A0A] border border-[#2C2C2E] font-mono-tech text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>PLAY [{formatTimestamp(verse.seconds)}]</span>
                  </button>

                  <button
                    onClick={() =>
                      onOpenAlbumPicker(
                        battle,
                        verse.seconds,
                        `[${formatTimestamp(verse.seconds)}] ${verse.mc}: ${verse.text}`
                      )
                    }
                    className="p-2 rounded bg-[#121212] border border-[#2C2C2E] text-[#8E8E93] hover:text-[#FFFFFF] transition-colors cursor-pointer"
                    title="マイアルバムに追加"
                  >
                    <Disc3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onLikeVerse(battle.id, verse.id)}
                    className={`px-2.5 py-1.5 rounded font-jp text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                      isLiked
                        ? 'bg-[#E50914] text-[#FFFFFF] border-[#E50914]'
                        : 'bg-[#121212] text-[#E5E5EA] border-[#2C2C2E] hover:border-[#FFFFFF]'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5 fill-current" />
                    <span>いいね！ {verse.likes}</span>
                  </button>

                  <button
                    onClick={() => onOpenShare(battle, verse)}
                    className="p-2 rounded bg-[#121212] border border-[#2C2C2E] text-[#8E8E93] hover:text-[#FFFFFF] transition-colors cursor-pointer"
                    title="SHARE CARD"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
