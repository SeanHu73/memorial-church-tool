'use client';

/**
 * React context for tour playback state.
 *
 * Provides the Tour, TourSession, and mutation functions to all tour
 * components without prop drilling. Mirrors session state to
 * sessionStorage for reload survival.
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { Tour, Stop, TourSession, BankedQuestion } from '@/lib/types';
import { getTour } from '@/lib/tours-store';
import { persistTourSession } from '@/lib/tour-sessions-store';
import { logReflection, logQuestionRouted, logTourComplete } from '@/lib/tour-logger';
import {
  createSession,
  advancePhase as advancePhaseImpl,
  advanceToNextStop as advanceToNextStopImpl,
  enterBranch as enterBranchImpl,
  returnFromBranch as returnFromBranchImpl,
  addReflectionScore as addReflectionScoreImpl,
  bankQuestion as bankQuestionImpl,
  loadTourSession,
  saveTourSession,
  clearTourSession,
} from '@/lib/tour-session';

interface TourContextValue {
  tour: Tour | null;
  session: TourSession | null;
  currentStop: Stop | null;
  isActive: boolean;
  isLastStop: boolean;
  startTour: (tour: Tour) => void;
  advancePhase: () => void;
  advanceStop: () => void;
  enterBranch: () => void;
  returnFromBranch: () => void;
  addReflection: (score: number) => void;
  bankQuestion: (q: BankedQuestion) => void;
  endTour: () => void;
}

const TourCtx = createContext<TourContextValue | null>(null);

export function useTour(): TourContextValue {
  const ctx = useContext(TourCtx);
  if (!ctx) throw new Error('useTour must be used inside TourProvider');
  return ctx;
}

export function TourProvider({ children }: { children: ReactNode }) {
  const [tour, setTour] = useState<Tour | null>(null);
  const [session, setSession] = useState<TourSession | null>(null);

  // On mount, restore any persisted session
  useEffect(() => {
    const saved = loadTourSession();
    if (saved && !saved.completedAt) {
      getTour(saved.tourId).then((t) => {
        if (t) {
          setTour(t);
          setSession(saved);
        } else {
          clearTourSession();
        }
      });
    }
  }, []);

  const persist = useCallback((s: TourSession) => {
    setSession(s);
    saveTourSession(s);
    // Fire-and-forget write to Firestore for analytics
    persistTourSession(s);
  }, []);

  const currentStop = tour && session
    ? tour.stops[session.currentStopIndex] ?? null
    : null;

  const isLastStop = tour && session
    ? session.currentStopIndex >= tour.stops.length - 1
    : false;

  const startTour = useCallback((t: Tour) => {
    const s = createSession(t.id);
    setTour(t);
    persist(s);
  }, [persist]);

  const advancePhase = useCallback(() => {
    if (!session || !currentStop) return;
    persist(advancePhaseImpl(session, currentStop));
  }, [session, currentStop, persist]);

  const advanceStop = useCallback(() => {
    if (!session || !tour) return;
    const next = advanceToNextStopImpl(session, tour);
    persist(next);
    if (next.currentPhase === 'end') {
      logTourComplete({
        tourId: tour.id,
        sessionId: session.id,
        tourTitle: tour.title,
        stopsCompleted: next.completedStops.length,
        totalStops: tour.stops.length,
        startedAt: session.startedAt,
      });
    }
  }, [session, tour, persist]);

  const enterBranch = useCallback(() => {
    if (!session) return;
    persist(enterBranchImpl(session));
  }, [session, persist]);

  const returnFromBranch = useCallback(() => {
    if (!session || !tour) return;
    persist(returnFromBranchImpl(session, tour));
  }, [session, tour, persist]);

  const addReflection = useCallback((score: number) => {
    if (!session || !currentStop || !tour) return;
    persist(addReflectionScoreImpl(session, currentStop.id, score));
    logReflection({
      tourId: tour.id,
      sessionId: session.id,
      tourTitle: tour.title,
      stopIndex: session.currentStopIndex,
      stopTitle: currentStop.title || `Stop ${session.currentStopIndex + 1}`,
      score,
    });
  }, [session, currentStop, tour, persist]);

  const bankQuestionFn = useCallback((q: BankedQuestion) => {
    if (!session || !tour) return;
    persist(bankQuestionImpl(session, q));
    logQuestionRouted({
      tourId: tour.id,
      sessionId: session.id,
      tourTitle: tour.title,
      stopIndex: session.currentStopIndex,
      stopTitle: currentStop?.title || `Stop ${session.currentStopIndex + 1}`,
      questionText: q.questionText,
      routing: q.aiResponse,
    });
  }, [session, tour, currentStop, persist]);

  const endTour = useCallback(() => {
    setTour(null);
    setSession(null);
    clearTourSession();
  }, []);

  return (
    <TourCtx.Provider value={{
      tour,
      session,
      currentStop,
      isActive: tour !== null && session !== null && session.currentPhase !== 'end',
      isLastStop,
      startTour,
      advancePhase,
      advanceStop,
      enterBranch,
      returnFromBranch,
      addReflection,
      bankQuestion: bankQuestionFn,
      endTour,
    }}>
      {children}
    </TourCtx.Provider>
  );
}
