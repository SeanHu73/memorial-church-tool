'use client';

import { Stop } from '@/lib/types';
import PhotoContent from './PhotoContent';

interface Props {
  stop: Stop;
  onContinue: () => void;
}

export default function SeedCard({ stop, onContinue }: Props) {
  return (
    <div className="animate-fade-in space-y-4 min-h-full flex flex-col justify-center">
      {/* Title */}
      <p className="text-xl uppercase tracking-[0.14em] text-[#7A7A5E] font-semibold">
        Background...
      </p>

      {/* Text + photos interleaved via [photo:N] markers */}
      <PhotoContent
        text={stop.seed.text}
        photos={stop.seed.photos || []}
        legacyPhotoUrl={stop.seed.photoUrl}
        legacyPhotoCaption={stop.seed.photoCaption}
      />

      {/* Continue */}
      <button
        onClick={onContinue}
        className="w-full py-3 rounded-lg text-sm font-semibold text-white transition-colors"
        style={{ backgroundColor: '#7A7A5E' }}
      >
        Continue &rarr;
      </button>
    </div>
  );
}
