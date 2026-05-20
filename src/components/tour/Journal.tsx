'use client';

/**
 * Full-screen tour playback overlay.
 *
 * Renders the current phase card and manages transitions. Sits above
 * the map at z-40. Each phase card calls advancePhase() from context
 * when the learner is ready to proceed — the components never decide
 * what comes next; they just call "continue" and the state machine
 * in tour-session.ts determines the next phase.
 */

import { useState, useRef, useCallback } from 'react';
import { useTour } from '@/context/TourContext';
import IntroScreens from './cards/IntroScreens';
import EqOpeningCard from './cards/EqOpeningCard';
import EqClosingCard from './cards/EqClosingCard';
import EqFinalReflectCard from './cards/EqFinalReflectCard';
import EqQuestionsCard from './cards/EqQuestionsCard';
import SeedCard from './cards/SeedCard';
import NoticeCard from './cards/NoticeCard';
import WonderCard from './cards/WonderCard';
import RevealCard from './cards/RevealCard';
import ReflectCard from './cards/ReflectCard';
import FormattedText from './cards/FormattedText';
import WhatsNext from './cards/WhatsNext';
import BranchCard from './cards/BranchCard';
import EndCard from './cards/EndCard';

interface JournalProps {
  /** If provided, renders a "View on map" button (for stops at a different location). */
  onMapPeek?: () => void;
}

export default function Journal({ onMapPeek }: JournalProps) {
  const {
    tour,
    session,
    currentStop,
    isLastStop,
    goBack,
    canGoBack,
    advancePhase,
    advanceStop,
    enterBranch,
    addReflection,
    completeIntro,
    completeEqOpening,
    completeEqClosing,
    completeEqFinalReflect,
    endTour,
  } = useTour();

  const [paused, setPaused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [showTourTracker, setShowTourTracker] = useState(false);
  const lastTapRef = useRef(0);

  // Double-tap handler: two taps within 400ms
  const handleDoubleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const now = Date.now();
    if (now - lastTapRef.current < 400) {
      setPaused(false);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, []);

  if (!tour || !session) return null;

  const phase = session.currentPhase;
  const stopNum = session.currentStopIndex + 1;

  // Calculate progress percentage
  const totalStops = tour.stops.length;
  const closingPhases = ['eq_closing', 'eq_final_reflect', 'eq_questions', 'end'];
  const hasClosing = !!tour.essentialQuestion;
  const totalSegments = totalStops + (hasClosing ? 1 : 0) + 1; // stops + closing + intro/eq_opening
  let progressPct = 0;
  if (phase === 'intro') {
    progressPct = 0;
  } else if (phase === 'eq_opening') {
    progressPct = 2;
  } else if (closingPhases.includes(phase)) {
    const closingProgress = closingPhases.indexOf(phase) / closingPhases.length;
    progressPct = ((totalStops + closingProgress) / totalSegments) * 100;
  } else if (phase === 'end') {
    progressPct = 100;
  } else {
    // Within a stop — estimate sub-progress
    const phasesInStop = ['seed', 'wonder', 'reveal', 'reflect', 'whats_next', 'branch'];
    const phaseIdx = phasesInStop.indexOf(phase);
    const subProgress = phaseIdx >= 0 ? phaseIdx / phasesInStop.length : 0.5;
    progressPct = ((session.currentStopIndex + subProgress) / totalSegments) * 100 + (1 / totalSegments) * 100 * 0.05;
  }
  progressPct = Math.min(Math.max(progressPct, 0), 100);

  // Pause overlay — dark screen, double-tap to return
  if (paused) {
    return (
      <div
        className="fixed inset-0 z-40 bg-black flex items-center justify-center select-none"
        onClick={handleDoubleTap}
        onTouchEnd={handleDoubleTap}
      >
        <p className="text-white/40 text-sm tracking-wide animate-gentle-pulse pointer-events-none">
          Double tap to return to tour
        </p>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col"
      style={{ backgroundColor: '#FFF8EE' }}
    >
      {/* Progress bar */}
      <div className="shrink-0 w-full h-1.5 bg-[#D4BFA0]/30">
        <div
          className="h-full bg-[#C4923A] transition-all duration-500 ease-out rounded-r-full"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Top bar */}
      <div
        className="shrink-0 flex items-center justify-between px-4 py-2 border-b"
        style={{ borderColor: '#D4BFA0' }}
      >
        <div className="flex items-center gap-2">
          {canGoBack && phase !== 'end' && (
            <button
              onClick={goBack}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#6B5D4F] hover:bg-[#D4BFA0]/30"
              title="Go back"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
          <div>
            <p className="text-sm font-semibold text-[#2C2418]">{tour.title}</p>
            {phase !== 'end' && currentStop && (
              <p className="text-[11px] text-[#6B5D4F] uppercase tracking-wide">
                Stop {stopNum} of {tour.stops.length}
                {currentStop.title && <> &middot; {currentStop.title}</>}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onMapPeek && phase !== 'end' && (
            <button
              onClick={onMapPeek}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#6B5D4F] hover:bg-[#D4BFA0]/30 text-sm"
              title="View on map"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                <circle cx="12" cy="9" r="2.5"/>
              </svg>
            </button>
          )}
          <button
            onClick={endTour}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#6B5D4F] hover:bg-[#D4BFA0]/30 text-sm"
            title="Exit tour"
          >
            &times;
          </button>
        </div>
      </div>

      {/* Card area — scrollable */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        {phase === 'intro' && (
          <IntroScreens tour={tour} onComplete={completeIntro} />
        )}

        {phase === 'eq_opening' && tour.essentialQuestion && (
          <EqOpeningCard tour={tour} onComplete={completeEqOpening} />
        )}

        {phase === 'seed' && currentStop && (
          <SeedCard stop={currentStop} onContinue={advancePhase} />
        )}

        {phase === 'notice' && currentStop && (
          <NoticeCard key={currentStop.id} stop={currentStop} onContinue={advancePhase} />
        )}

        {phase === 'wonder' && currentStop && (() => {
          const round = session.currentRound;
          // Round 0 = main wonder, round 1+ = extra rounds
          const wonder = round === 0
            ? currentStop.wonder
            : (currentStop.extraRounds || [])[round - 1]?.wonder ?? null;
          if (!wonder) return null;
          // Build a minimal stop-like object for WonderCard
          const virtualStop = { ...currentStop, wonder };
          return <WonderCard key={`wonder-${round}`} stop={virtualStop} onContinue={advancePhase} />;
        })()}

        {phase === 'reveal' && currentStop && (() => {
          const round = session.currentRound;
          const extras = currentStop.extraRounds || [];

          if (round === 0) {
            return <RevealCard key="reveal-0" stop={currentStop} onContinue={advancePhase} />;
          }
          // Extra round reveal
          const extra = extras[round - 1];
          if (!extra?.reveal) return null;
          const virtualStop = {
            ...currentStop,
            reveal: {
              text: extra.reveal.text,
              photoUrl: null,
              photoCaption: null,
              photos: extra.reveal.photos || [],
              bridgeText: '',
              bridgePhotos: [],
              audioUrl: extra.reveal.audioUrl ?? null,
              audioTitle: extra.reveal.audioTitle ?? null,
            },
          };
          return <RevealCard key={`reveal-${round}`} stop={virtualStop} onContinue={advancePhase} />;
        })()}

        {phase === 'whats_next' && currentStop && (
          <div className="animate-fade-in flex flex-col justify-center min-h-full space-y-6">
            {currentStop.isFinalStop ? (
              <>
                {currentStop.reveal.bridgeText && (
                  <p className="text-[18px] text-[#6B5D4F] italic leading-relaxed">
                    <FormattedText text={currentStop.reveal.bridgeText} />
                  </p>
                )}
                <button
                  onClick={advanceStop}
                  className="w-full py-3 rounded-lg text-sm font-semibold bg-[#7A7A5E] text-white"
                >
                  Continue
                </button>
              </>
            ) : (
              <WhatsNext
                stop={currentStop}
                isLastStop={isLastStop}
                onAskQuestion={enterBranch}
                onContinue={advanceStop}
              />
            )}
          </div>
        )}

        {phase === 'reflect' && currentStop && (
          <ReflectCard
            stop={currentStop}
            isLastStop={isLastStop}
            onAskQuestion={enterBranch}
            onContinue={advanceStop}
            onAddReflection={(sliderValue, followUpResponse) => addReflection(sliderValue, followUpResponse)}
          />
        )}

        {phase === 'branch' && (
          <BranchCard />
        )}

        {phase === 'eq_closing' && tour.essentialQuestion && (
          <EqClosingCard tour={tour} onComplete={completeEqClosing} />
        )}

        {phase === 'eq_final_reflect' && (
          <EqFinalReflectCard onComplete={completeEqFinalReflect} />
        )}

        {phase === 'eq_questions' && (
          <EqQuestionsCard />
        )}

        {phase === 'end' && (
          <EndCard />
        )}
      </div>

      {/* Footer bar */}
      {phase !== 'end' && (
        <div className="shrink-0 px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: '#D4BFA0' }}>
          <button
            onClick={() => setPaused(true)}
            className="px-4 py-2 rounded-lg text-xs text-[#6B5D4F]/70 hover:text-[#6B5D4F] hover:bg-[#D4BFA0]/20 transition-colors"
          >
            We&apos;re taking it in...
          </button>

          {/* Menu button — bottom right */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#6B5D4F] hover:bg-[#D4BFA0]/30 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>

            {/* Pop-up menu */}
            {menuOpen && (
              <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-lg shadow-lg border border-[#D4BFA0] overflow-hidden animate-fade-in">
                <button
                  onClick={() => { setShowQuestionBank(true); setMenuOpen(false); }}
                  className="w-full px-4 py-3 text-left text-xs text-[#2C2418] hover:bg-[#F0E0C8] border-b border-[#D4BFA0]/50 flex items-center gap-2"
                >
                  <span>📝</span> Question Bank
                  {session.bankedQuestions.length > 0 && (
                    <span className="ml-auto text-[10px] bg-[#C4923A]/20 text-[#C4923A] px-1.5 py-0.5 rounded-full font-semibold">
                      {session.bankedQuestions.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => { setShowTourTracker(true); setMenuOpen(false); }}
                  className="w-full px-4 py-3 text-left text-xs text-[#2C2418] hover:bg-[#F0E0C8] flex items-center gap-2"
                >
                  <span>🗺️</span> Tour Tracker
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Question Bank pop-up */}
      {showQuestionBank && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowQuestionBank(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative w-full max-w-md max-h-[70vh] bg-[#FFF8EE] rounded-t-2xl shadow-2xl animate-slide-up flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#D4BFA0' }}>
              <h3 className="text-sm font-semibold text-[#2C2418]">Question Bank</h3>
              <button onClick={() => setShowQuestionBank(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-[#6B5D4F] hover:bg-[#D4BFA0]/30">&times;</button>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {session.bankedQuestions.length === 0 ? (
                <p className="text-xs text-[#6B5D4F] italic text-center py-6">
                  No questions yet. Questions you ask during the tour will appear here.
                </p>
              ) : (
                session.bankedQuestions.map((q) => (
                  <div key={q.id} className="p-3 rounded-lg bg-white border border-[#D4BFA0]">
                    <p className="text-sm font-serif text-[#2C2418]">&ldquo;{q.questionText}&rdquo;</p>
                    <p className="text-[10px] text-[#6B5D4F] mt-1">
                      {q.aiResponse === 'coming_up' ? 'Coming up on the tour' : q.aiResponse === 'answered_off_path' ? 'Answered' : 'Saved for later'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tour Tracker pop-up */}
      {showTourTracker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowTourTracker(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative w-full max-w-md max-h-[70vh] bg-[#FFF8EE] rounded-t-2xl shadow-2xl animate-slide-up flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#D4BFA0' }}>
              <h3 className="text-sm font-semibold text-[#2C2418]">Tour Tracker</h3>
              <button onClick={() => setShowTourTracker(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-[#6B5D4F] hover:bg-[#D4BFA0]/30">&times;</button>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {tour.stops.map((s, i) => {
                const isCompleted = session.completedStops.includes(s.id);
                const isCurrent = session.currentStopIndex === i;
                const isUpcoming = !isCompleted && !isCurrent;
                // First photo: seed photos, legacy photoUrl, or notice photos
                const firstPhoto = (s.seed.photos || [])[0]?.url || s.seed.photoUrl || (s.notice.photos || [])[0]?.url || null;

                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      isCurrent ? 'border-[#C4923A] bg-[#C4923A]/10' : isCompleted ? 'border-[#D4BFA0] bg-white' : 'border-[#D4BFA0]/50 bg-[#F0E0C8]/30'
                    }`}
                  >
                    {/* Photo or placeholder */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#D4BFA0]/30 shrink-0">
                      {isCompleted && firstPhoto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={firstPhoto} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-[#6B5D4F]/50">
                          {i + 1}
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      {isUpcoming ? (
                        <p className="text-xs text-[#6B5D4F]/50">Stop {i + 1}</p>
                      ) : (
                        <>
                          <p className={`text-xs font-semibold truncate ${isCurrent ? 'text-[#C4923A]' : 'text-[#2C2418]'}`}>
                            {s.title || `Stop ${i + 1}`}
                          </p>
                          <p className="text-[10px] text-[#6B5D4F]">
                            {isCurrent ? 'In progress' : 'Completed'}
                          </p>
                        </>
                      )}
                    </div>
                    {/* Status indicator */}
                    {isCompleted && (
                      <span className="text-[#7A7A5E] text-xs">&#10003;</span>
                    )}
                    {isCurrent && (
                      <span className="w-2 h-2 rounded-full bg-[#C4923A] animate-pulse" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
