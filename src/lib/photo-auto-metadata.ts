/**
 * Auto-metadata generators for migrating embedded PinPhotos to standalone
 * Photo records. Given a PinPhoto plus the owning pin's context, produce:
 *
 *   - a 2-4 sentence `description` suitable for later AI photo retrieval
 *   - a deduped `keywords` array of lowercase tokens
 *   - a `storageBackend` guess from the URL shape
 *
 * These outputs are Sean-editable defaults, not final copy. The migration
 * log records whatever was generated so Sean can review and refine in the
 * /admin/photos UI.
 */

import { Pin, PinPhoto, PhotoStorageBackend } from './types';

/**
 * Map of known knowledge-DB entry IDs to human titles. Kept hand-synced
 * with docs/Memorial_Church_Knowledge_Database.md so keyword generation
 * doesn't have to parse the TS module at runtime. If an ID is missing
 * here, the generator falls back to using the raw id ("3.1" etc).
 */
export const ENTRY_TITLES: Record<string, string> = {
  '1.1': 'The Stanfords: Railroad Wealth, Political Power, and the Birth of a Western University',
  '1.2': 'Jane Stanford: The Woman Who Built the Church',
  '1.2a': 'Founding Vision: A Great University for the West',
  '1.2b': 'The Chinese Railroad Workers Who Built the Stanford Fortune',
  '1.3': 'Charles A. Coolidge: The Young Architect',
  '1.4': 'Maurizio Camerino and the Salviati Studios',
  '1.5': 'Frederick Stymetz Lamb: The Stained Glass Artist',
  '1.6': 'John McGilvray: The Builder',
  '1.7': 'Charles Brenton Fisk: From Atomic Bombs to Baroque Organs',
  '2.1': 'The Building: Form and Dimensions',
  '2.2': 'The Lost Spire and the Memorial Arch',
  '2.3': 'The Quad Connection',
  '3.1': 'The Facade Mosaic: The Largest in America',
  '3.2': 'The Mosaic-Making Process',
  '3.3': 'Interior Nave Mosaics: Old Testament Scenes',
  '3.4': 'The Pendentive Angels: Archangels Holding Up the Dome',
  '3.5': 'The Chancel: Last Supper and the Empty Niches',
  '3.6': 'The Narthex Floor: Lamb of God and the Four Evangelists',
  '3.7': 'The Hidden Mosaic and the Side Chapel',
  '4.1': 'The Windows: Life of Christ',
  '4.2': "The Personal Window: A Mother's Grief",
  '5.1': 'Five Organs Under One Roof',
  '6.1': 'The 1906 Earthquake: Destruction',
  '6.2': 'Reconstruction: Stone by Stone (1908–1916)',
  '6.3': 'The 1989 Loma Prieta Earthquake',
  '7.1': 'The Non-Denominational Experiment',
  '8.1': 'The First Wedding',
  '8.2': 'The Frisbee Golf Incident',
  '8.3': 'The Dalai Lama and Nobel Laureates',
  '8.4': 'The Stolen Angel Wing (and Its Return)',
  '8.5': "Cal's Yearbook Mockery",
  '9.1': 'The Wall Inscriptions',
  '9.2': 'Recurring Motifs: Angels Everywhere',
  '10.1': 'Venice to Palo Alto: The Salviati Network',
  '10.2': 'The Cantor Arts Center Mosaics',
  '10.3': 'The Clock Tower: A Relic of the Lost Steeple',
};

/**
 * Turn an entry id like "3.1" into its human title, falling back to the
 * id itself if unknown (new entry added after this map was last synced).
 */
export function entryTitle(id: string): string {
  return ENTRY_TITLES[id] || id;
}

/**
 * Stopwords dropped from keyword extraction — common English function
 * words plus a few photography-generic tokens. Kept short and conservative;
 * the goal is to strip noise, not to be a full stemmer/stopword list.
 */
const STOPWORDS = new Set<string>([
  'a', 'an', 'the', 'and', 'or', 'but', 'of', 'in', 'on', 'at', 'to', 'for',
  'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'that', 'this', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'there',
  'which', 'who', 'whom', 'whose', 'what', 'when', 'where', 'why', 'how',
  'not', 'no', 'nor', 'so', 'than', 'then', 'also', 'into', 'through', 'about',
  'view', 'viewed', 'image', 'photograph', 'photo', 'photos', 'photography',
  'looking', 'look', 'looks', 'shown', 'showing', 'shows', 'show',
  'one', 'two', 'three', 'four', 'five', 'six', 'eight', 'twelve',
  'above', 'below', 'over', 'under', 'near', 'side', 'sides',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/**
 * Format a location tag into a human phrase, e.g. "exterior_facade" →
 * "exterior facade". Used in description generation so the narrative
 * reads naturally instead of exposing snake_case internals.
 */
export function humanizeLocationTag(tag: string): string {
  return tag.replace(/_/g, ' ').trim();
}

/**
 * Generate a 2-4 sentence narrative description of a photo, stitched
 * together from its caption, type/credit/year, location, and any
 * annotation captions. Intended as an editable default — the admin UI
 * lets Sean rewrite it before committing.
 */
export function generateDescription(photo: PinPhoto, pin?: Pin | null): string {
  const sentences: string[] = [];

  // Sentence 1: the caption as-is, or a stock fallback.
  const caption = (photo.caption || '').trim();
  if (caption) {
    sentences.push(caption.endsWith('.') ? caption : `${caption}.`);
  } else {
    const loc = humanizeLocationTag(photo.physicalLocationTag || 'Memorial Church');
    sentences.push(`Photograph of the ${loc}.`);
  }

  // Sentence 2: type + year + credit.
  const typeBits: string[] = [];
  if (photo.type === 'archival') typeBits.push('Archival photograph');
  else if (photo.type === 'onsite') typeBits.push('On-site photograph');
  else if (photo.type === 'contributor') typeBits.push('Contributor photograph');
  else typeBits.push('Photograph');
  if (photo.year) typeBits.push(`from ${photo.year}`);
  if (photo.credit) typeBits.push(`credited to ${photo.credit}`);
  sentences.push(`${typeBits.join(' ')}.`);

  // Sentence 3: annotation summary, if any — gives the AI something concrete
  // about the visible content. Cap at 2 annotations to stay terse.
  if (photo.annotations && photo.annotations.length > 0) {
    const annCaptions = photo.annotations
      .map((a) => (a.caption || '').trim())
      .filter(Boolean)
      .slice(0, 2);
    if (annCaptions.length > 0) {
      sentences.push(`Details visible: ${annCaptions.join('; ')}.`);
    }
  }

  // Sentence 4: pin and knowledge-entry context (helps later retrieval
  // match photos to questions even if the caption is terse).
  const contextBits: string[] = [];
  if (pin?.title) contextBits.push(`Attached to the "${pin.title}" pin`);
  if (photo.databaseEntries && photo.databaseEntries.length > 0) {
    const titles = photo.databaseEntries.map(entryTitle).slice(0, 3);
    contextBits.push(`relates to: ${titles.join('; ')}`);
  }
  if (contextBits.length > 0) {
    sentences.push(`${contextBits.join(' — ')}.`);
  }

  return sentences.join(' ').trim();
}

/**
 * Generate a deduped set of lowercase keyword tokens drawn from every
 * piece of structured metadata we have about the photo. Callers can
 * trim or edit before saving; this is a best-guess starting point.
 *
 * Sources ranked roughly by signal strength:
 *   1. annotation captions (most specific content)
 *   2. photo caption
 *   3. linked knowledge entry titles
 *   4. physical location tag
 *   5. pin tags + pin title
 *   6. categories + type
 *
 * Final token set is capped to avoid keyword bloat.
 */
export function generateKeywords(photo: PinPhoto, pin?: Pin | null, max = 20): string[] {
  const tokens: string[] = [];

  // Per-annotation captions first — they name what's actually visible.
  if (photo.annotations) {
    for (const ann of photo.annotations) {
      tokens.push(...tokenize(ann.caption || ''));
    }
  }

  tokens.push(...tokenize(photo.caption || ''));

  for (const entryId of photo.databaseEntries || []) {
    tokens.push(...tokenize(entryTitle(entryId)));
  }

  tokens.push(...tokenize(humanizeLocationTag(photo.physicalLocationTag || '')));

  if (pin) {
    for (const tag of pin.tags || []) tokens.push(...tokenize(tag));
    tokens.push(...tokenize(pin.title || ''));
  }

  for (const cat of photo.categories || []) tokens.push(cat);
  if (photo.type) tokens.push(photo.type);

  // Dedupe + drop stopwords + drop very short tokens, preserving insertion
  // order so higher-signal sources rank first in the output.
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const t of tokens) {
    if (t.length < 3) continue;
    if (STOPWORDS.has(t)) continue;
    if (/^\d+$/.test(t) && t.length < 4) continue;  // drop stray 1-3 digit noise but keep years
    if (seen.has(t)) continue;
    seen.add(t);
    kept.push(t);
    if (kept.length >= max) break;
  }
  return kept;
}

/**
 * Classify where the bytes live based on the URL shape. Vercel-static is
 * our on-repo /public/photos path; firebase-storage is anything from the
 * Firebase googleapis domain; everything else is `unknown` (external hot
 * link, data URL, etc.).
 */
export function detectStorageBackend(url: string): PhotoStorageBackend {
  if (!url) return 'unknown';
  if (url.startsWith('/photos/')) return 'vercel-static';
  if (url.includes('firebasestorage.googleapis.com')) return 'firebase-storage';
  if (url.includes('storage.googleapis.com')) return 'firebase-storage';
  return 'unknown';
}
