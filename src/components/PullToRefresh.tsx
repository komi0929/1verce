import React, { useEffect, useState, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
}

const PULL_THRESHOLD = 70;

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
}) => {
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY <= 2 && e.touches.length === 1 && !isRefreshing) {
        startYRef.current = e.touches[0].clientY;
        isPullingRef.current = true;
      } else {
        isPullingRef.current = false;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current || isRefreshing) return;
      const currentY = e.touches[0].clientY;
      const diff = currentY - startYRef.current;
      if (diff > 0 && window.scrollY <= 2) {
        // Friction dampening
        const clamped = Math.min(diff * 0.45, PULL_THRESHOLD * 1.4);
        setPullY(clamped);
        if (clamped >= PULL_THRESHOLD && pullY < PULL_THRESHOLD) {
          triggerHaptic('light');
        }
      } else {
        setPullY(0);
      }
    };

    const onTouchEnd = async () => {
      if (!isPullingRef.current) return;
      isPullingRef.current = false;
      if (pullY >= PULL_THRESHOLD && !isRefreshing) {
        setIsRefreshing(true);
        triggerHaptic('medium');
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setPullY(0);
        }
      } else {
        setPullY(0);
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [pullY, isRefreshing, onRefresh]);

  const progress = Math.min(pullY / PULL_THRESHOLD, 1);

  return (
    <div className="relative w-full">
      {/* Pull Indicator Pill */}
      {(pullY > 0 || isRefreshing) && (
        <div
          aria-hidden="true"
          className="fixed top-14 left-0 right-0 z-30 flex items-center justify-center pointer-events-none transition-transform"
          style={{ transform: `translateY(${Math.min(pullY * 0.4, 28)}px)` }}
        >
          <div className="px-3 py-1 rounded-full bg-[#1C1C1E]/95 border border-[#2C2C2E] shadow-xl flex items-center gap-1.5 text-[11px] font-jp text-[#E5E5EA]">
            <RefreshCw
              className={`w-3.5 h-3.5 text-[#E50914] ${
                isRefreshing ? 'animate-spin' : ''
              }`}
              style={{
                transform: isRefreshing ? undefined : `rotate(${progress * 180}deg)`,
              }}
            />
            <span className="font-bold">
              {isRefreshing
                ? '更新中...'
                : pullY >= PULL_THRESHOLD
                ? '指を離して更新'
                : '下に引いて更新'}
            </span>
          </div>
        </div>
      )}
      {children}
    </div>
  );
};
