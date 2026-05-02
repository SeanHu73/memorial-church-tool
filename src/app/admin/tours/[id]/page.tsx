'use client';

/**
 * /admin/tours/[id] — Tour editor.
 *
 * Full authoring interface for a single tour. Sean edits tour metadata
 * at the top (title, subtitle, guide, cover photo, description) and
 * manages an ordered list of stops below. Each stop expands inline to
 * show all five phase fields: Seed, Notice, Wonder, Reveal, plus metadata
 * (physical location tag, related entries, upcoming topics).
 *
 * "Preview this stop" opens a simple phase-by-phase walkthrough so Sean
 * can see exactly what the learner will experience.
 *
 * Auto-saves to Firestore on every blur / change so work is never lost.
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { APIProvider, Map as GoogleMap, AdvancedMarker } from '@vis.gl/react-google-maps';
import { Tour, Stop } from '@/lib/types';
import { getTour, saveTour, deleteTour, blankStop } from '@/lib/tours-store';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const MEMORIAL_CHURCH = { lat: 37.42700, lng: -122.17015 };
const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

const LOCATION_TAGS = [
  'exterior_facade', 'exterior_sides', 'exterior_rear',
  'narthex', 'nave', 'nave_aisles',
  'crossing', 'dome', 'chancel',
  'transepts', 'side_chapel', 'organ_loft',
  'general',
] as const;

const KNOWN_ENTRIES: Array<{ id: string; title: string }> = [
  { id: '1.1', title: 'The Chain of Grief' },
  { id: '1.2', title: 'Jane Stanford: The Woman Who Built the Church' },
  { id: '1.2a', title: 'The University Founding Vision' },
  { id: '1.2b', title: 'The Chinese Railroad Workers' },
  { id: '1.3', title: 'Charles Coolidge: The Young Architect' },
  { id: '1.4', title: 'Camerino and the Salviati Studios' },
  { id: '1.5', title: 'Frederick Stymetz Lamb: Stained Glass' },
  { id: '1.6', title: 'John McGilvray: The Builder' },
  { id: '1.7', title: 'Charles Fisk: Atomic Bombs to Organs' },
  { id: '2.1', title: 'Architecture: Form and Dimensions' },
  { id: '3.1', title: 'The Facade Mosaic' },
  { id: '3.2', title: 'The Narthex and West Entrance' },
  { id: '3.3', title: 'Nave and Crossing' },
  { id: '3.4', title: 'The Pendentive Angels' },
  { id: '3.5', title: 'The Chancel / Last Supper' },
  { id: '3.6', title: 'The Narthex Floor' },
  { id: '4.1', title: 'Original Organ' },
  { id: '4.2', title: 'Fisk Organ' },
  { id: '5.1', title: 'Stained Glass: Nave Windows' },
  { id: '5.2', title: 'Stained Glass: Chancel Windows' },
  { id: '6.1', title: 'The 1906 Earthquake' },
  { id: '6.2', title: 'Reconstruction' },
  { id: '7.1', title: 'The 1989 Loma Prieta Earthquake' },
  { id: '8.1', title: 'Current Use' },
  { id: '9.1', title: 'Inscriptions and Carved Text' },
  { id: '10.1', title: 'Venice / Salviati Connection' },
  { id: '10.2', title: 'Cantor Arts Center Mosaics' },
  { id: '10.3', title: 'Clock Tower' },
];

export default function TourEditorPage() {
  const params = useParams();
  const router = useRouter();
  const tourId = params.id as string;

  const [tour, setTour] = useState<Tour | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedStopId, setExpandedStopId] = useState<string | null>(null);
  const [previewStopId, setPreviewStopId] = useState<string | null>(null);
  const [previewPhase, setPreviewPhase] = useState(0);

  useEffect(() => {
    getTour(tourId).then((t) => {
      setTour(t);
      setLoading(false);
    });
  }, [tourId]);

  // Persist to Firestore. Debounced via the caller — each field calls
  // this on blur or after meaningful edits.
  const persist = useCallback(async (updated: Tour) => {
    setSaving(true);
    try {
      await saveTour(updated);
    } catch (err) {
      console.error('[tour-editor] save failed:', err);
    }
    setSaving(false);
  }, []);

  // ── Tour metadata helpers ──

  const updateField = <K extends keyof Tour>(key: K, value: Tour[K]) => {
    if (!tour) return;
    const next = { ...tour, [key]: value };
    setTour(next);
    persist(next);
  };

  const updateGuide = (field: keyof Tour['guide'], value: string) => {
    if (!tour) return;
    const next = { ...tour, guide: { ...tour.guide, [field]: value } };
    setTour(next);
    persist(next);
  };

  // ── Stop helpers ──

  const updateStop = (stopId: string, patch: Partial<Stop>) => {
    if (!tour) return;
    const next = {
      ...tour,
      stops: tour.stops.map((s) => (s.id === stopId ? { ...s, ...patch } : s)),
    };
    setTour(next);
    persist(next);
  };

  const addStop = () => {
    if (!tour) return;
    const stop = blankStop(tour.stops.length);
    const next = { ...tour, stops: [...tour.stops, stop] };
    setTour(next);
    setExpandedStopId(stop.id);
    persist(next);
  };

  const removeStop = (stopId: string) => {
    if (!tour) return;
    if (!confirm('Delete this stop?')) return;
    const next = {
      ...tour,
      stops: tour.stops
        .filter((s) => s.id !== stopId)
        .map((s, i) => ({ ...s, order: i })),
    };
    setTour(next);
    if (expandedStopId === stopId) setExpandedStopId(null);
    persist(next);
  };

  const moveStop = (stopId: string, direction: -1 | 1) => {
    if (!tour) return;
    const idx = tour.stops.findIndex((s) => s.id === stopId);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= tour.stops.length) return;
    const reordered = [...tour.stops];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    const next = {
      ...tour,
      stops: reordered.map((s, i) => ({ ...s, order: i })),
    };
    setTour(next);
    persist(next);
  };

  // ── Photo upload helper ──

  const uploadPhoto = async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };

  // ── Delete tour ──

  const handleDeleteTour = async () => {
    if (!confirm('Delete this entire tour? This cannot be undone.')) return;
    await deleteTour(tourId);
    router.push('/admin/tours');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 text-stone-900 p-6 font-sans">
        <p className="text-stone-600 text-sm">Loading tour...</p>
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="min-h-screen bg-stone-50 text-stone-900 p-6 font-sans">
        <p className="text-red-700 text-sm">Tour not found.</p>
        <Link href="/admin/tours" className="text-blue-700 text-sm hover:underline">&larr; Back to tours</Link>
      </div>
    );
  }

  const previewStop = previewStopId ? tour.stops.find((s) => s.id === previewStopId) : null;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-6 border-b border-stone-300 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Edit tour</h1>
              <p className="text-xs text-stone-500 mt-0.5 font-mono">{tourId}</p>
            </div>
            <div className="flex gap-3 text-sm items-center">
              {saving && <span className="text-xs text-stone-400 italic">Saving...</span>}
              <button
                onClick={handleDeleteTour}
                className="px-3 py-1.5 rounded bg-red-100 text-red-700 hover:bg-red-200 text-xs"
              >
                Delete tour
              </button>
              <Link href="/admin/tours" className="text-blue-700 hover:underline">&larr; Tours</Link>
            </div>
          </div>
        </header>

        {/* Tour metadata */}
        <section className="mb-8 p-4 rounded border border-stone-300 bg-white space-y-4">
          <h2 className="font-semibold text-sm text-stone-700 uppercase tracking-wide">Tour metadata</h2>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs text-stone-600">Title</span>
              <input
                value={tour.title}
                onChange={(e) => updateField('title', e.target.value)}
                className="mt-1 w-full px-3 py-1.5 border border-stone-300 rounded text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs text-stone-600">Subtitle</span>
              <input
                value={tour.subtitle}
                onChange={(e) => updateField('subtitle', e.target.value)}
                className="mt-1 w-full px-3 py-1.5 border border-stone-300 rounded text-sm"
              />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <label className="block">
              <span className="text-xs text-stone-600">Guide name</span>
              <input
                value={tour.guide.name}
                onChange={(e) => updateGuide('name', e.target.value)}
                className="mt-1 w-full px-3 py-1.5 border border-stone-300 rounded text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs text-stone-600">Guide role</span>
              <input
                value={tour.guide.role}
                onChange={(e) => updateGuide('role', e.target.value)}
                className="mt-1 w-full px-3 py-1.5 border border-stone-300 rounded text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs text-stone-600">Guide initials</span>
              <input
                value={tour.guide.initials}
                onChange={(e) => updateGuide('initials', e.target.value)}
                className="mt-1 w-full px-3 py-1.5 border border-stone-300 rounded text-sm"
                maxLength={3}
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs text-stone-600">Description (shown on journal peek)</span>
            <textarea
              value={tour.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
              className="mt-1 w-full px-3 py-1.5 border border-stone-300 rounded text-sm"
            />
          </label>

          <label className="block">
            <span className="text-xs text-stone-600">Cover photo URL</span>
            <div className="flex gap-2 mt-1">
              <input
                value={tour.coverPhotoUrl}
                onChange={(e) => updateField('coverPhotoUrl', e.target.value)}
                className="flex-1 px-3 py-1.5 border border-stone-300 rounded text-sm"
                placeholder="/photos/archival/..."
              />
              <label className="px-3 py-1.5 rounded bg-stone-200 text-stone-700 text-sm cursor-pointer hover:bg-stone-300">
                Upload
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const url = await uploadPhoto(file, `memorial-church/photos/tours/${tourId}/cover_${file.name}`);
                    updateField('coverPhotoUrl', url);
                  }}
                />
              </label>
            </div>
            {tour.coverPhotoUrl && (
              <div className="mt-2 w-32 h-20 bg-stone-100 border border-stone-200 rounded overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={tour.coverPhotoUrl} alt="cover" className="w-full h-full object-cover" />
              </div>
            )}
          </label>

          {/* Tour-level map pin */}
          <div>
            <span className="text-xs text-stone-600">Tour pin on map (the single marker learners tap to start this tour)</span>
            <div className="mt-1 rounded border border-stone-300 overflow-hidden" style={{ height: 180 }}>
              {MAPS_API_KEY ? (
                <APIProvider apiKey={MAPS_API_KEY}>
                  <StopMapPicker
                    location={tour.location ?? null}
                    onLocationChange={(loc) => updateField('location', loc)}
                  />
                </APIProvider>
              ) : (
                <div className="h-full flex items-center justify-center bg-stone-100 text-xs text-stone-400">
                  Maps API key not configured
                </div>
              )}
            </div>
            {tour.location && (
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[10px] text-stone-500 font-mono">
                  {tour.location.lat.toFixed(6)}, {tour.location.lng.toFixed(6)}
                </span>
                <button
                  onClick={() => updateField('location', null)}
                  className="text-[10px] text-red-600 hover:underline"
                >
                  Remove pin
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Stops list */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm text-stone-700 uppercase tracking-wide">
              Stops ({tour.stops.length})
            </h2>
            <button
              onClick={addStop}
              className="px-3 py-1.5 rounded bg-blue-700 text-white text-sm hover:bg-blue-800"
            >
              + Add stop
            </button>
          </div>

          {tour.stops.length === 0 ? (
            <p className="text-stone-500 text-sm italic">No stops yet. Add one to start building the tour.</p>
          ) : (
            <ul className="space-y-2">
              {tour.stops.map((stop, idx) => (
                <li key={stop.id} className="border border-stone-300 rounded bg-white">
                  {/* Stop summary bar */}
                  <div
                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-stone-50"
                    onClick={() => setExpandedStopId(expandedStopId === stop.id ? null : stop.id)}
                  >
                    <span className="text-xs font-mono text-stone-400 w-6 text-center">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {stop.title || <em className="text-stone-400">Untitled stop</em>}
                      </div>
                      <div className="text-xs text-stone-500 mt-0.5">
                        {stop.physicalLocationTag}
                        {stop.location && <> &middot; <span className="text-amber-700">has map pin</span></>}
                        {' '}&middot; {stop.wonder === null ? 'No wonder' : stop.wonder.question ? 'Wonder set' : 'Wonder empty'}
                        {' '}&middot; {stop.reveal.text ? 'Reveal set' : 'No reveal'}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); moveStop(stop.id, -1); }}
                        disabled={idx === 0}
                        className="px-1.5 py-0.5 text-xs rounded bg-stone-100 hover:bg-stone-200 disabled:opacity-30"
                        title="Move up"
                      >&uarr;</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); moveStop(stop.id, 1); }}
                        disabled={idx === tour.stops.length - 1}
                        className="px-1.5 py-0.5 text-xs rounded bg-stone-100 hover:bg-stone-200 disabled:opacity-30"
                        title="Move down"
                      >&darr;</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setPreviewStopId(stop.id); setPreviewPhase(0); }}
                        className="px-1.5 py-0.5 text-xs rounded bg-amber-100 text-amber-800 hover:bg-amber-200"
                        title="Preview"
                      >Preview</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeStop(stop.id); }}
                        className="px-1.5 py-0.5 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200"
                        title="Delete"
                      >&times;</button>
                    </div>
                  </div>

                  {/* Expanded stop editor */}
                  {expandedStopId === stop.id && (
                    <StopEditor
                      stop={stop}
                      tourId={tourId}
                      onChange={(patch) => updateStop(stop.id, patch)}
                      onUploadPhoto={uploadPhoto}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Preview modal */}
        {previewStop && (
          <StopPreview
            stop={previewStop}
            phase={previewPhase}
            onNext={() => setPreviewPhase((p) => Math.min(p + 1, 4))}
            onPrev={() => setPreviewPhase((p) => Math.max(p - 1, 0))}
            onClose={() => { setPreviewStopId(null); setPreviewPhase(0); }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Stop Editor ────────────────────────────────────────────────────

interface StopEditorProps {
  stop: Stop;
  tourId: string;
  onChange: (patch: Partial<Stop>) => void;
  onUploadPhoto: (file: File, path: string) => Promise<string>;
}

function StopEditor({ stop, tourId, onChange, onUploadPhoto }: StopEditorProps) {
  const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="border-t border-stone-200 p-4 space-y-5">
      {/* ── Stop title ── */}
      <label className="block">
        <span className="text-xs text-stone-600 font-semibold">Stop title</span>
        <input
          value={stop.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className="mt-1 w-full px-3 py-1.5 border border-stone-300 rounded text-sm"
          placeholder="e.g., The Facade Mosaic"
        />
      </label>

      {/* ── Seed ── */}
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-stone-700 uppercase tracking-wide flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#7A7A5E] inline-block" />
          Background (seed &mdash; context card)
        </legend>
        <label className="block">
          <span className="text-xs text-stone-500">Text (2-3 sentences of context)</span>
          <textarea
            value={stop.seed.text}
            onChange={(e) => onChange({ seed: { ...stop.seed, text: e.target.value } })}
            rows={3}
            className="mt-1 w-full px-3 py-1.5 border border-stone-300 rounded text-sm"
          />
          <span className="text-[10px] text-stone-400">{wordCount(stop.seed.text)} words</span>
        </label>
        <div className="flex gap-4">
          <label className="flex-1 block">
            <span className="text-xs text-stone-500">Photo URL</span>
            <div className="flex gap-2 mt-1">
              <input
                value={stop.seed.photoUrl || ''}
                onChange={(e) => onChange({ seed: { ...stop.seed, photoUrl: e.target.value || null } })}
                className="flex-1 px-2 py-1 border border-stone-300 rounded text-xs"
                placeholder="/photos/archival/..."
              />
              <label className="px-2 py-1 rounded bg-stone-200 text-stone-700 text-xs cursor-pointer hover:bg-stone-300">
                Upload
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const url = await onUploadPhoto(file, `memorial-church/photos/tours/${tourId}/seed_${stop.id}_${file.name}`);
                    onChange({ seed: { ...stop.seed, photoUrl: url } });
                  }}
                />
              </label>
            </div>
          </label>
          <label className="flex-1 block">
            <span className="text-xs text-stone-500">Photo caption</span>
            <input
              value={stop.seed.photoCaption || ''}
              onChange={(e) => onChange({ seed: { ...stop.seed, photoCaption: e.target.value || null } })}
              className="mt-1 w-full px-2 py-1 border border-stone-300 rounded text-xs"
            />
          </label>
        </div>
      </fieldset>

      {/* ── Notice ── */}
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-stone-700 uppercase tracking-wide flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#2B4C5E] inline-block" />
          Notice (observation prompt)
        </legend>
        <label className="block">
          <span className="text-xs text-stone-500">Prompt (what to look at)</span>
          <textarea
            value={stop.notice.prompt}
            onChange={(e) => onChange({ notice: { ...stop.notice, prompt: e.target.value } })}
            rows={2}
            className="mt-1 w-full px-3 py-1.5 border border-stone-300 rounded text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs text-stone-500">Timer (seconds)</span>
          <input
            type="number"
            value={stop.notice.timerSeconds}
            onChange={(e) => onChange({ notice: { ...stop.notice, timerSeconds: parseInt(e.target.value) || 30 } })}
            className="mt-1 w-20 px-2 py-1 border border-stone-300 rounded text-sm"
            min={5}
            max={120}
          />
        </label>
        <div className="flex gap-4">
          <label className="flex-1 block">
            <span className="text-xs text-stone-500">Photo URL (optional &mdash; helps locate the feature)</span>
            <div className="flex gap-2 mt-1">
              <input
                value={stop.notice.photoUrl || ''}
                onChange={(e) => onChange({ notice: { ...stop.notice, photoUrl: e.target.value || null } })}
                className="flex-1 px-2 py-1 border border-stone-300 rounded text-xs"
                placeholder="/photos/onsite/..."
              />
              <label className="px-2 py-1 rounded bg-stone-200 text-stone-700 text-xs cursor-pointer hover:bg-stone-300">
                Upload
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const url = await onUploadPhoto(file, `memorial-church/photos/tours/${tourId}/notice_${stop.id}_${file.name}`);
                    onChange({ notice: { ...stop.notice, photoUrl: url } });
                  }}
                />
              </label>
            </div>
          </label>
          <label className="flex-1 block">
            <span className="text-xs text-stone-500">Photo caption</span>
            <input
              value={stop.notice.photoCaption || ''}
              onChange={(e) => onChange({ notice: { ...stop.notice, photoCaption: e.target.value || null } })}
              className="mt-1 w-full px-2 py-1 border border-stone-300 rounded text-xs"
            />
          </label>
        </div>
      </fieldset>

      {/* ── Wonder ── */}
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-stone-700 uppercase tracking-wide flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#C4923A] inline-block" />
          Wonder (discussion prompt)
        </legend>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={stop.wonder !== null}
            onChange={(e) => {
              if (e.target.checked) {
                onChange({ wonder: { question: '' } });
              } else {
                onChange({ wonder: null });
              }
            }}
            className="rounded"
          />
          <span className="text-xs text-stone-600">Include a wonder phase for this stop</span>
        </label>
        {stop.wonder !== null && (
          <>
            <label className="block">
              <span className="text-xs text-stone-500">Question (prompts group conversation)</span>
              <textarea
                value={stop.wonder.question}
                onChange={(e) => onChange({ wonder: { question: e.target.value } })}
                rows={3}
                className="mt-1 w-full px-3 py-1.5 border border-stone-300 rounded text-sm"
              />
              <p className="text-[10px] text-stone-400 mt-1 italic">
                Write a question that prompts group conversation. There are no right or wrong answers &mdash;
                the reveal will complicate their thinking.
              </p>
            </label>
          </>
        )}
        {stop.wonder === null && (
          <p className="text-[10px] text-stone-400 italic">
            Wonder skipped &mdash; learners will go directly from Notice to Reveal.
          </p>
        )}
      </fieldset>

      {/* ── Reveal ── */}
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-stone-700 uppercase tracking-wide flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#C4923A] inline-block" />
          Context (reveal)
        </legend>
        <label className="block">
          <span className="text-xs text-stone-500">Text (the authored insight)</span>
          <textarea
            value={stop.reveal.text}
            onChange={(e) => onChange({ reveal: { ...stop.reveal, text: e.target.value } })}
            rows={5}
            className="mt-1 w-full px-3 py-1.5 border border-stone-300 rounded text-sm"
          />
          <span className="text-[10px] text-stone-400">{wordCount(stop.reveal.text)} words</span>
        </label>
        {/* Photos — multiple allowed */}
        <div className="space-y-2">
          <span className="text-xs text-stone-500">Photos (optional)</span>
          {(stop.reveal.photos || []).map((photo, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1 flex gap-2">
                <input
                  value={photo.url}
                  onChange={(e) => {
                    const photos = [...(stop.reveal.photos || [])];
                    photos[i] = { ...photos[i], url: e.target.value };
                    onChange({ reveal: { ...stop.reveal, photos } });
                  }}
                  className="flex-1 px-2 py-1 border border-stone-300 rounded text-xs"
                  placeholder="/photos/archival/..."
                />
                <input
                  value={photo.caption || ''}
                  onChange={(e) => {
                    const photos = [...(stop.reveal.photos || [])];
                    photos[i] = { ...photos[i], caption: e.target.value || null };
                    onChange({ reveal: { ...stop.reveal, photos } });
                  }}
                  className="w-40 px-2 py-1 border border-stone-300 rounded text-xs"
                  placeholder="Caption"
                />
                <label className="px-2 py-1 rounded bg-stone-200 text-stone-700 text-xs cursor-pointer hover:bg-stone-300 shrink-0">
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const url = await onUploadPhoto(file, `memorial-church/photos/tours/${tourId}/reveal_${stop.id}_${i}_${file.name}`);
                      const photos = [...(stop.reveal.photos || [])];
                      photos[i] = { ...photos[i], url };
                      onChange({ reveal: { ...stop.reveal, photos } });
                    }}
                  />
                </label>
              </div>
              <button
                onClick={() => {
                  const photos = (stop.reveal.photos || []).filter((_, j) => j !== i);
                  onChange({ reveal: { ...stop.reveal, photos } });
                }}
                className="px-1.5 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
              >&times;</button>
            </div>
          ))}
          <button
            onClick={() => {
              const photos = [...(stop.reveal.photos || []), { url: '', caption: null }];
              onChange({ reveal: { ...stop.reveal, photos } });
            }}
            className="text-xs text-blue-700 hover:underline"
          >
            + Add photo
          </button>
        </div>
        <label className="block">
          <span className="text-xs text-stone-500">Bridge text (forward-pointing sentence to next stop)</span>
          <textarea
            value={stop.reveal.bridgeText}
            onChange={(e) => onChange({ reveal: { ...stop.reveal, bridgeText: e.target.value } })}
            rows={2}
            className="mt-1 w-full px-3 py-1.5 border border-stone-300 rounded text-sm"
          />
        </label>
      </fieldset>

      {/* ── Reflection ── */}
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-stone-700 uppercase tracking-wide flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#6B5D4F] inline-block" />
          Reflection
        </legend>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={stop.reflect !== null}
            onChange={(e) => {
              if (e.target.checked) {
                onChange({ reflect: {
                  sliderPrompt: 'How much did that change your thinking?',
                  sliderLeftLabel: 'Confirmed what we thought',
                  sliderRightLabel: 'Shifted our thinking completely',
                  followUp: null,
                  followUpOptions: null,
                }});
              } else {
                onChange({ reflect: null });
              }
            }}
            className="rounded"
          />
          <span className="text-xs text-stone-600">Include a reflection phase for this stop</span>
        </label>
        {stop.reflect !== null && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <label className="block">
                <span className="text-xs text-stone-500">Slider prompt</span>
                <input
                  value={stop.reflect.sliderPrompt}
                  onChange={(e) => onChange({ reflect: { ...stop.reflect!, sliderPrompt: e.target.value } })}
                  className="mt-1 w-full px-2 py-1 border border-stone-300 rounded text-xs"
                />
              </label>
              <label className="block">
                <span className="text-xs text-stone-500">Left label</span>
                <input
                  value={stop.reflect.sliderLeftLabel}
                  onChange={(e) => onChange({ reflect: { ...stop.reflect!, sliderLeftLabel: e.target.value } })}
                  className="mt-1 w-full px-2 py-1 border border-stone-300 rounded text-xs"
                />
              </label>
              <label className="block">
                <span className="text-xs text-stone-500">Right label</span>
                <input
                  value={stop.reflect.sliderRightLabel}
                  onChange={(e) => onChange({ reflect: { ...stop.reflect!, sliderRightLabel: e.target.value } })}
                  className="mt-1 w-full px-2 py-1 border border-stone-300 rounded text-xs"
                />
              </label>
            </div>
            <div>
              <span className="text-xs text-stone-500">Optional follow-up reflection</span>
              <div className="mt-1 space-y-1">
                {([
                  { value: null, label: 'None', desc: '' },
                  { value: 'what_shifted' as const, label: '"What shifted?"', desc: 'Ask the group to categorise how the reveal changed their thinking.' },
                  { value: 'reasoning_source' as const, label: '"Where did your thinking come from?"', desc: 'Ask the group what they based their discussion on.' },
                ]).map((opt) => (
                  <label key={String(opt.value)} className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={`followup-${stop.id}`}
                      checked={stop.reflect!.followUp === opt.value}
                      onChange={() => onChange({ reflect: { ...stop.reflect!, followUp: opt.value, followUpOptions: null } })}
                      className="mt-0.5"
                    />
                    <div>
                      <span className="text-xs font-medium text-stone-700">{opt.label}</span>
                      {opt.desc && <p className="text-[10px] text-stone-400">{opt.desc}</p>}
                    </div>
                  </label>
                ))}
              </div>
            </div>
            {stop.reflect.followUp && (
              <label className="block">
                <span className="text-xs text-stone-500">Custom options (one per line &mdash; leave blank for defaults)</span>
                <textarea
                  value={(stop.reflect.followUpOptions ?? []).join('\n')}
                  onChange={(e) => {
                    const lines = e.target.value.split('\n').map((s) => s.trim()).filter(Boolean);
                    onChange({ reflect: { ...stop.reflect!, followUpOptions: lines.length > 0 ? lines : null } });
                  }}
                  rows={3}
                  className="mt-1 w-full px-2 py-1 border border-stone-300 rounded text-xs font-mono"
                  placeholder={stop.reflect.followUp === 'what_shifted'
                    ? "We learned something new\nWe changed our mind\nWe had part of it\nIt was as we expected"
                    : "What we observed here\nSomething we already knew\nA guess"}
                />
              </label>
            )}
          </>
        )}
        {stop.reflect === null && (
          <p className="text-[10px] text-stone-400 italic">
            Reflection skipped &mdash; learners will go from the reveal directly to the next stop or question prompt.
          </p>
        )}
      </fieldset>

      {/* ── Location ── */}
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-stone-700 uppercase tracking-wide flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#B8694A] inline-block" />
          Map pin (optional)
        </legend>
        <p className="text-[10px] text-stone-400 italic">Only needed if this stop is at a different location (e.g., walking to the rear). Most stops inside the church don&apos;t need their own pin.</p>
        <div className="rounded border border-stone-300 overflow-hidden" style={{ height: 220 }}>
          {MAPS_API_KEY ? (
            <APIProvider apiKey={MAPS_API_KEY}>
              <StopMapPicker
                location={stop.location}
                onLocationChange={(loc) => onChange({ location: loc })}
              />
            </APIProvider>
          ) : (
            <div className="h-full flex items-center justify-center bg-stone-100 text-xs text-stone-400">
              Maps API key not configured
            </div>
          )}
        </div>
        {stop.location && (
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-stone-500 font-mono">
              {stop.location.lat.toFixed(6)}, {stop.location.lng.toFixed(6)}
            </span>
            <button
              onClick={() => onChange({ location: null })}
              className="text-[10px] text-red-600 hover:underline"
            >
              Remove pin
            </button>
          </div>
        )}
      </fieldset>

      {/* ── Metadata ── */}
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-stone-700 uppercase tracking-wide">Metadata</legend>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs text-stone-500">Physical location tag</span>
            <select
              value={stop.physicalLocationTag}
              onChange={(e) => onChange({ physicalLocationTag: e.target.value })}
              className="mt-1 w-full px-2 py-1.5 border border-stone-300 rounded text-sm"
            >
              {LOCATION_TAGS.map((tag) => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-stone-500">Upcoming topics (comma-separated keywords)</span>
            <input
              value={stop.upcomingTopics.join(', ')}
              onChange={(e) => onChange({
                upcomingTopics: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
              })}
              className="mt-1 w-full px-2 py-1.5 border border-stone-300 rounded text-sm"
              placeholder="mosaic, facade, earthquake..."
            />
          </label>
        </div>
        <div>
          <span className="text-xs text-stone-500">Related knowledge entries</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {KNOWN_ENTRIES.map((entry) => {
              const selected = stop.relatedEntryIds.includes(entry.id);
              return (
                <button
                  key={entry.id}
                  onClick={() => {
                    const next = selected
                      ? stop.relatedEntryIds.filter((e) => e !== entry.id)
                      : [...stop.relatedEntryIds, entry.id];
                    onChange({ relatedEntryIds: next });
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] border ${
                    selected
                      ? 'bg-blue-100 border-blue-400 text-blue-800'
                      : 'bg-stone-50 border-stone-300 text-stone-600 hover:bg-stone-100'
                  }`}
                  title={entry.title}
                >
                  {entry.id}
                </button>
              );
            })}
          </div>
        </div>
      </fieldset>
    </div>
  );
}

// ─── Stop Preview ───────────────────────────────────────────────────

type PhaseName = 'Seed' | 'Notice' | 'Wonder' | 'Reveal' | 'Reflect';

const PHASE_COLOR: Record<PhaseName, string> = {
  Seed: '#7A7A5E',
  Notice: '#2B4C5E',
  Wonder: '#C4923A',
  Reveal: '#C4923A',
  Reflect: '#6B5D4F',
};

/** Build the phase sequence for a stop, skipping Wonder if null. */
function phasesForStop(stop: Stop): PhaseName[] {
  const phases: PhaseName[] = ['Seed', 'Notice'];
  if (stop.wonder !== null) phases.push('Wonder');
  phases.push('Reveal', 'Reflect');
  return phases;
}

interface StopPreviewProps {
  stop: Stop;
  phase: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

function StopPreview({ stop, phase, onNext, onPrev, onClose }: StopPreviewProps) {
  const phases = phasesForStop(stop);
  const maxPhase = phases.length - 1;
  const currentPhase = phases[Math.min(phase, maxPhase)];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-[#F0E0C8] rounded-lg shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Phase indicator */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#D4BFA0]">
          <div className="flex gap-1">
            {phases.map((name, i) => (
              <span
                key={name}
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: i <= phase ? PHASE_COLOR[name] : '#D4BFA0',
                }}
              />
            ))}
          </div>
          <span className="text-xs font-semibold" style={{ color: PHASE_COLOR[currentPhase] }}>
            {currentPhase}
          </span>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-800 text-sm">&times;</button>
        </div>

        {/* Phase content */}
        <div className="p-5 min-h-[280px] flex flex-col justify-between">
          {currentPhase === 'Seed' && (
            <div className="space-y-3">
              {stop.seed.photoUrl && (
                <div className="rounded overflow-hidden border border-[#D4BFA0]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={stop.seed.photoUrl} alt="" className="w-full h-40 object-cover" />
                  {stop.seed.photoCaption && (
                    <p className="text-[10px] text-stone-600 px-2 py-1 bg-[#EBE3D6]">{stop.seed.photoCaption}</p>
                  )}
                </div>
              )}
              <p className="text-[17px] leading-relaxed font-serif text-[#2C2418]">
                {stop.seed.text || <em className="text-stone-400">No seed text</em>}
              </p>
            </div>
          )}

          {currentPhase === 'Notice' && (
            <div className="space-y-4">
              <p className="text-[19px] leading-relaxed font-serif text-[#2C2418]">
                {stop.notice.prompt || <em className="text-stone-400">No notice prompt</em>}
              </p>
              <div className="flex items-center gap-2 text-sm text-[#2B4C5E]">
                <span className="w-6 h-6 rounded-full border-2 border-[#2B4C5E] flex items-center justify-center text-[10px] font-bold">
                  {stop.notice.timerSeconds}
                </span>
                <span>seconds to look</span>
              </div>
            </div>
          )}

          {currentPhase === 'Wonder' && stop.wonder && (
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-widest text-[#C4923A] font-semibold">Wonder together</p>
              <p className="text-[19px] leading-relaxed font-serif text-[#2C2418]">
                {stop.wonder.question || <em className="text-stone-400">No wonder question</em>}
              </p>
              <p className="text-xs text-stone-500 italic">Talk together about this before continuing.</p>
            </div>
          )}

          {currentPhase === 'Reveal' && (
            <div className="space-y-3">
              <p className="text-[17px] leading-relaxed font-serif text-[#2C2418] border-l-4 border-[#C4923A] pl-3">
                {stop.reveal.text || <em className="text-stone-400">No reveal text</em>}
              </p>
              {stop.reveal.photoUrl && (
                <div className="rounded overflow-hidden border border-[#D4BFA0]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={stop.reveal.photoUrl} alt="" className="w-full h-32 object-cover" />
                  {stop.reveal.photoCaption && (
                    <p className="text-[10px] text-stone-600 px-2 py-1 bg-[#EBE3D6]">{stop.reveal.photoCaption}</p>
                  )}
                </div>
              )}
              {stop.reveal.bridgeText && (
                <p className="text-sm text-stone-600 italic">{stop.reveal.bridgeText}</p>
              )}
            </div>
          )}

          {currentPhase === 'Reflect' && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-stone-700">How close was your theory?</p>
              <div className="h-2 bg-[#D4BFA0] rounded-full relative">
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#C4923A] border-2 border-white shadow" />
              </div>
              <div className="flex justify-between text-[10px] text-stone-500">
                <span>Not what we expected</span>
                <span>Exactly what we thought</span>
              </div>
              {stop.reveal.bridgeText && (
                <p className="text-sm text-stone-600 italic mt-4">{stop.reveal.bridgeText}</p>
              )}
              <div className="flex gap-2 mt-2">
                <span className="flex-1 text-center px-2 py-1.5 rounded bg-[#C4923A]/20 text-[#C4923A] text-xs font-semibold">
                  Ask our own question
                </span>
                <span className="flex-1 text-center px-2 py-1.5 rounded bg-[#7A7A5E]/20 text-[#7A7A5E] text-xs font-semibold">
                  Continue the tour
                </span>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-4 pt-3 border-t border-[#D4BFA0]">
            <button
              onClick={onPrev}
              disabled={phase === 0}
              className="text-xs text-stone-500 hover:text-stone-800 disabled:opacity-30"
            >&larr; Previous</button>
            <button
              onClick={phase >= maxPhase ? onClose : onNext}
              className="text-xs font-semibold"
              style={{ color: PHASE_COLOR[phases[Math.min(phase + 1, maxPhase)]] }}
            >
              {phase >= maxPhase ? 'Close preview' : `Next: ${phases[phase + 1]} \u2192`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Map Picker for Stop Location ───────────────────────────────────

interface StopMapPickerProps {
  location: { lat: number; lng: number } | null;
  onLocationChange: (loc: { lat: number; lng: number }) => void;
}

function StopMapPicker({ location, onLocationChange }: StopMapPickerProps) {
  const center = location || MEMORIAL_CHURCH;

  return (
    <GoogleMap
      defaultCenter={center}
      defaultZoom={18}
      mapId="tour-stop-picker"
      gestureHandling="greedy"
      disableDefaultUI={true}
      zoomControl={true}
      onClick={(e) => {
        if (e.detail.latLng) {
          onLocationChange({
            lat: e.detail.latLng.lat,
            lng: e.detail.latLng.lng,
          });
        }
      }}
      style={{ width: '100%', height: '100%' }}
    >
      {location && (
        <AdvancedMarker position={location}>
          <div
            className="flex items-center justify-center rounded-full shadow-md"
            style={{
              width: 28,
              height: 28,
              background: '#B8694A',
              border: '3px solid #F0E0C8',
            }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-[#F0E0C8]" />
          </div>
        </AdvancedMarker>
      )}
    </GoogleMap>
  );
}
