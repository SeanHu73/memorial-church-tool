# Provenance — Memorial Church Learning Tool: Build Guide

*Sean Hu · LDT Project · Stanford*
*April 2026*

---

## Purpose

This document is the build guide for a standalone learning tool focused on Stanford Memorial Church. The tool serves as a research instrument for the broader Provenance project: by letting real learners explore Memorial Church through a guided, question-driven interface, we will develop a deeper understanding of the types of questions learners naturally ask when engaging with a place — and how those questions evolve during exploration.

The tool also serves as a prototype for the Provenance "Investigate the Collection" pathway, where a curated knowledge base replaces live search, and a language model mediates between the learner's curiosity and the available information.

---

## Design Principles

### 1. Questions drive the experience; answers invoke the place

The tool poses questions to a group (likely a pair) to discuss *before* revealing more. Questions should direct attention toward physical observation of the place — what you can see, touch, notice, compare. The learner should be looking at Memorial Church, not reading a screen.

Answers, when revealed, should be told as **narrative** — not encyclopedia entries. The tone should invoke imagination, excitement, and understanding by connecting the observable present to the invisible past. The reader should feel the weight of the stones, picture Jane Stanford climbing scaffolding with her parasol, hear the 4,500 pipes of the Fisk-Nanney organ filling the nave.

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
  url: string,
  type: "onsite" | "archival" | "contributor",
  caption: string,
  credit: string,          // photographer or archive name
  source: string | null,   // URL of the original archive source (for archival)
  year: string | null,     // when the photo was taken (for archival)
  license: string | null,  // licence status (for archival)
  annotations: [{          // observation hints attached to this specific photo
    x: number,             // percentage position (0-100)
    y: number,
    caption: string,
    categories: string[],  // ["who", "what", "when", etc.]
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
2. **A personal/reflective question** — a tappable option that doesn't direct attention to a new place but instead invites reflection or discussion: "Talk with your partner about..." This leads to a response that doesn't require moving.
3. **"Ask your own question"** — a text input where the learner types whatever they're curious about. The model finds the most relevant location in the database, directs the learner to look at that place (restarting at Step A), and generates a contextual response.

The loop continues until the learner stops. Every path leads back to observation.

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
- **Photos on pins** — pins are text-only. No on-site or archival photos displayed yet.
- **Photo annotation display** — the annotation data model exists in seed-pins.ts but there's no UI for viewing annotations as hints on photos.
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

**Option 2: "Keep talking about this"**
A card that, when tapped, sends a request to the Claude API asking for a personal/reflective or theory-building follow-up question about the CURRENT location. The response should NOT direct attention to a new place — it should deepen conversation where they are. The response also ends with the same three options, so the loop continues.

For this option, add to the API call a flag like `mode: "deepen"` so the system prompt knows to generate a reflective question rather than an informational answer. The prompt for this mode should say: "Generate a conversation-starting question for a pair standing at [current pin location]. The question should invite personal reflection, theory-building, or historical imagination — NOT direct them to a new location. Keep it to 1-2 sentences."

**Option 3: "Ask your own question"**
A text input field. This already exists in AskSheet — but now it should also appear as an option at the end of every answer in InquirySheet. When typed from InquirySheet, it should:
1. Send the question to the Claude API
2. If the model's answer involves a different physical location, direct the learner there (show the observation first, then the answer — same flow as AskSheet)
3. If the model's answer is about the current location, show it inline and then show the three options again

**Design:** The three options should be styled as soft, tappable cards in the warm palette. Option 1 gets a subtle arrow/direction icon. Option 2 gets a conversation/thought icon. Option 3 is a text input with a send button.

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

### Build priority for this session

1. Three-option loop ending (Change 1) — this is the biggest UX gap
2. Epistemic honesty update to system prompt (Change 2)
3. Category-aware differentiation in system prompt (Change 4)
4. Photo data model architecture (Change 5) — quick, no UI
5. Learner contributions collection and UI (Change 3)
6. Test: ask "who built this?" and "why was this built?" about the facade mosaic — responses should sound noticeably different
7. Test: ask something outside the database (e.g., "what's the Wi-Fi password?") — should get an honest "I don't know" with a redirect

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
