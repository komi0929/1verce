import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Disc3,
  Play,
  Pause,
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
  Repeat,
  Shuffle,
  Volume2,
  VolumeX,
  Film,
  Clock,
  X,
} from 'lucide-react';
import {
  Album,
  AlbumJacketStyle,
  AlbumJacketTheme,
  Battle,
  TournamentTag,
} from '../types';
import { TOURNAMENTS } from '../data/initialData';
import {
  formatTimestamp,
  getYouTubeThumbnail,
  matchesMcQuery,
  parseTimestampInput,
} from '../utils/youtube';
import { YouTubePlayer } from './YouTubePlayer';
import { AlbumJacket } from './AlbumJacket';

export interface ActiveAlbumPlaybackInfo {
  albumId: string;
  albumTitle: string;
  battle: Battle;
  trackIndex: number;
  totalTracks: number;
  isPaused: boolean;
  onTogglePause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onStop: () => void;
}

interface AlbumViewProps {
  albums: Album[];
  communityAlbums?: Album[];
  battles: Battle[];
  initialSelectedAlbumId?: string | null;
  externalBattlePlaying?: boolean;
  onStopExternalBattle?: () => void;
  onActivePlaybackChange?: (info: ActiveAlbumPlaybackInfo | null) => void;
  onCreateAlbum: (
    title: string,
    description: string,
    themeTag: string,
    jacketStyle?: AlbumJacketStyle,
    jacketTheme?: AlbumJacketTheme
  ) => string;
  onImportCommunityAlbum?: (album: Album) => void;
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
  onUpdateTrackInAlbum?: (
    albumId: string,
    trackId: string,
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
  { id: 'VINYL_LP', label: 'LPレコード盤' },
  { id: 'MOSAIC_4', label: '4分割コラージュ' },
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

const THEME_PRESETS: string[] = [
  'MY BEST BOUTS',
  'LEGEND ARCHIVE',
  'FLOW & GROOVE',
  'HARD RHYME & SKILL',
  'WORKOUT HYPE',
];

function getPalette(theme?: AlbumJacketTheme): {
  border: string;
  accent: string;
} {
  switch (theme) {
    case 'GOLD':
      return { border: '#F59E0B', accent: '#FBBF24' };
    case 'MONO':
      return { border: '#FFFFFF', accent: '#E5E5EA' };
    case 'CLASSIC':
      return { border: '#A1A1AA', accent: '#D4D4D8' };
    case 'CRIMSON':
    default:
      return { border: '#E50914', accent: '#FF6B6B' };
  }
}

/**
 * Web Audio API Analog Vinyl Needle-Drop & Surface Crackle Synthesizer
 * Inspired by MD Vinyl's tactile needle-drop ritual (zero external assets required)
 */
function playVinylNeedleDropSound() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // 1. Subtle low-frequency stylus thump when needle touches vinyl
    const osc = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(115, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.09);

    thumpGain.gain.setValueAtTime(0.18, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc.connect(thumpGain);
    thumpGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);

    // 2. Warm analog vinyl surface noise & micro-crackle (0.55s)
    const duration = 0.55;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      // Sparse vinyl pops + soft hiss
      const pop = Math.random() > 0.992 ? (Math.random() * 2 - 1) * 0.85 : 0;
      const hiss = (Math.random() * 2 - 1) * 0.045;
      data[i] = pop + hiss;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1900, now);
    bandpass.Q.setValueAtTime(1.2, now);

    const crackleGain = ctx.createGain();
    crackleGain.gain.setValueAtTime(0.01, now);
    crackleGain.gain.linearRampToValueAtTime(0.14, now + 0.05);
    crackleGain.gain.exponentialRampToValueAtTime(0.008, now + duration);

    noise.connect(bandpass);
    bandpass.connect(crackleGain);
    crackleGain.connect(ctx.destination);

    noise.start(now + 0.02);
    noise.stop(now + duration);

    window.setTimeout(() => {
      ctx.close().catch(() => {});
    }, 750);
  } catch {
    // Ignore audio context restrictions
  }
}

function formatVinylTrackNumber(index: number): string {
  // Side A: tracks 1-4 (A1..A4), Side B: tracks 5-8 (B1..B4), etc.
  const sideIndex = Math.floor(index / 4);
  const sideLetter = String.fromCharCode(65 + (sideIndex % 26));
  const trackNum = (index % 4) + 1;
  return `${sideLetter}${trackNum}`;
}

export const AlbumView: React.FC<AlbumViewProps> = ({
  albums,
  communityAlbums = [],
  battles,
  initialSelectedAlbumId,
  externalBattlePlaying,
  onStopExternalBattle,
  onActivePlaybackChange,
  onCreateAlbum,
  onImportCommunityAlbum,
  onUpdateAlbumMeta,
  onDeleteAlbum,
  onAddTrackToAlbum,
  onUpdateTrackInAlbum,
  onRemoveTrackFromAlbum,
  onMoveTrack,
  onRecordAlbumPlay,
}) => {
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>(
    initialSelectedAlbumId || albums[0]?.id || ''
  );

  // Playback State
  const [playingTrackIndex, setPlayingTrackIndex] = useState<number | null>(
    null
  );
  const [seekNonce, setSeekNonce] = useState<number>(0);
  const [seekOverrideSeconds, setSeekOverrideSeconds] = useState<number | null>(
    null
  );
  const [togglePlayNonce, setTogglePlayNonce] = useState<number>(0);
  const [desiredPaused, setDesiredPaused] = useState<boolean>(false);
  const [stageMode, setStageMode] = useState<'VIDEO' | 'VINYL'>('VIDEO');
  const [isLoopAlbum, setIsLoopAlbum] = useState<boolean>(true);
  const [needleSoundEnabled, setNeedleSoundEnabled] = useState<boolean>(true);
  const [currentSeconds, setCurrentSeconds] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [isPlayerPaused, setIsPlayerPaused] = useState<boolean>(false);

  // Sync when initialSelectedAlbumId arrives via URL deep link (?album=...)
  useEffect(() => {
    if (
      initialSelectedAlbumId &&
      albums.some((a) => a.id === initialSelectedAlbumId)
    ) {
      setSelectedAlbumId(initialSelectedAlbumId);
    }
  }, [initialSelectedAlbumId, albums]);

  // Create Album Form State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTheme, setNewTheme] = useState('MY BEST BOUTS');
  const [newJacketStyle, setNewJacketStyle] =
    useState<AlbumJacketStyle>('VINYL_LP');
  const [newJacketTheme, setNewJacketTheme] =
    useState<AlbumJacketTheme>('CRIMSON');

  // Edit Album Meta & Jacket Customizer Drawer
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [isJacketCustomizerOpen, setIsJacketCustomizerOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editTheme, setEditTheme] = useState('');

  // Inline Track Editor State
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editTrackTimeStr, setEditTrackTimeStr] = useState('00:00');
  const [editTrackNote, setEditTrackNote] = useState('');

  // Crate Digger (In-Album Battle Search & Filter)
  const [isCrateDiggerOpen, setIsCrateDiggerOpen] = useState(false);
  const [crateSearchQuery, setCrateSearchQuery] = useState('');
  const [crateTournament, setCrateTournament] =
    useState<TournamentTag>('ALL');
  const [crateStartStr, setCrateStartStr] = useState('00:00');
  const [crateNoteInput, setCrateNoteInput] = useState('');

  // Share Feedback
  const [copiedAlbumShare, setCopiedAlbumShare] = useState(false);

  // Stop album playback if user starts playing an individual battle in the Battle tab
  useEffect(() => {
    if (externalBattlePlaying && playingTrackIndex !== null) {
      setPlayingTrackIndex(null);
    }
  }, [externalBattlePlaying, playingTrackIndex]);

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

  const previewHeroBattle =
    activePlayingItem?.battle || resolvedTracks[0]?.battle || battles[0];

  const handleStartTrack = useCallback(
    (index: number) => {
      if (!activeAlbum || !resolvedTracks[index]) return;
      onStopExternalBattle?.();
      if (needleSoundEnabled) {
        playVinylNeedleDropSound();
      }
      const startSec = resolvedTracks[index].track.startSeconds || 0;
      setPlayingTrackIndex(index);
      setSeekOverrideSeconds(null);
      setCurrentSeconds(startSec);
      setVideoDuration(0);
      setIsPlayerPaused(false);
      setDesiredPaused(false);
      setSeekNonce(Date.now());
      onRecordAlbumPlay(activeAlbum.id, resolvedTracks[index].battle.id);
    },
    [
      activeAlbum,
      resolvedTracks,
      needleSoundEnabled,
      onStopExternalBattle,
      onRecordAlbumPlay,
    ]
  );

  const handleTogglePause = useCallback(() => {
    const nextPaused = !isPlayerPaused;
    setDesiredPaused(nextPaused);
    setIsPlayerPaused(nextPaused);
    setTogglePlayNonce(Date.now());
  }, [isPlayerPaused]);

  const handleSeekTrack = useCallback((seconds: number) => {
    const clamped = Math.max(0, Math.floor(seconds));
    setCurrentSeconds(clamped);
    setSeekOverrideSeconds(clamped);
    setIsPlayerPaused(false);
    setDesiredPaused(false);
    setSeekNonce(Date.now());
  }, []);

  const handleNextTrack = useCallback(() => {
    if (playingTrackIndex === null || resolvedTracks.length === 0) return;
    if (playingTrackIndex + 1 < resolvedTracks.length) {
      handleStartTrack(playingTrackIndex + 1);
    } else if (isLoopAlbum) {
      handleStartTrack(0);
    } else {
      setPlayingTrackIndex(null);
    }
  }, [playingTrackIndex, resolvedTracks.length, isLoopAlbum, handleStartTrack]);

  const handlePrevTrack = useCallback(() => {
    if (playingTrackIndex === null || resolvedTracks.length === 0) return;
    if (playingTrackIndex - 1 >= 0) {
      handleStartTrack(playingTrackIndex - 1);
    } else if (isLoopAlbum) {
      handleStartTrack(resolvedTracks.length - 1);
    }
  }, [playingTrackIndex, resolvedTracks.length, isLoopAlbum, handleStartTrack]);

  const handleShufflePlay = useCallback(() => {
    if (resolvedTracks.length === 0) return;
    const randomIdx = Math.floor(Math.random() * resolvedTracks.length);
    handleStartTrack(randomIdx);
  }, [resolvedTracks.length, handleStartTrack]);

  const handleStopTurntable = useCallback(() => {
    setPlayingTrackIndex(null);
    setSeekOverrideSeconds(null);
  }, []);

  // Native Mobile Lock-Screen / Control Center Integration (MediaSession API)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
      return;
    }
    if (!activeAlbum || !activePlayingItem) {
      navigator.mediaSession.metadata = null;
      return;
    }

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${activePlayingItem.battle.mcA} vs ${activePlayingItem.battle.mcB}`,
        artist: `${activePlayingItem.battle.tournament} (${activePlayingItem.battle.year})`,
        album: activeAlbum.title,
        artwork: [
          {
            src: getYouTubeThumbnail(activePlayingItem.battle.youtubeId, 'hq'),
            sizes: '480x360',
            type: 'image/jpeg',
          },
        ],
      });

      navigator.mediaSession.setActionHandler('play', () => {
        setDesiredPaused(false);
        setIsPlayerPaused(false);
        setTogglePlayNonce(Date.now());
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        setDesiredPaused(true);
        setIsPlayerPaused(true);
        setTogglePlayNonce(Date.now());
      });
      navigator.mediaSession.setActionHandler('previoustrack', handlePrevTrack);
      navigator.mediaSession.setActionHandler('nexttrack', handleNextTrack);
      navigator.mediaSession.setActionHandler('stop', handleStopTurntable);
    } catch {
      // Ignore unsupported mediaSession actions
    }
  }, [
    activeAlbum,
    activePlayingItem,
    handlePrevTrack,
    handleNextTrack,
    handleStopTurntable,
  ]);

  // Report active playback state to App.tsx for Floating Mini Vinyl Bar
  useEffect(() => {
    if (!onActivePlaybackChange) return;
    if (activeAlbum && activePlayingItem && playingTrackIndex !== null) {
      onActivePlaybackChange({
        albumId: activeAlbum.id,
        albumTitle: activeAlbum.title,
        battle: activePlayingItem.battle,
        trackIndex: playingTrackIndex,
        totalTracks: resolvedTracks.length,
        isPaused: isPlayerPaused,
        onTogglePause: handleTogglePause,
        onPrev: handlePrevTrack,
        onNext: handleNextTrack,
        onStop: handleStopTurntable,
      });
    } else {
      onActivePlaybackChange(null);
    }
  }, [
    activeAlbum,
    activePlayingItem,
    playingTrackIndex,
    resolvedTracks.length,
    isPlayerPaused,
    handleTogglePause,
    handlePrevTrack,
    handleNextTrack,
    handleStopTurntable,
    onActivePlaybackChange,
  ]);

  // Crate Digger filtered battles
  const crateSearchBattles = useMemo(() => {
    const q = crateSearchQuery.trim().toLowerCase();
    return battles
      .filter((b) => {
        if (crateTournament !== 'ALL' && b.tournament !== crateTournament) {
          return false;
        }
        if (!q) return true;
        return (
          matchesMcQuery(b.mcA, q) ||
          matchesMcQuery(b.mcB, q) ||
          b.tournament.toLowerCase().includes(q) ||
          b.stageOrEvent.toLowerCase().includes(q) ||
          b.title.toLowerCase().includes(q)
        );
      })
      .slice(0, 30);
  }, [battles, crateSearchQuery, crateTournament]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const createdId = onCreateAlbum(
      newTitle.trim(),
      newDesc.trim() || '自分だけのカスタム・ベストバウトLP盤',
      newTheme,
      newJacketStyle,
      newJacketTheme
    );
    setSelectedAlbumId(createdId);
    setPlayingTrackIndex(null);
    setNewTitle('');
    setNewDesc('');
    setIsCreateOpen(false);
    setIsCrateDiggerOpen(true);
  };

  const handleMoveTrackSafe = (
    albumId: string,
    idx: number,
    direction: 'UP' | 'DOWN'
  ) => {
    onMoveTrack(albumId, idx, direction);
    if (playingTrackIndex !== null) {
      const targetIdx = direction === 'UP' ? idx - 1 : idx + 1;
      if (playingTrackIndex === idx) {
        setPlayingTrackIndex(targetIdx);
      } else if (playingTrackIndex === targetIdx) {
        setPlayingTrackIndex(idx);
      }
    }
  };

  const handleRemoveTrackSafe = (
    albumId: string,
    trackId: string,
    idx: number
  ) => {
    onRemoveTrackFromAlbum(albumId, trackId);
    if (playingTrackIndex !== null) {
      if (playingTrackIndex === idx) {
        setPlayingTrackIndex(null);
      } else if (playingTrackIndex > idx) {
        setPlayingTrackIndex(playingTrackIndex - 1);
      }
    }
  };

  const handleCopyShareAlbum = async () => {
    if (!activeAlbum) return;
    const baseUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}`
        : 'https://1verce.vercel.app/';
    const shareUrl = `${baseUrl}?album=${encodeURIComponent(activeAlbum.id)}`;

    const trackLines = resolvedTracks
      .slice(0, 10)
      .map(
        ({ track, battle }, idx) =>
          `${formatVinylTrackNumber(idx)}. ${battle.mcA} vs ${battle.mcB} (${
            battle.tournament
          })${
            track.startSeconds > 0
              ? ` [${formatTimestamp(track.startSeconds)}〜]`
              : ''
          }`
      )
      .join('\n');

    const text = `💿 MY 1VERCE VINYL: 「${activeAlbum.title}」\n${activeAlbum.description}\n\n${trackLines}\n\n${shareUrl}\n#1verce #MCバトル #マイベストバウト`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAlbumShare(true);
      setTimeout(() => setCopiedAlbumShare(false), 2500);
    } catch {
      // ignore
    }
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function'
    ) {
      try {
        await navigator.share({
          title: `${activeAlbum.title} | 1verce Vinyl`,
          text,
          url: shareUrl,
        });
      } catch {
        // User dismissed share sheet
      }
    }
  };

  const cleanThemeTag = (activeAlbum?.themeTag || 'BEST BOUTS').split('::')[0];

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. VINYL COLLECTION SHELF HEADER ("所有する喜び" - MD Vinyl Shelf) */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between gap-2 px-0.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#E50914]" />
            <h2 className="font-display text-sm sm:text-base font-bold tracking-wider uppercase text-[#FFFFFF]">
              VINYL COLLECTION
            </h2>
            <span className="text-[11px] font-jp text-[#8E8E93]">
              所有レコード棚 ({albums.length})
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateOpen((v) => !v)}
            className="px-3 py-1.5 rounded-full bg-[#FFFFFF] hover:bg-[#E5E5EA] text-[#0A0A0A] font-jp text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md transition-transform active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>新規レコード作成</span>
          </button>
        </div>

        {/* Create New Album Modal / Drawer with Live Vinyl Preview */}
        {isCreateOpen && (
          <form
            onSubmit={handleCreateSubmit}
            className="bg-[#141418] border border-[#323238] rounded-xl p-4 space-y-4 shadow-2xl animate-fadeIn"
          >
            <div className="flex items-center justify-between border-b border-[#242429] pb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#E50914]" />
                <span className="font-jp font-black text-xs sm:text-sm text-[#FFFFFF]">
                  PRESS NEW VINYL // 新しいマイアルバムを作成
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1 text-[#8E8E93] hover:text-[#FFFFFF] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              {/* Live Interactive Jacket Preview */}
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <AlbumJacket
                  title={newTitle.trim() || 'UNTITLED MIXTAPE'}
                  themeTag={newTheme}
                  trackCount={0}
                  coverBattles={battles.slice(0, 4)}
                  jacketStyle={newJacketStyle}
                  jacketTheme={newJacketTheme}
                  size="lg"
                  showVinylPeek={true}
                />
                <span className="text-[10px] font-mono-tech text-[#8E8E93]">
                  LIVE SLEEVE PREVIEW
                </span>
              </div>

              <div className="flex-1 w-full space-y-3">
                <div>
                  <label className="block text-[11px] font-jp font-bold text-[#AEAEB2] mb-1">
                    アルバムタイトル *
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="例: 深夜に聴きたいR-指定×鎮座フロウ集"
                    className="w-full bg-[#0A0A0C] border border-[#2C2C32] focus:border-[#FFFFFF] rounded-lg px-3 py-2 text-xs sm:text-sm font-jp font-bold text-[#FFFFFF] outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-jp font-bold text-[#AEAEB2] mb-1">
                    ライナーノーツ・解説（任意）
                  </label>
                  <input
                    type="text"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="このアルバムのコンセプトや聴きどころ..."
                    className="w-full bg-[#0A0A0C] border border-[#2C2C32] focus:border-[#FFFFFF] rounded-lg px-3 py-1.5 text-xs font-jp text-[#FFFFFF] outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-jp text-[#8E8E93] mb-1">
                      ジャケット仕様
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
                              : 'bg-[#0A0A0C] text-[#8E8E93] border-[#26262C]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-jp text-[#8E8E93] mb-1">
                      レーベルカラー
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {JACKET_THEME_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setNewJacketTheme(opt.id)}
                          className={`px-2 py-1 rounded text-[10px] font-mono-tech border flex items-center gap-1 cursor-pointer ${
                            newJacketTheme === opt.id
                              ? 'bg-[#FFFFFF] text-[#0A0A0A] border-[#FFFFFF] font-bold'
                              : 'bg-[#0A0A0C] text-[#8E8E93] border-[#26262C]'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${opt.dotClass}`}
                          />
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-jp text-[#8E8E93] mb-1">
                    ジャンル・テーマ刻印
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
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
                        className={`px-2 py-0.5 rounded text-[10px] font-mono-tech border cursor-pointer ${
                          newTheme === tag
                            ? 'bg-[#FFFFFF] text-[#0A0A0A] border-[#FFFFFF] font-bold'
                            : 'bg-[#0A0A0C] text-[#8E8E93] border-[#26262C]'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[#E50914] hover:bg-[#F40612] text-[#FFFFFF] font-jp text-xs font-black cursor-pointer shadow-lg"
              >
                レコード盤を作成して収録曲を選ぶ →
              </button>
            </div>
          </form>
        )}

        {/* Horizontal Touch-Scroll Vinyl Shelf (MD Vinyl Collection Look) */}
        <div className="flex items-stretch gap-3 overflow-x-auto no-scrollbar py-1.5 px-0.5">
          {albums.map((alb) => {
            const isSelected = activeAlbum?.id === alb.id;
            const isThisAlbumPlaying =
              isSelected && playingTrackIndex !== null;
            const coverBattles = alb.tracks
              .map((t) => battleMap.get(t.battleId))
              .filter((b): b is Battle => Boolean(b))
              .slice(0, 4);
            const cleanTag = (alb.themeTag || 'BEST BOUTS').split('::')[0];

            return (
              <button
                key={alb.id}
                type="button"
                onClick={() => {
                  if (selectedAlbumId !== alb.id) {
                    setSelectedAlbumId(alb.id);
                    setPlayingTrackIndex(null);
                    setIsEditingMeta(false);
                    setIsJacketCustomizerOpen(false);
                    setIsCrateDiggerOpen(false);
                    setEditingTrackId(null);
                  }
                }}
                className={`group relative p-3 rounded-xl border text-left flex items-center gap-3.5 shrink-0 w-[268px] sm:w-[290px] transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-br from-[#1E1E26] to-[#121216] border-[#FFFFFF] ring-1 ring-[#FFFFFF]/30 shadow-xl'
                    : 'bg-[#121215] border-[#222228] hover:border-[#3A3A44] opacity-85 hover:opacity-100'
                }`}
              >
                <AlbumJacket
                  title={alb.title}
                  themeTag={cleanTag}
                  trackCount={alb.tracks.length}
                  coverBattles={coverBattles}
                  jacketStyle={alb.jacketStyle || 'VINYL_LP'}
                  jacketTheme={alb.jacketTheme || 'CRIMSON'}
                  size="sm"
                  isPlaying={isThisAlbumPlaying}
                  showVinylPeek={true}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono-tech text-[#E50914] font-extrabold uppercase tracking-wider truncate">
                      {cleanTag}
                    </span>
                    {isThisAlbumPlaying && (
                      <span className="px-1.5 py-0.5 rounded-full bg-[#E50914] text-[8px] font-mono-tech font-bold text-white animate-pulse">
                        SPINNING
                      </span>
                    )}
                  </div>
                  <div className="font-jp font-black text-xs sm:text-sm text-[#FFFFFF] line-clamp-2 leading-snug mt-0.5">
                    {alb.title}
                  </div>
                  <div className="text-[10px] font-mono-tech text-[#8E8E93] mt-1 flex items-center gap-2">
                    <span>{alb.tracks.length} TRACKS</span>
                    <span>•</span>
                    <span>{alb.playCount} PLAYS</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. ACTIVE TURNTABLE & VINYL CONSOLE (MD Vinyl Immersive Stage) */}
      {activeAlbum && (
        <div className="relative bg-[#111115] border border-[#282830] rounded-2xl overflow-hidden shadow-2xl">
          {/* Dynamic Ambient Artwork Blur Backdrop */}
          {previewHeroBattle && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
              <img
                src={getYouTubeThumbnail(previewHeroBattle.youtubeId, 'hq')}
                alt=""
                className="w-full h-full object-cover blur-3xl scale-125"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0E]/40 via-[#111115]/85 to-[#111115]" />
            </div>
          )}

          {/* Top Turntable Studio Bar */}
          <div className="relative z-10 px-3.5 sm:px-5 py-3 border-b border-[#22222A] bg-[#0B0B0E]/80 backdrop-blur-md flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  activePlayingItem
                    ? isPlayerPaused
                      ? 'bg-amber-400'
                      : 'bg-[#E50914] animate-live-dot'
                    : 'bg-[#48484A]'
                }`}
              />
              <span className="font-mono-tech text-[11px] font-extrabold tracking-widest text-[#FFFFFF] uppercase">
                {activePlayingItem
                  ? `NOW SPINNING • ${formatVinylTrackNumber(
                      playingTrackIndex || 0
                    )}`
                  : 'TURNTABLE STANDBY • 33⅓ RPM'}
              </span>
            </div>

            {/* Hardware Switches: Stage Mode (Video vs MD Vinyl) + Needle Sound + Jacket Customizer */}
            <div className="flex items-center gap-1.5">
              {activePlayingItem && (
                <div className="flex items-center bg-[#18181E] p-0.5 rounded-lg border border-[#2C2C34]">
                  <button
                    type="button"
                    onClick={() => setStageMode('VIDEO')}
                    className={`px-2 py-1 rounded-md text-[10px] font-jp font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                      stageMode === 'VIDEO'
                        ? 'bg-[#FFFFFF] text-[#0A0A0A]'
                        : 'text-[#8E8E93] hover:text-[#FFFFFF]'
                    }`}
                  >
                    <Film className="w-3 h-3" />
                    <span>映像</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStageMode('VINYL')}
                    className={`px-2 py-1 rounded-md text-[10px] font-jp font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                      stageMode === 'VINYL'
                        ? 'bg-[#E50914] text-[#FFFFFF]'
                        : 'text-[#8E8E93] hover:text-[#FFFFFF]'
                    }`}
                  >
                    <Disc3 className="w-3 h-3" />
                    <span>レコード盤</span>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setNeedleSoundEnabled((v) => !v)}
                title="レコードに針を落とすサーフェスノイズ音のON/OFF"
                className={`px-2 py-1 rounded-lg border text-[10px] font-jp font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                  needleSoundEnabled
                    ? 'bg-[#18181E] text-[#FFFFFF] border-[#32323A]'
                    : 'bg-[#121216] text-[#6C6C70] border-[#222228]'
                }`}
              >
                {needleSoundEnabled ? (
                  <Volume2 className="w-3 h-3 text-[#E50914]" />
                ) : (
                  <VolumeX className="w-3 h-3" />
                )}
                <span className="hidden xs:inline">針音</span>
              </button>

              <button
                type="button"
                onClick={() => setIsJacketCustomizerOpen((v) => !v)}
                title="ジャケットデザイン＆カラーを着せ替え"
                className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
                  isJacketCustomizerOpen
                    ? 'bg-[#FFFFFF] text-[#0A0A0A] border-[#FFFFFF]'
                    : 'bg-[#18181E] text-[#AEAEB2] hover:text-[#FFFFFF] border-[#2C2C34]'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleCopyShareAlbum}
                className="px-2.5 py-1 rounded-lg bg-[#18181E] hover:bg-[#24242C] text-[#FFFFFF] border border-[#2C2C34] font-mono-tech text-[10px] font-bold flex items-center gap-1 cursor-pointer"
              >
                {copiedAlbumShare ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>COPIED</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3 h-3" />
                    <span>SHARE</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Optional Collapsible Jacket Customizer Bar */}
          {isJacketCustomizerOpen && (
            <div className="relative z-10 px-4 py-2.5 bg-[#0E0E12] border-b border-[#24242C] flex flex-wrap items-center justify-between gap-2 animate-fadeIn">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-jp font-bold text-[#8E8E93] mr-1">
                  ジャケ仕様:
                </span>
                {JACKET_STYLE_OPTIONS.map((opt) => {
                  const currentStyle = activeAlbum.jacketStyle || 'VINYL_LP';
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        onUpdateAlbumMeta(
                          activeAlbum.id,
                          activeAlbum.title,
                          activeAlbum.description,
                          cleanThemeTag,
                          opt.id,
                          activeAlbum.jacketTheme || 'CRIMSON'
                        )
                      }
                      className={`px-2 py-0.5 rounded text-[10px] font-jp border cursor-pointer ${
                        currentStyle === opt.id
                          ? 'bg-[#FFFFFF] text-[#0A0A0A] border-[#FFFFFF] font-bold'
                          : 'bg-[#16161C] text-[#8E8E93] border-[#2C2C34]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-jp font-bold text-[#8E8E93] mr-1">
                  カラー:
                </span>
                {JACKET_THEME_OPTIONS.map((opt) => {
                  const currentTheme = activeAlbum.jacketTheme || 'CRIMSON';
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        onUpdateAlbumMeta(
                          activeAlbum.id,
                          activeAlbum.title,
                          activeAlbum.description,
                          cleanThemeTag,
                          activeAlbum.jacketStyle || 'VINYL_LP',
                          opt.id
                        )
                      }
                      className={`px-2 py-0.5 rounded text-[10px] font-mono-tech border flex items-center gap-1 cursor-pointer ${
                        currentTheme === opt.id
                          ? 'bg-[#FFFFFF] text-[#0A0A0A] border-[#FFFFFF] font-bold'
                          : 'bg-[#16161C] text-[#8E8E93] border-[#2C2C34]'
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
          )}

          {/* MAIN STAGE AREA: Either Idle Vinyl Turntable OR Active Video/Vinyl Player */}
          <div className="relative z-10 p-4 sm:p-6 space-y-4">
            {/* Case A: NOT Playing Yet -> Show Tactile MD Vinyl Turntable Deck & Album Header */}
            {!activePlayingItem && (
              <div className="flex flex-col md:flex-row items-center md:items-start gap-5">
                {/* Tactile Click-to-Spin Vinyl Sleeve + Platter */}
                <div
                  onClick={() => {
                    if (resolvedTracks.length > 0) handleStartTrack(0);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (
                      (e.key === 'Enter' || e.key === ' ') &&
                      resolvedTracks.length > 0
                    ) {
                      e.preventDefault();
                      handleStartTrack(0);
                    }
                  }}
                  title="タップして針を落とす（連続再生スタート）"
                  className="relative cursor-pointer group shrink-0"
                >
                  <AlbumJacket
                    title={activeAlbum.title}
                    themeTag={cleanThemeTag}
                    trackCount={resolvedTracks.length}
                    coverBattles={activeCoverBattles}
                    jacketStyle={activeAlbum.jacketStyle || 'VINYL_LP'}
                    jacketTheme={activeAlbum.jacketTheme || 'CRIMSON'}
                    size="lg"
                    isPlaying={false}
                    showVinylPeek={true}
                  />
                  {resolvedTracks.length > 0 && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 rounded-full bg-[#E50914] text-white flex items-center justify-center shadow-2xl scale-95 group-hover:scale-105 transition-transform">
                        <Play className="w-5 h-5 fill-current translate-x-0.5" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Album Info & Primary Turntable Controls */}
                <div className="flex-1 min-w-0 text-center md:text-left space-y-2.5 w-full">
                  {isEditingMeta ? (
                    <div className="space-y-2 bg-[#0A0A0E] border border-[#2C2C34] rounded-xl p-3 text-left">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full bg-[#16161C] border border-[#2C2C34] rounded px-2.5 py-1.5 text-sm font-jp font-black text-[#FFFFFF]"
                        placeholder="アルバムタイトル"
                      />
                      <input
                        type="text"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="w-full bg-[#16161C] border border-[#2C2C34] rounded px-2.5 py-1.5 text-xs font-jp text-[#FFFFFF]"
                        placeholder="アルバム解説・ライナーノーツ"
                      />
                      <div className="flex items-center gap-1 flex-wrap">
                        {THEME_PRESETS.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setEditTheme(tag)}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono-tech cursor-pointer border ${
                              editTheme === tag
                                ? 'bg-[#FFFFFF] text-[#0A0A0A] border-[#FFFFFF] font-bold'
                                : 'bg-[#16161C] text-[#8E8E93] border-[#2C2C34]'
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingMeta(false)}
                          className="px-3 py-1 rounded bg-[#24242C] text-xs font-jp text-[#8E8E93] cursor-pointer"
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
                                editTheme || cleanThemeTag,
                                activeAlbum.jacketStyle,
                                activeAlbum.jacketTheme
                              );
                            }
                            setIsEditingMeta(false);
                          }}
                          className="px-3.5 py-1 rounded bg-[#FFFFFF] text-[#0A0A0A] text-xs font-jp font-black cursor-pointer"
                        >
                          保存する
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-[#E50914]/20 border border-[#E50914]/50 text-[#FF6B6B] font-mono-tech text-[10px] font-bold uppercase">
                          {cleanThemeTag}
                        </span>
                        <span className="text-[11px] font-mono-tech text-[#8E8E93]">
                          {resolvedTracks.length} TRACKS •{' '}
                          {activeAlbum.playCount} PLAYS
                        </span>
                      </div>

                      <div className="flex items-center justify-center md:justify-start gap-2">
                        <h3 className="font-jp font-black text-lg sm:text-2xl text-[#FFFFFF] tracking-tight">
                          {activeAlbum.title}
                        </h3>
                        <button
                          type="button"
                          onClick={() => {
                            setEditTitle(activeAlbum.title);
                            setEditDesc(activeAlbum.description);
                            setEditTheme(cleanThemeTag);
                            setIsEditingMeta(true);
                          }}
                          className="p-1.5 rounded-lg bg-[#1A1A20] text-[#8E8E93] hover:text-[#FFFFFF] border border-[#2C2C34] cursor-pointer"
                          title="タイトル・ライナーノーツを編集"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {albums.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `レコード「${activeAlbum.title}」を削除しますか？`
                                )
                              ) {
                                const nextAlb = albums.find(
                                  (a) => a.id !== activeAlbum.id
                                );
                                onDeleteAlbum(activeAlbum.id);
                                setPlayingTrackIndex(null);
                                if (nextAlb) {
                                  setSelectedAlbumId(nextAlb.id);
                                }
                              }
                            }}
                            className="p-1.5 rounded-lg bg-[#1A1A20] text-[#8E8E93] hover:text-[#FF4D4D] border border-[#2C2C34] cursor-pointer"
                            title="このアルバムを削除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <p className="text-xs font-jp text-[#AEAEB2] max-w-xl leading-relaxed">
                        {activeAlbum.description}
                      </p>
                    </>
                  )}

                  {/* Primary Action Buttons: DROP NEEDLE (Play All) / Shuffle / Add Tracks */}
                  <div className="pt-2 flex items-center justify-center md:justify-start gap-2 flex-wrap">
                    {resolvedTracks.length > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleStartTrack(0)}
                          className="px-5 py-2.5 rounded-full bg-[#E50914] hover:bg-[#F40612] text-[#FFFFFF] font-jp text-xs sm:text-sm font-black flex items-center gap-2 cursor-pointer shadow-lg shadow-[#E50914]/25 transition-transform active:scale-95"
                        >
                          <Play className="w-4 h-4 fill-current" />
                          <span>針を落として連続再生</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleShufflePlay}
                          className="px-3.5 py-2.5 rounded-full bg-[#1C1C24] hover:bg-[#262630] text-[#FFFFFF] border border-[#2E2E38] font-jp text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Shuffle className="w-3.5 h-3.5" />
                          <span>シャッフル</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsCrateDiggerOpen((v) => !v)}
                      className={`px-4 py-2.5 rounded-full font-jp text-xs font-black flex items-center gap-1.5 cursor-pointer border transition-colors ${
                        isCrateDiggerOpen
                          ? 'bg-[#FFFFFF] text-[#0A0A0A] border-[#FFFFFF]'
                          : 'bg-[#181820] hover:bg-[#24242E] text-[#FFFFFF] border-[#32323C]'
                      }`}
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>バトルをディグって追加</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Case B: ACTIVE PLAYBACK STAGE (Seamless Video Stage + MD Vinyl Spinning Record Stage) */}
            {activePlayingItem && (
              <div className="space-y-3">
                {/* Stage Container: Keeps YouTubePlayer ALWAYS mounted so switching between VIDEO and VINYL never interrupts audio! */}
                <div className="relative rounded-xl overflow-hidden border border-[#2E2E38] bg-[#070709] shadow-2xl">
                  {/* MD VINYL RECORD TURNTABLE STAGE (Shown when stageMode === 'VINYL') */}
                  {stageMode === 'VINYL' && (
                    <div className="relative pt-6 pb-24 px-4 sm:py-8 sm:px-6 flex flex-col items-center justify-center min-h-[300px] sm:min-h-[340px] overflow-hidden">
                      {/* Ambient Blurred Jacket Background */}
                      <img
                        src={getYouTubeThumbnail(
                          activePlayingItem.battle.youtubeId,
                          'hq'
                        )}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-30 blur-2xl scale-125 pointer-events-none"
                      />
                      <div className="absolute inset-0 bg-radial from-transparent via-[#09090C]/70 to-[#09090C] pointer-events-none" />

                      {/* Turntable Platter & Spinning 12-inch Vinyl Disc + Tonearm */}
                      <div className="relative z-10 flex items-center justify-center">
                        {/* Platter Base Ring (Tap to Play / Pause) */}
                        <div
                          onClick={handleTogglePause}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleTogglePause();
                            }
                          }}
                          title={
                            isPlayerPaused
                              ? 'タップして針を落とす（再生再開）'
                              : 'タップして一時停止'
                          }
                          className="relative w-52 h-52 sm:w-68 sm:h-68 rounded-full bg-[#121217] border-4 border-[#262630] shadow-[0_20px_60px_rgba(0,0,0,0.9)] flex items-center justify-center cursor-pointer"
                        >
                          {/* Spinning 12" Vinyl LP */}
                          <div
                            className={`w-[94%] h-[94%] rounded-full border border-white/10 flex items-center justify-center ${
                              isPlayerPaused ? '' : 'animate-spin'
                            }`}
                            style={{
                              animationDuration: '4.5s',
                              backgroundImage:
                                'conic-gradient(from 25deg, #070709 0deg, #262630 38deg, #070709 78deg, #070709 180deg, #262630 218deg, #070709 258deg, #070709 360deg)',
                            }}
                          >
                            {/* Concentric Vinyl Grooves */}
                            <div className="w-[86%] h-[86%] rounded-full border border-white/10 flex items-center justify-center">
                              <div className="w-[74%] h-[74%] rounded-full border border-white/10 flex items-center justify-center">
                                <div className="w-[62%] h-[62%] rounded-full border border-white/10 flex items-center justify-center">
                                  {/* Center Record Label with Current Battle Artwork */}
                                  <div
                                    className="w-[76%] h-[76%] rounded-full overflow-hidden relative border-2 shadow-inner"
                                    style={{
                                      borderColor: getPalette(
                                        activeAlbum.jacketTheme
                                      ).border,
                                    }}
                                  >
                                    <img
                                      src={getYouTubeThumbnail(
                                        activePlayingItem.battle.youtubeId,
                                        'hq'
                                      )}
                                      alt=""
                                      className="w-full h-full object-cover contrast-115"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="w-3.5 h-3.5 rounded-full bg-[#070709] border-2 border-white/60" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Tonearm Assembly (Pivots onto the record when playing) */}
                          <div
                            className="absolute -top-2 -right-6 w-16 h-40 pointer-events-none origin-top transition-transform duration-700"
                            style={{
                              transform: isPlayerPaused
                                ? 'rotate(4deg)'
                                : 'rotate(24deg)',
                            }}
                          >
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-zinc-300 to-zinc-600 border border-white/40 shadow-lg mx-auto" />
                            <div className="w-1.5 h-28 bg-gradient-to-b from-zinc-300 via-zinc-400 to-zinc-600 mx-auto -mt-1 rounded-full shadow-md" />
                            <div
                              className="w-3.5 h-5 rounded-xs mx-auto -mt-1 shadow"
                              style={{
                                backgroundColor: getPalette(
                                  activeAlbum.jacketTheme
                                ).border,
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Editorial Track Typography in Vinyl Mode */}
                      <div className="relative z-10 mt-4 text-center space-y-1 max-w-md">
                        <div
                          className="text-[10px] font-mono-tech font-bold tracking-widest uppercase"
                          style={{
                            color: getPalette(activeAlbum.jacketTheme).accent,
                          }}
                        >
                          {formatVinylTrackNumber(playingTrackIndex || 0)} •{' '}
                          {activePlayingItem.battle.tournament} (
                          {activePlayingItem.battle.year})
                        </div>
                        <div className="font-jp font-black text-base sm:text-xl text-[#FFFFFF]">
                          {activePlayingItem.battle.mcA} vs{' '}
                          {activePlayingItem.battle.mcB}
                        </div>
                        {activePlayingItem.track.note && (
                          <p className="text-xs font-jp text-[#AEAEB2]">
                            “{activePlayingItem.track.note}”
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* YOUTUBE VIDEO PLAYER (Full 16:9 in VIDEO mode, Picture-in-Picture corner monitor in VINYL mode so audio never stops!) */}
                  <div
                    className={
                      stageMode === 'VIDEO'
                        ? 'aspect-video w-full bg-[#070709]'
                        : 'absolute bottom-2.5 right-2.5 z-20 w-28 sm:w-40 aspect-video rounded-lg overflow-hidden border border-white/30 shadow-2xl bg-[#070709]'
                    }
                  >
                    <YouTubePlayer
                      youtubeId={activePlayingItem.battle.youtubeId}
                      startSeconds={
                        seekOverrideSeconds ??
                        activePlayingItem.track.startSeconds
                      }
                      seekNonce={seekNonce}
                      togglePlayNonce={togglePlayNonce}
                      desiredPaused={desiredPaused}
                      title={activePlayingItem.battle.title}
                      onTimeUpdate={(cur, dur, paused) => {
                        setCurrentSeconds(Math.floor(cur));
                        if (dur > 0) setVideoDuration(Math.floor(dur));
                        setIsPlayerPaused(paused);
                      }}
                      onEnded={handleNextTrack}
                    />
                  </div>
                </div>

                {/* Tactile Hardware Transport Bar below Player */}
                <div className="px-3.5 py-3 bg-[#16161C] border border-[#282832] rounded-xl space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Spinning Mini Record + Track Title & Time */}
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={handleTogglePause}
                        title={isPlayerPaused ? '再生再開' : '一時停止'}
                        className={`w-10 h-10 rounded-full overflow-hidden border border-[#E50914]/60 shrink-0 relative cursor-pointer ${
                          isPlayerPaused ? '' : 'animate-spin'
                        }`}
                        style={{ animationDuration: '5s' }}
                      >
                        <img
                          src={getYouTubeThumbnail(
                            activePlayingItem.battle.youtubeId,
                            'hq'
                          )}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-[#0A0A0A] border border-white/60" />
                        </div>
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-[#E50914] text-[#FFFFFF] font-mono-tech text-[10px] font-extrabold">
                            {formatVinylTrackNumber(playingTrackIndex || 0)} (
                            {String((playingTrackIndex || 0) + 1).padStart(
                              2,
                              '0'
                            )}{' '}
                            / {String(resolvedTracks.length).padStart(2, '0')})
                          </span>
                          <span className="font-jp font-black text-xs sm:text-sm text-[#FFFFFF] truncate">
                            {activePlayingItem.battle.mcA} vs{' '}
                            {activePlayingItem.battle.mcB}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono-tech text-[#8E8E93]">
                          <span>
                            {formatTimestamp(currentSeconds)}
                            {videoDuration > 0
                              ? ` / ${formatTimestamp(videoDuration)}`
                              : ''}
                          </span>
                          <span>•</span>
                          <span className="font-jp truncate">
                            {activePlayingItem.track.note ||
                              activePlayingItem.battle.stageOrEvent}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Transport Controls (PREV / PLAY-PAUSE / NEXT / LOOP / ADD / STOP) */}
                    <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handlePrevTrack}
                        className="px-2.5 py-1.5 rounded-lg bg-[#22222A] hover:bg-[#2C2C36] text-xs font-mono-tech font-bold text-[#FFFFFF] flex items-center gap-1 cursor-pointer"
                      >
                        <SkipBack className="w-3.5 h-3.5" />
                        <span className="hidden xs:inline">PREV</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleTogglePause}
                        aria-label={isPlayerPaused ? '再生再開' : '一時停止'}
                        className="px-3 py-1.5 rounded-lg bg-[#E50914] hover:bg-[#F40612] text-xs font-jp font-black text-[#FFFFFF] flex items-center gap-1 cursor-pointer shadow"
                      >
                        {isPlayerPaused ? (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>再生</span>
                          </>
                        ) : (
                          <>
                            <Pause className="w-3.5 h-3.5 fill-current" />
                            <span>一時停止</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleNextTrack}
                        className="px-3 py-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#E5E5EA] text-xs font-mono-tech font-extrabold text-[#0A0A0A] flex items-center gap-1 cursor-pointer shadow"
                      >
                        <span>NEXT</span>
                        <SkipForward className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsLoopAlbum((v) => !v)}
                        title="アルバム連続ループ再生"
                        className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                          isLoopAlbum
                            ? 'bg-[#E50914]/20 text-[#FF6B6B] border-[#E50914]/50'
                            : 'bg-[#22222A] text-[#8E8E93] border-transparent'
                        }`}
                      >
                        <Repeat className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsCrateDiggerOpen((v) => !v)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#22222A] hover:bg-[#2C2C36] text-[#FFFFFF] text-xs font-jp font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>曲追加</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleStopTurntable}
                        className="p-2 rounded-lg bg-[#262630] text-[#8E8E93] hover:text-[#FFFFFF] cursor-pointer"
                        title="針を上げて停止"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  </div>

                  {/* Interactive Progress Scrub Bar */}
                  {videoDuration > 0 && (
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="text-[10px] font-mono-tech text-[#8E8E93] w-9">
                        {formatTimestamp(currentSeconds)}
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={videoDuration}
                        value={Math.min(currentSeconds, videoDuration)}
                        onChange={(e) =>
                          handleSeekTrack(Number(e.target.value))
                        }
                        aria-label="トラック再生位置シークバー"
                        className="flex-1 h-1.5 bg-[#2A2A34] rounded-lg appearance-none cursor-pointer accent-[#E50914]"
                      />
                      <span className="text-[10px] font-mono-tech text-[#8E8E93] w-9 text-right">
                        {formatTimestamp(videoDuration)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. CRATE DIGGER PANEL (Filter by Tournament & MC to add battles effortlessly) */}
            {isCrateDiggerOpen && (
              <div className="bg-[#0A0A0E] border border-[#343440] rounded-xl p-3.5 sm:p-4 space-y-3 shadow-2xl animate-fadeIn">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Disc3 className="w-4 h-4 text-[#E50914]" />
                    <span className="font-jp font-black text-xs sm:text-sm text-[#FFFFFF]">
                      CRATE DIGGER // バトルをディグって「{activeAlbum.title}」へ収録
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCrateDiggerOpen(false)}
                    className="px-2.5 py-1 rounded-md bg-[#22222A] text-xs font-jp font-bold text-[#FFFFFF] cursor-pointer"
                  >
                    完了
                  </button>
                </div>

                {/* Search + Tournament Pills */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 bg-[#14141A] border border-[#2C2C36] rounded-lg px-3 py-2">
                    <Search className="w-4 h-4 text-[#8E8E93] shrink-0" />
                    <input
                      type="text"
                      value={crateSearchQuery}
                      onChange={(e) => setCrateSearchQuery(e.target.value)}
                      placeholder="MC名（例: 呂布, R-指定, FORK）や大会名で検索..."
                      className="flex-1 bg-transparent text-xs font-jp text-[#FFFFFF] outline-none"
                    />
                    {crateSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setCrateSearchQuery('')}
                        className="text-[#8E8E93] hover:text-[#FFFFFF] cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Tournament Filter Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                    {TOURNAMENTS.map((t) => {
                      const active = crateTournament === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setCrateTournament(t)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-jp font-bold shrink-0 cursor-pointer border transition-colors ${
                            active
                              ? 'bg-[#FFFFFF] text-[#0A0A0A] border-[#FFFFFF]'
                              : 'bg-[#14141A] text-[#8E8E93] border-[#26262E] hover:text-[#FFFFFF]'
                          }`}
                        >
                          {t === 'ALL' ? 'すべて' : t}
                        </button>
                      );
                    })}
                  </div>

                  {/* Optional Default Start Time & Liner Note for Crate Additions */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                    <div className="flex items-center gap-1.5 bg-[#14141A] border border-[#26262E] rounded-lg px-2.5 py-1">
                      <Clock className="w-3.5 h-3.5 text-[#8E8E93]" />
                      <span className="text-[10px] font-jp text-[#8E8E93]">
                        開始秒数:
                      </span>
                      <input
                        type="text"
                        value={crateStartStr}
                        onChange={(e) => setCrateStartStr(e.target.value)}
                        className="w-14 bg-transparent text-xs font-mono-tech font-bold text-[#FFFFFF] text-center outline-none"
                        placeholder="00:00"
                      />
                    </div>
                    <input
                      type="text"
                      value={crateNoteInput}
                      onChange={(e) => setCrateNoteInput(e.target.value)}
                      placeholder="収録時の一言ライナーノーツ（空欄なら対戦カード名を自動セット）"
                      className="flex-1 bg-[#14141A] border border-[#26262E] rounded-lg px-2.5 py-1 text-xs font-jp text-[#FFFFFF] outline-none"
                    />
                  </div>
                </div>

                {/* Crate Results Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                  {crateSearchBattles.map((b) => {
                    const existingTrack = activeAlbum.tracks.find(
                      (t) => t.battleId === b.id
                    );
                    return (
                      <div
                        key={b.id}
                        className={`flex items-center justify-between gap-2 rounded-lg p-2 border transition-colors ${
                          existingTrack
                            ? 'bg-[#1C1C24] border-[#FFFFFF]/40'
                            : 'bg-[#14141A] border-[#22222A] hover:border-[#3A3A46]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={getYouTubeThumbnail(b.youtubeId, 'hq')}
                            alt=""
                            className="w-14 h-9 object-cover rounded shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-jp font-black text-xs text-[#FFFFFF] truncate">
                              {b.mcA} vs {b.mcB}
                            </div>
                            <div className="text-[10px] font-jp text-[#8E8E93] truncate">
                              {b.tournament} • {b.stageOrEvent}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (existingTrack) {
                              onRemoveTrackFromAlbum(
                                activeAlbum.id,
                                existingTrack.id
                              );
                            } else {
                              onAddTrackToAlbum(
                                activeAlbum.id,
                                b.id,
                                parseTimestampInput(crateStartStr),
                                crateNoteInput.trim() ||
                                  `${b.mcA} vs ${b.mcB} (${b.tournament})`
                              );
                            }
                          }}
                          className={`px-2.5 py-1.5 rounded-md font-jp text-[11px] font-black shrink-0 cursor-pointer transition-colors ${
                            existingTrack
                              ? 'bg-[#262630] text-emerald-400 border border-emerald-500/40'
                              : 'bg-[#FFFFFF] hover:bg-[#E5E5EA] text-[#0A0A0A]'
                          }`}
                        >
                          {existingTrack ? '✓ 収録済' : '＋ 収録'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 4. VINYL SLEEVE TRACKLIST (SIDE A / SIDE B QUEUE) */}
          <div className="relative z-10 border-t border-[#22222A] bg-[#0D0D11]">
            <div className="px-4 py-2.5 bg-[#121218] border-b border-[#1E1E26] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono-tech text-[10px] font-extrabold tracking-widest text-[#8E8E93] uppercase">
                  TRACKLIST // SIDE A &amp; SIDE B ({resolvedTracks.length}{' '}
                  TRACKS)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsCrateDiggerOpen((v) => !v)}
                className="text-[11px] font-jp font-bold text-[#E50914] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>曲を追加する</span>
              </button>
            </div>

            {resolvedTracks.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <Disc3 className="w-8 h-8 text-[#48484A] mx-auto" />
                <p className="text-xs font-jp text-[#8E8E93]">
                  このレコードにはまだバトルが収録されていません。
                </p>
                <button
                  type="button"
                  onClick={() => setIsCrateDiggerOpen(true)}
                  className="px-4 py-2 rounded-full bg-[#FFFFFF] text-[#0A0A0A] font-jp text-xs font-black cursor-pointer"
                >
                  ＋ バトルをディグって収録する
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#1A1A22]">
                {resolvedTracks.map(({ track, battle }, idx) => {
                  const isPlayingTrack = playingTrackIndex === idx;
                  const isEditingThisTrack = editingTrackId === track.id;
                  const vinylTrackCode = formatVinylTrackNumber(idx);

                  return (
                    <div
                      key={track.id}
                      className={`p-3 sm:px-4 transition-colors ${
                        isPlayingTrack
                          ? 'bg-gradient-to-r from-[#E50914]/15 via-[#1C1C24] to-[#14141A]'
                          : 'hover:bg-[#15151C]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleStartTrack(idx)}
                          className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer group"
                        >
                          {/* Vinyl Side Code (A1, A2, B1...) */}
                          <div className="w-7 shrink-0 text-center">
                            {isPlayingTrack ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#E50914] text-white font-mono-tech text-[10px] font-black shadow">
                                ▶
                              </span>
                            ) : (
                              <span className="font-mono-tech text-xs font-extrabold text-[#6C6C74] group-hover:text-[#FFFFFF]">
                                {vinylTrackCode}
                              </span>
                            )}
                          </div>

                          {/* Thumbnail */}
                          <div className="relative w-20 h-12 rounded-md overflow-hidden bg-[#0A0A0A] border border-[#2C2C34] shrink-0 shadow">
                            <img
                              src={getYouTubeThumbnail(battle.youtubeId, 'hq')}
                              alt={battle.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            {track.startSeconds > 0 && (
                              <span className="absolute bottom-0.5 right-0.5 px-1 rounded-[2px] bg-[#E50914] text-[9px] font-mono-tech font-bold text-[#FFFFFF]">
                                {formatTimestamp(track.startSeconds)}〜
                              </span>
                            )}
                          </div>

                          {/* Matchup & Liner Note */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`font-jp font-black text-xs sm:text-sm truncate ${
                                  isPlayingTrack
                                    ? 'text-[#FFFFFF]'
                                    : 'text-[#F2F2F7]'
                                }`}
                              >
                                {battle.mcA} vs {battle.mcB}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-[#1E1E26] border border-[#2C2C36] text-[9px] font-mono-tech font-bold text-[#AEAEB2] shrink-0">
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

                        {/* Track Actions: Edit Time/Note, Up, Down, Remove */}
                        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                          {onUpdateTrackInAlbum && (
                            <button
                              type="button"
                              onClick={() => {
                                if (isEditingThisTrack) {
                                  setEditingTrackId(null);
                                } else {
                                  setEditingTrackId(track.id);
                                  setEditTrackTimeStr(
                                    formatTimestamp(track.startSeconds || 0)
                                  );
                                  setEditTrackNote(track.note || '');
                                }
                              }}
                              className={`p-1.5 rounded cursor-pointer ${
                                isEditingThisTrack
                                  ? 'bg-[#FFFFFF] text-[#0A0A0A]'
                                  : 'text-[#8E8E93] hover:text-[#FFFFFF]'
                              }`}
                              title="開始秒数・ライナーノーツを編集"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              handleMoveTrackSafe(activeAlbum.id, idx, 'UP')
                            }
                            disabled={idx === 0}
                            className="p-1.5 rounded text-[#8E8E93] hover:text-[#FFFFFF] disabled:opacity-25 cursor-pointer"
                            title="曲順を上げる"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleMoveTrackSafe(activeAlbum.id, idx, 'DOWN')
                            }
                            disabled={idx === resolvedTracks.length - 1}
                            className="p-1.5 rounded text-[#8E8E93] hover:text-[#FFFFFF] disabled:opacity-25 cursor-pointer"
                            title="曲順を下げる"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveTrackSafe(
                                activeAlbum.id,
                                track.id,
                                idx
                              )
                            }
                            className="p-1.5 rounded text-[#8E8E93] hover:text-[#FF4D4D] cursor-pointer"
                            title="アルバムから外す"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Inline Track Start-Time & Liner Note Editor */}
                      {isEditingThisTrack && onUpdateTrackInAlbum && (
                        <div className="mt-2.5 pt-2.5 border-t border-[#262630] flex flex-col sm:flex-row items-stretch sm:items-center gap-2 animate-fadeIn">
                          <div className="flex items-center gap-1.5 bg-[#0A0A0E] border border-[#2C2C36] rounded px-2.5 py-1">
                            <Clock className="w-3 h-3 text-[#E50914]" />
                            <span className="text-[10px] font-jp text-[#8E8E93]">
                              開始位置:
                            </span>
                            <input
                              type="text"
                              value={editTrackTimeStr}
                              onChange={(e) =>
                                setEditTrackTimeStr(e.target.value)
                              }
                              className="w-14 bg-transparent text-xs font-mono-tech font-bold text-[#FFFFFF] text-center outline-none"
                              placeholder="00:00"
                            />
                          </div>
                          <input
                            type="text"
                            value={editTrackNote}
                            onChange={(e) => setEditTrackNote(e.target.value)}
                            placeholder="ライナーノーツ・一言メモ..."
                            className="flex-1 bg-[#0A0A0E] border border-[#2C2C36] rounded px-2.5 py-1 text-xs font-jp text-[#FFFFFF] outline-none"
                          />
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingTrackId(null)}
                              className="px-2.5 py-1 rounded bg-[#22222A] text-[11px] font-jp text-[#8E8E93] cursor-pointer"
                            >
                              閉じる
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onUpdateTrackInAlbum(
                                  activeAlbum.id,
                                  track.id,
                                  parseTimestampInput(editTrackTimeStr),
                                  editTrackNote.trim()
                                );
                                setEditingTrackId(null);
                              }}
                              className="px-3 py-1 rounded bg-[#FFFFFF] text-[#0A0A0A] text-[11px] font-jp font-black cursor-pointer"
                            >
                              保存
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. COMMUNITY CRATES (Discover Public Vinyl Albums Created by Other Users) */}
      {communityAlbums.length > 0 && (
        <section className="space-y-2.5 pt-2 border-t border-[#1F1F26]">
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-2">
              <Disc3 className="w-4 h-4 text-[#E50914]" />
              <h3 className="font-jp text-xs sm:text-sm font-black text-[#FFFFFF]">
                みんなの公開レコード盤 // COMMUNITY CRATES
              </h3>
              <span className="text-[11px] font-mono-tech text-[#8E8E93]">
                ({communityAlbums.length})
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {communityAlbums.slice(0, 8).map((cAlb) => {
              const alreadyInShelf = albums.some((a) => a.id === cAlb.id);
              const coverBattles = cAlb.tracks
                .map((t) => battleMap.get(t.battleId))
                .filter((b): b is Battle => Boolean(b))
                .slice(0, 4);
              const cleanTag = (cAlb.themeTag || 'BEST BOUTS').split('::')[0];

              return (
                <div
                  key={cAlb.id}
                  className="bg-[#121216] border border-[#24242E] rounded-xl p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <AlbumJacket
                      title={cAlb.title}
                      themeTag={cleanTag}
                      trackCount={cAlb.tracks.length}
                      coverBattles={coverBattles}
                      jacketStyle={cAlb.jacketStyle || 'VINYL_LP'}
                      jacketTheme={cAlb.jacketTheme || 'CRIMSON'}
                      size="sm"
                      showVinylPeek={false}
                    />
                    <div className="min-w-0">
                      <div className="text-[9px] font-mono-tech text-[#E50914] font-bold uppercase truncate">
                        {cleanTag} • {cAlb.tracks.length} TRACKS
                      </div>
                      <div className="font-jp font-black text-xs text-[#FFFFFF] truncate">
                        {cAlb.title}
                      </div>
                      <p className="text-[10px] font-jp text-[#8E8E93] truncate">
                        {cAlb.description}
                      </p>
                    </div>
                  </div>

                  {onImportCommunityAlbum && (
                    <button
                      type="button"
                      onClick={() => {
                        onImportCommunityAlbum(cAlb);
                        setSelectedAlbumId(cAlb.id);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-jp font-black shrink-0 cursor-pointer transition-colors ${
                        alreadyInShelf
                          ? 'bg-[#22222A] text-[#FFFFFF] border border-[#3A3A44]'
                          : 'bg-[#FFFFFF] hover:bg-[#E5E5EA] text-[#0A0A0A]'
                      }`}
                    >
                      {alreadyInShelf ? 'ターンテーブルで開く' : '＋ 棚に追加して聴く'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
