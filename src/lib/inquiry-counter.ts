/**
 * Inquiry counter with random zoom-out rhythm.
 *
 * The counter tracks consecutive direct-observation inquiries. After every
 * 2, 3, or 4 inquiries (randomised each cycle so the pattern doesn't feel
 * preset), the app offers a "Step back and see the bigger picture" option
 * instead of the usual "Keep talking about this" prompt.
 *
 * State lives in localStorage so it persists as the learner navigates
 * between pins, ask-sheets, and map views during a single session.
 */

const COUNT_KEY = 'mc_inquiry_count';
const TARGET_KEY = 'mc_zoom_target';

function pickTarget(): number {
  const options = [2, 3, 4];
  return options[Math.floor(Math.random() * options.length)];
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getCount(): number {
  if (!isBrowser()) return 0;
  const raw = localStorage.getItem(COUNT_KEY);
  return raw ? parseInt(raw, 10) || 0 : 0;
}

export function getTarget(): number {
  if (!isBrowser()) return 3;
  const raw = localStorage.getItem(TARGET_KEY);
  if (raw) {
    const n = parseInt(raw, 10);
    if (n === 2 || n === 3 || n === 4) return n;
  }
  const t = pickTarget();
  localStorage.setItem(TARGET_KEY, String(t));
  return t;
}

/** Increment the inquiry counter (call after each non-zoom-out inquiry answer is revealed). */
export function incrementCount(): void {
  if (!isBrowser()) return;
  const next = getCount() + 1;
  localStorage.setItem(COUNT_KEY, String(next));
}

/** Reset after a zoom-out answer is revealed. Pick a new random target. */
export function resetCounter(): void {
  if (!isBrowser()) return;
  localStorage.setItem(COUNT_KEY, '0');
  localStorage.setItem(TARGET_KEY, String(pickTarget()));
}

/** Should the next prompt offer zoom-out instead of the default "keep talking"? */
export function shouldOfferZoomOut(): boolean {
  return getCount() >= getTarget();
}
