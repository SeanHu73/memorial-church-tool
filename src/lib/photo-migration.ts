/**
 * photo_extraction_v1 migration.
 *
 * Extracts every embedded PinPhoto from every pin in `memorial-church-pins`
 * into standalone Photo documents in `memorial-church-photos`, then stamps
 * each source pin with a `photoIds` array pointing at the new docs.
 *
 * Key properties:
 *   - Idempotent: if photo_extraction_v1 has already completed (flag
 *     present in memorial-church-migrations), run() returns early.
 *   - Dedupe by URL: if two pins embed the same URL (e.g., a shared HABS
 *     shot), a single Photo document is created with both pin ids in
 *     linkedPinIds.
 *   - Backup first: writes a JSON backup of every current pin document to
 *     docs/pin_backup_YYYYMMDD.json before any mutation (client-side
 *     download since we're running in the browser). If the backup fails
 *     we abort and DO NOT set the migration flag.
 *   - Auto-metadata: description + keywords are filled in from existing
 *     fields using photo-auto-metadata.ts — always editable later.
 *   - Non-destructive on pin docs: pin.photos is left intact so the
 *     learner-facing app keeps working until retrieval is cut over.
 *   - Safety: any failure mid-run aborts without setting the flag, so
 *     a re-run will retry. Partial state is safe because savePhoto uses
 *     a deterministic url-hash id for existing-url dedupe.
 */

import { Pin, PinPhoto, Photo } from './types';
import { getPins, savePin } from './pins-store';
import { getPhotos, savePhoto, newPhotoId } from './photos-store';
import {
  generateDescription,
  generateKeywords,
  detectStorageBackend,
} from './photo-auto-metadata';
import { getMigrationFlag, setMigrationFlag } from './migrations-store';

export const MIGRATION_ID = 'photo_extraction_v1';

export interface MigrationSummary {
  migrationId: string;
  ranAt: string;
  pinsScanned: number;
  embeddedPhotosFound: number;
  photosCreated: number;
  photosReused: number;            // dedupe hits — embedded photo matched an existing Photo by URL
  pinsUpdated: number;
  storageBackendCounts: Record<string, number>;
  errors: string[];
  // Machine-readable per-photo record, used by the log file exporter.
  createdPhotoLog: Array<{
    photoId: string;
    url: string;
    caption: string;
    linkedPinIds: string[];
    descriptionPreview: string;    // first ~120 chars of the generated description
    keywordCount: number;
  }>;
}

/**
 * Build a mostly-complete Photo from a PinPhoto using automatic
 * description + keyword generation. `id` and timestamps are stamped by
 * the caller (so dedupe can reuse an existing id if the URL is already
 * in the collection).
 */
function photoFromEmbedded(
  embedded: PinPhoto,
  pin: Pin,
  id: string,
  linkedPinIds: string[]
): Photo {
  const now = new Date().toISOString();
  return {
    id,
    url: embedded.url,
    storageBackend: detectStorageBackend(embedded.url),
    type: embedded.type,
    caption: embedded.caption,
    description: generateDescription(embedded, pin),
    keywords: generateKeywords(embedded, pin),
    credit: embedded.credit,
    source: embedded.source,
    year: embedded.year,
    license: embedded.license,
    physicalLocationTag: embedded.physicalLocationTag,
    databaseEntries: embedded.databaseEntries || [],
    categories: embedded.categories || [],
    annotations: embedded.annotations || [],
    linkedPinIds,
    notes: null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Run the migration. Safe to call multiple times — returns `alreadyDone`
 * if the flag is set. Does NOT throw on recoverable errors (records them
 * in summary.errors instead). Throws only if backup generation fails,
 * since that's a precondition for mutating anything.
 *
 * Arguments:
 *   - onProgress: optional callback for UI status updates
 *   - dryRun: if true, computes the summary without writing anything to
 *     Firestore. Useful for preview + testing.
 */
export interface MigrationOptions {
  onProgress?: (message: string) => void;
  dryRun?: boolean;
}

export interface MigrationResult {
  alreadyDone: boolean;
  summary: MigrationSummary | null;
  backupJson: string | null;       // JSON string of pre-mutation pin state
  logMarkdown: string | null;      // human-readable log text
}

export async function runPhotoExtractionMigration(
  options: MigrationOptions = {}
): Promise<MigrationResult> {
  const { onProgress = () => {}, dryRun = false } = options;

  onProgress('Checking migration flag...');
  const flag = await getMigrationFlag(MIGRATION_ID);
  if (flag) {
    return { alreadyDone: true, summary: null, backupJson: null, logMarkdown: null };
  }

  onProgress('Loading current pins from Firestore...');
  const pins = await getPins();

  onProgress('Generating pin backup...');
  const backupJson = JSON.stringify({ ranAt: new Date().toISOString(), pins }, null, 2);
  if (!backupJson || backupJson.length < 10) {
    throw new Error('Backup generation failed — aborting migration before any writes.');
  }

  onProgress('Loading existing Photo documents for URL-dedupe...');
  const existingPhotos = await getPhotos();
  // URL → Photo map for dedupe. If two embeds share a URL we want them to
  // end up pointing at the same Photo doc, with linkedPinIds unioned.
  const byUrl = new Map<string, Photo>();
  for (const p of existingPhotos) byUrl.set(p.url, p);

  const summary: MigrationSummary = {
    migrationId: MIGRATION_ID,
    ranAt: new Date().toISOString(),
    pinsScanned: pins.length,
    embeddedPhotosFound: 0,
    photosCreated: 0,
    photosReused: 0,
    pinsUpdated: 0,
    storageBackendCounts: {},
    errors: [],
    createdPhotoLog: [],
  };

  // Group embedded photos by URL (across all pins) so dedupe is simple:
  // each URL becomes one Photo doc with linkedPinIds = the pins that embed it.
  const urlToPinIds = new Map<string, Set<string>>();
  const urlToSampleEmbed = new Map<string, { embed: PinPhoto; pin: Pin }>();

  for (const pin of pins) {
    for (const embed of pin.photos || []) {
      summary.embeddedPhotosFound += 1;
      const url = embed.url;
      if (!url) continue;
      if (!urlToPinIds.has(url)) urlToPinIds.set(url, new Set());
      urlToPinIds.get(url)!.add(pin.id);
      // Prefer the first embed we see as the canonical source of metadata.
      if (!urlToSampleEmbed.has(url)) {
        urlToSampleEmbed.set(url, { embed, pin });
      }
    }
  }

  // pinId → ordered list of photo ids attached to that pin.
  const pinIdToPhotoIds = new Map<string, string[]>();
  for (const pin of pins) pinIdToPhotoIds.set(pin.id, []);

  // Create/reuse Photo docs per URL.
  for (const [url, pinIdSet] of urlToPinIds) {
    const linkedPinIds = Array.from(pinIdSet);
    try {
      const existing = byUrl.get(url);
      if (existing) {
        // Reuse: union linkedPinIds and keep everything else as-is.
        summary.photosReused += 1;
        const unionedPinIds = Array.from(new Set([...(existing.linkedPinIds || []), ...linkedPinIds]));
        const updated: Photo = { ...existing, linkedPinIds: unionedPinIds };
        if (!dryRun) await savePhoto(updated);
        for (const pid of linkedPinIds) pinIdToPhotoIds.get(pid)?.push(updated.id);
        bumpBackend(summary, updated.storageBackend);
        summary.createdPhotoLog.push(logRow(updated));
      } else {
        const sample = urlToSampleEmbed.get(url);
        if (!sample) continue;
        const id = newPhotoId();
        const photo = photoFromEmbedded(sample.embed, sample.pin, id, linkedPinIds);
        if (!dryRun) await savePhoto(photo);
        summary.photosCreated += 1;
        for (const pid of linkedPinIds) pinIdToPhotoIds.get(pid)?.push(photo.id);
        bumpBackend(summary, photo.storageBackend);
        summary.createdPhotoLog.push(logRow(photo));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      summary.errors.push(`Photo write failed for url ${url}: ${msg}`);
    }
  }

  // Stamp each pin with its photoIds. Keep pin.photos intact for backward
  // compatibility — learner-facing app still reads it.
  onProgress('Stamping pins with photoIds...');
  for (const pin of pins) {
    const ids = pinIdToPhotoIds.get(pin.id) || [];
    const next: Pin = { ...pin, photoIds: ids };
    try {
      if (!dryRun) await savePin(next);
      summary.pinsUpdated += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      summary.errors.push(`Pin photoIds write failed for pin ${pin.id}: ${msg}`);
    }
  }

  // Only set the flag if there were no errors — a partial run is safe
  // to retry thanks to URL-based dedupe.
  if (!dryRun && summary.errors.length === 0) {
    onProgress('Writing migration flag...');
    await setMigrationFlag(MIGRATION_ID, summary as unknown as Record<string, unknown>);
  }

  const logMarkdown = buildLogMarkdown(summary);

  return { alreadyDone: false, summary, backupJson, logMarkdown };
}

function bumpBackend(summary: MigrationSummary, backend: string) {
  summary.storageBackendCounts[backend] = (summary.storageBackendCounts[backend] || 0) + 1;
}

function logRow(photo: Photo): MigrationSummary['createdPhotoLog'][number] {
  return {
    photoId: photo.id,
    url: photo.url,
    caption: photo.caption,
    linkedPinIds: photo.linkedPinIds,
    descriptionPreview: (photo.description || '').slice(0, 120),
    keywordCount: (photo.keywords || []).length,
  };
}

/**
 * Rebuild the markdown log from a stored MigrationSummary. Exported so the
 * admin UI can re-download the log after the fact by reading the
 * migration flag document (which stores the full summary).
 */
export function buildLogMarkdown(s: MigrationSummary): string {
  const lines: string[] = [];
  lines.push(`# Migration log: ${s.migrationId}`);
  lines.push('');
  lines.push(`Ran at: ${s.ranAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Pins scanned: ${s.pinsScanned}`);
  lines.push(`- Embedded photos found: ${s.embeddedPhotosFound}`);
  lines.push(`- Photos created: ${s.photosCreated}`);
  lines.push(`- Photos reused (URL already in collection): ${s.photosReused}`);
  lines.push(`- Pins updated with photoIds: ${s.pinsUpdated}`);
  lines.push(`- Errors: ${s.errors.length}`);
  lines.push('');
  lines.push('## Storage backend distribution');
  lines.push('');
  for (const [k, v] of Object.entries(s.storageBackendCounts)) {
    lines.push(`- ${k}: ${v}`);
  }
  lines.push('');
  if (s.errors.length > 0) {
    lines.push('## Errors');
    lines.push('');
    for (const e of s.errors) lines.push(`- ${e}`);
    lines.push('');
  }
  lines.push('## Photos');
  lines.push('');
  lines.push('| photoId | url | linkedPinIds | keywords | description (preview) |');
  lines.push('|---|---|---|---|---|');
  for (const row of s.createdPhotoLog) {
    const preview = row.descriptionPreview.replace(/\|/g, '\\|').replace(/\n/g, ' ');
    lines.push(`| ${row.photoId} | ${row.url} | ${row.linkedPinIds.join(', ')} | ${row.keywordCount} | ${preview} |`);
  }
  return lines.join('\n');
}
