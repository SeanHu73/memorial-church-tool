/**
 * Photo retrieval — bridges the new `memorial-church-photos` Firestore
 * collection with the learner-facing pin display + matcher.
 *
 * Before Change 7's cutover, the learner app read embedded `pin.photos`
 * (an array of `PinPhoto`). Now the source of truth is the standalone
 * `Photo` collection, linked to pins via either:
 *   - `pin.photoIds` (preferred — set by /admin/photos and the
 *     photo_extraction_v1 migration), or
 *   - `photo.linkedPinIds` containing the pin's id (the inverse link).
 *
 * For pins that predate the migration and have neither, we fall back to
 * `pin.photos` so nothing disappears for a pin whose data hasn't been
 * touched yet.
 *
 * The matcher in `photo-matcher.ts` operates on `PinPhoto`. `Photo` is a
 * structural superset of `PinPhoto`, so we can hand it through as-is —
 * we project to the narrower shape only when the matcher contract requires
 * it. Photos returned here keep their full `Photo` shape so downstream code
 * can still read description/keywords if needed.
 */

import { Pin, Photo, PinPhoto } from './types';

/**
 * Resolve every photo attached to a pin.
 *
 * Priority order:
 *   1. pin.photoIds → look up by id in the photo collection
 *   2. photo.linkedPinIds includes pin.id → inverse lookup
 *   3. pin.photos embedded array → legacy fallback (returns embedded shape)
 *
 * The returned list is deduped by photo url so steps 1 and 2 don't
 * double-count when both indexes agree (which they should).
 */
export function getPhotosForPin(pin: Pin, allPhotos: Photo[]): Array<Photo | PinPhoto> {
  const out: Array<Photo | PinPhoto> = [];
  const seenUrls = new Set<string>();

  // Step 1: pin.photoIds
  if (pin.photoIds && pin.photoIds.length > 0) {
    const byId = new Map<string, Photo>();
    for (const p of allPhotos) byId.set(p.id, p);
    for (const id of pin.photoIds) {
      const photo = byId.get(id);
      if (photo && !seenUrls.has(photo.url)) {
        out.push(photo);
        seenUrls.add(photo.url);
      }
    }
  }

  // Step 2: photo.linkedPinIds inverse lookup
  for (const photo of allPhotos) {
    if (photo.linkedPinIds && photo.linkedPinIds.includes(pin.id) && !seenUrls.has(photo.url)) {
      out.push(photo);
      seenUrls.add(photo.url);
    }
  }

  // Step 3: legacy embedded fallback — only used when the new collection
  // didn't yield any matches for this pin (e.g. pre-migration seed pin
  // whose data hasn't been touched). We don't merge embedded with new-
  // collection photos because that would resurface stale duplicates after
  // /admin edits.
  if (out.length === 0 && pin.photos && pin.photos.length > 0) {
    for (const ep of pin.photos) {
      if (!seenUrls.has(ep.url)) {
        out.push(ep);
        seenUrls.add(ep.url);
      }
    }
  }

  return out;
}

/**
 * Collect every photo that is attached to at least one pin in the supplied
 * set, plus stamping in the owning pin's physicalArea when the photo
 * doesn't declare its own physicalLocationTag — same fallback the matcher's
 * legacy `collectAllPhotos` did.
 *
 * Used by the free-form Ask flow where the learner can ask about anything
 * across the church.
 */
export function collectAllPinPhotos(pins: Pin[], allPhotos: Photo[]): Array<Photo | PinPhoto> {
  const out: Array<Photo | PinPhoto> = [];
  const seenUrls = new Set<string>();

  for (const pin of pins) {
    const photos = getPhotosForPin(pin, allPhotos);
    for (const photo of photos) {
      if (seenUrls.has(photo.url)) continue;
      if (!photo.physicalLocationTag) {
        out.push({ ...photo, physicalLocationTag: pin.location.physicalArea });
      } else {
        out.push(photo);
      }
      seenUrls.add(photo.url);
    }
  }

  return out;
}
