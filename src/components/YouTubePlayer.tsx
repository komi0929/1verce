import React, { useEffect, useRef, useState } from 'react';
import { Disc3 } from 'lucide-react';
import { getYouTubeThumbnail } from '../utils/youtube';

interface YouTubePlayerProps {
  youtubeId: string;
  startSeconds: number;
  seekNonce: number;
  togglePlayNonce?: number;
  desiredPaused?: boolean;
  title: string;
  onTimeUpdate: (
    currentSeconds: number,
    duration: number,
    isPaused: boolean
  ) => void;
  onEnded?: () => void;
  onPlayerError?: (code: number) => void;
}

function buildEmbedUrl(youtubeId: string, startSeconds: number): string {
  const start = Math.max(0, Math.floor(startSeconds || 0));
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://1verce.vercel.app';
  const params = new URLSearchParams({
    autoplay: '1',
    start: String(start),
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    enablejsapi: '1',
    origin,
  });
  return `https://www.youtube.com/embed/${encodeURIComponent(
    youtubeId
  )}?${params.toString()}`;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  youtubeId,
  startSeconds,
  seekNonce,
  togglePlayNonce = 0,
  desiredPaused = false,
  title,
  onTimeUpdate,
  onEnded,
  onPlayerError,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeSrc, setIframeSrc] = useState<string>(() =>
    buildEmbedUrl(youtubeId, startSeconds)
  );
  const [isIframeLoaded, setIsIframeLoaded] = useState<boolean>(false);

  const isBridgeReadyRef = useRef<boolean>(false);
  const activeVideoIdRef = useRef<string>(youtubeId);
  const hasPlayedCurrentRef = useRef<boolean>(false);
  const endedFiredForCurrentRef = useRef<boolean>(false);
  const lastLoadTimeRef = useRef<number>(Date.now());
  const lastCurrentTimeRef = useRef<number>(startSeconds || 0);
  const lastDurationRef = useRef<number>(0);

  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onEndedRef = useRef(onEnded);
  const onPlayerErrorRef = useRef(onPlayerError);
  onTimeUpdateRef.current = onTimeUpdate;
  onEndedRef.current = onEnded;
  onPlayerErrorRef.current = onPlayerError;

  const sendCommand = (func: string, args: unknown[] = []) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(
        JSON.stringify({
          event: 'command',
          func,
          args,
        }),
        '*'
      );
    } catch {
      // ignore
    }
  };

  const registerListening = () => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(
        JSON.stringify({
          event: 'listening',
          id: 1,
          channel: 'widget',
        }),
        '*'
      );
      sendCommand('addEventListener', ['onStateChange']);
      sendCommand('addEventListener', ['onError']);
    } catch {
      // ignore
    }
  };

  // Listen to messages from the YouTube Embed IFrame
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (
        !iframeRef.current ||
        event.source !== iframeRef.current.contentWindow
      ) {
        return;
      }
      if (typeof event.data !== 'string') return;

      try {
        const data = JSON.parse(event.data);
        if (!data) return;

        isBridgeReadyRef.current = true;
        setIsIframeLoaded(true);

        if (data.event === 'infoDelivery' && data.info) {
          const info = data.info;
          const cur =
            typeof info.currentTime === 'number' ? info.currentTime : null;
          const dur =
            typeof info.duration === 'number' ? info.duration : null;
          const state =
            typeof info.playerState === 'number' ? info.playerState : null;

          if (cur !== null) lastCurrentTimeRef.current = cur;
          if (dur !== null && dur > 0) lastDurationRef.current = dur;

          if (state === 1 || state === 3 || (cur !== null && cur > 0.5)) {
            hasPlayedCurrentRef.current = true;
          }

          if (cur !== null || state !== null) {
            onTimeUpdateRef.current(
              lastCurrentTimeRef.current,
              lastDurationRef.current,
              state === 2
            );
          }

          if (
            state === 0 &&
            hasPlayedCurrentRef.current &&
            !endedFiredForCurrentRef.current &&
            Date.now() - lastLoadTimeRef.current > 1500
          ) {
            endedFiredForCurrentRef.current = true;
            onEndedRef.current?.();
          }
        } else if (data.event === 'onStateChange') {
          const state = data.info;
          if (state === 1 || state === 3) {
            hasPlayedCurrentRef.current = true;
          }
          if (state === 1 || state === 2) {
            onTimeUpdateRef.current(
              lastCurrentTimeRef.current,
              lastDurationRef.current,
              state === 2
            );
          }
          if (
            state === 0 &&
            hasPlayedCurrentRef.current &&
            !endedFiredForCurrentRef.current &&
            Date.now() - lastLoadTimeRef.current > 1500
          ) {
            endedFiredForCurrentRef.current = true;
            onEndedRef.current?.();
          }
        } else if (data.event === 'onError') {
          const code = typeof data.info === 'number' ? data.info : 150;
          onPlayerErrorRef.current?.(code);
        }
      } catch {
        // ignore non-JSON messages
      }
    };

    window.addEventListener('message', handleMessage);
    const handshakeInterval = window.setInterval(() => {
      if (!isBridgeReadyRef.current) {
        registerListening();
      }
    }, 350);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.clearInterval(handshakeInterval);
    };
  }, []);

  // Handle programmatic Play / Pause toggle from hardware transport controls
  useEffect(() => {
    if (togglePlayNonce <= 0) return;
    if (isBridgeReadyRef.current && iframeRef.current?.contentWindow) {
      sendCommand(desiredPaused ? 'pauseVideo' : 'playVideo', []);
    }
  }, [togglePlayNonce, desiredPaused]);

  // Handle video changes (youtubeId) or seek changes (seekNonce / startSeconds)
  useEffect(() => {
    const targetStart = Math.max(0, Math.floor(startSeconds || 0));
    lastLoadTimeRef.current = Date.now();
    lastCurrentTimeRef.current = targetStart;

    if (activeVideoIdRef.current !== youtubeId) {
      activeVideoIdRef.current = youtubeId;
      hasPlayedCurrentRef.current = false;
      endedFiredForCurrentRef.current = false;
      lastDurationRef.current = 0;

      if (isBridgeReadyRef.current && iframeRef.current?.contentWindow) {
        // Seamless in-iframe transition (preserves iOS Safari autoplay blessing!)
        sendCommand('loadVideoById', [youtubeId, targetStart]);
        sendCommand('playVideo', []);

        const fallbackTimer = window.setTimeout(() => {
          if (!hasPlayedCurrentRef.current) {
            setIframeSrc(buildEmbedUrl(youtubeId, targetStart));
          }
        }, 1800);
        return () => window.clearTimeout(fallbackTimer);
      } else {
        isBridgeReadyRef.current = false;
        setIsIframeLoaded(false);
        setIframeSrc(buildEmbedUrl(youtubeId, targetStart));
      }
      return;
    }

    // Same youtubeId, user triggered a seek or re-selected track
    if (seekNonce > 0) {
      endedFiredForCurrentRef.current = false;
      if (isBridgeReadyRef.current && iframeRef.current?.contentWindow) {
        sendCommand('seekTo', [targetStart, true]);
        sendCommand('playVideo', []);
      } else {
        setIframeSrc(buildEmbedUrl(youtubeId, targetStart));
      }
    }
  }, [youtubeId, startSeconds, seekNonce]);

  return (
    <div className="relative w-full h-full bg-[#0A0A0A] overflow-hidden select-none">
      {/* Thumbnail Backdrop while IFrame initializes (Prevents any dead black screen) */}
      {!isIframeLoaded && (
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img
            src={getYouTubeThumbnail(youtubeId, 'hq')}
            alt=""
            className="w-full h-full object-cover opacity-45 blur-[2px] scale-105"
          />
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
            <Disc3 className="w-8 h-8 text-[#E50914] animate-spin" />
            <span className="text-[10px] font-mono-tech font-bold text-[#FFFFFF]/80 tracking-widest uppercase">
              LOADING VINYL STREAM...
            </span>
          </div>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={iframeSrc}
        title={title}
        onLoad={() => {
          setIsIframeLoaded(true);
          registerListening();
        }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        allowFullScreen
        className="relative z-10 w-full h-full border-0"
      />
    </div>
  );
};
