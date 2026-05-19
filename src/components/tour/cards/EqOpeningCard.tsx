'use client';

/**
 * Essential Question — Opening screen.
 * Captures the group's initial theory and reasoning before the tour begins.
 */

import { useState, useCallback } from 'react';
import { Tour } from '@/lib/types';
import BackButton from './BackButton';

interface Props {
  tour: Tour;
  onComplete: (theory: string, reasoning: string) => void;
}

export default function EqOpeningCard({ tour, onComplete }: Props) {
  const eq = tour.essentialQuestion!;
  const [theory, setTheory] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [theoryCommitted, setTheoryCommitted] = useState(false);
  const [reasoningCommitted, setReasoningCommitted] = useState(false);
  const [framingOpen, setFramingOpen] = useState(false);

  return (
    <div className="animate-fade-in space-y-6 min-h-full flex flex-col justify-center">
      {/* Title */}
      <p className="text-2xl uppercase tracking-[0.14em] text-[#C4923A] font-semibold">
        Guiding Question
      </p>

      {/* The essential question */}
      <p className="text-[23px] leading-relaxed font-serif font-semibold text-[#2C2418]">
        &ldquo;{eq.question}&rdquo;
      </p>

      {/* Framing — collapsible */}
      <button
        onClick={() => setFramingOpen(!framingOpen)}
        className="text-sm text-[#6B5D4F] italic flex items-center gap-1"
      >
        <span className="text-[10px]">{framingOpen ? '▼' : '▶'}</span>
        {framingOpen ? 'Hide instructions' : 'Read instructions'}
      </button>
      {framingOpen && (
        <p className="text-sm text-[#6B5D4F] italic leading-relaxed animate-fade-in">
          {eq.openingFraming}
        </p>
      )}

      {/* Theory input */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-[#2C2418]">
          {eq.theoryPrompt}
        </p>
        <textarea
          value={theory}
          onChange={(e) => { setTheory(e.target.value); if (theoryCommitted) setTheoryCommitted(false); }}
          placeholder={eq.theoryPlaceholder}
          rows={3}
          className={`w-full px-4 py-3 rounded-lg text-[20px] font-serif text-[#2C2418] placeholder:text-[#6B5D4F]/40 focus:outline-none transition-all border-2 ${
            theoryCommitted
              ? 'border-[#C4923A]/40 bg-[#C4923A]/5'
              : 'border-[#D4BFA0] bg-white'
          }`}
        />
        {!theoryCommitted && (
          <button
            onClick={() => setTheoryCommitted(true)}
            disabled={!theory.trim()}
            className="w-full py-3 rounded-lg text-base font-semibold text-[#C4923A] border-2 border-[#C4923A] bg-[#C4923A]/10 hover:bg-[#C4923A]/20 disabled:opacity-50 transition-colors"
          >
            Propose theory
          </button>
        )}
        {theoryCommitted && (
          <span className="text-[10px] text-[#7A7A5E]">&#10003; Theory proposed</span>
        )}
      </div>

      {/* Reasoning input — appears after theory is committed */}
      {theoryCommitted && (
        <div className="space-y-2 animate-fade-in">
          <p className="text-sm font-semibold text-[#2C2418]">
            {eq.reasoningPrompt}
          </p>
          <textarea
            value={reasoning}
            onChange={(e) => { setReasoning(e.target.value); if (reasoningCommitted) setReasoningCommitted(false); }}
            placeholder={eq.reasoningPlaceholder}
            rows={3}
            className={`w-full px-4 py-3 rounded-lg text-[20px] font-serif text-[#2C2418] placeholder:text-[#6B5D4F]/40 focus:outline-none transition-all border-2 ${
              reasoningCommitted
                ? 'border-[#C4923A]/40 bg-[#C4923A]/5'
                : 'border-[#D4BFA0] bg-white'
            }`}
          />
          {!reasoningCommitted && (
            <button
              onClick={() => setReasoningCommitted(true)}
              disabled={!reasoning.trim()}
              className="w-full py-3 rounded-lg text-base font-semibold text-[#C4923A] border-2 border-[#C4923A] bg-[#C4923A]/10 hover:bg-[#C4923A]/20 disabled:opacity-50 transition-colors"
            >
              Confirm your explanation
            </button>
          )}
          {reasoningCommitted && (
            <span className="text-[10px] text-[#7A7A5E]">&#10003; Explanation confirmed</span>
          )}
        </div>
      )}

      {/* Continue — appears after both are committed */}
      {theoryCommitted && reasoningCommitted && (
        <div className="flex gap-2 animate-fade-in">
          <BackButton />
          <button
            onClick={() => onComplete(theory.trim(), reasoning.trim())}
            className="flex-1 py-3 rounded-lg text-base font-semibold bg-[#7A7A5E] text-white"
          >
            Let&apos;s find the first stop...
          </button>
        </div>
      )}

      {/* Skip */}
      <button
        onClick={() => onComplete('', '')}
        className="w-full py-3 rounded-lg text-base font-semibold text-[#6B5D4F] border-2 border-[#D4BFA0] bg-[#F0E0C8]/50 hover:bg-[#D4BFA0]/30 transition-colors"
      >
        Skip for now
      </button>
    </div>
  );
}
