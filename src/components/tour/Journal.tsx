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
import ProgressBar from './ProgressBar';
import JournalOverlay from './JournalOverlay';
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
  const [showJournal, setShowJournal] = useState(false);
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

  // Progress bar visibility — show during stops, hide on intro/end
  const showProgress = !['intro', 'end'].includes(phase);

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
      {showProgress && <ProgressBar tour={tour} session={session} />}

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
        <div className="shrink-0 px-5 py-2 border-t flex items-center justify-end" style={{ borderColor: '#D4BFA0' }}>
          <button
            onClick={() => setShowJournal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-[#6B5D4F] hover:bg-[#D4BFA0]/20 transition-colors border border-[#D4BFA0]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
            </svg>
            Journal
          </button>
        </div>
      )}

      {/* Journal overlay */}
      {showJournal && (
        <JournalOverlay tour={tour} session={session} onClose={() => setShowJournal(false)} />
      )}
    </div>
  );
}
