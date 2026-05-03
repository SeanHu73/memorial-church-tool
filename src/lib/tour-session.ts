/**
 * Tour session state management.
 *
 * Pure functions for creating, advancing, and persisting TourSession
 * objects. The session lives in sessionStorage so it survives page
 * reloads but resets when the tab closes — the right lifecycle for
 * a single group visit.
 */

import type { Tour, Stop, TourSession, BankedQuestion } from './types';

const STORAGE_KEY = 'mc_tour_session_v1';

// ── Phase state machine ─────────────────────────────────────────

export type TourPhase = TourSession['currentPhase'];

/**
 * Advance to the next phase within a stop, handling extra rounds.
 *
 * Round 0 uses stop.wonder + stop.reveal.
 * Rounds 1+ use stop.extraRounds[round-1].wonder + .reveal.
 *
 * After each reveal, check if there's another round. If so, advance
 * to the next round's wonder (or reveal if wonder is null). If not,
 * advance to reflect (or stay on reveal if reflect is null).
 */
function nextPhaseAndRound(
  current: TourPhase,
  currentRound: number,
  stop: Stop
): { phase: TourPhase; round: number } {
  const extras = stop.extraRounds || [];

  switch (current) {
    case 'seed':
      return { phase: 'notice', round: currentRound };

    case 'notice': {
      // Round 0 uses the main wonder
      const wonder = stop.wonder;
      return wonder !== null
        ? { phase: 'wonder', round: 0 }
        : { phase: 'reveal', round: 0 };
    }

    case 'wonder':
      return { phase: 'reveal', round: currentRound };

    case 'reveal': {
      // Check if there's a next round
      const nextRoundIndex = currentRound; // extraRounds[0] = round 1
      if (nextRoundIndex < extras.length) {
        const nextExtra = extras[nextRoundIndex];
        return nextExtra.wonder !== null
          ? { phase: 'wonder', round: currentRound + 1 }
          : { phase: 'reveal', round: currentRound + 1 };
      }
      // No more rounds — go to reflect or stay
      return stop.reflect !== null
        ? { phase: 'reflect', round: currentRound }
        : { phase: 'reveal', round: currentRound }; // stay on reveal (inline buttons)
    }

    default:
      return { phase: current, round: currentRound };
  }
}

// ── Session CRUD ────────────────────────────────────────────────

export function createSession(tour: Tour): TourSession {
  return {
    id: `ts_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    tourId: tour.id,
    currentStopIndex: 0,
    currentRound: 0,
    currentPhase: tour.essentialQuestion ? 'eq_opening' : 'seed',
    completedStops: [],
    reflections: [],
    bankedQuestions: [],
    detourVisits: [],
    essentialQuestionResponses: null,
    startedAt: new Date().toISOString(),
    completedAt: null,
  };
}

export function advancePhase(session: TourSession, stop: Stop): TourSession {
  const { phase, round } = nextPhaseAndRound(session.currentPhase, session.currentRound, stop);
  return { ...session, currentPhase: phase, currentRound: round };
}

export function advanceToNextStop(session: TourSession, tour: Tour): TourSession {
  const currentStop = tour.stops[session.currentStopIndex];
  const nextIndex = session.currentStopIndex + 1;
  if (nextIndex >= tour.stops.length) {
    const endPhase = tour.essentialQuestion ? 'eq_closing' : 'end';
    return {
      ...session,
      currentPhase: endPhase,
      completedStops: currentStop
        ? [...session.completedStops, currentStop.id]
        : session.completedStops,
      completedAt: new Date().toISOString(),
    };
  }
  return {
    ...session,
    currentStopIndex: nextIndex,
    currentRound: 0,
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

export function recordDetourVisit(
  session: TourSession,
  stopId: string,
  detourId: string
): TourSession {
  return {
    ...session,
    detourVisits: [...session.detourVisits, { stopId, detourId, timestamp: new Date().toISOString() }],
  };
}

export function completeEqOpening(
  session: TourSession,
  theory: string,
  reasoning: string
): TourSession {
  return {
    ...session,
    currentPhase: 'seed',
    essentialQuestionResponses: {
      initialTheory: theory,
      initialReasoning: reasoning,
      finalReflection: '',
      finalReasoning: '',
      finalCognitiveSlider: 0.5,
      finalPerceptualSlider: null,
      whatShiftedResponse: null,
      reasoningSourceResponse: null,
    },
  };
}

export function completeEqClosing(
  session: TourSession,
  finalReflection: string,
  finalReasoning: string
): TourSession {
  return {
    ...session,
    currentPhase: 'eq_final_reflect',
    essentialQuestionResponses: session.essentialQuestionResponses
      ? { ...session.essentialQuestionResponses, finalReflection, finalReasoning }
      : null,
  };
}

export function completeEqFinalReflect(
  session: TourSession,
  cognitiveSlider: number,
  perceptualSlider: number | null,
  whatShifted: string[] | null,
  reasoningSource: string[] | null
): TourSession {
  return {
    ...session,
    currentPhase: 'end',
    essentialQuestionResponses: session.essentialQuestionResponses
      ? {
          ...session.essentialQuestionResponses,
          finalCognitiveSlider: cognitiveSlider,
          finalPerceptualSlider: perceptualSlider,
          whatShiftedResponse: whatShifted,
          reasoningSourceResponse: reasoningSource,
        }
      : null,
    completedAt: new Date().toISOString(),
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
