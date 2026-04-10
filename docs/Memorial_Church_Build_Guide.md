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

### 3. Photo-pinned, place-based

The eventual product will pin photos to specific locations in and around Memorial Church. The tool should be designed with this in mind — knowledge entries should be tagged with physical locations (facade, narthex, nave, crossing, chancel, transepts, organ loft, etc.) so that questions and answers can be surfaced contextually as a learner moves through the space.

### 4. Question framing is for later workshopping

The specific framing of questions — what makes a great discussion prompt for a pair standing in front of a mosaic — will be workshopped separately. For now, the database should contain the raw knowledge that *enables* good questions to be written. The question layer sits on top of the knowledge layer; this build focuses on the knowledge layer.

### 5. Narrative voice principles (for eventual answer delivery)

When the tool delivers information to learners, it should:

- **Start with what they can see.** Ground every answer in an observable detail before going to backstory.
- **Use concrete sensory language.** Not "the mosaics are impressive" but "over 20,000 shades of glass tesserae, each roughly the size of a sugar cube, catch the light differently depending on where you stand."
- **Make the people real.** Jane Stanford is not an abstract patron — she is a woman who notched her parasol to measure stone carving depth, who climbed scaffolding in long skirts, who told Camerino she wanted women represented equally in the mosaic work.
- **Let surprises land.** The cherubs on the sandstone columns are modelled on the children of faculty and staff who lived on campus during construction. The only stained glass window ever damaged was broken during a game of Frisbee golf. Let these moments breathe.
- **Acknowledge what's missing or contested.** The facade mosaic is popularly called "The Sermon on the Mount," but historian Richard Joncas insists it doesn't actually depict that scene. The twelve apostle statues in the chancel niches were destroyed in 1906 and never replaced. The original dome fresco — God's eye looking down, complete with a tear — was replaced by the current skylight. These absences and disputes are as interesting as what's present.
- **Connect the specific to the larger story.** A detail about the Salviati studio connects to the restoration of St. Mark's Basilica in Venice. The Fisk-Nanney organ connects to Charles Fisk's journey from Manhattan Project physicist to organ builder. The 1906 earthquake connects to the decision about what to rebuild and what to let go.

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

---

## Build Sequence

1. **Create this build guide** (this document)
2. **Create the references list** — All sources used, with notes on reliability and access
3. **Create the knowledge database** — Structured entries covering all topic domains
4. **Photo reconnaissance (on-site)** — Sean visits Memorial Church to photograph specific details referenced in the database (for pinning). These are the primary photos: current-day details that learners will be looking at.
5. **Contextual photo integration (Cowork)** — After steps 3 and 4 are solid, use Cowork to download and tag historical/contextual photos from digital archives. These are secondary photos: they enrich answers by showing what something looked like before, during reconstruction, or from an angle a visitor can't access. See "When to Bring Cowork In" below.
6. **Workshop question framing** — Using the database as raw material, workshop the best discussion prompts for pairs
7. **Build the tool interface (Claude Code)** — The language model + knowledge base + question flow + photo integration
8. **Pilot test** — Deploy with a small group exploring Memorial Church

---

## When to Bring Cowork In (Step 5)

Cowork's role is contextual photo curation — downloading, organising, and tagging historical images from verified digital archives so they can be served alongside narrative answers in the tool. This should happen **after** the knowledge database is stable and your on-site photos are taken, because:

- You need to know which database entries would benefit from a historical photo before you go looking for one. The database tells you "the spire was 80 feet tall and 12-sided" — that's when you want Cowork to find the pre-1906 photo showing it.
- On-site photos come first because they establish the learner's visual reference point. Historical photos are the "before" to your "now."
- Cowork can work through the database entry by entry and build a photo inventory: for each entry tagged with `absence`, `connection`, or a specific physical location, search the identified digital archives for matching images, download them, tag them with the database entry ID and location, and note the licence/permissions status.

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
