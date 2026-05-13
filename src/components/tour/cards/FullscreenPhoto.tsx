'use client';

/**
 * Fullscreen photo viewer — mobile-first.
 * Close via the bottom bar button or swipe down.
 * Pinch-to-zoom works because the image is NOT tappable-to-close.
 */

import { useEffect, useRef, useCallback } from 'react';

interface Props {
  url: string;
  caption: string | null;
  onClose: () => void;
}

export default function FullscreenPhoto({ url, caption, onClose }: Props) {
  const startYRef = useRef<number | null>(null);
  const movedRef = useRef(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // Swipe down to close (only single-finger, not during pinch)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      startYRef.current = e.touches[0].clientY;
      movedRef.current = false;
    }
  }, []);

  const handleTouchMove = useCallback(() => {
    movedRef.current = true;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (startYRef.current !== null && e.changedTouches.length === 1 && movedRef.current) {
      const dy = e.changedTouches[0].clientY - startYRef.current;
      if (dy > 100) onClose();
    }
    startYRef.current = null;
  }, [onClose]);

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 10000 }}
      className="bg-black flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Image area — pinch-zoom enabled, no tap-to-close */}
      <div
        className="flex-1 flex items-center justify-center overflow-auto"
        style={{ touchAction: 'manipulation' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={caption || ''}
          className="max-w-full max-h-full object-contain"
          draggable={false}
        />
      </div>

      {/* Bottom bar — always visible, thumb-reachable on mobile */}
      <div className="shrink-0 bg-black/90 border-t border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          {caption && (
            <p className="text-xs text-white/60 italic truncate">{caption}</p>
          )}
          <p className="text-[10px] text-white/30">Swipe down or tap close</p>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 ml-3 px-4 py-2 rounded-full bg-white/20 text-white text-sm font-semibold"
        >
          Close
        </button>
      </div>
    </div>
  );
}
