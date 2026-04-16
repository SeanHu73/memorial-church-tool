# Build State — Memorial Church Tool

*Handoff document for the next Claude Code session. Last updated 2026-04-16
after Change 7 retrieval cutover, Change 8 (session memory + post-response
validation + coverage-based zoom-out), and the **library-first photo
retrieval rewrite**. Read this instead of re-discovering the codebase.*

---

## 0. Library-first photo retrieval (latest, 2026-04-16)

Diagnostic on the live data found pin↔photo links were entirely empty in
Firestore: every pin had `photoIds: []` and `photos: []`; every photo had
`linkedPinIds: []`. The legacy pin-first matcher (`getPhotosForPin` →
`selectPhotoForResponse(pre-filtered subset)`) was therefore handing the
matcher empty arrays for every request → zero photos rendered.

**Fix landed this session:**
- `src/lib/photo-retrieval.ts` **deleted** (both `getPhotosForPin` and
  `collectAllPinPhotos` are gone — pin attachment is no longer a filter).
- `src/lib/photo-matcher.ts` **rewritten**: takes the FULL `Photo[]` library
  plus AI signals (`anchorUsed`, `observation`, `answer`,
  `observationEntries`, `answerEntries`, `questionCategory`,
  `currentLocation`, optional `currentPin`). Scores each candidate on
  IDF-weighted semantic overlap + entry/category/type/pin signals. Threshold
  `MIN_SCORE = 3`; below threshold returns `null` with a `console.log`
  showing the top three candidates so an empty slot is debuggable.
  - **Observation slot**: strict location filter (`currentLocation` or
    `'general'`). Prefers onsite. Query text is `anchorUsed || observation`.
  - **Answer slot**: visible/invisible heuristic
    (`isInvisibleContext()` checks for years <1990 + historical markers
    like "earthquake", "1906", "originally", "destroyed", "Jane Stanford",
    etc.). When the answer is *visible* context, the answer slot returns
    `null` (no duplicate of the observation photo). When *invisible*, the
    matcher searches the full library, prefers archival, and excludes the
    observation photo.
  - **Pin tiebreaker**: small `+0.5` boost if `currentPin` is in the
    photo's `linkedPinIds`. Never a filter.
- `InquirySheet.tsx` and `AskSheet.tsx` now pass `allPhotos` directly to
  the matcher with the new input shape. AskSheet no longer needs `getPins`
  (that import + the `allPins` state are gone).
- `PhotoDisplay.tsx` widened from `PinPhoto` to `Photo`.
- `/admin/photos/new` and `/admin/photos/[id]` save handlers normalise
  Windows backslashes in `url` (`\` → `/`) before writing to Firestore —
  prevents recurrence of the `north_nave_inscription` URL bug.
- Two missaved photos were patched directly in Firestore via a one-shot
  script (now deleted): `abade1a5…` (memchu_plaque_exterior) →
  `physicalLocationTag: 'exterior_facade'`; `1ef295e3…`
  (north_nave_inscription) → `physicalLocationTag: 'nave'` and
  `url: '/photos/onsite/north_nave_inscription.jpg'`.

`npx tsc --noEmit` and `next build` both clean. Verification on a real
walk-through still pending.

---

## 1. What's Built

### Changes 1–6 (from the build guide) — all complete
- **Change 1** — Three-option inquiry loop ending with alternating "Keep talking" / "Step back". The `inquiry-counter.ts` random rhythm is **gone** as of Change 8 — coverage-based gating in `session-memory.ts::isZoomOutAvailable()` replaces it.
- **Change 2** — Epistemic honesty rules baked into the system prompt in `src/app/api/ask/route.ts`.
- **Change 3** — Learner contributions: `memorial-church-contributions` collection + UI path in `InquirySheet.tsx` / `AskSheet.tsx` when the model admits a gap. Writes via `/api/contribute`.
- **Change 4** — Category-aware response differentiation (who/what/when/where/why/how) in the system prompt.
- **Change 5** — Photo data model: `PinPhoto` shape with `type`, `physicalLocationTag`, `databaseEntries`, `categories`, `annotations`, plus `PhotoAnnotation` with per-category clues.
- **Change 6** — Admin photo upload + annotation at `/admin` (see legacy pin-by-pin UI still present in `src/app/admin/page.tsx`). Firebase Storage under `memorial-church/photos/[type]/...`. Tap-to-annotate with per-category clues. First session where pins move from `seed-pins.ts` into Firestore.

### Change 7 — Learner-facing photo display + retrieval cutover: **complete (then superseded)**
- `src/lib/photo-matcher.ts` originally ranked pre-filtered pin-attached photos by location → database-entry overlap → category → slot-based type preference → annotation tiebreaker. **Superseded** by the library-first rewrite above (Section 0); the new matcher takes the full `Photo[]` library and uses IDF-weighted semantic scoring + a visible/invisible heuristic.
- `src/components/PhotoDisplay.tsx` renders a single photo (now typed `Photo`) with numbered annotation dots, source attribution line, and "Show hints" button revealing category-appropriate clues.
- **Cutover (earlier this session, then deleted)**: `src/lib/photo-retrieval.ts` defined `getPhotosForPin(pin, allPhotos)` + `collectAllPinPhotos(pins, allPhotos)` to resolve photos from the standalone `memorial-church-photos` collection via `pin.photoIds` → inverse `photo.linkedPinIds` → embedded `pin.photos` fallback. Both helpers were **deleted** in the library-first rewrite — pin attachment is no longer a filter, only a tiebreaker.
- `src/app/api/ask/route.ts` returns `observationEntries` + `answerEntries`. Client still falls back to a legacy `entriesUsed` field for older responses. (See Change 8 below for the additional `anchorUsed` / `quotationsUsed` fields.)

### Change 8 — Session memory, post-response validation, coverage-based zoom-out: **complete**
- **`src/lib/types.ts::SessionMemory`** — recent anchors (cap 3), recent quotations (cap 3), recent question categories (cap 5), `entriesEverUsed[]`, `locationsEverDiscussed[]`, `substantiveTurnCount`, `openZoomOutQuestions[]`. `AskResponse` now includes `anchorUsed: string | null` and `quotationsUsed: string[]`.
- **`src/lib/session-memory.ts`** — sessionStorage persistence (`mc_session_memory_v1`), `loadSessionMemory()`, `saveSessionMemory()`, `recordTurn()`, `addOpenZoomOutQuestion()`, `isZoomOutAvailable()` (≥2 substantive turns AND ≥2 entries-or-locations covered).
- **`src/app/api/ask/route.ts`** — accepts `sessionMemory` in body. Injects "SESSION SO FAR" block into the system prompt with recent anchors/quotations/categories/locations + turn count. The system prompt asks the model to return `anchorUsed` + `quotationsUsed` in the JSON response. After each model call, `validateResponse()` checks: word count >120, recycled anchor (case-insensitive), recycled quotation (`similarQuote()` substring matcher), banned phrases (`delve`, `tapestry`, `rich history`, `nestled`, `great question`, `let me break this down`, `here's the thing`). On failure the route appends the assistant's reply + a corrective user turn and retries up to 2× before shipping the last response. Zoom-out mode receives a `COVERAGE SO FAR` block listing entries + locations covered so the bridging question is concrete.
- **`InquirySheet.tsx` / `AskSheet.tsx`** — load `SessionMemory` via `loadSessionMemory()`, persist on every change. Threading `sessionMemory` into every `/api/ask` request. After each turn (including static reveal-answer in InquirySheet), call `recordTurn()` to update memory. The "Step back and see the bigger picture" option is gated by `isZoomOutAvailable(sessionMemory)`. Zoom-out questions are recorded in `openZoomOutQuestions` with their required coverage.
- **Retired**: `src/lib/inquiry-counter.ts` deleted. The localStorage random-counter is gone — gating is purely coverage-based now.

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

**Nothing half-modified.** Change 7 retrieval cutover and Change 8 (session memory + post-response validation + coverage-based zoom-out) just landed in this session and are uncommitted. Modified / new / deleted:
- **Modified**: `src/lib/types.ts`, `src/app/api/ask/route.ts`, `src/components/InquirySheet.tsx`, `src/components/AskSheet.tsx`, `docs/Build_State.md`, `docs/Memorial_Church_Build_Guide.md`.
- **New**: `src/lib/session-memory.ts`, `src/lib/photo-retrieval.ts`.
- **Deleted**: `src/lib/inquiry-counter.ts` (random rhythm replaced by coverage-based gating).
- Plus the usual locals: `.claude/settings.local.json` (never committed), `docs/.~lock.archival_photo_inventory.xlsx#` (Excel lock, ignored).

`npx tsc --noEmit` is clean, `npx next build` is clean, `npm run lint` shows 10 problems (all pre-existing — verified by stashing changes and re-running; baseline was 12, so this session is a net improvement of 2).

---

## 3. What's Pending

### Eventual `pin.photos` removal (`photo_embedding_removal_v1`)
Now that retrieval reads `memorial-church-photos` via `photo-retrieval.ts`, the embedded `pin.photos` array is dead weight kept only as the third-tier fallback. Once Sean has confirmed the new retrieval path is solid in production, a second migration can:
1. Delete `photo-pin-sync.ts` and stop double-writing.
2. Strip `pin.photos` and `pin.photoIds` (or keep `photoIds` as the canonical link) from every pin doc.
3. Remove the legacy `pin.photos` branch from `getPhotosForPin()` and the `PinPhoto` type itself.

Don't do this casually — the learner app would lose photos for any pin that hasn't yet been re-extracted.

### Cowork archival spreadsheet ingestion
Build guide lines 324 and 673 refer to ingesting the 30+ archival photos Cowork curated (`docs/archival_photo_inventory.xlsx`) automatically instead of by hand. The HABS + Highsmith + Calisphere bytes are already under `public/photos/archival/` and registered in `archival-manifest.ts`, so the remaining work is: compare the spreadsheet columns to what's already in the manifest, fill in missing metadata fields, and decide whether the bulk-import should move from the legacy `/admin` pin-walk to a new pass that writes directly into `memorial-church-photos`.

### Smaller loose ends
- **Pin `photoIds` from first failed migration run**: pins 1–4 briefly had `photoIds: []` stamped on them before the successful retry overwrote them with real IDs. Cosmetic only — retrieval falls through to inverse `linkedPinIds` lookup.
- **Pilot testing** — still blocked on Sean's verification pass through the photo library content + a real walk-through of the Ask flow now that session memory is enforced.
- **Firebase Storage upload diagnosis** (deferred from earlier this session) — uploads were stuck due to suspected CORS + bucket project mismatch. Picked back up only when needed.

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
- **Retrieval now reads `memorial-church-photos`** via `photo-retrieval.ts`, but the embedded `pin.photos` array is still written by the legacy `/admin` pin-by-pin form and still kept in sync by `photo-pin-sync.ts` as the last-resort fallback. Any photo that only exists in the embedded array (and was never extracted into the standalone collection) will still render via the legacy fallback — easy to forget when debugging missing photos.
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

### New this session (Change 7 cutover + Change 8)
| File | Purpose |
|------|---------|
| `src/lib/session-memory.ts` | sessionStorage-backed `SessionMemory` helpers: `loadSessionMemory`, `saveSessionMemory`, `recordTurn`, `addOpenZoomOutQuestion`, `isZoomOutAvailable` (≥2 substantive turns AND ≥2 entries-or-locations). |
| ~~`src/lib/photo-retrieval.ts`~~ | Created mid-session for the pin-first cutover, then **deleted** by the library-first rewrite. Pin attachment is no longer a filter. |

### Existing key files
| File | Purpose |
|------|---------|
| `src/app/api/ask/route.ts` | Claude API endpoint + system prompt; emits `observationEntries` / `answerEntries` / `anchorUsed` / `quotationsUsed`; runs `validateResponse()` + retry loop (max 2) and threads `SessionMemory` from the client into the prompt. |
| `src/app/api/contribute/route.ts` | Writes to `memorial-church-contributions` |
| `src/app/admin/page.tsx` | Legacy pin-by-pin admin (still used for bulk archival import) |
| `src/app/page.tsx` | Main map orchestration |
| `src/app/globals.css` | Palette, `body { overflow: hidden; height: 100dvh }` |
| `src/components/Map.tsx` | Google Maps with 3D view + geolocation |
| `src/components/InquirySheet.tsx` | Pin-based inquiry sheet. Loads the full photo library via `getPhotos()` and passes it to the matcher with `currentPin: pin` (tiebreaker only). Threads `SessionMemory`, gates zoom-out via `isZoomOutAvailable()`. |
| `src/components/AskSheet.tsx` | Free-form question sheet. Loads the full photo library via `getPhotos()` and passes it to the matcher with `currentPin: null`. Threads `SessionMemory` into every `/api/ask`. Records anchor + quotations + entries after each turn. |
| `src/components/PhotoDisplay.tsx` | Learner-facing photo renderer with annotation dots |
| `src/components/ServiceWorkerRegistrar.tsx` | PWA service worker |
| `src/lib/types.ts` | `Pin`, `PinPhoto`, `Photo`, `PhotoAnnotation`, `QuestionCategory`, `SessionMemory`, `OpenZoomOutQuestion`, `AskResponse`, etc. |
| `src/lib/pins-store.ts` | `getPins` / `savePin` against `memorial-church-pins` |
| `src/lib/seed-pins.ts` | 4-pin fallback when Firestore is empty |
| `src/lib/knowledge-db.ts` | Inlined knowledge DB as a TS string constant |
| `src/lib/hint-matcher.ts` | Question → category + hint injection |
| `src/lib/photo-matcher.ts` | `selectPhotoForResponse()` — library-first, slot-aware. Takes the full `Photo[]` library + AI signals + optional `currentPin` (tiebreaker only). IDF-weighted semantic scoring, threshold `MIN_SCORE = 3`, visible/invisible heuristic for the answer slot, debug logs when a slot returns null. |
| `src/lib/archival-manifest.ts` | Static archival-photo manifest for bulk import |
| `src/lib/firebase.ts` | Client init (Firestore + Storage) |
| `src/lib/firebase-admin.ts` | Question logging via REST |
| `src/lib/sheets-logger.ts` | Google Sheets logger for learner interactions |

**Removed this session**: `src/lib/inquiry-counter.ts` (random 2–4 rhythm replaced by coverage-based gating in `session-memory.ts`).

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
- `npm run lint` — 10 problems, all pre-existing (verified by stashing this session's changes; baseline was 12, so net improvement of 2).

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

### What works on the live site (last deployed commit)
- Map + all 4 pins.
- Inquiry flow (pin tap → observe → answer → loop ending).
- Ask flow (free-form question → observe → answer, with deepen + zoom-out).
- Photo display on observation and answer slots via the matcher.
- `/admin` legacy pin-by-pin editor.
- `/admin/photos` library with 33 migrated photos, editable per-photo with annotations + linked pins.
- Migration log download from `/admin/photos` (persistent row).
- Learner contribution writes.
- Question + interaction logging.

### What hasn't been exercised yet (Change 7 cutover + Change 8 — uncommitted)
- The new photo-retrieval path (`getPhotosForPin` reading the standalone `memorial-church-photos` collection). Build is green and types check, but no real walk-through has been done. Risk surface: pins with no `photoIds` and no `linkedPinIds` from the inverse lookup — those should still render via the legacy `pin.photos` fallback, but worth confirming.
- Session-memory persistence + post-response validation on a real Ask flow. The validate/retry loop is server-side and will silently retry up to 2× on banned phrases / recycled anchors / recycled quotations / >120-word answers; whether it actually catches what we want it to catch needs a real conversation to verify.
- Coverage-based zoom-out gating (`isZoomOutAvailable`). Needs a multi-turn Ask session to confirm it offers "Step back" only after ≥2 substantive turns + ≥2 entries-or-locations covered.

---

*End of handoff. Recent commits on master: `374566e` (gitignore office locks + local perms), `7754217` (this Build_State doc itself, prior version), `7521854` (admin scroll), `cd85d89` (migration artifacts). Change 7 cutover + Change 8 work is uncommitted in the working tree.*
