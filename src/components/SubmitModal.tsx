import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Link2,
  Loader2,
  CheckCircle2,
  Flame,
  Disc3,
  AlertCircle,
  Play,
} from 'lucide-react';
import { Album, Battle, TournamentTag } from '../types';
import { MC_PROFILES, TOURNAMENTS } from '../data/initialData';
import {
  extractYouTubeId,
  fetchYouTubeOEmbed,
  getYouTubeThumbnail,
  normalizeMcName,
  parseBattleTitle,
} from '../utils/youtube';

interface SubmitModalProps {
  battles: Battle[];
  albums: Album[];
  onClose: () => void;
  onAddBattle: (battle: Battle, targetAlbumIds: string[]) => void;
  onJumpToExistingBattle: (battleId: string) => void;
  onOpenAlbumPickerForExisting: (battle: Battle) => void;
}

export const SubmitModal: React.FC<SubmitModalProps> = ({
  battles,
  albums,
  onClose,
  onAddBattle,
  onJumpToExistingBattle,
  onOpenAlbumPickerForExisting,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [autoParsed, setAutoParsed] = useState(false);

  const [title, setTitle] = useState('');
  const [mcA, setMcA] = useState('');
  const [mcB, setMcB] = useState('');
  const [tournament, setTournament] =
    useState<Exclude<TournamentTag, 'ALL'>>('戦極');
  const [stageOrEvent, setStageOrEvent] = useState('');
  const [year, setYear] = useState('2024');

  // Simultaneous Album selection
  const [selectedAlbumIds, setSelectedAlbumIds] = useState<string[]>([]);

  // Check if this YouTube ID is already registered
  const existingBattle = useMemo(() => {
    if (!youtubeId) return null;
    return battles.find((b) => b.youtubeId === youtubeId) || null;
  }, [battles, youtubeId]);

  // Known MC suggestions for autocomplete
  const knownMcNames = useMemo(() => {
    const set = new Set<string>();
    for (const p of MC_PROFILES) set.add(p.name);
    for (const b of battles) {
      set.add(b.mcA);
      set.add(b.mcB);
    }
    return Array.from(set).sort();
  }, [battles]);

  useEffect(() => {
    const id = extractYouTubeId(urlInput);
    setYoutubeId(id);
    if (!id) {
      setAutoParsed(false);
      return;
    }

    let cancelled = false;
    setIsLoadingMeta(true);

    fetchYouTubeOEmbed(id).then((meta) => {
      if (cancelled) return;
      setIsLoadingMeta(false);
      if (meta) {
        const parsed = parseBattleTitle(meta.title, meta.author_name);
        setTitle(parsed.title);
        setMcA(parsed.mcA === 'MC A' ? '' : parsed.mcA);
        setMcB(parsed.mcB === 'MC B' ? '' : parsed.mcB);
        setTournament(parsed.tournament);
        setStageOrEvent(parsed.stageOrEvent);
        setYear(parsed.year);
        setAutoParsed(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [urlInput]);

  const toggleAlbumSelect = (albId: string) => {
    setSelectedAlbumIds((prev) =>
      prev.includes(albId)
        ? prev.filter((id) => id !== albId)
        : [...prev, albId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeId || !mcA.trim() || !mcB.trim()) return;

    if (existingBattle) {
      onJumpToExistingBattle(existingBattle.id);
      onClose();
      return;
    }

    const cleanMcA = normalizeMcName(mcA.trim());
    const cleanMcB = normalizeMcName(mcB.trim());
    const battleId = `btl-user-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const newBattle: Battle = {
      id: battleId,
      youtubeId,
      title: title.trim() || `${cleanMcA} vs ${cleanMcB} (${tournament})`,
      mcA: cleanMcA,
      mcB: cleanMcB,
      tournament,
      stageOrEvent: stageOrEvent.trim() || `${tournament} OFFICIAL`,
      year: year.trim() || '2024',
      verses: [],
      evaluation: { word: 0, flow: 0, vibe: 0 },
      outboundPlays: 1,
      shares: 0,
      createdAt: nowIso,
      lastActiveAt: nowIso,
      isUserSubmitted: true,
    };

    onAddBattle(newBattle, selectedAlbumIds);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#121212] border border-[#2C2C2E] rounded-md overflow-hidden shadow-2xl my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-[#222224] flex items-center justify-between bg-[#0A0A0A] shrink-0">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#E50914]" />
            <span className="font-jp text-xs font-black tracking-wider text-[#FFFFFF]">
              お気に入りのYouTubeバトルを登録 // REGISTER YOUTUBE BATTLE
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="モーダルを閉じる"
            className="p-1 text-[#8E8E93] hover:text-[#FFFFFF] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-4 space-y-4 overflow-y-auto"
        >
          <datalist id="mc-autocomplete-list">
            {knownMcNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>

          {/* 1. YouTube URL Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-jp font-bold text-[#FFFFFF]">
              1. YouTubeのURL（または動画ID）を貼り付け *
            </label>
            <div className="relative">
              <Link2 className="w-4 h-4 text-[#8E8E93] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... または youtu.be/..."
                className="w-full bg-[#0A0A0A] border border-[#2C2C2E] focus:border-[#FFFFFF] rounded pl-9 pr-3 py-2 text-xs font-mono-tech text-[#FFFFFF] outline-none"
                required
                autoFocus
              />
              {isLoadingMeta && (
                <Loader2 className="w-4 h-4 text-[#FFFFFF] animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
              )}
            </div>
            <p className="text-[11px] font-jp text-[#8E8E93]">
              URLを貼るだけで、動画タイトルからMC名・大会名を自動解析します。
            </p>
          </div>

          {/* Duplicate Check Alert */}
          {existingBattle && (
            <div className="bg-[#1A1A1E] border border-amber-500/50 rounded p-3 space-y-2.5 animate-fadeIn">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-jp font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>このYouTubeバトルは既にアーカイブに登録されています！</span>
              </div>
              <div className="flex items-center gap-3 bg-[#0A0A0A] rounded p-2 border border-[#262628]">
                <img
                  src={getYouTubeThumbnail(existingBattle.youtubeId, 'hq')}
                  alt=""
                  className="w-20 h-12 object-cover rounded shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-jp font-black text-xs text-[#FFFFFF] truncate">
                    {existingBattle.mcA} vs {existingBattle.mcB}
                  </div>
                  <div className="text-[10px] font-jp text-[#8E8E93] truncate">
                    {existingBattle.tournament} • {existingBattle.title}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onJumpToExistingBattle(existingBattle.id);
                    onClose();
                  }}
                  className="flex-1 py-1.5 rounded bg-[#FFFFFF] text-[#0A0A0A] font-jp text-xs font-black flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>このバトルを今すぐ開く</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAlbumPickerForExisting(existingBattle);
                  }}
                  className="flex-1 py-1.5 rounded bg-[#242429] text-[#FFFFFF] border border-[#3A3A3E] font-jp text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Disc3 className="w-3.5 h-3.5" />
                  <span>マイアルバムへ追加</span>
                </button>
              </div>
            </div>
          )}

          {/* Thumbnail Preview & Auto-Parse Status */}
          {youtubeId && !existingBattle && (
            <div className="bg-[#0A0A0A] border border-[#222224] rounded p-3 flex items-center gap-3">
              <img
                src={getYouTubeThumbnail(youtubeId, 'hq')}
                alt="Preview"
                className="w-24 h-14 object-cover rounded border border-[#2C2C2E] shrink-0"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-jp font-bold text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {autoParsed
                      ? 'YouTube公式メタデータから自動入力しました'
                      : 'YouTube動画を認識しました'}
                  </span>
                </div>
                <p className="text-xs font-jp text-[#FFFFFF] line-clamp-2">
                  {title || '動画タイトルを入力または確認してください'}
                </p>
              </div>
            </div>
          )}

          {/* 2. Matchup & Tournament Details */}
          {!existingBattle && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-jp text-[#8E8E93] mb-1">
                    MC A (先行 / 左側) *
                  </label>
                  <input
                    type="text"
                    list="mc-autocomplete-list"
                    value={mcA}
                    onChange={(e) => setMcA(e.target.value)}
                    placeholder="例: 呂布カルマ"
                    className="w-full bg-[#0A0A0A] border border-[#2C2C2E] focus:border-[#FFFFFF] rounded px-3 py-1.5 text-xs font-jp text-[#FFFFFF] outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-jp text-[#8E8E93] mb-1">
                    MC B (後攻 / 右側) *
                  </label>
                  <input
                    type="text"
                    list="mc-autocomplete-list"
                    value={mcB}
                    onChange={(e) => setMcB(e.target.value)}
                    placeholder="例: FORK"
                    className="w-full bg-[#0A0A0A] border border-[#2C2C2E] focus:border-[#FFFFFF] rounded px-3 py-1.5 text-xs font-jp text-[#FFFFFF] outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-jp text-[#8E8E93] mb-1">
                    大会カテゴリ
                  </label>
                  <select
                    value={tournament}
                    onChange={(e) =>
                      setTournament(
                        e.target.value as Exclude<TournamentTag, 'ALL'>
                      )
                    }
                    className="w-full bg-[#0A0A0A] border border-[#2C2C2E] rounded px-2.5 py-1.5 text-xs font-jp text-[#FFFFFF] outline-none"
                  >
                    {TOURNAMENTS.filter(
                      (t): t is Exclude<TournamentTag, 'ALL'> => t !== 'ALL'
                    ).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-jp text-[#8E8E93] mb-1">
                    大会章・ラウンド
                  </label>
                  <input
                    type="text"
                    value={stageOrEvent}
                    onChange={(e) => setStageOrEvent(e.target.value)}
                    placeholder="例: 戦極21章 決勝"
                    className="w-full bg-[#0A0A0A] border border-[#2C2C2E] rounded px-2.5 py-1.5 text-xs font-jp text-[#FFFFFF] outline-none"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-jp text-[#8E8E93] mb-1">
                    開催年
                  </label>
                  <input
                    type="text"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="2024"
                    className="w-full bg-[#0A0A0A] border border-[#2C2C2E] rounded px-2.5 py-1.5 text-xs font-mono-tech text-[#FFFFFF] outline-none"
                  />
                </div>
              </div>

              {/* 3. Simultaneous Album Addition */}
              {albums.length > 0 && (
                <div className="bg-[#16161A] border border-[#26262A] rounded p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-jp font-bold text-[#FFFFFF]">
                    <Disc3 className="w-3.5 h-3.5 text-[#E50914]" />
                    <span>同時にマイアルバムへ追加する（任意・複数選択可）</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {albums.map((alb) => {
                      const active = selectedAlbumIds.includes(alb.id);
                      return (
                        <button
                          key={alb.id}
                          type="button"
                          onClick={() => toggleAlbumSelect(alb.id)}
                          className={`px-2.5 py-1 rounded text-xs font-jp border transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#FFFFFF] text-[#0A0A0A] border-[#FFFFFF] font-bold'
                              : 'bg-[#0A0A0A] text-[#8E8E93] border-[#2C2C2E] hover:text-[#FFFFFF]'
                          }`}
                        >
                          {active ? '✓ ' : '+ '}
                          {alb.title}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}



              <button
                type="submit"
                disabled={!youtubeId || !mcA.trim() || !mcB.trim()}
                className="w-full py-2.5 rounded bg-[#FFFFFF] hover:bg-[#E5E5EA] disabled:opacity-40 text-[#0A0A0A] font-jp text-xs font-black tracking-wide transition-colors cursor-pointer"
              >
                このバトルを1verceに登録する
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
