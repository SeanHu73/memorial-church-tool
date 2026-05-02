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
import SeedCard from './cards/SeedCard';
import NoticeCard from './cards/NoticeCard';
import WonderCard from './cards/WonderCard';
import RevealCard from './cards/RevealCard';
import ReflectCard from './cards/ReflectCard';
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
    advancePhase,
    advanceStop,
    enterBranch,
    addReflection,
    endTour,
  } = useTour();

  const [paused, setPaused] = useState(false);
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
      {/* Top bar */}
      <div
        className="shrink-0 flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: '#D4BFA0' }}
      >
        <div>
          <p className="text-sm font-semibold text-[#2C2418]">{tour.title}</p>
          {phase !== 'end' && currentStop && (
            <p className="text-[11px] text-[#6B5D4F] uppercase tracking-wide">
              Stop {stopNum} of {tour.stops.length}
              {currentStop.title && <> &middot; {currentStop.title}</>}
            </p>
          )}
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
        {phase === 'seed' && currentStop && (
          <SeedCard stop={currentStop} onContinue={advancePhase} />
        )}

        {phase === 'notice' && currentStop && (
          <NoticeCard key={currentStop.id} stop={currentStop} onContinue={advancePhase} />
        )}

        {phase === 'wonder' && currentStop && (
          <WonderCard stop={currentStop} onContinue={advancePhase} />
        )}

        {phase === 'reveal' && currentStop && (
          <RevealCard stop={currentStop} onContinue={advancePhase} />
        )}

        {phase === 'reflect' && currentStop && (
          <ReflectCard
            stop={currentStop}
            hasWonder={currentStop.wonder !== null}
            isLastStop={isLastStop}
            onAskQuestion={enterBranch}
            onContinue={advanceStop}
            onAddReflection={(sliderValue, followUpResponse) => addReflection(sliderValue, followUpResponse)}
          />
        )}

        {phase === 'branch' && (
          <BranchCard />
        )}

        {phase === 'end' && (
          <EndCard />
        )}
      </div>

      {/* Footer bar with pause button */}
      {phase !== 'end' && (
        <div className="shrink-0 px-5 py-3 border-t" style={{ borderColor: '#D4BFA0' }}>
          <button
            onClick={() => setPaused(true)}
            className="px-4 py-2 rounded-lg text-xs text-[#6B5D4F]/70 hover:text-[#6B5D4F] hover:bg-[#D4BFA0]/20 transition-colors"
          >
            We&apos;re taking it in...
          </button>
        </div>
      )}
    </div>
  );
}
