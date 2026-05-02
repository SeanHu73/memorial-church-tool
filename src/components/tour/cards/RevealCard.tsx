'use client';

import { Stop } from '@/lib/types';

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
      <RevealContent stop={stop} />

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

/**
 * Renders reveal text with photos interleaved at [photo:N] marker positions.
 * Photos not referenced by any marker are appended at the end.
 * The legacy single photoUrl is treated as photo 0 (before the photos array).
 */
function RevealContent({ stop }: { stop: Stop }) {
  // Build the full photo list: legacy single + array
  const allPhotos = [
    ...(stop.reveal.photoUrl ? [{ url: stop.reveal.photoUrl, caption: stop.reveal.photoCaption }] : []),
    ...(stop.reveal.photos || []),
  ].filter((p) => p.url);

  // Split text on [photo:N] markers
  const parts = stop.reveal.text.split(/\[photo:(\d+)\]/gi);
  const usedIndices = new Set<number>();

  return (
    <div className="animate-blur-reveal space-y-4">
      {parts.map((part, i) => {
        // Odd indices are the captured group (the number)
        if (i % 2 === 1) {
          const photoIndex = parseInt(part, 10) - 1; // [photo:1] → index 0
          if (photoIndex >= 0 && photoIndex < allPhotos.length) {
            usedIndices.add(photoIndex);
            return <PhotoBlock key={`photo-${i}`} photo={allPhotos[photoIndex]} />;
          }
          return null; // invalid index — skip
        }
        // Even indices are text segments
        const trimmed = part.trim();
        if (!trimmed) return null;
        return (
          <div key={`text-${i}`} className="border-l-4 border-[#C4923A] pl-4">
            <p className="text-[17px] leading-relaxed font-serif text-[#2C2418]">
              {trimmed}
            </p>
          </div>
        );
      })}

      {/* Remaining photos not referenced by markers */}
      {allPhotos.map((photo, i) => {
        if (usedIndices.has(i)) return null;
        return <PhotoBlock key={`remaining-${i}`} photo={photo} />;
      })}
    </div>
  );
}

function PhotoBlock({ photo }: { photo: { url: string; caption: string | null } }) {
  return (
    <div className="rounded-lg overflow-hidden shadow-md border border-[#D4BFA0]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt={photo.caption || ''}
        className="w-full h-40 object-cover"
      />
      {photo.caption && (
        <p className="text-xs text-[#6B5D4F] px-3 py-1.5 bg-[#F0E0C8]/50 italic">
          {photo.caption}
        </p>
      )}
    </div>
  );
}
