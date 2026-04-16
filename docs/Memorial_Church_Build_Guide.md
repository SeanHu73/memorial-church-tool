# Provenance — Memorial Church Learning Tool: Build Guide

*Sean Hu · LDT Project · Stanford*
*April 2026*

---

## Purpose

This document is the build guide for a standalone learning tool focused on Stanford Memorial Church. The tool serves as a research instrument for the broader Provenance project: by letting real learners explore Memorial Church through a guided, question-driven interface, we will develop a deeper understanding of the types of questions learners naturally ask when engaging with a place — and how those questions evolve during exploration.

The tool also serves as a prototype for the Provenance "Investigate the Collection" pathway, where a curated knowledge base replaces live search, and a language model mediates between the learner's curiosity and the available information.

---

## Design Principles

### 1. Questions drive the experience; answers invoke the place; context reveals the bigger picture

The tool poses questions to a group (likely a pair) to discuss *before* revealing more. Questions should direct attention toward physical observation of the place — what you can see, touch, notice, compare. The learner should be looking at Memorial Church, not reading a screen.

Answers, when revealed, should be told as **narrative** — not encyclopedia entries. The tone should invoke imagination, excitement, and understanding by connecting the observable present to the invisible past. The reader should feel the weight of the stones, picture Jane Stanford climbing scaffolding with her parasol, hear the 4,500 pipes of the Fisk-Nanney organ filling the nave.

**Context is a north star, not an afterthought.** The learning experience is not only about what sits directly in front of the learner — it's about how that object, detail, or space relates to the things around it, the time it comes from, and the broader historical currents that shape what we're seeing today. This is place-making and sense-making. The church is not an isolated building. It sits at the centre of the Main Quad, which connects to the Memorial Arch (destroyed 1906), which sits near the Clock Tower (containing the salvaged face of the lost spire), which relates to the Cantor Arts Center (built by the same Salviati artists), which connects back to Venice and to the Gilded Age American West. The pins on the map are not isolated stops — they are points in a web of relationships, and moving between them is how learners come to understand the whole.

Context matters because it stirs the imagination. Seeing that a detail on a pendentive connects to a Byzantine church in Ravenna, or that the stones of the facade were shipped because San Jose quarries couldn't supply them fast enough, or that the same artists made the mosaics on the Cantor — these connections validate what the learner sees with the accumulated knowledge other humans have built about this place. They anchor the experience in history and community.

**How this shows up in the inquiry loop:** the default question is always directly observational — look at this, notice that, touch this. But periodically (roughly every 2–3 inquiries, with some randomness so it doesn't feel like a preset pattern), the question should pull the learner back to see the bigger picture. What connects this to what you just saw? How does this fit into the wider campus? What was happening in the world when this was built? These zoom-out moments should not replace direct observation but punctuate it — shifting the focus from the object to the object-in-context, then back again.

The implementation: after each direct-observation pin completes its inquiry loop, the system tracks how many consecutive direct-observation questions have been asked. On the 2nd, 3rd, or 4th (chosen randomly each time), the "Keep talking about this" option in the three-option ending is replaced by a "Step back and see the bigger picture" option — a question that connects what they just saw to something broader in time, place, or theme. The language model generates this broader question using the same knowledge base, but the system prompt flags it as a context-prompting response (not a direct-observation one). After the zoom-out, the pattern resets and the next few inquiries return to direct observation. This rhythm — close, close, pull back, close, close, pull back — mirrors how people actually learn to see a place.

### 2. The knowledge base is contained, not live

The tool does not search the web in real time. Instead, a language model draws from a pre-built, verified knowledge database about Memorial Church. This means:

- The database must be comprehensive enough to answer a wide range of learner questions
- Information must be organised so the model can retrieve relevant facts efficiently
- All facts must be traceable to verifiable sources (the references list)
- The database should distinguish between well-established facts and interpretive claims

### 3. Photos are optional, additive, and multi-source

Photos are not a prerequisite for a pin to work. A pin with no photos should render and function fully — question, observation, answer, three-option ending all work without any image. Photos are a layer that gets added when available, not a dependency that blocks functionality.

**Photo architecture principles:**

- **Array, not singleton.** Each pin holds an array of photos, not a single photo field. A pin might have zero photos, one on-site photo, one archival photo, or several of each. The data model supports this from the start.
- **Typed by source.** Each photo has a `type` field: `"onsite"` (taken by Sean or a future storyteller during a site visit), `"archival"` (downloaded from a digital archive by Cowork, with source attribution and licence), or `"contributor"` (added by a learner to supplement an existing answer). The UI can display these differently — e.g., archival photos get a date/source caption, contributor photos get a "community contributed" label.
- **Loaded from data, never hardcoded.** Photos are referenced in Firestore or the pin data layer by URL or storage path. They are never imported as static files or hardcoded as placeholder paths. This means when a new photo is added — whether by uploading an on-site shot, Cowork downloading an archival image, or a user contributing — it slots into the existing data model without touching component code.
- **No placeholders.** The system should never display a grey box or "image coming soon." If there's no photo, the pin shows text only and that's fine. When a photo appears in the data, it renders. This prevents the rewire-every-time problem.

**Photo data model (per pin):**
```javascript
photos: [{
  url: string,                    // path to file (e.g., "/photos/archival/jane_stanford_1897.jpg")
  type: "onsite" | "archival" | "contributor",
  caption: string,                // what the learner reads when the photo appears
  credit: string,                 // photographer or archive (e.g., "Carol M. Highsmith, 2013")
  source: string | null,          // URL of the original archive source
  year: string | null,            // when the photo was taken
  license: string | null,         // licence status (e.g., "Public domain")
  physicalLocationTag: string,    // exterior_facade | narthex | nave | crossing | dome | chancel | transepts | side_chapel | organ_loft | general
  databaseEntries: string[],      // which knowledge base entries this photo illustrates (e.g., ["3.1", "6.1"])
  categories: QuestionCategory[], // which inquiry angles this photo primarily serves (e.g., ["what", "when"] for a before/after photo)
  annotations: [{                 // optional tap-to-reveal hints on specific points in the photo
    x: number,                    // percentage position (0-100)
    y: number,
    caption: string,
    categories: string[],         // ["who", "what", "when", etc.]
    clues: {
      who?: string,
      what?: string,
      when?: string,
      where?: string,
      why?: string,
      how?: string
    }
  }]
}]
```

**Why the last three fields matter for the AI:**

- `physicalLocationTag` lets the app surface the right photo when a learner is at a specific place in the church. A photo tagged `dome` should appear when someone is asking about the dome, regardless of which pin they started from.
- `databaseEntries` tells the AI which photos illustrate which knowledge. When the AI's answer draws from Entry 3.1 (facade mosaic) and Entry 6.1 (1906 earthquake), the app can show photos linked to either entry — without the AI having to guess what to display.
- `categories` at the photo level means a photo about "when the spire fell" primarily serves "when" and "what" questions. Combined with annotation-level categories, this gives the AI a two-tier signal: the photo as a whole has emphasis, and specific points within the photo have finer-grained emphasis.

Knowledge entries should be tagged with physical locations (facade, narthex, nave, crossing, chancel, transepts, organ loft, etc.) so that questions, answers, and photos can be surfaced contextually as a learner moves through the space.

### 4. The Inquiry Loop

The learning experience is a continuous loop, not a linear tour. Here is the full logic:

**Step A: Place-based prompt.**
The app identifies a place to look and presents a question. When a photo exists for that location (uploaded by the user/storyteller), the photo is shown alongside the question. The photo may include annotations — specific points the storyteller has marked and captioned. These annotations are hidden by default and available as optional "hints" the learner can tap to reveal before or during discussion.

**Step B: Discussion pause.**
The pair discusses. No timer — they tap "We've looked — show us more" when ready.

**Step C: Narrative answer.**
The AI generates a response drawn from the knowledge database. The response is grounded in what the learner can observe, written in narrative voice, and capped at roughly 100 words (30 seconds of reading). The response should incorporate any relevant photo annotations as part of its narrative — connecting what the storyteller pointed out to the historical context.

**Step D: Conversation-starting question.**
At the END of every response, the model asks a follow-up question designed to spark conversation between the pair. This question should vary in type across the experience:
- **Theory-building:** "Why do you think Jane Stanford chose this particular scene? What does your pair think it says about her values?"
- **Observational:** "Look at the left side of the mosaic compared to the right. Can you spot where the 1906 restoration begins?"
- **Personal/reflective:** "If you were building a memorial to someone you loved, what would you want people to notice first?"
- **Historical imagination:** "Imagine standing here in 1906, the morning after the earthquake. What would you see?"

The model should not repeat the same type of follow-up question consecutively. It should track what it has asked recently and rotate.

**Step E: The learner chooses what's next.**
After the response and follow-up question, the learner sees three options:
1. **A suggested place to look next** — a tappable card showing another pin with a teaser: "This connects to something you can see in the chancel..." Tapping this restarts the loop at Step A for the new location.
2. **"Keep talking about this" OR "Step back and see the bigger picture"** — only one of these appears at a time. By default, the option is "Keep talking about this" — a reflective, personal, or theory-building question about the current location that doesn't require moving. But after 2–3 consecutive direct-observation inquiries (chosen randomly — 2, 3, or 4 — so the pattern doesn't feel preset), this option is replaced with "Step back and see the bigger picture" — a context-prompting question that pulls the learner's attention away from the immediate object and toward its place in the larger story. Examples: "What does this detail tell you about what was happening in California when this church was built?" or "You've been looking at the mosaic up close — now turn around and look at the Quad. How does this church fit into the campus around it?" After a zoom-out question is asked, the counter resets and the next few inquiries return to direct-observation defaults.
3. **"Ask your own question"** — a text input where the learner types whatever they're curious about. The model finds the most relevant location in the database, directs the learner to look at that place (restarting at Step A), and generates a contextual response.

The loop continues until the learner stops. Every path leads back to observation — but the rhythm of close-close-zoom-out ensures that learners don't get tunnel vision on a single object. They come to see the church as a web of relationships, not a sequence of isolated details.

### 5. Photo annotations as storyteller contributions

Photos uploaded by storytellers (or by Sean for the initial seed data) should include an annotation layer:
- Storytellers can tap on specific points in their photo to add captions (e.g., tapping the left side of the facade mosaic and writing "this gold tile looks newer than the surrounding area — restored after 1906")
- Each annotation is tagged by the storyteller with one or more inquiry categories: **who**, **what**, **when**, **where**, **why**, **how**
- The storyteller also writes a brief sentence for each category tag explaining what clue the annotation provides for that type of question (e.g., for "when": "The colour difference between left and right tells you this wasn't all made at the same time")
- These annotations serve two purposes: (1) they are "hints" the learner can optionally reveal during exploration, and (2) they are structured metadata the AI uses to give more specific, differentiated answers depending on the type of question asked

### 6. Inquiry categories and AI response differentiation

The knowledge database entries are tagged with inquiry categories: **who**, **what**, **when**, **where**, **why**, **how**. This is NOT about narrowing the model's response — it's about helping the model understand the *angle* of the question so it can emphasise different aspects of the same information.

For example, Entry 3.1 (the facade mosaic) contains information that answers all six categories. But the response should sound different depending on the angle:
- **Who:** Emphasise Paoletti, Camerino, Jane Stanford's involvement, the 12 men who spent two years installing it
- **What:** Emphasise the physical description — 84 feet wide, 30 feet tall, 47 figures, smalti glass tesserae
- **When:** Emphasise the timeline — designed 1900, installed over five years, destroyed 1906, restored 1913-1917
- **Where:** Emphasise the physical location, the facade's relationship to the Quad, what you can see from different angles
- **Why:** Emphasise Jane Stanford's motivation, the non-denominational philosophy, why she chose mosaics (Italian climate parallel), the contested naming
- **How:** Emphasise the Salviati fabrication process, the 20,000 shades, the reverse-mounted tesserae, the coded shipping sections

The categories don't restrict what the model says — they tell it where to put the emphasis. The model should still draw connections across categories when they're relevant. The goal is to prevent the "everything sounds the same" problem you're seeing, where a "who" question and a "why" question return near-identical responses.

### 7. Narrative voice principles (for answer delivery)

When the tool delivers information to learners, it should:

- **Start with what they can see.** Ground every answer in an observable detail before going to backstory.
- **Use concrete sensory language.** Not "the mosaics are impressive" but "over 20,000 shades of glass tesserae, each roughly the size of a sugar cube, catch the light differently depending on where you stand."
- **Make the people real.** Jane Stanford is not an abstract patron — she is a woman who notched her parasol to measure stone carving depth, who climbed scaffolding in long skirts, who told Camerino she wanted women represented equally in the mosaic work.
- **Let surprises land.** The cherubs on the sandstone columns are modelled on the children of faculty and staff who lived on campus during construction. The only stained glass window ever damaged was broken during a game of Frisbee golf. Let these moments breathe.
- **Acknowledge what's missing or contested.** The facade mosaic is popularly called "The Sermon on the Mount," but historian Richard Joncas insists it doesn't actually depict that scene. The twelve apostle statues in the chancel niches were destroyed in 1906 and never replaced. The original dome fresco — God's eye looking down, complete with a tear — was replaced by the current skylight. These absences and disputes are as interesting as what's present.
- **Connect the specific to the larger story.** A detail about the Salviati studio connects to the restoration of St. Mark's Basilica in Venice. The Fisk-Nanney organ connects to Charles Fisk's journey from Manhattan Project physicist to organ builder. The 1906 earthquake connects to the decision about what to rebuild and what to let go.

### 8. Epistemic honesty: the model must know what it doesn't know

The model should never fabricate, speculate, or stretch to fill a gap. When a learner asks a question that the knowledge database cannot answer with confidence, the model should:

1. **Acknowledge the gap honestly.** "I don't have specific information about that in my knowledge base" — said plainly, without apology or hedging.
2. **Offer related context if it exists.** "What I do know is..." — connect the question to whatever nearby information IS in the database. This gives the learner something useful without pretending to answer a question the model can't.
3. **Turn it back to the learner as genuine inquiry.** "How do you think you might find that out?" or "What clues can you see here that might point toward an answer?" This is not a deflection — it's the pedagogical core of the tool. The learner practicing how to investigate is more valuable than the model providing a shaky answer.
4. **Invite contribution.** "If you find something out, you can add it here — that's how this knowledge base grows." Learner contributions become part of the system, expanding the database over time.

This principle is non-negotiable. The tool's credibility depends on the learner trusting that when the model DOES answer, the answer is grounded in verified information. One fabricated answer destroys that trust. An honest "I don't know" builds it.

**Future consideration: verification of learner contributions.** When learners contribute information back into the system, that information is unverified and should be marked as such. A future iteration could include a rating or verification system — other learners or a curator could confirm, challenge, or source-check contributions. For now, contributions should be stored separately from the verified database and flagged as community-contributed.

---

## Knowledge Database Architecture

The database is structured as a JSON document with entries organised by **topic domain** and tagged with **physical location**, **era**, and **knowledge type**. This structure allows the language model to:

1. Find relevant information when a learner asks a question
2. Ground answers in specific physical locations
3. Distinguish established facts from interpretive claims
4. Cite sources for verification

### Topic Domains

1. **Founding & People** — The Stanford family, Jane Stanford's vision, key figures (Coolidge, Camerino, Paoletti, Lamb, McGilvray, Gardner, Fisk, etc.)
2. **Architecture & Construction** — Design, materials, structural features, the Quad connection
3. **Mosaics** — Exterior facade, interior nave, chancel, pendentive angels, dome, narthex floor, techniques (tesserae, smalti, fabrication process)
4. **Stained Glass** — Lamb's windows, subjects, techniques (layering, double-painting), specific notable windows
5. **Organs & Music** — Five organs, Charles Fisk's story, the Murray Harris, organists
6. **Earthquakes & Restoration** — 1906 damage, dismantling and reconstruction, 1989 Loma Prieta, seismic strengthening, what was lost forever
7. **Religious & Spiritual Life** — Non-denominational founding, evolution of sectarian policy, chaplains, notable speakers, the founding grant debates
8. **Notable Events & Stories** — First wedding, the Arlis Perry case, the Dalai Lama, the Frisbee golf incident, the stolen/returned mosaic fragments
9. **Inscriptions & Symbols** — Wall inscriptions, Latin epigraphs, quatrefoils, recurring motifs (angels, the Lamb of God, the four evangelists)
10. **Connections** — Links to other Stanford landmarks (the Quad, the Memorial Arch, the Cantor Arts Center, the Mausoleum), links to Venice and European churches

### Physical Location Tags

- `exterior_facade` — The north-facing front, visible from the Quad
- `exterior_sides` — Lateral views, connection to arcades
- `narthex` — The vestibule/entrance area
- `nave` — The main central hall
- `nave_aisles` — Side aisles with stained glass
- `crossing` — The central intersection under the dome
- `dome` — The dome and pendentive angels
- `chancel` — The altar area, Last Supper mosaic, niches
- `transepts` — East and west arms of the cruciform
- `side_chapel` — West transept chapel (post-1989)
- `organ_loft` — The gallery above the narthex
- `exterior_rear` — The apse, viewed from outside

### Knowledge Types

- `fact` — Verifiable, well-sourced information
- `interpretation` — Scholarly or expert reading of evidence
- `anecdote` — Stories, legends, and memorable incidents
- `observation_prompt` — Things a visitor can look for and verify in person
- `absence` — Things that are no longer there or were never completed
- `connection` — Links to other places, people, or historical contexts
- `contested` — Information where sources disagree

### Inquiry Categories (for tagging database entries and photo annotations)

- `who` — People: creators, builders, patrons, communities, historical figures
- `what` — Physical description: materials, dimensions, visual features, what you can see
- `when` — Timeline: dates, sequences, eras, what happened before/after
- `where` — Location: physical position, spatial relationships, connections to other places
- `why` — Motivation: intentions, beliefs, decisions, contested interpretations
- `how` — Process: techniques, methods, construction, fabrication, restoration

Each database entry and each photo annotation can have multiple category tags. The tags tell the AI which angle to emphasise, not which information to exclude.

---

## How the Knowledge System Fits Together

*This section explains how database entries, photos, pins, observation hints, and learner contributions all connect, and how the AI pulls from them to generate an answer.*

The system has five layers of content. Each layer has its own purpose and tagging structure, but they all share one thing: physical location tags. A learner standing in the chancel should see questions, photos, hints, and answers that are anchored to the chancel.

**Layer 1: Knowledge database entries** — The verified facts, stories, and interpretations. Each entry has an ID (e.g., `3.1`, `6.1`), a topic domain, a physical location tag, a knowledge type (fact/interpretation/anecdote/absence/contested), and inquiry category tags for the richer entries. This is what the AI reads to generate answers. The entries live in `src/lib/knowledge-db.ts`.

**Layer 2: Pins** — The points on the map a learner can tap. Each pin corresponds to a physical location (narthex, chancel crossing, organ loft, etc.) and references one or more database entries. Pins live in `src/lib/seed-pins.ts`. Each pin has an `inquiry` field (the opening question) and an `answer` field (pre-written for the seed pins, generated by the AI for free-form questions).

**Layer 3: Observation hints** — Pre-written clues attached to each pin, tagged by inquiry category. These tell the AI where to direct the group's attention before answering a specific type of question. When someone asks a "how" question, the `how` hint for the relevant pin is injected into the prompt so the AI can say "Together, look at the left edge of the mosaic and notice..." These live on pins in `seed-pins.ts`.

**Layer 4: Photos** — Visual evidence attached to pins. Each photo has a type (onsite/archival/contributor), a caption, credit, source, licence, a physical location tag (so photos surface at the right place), linked database entry IDs (so the AI knows which photos illustrate which knowledge), and inquiry categories at the photo level. Photos can optionally have annotations — tap-targets on specific points within the photo, each with its own caption and category-tagged clues.

**Layer 5: Learner contributions** — Unverified information submitted by learners when the AI doesn't know something. Stored in the `memorial-church-contributions` collection, isolated from the verified database. The AI never reads from this collection. Contributions are reviewed manually and, if verified, can be promoted into the main knowledge base.

### How the AI pulls knowledge when answering

When a learner asks a question, the system:

1. **Classifies the question by category** (who/what/when/where/why/how) via `hint-matcher.ts`.
2. **Identifies the relevant location** — either from the pin the learner tapped, or from the question content if they typed it freely.
3. **Gathers relevant knowledge entries** from `knowledge-db.ts` matching the location and topic.
4. **Gathers matching observation hints** from the pin for the classified category.
5. **Gathers relevant photos** whose `physicalLocationTag` matches the location and whose `databaseEntries` overlap with the entries from step 3.
6. **Constructs the system prompt** with all of this — knowledge entries, hints, photo captions, and instructions about category emphasis — and sends it to the model.
7. **Returns a JSON response** with an observation (where to look) and an answer (the narrative).

### What tagging you need to maintain

For each new piece of content added to the system:

- **New database entry**: give it a domain, physical location tag, type, inquiry category tags (at least for "key" entries — the AI uses these to differentiate responses), and sources.
- **New pin**: give it a physical location tag and reference the relevant database entry IDs in its `relatedEntries` field.
- **New observation hint**: attach it to a pin with a category tag and a `lookAt` + `clue` pair.
- **New photo**: give it the archival/onsite/contributor type, a caption, physical location tag, linked database entry IDs, and inquiry categories. Archival photos that come from Cowork arrive with most of this already filled in (from the spreadsheet).
- **New annotation on a photo**: add x/y coordinates, a caption, categories, and a one-sentence clue per category.

The physical location tag is the most important field across all layers — it's what lets the system surface the right content at the right place.

---

## Build Sequence

1. ~~**Create this build guide**~~ ✅
2. ~~**Create the references list**~~ ✅
3. ~~**Create the knowledge database**~~ ✅ (with inquiry categories on key entries)
4. **Contextual photo integration (Cowork)** — Use Cowork to download and tag historical/contextual photos from digital archives. Do this BEFORE the site visit so you can review archival images and know what to look for in person. See "When to Bring Cowork In" below. **← NEXT**
5. **Photo reconnaissance (on-site)** — Sean visits Memorial Church to photograph specific details referenced in the database (for pinning). Bring the photo checklist. Having already reviewed the archival images from Step 4, you'll know which details to look for and can compare what's there now to what the archives show.
6. **Seed photos and annotations** — Upload photos, create annotations on each photo (tap to mark specific points, write captions, tag each annotation with inquiry categories and per-category clue sentences). This is the content layer that makes the inquiry loop work. Without annotated photos, the app has no visual hooks for questions.
7. **Workshop question framing** — Using the database as raw material, workshop the best discussion prompts for pairs
8. ~~**Build the tool interface (Claude Code)**~~ ✅ Core built — see "Current Build Status" below. Remaining work: three-option inquiry loop ending, photo display with annotations, learner contributions collection.
9. **Pilot test** — Deploy with a small group exploring Memorial Church

---

## Current Build Status (as of April 2026)

*This section documents what Claude Code has actually built. Update after each build session.*

### Technical Stack (implemented)
- **Framework:** Next.js 16 + TypeScript + Tailwind CSS (App Router, `src/` directory)
- **Map:** Google Maps JavaScript API via `@vis.gl/react-google-maps` — hybrid 3D satellite view, tilt 45°, geolocation with blue pulsing dot, gold pin markers
- **AI:** Claude API (Anthropic Messages API) using `claude-haiku-4-5-20251001`
- **Database:** Firebase Firestore (REST API, no firebase-admin SDK dependency)
- **Hosting:** Vercel (deployed)
- **PWA:** Installable via `manifest.json`, service worker, PNG icons (192×192 and 512×512)

### What's built and working

**Map view:** 3D hybrid satellite view centered on Memorial Church. Geolocation with live-tracking blue pulsing dot. Gold pin markers (#B8943E) that turn mosaic-blue (#1B3A5C) when selected. Locate button to center on user position (zoom 19).

**Pin-based inquiry flow (InquirySheet):** Tap a pin → see a question prompting the group to observe something specific → "We've discussed it — show us more" button → reveals narrative answer → suggested next pin.

**Free-form question flow (AskSheet):** Explorer types question → four phases: input → loading → observe → answer. If the model returns an observation, the group sees that first with "We've looked — tell us more" before the answer. If no observation fits, goes straight to the answer.

**Observation hints system:** Human-authored clue layer in `src/lib/seed-pins.ts`. Each pin has observation hints tagged by question category (who/what/when/where/why/how). `hint-matcher.ts` classifies incoming questions by category using keyword regex, finds matching hints, injects them into the system prompt.

**Question logging:** Every question logged to Firestore collection `memorial-church-questions` with question, observation, answer, hint count, and timestamp.

**Seed content:** 4 pins with full observation hints:
1. The Facade Mosaic (exterior) — entry 3.1
2. The Narthex Floor (narthex) — entry 3.6
3. The Pendentive Angels (crossing) — entry 3.4
4. The Chancel & Last Supper (chancel) — entry 3.5

### What's NOT built yet
- **Three-option inquiry loop ending** — currently only suggests the next pin. Needs: suggested place / keep talking / ask own question (Design Principle 4, Step E).
- **Photos on pins** — pins are text-only. No on-site or archival photos displayed yet. Data model needs to support the array-based, multi-source photo architecture (Design Principle 3).
- **Photo upload interface** — there is no way for anyone (Sean or future contributors) to upload photos to a pin through the app. Currently requires code changes. Needs: a contributor-facing UI where a user can select a pin, upload a photo (camera or gallery), set the type (onsite/archival/contributor), write a caption, and optionally add annotations.
- **Photo annotation interface** — there is no UI for adding annotations to photos. Needs: a tap-to-annotate flow where a contributor taps a point on a photo, writes a caption, tags it with inquiry categories (who/what/when/where/why/how), and writes per-category clue sentences. This is how the observation hints get attached to specific visual evidence.
- **Photo annotation display** — the annotation data model exists in seed-pins.ts but there's no explorer-facing UI for viewing annotations as hints on photos. Needs: subtle dots on photos that reveal captions when tapped, with a "Show hints" button.
- **Learner contributions** — no `memorial-church-contributions` Firestore collection or submission UI.
- **Pins are local only** — `memorial-church-pins` Firestore collection was never created; pins live in `seed-pins.ts`.
- **No contributor interface** — adding new pins or observation hints requires code changes.

### Key files
| File | Purpose |
|------|---------|
| `src/app/api/ask/route.ts` | Claude API endpoint + system prompt |
| `src/lib/knowledge-db.ts` | Knowledge database (inlined as TS string constant) |
| `src/lib/seed-pins.ts` | 4 seed pins with observation hints |
| `src/lib/hint-matcher.ts` | Question classification + hint injection |
| `src/lib/types.ts` | Pin, ObservationHint, QuestionCategory types |
| `src/lib/firebase-admin.ts` | Firestore question logging (REST API) |
| `src/lib/firebase.ts` | Client-side Firebase init |
| `src/components/Map.tsx` | Google Maps with 3D view + geolocation |
| `src/components/InquirySheet.tsx` | Pin-based inquiry bottom sheet |
| `src/components/AskSheet.tsx` | Free-form question bottom sheet |
| `src/app/page.tsx` | Main page orchestrating everything |
| `src/app/globals.css` | Warm palette, typography, animations |

### AI Response Protocol (implemented in `route.ts`)

The model's system prompt enforces:

**Identity:** A knowledgeable, warm companion. Not a textbook, chatbot, or scripted tour guide — a friend who has spent years falling in love with this building.

**Response format:** Raw JSON: `{"observation": "...or null", "answer": "..."}`

**Observation field (strongly preferred):**
- Strong default is to include one. Before giving information, direct the group to look at something specific and physical.
- Be specific and spatial — not "look around the church" but "Face the altar and look at the twelve golden niches that line the lower chancel walls."
- 1–3 sentences. Address the group: "Together, look at..." / "Find the..." / "Turn toward..."
- `null` only when the question genuinely has no physical connection. This should be rare.
- Concrete anchors for abstract questions: "Who built it?" → carved stone arches or the plaque naming Jane Stanford. "Why was it built?" → the inscription on the facade. "When?" → the arcades connecting church to Quad. "What style?" → the exposed-timber ceiling.

**Answer field:**
- When observation was given: write knowing the group has already been looking at what was pointed out. Connect narrative to what they just saw.
- When null: lead with narrative directly.

**Voice — vary approach, never repeat the same pattern:**
- Begin with a vivid detail
- Begin with the human story
- Begin with a surprise
- Begin with what's missing
- Begin with a gentle contradiction
- Begin with an anecdote

**Sentence rhythm:** Vary length. Short after long. Let some breathe and unfurl. Then stop short.

**What to avoid:** "Great question!" or meta-commentary. Bullet points or numbered lists. AI-assistant style ("Here's the thing:", "Let me break this down"). "Delve," "tapestry," "rich history," "nestled." Repetitive rhythm (short-short-short).

**Length:** 60–120 words.

**Endings (vary which is used):** A specific thing to look for next. A question that deepens thinking. A thread to somewhere else in the church.

**Honesty:** If the question is beyond the database, say so naturally and redirect to something observable. Never invent facts.

**Observation hints:** When contributor-authored hints match the question's category (who/what/when/where/why/how), they're injected into the prompt as physical anchors the model can use to craft its observation. These come from `seed-pins.ts` via `hint-matcher.ts`.

---

## Next Claude Code Session — What to Build

*This section tells Claude Code exactly what to implement next. Read the full build guide for context, then execute these changes.*

### Change 1: Three-option inquiry loop ending

Currently, after the AI response, the app only suggests the next pin. This needs to become three options.

**In both `InquirySheet.tsx` and `AskSheet.tsx`, after the answer is revealed, show three tappable options:**

**Option 1: "See something connected"**
A card showing the suggested next pin with a teaser (e.g., "This connects to something in the chancel..."). Tapping it loads the new pin's inquiry — same behaviour as the current "next pin" suggestion, but now it's one of three choices, not the only one.

**Option 2: "Keep talking about this" OR "Step back and see the bigger picture"** (alternating)

Only ONE of these appears at a time, based on an inquiry counter the app tracks.

**Default — "Keep talking about this":**
A card that, when tapped, sends a request to the Claude API asking for a personal/reflective or theory-building follow-up question about the CURRENT location. The response should NOT direct attention to a new place — it should deepen conversation where they are. Add `mode: "deepen"` to the API call so the system prompt knows to generate a reflective question rather than an informational answer.

**Periodically — "Step back and see the bigger picture":**
After every 2, 3, or 4 consecutive direct-observation inquiries (choose the number randomly each time so the pattern doesn't feel preset), replace the "Keep talking" option with a zoom-out option. When tapped, it sends `mode: "zoom_out"` to the API. The system prompt for this mode should say: "Generate a question that pulls the group's attention away from the specific object they've been looking at and toward the bigger picture — how this place connects to the wider campus, the historical era, the broader themes of the Stanford story, or the world outside Memorial Church. The question should invite them to think about context, connections, and place-making. Reference something the learner can physically do — turn around, look across the Quad, think about what was happening in California in [relevant era]. Keep it to 1–2 sentences."

After a zoom-out response, reset the counter. The next few inquiries default back to "Keep talking about this."

**Implementation detail:** Store the counter in component state or Firestore (per session). Increment it after every non-zoom-out inquiry. When it reaches the random target (2, 3, or 4), swap the UI button and send the `zoom_out` mode flag. On the next inquiry after a zoom-out, pick a new random target and start counting again.

The response after either option ends with the same three options, so the loop continues.

**Option 3: "Ask your own question"**
A text input field. This already exists in AskSheet — but now it should also appear as an option at the end of every answer in InquirySheet. When typed from InquirySheet, it should:
1. Send the question to the Claude API
2. If the model's answer involves a different physical location, direct the learner there (show the observation first, then the answer — same flow as AskSheet)
3. If the model's answer is about the current location, show it inline and then show the three options again

**Design:** The three options should be styled as soft, tappable cards in the warm palette. Option 1 gets a subtle arrow/direction icon. Option 2 gets a conversation/thought icon when showing "Keep talking about this" and a zoom-out/horizon icon (a lens widening, or a compass rose) when showing "Step back and see the bigger picture" — the visual change signals the shift in depth. Option 3 is a text input with a send button.

### Change 2: Epistemic honesty in the system prompt

Update the system prompt in `src/app/api/ask/route.ts` to add this block after the existing honesty instruction:

```
EPISTEMIC HONESTY — CRITICAL:
Before responding, assess whether the knowledge database contains specific, verified information that directly answers what is being asked.

If you have clear, relevant information: answer confidently.

If you have related but not directly relevant information: say "I don't have specific information about that" plainly. Then offer what you DO know: "What I do know is..." Then turn it back: "What clues can you see here that might help you figure it out?" or "How would you try to find that out?"

If you have nothing relevant: say so plainly. Ask the learner to consider the question themselves — what they can observe, what they might infer. Suggest they contribute what they discover.

NEVER fabricate, speculate, or stretch thin information to sound authoritative. An honest "I don't know" is always better than a plausible-sounding guess.
```

### Change 3: Learner contributions collection

When the model responds with an "I don't know" answer, the UI should show an additional option: "Share what you found" — a text input where the learner can submit their own information.

Store contributions in a separate Firestore collection `memorial-church-contributions`:

```javascript
{
  id: string,
  pinId: string | null,
  question: string,
  contribution: string,
  timestamp: timestamp,
  verified: false
}
```

The model should NEVER draw from this collection when answering questions. Contributions are stored for future curator review only.

### Change 4: Category-aware response differentiation

Update the system prompt to add:

```
When a question is primarily about WHO (people, creators, communities), lead with human stories, names, and relationships.
When about WHAT (physical features), lead with materials, dimensions, and what they can observe.
When about WHEN (timeline), lead with chronology and change over time.
When about WHERE (location), lead with spatial relationships and what's nearby.
When about WHY (motivation), lead with intentions, beliefs, and contested interpretations.
When about HOW (process), lead with methods, craftsmanship, and steps.

The categories tell you where to LEAD, not what to exclude. A "who" answer can mention dates; a "when" answer can name people. But the emphasis should differ noticeably.
```

The `hint-matcher.ts` already classifies questions by category — make sure the classified category is passed to the system prompt so the model knows which angle to emphasise.

### Change 5: Photo data model (architecture only — no UI yet)

Update the pin data model so that photos are ready to receive images when they arrive from Cowork, site visits, or user contributions — but do NOT build any photo display UI or add any placeholder images in this session.

In `src/lib/types.ts`, update the Pin type so the photo field is an array:

```typescript
photos: {
  url: string;
  type: "onsite" | "archival" | "contributor";
  caption: string;
  credit: string;
  source: string | null;
  year: string | null;
  license: string | null;
  physicalLocationTag: string;      // exterior_facade | narthex | nave | crossing | dome | chancel | transepts | side_chapel | organ_loft | general
  databaseEntries: string[];        // knowledge entry IDs this photo illustrates (e.g., ["3.1", "6.1"])
  categories: QuestionCategory[];   // which inquiry angles this photo primarily serves
  annotations: {
    x: number;
    y: number;
    caption: string;
    categories: QuestionCategory[];
    clues: Partial<Record<QuestionCategory, string>>;
  }[];
}[]
```

In `src/lib/seed-pins.ts`, set `photos: []` on each seed pin. Move any existing annotation data into the observation hints system where it already lives — annotations will be attached to specific photos once real photos are uploaded.

A pin with an empty photos array must render and function identically to how it works now. No grey boxes, no "image coming soon," no visual change. The photo display component will be built in a later session after real images exist.

**Important note on data ingestion:** The archival photos will arrive from Cowork as a spreadsheet (`docs/archival_photo_inventory.xlsx`) with columns that map directly to this data model — `filename`, `caption_for_app` (→ caption), `credit`, `year`, `license`, `archive_page_url` (→ source), `physical_location_tag` (→ physicalLocationTag), and `database_entries` (→ databaseEntries). The `categories` field is derived from the content — e.g., a pre-1906 spire photo is `["what", "when"]`. When photo ingestion is built in a future session, this spreadsheet becomes the source of truth.

### Change 6: Admin photo upload and annotation interface (builder-only, no polish)

Sean needs to be able to add photos (both on-site and archival) to pins himself, including annotating specific points on each photo. This is a builder/admin tool — it does NOT need to be polished, learner-friendly, or mobile-optimised. A simple form-based interface is fine. It lives on the same app but is accessed through a separate route or a hidden mode toggle.

**Access pattern:**

Create an admin route at `/admin` (or `/contribute`). No authentication gate for now — just a URL that learners won't stumble onto. Link to it from the main app with a small, unobtrusive "Admin" link in a corner, or make it unlinked and accessed by URL only. Sean will use it to add photos; learners won't see it.

**Admin screen — photo upload flow:**

The admin screen should have:
1. A pin selector (dropdown listing all existing pins by title, plus an option to create a new pin)
2. If an existing pin is selected: show a list of photos already on that pin, plus an "Add photo" button
3. If "Add photo" is tapped or "Create new pin" is selected: show the photo form

**Photo form fields (all editable, pre-filled where possible):**

- **File upload:** camera or gallery. Uploads to Firebase Storage at `memorial-church/photos/[type]/[filename]`. Store the resulting URL.
- **Type:** dropdown — "onsite" | "archival" | "contributor". Default to "onsite" (this is what Sean is adding today).
- **Caption:** text area. "What the learner reads when the photo appears." Required.
- **Credit:** text field. For onsite photos, default to "Sean Hu, [today's date]". For archival, free-text (e.g., "Library of Congress HABS Survey").
- **Source URL:** text field. Optional for onsite, required for archival.
- **Year:** text field. Optional for onsite (defaults to current year).
- **License:** text field. Optional for onsite (defaults to "All rights reserved — creator's work"), required for archival.
- **Physical location tag:** dropdown — the standard tags (exterior_facade, narthex, nave, crossing, dome, chancel, transepts, side_chapel, organ_loft, general). Pre-filled from the pin's location if known.
- **Database entries:** multi-select or comma-separated text field — list the entry IDs this photo illustrates (e.g., "3.1, 6.1"). Show a helper list of entry IDs and titles on the side for reference.
- **Categories:** checkboxes — who, what, when, where, why, how. Sean checks which inquiry angles this photo primarily serves.

When submitted, the photo metadata is written to the pin's `photos` array in Firestore. The Firestore pin document is created if it doesn't exist (first write establishes the `memorial-church-pins` collection properly — currently pins are local-only).

**Annotation interface (for tap-to-mark points on a photo):**

After a photo is saved, the admin can optionally annotate it:

1. The saved photo displays in a large preview.
2. Sean taps anywhere on the image → a dot appears at that position. The x/y coordinates are stored as percentages (0-100) so they scale correctly on any screen size.
3. An annotation form opens:
   - **Caption:** what the learner would see when this dot is tapped (e.g., "The left side of the mosaic is slightly brighter — this is where the 1914 restoration begins").
   - **Categories:** checkboxes for who/what/when/where/why/how.
   - **Per-category clues:** for each checked category, a text area appears for Sean to write the category-specific clue sentence.
   - **Save** or **Cancel.**
4. After saving, the dot persists on the photo preview. Sean can tap it again to edit, or tap a new location to add another annotation.
5. Multiple annotations per photo are supported. Each is stored as an object in the photo's `annotations` array.

**What this session does NOT need to build:**

- Learner-facing photo display — photos don't need to show up in the inquiry flow yet. That's a future session after Sean has uploaded real photos with annotations and can test the learner experience against real content.
- Photo swiping/carousel — not yet.
- Polished mobile UI — a desktop-friendly form is fine.
- Authentication — any bad actor would need to guess the admin URL, which is enough for now.
- The annotation reveal mechanism for learners ("Show hints" button) — builds later.

**Firestore data layer:**

Until now, pins have lived in `src/lib/seed-pins.ts`. With Change 6, the app needs to read pins from the `memorial-church-pins` Firestore collection (falling back to seed data if the collection is empty on first load). When Sean uses the admin interface, his changes write to Firestore, and the main app reads those changes on next load.

This means: implement a simple `getPins()` function that tries Firestore first, falls back to `seed-pins.ts` if Firestore is empty or unavailable. Admin writes go to Firestore. This is the first time the app truly uses Firestore for pins, not just questions.

### Build priority for this session

1. Three-option loop ending with alternating zoom-out (Change 1) — the biggest UX gap
2. Epistemic honesty update to system prompt (Change 2)
3. Category-aware differentiation in system prompt (Change 4)
4. Photo data model architecture (Change 5) — quick, no UI
5. Learner contributions collection and UI (Change 3)
6. Admin photo upload and annotation interface (Change 6) — so Sean can start adding his on-site photos
7. Test: ask "who built this?" and "why was this built?" about the facade mosaic — responses should sound noticeably different
8. Test: ask something outside the database (e.g., "what's the Wi-Fi password?") — should get an honest "I don't know" with a redirect
9. Test: go through 4–5 inquiries and confirm the "Step back" option appears on one of them
10. Test: open /admin, upload a test photo to the facade mosaic pin, add two annotations, confirm it's saved to Firestore

---

## Future Claude Code Session — Learner-Facing Photo Display

*Build this AFTER Sean has uploaded real photos and annotations using the admin interface from Change 6. Needs real content to test against.*

### Photo display on pins

When a pin has photos in its `photos` array, display them in the inquiry view:
- Show the primary photo (first in array) between the question and the "We've discussed it" button
- If multiple photos exist, show a subtle dot indicator (not a carousel — keep it simple)
- Swipe or tap to see additional photos
- Each photo shows its caption below and a small source label: "Archival — [credit], [year]" or "On-site photo" or "Community contributed"
- Archival photos used in AI answers should appear inline in the answer section when the narrative references something the archival photo shows

### Annotation display (learner-facing)

When an explorer views a photo that has annotations:
- Small, subtle dots appear on the photo at annotation positions
- A "Show hints" button below the photo reveals annotations one at a time
- Each hint shows the caption and the relevant category clue based on the current question context
- The AI's system prompt receives matching annotations as physical anchors (same mechanism as the current observation hints, but now attached to specific visual evidence in a specific photo)

---

## When to Bring Cowork In (Step 4)

Cowork's role is contextual photo curation — downloading, organising, and tagging historical images from verified digital archives so they can be served alongside narrative answers in the tool. This now happens BEFORE the site visit, because:

- Reviewing archival images first gives you visual context before you walk through the church. You'll know what the spire looked like, what the pre-earthquake interior showed, and what details the archives have captured — so when you're on site, you can look for what's changed, what's survived, and what's missing.
- You can compare archival images to the database entries and identify gaps — places the database describes but no archival photo covers, which become priority shots for your site visit.
- The archival images may reveal details you wouldn't notice otherwise, shaping your photo checklist.

**Specific Cowork tasks at this stage:**

1. Navigate the Library of Congress HABS survey (Survey HABS CA-2172-A) and download the full set of digitised Memorial Church photographs — these have no known restrictions on government-made images.
2. Navigate the Carol M. Highsmith Archive at the Library of Congress and download the Memorial Church photographs — these also have no known restrictions on publication.
3. Navigate Calisphere and download California Historical Society photos of the 1906 earthquake damage — noting that these are restricted to research and educational purposes.
4. Compile a spreadsheet: filename, source archive, URL, description, database entry it supports, licence status, physical location tag.
5. Organise downloaded images into folders matching the database's physical location tags.

**What Cowork should NOT do:**
- Download from Stanford University Archives without explicit permission verification (their policy requires written requests to reproduce or publish)
- Download from any source where terms require written permission for use in a product
- Make judgments about which photos are most pedagogically valuable — that's your call

**For physical archive visits (renting/photographing originals):**
The Stanford Historical Photograph Collection (SC1071) has extensive Memorial Church holdings that are not digitised. Key folders:
- Box 18, Folder 19: Earthquake (1906) — Memorial Church — Reconstruction
- Box 30, Folders 1–4: Memorial Church — Post-1906 — Exterior
- Box 30, Folders 5–6: Memorial Church — Post-1906 — Interior
- Box 30, Folder 7: Memorial Church — Stained Glass Windows
Note: Special Collections is undertaking a major collection move through 2026. Contact specialcollections@stanford.edu to confirm availability before visiting.

---

## Technical Setup Guide

### How to start the project

**1. Create the project folder and docs:**
```bash
mkdir memorial-church-tool
cd memorial-church-tool
mkdir docs
```

**2. Copy your context files into docs/:**
```bash
# From this conversation's downloads
cp ~/Downloads/Memorial_Church_Build_Guide.md docs/
cp ~/Downloads/Memorial_Church_References.md docs/
cp ~/Downloads/Memorial_Church_Knowledge_Database.md docs/

# From your existing Provenance project
cp /path/to/provenance/Provenance_MVP_Plan_v3.md docs/
cp /path/to/provenance/Design_Update.md docs/
```

**3. Install Claude Code (if not already installed):**
```bash
npm install -g @anthropic-ai/claude-code
```

**4. Launch Claude Code from inside the project folder:**
```bash
claude
```
It will walk you through authentication if this is your first time. Once it's running, paste the prompt from `Claude_Code_Prompt.md`.

### API Keys: What to reuse, what's new

**Google Maps JavaScript API key — REUSE from Provenance.**
Your key is tied to your Google Cloud project, not to a specific app. The same key works for both Provenance and this prototype. If you've restricted the key to specific domains in the Google Cloud Console, add your new Vercel deployment URL when you deploy.

**Anthropic API key — REUSE from Provenance.**
One key works across all your projects. The same key you use in Provenance for the Claude API calls works here. Store it in your `.env.local` file as before (e.g., `ANTHROPIC_API_KEY=sk-ant-...`).

**Firebase — REUSE your existing Firebase project, but create a new Firestore collection.**
You do not need a new Firebase project. Create a new collection (e.g., `memorial-church-pins`) within your existing Firestore database. This keeps setup simple — one Firebase console, one set of credentials, one billing account. Your Provenance pin data lives in its own collection (e.g., `pins`) and won't collide.

To do this: go to your Firebase Console → your existing project → Firestore Database. Claude Code will create the new collection automatically when it writes the first seed pin document. Just point the app at the same Firebase config you already have.

Your `.env.local` should look something like:
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-existing-key
NEXT_PUBLIC_FIREBASE_API_KEY=your-existing-firebase-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
ANTHROPIC_API_KEY=your-anthropic-key
```

If you decide later that this prototype needs its own Firebase project (e.g., if it becomes a standalone product), you can create one then and migrate the data. For user research, keeping it in your existing project is the right call.

**Vercel — deploy as a new Vercel project.**
When you're ready to deploy, run `vercel` from the project folder. It will create a new Vercel project linked to this folder. Your existing Provenance deployment is unaffected.

### Project Separation Checklist

This prototype shares API keys and a Firebase project with Provenance. To make sure nothing crosses over:

**Firestore collection isolation.**
All Firestore reads and writes in this app must use the collection `memorial-church-pins`. If Claude Code generates any Firestore code referencing a collection called `pins` or anything else, change it immediately. After Claude Code finishes scaffolding, search the codebase:
```bash
grep -r "collection(" src/
```
Every result should say `memorial-church-pins`. If anything says `pins`, fix it before running the app or writing seed data. You can tell Claude Code:
```
Make sure all Firestore reads and writes use the collection "memorial-church-pins", 
not "pins". This is a separate prototype sharing a Firebase project with another app.
```

**Git: separate repository.**
This project should have its own git repo, not be a subfolder or branch of your Provenance repo. After Claude Code scaffolds the project:
```bash
git init
git add .
git commit -m "Initial scaffold"
```
Then create a new repo on GitHub (e.g., `memorial-church-tool`) and connect it:
```bash
git remote add origin https://github.com/YOUR-USERNAME/memorial-church-tool.git
git push -u origin main
```
Do NOT connect this to your existing Provenance remote.

**Firebase Storage (for photos later).**
When you upload photos, use a separate storage path prefix (e.g., `memorial-church/photos/`) so they don't mix with any Provenance uploads. Tell Claude Code:
```
When setting up Firebase Storage for photo uploads, use the path prefix 
"memorial-church/photos/" to keep this project's assets separate.
```

**Vercel: separate project.**
When deploying, `vercel` will create a new project automatically if you run it from this folder. It will not touch your Provenance deployment. You'll get a separate URL.

### Knowledge database storage

- The knowledge database should be stored as structured JSON or Markdown that can be fed to a language model as context
- Each entry should include a `sources` field referencing the references list
- The database should be small enough to fit within a model's context window (or chunked intelligently by location/topic)
- The language model's system prompt should instruct it to: answer from the database only, cite sources, use narrative voice, direct attention to observable details, and acknowledge when a question goes beyond the database's coverage

---

## Expansion Plan: From Memorial Church to the Full Campus

The Memorial Church database is the starting point, not the end state. The tool should eventually cover the entire Stanford campus — but the expansion should be driven by the kinds of questions learners naturally ask when standing at the church, not by trying to catalogue every building at once. The church is a hub from which threads radiate outward.

### Expansion logic: Follow the learner's curiosity

When a learner asks a question at Memorial Church that connects to somewhere else on campus, the tool should be able to follow that thread. These connection types define the expansion priority:

**1. Architectural style connections — "What else looks like this?"**
The church shares its Romanesque/sandstone/red-tile vocabulary with the entire Inner Quad. A learner who notices the carved arches might ask: "Are the other buildings around the Quad built the same way?" or "Who designed the rest of this?" This thread leads to:
- The Inner Quad (Shepley, Rutan, and Coolidge; Olmsted's landscape plan; the arcade system)
- The Outer Quad (Jane Stanford's building campaign, different construction quality, 1906 damage disparity)
- The Memorial Arch (100-foot, destroyed 1906, never rebuilt — "Progress of Civilization in America" frieze by Domingo Mora)
- Building 160 / Old Chemistry Building (the other Quad building repaired after 1906; still fenced off after 1989)

**2. Jane Stanford's vision — "What else did she build?"**
Jane Stanford's personal involvement in the church was extraordinary, but she also drove the construction of the museum, the mausoleum, and the broader campus. A learner who hears the parasol story might ask: "What else did she put this much care into?" This thread leads to:
- The Cantor Arts Center (originally the Leland Stanford Jr. Museum; Salviati mosaics on exterior by the same Paoletti; modelled after the National Museum in Athens)
- The Stanford Mausoleum (Salviati decorated the vestibule; the Stanford family burial site)
- The Angel of Grief sculpture (at the mausoleum; a replica of a Rome original)
- The founding story more broadly — the stock farm, Palm Drive, the Founding Grant

**3. Earthquake resilience — "What else was damaged?"**
The two-earthquake story is among the most compelling threads in the church. A learner might ask: "What happened to the rest of campus in 1906?" or "Why was this building rebuilt but others weren't?" This thread leads to:
- The Memorial Arch (destroyed, never rebuilt — contrast with the church's reconstruction)
- The Old Gymnasium and Library (demolished after 1906 — Jordan's quote about having "no feeling for" them)
- The Outer Quad damage (the $1.7 million vs. $50,000 disparity between inner and outer quad)
- Roble Hall (retrofitted in 1980s, survived 1989; would have collapsed without it)
- The broader campus seismic story ($160 million in 1989 repairs, $300 million total)

**4. Religious and spiritual life — "What else is here for different faiths?"**
The non-denominational experiment and its evolution (secret Jewish services, banned Catholic Mass) naturally leads to:
- The CIRCLE (interfaith sanctuary, seminar room, student lounge — the modern answer to Jane Stanford's vision)
- Windhover Contemplative Center (Nathan Oliveira paintings; non-denominational contemplation space)
- The history of campus religious organisations (Stanford Associated Ministries, 29 affiliated groups)

**5. The Salviati / Venice connection — "Where else can I see this?"**
A learner fascinated by the mosaics might ask: "Are there other Salviati mosaics on campus?" This leads directly to:
- Cantor Arts Center exterior mosaic panels (13 panels by Paoletti, same period, same firm)
- The Salviati blown-glass collection at the Cantor (250 objects donated ca. 1900)
- The mausoleum vestibule mosaics

**6. Organ / music connections**
The Fisk story connects to the physics department (where he came for a doctorate) and to the broader history of Stanford's relationship between science and art.

### How to build the expansion

Don't try to create a comprehensive campus database upfront. Instead:

1. **Run the Memorial Church pilot first.** Collect every question learners ask that the church database can't answer because it points beyond the church.
2. **Categorise those questions** by which connection type they follow (architecture, Jane Stanford, earthquake, religion, Salviati, etc.).
3. **Expand along the most-asked threads first.** If 8 out of 10 learners ask about the Quad architecture and only 2 ask about the Cantor mosaics, build the Quad database next.
4. **Each expansion follows the same process:** research → references list → knowledge database → on-site photos → Cowork contextual photos → question framing.
5. **The connection entries in Domain 10 of the current database are the seeds.** Entry 10.1 (Venice/Salviati), 10.2 (Cantor mosaics), and 10.3 (Clock Tower) already point outward. As the database expands, new entries will point further.

The goal is a campus-wide knowledge base that a learner can traverse by following their curiosity from place to place — but one that was built by observing what learners actually want to know, not by guessing.

---

## Immediate Next Steps (for Sean)

### Right now
1. **Read through the knowledge database and references list.** Flag anything that feels wrong, thin, or that you know more about from your own experience at Stanford. The database is only as good as your verification.
2. **Visit Memorial Church with the database open on your phone.** Walk through the space entry by entry. Note which observation prompts actually work when you're standing there, and which ones are useless. Note things you see that the database doesn't mention.
3. **Take your on-site photos (Step 4).** Use the "What to look for" prompts in the database as your shot list. Photograph: the facade mosaic (wide and detail), the narthex floor, the pendentive angels, the golden niches, the cherub carvings, the chancel Last Supper mosaic, the side chapel altar (with original Salviati pieces), the organ loft, the Latin inscriptions above the side doors, the carved quatrefoils, the stained glass (both from inside and outside if possible).

### After the site visit
4. **Set up a Cowork project** pointed at your Provenance folder. Give it the references list and ask it to execute the photo download tasks from Domain 11 of the knowledge database — starting with the Library of Congress HABS survey and Highsmith/Winter photos (all freely usable).
5. **Email Stanford Special Collections** (specialcollections@stanford.edu) to schedule a visit to the SC1071 and Salviati collections. Ask about the collection move status.

### When you're ready to build
6. **Use Claude Code to build the app.** Claude Code is your primary build tool — it handles the codebase, the Next.js app, the Claude API integration, the knowledge base ingestion, and the interface.
7. **Use Cowork for non-code tasks that support the build.** See "How Cowork and Claude Code Work Together" below.
8. **Workshop question framing** with 2–3 people before the pilot.

---

## How Cowork and Claude Code Work Together

You asked how Cowork helps if you're building on Claude Code. They handle different parts of the project:

**Claude Code builds the app.** It writes the Next.js code, sets up the Claude API integration, structures the knowledge base for retrieval, builds the question flow UI, handles photo display, and deploys to Vercel. This is where the engineering happens.

**Cowork handles everything around the app that isn't code.** Specifically:

- **Photo curation** (Step 5): Downloading, tagging, and organising archival images from the digital sources identified in the references list. Cowork can navigate the Library of Congress, download TIFF files, convert them, rename them with your tagging convention, and sort them into folders.

- **Research expansion**: When you're ready to expand the database to cover the Quad or the Cantor, you can point Cowork at the relevant web sources and ask it to compile research notes in the same format as the existing database entries. You review and verify; it does the assembly work.

- **Content formatting**: If the knowledge database needs to be restructured — say Claude Code needs it as JSON instead of Markdown, or you want to split it into per-location chunks — Cowork can do that file transformation without you touching a terminal.

- **Spreadsheet and inventory work**: The photo inventory spreadsheet (filename, source, URL, description, database entry, licence status) is a natural Cowork task. So is compiling a checklist of what you still need to photograph on-site.

- **Testing documentation**: After a pilot session, if you have handwritten notes or a folder of learner feedback, Cowork can compile, sort, and summarise it.

**The division is simple:** if it touches the codebase, use Claude Code. If it touches files, research, or organisation, use Cowork. They share your filesystem, so Cowork can prepare assets that Claude Code then integrates.

---

*This guide should be updated as the project develops. Current status: knowledge database v1 complete, references list verified, build guide with expansion plan and workflow documented.*
