import React, { useEffect, useRef, useState } from 'react';
import { Disc3 } from 'lucide-react';
import { getYouTubeThumbnail } from '../utils/youtube';

interface YouTubePlayerProps {
  youtubeId: string;
  startSeconds: number;
  seekNonce: number;
  title: string;
  onTimeUpdate: (
    currentSeconds: number,
    duration: number,
    isPaused: boolean
  ) => void;
  onEnded?: () => void;
}

function buildEmbedUrl(youtubeId: string, startSeconds: number): string {
  const start = Math.max(0, Math.floor(startSeconds || 0));
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://1verce.vercel.app';
  const params = new URLSearchParams({
    autoplay: '1',
    start: String(start),
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    enablejsapi: '1',
    origin,
  });
  return `https://www.youtube.com/embed/${encodeURIComponent(youtubeId)}?${params.toString()}`;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  youtubeId,
  startSeconds,
  seekNonce,
  title,
  onTimeUpdate,
  onEnded,
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

  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onEndedRef = useRef(onEnded);
  onTimeUpdateRef.current = onTimeUpdate;
  onEndedRef.current = onEnded;

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

          if (cur !== null && cur > 0.5) {
            hasPlayedCurrentRef.current = true;
          }

          if (cur !== null) {
            onTimeUpdateRef.current(
              cur,
              dur || 0,
              state === 2
            );
          }

          if (
            state === 0 &&
            hasPlayedCurrentRef.current &&
            !endedFiredForCurrentRef.current
          ) {
            endedFiredForCurrentRef.current = true;
            onEndedRef.current?.();
          }
        } else if (data.event === 'onStateChange') {
          const state = data.info;
          if (state === 1) {
            hasPlayedCurrentRef.current = true;
          }
          if (
            state === 0 &&
            hasPlayedCurrentRef.current &&
            !endedFiredForCurrentRef.current
          ) {
            endedFiredForCurrentRef.current = true;
            onEndedRef.current?.();
          }
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

  // Handle video changes (youtubeId) or seek changes (seekNonce / startSeconds)
  useEffect(() => {
    const targetStart = Math.max(0, Math.floor(startSeconds || 0));

    if (activeVideoIdRef.current !== youtubeId) {
      activeVideoIdRef.current = youtubeId;
      hasPlayedCurrentRef.current = false;
      endedFiredForCurrentRef.current = false;

      if (isBridgeReadyRef.current && iframeRef.current?.contentWindow) {
        // Seamless in-iframe transition (preserves iOS Safari autoplay blessing!)
        sendCommand('loadVideoById', [youtubeId, targetStart]);
        sendCommand('playVideo', []);

        // Fallback safety: if iframeSrc hasn't updated and bridge didn't start playing, also sync src if needed
        const fallbackTimer = window.setTimeout(() => {
          if (!hasPlayedCurrentRef.current) {
            setIframeSrc(buildEmbedUrl(youtubeId, targetStart));
          }
        }, 700);
        return () => window.clearTimeout(fallbackTimer);
      } else {
        isBridgeReadyRef.current = false;
        setIsIframeLoaded(false);
        setIframeSrc(buildEmbedUrl(youtubeId, targetStart));
      }
      return;
    }

    // Same youtubeId, user triggered a seek
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
