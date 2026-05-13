/**
 * Syncs photos uploaded through the tour editor into the
 * memorial-church-photos library so they appear in /admin/photos
 * and can have metadata edited there.
 *
 * Dedupes by URL — if a photo with the same URL already exists
 * in the library, it's skipped.
 */

import { getPhotos, savePhoto, newPhotoId } from './photos-store';
import type { Photo } from './types';

/**
 * Register a URL in the photo library if it's not already there.
 * Fire-and-forget — errors are logged but don't block the caller.
 */
export async function registerPhotoInLibrary(
  url: string,
  opts?: {
    caption?: string;
    source?: 'tour-seed' | 'tour-notice' | 'tour-wonder' | 'tour-reveal' | 'tour-bridge' | 'tour-reflect' | 'tour-detour';
    tourTitle?: string;
    stopTitle?: string;
  }
): Promise<void> {
  try {
    if (!url || url.startsWith('/photos/')) return; // skip local static files — they're already managed

    const existing = await getPhotos();
    if (existing.some((p) => p.url === url)) return; // already in library

    const now = new Date().toISOString();
    const photo: Photo = {
      id: newPhotoId(),
      url,
      storageBackend: url.includes('firebasestorage') ? 'firebase-storage' : 'unknown',
      type: 'onsite',
      caption: opts?.caption || '',
      description: `Uploaded via tour editor${opts?.tourTitle ? ` for "${opts.tourTitle}"` : ''}${opts?.stopTitle ? ` at stop "${opts.stopTitle}"` : ''}.`,
      keywords: [opts?.source || 'tour'].filter(Boolean),
      credit: '',
      source: null,
      year: null,
      license: null,
      physicalLocationTag: 'general',
      databaseEntries: [],
      categories: [],
      annotations: [],
      linkedPinIds: [],
      notes: opts?.source || null,
      createdAt: now,
      updatedAt: now,
    };

    await savePhoto(photo);
  } catch (err) {
    console.error('[photo-sync-tour] Failed to register photo:', err);
  }
}
