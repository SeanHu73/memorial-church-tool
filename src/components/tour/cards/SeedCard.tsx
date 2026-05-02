'use client';

import { Stop } from '@/lib/types';

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

      {/* Photo inset — postcard feel */}
      {stop.seed.photoUrl && (
        <div className="rounded-lg overflow-hidden shadow-md border-4 border-[#FFF8EE]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={stop.seed.photoUrl}
            alt={stop.seed.photoCaption || ''}
            className="w-full h-48 object-cover"
          />
          {stop.seed.photoCaption && (
            <p className="text-xs text-[#6B5D4F] px-3 py-1.5 bg-[#F0E0C8]/50 italic">
              {stop.seed.photoCaption}
            </p>
          )}
        </div>
      )}

      {/* Context text */}
      <p className="text-[17px] leading-relaxed font-serif text-[#2C2418]">
        {stop.seed.text}
      </p>

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
