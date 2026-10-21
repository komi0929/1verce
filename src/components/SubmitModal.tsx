import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Link2,
  Loader2,
  CheckCircle2,
  Disc3,
  AlertCircle,
  Play,
  Sparkles,
  Send,
  Clock,
} from 'lucide-react';
import { Battle } from '../types';
import {
  checkYouTubeVideo,
  extractYouTubeId,
  getYouTubeThumbnail,
  parseBattleTitle,
  ParsedBattleMeta,
} from '../utils/youtube';
import {
  BattleRequestItem,
  getLocalBattleRequests,
  submitBattleRequest,
} from '../lib/database';
import { triggerHaptic } from '../utils/haptics';

interface SubmitModalProps {
  battles: Battle[];
  onClose: () => void;
  onRequestSubmitted?: (info: {
    youtubeId: string;
    title?: string;
    queuedLocally: boolean;
    alreadyRequested: boolean;
  }) => void;
  onJumpToExistingBattle: (battleId: string) => void;
  onOpenAlbumPickerForExisting: (battle: Battle) => void;
}

export const SubmitModal: React.FC<SubmitModalProps> = ({
  battles,
  onClose,
  onRequestSubmitted,
  onJumpToExistingBattle,
  onOpenAlbumPickerForExisting,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [note, setNote] = useState('');
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [checkStatus, setCheckStatus] = useState<
    'idle' | 'checking' | 'ok' | 'unavailable' | 'unknown'
  >('idle');
  const [videoMeta, setVideoMeta] = useState<{
    title: string;
    author_name: string;
    thumbnail_url: string;
  } | null>(null);
  const [parsedPreview, setParsedPreview] = useState<ParsedBattleMeta | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentRequests, setRecentRequests] = useState<BattleRequestItem[]>(
    () => getLocalBattleRequests().slice(0, 5)
  );

  // Check if this YouTube ID is already in the archive
  const existingBattle = useMemo(() => {
    if (!youtubeId) return null;
    return battles.find((b) => b.youtubeId === youtubeId) || null;
  }, [battles, youtubeId]);

  // Check if already requested on this device
  const existingRequest = useMemo(() => {
    if (!youtubeId) return null;
    return recentRequests.find((r) => r.youtubeId === youtubeId) || null;
  }, [recentRequests, youtubeId]);

  useEffect(() => {
    const id = extractYouTubeId(urlInput);
    setYoutubeId(id);
    if (!id) {
      setCheckStatus('idle');
      setVideoMeta(null);
      setParsedPreview(null);
      return;
    }

    let cancelled = false;
    setCheckStatus('checking');
    setVideoMeta(null);
    setParsedPreview(null);

    checkYouTubeVideo(id).then((res) => {
      if (cancelled) return;
      if (res.status === 'ok') {
        setCheckStatus('ok');
        setVideoMeta(res.meta);
        setParsedPreview(
          parseBattleTitle(res.meta.title, res.meta.author_name)
        );
      } else if (res.status === 'unavailable') {
        setCheckStatus('unavailable');
      } else {
        setCheckStatus('unknown');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [urlInput]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeId || isSubmitting) return;

    if (existingBattle) {
      onJumpToExistingBattle(existingBattle.id);
      onClose();
      return;
    }

    if (checkStatus === 'unavailable' || checkStatus === 'checking') {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitBattleRequest({
        youtubeId,
        url: urlInput.trim() || `https://www.youtube.com/watch?v=${youtubeId}`,
        note: note.trim() || undefined,
        title: videoMeta?.title,
      });
      triggerHaptic('success');
      setRecentRequests(getLocalBattleRequests().slice(0, 5));
      onRequestSubmitted?.({
        youtubeId,
        title: videoMeta?.title,
        queuedLocally: result.queuedLocally,
        alreadyRequested: result.alreadyRequested,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit =
    Boolean(youtubeId) &&
    !existingBattle &&
    !existingRequest &&
    checkStatus !== 'unavailable' &&
    checkStatus !== 'checking' &&
    !isSubmitting;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#121212] border border-[#2C2C2E] rounded-xl overflow-hidden shadow-2xl my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-[#222224] flex items-center justify-between bg-[#0A0A0A] shrink-0">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#E50914]" />
            <span className="font-jp text-xs font-black tracking-wider text-[#FFFFFF]">
              バトルをリクエスト // REQUEST A BATTLE
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
          {/* Weekly AI Auto-Ingest Notice */}
          <div className="bg-[#16161B] border border-[#2A2A32] rounded-lg p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-jp font-black text-[#FFFFFF]">
              <Sparkles className="w-3.5 h-3.5 text-[#E50914] shrink-0" />
              <span>毎週月曜にAIが公式バトルを自動追加しています</span>
            </div>
            <p className="text-[11px] font-jp text-[#AEAEB2] leading-relaxed">
              公式チャンネル（戦極・凱旋・UMB・KOK・ADRENALINE・口喧嘩祭・SPOTLIGHT・FSL・ABEMA）の最新1on1バトルは
              <strong className="text-[#FFFFFF]">毎週月曜にAIが自動追加</strong>
              します。未収録の過去バトルや他大会のベストバウトはURLを貼ってリクエストしてください（次回更新で自動検証・追加されます）。
            </p>
          </div>

          {/* 1. YouTube URL Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-jp font-bold text-[#FFFFFF]">
              YouTubeのURL（または11文字の動画ID）を貼り付け *
            </label>
            <div className="relative">
              <Link2 className="w-4 h-4 text-[#8E8E93] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... または youtu.be/..."
                className="w-full bg-[#0A0A0A] border border-[#2C2C2E] focus:border-[#FFFFFF] rounded-lg pl-9 pr-9 py-2.5 text-xs font-mono-tech text-[#FFFFFF] outline-none"
                required
                autoFocus
              />
              {checkStatus === 'checking' && (
                <Loader2 className="w-4 h-4 text-[#FFFFFF] animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
              )}
            </div>
          </div>

          {/* Duplicate Check Alert (Already in Archive) */}
          {existingBattle && (
            <div className="bg-[#1A1A1E] border border-amber-500/50 rounded-lg p-3 space-y-2.5 animate-fadeIn">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-jp font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>既にアーカイブに収録されています！</span>
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
                  <span>今すぐ再生</span>
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
                  <span>レコードへ収録</span>
                </button>
              </div>
            </div>
          )}

          {/* Already Requested on this Device */}
          {!existingBattle && existingRequest && (
            <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-lg p-3 flex items-center gap-2 text-emerald-300 text-xs font-jp font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>このバトルはリクエスト済みです（次回更新で検証されます）</span>
            </div>
          )}

          {/* Unavailable Video Alert */}
          {youtubeId && !existingBattle && checkStatus === 'unavailable' && (
            <div
              role="alert"
              className="bg-red-950/40 border border-[#E50914]/60 rounded-lg p-3 flex items-center gap-2 text-[#FF6B6B] text-xs font-jp font-bold"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-[#E50914]" />
              <span>
                この動画は非公開または削除されているためリクエストできません
              </span>
            </div>
          )}

          {/* Valid Video Preview & Auto-Detected Tags */}
          {youtubeId &&
            !existingBattle &&
            (checkStatus === 'ok' || checkStatus === 'unknown') && (
              <div className="bg-[#0A0A0A] border border-[#222224] rounded-lg p-3 space-y-2.5">
                <div className="flex items-start gap-3">
                  <img
                    src={
                      videoMeta?.thumbnail_url ||
                      getYouTubeThumbnail(youtubeId, 'hq')
                    }
                    alt="Preview"
                    className="w-24 h-14 object-cover rounded border border-[#2C2C2E] shrink-0"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-jp font-bold text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {checkStatus === 'ok'
                          ? '公開中のYouTube動画を確認しました'
                          : 'YouTube動画IDを認識しました'}
                      </span>
                    </div>
                    {videoMeta && (
                      <>
                        <div className="text-xs font-jp font-bold text-[#FFFFFF] line-clamp-2">
                          {videoMeta.title}
                        </div>
                        {videoMeta.author_name && (
                          <div className="text-[10px] font-jp text-[#8E8E93] truncate">
                            チャンネル: {videoMeta.author_name}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {parsedPreview && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-[#1C1C1E] text-[11px] font-jp">
                    <span className="px-2 py-0.5 rounded bg-[#18181C] border border-[#2C2C32] text-[#FFFFFF] font-bold">
                      {parsedPreview.mcA} vs {parsedPreview.mcB}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#18181C] border border-[#2C2C32] text-[#AEAEB2]">
                      大会: {parsedPreview.tournament || '自動判定保留'}
                    </span>
                    {parsedPreview.year && (
                      <span className="px-2 py-0.5 rounded bg-[#18181C] border border-[#2C2C32] text-[#8E8E93] font-mono-tech">
                        {parsedPreview.year}年
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

          {/* Optional Note Input */}
          {!existingBattle && (
            <div className="space-y-1.5">
              <label className="block text-[11px] font-jp text-[#8E8E93]">
                補足メモ（任意・最大200文字 / 大会名やMC名、ベストバウトの理由など）
              </label>
              <input
                type="text"
                maxLength={200}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="例: 戦極15章のベストバウトです"
                className="w-full bg-[#0A0A0A] border border-[#2C2C2E] focus:border-[#FFFFFF] rounded-lg px-3 py-2 text-xs font-jp text-[#FFFFFF] outline-none"
              />
            </div>
          )}

          {!existingBattle && (
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full py-2.5 rounded-lg bg-[#FFFFFF] hover:bg-[#E5E5EA] disabled:opacity-40 text-[#0A0A0A] font-jp text-xs font-black tracking-wide transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {isSubmitting
                  ? 'リクエスト送信中...'
                  : 'このバトルをリクエストする'}
              </span>
            </button>
          )}

          {/* Recent Requests on This Device */}
          {recentRequests.length > 0 && (
            <div className="pt-3 border-t border-[#1F1F24] space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-jp font-bold text-[#8E8E93]">
                <Clock className="w-3.5 h-3.5" />
                <span>あなたのリクエスト履歴 ({recentRequests.length}件)</span>
              </div>
              <div className="space-y-1.5">
                {recentRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between gap-2 bg-[#0A0A0A] border border-[#222226] rounded px-2.5 py-1.5 text-[11px] font-jp"
                  >
                    <div className="min-w-0 flex-1 truncate text-[#D1D1D6]">
                      {req.title || req.url}
                    </div>
                    <span
                      className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        req.status === 'sent'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-amber-500/15 text-amber-300'
                      }`}
                    >
                      {req.status === 'sent' ? '受付済' : '送信待ち'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
