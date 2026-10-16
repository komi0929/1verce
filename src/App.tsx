import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  BarChart3,
  Bookmark,
  Search,
  X,
  RotateCcw,
  Disc3,
  Database,
  Flame,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import {
  ActivityItem,
  Album,
  AlbumJacketStyle,
  AlbumJacketTheme,
  AnalyticsData,
  Battle,
  TournamentTag,
  Verse,
  ViewMode,
} from './types';
import { INITIAL_ANALYTICS, INITIAL_BATTLES } from './data/initialData';
import {
  isSameMc,
  normalizeMcName,
  formatTimestamp,
  matchesMcQuery,
} from './utils/youtube';
import {
  DB_STORAGE_KEYS,
  DEFAULT_ALBUMS,
  fetchCloudState,
  getSupabaseConfig,
  insertActivityToCloud,
  removeAlbumFromCloud,
  removeStampFromCloud,
  syncAnalyticsToCloud,
  upsertAlbumToCloud,
  upsertBattleToCloud,
  upsertStampToCloud,
} from './lib/database';
import { VsBuilder } from './components/VsBuilder';
import {
  BattleCard,
  DEFAULT_PUNCHLINE_PLACEHOLDER,
} from './components/BattleCard';
import { ArchiveView } from './components/ArchiveView';
import { AlbumView } from './components/AlbumView';
import { AlbumPickerModal } from './components/AlbumPickerModal';
import { ShareModal } from './components/ShareModal';
import { SubmitModal } from './components/SubmitModal';
import { InsightsModal } from './components/InsightsModal';
import { DatabaseModal } from './components/DatabaseModal';
import { OnboardingBanner } from './components/OnboardingBanner';

function cleanLegacyFakeVerses(battles: Battle[]): Battle[] {
  return battles.map((b) => ({
    ...b,
    verses: (b.verses || []).filter(
      (v) =>
        !v.text.includes('魂のバース') &&
        !v.text.includes('アンサーで返す') &&
        Boolean(v.isUserCreated)
    ),
  }));
}

export const App: React.FC = () => {
  // 1. Persistent Battles State
  const [battles, setBattles] = useState<Battle[]>(() => {
    try {
      const raw = localStorage.getItem(DB_STORAGE_KEYS.BATTLES);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length >= INITIAL_BATTLES.length) {
          return cleanLegacyFakeVerses(parsed);
        }
      }
    } catch {
      // Fallback to preset
    }
    return INITIAL_BATTLES;
  });

  // 2. Persistent Albums State
  const [albums, setAlbums] = useState<Album[]>(() => {
    try {
      const raw = localStorage.getItem(DB_STORAGE_KEYS.ALBUMS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return DEFAULT_ALBUMS;
  });

  // 3. Persistent Activity Feed (Information Freshness)
  const [activities, setActivities] = useState<ActivityItem[]>(() => {
    try {
      const raw = localStorage.getItem(DB_STORAGE_KEYS.ACTIVITIES);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // 4. Persistent Analytics State (100% Real Telemetry)
  const [analytics, setAnalytics] = useState<AnalyticsData>(() => {
    try {
      const raw = localStorage.getItem(DB_STORAGE_KEYS.ANALYTICS);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // Fallback
    }
    return INITIAL_ANALYTICS;
  });

  // 5. Saved Battles & User Liked Stamps
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(DB_STORAGE_KEYS.SAVED);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [userLikedVerses, setUserLikedVerses] = useState<
    Record<string, boolean>
  >(() => {
    try {
      const raw = localStorage.getItem(DB_STORAGE_KEYS.LIKED_VERSES);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // 6. Filter & View States
  const [selectedMcA, setSelectedMcA] = useState<string | null>(null);
  const [selectedMcB, setSelectedMcB] = useState<string | null>(null);
  const [selectedTournament, setSelectedTournament] =
    useState<TournamentTag>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('LATEST');
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [displayLimit, setDisplayLimit] = useState<number>(20);

  // 7. Singleton Player State
  const [activeBattleId, setActiveBattleId] = useState<string | null>(null);
  const [seekSeconds, setSeekSeconds] = useState<number>(0);
  const [seekNonce, setSeekNonce] = useState<number>(0);
  const [activeVerseId, setActiveVerseId] = useState<string | null>(null);
  const [deepLinkBanner, setDeepLinkBanner] = useState<{
    battleId: string;
    seconds: number;
  } | null>(null);

  // 8. Modals & Cloud Status State
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(() =>
    Boolean(getSupabaseConfig())
  );
  const [shareTarget, setShareTarget] = useState<{
    battle: Battle;
    verse?: Verse;
  } | null>(null);
  const [albumPickerTarget, setAlbumPickerTarget] = useState<{
    battle: Battle;
    startSeconds?: number;
    note?: string;
  } | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('1verce_onboarding_open_v1');
      return raw === null ? true : raw === '1';
    } catch {
      return true;
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
      localStorage.setItem(
        DB_STORAGE_KEYS.ACTIVITIES,
        JSON.stringify(activities)
      );
    } catch {}
  }, [activities]);

  useEffect(() => {
    try {
      localStorage.setItem(
        DB_STORAGE_KEYS.ANALYTICS,
        JSON.stringify(analytics)
      );
    } catch {}
  }, [analytics]);

  useEffect(() => {
    try {
      localStorage.setItem(DB_STORAGE_KEYS.SAVED, JSON.stringify(savedIds));
    } catch {}
  }, [savedIds]);

  useEffect(() => {
    try {
      localStorage.setItem(
        DB_STORAGE_KEYS.LIKED_VERSES,
        JSON.stringify(userLikedVerses)
      );
    } catch {}
  }, [userLikedVerses]);

  // Helper to log participatory activity
  const pushActivity = useCallback((item: Omit<ActivityItem, 'id' | 'createdAt'>) => {
    const newAct: ActivityItem = {
      ...item,
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    setActivities((prev) => [newAct, ...prev.slice(0, 39)]);
    insertActivityToCloud(newAct);
  }, []);

  // Mount: Real PV + Unique Visitor tracking + Deep Link + Cloud Sync
  useEffect(() => {
    const isNewVisitor = !localStorage.getItem(
      DB_STORAGE_KEYS.VISITOR_INITIALIZED
    );
    if (isNewVisitor) {
      localStorage.setItem(DB_STORAGE_KEYS.VISITOR_INITIALIZED, '1');
    }

    setAnalytics((prev) => {
      const updated: AnalyticsData = {
        ...prev,
        totalPv: prev.totalPv + 1,
        uniqueVisitors: isNewVisitor
          ? prev.uniqueVisitors + 1
          : Math.max(1, prev.uniqueVisitors),
      };
      syncAnalyticsToCloud(updated);
      return updated;
    });

    const params = new URLSearchParams(window.location.search);
    const battleParam = params.get('battle');
    const timeParam = params.get('t');

    if (battleParam) {
      const targetSec = timeParam ? Math.max(0, parseInt(timeParam, 10) || 0) : 0;
      const found = battles.find((b) => b.id === battleParam);
      if (found) {
        setActiveBattleId(found.id);
        setSeekSeconds(targetSec);
        setSeekNonce(Date.now());
        const matchedVerse = found.verses.find((v) => v.seconds === targetSec);
        setActiveVerseId(matchedVerse?.id || null);
        setDeepLinkBanner({ battleId: found.id, seconds: targetSec });
      }
    }

    // Fetch latest state from Supabase Cloud if configured
    if (getSupabaseConfig()) {
      fetchCloudState(battles).then((cloud) => {
        if (!cloud) return;
        setIsCloudConnected(true);
        setBattles(cloud.mergedBattles);
        if (cloud.cloudAlbums && cloud.cloudAlbums.length > 0) {
          setAlbums(cloud.cloudAlbums);
        }
        if (cloud.cloudActivities && cloud.cloudActivities.length > 0) {
          setActivities(cloud.cloudActivities);
        }
        if (cloud.cloudAnalytics) {
          setAnalytics((local) => ({
            ...local,
            totalPv: Math.max(local.totalPv, cloud.cloudAnalytics!.totalPv),
            uniqueVisitors: Math.max(
              local.uniqueVisitors,
              cloud.cloudAnalytics!.uniqueVisitors
            ),
            totalPlays: Math.max(
              local.totalPlays,
              cloud.cloudAnalytics!.totalPlays
            ),
            totalVersesLogged: Math.max(
              local.totalVersesLogged,
              cloud.cloudAnalytics!.totalVersesLogged
            ),
            viralShares: Math.max(
              local.viralShares,
              cloud.cloudAnalytics!.viralShares
            ),
          }));
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Count how many albums each battle belongs to
  const albumCountByBattleId = useMemo(() => {
    const map = new Map<string, number>();
    for (const alb of albums) {
      for (const t of alb.tracks) {
        map.set(t.battleId, (map.get(t.battleId) || 0) + 1);
      }
    }
    return map;
  }, [albums]);

  const totalStampsCount = useMemo(
    () => battles.reduce((sum, b) => sum + b.verses.length, 0),
    [battles]
  );

  // Handlers
  const handleSelectMcA = useCallback(
    (mc: string | null) => {
      setSelectedMcA(mc);
      setSelectedMcB(null);
      setDisplayLimit(20);
      if (viewMode === 'ALBUMS') {
        setViewMode('LATEST');
      }
      if (mc) {
        if (selectedTournament !== 'ALL') {
          const inCurrentTournament = battles.some(
            (b) =>
              b.tournament === selectedTournament &&
              (isSameMc(b.mcA, mc) || isSameMc(b.mcB, mc))
          );
          if (!inCurrentTournament) {
            setSelectedTournament('ALL');
          }
        }

        const norm = normalizeMcName(mc);
        setAnalytics((prev) => {
          const next = {
            ...prev,
            mcSearchCounts: {
              ...prev.mcSearchCounts,
              [norm]: (prev.mcSearchCounts[norm] || 0) + 1,
            },
          };
          syncAnalyticsToCloud(next);
          return next;
        });
      }
    },
    [battles, selectedTournament, viewMode]
  );

  const handleSelectMcB = useCallback((mc: string | null) => {
    setSelectedMcB(mc);
    setDisplayLimit(20);
    if (mc) {
      const norm = normalizeMcName(mc);
      setAnalytics((prev) => {
        const next = {
          ...prev,
          mcSearchCounts: {
            ...prev.mcSearchCounts,
            [norm]: (prev.mcSearchCounts[norm] || 0) + 1,
          },
        };
        syncAnalyticsToCloud(next);
        return next;
      });
    }
  }, []);

  const handleSelectMatchup = useCallback((mcA: string, mcB: string) => {
    setSelectedMcA(mcA);
    setSelectedMcB(mcB);
    setDisplayLimit(20);
    const normA = normalizeMcName(mcA);
    const normB = normalizeMcName(mcB);
    setAnalytics((prev) => {
      const next = {
        ...prev,
        mcSearchCounts: {
          ...prev.mcSearchCounts,
          [normA]: (prev.mcSearchCounts[normA] || 0) + 1,
          [normB]: (prev.mcSearchCounts[normB] || 0) + 1,
        },
      };
      syncAnalyticsToCloud(next);
      return next;
    });
  }, []);

  const handleSelectTournament = useCallback(
    (t: TournamentTag) => {
      setSelectedTournament(t);
      setDisplayLimit(20);
      if (viewMode === 'ALBUMS') {
        setViewMode('LATEST');
      }
      if (t !== 'ALL' && selectedMcA) {
        const tournamentBattles = battles.filter((b) => b.tournament === t);
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
    [battles, selectedMcA, selectedMcB, viewMode]
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
    (battleId: string, seconds: number = 0, verseId?: string) => {
      setActiveBattleId(battleId);
      setSeekSeconds(seconds);
      setSeekNonce(Date.now());
      setActiveVerseId(verseId || null);

      const targetBattle = battles.find((b) => b.id === battleId);

      setBattles((prev) =>
        prev.map((b) => {
          if (b.id !== battleId) return b;
          const updated: Battle = {
            ...b,
            outboundPlays: b.outboundPlays + 1,
            verses: verseId
              ? b.verses.map((v) =>
                  v.id === verseId ? { ...v, replays: v.replays + 1 } : v
                )
              : b.verses,
          };
          upsertBattleToCloud(updated);
          return updated;
        })
      );

      if (targetBattle) {
        const tKey = targetBattle.tournament;
        setAnalytics((prev) => {
          const currentT = prev.tournamentTraffic[tKey] || {
            outboundViews: 0,
            ctr: 0,
            verseTriggers: 0,
          };
          const nextViews = currentT.outboundViews + 1;
          const nextTriggers = verseId
            ? currentT.verseTriggers + 1
            : currentT.verseTriggers;
          const ctr = nextViews > 0 ? (nextTriggers / nextViews) * 100 : 0;
          const nextAnalytics: AnalyticsData = {
            ...prev,
            totalPlays: prev.totalPlays + 1,
            tournamentTraffic: {
              ...prev.tournamentTraffic,
              [tKey]: {
                outboundViews: nextViews,
                verseTriggers: nextTriggers,
                ctr: Math.round(ctr * 10) / 10,
              },
            },
          };
          syncAnalyticsToCloud(nextAnalytics);
          return nextAnalytics;
        });
      }
    },
    [battles]
  );

  const handleStopPlay = useCallback((battleId: string) => {
    setActiveBattleId((prev) => (prev === battleId ? null : prev));
    setActiveVerseId(null);
  }, []);

  // 1-Tap Unified Punchline Stamp with Smart +-6s Deduplication & Auto-Like
  const handleStampPunchline = useCallback(
    (
      battleId: string,
      seconds: number,
      mc: string,
      optionalText?: string
    ): { verseId: string; mergedExisting: boolean; finalSeconds: number } => {
      const targetBattle = battles.find((b) => b.id === battleId);
      const existingNearby = targetBattle?.verses.find(
        (v) => Math.abs(v.seconds - seconds) <= 6
      );

      const nowIso = new Date().toISOString();

      // Smart Deduplication: if a punchline already exists within +-6 seconds, merge into it (+1 Like!)
      if (existingNearby && targetBattle) {
        const cleanText = optionalText?.trim();
        const shouldUpgradeText =
          cleanText &&
          (!existingNearby.text ||
            existingNearby.text === DEFAULT_PUNCHLINE_PLACEHOLDER);

        const updatedVerse: Verse = {
          ...existingNearby,
          likes: existingNearby.likes + 1,
          replays: existingNearby.replays + 1,
          text: shouldUpgradeText ? cleanText : existingNearby.text,
        };

        setUserLikedVerses((prev) => ({
          ...prev,
          [existingNearby.id]: true,
        }));

        setBattles((prev) =>
          prev.map((b) => {
            if (b.id !== battleId) return b;
            const nextBattle: Battle = {
              ...b,
              lastActiveAt: nowIso,
              verses: b.verses.map((v) =>
                v.id === existingNearby.id ? updatedVerse : v
              ),
            };
            upsertStampToCloud(nextBattle, updatedVerse);
            return nextBattle;
          })
        );

        pushActivity({
          type: 'LIKE',
          battleId,
          seconds: existingNearby.seconds,
          summary: `[${formatTimestamp(existingNearby.seconds)}] ${existingNearby.mc} のパンチラインに共感合算（🔥いいね！ ${updatedVerse.likes}）`,
          detail: updatedVerse.text,
        });

        return {
          verseId: existingNearby.id,
          mergedExisting: true,
          finalSeconds: existingNearby.seconds,
        };
      }

      // Otherwise, create a new Punchline stamp
      const newVerseId = `v-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 6)}`;
      const finalText = optionalText?.trim() || DEFAULT_PUNCHLINE_PLACEHOLDER;

      setUserLikedVerses((prev) => ({
        ...prev,
        [newVerseId]: true,
      }));

      setBattles((prev) =>
        prev.map((b) => {
          if (b.id !== battleId) return b;
          const newVerse: Verse = {
            id: newVerseId,
            battleId,
            seconds,
            tag: 'PUNCHLINE',
            text: finalText,
            mc,
            likes: 1,
            replays: 1,
            createdAt: nowIso,
            isUserCreated: true,
          };
          const updatedBattle: Battle = {
            ...b,
            lastActiveAt: nowIso,
            verses: [...b.verses, newVerse],
          };
          upsertStampToCloud(updatedBattle, newVerse);
          pushActivity({
            type: 'STAMP',
            battleId: b.id,
            seconds,
            summary: `[${formatTimestamp(seconds)}] ${mc} (${b.mcA} vs ${b.mcB}) のパンチラインを刻印`,
            detail: finalText,
          });
          return updatedBattle;
        })
      );

      setAnalytics((prev) => {
        const next = {
          ...prev,
          totalVersesLogged: prev.totalVersesLogged + 1,
        };
        syncAnalyticsToCloud(next);
        return next;
      });

      return {
        verseId: newVerseId,
        mergedExisting: false,
        finalSeconds: seconds,
      };
    },
    [battles, pushActivity]
  );

  const handleUpdateVerse = useCallback(
    (
      battleId: string,
      verseId: string,
      updates: { seconds?: number; text?: string; mc?: string }
    ) => {
      setBattles((prev) =>
        prev.map((b) => {
          if (b.id !== battleId) return b;
          let updatedVerse: Verse | null = null;
          const nextVerses = b.verses.map((v) => {
            if (v.id !== verseId) return v;
            updatedVerse = { ...v, ...updates };
            return updatedVerse;
          });
          const nextBattle = {
            ...b,
            lastActiveAt: new Date().toISOString(),
            verses: nextVerses,
          };
          if (updatedVerse) {
            upsertStampToCloud(nextBattle, updatedVerse);
          }
          return nextBattle;
        })
      );
    },
    []
  );

  const handleDeleteVerse = useCallback((battleId: string, verseId: string) => {
    setBattles((prev) =>
      prev.map((b) => {
        if (b.id !== battleId) return b;
        return {
          ...b,
          verses: b.verses.filter((v) => v.id !== verseId),
        };
      })
    );
    removeStampFromCloud(verseId);
  }, []);

  const handleLikeVerse = useCallback(
    (battleId: string, verseId: string) => {
      const alreadyLiked = Boolean(userLikedVerses[verseId]);
      const delta = alreadyLiked ? -1 : 1;

      setUserLikedVerses((prev) => ({
        ...prev,
        [verseId]: !alreadyLiked,
      }));

      setBattles((prev) =>
        prev.map((b) => {
          if (b.id !== battleId) return b;
          let targetV: Verse | null = null;
          const nextVerses = b.verses.map((v) => {
            if (v.id !== verseId) return v;
            targetV = { ...v, likes: Math.max(0, v.likes + delta) };
            return targetV;
          });
          const nextBattle = { ...b, verses: nextVerses };
          if (targetV) {
            upsertStampToCloud(nextBattle, targetV);
          }
          return nextBattle;
        })
      );
    },
    [userLikedVerses]
  );

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
        tracks: [],
        likes: 1,
        playCount: 0,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      setAlbums((prev) => [newAlbum, ...prev]);
      upsertAlbumToCloud(newAlbum);
      pushActivity({
        type: 'ALBUM_CREATE',
        albumId: newId,
        summary: `マイアルバム「${title}」を作成`,
      });
      return newId;
    },
    [pushActivity]
  );

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
      upsertAlbumToCloud(newAlbum);
      pushActivity({
        type: 'ALBUM_CREATE',
        albumId: newId,
        battleId,
        summary: `マイアルバム「${title}」を作成＆1曲目を収録`,
      });
    },
    [pushActivity]
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
    setAlbums((prev) => prev.filter((a) => a.id !== albumId));
    removeAlbumFromCloud(albumId);
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
          pushActivity({
            type: 'ALBUM_ADD',
            albumId: a.id,
            battleId,
            seconds: startSeconds,
            summary: `アルバム「${a.title}」にバトルを収録`,
          });
          return updated;
        })
      );
    },
    [pushActivity]
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
      for (const v of newBattle.verses) {
        upsertStampToCloud(newBattle, v);
      }

      if (targetAlbumIds.length > 0) {
        for (const albId of targetAlbumIds) {
          handleAddTrackToAlbum(
            albId,
            newBattle.id,
            newBattle.verses[0]?.seconds || 0,
            `${newBattle.mcA} vs ${newBattle.mcB} (${newBattle.tournament})`
          );
        }
      }

      pushActivity({
        type: 'BATTLE_ADD',
        battleId: newBattle.id,
        summary: `新規バトル「${newBattle.mcA} vs ${newBattle.mcB} (${newBattle.tournament})」を登録`,
      });

      setSelectedMcA(null);
      setSelectedMcB(null);
      setSelectedTournament('ALL');
      setViewMode('FRESH');
      setActiveBattleId(newBattle.id);
      setSeekSeconds(newBattle.verses[0]?.seconds || 0);
      setSeekNonce(Date.now());
      setAnalytics((prev) => {
        const next = {
          ...prev,
          totalVersesLogged: prev.totalVersesLogged + newBattle.verses.length,
        };
        syncAnalyticsToCloud(next);
        return next;
      });
    },
    [handleAddTrackToAlbum, pushActivity]
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
    setAnalytics((prev) => {
      const next = {
        ...prev,
        viralShares: prev.viralShares + 1,
      };
      syncAnalyticsToCloud(next);
      return next;
    });
  }, []);

  const handleJumpToBattleAndVerse = useCallback(
    (battleId: string, seconds: number = 0, verseId: string = '') => {
      setSelectedMcA(null);
      setSelectedMcB(null);
      setSelectedTournament('ALL');
      setSearchQuery('');
      setShowSavedOnly(false);
      setViewMode('LATEST');
      setDeepLinkBanner({ battleId, seconds });
      handleStartPlay(battleId, seconds, verseId || undefined);
      setTimeout(() => {
        const el = document.getElementById(`battle-${battleId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 80);
    },
    [handleStartPlay]
  );

  // Bidirectional VS Filtering + Tournament + Incremental Search + Sort
  const filteredBattles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const list = battles.filter((b) => {
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
        const inVerses = b.verses.some(
          (v) =>
            v.text.toLowerCase().includes(q) || matchesMcQuery(v.mc, q)
        );
        if (!inMc && !inTournament && !inVerses) return false;
      }

      return true;
    });

    return [...list].sort((a, b) => {
      if (deepLinkBanner) {
        if (a.id === deepLinkBanner.battleId) return -1;
        if (b.id === deepLinkBanner.battleId) return 1;
      }

      if (viewMode === 'FRESH') {
        // Prioritize battles with user stamps or newly submitted by users
        const aHasActivity = a.verses.length > 0 || a.isUserSubmitted ? 1 : 0;
        const bHasActivity = b.verses.length > 0 || b.isUserSubmitted ? 1 : 0;
        if (bHasActivity !== aHasActivity) return bHasActivity - aHasActivity;

        const timeA = new Date(a.lastActiveAt || a.createdAt).getTime();
        const timeB = new Date(b.lastActiveAt || b.createdAt).getTime();
        return timeB - timeA;
      }

      if (viewMode === 'HALL_OF_FAME') {
        const scoreA =
          a.outboundPlays * 2 +
          a.verses.reduce((s, v) => s + v.likes * 3 + v.replays, 0);
        const scoreB =
          b.outboundPlays * 2 +
          b.verses.reduce((s, v) => s + v.likes * 3 + v.replays, 0);
        return scoreB - scoreA;
      }

      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
  }, [
    battles,
    showSavedOnly,
    savedIds,
    selectedTournament,
    selectedMcA,
    selectedMcB,
    searchQuery,
    viewMode,
    deepLinkBanner,
  ]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FFFFFF] flex flex-col">
      {/* 1. Top Header */}
      <header className="h-14 border-b border-[#1F1F1F] bg-[#0A0A0A]/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-3xl mx-auto h-full px-3 sm:px-4 flex items-center justify-between gap-2">
          {/* Left: 1verce Typography Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleResetFilters}
              className="flex items-baseline gap-1.5 text-left cursor-pointer group"
            >
              <span className="font-display text-2xl font-bold tracking-tighter text-[#FFFFFF] group-hover:opacity-80 transition-opacity">
                1verce
              </span>
              <span className="hidden sm:inline-block text-[10px] font-mono-tech text-[#8E8E93] tracking-widest uppercase">
                ARCHIVE
              </span>
            </button>
          </div>

          {/* Right: Participatory Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setIsSearchOpen((v) => !v)}
              aria-label="キーワード検索を開く"
              title="SEARCH LYRICS / MCS"
              className={`p-1.5 rounded border transition-colors cursor-pointer ${
                isSearchOpen || searchQuery
                  ? 'bg-[#FFFFFF] text-[#0A0A0A] border-[#FFFFFF]'
                  : 'bg-[#121212] text-[#8E8E93] border-[#262628] hover:text-[#FFFFFF]'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsSubmitOpen(true)}
              aria-label="お気に入りのYouTubeバトルを登録"
              className="px-2.5 sm:px-3 py-1.5 rounded bg-[#FFFFFF] hover:bg-[#E5E5EA] text-[#0A0A0A] font-jp text-xs font-black tracking-tight flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>バトル登録</span>
            </button>

            <button
              onClick={() =>
                setViewMode((prev) => (prev === 'ALBUMS' ? 'LATEST' : 'ALBUMS'))
              }
              aria-label="マイアルバムを開く"
              className={`px-2.5 py-1.5 rounded border font-jp text-xs font-bold tracking-tight flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === 'ALBUMS'
                  ? 'bg-[#E50914] text-[#FFFFFF] border-[#E50914]'
                  : 'bg-[#121212] text-[#FFFFFF] border-[#262628] hover:border-[#FFFFFF]'
              }`}
            >
              <Disc3 className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">アルバム</span>
              <span className="text-[10px] font-mono-tech opacity-85">
                ({albums.length})
              </span>
            </button>

            <button
              onClick={() => setIsDbModalOpen(true)}
              aria-label="データベース・クラウド設定"
              title="DATABASE & SUPABASE CLOUD SYNC"
              className="px-2 py-1.5 rounded bg-[#121212] hover:bg-[#1A1A1C] text-[#FFFFFF] border border-[#262628] font-mono-tech text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isCloudConnected ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <Database className="w-3.5 h-3.5" />
              <span className="hidden md:inline">DB</span>
            </button>

            <button
              onClick={() => setIsInsightsOpen(true)}
              aria-label="アナリティクスインサイトを開く"
              className="px-2 py-1.5 rounded bg-[#121212] hover:bg-[#1A1A1C] text-[#FFFFFF] border border-[#262628] font-mono-tech text-xs font-bold tracking-tight flex items-center gap-1 transition-colors cursor-pointer"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">INSIGHTS</span>
            </button>

            <button
              onClick={() => handleToggleOnboarding(!isOnboardingOpen)}
              aria-label="使い方ガイドを表示"
              title="1VERCEの使い方ガイド"
              className={`px-2 py-1.5 rounded border font-jp text-xs font-bold tracking-tight flex items-center gap-1 transition-colors cursor-pointer ${
                isOnboardingOpen
                  ? 'bg-[#FFFFFF] text-[#0A0A0A] border-[#FFFFFF]'
                  : 'bg-[#121212] text-[#FFFFFF] border-[#262628] hover:border-[#FFFFFF]'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#E50914]" />
              <span className="hidden sm:inline">使い方</span>
            </button>

            <button
              onClick={() => {
                if (viewMode === 'ALBUMS') setViewMode('LATEST');
                setShowSavedOnly((prev) => !prev);
              }}
              aria-label={
                showSavedOnly
                  ? '保存済みフィルターを解除'
                  : '保存したバトルのみ表示'
              }
              className={`px-2 py-1.5 rounded border font-mono-tech text-xs font-bold tracking-tight flex items-center gap-1 transition-colors cursor-pointer ${
                showSavedOnly
                  ? 'bg-[#FFFFFF] text-[#0A0A0A] border-[#FFFFFF]'
                  : 'bg-[#121212] text-[#8E8E93] border-[#262628] hover:text-[#FFFFFF]'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
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
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="MC名・大会名・刻印されたパンチラインで自由検索..."
                className="flex-1 bg-transparent text-xs sm:text-sm font-jp text-[#FFFFFF] placeholder:text-[#48484A] outline-none"
                autoFocus
              />
              {searchQuery && (
                <button
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

      {/* 2. Interactive "VS BUILDER" (Zero-typing Cross Filter Bar) */}
      <VsBuilder
        battles={battles}
        selectedMcA={selectedMcA}
        selectedMcB={selectedMcB}
        selectedTournament={selectedTournament}
        onSelectMcA={handleSelectMcA}
        onSelectMcB={handleSelectMcB}
        onSelectTournament={handleSelectTournament}
        onSelectMatchup={handleSelectMatchup}
        onResetAll={handleResetFilters}
      />

      {/* Main Content Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-3 sm:px-4 py-4 space-y-4">
        {/* Interactive Onboarding Guide for First-Time & Returning Users */}
        <OnboardingBanner
          isOpen={isOnboardingOpen}
          onClose={() => handleToggleOnboarding(false)}
          hasStampedOrLiked={
            totalStampsCount > 0 ||
            Object.values(userLikedVerses).some(Boolean)
          }
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

        {/* Participatory Quick Hub & Recent Freshness Ticker */}
        <div className="bg-[#121214] border border-[#242428] rounded-md p-3 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-jp">
              <Sparkles className="w-4 h-4 text-[#E50914] shrink-0" />
              <span className="font-bold text-[#FFFFFF]">
                参加して育てるアーカイブ:
              </span>
              <span className="text-[#8E8E93]">
                再生中の<strong className="text-[#FFFFFF]">1タップ・パンチライン刻印（重複時は自動で🔥いいね！合算）</strong>・
                <strong className="text-[#FFFFFF]">マイアルバム連続再生</strong>・
                <strong className="text-[#FFFFFF]">YouTube登録</strong>が可能
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {!isOnboardingOpen && (
                <button
                  type="button"
                  onClick={() => handleToggleOnboarding(true)}
                  className="px-2 py-1 rounded bg-[#1C1C20] hover:bg-[#26262C] text-[#E5E5EA] border border-[#2C2C2E] text-[11px] font-jp font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <HelpCircle className="w-3 h-3 text-[#E50914]" />
                  <span>使い方ガイド</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsSubmitOpen(true)}
                className="px-2.5 py-1 rounded bg-[#1C1C20] hover:bg-[#FFFFFF] text-[#FFFFFF] hover:text-[#0A0A0A] border border-[#2C2C2E] text-[11px] font-jp font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>YouTube登録</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('ALBUMS')}
                className="px-2.5 py-1 rounded bg-[#1C1C20] hover:bg-[#FFFFFF] text-[#FFFFFF] hover:text-[#0A0A0A] border border-[#2C2C2E] text-[11px] font-jp font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Disc3 className="w-3 h-3 text-[#E50914]" />
                <span>マイアルバムをつくる</span>
              </button>
            </div>
          </div>

          {/* Live Freshness Activity Feed (shows latest stamps / registrations) */}
          {activities.length > 0 && (
            <div className="pt-2 border-t border-[#1E1E22] flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="px-1.5 py-0.5 rounded bg-[#E50914]/20 border border-[#E50914]/40 text-[#FF6B6B] font-mono-tech text-[10px] font-bold shrink-0">
                FRESH LOG
              </span>
              {activities.slice(0, 4).map((act) => (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => {
                    if (act.battleId) {
                      handleJumpToBattleAndVerse(
                        act.battleId,
                        act.seconds || 0
                      );
                    } else if (act.albumId) {
                      setViewMode('ALBUMS');
                    }
                  }}
                  className="px-2 py-0.5 rounded bg-[#18181C] hover:bg-[#242429] border border-[#26262A] text-[11px] font-jp text-[#E5E5EA] truncate max-w-xs shrink-0 cursor-pointer transition-colors"
                >
                  {act.summary}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Deep Link Active Notification Banner */}
        {deepLinkBanner && (
          <div className="bg-[#1A1A1A] border border-[#E50914] rounded px-3 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-mono-tech">
              <span className="w-2 h-2 rounded-full bg-[#E50914] animate-live-dot" />
              <span className="font-bold text-[#FFFFFF]">
                SELECTED MATCH SEEK: [{formatTimestamp(deepLinkBanner.seconds)}]
              </span>
            </div>
            <button
              onClick={() => setDeepLinkBanner(null)}
              className="text-[11px] font-mono-tech text-[#8E8E93] hover:text-[#FFFFFF] cursor-pointer"
            >
              DISMISS
            </button>
          </div>
        )}

        {/* 3. View Mode Switcher */}
        <div className="flex items-center justify-between gap-2 border-b border-[#1F1F21] pb-2.5 flex-wrap">
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
            {(
              [
                { id: 'LATEST', label: '全バトル一覧' },
                { id: 'FRESH', label: '⚡ 新着刻印・更新順' },
                {
                  id: 'ALBUMS',
                  label: `💿 マイアルバム (${albums.length})`,
                },
                {
                  id: 'ARCHIVE',
                  label: `🔥 パンチライン一覧 (${totalStampsCount})`,
                },
                { id: 'HALL_OF_FAME', label: '人気再生順' },
              ] as const
            ).map((tab) => {
              const active = viewMode === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setViewMode(tab.id)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded text-xs font-jp tracking-wide transition-all cursor-pointer ${
                    active
                      ? 'bg-[#FFFFFF] text-[#0A0A0A] font-black'
                      : 'bg-[#121212] text-[#8E8E93] hover:text-[#FFFFFF] border border-[#222224] font-bold'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {viewMode !== 'ALBUMS' && (
            <div className="text-xs font-mono-tech text-[#8E8E93] shrink-0">
              <span className="text-[#FFFFFF] font-bold">
                {filteredBattles.length}
              </span>{' '}
              {filteredBattles.length === 1 ? 'MATCH' : 'MATCHES'}
            </div>
          )}
        </div>

        {/* 4. Main View Body */}
        {viewMode === 'ALBUMS' ? (
          <AlbumView
            albums={albums}
            battles={battles}
            onCreateAlbum={handleCreateAlbum}
            onUpdateAlbumMeta={handleUpdateAlbumMeta}
            onDeleteAlbum={handleDeleteAlbum}
            onAddTrackToAlbum={handleAddTrackToAlbum}
            onRemoveTrackFromAlbum={handleRemoveTrackFromAlbumById}
            onMoveTrack={handleMoveTrack}
            onRecordAlbumPlay={handleRecordAlbumPlay}
          />
        ) : filteredBattles.length === 0 ? (
          <div className="bg-[#121212] border border-[#222224] rounded-md p-10 text-center space-y-3">
            <div className="font-jp text-sm font-bold text-[#8E8E93]">
              条件に一致するバトルが見つかりませんでした
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#FFFFFF] text-[#0A0A0A] font-jp text-xs font-black cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>フィルターをリセット</span>
              </button>
              <button
                onClick={() => setIsSubmitOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#1C1C20] text-[#FFFFFF] border border-[#2C2C2E] font-jp text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>このバトルのYouTubeを登録する</span>
              </button>
            </div>
          </div>
        ) : viewMode === 'ARCHIVE' ? (
          <ArchiveView
            battles={filteredBattles}
            userLikedVerses={userLikedVerses}
            onJumpToBattleVerse={handleJumpToBattleAndVerse}
            onLikeVerse={handleLikeVerse}
            onOpenShare={(battle, verse) => setShareTarget({ battle, verse })}
            onOpenAlbumPicker={(battle, startSeconds, note) =>
              setAlbumPickerTarget({ battle, startSeconds, note })
            }
          />
        ) : (
          <div className="space-y-5">
            {filteredBattles.slice(0, displayLimit).map((battle) => (
              <BattleCard
                key={battle.id}
                battle={battle}
                isPlaying={activeBattleId === battle.id}
                seekSeconds={
                  activeBattleId === battle.id ? seekSeconds : 0
                }
                seekNonce={activeBattleId === battle.id ? seekNonce : 0}
                activeVerseId={
                  activeBattleId === battle.id ? activeVerseId : null
                }
                isSaved={savedIds.includes(battle.id)}
                albumCountForBattle={albumCountByBattleId.get(battle.id) || 0}
                userLikedVerses={userLikedVerses}
                highlightedMc={selectedMcA}
                onStartPlay={handleStartPlay}
                onStopPlay={handleStopPlay}
                onStampPunchline={handleStampPunchline}
                onUpdateVerse={handleUpdateVerse}
                onDeleteVerse={handleDeleteVerse}
                onLikeVerse={handleLikeVerse}
                onToggleSave={handleToggleSave}
                onOpenShare={(b, v) => setShareTarget({ battle: b, verse: v })}
                onOpenAlbumPicker={(b, startSeconds, note) =>
                  setAlbumPickerTarget({ battle: b, startSeconds, note })
                }
                onSelectMcFilter={handleSelectMcA}
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
                    ({Math.min(displayLimit, filteredBattles.length)} / {filteredBattles.length})
                  </span>
                </button>
                <p className="text-[11px] font-mono-tech text-[#8E8E93]">
                  残りのバトル: {filteredBattles.length - displayLimit}件
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-[#1A1A1C] py-6 mt-10 bg-[#0A0A0A]">
        <div className="max-w-3xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono-tech text-[#48484A]">
          <div className="flex items-center gap-2">
            <span className="text-[#FFFFFF] font-bold">1verce</span> //
            PARTICIPATORY MC BATTLE ARCHIVE & MIXTAPE ENGINE
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDbModalOpen(true)}
              className="hover:text-[#FFFFFF] cursor-pointer flex items-center gap-1"
            >
              <Flame className="w-3 h-3 text-[#E50914]" />
              <span>
                {isCloudConnected
                  ? 'CLOUD DB CONNECTED'
                  : 'LOCAL DB + SUPABASE READY'}
              </span>
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {isSubmitOpen && (
        <SubmitModal
          battles={battles}
          albums={albums}
          onClose={() => setIsSubmitOpen(false)}
          onAddBattle={handleAddBattle}
          onJumpToExistingBattle={(battleId) =>
            handleJumpToBattleAndVerse(battleId, 0)
          }
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
          onRemoveTrackFromAlbum={handleRemoveTrackFromAlbumByBattle}
          onCreateAlbumWithTrack={handleCreateAlbumWithTrack}
        />
      )}

      {shareTarget && (
        <ShareModal
          battle={shareTarget.battle}
          initialVerse={shareTarget.verse}
          onClose={() => setShareTarget(null)}
          onRecordShare={handleRecordShare}
        />
      )}

      {isInsightsOpen && (
        <InsightsModal
          analytics={analytics}
          battles={battles}
          onClose={() => setIsInsightsOpen(false)}
          onJumpToVerse={handleJumpToBattleAndVerse}
        />
      )}

      {isDbModalOpen && (
        <DatabaseModal
          battles={battles}
          albums={albums}
          activities={activities}
          analytics={analytics}
          onClose={() => setIsDbModalOpen(false)}
          onCloudStatusChange={setIsCloudConnected}
          onRestoreBackup={(data) => {
            if (data.battles) setBattles(data.battles);
            if (data.albums) setAlbums(data.albums);
            if (data.activities) setActivities(data.activities);
            if (data.analytics) setAnalytics(data.analytics);
          }}
        />
      )}
    </div>
  );
};

export default App;

