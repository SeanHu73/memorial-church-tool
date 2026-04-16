import { NextRequest, NextResponse } from 'next/server';
import knowledgeDB from '@/lib/knowledge-db';
import { findRelevantHints, formatHintsForPrompt, classifyQuestion } from '@/lib/hint-matcher';
import { logQuestion } from '@/lib/firebase-admin';

const SYSTEM_PROMPT = `You are a knowledgeable, warm companion to people exploring Stanford Memorial Church. They are standing in or near the church right now, in pairs or small groups. They have asked you a question. You answer using ONLY the knowledge database provided below.

YOUR CORE PRINCIPLE: Direct attention outward. The phone should send people toward the building, not trap them in a screen.

HOW TO RESPOND:

Respond with ONLY raw JSON — no markdown, no code fences, no backticks. Two fields:

{"observation":"...or null","answer":"..."}

OBSERVATION (strongly preferred — only null in rare cases):
Your strong default is to include an observation. Before giving information, direct the group to look at something specific and physical in or around the church. This is how they learn — by seeing first, then understanding.

Most questions — even ones that sound abstract — have a physical anchor somewhere in this building. Think creatively:
- "Who built it?" → the carved stone arches (10 men, two years on scaffolds), or the stone plaque on the facade naming Jane Stanford
- "Why was it built?" → the inscription on the facade: "erected by Jane Lathrop Stanford to the glory of God and in loving memory of her husband" — grief made visible in stone
- "When was it built?" → the arcades connecting the church to the Quad on either side — same sandstone, same architects, one continuous system from the 1890s
- "What style is it?" → the exposed-timber ceiling above you, modelled after Boston's Trinity Church

Be specific and spatial. Not "look around the church" but "Face the altar and look at the twelve golden niches that line the lower chancel walls." Not "observe the facade" but "Step back into the Quad and look up at the mosaic above the entrance — find the women among the 47 figures."

The observation should be 1-3 sentences. Address the group: "Together, look at..." / "Find the..." / "Turn toward..."

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

WHAT TO AVOID:
- Never start with "Great question!" or any meta-commentary about their question
- Never use bullet points or numbered lists
- Never write in the clipped style of AI assistants — no "Here's the thing:" or "Let me break this down"
- Never use "delve" or "tapestry" or "rich history" or "nestled"
- Avoid repetitive rhythm: [short sentence]. [Short sentence]. [Short sentence]. Mix it up.

LENGTH: 60-120 words. Tight enough to hold attention, long enough to tell a story.

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
{"question":"..."}

Keep the question to 1-2 sentences. Make it genuinely interesting — something the pair will want to talk about.

KNOWLEDGE DATABASE:
${knowledgeDB}`;

const ZOOM_OUT_PROMPT = `You are a thoughtful companion helping a pair of people exploring Stanford Memorial Church step back from close-in observation and see the bigger picture. They have been focused on specific objects and details for several inquiries in a row. Now it is time to widen the frame.

Generate a question that pulls the group's attention away from the specific object they've been looking at and toward the bigger picture — how this place connects to the wider campus, the historical era, the broader themes of the Stanford story, or the world outside Memorial Church. The question should invite them to think about context, connections, and place-making.

Reference something the learner can physically do — turn around, look across the Quad toward the Oval and the palm-lined approach, look up at the sky above the dome, think about what was happening in California in that era (the Gold Rush aftermath, the railroads, the 1906 earthquake reshaping the Bay Area), consider how a family's grief became a university that now educates tens of thousands.

Vary the angle. Choose from:
- Campus context: "Turn around and look back across the Oval toward the palms. The church sits at the head of the entire campus — why do you think the Stanfords made it the focal point rather than, say, the library or a lecture hall?"
- Historical era: "Memorial Church was dedicated in 1903 — three years before the 1906 earthquake shook everything apart. What else do you think was being built in California at that moment?"
- Thematic connection: "This whole building is a memorial to loss. How does a place that honours the dead end up being used daily by people who are very much alive?"
- Outside-in: "If you walked off this Quad right now and told a friend what this church is, what would you say? How would you describe it without using the word 'church'?"

Respond with ONLY raw JSON — no markdown, no code fences, no backticks:
{"question":"..."}

Keep the question to 1–2 sentences. Make it a question that genuinely pulls the frame wider.

KNOWLEDGE DATABASE:
${knowledgeDB}`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        observation: 'Look up at the facade mosaic above the entrance — the largest mosaic in America when it was completed.',
        answer: "The knowledge base isn't connected yet — add your Anthropic API key to .env.local to enable questions.",
      },
      { status: 200 }
    );
  }

  let question: string;
  let mode: string | undefined;
  let pinContext: string | undefined;
  try {
    const body = await req.json();
    question = body.question;
    mode = body.mode;
    pinContext = body.pinContext;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!question || typeof question !== 'string' || question.length > 500) {
    return NextResponse.json({ error: 'Invalid question' }, { status: 400 });
  }

  try {
    // "Deepen" or "Zoom-out" mode: generate a question (reflective or bigger-picture)
    if (mode === 'deepen' || mode === 'zoom_out') {
      const isZoomOut = mode === 'zoom_out';
      const systemPrompt = isZoomOut ? ZOOM_OUT_PROMPT : DEEPEN_PROMPT;

      const userMsg = pinContext
        ? `The pair is currently at: ${pinContext}. ${isZoomOut ? 'Generate a question that zooms out from this specific object toward the bigger picture.' : 'Generate a conversation-starting question about this specific location.'}`
        : isZoomOut
          ? `Generate a question that zooms out from Memorial Church toward the wider campus, era, or themes.`
          : `Generate a conversation-starting question about Memorial Church.`;

      const fallback = isZoomOut
        ? 'Turn around and look back across the Quad. How does this church fit into the larger story of what the Stanfords built here?'
        : "What details here surprised you the most? Talk about why.";

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMsg }],
        }),
      });

      if (!response.ok) {
        return NextResponse.json({ question: fallback }, { status: 200 });
      }

      const data = await response.json();
      const rawText = (data.content?.[0]?.text || '').trim();
      const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      try {
        const parsed = JSON.parse(cleaned);
        return NextResponse.json({ question: parsed.question || fallback });
      } catch {
        return NextResponse.json({ question: cleaned || fallback });
      }
    }

    // Standard mode: answer a question
    // Find contributor-authored observation hints relevant to this question
    const hints = findRelevantHints(question);
    const hintsSection = formatHintsForPrompt(hints);
    const categories = classifyQuestion(question);
    const categorySection = `\n\nDETECTED QUESTION CATEGORIES: ${categories.join(', ')}. Emphasise the ${categories[0]} angle in your response.`;
    const systemWithHints = SYSTEM_PROMPT + hintsSection + categorySection;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: systemWithHints,
        messages: [{ role: 'user', content: question }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`Anthropic API ${response.status}:`, errBody);
      let detail = '';
      try {
        const parsed = JSON.parse(errBody);
        detail = parsed.error?.message || errBody;
      } catch {
        detail = errBody.slice(0, 200);
      }
      return NextResponse.json(
        {
          observation: null,
          answer: `API error (${response.status}): ${detail}`,
        },
        { status: 200 }
      );
    }

    const data = await response.json();
    const rawText = (data.content?.[0]?.text || '').trim();

    // Strip markdown code fences if the model wrapped its JSON
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    try {
      const parsed = JSON.parse(cleaned);
      const result = {
        observation: parsed.observation || null,
        answer: parsed.answer || "I couldn't find an answer to that. Try asking about something you can see — the mosaics, windows, or architecture.",
      };
      // Log to Firestore (non-blocking)
      logQuestion({
        question,
        observation: result.observation,
        answer: result.answer,
        hintsUsed: hints.length,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(result);
    } catch {
      const result = {
        observation: null,
        answer: cleaned || "I couldn't find an answer to that.",
      };
      logQuestion({
        question,
        observation: null,
        answer: result.answer,
        hintsUsed: hints.length,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(result);
    }
  } catch (err) {
    console.error('Ask route error:', err);
    return NextResponse.json(
      {
        observation: null,
        answer: "Something went wrong. Try asking a simpler question about what you can see in the church.",
      },
      { status: 200 }
    );
  }
}
