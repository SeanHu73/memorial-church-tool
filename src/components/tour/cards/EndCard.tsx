'use client';

import { useTour } from '@/context/TourContext';

export default function EndCard() {
  const { tour, session, endTour } = useTour();

  if (!tour || !session) return null;

  const banked = session.bankedQuestions.filter((q) => q.aiResponse === 'banked');

  return (
    <div className="animate-fade-in space-y-6 min-h-full flex flex-col justify-center">
      <div className="text-center space-y-2">
        <p className="text-xs uppercase tracking-[0.14em] text-[#7A7A5E] font-semibold">
          Tour complete
        </p>
        <h2 className="text-xl font-serif font-bold text-[#2C2418]">{tour.title}</h2>
        <p className="text-sm text-[#6B5D4F]">
          {session.completedStops.length} stop{session.completedStops.length !== 1 ? 's' : ''} explored
        </p>
      </div>

      {/* Reflection summary */}
      {session.reflections.length > 0 && (
        <div className="p-3 rounded-lg bg-[#F0E0C8] border border-[#D4BFA0]">
          <p className="text-xs text-[#6B5D4F] font-semibold uppercase tracking-wide mb-2">
            Your reflections
          </p>
          <div className="flex gap-1">
            {session.reflections.map((r, i) => (
              <div
                key={i}
                className="flex-1 h-2 rounded-full"
                style={{
                  backgroundColor: `rgba(196, 146, 58, ${0.3 + r.sliderValue * 0.7})`,
                }}
                title={`Stop ${i + 1}: ${Math.round(r.sliderValue * 100)}%`}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-[#6B5D4F] mt-1">
            <span>Confirmed</span>
            <span>Shifted</span>
          </div>
        </div>
      )}

      {/* Learning arc takeaway */}
      {tour.essentialQuestion && session.essentialQuestionResponses && (
        <div className="p-4 rounded-lg bg-white border border-[#D4BFA0] space-y-3">
          <p className="text-xs text-[#C4923A] font-semibold uppercase tracking-wide">
            Your learning arc
          </p>
          <p className="text-sm font-serif font-semibold text-[#2C2418]">
            &ldquo;{tour.essentialQuestion.question}&rdquo;
          </p>
          <div className="space-y-1">
            <p className="text-[10px] text-[#6B5D4F] uppercase tracking-wide">Before</p>
            <p className="text-sm font-serif text-[#2C2418]">
              {session.essentialQuestionResponses.initialTheory}
            </p>
            <p className="text-xs text-[#6B5D4F] italic">
              Because: {session.essentialQuestionResponses.initialReasoning}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-[#6B5D4F] uppercase tracking-wide">After</p>
            <p className="text-sm font-serif text-[#2C2418]">
              {session.essentialQuestionResponses.finalReflection}
            </p>
          </div>
          {/* Slider visualization */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-[#6B5D4F]">Thinking shifted</p>
              <div className="h-1.5 bg-[#D4BFA0] rounded-full mt-1 relative">
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#C4923A] border border-white shadow"
                  style={{ left: `${session.essentialQuestionResponses.finalCognitiveSlider * 100}%` }}
                />
              </div>
            </div>
            {session.essentialQuestionResponses.finalPerceptualSlider != null && (
              <div>
                <p className="text-[10px] text-[#6B5D4F]">Place looks different</p>
                <div className="h-1.5 bg-[#D4BFA0] rounded-full mt-1 relative">
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#C4923A] border border-white shadow"
                    style={{ left: `${session.essentialQuestionResponses.finalPerceptualSlider * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Banked questions */}
      {banked.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-[#6B5D4F] font-semibold uppercase tracking-wide">
            Questions we couldn&apos;t answer ({banked.length})
          </p>
          <ul className="space-y-2">
            {banked.map((q) => (
              <li
                key={q.id}
                className="p-3 rounded-lg bg-white border border-[#D4BFA0] text-sm font-serif text-[#2C2418]"
              >
                &ldquo;{q.questionText}&rdquo;
              </li>
            ))}
          </ul>
          <p className="text-xs text-[#6B5D4F] italic">
            These questions help us understand what visitors are curious about.
            Thank you for asking them.
          </p>
        </div>
      )}

      {/* Exit */}
      <button
        onClick={endTour}
        className="w-full py-3 rounded-lg text-sm font-semibold bg-[#5C4A35] text-[#FFF8EE]"
      >
        Explore on your own
      </button>
    </div>
  );
}
