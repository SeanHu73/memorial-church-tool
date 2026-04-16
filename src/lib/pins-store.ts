/**
 * Pin data layer.
 *
 * Reads pins from Firestore `memorial-church-pins` collection, falling back
 * to the seed pins in `seed-pins.ts` if Firestore is empty or unavailable.
 *
 * When Sean adds photos via the admin interface, those writes land in
 * Firestore and override the seed version of the same pin (matched by id).
 *
 * Seed pins are always available as a synchronous baseline so the map and
 * bottom sheets can render immediately while Firestore loads.
 */

import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Pin } from './types';
import { seedPins } from './seed-pins';

const PINS_COLLECTION = 'memorial-church-pins';

/**
 * Merge Firestore pins onto the seed pin baseline.
 * Firestore fields override seed fields for any pin with a matching id.
 * Firestore-only pins (added via admin) are included as new entries.
 */
function mergePins(firestorePins: Pin[]): Pin[] {
  const byId = new Map<string, Pin>();
  for (const p of seedPins) byId.set(p.id, p);
  for (const p of firestorePins) {
    const existing = byId.get(p.id);
    if (existing) {
      // Merge: Firestore fields override seed fields (photos especially)
      byId.set(p.id, { ...existing, ...p });
    } else {
      byId.set(p.id, p);
    }
  }
  return Array.from(byId.values());
}

/**
 * Get all pins — Firestore first, seed fallback.
 * Returns seed pins synchronously if Firestore is empty or errors out.
 */
export async function getPins(): Promise<Pin[]> {
  try {
    const snap = await getDocs(collection(db, PINS_COLLECTION));
    if (snap.empty) return seedPins;
    const firestorePins: Pin[] = [];
    snap.forEach((d) => {
      firestorePins.push({ id: d.id, ...d.data() } as Pin);
    });
    return mergePins(firestorePins);
  } catch (err) {
    console.error('Failed to load pins from Firestore, using seed:', err);
    return seedPins;
  }
}

/**
 * Write a pin to Firestore. Used by the admin interface.
 * Overwrites the document at `memorial-church-pins/<pinId>`.
 */
export async function savePin(pin: Pin): Promise<void> {
  // Strip the id from the data payload (id is the doc key)
  const { id, ...data } = pin;
  await setDoc(doc(db, PINS_COLLECTION, id), data);
}

export { seedPins };
