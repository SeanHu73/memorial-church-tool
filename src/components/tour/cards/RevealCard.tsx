'use client';

import { Stop } from '@/lib/types';
import PhotoContent from './PhotoContent';

interface Props {
  stop: Stop;
  hasReflect: boolean;
  isLastStop: boolean;
  /** Advances to reflect phase */
  onAdvancePhase: () => void;
  /** Branch buttons when reflect is skipped */
  onAskQuestion: () => void;
  onAdvanceStop: () => void;
}

export default function RevealCard({
  stop,
  hasReflect,
  isLastStop,
  onAdvancePhase,
  onAskQuestion,
  onAdvanceStop,
}: Props) {
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

      {hasReflect ? (
        <>
          {stop.reveal.bridgeText && (
            <p className="text-sm text-[#6B5D4F] italic leading-relaxed">
              {stop.reveal.bridgeText}
            </p>
          )}
          <button
            onClick={onAdvancePhase}
            className="w-full py-3 rounded-lg text-sm font-semibold bg-[#C4923A] text-white transition-colors"
          >
            Continue
          </button>
        </>
      ) : (
        <>
          {/* No reflection — show bridge + branch buttons inline */}
          <p className="text-xl uppercase tracking-[0.14em] text-[#C4923A] font-semibold mt-2">
            What&apos;s next...
          </p>
          {stop.reveal.bridgeText && (
            <p className="text-sm text-[#6B5D4F] italic leading-relaxed">
              {stop.reveal.bridgeText}
            </p>
          )}
          <div className="space-y-3">
            <button
              onClick={onAskQuestion}
              className="w-full py-3 rounded-lg text-sm font-semibold border-2 border-[#C4923A] text-[#C4923A] bg-[#C4923A]/10"
            >
              Ask any remaining questions
            </button>
            <button
              onClick={onAdvanceStop}
              className="w-full py-3 rounded-lg text-sm font-semibold bg-[#7A7A5E] text-white"
            >
              {isLastStop ? 'Finish the tour' : 'Continue the tour'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

