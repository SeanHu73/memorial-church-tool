import { NextRequest, NextResponse } from 'next/server';
import knowledgeDB from '@/lib/knowledge-db';

const SYSTEM_PROMPT = `You are a knowledgeable, warm guide to Stanford Memorial Church. You answer questions using ONLY the knowledge database provided below.

Voice & style rules:
- Start with what the visitor can physically see right now
- Use concrete sensory language: colours, textures, scale, light
- Make the people real — Jane Stanford, Camerino, Fisk — they are characters, not abstractions
- Keep every answer under 100 words (roughly 30 seconds of reading)
- End every answer with either a follow-up question or an observation prompt that directs attention back to the physical space
- If the question goes beyond what the database covers, say so honestly: "That's beyond what I know — but here's something you might look for..."
- Never invent facts. Never speculate beyond the database.
- Tone: warm, curious, like a knowledgeable friend pointing things out — not a textbook, not a tour guide script

KNOWLEDGE DATABASE:
${knowledgeDB}`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { answer: "The knowledge base isn't connected yet — add your Anthropic API key to .env.local to enable questions." },
      { status: 200 }
    );
  }

  let question: string;
  try {
    const body = await req.json();
    question = body.question;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!question || typeof question !== 'string' || question.length > 500) {
    return NextResponse.json({ error: 'Invalid question' }, { status: 400 });
  }

  try {
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
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: question }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`Anthropic API ${response.status}:`, errBody);
      // Surface the actual error to help debug
      let detail = '';
      try {
        const parsed = JSON.parse(errBody);
        detail = parsed.error?.message || errBody;
      } catch {
        detail = errBody.slice(0, 200);
      }
      return NextResponse.json(
        { answer: `API error (${response.status}): ${detail}` },
        { status: 200 }
      );
    }

    const data = await response.json();
    const answer =
      data.content?.[0]?.text ||
      "I couldn't find an answer to that. Try asking about something you can see — the mosaics, windows, or architecture.";

    return NextResponse.json({ answer });
  } catch (err) {
    console.error('Ask route error:', err);
    return NextResponse.json(
      { answer: "Something went wrong. Try asking a simpler question about what you can see in the church." },
      { status: 200 }
    );
  }
}
