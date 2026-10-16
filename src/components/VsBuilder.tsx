import React, { useMemo, useState } from 'react';
import {
  X,
  Crosshair,
  RotateCcw,
  Search,
  LayoutGrid,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Flame,
  Trophy,
} from 'lucide-react';
import { Battle, TournamentTag } from '../types';
import { MC_PROFILES, TOURNAMENTS } from '../data/initialData';
import { isSameMc, normalizeMcName, matchesMcQuery } from '../utils/youtube';
import { McAvatar } from './McAvatar';

interface VsBuilderProps {
  battles: Battle[];
  selectedMcA: string | null;
  selectedMcB: string | null;
  selectedTournament: TournamentTag;
  onSelectMcA: (mc: string | null) => void;
  onSelectMcB: (mc: string | null) => void;
  onSelectTournament: (t: TournamentTag) => void;
  onSelectMatchup?: (mcA: string, mcB: string) => void;
  onResetAll: () => void;
}

interface EnrichedMc {
  name: string;
  enName: string;
  styleTag: string;
  avatarUrl?: string;
  repYoutubeId: string;
  focalPosition: string;
  battleCount: number; // Count within selectedTournament
  totalBattleCount: number; // Count across ALL tournaments
}

export const VsBuilder: React.FC<VsBuilderProps> = ({
  battles,
  selectedMcA,
  selectedMcB,
  selectedTournament,
  onSelectMcA,
  onSelectMcB,
  onSelectTournament,
  onSelectMatchup,
  onResetAll,
}) => {
  const [mcSearchQuery, setMcSearchQuery] = useState('');
  const [isGridExpanded, setIsGridExpanded] = useState(false);
  const [sortMode, setSortMode] = useState<'COUNT' | 'NAME'>('COUNT');

  // 1. Battles scoped to the currently selected tournament
  const scopedBattles = useMemo(() => {
    if (selectedTournament === 'ALL') return battles;
    return battles.filter((b) => b.tournament === selectedTournament);
  }, [battles, selectedTournament]);

  // 2. Tournament counts (both total and for currently selected MC(s))
  const tournamentStats = useMemo(() => {
    const stats: Record<
      TournamentTag,
      { total: number; mcMatches: number }
    > = {
      ALL: { total: battles.length, mcMatches: 0 },
      戦極: { total: 0, mcMatches: 0 },
      凱旋: { total: 0, mcMatches: 0 },
      UMB: { total: 0, mcMatches: 0 },
      KOK: { total: 0, mcMatches: 0 },
      ADRENALINE: { total: 0, mcMatches: 0 },
      FSL: { total: 0, mcMatches: 0 },
      高校生RAP選手権: { total: 0, mcMatches: 0 },
    };

    for (const b of battles) {
      if (stats[b.tournament]) {
        stats[b.tournament].total += 1;
      }

      if (selectedMcA) {
        const matchesMc = selectedMcB
          ? (isSameMc(b.mcA, selectedMcA) && isSameMc(b.mcB, selectedMcB)) ||
            (isSameMc(b.mcA, selectedMcB) && isSameMc(b.mcB, selectedMcA))
          : isSameMc(b.mcA, selectedMcA) || isSameMc(b.mcB, selectedMcA);

        if (matchesMc) {
          stats.ALL.mcMatches += 1;
          if (stats[b.tournament]) {
            stats[b.tournament].mcMatches += 1;
          }
        }
      }
    }

    return stats;
  }, [battles, selectedMcA, selectedMcB]);

  // 3. Build complete MC catalog with both scoped (tournament) count and global count
  const allMcsCatalog = useMemo(() => {
    const map = new Map<string, EnrichedMc>();

    for (const p of MC_PROFILES) {
      map.set(normalizeMcName(p.name).toLowerCase(), {
        name: p.name,
        enName: p.enName,
        styleTag: p.styleTag,
        avatarUrl: p.avatarUrl,
        repYoutubeId: p.repYoutubeId,
        focalPosition: p.focalPosition,
        battleCount: 0,
        totalBattleCount: 0,
      });
    }

    // Count global battles first
    for (const b of battles) {
      const pairs: Array<[string, string | undefined, string]> = [
        [b.mcA, b.mcAFocal, '22% 30%'],
        [b.mcB, b.mcBFocal, '78% 30%'],
      ];

      for (const [rawMc, focal, defaultFocal] of pairs) {
        const normName = normalizeMcName(rawMc);
        const key = normName.toLowerCase();
        if (map.has(key)) {
          map.get(key)!.totalBattleCount += 1;
        } else {
          const found = MC_PROFILES.find((p) => isSameMc(p.name, rawMc));
          map.set(key, {
            name: found?.name || normName,
            enName: found?.enName || normName.toUpperCase(),
            styleTag: found?.styleTag || `${b.tournament} MC`,
            avatarUrl: found?.avatarUrl,
            repYoutubeId: found?.repYoutubeId || b.youtubeId,
            focalPosition: found?.focalPosition || focal || defaultFocal,
            battleCount: 0,
            totalBattleCount: 1,
          });
        }
      }
    }

    // Count battles within selectedTournament
    for (const b of scopedBattles) {
      const keyA = normalizeMcName(b.mcA).toLowerCase();
      const keyB = normalizeMcName(b.mcB).toLowerCase();
      if (map.has(keyA)) map.get(keyA)!.battleCount += 1;
      if (map.has(keyB)) map.get(keyB)!.battleCount += 1;
    }

    return Array.from(map.values()).filter((m) => Boolean(m.avatarUrl) && m.totalBattleCount >= 5);
  }, [battles, scopedBattles]);

  // 4. MCs participating in the currently selected tournament
  const tournamentMcs = useMemo(() => {
    const active = allMcsCatalog.filter((m) => m.battleCount > 0);
    return [...active].sort((a, b) => {
      if (sortMode === 'NAME') {
        return a.name.localeCompare(b.name, 'ja');
      }
      if (b.battleCount !== a.battleCount) {
        return b.battleCount - a.battleCount;
      }
      return b.totalBattleCount - a.totalBattleCount;
    });
  }, [allMcsCatalog, sortMode]);

  // 5. Filtered MCs by search query
  const filteredMcs = useMemo(() => {
    if (!mcSearchQuery.trim()) return tournamentMcs;
    return tournamentMcs.filter((mc) =>
      matchesMcQuery(mc.name, mcSearchQuery, mc.enName, mc.styleTag)
    );
  }, [tournamentMcs, mcSearchQuery]);

  // Check if search query matches MCs in ALL tournaments when current tournament has 0 matches
  const globalSearchFallbackCount = useMemo(() => {
    if (selectedTournament === 'ALL' || !mcSearchQuery.trim()) return 0;
    return allMcsCatalog.filter((mc) =>
      matchesMcQuery(mc.name, mcSearchQuery, mc.enName, mc.styleTag)
    ).length;
  }, [allMcsCatalog, selectedTournament, mcSearchQuery]);

  // 6. Dynamic Opponent Filter (2nd Row): Scoped to selectedTournament
  const availableOpponents = useMemo(() => {
    if (!selectedMcA) return [];
    const oppMap = new Map<
      string,
      {
        name: string;
        enName: string;
        avatarUrl?: string;
        repYoutubeId: string;
        focalPosition: string;
        matchCount: number;
      }
    >();

    for (const b of scopedBattles) {
      let oppName: string | null = null;
      let oppFocal = '78% 30%';
      if (isSameMc(b.mcA, selectedMcA)) {
        oppName = normalizeMcName(b.mcB);
        oppFocal = b.mcBFocal || '78% 30%';
      } else if (isSameMc(b.mcB, selectedMcA)) {
        oppName = normalizeMcName(b.mcA);
        oppFocal = b.mcAFocal || '22% 30%';
      }

      if (oppName) {
        const key = oppName.toLowerCase();
        if (oppMap.has(key)) {
          oppMap.get(key)!.matchCount += 1;
        } else {
          const baseMc = allMcsCatalog.find((m) => isSameMc(m.name, oppName!));
          const profile = MC_PROFILES.find((p) => isSameMc(p.name, oppName!));
          oppMap.set(key, {
            name: baseMc ? baseMc.name : oppName,
            enName: baseMc?.enName || profile?.enName || oppName,
            avatarUrl: baseMc?.avatarUrl || profile?.avatarUrl,
            repYoutubeId:
              baseMc?.repYoutubeId || profile?.repYoutubeId || b.youtubeId,
            focalPosition:
              baseMc?.focalPosition || profile?.focalPosition || oppFocal,
            matchCount: 1,
          });
        }
      }
    }

    const list = Array.from(oppMap.values()).sort(
      (a, b) => b.matchCount - a.matchCount
    );

    if (!mcSearchQuery.trim()) return list;
    // When user types a search query while MC A is selected, prioritize matching opponents
    const matching = list.filter((opp) =>
      matchesMcQuery(opp.name, mcSearchQuery, opp.enName)
    );
    return matching.length > 0 ? matching : list;
  }, [scopedBattles, selectedMcA, allMcsCatalog, mcSearchQuery]);

  // Count how many opponents selectedMcA has across ALL tournaments (to show "see all tournaments" helper)
  const globalOpponentCount = useMemo(() => {
    if (!selectedMcA || selectedTournament === 'ALL') return 0;
    const set = new Set<string>();
    for (const b of battles) {
      if (isSameMc(b.mcA, selectedMcA)) {
        set.add(normalizeMcName(b.mcB).toLowerCase());
      } else if (isSameMc(b.mcB, selectedMcA)) {
        set.add(normalizeMcName(b.mcA).toLowerCase());
      }
    }
    return set.size;
  }, [battles, selectedMcA, selectedTournament]);

  // 7. Featured / Popular Matchups in the current tournament
  const featuredMatchups = useMemo(() => {
    const pairMap = new Map<
      string,
      { mcA: string; mcB: string; count: number; totalScore: number }
    >();

    for (const b of scopedBattles) {
      const normA = normalizeMcName(b.mcA);
      const normB = normalizeMcName(b.mcB);
      const [first, second] =
        normA.localeCompare(normB, 'ja') <= 0 ? [normA, normB] : [normB, normA];
      const key = `${first.toLowerCase()}__${second.toLowerCase()}`;
      const score =
        b.evaluation.word +
        b.evaluation.flow +
        b.evaluation.vibe +
        b.verses.length;
      if (pairMap.has(key)) {
        const item = pairMap.get(key)!;
        item.count += 1;
        item.totalScore += score;
      } else {
        pairMap.set(key, {
          mcA: first,
          mcB: second,
          count: 1,
          totalScore: score,
        });
      }
    }

    return Array.from(pairMap.values())
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return b.totalScore - a.totalScore;
      })
      .slice(0, 6);
  }, [scopedBattles]);

  const hasActiveFilter =
    Boolean(selectedMcA) ||
    Boolean(selectedMcB) ||
    selectedTournament !== 'ALL' ||
    Boolean(mcSearchQuery.trim());

  const showGrid = isGridExpanded || Boolean(mcSearchQuery.trim());

  return (
    <section
      aria-label="VS BUILDER"
      className="border-b border-[#1F1F1F] bg-[#0A0A0A]/95 backdrop-blur-md sticky top-14 z-30"
    >
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-3 space-y-2.5">
        {/* STEP 1: Tournament Filter Bar (Top Hierarchy: Filters MCs & Battles) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono-tech tracking-wider text-[#8E8E93]">
            <div className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-[#FFFFFF]" />
              <span className="font-bold text-[#FFFFFF]">1. TOURNAMENT</span>
              <span className="text-[10px] font-jp text-[#8E8E93]">
                {selectedTournament === 'ALL'
                  ? `全大会 (${tournamentMcs.length}名のMC)`
                  : `${selectedTournament} 出場MCに絞り込み中 (${tournamentMcs.length}名)`}
              </span>
            </div>

            {hasActiveFilter && (
              <button
                onClick={() => {
                  setMcSearchQuery('');
                  onResetAll();
                }}
                className="flex items-center gap-1 text-[11px] font-mono-tech text-[#E50914] hover:text-[#FFFFFF] bg-[#E50914]/10 hover:bg-[#E50914]/20 border border-[#E50914]/30 px-2 py-0.5 rounded transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>全解除 (CLEAR)</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {TOURNAMENTS.map((tag) => {
              const active = selectedTournament === tag;
              const stat = tournamentStats[tag];
              const displayCount = selectedMcA ? stat.mcMatches : stat.total;
              const isZeroForSelectedMc = Boolean(
                selectedMcA && stat.mcMatches === 0 && tag !== 'ALL'
              );

              return (
                <button
                  key={tag}
                  onClick={() =>
                    onSelectTournament(active && tag !== 'ALL' ? 'ALL' : tag)
                  }
                  title={
                    isZeroForSelectedMc
                      ? `${selectedMcA}はこの大会の記録がありません（クリックで${tag}全体の表示へ切替）`
                      : `${tag} (${displayCount}試合)`
                  }
                  className={`px-2.5 py-1 rounded text-xs font-jp tracking-tight shrink-0 transition-all cursor-pointer border flex items-center gap-1.5 ${
                    active
                      ? 'bg-[#FFFFFF] text-[#0A0A0A] border-[#FFFFFF] font-black shadow-sm'
                      : isZeroForSelectedMc
                      ? 'bg-[#0F0F10] text-[#48484A] border-[#1C1C1E] hover:text-[#8E8E93] hover:border-[#2C2C2E] font-medium'
                      : 'bg-[#121212] text-[#8E8E93] border-[#222224] hover:text-[#FFFFFF] hover:border-[#48484A] font-medium'
                  }`}
                >
                  <span>{tag === 'ALL' ? 'すべて (ALL)' : tag}</span>
                  <span
                    className={`text-[10px] font-mono-tech px-1 rounded ${
                      active
                        ? 'bg-[#0A0A0A]/15 text-[#0A0A0A] font-extrabold'
                        : isZeroForSelectedMc
                        ? 'text-[#3A3A3C]'
                        : 'bg-[#1C1C1E] text-[#8E8E93]'
                    }`}
                  >
                    {displayCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* STEP 2: MC Search & Interactive VS Matchup Header */}
        <div className="pt-1 border-t border-[#18181A] space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            {/* Left: VS Builder Status & Active Matchup Slots */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-[11px] font-mono-tech tracking-wider text-[#FFFFFF]">
                <Crosshair className="w-3.5 h-3.5 text-[#E50914]" />
                <span className="font-bold">2. MC SELECT</span>
              </div>

              {selectedMcA ? (
                <div className="flex items-center gap-1.5 text-xs">
                  {/* Slot 1: Selected MC A */}
                  <div className="inline-flex items-center gap-1 bg-[#FFFFFF] text-[#0A0A0A] px-2 py-0.5 rounded font-jp font-black">
                    <span>{selectedMcA}</span>
                    <button
                      onClick={() => {
                        if (selectedMcB) {
                          onSelectMcA(selectedMcB);
                        } else {
                          onSelectMcA(null);
                        }
                      }}
                      title={`${selectedMcA}の選択を解除`}
                      className="hover:bg-black/15 rounded p-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="font-display text-[#E50914] font-black text-xs">
                    VS
                  </span>

                  {/* Slot 2: Selected MC B or Prompt */}
                  {selectedMcB ? (
                    <div className="inline-flex items-center gap-1 bg-[#E50914] text-[#FFFFFF] px-2 py-0.5 rounded font-jp font-black">
                      <span>{selectedMcB}</span>
                      <button
                        onClick={() => onSelectMcB(null)}
                        title={`${selectedMcB}の選択を解除`}
                        className="hover:bg-black/25 rounded p-0.5 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] font-jp text-[#8E8E93] bg-[#141416] border border-dashed border-[#2C2C2E] px-2 py-0.5 rounded">
                      対戦相手を選択 ({availableOpponents.length}名)
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-[11px] font-jp text-[#8E8E93]">
                  MCをタップして対戦カード・試合を絞り込み
                </span>
              )}
            </div>

            {/* Right: Free MC Search Input + Sort + Grid Expand Toggle */}
            <div className="flex items-center gap-1.5">
              {/* Inline MC Search Box */}
              <div className="relative flex-1 sm:w-52">
                <Search className="w-3.5 h-3.5 text-[#8E8E93] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={mcSearchQuery}
                  onChange={(e) => setMcSearchQuery(e.target.value)}
                  placeholder="MC名を検索 (例: 呂布, R-指定, むかで)..."
                  className="w-full bg-[#121212] focus:bg-[#161618] text-xs font-jp text-[#FFFFFF] placeholder:text-[#525255] pl-7 pr-6 py-1.5 rounded border border-[#262628] focus:border-[#FFFFFF] outline-none transition-colors"
                />
                {mcSearchQuery && (
                  <button
                    onClick={() => setMcSearchQuery('')}
                    title="検索クリア"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-[#8E8E93] hover:text-[#FFFFFF] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sort Toggle Button */}
              <button
                onClick={() =>
                  setSortMode((prev) => (prev === 'COUNT' ? 'NAME' : 'COUNT'))
                }
                title="MCの並び順を切り替え"
                className="px-2 py-1.5 rounded bg-[#121212] hover:bg-[#1A1A1C] text-[#8E8E93] hover:text-[#FFFFFF] border border-[#262628] text-[11px] font-jp font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
              >
                <ArrowUpDown className="w-3 h-3" />
                <span>{sortMode === 'COUNT' ? '試合数順' : '名前順'}</span>
              </button>

              {/* Expand All MCs Grid Toggle */}
              <button
                onClick={() => setIsGridExpanded((prev) => !prev)}
                className={`px-2.5 py-1.5 rounded border text-[11px] font-jp font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer ${
                  showGrid
                    ? 'bg-[#FFFFFF] text-[#0A0A0A] border-[#FFFFFF]'
                    : 'bg-[#121212] text-[#FFFFFF] border-[#262628] hover:border-[#8E8E93]'
                }`}
              >
                <LayoutGrid className="w-3 h-3" />
                <span>
                  {showGrid ? '閉じる' : `一覧 (${filteredMcs.length})`}
                </span>
                {showGrid ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>

          {/* MC Selector Area: Either Expanded Multi-Column Grid OR Horizontal Strip */}
          {filteredMcs.length === 0 ? (
            <div className="bg-[#121212] border border-[#242426] rounded px-3 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-jp text-[#8E8E93]">
              <div>
                {selectedTournament !== 'ALL' ? (
                  <span>
                    「<strong className="text-[#FFFFFF]">{selectedTournament}</strong>
                    」の出場MCに「
                    <strong className="text-[#FFFFFF]">{mcSearchQuery}</strong>
                    」は見つかりませんでした
                    {globalSearchFallbackCount > 0 &&
                      `（全大会では ${globalSearchFallbackCount}名 該当）`}
                  </span>
                ) : (
                  <span>
                    「<strong className="text-[#FFFFFF]">{mcSearchQuery}</strong>
                    」に一致するMCが見つかりません
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {selectedTournament !== 'ALL' && globalSearchFallbackCount > 0 && (
                  <button
                    onClick={() => onSelectTournament('ALL')}
                    className="px-2.5 py-1 rounded bg-[#FFFFFF] text-[#0A0A0A] font-bold text-xs cursor-pointer"
                  >
                    全大会 (ALL) で表示する
                  </button>
                )}
                {mcSearchQuery && (
                  <button
                    onClick={() => setMcSearchQuery('')}
                    className="px-2.5 py-1 rounded bg-[#1F1F22] text-[#FFFFFF] hover:bg-[#2C2C2E] text-xs cursor-pointer"
                  >
                    検索をクリア
                  </button>
                )}
              </div>
            </div>
          ) : showGrid ? (
            /* Expanded Multi-Column Grid View for Fast Browsing & Search Results */
            <div className="bg-[#101012] border border-[#242426] rounded-md p-2.5 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-jp text-[#8E8E93] px-1">
                <span>
                  {selectedTournament === 'ALL'
                    ? '全大会の出場MC一覧'
                    : `${selectedTournament} 出場MC一覧`}{' '}
                  ({filteredMcs.length}名)
                  {selectedMcA &&
                    ' — クリックでメインMC切替、または「VS」ボタンで対戦相手に指定'}
                </span>
                {mcSearchQuery && (
                  <span className="text-[#FFFFFF] font-bold">
                    検索結果: {filteredMcs.length}名
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-60 overflow-y-auto pr-1">
                {filteredMcs.map((mc) => {
                  const isSelectedA = Boolean(
                    selectedMcA && isSameMc(selectedMcA, mc.name)
                  );
                  const isSelectedB = Boolean(
                    selectedMcB && isSameMc(selectedMcB, mc.name)
                  );
                  const oppEntry = selectedMcA
                    ? availableOpponents.find((o) => isSameMc(o.name, mc.name))
                    : undefined;

                  return (
                    <div
                      key={mc.name}
                      className={`group flex items-center justify-between gap-1.5 p-1.5 rounded border transition-all ${
                        isSelectedA
                          ? 'bg-[#FFFFFF] text-[#0A0A0A] border-[#FFFFFF]'
                          : isSelectedB
                          ? 'bg-[#E50914]/20 text-[#FFFFFF] border-[#E50914]'
                          : 'bg-[#161618] hover:bg-[#1E1E22] text-[#FFFFFF] border-[#262628]'
                      }`}
                    >
                      <button
                        onClick={() => {
                          if (isSelectedA) {
                            onSelectMcA(null);
                          } else {
                            onSelectMcA(mc.name);
                          }
                        }}
                        className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <McAvatar
                          mcName={mc.name}
                          fallbackYoutubeId={mc.repYoutubeId}
                          fallbackFocal={mc.focalPosition}
                          size="sm"
                          selected={isSelectedA || isSelectedB}
                          isOpponent={isSelectedB}
                        />
                        <div className="min-w-0 flex-1">
                          <div
                            className={`text-xs font-jp truncate ${
                              isSelectedA
                                ? 'font-black text-[#0A0A0A]'
                                : 'font-bold text-[#FFFFFF]'
                            }`}
                          >
                            {mc.name}
                          </div>
                          <div
                            className={`text-[10px] font-mono-tech truncate ${
                              isSelectedA
                                ? 'text-[#0A0A0A]/75 font-bold'
                                : 'text-[#8E8E93]'
                            }`}
                          >
                            {mc.battleCount}戦
                            {selectedTournament !== 'ALL' &&
                              ` / 全${mc.totalBattleCount}戦`}
                          </div>
                        </div>
                      </button>

                      {/* Quick "VS" action button if selectedMcA is active and this MC is an opponent */}
                      {oppEntry && !isSelectedA && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectMcB(isSelectedB ? null : mc.name);
                          }}
                          title={`${selectedMcA} vs ${mc.name} (${oppEntry.matchCount}戦) を表示`}
                          className={`px-1.5 py-1 rounded text-[10px] font-mono-tech font-extrabold shrink-0 cursor-pointer transition-colors ${
                            isSelectedB
                              ? 'bg-[#E50914] text-[#FFFFFF]'
                              : 'bg-[#262628] hover:bg-[#E50914] text-[#FFFFFF]'
                          }`}
                        >
                          VS ({oppEntry.matchCount})
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Compact Horizontal Avatar Strip */
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
              {filteredMcs.map((mc) => {
                const isSelected = Boolean(
                  selectedMcA && isSameMc(selectedMcA, mc.name)
                );
                return (
                  <button
                    key={mc.name}
                    onClick={() => {
                      if (isSelected) {
                        onSelectMcA(null);
                      } else {
                        onSelectMcA(mc.name);
                      }
                    }}
                    className={`group flex flex-col items-center gap-1.5 shrink-0 cursor-pointer transition-opacity ${
                      selectedMcA && !isSelected
                        ? 'opacity-55 hover:opacity-95'
                        : 'opacity-100'
                    }`}
                  >
                    <div className="relative">
                      <McAvatar
                        mcName={mc.name}
                        fallbackYoutubeId={mc.repYoutubeId}
                        fallbackFocal={mc.focalPosition}
                        size="md"
                        selected={isSelected}
                      />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 px-1 min-w-[18px] h-[16px] rounded text-[10px] font-mono-tech font-bold flex items-center justify-center border ${
                          isSelected
                            ? 'bg-[#FFFFFF] text-[#0A0A0A] border-[#0A0A0A]'
                            : 'bg-[#121212] text-[#8E8E93] border-[#2C2C2E]'
                        }`}
                      >
                        {mc.battleCount}
                      </span>
                    </div>
                    <span
                      className={`text-[11px] font-jp tracking-tight max-w-[68px] truncate ${
                        isSelected
                          ? 'font-black text-[#FFFFFF]'
                          : 'font-medium text-[#8E8E93] group-hover:text-[#FFFFFF]'
                      }`}
                    >
                      {mc.name}
                    </span>
                  </button>
                );
              })}

              {/* End-of-strip button to open full grid */}
              {filteredMcs.length > 8 && (
                <button
                  onClick={() => setIsGridExpanded(true)}
                  className="flex flex-col items-center justify-center gap-1.5 shrink-0 w-16 h-[74px] rounded-md bg-[#121212] hover:bg-[#1A1A1C] border border-dashed border-[#2C2C2E] hover:border-[#8E8E93] text-[#8E8E93] hover:text-[#FFFFFF] transition-colors cursor-pointer"
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span className="text-[10px] font-jp font-bold leading-tight text-center">
                    全{filteredMcs.length}名<br />
                    一覧表示
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* STEP 3: Dynamic Opponent Filter (When 1st MC is selected) OR Featured Matchups */}
        {selectedMcA ? (
          <div className="bg-[#121212] border border-[#242426] rounded-md px-3 py-2 transition-all space-y-1.5">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <div className="flex items-center gap-1.5 text-[11px] font-mono-tech tracking-wider">
                <span className="text-[#FFFFFF] font-bold font-jp">
                  {selectedMcA}
                </span>
                <span className="text-[#E50914] font-bold">VS</span>
                <span className="text-[#8E8E93] font-jp">
                  {selectedTournament === 'ALL'
                    ? `対戦相手を選択 (${availableOpponents.length}名)`
                    : `${selectedTournament}での対戦相手 (${availableOpponents.length}名)`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {selectedTournament !== 'ALL' &&
                  globalOpponentCount > availableOpponents.length && (
                    <button
                      onClick={() => onSelectTournament('ALL')}
                      className="text-[10px] font-jp text-[#8E8E93] hover:text-[#FFFFFF] underline underline-offset-2 cursor-pointer"
                    >
                      全大会の対戦相手を見る (全{globalOpponentCount}名)
                    </button>
                  )}

                {selectedMcB && (
                  <button
                    onClick={() => onSelectMcB(null)}
                    className="flex items-center gap-0.5 text-[10px] font-mono-tech text-[#E50914] hover:text-[#FFFFFF] cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>相手指定を解除 (ALL VS {selectedMcA})</span>
                  </button>
                )}
              </div>
            </div>

            {availableOpponents.length === 0 ? (
              <div className="text-xs font-jp text-[#8E8E93] py-1 flex items-center justify-between">
                <span>
                  この大会での対戦データはありません。
                </span>
                {selectedTournament !== 'ALL' && (
                  <button
                    onClick={() => onSelectTournament('ALL')}
                    className="px-2 py-0.5 rounded bg-[#FFFFFF] text-[#0A0A0A] font-bold text-[11px] cursor-pointer"
                  >
                    全大会 (ALL) に切り替え
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-0.5">
                {availableOpponents.map((opp) => {
                  const isOppSelected = Boolean(
                    selectedMcB && isSameMc(selectedMcB, opp.name)
                  );
                  return (
                    <button
                      key={opp.name}
                      onClick={() =>
                        onSelectMcB(isOppSelected ? null : opp.name)
                      }
                      className={`group flex items-center gap-2 pr-2.5 pl-1 py-1 rounded-full border transition-all shrink-0 cursor-pointer ${
                        isOppSelected
                          ? 'bg-[#FFFFFF] text-[#0A0A0A] border-[#FFFFFF]'
                          : 'bg-[#1A1A1A] text-[#FFFFFF] border-[#2C2C2E] hover:border-[#8E8E93]'
                      }`}
                    >
                      <McAvatar
                        mcName={opp.name}
                        fallbackYoutubeId={opp.repYoutubeId}
                        fallbackFocal={opp.focalPosition}
                        size="sm"
                        selected={isOppSelected}
                        isOpponent={true}
                      />
                      <div className="text-left">
                        <div
                          className={`text-xs font-jp leading-tight ${
                            isOppSelected
                              ? 'font-black text-[#0A0A0A]'
                              : 'font-bold text-[#FFFFFF]'
                          }`}
                        >
                          {opp.name}
                        </div>
                        <div
                          className={`text-[10px] font-mono-tech leading-tight ${
                            isOppSelected
                              ? 'text-[#0A0A0A]/70 font-bold'
                              : 'text-[#8E8E93]'
                          }`}
                        >
                          {opp.matchCount}{' '}
                          {opp.matchCount > 1 ? 'BOUTS' : 'BOUT'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Quick Featured Matchups Bar when no MC is selected */
          featuredMatchups.length > 0 &&
          !showGrid && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-jp font-bold text-[#8E8E93] shrink-0 mr-1">
                <Flame className="w-3 h-3 text-[#E50914]" />
                <span>注目カード:</span>
              </span>
              {featuredMatchups.map((pair) => (
                <button
                  key={`${pair.mcA}-${pair.mcB}`}
                  onClick={() => {
                    if (onSelectMatchup) {
                      onSelectMatchup(pair.mcA, pair.mcB);
                    } else {
                      onSelectMcA(pair.mcA);
                      onSelectMcB(pair.mcB);
                    }
                  }}
                  className="px-2 py-0.5 rounded bg-[#141416] hover:bg-[#1F1F22] border border-[#242426] hover:border-[#48484A] text-[11px] font-jp text-[#D1D1D6] hover:text-[#FFFFFF] flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                >
                  <span className="font-bold">{pair.mcA}</span>
                  <span className="text-[#E50914] font-display text-[10px] font-bold">
                    ×
                  </span>
                  <span className="font-bold">{pair.mcB}</span>
                  {pair.count > 1 && (
                    <span className="text-[9px] font-mono-tech text-[#8E8E93] ml-0.5">
                      ({pair.count})
                    </span>
                  )}
                </button>
              ))}
            </div>
          )
        )}
      </div>
    </section>
  );
};
