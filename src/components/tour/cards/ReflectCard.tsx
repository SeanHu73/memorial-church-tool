'use client';

import { useState } from 'react';
import { Stop } from '@/lib/types';

const DEFAULT_WHAT_SHIFTED = [
  'We learned something new',
  'We changed our mind',
  'We had part of it',
  'It was as we expected',
];

const DEFAULT_REASONING_SOURCE = [
  'What we observed here',
  'Something we already knew',
  'A guess',
];

interface Props {
  stop: Stop;
  hasWonder: boolean;
  isLastStop: boolean;
  onAskQuestion: () => void;
  onContinue: () => void;
  onAddReflection: (sliderValue: number, followUpResponse: string | null) => void;
}

export default function ReflectCard({
  stop,
  hasWonder,
  isLastStop,
  onAskQuestion,
  onContinue,
  onAddReflection,
}: Props) {
  const [sliderValue, setSliderValue] = useState(0.5);
  const [sliderReleased, setSliderReleased] = useState(false);
  const [followUpChoice, setFollowUpChoice] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(!hasWonder);

  const reflect = stop.reflect ?? {
    sliderPrompt: 'How much did that change your thinking?',
    sliderLeftLabel: 'Confirmed what we thought',
    sliderRightLabel: 'Shifted our thinking completely',
    followUp: null,
    followUpOptions: null,
  };

  const followUpOptions: string[] | null = reflect.followUp
    ? reflect.followUpOptions ??
      (reflect.followUp === 'what_shifted' ? DEFAULT_WHAT_SHIFTED : DEFAULT_REASONING_SOURCE)
    : null;

  const followUpQuestion = reflect.followUp === 'what_shifted'
    ? 'What shifted?'
    : reflect.followUp === 'reasoning_source'
      ? 'Where did your thinking come from?'
      : null;

  const handleSliderRelease = () => {
    if (!sliderReleased) setSliderReleased(true);
  };

  const handleSubmit = () => {
    onAddReflection(sliderValue, followUpChoice);
    setSubmitted(true);
  };

  const handleSkip = () => {
    // Log with default values so the row exists but shows it was skipped
    onAddReflection(-1, 'skipped');
    setSubmitted(true);
  };

  return (
    <div className="animate-fade-in flex flex-col justify-center min-h-full space-y-6">
      {!submitted ? (
        <>
          {/* Title */}
          <p className="text-xl uppercase tracking-[0.14em] text-[#6B5D4F] font-semibold">
            Reflect...
          </p>

          {/* Slider */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-[#2C2418]">
              {reflect.sliderPrompt}
            </p>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={sliderValue}
              onChange={(e) => setSliderValue(parseFloat(e.target.value))}
              onMouseUp={handleSliderRelease}
              onTouchEnd={handleSliderRelease}
              className="w-full accent-[#C4923A]"
            />
            <div className="flex justify-between text-[11px] text-[#6B5D4F]">
              <span>{reflect.sliderLeftLabel}</span>
              <span>{reflect.sliderRightLabel}</span>
            </div>
          </div>

          {/* Follow-up — fades in after slider is released */}
          {sliderReleased && followUpOptions && followUpQuestion && (
            <div className="animate-fade-in space-y-3">
              <p className="text-sm font-semibold text-[#2C2418]">
                {followUpQuestion}
              </p>
              <div className="flex flex-wrap gap-2">
                {followUpOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => setFollowUpChoice(followUpChoice === option ? null : option)}
                    className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                      followUpChoice === option
                        ? 'bg-[#C4923A]/20 border-2 border-[#C4923A] text-[#2C2418] font-semibold'
                        : 'bg-[#F0E0C8] border-2 border-transparent text-[#6B5D4F] hover:border-[#D4BFA0]'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Continue — visible once slider has been released */}
          {sliderReleased && (
            <button
              onClick={handleSubmit}
              className="w-full py-3 rounded-lg text-sm font-semibold bg-[#6B5D4F] text-white animate-fade-in"
            >
              Continue
            </button>
          )}

          {/* Skip */}
          <button
            onClick={handleSkip}
            className="text-xs text-[#6B5D4F]/50 hover:text-[#6B5D4F] transition-colors"
          >
            Skip reflection
          </button>
        </>
      ) : (
        <>
          {/* Post-reflection: bridge + branch */}
          <p className="text-xl uppercase tracking-[0.14em] text-[#C4923A] font-semibold">
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
