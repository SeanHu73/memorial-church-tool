/**
 * Tour session persistence — writes to `memorial-church-tour-sessions`.
 *
 * Saves session data (reflection scores, banked questions, completion)
 * to Firestore so Sean can review what groups experienced. The session
 * doc is keyed by session ID and updated on every meaningful change.
 *
 * NOTE: Firestore security rules must include:
 *   match /memorial-church-tour-sessions/{doc} { allow read, write: if true; }
 */

import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { TourSession } from './types';

const COLLECTION = 'memorial-church-tour-sessions';

export async function persistTourSession(session: TourSession): Promise<void> {
  try {
    const { id, ...data } = session;
    await setDoc(doc(db, COLLECTION, id), {
      ...data,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    // Non-fatal — sessionStorage is the primary store.
    // Firestore persistence is for analytics, not reliability.
    console.error('[tour-sessions-store] persist failed:', err);
  }
}
