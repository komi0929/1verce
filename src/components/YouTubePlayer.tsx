import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement | string,
        options: {
          videoId: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (event: { target: YTPlayerInstance }) => void;
            onStateChange?: (event: {
              data: number;
              target: YTPlayerInstance;
            }) => void;
          };
        }
      ) => YTPlayerInstance;
      PlayerState?: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export interface YTPlayerInstance {
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  loadVideoById: (options: { videoId: string; startSeconds?: number }) => void;
  destroy: () => void;
}

let apiLoadPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.YT && window.YT.Player) {
    return Promise.resolve();
  }
  if (apiLoadPromise) return apiLoadPromise;

  apiLoadPromise = new Promise<void>((resolve) => {
    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevCallback?.();
      resolve();
    };

    const existingScript = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    );
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return apiLoadPromise;
}

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

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  youtubeId,
  startSeconds,
  seekNonce,
  title,
  onTimeUpdate,
  onEnded,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const isReadyRef = useRef(false);
  const currentVideoIdRef = useRef(youtubeId);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onEndedRef = useRef(onEnded);

  onTimeUpdateRef.current = onTimeUpdate;
  onEndedRef.current = onEnded;

  // Initialize YT.Player
  useEffect(() => {
    let mounted = true;
    let pollTimer: number | null = null;

    loadYouTubeApi().then(() => {
      if (!mounted || !containerRef.current || !window.YT?.Player) return;

      const playerDiv = document.createElement('div');
      playerDiv.title = title;
      playerDiv.className = 'w-full h-full';
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(playerDiv);

      const initialStart = Math.max(0, Math.floor(startSeconds || 0));
      currentVideoIdRef.current = youtubeId;
      isReadyRef.current = false;

      const player = new window.YT.Player(playerDiv, {
        videoId: youtubeId,
        playerVars: {
          autoplay: 1,
          start: initialStart,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (e) => {
            if (!mounted) return;
            isReadyRef.current = true;
            if (initialStart > 0) {
              try {
                e.target.seekTo(initialStart, true);
              } catch {
                // ignore
              }
            }
            try {
              e.target.playVideo();
            } catch {
              // ignore
            }
          },
          onStateChange: (e) => {
            if (!mounted) return;
            try {
              const cur = e.target.getCurrentTime() || 0;
              const dur = e.target.getDuration() || 0;
              const paused = e.data === 2;
              onTimeUpdateRef.current(cur, dur, paused);
            } catch {
              // ignore
            }
            if (e.data === 0) {
              onEndedRef.current?.();
            }
          },
        },
      });

      playerRef.current = player;

      pollTimer = window.setInterval(() => {
        if (!mounted || !isReadyRef.current || !playerRef.current) return;
        try {
          const cur = playerRef.current.getCurrentTime();
          const dur = playerRef.current.getDuration();
          const state = playerRef.current.getPlayerState();
          if (typeof cur === 'number' && !isNaN(cur)) {
            onTimeUpdateRef.current(cur, dur || 0, state === 2);
          }
        } catch {
          // ignore
        }
      }, 250);
    });

    return () => {
      mounted = false;
      if (pollTimer !== null) {
        window.clearInterval(pollTimer);
      }
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
        playerRef.current = null;
      }
      isReadyRef.current = false;
    };
    // Only recreate if youtubeId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [youtubeId]);

  // Fast instant seek without reloading iframe when seekNonce or startSeconds changes
  useEffect(() => {
    if (!isReadyRef.current || !playerRef.current) return;
    if (currentVideoIdRef.current !== youtubeId) return;

    const targetSec = Math.max(0, Math.floor(startSeconds || 0));
    try {
      playerRef.current.seekTo(targetSec, true);
      playerRef.current.playVideo();
      const dur = playerRef.current.getDuration() || 0;
      onTimeUpdateRef.current(targetSec, dur, false);
    } catch {
      // ignore
    }
  }, [seekNonce, startSeconds, youtubeId]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-[#0A0A0A] [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0"
    />
  );
};
