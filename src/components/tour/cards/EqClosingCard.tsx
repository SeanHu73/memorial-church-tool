'use client';

/**
 * Essential Question — Closing screen.
 * Captures the group's final interpretation after the full tour.
 */

import { useState } from 'react';
import { Tour } from '@/lib/types';

interface Props {
  tour: Tour;
  onComplete: (finalReflection: string, finalReasoning: string) => void;
}

export default function EqClosingCard({ tour, onComplete }: Props) {
  const eq = tour.essentialQuestion!;
  const [reflection, setReflection] = useState('');
  const [reasoning, setReasoning] = useState('');

  return (
    <div className="animate-fade-in space-y-6 min-h-full flex flex-col justify-center">
      {/* Title */}
      <p className="text-xl uppercase tracking-[0.14em] text-[#C4923A] font-semibold">
        Going back to the guiding question...
      </p>

      {/* The essential question */}
      <p className="text-[22px] leading-relaxed font-serif font-semibold text-[#2C2418]">
        &ldquo;{eq.question}&rdquo;
      </p>

      {/* Closing framing */}
      <p className="text-sm text-[#6B5D4F] italic leading-relaxed">
        {eq.closingFraming}
      </p>

      {/* Final interpretation */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-[#2C2418]">
          {eq.finalReflectionPrompt}
        </p>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder={eq.finalReflectionPlaceholder}
          rows={4}
          className="w-full px-4 py-3 rounded-lg border-2 border-[#D4BFA0] bg-white text-[18px] font-serif text-[#2C2418] placeholder:text-[#6B5D4F]/40 focus:outline-none focus:border-[#C4923A]"
        />
      </div>

      {/* Final reasoning */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-[#2C2418]">
          {eq.finalReasoningPrompt}
        </p>
        <textarea
          value={reasoning}
          onChange={(e) => setReasoning(e.target.value)}
          placeholder={eq.finalReasoningPlaceholder}
          rows={4}
          className="w-full px-4 py-3 rounded-lg border-2 border-[#D4BFA0] bg-white text-[18px] font-serif text-[#2C2418] placeholder:text-[#6B5D4F]/40 focus:outline-none focus:border-[#C4923A]"
        />
      </div>

      {/* Submit */}
      <button
        onClick={() => onComplete(reflection.trim(), reasoning.trim())}
        disabled={!reflection.trim()}
        className="w-full py-3 rounded-lg text-sm font-semibold bg-[#7A7A5E] text-white disabled:opacity-30"
      >
        Continue
      </button>
    </div>
  );
}
