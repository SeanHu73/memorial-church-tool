'use client';

/**
 * Fullscreen photo viewer. The image fills the entire screen edge-to-edge.
 * Supports pinch-to-zoom and double-tap-to-zoom. Close button top-right.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface Props {
  url: string;
  caption: string | null;
  onClose: () => void;
}

export default function FullscreenPhoto({ url, caption, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const lastPinchDistRef = useRef<number | null>(null);
  const doubleTapRef = useRef(0);

  // Escape to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Reset transform
  const resetTransform = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  // Double-tap to zoom in/out
  const handleDoubleTap = useCallback(() => {
    if (scale > 1) {
      resetTransform();
    } else {
      setScale(2.5);
    }
  }, [scale, resetTransform]);

  // Touch handlers for pinch-zoom and pan
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDistRef.current = Math.sqrt(dx * dx + dy * dy);
    } else if (e.touches.length === 1) {
      // Double-tap detection
      const now = Date.now();
      if (now - doubleTapRef.current < 300) {
        e.preventDefault();
        handleDoubleTap();
        doubleTapRef.current = 0;
      } else {
        doubleTapRef.current = now;
      }
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      if (scale > 1) setIsDragging(true);
    }
  }, [scale, handleDoubleTap]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch zoom
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastPinchDistRef.current !== null) {
        const delta = dist / lastPinchDistRef.current;
        setScale((s) => Math.min(Math.max(s * delta, 1), 5));
      }
      lastPinchDistRef.current = dist;
    } else if (e.touches.length === 1 && isDragging && lastTouchRef.current) {
      // Pan when zoomed
      e.preventDefault();
      const dx = e.touches[0].clientX - lastTouchRef.current.x;
      const dy = e.touches[0].clientY - lastTouchRef.current.y;
      setTranslate((t) => ({ x: t.x + dx, y: t.y + dy }));
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    lastPinchDistRef.current = null;
    lastTouchRef.current = null;
    setIsDragging(false);
  }, []);

  // Mouse wheel zoom (desktop)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((s) => Math.min(Math.max(s * delta, 1), 5));
  }, []);

  // Mouse drag for panning (desktop)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      lastTouchRef.current = { x: e.clientX, y: e.clientY };
    }
  }, [scale]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && lastTouchRef.current) {
      const dx = e.clientX - lastTouchRef.current.x;
      const dy = e.clientY - lastTouchRef.current.y;
      setTranslate((t) => ({ x: t.x + dx, y: t.y + dy }));
      lastTouchRef.current = { x: e.clientX, y: e.clientY };
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    lastTouchRef.current = null;
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black touch-none select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Close button — top right, always above image */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center text-white text-lg"
      >
        &times;
      </button>

      {/* Image — fills the screen, zoomable */}
      <div
        className="w-full h-full flex items-center justify-center overflow-hidden"
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={caption || ''}
          className="w-full h-full object-contain"
          draggable={false}
        />
      </div>

      {/* Caption — bottom, fades out when zoomed */}
      {caption && scale <= 1.1 && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-4 pt-8">
          <p className="text-sm text-white/80 italic text-center">{caption}</p>
        </div>
      )}

      {/* Zoom hint — only when not zoomed */}
      {scale <= 1 && (
        <div className="absolute bottom-16 inset-x-0 text-center">
          <p className="text-[10px] text-white/30">Pinch or double-tap to zoom</p>
        </div>
      )}
    </div>
  );
}
