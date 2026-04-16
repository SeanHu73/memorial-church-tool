'use client';

/**
 * /admin/photos — photo-centric library view.
 *
 * Replaces the pin-by-pin walk of /admin. Sean sees every photo in one
 * grid, can search by keyword or caption, and filters by type, storage
 * backend, or linked pin. The migration banner at the top runs the
 * photo_extraction_v1 pass (see src/lib/photo-migration.ts) on first visit
 * to populate the memorial-church-photos collection from the existing
 * embedded pin.photos arrays.
 *
 * This is a builder-only tool. No auth, no polish, no mobile-first UI.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Photo } from '@/lib/types';
import { getPhotos } from '@/lib/photos-store';
import { getPins } from '@/lib/pins-store';
import { getMigrationFlag } from '@/lib/migrations-store';
import {
  MIGRATION_ID,
  runPhotoExtractionMigration,
  MigrationSummary,
} from '@/lib/photo-migration';

export default function PhotosLibraryPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [pinsById, setPinsById] = useState<Record<string, string>>({});  // id → title
  const [loading, setLoading] = useState(true);
  const [migrationDone, setMigrationDone] = useState<boolean | null>(null);

  // Filter state
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'onsite' | 'archival' | 'contributor'>('all');
  const [pinFilter, setPinFilter] = useState<'all' | 'unattached' | string>('all');

  // Migration UI state
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [result, setResult] = useState<MigrationSummary | null>(null);
  const [lastBackupJson, setLastBackupJson] = useState<string | null>(null);
  const [lastLogMarkdown, setLastLogMarkdown] = useState<string | null>(null);
  const [migrationError, setMigrationError] = useState<string | null>(null);

  const refresh = async () => {
    const [ps, pins, flag] = await Promise.all([
      getPhotos(),
      getPins(),
      getMigrationFlag(MIGRATION_ID),
    ]);
    setPhotos(ps);
    setPinsById(Object.fromEntries(pins.map((p) => [p.id, p.title])));
    setMigrationDone(!!flag);
    setLoading(false);
  };

  // Kick off initial fetch in an effect. refresh() is async — the
  // setState calls happen after awaiting network, not synchronously in
  // the effect body. The set-state-in-effect lint rule can't see through
  // the indirection, so it's disabled for this one line.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, []);

  const runMigration = async () => {
    if (running) return;
    if (!confirm(
      'Run photo_extraction_v1 migration?\n\n' +
      'This will:\n' +
      '  • Back up the current pins (downloaded as JSON)\n' +
      '  • Create one Photo doc per unique embedded photo URL\n' +
      '  • Stamp each pin with photoIds pointing at the new docs\n' +
      '  • Leave pin.photos untouched for backward compatibility\n\n' +
      'Safe to re-run (idempotent — URL dedupe).'
    )) return;

    setRunning(true);
    setProgress([]);
    setResult(null);
    setMigrationError(null);

    try {
      const res = await runPhotoExtractionMigration({
        onProgress: (msg) => setProgress((p) => [...p, msg]),
      });
      if (res.alreadyDone) {
        setMigrationError('Migration flag already present — no action taken.');
      } else {
        setResult(res.summary);
        setLastBackupJson(res.backupJson);
        setLastLogMarkdown(res.logMarkdown);
      }
      await refresh();
    } catch (err) {
      setMigrationError(err instanceof Error ? err.message : String(err));
    }
    setRunning(false);
  };

  /** Trigger a browser download of a text blob. */
  const downloadText = (filename: string, text: string, mime = 'text/plain') => {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredPhotos = useMemo(() => {
    const q = query.trim().toLowerCase();
    return photos.filter((p) => {
      if (typeFilter !== 'all' && p.type !== typeFilter) return false;
      if (pinFilter === 'unattached' && (p.linkedPinIds || []).length > 0) return false;
      if (pinFilter !== 'all' && pinFilter !== 'unattached' && !(p.linkedPinIds || []).includes(pinFilter)) return false;
      if (q) {
        const haystack = [
          p.caption,
          p.description,
          p.credit,
          p.url,
          ...(p.keywords || []),
          ...(p.databaseEntries || []),
        ].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [photos, query, typeFilter, pinFilter]);

  const pinOptions = Object.entries(pinsById);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6 border-b border-stone-300 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Photo library</h1>
              <p className="text-sm text-stone-600 mt-1">
                Every photo in <code className="bg-stone-200 px-1 rounded">memorial-church-photos</code>,
                searchable by caption, keyword, or linked pin.
              </p>
            </div>
            <div className="flex gap-3 text-sm">
              <Link href="/admin/photos/new" className="px-3 py-1.5 rounded bg-blue-700 text-white hover:bg-blue-800">
                + Add photo
              </Link>
              <Link href="/admin" className="text-blue-700 hover:underline self-center">← Admin</Link>
              <Link href="/" className="text-blue-700 hover:underline self-center">Main app</Link>
            </div>
          </div>
        </header>

        {/* Migration banner — only visible if photo_extraction_v1 hasn't run yet. */}
        {migrationDone === false && (
          <div className="mb-5 p-4 rounded border border-amber-400 bg-amber-50">
            <h2 className="font-semibold text-amber-900">Run initial photo extraction</h2>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              The <code>memorial-church-photos</code> collection is empty (or this migration hasn&apos;t been flagged).
              Running <code>photo_extraction_v1</code> copies every embedded <code>pin.photos</code> entry into
              its own Photo document, deduped by URL, with auto-generated descriptions and keywords. Existing
              pin documents are backed up first. Learner-facing photo display continues to work afterward.
            </p>
            <div className="mt-3 flex gap-2 items-center">
              <button
                onClick={runMigration}
                disabled={running}
                className="px-3 py-1.5 rounded bg-amber-700 text-white text-sm hover:bg-amber-800 disabled:opacity-50"
              >
                {running ? 'Running...' : 'Run migration'}
              </button>
              {progress.length > 0 && (
                <span className="text-xs text-amber-800 italic">{progress[progress.length - 1]}</span>
              )}
            </div>
            {migrationError && (
              <p className="mt-2 text-xs text-red-700 font-mono bg-red-50 p-2 rounded border border-red-200">
                {migrationError}
              </p>
            )}
            {result && (
              <div className="mt-3 text-xs text-amber-900 bg-amber-100 p-3 rounded space-y-2">
                <div>
                  ✓ Migration complete.
                  {' '}Created <strong>{result.photosCreated}</strong> photo(s),
                  {' '}reused <strong>{result.photosReused}</strong>,
                  {' '}updated <strong>{result.pinsUpdated}</strong> pin(s).
                  {' '}Errors: {result.errors.length}.
                </div>
                <div className="flex gap-2">
                  {lastBackupJson && (
                    <button
                      onClick={() => downloadText(`pin_backup_${todayStamp()}.json`, lastBackupJson, 'application/json')}
                      className="px-2 py-1 rounded bg-amber-700 text-white hover:bg-amber-800"
                    >
                      Download pin backup
                    </button>
                  )}
                  {lastLogMarkdown && (
                    <button
                      onClick={() => downloadText(`migration_log_${MIGRATION_ID}.md`, lastLogMarkdown, 'text/markdown')}
                      className="px-2 py-1 rounded bg-amber-700 text-white hover:bg-amber-800"
                    >
                      Download migration log
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-3 items-center">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search captions, keywords, entries..."
            className="flex-1 min-w-[220px] px-3 py-1.5 border border-stone-300 rounded text-sm"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            className="px-2 py-1.5 border border-stone-300 rounded text-sm"
          >
            <option value="all">All types</option>
            <option value="onsite">onsite</option>
            <option value="archival">archival</option>
            <option value="contributor">contributor</option>
          </select>
          <select
            value={pinFilter}
            onChange={(e) => setPinFilter(e.target.value)}
            className="px-2 py-1.5 border border-stone-300 rounded text-sm"
          >
            <option value="all">All pins</option>
            <option value="unattached">Unattached</option>
            {pinOptions.map(([id, title]) => (
              <option key={id} value={id}>{title}</option>
            ))}
          </select>
          <span className="text-xs text-stone-500">
            {filteredPhotos.length} of {photos.length}
          </span>
        </div>

        {loading ? (
          <p className="text-stone-600 text-sm">Loading photos...</p>
        ) : photos.length === 0 ? (
          <p className="text-stone-600 text-sm italic">
            No photos yet. Run the migration above, or <Link href="/admin/photos/new" className="text-blue-700 underline">add one</Link>.
          </p>
        ) : filteredPhotos.length === 0 ? (
          <p className="text-stone-600 text-sm italic">No photos match the current filters.</p>
        ) : (
          <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredPhotos.map((photo) => (
              <li key={photo.id}>
                <Link
                  href={`/admin/photos/${photo.id}`}
                  className="block border border-stone-300 rounded bg-white hover:border-blue-500 transition overflow-hidden"
                >
                  <div className="aspect-square bg-stone-100 border-b border-stone-200 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.caption || 'photo'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-2">
                    <div className="flex items-center gap-1 mb-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase ${typeBadgeColor(photo.type)}`}>
                        {photo.type}
                      </span>
                      {photo.annotations && photo.annotations.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-200 font-mono">
                          {photo.annotations.length} ann
                        </span>
                      )}
                      {(photo.linkedPinIds || []).length === 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-mono">unattached</span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-stone-800 line-clamp-2">{photo.caption || <em className="text-stone-400">No caption</em>}</p>
                    {(photo.keywords || []).length > 0 && (
                      <p className="text-[10px] text-stone-500 mt-1 line-clamp-1">
                        {photo.keywords.slice(0, 6).join(' · ')}
                      </p>
                    )}
                    {(photo.linkedPinIds || []).length > 0 && (
                      <p className="text-[10px] text-stone-500 mt-1 line-clamp-1">
                        📌 {photo.linkedPinIds.map((id) => pinsById[id] || id).join(', ')}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function typeBadgeColor(type: string): string {
  switch (type) {
    case 'archival': return 'bg-amber-200 text-amber-900';
    case 'onsite': return 'bg-green-200 text-green-900';
    case 'contributor': return 'bg-blue-200 text-blue-900';
    default: return 'bg-stone-200 text-stone-700';
  }
}

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}
