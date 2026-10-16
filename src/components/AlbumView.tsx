import React, { useState, useMemo } from 'react';
import {
  Disc3,
  Play,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Share2,
  Check,
  Search,
  SkipForward,
  SkipBack,
  Square,
  Pencil,
  Sparkles,
  Palette,
} from 'lucide-react';
import {
  Album,
  AlbumJacketStyle,
  AlbumJacketTheme,
  Battle,
} from '../types';
import {
  formatTimestamp,
  getYouTubeThumbnail,
  matchesMcQuery,
} from '../utils/youtube';
import { YouTubePlayer } from './YouTubePlayer';
import { AlbumJacket } from './AlbumJacket';

interface AlbumViewProps {
  albums: Album[];
  battles: Battle[];
  onCreateAlbum: (
    title: string,
    description: string,
    themeTag: string,
    jacketStyle?: AlbumJacketStyle,
    jacketTheme?: AlbumJacketTheme
  ) => string;
  onUpdateAlbumMeta: (
    albumId: string,
    title: string,
    description: string,
    themeTag: string,
    jacketStyle?: AlbumJacketStyle,
    jacketTheme?: AlbumJacketTheme
  ) => void;
  onDeleteAlbum: (albumId: string) => void;
  onAddTrackToAlbum: (
    albumId: string,
    battleId: string,
    startSeconds: number,
    note: string
  ) => void;
  onRemoveTrackFromAlbum: (albumId: string, trackId: string) => void;
  onMoveTrack: (
    albumId: string,
    trackIndex: number,
    direction: 'UP' | 'DOWN'
  ) => void;
  onRecordAlbumPlay: (albumId: string, battleId: string) => void;
}

const JACKET_STYLE_OPTIONS: Array<{
  id: AlbumJacketStyle;
  label: string;
}> = [
  { id: 'MOSAIC_4', label: '4分割コラージュ' },
  { id: 'VINYL_LP', label: 'LPレコード盤' },
  { id: 'HERO_SLEEVE', label: 'シングル1枚絵' },
];

const JACKET_THEME_OPTIONS: Array<{
  id: AlbumJacketTheme;
  label: string;
  dotClass: string;
}> = [
  { id: 'CRIMSON', label: 'CRIMSON', dotClass: 'bg-[#E50914]' },
  { id: 'GOLD', label: 'GOLD', dotClass: 'bg-amber-400' },
  { id: 'MONO', label: 'MONO', dotClass: 'bg-white' },
  { id: 'CLASSIC', label: 'CLASSIC', dotClass: 'bg-zinc-500' },
];

export const AlbumView: React.FC<AlbumViewProps> = ({
  albums,
  battles,
  onCreateAlbum,
  onUpdateAlbumMeta,
  onDeleteAlbum,
  onAddTrackToAlbum,
  onRemoveTrackFromAlbum,
  onMoveTrack,
  onRecordAlbumPlay,
}) => {
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>(
    albums[0]?.id || ''
  );

  // Continuous Playback State
  const [playingTrackIndex, setPlayingTrackIndex] = useState<number | null>(
    null
  );
  const [seekNonce, setSeekNonce] = useState<number>(0);

  // Create Album Form State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTheme, setNewTheme] = useState('MY BEST BOUTS');
  const [newJacketStyle, setNewJacketStyle] =
    useState<AlbumJacketStyle>('MOSAIC_4');
  const [newJacketTheme, setNewJacketTheme] =
    useState<AlbumJacketTheme>('CRIMSON');

  // Edit Album Header State
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editTheme, setEditTheme] = useState('');

  // Quick Add Battle Search inside Album
  const [isAddSearchOpen, setIsAddSearchOpen] = useState(false);
  const [battleSearchQuery, setBattleSearchQuery] = useState('');

  // Share Feedback
  const [copiedAlbumShare, setCopiedAlbumShare] = useState(false);

  const battleMap = useMemo(() => {
    const map = new Map<string, Battle>();
    for (const b of battles) {
      map.set(b.id, b);
    }
    return map;
  }, [battles]);

  const activeAlbum = useMemo(
    () => albums.find((a) => a.id === selectedAlbumId) || albums[0] || null,
    [albums, selectedAlbumId]
  );

  const resolvedTracks = useMemo(() => {
    if (!activeAlbum) return [];
    return activeAlbum.tracks
      .map((t) => {
        const b = battleMap.get(t.battleId);
        return b ? { track: t, battle: b } : null;
      })
      .filter(
        (item): item is { track: Album['tracks'][number]; battle: Battle } =>
          Boolean(item)
      );
  }, [activeAlbum, battleMap]);

  const activeCoverBattles = useMemo(
    () => resolvedTracks.map((r) => r.battle).slice(0, 4),
    [resolvedTracks]
  );

  const activePlayingItem =
    playingTrackIndex !== null && resolvedTracks[playingTrackIndex]
      ? resolvedTracks[playingTrackIndex]
      : null;

  // Quick search results for adding battles to the active album
  const quickSearchBattles = useMemo(() => {
    const q = battleSearchQuery.trim().toLowerCase();
    const existingIds = new Set(
      activeAlbum?.tracks.map((t) => t.battleId) || []
    );
    return battles
      .filter((b) => {
        if (existingIds.has(b.id)) return false;
        if (!q) return true;
        return (
          matchesMcQuery(b.mcA, q) ||
          matchesMcQuery(b.mcB, q) ||
          b.tournament.toLowerCase().includes(q) ||
          b.title.toLowerCase().includes(q)
        );
      })
      .slice(0, 12);
  }, [battles, battleSearchQuery, activeAlbum]);

  const handleStartTrack = (index: number) => {
    if (!activeAlbum || !resolvedTracks[index]) return;
    setPlayingTrackIndex(index);
    setSeekNonce(Date.now());
    onRecordAlbumPlay(activeAlbum.id, resolvedTracks[index].battle.id);
  };

  const handleNextTrack = () => {
    if (playingTrackIndex === null) return;
    if (playingTrackIndex + 1 < resolvedTracks.length) {
      handleStartTrack(playingTrackIndex + 1);
    } else {
      setPlayingTrackIndex(null);
    }
  };

  const handlePrevTrack = () => {
    if (playingTrackIndex === null) return;
    if (playingTrackIndex - 1 >= 0) {
      handleStartTrack(playingTrackIndex - 1);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const createdId = onCreateAlbum(
      newTitle.trim(),
      newDesc.trim() || '自分だけのカスタム・ベストバウト・アルバム',
      newTheme,
      newJacketStyle,
      newJacketTheme
    );
    setSelectedAlbumId(createdId);
    setPlayingTrackIndex(null);
    setNewTitle('');
    setNewDesc('');
    setIsCreateOpen(false);
    setIsAddSearchOpen(true);
  };

  const handleCopyShareAlbum = async () => {
    if (!activeAlbum) return;
    const trackLines = resolvedTracks
      .slice(0, 8)
      .map(
        ({ track, battle }, idx) =>
          `${idx + 1}. ${battle.mcA} vs ${battle.mcB} (${battle.tournament})${
            track.startSeconds > 0
              ? ` [${formatTimestamp(track.startSeconds)}〜]`
              : ''
          }`
      )
      .join('\n');

    const text = `💿 MY 1VERCE ALBUM: 「${activeAlbum.title}」\n${activeAlbum.description}\n\n${trackLines}\n\n#1verce #MCバトル #マイベストバウト`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAlbumShare(true);
      setTimeout(() => setCopiedAlbumShare(false), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Create Album Button */}
      <div className="bg-[#121212] border border-[#242428] rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Disc3 className="w-4 h-4 text-[#E50914]" />
            <h2 className="font-jp font-black text-sm sm:text-base text-[#FFFFFF]">
              MY ALBUMS // 自分だけのベストバウト・アルバム＆連続再生
            </h2>
          </div>
          <p className="text-xs font-jp text-[#8E8E93]">
            収録曲のYouTube公式サムネイルから<strong className="text-[#FFFFFF]">オリジナルジャケット（4分割・LPレコード盤・シングル絵）</strong>をクライアント側で自動生成。画像ストレージ不要で維持コスト0円・曲順通りにノンストップ連続再生できます。
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen((v) => !v)}
          className="px-3.5 py-2 rounded bg-[#FFFFFF] hover:bg-[#E5E5EA] text-[#0A0A0A] font-jp text-xs font-black flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>新しいアルバムをつくる</span>
        </button>
      </div>

      {/* Create New Album Drawer */}
      {isCreateOpen && (
        <form
          onSubmit={handleCreateSubmit}
          className="bg-[#16161A] border border-[#3A3A3E] rounded-md p-4 space-y-3 animate-fadeIn"
        >
          <div className="flex items-center justify-between">
            <span className="font-jp font-black text-xs text-[#FFFFFF] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#E50914]" />
              <span>新規マイアルバムを作成</span>
            </span>
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="text-xs font-jp text-[#8E8E93] hover:text-[#FFFFFF] cursor-pointer"
            >
              閉じる
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-jp text-[#8E8E93] mb-1">
                アルバムタイトル *
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="例: 深夜に聴きたいR-指定×鎮座フロウ集"
                className="w-full bg-[#0A0A0A] border border-[#2C2C2E] focus:border-[#FFFFFF] rounded px-3 py-1.5 text-xs font-jp text-[#FFFFFF] outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-jp text-[#8E8E93] mb-1">
                テーマタグ
              </label>
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                {[
                  'MY BEST BOUTS',
                  'PUNCHLINE MIX',
                  'FLOW & GROOVE',
                  'WORKOUT HYPE',
                ].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setNewTheme(tag)}
                    className={`px-2.5 py-1 rounded text-[10px] font-mono-tech border cursor-pointer ${
                      newTheme === tag
                        ? 'bg-[#FFFFFF] text-[#0A0A0A] border-[#FFFFFF] font-bold'
                        : 'bg-[#0A0A0A] text-[#8E8E93] border-[#262628]'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Jacket Style & Theme Selector on Creation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-jp text-[#8E8E93] mb-1">
                ジャケットデザイン（自動生成）
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {JACKET_STYLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setNewJacketStyle(opt.id)}
                    className={`px-2.5 py-1 rounded text-[11px] font-jp border cursor-pointer ${
                      newJacketStyle === opt.id
                        ? 'bg-[#FFFFFF] text-[#0A0A0A] border-[#FFFFFF] font-bold'
                        : 'bg-[#0A0A0A] text-[#8E8E93] border-[#262628]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-jp text-[#8E8E93] mb-1">
                ジャケットカラーテーマ
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {JACKET_THEME_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setNewJacketTheme(opt.id)}
                    className={`px-2.5 py-1 rounded text-[10px] font-mono-tech border flex items-center gap-1.5 cursor-pointer ${
                      newJacketTheme === opt.id
                        ? 'bg-[#FFFFFF] text-[#0A0A0A] border-[#FFFFFF] font-bold'
                        : 'bg-[#0A0A0A] text-[#8E8E93] border-[#262628]'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${opt.dotClass}`} />
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-jp text-[#8E8E93] mb-1">
              ライナーノーツ・アルバム解説（任意）
            </label>
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="このアルバムのコンセプトや聴きどころ..."
              className="w-full bg-[#0A0A0A] border border-[#2C2C2E] focus:border-[#FFFFFF] rounded px-3 py-1.5 text-xs font-jp text-[#FFFFFF] outline-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-[#FFFFFF] text-[#0A0A0A] font-jp text-xs font-black cursor-pointer"
            >
              作成してバトルを選ぶ
            </button>
          </div>
        </form>
      )}

      {/* Horizontal Album Shelf Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
        {albums.map((alb) => {
          const isSelected = activeAlbum?.id === alb.id;
          const coverBattles = alb.tracks
            .map((t) => battleMap.get(t.battleId))
            .filter((b): b is Battle => Boolean(b))
            .slice(0, 4);

          return (
            <button
              key={alb.id}
              type="button"
              onClick={() => {
                setSelectedAlbumId(alb.id);
                setPlayingTrackIndex(null);
                setIsEditingMeta(false);
              }}
              className={`p-3 rounded-md border text-left flex items-center gap-3 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#1A1A1E] border-[#FFFFFF] ring-1 ring-[#FFFFFF]/25'
                  : 'bg-[#121214] border-[#222226] hover:border-[#3A3A3E]'
              }`}
            >
              <AlbumJacket
                title={alb.title}
                themeTag={alb.themeTag}
                trackCount={alb.tracks.length}
                coverBattles={coverBattles}
                jacketStyle={alb.jacketStyle || 'MOSAIC_4'}
                jacketTheme={alb.jacketTheme || 'CRIMSON'}
                size="sm"
                isPlaying={isSelected && playingTrackIndex !== null}
              />

              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-mono-tech text-[#E50914] font-bold uppercase">
                  {alb.themeTag}
                </div>
                <div className="font-jp font-black text-xs sm:text-sm text-[#FFFFFF] truncate">
                  {alb.title}
                </div>
                <div className="text-[11px] font-mono-tech text-[#8E8E93] mt-0.5">
                  {alb.tracks.length} TRACKS
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Album Deck & Tracklist */}
      {activeAlbum && (
        <div className="bg-[#121214] border border-[#26262A] rounded-md overflow-hidden">
          {/* Album Jacket Header */}
          <div className="p-4 sm:p-5 bg-gradient-to-b from-[#1C1C20] to-[#121214] border-b border-[#222226] space-y-4">
            {isEditingMeta ? (
              <div className="space-y-2.5 bg-[#0A0A0A] border border-[#2C2C2E] rounded p-3">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-[#161618] border border-[#2C2C2E] rounded px-2.5 py-1 text-sm font-jp font-black text-[#FFFFFF]"
                />
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full bg-[#161618] border border-[#2C2C2E] rounded px-2.5 py-1 text-xs font-jp text-[#FFFFFF]"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingMeta(false)}
                    className="px-2.5 py-1 rounded bg-[#242428] text-xs font-jp text-[#8E8E93] cursor-pointer"
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (editTitle.trim()) {
                        onUpdateAlbumMeta(
                          activeAlbum.id,
                          editTitle.trim(),
                          editDesc.trim(),
                          editTheme || activeAlbum.themeTag,
                          activeAlbum.jacketStyle,
                          activeAlbum.jacketTheme
                        );
                      }
                      setIsEditingMeta(false);
                    }}
                    className="px-3 py-1 rounded bg-[#FFFFFF] text-[#0A0A0A] text-xs font-jp font-bold cursor-pointer"
                  >
                    保存
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                {/* Left: Large Dynamic Record Jacket + Album Info */}
                <div className="flex flex-col sm:flex-row items-start gap-4 flex-1 min-w-0">
                  <AlbumJacket
                    title={activeAlbum.title}
                    themeTag={activeAlbum.themeTag}
                    trackCount={resolvedTracks.length}
                    coverBattles={activeCoverBattles}
                    jacketStyle={activeAlbum.jacketStyle || 'MOSAIC_4'}
                    jacketTheme={activeAlbum.jacketTheme || 'CRIMSON'}
                    size="lg"
                    isPlaying={playingTrackIndex !== null}
                  />

                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-[#E50914]/20 border border-[#E50914]/50 text-[#FF6B6B] font-mono-tech text-[10px] font-bold">
                        {activeAlbum.themeTag}
                      </span>
                      <span className="text-[11px] font-mono-tech text-[#8E8E93]">
                        {resolvedTracks.length} TRACKS • {activeAlbum.playCount}{' '}
                        PLAYS
                      </span>
                    </div>

                    <h3 className="font-jp font-black text-lg sm:text-xl text-[#FFFFFF]">
                      {activeAlbum.title}
                    </h3>

                    <p className="text-xs font-jp text-[#8E8E93]">
                      {activeAlbum.description}
                    </p>

                    {/* Instant 1-Click Jacket Customizer */}
                    <div className="pt-1.5 space-y-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-jp text-[#8E8E93] flex items-center gap-1 mr-1">
                          <Palette className="w-3 h-3 text-[#E50914]" />
                          ジャケ切替:
                        </span>
                        {JACKET_STYLE_OPTIONS.map((opt) => {
                          const currentStyle =
                            activeAlbum.jacketStyle || 'MOSAIC_4';
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() =>
                                onUpdateAlbumMeta(
                                  activeAlbum.id,
                                  activeAlbum.title,
                                  activeAlbum.description,
                                  activeAlbum.themeTag,
                                  opt.id,
                                  activeAlbum.jacketTheme || 'CRIMSON'
                                )
                              }
                              className={`px-2 py-0.5 rounded text-[10px] font-jp border transition-colors cursor-pointer ${
                                currentStyle === opt.id
                                  ? 'bg-[#FFFFFF] text-[#0A0A0A] border-[#FFFFFF] font-bold'
                                  : 'bg-[#141418] text-[#8E8E93] border-[#2C2C2E] hover:text-[#FFFFFF]'
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-jp text-[#8E8E93] mr-1">
                          カラー:
                        </span>
                        {JACKET_THEME_OPTIONS.map((opt) => {
                          const currentTheme =
                            activeAlbum.jacketTheme || 'CRIMSON';
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() =>
                                onUpdateAlbumMeta(
                                  activeAlbum.id,
                                  activeAlbum.title,
                                  activeAlbum.description,
                                  activeAlbum.themeTag,
                                  activeAlbum.jacketStyle || 'MOSAIC_4',
                                  opt.id
                                )
                              }
                              className={`px-2 py-0.5 rounded text-[10px] font-mono-tech border flex items-center gap-1 transition-colors cursor-pointer ${
                                currentTheme === opt.id
                                  ? 'bg-[#FFFFFF] text-[#0A0A0A] border-[#FFFFFF] font-bold'
                                  : 'bg-[#141418] text-[#8E8E93] border-[#2C2C2E] hover:text-[#FFFFFF]'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${opt.dotClass}`}
                              />
                              <span>{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Deck Actions */}
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  {resolvedTracks.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleStartTrack(0)}
                      className="px-4 py-2 rounded bg-[#FFFFFF] hover:bg-[#E5E5EA] text-[#0A0A0A] font-jp text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>連続再生 (PLAY ALL)</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsAddSearchOpen((v) => !v)}
                    className="px-3 py-2 rounded bg-[#1A1A1E] hover:bg-[#242429] text-[#FFFFFF] border border-[#2C2C2E] font-jp text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>曲を追加</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyShareAlbum}
                    className="px-2.5 py-2 rounded bg-[#1A1A1E] hover:bg-[#242429] text-[#FFFFFF] border border-[#2C2C2E] font-mono-tech text-xs font-bold flex items-center gap-1 cursor-pointer"
                    title="アルバムのトラックリストをコピーしてシェア"
                  >
                    {copiedAlbumShare ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>COPIED!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5" />
                        <span>SHARE</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditTitle(activeAlbum.title);
                      setEditDesc(activeAlbum.description);
                      setEditTheme(activeAlbum.themeTag);
                      setIsEditingMeta(true);
                    }}
                    className="p-2 rounded bg-[#1A1A1E] text-[#8E8E93] hover:text-[#FFFFFF] border border-[#2C2C2E] cursor-pointer"
                    title="アルバム名・解説を編集"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  {albums.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteAlbum(activeAlbum.id);
                        setPlayingTrackIndex(null);
                      }}
                      className="p-2 rounded bg-[#1A1A1E] text-[#8E8E93] hover:text-[#FF4D4D] border border-[#2C2C2E] cursor-pointer"
                      title="このアルバムを削除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Continuous Album Player Stage */}
            {activePlayingItem && (
              <div className="bg-[#0A0A0A] border border-[#3A3A3E] rounded-md overflow-hidden shadow-2xl">
                <div className="aspect-video w-full bg-[#0A0A0A]">
                  <YouTubePlayer
                    youtubeId={activePlayingItem.battle.youtubeId}
                    startSeconds={activePlayingItem.track.startSeconds}
                    seekNonce={seekNonce}
                    title={activePlayingItem.battle.title}
                    onTimeUpdate={() => {}}
                    onEnded={handleNextTrack}
                  />
                </div>
                <div className="px-3 py-2.5 bg-[#141416] border-t border-[#262628] flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-2 py-0.5 rounded bg-[#E50914] text-[#FFFFFF] font-mono-tech text-[10px] font-extrabold">
                      TRACK {String((playingTrackIndex || 0) + 1).padStart(2, '0')}{' '}
                      / {String(resolvedTracks.length).padStart(2, '0')}
                    </span>
                    <span className="font-jp font-black text-xs sm:text-sm text-[#FFFFFF] truncate">
                      {activePlayingItem.battle.mcA} vs{' '}
                      {activePlayingItem.battle.mcB}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handlePrevTrack}
                      disabled={playingTrackIndex === 0}
                      className="px-2 py-1 rounded bg-[#1E1E22] disabled:opacity-40 text-xs font-mono-tech text-[#FFFFFF] flex items-center gap-1 cursor-pointer"
                    >
                      <SkipBack className="w-3.5 h-3.5" />
                      <span>PREV</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleNextTrack}
                      disabled={
                        playingTrackIndex !== null &&
                        playingTrackIndex + 1 >= resolvedTracks.length
                      }
                      className="px-2 py-1 rounded bg-[#1E1E22] disabled:opacity-40 text-xs font-mono-tech text-[#FFFFFF] flex items-center gap-1 cursor-pointer"
                    >
                      <span>NEXT</span>
                      <SkipForward className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlayingTrackIndex(null)}
                      className="p-1.5 rounded bg-[#26262A] text-[#8E8E93] hover:text-[#FFFFFF] cursor-pointer"
                      title="プレイヤーを閉じる"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* In-Album Quick Battle Search & Add Drawer */}
            {isAddSearchOpen && (
              <div className="bg-[#0A0A0A] border border-[#2C2C2E] rounded p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <Search className="w-3.5 h-3.5 text-[#8E8E93]" />
                    <input
                      type="text"
                      value={battleSearchQuery}
                      onChange={(e) => setBattleSearchQuery(e.target.value)}
                      placeholder="MC名や大会名で検索してこのアルバムに1タップ追加..."
                      className="flex-1 bg-transparent text-xs font-jp text-[#FFFFFF] outline-none"
                      autoFocus
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddSearchOpen(false)}
                    className="text-[11px] font-jp text-[#8E8E93] hover:text-[#FFFFFF] cursor-pointer"
                  >
                    完了
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {quickSearchBattles.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between gap-2 bg-[#141416] border border-[#222225] rounded p-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={getYouTubeThumbnail(b.youtubeId, 'hq')}
                          alt=""
                          className="w-12 h-8 object-cover rounded shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-jp font-bold text-xs text-[#FFFFFF] truncate">
                            {b.mcA} vs {b.mcB}
                          </div>
                          <div className="text-[10px] font-jp text-[#8E8E93] truncate">
                            {b.tournament}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          onAddTrackToAlbum(
                            activeAlbum.id,
                            b.id,
                            b.verses[0]?.seconds || 0,
                            `${b.mcA} vs ${b.mcB} (${b.tournament})`
                          )
                        }
                        className="px-2 py-1 rounded bg-[#FFFFFF] text-[#0A0A0A] font-jp text-[11px] font-bold shrink-0 cursor-pointer"
                      >
                        ＋追加
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tracklist */}
          <div className="divide-y divide-[#1C1C20]">
            {resolvedTracks.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <p className="text-xs font-jp text-[#8E8E93]">
                  このアルバムにはまだバトルが収録されていません。
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddSearchOpen(true)}
                  className="px-4 py-1.5 rounded bg-[#FFFFFF] text-[#0A0A0A] font-jp text-xs font-bold cursor-pointer"
                >
                  ＋ バトルを検索して追加する
                </button>
              </div>
            ) : (
              resolvedTracks.map(({ track, battle }, idx) => {
                const isPlayingTrack = playingTrackIndex === idx;
                return (
                  <div
                    key={track.id}
                    className={`p-3 sm:px-4 flex items-center justify-between gap-3 transition-colors ${
                      isPlayingTrack
                        ? 'bg-[#1C1C22]'
                        : 'hover:bg-[#16161A]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleStartTrack(idx)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer group"
                    >
                      <span
                        className={`w-6 font-mono-tech text-xs font-extrabold shrink-0 ${
                          isPlayingTrack ? 'text-[#E50914]' : 'text-[#8E8E93]'
                        }`}
                      >
                        {isPlayingTrack
                          ? '▶'
                          : String(idx + 1).padStart(2, '0')}
                      </span>

                      <div className="relative w-20 h-12 rounded overflow-hidden bg-[#0A0A0A] border border-[#2C2C2E] shrink-0">
                        <img
                          src={getYouTubeThumbnail(battle.youtubeId, 'hq')}
                          alt={battle.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        {track.startSeconds > 0 && (
                          <span className="absolute bottom-0.5 right-0.5 px-1 bg-[#0A0A0A]/90 text-[9px] font-mono-tech text-[#FFFFFF]">
                            [{formatTimestamp(track.startSeconds)}〜]
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-jp font-black text-xs sm:text-sm text-[#FFFFFF] truncate">
                            {battle.mcA} vs {battle.mcB}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-[#1E1E22] text-[10px] font-jp text-[#8E8E93] shrink-0">
                            {battle.tournament}
                          </span>
                        </div>
                        {track.note && (
                          <p className="text-[11px] font-jp text-[#8E8E93] truncate mt-0.5">
                            {track.note}
                          </p>
                        )}
                      </div>
                    </button>

                    {/* Track Controls (Up / Down / Delete) */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onMoveTrack(activeAlbum.id, idx, 'UP')}
                        disabled={idx === 0}
                        className="p-1 rounded text-[#8E8E93] hover:text-[#FFFFFF] disabled:opacity-25 cursor-pointer"
                        title="曲順を上げる"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveTrack(activeAlbum.id, idx, 'DOWN')}
                        disabled={idx === resolvedTracks.length - 1}
                        className="p-1 rounded text-[#8E8E93] hover:text-[#FFFFFF] disabled:opacity-25 cursor-pointer"
                        title="曲順を下げる"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onRemoveTrackFromAlbum(activeAlbum.id, track.id)
                        }
                        className="p-1 rounded text-[#8E8E93] hover:text-[#FF4D4D] cursor-pointer"
                        title="アルバムから外す"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
