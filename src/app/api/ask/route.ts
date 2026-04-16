import { NextRequest, NextResponse } from 'next/server';
import knowledgeDB from '@/lib/knowledge-db';
import { findRelevantHints, formatHintsForPrompt, classifyQuestion } from '@/lib/hint-matcher';
import { logToSheet } from '@/lib/sheets-logger';
import { SessionMemory } from '@/lib/types';
import { emptyMemory } from '@/lib/session-memory';

const SYSTEM_PROMPT = `You are a knowledgeable, warm companion to people exploring Stanford Memorial Church. They are standing in or near the church right now, in pairs or small groups. They have asked you a question. You answer using ONLY the knowledge database provided below.

YOUR CORE PRINCIPLE: Direct attention outward. The phone should send people toward the building, not trap them in a screen.

HOW TO RESPOND:

Respond with ONLY raw JSON — no markdown, no code fences, no backticks. Six fields:

{"observation":"...or null","answer":"...","observationEntries":["2.4"],"answerEntries":["1.3","6.1"],"anchorUsed":"the facade plaque","quotationsUsed":["my soul is in that church"]}

CRITICAL: The two entry arrays are DIFFERENT and must be populated independently.

"observationEntries" — list the knowledge database entry IDs that describe the PHYSICAL FEATURE you are directing the group to look at in the observation. If your observation says "look at the stone plaque on the facade," list the entry ID for the plaque (not for Jane Stanford's biography). This array should name the THING in the photograph the learner needs to find — not the topic of the answer. The app uses this list to pick a photograph of what they are being asked to observe.

"answerEntries" — list the knowledge database entry IDs that informed the CONTENT of your narrative answer. For a "who built it?" question, the answer entries might include Jane Stanford's biography, the stonemasons, or the architects — whatever you actually drew the answer from. The app uses this list to pick a secondary photograph that illustrates the narrative.

"anchorUsed" — short noun phrase (3-7 words) naming the physical thing your observation points the group to look at. Example: "the facade plaque", "the carved arcade capitals", "the empty niches in the chancel". null if there is no observation. The app uses this to prevent you from recycling the same anchor in later turns.

"quotationsUsed" — array of any direct quotes you embedded in the answer, copied verbatim. Example: ["my soul is in that church"]. Empty array [] if no direct quotes. The app uses this to prevent recycling quotations.

Example: question "Who built the church?" → observation points to the plaque on the facade → observationEntries lists the plaque/facade entry → answerEntries lists Jane Stanford + architect entries → anchorUsed: "the facade plaque" → quotationsUsed: ["my soul is in that church"] (only if you actually used it).

If the observation is null, set observationEntries to [] and anchorUsed to null. If your answer draws from nothing in the database (an "I don't know" response), set answerEntries to [].

OBSERVATION (strongly preferred — only null in rare cases):
Your strong default is to include an observation. Before giving information, direct the pair or group to look at something specific and physical in or around the church, then end with a question they can talk about together. This is how they learn — by seeing first, then discussing, then understanding. Your job in the observation is not to teach — it is to push their attention outward, off the phone, toward the building and each other.

CRITICAL RULE — EVERY OBSERVATION MUST END IN A QUESTION.
The closing question is the most important part. It does three things:
1. Keeps the conversation going between the pair or group (not between them and the phone)
2. Directs attention outward — toward the stone, the light, the space, the sky, the people they came with — not back into the screen
3. Rewards close looking OR imaginative thinking, depending on which closing type you choose

Vary the type of closing question. Never use the same type twice in a row. Mix these three:

1. CLOSE OBSERVATIONAL — asks them to notice or count something concrete together. Use this most of the time.
   "Step back into the Quad and look up at the mosaic above the entrance. Among the 47 figures, find the women — how many can you spot together?"
   "Face the altar and look at the twelve golden niches along the lower chancel walls. Which one catches your eye first, and why do you think that is?"

2. REFLECTIVE / PERSONAL — asks what they think, feel, or imagine.
   "Run your hand along the sandstone of the arch to your right. What does it make you think of — beach, bone, bread, something else?"
   "Look at the inscription on the facade — 'to the glory of God and in loving memory of her husband.' If you were building a memorial to someone you loved, what would you want carved in the stone?"

3. LARGER CONTEXT — pulls the frame wider toward the era, the campus, the human story, or California in that moment. Use this roughly 1 in every 3–4 observations, to give the group breaks from close-in looking.
   "Step back from the facade and take in the whole building against the sky. It's 1903 — three years before the 1906 earthquake shakes everything apart. What else do you think was being built in California right now?"
   "Turn your back on the church for a moment and look across the Quad, down the palm-lined approach to the Oval. Why do you think the Stanfords made THIS the focal point of the whole campus, rather than the library or a lecture hall?"

Most questions — even ones that sound abstract — have a physical anchor somewhere in this building. Think creatively:
- "Who built it?" → the carved stone arches (10 men, two years on scaffolds), or the stone plaque on the facade naming Jane Stanford
- "Why was it built?" → the inscription on the facade: "erected by Jane Lathrop Stanford to the glory of God and in loving memory of her husband" — grief made visible in stone
- "When was it built?" → the arcades connecting the church to the Quad on either side — same sandstone, same architects, one continuous system from the 1890s
- "What style is it?" → the exposed-timber ceiling above you, modelled after Boston's Trinity Church

Address the pair or group directly: "Together, look at..." / "Find the..." / "Turn toward..." Length: 1–3 sentences, INCLUDING the closing question.

Set observation to null ONLY when the question genuinely has no physical connection — for example, a question about a person's biography that doesn't relate to any visible feature, or a question about something that happened elsewhere entirely. This should be rare. When in doubt, find the anchor.

ANSWER:
When there was an observation, write knowing the group has already been looking at the thing you pointed them toward — connect your narrative to what they just saw. When there wasn't, lead with your narrative directly.

CATEGORY-AWARE RESPONSE DIFFERENTIATION:
When a question is primarily about WHO (people, creators, communities), lead with human stories, names, and relationships.
When about WHAT (physical features), lead with materials, dimensions, and what they can observe.
When about WHEN (timeline), lead with chronology and change over time.
When about WHERE (location), lead with spatial relationships and what's nearby.
When about WHY (motivation), lead with intentions, beliefs, and contested interpretations.
When about HOW (process), lead with methods, craftsmanship, and steps.

The categories tell you where to LEAD, not what to exclude. A "who" answer can mention dates; a "when" answer can name people. But the emphasis should differ noticeably.

USE SESSION CONTEXT:
The "Session so far" block (when present) lists anchors and quotations already used in this conversation, recent question categories, and locations covered. Don't repeat anchors or quotations from those lists — pick a different physical detail or paraphrase. If recent questions cluster on one category or location, vary your angle (lead from a different category) or thread to somewhere else in the church.

ENGAGE CONTESTED MATERIAL. The knowledge base contains controversies — costs that drew criticism, opposition from David Starr Jordan, Jewish students worshipping in secret, the contradiction of railroad wealth from Chinese labour, the contested naming of the facade mosaic. When a question opens that door, walk through. Don't deflect into inspiring narrative. If asked about cost, don't say "they spared no expense"; say "David Starr Jordan worried publicly that the money should have gone to the library."

VOICE & STYLE — THIS IS CRITICAL:

You are not a textbook. You are not a chatbot. You are not a tour guide reading from a script. You are a friend who has spent years falling in love with this building and can't help sharing what you know.

Vary your approach. Choose from these styles and mix them — never use the same pattern twice in a row:

- Begin with a vivid detail: "Each piece of glass in that mosaic is roughly the size of a sugar cube, hand-cut in Venice from a palette of over 20,000 shades..."
- Begin with the human story: "In 1890, Jane Stanford sat across from Maurizio Camerino in his Venice studio — the same man who had rushed to her side when her son died in Florence six years earlier..."
- Begin with a surprise: "Those twelve golden niches look like they were designed for candles. They weren't."
- Begin with what's missing: "There used to be an 80-foot spire above your head. It fell during the 1906 earthquake and was never rebuilt."
- Begin with a gentle contradiction: "Most people call the facade mosaic 'The Sermon on the Mount.' Historian Richard Joncas would politely disagree."
- Begin with an anecdote: "Jane Stanford once notched the tip of her parasol so she could check the depth of stone carvings. She'd climb the scaffolding in her long skirts, parasol in hand, and measure the work herself."

SENTENCE RHYTHM: Vary your sentence length. A short sentence lands differently after a long one. Let some breathe and unfurl with subordinate clauses and sensory detail, the way good prose does. Then stop short. Like that.

LENGTH: 60-120 words for the answer. Tight enough to hold attention, long enough to tell a story.

ENDINGS: Every answer must end with one of these (vary which you use):
- A specific thing to look for next: "Now look at the carved cherubs above the niches — each face is different. See if you can spot one that looks like it's laughing."
- A question that deepens thinking: "If the dome mosaics had been real glass instead of paint, how different do you think this room would feel?"
- A thread to somewhere else in the church: "The same Venice studio that made these mosaics also made the ones at the Cantor Arts Center — worth comparing if you walk over."

EPISTEMIC HONESTY — CRITICAL:
Before responding, assess whether the knowledge database contains specific, verified information that directly answers what is being asked.

If you have clear, relevant information: answer confidently.

If you have related but not directly relevant information: say "I don't have specific information about that" plainly. Then offer what you DO know: "What I do know is..." Then turn it back: "What clues can you see here that might help you figure it out?" or "How would you try to find that out?"

If you have nothing relevant: say so plainly. Ask the learner to consider the question themselves — what they can observe, what they might infer. Suggest they contribute what they discover: "If you find something out, you can add it here — that's how this knowledge base grows."

NEVER fabricate, speculate, or stretch thin information to sound authoritative. An honest "I don't know" is always better than a plausible-sounding guess.

Never invent facts. Everything must come from the database.

KNOWLEDGE DATABASE:
${knowledgeDB}`;

const DEEPEN_PROMPT = `You are a thoughtful companion helping a pair of people explore Stanford Memorial Church more deeply. They are currently at a specific location in the church and want to continue discussing what they see.

Generate a conversation-starting question for the pair. The question should invite personal reflection, theory-building, historical imagination, or close observation — NOT direct them to a new location. Stay where they are.

Vary the question type. Choose from:
- Theory-building: "Why do you think Jane Stanford chose this particular scene? What does your pair think it says about her values?"
- Observational: "Look more closely at the left side compared to the right. Can you spot any differences in the glass?"
- Personal/reflective: "If you were building a memorial to someone you loved, what would you want people to notice first?"
- Historical imagination: "Imagine standing here in 1906, the morning after the earthquake. What would you see?"

Respond with ONLY raw JSON — no markdown, no code fences, no backticks:
{"question":"...","entriesUsed":["3.1"]}

The "entriesUsed" field lists knowledge database entry IDs that your question touches on (e.g., "3.1" if you're asking about the facade mosaic). The app uses this internally to pick a photo. Empty array [] if the question is generic.

Keep the question to 1-2 sentences. Make it genuinely interesting — something the pair will want to talk about.

KNOWLEDGE DATABASE:
${knowledgeDB}`;

const ZOOM_OUT_PROMPT = `You are a thoughtful companion helping a pair of people exploring Stanford Memorial Church step back from close-in observation and see the bigger picture. They have been focused on specific objects and details for several inquiries in a row. Now it is time to widen the frame.

Generate a question that BRIDGES what they have actually explored so far. Be specific to what they have seen — don't ask abstract questions like "what do you think this place means?" Instead, refer to the entries and locations they've already covered (provided below) and build a question that connects two or more of them.

Reference something the learner can physically do — turn around, look across the Quad toward the Oval and the palm-lined approach, look up at the sky above the dome, think about what was happening in California in that era (the Gold Rush aftermath, the railroads, the 1906 earthquake reshaping the Bay Area), consider how a family's grief became a university that now educates tens of thousands.

Vary the angle. Choose from:
- Synthesis across what they've seen: "you've heard about the spire that fell in 1906 and seen the empty niches in the chancel where statues used to be — what do you think this church is choosing to remember about its losses?"
- Campus context: "Turn around and look back across the Oval toward the palms. The church sits at the head of the entire campus — why do you think the Stanfords made it the focal point rather than, say, the library or a lecture hall?"
- Historical era: "Memorial Church was dedicated in 1903 — three years before the 1906 earthquake shook everything apart. What else do you think was being built in California at that moment?"
- Outside-in: "If you walked off this Quad right now and told a friend what this church is, what would you say? How would you describe it without using the word 'church'?"

If the learner can't answer your bigger question right away, that's fine — the conversation's purpose is to invite them to look at more. You may suggest one or two specific things they might explore next.

Respond with ONLY raw JSON — no markdown, no code fences, no backticks:
{"question":"...","entriesUsed":["10.3"]}

The "entriesUsed" field lists knowledge database entry IDs your question depends on. The app uses this to pick an anchor photo and to track when the question can be resurfaced later if the learner doesn't engage with it now. Empty array [] if none apply.

Keep the question to 1–2 sentences. Make it a question that genuinely pulls the frame wider.

KNOWLEDGE DATABASE:
${knowledgeDB}`;

// Phrases the model is bad at avoiding through prompt instructions alone.
// We strip 'em out here so the system prompt doesn't have to keep nagging.
const BANNED_PHRASES = [
  'delve',
  'tapestry',
  'rich history',
  'nestled',
  'great question',
  'let me break this down',
  "here's the thing",
];

const MAX_REGENERATION_RETRIES = 0;

interface ValidationProblem {
  message: string;
}

interface ValidatedAskShape {
  observation: string | null;
  answer: string;
  observationEntries: string[];
  answerEntries: string[];
  anchorUsed: string | null;
  quotationsUsed: string[];
}

/**
 * Lightweight similarity for quotation dedupe — substring either way after
 * normalising whitespace + lowercasing. Catches paraphrase recycling like
 * "my soul is in that church" vs "my soul is in that church.".
 */
function similarQuote(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').replace(/[.,;:!?"'()]/g, '').trim();
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length >= 12 && nb.length >= 12) {
    return na.includes(nb) || nb.includes(na);
  }
  return false;
}

function validateResponse(
  res: ValidatedAskShape,
  mem: SessionMemory
): { ok: boolean; problems: ValidationProblem[] } {
  const problems: ValidationProblem[] = [];

  // 1. Word count — only if there's an answer to count
  const wordCount = res.answer.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount > 120) {
    problems.push({ message: `The answer is ${wordCount} words. Condense to under 120 words while keeping the voice and the ending.` });
  }

  // 2. Recycled anchor
  if (res.anchorUsed) {
    const lowerAnchor = res.anchorUsed.toLowerCase();
    const recycled = mem.recentObservationAnchors.some((a) => a.toLowerCase() === lowerAnchor);
    if (recycled) {
      problems.push({ message: `The anchor "${res.anchorUsed}" was already used recently. Pick a different physical detail to point the group at.` });
    }
  }

  // 3. Recycled quotations
  for (const q of res.quotationsUsed || []) {
    if (mem.recentQuotations.some((used) => similarQuote(q, used))) {
      problems.push({ message: `The quotation "${q}" was already used recently. Paraphrase it or draw on a different quote.` });
    }
  }

  // 4. Banned phrases
  const lowerAnswer = res.answer.toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    if (lowerAnswer.includes(phrase)) {
      problems.push({ message: `Remove the phrase "${phrase}" — rewrite the sentence without it.` });
    }
  }

  return { ok: problems.length === 0, problems };
}

function parseAskJson(rawText: string): ValidatedAskShape | null {
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    const legacyEntries = Array.isArray(parsed.entriesUsed) ? parsed.entriesUsed : [];
    return {
      observation: typeof parsed.observation === 'string' ? parsed.observation : null,
      answer: typeof parsed.answer === 'string' ? parsed.answer : '',
      observationEntries: Array.isArray(parsed.observationEntries) ? parsed.observationEntries : legacyEntries,
      answerEntries: Array.isArray(parsed.answerEntries) ? parsed.answerEntries : legacyEntries,
      anchorUsed: typeof parsed.anchorUsed === 'string' && parsed.anchorUsed.trim() ? parsed.anchorUsed.trim() : null,
      quotationsUsed: Array.isArray(parsed.quotationsUsed) ? parsed.quotationsUsed.filter((x: unknown): x is string => typeof x === 'string' && !!x.trim()) : [],
    };
  } catch {
    return null;
  }
}

function formatSessionMemoryForPrompt(mem: SessionMemory): string {
  // No memory to surface? Skip the block entirely so the model doesn't get
  // a confusing "everything is empty" preamble on the very first turn.
  if (
    mem.recentObservationAnchors.length === 0 &&
    mem.recentQuotations.length === 0 &&
    mem.recentQuestionCategories.length === 0 &&
    mem.locationsEverDiscussed.length === 0 &&
    mem.substantiveTurnCount === 0
  ) {
    return '';
  }
  const lines = [
    '',
    'SESSION SO FAR:',
    `- Anchors already used: ${JSON.stringify(mem.recentObservationAnchors)}`,
    `- Quotations already used: ${JSON.stringify(mem.recentQuotations)}`,
    `- Recent question categories: ${JSON.stringify(mem.recentQuestionCategories)}`,
    `- Locations discussed: ${JSON.stringify(mem.locationsEverDiscussed)}`,
    `- Turns so far: ${mem.substantiveTurnCount}`,
    '',
    "Use this to vary your approach. Don't reuse anchors or quotations from these lists. If the recent questions cluster around one type or location, change angle or thread elsewhere.",
  ];
  return lines.join('\n');
}

function formatCoverageForZoomOut(mem: SessionMemory): string {
  if (mem.entriesEverUsed.length === 0 && mem.locationsEverDiscussed.length === 0) {
    return '';
  }
  return [
    '',
    'COVERAGE SO FAR:',
    `- Entries the learner has covered: ${JSON.stringify(mem.entriesEverUsed)}`,
    `- Locations discussed: ${JSON.stringify(mem.locationsEverDiscussed)}`,
    '',
    'Generate a question that bridges what they have actually explored above. Be specific to those entries and locations.',
  ].join('\n');
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function callAnthropic(
  apiKey: string,
  systemPrompt: string,
  messages: ChatMessage[],
  maxTokens: number
): Promise<{ ok: true; text: string } | { ok: false; status: number; body: string }> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    return { ok: false, status: response.status, body };
  }
  const data = await response.json();
  const text = (data.content?.[0]?.text || '').trim();
  return { ok: true, text };
}

interface AskRequestBody {
  question?: string;
  mode?: 'deepen' | 'zoom_out';
  pinContext?: string;
  sessionMemory?: Partial<SessionMemory>;
}

function coerceMemory(input: Partial<SessionMemory> | undefined): SessionMemory {
  const empty = emptyMemory();
  if (!input) return empty;
  return {
    recentObservationAnchors: Array.isArray(input.recentObservationAnchors) ? input.recentObservationAnchors : empty.recentObservationAnchors,
    recentQuotations: Array.isArray(input.recentQuotations) ? input.recentQuotations : empty.recentQuotations,
    recentQuestionCategories: Array.isArray(input.recentQuestionCategories) ? input.recentQuestionCategories : empty.recentQuestionCategories,
    entriesEverUsed: Array.isArray(input.entriesEverUsed) ? input.entriesEverUsed : empty.entriesEverUsed,
    locationsEverDiscussed: Array.isArray(input.locationsEverDiscussed) ? input.locationsEverDiscussed : empty.locationsEverDiscussed,
    substantiveTurnCount: typeof input.substantiveTurnCount === 'number' ? input.substantiveTurnCount : empty.substantiveTurnCount,
    openZoomOutQuestions: Array.isArray(input.openZoomOutQuestions) ? input.openZoomOutQuestions : empty.openZoomOutQuestions,
  };
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        observation: 'Look up at the facade mosaic above the entrance — the largest mosaic in America when it was completed.',
        answer: "The knowledge base isn't connected yet — add your Anthropic API key to .env.local to enable questions.",
        observationEntries: [],
        answerEntries: [],
        anchorUsed: null,
        quotationsUsed: [],
      },
      { status: 200 }
    );
  }

  let body: AskRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const question = body.question;
  const mode = body.mode;
  const pinContext = body.pinContext;
  const sessionMemory = coerceMemory(body.sessionMemory);

  if (!question || typeof question !== 'string' || question.length > 500) {
    return NextResponse.json({ error: 'Invalid question' }, { status: 400 });
  }

  try {
    // "Deepen" or "Zoom-out" mode: generate a question (reflective or bigger-picture)
    if (mode === 'deepen' || mode === 'zoom_out') {
      const isZoomOut = mode === 'zoom_out';
      const baseSystem = isZoomOut ? ZOOM_OUT_PROMPT : DEEPEN_PROMPT;
      const systemPrompt = isZoomOut
        ? baseSystem + formatCoverageForZoomOut(sessionMemory)
        : baseSystem;

      const userMsg = pinContext
        ? `The pair is currently at: ${pinContext}. ${isZoomOut ? 'Generate a question that zooms out from this specific object toward the bigger picture, bridging what they have already explored.' : 'Generate a conversation-starting question about this specific location.'}`
        : isZoomOut
          ? `Generate a question that zooms out from Memorial Church toward the wider campus, era, or themes — bridging what they have already explored.`
          : `Generate a conversation-starting question about Memorial Church.`;

      const fallback = isZoomOut
        ? 'Turn around and look back across the Quad. How does this church fit into the larger story of what the Stanfords built here?'
        : "What details here surprised you the most? Talk about why.";

      const result = await callAnthropic(apiKey, systemPrompt, [{ role: 'user', content: userMsg }], 300);
      let finalQuestion = fallback;
      let entriesUsed: string[] = [];
      if (result.ok) {
        const cleaned = result.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        try {
          const parsed = JSON.parse(cleaned);
          finalQuestion = (typeof parsed.question === 'string' && parsed.question.trim()) || fallback;
          entriesUsed = Array.isArray(parsed.entriesUsed) ? parsed.entriesUsed : [];
        } catch {
          finalQuestion = cleaned || fallback;
        }
      }

      logToSheet({
        type: mode as 'deepen' | 'zoom_out',
        question: mode,
        observation: null,
        answer: finalQuestion,
        pinContext: pinContext || null,
        hintsUsed: 0,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        question: finalQuestion,
        entriesUsed,
      });
    }

    // Standard mode: answer a question
    const hints = findRelevantHints(question);
    const hintsSection = formatHintsForPrompt(hints);
    const categories = classifyQuestion(question);
    const categorySection = `\n\nDETECTED QUESTION CATEGORIES: ${categories.join(', ')}. Emphasise the ${categories[0]} angle in your response.`;
    const memorySection = formatSessionMemoryForPrompt(sessionMemory);
    const systemWithContext = SYSTEM_PROMPT + hintsSection + categorySection + memorySection;

    // Conversation history grows on each retry. We start with the user's
    // question; if the first response fails validation, we append the
    // assistant's reply and a corrective user turn listing the problems.
    const messages: ChatMessage[] = [{ role: 'user', content: question }];
    let attempt = 0;
    let parsed: ValidatedAskShape | null = null;
    let lastRawText = '';
    let lastProblems: ValidationProblem[] = [];

    while (attempt <= MAX_REGENERATION_RETRIES) {
      const apiResult = await callAnthropic(apiKey, systemWithContext, messages, 600);
      if (!apiResult.ok) {
        console.error(`Anthropic API ${apiResult.status}:`, apiResult.body);
        let detail = '';
        try {
          const parsedErr = JSON.parse(apiResult.body);
          detail = parsedErr.error?.message || apiResult.body;
        } catch {
          detail = apiResult.body.slice(0, 200);
        }
        return NextResponse.json(
          {
            observation: null,
            answer: `API error (${apiResult.status}): ${detail}`,
            observationEntries: [],
            answerEntries: [],
            anchorUsed: null,
            quotationsUsed: [],
          },
          { status: 200 }
        );
      }

      lastRawText = apiResult.text;
      parsed = parseAskJson(apiResult.text);

      if (!parsed) {
        // Couldn't parse JSON at all — break out and ship the raw text as the answer.
        break;
      }

      const validation = validateResponse(parsed, sessionMemory);
      if (validation.ok) {
        lastProblems = [];
        break;
      }

      lastProblems = validation.problems;
      attempt += 1;
      if (attempt > MAX_REGENERATION_RETRIES) break;

      // Feed the assistant's reply + a correction message for the next turn.
      messages.push({ role: 'assistant', content: apiResult.text });
      messages.push({
        role: 'user',
        content:
          'Your previous response had issues that need fixing:\n' +
          validation.problems.map((p, i) => `${i + 1}. ${p.message}`).join('\n') +
          '\n\nReturn a corrected version following the same JSON schema (six fields). Do not change the substance of the answer unnecessarily — just address these problems.',
      });
    }

    let result: ValidatedAskShape;
    if (parsed) {
      result = {
        observation: parsed.observation,
        answer: parsed.answer || "I couldn't find an answer to that. Try asking about something you can see — the mosaics, windows, or architecture.",
        observationEntries: parsed.observationEntries,
        answerEntries: parsed.answerEntries,
        anchorUsed: parsed.anchorUsed,
        quotationsUsed: parsed.quotationsUsed,
      };
    } else {
      result = {
        observation: null,
        answer: lastRawText || "I couldn't find an answer to that.",
        observationEntries: [],
        answerEntries: [],
        anchorUsed: null,
        quotationsUsed: [],
      };
    }

    logToSheet({
      type: 'ask',
      question,
      observation: result.observation,
      answer: result.answer,
      pinContext: null,
      hintsUsed: hints.length,
      timestamp: new Date().toISOString(),
    });

    // If we exhausted retries, ship the last response anyway — better to
    // serve something with a known issue than to block the learner.
    if (lastProblems.length > 0) {
      console.warn('[ask] Shipping response despite unresolved validation issues:', lastProblems.map((p) => p.message));
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('Ask route error:', err);
    return NextResponse.json(
      {
        observation: null,
        answer: "Something went wrong. Try asking a simpler question about what you can see in the church.",
        observationEntries: [],
        answerEntries: [],
        anchorUsed: null,
        quotationsUsed: [],
      },
      { status: 200 }
    );
  }
}
