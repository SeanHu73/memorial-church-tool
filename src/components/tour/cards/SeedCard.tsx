'use client';

import { useState, useEffect } from 'react';
import { Stop } from '@/lib/types';
import PhotoContent from './PhotoContent';
import AudioButton from './AudioButton';

interface Props {
  stop: Stop;
  onContinue: () => void;
}

export default function SeedCard({ stop, onContinue }: Props) {
  const timerDuration = stop.seed.timerSeconds ?? null;
  const [secondsLeft, setSecondsLeft] = useState(timerDuration);
  const timerActive = timerDuration !== null;
  const timerDone = !timerActive || (secondsLeft !== null && secondsLeft <= 0);

  useEffect(() => {
    if (!timerActive || timerDone) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max((s ?? 0) - 1, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, timerDone]);

  return (
    <div className="animate-fade-in space-y-4 min-h-full flex flex-col justify-center">
      {/* Title */}
      <p className="text-2xl uppercase tracking-[0.14em] text-[#7A7A5E] font-semibold">
        Background...
      </p>

      {/* Audio player */}
      {stop.seed.audioUrl && <AudioButton audioUrl={stop.seed.audioUrl} title={stop.seed.audioTitle} />}

      {/* Text + photos interleaved via [photo:N] markers */}
      <PhotoContent
        text={stop.seed.text}
        photos={stop.seed.photos || []}
        legacyPhotoUrl={stop.seed.photoUrl}
        legacyPhotoCaption={stop.seed.photoCaption}
      />

      {/* Timer (if enabled) */}
      {timerActive && !timerDone && (
        <p className="text-xs text-[#6B5D4F] text-center">
          Take your time processing this... {secondsLeft}s... or continue whenever you are ready
        </p>
      )}

      {/* Continue */}
      <button
        onClick={onContinue}
        className={`w-full py-3 rounded-lg text-base font-semibold transition-colors ${
          timerDone
            ? 'bg-[#7A7A5E] text-white'
            : 'bg-[#7A7A5E]/20 text-[#7A7A5E]'
        }`}
      >
        Continue &rarr;
      </button>
    </div>
  );
}
