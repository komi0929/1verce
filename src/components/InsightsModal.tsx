import React, { useMemo } from 'react';
import {
  X,
  BarChart3,
  Download,
  Play,
  ArrowUpRight,
  Activity,
} from 'lucide-react';
import { AnalyticsData, Battle, TournamentTag } from '../types';
import { formatTimestamp } from '../utils/youtube';
import { McAvatar } from './McAvatar';

interface InsightsModalProps {
  analytics: AnalyticsData;
  battles: Battle[];
  onClose: () => void;
  onJumpToVerse: (battleId: string, seconds: number, verseId: string) => void;
}

export const InsightsModal: React.FC<InsightsModalProps> = ({
  analytics,
  battles,
  onClose,
  onJumpToVerse,
}) => {
  // Tournament Breakdown Sorted by Outbound Views
  const tournamentRows = useMemo(() => {
    const entries = Object.entries(analytics.tournamentTraffic) as Array<
      [
        Exclude<TournamentTag, 'ALL'>,
        { outboundViews: number; ctr: number; verseTriggers: number }
      ]
    >;
    const maxViews = Math.max(...entries.map(([, v]) => v.outboundViews), 1);
    return entries
      .sort((a, b) => b[1].outboundViews - a[1].outboundViews)
      .map(([name, stats]) => ({
        name,
        ...stats,
        ratio: Math.round((stats.outboundViews / maxViews) * 100),
      }));
  }, [analytics.tournamentTraffic]);

  // Top 10 MCs by Search + Playback Volume
  const topMcs = useMemo(() => {
    const scores = new Map<string, number>();
    for (const [mc, count] of Object.entries(analytics.mcSearchCounts)) {
      scores.set(mc, count);
    }
    for (const b of battles) {
      scores.set(b.mcA, (scores.get(b.mcA) || 0) + Math.floor(b.outboundPlays * 0.35));
      scores.set(b.mcB, (scores.get(b.mcB) || 0) + Math.floor(b.outboundPlays * 0.35));
    }
    const sorted = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    const maxScore = sorted[0]?.[1] || 1;
    return sorted.map(([mc, score], idx) => ({
      rank: idx + 1,
      mc,
      score,
      ratio: Math.round((score / maxScore) * 100),
    }));
  }, [analytics.mcSearchCounts, battles]);

  // Top Replayed 1verce Ranking
  const topVerses = useMemo(() => {
    const list: Array<{
      verseId: string;
      battleId: string;
      seconds: number;
      text: string;
      mc: string;
      replays: number;
      likes: number;
      matchup: string;
      tournament: string;
    }> = [];

    for (const b of battles) {
      for (const v of b.verses) {
        list.push({
          verseId: v.id,
          battleId: b.id,
          seconds: v.seconds,
          text: v.text,
          mc: v.mc,
          replays: v.replays,
          likes: v.likes,
          matchup: `${b.mcA} vs ${b.mcB}`,
          tournament: b.tournament,
        });
      }
    }

    return list.sort((a, b) => b.replays - a.replays).slice(0, 8);
  }, [battles]);

  const handleExportJson = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      platform: '1verce Analytics Engine',
      summary: {
        totalPv: analytics.totalPv,
        uniqueVisitors: analytics.uniqueVisitors,
        totalPlays: analytics.totalPlays,
        totalVersesLogged: analytics.totalVersesLogged,
        viralShares: analytics.viralShares,
      },
      tournamentTraffic: tournamentRows,
      topMcs,
      topVerses,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `1verce-traffic-report-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const headers = [
      'Category,Name,Metric_1_OutboundViews_Or_Score,Metric_2_CTR_Or_Replays,Metric_3_VerseTriggers_Or_Likes',
    ];
    const rows = [
      `SUMMARY,TOTAL_PV,${analytics.totalPv},${analytics.uniqueVisitors},${analytics.totalPlays}`,
      ...tournamentRows.map(
        (t) =>
          `TOURNAMENT,${t.name},${t.outboundViews},${t.ctr}%,${t.verseTriggers}`
      ),
      ...topMcs.map((m) => `TOP_MC_#${m.rank},${m.mc},${m.score},-, -`),
      ...topVerses.map(
        (v, i) =>
          `TOP_1VERCE_#${i + 1},"[${formatTimestamp(v.seconds)}] ${v.mc} (${
            v.matchup
          })",${v.replays},${v.likes},${v.tournament}`
      ),
    ];

    const blob = new Blob([headers.concat(rows).join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `1verce-traffic-report-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-[#121212] border border-[#2C2C2E] rounded-md overflow-hidden shadow-2xl my-auto max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar */}
        <div className="px-4 py-3 border-b border-[#222224] flex items-center justify-between shrink-0 bg-[#0A0A0A]">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-4 h-4 text-[#FFFFFF]" />
            <span className="font-mono-tech text-xs font-extrabold tracking-wider uppercase text-[#FFFFFF]">
              1VERCE INSIGHTS // SPONSORSHIP & ORGANIZER TRAFFIC PROOF
            </span>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1A1A1A] border border-[#2C2C2E] text-[10px] font-mono-tech text-[#FFFFFF]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E50914] animate-live-dot" />
              LIVE TELEMETRY
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="px-2.5 py-1 rounded bg-[#1A1A1A] hover:bg-[#FFFFFF] text-[#FFFFFF] hover:text-[#0A0A0A] border border-[#2C2C2E] font-mono-tech text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>EXPORT CSV</span>
            </button>
            <button
              onClick={handleExportJson}
              className="px-2.5 py-1 rounded bg-[#FFFFFF] hover:bg-[#E5E5EA] text-[#0A0A0A] font-mono-tech text-[11px] font-extrabold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>EXPORT JSON</span>
            </button>
            <button
              onClick={onClose}
              aria-label="インサイトモーダルを閉じる"
              className="p-1 text-[#8E8E93] hover:text-[#FFFFFF] ml-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-6">
          {/* 1. Core Media Scale KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="bg-[#0A0A0A] border border-[#222224] rounded p-3">
              <div className="text-[10px] font-mono-tech text-[#8E8E93] uppercase">
                TOTAL PV
              </div>
              <div className="text-xl font-mono-tech font-extrabold text-[#FFFFFF] mt-1">
                {analytics.totalPv.toLocaleString()}
              </div>
              <div className="text-[10px] font-mono-tech text-[#8E8E93] mt-0.5">
                REAL-TIME SESSIONS
              </div>
            </div>

            <div className="bg-[#0A0A0A] border border-[#222224] rounded p-3">
              <div className="text-[10px] font-mono-tech text-[#8E8E93] uppercase">
                UNIQUE VISITORS
              </div>
              <div className="text-xl font-mono-tech font-extrabold text-[#FFFFFF] mt-1">
                {analytics.uniqueVisitors.toLocaleString()}
              </div>
              <div className="text-[10px] font-mono-tech text-[#8E8E93] mt-0.5">
                LOCAL CLIENT SESSIONS
              </div>
            </div>

            <div className="bg-[#0A0A0A] border border-[#222224] rounded p-3">
              <div className="text-[10px] font-mono-tech text-[#8E8E93] uppercase flex items-center gap-1">
                <span>TOTAL PLAYS</span>
                <ArrowUpRight className="w-3 h-3 text-[#E50914]" />
              </div>
              <div className="text-xl font-mono-tech font-extrabold text-[#FFFFFF] mt-1">
                {analytics.totalPlays.toLocaleString()}
              </div>
              <div className="text-[10px] font-mono-tech text-[#E50914] font-bold mt-0.5">
                DIRECT YT OUTBOUND
              </div>
            </div>

            <div className="bg-[#0A0A0A] border border-[#222224] rounded p-3">
              <div className="text-[10px] font-mono-tech text-[#8E8E93] uppercase">
                1VERCE ARCHIVED
              </div>
              <div className="text-xl font-mono-tech font-extrabold text-[#FFFFFF] mt-1">
                {analytics.totalVersesLogged.toLocaleString()}
              </div>
              <div className="text-[10px] font-mono-tech text-[#8E8E93] mt-0.5">
                TIMESTAMP INDEXED
              </div>
            </div>

            <div className="bg-[#0A0A0A] border border-[#222224] rounded p-3 col-span-2 sm:col-span-1">
              <div className="text-[10px] font-mono-tech text-[#8E8E93] uppercase">
                VIRAL SHARES
              </div>
              <div className="text-xl font-mono-tech font-extrabold text-[#FFFFFF] mt-1">
                {analytics.viralShares.toLocaleString()}
              </div>
              <div className="text-[10px] font-mono-tech text-[#8E8E93] mt-0.5">
                DEEP LINK CLICKS
              </div>
            </div>
          </div>

          {/* 2. Tournament Outbound Traffic Breakdown */}
          <div className="bg-[#0A0A0A] border border-[#222224] rounded p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#E50914]" />
                <h3 className="font-mono-tech text-xs font-extrabold uppercase tracking-wider text-[#FFFFFF]">
                  TOURNAMENT OUTBOUND TRAFFIC BREAKDOWN (公式大会別 送客・再生貢献レポート)
                </h3>
              </div>
              <span className="text-[10px] font-mono-tech text-[#8E8E93]">
                VERIFIED IFRAME & TIMESTAMP TRIGGERS
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#222224] text-[10px] font-mono-tech text-[#8E8E93] uppercase">
                    <th className="py-2 pr-3">TOURNAMENT</th>
                    <th className="py-2 px-3">OUTBOUND VIEWS</th>
                    <th className="py-2 px-3 w-1/3">TRAFFIC SHARE</th>
                    <th className="py-2 px-3 text-right">1VERCE SEEKS</th>
                    <th className="py-2 pl-3 text-right">CTR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A1A1C] text-xs font-mono-tech">
                  {tournamentRows.map((row) => (
                    <tr key={row.name} className="hover:bg-[#141416]">
                      <td className="py-2.5 pr-3 font-jp font-black text-[#FFFFFF]">
                        {row.name}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#FFFFFF]">
                        {row.outboundViews.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="w-full h-2 bg-[#1A1A1C] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#FFFFFF]"
                            style={{ width: `${row.ratio}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right text-[#8E8E93]">
                        {row.verseTriggers.toLocaleString()}
                      </td>
                      <td className="py-2.5 pl-3 text-right font-bold text-[#FFFFFF]">
                        {row.ctr.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Two-Column Ranking: Top 10 MCs & Most Replayed 1verce Ranking */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* TOP 10 MCs Ranking */}
            <div className="bg-[#0A0A0A] border border-[#222224] rounded p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-mono-tech text-xs font-extrabold uppercase tracking-wider text-[#FFFFFF]">
                  TOP 10 SEARCHED & PLAYED MCS
                </h3>
                <span className="text-[10px] font-mono-tech text-[#8E8E93]">
                  VS BUILDER + STREAM INDEX
                </span>
              </div>

              <div className="space-y-2">
                {topMcs.map((item) => (
                  <div
                    key={item.mc}
                    className="flex items-center gap-2.5 bg-[#121212] border border-[#1E1E20] rounded px-2.5 py-1.5"
                  >
                    <span className="w-6 font-mono-tech text-xs font-extrabold text-[#8E8E93]">
                      #{String(item.rank).padStart(2, '0')}
                    </span>
                    <McAvatar mcName={item.mc} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-jp font-black text-[#FFFFFF] truncate">
                          {item.mc}
                        </span>
                        <span className="font-mono-tech font-bold text-[#FFFFFF]">
                          {item.score.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full h-1 bg-[#1C1C1E] rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-[#FFFFFF]"
                          style={{ width: `${item.ratio}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Most Replayed 1verce Ranking */}
            <div className="bg-[#0A0A0A] border border-[#222224] rounded p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-mono-tech text-xs font-extrabold uppercase tracking-wider text-[#FFFFFF]">
                  MOST REPLAYED 1VERCE RANKING
                </h3>
                <span className="text-[10px] font-mono-tech text-[#8E8E93]">
                  TIMESTAMP SEEK TRIGGERS
                </span>
              </div>

              <div className="space-y-2">
                {topVerses.map((v, idx) => (
                  <div
                    key={v.verseId}
                    className="bg-[#121212] border border-[#1E1E20] hover:border-[#3A3A3C] rounded p-2.5 flex items-start justify-between gap-2 transition-colors"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono-tech text-[11px] font-extrabold text-[#8E8E93]">
                          #{String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className="px-1.5 py-0.2 bg-[#FFFFFF] text-[#0A0A0A] font-mono-tech text-[10px] font-bold rounded-xs">
                          [{formatTimestamp(v.seconds)}]
                        </span>
                        <span className="text-[10px] font-jp font-bold text-[#8E8E93] truncate">
                          {v.matchup} ({v.tournament})
                        </span>
                      </div>
                      <p className="text-xs font-jp font-bold text-[#FFFFFF] line-clamp-1">
                        "{v.text}" — {v.mc}
                      </p>
                      <div className="text-[10px] font-mono-tech text-[#8E8E93]">
                        {v.replays.toLocaleString()} REPLAYS / +{v.likes} VOTES
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onClose();
                        onJumpToVerse(v.battleId, v.seconds, v.verseId);
                      }}
                      className="p-1.5 rounded bg-[#1A1A1C] hover:bg-[#FFFFFF] text-[#FFFFFF] hover:text-[#0A0A0A] border border-[#2C2C2E] transition-colors shrink-0 cursor-pointer"
                      title="SEEK & PLAY"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
