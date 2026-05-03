'use client';

import { Stop } from '@/lib/types';
import PhotoContent from './PhotoContent';

interface Props {
  stop: Stop;
  onContinue: () => void;
}

export default function RevealCard({ stop, onContinue }: Props) {
  return (
    <div className="animate-fade-in space-y-4 min-h-full flex flex-col justify-center">
      {/* Title */}
      <p className="text-xl uppercase tracking-[0.14em] text-[#C4923A] font-semibold">
        Context
      </p>

      {/* Reveal content — text interleaved with photos via [photo:N] markers */}
      <div className="animate-blur-reveal">
        <PhotoContent
          text={stop.reveal.text}
          photos={stop.reveal.photos || []}
          legacyPhotoUrl={stop.reveal.photoUrl}
          legacyPhotoCaption={stop.reveal.photoCaption}
          borderColor="#C4923A"
        />
      </div>

      {/* Continue */}
      <button
        onClick={onContinue}
        className="w-full py-3 rounded-lg text-sm font-semibold bg-[#C4923A] text-white transition-colors"
      >
        Continue
      </button>
    </div>
  );
}
