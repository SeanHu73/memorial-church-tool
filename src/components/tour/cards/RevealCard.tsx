'use client';

import { useState } from 'react';
import { Stop } from '@/lib/types';
import PhotoContent from './PhotoContent';
import AudioButton from './AudioButton';

interface Props {
  stop: Stop;
  onContinue: () => void;
}

export default function RevealCard({ stop, onContinue }: Props) {
  const hasAudio = !!stop.reveal.audioUrl;
  const [textExpanded, setTextExpanded] = useState(!hasAudio);

  return (
    <div className="animate-fade-in space-y-4 min-h-full flex flex-col justify-center">
      {/* Title */}
      <p className="text-xl uppercase tracking-[0.14em] text-[#C4923A] font-semibold">
        Context
      </p>

      {/* Audio player */}
      {hasAudio && <AudioButton audioUrl={stop.reveal.audioUrl!} title={stop.reveal.audioTitle} />}

      {/* Reveal content — collapsible when audio exists */}
      {hasAudio && !textExpanded ? (
        <button
          onClick={() => setTextExpanded(true)}
          className="text-sm text-[#C4923A] italic flex items-center gap-1"
        >
          <span className="text-[10px]">▶</span>
          Tap to read along
        </button>
      ) : (
        <div className={hasAudio ? 'animate-fade-in' : 'animate-blur-reveal'}>
          {hasAudio && (
            <button
              onClick={() => setTextExpanded(false)}
              className="text-xs text-[#6B5D4F]/50 mb-2 flex items-center gap-1"
            >
              <span className="text-[10px]">▼</span>
              Hide text
            </button>
          )}
          <PhotoContent
            text={stop.reveal.text}
            photos={stop.reveal.photos || []}
            legacyPhotoUrl={stop.reveal.photoUrl}
            legacyPhotoCaption={stop.reveal.photoCaption}
            borderColor="#C4923A"
          />
        </div>
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
