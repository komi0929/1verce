import React, { useState } from 'react';
import { X, Disc3, Plus, Check, Clock } from 'lucide-react';
import { Album, Battle } from '../types';
import {
  formatTimestamp,
  getYouTubeThumbnail,
  parseTimestampInput,
} from '../utils/youtube';

interface AlbumPickerModalProps {
  battle: Battle;
  initialStartSeconds?: number;
  initialNote?: string;
  albums: Album[];
  onClose: () => void;
  onAddTrackToAlbum: (
    albumId: string,
    battleId: string,
    startSeconds: number,
    note: string
  ) => void;
  onRemoveTrackFromAlbum: (albumId: string, battleId: string) => void;
  onCreateAlbumWithTrack: (
    title: string,
    description: string,
    themeTag: string,
    battleId: string,
    startSeconds: number,
    note: string
  ) => void;
}

export const AlbumPickerModal: React.FC<AlbumPickerModalProps> = ({
  battle,
  initialStartSeconds = 0,
  initialNote = '',
  albums,
  onClose,
  onAddTrackToAlbum,
  onRemoveTrackFromAlbum,
  onCreateAlbumWithTrack,
}) => {
  const [startTimeStr, setStartTimeStr] = useState(
    formatTimestamp(initialStartSeconds)
  );
  const [trackNote, setTrackNote] = useState(
    initialNote || `${battle.mcA} vs ${battle.mcB} (${battle.tournament})`
  );

  // New album quick creation
  const [isCreatingNew, setIsCreatingNew] = useState(albums.length === 0);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTheme, setNewTheme] = useState('MY BEST BOUTS');

  const parsedSeconds = parseTimestampInput(startTimeStr);

  const handleCreateAndAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onCreateAlbumWithTrack(
      newTitle.trim(),
      newDesc.trim() || '自分だけのカスタム・ベストバウト・アルバム',
      newTheme,
      battle.id,
      parsedSeconds,
      trackNote.trim()
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#121212] border border-[#2C2C2E] rounded-md overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#222224] flex items-center justify-between bg-[#0A0A0A]">
          <div className="flex items-center gap-2">
            <Disc3 className="w-4 h-4 text-[#E50914]" />
            <span className="font-jp text-xs font-black tracking-wider text-[#FFFFFF]">
              マイアルバムへ収録 // ADD TO MY ALBUM
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="閉じる"
            className="p-1 text-[#8E8E93] hover:text-[#FFFFFF] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* Selected Battle Preview */}
          <div className="flex items-center gap-3 bg-[#18181B] border border-[#262629] rounded p-2.5">
            <img
              src={getYouTubeThumbnail(battle.youtubeId, 'hq')}
              alt={battle.title}
              className="w-20 h-12 object-cover rounded shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="font-jp font-black text-sm text-[#FFFFFF] truncate">
                {battle.mcA} vs {battle.mcB}
              </div>
              <div className="text-[11px] font-jp text-[#8E8E93] truncate">
                {battle.tournament} • {battle.stageOrEvent}
              </div>
            </div>
          </div>

          {/* Track Start Time & Personal Liner Note */}
          <div className="bg-[#0A0A0A] border border-[#222224] rounded p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[11px] font-jp text-[#8E8E93] flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>再生開始位置（00:00で最初から / 秒数指定でバース直行）</span>
              </label>
              <input
                type="text"
                value={startTimeStr}
                onChange={(e) => setStartTimeStr(e.target.value)}
                className="w-16 bg-[#161618] border border-[#2C2C2E] rounded px-2 py-0.5 text-xs font-mono-tech font-bold text-[#FFFFFF] text-center outline-none focus:border-[#FFFFFF]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-jp text-[#8E8E93] mb-1">
                トラック一言メモ / ライナーノーツ（任意）
              </label>
              <input
                type="text"
                value={trackNote}
                onChange={(e) => setTrackNote(e.target.value)}
                placeholder="例: 2バース目のアンサーが神がかり..."
                className="w-full bg-[#161618] border border-[#2C2C2E] rounded px-2.5 py-1.5 text-xs font-jp text-[#FFFFFF] outline-none focus:border-[#FFFFFF]"
              />
            </div>
          </div>

          {/* Existing Albums List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-jp font-bold text-[#8E8E93]">
                収録先のアルバムを選択（1タップで追加・解除）
              </span>
              <button
                type="button"
                onClick={() => setIsCreatingNew((v) => !v)}
                className="text-[11px] font-jp font-bold text-[#FFFFFF] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>新規アルバム作成</span>
              </button>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {albums.map((alb) => {
                const alreadyIn = alb.tracks.some(
                  (t) => t.battleId === battle.id
                );
                return (
                  <button
                    key={alb.id}
                    type="button"
                    onClick={() => {
                      if (alreadyIn) {
                        onRemoveTrackFromAlbum(alb.id, battle.id);
                      } else {
                        onAddTrackToAlbum(
                          alb.id,
                          battle.id,
                          parsedSeconds,
                          trackNote.trim()
                        );
                      }
                    }}
                    className={`w-full p-2.5 rounded border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                      alreadyIn
                        ? 'bg-[#FFFFFF] text-[#0A0A0A] border-[#FFFFFF]'
                        : 'bg-[#161618] text-[#FFFFFF] border-[#262629] hover:border-[#8E8E93]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-jp font-black text-xs truncate">
                        {alb.title}
                      </div>
                      <div
                        className={`text-[10px] font-mono-tech ${
                          alreadyIn ? 'text-[#0A0A0A]/75' : 'text-[#8E8E93]'
                        }`}
                      >
                        {alb.tracks.length} TRACKS • {alb.themeTag}
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-mono-tech font-bold flex items-center gap-1 shrink-0 ${
                        alreadyIn
                          ? 'bg-[#0A0A0A] text-[#FFFFFF]'
                          : 'bg-[#242428] text-[#FFFFFF]'
                      }`}
                    >
                      {alreadyIn ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>収録済</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" />
                          <span>追加</span>
                        </>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Create New Album Form */}
          {isCreatingNew && (
            <form
              onSubmit={handleCreateAndAdd}
              className="bg-[#18181C] border border-[#3A3A3E] rounded p-3 space-y-2.5 animate-fadeIn"
            >
              <div className="text-xs font-jp font-black text-[#FFFFFF]">
                ＋ 新しいマイアルバムを作成してこの試合を収録
              </div>

              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="アルバム名（例: 個人的 戦極ベストバウト10選）"
                className="w-full bg-[#0A0A0A] border border-[#2C2C2E] focus:border-[#FFFFFF] rounded px-2.5 py-1.5 text-xs font-jp text-[#FFFFFF] outline-none"
                required
              />

              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="アルバムの説明・ライナーノーツ（任意）"
                className="w-full bg-[#0A0A0A] border border-[#2C2C2E] focus:border-[#FFFFFF] rounded px-2.5 py-1.5 text-xs font-jp text-[#FFFFFF] outline-none"
              />

              <div className="flex items-center gap-1 flex-wrap">
                {[
                  'MY BEST BOUTS',
                  'PUNCHLINE MIX',
                  'FLOW & GROOVE',
                  'LEGEND ARCHIVE',
                ].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setNewTheme(tag)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono-tech cursor-pointer border ${
                      newTheme === tag
                        ? 'bg-[#FFFFFF] text-[#0A0A0A] border-[#FFFFFF] font-bold'
                        : 'bg-[#0A0A0A] text-[#8E8E93] border-[#262628]'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded bg-[#FFFFFF] hover:bg-[#E5E5EA] text-[#0A0A0A] font-jp text-xs font-black cursor-pointer"
              >
                アルバムを作成して収録する
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
