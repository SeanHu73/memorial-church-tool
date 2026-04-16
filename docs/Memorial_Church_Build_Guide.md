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

**How this shows up in the inquiry loop:** the default question is always directly observational — look at this, notice that, touch this. But once the learner has covered enough material in their conversation, an option appears to step back and see how it all connects. The model uses what's actually been discussed — the knowledge entries it has surfaced, the locations it has talked about, the questions the learner has asked — to craft a bigger-picture question that bridges what they've seen rather than demanding synthesis from material they don't yet know. Direct observation is always the path; context emerges from the cumulative weight of what's been observed.

**The implementation: coverage, not counting.** Bigger-picture questions need foundation. A learner who has only worked through one inquiry isn't ready to synthesise — they don't have enough to synthesise from. So instead of a random counter triggering zoom-outs ("ask a bigger question every 2–4 turns"), the system tracks what has actually been covered in the conversation: which knowledge entries the AI has drawn from in its answers, which physical locations have been discussed, how many substantive turns deep the conversation is. The "Step back and see the bigger picture" option becomes available once a low threshold of coverage is met — typically 2 distinct entries or 2 distinct locations across at least 2 substantive turns. Once the option is used, any unanswered bigger questions are tracked as "open" so the system can offer them again later when the learner has covered more relevant ground. This way, a learner who has explored deeply gets bigger questions that match their depth, and a learner who has only just started doesn't get hit with a synthesis demand they can't meet. The rhythm is set by the conversation itself, not by a clock.

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
2. **"Keep talking about this" OR "Step back and see the bigger picture"** — only one appears at a time, based on what the learner has covered so far in the conversation. The default is "Keep talking about this" — a reflective or theory-building question that deepens the discussion at the current location. The "Step back" option only becomes available once the learner has built up enough conversational coverage to engage a bigger-picture question meaningfully. Coverage is measured by what the conversation has actually surfaced — how many distinct knowledge entries the AI has drawn from, how many physical locations have been discussed, how many turns deep the conversation has gone. The threshold is low at first (the option can appear after 2–3 substantive turns covering at least 2 distinct entries or locations), and once a zoom-out has been used, the system tracks any unanswered bigger questions as "open" and offers them again later when the learner has explored more. Examples of bigger-picture questions: "You've been looking at the facade and the chancel — both have empty spaces where things used to be. What does the church remembering its losses tell you about what was lost?" or "You've heard about the railroad money and seen the lavish materials — what do you think the people who built this place wanted you to feel walking in?" After a zoom-out, coverage continues to accumulate; the option remains available but new bigger questions may be offered as more is covered.
3. **"Ask your own question"** — a text input where the learner types whatever they're curious about. The model finds the most relevant location in the database, directs the learner to look at that place (restarting at Step A), and generates a contextual response.

The loop continues until the learner stops. Every path leads back to observation — but the option to step back only appears when the learner has earned it through exploration. They come to see the church as a web of relationships, not a sequence of isolated details, and they're never asked to synthesise more than they've gathered.

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

### Recently built (Changes 1–6, April 2026 session)
- **Three-option inquiry loop ending** with alternating "Keep talking about this" / "Step back and see the bigger picture" based on a random counter (2, 3, or 4 consecutive direct-observation inquiries between zoom-outs).
- **Epistemic honesty rules in system prompt** — model acknowledges gaps plainly, offers related context, turns questions back to the learner.
- **Category-aware response differentiation** — who/what/when/where/why/how questions produce noticeably different emphasis.
- **Photo data model** — array-based, multi-source, with physicalLocationTag, databaseEntries, categories, and annotations fields. Pins with empty photos array render normally.
- **Learner contributions** — `memorial-church-contributions` Firestore collection and UI for when the model acknowledges a gap.
- **Admin photo upload and annotation at `/admin`** — Sean can now upload on-site and archival photos, fill in all metadata fields, and tap-to-annotate specific points with category-tagged clues. Pins now read from Firestore (with seed-pins.ts as fallback).

### What's NOT built yet
- **Learner-facing photo display** — photos exist in the data model and can be uploaded via admin, but they don't appear in the inquiry flow yet. This is the next session (Change 7) and the final piece before the place-based experience is complete. Without it, the app tells learners to "look at the inscription" without showing the inscription.
- **Ingestion of Cowork's archival spreadsheet** — the 30+ archival photos Cowork found are not yet in the app. Can be done manually through admin, or automated in a short follow-up session.
- **Pilot testing** — waiting on Change 7 and real photo content.

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

The protocol has two layers: a tight system prompt focused on what only the model can do, and post-response code checks that enforce the things the model is unreliable at.

#### What the system prompt says

**Identity and voice.** You are a knowledgeable friend who has spent years falling in love with Memorial Church. Not a tour guide, not a textbook, not an AI assistant. Write the way that friend would talk to two people standing in front of the church together — warm, specific, never glib. Vary how you open: sometimes a vivid detail, sometimes a human story, sometimes a surprise, sometimes what's missing or contested. Vary sentence rhythm. Avoid clichés ("delve," "tapestry," "rich history," "nestled"), bullet points, and AI-assistant phrases ("Here's the thing:", "Let me break this down").

**Response format.** Raw JSON, no markdown:
```json
{
  "observation": "...or null",
  "answer": "...",
  "entriesUsed": ["3.1", "6.1"],
  "anchorUsed": "the facade plaque",
  "quotationsUsed": ["any direct quote you included"]
}
```

`entriesUsed`, `anchorUsed`, and `quotationsUsed` are internal — the learner never sees them. They let the app track what's been covered AND help it pick the right photo to display alongside the observation.

**About `anchorUsed` specifically — this field matters for photo retrieval.** Write it as a short noun phrase naming the specific physical thing the observation directs the group to look at. Good examples: `"the facade plaque"`, `"the pendentive angels"`, `"the Latin door inscriptions"`, `"the narthex floor mosaic"`, `"the golden niches behind the altar"`. Bad examples that won't match photos well: `"the church"`, `"the inscription"` (too generic), `"Jane Stanford"` (that's a person, not a physical anchor), `"the carved stonework"` (too vague). If the observation points at multiple things, pick the primary one. If the observation is null, `anchorUsed` should also be null or an empty string.

**The observation field.** Strong default is to include one. Direct the group to look at something specific and physical — not "look around the church" but "Find the stone plaque below the mosaic and read whose name is carved there." If a question feels too abstract for an anchor, find one anyway. Example: "Why was it built?" → the inscription on the facade plaque IS the anchor; read it together first, then talk about why. `null` only when the question genuinely has no physical connection — rare.

**The answer field.** When you've given an observation, write knowing the group is looking at the thing you pointed to. When `null`, lead with narrative directly. Aim for 80 words; never exceed 120. End with a thread — a thing to look for, a question that opens, a tension unresolved. Never end with a summary closer that wraps the topic up ("she meant they were inseparable", "that was their answer to grief"). Let the learner draw conclusions.

**Engage tension; don't smooth it.** The knowledge base contains controversies — costs that drew criticism, opposition from David Starr Jordan, Jewish students worshipping in secret, the contradiction of Stanford wealth built on Chinese labour, contested mosaic naming, the choice not to rebuild the spire. When a question opens that door, walk through it. Don't deflect into inspiring narrative. Example: if asked about the cost, don't say "they spared no expense" — say "David Starr Jordan worried publicly that the money should have gone to the library." Friction is part of the story.

**Honesty over invention.** If the knowledge base doesn't have what's being asked, say so plainly, offer what you do have, and turn the question back to the learner: "How would you try to find that out?" Never fabricate.

**Use the session context provided to you.** Each request includes a "Session so far" block with what's already been covered (entries used, anchors used, quotations used, locations discussed, recent question categories). Don't repeat anchors or quotations. Don't keep delivering the same flavour of answer (four motivation questions in a row → vary your approach by the fourth). When the request includes `mode: "zoom_out"`, use the coverage to ask a question that bridges what's been seen — be specific about what was covered, not generic.

#### What the code enforces (post-response checks)

The model is unreliable at counting, remembering, and refusing patterns. Code handles these so the prompt doesn't have to keep restating them:

1. **Word count.** After the model responds, count the answer's words. If over 120, send the response back to the model with: "This response is N words. Condense to under 120 by cutting the wrap-up and trusting the reader." Use the condensed version.

2. **Recycled content rejection.** If `anchorUsed` or any string in `quotationsUsed` matches something in the recent session memory, reject and regenerate with: "This anchor/quotation was already used at turn N. Pick a different one."

3. **Banned phrases.** If the answer contains "delve," "tapestry," "rich history," "nestled," or any AI-assistant tell ("Great question", "Let me break this down", "Here's the thing"), reject and regenerate.

4. **Format validation.** If the JSON is malformed or missing required fields, reject and retry once.

Up to 2 regeneration attempts per request. After that, ship what you have rather than failing the user.

#### What the request injection adds

Each API request to the model includes:

- **The classified question category** (one line): `"This question is primarily a WHEN question — lead with chronology and change over time, but weave other angles in as needed."` This replaces the long per-category paragraphs that used to be in the system prompt.

- **The relevant observation hints** for that pin and category (already implemented).

- **The session coverage state**: what entries the AI has used in answers so far, what anchors and quotations have been used, what locations have been discussed, the last few question categories asked. (Detailed below in Change 8.)

- **The mode flag** if applicable: `"normal"` (default), `"deepen"` (reflective question at current location), or `"zoom_out"` (bigger-picture question that uses coverage to bridge what's been seen).

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

## Next Claude Code Session — Changes 7 & 8

*Changes 1–6 are complete. The next session has two coordinated changes: photo display (Change 7) and conversation quality / session memory (Change 8). Build them together — they both touch the API request pipeline and the system prompt. Build them before pilot testing.*

---

### Change 8: Session memory, coverage tracking, and conversation quality

A pilot conversation revealed several failure modes the current setup doesn't prevent: the model recycled the same observation anchor across three answers, repeated the same Jane Stanford quotation three times in four turns, ran past the word limit, glossed over conflict material, ended answers with summary closers that wrapped the topic up, and delivered four consecutive inspiring-narrative answers to four consecutive motivation questions. The root cause is that the model sees each turn in isolation. Fixing this requires three coordinated pieces:

1. **Session memory passed back to the model** so it knows what's been said.
2. **Post-response code checks** so the prompt doesn't have to keep restating things the model is bad at (counting, refusing patterns, remembering banned phrases).
3. **Coverage-based zoom-out availability** so bigger-picture questions only appear when the learner has the foundation for them — replacing the random-counter rhythm with something tied to what's actually been discussed.

#### Part 1: Session memory infrastructure

Maintain a `sessionMemory` object on the client (component state, persisted to sessionStorage so it survives reloads but is per-session):

```typescript
sessionMemory: {
  // For preventing recycling
  recentObservationAnchors: string[],   // last 3 physical things pointed to
  recentQuotations: string[],            // last 3 direct quotes used in answers
  
  // For varying approach
  recentQuestionCategories: string[],    // last 5 question categories
  
  // For coverage tracking (zoom-out readiness)
  entriesEverUsed: Set<string>,          // all knowledge entry IDs the AI has ever used in this session
  locationsEverDiscussed: Set<string>,   // all physical location tags ever surfaced
  substantiveTurnCount: number,          // turns where the AI gave a real answer (not "I don't know")
  
  // For revisiting deferred questions
  openZoomOutQuestions: { question: string, requiredCoverage: string[], turnAsked: number }[]
}
```

After each AI response, update memory using the structured fields the model returned (`anchorUsed`, `quotationsUsed`, `entriesUsed`). No need to parse text — the model gives these fields directly.

Pass relevant memory into every API request as a "Session so far" block:

```
SESSION SO FAR:
- Anchors already used: ["facade plaque", "Latin door inscriptions", "Quad arcades"]
- Quotations already used: ["my soul is in that church"]
- Recent question types: [why, why, how, why]
- Locations discussed: [exterior_facade, narthex]
- Turns so far: 4

Use this to vary your approach. Don't reuse anchors or quotations from these lists. If the recent questions cluster around one type or location, change angle or thread elsewhere.
```

#### Part 2: Post-response code checks

The model is unreliable at counting words, remembering banned phrases, and refusing to use specific strings it just saw in a "do not use" list. Move these enforcement jobs to the API route in `src/app/api/ask/route.ts`. After the model responds, run these checks:

```typescript
function validateResponse(response, sessionMemory): { ok: boolean, problems: string[] } {
  const problems = [];
  
  // 1. Word count
  const wordCount = response.answer.split(/\s+/).length;
  if (wordCount > 120) problems.push(`Answer is ${wordCount} words; condense to under 120.`);
  
  // 2. Recycled anchor
  if (sessionMemory.recentObservationAnchors.includes(response.anchorUsed)) {
    problems.push(`The anchor "${response.anchorUsed}" was already used. Pick a different physical detail.`);
  }
  
  // 3. Recycled quotations
  for (const q of response.quotationsUsed || []) {
    if (sessionMemory.recentQuotations.some(used => similar(q, used))) {
      problems.push(`The quotation "${q}" was already used. Paraphrase or use a different one.`);
    }
  }
  
  // 4. Banned phrases
  const banned = ['delve', 'tapestry', 'rich history', 'nestled', 'great question', "let me break this down", "here's the thing"];
  for (const phrase of banned) {
    if (response.answer.toLowerCase().includes(phrase)) {
      problems.push(`Remove the phrase "${phrase}".`);
    }
  }
  
  return { ok: problems.length === 0, problems };
}
```

If `validateResponse` fails, send the response back to the model with the problems list and ask for a corrected version. Allow up to 2 retries. After that, ship what you have rather than blocking the user.

This frees the system prompt from having to keep restating "60-120 words" and "don't use 'delve'" — the model can focus on the harder work of writing well, and code catches anything that slips through.

#### Part 3: Coverage-based zoom-out availability

Replace the current random-counter rhythm with coverage-based readiness.

The "Step back and see the bigger picture" option becomes available when the learner has accumulated enough conversational coverage to engage a bigger question meaningfully. Specifically:

```typescript
function isZoomOutAvailable(sessionMemory): boolean {
  return (
    sessionMemory.substantiveTurnCount >= 2 &&
    (sessionMemory.entriesEverUsed.size >= 2 || sessionMemory.locationsEverDiscussed.size >= 2)
  );
}
```

Threshold is intentionally low — 2 substantive turns covering 2 distinct entries OR 2 distinct locations. This is "early but not premature." A learner who has done one quick scan won't get hit with a synthesis demand; a learner who has explored a couple of things gets the option.

When the learner taps "Step back and see the bigger picture," the API call sends `mode: "zoom_out"` along with the full coverage state. The model uses coverage to construct a question that bridges what's been seen, not abstract synthesis:

```
ZOOM OUT MODE:
The learner has covered these entries: [1.1, 3.1, 6.1]
And these locations: [exterior_facade, chancel]

Generate a question that bridges what they've explored. Be specific to what they've actually seen. Don't ask abstract questions like "what do you think this place means?" — instead, ask things like "you've heard about the spire that fell in 1906 and seen the empty niches in the chancel where statues used to be — what do you think this church is choosing to remember about its losses?"

If the learner can't answer your bigger question right away, that's fine. The conversation's purpose is to invite them to look at more. Suggest one or two specific things they might explore next that would help them think about it.
```

After the zoom-out question is asked, store it in `openZoomOutQuestions` with the entries it depended on. Coverage continues to accumulate. When the learner has substantively covered at least one new entry beyond what was needed for an open question, the model can resurface it: "Earlier we wondered about X. Now that you've also looked at Y, what do you think?"

This integrates with the three-option ending: the "Step back" button is disabled (or hidden) until coverage threshold is met. Once met, it stays available. After being used, it remains available — but the coverage state has grown, so the next zoom-out the model offers will be different.

#### Engaging tension — keep this as a system prompt rule

Word the rule simply, with one example:

```
ENGAGE CONTESTED MATERIAL. The knowledge base contains controversies — costs that drew criticism, opposition from David Starr Jordan, Jewish students worshipping in secret, the contradiction of railroad wealth from Chinese labour, the contested naming of the facade mosaic. When a question opens that door, walk through. Don't deflect into inspiring narrative. If asked about cost, don't say "they spared no expense"; say "David Starr Jordan worried publicly that the money should have gone to the library."
```

One example does more than a list of every controversy. The model already has the full list available through the knowledge entries — pointing it at the right disposition is what matters.

### Build priority for this session

1. **Change 8: session memory infrastructure** — the `sessionMemory` object, sessionStorage persistence, the new structured response fields (`entriesUsed`, `anchorUsed`, `quotationsUsed`).
2. **Change 8: post-response code checks** — word count, recycled content, banned phrases. Up to 2 regeneration attempts.
3. **Change 8: coverage-based zoom-out availability** — `isZoomOutAvailable()` function gates the UI option, the `openZoomOutQuestions` tracking for revisiting deferred questions.
4. **Change 8: tightened system prompt** — replace the long protocol section with the audited version (covered in the AI Response Protocol section above). Keep the "engage tension" rule and the new "use session context" rule. Move per-category emphasis from prompt to per-request injection.
5. **Change 7: learner-facing photo display** — once Change 8 establishes `entriesUsed`, the photo matcher can use it.

Both changes touch:
- `src/app/api/ask/route.ts` (system prompt, post-response validation, response format)
- `src/lib/types.ts` (sessionMemory type, response type)
- `src/components/InquirySheet.tsx` and `src/components/AskSheet.tsx` (state management, threading sessionMemory through requests, gating the zoom-out button)

### Tests for this session

After Change 8:
- Ask 4 motivation questions in a row about the facade. The 4th answer must not use the facade plaque as its anchor (rotates to arcades, cornerstone, threading elsewhere). The 4th answer must not include the "my soul is in that church" quote if it was used earlier. If the model produces a recycled response, the post-response check should regenerate.
- Ask a question that touches conflict — "Did anyone object to building the church?" — and confirm the answer engages David Starr Jordan / costs / opposition material rather than glossing over.
- Spot-check three responses for word count. All should be under 120.
- Confirm "Step back and see the bigger picture" doesn't appear after just one turn.
- Confirm it does appear after 2 substantive turns covering 2 different entries.
- After using the zoom-out, confirm coverage continues to accumulate and the next zoom-out (after more turns) offers a different question.
- Confirm an "open" zoom-out question can be revisited later when coverage has grown.

After Change 7 (with photos uploaded via admin):
- Tap the facade mosaic pin. A photo should appear alongside the observation.
- Ask about the spire. An archival pre-1906 photo should appear.
- Upload a photo with annotations through `/admin`, then view that pin. Dots should appear, "Show hints" should work.
- Upload zero photos to a pin and confirm it still works text-only.

---

### Change 7: Learner-Facing Photo Display

*Build this AFTER Change 8 establishes session memory. Photo retrieval uses the `entriesUsed` field that Change 8 adds to the API response.*

#### Core principle: photos appear when the AI directs attention to something observable

The rule is simple. Every time the AI's response includes an `observation` field (the field that directs the group to look at a specific physical thing), the app should try to show a photo of that thing alongside the observation. If no photo exists, the text observation still works — but when a photo IS available, showing it makes the instruction concrete.

Examples of when photos should appear:

- "Look at the inscription above the narthex door" → show the photo of that inscription
- "Turn toward the dome and look up at the pendentive angels" → show the photo of the pendentives
- "Find the golden niches along the lower chancel walls" → show the photo of the niches
- "Look at the facade mosaic" → show the facade mosaic photo
- "Step back and look across the Quad" → show a Quad/campus-context photo if one exists

Examples of when a photo is also valuable (secondary use):

- The AI's answer references something the learner cannot currently see (the lost spire, the destroyed apostle statues, the original dome fresco) → show the archival "before" photo alongside the answer
- A zoom-out question mentions a connected place (Clock Tower, Cantor, Memorial Arch) → show a photo of that connected place

### Where photos appear in the flow

1. **Alongside the observation prompt (Step A / the "look at this" moment):** when the observation is revealed, if a matching photo exists, it appears directly above or next to the observation text. The learner sees both the instruction and what they're being asked to look at.
2. **Alongside the narrative answer (Step C):** if the answer references something the archival photos illustrate — especially something no longer visible — a relevant archival photo appears with the answer text.
3. **On zoom-out responses:** when the "Step back" option pulls attention to a connected place, a photo of that place appears if available.

The photo never replaces the physical object. The learner is still meant to look up, turn around, walk over. The photo is a visual anchor that helps them find what the app is pointing them toward, and a comparison frame when the real thing has changed.

### How the app picks the right photo — deterministic retrieval

**The AI does not pick photos. The app's code does.** The AI generates its observation and answer; the app then runs a filter over the available photos and picks the best match. This keeps photo selection predictable and prevents the AI from inventing image descriptions.

**Retrieval is library-first, not pin-first.** The matcher starts with the ENTIRE photo library — every document in the `memorial-church-photos` Firestore collection. It does NOT start from the current pin's attached photos. Pin attachment is a scoring signal, not a filter. A photo with zero linked pins that semantically matches the anchor or answer is eligible and should surface; a photo attached to the current pin that has no semantic relevance should not.

**Retire any pin-first retrieval paths.** If the codebase has a function called `getPhotosForPin(pin, allPhotos)` that walks `pin.photoIds`, scans `photo.linkedPinIds.includes(pin.id)`, or reads legacy `pin.photos`, it needs to be removed or repurposed. That function's job is gone. Photos do not belong to pins. The new entry point is `selectPhotoForResponse(input)` which takes the full library and the AI's response, and returns the best-matching photos independent of pin attachment.

**The client passes the full photo library to the matcher, not a pre-filtered subset.** If the current client code calls something like `getPhotosForPin(pin, allPhotos)` and then passes the result to `selectPhotoForResponse()`, that's the bug — the filter happens too early. The matcher must receive the entire library to do its job.

Build (or rewrite) a `selectPhotoForResponse()` function in `src/lib/photo-matcher.ts`. It takes:

- The AI's response (observation text, answer text, `anchorUsed`, and `entriesUsed`)
- The current question category (from hint-matcher.ts)
- The current pin (optional — used only as a tiebreaker signal, not a filter)
- The full library of photos from the `memorial-church-photos` Firestore collection

And returns up to 2 photos: one for the observation (if applicable), one for the answer (if applicable). They may be the same photo, in which case only show it once.

**Photos are independent entities, not pin-embedded ones.** The matcher searches the entire photo library, not just photos attached to the current pin. A photo of the pre-1906 spire that's attached to the facade pin should still surface if the learner is standing at the chancel pin asking about the 1906 earthquake. Pin attachment is a soft signal (used as a tiebreaker), not a hard filter.

**Critical: the observation slot and the answer slot need different retrieval logic.** An observation directs the group to look at a specific physical thing — "find the plaque below the mosaic" or "look up at the pendentive angels." The photo for this slot must match what the group is being told to LOOK AT, not what the answer text happens to discuss. If the observation is "find the plaque" and the answer discusses Jane Stanford and grief, the observation photo should show the plaque, not Jane's portrait. Separate these two retrieval problems.

#### Retrieval for the observation slot

The goal: find the photo that best shows the physical thing the group is being directed to observe.

1. **Eligibility filter.** Photos whose `physicalLocationTag` matches the current location OR is `general`. The observation is always about something at or near where the learner is, so location filtering is tighter here than for the answer slot.

2. **Primary signal: semantic match against the anchor, not the full answer.** Use the `anchorUsed` field from the AI response (e.g., "the facade plaque", "the pendentive angels", "the Latin door inscriptions") as the target phrase. Score each eligible photo by how well its `description` and `keywords` match the anchor phrase. A photo whose description begins "Close-up of the carved stone plaque on the north facade..." scores highly when `anchorUsed = "the facade plaque"`.

3. **Fallback: semantic match against the observation text.** If `anchorUsed` is missing or produces no matches, fall back to matching against the observation text itself (which names what to look at).

4. **Type preference.** Strongly prefer onsite photos over archival ones for observations — the group is looking at something in front of them RIGHT NOW, so a current-day photo is the natural match. Only fall back to archival if no onsite photo is a good match (e.g., for a lost feature like the spire, where no onsite photo is possible).

5. **Pin attachment as tiebreaker.** If two photos score equally, prefer the one attached to the current pin.

#### Retrieval for the answer slot

**The answer slot exists to show things the learner CANNOT see right now.** The observation slot already shows what they're being asked to look at. The answer slot's job is different: it brings in visual evidence they otherwise wouldn't have access to — historical photographs, lost features, faraway places, people from the past. If the answer is talking entirely about what's already in front of them, the answer slot should stay empty.

Examples of when the answer slot earns a photo:

- The answer references the 1906 earthquake damage → show the archival earthquake photo.
- The answer mentions the original 80-foot spire that fell → show the pre-1906 photo of the church with the spire.
- The answer tells the story of Jane Stanford climbing scaffolding → show her portrait.
- The answer describes the Salviati workshop in Venice making the mosaics → show a photo of the workshop or Venice context (if available).
- The answer discusses the twelve marble apostle statues that once stood in the chancel niches (if such a photo exists).

Examples of when the answer slot should NOT have a photo (return null):

- The answer is fully grounded in what the learner is looking at now — for example, an observation "find the facade plaque" with an answer that discusses what the plaque says and why. The observation photo of the plaque is sufficient.
- The answer is about concepts, ideas, or abstractions with no visual analogue — for example, a philosophical question about non-denominational worship.
- The best-matching photo would be the same one the observation slot already picked.

The ranking logic:

1. **Visible/invisible test (primary filter for this slot).** Ask: is the answer referencing something the learner cannot currently see from where they're standing? If yes, continue. If no — the answer is about what they're already looking at — return null. The observation photo covers it.

2. **Eligibility filter (location relevance).** Photos whose `physicalLocationTag` matches the current location OR matches a location the answer discusses OR is `general`. Derive "location the answer is discussing" from the physical location tags of knowledge entries in `entriesUsed`.

3. **Primary signal: semantic match against the content the answer brings in from elsewhere.** Focus on the parts of the answer that reference things NOT in the current visual field — historical events, lost features, people, places. Score each eligible photo by how well its `description` and `keywords` match this contextual content. A photo whose description mentions "pre-1906 spire" and "earthquake" ranks highly for any answer that pulls in that historical material.

4. **Type preference — strongly favour archival.** For the answer slot specifically, prefer archival photos. The slot's job is to surface historical or contextual material. Onsite photos rarely belong here because onsite photos show what's currently visible — which is the observation slot's job.

5. **Database entries overlap.** If the photo's `databaseEntries` overlaps with `entriesUsed`, boost the score.

6. **Category match.** Boost photos whose `categories` includes the current question's category.

7. **Don't duplicate the observation photo.** If the top-scoring answer photo is the same as the observation photo, skip it. Take the next candidate. If no other candidate passes the relevance threshold, return null.

8. **Pin attachment as tiebreaker.** Same as observation slot.

#### A simple way to think about it

- The observation photo answers: *"What are we looking at right now?"*
- The answer photo answers: *"What are we learning about that we can't see from here?"*

If the answer is entirely about what the observation photo already shows, don't add a second photo. If the answer reaches into history, elsewhere, or the non-visible, the answer photo is where that visual context lives.

#### Implementation notes

- Term overlap scoring between a photo's description/keywords and the target text (anchor phrase or answer text) is sufficient to start — no embeddings needed. Weight by term specificity (proper nouns and distinctive words count more than common words like "the church" or "stone").

- A minimum relevance threshold applies to both slots. If no photo scores above the threshold, return null — no photo displayed is better than a bad one.

- For debugging: log which photos were considered for each slot and why the winner won (or why the slot returned null). This makes it easy to spot logic errors: "the matcher picked Jane Stanford's portrait for the observation because her name appeared in the answer text, but the anchor was 'the plaque'" tells you the anchor-first logic isn't firing.

**Why this matters for retrieval quality:** with pin-first filtering (the old approach), photos were locked to their attached pins. With answer-only scoring across both slots (the previous spec), observation photos drifted from what the group was actually being told to look at, and answer photos often duplicated the observation photo instead of adding something new. Now each slot has a clear, distinct job: observations target the anchor (what they're seeing right now), answers target the contextual material (what they're learning about that they can't see). Pin attachment is a curation hint, not a fence.

### Visual design

Keep it simple. The photo appears as a single image, not a carousel. Below the photo, show a small caption line: the photo's caption text plus a subtle source attribution like "Library of Congress, 1906" or "Taken on site."

If the photo has annotations, show small dots on the image at annotation positions. A "Show hints" button below reveals annotations one at a time — tap a dot or tap the button to reveal the caption and the category-relevant clue.

Mobile-first sizing. Photos should be readable at 390px width. Don't let them dominate the screen — they should occupy the middle third vertically, leaving room for text above and the "We've discussed it" button below.

### API response update

Modify `src/app/api/ask/route.ts` so the JSON response now includes `entriesUsed`:

```
{"observation": "...", "answer": "...", "entriesUsed": ["3.1", "6.1"]}
```

The system prompt should instruct the model to list the entry IDs it drew from. This is an internal field the learner never sees — it's only used by the photo matcher.

### Build priority for this session

1. **Add `entriesUsed` to the API response** — the foundation for everything else. Update the system prompt, parse it on the client side.
2. **Build `selectPhotoForResponse()` in `src/lib/photo-matcher.ts`** — the deterministic ranking algorithm.
3. **Update `InquirySheet.tsx` and `AskSheet.tsx` to display photos** — at observation reveal, at answer reveal.
4. **Add annotation display (dots + "Show hints" button)** — the learner-facing version of what admin created in Change 6.
5. **Test with real content:**
   - Open the app, tap the facade mosaic pin. A photo should appear alongside the observation.
   - Ask a question about the spire. An archival pre-1906 photo should appear alongside the answer since no current photo exists.
   - Add a photo with annotations via `/admin` to the narthex pin, then as a learner tap that pin — dots should appear on the photo and "Show hints" should reveal the captions.
   - Ask a zoom-out question that references the Quad — if you've uploaded a Quad photo, it should appear.

### What this session does NOT need to build

- Photo upload flow for learners (contributor mode) — still future work. For now, photos come from admin only.
- Photo swiping/carousel — a pin with 3 photos shows only the best-matched one for the current question. Cycling through photos is a future refinement.
- Integration with Cowork's archival spreadsheet — you'll ingest those separately in a short follow-up session. Sean will manually add a few archival photos through admin first to validate the flow.

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
