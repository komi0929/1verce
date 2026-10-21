import React, { useEffect, useState } from 'react';
import { Download, RefreshCw, Share, SquarePlus, X } from 'lucide-react';

/**
 * PWA helpers
 * - Registers the service worker (production only)
 * - "ホーム画面に追加" prompt: native install on Android/Chrome, step guide on iOS Safari
 * - "新しいバージョン" toast when a new deploy is waiting
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = '1verce_install_dismissed_at';
const VISITS_KEY = '1verce_visit_count';
const DISMISS_DAYS = 14;

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
  const isOtherBrowser = /crios|fxios|edgios|line\/|instagram|fban|fbav/i.test(ua);
  return isIos && !isOtherBrowser;
}

function recentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return at > 0 && Date.now() - at < DISMISS_DAYS * 86400000;
  } catch {
    return false;
  }
}

export const PwaPrompts: React.FC = () => {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  // Service worker registration + update detection
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        if (reg.waiting && navigator.serviceWorker.controller) setWaitingWorker(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(nw);
            }
          });
        });
        // Check for new deploys when the app returns to the foreground
        const onVisible = () => {
          if (document.visibilityState === 'visible') reg.update().catch(() => {});
        };
        document.addEventListener('visibilitychange', onVisible);
      })
      .catch(() => {});

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  // Install prompt eligibility: not installed, not recently dismissed, and engaged (2nd visit or 40s on page)
  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    let visits = 1;
    try {
      visits = Number(localStorage.getItem(VISITS_KEY) || 0) + 1;
      localStorage.setItem(VISITS_KEY, String(visits));
    } catch {}

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    const onInstalled = () => {
      setShowInstall(false);
      setInstallEvent(null);
    };
    window.addEventListener('appinstalled', onInstalled);

    const reveal = () => setShowInstall(true);
    const timer = window.setTimeout(reveal, visits >= 2 ? 4000 : 40000);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismissInstall = () => {
    setShowInstall(false);
    setShowIosGuide(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  };

  const handleInstall = async () => {
    if (installEvent) {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      setInstallEvent(null);
      if (choice.outcome === 'accepted') setShowInstall(false);
      else dismissInstall();
      return;
    }
    setShowIosGuide(true);
  };

  const canOfferInstall = showInstall && (installEvent !== null || isIosSafari());

  return (
    <>
      {waitingWorker && (
        <div className="fixed top-[calc(3.5rem+env(safe-area-inset-top))] left-2 right-2 sm:left-auto sm:right-4 sm:w-96 z-[60] bg-[#FFFFFF] text-[#0A0A0A] rounded-xl shadow-2xl px-3 py-2.5 flex items-center gap-2.5 animate-fadeIn">
          <RefreshCw className="w-4 h-4 shrink-0" />
          <p className="flex-1 font-jp text-xs font-bold">新しいバージョンがあります</p>
          <button
            type="button"
            onClick={() => waitingWorker.postMessage('SKIP_WAITING')}
            className="px-3 py-1.5 rounded-lg bg-[#0A0A0A] text-[#FFFFFF] font-jp text-xs font-black cursor-pointer"
          >
            更新する
          </button>
        </div>
      )}

      {canOfferInstall && !waitingWorker && !showIosGuide && (
        <div
          role="dialog"
          aria-label="ホーム画面に追加"
          className="fixed top-[calc(3.5rem+env(safe-area-inset-top))] left-2 right-2 sm:left-auto sm:right-4 sm:w-96 z-[60] bg-[#161618]/95 backdrop-blur-xl border border-[#2C2C2E] rounded-xl shadow-2xl p-3 flex items-center gap-3 animate-fadeIn"
        >
          <img src="/icon-192.png" alt="" className="w-10 h-10 rounded-lg shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-jp text-xs font-black text-[#FFFFFF]">ホーム画面に追加</p>
            <p className="font-jp text-[11px] text-[#8E8E93] leading-snug">
              アプリのように全画面で、ワンタップで起動できます
            </p>
          </div>
          <button
            type="button"
            onClick={handleInstall}
            className="px-3 py-1.5 rounded-lg bg-[#FFFFFF] text-[#0A0A0A] font-jp text-xs font-black cursor-pointer flex items-center gap-1 shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            追加
          </button>
          <button
            type="button"
            onClick={dismissInstall}
            aria-label="閉じる"
            className="p-1 text-[#8E8E93] hover:text-[#FFFFFF] cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showIosGuide && (
        <div
          className="fixed inset-0 z-[70] bg-[#000000]/70 backdrop-blur-sm flex items-end justify-center animate-fadeIn"
          onClick={dismissInstall}
        >
          <div
            className="w-full max-w-md bg-[#161618] border-t border-[#2C2C2E] rounded-t-2xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="font-jp text-sm font-black text-[#FFFFFF]">ホーム画面に追加する方法</p>
              <button type="button" onClick={dismissInstall} aria-label="閉じる" className="p-1 text-[#8E8E93] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <ol className="space-y-3 font-jp text-xs text-[#E5E5EA]">
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[#2C2C2E] flex items-center justify-center font-mono-tech text-[11px] font-bold shrink-0">1</span>
                <span className="flex items-center gap-1.5 flex-wrap">
                  画面下の <Share className="w-4 h-4 text-[#0A84FF]" /> <b>共有</b> ボタンをタップ
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[#2C2C2E] flex items-center justify-center font-mono-tech text-[11px] font-bold shrink-0">2</span>
                <span className="flex items-center gap-1.5 flex-wrap">
                  <SquarePlus className="w-4 h-4" /> <b>ホーム画面に追加</b> を選択
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[#2C2C2E] flex items-center justify-center font-mono-tech text-[11px] font-bold shrink-0">3</span>
                <span>右上の <b>追加</b> をタップして完了</span>
              </li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
};
