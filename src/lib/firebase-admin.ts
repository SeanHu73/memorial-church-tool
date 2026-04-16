// Server-side Firebase for logging questions to Firestore
// Uses the REST API so we don't need firebase-admin SDK

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

interface QuestionLog {
  question: string;
  observation: string | null;
  answer: string;
  hintsUsed: number;
  timestamp: string;
}

interface ContributionLog {
  pinId: string | null;
  question: string;
  contribution: string;
  timestamp: string;
  verified: boolean;
}

export async function logQuestion(entry: QuestionLog): Promise<void> {
  if (!PROJECT_ID || !API_KEY) {
    console.warn('[logQuestion] Skipped: NEXT_PUBLIC_FIREBASE_PROJECT_ID or NEXT_PUBLIC_FIREBASE_API_KEY is not set in this environment.');
    return;
  }

  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/memorial-church-questions?key=${API_KEY}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          question: { stringValue: entry.question },
          observation: entry.observation
            ? { stringValue: entry.observation }
            : { nullValue: null },
          answer: { stringValue: entry.answer },
          hintsUsed: { integerValue: String(entry.hintsUsed) },
          timestamp: { stringValue: entry.timestamp },
        },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      // Visible in Vercel function logs — most commonly a Firestore security
      // rule rejection. Fix by allowing unauthenticated writes to
      // memorial-church-questions (test config) or switching to a service
      // account for production.
      console.error(`[logQuestion] Firestore write failed (${res.status}):`, body.slice(0, 300));
    }
  } catch (err) {
    console.error('[logQuestion] Network error writing to Firestore:', err);
  }
}

export async function logContribution(entry: ContributionLog): Promise<void> {
  if (!PROJECT_ID || !API_KEY) return;

  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/memorial-church-contributions?key=${API_KEY}`;

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          pinId: entry.pinId
            ? { stringValue: entry.pinId }
            : { nullValue: null },
          question: { stringValue: entry.question },
          contribution: { stringValue: entry.contribution },
          timestamp: { stringValue: entry.timestamp },
          verified: { booleanValue: false },
        },
      }),
    });
  } catch {
    console.error('Failed to log contribution to Firestore');
  }
}
