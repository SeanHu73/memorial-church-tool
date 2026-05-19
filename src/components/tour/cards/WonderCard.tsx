'use client';

import { Stop } from '@/lib/types';
import PhotoContent from './PhotoContent';
import AudioButton from './AudioButton';
import BackButton from './BackButton';

interface Props {
  stop: Stop;
  onContinue: () => void;
}

export default function WonderCard({ stop, onContinue }: Props) {
  if (!stop.wonder) return null;

  return (
    <div className="animate-fade-in space-y-6 min-h-full flex flex-col justify-center">
      {/* Title */}
      <p className="text-4xl uppercase tracking-[0.14em] text-[#C4923A] font-bold">
        WONDER
      </p>

      {/* Audio player */}
      {stop.wonder?.audioUrl && <AudioButton audioUrl={stop.wonder.audioUrl} title={stop.wonder.audioTitle} />}

      {/* Subtitle */}
      <p className="text-2xl uppercase tracking-[0.14em] text-[#C4923A]/70 font-semibold -mt-3">
        Talk to each other...
      </p>

      {/* Discussion prompt + photos */}
      <PhotoContent
        text={stop.wonder.question}
        photos={stop.wonder.photos || []}
        textClass="text-[23px] leading-relaxed font-serif text-[#2C2418]"
      />

      {/* Continue + Back */}
      <div className="flex gap-2">
        <BackButton />
        <button
          onClick={onContinue}
          className="flex-1 py-3 rounded-lg text-base font-semibold text-white transition-colors"
          style={{ backgroundColor: '#C4923A' }}
        >
          We&apos;ve talked &mdash; show us
        </button>
      </div>
    </div>
  );
}
