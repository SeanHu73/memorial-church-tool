'use client';

/**
 * Essential Question — Final reflection screen.
 * Cognitive slider + all follow-up reflections + perceptual slider.
 */

import { useState } from 'react';

const WHAT_SHIFTED_OPTIONS = [
  'We learned something new',
  'We changed our mind',
  'We had part of it',
  'We were surprised',
];

const REASONING_SOURCE_OPTIONS = [
  'What we could see here',
  'Something we discussed',
  'Something we already knew',
  'A guess',
];

interface Props {
  onComplete: (
    cognitive: number,
    perceptual: number | null,
    whatShifted: string[] | null,
    reasoningSource: string[] | null
  ) => void;
}

export default function EqFinalReflectCard({ onComplete }: Props) {
  const [cognitiveSlider, setCognitiveSlider] = useState(0.5);
  const [cognitiveReleased, setCognitiveReleased] = useState(false);
  const [perceptualSlider, setPerceptualSlider] = useState(0.5);
  const [whatShifted, setWhatShifted] = useState<string[]>([]);
  const [reasoningSource, setReasoningSource] = useState<string[]>([]);

  const toggleChip = (list: string[], item: string): string[] =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

  return (
    <div className="animate-fade-in space-y-6 min-h-full flex flex-col justify-center">
      <p className="text-xl uppercase tracking-[0.14em] text-[#6B5D4F] font-semibold">
        Final Reflections
      </p>

      {/* Cognitive slider */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-[#2C2418]">
          How much did this tour change your answer to the original question?
        </p>
        <input
          type="range"
          min="0" max="1" step="0.01"
          value={cognitiveSlider}
          onChange={(e) => setCognitiveSlider(parseFloat(e.target.value))}
          onMouseUp={() => setCognitiveReleased(true)}
          onTouchEnd={() => setCognitiveReleased(true)}
          className="w-full accent-[#C4923A]"
        />
        <div className="flex justify-between text-[11px] text-[#6B5D4F]">
          <span>Confirmed what we thought</span>
          <span>Shifted our thinking</span>
        </div>
      </div>

      {/* Follow-ups — fade in after slider released */}
      {cognitiveReleased && (
        <div className="space-y-6 animate-fade-in">
          {/* What shifted — multi-select */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[#2C2418]">What shifted?</p>
            <div className="flex flex-wrap gap-2">
              {WHAT_SHIFTED_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setWhatShifted(toggleChip(whatShifted, opt))}
                  className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                    whatShifted.includes(opt)
                      ? 'bg-[#C4923A]/20 border-2 border-[#C4923A] text-[#2C2418] font-semibold'
                      : 'bg-[#F0E0C8] border-2 border-transparent text-[#6B5D4F] hover:border-[#D4BFA0]'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Reasoning source — multi-select */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[#2C2418]">Where did your thinking come from?</p>
            <div className="flex flex-wrap gap-2">
              {REASONING_SOURCE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setReasoningSource(toggleChip(reasoningSource, opt))}
                  className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                    reasoningSource.includes(opt)
                      ? 'bg-[#C4923A]/20 border-2 border-[#C4923A] text-[#2C2418] font-semibold'
                      : 'bg-[#F0E0C8] border-2 border-transparent text-[#6B5D4F] hover:border-[#D4BFA0]'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Perceptual slider */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-[#2C2418]">
              How much did this change how you see this place?
            </p>
            <input
              type="range"
              min="0" max="1" step="0.01"
              value={perceptualSlider}
              onChange={(e) => setPerceptualSlider(parseFloat(e.target.value))}
              className="w-full accent-[#C4923A]"
            />
            <div className="flex justify-between text-[11px] text-[#6B5D4F]">
              <span>Same as before</span>
              <span>I see it completely differently now</span>
            </div>
          </div>

          {/* Continue */}
          <button
            onClick={() => onComplete(
              cognitiveSlider,
              perceptualSlider,
              whatShifted.length > 0 ? whatShifted : null,
              reasoningSource.length > 0 ? reasoningSource : null
            )}
            className="w-full py-3 rounded-lg text-sm font-semibold bg-[#6B5D4F] text-white"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
