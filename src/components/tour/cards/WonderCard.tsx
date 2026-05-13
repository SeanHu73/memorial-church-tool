'use client';

import { Stop } from '@/lib/types';
import PhotoContent from './PhotoContent';
import AudioButton from './AudioButton';

interface Props {
  stop: Stop;
  onContinue: () => void;
}

export default function WonderCard({ stop, onContinue }: Props) {
  if (!stop.wonder) return null;

  return (
    <div className="animate-fade-in space-y-6 min-h-full flex flex-col justify-center">
      {/* Title + audio */}
      <div className="flex items-center justify-between">
        <p className="text-xl uppercase tracking-[0.14em] text-[#C4923A] font-semibold">
          Wonder together...
        </p>
        {stop.wonder?.audioUrl && <AudioButton audioUrl={stop.wonder.audioUrl} />}
      </div>

      {/* Discussion prompt + photos */}
      <PhotoContent
        text={stop.wonder.question}
        photos={stop.wonder.photos || []}
        textClass="text-[19px] leading-relaxed font-serif text-[#2C2418]"
      />

      {/* Explicit group instruction */}
      <p className="text-sm text-[#6B5D4F] italic">
        Talk together about this before continuing. There are no right or wrong
        answers &mdash; the next card will add context to your thinking.
      </p>

      {/* Continue */}
      <button
        onClick={onContinue}
        className="w-full py-3 rounded-lg text-sm font-semibold text-white transition-colors"
        style={{ backgroundColor: '#C4923A' }}
      >
        We&apos;ve talked &mdash; show us
      </button>
    </div>
  );
}
