# Claude Code Prompt: Memorial Church Learning Tool

*Copy this into Claude Code as your initial prompt. Upload the files listed at the bottom into your docs/ folder first.*

---

## The Prompt

```
Read all files in docs/ for full context. Here's what we're building:

## What This Is

A place-based learning tool for Stanford Memorial Church. Pairs (or small groups) of explorers walk through the church while using this app on a phone. The app poses questions that direct attention outward toward the physical space, gives pairs time to discuss, then reveals narrative answers drawn from a contained knowledge database. It is NOT a tour guide app — it's an inquiry tool that teaches people to look more carefully.

The knowledge database is in docs/Memorial_Church_Knowledge_Database.md. The references list is in docs/Memorial_Church_References.md. The build guide is in docs/Memorial_Church_Build_Guide.md. The design principles for the broader Provenance project (which this tool is a research prototype for) are in docs/Provenance_MVP_Plan_v3.md and docs/Design_Update.md.

## Technical Stack

- Next.js + TypeScript + Tailwind
- Google Maps JavaScript API (centered on Stanford campus, zoomed to Memorial Church) — reusing existing API key from Provenance project
- Firebase Firestore for pin data — reusing existing Firebase project, but use a new collection called `memorial-church-pins` (NOT the existing `pins` collection from Provenance)
- Claude API for answering learner questions from the knowledge database — reusing existing Anthropic API key
- Vercel deployment (new Vercel project, separate from Provenance)

Set up the project to read API keys from `.env.local`. The user already has these keys configured from a previous project. Use the same env variable names as a standard Next.js + Firebase setup.

## Design Direction: Soft, Warm, Inquiry-First

The aesthetic should feel like a field journal meets a museum whisper gallery. NOT a tech product. NOT a Wikipedia reader. Think:

- **Tone:** Warm, contemplative, curious. Like a knowledgeable friend who points at things and asks "what do you notice?"
- **Textures:** Soft, organic. Think parchment warmth, not flat white. Subtle grain or linen textures on backgrounds. Warm stone tones that echo the sandstone of the Quad.
- **Typography:** A distinctive serif or humanist face for questions and narrative text — something with character, like a book you'd want to hold. A clean sans for UI elements.
- **Color palette:** Sandstone warm (#C4A882 range), deep mosaic blue (#1B3A5C range), aged gold (#B8943E range), soft cream (#F5F0E8 range), with mosaic teal as an accent. These should feel like they belong to the church itself.
- **Motion:** Gentle, never flashy. Questions fade in. Answers reveal softly. Nothing bounces, slides aggressively, or demands attention away from the physical space.

## Screen Layout: Inquiry Is the Focus

The app has two primary states:

### State 1: Map View (default)
- Google Map covering most of the screen, centered on Memorial Church
- Map style should be muted/warm-toned (use Google Maps styling to desaturate and warm the base map)
- Photo pins on the map at specific locations in and around the church
- A subtle bottom bar with app name and a "Ask your own question" input
- When explorer taps a pin, transition to State 2

### State 2: Inquiry View (the main experience)
This is a bottom sheet that slides up, covering roughly 75% of the screen (map peeks above).

The inquiry view has a clear sequence:

**a) The Question (hero element)**
Large, warm serif text. The question should feel like an invitation, not a test. Addressed to a pair: "Look at the mosaic above the entrance together. Does everyone see something different about the left and right sides?"

Below the question: a photo (either a user-uploaded on-site photo or an archival contextual photo) showing what the question is about, with a caption.

Below the photo: a soft "We've discussed it — show us more" button. NOT a timer. The pair decides when they're ready.

**b) The Narrative Answer**
Revealed after the button tap. Warm, engaging prose — max 30 seconds of reading (roughly 75-100 words). Written in the narrative voice described in the build guide: start with what they can see, use concrete sensory language, make the people real, let surprises land.

The answer can include a contextual photo (historical/archival) if relevant, shown inline.

**c) The Next Thread**
At the bottom of the answer: either a suggested follow-up question ("This connects to something you can see in the chancel — want to look?") as a tappable card, OR a text input: "What are you curious about now?" that lets the explorer type their own question. Both should be present — the suggestion and the open input.

Tapping the suggestion loads a new inquiry at the relevant pin. Typing a question sends it to the Claude API with the knowledge database as context.

### State 3: Explorer's Own Question
When someone types their own question, the Claude API answers from the knowledge database using a system prompt that enforces:
- Answer only from the database content
- Use narrative voice (sensory, human, grounded in observable details)
- Keep answers under 100 words
- End with a follow-up question or an observation prompt
- If the question goes beyond the database, say so honestly and suggest what they might look for

## Data Model (Firestore)

```javascript
// Pin document
{
  id: string,
  title: string,
  location: {
    lat: number,
    lng: number,
    physicalArea: string  // "exterior_facade" | "narthex" | "nave" | etc.
  },
  photo: {
    url: string,          // on-site photo
    caption: string,
    credit: string
  },
  inquiry: {
    question: string,     // the discussion prompt
    answer: string,       // narrative answer (max ~100 words)
    contextualPhoto: {    // optional archival photo
      url: string,
      caption: string,
      source: string,
      year: string
    } | null,
    suggestedNext: {      // follow-up suggestion
      pinId: string,
      teaser: string      // e.g. "This connects to something you can see in the chancel..."
    } | null
  },
  tags: string[],
  era: string,
  databaseEntryIds: string[]  // links to knowledge database entries
}
```

## Key Design Principles (from the build guide)

1. **Questions drive the experience.** The question is always the largest, most prominent element on screen.
2. **Direct attention outward.** The phone should feel like it's sending you to look at the church, not trapping you in a screen. Questions should say "look at" and "notice" and "find."
3. **Answers invoke the place.** Narrative voice, not encyclopedia voice. Sensory, human, grounded.
4. **30 seconds max.** No answer should take more than 30 seconds to read. If it's longer, it's wrong.
5. **Always end with another question.** The experience is a chain of curiosity, not a series of dead ends.
6. **The pair discusses, not types.** Discussion pauses are the learning. The app facilitates conversation between people, not between a person and a screen.

## Build Priority

Steps 1–5 are COMPLETE. The app is scaffolded, deployed, and has a working map, pin-based inquiry flow, free-form question flow, observation hints system, and question logging.

**Remaining build work (in order):**

6. Photo display — show photos on pins (placeholder images first, real photos after site visit)
7. Photo annotation hints UI — display annotation dots on photos with "Show hints" reveal
8. Three-option inquiry loop ending — after every answer, show: suggested place / keep talking / ask own question (see Design Principle 4, Step E in build guide)
9. Learner contributions — `memorial-church-contributions` Firestore collection + submission UI when the model says "I don't know"
10. Category-aware response differentiation — update system prompt so who/what/when/where/why/how questions produce noticeably different answers about the same location

IMPORTANT SEPARATION RULES — this project shares a Firebase project with another app:
- Firestore collection must be "memorial-church-pins" everywhere. NEVER use "pins".
- Learner contributions go to "memorial-church-contributions". NEVER write to any other collection.
- Firebase Storage uploads must use the path prefix "memorial-church/photos/". NEVER write to the root.
- Do not reference, import from, or connect to any other codebase.
```

---

## Files to Upload to docs/

Upload these files into your Claude Code project's `docs/` folder:

1. `Memorial_Church_Build_Guide.md` — The build guide (design principles, expansion plan, workflow)
2. `Memorial_Church_References.md` — All sources with URLs
3. `Memorial_Church_Knowledge_Database.md` — The full knowledge database (Domains 1-11)
4. `Provenance_MVP_Plan_v3.md` — The broader Provenance design context (from your existing project files)
5. `Design_Update.md` — The social learning and guide avatar design update (from your existing project files)

Claude Code should read all of these before starting to build. The knowledge database is the most important — it's the content the app serves.
