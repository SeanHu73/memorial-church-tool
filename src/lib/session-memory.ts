/**
 * Session memory — per-tab conversational context the API needs to avoid
 * recycling anchors/quotations and to gate the "Step back" zoom-out option.
 *
 * Lifetime: sessionStorage. Survives reloads, dies when the tab closes.
 * Replaces the old localStorage random-counter rhythm in inquiry-counter.ts —
 * zoom-out availability is now coverage-based, not turn-count-based.
 *
 * All callers must use these helpers — the underlying storage shape may
 * change (e.g. switching from arrays-as-Sets to a real Set serialiser).
 */

import {
  SessionMemory,
  OpenZoomOutQuestion,
  QuestionCategory,
} from './types';

const STORAGE_KEY = 'mc_session_memory_v1';

const MAX_RECENT_ANCHORS = 3;
const MAX_RECENT_QUOTATIONS = 3;
const MAX_RECENT_CATEGORIES = 5;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

export function emptyMemory(): SessionMemory {
  return {
    recentObservationAnchors: [],
    recentQuotations: [],
    recentQuestionCategories: [],
    entriesEverUsed: [],
    locationsEverDiscussed: [],
    substantiveTurnCount: 0,
    openZoomOutQuestions: [],
  };
}

export function loadSessionMemory(): SessionMemory {
  if (!isBrowser()) return emptyMemory();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyMemory();
    const parsed = JSON.parse(raw) as Partial<SessionMemory>;
    // Merge with empty defaults so older shapes don't break the app.
    const empty = emptyMemory();
    return {
      recentObservationAnchors: Array.isArray(parsed.recentObservationAnchors) ? parsed.recentObservationAnchors : empty.recentObservationAnchors,
      recentQuotations: Array.isArray(parsed.recentQuotations) ? parsed.recentQuotations : empty.recentQuotations,
      recentQuestionCategories: Array.isArray(parsed.recentQuestionCategories) ? parsed.recentQuestionCategories : empty.recentQuestionCategories,
      entriesEverUsed: Array.isArray(parsed.entriesEverUsed) ? parsed.entriesEverUsed : empty.entriesEverUsed,
      locationsEverDiscussed: Array.isArray(parsed.locationsEverDiscussed) ? parsed.locationsEverDiscussed : empty.locationsEverDiscussed,
      substantiveTurnCount: typeof parsed.substantiveTurnCount === 'number' ? parsed.substantiveTurnCount : empty.substantiveTurnCount,
      openZoomOutQuestions: Array.isArray(parsed.openZoomOutQuestions) ? parsed.openZoomOutQuestions : empty.openZoomOutQuestions,
    };
  } catch {
    return emptyMemory();
  }
}

export function saveSessionMemory(mem: SessionMemory): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(mem));
  } catch {
    // Quota or serialisation failure — silent. Memory is best-effort.
  }
}

export function clearSessionMemory(): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Push to a capped most-recent-first list, deduping (case-insensitive).
 * Empty / null values are dropped.
 */
function pushRecent(list: string[], value: string | null | undefined, cap: number): string[] {
  if (!value) return list;
  const v = value.trim();
  if (!v) return list;
  const lower = v.toLowerCase();
  const filtered = list.filter((x) => x.toLowerCase() !== lower);
  return [v, ...filtered].slice(0, cap);
}

function unionPush(list: string[], values: string[] | undefined): string[] {
  if (!values || values.length === 0) return list;
  const set = new Set(list);
  for (const v of values) if (v) set.add(v);
  return Array.from(set);
}

export interface RecordTurnInput {
  /** True when the model gave a real answer (not "I don't know"). */
  substantive: boolean;
  anchorUsed?: string | null;
  quotationsUsed?: string[];
  category?: QuestionCategory | null;
  entriesUsed?: string[];          // union of observationEntries + answerEntries
  location?: string | null;        // physicalLocationTag or pin physicalArea
}

/**
 * Record one completed turn into memory and return the new memory object.
 * Pure — does not persist on its own; pass the result to saveSessionMemory().
 */
export function recordTurn(mem: SessionMemory, input: RecordTurnInput): SessionMemory {
  return {
    ...mem,
    recentObservationAnchors: pushRecent(mem.recentObservationAnchors, input.anchorUsed ?? null, MAX_RECENT_ANCHORS),
    recentQuotations: (input.quotationsUsed || []).reduce(
      (acc, q) => pushRecent(acc, q, MAX_RECENT_QUOTATIONS),
      mem.recentQuotations
    ),
    recentQuestionCategories: input.category
      ? [input.category, ...mem.recentQuestionCategories.filter((c) => c !== input.category)].slice(0, MAX_RECENT_CATEGORIES)
      : mem.recentQuestionCategories,
    entriesEverUsed: unionPush(mem.entriesEverUsed, input.entriesUsed),
    locationsEverDiscussed: input.location
      ? unionPush(mem.locationsEverDiscussed, [input.location])
      : mem.locationsEverDiscussed,
    substantiveTurnCount: mem.substantiveTurnCount + (input.substantive ? 1 : 0),
    openZoomOutQuestions: mem.openZoomOutQuestions,
  };
}

export function addOpenZoomOutQuestion(mem: SessionMemory, q: OpenZoomOutQuestion): SessionMemory {
  return { ...mem, openZoomOutQuestions: [...mem.openZoomOutQuestions, q] };
}

/**
 * Coverage-based readiness for the "Step back and see the bigger picture"
 * option. Mirrors the rule in the build guide §698-703: 2+ substantive
 * turns AND coverage of either 2+ entries or 2+ locations.
 */
export function isZoomOutAvailable(mem: SessionMemory): boolean {
  return (
    mem.substantiveTurnCount >= 2 &&
    (mem.entriesEverUsed.length >= 2 || mem.locationsEverDiscussed.length >= 2)
  );
}
