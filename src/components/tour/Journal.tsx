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

import { useTour } from '@/context/TourContext';
import SeedCard from './cards/SeedCard';
import NoticeCard from './cards/NoticeCard';
import WonderCard from './cards/WonderCard';
import RevealCard from './cards/RevealCard';
import ReflectCard from './cards/ReflectCard';
import BranchCard from './cards/BranchCard';
import EndCard from './cards/EndCard';

export default function Journal() {
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

  if (!tour || !session) return null;

  const phase = session.currentPhase;
  const stopNum = session.currentStopIndex + 1;

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
            </p>
          )}
        </div>
        <button
          onClick={endTour}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#6B5D4F] hover:bg-[#D4BFA0]/30 text-sm"
          title="Exit tour"
        >
          &times;
        </button>
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
            isLastStop={isLastStop}
            onAskQuestion={enterBranch}
            onContinue={advanceStop}
            onAddReflection={addReflection}
          />
        )}

        {phase === 'branch' && (
          <BranchCard />
        )}

        {phase === 'end' && (
          <EndCard />
        )}
      </div>
    </div>
  );
}
