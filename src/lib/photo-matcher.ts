/**
 * Deterministic photo matcher.
 *
 * Picks the best photo to display alongside an AI or static response.
 * The AI does NOT pick photos — this code does, using the following ranking:
 *
 *   1. Location match (mandatory, when currentLocation is provided):
 *      photo.physicalLocationTag === currentLocation OR 'general'
 *   2. Database entry overlap — strongest signal (humans tagged the photo
 *      against the entry the slot is about). CRITICAL: the observation slot
 *      scores against `observationEntries` (the physical thing the learner
 *      is being told to look at), while the answer slot scores against
 *      `answerEntries` (the narrative content of the answer). This prevents
 *      the observation photo from spoiling the answer — e.g., when the
 *      observation says "find the plaque" but the answer is about Jane
 *      Stanford, the observation photo should show the plaque, not Jane.
 *   3. Category match — preferred photos tagged for the question's category
 *   4. Type preference by slot:
 *      - observation slot prefers onsite (what they can see right now)
 *      - answer slot prefers archival (context for historical / lost features)
 *   5. Tiebreaker: annotation count (richer content wins).
 *
 * Returns up to two photos — one for the observation, one for the answer.
 * They may be the same photo, in which case the UI should only render it once.
 */

import { PinPhoto, QuestionCategory } from './types';

export interface PhotoMatchInput {
  photos: PinPhoto[];
  currentLocation: string | null;      // null = no location constraint (e.g., free-form ask)
  observationEntries: string[];        // knowledge entry IDs for the physical feature the observation points at
  answerEntries: string[];             // knowledge entry IDs the narrative answer drew from
  categories: QuestionCategory[];      // question categories (who/what/when...)
}

export interface PhotoSelection {
  observationPhoto: PinPhoto | null;
  answerPhoto: PinPhoto | null;
}

type Slot = 'observation' | 'answer';

/**
 * Gate photos on the mandatory location rule.
 * If `currentLocation` is null or 'general', we allow everything through
 * (useful for free-form Ask responses that aren't tied to a specific pin).
 */
function filterByLocation(photos: PinPhoto[], currentLocation: string | null): PinPhoto[] {
  if (!currentLocation || currentLocation === 'general') return photos;
  return photos.filter(
    (p) => p.physicalLocationTag === currentLocation || p.physicalLocationTag === 'general'
  );
}

/**
 * Score a photo for a given slot.
 * Higher is better. Weightings are chosen so each rule dominates the next:
 *   db-entry > category > type-preference > annotation tiebreaker.
 */
function scorePhoto(
  photo: PinPhoto,
  input: PhotoMatchInput,
  slot: Slot
): number {
  let score = 0;

  // 2. Database entry overlap — strongest signal (weight 1000 per match).
  //    Each slot scores against its OWN entry list so the observation photo
  //    illustrates the physical feature the learner is looking at, while the
  //    answer photo illustrates the narrative content.
  const slotEntries = slot === 'observation' ? input.observationEntries : input.answerEntries;
  const entryOverlap = photo.databaseEntries.filter((e) => slotEntries.includes(e)).length;
  score += entryOverlap * 1000;

  // 3. Category overlap (weight 50 per match)
  const categoryOverlap = photo.categories.filter((c) => input.categories.includes(c)).length;
  score += categoryOverlap * 50;

  // 4. Slot-based type preference
  if (slot === 'observation') {
    // "Look at this" — prefer what they can see right now
    if (photo.type === 'onsite') score += 20;
    else if (photo.type === 'archival') score += 5;
    else if (photo.type === 'contributor') score += 10;
  } else {
    // Narrative answer — archival beats onsite for historical / lost features
    if (photo.type === 'archival') score += 20;
    else if (photo.type === 'onsite') score += 10;
    else if (photo.type === 'contributor') score += 5;
  }

  // 5. Tiebreaker: annotation count (sub-integer so it never overrides type preference)
  score += photo.annotations.length * 0.5;

  return score;
}

function pickBest(photos: PinPhoto[], input: PhotoMatchInput, slot: Slot): PinPhoto | null {
  if (photos.length === 0) return null;
  const scored = photos.map((p) => ({ photo: p, score: scorePhoto(p, input, slot) }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0].photo;
}

/**
 * Main entrypoint. Returns the best photo for the observation slot
 * (if any) and the best photo for the answer slot (if any). The UI
 * should dedupe when they resolve to the same photo.
 */
export function selectPhotoForResponse(input: PhotoMatchInput): PhotoSelection {
  const eligible = filterByLocation(input.photos, input.currentLocation);

  if (eligible.length === 0) {
    return { observationPhoto: null, answerPhoto: null };
  }

  const observationPhoto = pickBest(eligible, input, 'observation');
  const answerPhoto = pickBest(eligible, input, 'answer');

  return { observationPhoto, answerPhoto };
}

/**
 * Collect every photo across a set of pins, tagging each with its pin
 * location (useful for free-form Ask queries where we need a site-wide
 * search but still want `currentLocation` filtering to work).
 *
 * For photos that don't declare their own `physicalLocationTag`, fall back
 * to the owning pin's `physicalArea`.
 */
export function collectAllPhotos(pins: Array<{ location: { physicalArea: string }; photos: PinPhoto[] }>): PinPhoto[] {
  const out: PinPhoto[] = [];
  for (const pin of pins) {
    for (const photo of pin.photos) {
      if (!photo.physicalLocationTag) {
        out.push({ ...photo, physicalLocationTag: pin.location.physicalArea });
      } else {
        out.push(photo);
      }
    }
  }
  return out;
}
