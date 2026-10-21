import type { Battle } from '../../src/types';

export type Tournament = Battle['tournament'];

/** 取り込み対象の公式チャンネル（親エージェントが実測で確認済み） */
export interface OfficialChannel {
  id: string;
  handle: string;
  /** 固定の大会。null = タイトルから判定（ABEMA HIPHOP 等） */
  tournament: Tournament | null;
  parser: ParserKey;
}

export type ParserKey =
  | 'senritsu'
  | 'gaisen'
  | 'umb'
  | 'kok'
  | 'adrenaline'
  | 'kuchigenka'
  | 'spotlight'
  | 'fsl'
  | 'abema';

export const OFFICIAL_CHANNELS: OfficialChannel[] = [
  { id: 'UC15ebOqdhmvl1eb0s0jk5aw', handle: '@senritumc', tournament: '戦極', parser: 'senritsu' },
  { id: 'UCe_EvY8GrvYgx8PbwRBc75g', handle: '@mcbattle8929', tournament: '凱旋', parser: 'gaisen' },
  { id: 'UCLn8FintdYEDCSK6HaX5Q4g', handle: '@Ultimatemcbattle', tournament: 'UMB', parser: 'umb' },
  { id: 'UCEHWZ3ao1dj3UfQMoLb_eKA', handle: '@UMBsubchannel', tournament: 'UMB', parser: 'umb' },
  { id: 'UCQbxh2ft3vw9M6Da_kuIa6A', handle: '@KOK_channel', tournament: 'KOK', parser: 'kok' },
  { id: 'UCj6aXG5H_fm_RAvxH38REXw', handle: '@SHINADMCBATTLE', tournament: 'ADRENALINE', parser: 'adrenaline' },
  { id: 'UCTGmN6Qt8TGs37BtLSCkinQ', handle: '@kuchigenkasaiofficial', tournament: '口喧嘩祭', parser: 'kuchigenka' },
  { id: 'UCIgphXLgxlCYYpx2Py2bTjA', handle: '@IFKRecords', tournament: 'SPOTLIGHT', parser: 'spotlight' },
  { id: 'UCXIaUFBW7TrZh_utWNILFDQ', handle: '@fslfreestyleleague369', tournament: 'FSL', parser: 'fsl' },
  { id: 'UCFR9RV-dojq1GpAQO6sjmvA', handle: '@FSL.CHANNEL', tournament: 'FSL', parser: 'fsl' },
  { id: 'UC-xDRps8JhkrEj1UbuufmjQ', handle: '@Hiphop_ABEMA', tournament: null, parser: 'abema' },
];

export const CHANNEL_BY_ID = new Map(OFFICIAL_CHANNELS.map((c) => [c.id, c]));

export const ALLOWED_TOURNAMENTS: Tournament[] = [
  '戦極',
  '凱旋',
  'UMB',
  'KOK',
  'ADRENALINE',
  '口喧嘩祭',
  'SPOTLIGHT',
  'BATTLE SUMMIT',
  '高校生RAP選手権',
  'FSL',
];
