export type QuestionCategory = 'who' | 'what' | 'when' | 'where' | 'why' | 'how';

export interface PhotoAnnotation {
  x: number;             // percentage position (0-100)
  y: number;
  caption: string;
  categories: QuestionCategory[];
  clues: Partial<Record<QuestionCategory, string>>;
}

export type PhysicalLocationTag =
  | 'exterior_facade'
  | 'exterior_sides'
  | 'exterior_rear'
  | 'narthex'
  | 'nave'
  | 'nave_aisles'
  | 'crossing'
  | 'dome'
  | 'chancel'
  | 'transepts'
  | 'side_chapel'
  | 'organ_loft'
  | 'general';

export interface PinPhoto {
  url: string;
  type: 'onsite' | 'archival' | 'contributor';
  caption: string;
  credit: string;
  source: string | null;           // URL of the original archive source (for archival)
  year: string | null;             // when the photo was taken (for archival)
  license: string | null;          // licence status (for archival)
  physicalLocationTag: string;     // exterior_facade | narthex | nave | crossing | dome | chancel | transepts | side_chapel | organ_loft | general
  databaseEntries: string[];       // knowledge entry IDs this photo illustrates (e.g., ["3.1", "6.1"])
  categories: QuestionCategory[];  // which inquiry angles this photo primarily serves
  annotations: PhotoAnnotation[];
}

/**
 * Standalone Photo record stored in the `memorial-church-photos` Firestore
 * collection. Introduced by the photo_extraction_v1 migration to replace
 * per-pin embedded `PinPhoto` arrays with a photo-centric model.
 *
 * A Photo can attach to zero, one, or many pins via `linkedPinIds`. The
 * learner-facing app still reads `pin.photos` for backward compatibility —
 * /admin/photos keeps those embedded copies in sync until a later change
 * flips retrieval to the new collection.
 *
 * Fields that exist only on Photo (not on PinPhoto):
 *   - id             — UUID doc key in the new collection
 *   - description    — 2-4 sentence free-form narrative of what's in the
 *                      image. Powers AI retrieval: "does this photo help
 *                      answer this question?" matches against description
 *                      + keywords, not the structured databaseEntries list.
 *   - keywords       — lowercase tokens derived from captions, annotations,
 *                      pin tags, and knowledge entry titles. Cheap recall
 *                      layer before description-level matching.
 *   - linkedPinIds   — pins this photo belongs to. Empty = unattached
 *                      (valid, e.g. a candidate photo waiting for a pin).
 *   - storageBackend — where the bytes live: vercel-static for URLs under
 *                      /photos/, firebase-storage for uploads, unknown for
 *                      anything else. Lets the admin UI show provenance.
 *   - createdAt / updatedAt — ISO timestamps, set by savePhoto().
 */
export type PhotoStorageBackend = 'vercel-static' | 'firebase-storage' | 'unknown';

export interface Photo {
  id: string;                        // uuid, doc key in memorial-church-photos
  url: string;                       // where the bytes are served from
  storageBackend: PhotoStorageBackend;
  type: 'onsite' | 'archival' | 'contributor';
  caption: string;                   // short line shown under the image
  description: string;               // 2-4 sentence narrative for AI retrieval
  keywords: string[];                // lowercase tokens for cheap recall
  credit: string;
  source: string | null;
  year: string | null;
  license: string | null;
  physicalLocationTag: string;
  databaseEntries: string[];         // kept for compatibility with existing retrieval
  categories: QuestionCategory[];
  annotations: PhotoAnnotation[];
  linkedPinIds: string[];            // pins this photo attaches to (may be empty)
  notes?: string | null;             // optional admin-only context
  createdAt: string;                 // ISO 8601
  updatedAt: string;                 // ISO 8601
}

export interface ObservationHint {
  lookAt: string;      // What to physically look at: "the stone plaque on the facade"
  clue: string;        // How it helps answer this category of question
}

export interface Pin {
  id: string;
  title: string;
  location: {
    lat: number;
    lng: number;
    physicalArea: string;
  };
  photos: PinPhoto[];
  /**
   * New photo-centric linkage. After the photo_extraction_v1 migration runs,
   * this is the authoritative list of photos attached to the pin; the
   * embedded `photos` array above is kept as a cache for the learner-facing
   * app until retrieval is cut over in a later change.
   *
   * Optional because seed pins predating the migration don't carry it.
   */
  photoIds?: string[];
  inquiry: {
    question: string;
    answer: string;
    suggestedNext: {
      pinId: string;
      teaser: string;
    } | null;
  };
  observationHints: Partial<Record<QuestionCategory, ObservationHint>>;
  tags: string[];
  era: string;
  databaseEntryIds: string[];
}

export interface Contribution {
  id?: string;
  pinId: string | null;
  question: string;
  contribution: string;
  timestamp: string;
  verified: boolean;
}
