# Build State — Memorial Church Tool

*Handoff document for the next Claude Code session. Last updated 2026-04-16
after the photo-centric admin revamp and `photo_extraction_v1` migration.
Read this instead of re-discovering the codebase.*

---

## 1. What's Built

### Changes 1–6 (from the build guide) — all complete
- **Change 1** — Three-option inquiry loop ending with alternating "Keep talking" / "Step back" based on `inquiry-counter.ts` (random 2–4 direct inquiries between zoom-outs).
- **Change 2** — Epistemic honesty rules baked into the system prompt in `src/app/api/ask/route.ts`.
- **Change 3** — Learner contributions: `memorial-church-contributions` collection + UI path in `InquirySheet.tsx` / `AskSheet.tsx` when the model admits a gap. Writes via `/api/contribute`.
- **Change 4** — Category-aware response differentiation (who/what/when/where/why/how) in the system prompt.
- **Change 5** — Photo data model: `PinPhoto` shape with `type`, `physicalLocationTag`, `databaseEntries`, `categories`, `annotations`, plus `PhotoAnnotation` with per-category clues.
- **Change 6** — Admin photo upload + annotation at `/admin` (see legacy pin-by-pin UI still present in `src/app/admin/page.tsx`). Firebase Storage under `memorial-church/photos/[type]/...`. Tap-to-annotate with per-category clues. First session where pins move from `seed-pins.ts` into Firestore.

### Change 7 — Learner-facing photo display: **built but not yet cut over to the new photos collection**
- `src/lib/photo-matcher.ts` exists with `selectPhotoForResponse()` and the full ranking logic (location → database-entry overlap → category → slot-based type preference → annotation tiebreaker). Critically, the matcher scores the observation slot against `observationEntries` and the answer slot against `answerEntries` separately, so observation photos don't spoil answers.
- `src/components/PhotoDisplay.tsx` renders a single photo with numbered annotation dots, source attribution line, and a "Show hints" button that reveals category-appropriate clues.
- `InquirySheet.tsx` and `AskSheet.tsx` both wire `selectPhotoForResponse()` into the observation slot, answer slot, and the follow-up "Deepen" / "Ask me something else" flows.
- `src/app/api/ask/route.ts` returns `observationEntries` + `answerEntries` (the system prompt asks the model to list them). Client falls back to a legacy `entriesUsed` field for older responses.

**The gap**: `selectPhotoForResponse()` currently reads `pin.photos` (embedded), not the new `memorial-church-photos` collection. Retrieval cutover is still pending — see §3.

### Admin photo-library revamp (this session) — complete
- **`/admin/photos`** — photo-centric library grid: search by caption/keyword/entry, filter by type, filter by pin (including "unattached"). Persistent "Migration artifacts" row when the flag is set, with "Download migration log" button.
- **`/admin/photos/new`** — upload form (Firebase Storage or manual URL) + metadata + auto-generate description/keywords.
- **`/admin/photos/[id]`** — full edit page: all metadata fields, `AnnotationEditor` (click-to-place), `LinkedPins` multi-attach, regenerate auto-metadata button.
- **`photo_extraction_v1` migration** — one-shot idempotent migration that copies every embedded `pin.photos` URL into a standalone `Photo` document in `memorial-church-photos`, with URL-based dedupe, auto-generated description/keywords, and a full client-side backup. Successfully ran 2026-04-16T09:55:32.555Z: 33 photos created, 0 errors. See `docs/migration_log_photo_extraction_v1.md`.
- **Backward-compat sync** — `src/lib/photo-pin-sync.ts` mirrors standalone Photo edits back into each linked pin's embedded `photos` array by URL, so the learner app keeps working while retrieval is still reading `pin.photos`.
- **Admin scroll fix** — `src/app/admin/layout.tsx` creates its own scroll context. The root `<body>` is locked to `100dvh; overflow: hidden` for the learner map, which used to clip every long admin page.

### Built this session beyond the original prompts
- **Migration flag pattern** (`src/lib/migrations-store.ts`) — general-purpose `getMigrationFlag(id)` / `setMigrationFlag(id, summary)` API for any future one-shot migration. Each flag doc stores the full summary so logs can be regenerated later.
- **`buildLogMarkdown()` exported** from `photo-migration.ts` so the admin UI can re-download the log from Firestore after the initial banner has unmounted.
- **`photo-auto-metadata.ts`** — generates descriptions + keywords from an embedded photo + its owning pin. Includes `ENTRY_TITLES` map for all 36 knowledge entries (1.1–10.3) and `detectStorageBackend(url)` classifying URLs as vercel-static / firebase-storage / unknown.
- **Archival manifest + bulk importer** (`src/lib/archival-manifest.ts`) — idempotent bulk-import of `/public/photos/archival/*` into pin.photos, invoked from the legacy `/admin` page. Already loaded with the HABS + Highsmith + Calisphere set.

---

## 2. What's In Progress

**Nothing half-modified.** Working tree is clean apart from:
- `.claude/settings.local.json` (local agent config, never committed).
- `docs/.~lock.archival_photo_inventory.xlsx#` (Excel lock file, ignore).

All recent commits (last four: `daadc62`, `d64b18a`, `cd85d89`, `7521854`) are pushed to `origin/master`. `npx tsc --noEmit` is clean, `npx next build` is clean.

---

## 3. What's Pending

### Change 7 retrieval cutover (the real remaining work)
The learner-facing photo display works, but it's still reading the embedded `pin.photos` array. To finish Change 7 properly:
1. Update `selectPhotoForResponse()` in `photo-matcher.ts` (or its callers) to read from `memorial-church-photos` via `getPhotos()` + filter by `linkedPinIds`.
2. Pull `pin.photoIds` as the authoritative list when present; fall back to `pin.photos` if it isn't.
3. Once stable, delete the `photo-pin-sync.ts` mirror and the embedded `pin.photos` field. This is a second migration (`photo_embedding_removal_v1`) — don't do it casually.

### Change 8 — Cowork archival spreadsheet ingestion (implied, not formally spec'd)
Build guide lines 324 and 673 refer to this: ingest the 30+ archival photos Cowork curated (`docs/archival_photo_inventory.xlsx`) automatically instead of by hand. The HABS + Highsmith + Calisphere bytes are already under `public/photos/archival/` and registered in `archival-manifest.ts`, so "Change 8" at this point is mostly: compare the spreadsheet columns to what's already in the manifest, fill in missing metadata fields, and decide whether the bulk-import should move from the legacy `/admin` pin-walk to a new pass that writes directly into `memorial-church-photos`.

### Smaller loose ends
- **Pin `photoIds` from first failed migration run**: pins 1–4 briefly had `photoIds: []` stamped on them before the successful retry overwrote them with real IDs. Cosmetic only; learner app reads `pin.photos`.
- **Delete unused `_reused` and `useMemo` imports audit** — already done, mentioned only so next session doesn't re-lint.
- **Pilot testing** — still blocked on Sean's verification pass through the photo library content.

---

## 4. Key Architecture Decisions

### Dual photo model during transition
`memorial-church-photos` is the authoritative collection for admin workflows, but `pin.photos` is still the runtime source of truth for the learner app. `photo-pin-sync.ts::syncPhotoToPins()` is called inside `savePhoto()` so every admin edit mirrors back into every linked pin's embedded array by URL match. This is a **temporary double-write**; deletion of `pin.photos` must wait until Change 7 retrieval is cut over.

### Observation vs. answer entry lists
The API used to return a single `entriesUsed: string[]`. It now returns `observationEntries` + `answerEntries` so the photo matcher can pick one photo for the physical-feature slot (matches the observation) and a different photo for the narrative slot (matches the answer). Client code falls back to legacy `entriesUsed` when talking to an older response. **Do not collapse these fields back** — spoiler prevention depends on them being separate.

### Migration idempotency via URL dedupe
`photo_extraction_v1` groups embedded photos by URL before writing. If two pins embed the same HABS shot, a single `Photo` doc is created with both pin IDs in `linkedPinIds`. Re-running the migration can't create duplicates because `byUrl` is rebuilt from the current collection every run. Migration flag is only set if `summary.errors.length === 0`, so a partial run is safe to retry.

### Pre-mutation backup
Backups are generated *before* any mutation inside `runPhotoExtractionMigration()`. The failed first run on 2026-04-16 wrote no data (33 permission errors) but produced `pin_backup_20260416.json` anyway — that file is the canonical pre-migration snapshot and is archived in `docs/`.

### Migration flag = receipt + summary
Each doc in `memorial-church-migrations` stores `{completedAt, summary}`. The summary payload is the full `MigrationSummary`, so logs can be regenerated any time via `buildLogMarkdown(flag.summary)`. The admin UI uses this to offer a persistent "Download migration log" button after the run banner has unmounted.

### Admin scroll context
Root layout locks `<body>` to `height: 100dvh; overflow: hidden` because the learner map requires a fixed viewport. `src/app/admin/layout.tsx` wraps every admin route in `<div className="h-full overflow-y-auto">` to create an isolated scroll context inside the locked body. **Don't remove the body lock** — the map will break.

### `react-hooks/set-state-in-effect` workarounds (Next.js 16)
Two places syncing a buffered copy of an external value had to dodge this lint rule:
- `FieldKeywords` and `FieldDatabaseEntries` in `/admin/photos/[id]/page.tsx` extract an inner `KeywordBuffer` / `EntryIdBuffer` component keyed on the external value. The key change remounts the inner component with a fresh state instead of syncing via effect.
- `/admin/photos/page.tsx` just disables the rule for one line (`void refresh()`), because `refresh()` awaits before calling setState, which the rule can't see through.

### Firestore security rules
Rules are permissive per-collection (test-mode pattern). There are now five sibling `match /<collection>/{doc}` blocks: `memorial-church-pins`, `memorial-church-contributions`, `memorial-church-questions`, `memorial-church-photos`, `memorial-church-migrations`. Any new collection needs its own block or reads/writes will fail silently with "Missing or insufficient permissions."

---

## 5. Known Issues

- **No authentication on `/admin`.** The URL is unlinked from the main app but not gated. Fine for a solo builder tool; needs a proper check before public launch.
- **`pin.photos` is still the retrieval source** for the learner app. Edits through `/admin/photos` are mirrored back automatically, but the legacy `/admin` pin-by-pin form still writes only to `pin.photos` — those edits won't appear in `/admin/photos` until the pin's URL list gets re-extracted. Easy to forget.
- **Photo doc IDs are UUIDs**, not URL hashes. Dedupe is by URL *content*, not ID, so two concurrent admin sessions uploading the same URL could race and produce two Photo docs. Low probability for a solo tool; worth knowing.
- **Migration flag won't unblock if you need to re-run.** Currently there's no UI to delete `memorial-church-migrations/photo_extraction_v1`; if you genuinely need to re-run the migration, delete the doc in the Firebase console first.
- **TypeScript/lint clean, no test suite.** There are no automated tests; verification has been manual via `npx tsc --noEmit` + `npx next build` + clicking around. A test harness is a future task.
- **Turbopack dev server is the default** (`next dev`). Occasionally slow on first compile; not a bug.

---

## 6. File Map

### New this session (photo-library revamp)
| File | Purpose |
|------|---------|
| `src/app/admin/layout.tsx` | Scroll-context wrapper for all admin routes |
| `src/app/admin/photos/page.tsx` | Photo library grid + migration banner + artifacts download |
| `src/app/admin/photos/new/page.tsx` | Upload form (Storage or manual URL) + auto-metadata |
| `src/app/admin/photos/[id]/page.tsx` | Full edit page with AnnotationEditor + LinkedPins |
| `src/lib/photos-store.ts` | CRUD for `memorial-church-photos` |
| `src/lib/migrations-store.ts` | Generic `getMigrationFlag` / `setMigrationFlag` |
| `src/lib/photo-migration.ts` | `photo_extraction_v1` runner + `buildLogMarkdown` |
| `src/lib/photo-auto-metadata.ts` | Description + keyword generation, entry titles, backend detect |
| `src/lib/photo-pin-sync.ts` | Mirrors Photo edits back into each linked `pin.photos` |
| `docs/migration_log_photo_extraction_v1.md` | Log from the successful migration |
| `docs/pin_backup_20260416.json` | Pre-migration pin snapshot (from first failed run — no mutations had occurred) |

### Existing key files
| File | Purpose |
|------|---------|
| `src/app/api/ask/route.ts` | Claude API endpoint + system prompt; emits `observationEntries` / `answerEntries` |
| `src/app/api/contribute/route.ts` | Writes to `memorial-church-contributions` |
| `src/app/admin/page.tsx` | Legacy pin-by-pin admin (still used for bulk archival import) |
| `src/app/page.tsx` | Main map orchestration |
| `src/app/globals.css` | Palette, `body { overflow: hidden; height: 100dvh }` |
| `src/components/Map.tsx` | Google Maps with 3D view + geolocation |
| `src/components/InquirySheet.tsx` | Pin-based inquiry sheet (photo-aware) |
| `src/components/AskSheet.tsx` | Free-form question sheet (photo-aware) |
| `src/components/PhotoDisplay.tsx` | Learner-facing photo renderer with annotation dots |
| `src/components/ServiceWorkerRegistrar.tsx` | PWA service worker |
| `src/lib/types.ts` | `Pin`, `PinPhoto`, `Photo`, `PhotoAnnotation`, `QuestionCategory`, etc. |
| `src/lib/pins-store.ts` | `getPins` / `savePin` against `memorial-church-pins` |
| `src/lib/seed-pins.ts` | 4-pin fallback when Firestore is empty |
| `src/lib/knowledge-db.ts` | Inlined knowledge DB as a TS string constant |
| `src/lib/hint-matcher.ts` | Question → category + hint injection |
| `src/lib/inquiry-counter.ts` | Random 2–4 direct inquiries before zoom-out |
| `src/lib/photo-matcher.ts` | `selectPhotoForResponse()` + `collectAllPhotos()` |
| `src/lib/archival-manifest.ts` | Static archival-photo manifest for bulk import |
| `src/lib/firebase.ts` | Client init (Firestore + Storage) |
| `src/lib/firebase-admin.ts` | Question logging via REST |
| `src/lib/sheets-logger.ts` | Google Sheets logger for learner interactions |

---

## 7. Firestore State

### Collections
| Collection | Contents | Notes |
|---|---|---|
| `memorial-church-pins` | 4 pin documents | Now carry `photoIds: string[]` stamped by the migration. Legacy `pin.photos` embedded arrays are still the runtime source of truth. |
| `memorial-church-photos` | 33 photo documents | Populated by the 2026-04-16 migration. One doc per unique URL with `linkedPinIds` pointing back at owning pins. All 33 are `type: archival`, `storageBackend: vercel-static` (URLs under `/photos/archival/`). |
| `memorial-church-migrations` | 1 doc: `photo_extraction_v1` | `{completedAt: "2026-04-16T09:55:32.555Z", summary: {…full MigrationSummary…}}`. Delete this doc in the Firebase console if you need to re-run the migration. |
| `memorial-church-questions` | Growing log | Each learner question with observation/answer/hints/timestamp. |
| `memorial-church-contributions` | Learner-submitted gaps | Written when the model admits it doesn't know something. |

### Security rules
Five sibling blocks, permissive test-mode. Full rules file (current published state):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /memorial-church-pins/{doc}          { allow read, write: if true; }
    match /memorial-church-contributions/{doc} { allow read, write: if true; }
    match /memorial-church-questions/{doc}     { allow read, write: if true; }
    match /memorial-church-photos/{doc}        { allow read, write: if true; }
    match /memorial-church-migrations/{doc}    { allow read, write: if true; }
  }
}
```

Any new collection requires a new `match` block before reads/writes work.

---

## 8. Environment State

### Build + dev server
- `npx tsc --noEmit` — clean.
- `npx next build` — clean, 8 routes (static: `/`, `/admin`, `/admin/photos`, `/admin/photos/new`, `/_not-found`; dynamic: `/admin/photos/[id]`, `/api/ask`, `/api/contribute`).
- `npm run dev` — starts on `localhost:3000` via Turbopack.
- `npm run lint` — clean.

### Required `.env.local`
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
ANTHROPIC_API_KEY=...
```
Plus a Google Sheets webhook URL for `sheets-logger.ts` (optional — fails silently if missing).

### Dependencies
- Next.js 16.2.3 (App Router, Turbopack)
- React 19.2.4
- firebase ^12.12.0
- Tailwind CSS 4
- TypeScript 5
- `@vis.gl/react-google-maps` 1.8.3

No `npm install` needed unless `package.json` changes. No SDK or CLI outside the repo needs to be present.

### Deployment
- Vercel project linked to `github.com/SeanHu73/memorial-church-tool` master. Auto-deploys on push.
- Archival photos served from `/public/photos/archival/*` (Vercel CDN). Firebase Storage holds admin uploads under `memorial-church/photos/[type]/...`.
- PWA manifest is wired up (`src/app/layout.tsx` sets `manifest: '/manifest.json'`).

### What works on the live site
- Map + all 4 pins.
- Inquiry flow (pin tap → observe → answer → loop ending).
- Ask flow (free-form question → observe → answer, with deepen + zoom-out).
- Photo display on observation and answer slots via the matcher.
- `/admin` legacy pin-by-pin editor.
- `/admin/photos` library with 33 migrated photos, editable per-photo with annotations + linked pins.
- Migration log download from `/admin/photos` (persistent row).
- Learner contribution writes.
- Question + interaction logging.

### What hasn't been exercised yet
- The Change 7 retrieval cutover (reading from `memorial-church-photos` instead of `pin.photos`).
- Any photo added *only* through `/admin/photos/new` that doesn't go through the bulk-import manifest or pre-existing embedded arrays. The sync mirror should handle it; needs a real test.

---

*End of handoff. Recent commits on master: `7521854` (admin scroll), `cd85d89` (migration artifacts), `d64b18a` (log download UI), `daadc62` (photo library core).*
