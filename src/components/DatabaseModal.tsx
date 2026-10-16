import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  Download,
  Upload,
} from 'lucide-react';
import { ActivityItem, Album, AnalyticsData, Battle } from '../types';
import {
  clearSupabaseConfig,
  getSupabaseConfig,
  saveSupabaseConfig,
  SUPABASE_SCHEMA_SQL,
  syncAllDataToSupabase,
  testSupabaseConnection,
} from '../lib/database';

interface DatabaseModalProps {
  battles: Battle[];
  albums: Album[];
  activities: ActivityItem[];
  analytics: AnalyticsData;
  onClose: () => void;
  onCloudStatusChange: (connected: boolean) => void;
  onRestoreBackup: (data: {
    battles?: Battle[];
    albums?: Album[];
    activities?: ActivityItem[];
    analytics?: AnalyticsData;
  }) => void;
}

export const DatabaseModal: React.FC<DatabaseModalProps> = ({
  battles,
  albums,
  activities,
  analytics,
  onClose,
  onCloudStatusChange,
  onRestoreBackup,
}) => {
  const existingCfg = getSupabaseConfig();
  const [urlInput, setUrlInput] = useState(existingCfg?.url || '');
  const [keyInput, setKeyInput] = useState(existingCfg?.anonKey || '');

  const [statusMsg, setStatusMsg] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(Boolean(existingCfg));
  const [tablesReady, setTablesReady] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  const totalStamps = battles.reduce((sum, b) => sum + b.verses.length, 0);
  const userSubmittedBattles = battles.filter((b) => b.isUserSubmitted).length;

  useEffect(() => {
    if (existingCfg) {
      handleTestConnection(existingCfg.url, existingCfg.anonKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTestConnection = async (url?: string, key?: string) => {
    const targetUrl = (url ?? urlInput).trim();
    const targetKey = (key ?? keyInput).trim();
    if (!targetUrl || !targetKey) {
      setStatusMsg('Project URL と Anon Key を入力してください。');
      return;
    }

    saveSupabaseConfig({ url: targetUrl, anonKey: targetKey });
    setIsTesting(true);
    const res = await testSupabaseConnection();
    setIsTesting(false);
    setIsConnected(res.ok);
    setTablesReady(res.tablesReady);
    setStatusMsg(res.message);
    onCloudStatusChange(res.ok && res.tablesReady);
  };

  const handleDisconnect = () => {
    clearSupabaseConfig();
    setUrlInput('');
    setKeyInput('');
    setIsConnected(false);
    setTablesReady(false);
    setStatusMsg('ローカル永続化モード（ブラウザDB）へ切り替えました。');
    onCloudStatusChange(false);
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleSyncToCloud = async () => {
    setIsSyncing(true);
    const res = await syncAllDataToSupabase(
      battles,
      albums,
      activities,
      analytics,
      (msg) => setStatusMsg(msg)
    );
    setIsSyncing(false);
    setStatusMsg(res.message);
    if (res.ok) {
      setTablesReady(true);
      onCloudStatusChange(true);
    }
  };

  const handleExportBackup = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      version: '1verce-db-v5',
      battles,
      albums,
      activities,
      analytics,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `1verce-db-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (parsed && Array.isArray(parsed.battles)) {
          onRestoreBackup(parsed);
          setStatusMsg('バックアップJSONからデータベースを復元しました！');
        }
      } catch {
        setStatusMsg('バックアップファイルの読み込みに失敗しました。');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#121212] border border-[#2C2C2E] rounded-md overflow-hidden shadow-2xl my-auto max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar */}
        <div className="px-4 py-3 border-b border-[#222224] flex items-center justify-between bg-[#0A0A0A] shrink-0">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#E50914]" />
            <span className="font-jp text-xs font-black tracking-wider text-[#FFFFFF]">
              データベース管理 & Supabaseクラウド同期設定
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="閉じる"
            className="p-1 text-[#8E8E93] hover:text-[#FFFFFF] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-5 overflow-y-auto">
          {/* 1. Current DB Record Inventory */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-[#0A0A0A] border border-[#222224] rounded p-3">
              <div className="text-[10px] font-jp text-[#8E8E93]">
                登録バトル総数
              </div>
              <div className="text-lg font-mono-tech font-extrabold text-[#FFFFFF] mt-0.5">
                {battles.length.toLocaleString()}
              </div>
              <div className="text-[10px] font-jp text-[#8E8E93]">
                ユーザー追加: {userSubmittedBattles}件
              </div>
            </div>

            <div className="bg-[#0A0A0A] border border-[#222224] rounded p-3">
              <div className="text-[10px] font-jp text-[#8E8E93]">
                1タップ刻印・スタンプ
              </div>
              <div className="text-lg font-mono-tech font-extrabold text-[#FFFFFF] mt-0.5">
                {totalStamps.toLocaleString()}
              </div>
              <div className="text-[10px] font-jp text-[#8E8E93]">
                秒数同期済み
              </div>
            </div>

            <div className="bg-[#0A0A0A] border border-[#222224] rounded p-3">
              <div className="text-[10px] font-jp text-[#8E8E93]">
                マイアルバム数
              </div>
              <div className="text-lg font-mono-tech font-extrabold text-[#FFFFFF] mt-0.5">
                {albums.length.toLocaleString()}
              </div>
              <div className="text-[10px] font-jp text-[#8E8E93]">
                連続再生プレイリスト
              </div>
            </div>

            <div className="bg-[#0A0A0A] border border-[#222224] rounded p-3">
              <div className="text-[10px] font-jp text-[#8E8E93]">
                現在の保存モード
              </div>
              <div className="text-xs font-mono-tech font-extrabold mt-1 flex items-center gap-1.5">
                {isConnected && tablesReady ? (
                  <span className="text-emerald-400">● SUPABASE CLOUD</span>
                ) : (
                  <span className="text-amber-300">● LOCAL DB + SYNC</span>
                )}
              </div>
              <div className="text-[10px] font-jp text-[#8E8E93] mt-0.5">
                自動永続化稼働中
              </div>
            </div>
          </div>

          {/* 2. Supabase Cloud Connection Form */}
          <div className="bg-[#0A0A0A] border border-[#26262A] rounded p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-[#FFFFFF]" />
                <h3 className="font-jp font-black text-xs sm:text-sm text-[#FFFFFF]">
                  Supabase Cloud Database 接続設定
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCopySql}
                className="px-2.5 py-1 rounded bg-[#1A1A1E] hover:bg-[#FFFFFF] text-[#FFFFFF] hover:text-[#0A0A0A] border border-[#2C2C2E] font-jp text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span>SQLをコピーしました！</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>テーブル作成SQLをコピー</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs font-jp text-[#8E8E93] leading-relaxed">
              Supabaseプロジェクトを作成し、右上の「テーブル作成SQLをコピー」からSQL Editorで実行後、Project URLとAnon Keyを入力すると、全ユーザーのバトル登録・刻印・マイアルバム・インサイトがクラウドDBにリアルタイム蓄積されます（`.env`ファイルでの設定にも対応しています）。
            </p>

            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-mono-tech text-[#8E8E93] mb-1">
                  SUPABASE PROJECT URL (VITE_SUPABASE_URL)
                </label>
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://xxxxxxxxxxxx.supabase.co"
                  className="w-full bg-[#141416] border border-[#2C2C2E] focus:border-[#FFFFFF] rounded px-3 py-1.5 text-xs font-mono-tech text-[#FFFFFF] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono-tech text-[#8E8E93] mb-1">
                  SUPABASE ANON PUBLIC KEY (VITE_SUPABASE_ANON_KEY)
                </label>
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full bg-[#141416] border border-[#2C2C2E] focus:border-[#FFFFFF] rounded px-3 py-1.5 text-xs font-mono-tech text-[#FFFFFF] outline-none"
                />
              </div>
            </div>

            {statusMsg && (
              <div
                className={`p-2.5 rounded border text-xs font-jp flex items-center gap-2 ${
                  isConnected
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                }`}
              >
                {isConnected ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{statusMsg}</span>
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap pt-1">
              <button
                type="button"
                onClick={() => handleTestConnection()}
                disabled={isTesting}
                className="px-4 py-2 rounded bg-[#FFFFFF] hover:bg-[#E5E5EA] text-[#0A0A0A] font-jp text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`}
                />
                <span>接続テスト＆保存</span>
              </button>

              {isConnected && (
                <button
                  type="button"
                  onClick={handleSyncToCloud}
                  disabled={isSyncing}
                  className="px-4 py-2 rounded bg-[#E50914] hover:bg-[#FF1F2A] text-[#FFFFFF] font-jp text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Cloud
                    className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`}
                  />
                  <span>
                    {isSyncing
                      ? 'クラウドへ同期中...'
                      : '現在の全データをSupabaseへ一括同期'}
                  </span>
                </button>
              )}

              {isConnected && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-3 py-2 rounded bg-[#1A1A1E] text-[#8E8E93] hover:text-[#FFFFFF] text-xs font-jp cursor-pointer"
                >
                  接続解除
                </button>
              )}
            </div>
          </div>

          {/* 3. Local Backup & Restore */}
          <div className="bg-[#0A0A0A] border border-[#222224] rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-jp font-bold text-xs text-[#FFFFFF]">
                ローカルデータのJSONバックアップ・復元
              </h4>
              <p className="text-[11px] font-jp text-[#8E8E93]">
                作成したアルバムや1タップ刻印データをJSONファイルとして手元に保存・復元できます。
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExportBackup}
                className="px-3 py-1.5 rounded bg-[#1A1A1E] hover:bg-[#FFFFFF] text-[#FFFFFF] hover:text-[#0A0A0A] border border-[#2C2C2E] font-jp text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>バックアップ保存</span>
              </button>

              <label className="px-3 py-1.5 rounded bg-[#1A1A1E] hover:bg-[#242429] text-[#FFFFFF] border border-[#2C2C2E] font-jp text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>復元</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
