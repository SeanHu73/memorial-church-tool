/**
 * Sync a standalone Photo record back into the embedded `pin.photos`
 * arrays so the learner-facing app (which still reads pin.photos) reflects
 * the latest edits.
 *
 * Contract:
 *   - For every pin in `photo.linkedPinIds`, ensure pin.photos contains an
 *     entry with matching url. If present, replace it with the latest
 *     metadata (caption/credit/annotations/etc). If absent, append.
 *   - For every pin in `previousLinkedPinIds` that's NOT in
 *     linkedPinIds, remove the embed with matching url from that pin.
 *   - pin.photoIds is also updated: the photo's id is added to each
 *     linked pin and removed from each unlinked pin.
 *
 * We identify embedded photos by URL (post-migration, URLs are unique
 * per Photo). Before the migration runs, pin.photos may contain multiple
 * entries with the same URL — in that rare case we only touch the first
 * match, which matches the migration's dedupe behavior.
 *
 * This helper does N+1 Firestore reads/writes (one per affected pin). Fine
 * for Sean's single-user admin workflow; a bulk editor later could batch.
 */

import { Pin, Photo, PinPhoto } from './types';
import { getPins, savePin } from './pins-store';

/**
 * Project a Photo record down to the legacy PinPhoto shape for embedding
 * in pin.photos. Drops Photo-only fields (id, description, keywords,
 * linkedPinIds, storageBackend, notes, timestamps) that the learner app
 * doesn't need.
 */
function toEmbedded(photo: Photo): PinPhoto {
  return {
    url: photo.url,
    type: photo.type,
    caption: photo.caption,
    credit: photo.credit,
    source: photo.source,
    year: photo.year,
    license: photo.license,
    physicalLocationTag: photo.physicalLocationTag,
    databaseEntries: photo.databaseEntries,
    categories: photo.categories,
    annotations: photo.annotations,
  };
}

export async function syncPhotoToPins(
  photo: Photo,
  previousLinkedPinIds: string[] = []
): Promise<{ pinsUpdated: number }> {
  const currentIds = new Set(photo.linkedPinIds || []);
  const prevIds = new Set(previousLinkedPinIds);

  // Set of pins that need updating: linked (to add/update) OR previously
  // linked (to remove). A pin that stayed linked is still in currentIds.
  const toCheck = new Set<string>([...currentIds, ...prevIds]);

  if (toCheck.size === 0) return { pinsUpdated: 0 };

  const allPins = await getPins();
  const byId = new Map<string, Pin>();
  for (const p of allPins) byId.set(p.id, p);

  let updated = 0;
  for (const pinId of toCheck) {
    const pin = byId.get(pinId);
    if (!pin) continue;

    const photos = [...(pin.photos || [])];
    const photoIds = new Set<string>(pin.photoIds || []);
    const idx = photos.findIndex((p) => p.url === photo.url);

    if (currentIds.has(pinId)) {
      // Pin should have this photo. Replace or append.
      if (idx >= 0) photos[idx] = toEmbedded(photo);
      else photos.push(toEmbedded(photo));
      photoIds.add(photo.id);
    } else {
      // Pin was linked before, now unlinked — strip it out.
      if (idx >= 0) photos.splice(idx, 1);
      photoIds.delete(photo.id);
    }

    const next: Pin = { ...pin, photos, photoIds: Array.from(photoIds) };
    await savePin(next);
    updated += 1;
  }

  return { pinsUpdated: updated };
}

/**
 * Delete a photo and remove its embedded copy from every linked pin.
 * Used by the "Delete photo" button in /admin/photos/[id]. Needs the
 * photo object itself (not just the id) so we can locate embeds by URL.
 */
export async function unsyncPhotoFromPins(photo: Photo): Promise<void> {
  await syncPhotoToPins({ ...photo, linkedPinIds: [] }, photo.linkedPinIds || []);
}
