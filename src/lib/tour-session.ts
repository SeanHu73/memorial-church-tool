/**
 * Tour session state management.
 *
 * Pure functions for creating, advancing, and persisting TourSession
 * objects. The session lives in sessionStorage so it survives page
 * reloads but resets when the tab closes — the right lifecycle for
 * a single group visit.
 */

import { Tour, Stop, TourSession, BankedQuestion } from './types';

const STORAGE_KEY = 'mc_tour_session_v1';

// ── Phase state machine ─────────────────────────────────────────

export type TourPhase = TourSession['currentPhase'];

/**
 * Advance to the next phase within a stop. The transition table:
 *   seed → notice
 *   notice → wonder (if stop.wonder !== null) OR reveal
 *   wonder → reveal
 *   reveal → reflect
 *   reflect → done (caller should use advanceToNextStop or enterBranch)
 */
export function nextPhase(current: TourPhase, stop: Stop): TourPhase {
  switch (current) {
    case 'seed': return 'notice';
    case 'notice': return stop.wonder !== null ? 'wonder' : 'reveal';
    case 'wonder': return 'reveal';
    case 'reveal': return 'reflect';
    default: return current; // reflect, branch, off_path, end — handled by callers
  }
}

// ── Session CRUD ────────────────────────────────────────────────

export function createSession(tourId: string): TourSession {
  return {
    id: `ts_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    tourId,
    currentStopIndex: 0,
    currentPhase: 'seed',
    completedStops: [],
    reflections: [],
    bankedQuestions: [],
    startedAt: new Date().toISOString(),
    completedAt: null,
  };
}

export function advancePhase(session: TourSession, stop: Stop): TourSession {
  return { ...session, currentPhase: nextPhase(session.currentPhase, stop) };
}

export function advanceToNextStop(session: TourSession, tour: Tour): TourSession {
  const currentStop = tour.stops[session.currentStopIndex];
  const nextIndex = session.currentStopIndex + 1;
  if (nextIndex >= tour.stops.length) {
    return {
      ...session,
      currentPhase: 'end',
      completedStops: currentStop
        ? [...session.completedStops, currentStop.id]
        : session.completedStops,
      completedAt: new Date().toISOString(),
    };
  }
  return {
    ...session,
    currentStopIndex: nextIndex,
    currentPhase: 'seed',
    completedStops: currentStop
      ? [...session.completedStops, currentStop.id]
      : session.completedStops,
  };
}

export function enterBranch(session: TourSession): TourSession {
  return { ...session, currentPhase: 'branch' };
}

export function enterOffPath(session: TourSession): TourSession {
  return { ...session, currentPhase: 'off_path' };
}

export function returnFromBranch(session: TourSession, tour: Tour): TourSession {
  return advanceToNextStop(session, tour);
}

export function addReflection(
  session: TourSession,
  stopId: string,
  sliderValue: number,
  followUpResponse: string | null
): TourSession {
  return {
    ...session,
    reflections: [...session.reflections, { stopId, sliderValue, followUpResponse }],
  };
}

export function bankQuestion(
  session: TourSession,
  question: BankedQuestion
): TourSession {
  return {
    ...session,
    bankedQuestions: [...session.bankedQuestions, question],
  };
}

// ── Persistence ─────────────────────────────────────────────────

export function loadTourSession(): TourSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TourSession;
  } catch {
    return null;
  }
}

export function saveTourSession(session: TourSession): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // sessionStorage full or unavailable — non-fatal
  }
}

export function clearTourSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
