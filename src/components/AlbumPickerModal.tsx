import React, { useState } from 'react';
import { X, Disc3, Plus, Check, Clock, ArrowRight, Trash2 } from 'lucide-react';
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
  onNavigateToAlbums?: () => void;
  onAddTrackToAlbum: (
    albumId: string,
    battleId: string,
    startSeconds: number,
    note: string
  ) => void;
  onUpdateTrackInAlbum?: (
    albumId: string,
    trackId: string,
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
  onNavigateToAlbums,
  onAddTrackToAlbum,
  onUpdateTrackInAlbum,
  onRemoveTrackFromAlbum,
  onCreateAlbumWithTrack,
}) => {
  const [startTimeStr, setStartTimeStr] = useState(
    formatTimestamp(initialStartSeconds)
  );
  const [trackNote, setTrackNote] = useState(
    initialNote || `${battle.mcA} vs ${battle.mcB} (${battle.tournament})`
  );
  const [savedFeedbackId, setSavedFeedbackId] = useState<string | null>(null);

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
      newDesc.trim() || '自分だけのカスタム・ベストバウトLP盤',
      newTheme,
      battle.id,
      parsedSeconds,
      trackNote.trim()
    );
    onClose();
    onNavigateToAlbums?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#121216] border border-[#2C2C34] rounded-xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#22222A] flex items-center justify-between bg-[#0A0A0D]">
          <div className="flex items-center gap-2">
            <Disc3 className="w-4 h-4 text-[#E50914]" />
            <span className="font-jp text-xs font-black tracking-wider text-[#FFFFFF]">
              レコードへ収録 // ADD TO VINYL ALBUM
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="p-1 text-[#8E8E93] hover:text-[#FFFFFF] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* Selected Battle Preview */}
          <div className="flex items-center gap-3 bg-[#18181F] border border-[#282832] rounded-lg p-2.5">
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
          <div className="bg-[#0A0A0E] border border-[#24242C] rounded-lg p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[11px] font-jp text-[#AEAEB2] flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#E50914]" />
                <span>再生開始位置（00:00で最初から / 秒数指定で直行）</span>
              </label>
              <input
                type="text"
                value={startTimeStr}
                onChange={(e) => setStartTimeStr(e.target.value)}
                className="w-16 bg-[#16161C] border border-[#2C2C34] rounded px-2 py-0.5 text-xs font-mono-tech font-bold text-[#FFFFFF] text-center outline-none focus:border-[#FFFFFF]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-jp text-[#AEAEB2] mb-1">
                ライナーノーツ・一言メモ（任意）
              </label>
              <input
                type="text"
                value={trackNote}
                onChange={(e) => setTrackNote(e.target.value)}
                placeholder="例: 2バース目のアンサーが神がかり..."
                className="w-full bg-[#16161C] border border-[#2C2C34] rounded px-2.5 py-1.5 text-xs font-jp text-[#FFFFFF] outline-none focus:border-[#FFFFFF]"
              />
            </div>
          </div>

          {/* Existing Albums List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-jp font-bold text-[#AEAEB2]">
                収録先のレコードを選択
              </span>
              <button
                type="button"
                onClick={() => setIsCreatingNew((v) => !v)}
                className="text-[11px] font-jp font-bold text-[#E50914] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>新規レコード作成</span>
              </button>
            </div>

            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {albums.map((alb) => {
                const existingTrack = alb.tracks.find(
                  (t) => t.battleId === battle.id
                );
                const cleanTag = (alb.themeTag || 'BEST BOUTS').split('::')[0];
                const isUpdated = savedFeedbackId === alb.id;

                return (
                  <div
                    key={alb.id}
                    className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between gap-2 transition-all ${
                      existingTrack
                        ? 'bg-[#1C1C24] text-[#FFFFFF] border-[#FFFFFF]/50'
                        : 'bg-[#16161C] text-[#FFFFFF] border-[#262630] hover:border-[#8E8E93]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-jp font-black text-xs truncate">
                        {alb.title}
                      </div>
                      <div className="text-[10px] font-mono-tech text-[#8E8E93]">
                        {alb.tracks.length} TRACKS • {cleanTag}
                        {existingTrack && existingTrack.startSeconds > 0
                          ? ` • [${formatTimestamp(
                              existingTrack.startSeconds
                            )}〜]`
                          : ''}
                      </div>
                    </div>

                    {existingTrack ? (
                      <div className="flex items-center gap-1 shrink-0">
                        {onUpdateTrackInAlbum && (
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateTrackInAlbum(
                                alb.id,
                                existingTrack.id,
                                parsedSeconds,
                                trackNote.trim()
                              );
                              setSavedFeedbackId(alb.id);
                              setTimeout(() => setSavedFeedbackId(null), 1500);
                            }}
                            className="px-2 py-1 rounded bg-[#FFFFFF] text-[#0A0A0A] text-[10px] font-jp font-black cursor-pointer flex items-center gap-1"
                          >
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>{isUpdated ? '更新済' : '位置・メモ更新'}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onRemoveTrackFromAlbum(alb.id, battle.id)}
                          title="収録を解除"
                          className="p-1.5 rounded bg-[#262630] text-[#8E8E93] hover:text-[#FF4D4D] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          onAddTrackToAlbum(
                            alb.id,
                            battle.id,
                            parsedSeconds,
                            trackNote.trim()
                          );
                          setSavedFeedbackId(alb.id);
                          setTimeout(() => setSavedFeedbackId(null), 1500);
                        }}
                        className="px-3 py-1 rounded bg-[#FFFFFF] hover:bg-[#E5E5EA] text-[#0A0A0A] text-[11px] font-jp font-black flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>追加</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Create New Album Form */}
          {isCreatingNew && (
            <form
              onSubmit={handleCreateAndAdd}
              className="bg-[#181820] border border-[#3A3A46] rounded-lg p-3 space-y-2.5 animate-fadeIn"
            >
              <div className="text-xs font-jp font-black text-[#FFFFFF]">
                ＋ 新しいレコードを作成してこの試合を収録
              </div>

              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="レコード名（例: 個人的 戦極ベストバウト10選）"
                className="w-full bg-[#0A0A0E] border border-[#2C2C34] focus:border-[#FFFFFF] rounded px-2.5 py-1.5 text-xs font-jp text-[#FFFFFF] outline-none"
                required
              />

              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="アルバムの説明・ライナーノーツ（任意）"
                className="w-full bg-[#0A0A0E] border border-[#2C2C34] focus:border-[#FFFFFF] rounded px-2.5 py-1.5 text-xs font-jp text-[#FFFFFF] outline-none"
              />

              <div className="flex items-center gap-1 flex-wrap">
                {[
                  'MY BEST BOUTS',
                  'FLOW & GROOVE',
                  'LEGEND ARCHIVE',
                  'WORKOUT HYPE',
                ].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setNewTheme(tag)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono-tech cursor-pointer border ${
                      newTheme === tag
                        ? 'bg-[#FFFFFF] text-[#0A0A0A] border-[#FFFFFF] font-bold'
                        : 'bg-[#0A0A0E] text-[#8E8E93] border-[#262630]'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-[#E50914] hover:bg-[#F40612] text-[#FFFFFF] font-jp text-xs font-black cursor-pointer"
              >
                レコードを作成して収録＆再生へ →
              </button>
            </form>
          )}

          {/* Direct Jump to Vinyl Turntable */}
          {onNavigateToAlbums && (
            <div className="pt-1 border-t border-[#22222A] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-lg bg-[#1C1C22] text-xs font-jp font-bold text-[#8E8E93] hover:text-[#FFFFFF] cursor-pointer"
              >
                閉じる
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToAlbums();
                }}
                className="flex-1 py-2 px-3 rounded-lg bg-[#FFFFFF] hover:bg-[#E5E5EA] text-[#0A0A0A] font-jp text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Disc3 className="w-3.5 h-3.5 text-[#E50914]" />
                <span>レコード棚を開いて連続再生する</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
