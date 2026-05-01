'use client';

import { useState } from 'react';
import { Stop } from '@/lib/types';

interface Props {
  stop: Stop;
  isLastStop: boolean;
  onAskQuestion: () => void;
  onContinue: () => void;
  onAddReflection: (score: number) => void;
}

export default function ReflectCard({
  stop,
  isLastStop,
  onAskQuestion,
  onContinue,
  onAddReflection,
}: Props) {
  const [score, setScore] = useState(0.5);
  const [reflected, setReflected] = useState(false);

  const handleReflect = () => {
    onAddReflection(score);
    setReflected(true);
  };

  return (
    <div className="animate-fade-in space-y-6">
      {!reflected ? (
        <>
          {/* Reflection prompt */}
          <p className="text-sm font-semibold text-[#2C2418]">
            How close was your theory?
          </p>

          {/* Sliding scale */}
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={score}
              onChange={(e) => setScore(parseFloat(e.target.value))}
              className="w-full accent-[#C4923A]"
            />
            <div className="flex justify-between text-[11px] text-[#6B5D4F]">
              <span>Not what we expected</span>
              <span>Exactly what we thought</span>
            </div>
          </div>

          <button
            onClick={handleReflect}
            className="w-full py-3 rounded-lg text-sm font-semibold bg-[#6B5D4F] text-white"
          >
            Submit reflection
          </button>
        </>
      ) : (
        <>
          {/* Post-reflection: bridge + branch */}
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
              Ask our own question
            </button>
            <button
              onClick={onContinue}
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
