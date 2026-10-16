import React from 'react';
import { Flame, Disc, Video, CheckCircle2, Sparkles, ChevronRight, X, ThumbsUp } from 'lucide-react';

interface OnboardingBannerProps {
  isOpen: boolean;
  onClose: () => void;
  hasStampedOrLiked: boolean;
  hasUsedAlbum: boolean;
  hasAddedBattle: boolean;
  onNavigateToBattle: () => void;
  onNavigateToAlbums: () => void;
  onOpenSubmitBattle: () => void;
}

export const OnboardingBanner: React.FC<OnboardingBannerProps> = ({
  isOpen,
  onClose,
  hasStampedOrLiked,
  hasUsedAlbum,
  hasAddedBattle,
  onNavigateToBattle,
  onNavigateToAlbums,
  onOpenSubmitBattle,
}) => {
  if (!isOpen) return null;

  const completedCount = [hasStampedOrLiked, hasUsedAlbum, hasAddedBattle].filter(Boolean).length;

  return (
    <div className="mb-8 rounded-2xl bg-gradient-to-br from-[#191522] via-[#13131A] to-[#1A1215] border border-[#E63946]/35 shadow-2xl overflow-hidden relative">
      {/* Decorative accent */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#E63946]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-[#FFB703]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="p-5 sm:p-6 relative z-10">
        {/* Top bar */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E63946]/15 border border-[#E63946]/30 text-[#E63946] text-[11px] font-black tracking-wider uppercase mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              FIRST TIME GUIDE — 3ステップで1VERCEを使いこなす
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
              観るだけじゃない。あなただけの「名盤アルバム」をつくろう。
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              歴代の名バトルを自由にアーカイブし、お気に入りバトルをノンストップ連続再生できる<strong className="text-[#FFB703]">「MY ALBUMS」</strong>や<strong className="text-white">「YouTubeバトル登録」</strong>を搭載しています。
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-black/50 border border-white/10 text-xs font-bold text-gray-300 flex items-center gap-2">
              <span>体験ミッション</span>
              <span className="px-2 py-0.5 rounded-md bg-[#E63946]/20 text-[#E63946] font-mono font-black">
                {completedCount} / 3
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex items-center gap-1 text-xs font-bold"
              title="ガイドを閉じる（ヘッダーの「使い方」からいつでも再表示できます）"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">閉じる</span>
            </button>
          </div>
        </div>

        {/* 3 Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Step 1: Discover Battles */}
          <div
            className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
              hasStampedOrLiked
                ? 'bg-emerald-950/20 border-emerald-500/30'
                : 'bg-black/40 border-white/10 hover:border-[#E63946]/50'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[#E63946]">
                  <Flame className="w-4 h-4" />
                  STEP 01 • BATTLE DISCOVERY
                </span>
                <span className="text-[10px] font-bold text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                  大会・MC検索
                </span>
              </div>
              <h3 className="text-sm font-black text-white mb-1.5">
                大会とMCをワンタップでクロス絞り込み
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed mb-3">
                上部の「TOURNAMENT」と「MC SELECT」をタップするだけで、見たい対戦カードや名勝負を瞬時に発見。YouTube公式プレイヤーで即座に観戦できます。
              </p>
            </div>
            <button
              onClick={onNavigateToBattle}
              className="w-full py-2 px-3 rounded-lg bg-[#E63946]/15 hover:bg-[#E63946] text-[#E63946] hover:text-white border border-[#E63946]/30 text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>バトル一覧を見る</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Step 2: MY ALBUMS */}
          <div
            className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
              hasUsedAlbum
                ? 'bg-emerald-950/20 border-emerald-500/30'
                : 'bg-black/40 border-white/10 hover:border-[#FFB703]/50'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[#FFB703]">
                  <Disc className="w-4 h-4" />
                  STEP 02 • MY ALBUMS
                </span>
                {hasUsedAlbum ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> 体験済み
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                    連続再生＆自動ジャケ生成
                  </span>
                )}
              </div>
              <h3 className="text-sm font-black text-white mb-1.5">
                自分だけの「マイアルバム」を作って連続再生
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed mb-3">
                各バトルの<strong className="text-gray-200">「＋ アルバム追加」</strong>から好きな試合を収録。収録曲のサムネイルから<strong className="text-[#FFB703]">4分割コラージュやLPレコード盤ジャケット</strong>が自動生成され、1曲目からノンストップ連続再生できます。
              </p>
            </div>
            <button
              onClick={onNavigateToAlbums}
              className="w-full py-2 px-3 rounded-lg bg-[#FFB703]/15 hover:bg-[#FFB703] text-[#FFB703] hover:text-black border border-[#FFB703]/30 text-xs font-black transition-all flex items-center justify-center gap-1.5"
            >
              <span>マイアルバムを見る・作る</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Step 3: Add YouTube Battle */}
          <div
            className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
              hasAddedBattle
                ? 'bg-emerald-950/20 border-emerald-500/30'
                : 'bg-black/40 border-white/10 hover:border-white/30'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-sky-400">
                  <Video className="w-4 h-4" />
                  STEP 03 • ADD YOUTUBE BATTLE
                </span>
                {hasAddedBattle ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> 体験済み
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                    タイトル自動取得
                  </span>
                )}
              </div>
              <h3 className="text-sm font-black text-white mb-1.5">
                お気に入りのYouTubeバトルURLを即座に追加
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed mb-3">
                まだ載っていない最新バトルや名勝負があれば、YouTubeのURLを貼るだけ。タイトルやMC名・大会名を自動解析してアーカイブに即座に追加できます。
              </p>
            </div>
            <button
              onClick={onOpenSubmitBattle}
              className="w-full py-2 px-3 rounded-lg bg-white/10 hover:bg-white text-white hover:text-black border border-white/15 text-xs font-black transition-all flex items-center justify-center gap-1.5"
            >
              <span>＋ バトル動画URLを登録する</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
