'use client';

import { useState } from 'react';
import { Stop } from '@/lib/types';
import WhatsNext from './WhatsNext';

const DEFAULT_WHAT_SHIFTED = [
  'We learned something new',
  'We changed our mind',
  'We had part of it',
  'It was as we expected',
];

const DEFAULT_REASONING_SOURCE = [
  'What we observed here',
  'Something we discussed',
  'Something we already knew',
  'A guess',
];

interface Props {
  stop: Stop;
  isLastStop: boolean;
  onAskQuestion: () => void;
  onContinue: () => void;
  onAddReflection: (sliderValue: number, followUpResponse: string | null) => void;
}

export default function ReflectCard({
  stop,
  isLastStop,
  onAskQuestion,
  onContinue,
  onAddReflection,
}: Props) {
  const [sliderValue, setSliderValue] = useState(0.5);
  const [sliderReleased, setSliderReleased] = useState(false);
  const [followUpChoices, setFollowUpChoices] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const reflect = stop.reflect ?? {
    sliderPrompt: 'How much did that change your thinking?',
    sliderLeftLabel: 'Confirmed what we thought',
    sliderRightLabel: 'Shifted our thinking completely',
    followUp: null,
    followUpOptions: null,
    photos: [],
  };

  const followUpOptions: string[] | null = reflect.followUp
    ? reflect.followUpOptions ??
      (reflect.followUp === 'what_shifted' ? DEFAULT_WHAT_SHIFTED : DEFAULT_REASONING_SOURCE)
    : null;

  const followUpQuestion = reflect.followUp === 'what_shifted'
    ? 'What changed?'
    : reflect.followUp === 'reasoning_source'
      ? 'Why did it change or not?'
      : null;

  const handleSliderRelease = () => {
    if (!sliderReleased) setSliderReleased(true);
  };

  const handleSubmit = () => {
    onAddReflection(sliderValue, followUpChoices.length > 0 ? followUpChoices.join(', ') : null);
    setSubmitted(true);
  };

  const handleSkip = () => {
    onAddReflection(-1, 'skipped');
    setSubmitted(true);
  };

  return (
    <div className="animate-fade-in flex flex-col justify-center min-h-full space-y-6">
      {!submitted ? (
        <>
          <p className="text-xl uppercase tracking-[0.14em] text-[#6B5D4F] font-semibold">
            Reflect...
          </p>

          {/* Reflection photos */}
          {(reflect.photos || []).map((photo, i) => (
            photo.url && (
              <div key={i} className="rounded-lg overflow-hidden shadow-md border border-[#D4BFA0]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={photo.caption || ''} className="w-full h-40 object-cover" />
                {photo.caption && <p className="text-xs text-[#6B5D4F] px-3 py-1.5 bg-[#F0E0C8]/50 italic">{photo.caption}</p>}
              </div>
            )
          ))}

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

          {sliderReleased && followUpOptions && followUpQuestion && (
            <div className="animate-fade-in space-y-3">
              <p className="text-sm font-semibold text-[#2C2418]">
                {followUpQuestion}
              </p>
              <div className="flex flex-wrap gap-2">
                {followUpOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => setFollowUpChoices(
                      followUpChoices.includes(option)
                        ? followUpChoices.filter((x) => x !== option)
                        : [...followUpChoices, option]
                    )}
                    className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                      followUpChoices.includes(option)
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

          {sliderReleased && (
            <button
              onClick={handleSubmit}
              className="w-full py-3 rounded-lg text-sm font-semibold bg-[#6B5D4F] text-white animate-fade-in"
            >
              Continue
            </button>
          )}

          <button
            onClick={handleSkip}
            className="text-xs text-[#6B5D4F]/50 hover:text-[#6B5D4F] transition-colors"
          >
            Skip reflection
          </button>
        </>
      ) : (
        <WhatsNext
          stop={stop}
          isLastStop={isLastStop}
          onAskQuestion={onAskQuestion}
          onContinue={onContinue}
        />
      )}
    </div>
  );
}
