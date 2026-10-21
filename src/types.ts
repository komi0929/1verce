export type TournamentTag =
  | 'ALL'
  | '戦極'
  | '凱旋'
  | 'UMB'
  | 'KOK'
  | 'ADRENALINE'
  | '口喧嘩祭'
  | 'SPOTLIGHT'
  | 'BATTLE SUMMIT'
  | '高校生RAP選手権'
  | 'FSL';

export type StampTag = 'PUNCHLINE';

export type AlbumJacketStyle = 'MOSAIC_4' | 'VINYL_LP' | 'HERO_SLEEVE';
export type AlbumJacketTheme = 'CRIMSON' | 'GOLD' | 'MONO' | 'CLASSIC';

export interface Verse {
  id: string;
  battleId: string;
  seconds: number; // e.g. 78 -> [01:18]
  text: string;
  mc: string;
  tag?: string;
  likes: number;
  replays: number;
  createdAt: string;
  isUserCreated?: boolean;
}

export interface BattleEvaluation {
  word: number;
  flow: number;
  vibe: number;
}

export interface Battle {
  id: string;
  youtubeId: string;
  title: string;
  mcA: string;
  mcB: string;
  tournament: Exclude<TournamentTag, 'ALL'>;
  stageOrEvent: string;
  year: string;
  verses: Verse[];
  evaluation: BattleEvaluation;
  outboundPlays: number;
  shares: number;
  createdAt: string;
  lastActiveAt?: string;
  isUserSubmitted?: boolean;
  mcAFocal?: string; // CSS object-position for MC A crop from thumbnail
  mcBFocal?: string; // CSS object-position for MC B crop from thumbnail
  /** FULL = 試合本編 / SHORT = YouTubeショート / CLIP = 字幕版・解説・リアクション等の関連動画 */
  format?: VideoFormat;
  /** 動画の長さ（秒） */
  durationSec?: number;
  /** 同じ試合の別アップロードの場合、正本となるバトルID（試合数カウント・一覧から除外） */
  duplicateOf?: string;
  /** データの出所: preset = 手動キュレーション / auto = 週次自動取り込み / user = ユーザー投稿（端末ローカル） */
  source?: 'preset' | 'auto' | 'user';
  /** YouTube上の公開日時（ISO8601）。週次自動取り込み分は必ず付与 */
  publishedAt?: string;
}

export type VideoFormat = 'FULL' | 'SHORT' | 'CLIP';

export interface AlbumTrack {
  id: string;
  battleId: string;
  startSeconds: number;
  note?: string;
  addedAt: string;
}

export interface Album {
  id: string;
  title: string;
  description: string;
  themeTag: string;
  jacketStyle?: AlbumJacketStyle;
  jacketTheme?: AlbumJacketTheme;
  tracks: AlbumTrack[];
  likes: number;
  playCount: number;
  createdAt: string;
  updatedAt: string;
  isPreset?: boolean;
  ownerDeviceId?: string;
}

export interface ActivityItem {
  id: string;
  type: 'STAMP' | 'LIKE' | 'BATTLE_ADD' | 'ALBUM_CREATE' | 'ALBUM_ADD';
  battleId?: string;
  albumId?: string;
  summary: string;
  detail?: string;
  seconds?: number;
  createdAt: string;
}

export interface MCProfile {
  name: string;
  enName: string;
  avatarUrl?: string; // Direct official artist photo / Wikipedia commons image
  repYoutubeId: string;
  focalPosition: string; // e.g., '20% 25%' or '80% 25%'
  styleTag: string;
}

export interface AnalyticsData {
  totalPv: number;
  uniqueVisitors: number;
  totalPlays: number;
  totalVersesLogged: number;
  viralShares: number;
  tournamentTraffic: Record<
    Exclude<TournamentTag, 'ALL'>,
    {
      outboundViews: number;
      ctr: number;
      verseTriggers: number;
    }
  >;
  mcSearchCounts: Record<string, number>;
}

export type ViewMode =
  | 'LATEST'
  | 'FRESH'
  | 'HALL_OF_FAME'
  | 'YEAR_DESC'
  | 'YEAR_ASC'
  | 'ALBUMS'
  | 'ARCHIVE';
