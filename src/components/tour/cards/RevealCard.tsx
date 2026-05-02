'use client';

import { Stop } from '@/lib/types';

interface Props {
  stop: Stop;
  onContinue: () => void;
}

export default function RevealCard({ stop, onContinue }: Props) {
  return (
    <div className="animate-fade-in space-y-4 min-h-full flex flex-col justify-center">
      {/* Reveal text — blur-to-sharp animation */}
      <div className="animate-blur-reveal border-l-4 border-[#C4923A] pl-4">
        <p className="text-[17px] leading-relaxed font-serif text-[#2C2418]">
          {stop.reveal.text}
        </p>
      </div>

      {/* Optional photo */}
      {stop.reveal.photoUrl && (
        <div className="rounded-lg overflow-hidden shadow-md border border-[#D4BFA0]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={stop.reveal.photoUrl}
            alt={stop.reveal.photoCaption || ''}
            className="w-full h-40 object-cover"
          />
          {stop.reveal.photoCaption && (
            <p className="text-xs text-[#6B5D4F] px-3 py-1.5 bg-[#F0E0C8]/50 italic">
              {stop.reveal.photoCaption}
            </p>
          )}
        </div>
      )}

      {/* Bridge text */}
      {stop.reveal.bridgeText && (
        <p className="text-sm text-[#6B5D4F] italic leading-relaxed">
          {stop.reveal.bridgeText}
        </p>
      )}

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
