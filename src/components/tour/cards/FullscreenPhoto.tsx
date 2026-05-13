'use client';

/**
 * Fullscreen photo overlay. Tap a photo → it fills the screen.
 * Supports landscape rotation (object-contain fits the image).
 * Close button in the top-right corner.
 */

import { useEffect } from 'react';

interface Props {
  url: string;
  caption: string | null;
  onClose: () => void;
}

export default function FullscreenPhoto({ url, caption, onClose }: Props) {
  // Lock body scroll while open (though body is already overflow:hidden,
  // this prevents any edge-case scroll on the overlay itself)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col"
      onClick={onClose}
    >
      {/* Close button — top right */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white text-lg hover:bg-black/70 transition-colors"
        >
          &times;
        </button>
      </div>

      {/* Image — centered, object-contain so landscape photos fit naturally */}
      <div className="flex-1 flex items-center justify-center p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={caption || ''}
          className="max-w-full max-h-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Caption */}
      {caption && (
        <div className="shrink-0 px-6 pb-6 text-center">
          <p className="text-sm text-white/70 italic">{caption}</p>
        </div>
      )}
    </div>
  );
}
