/**
 * Library-first photo matcher.
 *
 * Picks the best photo to display for a learner-facing response by
 * searching the FULL photo library (not a pre-filtered, pin-attached
 * subset). Pin attachment is a tiebreaker only — never a filter.
 *
 * Why library-first: pin↔photo links in Firestore are unreliable
 * (legacy /admin/pins editor wiped them; many photos aren't attached to
 * any pin even when they answer the learner's question). Pre-filtering
 * by `getPhotosForPin()` ended up returning empty arrays for every pin
 * → matcher returned null/null → no photos rendered.
 *
 * The matcher returns up to two photos:
 *   - observationPhoto: visual anchor for "look at X" — what the
 *     learner can see right now. Strict location filter; prefers onsite.
 *   - answerPhoto: visual support for the narrative answer. If the
 *     answer is "visible context" (refers to the same thing the
 *     observation already shows), suppresses the answer slot to avoid
 *     duplicate photos. If the answer is "invisible context" (historical
 *     event, lost feature, elsewhere on campus), prefers archival and
 *     allows broader location matches.
 *
 * Each candidate is scored on:
 *   - semantic term overlap (IDF-weighted) against the slot's text
 *     signal — anchorUsed/observation for the observation slot,
 *     the answer text for the answer slot
 *   - knowledge-entry overlap (large boost — humans tagged this)
 *   - category overlap
 *   - type preference for the slot
 *   - pin tiebreaker (currentPin in linkedPinIds)
 *
 * Candidates below MIN_SCORE return null with a debug log so we can see
 * why a slot stayed empty.
 */

import { Photo, Pin, QuestionCategory } from './types';

export interface PhotoMatcherInput {
  photos: Photo[];                       // full library, NEVER pre-filtered
  observation: string | null;
  answer: string;
  anchorUsed: string | null;
  observationEntries: string[];
  answerEntries: string[];
  questionCategory: QuestionCategory | null;
  currentLocation: string | null;        // pin's physicalArea, or null for free-form Ask
  currentPin?: Pin | null;               // tiebreaker only, never a filter
}

export interface PhotoMatcherOutput {
  observationPhoto: Photo | null;
  answerPhoto: Photo | null;
}

type Slot = 'observation' | 'answer';

const MIN_SCORE = 3;

// Stopwords stripped from semantic comparisons. Includes the obvious
// English filler plus domain words that appear in nearly every photo
// description in this corpus ("church", "memorial", "stone") — keeping
// them would make every photo look semantically similar to every query.
const STOPWORDS = new Set<string>([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'but', 'by',
  'for', 'from', 'has', 'have', 'in', 'is', 'it', 'its', 'of', 'on',
  'or', 'that', 'the', 'their', 'there', 'these', 'this', 'those',
  'to', 'was', 'were', 'which', 'with', 'who', 'what', 'when',
  'where', 'why', 'how', 'do', 'does', 'did', 'you', 'your', 'we',
  'our', 'they', 'them', 'i', 'me', 'my',
  // domain words present in nearly every photo's description
  'church', 'memorial', 'stone',
]);

function tokenize(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

/**
 * Build an inverse-document-frequency map across the photo library.
 * Tokens that appear in many photos (e.g. "facade") get less weight
 * than rare ones (e.g. "rosamond").
 */
function buildIdf(photos: Photo[]): Map<string, number> {
  const docFreq = new Map<string, number>();
  for (const photo of photos) {
    const tokens = new Set(photoTokens(photo));
    for (const t of tokens) {
      docFreq.set(t, (docFreq.get(t) || 0) + 1);
    }
  }
  const idf = new Map<string, number>();
  const N = Math.max(photos.length, 1);
  for (const [token, df] of docFreq) {
    // log smoothing so a token in every doc still has weight ~0
    idf.set(token, Math.log(1 + N / df));
  }
  return idf;
}

function photoTokens(photo: Photo): string[] {
  const parts: string[] = [];
  if (photo.description) parts.push(photo.description);
  if (photo.caption) parts.push(photo.caption);
  if (photo.keywords && photo.keywords.length > 0) parts.push(photo.keywords.join(' '));
  for (const ann of photo.annotations || []) {
    if (ann.caption) parts.push(ann.caption);
  }
  return tokenize(parts.join(' '));
}

/**
 * Heuristic: does the answer text talk about something the learner
 * can NOT see right now (a historical event, a destroyed feature,
 * a moved/lost object, someone long dead)? When true, the answer
 * slot should pull an archival photo from anywhere in the library.
 * When false, the answer is talking about something the observation
 * photo already shows, so we suppress the answer slot to avoid
 * showing the same photo twice.
 */
function isInvisibleContext(answer: string): boolean {
  if (!answer) return false;
  const lower = answer.toLowerCase();

  const historicalMarkers = [
    'earthquake', '1906', 'original', 'originally', 'destroyed',
    'used to', 'rebuilt', 'lost', 'jane stanford', 'leland stanford',
    'collapsed', 'rebuild', 'reconstruction', 'spire fell',
    'before the', 'no longer', 'once stood', 'replaced',
  ];
  if (historicalMarkers.some((m) => lower.includes(m))) return true;

  // Any year before 1990 strongly suggests the answer is about
  // something not currently visible.
  const years = lower.match(/\b(1[5-9][0-9]{2}|200[0-9]|201[0-8])\b/g);
  if (years && years.some((y) => parseInt(y, 10) < 1990)) return true;

  return false;
}

interface ScoredCandidate {
  photo: Photo;
  score: number;
  parts: Record<string, number>;
}

function scoreCandidate(
  photo: Photo,
  slot: Slot,
  input: PhotoMatcherInput,
  idf: Map<string, number>,
  queryTokens: string[]
): ScoredCandidate {
  const parts: Record<string, number> = {};

  // 1. Semantic overlap (IDF-weighted)
  const photoToks = new Set(photoTokens(photo));
  let semantic = 0;
  for (const q of queryTokens) {
    if (photoToks.has(q)) {
      semantic += idf.get(q) ?? 1;
    }
  }
  parts.semantic = semantic;

  // 2. Knowledge entry overlap (strongest structured signal)
  const slotEntries = slot === 'observation' ? input.observationEntries : input.answerEntries;
  const entryOverlap = (photo.databaseEntries || []).filter((e) => slotEntries.includes(e)).length;
  parts.entries = entryOverlap * 5;

  // 3. Category boost
  if (input.questionCategory && (photo.categories || []).includes(input.questionCategory)) {
    parts.category = 1;
  } else {
    parts.category = 0;
  }

  // 4. Type preference (depends on slot + invisible-context flag)
  const typePref = slot === 'observation'
    ? { onsite: 2, contributor: 1.5, archival: 0.5 }
    : { archival: 4, onsite: 1, contributor: 1 };
  parts.type = typePref[photo.type] ?? 0;

  // 5. Pin tiebreaker — small bump if attached to the current pin.
  //    NEVER a filter — photos with no link still compete on merit.
  if (input.currentPin && (photo.linkedPinIds || []).includes(input.currentPin.id)) {
    parts.pin = 0.5;
  } else {
    parts.pin = 0;
  }

  // 6. Annotation richness (sub-integer tiebreaker)
  parts.annotations = (photo.annotations || []).length * 0.1;

  const score = Object.values(parts).reduce((a, b) => a + b, 0);
  return { photo, score, parts };
}

function pickObservation(input: PhotoMatcherInput, idf: Map<string, number>): Photo | null {
  // Strict location filter for the observation slot — the learner is being
  // told to physically look at something here. If the photo is from a
  // different part of the building, it can't be what they're looking at.
  const eligible = input.currentLocation
    ? input.photos.filter(
        (p) => p.physicalLocationTag === input.currentLocation || p.physicalLocationTag === 'general'
      )
    : input.photos;

  const queryText = input.anchorUsed || input.observation || '';
  const queryTokens = tokenize(queryText);

  if (eligible.length === 0) {
    console.log('[photo-matcher]', {
      slot: 'observation',
      result: null,
      reason: 'no photos pass location filter',
      currentLocation: input.currentLocation,
      libSize: input.photos.length,
    });
    return null;
  }

  const scored = eligible
    .map((p) => scoreCandidate(p, 'observation', input, idf, queryTokens))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best || best.score < MIN_SCORE) {
    console.log('[photo-matcher]', {
      slot: 'observation',
      result: null,
      reason: `top score ${best?.score.toFixed(2) ?? 'n/a'} below threshold ${MIN_SCORE}`,
      queryText,
      queryTokens,
      topCandidates: scored.slice(0, 3).map((c) => ({
        id: c.photo.id,
        caption: c.photo.caption,
        location: c.photo.physicalLocationTag,
        score: Number(c.score.toFixed(2)),
        parts: c.parts,
      })),
    });
    return null;
  }
  return best.photo;
}

function pickAnswer(
  input: PhotoMatcherInput,
  idf: Map<string, number>,
  observationPhoto: Photo | null
): Photo | null {
  const invisible = isInvisibleContext(input.answer);

  // If the answer is talking about visible context (the same thing the
  // observation already shows), suppress the answer slot — no duplicate.
  if (!invisible) {
    return null;
  }

  // Broader location filter for invisible context — historical/lost
  // features may legitimately live anywhere in the library (the burned
  // 1906 nave, the original Quad, Jane Stanford in San Francisco).
  // Allow current location, 'general', AND any photo with no location.
  const eligible = input.photos.filter((p) => {
    if (!p.id) return false;
    if (observationPhoto && p.id === observationPhoto.id) return false;
    return true;
  });

  const queryTokens = tokenize(input.answer);

  if (eligible.length === 0) {
    console.log('[photo-matcher]', {
      slot: 'answer',
      result: null,
      reason: 'no eligible photos after excluding observation',
      libSize: input.photos.length,
    });
    return null;
  }

  const scored = eligible
    .map((p) => scoreCandidate(p, 'answer', input, idf, queryTokens))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best || best.score < MIN_SCORE) {
    console.log('[photo-matcher]', {
      slot: 'answer',
      result: null,
      reason: `top score ${best?.score.toFixed(2) ?? 'n/a'} below threshold ${MIN_SCORE}`,
      invisibleContext: invisible,
      queryTokens: queryTokens.slice(0, 12),
      topCandidates: scored.slice(0, 3).map((c) => ({
        id: c.photo.id,
        caption: c.photo.caption,
        type: c.photo.type,
        score: Number(c.score.toFixed(2)),
        parts: c.parts,
      })),
    });
    return null;
  }
  return best.photo;
}

/**
 * Main entrypoint. Pass the FULL photo library plus the AI response
 * signals. Returns the chosen photo for each slot (or null).
 */
export function selectPhotoForResponse(input: PhotoMatcherInput): PhotoMatcherOutput {
  if (!input.photos || input.photos.length === 0) {
    console.log('[photo-matcher]', {
      slot: 'both',
      result: null,
      reason: 'photo library is empty',
    });
    return { observationPhoto: null, answerPhoto: null };
  }

  const idf = buildIdf(input.photos);
  const observationPhoto = pickObservation(input, idf);
  const answerPhoto = pickAnswer(input, idf, observationPhoto);
  return { observationPhoto, answerPhoto };
}
