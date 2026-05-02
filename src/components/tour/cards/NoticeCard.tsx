'use client';

import { useState, useEffect } from 'react';
import { Stop } from '@/lib/types';

interface Props {
  stop: Stop;
  onContinue: () => void;
}

export default function NoticeCard({ stop, onContinue }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(stop.notice.timerSeconds);
  const timerDone = secondsLeft <= 0;

  useEffect(() => {
    if (timerDone) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(s - 1, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerDone]);

  // SVG ring progress
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const progress = timerDone ? 0 : (secondsLeft / stop.notice.timerSeconds) * circumference;

  return (
    <div className="animate-fade-in space-y-6 min-h-full flex flex-col justify-center">
      {/* Title */}
      <p className="text-sm uppercase tracking-[0.14em] text-[#2B4C5E] font-semibold">
        Look around...
      </p>

      {/* Optional photo — helps locate the feature */}
      {stop.notice.photoUrl && (
        <div className="rounded-lg overflow-hidden shadow-md border border-[#D4BFA0]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={stop.notice.photoUrl}
            alt={stop.notice.photoCaption || ''}
            className="w-full h-40 object-cover"
          />
          {stop.notice.photoCaption && (
            <p className="text-xs text-[#6B5D4F] px-3 py-1.5 bg-[#F0E0C8]/50 italic">
              {stop.notice.photoCaption}
            </p>
          )}
        </div>
      )}

      {/* Observation prompt */}
      <p className="text-[19px] leading-relaxed font-serif text-[#2C2418]">
        {stop.notice.prompt}
      </p>

      {/* Timer ring */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-16 h-16">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
            <circle
              cx="32" cy="32" r={radius}
              fill="none"
              stroke="#D4BFA0"
              strokeWidth="3"
            />
            <circle
              cx="32" cy="32" r={radius}
              fill="none"
              stroke="#2B4C5E"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-[#2B4C5E]">
            {secondsLeft}
          </span>
        </div>
        <p className="text-xs text-[#6B5D4F]">
          {timerDone ? 'Time\u2019s up — ready when you are' : 'Look together...'}
        </p>
      </div>

      {/* Continue — always available but styled differently before timer */}
      <button
        onClick={onContinue}
        className={`w-full py-3 rounded-lg text-sm font-semibold transition-all ${
          timerDone
            ? 'bg-[#2B4C5E] text-white'
            : 'bg-[#2B4C5E]/20 text-[#2B4C5E]'
        }`}
      >
        We&apos;ve looked &mdash; continue
      </button>
    </div>
  );
}
