/**
 * POST /api/log-tour — logs tour session events to Google Sheets.
 *
 * Accepts tour events (reflection scores, banked questions, tour
 * completion) from the client and appends them as rows via the same
 * Google Sheets webhook used by the ask logger.
 *
 * Keeps the webhook URL server-side (no NEXT_PUBLIC_ exposure).
 */

import { NextResponse } from 'next/server';

interface TourLogEntry {
  event: 'reflection' | 'question_banked' | 'question_routed' | 'tour_complete';
  tourId: string;
  sessionId: string;
  tourTitle?: string;
  stopIndex?: number;
  stopTitle?: string;
  // Reflection
  reflectionScore?: number;
  // Question
  questionText?: string;
  questionRouting?: 'coming_up' | 'answered_off_path' | 'banked';
  // Completion
  stopsCompleted?: number;
  totalStops?: number;
  durationMinutes?: number;
  timestamp: string;
}

export async function POST(req: Request) {
  try {
    const entry: TourLogEntry = await req.json();

    const url = process.env.SHEETS_WEBHOOK_URL;
    if (!url) {
      console.warn('[log-tour] Skipped: SHEETS_WEBHOOK_URL not set');
      return NextResponse.json({ ok: true });
    }

    // Tag so the sheet can distinguish tour events from ask events
    const row = {
      ...entry,
      source: 'tour',
    };

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(row),
      keepalive: true,
    }).catch((err) => {
      console.error('[log-tour] Sheet write error:', err);
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
