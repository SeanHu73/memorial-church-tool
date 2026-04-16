'use client';

/**
 * /admin/photos/new — upload a new photo, fill required metadata, save.
 *
 * Two upload paths:
 *   1. File upload → Firebase Storage (bytes land at
 *      memorial-church/photos/<type>/<timestamp>_<name>); the resulting
 *      download URL becomes the Photo.url.
 *   2. Manual URL (for photos already in /public/photos/archival/ or any
 *      external CDN). Skips Storage entirely.
 *
 * After save, redirects to /admin/photos/[id] so Sean can add annotations
 * or fine-tune the auto-generated description / keywords.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Photo, Pin, QuestionCategory } from '@/lib/types';
import { savePhoto, newPhotoId } from '@/lib/photos-store';
import { syncPhotoToPins } from '@/lib/photo-pin-sync';
import { getPins } from '@/lib/pins-store';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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

export default function NewPhotoPage() {
  const router = useRouter();
  const [pins, setPins] = useState<Pin[]>([]);

  // Core fields
  const [type, setType] = useState<'onsite' | 'archival' | 'contributor'>('onsite');
  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [credit, setCredit] = useState('');
  const [source, setSource] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [license, setLicense] = useState("All rights reserved — creator's work");
  const [physicalLocationTag, setPhysicalLocationTag] = useState<string>('general');
  const [databaseEntries, setDatabaseEntries] = useState('');
  const [categories, setCategories] = useState<QuestionCategory[]>([]);
  const [linkedPinIds, setLinkedPinIds] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [keywords, setKeywords] = useState('');
  const [notes, setNotes] = useState('');

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    getPins().then(setPins).catch(() => setPins([]));
  }, []);

  // Default credit by type
  useEffect(() => {
    if (type === 'onsite' && !credit) {
      setCredit(`Sean Hu, ${new Date().toISOString().slice(0, 10)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const firstPin = useMemo(
    () => pins.find((p) => linkedPinIds.includes(p.id)) || null,
    [pins, linkedPinIds]
  );

  const fillAutoMetadata = () => {
    const entryList = databaseEntries.split(',').map((s) => s.trim()).filter(Boolean);
    const pseudo = {
      url,
      type,
      caption,
      credit,
      source: source || null,
      year: year || null,
      license: license || null,
      physicalLocationTag,
      databaseEntries: entryList,
      categories,
      annotations: [],
    };
    setDescription(generateDescription(pseudo, firstPin));
    setKeywords(generateKeywords(pseudo, firstPin).join(', '));
  };

  const uploadFile = async () => {
    if (!file) {
      setUploadError('Select a file first.');
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const safeName = file.name.replace(/[^a-z0-9.\-_]/gi, '_');
      const path = `memorial-church/photos/${type}/${Date.now()}_${safeName}`;
      const r = ref(storage, path);
      await uploadBytes(r, file);
      const downloadUrl = await getDownloadURL(r);
      setUrl(downloadUrl);
    } catch (err) {
      console.error(err);
      setUploadError('Upload failed. Check Firebase Storage rules and try again.');
    }
    setUploading(false);
  };

  const save = async () => {
    setSaveError(null);
    if (!url.trim()) {
      setSaveError('A photo URL is required — upload a file or paste a URL.');
      return;
    }
    if (!caption.trim()) {
      setSaveError('Caption is required.');
      return;
    }
    setSaving(true);
    try {
      const id = newPhotoId();
      const entryList = databaseEntries.split(',').map((s) => s.trim()).filter(Boolean);
      const keywordList = Array.from(new Set(keywords.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)));
      const now = new Date().toISOString();

      const photo: Photo = {
        id,
        url: url.trim(),
        storageBackend: detectStorageBackend(url.trim()),
        type,
        caption: caption.trim(),
        description: description.trim() || generateDescription({
          url, type, caption, credit,
          source: source || null, year: year || null, license: license || null,
          physicalLocationTag, databaseEntries: entryList, categories, annotations: [],
        }, firstPin),
        keywords: keywordList.length > 0 ? keywordList : generateKeywords({
          url, type, caption, credit,
          source: source || null, year: year || null, license: license || null,
          physicalLocationTag, databaseEntries: entryList, categories, annotations: [],
        }, firstPin),
        credit: credit.trim(),
        source: source.trim() || null,
        year: year.trim() || null,
        license: license.trim() || null,
        physicalLocationTag,
        databaseEntries: entryList,
        categories,
        annotations: [],
        linkedPinIds,
        notes: notes.trim() || null,
        createdAt: now,
        updatedAt: now,
      };

      const saved = await savePhoto(photo);
      await syncPhotoToPins(saved, []);
      router.push(`/admin/photos/${saved.id}`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  };

  const toggleCategory = (cat: QuestionCategory) => {
    setCategories((cs) => (cs.includes(cat) ? cs.filter((c) => c !== cat) : [...cs, cat]));
  };

  const toggleLinkedPin = (pinId: string) => {
    setLinkedPinIds((ids) => (ids.includes(pinId) ? ids.filter((id) => id !== pinId) : [...ids, pinId]));
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6 border-b border-stone-300 pb-3 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Add photo</h1>
            <p className="text-sm text-stone-600 mt-1">
              Creates a new document in <code className="bg-stone-200 px-1 rounded">memorial-church-photos</code>.
            </p>
          </div>
          <Link href="/admin/photos" className="text-blue-700 hover:underline text-sm">← Back to library</Link>
        </header>

        {saveError && <div className="mb-4 p-3 rounded border border-red-300 bg-red-50 text-red-900 text-sm">{saveError}</div>}

        <div className="space-y-6">
          {/* Step 1: URL (upload or paste) */}
          <section className="border border-stone-300 rounded bg-white p-4 space-y-3">
            <h2 className="font-semibold text-sm">1. Photo file or URL</h2>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium mb-1">Upload file (goes to Firebase Storage)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="text-sm"
                />
              </div>
              <button
                type="button"
                onClick={uploadFile}
                disabled={!file || uploading}
                className="px-3 py-1.5 rounded bg-blue-700 text-white text-xs hover:bg-blue-800 disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
            {uploadError && <p className="text-xs text-red-700">{uploadError}</p>}

            <div className="text-xs text-stone-500">— or —</div>

            <div>
              <label className="block text-xs font-medium mb-1">Manual URL</label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="/photos/archival/my_photo.png  or  https://..."
                className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm font-mono"
              />
              {url && (
                <div className="mt-2 flex items-start gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="preview" className="max-h-40 border border-stone-300 rounded" />
                  <div className="text-[11px] text-stone-500">
                    <div>Storage: <code>{detectStorageBackend(url)}</code></div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Step 2: Core metadata */}
          <section className="border border-stone-300 rounded bg-white p-4 space-y-3">
            <h2 className="font-semibold text-sm">2. Core metadata</h2>

            <div>
              <label className="block text-xs font-medium mb-1">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="px-2 py-1.5 border border-stone-300 rounded text-sm">
                <option value="onsite">onsite</option>
                <option value="archival">archival</option>
                <option value="contributor">contributor</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Caption <span className="text-red-600">*</span></label>
              <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={2} className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Credit</label>
                <input value={credit} onChange={(e) => setCredit(e.target.value)} className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Year</label>
                <input value={year} onChange={(e) => setYear(e.target.value)} className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Source URL {type === 'archival' && <span className="text-red-600">*</span>}</label>
              <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="https://..." className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm" />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">License</label>
              <input value={license} onChange={(e) => setLicense(e.target.value)} className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm" />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Physical location tag</label>
              <select value={physicalLocationTag} onChange={(e) => setPhysicalLocationTag(e.target.value)} className="px-2 py-1.5 border border-stone-300 rounded text-sm">
                {LOCATION_TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </section>

          {/* Step 3: Structured tags */}
          <section className="border border-stone-300 rounded bg-white p-4 space-y-3">
            <h2 className="font-semibold text-sm">3. Structured tags</h2>

            <div>
              <label className="block text-xs font-medium mb-1">Knowledge entries (comma-separated IDs)</label>
              <input value={databaseEntries} onChange={(e) => setDatabaseEntries(e.target.value)} placeholder="3.1, 6.1" className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm font-mono" />
              <details className="mt-1">
                <summary className="text-[11px] text-stone-500 cursor-pointer">Known entry IDs</summary>
                <ul className="text-[11px] text-stone-600 mt-1 space-y-0.5 max-h-32 overflow-y-auto border border-stone-200 rounded p-2 bg-stone-50">
                  {Object.entries(ENTRY_TITLES).map(([id, title]) => (
                    <li key={id}><code>{id}</code> — {title}</li>
                  ))}
                </ul>
              </details>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Inquiry categories</label>
              <div className="flex flex-wrap gap-3">
                {CATEGORIES.map((cat) => (
                  <label key={cat} className="flex items-center gap-1 text-sm">
                    <input type="checkbox" checked={categories.includes(cat)} onChange={() => toggleCategory(cat)} />
                    {cat}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Linked pins</label>
              <p className="text-[11px] text-stone-500 mb-1">Photos without linked pins are valid (unattached); they just won&apos;t show up for learners until attached.</p>
              <div className="border border-stone-200 rounded p-2 bg-stone-50 max-h-40 overflow-y-auto space-y-1">
                {pins.length === 0 ? (
                  <p className="text-xs text-stone-500 italic">Loading pins...</p>
                ) : pins.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={linkedPinIds.includes(p.id)} onChange={() => toggleLinkedPin(p.id)} />
                    <span className="flex-1">{p.title}</span>
                    <span className="text-[10px] text-stone-500 font-mono">{p.id}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          {/* Step 4: Free-form description + keywords */}
          <section className="border border-stone-300 rounded bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">4. Description + keywords (for AI retrieval)</h2>
              <button
                type="button"
                onClick={fillAutoMetadata}
                className="text-xs text-blue-700 hover:underline"
              >
                ↻ Auto-generate from metadata
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Description</label>
              <p className="text-[11px] text-stone-500 mb-1">2-4 sentences describing what&apos;s visible in the photo.</p>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm" />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Keywords</label>
              <p className="text-[11px] text-stone-500 mb-1">Comma-separated. Don&apos;t overthink — proper nouns, features, events.</p>
              <textarea value={keywords} onChange={(e) => setKeywords(e.target.value)} rows={2} className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm font-mono" />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Admin notes (optional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full px-2 py-1.5 border border-stone-300 rounded text-sm" />
            </div>
          </section>

          {/* Save */}
          <div className="flex items-center gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 rounded bg-blue-700 text-white text-sm hover:bg-blue-800 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save photo'}
            </button>
            <Link href="/admin/photos" className="px-4 py-2 rounded border border-stone-300 text-sm hover:bg-stone-100">
              Cancel
            </Link>
            <span className="text-xs text-stone-500">Annotations can be added on the edit page after saving.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
