'use client';

/**
 * Detour flow — a stripped-down stop experience for related artefacts.
 * Phases: Notice (optional) → Wonder (optional) → Reveal (required) → "Anything else?"
 * No seed, no reflection. One level deep only.
 */

import { useState } from 'react';
import { Detour } from '@/lib/types';
import { routeQuestion } from '@/lib/tour-question-router';
import { useTour } from '@/context/TourContext';
import PhotoContent from './PhotoContent';
import NoticeCard from './NoticeCard';
import WonderCard from './WonderCard';

type DetourPhase = 'notice' | 'wonder' | 'reveal' | 'done';

function firstPhase(detour: Detour): DetourPhase {
  if (detour.notice) return 'notice';
  if (detour.wonder) return 'wonder';
  return 'reveal';
}

function nextDetourPhase(current: DetourPhase, detour: Detour): DetourPhase {
  switch (current) {
    case 'notice': return detour.wonder ? 'wonder' : 'reveal';
    case 'wonder': return 'reveal';
    case 'reveal': return 'done';
    default: return 'done';
  }
}

interface Props {
  detour: Detour;
  onReturn: () => void;
}

export default function DetourFlow({ detour, onReturn }: Props) {
  const { tour, session } = useTour();
  const [phase, setPhase] = useState<DetourPhase>(firstPhase(detour));
  const [question, setQuestion] = useState('');
  const [askLoading, setAskLoading] = useState(false);
  const [askResult, setAskResult] = useState<string | null>(null);

  const advance = () => setPhase(nextDetourPhase(phase, detour));

  // Build a minimal Stop-like object for NoticeCard and WonderCard
  const fakeStop = {
    notice: detour.notice ?? { prompt: '', timerSeconds: 30, photoUrl: null, photoCaption: null, photos: [] },
    wonder: detour.wonder,
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !tour || !session) return;
    setAskLoading(true);
    try {
      const res = await routeQuestion(question.trim(), tour, session);
      if (res.type === 'answered') {
        setAskResult(res.data.answer);
      } else if (res.type === 'coming_up') {
        setAskResult(`Great question — you'll encounter something about that at stop ${res.matchedStopOrder}.`);
      } else {
        setAskResult("That's beyond what we know right now, but it's a great question.");
      }
    } catch {
      setAskResult("Something went wrong — try again.");
    }
    setQuestion('');
    setAskLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-[11px] text-[#6B5D4F] uppercase tracking-wide">Detour</p>
        <p className="text-lg font-serif font-semibold text-[#2C2418]">{detour.title}</p>
      </div>

      {/* Notice phase */}
      {phase === 'notice' && detour.notice && (
        <NoticeCard stop={fakeStop as never} onContinue={advance} />
      )}

      {/* Wonder phase */}
      {phase === 'wonder' && detour.wonder && (
        <WonderCard stop={fakeStop as never} onContinue={advance} />
      )}

      {/* Reveal phase */}
      {phase === 'reveal' && (
        <div className="animate-fade-in space-y-4">
          <p className="text-xl uppercase tracking-[0.14em] text-[#C4923A] font-semibold">
            Context
          </p>
          <div className="animate-blur-reveal">
            <PhotoContent
              text={detour.reveal.text}
              photos={detour.reveal.photos || []}
              borderColor="#C4923A"
            />
          </div>
          <button
            onClick={advance}
            className="w-full py-3 rounded-lg text-sm font-semibold bg-[#C4923A] text-white"
          >
            Continue
          </button>
        </div>
      )}

      {/* "Anything else?" — end of detour */}
      {phase === 'done' && (
        <div className="animate-fade-in space-y-4">
          <p className="text-xl uppercase tracking-[0.14em] text-[#C4923A] font-semibold">
            Anything else?
          </p>

          {detour.bridge && (
            <p className="text-sm text-[#6B5D4F] italic leading-relaxed">
              {detour.bridge}
            </p>
          )}

          {/* Ask a question */}
          <form onSubmit={handleAsk} className="space-y-2">
            <label className="text-sm text-[#2C2418] font-semibold">Any other questions?</label>
            <div className="flex gap-2">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Type a question..."
                className="flex-1 px-3 py-2 rounded-lg border border-[#D4BFA0] bg-white text-sm font-serif text-[#2C2418] placeholder:text-[#6B5D4F]/50 focus:outline-none focus:border-[#C4923A]"
              />
              <button
                type="submit"
                disabled={!question.trim() || askLoading}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#C4923A] text-white disabled:opacity-40"
              >
                {askLoading ? '...' : 'Ask'}
              </button>
            </div>
          </form>

          {askResult && (
            <div className="p-3 rounded-lg bg-[#C4923A]/10 border border-[#C4923A]/20 animate-fade-in">
              <p className="text-[15px] font-serif text-[#2C2418] leading-relaxed">{askResult}</p>
              <button
                onClick={() => setAskResult(null)}
                className="text-xs text-[#6B5D4F] hover:underline mt-2"
              >
                Ask another
              </button>
            </div>
          )}

          <button
            onClick={onReturn}
            className="w-full py-3 rounded-lg text-sm font-semibold bg-[#7A7A5E] text-white"
          >
            Return to tour
          </button>
        </div>
      )}
    </div>
  );
}
