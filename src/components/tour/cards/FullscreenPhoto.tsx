'use client';

/**
 * Fullscreen photo viewer.
 * Close by: tapping the × button, tapping the image, swiping down,
 * or pressing Escape.
 */

import { useEffect, useRef, useCallback } from 'react';

interface Props {
  url: string;
  caption: string | null;
  onClose: () => void;
}

export default function FullscreenPhoto({ url, caption, onClose }: Props) {
  const startYRef = useRef<number | null>(null);

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

  // Swipe down to close
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      startYRef.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (startYRef.current !== null && e.changedTouches.length === 1) {
      const dy = e.changedTouches[0].clientY - startYRef.current;
      if (dy > 80) onClose(); // swipe down > 80px closes
    }
    startYRef.current = null;
  }, [onClose]);

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 10000 }}
      className="bg-black flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close button — below the journal header area */}
      <div className="shrink-0 flex justify-end px-4 py-3">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-xl"
        >
          &times;
        </button>
      </div>

      {/* Image — tap to close */}
      <div
        className="flex-1 flex items-center justify-center px-2 pb-2 overflow-auto"
        style={{ touchAction: 'pinch-zoom' }}
        onClick={onClose}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={caption || ''}
          className="max-w-full max-h-full object-contain"
          draggable={false}
        />
      </div>

      {/* Caption + hint */}
      <div className="shrink-0 px-4 pb-4 text-center space-y-1">
        {caption && (
          <p className="text-sm text-white/70 italic">{caption}</p>
        )}
        <p className="text-[10px] text-white/30">Tap image or swipe down to close</p>
      </div>
    </div>
  );
}
