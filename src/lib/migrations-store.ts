/**
 * Migration-flag store — `memorial-church-migrations` collection.
 *
 * Each document is a single migration's completion receipt. Presence of the
 * document = the migration has run successfully at least once. Absence =
 * the migration still needs to run.
 *
 * Pattern: the admin UI checks `getMigrationFlag('photo_extraction_v1')`;
 * if absent, shows a banner + "Run migration" button; after the migration
 * script completes, calls `setMigrationFlag('photo_extraction_v1', {...})`
 * to record the summary.
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const MIGRATIONS_COLLECTION = 'memorial-church-migrations';

export interface MigrationFlag {
  id: string;
  completedAt: string;                      // ISO 8601
  summary: Record<string, unknown>;         // migration-specific payload
}

export async function getMigrationFlag(id: string): Promise<MigrationFlag | null> {
  try {
    const snap = await getDoc(doc(db, MIGRATIONS_COLLECTION, id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as MigrationFlag;
  } catch (err) {
    console.error('[migrations-store] getMigrationFlag failed:', err);
    return null;
  }
}

export async function setMigrationFlag(
  id: string,
  summary: Record<string, unknown>
): Promise<void> {
  await setDoc(doc(db, MIGRATIONS_COLLECTION, id), {
    completedAt: new Date().toISOString(),
    summary,
  });
}
