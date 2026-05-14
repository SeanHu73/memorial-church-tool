'use client';

import { useState } from 'react';
import { useTour } from '@/context/TourContext';
import { routeQuestion, type RouteResult } from '@/lib/tour-question-router';

export default function BranchCard() {
  const { tour, session, currentStop, returnFromBranch, bankQuestion } = useTour();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RouteResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !tour || !session) return;
    setLoading(true);

    const res = await routeQuestion(question.trim(), tour, session);
    setResult(res);

    // Bank the question regardless of response type (for the question bank)
    if (res.type === 'banked' && currentStop) {
      bankQuestion({
        id: `bq_${Date.now().toString(36)}`,
        tourId: tour.id,
        sessionId: session.id,
        questionText: question.trim(),
        askedAfterStopId: currentStop.id,
        aiResponse: 'banked',
        timestamp: new Date().toISOString(),
      });
    } else if (res.type === 'answered' && currentStop) {
      bankQuestion({
        id: `bq_${Date.now().toString(36)}`,
        tourId: tour.id,
        sessionId: session.id,
        questionText: question.trim(),
        askedAfterStopId: currentStop.id,
        aiResponse: 'answered_off_path',
        timestamp: new Date().toISOString(),
      });
    } else if (res.type === 'coming_up' && currentStop) {
      bankQuestion({
        id: `bq_${Date.now().toString(36)}`,
        tourId: tour.id,
        sessionId: session.id,
        questionText: question.trim(),
        askedAfterStopId: currentStop.id,
        aiResponse: 'coming_up',
        timestamp: new Date().toISOString(),
      });
    }

    setLoading(false);
  };

  // Pre-result: show the question input
  if (!result) {
    return (
      <div className="animate-fade-in space-y-4 min-h-full flex flex-col justify-center">
        <p className="text-xl uppercase tracking-[0.14em] text-[#C4923A] font-semibold">
          What are you curious about?
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Type your question..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-[#D4BFA0] bg-white text-[18px] font-serif text-[#2C2418] placeholder:text-[#6B5D4F]/50 focus:outline-none focus:border-[#C4923A]"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!question.trim() || loading}
              className="flex-1 py-3 rounded-lg text-sm font-semibold bg-[#C4923A] text-white disabled:opacity-40"
            >
              {loading ? 'Thinking...' : 'Ask'}
            </button>
            <button
              type="button"
              onClick={returnFromBranch}
              className="px-4 py-3 rounded-lg text-sm text-[#6B5D4F] hover:bg-[#D4BFA0]/30"
            >
              Skip
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Post-result: show the response
  return (
    <div className="animate-fade-in space-y-4 min-h-full flex flex-col justify-center">
      {/* Question echo */}
      <p className="text-xs text-[#6B5D4F] uppercase tracking-wide font-semibold">You asked</p>
      <p className="text-sm font-serif text-[#2C2418] italic">&ldquo;{question}&rdquo;</p>

      {/* Response A: Coming up */}
      {result.type === 'coming_up' && (
        <div className="p-4 rounded-lg bg-[#7A7A5E]/10 border border-[#7A7A5E]/30">
          <p className="text-[18px] font-serif text-[#2C2418]">
            Great question &mdash; you&apos;ll encounter something about that at stop {result.matchedStopOrder}. Hold onto it.
          </p>
        </div>
      )}

      {/* Response B: AI answer */}
      {result.type === 'answered' && (
        <div className="space-y-3">
          {result.data.observation && (
            <div className="p-3 rounded-lg bg-[#2B4C5E]/10 border border-[#2B4C5E]/20">
              <p className="text-[18px] font-serif text-[#2C2418]">{result.data.observation}</p>
            </div>
          )}
          <div className="p-4 rounded-lg bg-[#C4923A]/10 border border-[#C4923A]/20">
            <p className="text-[18px] font-serif text-[#2C2418] leading-relaxed">
              {result.data.answer}
            </p>
          </div>
        </div>
      )}

      {/* Response C: Banked */}
      {result.type === 'banked' && (
        <div className="p-4 rounded-lg bg-[#F0E0C8] border border-[#D4BFA0]">
          <p className="text-[18px] font-serif text-[#2C2418]">
            That&apos;s a great question, but it&apos;s beyond what we know about this place right now.
            We&apos;ve saved it &mdash; you&apos;ll see it in your question bank at the end of the tour.
          </p>
        </div>
      )}

      {/* Return to tour */}
      <button
        onClick={returnFromBranch}
        className="w-full py-3 rounded-lg text-sm font-semibold bg-[#7A7A5E] text-white"
      >
        Return to the tour
      </button>
    </div>
  );
}
