'use client';

/**
 * Audio narration button. Sits in the top-right of a card.
 * Tap to play/pause. Shows a speaker icon.
 */

import { useState, useRef, useEffect } from 'react';

interface Props {
  audioUrl: string;
}

export default function AudioButton({ audioUrl }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    // Create audio element
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.addEventListener('ended', () => setPlaying(false));
    return () => {
      audio.pause();
      audio.removeEventListener('ended', () => setPlaying(false));
    };
  }, [audioUrl]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().catch(() => {});
      setPlaying(true);
    }
  };

  return (
    <button
      onClick={toggle}
      className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
        playing
          ? 'bg-[#C4923A] text-white'
          : 'bg-[#D4BFA0]/40 text-[#6B5D4F] hover:bg-[#D4BFA0]/60'
      }`}
      title={playing ? 'Pause narration' : 'Play narration'}
    >
      {playing ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1" />
          <rect x="14" y="4" width="4" height="16" rx="1" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="6,4 20,12 6,20" />
        </svg>
      )}
    </button>
  );
}
