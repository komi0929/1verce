import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  Bookmark,
  Search,
  X,
  RotateCcw,
  Disc3,
  Flame,
  HelpCircle,
  SkipBack,
  SkipForward,
  Square,
  Play,
  Pause,
} from 'lucide-react';
import {
  Album,
  AlbumJacketStyle,
  AlbumJacketTheme,
  Battle,
  TournamentTag,
  ViewMode,
} from './types';
import { INITIAL_BATTLES } from './data/initialData';
import { isClipVideo, isCountableMatch } from './lib/battleFormat';
import {
  isSameMc,
  formatTimestamp,
  matchesMcQuery,
  getYouTubeThumbnail,
} from './utils/youtube';
import {
  DB_STORAGE_KEYS,
  DEFAULT_ALBUMS,
  fetchCloudState,
  getOrCreateDeviceId,
  getSupabaseConfig,
  mergeAlbumsWithCloud,
  removeAlbumFromCloud,
  upsertAlbumToCloud,
  upsertBattleToCloud,
} from './lib/database';
import { VsBuilder } from './components/VsBuilder';
import { BattleCard } from './components/BattleCard';
import { AlbumView, ActiveAlbumPlaybackInfo } from './components/AlbumView';
import { AlbumPickerModal } from './components/AlbumPickerModal';
import { ShareModal } from './components/ShareModal';
import { SubmitModal } from './components/SubmitModal';
import { OnboardingBanner } from './components/OnboardingBanner';

export const App: React.FC = () => {
  // 1. Persistent Battles State
  const [battles, setBattles] = useState<Battle[]>(() => {
    try {
      const raw = localStorage.getItem(DB_STORAGE_KEYS.BATTLES);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length >= INITIAL_BATTLES.length) {
          return parsed;
        }
      }
    } catch {
      // Fallback to preset
    }
    return INITIAL_BATTLES;
  });

  // 2. Persistent Personal Albums State (with migration from v1)
  const [albums, setAlbums] = useState<Album[]>(() => {
    try {
      const raw =
        localStorage.getItem(DB_STORAGE_KEYS.ALBUMS) ||
        localStorage.getItem('1verce_albums_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return mergeAlbumsWithCloud(parsed, DEFAULT_ALBUMS);
        }
      }
    } catch {
      // Fallback
    }
    return DEFAULT_ALBUMS;
  });

  // Community Crates (Public albums created by other users)
  const [communityAlbums, setCommunityAlbums] = useState<Album[]>([]);
  const [sharedAlbumId, setSharedAlbumId] = useState<string | null>(null);

  // 3. Saved Battles
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(DB_STORAGE_KEYS.SAVED);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // 4. Filter & View States
  const [selectedMcA, setSelectedMcA] = useState<string | null>(null);
  const [selectedMcB, setSelectedMcB] = useState<string | null>(null);
  const [selectedTournament, setSelectedTournament] =
    useState<TournamentTag>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('LATEST');
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  // フル試合のみ（デフォルト） / ショート・切り抜き
  const [videoMode, setVideoMode] = useState<'MATCH' | 'CLIPS'>('MATCH');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [displayLimit, setDisplayLimit] = useState<number>(20);

  // 5. Singleton Player State & Background Vinyl Turntable State
  const [activeBattleId, setActiveBattleId] = useState<string | null>(null);
  const [seekSeconds, setSeekSeconds] = useState<number>(0);
  const [seekNonce, setSeekNonce] = useState<number>(0);
  const [activeAlbumPlayback, setActiveAlbumPlayback] =
    useState<ActiveAlbumPlaybackInfo | null>(null);
  const [deepLinkBanner, setDeepLinkBanner] = useState<{
    battleId: string;
    seconds: number;
  } | null>(null);

  // 6. Modals State
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<{
    battle: Battle;
    seconds?: number;
  } | null>(null);
  const [albumPickerTarget, setAlbumPickerTarget] = useState<{
    battle: Battle;
    startSeconds?: number;
    note?: string;
  } | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('1verce_onboarding_open_v1');
      return raw === '1';
    } catch {
      return false;
    }
  });

  const handleToggleOnboarding = useCallback((open: boolean) => {
    setIsOnboardingOpen(open);
    try {
      localStorage.setItem('1verce_onboarding_open_v1', open ? '1' : '0');
    } catch {}
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(DB_STORAGE_KEYS.BATTLES, JSON.stringify(battles));
    } catch {}
  }, [battles]);

  useEffect(() => {
    try {
      localStorage.setItem(DB_STORAGE_KEYS.ALBUMS, JSON.stringify(albums));
    } catch {}
  }, [albums]);

  useEffect(() => {
    try {
      localStorage.setItem(DB_STORAGE_KEYS.SAVED, JSON.stringify(savedIds));
    } catch {}
  }, [savedIds]);

  // Mount: Deep Link (?battle= & ?album=) + Automatic Background Cloud Sync
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const battleParam = params.get('battle');
    const timeParam = params.get('t');
    const albumParam = params.get('album');

    if (albumParam) {
      setSharedAlbumId(albumParam);
      setViewMode('ALBUMS');
    } else if (battleParam) {
      const targetSec = timeParam ? Math.max(0, parseInt(timeParam, 10) || 0) : 0;
      const found = battles.find((b) => b.id === battleParam);
      if (found) {
        setVideoMode(isClipVideo(found) ? 'CLIPS' : 'MATCH');
        setActiveBattleId(found.id);
        setSeekSeconds(targetSec);
        setSeekNonce(Date.now());
        setDeepLinkBanner({ battleId: found.id, seconds: targetSec });
      }
    }

    if (getSupabaseConfig()) {
      fetchCloudState(battles).then((cloud) => {
        if (!cloud) return;
        setBattles(cloud.mergedBattles);
        if (cloud.cloudAlbums && cloud.cloudAlbums.length > 0) {
          setAlbums((local) =>
            mergeAlbumsWithCloud(local, cloud.cloudAlbums, albumParam)
          );
        }
        if (cloud.communityAlbums) {
          setCommunityAlbums(cloud.communityAlbums);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const albumCountByBattleId = useMemo(() => {
    const map = new Map<string, number>();
    for (const alb of albums) {
      for (const t of alb.tracks) {
        map.set(t.battleId, (map.get(t.battleId) || 0) + 1);
      }
    }
    return map;
  }, [albums]);

  // Handlers
  const handleSelectMcA = useCallback(
    (mc: string | null) => {
      setSelectedMcA(mc);
      setSelectedMcB(null);
      setDisplayLimit(20);
      if (viewMode === 'ALBUMS') {
        setViewMode('LATEST');
      }
      if (mc && selectedTournament !== 'ALL') {
        const inCurrentTournament = battles.some(
          (b) =>
            b.tournament === selectedTournament &&
            (isSameMc(b.mcA, mc) || isSameMc(b.mcB, mc))
        );
        if (!inCurrentTournament) {
          setSelectedTournament('ALL');
        }
      }
    },
    [battles, selectedTournament, viewMode]
  );

  const handleSelectMcB = useCallback((mc: string | null) => {
    setSelectedMcB(mc);
    setDisplayLimit(20);
  }, []);

  const handleSelectMatchup = useCallback((mcA: string, mcB: string) => {
    setSelectedMcA(mcA);
    setSelectedMcB(mcB);
    setDisplayLimit(20);
  }, []);

  const handleSelectTournament = useCallback(
    (t: TournamentTag) => {
      setSelectedTournament(t);
      setDisplayLimit(20);
      if (viewMode === 'ALBUMS') {
        setViewMode('LATEST');
      }
      if (t !== 'ALL' && selectedMcA) {
        const tournamentBattles = battles.filter(
          (b) =>
            b.tournament === t &&
            (videoMode === 'MATCH' ? isCountableMatch(b) : isClipVideo(b))
        );
        const hasMcA = tournamentBattles.some(
          (b) => isSameMc(b.mcA, selectedMcA) || isSameMc(b.mcB, selectedMcA)
        );
        if (!hasMcA) {
          setSelectedMcA(null);
          setSelectedMcB(null);
        } else if (selectedMcB) {
          const hasPair = tournamentBattles.some(
            (b) =>
              (isSameMc(b.mcA, selectedMcA) && isSameMc(b.mcB, selectedMcB)) ||
              (isSameMc(b.mcA, selectedMcB) && isSameMc(b.mcB, selectedMcA))
          );
          if (!hasPair) {
            setSelectedMcB(null);
          }
        }
      }
    },
    [battles, selectedMcA, selectedMcB, viewMode, videoMode]
  );

  const handleResetFilters = useCallback(() => {
    setSelectedMcA(null);
    setSelectedMcB(null);
    setSelectedTournament('ALL');
    setSearchQuery('');
    setShowSavedOnly(false);
    setDeepLinkBanner(null);
    setDisplayLimit(20);
    if (viewMode === 'ALBUMS') {
      setViewMode('LATEST');
    }
  }, [viewMode]);

  const handleStartPlay = useCallback(
    (battleId: string, seconds: number = 0) => {
      // Stop any background vinyl album playback so two audio streams never play simultaneously
      activeAlbumPlayback?.onStop();
      setActiveBattleId(battleId);
      setSeekSeconds(seconds);
      setSeekNonce(Date.now());

      setBattles((prev) =>
        prev.map((b) => {
          if (b.id !== battleId) return b;
          const updated: Battle = {
            ...b,
            outboundPlays: b.outboundPlays + 1,
          };
          upsertBattleToCloud(updated);
          return updated;
        })
      );
    },
    [activeAlbumPlayback]
  );

  const handleStopPlay = useCallback((battleId: string) => {
    setActiveBattleId((prev) => (prev === battleId ? null : prev));
  }, []);

  const handleVideoEnded = useCallback((battleId: string) => {
    setActiveBattleId((prev) => (prev === battleId ? null : prev));
  }, []);

  const handleToggleSave = useCallback((battleId: string) => {
    setSavedIds((prev) =>
      prev.includes(battleId)
        ? prev.filter((id) => id !== battleId)
        : [...prev, battleId]
    );
  }, []);

  // Album Handlers
  const handleCreateAlbum = useCallback(
    (
      title: string,
      description: string,
      themeTag: string,
      jacketStyle: AlbumJacketStyle = 'MOSAIC_4',
      jacketTheme: AlbumJacketTheme = 'CRIMSON'
    ): string => {
      const newId = `alb-${Date.now()}`;
      const nowIso = new Date().toISOString();
      const newAlbum: Album = {
        id: newId,
        title,
        description,
        themeTag,
        jacketStyle,
        jacketTheme,
        ownerDeviceId: getOrCreateDeviceId(),
        tracks: [],
        likes: 1,
        playCount: 0,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      setAlbums((prev) => [newAlbum, ...prev]);
      upsertAlbumToCloud(newAlbum);
      return newId;
    },
    []
  );

  const handleImportCommunityAlbum = useCallback((communityAlbum: Album) => {
    setAlbums((prev) => {
      if (prev.some((a) => a.id === communityAlbum.id)) return prev;
      return [communityAlbum, ...prev];
    });
  }, []);

  const handleCreateAlbumWithTrack = useCallback(
    (
      title: string,
      description: string,
      themeTag: string,
      battleId: string,
      startSeconds: number,
      note: string
    ) => {
      const newId = `alb-${Date.now()}`;
      const nowIso = new Date().toISOString();
      const newAlbum: Album = {
        id: newId,
        title,
        description,
        themeTag,
        jacketStyle: 'MOSAIC_4',
        jacketTheme: 'CRIMSON',
        ownerDeviceId: getOrCreateDeviceId(),
        tracks: [
          {
            id: `trk-${Date.now()}`,
            battleId,
            startSeconds,
            note,
            addedAt: nowIso,
          },
        ],
        likes: 1,
        playCount: 0,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      setAlbums((prev) => [newAlbum, ...prev]);
      setSharedAlbumId(newId);
      upsertAlbumToCloud(newAlbum);
    },
    []
  );

  const handleUpdateAlbumMeta = useCallback(
    (
      albumId: string,
      title: string,
      description: string,
      themeTag: string,
      jacketStyle?: AlbumJacketStyle,
      jacketTheme?: AlbumJacketTheme
    ) => {
      setAlbums((prev) =>
        prev.map((a) => {
          if (a.id !== albumId) return a;
          const updated: Album = {
            ...a,
            title,
            description,
            themeTag,
            jacketStyle: jacketStyle || a.jacketStyle || 'MOSAIC_4',
            jacketTheme: jacketTheme || a.jacketTheme || 'CRIMSON',
            updatedAt: new Date().toISOString(),
          };
          upsertAlbumToCloud(updated);
          return updated;
        })
      );
    },
    []
  );

  const handleDeleteAlbum = useCallback((albumId: string) => {
    setAlbums((prev) => {
      const target = prev.find((a) => a.id === albumId);
      removeAlbumFromCloud(albumId, target?.ownerDeviceId);
      return prev.filter((a) => a.id !== albumId);
    });
  }, []);

  const handleAddTrackToAlbum = useCallback(
    (
      albumId: string,
      battleId: string,
      startSeconds: number,
      note: string
    ) => {
      const nowIso = new Date().toISOString();
      setAlbums((prev) =>
        prev.map((a) => {
          if (a.id !== albumId) return a;
          const updated: Album = {
            ...a,
            updatedAt: nowIso,
            tracks: [
              ...a.tracks,
              {
                id: `trk-${Date.now()}-${Math.random()
                  .toString(36)
                  .slice(2, 5)}`,
                battleId,
                startSeconds,
                note,
                addedAt: nowIso,
              },
            ],
          };
          upsertAlbumToCloud(updated);
          return updated;
        })
      );
    },
    []
  );

  const handleRemoveTrackFromAlbumByBattle = useCallback(
    (albumId: string, battleId: string) => {
      setAlbums((prev) =>
        prev.map((a) => {
          if (a.id !== albumId) return a;
          const updated: Album = {
            ...a,
            updatedAt: new Date().toISOString(),
            tracks: a.tracks.filter((t) => t.battleId !== battleId),
          };
          upsertAlbumToCloud(updated);
          return updated;
        })
      );
    },
    []
  );

  const handleRemoveTrackFromAlbumById = useCallback(
    (albumId: string, trackId: string) => {
      setAlbums((prev) =>
        prev.map((a) => {
          if (a.id !== albumId) return a;
          const updated: Album = {
            ...a,
            updatedAt: new Date().toISOString(),
            tracks: a.tracks.filter((t) => t.id !== trackId),
          };
          upsertAlbumToCloud(updated);
          return updated;
        })
      );
    },
    []
  );

  const handleMoveTrack = useCallback(
    (albumId: string, trackIndex: number, direction: 'UP' | 'DOWN') => {
      setAlbums((prev) =>
        prev.map((a) => {
          if (a.id !== albumId) return a;
          const targetIdx =
            direction === 'UP' ? trackIndex - 1 : trackIndex + 1;
          if (targetIdx < 0 || targetIdx >= a.tracks.length) return a;
          const nextTracks = [...a.tracks];
          const [moved] = nextTracks.splice(trackIndex, 1);
          nextTracks.splice(targetIdx, 0, moved);
          const updated: Album = {
            ...a,
            updatedAt: new Date().toISOString(),
            tracks: nextTracks,
          };
          upsertAlbumToCloud(updated);
          return updated;
        })
      );
    },
    []
  );

  const handleUpdateTrackInAlbum = useCallback(
    (
      albumId: string,
      trackId: string,
      startSeconds: number,
      note: string
    ) => {
      setAlbums((prev) =>
        prev.map((a) => {
          if (a.id !== albumId) return a;
          const updated: Album = {
            ...a,
            updatedAt: new Date().toISOString(),
            tracks: a.tracks.map((t) =>
              t.id === trackId ? { ...t, startSeconds, note } : t
            ),
          };
          upsertAlbumToCloud(updated);
          return updated;
        })
      );
    },
    []
  );

  const handleRecordAlbumPlay = useCallback(
    (albumId: string, battleId: string) => {
      setAlbums((prev) =>
        prev.map((a) => {
          if (a.id !== albumId) return a;
          const updated = { ...a, playCount: a.playCount + 1 };
          upsertAlbumToCloud(updated);
          return updated;
        })
      );
      setBattles((prev) =>
        prev.map((b) =>
          b.id === battleId
            ? { ...b, outboundPlays: b.outboundPlays + 1 }
            : b
        )
      );
    },
    []
  );

  const handleAddBattle = useCallback(
    (newBattle: Battle, targetAlbumIds: string[]) => {
      setBattles((prev) => [newBattle, ...prev]);
      upsertBattleToCloud(newBattle);

      if (targetAlbumIds.length > 0) {
        for (const albId of targetAlbumIds) {
          handleAddTrackToAlbum(
            albId,
            newBattle.id,
            0,
            `${newBattle.mcA} vs ${newBattle.mcB} (${newBattle.tournament})`
          );
        }
      }

      setSelectedMcA(null);
      setSelectedMcB(null);
      setSelectedTournament('ALL');
      setSearchQuery('');
      setShowSavedOnly(false);
      setViewMode('LATEST');
      setVideoMode(isClipVideo(newBattle) ? 'CLIPS' : 'MATCH');
      activeAlbumPlayback?.onStop();
      setActiveBattleId(newBattle.id);
      setSeekSeconds(0);
      setSeekNonce(Date.now());
    },
    [handleAddTrackToAlbum, activeAlbumPlayback]
  );

  const handleRecordShare = useCallback((battleId: string) => {
    setBattles((prev) =>
      prev.map((b) => {
        if (b.id !== battleId) return b;
        const updated = { ...b, shares: b.shares + 1 };
        upsertBattleToCloud(updated);
        return updated;
      })
    );
  }, []);

  const handleJumpToBattle = useCallback(
    (battleId: string, seconds: number = 0) => {
      setSelectedMcA(null);
      setSelectedMcB(null);
      setSelectedTournament('ALL');
      setSearchQuery('');
      setShowSavedOnly(false);
      setViewMode('LATEST');
      const target = battles.find((b) => b.id === battleId);
      if (target) setVideoMode(isClipVideo(target) ? 'CLIPS' : 'MATCH');
      setDeepLinkBanner({ battleId, seconds });
      handleStartPlay(battleId, seconds);
      setTimeout(() => {
        const el = document.getElementById(`battle-${battleId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 80);
    },
    [handleStartPlay, battles]
  );

  // Video-format scope: フル試合（重複アップロード除外）のみ / ショート・切り抜きのみ
  const scopedBattles = useMemo(
    () =>
      battles.filter((b) =>
        videoMode === 'MATCH' ? isCountableMatch(b) : isClipVideo(b)
      ),
    [battles, videoMode]
  );

  const formatCounts = useMemo(() => {
    let matches = 0;
    let clips = 0;
    for (const b of battles) {
      if (isCountableMatch(b)) matches += 1;
      else if (isClipVideo(b)) clips += 1;
    }
    return { matches, clips };
  }, [battles]);

  const handleChangeVideoMode = useCallback(
    (mode: 'MATCH' | 'CLIPS') => {
      if (mode === videoMode) return;
      setVideoMode(mode);
      setDisplayLimit(20);
      setDeepLinkBanner(null);
      if (selectedMcA) {
        const inScope = (b: Battle) =>
          mode === 'MATCH' ? isCountableMatch(b) : isClipVideo(b);
        const hasMcA = battles.some(
          (b) =>
            inScope(b) &&
            (isSameMc(b.mcA, selectedMcA) || isSameMc(b.mcB, selectedMcA))
        );
        if (!hasMcA) {
          setSelectedMcA(null);
          setSelectedMcB(null);
        } else if (selectedMcB) {
          const hasPair = battles.some(
            (b) =>
              inScope(b) &&
              ((isSameMc(b.mcA, selectedMcA) && isSameMc(b.mcB, selectedMcB)) ||
                (isSameMc(b.mcA, selectedMcB) && isSameMc(b.mcB, selectedMcA)))
          );
          if (!hasPair) setSelectedMcB(null);
        }
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [videoMode, selectedMcA, selectedMcB, battles]
  );

  // Bidirectional VS Filtering + Tournament + Incremental Search + Sort
  const filteredBattles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    // 保存済みは形式に関わらず全て表示。直リンク対象は現在のモードに関わらず必ず表示。
    const source = showSavedOnly
      ? battles
      : deepLinkBanner &&
          !scopedBattles.some((b) => b.id === deepLinkBanner.battleId)
        ? [
            ...scopedBattles,
            ...battles.filter((b) => b.id === deepLinkBanner.battleId),
          ]
        : scopedBattles;

    const list = source.filter((b) => {
      if (showSavedOnly && !savedIds.includes(b.id)) {
        return false;
      }

      if (selectedTournament !== 'ALL' && b.tournament !== selectedTournament) {
        return false;
      }

      if (selectedMcA) {
        const matchesA =
          isSameMc(b.mcA, selectedMcA) || isSameMc(b.mcB, selectedMcA);
        if (!matchesA) return false;
      }

      if (selectedMcA && selectedMcB) {
        const isPair =
          (isSameMc(b.mcA, selectedMcA) && isSameMc(b.mcB, selectedMcB)) ||
          (isSameMc(b.mcA, selectedMcB) && isSameMc(b.mcB, selectedMcA));
        if (!isPair) return false;
      }

      if (q) {
        const inMc =
          matchesMcQuery(b.mcA, q) || matchesMcQuery(b.mcB, q);
        const inTournament =
          b.tournament.toLowerCase().includes(q) ||
          b.stageOrEvent.toLowerCase().includes(q) ||
          b.title.toLowerCase().includes(q);
        if (!inMc && !inTournament) return false;
      }

      return true;
    });

    return [...list].sort((a, b) => {
      if (deepLinkBanner) {
        if (a.id === deepLinkBanner.battleId) return -1;
        if (b.id === deepLinkBanner.battleId) return 1;
      }

      if (viewMode === 'HALL_OF_FAME') {
        const albCountA = albumCountByBattleId.get(a.id) || 0;
        const albCountB = albumCountByBattleId.get(b.id) || 0;
        const evalA = a.evaluation
          ? a.evaluation.word + a.evaluation.flow + a.evaluation.vibe
          : 0;
        const evalB = b.evaluation
          ? b.evaluation.word + b.evaluation.flow + b.evaluation.vibe
          : 0;
        const scoreA =
          a.outboundPlays * 3 + a.shares * 5 + albCountA * 10 + evalA;
        const scoreB =
          b.outboundPlays * 3 + b.shares * 5 + albCountB * 10 + evalB;
        return scoreB - scoreA;
      }

      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
  }, [
    battles,
    scopedBattles,
    showSavedOnly,
    savedIds,
    selectedTournament,
    selectedMcA,
    selectedMcB,
    searchQuery,
    viewMode,
    deepLinkBanner,
    albumCountByBattleId,
  ]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FFFFFF] flex flex-col">
      {/* 1. Top Header (Clean Mobile-first & Desktop) */}
      <header className="h-13 sm:h-14 border-b border-[#1F1F1F] bg-[#0A0A0A]/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-3xl mx-auto h-full px-3 sm:px-4 flex items-center justify-between gap-2">
          {/* Left: 1verce Typography Logo */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-baseline gap-1.5 text-left cursor-pointer group"
            >
              <span className="font-display text-xl sm:text-2xl font-bold tracking-tighter text-[#FFFFFF] group-hover:opacity-80 transition-opacity">
                1verce
              </span>
              <span className="text-[10px] font-mono-tech text-[#8E8E93] tracking-widest uppercase">
                ARCHIVE
              </span>
            </button>
          </div>

          {/* Right: Essential Desktop Actions & Quick Mobile Icons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Search Trigger */}
            <button
              type="button"
              onClick={() => {
                if (viewMode === 'ALBUMS') setViewMode('LATEST');
                setIsSearchOpen((v) => !v);
              }}
              aria-label="キーワード検索を開く"
              title="MC名・大会名で検索"
              className={`p-2 sm:p-1.5 rounded border transition-colors cursor-pointer ${
                isSearchOpen || searchQuery
                  ? 'bg-[#FFFFFF] text-[#0A0A0A] border-[#FFFFFF]'
                  : 'bg-[#121212] text-[#8E8E93] border-[#262628] hover:text-[#FFFFFF]'
              }`}
            >
              <Search className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            </button>

            {/* Desktop Only Primary Actions (On mobile, accessible via Bottom Nav) */}
            <button
              type="button"
              onClick={() => setIsSubmitOpen(true)}
              aria-label="お気に入りのYouTubeバトルを登録"
              className="hidden sm:flex px-3 py-1.5 rounded bg-[#FFFFFF] hover:bg-[#E5E5EA] text-[#0A0A0A] font-jp text-xs font-black tracking-tight items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>バトル登録</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setViewMode((prev) => (prev === 'ALBUMS' ? 'LATEST' : 'ALBUMS'))
              }
              aria-label="マイアルバム（レコード棚）を開く"
              className={`hidden sm:flex px-2.5 py-1.5 rounded border font-jp text-xs font-bold tracking-tight items-center gap-1 transition-colors cursor-pointer ${
                viewMode === 'ALBUMS'
                  ? 'bg-[#E50914] text-[#FFFFFF] border-[#E50914]'
                  : 'bg-[#121212] text-[#FFFFFF] border-[#262628] hover:border-[#FFFFFF]'
              }`}
            >
              <Disc3
                className={`w-3.5 h-3.5 ${
                  activeAlbumPlayback ? 'animate-spin-slow text-[#FF6B6B]' : ''
                }`}
              />
              <span>レコード棚</span>
              <span className="text-[10px] font-mono-tech opacity-85">
                ({albums.length})
              </span>
            </button>

            {/* Help / Guide */}
            <button
              type="button"
              onClick={() => handleToggleOnboarding(!isOnboardingOpen)}
              aria-label="使い方ガイドを表示"
              title="1verceの使い方ガイド"
              className={`p-2 sm:px-2 sm:py-1.5 rounded border font-jp text-xs font-bold tracking-tight flex items-center gap-1 transition-colors cursor-pointer ${
                isOnboardingOpen
                  ? 'bg-[#FFFFFF] text-[#0A0A0A] border-[#FFFFFF]'
                  : 'bg-[#121212] text-[#FFFFFF] border-[#262628] hover:border-[#FFFFFF]'
              }`}
            >
              <HelpCircle className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-[#E50914]" />
              <span className="hidden sm:inline">使い方</span>
            </button>

            {/* Saved Bookmarks */}
            <button
              type="button"
              onClick={() => {
                if (viewMode === 'ALBUMS') setViewMode('LATEST');
                setShowSavedOnly((prev) => !prev);
              }}
              aria-label={
                showSavedOnly
                  ? '保存済みフィルターを解除'
                  : '保存したバトルのみ表示'
              }
              className={`p-2 sm:px-2 sm:py-1.5 rounded border font-mono-tech text-xs font-bold tracking-tight flex items-center gap-1 transition-colors cursor-pointer ${
                showSavedOnly && viewMode !== 'ALBUMS'
                  ? 'bg-[#FFFFFF] text-[#0A0A0A] border-[#FFFFFF]'
                  : 'bg-[#121212] text-[#8E8E93] border-[#262628] hover:text-[#FFFFFF]'
              }`}
            >
              <Bookmark className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span className="text-[10px] opacity-80">({savedIds.length})</span>
            </button>
          </div>
        </div>

        {/* Incremental Search Drawer */}
        {(isSearchOpen || searchQuery) && (
          <div className="bg-[#121212] border-b border-[#242426] px-3 sm:px-4 py-2">
            <div className="max-w-3xl mx-auto flex items-center gap-2">
              <Search className="w-4 h-4 text-[#8E8E93] shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  if (viewMode === 'ALBUMS') setViewMode('LATEST');
                  setSearchQuery(e.target.value);
                }}
                placeholder="MC名・大会名でバトルを高速検索..."
                className="flex-1 bg-transparent text-xs sm:text-sm font-jp text-[#FFFFFF] placeholder:text-[#48484A] outline-none"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="検索キーワードを消去"
                  className="p-1 text-[#8E8E93] hover:text-[#FFFFFF] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* 2. Interactive "VS BUILDER" — ONLY visible when exploring battles (Hidden on ALBUMS tab so Vinyl Studio has 100% screen focus) */}
      {viewMode !== 'ALBUMS' && (
        <VsBuilder
          battles={scopedBattles}
          selectedMcA={selectedMcA}
          selectedMcB={selectedMcB}
          selectedTournament={selectedTournament}
          onSelectMcA={handleSelectMcA}
          onSelectMcB={handleSelectMcB}
          onSelectTournament={handleSelectTournament}
          onSelectMatchup={handleSelectMatchup}
          onResetAll={handleResetFilters}
        />
      )}

      {/* Main Content Container */}
      <main
        className={`flex-1 max-w-3xl w-full mx-auto px-3 sm:px-4 py-3 sm:py-4 space-y-3 sm:space-y-4 ${
          activeAlbumPlayback && viewMode !== 'ALBUMS'
            ? 'pb-40 sm:pb-24'
            : 'pb-24 sm:pb-8'
        }`}
      >
        {/* Interactive Onboarding Guide (Only when explicitly toggled by user) */}
        <OnboardingBanner
          isOpen={isOnboardingOpen}
          onClose={() => handleToggleOnboarding(false)}
          hasExploredBattle={Boolean(
            activeBattleId || selectedMcA || selectedTournament !== 'ALL'
          )}
          hasUsedAlbum={albums.some(
            (a) => !a.isPreset || a.playCount > 0 || a.tracks.length > 4
          )}
          hasAddedBattle={battles.some((b) => Boolean(b.isUserSubmitted))}
          onNavigateToBattle={() => {
            setViewMode('LATEST');
            const target = filteredBattles[0] || battles[0];
            if (target) {
              handleStartPlay(target.id, 0);
              setTimeout(() => {
                document
                  .getElementById(`battle-${target.id}`)
                  ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 80);
            }
          }}
          onNavigateToAlbums={() => setViewMode('ALBUMS')}
          onOpenSubmitBattle={() => setIsSubmitOpen(true)}
        />

        {/* Deep Link Active Notification Banner */}
        {deepLinkBanner && viewMode !== 'ALBUMS' && (
          <div className="bg-[#1A1A1A] border border-[#E50914] rounded-lg px-3 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-jp">
              <span className="w-2 h-2 rounded-full bg-[#E50914] animate-live-dot" />
              <span className="font-bold text-[#FFFFFF]">
                指定バトルへ直行再生中 ({formatTimestamp(deepLinkBanner.seconds)}〜)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDeepLinkBanner(null)}
              className="text-[11px] font-jp font-bold text-[#8E8E93] hover:text-[#FFFFFF] cursor-pointer"
            >
              閉じる
            </button>
          </div>
        )}

        {/* 3a. Video Format Segmented Control — 試合（フル動画のみ） / ショート・切り抜き */}
        {viewMode !== 'ALBUMS' && !showSavedOnly && (
          <div
            role="tablist"
            aria-label="動画の種類"
            className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#121212] border border-[#222224]"
          >
            {(
              [
                { id: 'MATCH', label: 'フル試合', count: formatCounts.matches, unit: '試合' },
                { id: 'CLIPS', label: 'ショート・切り抜き', count: formatCounts.clips, unit: '本' },
              ] as const
            ).map((seg) => {
              const active = videoMode === seg.id;
              return (
                <button
                  key={seg.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => handleChangeVideoMode(seg.id)}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg font-jp text-xs transition-all cursor-pointer ${
                    active
                      ? 'bg-[#FFFFFF] text-[#0A0A0A] font-black shadow-sm'
                      : 'text-[#8E8E93] hover:text-[#FFFFFF] font-bold'
                  }`}
                >
                  <span>{seg.label}</span>
                  <span
                    className={`font-mono-tech text-[10px] ${
                      active ? 'text-[#0A0A0A]/60' : 'text-[#5A5A5E]'
                    }`}
                  >
                    {seg.count}
                    {seg.unit}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* 3. Battle Sort Bar — Only shown on Battle View */}
        {viewMode !== 'ALBUMS' && (
          <div className="flex items-center justify-between gap-2 border-b border-[#1F1F21] pb-2">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
              {(
                [
                  { id: 'LATEST', label: '新着順' },
                  { id: 'HALL_OF_FAME', label: '人気再生順' },
                ] as const
              ).map((tab) => {
                const active = viewMode === tab.id && !showSavedOnly;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setShowSavedOnly(false);
                      setViewMode(tab.id as ViewMode);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-jp tracking-wide shrink-0 transition-all cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-[#FFFFFF] text-[#0A0A0A] font-black shadow-sm'
                        : 'bg-[#121212] text-[#8E8E93] hover:text-[#FFFFFF] border border-[#222224] font-bold'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setShowSavedOnly((prev) => !prev)}
                className={`px-3 py-1.5 rounded-lg text-xs font-jp tracking-wide shrink-0 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  showSavedOnly
                    ? 'bg-[#FFFFFF] text-[#0A0A0A] font-black shadow-sm'
                    : 'bg-[#121212] text-[#8E8E93] hover:text-[#FFFFFF] border border-[#222224] font-bold'
                }`}
              >
                <Bookmark className="w-3 h-3" />
                <span>保存済 ({savedIds.length})</span>
              </button>
            </div>

            <div className="text-[11px] sm:text-xs font-jp text-[#8E8E93] shrink-0 pl-1">
              <span className="text-[#FFFFFF] font-bold font-mono-tech">
                {filteredBattles.length}
              </span>
              <span className="ml-0.5">
                {showSavedOnly ? '件' : videoMode === 'MATCH' ? '試合' : '本'}
              </span>
            </div>
          </div>
        )}

        {/* 4. Album Vinyl Studio (Kept mounted with non-zero dimensions while activeAlbumPlayback is active so iOS Safari never throttles background audio!) */}
        {(viewMode === 'ALBUMS' || activeAlbumPlayback !== null) && (
          <div
            className={
              viewMode === 'ALBUMS'
                ? 'block'
                : 'fixed -left-[9999px] top-0 w-80 h-60 opacity-0 pointer-events-none overflow-hidden'
            }
          >
            <AlbumView
              albums={albums}
              communityAlbums={communityAlbums}
              battles={battles}
              initialSelectedAlbumId={sharedAlbumId}
              externalBattlePlaying={Boolean(activeBattleId)}
              onStopExternalBattle={() => setActiveBattleId(null)}
              onActivePlaybackChange={setActiveAlbumPlayback}
              onCreateAlbum={handleCreateAlbum}
              onImportCommunityAlbum={handleImportCommunityAlbum}
              onUpdateAlbumMeta={handleUpdateAlbumMeta}
              onDeleteAlbum={handleDeleteAlbum}
              onAddTrackToAlbum={handleAddTrackToAlbum}
              onRemoveTrackFromAlbum={handleRemoveTrackFromAlbumById}
              onMoveTrack={handleMoveTrack}
              onUpdateTrackInAlbum={handleUpdateTrackInAlbum}
              onRecordAlbumPlay={handleRecordAlbumPlay}
            />
          </div>
        )}

        {/* 5. Battle Cards Feed */}
        {viewMode !== 'ALBUMS' &&
          (filteredBattles.length === 0 ? (
            <div className="bg-[#121212] border border-[#222224] rounded-xl p-10 text-center space-y-3">
              <div className="font-jp text-sm font-bold text-[#8E8E93]">
                {showSavedOnly
                  ? '保存済みのバトルがまだありません'
                  : '条件に一致するバトルが見つかりませんでした'}
              </div>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#FFFFFF] text-[#0A0A0A] font-jp text-xs font-black cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>すべてのバトルを表示</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsSubmitOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1C1C20] text-[#FFFFFF] border border-[#2C2C2E] font-jp text-xs font-bold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>YouTubeを登録する</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-5">
              {filteredBattles.slice(0, displayLimit).map((battle) => (
                <BattleCard
                  key={battle.id}
                  battle={battle}
                  isPlaying={activeBattleId === battle.id}
                  seekSeconds={
                    activeBattleId === battle.id ? seekSeconds : 0
                  }
                  seekNonce={activeBattleId === battle.id ? seekNonce : 0}
                  isSaved={savedIds.includes(battle.id)}
                  albumCountForBattle={albumCountByBattleId.get(battle.id) || 0}
                  onStartPlay={handleStartPlay}
                  onStopPlay={handleStopPlay}
                  onVideoEnded={handleVideoEnded}
                  onToggleSave={handleToggleSave}
                  onOpenShare={(b, curSec) =>
                    setShareTarget({ battle: b, seconds: curSec })
                  }
                  onOpenAlbumPicker={(b, startSeconds, note) =>
                    setAlbumPickerTarget({ battle: b, startSeconds, note })
                  }
                />
              ))}

              {filteredBattles.length > displayLimit && (
                <div className="py-6 flex flex-col items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDisplayLimit((prev) => prev + 25)}
                    className="px-6 py-2.5 rounded-full bg-[#FFFFFF] hover:bg-[#E5E5EA] text-[#0A0A0A] font-jp font-black text-xs shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center gap-2"
                  >
                    <span>さらに次の25件のバトルを読み込む</span>
                    <span className="font-mono-tech text-[11px] opacity-70">
                      ({Math.min(displayLimit, filteredBattles.length)} /{' '}
                      {filteredBattles.length})
                    </span>
                  </button>
                  <p className="text-[11px] font-mono-tech text-[#8E8E93]">
                    残りのバトル: {filteredBattles.length - displayLimit}件
                  </p>
                </div>
              )}
            </div>
          ))}
      </main>

      {/* Floating Mini Vinyl Turntable Bar (Visible on Battle View while an Album is spinning!) */}
      {viewMode !== 'ALBUMS' && activeAlbumPlayback && (
        <div className="fixed bottom-[calc(3.75rem+env(safe-area-inset-bottom))] sm:bottom-4 left-2 right-2 sm:left-auto sm:right-6 sm:w-96 z-40 bg-[#121216]/95 backdrop-blur-xl border border-[#2C2C34] rounded-2xl p-2.5 shadow-2xl flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setViewMode('ALBUMS')}
            className={`relative w-11 h-11 rounded-full bg-[#09090B] border border-[#3A3A44] flex items-center justify-center shrink-0 cursor-pointer overflow-hidden ${
              activeAlbumPlayback.isPaused ? '' : 'animate-spin-slow'
            }`}
            title="ターンテーブルを開く"
          >
            <img
              src={getYouTubeThumbnail(activeAlbumPlayback.battle.youtubeId)}
              alt=""
              className="w-full h-full object-cover opacity-80"
            />
            <span className="absolute w-3 h-3 rounded-full bg-[#E50914] border-2 border-[#09090B]" />
          </button>

          <button
            type="button"
            onClick={() => setViewMode('ALBUMS')}
            className="flex-1 min-w-0 text-left cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  activeAlbumPlayback.isPaused
                    ? 'bg-amber-400'
                    : 'bg-[#E50914] animate-live-dot'
                }`}
              />
              <span className="text-[9px] font-mono-tech text-[#FF6B6B] font-bold truncate">
                {activeAlbumPlayback.isPaused ? 'PAUSED' : 'SPINNING'} (
                {activeAlbumPlayback.trackIndex + 1}/
                {activeAlbumPlayback.totalTracks}) •{' '}
                {activeAlbumPlayback.albumTitle}
              </span>
            </div>
            <div className="text-xs font-jp font-black text-white truncate">
              {activeAlbumPlayback.battle.mcA} vs{' '}
              {activeAlbumPlayback.battle.mcB}
            </div>
          </button>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={activeAlbumPlayback.onPrev}
              aria-label="前のトラック"
              className="p-2 rounded-lg bg-[#1C1C22] hover:bg-[#282830] text-white cursor-pointer"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={activeAlbumPlayback.onTogglePause}
              aria-label={activeAlbumPlayback.isPaused ? '再生再開' : '一時停止'}
              className="p-2 rounded-lg bg-[#E50914] hover:bg-[#F40612] text-white cursor-pointer"
            >
              {activeAlbumPlayback.isPaused ? (
                <Play className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Pause className="w-3.5 h-3.5 fill-current" />
              )}
            </button>
            <button
              type="button"
              onClick={activeAlbumPlayback.onNext}
              aria-label="次のトラック"
              className="p-2 rounded-lg bg-[#1C1C22] hover:bg-[#282830] text-white cursor-pointer"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={activeAlbumPlayback.onStop}
              aria-label="停止"
              className="p-2 rounded-lg bg-[#2A1215] hover:bg-[#E50914] text-[#FF8A8A] hover:text-white cursor-pointer"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Clean Public Footer */}
      <footer className="border-t border-[#1A1A1C] py-6 mt-10 mb-16 sm:mb-0 bg-[#0A0A0A]">
        <div className="max-w-3xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-jp text-[#6C6C70]">
          <div className="flex items-center gap-2">
            <span className="text-[#FFFFFF] font-display font-bold">1verce</span>
            <span>// MCバトル検索・名盤レコード連続再生アーカイブ</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <button
              type="button"
              onClick={() => {
                setViewMode('LATEST');
                setShowSavedOnly(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-[#FFFFFF] cursor-pointer"
            >
              バトル一覧
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('ALBUMS');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-[#FFFFFF] cursor-pointer"
            >
              レコード棚
            </button>
            <button
              type="button"
              onClick={() => setIsSubmitOpen(true)}
              className="hover:text-[#FFFFFF] cursor-pointer"
            >
              YouTube登録
            </button>
            <button
              type="button"
              onClick={() => handleToggleOnboarding(true)}
              className="hover:text-[#FFFFFF] cursor-pointer"
            >
              使い方ガイド
            </button>
          </div>
        </div>
      </footer>

      {/* Native-App Mobile Bottom Navigation Bar (Visible only on mobile/tablet <640px) */}
      <nav
        aria-label="モバイル主要ナビゲーション"
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0E0E10]/95 backdrop-blur-xl border-t border-[#1F1F24] pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-4 h-14 items-center">
          {/* 1. All Battles */}
          <button
            type="button"
            onClick={() => {
              setViewMode('LATEST');
              setShowSavedOnly(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center gap-1 h-full cursor-pointer transition-colors ${
              viewMode !== 'ALBUMS' && !showSavedOnly
                ? 'text-[#FFFFFF]'
                : 'text-[#6C6C70] hover:text-[#AEAEB2]'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span className="text-[10px] font-jp font-bold">バトル</span>
          </button>

          {/* 2. My Albums (Vinyl Shelf) */}
          <button
            type="button"
            onClick={() => {
              setViewMode('ALBUMS');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center gap-1 h-full cursor-pointer transition-colors relative ${
              viewMode === 'ALBUMS'
                ? 'text-[#E50914]'
                : 'text-[#6C6C70] hover:text-[#AEAEB2]'
            }`}
          >
            <Disc3
              className={`w-4 h-4 ${
                activeAlbumPlayback && !activeAlbumPlayback.isPaused
                  ? 'animate-spin-slow text-[#E50914]'
                  : ''
              }`}
            />
            <span className="text-[10px] font-jp font-bold">レコード棚</span>
            {albums.length > 0 && (
              <span className="absolute top-1.5 right-5 w-4 h-4 bg-[#E50914] text-white rounded-full text-[9px] font-mono-tech font-bold flex items-center justify-center">
                {albums.length}
              </span>
            )}
          </button>

          {/* 3. Register Battle (Central Highlight Button) */}
          <button
            type="button"
            onClick={() => setIsSubmitOpen(true)}
            className="flex flex-col items-center justify-center -mt-2 cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-full bg-[#FFFFFF] group-hover:bg-[#E5E5EA] text-[#0A0A0A] flex items-center justify-center shadow-lg shadow-white/10 transition-transform active:scale-90">
              <Plus className="w-5 h-5 stroke-[3]" />
            </div>
            <span className="text-[9px] font-jp font-black text-[#FFFFFF] mt-0.5">
              YouTube登録
            </span>
          </button>

          {/* 4. Saved Battles (Bookmarks) */}
          <button
            type="button"
            onClick={() => {
              if (viewMode === 'ALBUMS') {
                setViewMode('LATEST');
                setShowSavedOnly(true);
              } else {
                setShowSavedOnly((prev) => !prev);
              }
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center gap-1 h-full cursor-pointer transition-colors relative ${
              viewMode !== 'ALBUMS' && showSavedOnly
                ? 'text-[#FFFFFF]'
                : 'text-[#6C6C70] hover:text-[#AEAEB2]'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span className="text-[10px] font-jp font-bold">保存済</span>
            {savedIds.length > 0 && (
              <span className="absolute top-1.5 right-5 w-4 h-4 bg-[#2C2C34] text-white rounded-full text-[9px] font-mono-tech font-bold flex items-center justify-center">
                {savedIds.length}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* Modals */}
      {isSubmitOpen && (
        <SubmitModal
          battles={battles}
          albums={albums}
          onClose={() => setIsSubmitOpen(false)}
          onAddBattle={handleAddBattle}
          onJumpToExistingBattle={(battleId) => handleJumpToBattle(battleId, 0)}
          onOpenAlbumPickerForExisting={(battle) =>
            setAlbumPickerTarget({ battle, startSeconds: 0 })
          }
        />
      )}

      {albumPickerTarget && (
        <AlbumPickerModal
          battle={albumPickerTarget.battle}
          initialStartSeconds={albumPickerTarget.startSeconds}
          initialNote={albumPickerTarget.note}
          albums={albums}
          onClose={() => setAlbumPickerTarget(null)}
          onAddTrackToAlbum={handleAddTrackToAlbum}
          onUpdateTrackInAlbum={handleUpdateTrackInAlbum}
          onRemoveTrackFromAlbum={handleRemoveTrackFromAlbumByBattle}
          onCreateAlbumWithTrack={handleCreateAlbumWithTrack}
          onNavigateToAlbums={() => {
            setViewMode('ALBUMS');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {shareTarget && (
        <ShareModal
          battle={shareTarget.battle}
          initialSeconds={shareTarget.seconds}
          onClose={() => setShareTarget(null)}
          onRecordShare={handleRecordShare}
        />
      )}
    </div>
  );
};

export default App;
