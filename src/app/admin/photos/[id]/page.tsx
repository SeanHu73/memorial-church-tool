'use client';

/**
 * /admin/photos/[id] — edit a single Photo document.
 *
 * Shows the image alongside every editable piece of metadata:
 *   - caption, description (free-form, AI-facing), keywords
 *   - type + credit + source + year + license
 *   - physical location tag
 *   - structured databaseEntries + categories (carried over from PinPhoto)
 *   - linkedPinIds (multi-attach to pins)
 *   - notes (admin-only)
 *   - annotations (click-to-place dots with captions + per-category clues)
 *
 * On save: writes to memorial-church-photos and syncs the embedded copy
 * into each linked pin's `pin.photos` so the learner-facing app keeps
 * rendering the same photo with the latest metadata.
 */

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Photo, Pin, PhotoAnnotation, QuestionCategory } from '@/lib/types';
import { getPhoto, savePhoto, deletePhoto } from '@/lib/photos-store';
import { getPins } from '@/lib/pins-store';
import { syncPhotoToPins, unsyncPhotoFromPins } from '@/lib/photo-pin-sync';
import {
  generateDescription,
  generateKeywords,
  detectStorageBackend,
  ENTRY_TITLES,
} from '@/lib/photo-auto-metadata';

const CATEGORIES: QuestionCategory[] = ['who', 'what', 'when', 'where', 'why', 'how'];

const LOCATION_TAGS = [
  'exterior_facade', 'exterior_sides', 'exterior_rear',
  'narthex', 'nave', 'nave_aisles',
  'crossing', 'dome', 'chancel',
  'transepts', 'side_chapel', 'organ_loft',
  'general',
] as const;

export default function PhotoEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [photo, setPhoto] = useState<Photo | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Track the linkedPinIds as-loaded so we can compute which pins need
  // unlinking (not in the new set but were in the old set).
  const initialLinkedPinIdsRef = useRef<string[]>([]);

  useEffect(() => {
    (async () => {
      const [p, allPins] = await Promise.all([getPhoto(id), getPins()]);
      setPhoto(p);
      setPins(allPins);
      if (p) initialLinkedPinIdsRef.current = [...(p.linkedPinIds || [])];
      setLoading(false);
    })();
  }, [id]);

  const update = <K extends keyof Photo>(key: K, value: Photo[K]) => {
    setPhoto((cur) => (cur ? { ...cur, [key]: value } : cur));
  };

  const toggleArrayMember = <T,>(arr: T[], value: T): T[] =>
    arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];

  const regenerateAutoFields = () => {
    if (!photo) return;
    // Build a pseudo-PinPhoto from the current Photo state, plus the first
    // linked pin for context. The generator expects PinPhoto + Pin shape.
    const firstPin = pins.find((p) => photo.linkedPinIds.includes(p.id)) || null;
    const pseudo = {
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
    update('description', generateDescription(pseudo, firstPin));
    update('keywords', generateKeywords(pseudo, firstPin));
  };

  const save = async () => {
    if (!photo) return;
    setSaving(true);
    setError(null);
    try {
      // Normalise Windows path separators that may have crept into the URL
      // field — browsers can't resolve backslashes.
      const sanitised: Photo = {
        ...photo,
        url: photo.url.replace(/\\/g, '/'),
      };
      const next = await savePhoto(sanitised);
      await syncPhotoToPins(next, initialLinkedPinIdsRef.current);
      initialLinkedPinIdsRef.current = [...next.linkedPinIds];
      setPhoto(next);
      setStatus('Saved and synced to linked pins.');
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setSaving(false);
  };

  const remove = async () => {
    if (!photo) return;
    if (!confirm(
      `Delete this photo? It will be removed from the photo library AND from pin.photos on ${photo.linkedPinIds.length} linked pin(s). ` +
      `The underlying image file is not deleted.`
    )) return;
    setSaving(true);
    try {
      await unsyncPhotoFromPins(photo);
      await deletePhoto(photo.id);
      router.push('/admin/photos');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  };

  if (loading) {
    return <Shell><p className="text-stone-600 text-sm">Loading photo...</p></Shell>;
  }
  if (!photo) {
    return (
      <Shell>
        <p className="text-stone-600 text-sm italic">Photo not found. It may have been deleted.</p>
        <Link href="/admin/photos" className="text-blue-700 underline text-sm">← Back to library</Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex items-center justify-between mb-4">
        <Link href="/admin/photos" className="text-blue-700 hover:underline text-sm">← Back to library</Link>
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-1.5 rounded bg-blue-700 text-white text-sm hover:bg-blue-800 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
          <button
            onClick={remove}
            disabled={saving}
            className="px-3 py-1.5 rounded border border-red-300 text-red-700 text-sm hover:bg-red-50 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>

      {status && <div className="mb-4 p-3 rounded border border-green-300 bg-green-50 text-green-900 text-sm">{status}</div>}
      {error && <div className="mb-4 p-3 rounded border border-red-300 bg-red-50 text-red-900 text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column: image + annotations */}
        <div className="space-y-4">
          <AnnotationEditor
            photo={photo}
            onChange={(annotations) => update('annotations', annotations)}
          />
          <div className="text-xs text-stone-500 space-y-0.5">
            <div><span className="text-stone-700 font-medium">URL:</span> <span className="font-mono break-all">{photo.url}</span></div>
            <div><span className="text-stone-700 font-medium">Storage:</span> {photo.storageBackend} <button onClick={() => update('storageBackend', detectStorageBackend(photo.url))} className="ml-1 underline">redetect</button></div>
            <div><span className="text-stone-700 font-medium">Created:</span> {photo.createdAt}</div>
            <div><span className="text-stone-700 font-medium">Updated:</span> {photo.updatedAt}</div>
          </div>
        </div>

        {/* Right column: metadata */}
        <div className="space-y-4">
          <FieldText
            label="Caption"
            hint="Short line shown under the image in the learner UI."
            value={photo.caption}
            onChange={(v) => update('caption', v)}
          />
          <FieldTextarea
            label="Description"
            hint="2-4 sentence narrative of what's in the photo. Used for AI retrieval later."
            rows={4}
            value={photo.description}
            onChange={(v) => update('description', v)}
          />
          <div className="flex items-center gap-2 -mt-2">
            <button
              onClick={regenerateAutoFields}
              className="text-xs text-blue-700 hover:underline"
              type="button"
            >
              ↻ Regenerate description + keywords from metadata
            </button>
          </div>
          <FieldKeywords
            value={photo.keywords}
            onChange={(v) => update('keywords', v)}
          />

          <FieldSelect
            label="Type"
            value={photo.type}
            onChange={(v) => update('type', v as Photo['type'])}
            options={['onsite', 'archival', 'contributor']}
          />
          <div className="grid grid-cols-2 gap-3">
            <FieldText label="Credit" value={photo.credit} onChange={(v) => update('credit', v)} />
            <FieldText label="Year" value={photo.year || ''} onChange={(v) => update('year', v || null)} />
          </div>
          <FieldText label="Source URL" value={photo.source || ''} onChange={(v) => update('source', v || null)} placeholder="https://..." />
          <FieldText label="License" value={photo.license || ''} onChange={(v) => update('license', v || null)} />

          <FieldSelect
            label="Physical location tag"
            value={photo.physicalLocationTag}
            onChange={(v) => update('physicalLocationTag', v)}
            options={[...LOCATION_TAGS]}
          />

          <FieldDatabaseEntries
            value={photo.databaseEntries}
            onChange={(v) => update('databaseEntries', v)}
          />

          <div>
            <label className="block text-xs font-medium mb-1">Inquiry categories</label>
            <div className="flex flex-wrap gap-3">
              {CATEGORIES.map((cat) => (
                <label key={cat} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={photo.categories.includes(cat)}
                    onChange={() => update('categories', toggleArrayMember(photo.categories, cat))}
                  />
                  {cat}
                </label>
              ))}
            </div>
          </div>

          <LinkedPins
            allPins={pins}
            linkedPinIds={photo.linkedPinIds}
            onChange={(v) => update('linkedPinIds', v)}
          />

          <FieldTextarea
            label="Admin notes (optional)"
            hint="Not shown to learners. Reminders, TODOs, context."
            rows={2}
            value={photo.notes || ''}
            onChange={(v) => update('notes', v || null)}
          />
        </div>
      </div>
    </Shell>
  );
}

// ══════════════════════════════════════════════════════════
// Page shell
// ══════════════════════════════════════════════════════════

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6 border-b border-stone-300 pb-3">
          <h1 className="text-2xl font-bold">Edit photo</h1>
          <p className="text-sm text-stone-600 mt-1">
            Writes to <code className="bg-stone-200 px-1 rounded">memorial-church-photos</code> and keeps
            linked pins&apos; embedded <code>photos</code> arrays in sync.
          </p>
        </header>
        {children}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// Field components — small, local, no external deps
// ══════════════════════════════════════════════════════════

function FieldText({
  label, value, onChange, hint, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1">{label}</label>
      {hint && <p className="text-[11px] text-stone-500 mb-1">{hint}</p>}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm"
      />
    </div>
  );
}

function FieldTextarea({
  label, value, onChange, rows = 3, hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1">{label}</label>
      {hint && <p className="text-[11px] text-stone-500 mb-1">{hint}</p>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm"
      />
    </div>
  );
}

function FieldSelect({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function FieldKeywords({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  // Key the inner input by the external value so a fresh instance mounts
  // whenever `value` changes (e.g., regenerate button). Avoids the
  // setState-in-effect sync pattern while preserving the edit buffer.
  return (
    <div>
      <label className="block text-xs font-medium mb-1">Keywords</label>
      <p className="text-[11px] text-stone-500 mb-1">Comma-separated, lowercase. Used for cheap keyword recall before the AI scores descriptions.</p>
      <KeywordBuffer key={value.join(',')} initial={value.join(', ')} onCommit={onChange} />
    </div>
  );
}

function KeywordBuffer({ initial, onCommit }: { initial: string; onCommit: (v: string[]) => void }) {
  const [raw, setRaw] = useState(initial);
  return (
    <textarea
      value={raw}
      onChange={(e) => setRaw(e.target.value)}
      onBlur={() => {
        const tokens = raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
        onCommit(Array.from(new Set(tokens)));
      }}
      rows={2}
      className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm font-mono"
    />
  );
}

function EntryIdBuffer({ initial, onCommit }: { initial: string; onCommit: (raw: string) => void }) {
  const [raw, setRaw] = useState(initial);
  return (
    <input
      value={raw}
      onChange={(e) => setRaw(e.target.value)}
      onBlur={() => onCommit(raw)}
      className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm font-mono"
    />
  );
}

function FieldDatabaseEntries({
  value, onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const commit = (raw: string) => {
    const ids = raw.split(',').map((s) => s.trim()).filter(Boolean);
    onChange(Array.from(new Set(ids)));
  };

  return (
    <div>
      <label className="block text-xs font-medium mb-1">Knowledge entries</label>
      <p className="text-[11px] text-stone-500 mb-1">Comma-separated IDs (e.g. 3.1, 6.1).</p>
      <EntryIdBuffer key={value.join(',')} initial={value.join(', ')} onCommit={commit} />
      <details className="mt-1">
        <summary className="text-[11px] text-stone-500 cursor-pointer">Known entry IDs</summary>
        <ul className="text-[11px] text-stone-600 mt-1 space-y-0.5 max-h-40 overflow-y-auto border border-stone-200 rounded p-2 bg-stone-50">
          {Object.entries(ENTRY_TITLES).map(([id, title]) => (
            <li key={id}><code>{id}</code> — {title}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function LinkedPins({
  allPins, linkedPinIds, onChange,
}: {
  allPins: Pin[];
  linkedPinIds: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1">Linked pins</label>
      <p className="text-[11px] text-stone-500 mb-1">
        Pins that should show this photo. Toggle to attach/detach — pin.photos is synced on save.
      </p>
      <div className="border border-stone-200 rounded p-2 bg-stone-50 max-h-40 overflow-y-auto space-y-1">
        {allPins.length === 0 ? (
          <p className="text-xs text-stone-500 italic">No pins loaded.</p>
        ) : allPins.map((pin) => (
          <label key={pin.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={linkedPinIds.includes(pin.id)}
              onChange={() =>
                onChange(
                  linkedPinIds.includes(pin.id)
                    ? linkedPinIds.filter((id) => id !== pin.id)
                    : [...linkedPinIds, pin.id]
                )
              }
            />
            <span className="flex-1">{pin.title}</span>
            <span className="text-[10px] text-stone-500 font-mono">{pin.id}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// Annotation editor — compact version of the /admin page one.
// Tap on the image to add a numbered dot; click the dot to edit.
// ══════════════════════════════════════════════════════════

function AnnotationEditor({
  photo, onChange,
}: {
  photo: Photo;
  onChange: (annotations: PhotoAnnotation[]) => void;
}) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const annotations = photo.annotations;

  const handleClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const next: PhotoAnnotation[] = [
      ...annotations,
      { x, y, caption: '', categories: [], clues: {} },
    ];
    onChange(next);
    setEditingIdx(next.length - 1);
  };

  const updateAt = (idx: number, patch: Partial<PhotoAnnotation>) => {
    onChange(annotations.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  };

  const removeAt = (idx: number) => {
    onChange(annotations.filter((_, i) => i !== idx));
    setEditingIdx(null);
  };

  const editing = editingIdx !== null ? annotations[editingIdx] : null;

  const toggleCategory = (cat: QuestionCategory) => {
    if (editingIdx === null || !editing) return;
    const next = editing.categories.includes(cat)
      ? editing.categories.filter((c) => c !== cat)
      : [...editing.categories, cat];
    const nextClues = { ...editing.clues };
    if (!next.includes(cat)) delete nextClues[cat];
    updateAt(editingIdx, { categories: next, clues: nextClues });
  };

  return (
    <div>
      <div className="relative inline-block border border-stone-300 rounded overflow-hidden bg-stone-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={photo.url}
          alt={photo.caption}
          onClick={handleClick}
          className="max-h-[500px] max-w-full cursor-crosshair block"
        />
        {annotations.map((a, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); setEditingIdx(i); }}
            className={`absolute w-5 h-5 rounded-full border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 ${editingIdx === i ? 'bg-red-500' : 'bg-blue-600'}`}
            style={{ left: `${a.x}%`, top: `${a.y}%` }}
          >
            <span className="text-white text-[10px] font-bold">{i + 1}</span>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-stone-500 mt-1">
        Click the image to add a dot. Click a dot to edit it.
      </p>

      {editing && editingIdx !== null && (
        <div className="mt-3 border border-blue-300 bg-blue-50 rounded p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">Annotation #{editingIdx + 1}</span>
            <div className="flex gap-2 text-xs">
              <button onClick={() => removeAt(editingIdx)} className="text-red-700 hover:underline">Delete</button>
              <button onClick={() => setEditingIdx(null)} className="text-stone-700 hover:underline">Close</button>
            </div>
          </div>
          <textarea
            value={editing.caption}
            onChange={(e) => updateAt(editingIdx, { caption: e.target.value })}
            rows={2}
            placeholder="Caption — what the learner would see."
            className="w-full px-2 py-1.5 border border-stone-300 rounded text-xs"
          />
          <div>
            <div className="text-[11px] font-medium mb-1">Categories</div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <label key={cat} className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={editing.categories.includes(cat)}
                    onChange={() => toggleCategory(cat)}
                  />
                  {cat}
                </label>
              ))}
            </div>
          </div>
          {editing.categories.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-medium">Per-category clues</div>
              {editing.categories.map((cat) => (
                <div key={cat}>
                  <label className="block text-[10px] text-stone-600 capitalize">{cat}</label>
                  <textarea
                    value={editing.clues[cat] || ''}
                    onChange={(e) => updateAt(editingIdx, { clues: { ...editing.clues, [cat]: e.target.value } })}
                    rows={2}
                    className="w-full px-2 py-1.5 border border-stone-300 rounded text-xs"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {annotations.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs">
          {annotations.map((a, i) => (
            <li key={i} className="flex items-center gap-2">
              <button
                onClick={() => setEditingIdx(i)}
                className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center hover:bg-blue-700"
              >
                {i + 1}
              </button>
              <span className="flex-1 truncate">{a.caption || <em className="text-stone-400">(no caption)</em>}</span>
              <span className="text-stone-500 text-[10px]">{a.categories.join(', ')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Compatibility with photo-auto-metadata types — converts Photo state into
 * the PinPhoto shape the generator expects.
 */
// (inlined in regenerateAutoFields to avoid an extra module)
