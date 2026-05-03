'use client';

import { Stop } from '@/lib/types';
import PhotoContent from './PhotoContent';
import FormattedText from './FormattedText';
import WhatsNext from './WhatsNext';

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
              <FormattedText text={stop.reveal.bridgeText} />
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
        <WhatsNext
          stop={stop}
          isLastStop={isLastStop}
          onAskQuestion={onAskQuestion}
          onContinue={onAdvanceStop}
        />
      )}
    </div>
  );
}

