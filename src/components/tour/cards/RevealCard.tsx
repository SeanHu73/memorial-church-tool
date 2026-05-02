'use client';

import { Stop } from '@/lib/types';

interface Props {
  stop: Stop;
  hasWonder: boolean;
  isLastStop: boolean;
  onContinue: () => void;
  /** Called when wonder exists — advances to reflect phase */
  onAdvancePhase: () => void;
  /** Called from the no-wonder branch buttons */
  onAskQuestion: () => void;
  onAdvanceStop: () => void;
}

export default function RevealCard({
  stop,
  hasWonder,
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

      {hasWonder ? (
        <>
          {/* Bridge text shown before reflect */}
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
          {/* No wonder → no reflection. Show bridge + branch buttons inline. */}
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
