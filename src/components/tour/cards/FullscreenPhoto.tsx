'use client';

/**
 * Fullscreen photo viewer. Simple, reliable.
 * Tap × or backdrop to close. Pinch-to-zoom via CSS touch-action.
 */

import { useEffect } from 'react';

interface Props {
  url: string;
  caption: string | null;
  onClose: () => void;
}

export default function FullscreenPhoto({ url, caption, onClose }: Props) {
  // Escape to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <>
      {/* Close button — portal-level fixed, highest z-index */}
      <button
        onClick={onClose}
        style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999 }}
        className="w-12 h-12 rounded-full bg-black/70 flex items-center justify-center text-white text-2xl shadow-lg"
      >
        &times;
      </button>

      {/* Fullscreen overlay */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
        className="bg-black flex flex-col"
        onClick={onClose}
      >
        {/* Image container — pinch-manipulate allows native browser zoom */}
        <div
          className="flex-1 flex items-center justify-center p-2 overflow-auto"
          style={{ touchAction: 'pinch-zoom' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={caption || ''}
            className="max-w-full max-h-full object-contain"
            draggable={false}
          />
        </div>

        {/* Caption */}
        {caption && (
          <div
            className="shrink-0 px-4 pb-4 pt-2 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-white/70 italic">{caption}</p>
          </div>
        )}
      </div>
    </>
  );
}
