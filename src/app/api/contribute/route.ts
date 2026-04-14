import { NextRequest, NextResponse } from 'next/server';
import { logContribution } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  let pinId: string | null;
  let question: string;
  let contribution: string;

  try {
    const body = await req.json();
    pinId = body.pinId || null;
    question = body.question;
    contribution = body.contribution;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!question || typeof question !== 'string') {
    return NextResponse.json({ error: 'Missing question' }, { status: 400 });
  }

  if (!contribution || typeof contribution !== 'string' || contribution.length > 1000) {
    return NextResponse.json({ error: 'Invalid contribution' }, { status: 400 });
  }

  try {
    await logContribution({
      pinId,
      question,
      contribution,
      timestamp: new Date().toISOString(),
      verified: false,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Contribute route error:', err);
    return NextResponse.json({ error: 'Failed to save contribution' }, { status: 500 });
  }
}
