/**
 * POST /api/transcribe — sends audio to Deepgram for transcription.
 *
 * Receives an audio blob from the client, forwards it to Deepgram's
 * REST API (Nova-2 model), and returns the cleaned transcript.
 *
 * Deepgram API key is stored server-side in DEEPGRAM_API_KEY.
 */

import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Deepgram API key not configured' },
      { status: 500 }
    );
  }

  try {
    const audioBlob = await req.arrayBuffer();

    if (!audioBlob || audioBlob.byteLength === 0) {
      return NextResponse.json(
        { error: 'No audio data received' },
        { status: 400 }
      );
    }

    // Determine content type from request header
    const contentType = req.headers.get('content-type') || 'audio/webm';

    const dgUrl = new URL('https://api.deepgram.com/v1/listen');
    dgUrl.searchParams.set('model', 'nova-2');
    dgUrl.searchParams.set('smart_format', 'true');
    dgUrl.searchParams.set('filler_words', 'false');
    dgUrl.searchParams.set('utterances', 'true');
    dgUrl.searchParams.set('paragraphs', 'true');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const dgRes = await fetch(dgUrl.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': contentType,
      },
      body: audioBlob,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!dgRes.ok) {
      const errText = await dgRes.text();
      console.error('[transcribe] Deepgram error:', dgRes.status, errText);
      return NextResponse.json(
        { error: 'Transcription failed' },
        { status: 502 }
      );
    }

    const dgData = await dgRes.json();

    // Extract the transcript from Deepgram's response
    const transcript =
      dgData?.results?.channels?.[0]?.alternatives?.[0]?.paragraphs?.transcript ||
      dgData?.results?.channels?.[0]?.alternatives?.[0]?.transcript ||
      '';

    if (!transcript.trim()) {
      return NextResponse.json(
        { error: 'No speech detected' },
        { status: 422 }
      );
    }

    return NextResponse.json({ transcript: transcript.trim() });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Transcription timed out' },
        { status: 504 }
      );
    }
    console.error('[transcribe] Error:', err);
    return NextResponse.json(
      { error: 'Transcription failed' },
      { status: 500 }
    );
  }
}
