'use client';

/**
 * Final questions screen — after the closing reflection, before end.
 * Lets the group add any remaining questions, then shows all their
 * questions collected throughout the tour.
 */

import { useState } from 'react';
import { useTour } from '@/context/TourContext';

export default function EqQuestionsCard() {
  const { tour, session, bankQuestion, finishTour, currentStop } = useTour();
  const [question, setQuestion] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!tour || !session) return null;

  const allQuestions = session.bankedQuestions;

  const handleAddQuestion = () => {
    if (!question.trim()) return;
    bankQuestion({
      id: `bq_${Date.now().toString(36)}`,
      tourId: tour.id,
      sessionId: session.id,
      questionText: question.trim(),
      askedAfterStopId: currentStop?.id || 'end',
      aiResponse: 'banked',
      timestamp: new Date().toISOString(),
    });
    setQuestion('');
  };

  return (
    <div className="animate-fade-in flex flex-col justify-center min-h-full space-y-6">
      {!submitted ? (
        <>
          <p className="text-xl uppercase tracking-[0.14em] text-[#C4923A] font-semibold">
            Any remaining questions?
          </p>
          <p className="text-sm text-[#6B5D4F] leading-relaxed">
            Before we wrap up — is there anything you&apos;re still curious about? Big or small, specific or open-ended.
          </p>

          {/* Question input */}
          <div className="space-y-3">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What are you still wondering about?"
              rows={3}
              className="w-full px-4 py-3 rounded-lg border-2 border-[#D4BFA0] bg-white text-[15px] font-serif text-[#2C2418] placeholder:text-[#6B5D4F]/40 focus:outline-none focus:border-[#C4923A]"
            />
            <button
              onClick={handleAddQuestion}
              disabled={!question.trim()}
              className="w-full py-3 rounded-lg text-sm font-semibold border-2 border-[#C4923A] text-[#C4923A] bg-[#C4923A]/10 disabled:opacity-30"
            >
              Add question
            </button>
          </div>

          {/* Questions added so far in this screen */}
          {allQuestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-[#6B5D4F] uppercase tracking-wide font-semibold">
                Your questions ({allQuestions.length})
              </p>
              <ul className="space-y-2 max-h-40 overflow-y-auto">
                {allQuestions.map((q) => (
                  <li key={q.id} className="p-2 rounded-lg bg-white border border-[#D4BFA0] text-xs font-serif text-[#2C2418]">
                    &ldquo;{q.questionText}&rdquo;
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={() => setSubmitted(true)}
            className="w-full py-3 rounded-lg text-sm font-semibold bg-[#7A7A5E] text-white"
          >
            Finish tour
          </button>
        </>
      ) : (
        <>
          {/* Show all questions collected throughout the tour */}
          <p className="text-xl uppercase tracking-[0.14em] text-[#C4923A] font-semibold">
            Your questions from the tour
          </p>

          {allQuestions.length === 0 ? (
            <p className="text-sm text-[#6B5D4F] italic">
              No questions were asked during this tour.
            </p>
          ) : (
            <ul className="space-y-3">
              {allQuestions.map((q) => (
                <li key={q.id} className="p-3 rounded-lg bg-white border border-[#D4BFA0]">
                  <p className="text-sm font-serif text-[#2C2418]">&ldquo;{q.questionText}&rdquo;</p>
                  <p className="text-[10px] text-[#6B5D4F] mt-1">
                    {q.aiResponse === 'coming_up' ? 'Addressed on the tour' : q.aiResponse === 'answered_off_path' ? 'Answered' : 'Saved'}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <p className="text-xs text-[#6B5D4F] italic text-center">
            These questions help us understand what visitors are curious about. Thank you for asking them.
          </p>

          <button
            onClick={finishTour}
            className="w-full py-3 rounded-lg text-sm font-semibold bg-[#5C4A35] text-[#FFF8EE]"
          >
            Complete tour
          </button>
        </>
      )}
    </div>
  );
}
