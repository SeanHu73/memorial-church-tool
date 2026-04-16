/**
 * Archival photo manifest.
 *
 * Maps every file under `/public/photos/archival/` to a pin + full metadata.
 * The admin page's "Bulk import" button reads this manifest and writes
 * the entries into Firestore. The photos are served directly from Vercel
 * (they live under /public), so there's no Firebase Storage upload — the
 * URL is just `/photos/archival/<filename>`.
 *
 * HOW TO ADD A PHOTO:
 *   1. Drop the image into `public/photos/archival/` (or let Cowork).
 *   2. Add an entry here with the right pinId + metadata.
 *   3. Hit "Bulk import archival photos" in /admin.
 *
 * Dedup: the import is idempotent — re-running skips any photo whose URL
 * is already present on the target pin, so it's safe to re-run after
 * edits or additions.
 *
 * Source captions below are taken from the LOC item pages and the
 * DOWNLOAD_INSTRUCTIONS.md manifest in the archival folder.
 */

import { PinPhoto, QuestionCategory } from './types';

export interface ArchivalEntry {
  pinId: string;          // which pin this photo attaches to
  photo: PinPhoto;        // complete photo record
}

const CREDIT_HABS = 'Historic American Buildings Survey, Library of Congress (HABS CA-2172-A)';
const CREDIT_HIGHSMITH = 'Carol M. Highsmith Archive, Library of Congress';
const LICENSE_PUBLIC = 'No known restrictions on publication';

// Convenience category presets
const C_WHAT_WHERE: QuestionCategory[] = ['what', 'where'];
const C_WHAT_HOW: QuestionCategory[] = ['what', 'how'];
const C_WHAT_WHEN: QuestionCategory[] = ['what', 'when'];
const C_WHO_WHY: QuestionCategory[] = ['who', 'why'];
const C_WHEN_WHY: QuestionCategory[] = ['when', 'why'];

export const archivalManifest: ArchivalEntry[] = [
  // ─── FACADE PIN: HABS exterior survey ─────────────────────────
  {
    pinId: 'facade-mosaic',
    photo: {
      url: '/photos/archival/habs_color_front_northeast.png',
      type: 'archival',
      caption: 'Front of Memorial Church (northeast wall) — colour transparency.',
      credit: CREDIT_HABS,
      source: 'https://www.loc.gov/resource/hhh.ca1003.photos?st=gallery',
      year: '1968',
      license: LICENSE_PUBLIC,
      physicalLocationTag: 'exterior_facade',
      databaseEntries: ['3.1', '2.1'],
      categories: C_WHAT_WHERE,
      annotations: [],
    },
  },
  {
    pinId: 'facade-mosaic',
    photo: {
      url: '/photos/archival/habs_color_front_east.png',
      type: 'archival',
      caption: 'Front of Memorial Church viewed from the east — colour transparency.',
      credit: CREDIT_HABS,
      source: 'https://www.loc.gov/resource/hhh.ca1003.photos?st=gallery',
      year: '1968',
      license: LICENSE_PUBLIC,
      physicalLocationTag: 'exterior_facade',
      databaseEntries: ['3.1', '2.1'],
      categories: C_WHAT_WHERE,
      annotations: [],
    },
  },
  {
    pinId: 'facade-mosaic',
    photo: {
      url: '/photos/archival/habs_front_northeast.png',
      type: 'archival',
      caption: 'Front (northeast wall) — black-and-white HABS documentation.',
      credit: CREDIT_HABS,
      source: 'https://www.loc.gov/resource/hhh.ca1003.photos?st=gallery',
      year: '1968',
      license: LICENSE_PUBLIC,
      physicalLocationTag: 'exterior_facade',
      databaseEntries: ['3.1', '2.1'],
      categories: C_WHAT_WHERE,
      annotations: [],
    },
  },
  {
    pinId: 'facade-mosaic',
    photo: {
      url: '/photos/archival/habs_front_east.png',
      type: 'archival',
      caption: 'Front viewed from the east.',
      credit: CREDIT_HABS,
      source: 'https://www.loc.gov/resource/hhh.ca1003.photos?st=gallery',
      year: '1968',
      license: LICENSE_PUBLIC,
      physicalLocationTag: 'exterior_facade',
      databaseEntries: ['3.1', '2.1'],
      categories: C_WHAT_WHERE,
      annotations: [],
    },
  },
  {
    pinId: 'facade-mosaic',
    photo: {
      url: '/photos/archival/habs_front_north.png',
      type: 'archival',
      caption: 'Front viewed from the north.',
      credit: CREDIT_HABS,
      source: 'https://www.loc.gov/resource/hhh.ca1003.photos?st=gallery',
      year: '1968',
      license: LICENSE_PUBLIC,
      physicalLocationTag: 'exterior_facade',
      databaseEntries: ['3.1', '2.1'],
      categories: C_WHAT_WHERE,
      annotations: [],
    },
  },
  {
    pinId: 'facade-mosaic',
    photo: {
      url: '/photos/archival/habs_front_gable_mosaic_telephoto.png',
      type: 'archival',
      caption: 'Telephoto view of the front gable mosaic — the 84-foot Salviati mosaic above the entrance.',
      credit: CREDIT_HABS,
      source: 'https://www.loc.gov/resource/hhh.ca1003.photos?st=gallery',
      year: '1968',
      license: LICENSE_PUBLIC,
      physicalLocationTag: 'exterior_facade',
      databaseEntries: ['3.1', '1.4'],
      categories: ['what', 'how', 'who'],
      annotations: [],
    },
  },
  {
    pinId: 'facade-mosaic',
    photo: {
      url: '/photos/archival/habs_front_mosaic_detail.png',
      type: 'archival',
      caption: 'Detail of the front mosaic — hand-cut smalti glass from Salviati in Venice.',
      credit: CREDIT_HABS,
      source: 'https://www.loc.gov/resource/hhh.ca1003.photos?st=gallery',
      year: '1968',
      license: LICENSE_PUBLIC,
      physicalLocationTag: 'exterior_facade',
      databaseEntries: ['3.1', '1.4'],
      categories: ['what', 'how'],
      annotations: [],
    },
  },
  {
    pinId: 'facade-mosaic',
    photo: {
      url: '/photos/archival/habs_front_entrance_arcade.jpg',
      type: 'archival',
      caption: 'Detail of the front entrance arcade — sandstone carved arches.',
      credit: CREDIT_HABS,
      source: 'https://www.loc.gov/resource/hhh.ca1003.photos?st=gallery',
      year: '1968',
      license: LICENSE_PUBLIC,
      physicalLocationTag: 'exterior_facade',
      databaseEntries: ['2.1', '1.6'],
      categories: C_WHAT_HOW,
      annotations: [],
    },
  },
  {
    pinId: 'facade-mosaic',
    photo: {
      url: '/photos/archival/habs_front_arcade_capitals.jpg',
      type: 'archival',
      caption: 'Detail of front arcade capitals and impost block.',
      credit: CREDIT_HABS,
      source: 'https://www.loc.gov/resource/hhh.ca1003.photos?st=gallery',
      year: '1968',
      license: LICENSE_PUBLIC,
      physicalLocationTag: 'exterior_facade',
      databaseEntries: ['2.1', '1.6'],
      categories: C_WHAT_HOW,
      annotations: [],
    },
  },

  // ─── FACADE PIN: Highsmith recent exterior ─────────────────
  {
    pinId: 'facade-mosaic',
    photo: {
      url: '/photos/archival/highsmith_exterior_2013.jpg',
      type: 'archival',
      caption: 'Memorial Church exterior, 2013.',
      credit: `${CREDIT_HIGHSMITH} (LC-DIG-highsm-25336)`,
      source: 'https://www.loc.gov/item/2013634782/',
      year: '2013',
      license: LICENSE_PUBLIC,
      physicalLocationTag: 'exterior_facade',
      databaseEntries: ['3.1', '2.1'],
      categories: C_WHAT_WHERE,
      annotations: [],
    },
  },

  // ─── FACADE PIN: pre-1906 spire (lost feature — archival essential) ──
  {
    pinId: 'facade-mosaic',
    photo: {
      url: '/photos/archival/pre1906_church_spire_colour_photochrom.jpg',
      type: 'archival',
      caption: 'Memorial Church with its 80-foot spire — colour photochrom, before the 1906 earthquake.',
      credit: 'Detroit Publishing Co. / Library of Congress',
      source: 'https://www.loc.gov/pictures/item/det1994012876/PP/',
      year: '1900s',
      license: LICENSE_PUBLIC,
      physicalLocationTag: 'exterior_facade',
      databaseEntries: ['3.1', '6.1'],
      categories: C_WHAT_WHEN,
      annotations: [],
    },
  },
  {
    pinId: 'facade-mosaic',
    photo: {
      url: '/photos/archival/pre1906_church_spire_facade_davey.jpg',
      type: 'archival',
      caption: 'The original spire seen from the facade side, before the 1906 earthquake destroyed it.',
      credit: 'Davey / Stanford Historical Society',
      source: null,
      year: 'before 1906',
      license: LICENSE_PUBLIC,
      physicalLocationTag: 'exterior_facade',
      databaseEntries: ['3.1', '6.1'],
      categories: C_WHAT_WHEN,
      annotations: [],
    },
  },
  {
    pinId: 'facade-mosaic',
    photo: {
      url: '/photos/archival/pre1906_church_spire_through_arcade.jpg',
      type: 'archival',
      caption: 'The church spire seen through the Quad arcade — pre-1906 view.',
      credit: 'Stanford Historical Society',
      source: null,
      year: 'before 1906',
      license: LICENSE_PUBLIC,
      physicalLocationTag: 'exterior_facade',
      databaseEntries: ['3.1', '6.1', '2.1'],
      categories: C_WHAT_WHEN,
      annotations: [],
    },
  },
  {
    pinId: 'facade-mosaic',
    photo: {
      url: '/photos/archival/pre1906_church_and_arch_quad_1903.jpg',
      type: 'archival',
      caption: 'Memorial Church, Memorial Arch, and the Quad, 1903 — the Inner Quad before the earthquake.',
      credit: 'Stanford Historical Society',
      source: null,
      year: '1903',
      license: LICENSE_PUBLIC,
      physicalLocationTag: 'general',
      databaseEntries: ['3.1', '2.1', '6.1'],
      categories: C_WHAT_WHEN,
      annotations: [],
    },
  },

  // ─── FACADE PIN: 1906 earthquake damage to the church ──────
  {
    pinId: 'facade-mosaic',
    photo: {
      url: '/photos/archival/1906_earthquake_church_damage_close.jpg',
      type: 'archival',
      caption: 'Close view of earthquake damage to Memorial Church, April 18, 1906.',
      credit: 'California Historical Society / Calisphere',
      source: null,
      year: '1906',
      license: 'Research and educational use only',
      physicalLocationTag: 'exterior_facade',
      databaseEntries: ['6.1', '3.1'],
      categories: C_WHEN_WHY,
      annotations: [],
    },
  },
  {
    pinId: 'facade-mosaic',
    photo: {
      url: '/photos/archival/bancroft_ruins_memorial_church.jpg',
      type: 'archival',
      caption: 'Ruins of Memorial Church after the 1906 earthquake.',
      credit: 'Bancroft Library, UC Berkeley',
      source: null,
      year: '1906',
      license: 'Research and educational use only',
      physicalLocationTag: 'exterior_facade',
      databaseEntries: ['6.1'],
      categories: C_WHEN_WHY,
      annotations: [],
    },
  },

  // ─── CHANCEL PIN: interior HABS views ─────────────────────
  {
    pinId: 'chancel-last-supper',
    photo: {
      url: '/photos/archival/habs_interior_southwest_altar.png',
      type: 'archival',
      caption: 'Interior, looking southwest toward the altar and the Last Supper mosaic.',
      credit: CREDIT_HABS,
      source: 'https://www.loc.gov/resource/hhh.ca1003.photos?st=gallery',
      year: '1968',
      license: LICENSE_PUBLIC,
      physicalLocationTag: 'chancel',
      databaseEntries: ['3.5', '2.1'],
      categories: C_WHAT_WHERE,
      annotations: [],
    },
  },
  {
    pinId: 'chancel-last-supper',
    photo: {
      url: '/photos/archival/habs_interior_pulpit.png',
      type: 'archival',
      caption: 'The pulpit — carved stone with polished marble columns.',
      credit: CREDIT_HABS,
      source: 'https://www.loc.gov/resource/hhh.ca1003.photos?st=gallery',
      year: '1968',
      license: LICENSE_PUBLIC,
      physicalLocationTag: 'chancel',
      databaseEntries: ['3.5'],
      categories: C_WHAT_HOW,
      annotations: [],
    },
  },
  {
    pinId: 'chancel-last-supper',
    photo: {
      url: '/photos/archival/habs_southeast_apsidiole.png',
      type: 'archival',
      caption: 'Southeast apsidiole — the side chapel space.',
      credit: CREDIT_HABS,
      source: 'https://www.loc.gov/resource/hhh.ca1003.photos?st=gallery',
      year: '1968',
      license: LICENSE_PUBLIC,
      physicalLocationTag: 'side_chapel',
      databaseEntries: ['3.5'],
      categories: C_WHAT_WHERE,
      annotations: [],
    },
  },

  // ─── PENDENTIVE PIN: crossing + 1989 damage ───────────────
  {
    pinId: 'pendentive-angels',
    photo: {
      url: '/photos/archival/1989_loma_prieta_damage.jpg',
      type: 'archival',
      caption: 'Damage to the crossing and pendentive angels after the 1989 Loma Prieta earthquake.',
      credit: 'Stanford News Service',
      source: null,
      year: '1989',
      license: 'Research and educational use only',
      physicalLocationTag: 'crossing',
      databaseEntries: ['3.4', '6.1'],
      categories: C_WHEN_WHY,
      annotations: [],
    },
  },

  // ─── FACADE PIN: general campus context (physicalLocationTag = 'general'
  //     so they pass InquirySheet's location filter at any location, and
  //     AskSheet's collectAllPhotos() pool picks them up for free-form Qs) ───
  {
    pinId: 'facade-mosaic',
    photo: {
      url: '/photos/archival/jane_stanford_portrait_1897.jpg',
      type: 'archival',
      caption: 'Jane Lathrop Stanford, 1897 — the woman who built this church.',
      credit: 'Stanford Historical Society',
      source: null,
      year: '1897',
      license: LICENSE_PUBLIC,
      physicalLocationTag: 'general',
      databaseEntries: ['1.1', '1.2'],
      categories: C_WHO_WHY,
      annotations: [],
    },
  },
  {
    pinId: 'facade-mosaic',
    photo: {
      url: '/photos/archival/memorial_arch_current_highsmith.jpg',
      type: 'archival',
      caption: 'The site of the Memorial Arch today — the arch was destroyed in 1906 and never rebuilt.',
      credit: CREDIT_HIGHSMITH,
      source: null,
      year: '2011',
      license: LICENSE_PUBLIC,
      physicalLocationTag: 'general',
      databaseEntries: ['6.1'],
      categories: C_WHAT_WHEN,
      annotations: [],
    },
  },
  {
    pinId: 'facade-mosaic',
    photo: {
      url: '/photos/archival/memorial_court_post1906_arch.jpg',
      type: 'archival',
      caption: 'Memorial Court after the 1906 earthquake — the Memorial Arch in ruins.',
      credit: 'Stanford Historical Society',
      source: null,
      year: '1906',
      license: 'Research and educational use only',
      physicalLocationTag: 'general',
      databaseEntries: ['6.1'],
      categories: C_WHEN_WHY,
      annotations: [],
    },
  },
  {
    pinId: 'facade-mosaic',
    photo: {
      url: '/photos/archival/1906_earthquake_arch_ruins_stereograph.jpg',
      type: 'archival',
      caption: 'Memorial Arch in ruins after the April 18, 1906 earthquake — Memorial Church visible behind.',
      credit: 'Keystone View Company / Library of Congress (LC-DIG-stereo-1s48918)',
      source: 'https://www.loc.gov/item/2023636434/',
      year: '1906',
      license: LICENSE_PUBLIC,
      physicalLocationTag: 'general',
      databaseEntries: ['6.1'],
      categories: C_WHEN_WHY,
      annotations: [],
    },
  },
  {
    pinId: 'facade-mosaic',
    photo: {
      url: '/photos/archival/highsmith_main_gate_2011.jpg',
      type: 'archival',
      caption: "Stanford's 1903 Memorial Church seen through the main gate from Palm Drive, 2011.",
      credit: `${CREDIT_HIGHSMITH} (LC-DIG-highsm-14887)`,
      source: 'https://www.loc.gov/item/2011633081/',
      year: '2011',
      license: LICENSE_PUBLIC,
      physicalLocationTag: 'general',
      databaseEntries: ['2.1'],
      categories: C_WHAT_WHERE,
      annotations: [],
    },
  },
  {
    pinId: 'facade-mosaic',
    photo: {
      url: '/photos/archival/fisk_nanney_organ_or_charles_fisk.jpg',
      type: 'archival',
      caption: 'The Fisk-Nanney organ — Charles Fisk designed it before his death in 1983.',
      credit: 'Stanford Historical Society',
      source: null,
      year: '1984',
      license: 'Research and educational use only',
      physicalLocationTag: 'organ_loft',
      databaseEntries: ['1.7'],
      categories: C_WHO_WHY,
      annotations: [],
    },
  },
  {
    pinId: 'facade-mosaic',
    photo: {
      url: '/photos/archival/habs_northwest_aisle_organ_loft.png',
      type: 'archival',
      caption: 'Northwest side aisle and a portion of the organ loft.',
      credit: CREDIT_HABS,
      source: 'https://www.loc.gov/resource/hhh.ca1003.photos?st=gallery',
      year: '1968',
      license: LICENSE_PUBLIC,
      physicalLocationTag: 'organ_loft',
      databaseEntries: ['1.7', '2.1'],
      categories: C_WHAT_WHERE,
      annotations: [],
    },
  },

  // ─── FACADE PIN: rear and side HABS views (tagged with their real
  //     locations so they don't match the facade by accident; they still
  //     show up in AskSheet via collectAllPhotos) ───────────────
  {
    pinId: 'facade-mosaic',
    photo: {
      url: '/photos/archival/habs_rear_southwest_general.png',
      type: 'archival',
      caption: 'General view of the rear (southwest end) of the church.',
      credit: CREDIT_HABS,
      source: 'https://www.loc.gov/resource/hhh.ca1003.photos?st=gallery',
      year: '1968',
      license: LICENSE_PUBLIC,
      physicalLocationTag: 'exterior_rear',
      databaseEntries: ['2.1'],
      categories: C_WHAT_WHERE,
      annotations: [],
    },
  },
  {
    pinId: 'facade-mosaic',
    photo: {
      url: '/photos/archival/habs_rear_south_southwest.png',
      type: 'archival',
      caption: 'Rear of the church from the south-southwest.',
      credit: CREDIT_HABS,
      source: 'https://www.loc.gov/resource/hhh.ca1003.photos?st=gallery',
      year: '1968',
      license: LICENSE_PUBLIC,
      physicalLocationTag: 'exterior_rear',
      databaseEntries: ['2.1'],
      categories: C_WHAT_WHERE,
      annotations: [],
    },
  },
  {
    pinId: 'facade-mosaic',
    photo: {
      url: '/photos/archival/habs_rear_transeptal_apses.png',
      type: 'archival',
      caption: 'Rear and transeptal apses — the southwest end of the building.',
      credit: CREDIT_HABS,
      source: 'https://www.loc.gov/resource/hhh.ca1003.photos?st=gallery',
      year: '1968',
      license: LICENSE_PUBLIC,
      physicalLocationTag: 'transepts',
      databaseEntries: ['2.1'],
      categories: C_WHAT_WHERE,
      annotations: [],
    },
  },
  {
    pinId: 'facade-mosaic',
    photo: {
      url: '/photos/archival/habs_rear_west.png',
      type: 'archival',
      caption: 'Rear of the church viewed from the west.',
      credit: CREDIT_HABS,
      source: 'https://www.loc.gov/resource/hhh.ca1003.photos?st=gallery',
      year: '1968',
      license: LICENSE_PUBLIC,
      physicalLocationTag: 'exterior_rear',
      databaseEntries: ['2.1'],
      categories: C_WHAT_WHERE,
      annotations: [],
    },
  },
  {
    pinId: 'facade-mosaic',
    photo: {
      url: '/photos/archival/habs_southeast_side_south.png',
      type: 'archival',
      caption: 'Southeast side of the church from the south.',
      credit: CREDIT_HABS,
      source: 'https://www.loc.gov/resource/hhh.ca1003.photos?st=gallery',
      year: '1968',
      license: LICENSE_PUBLIC,
      physicalLocationTag: 'exterior_sides',
      databaseEntries: ['2.1'],
      categories: C_WHAT_WHERE,
      annotations: [],
    },
  },
  {
    pinId: 'facade-mosaic',
    photo: {
      url: '/photos/archival/habs_southwest_rear_fenestration.png',
      type: 'archival',
      caption: 'Detail of southwest rear fenestration — window openings and tracery.',
      credit: CREDIT_HABS,
      source: 'https://www.loc.gov/resource/hhh.ca1003.photos?st=gallery',
      year: '1968',
      license: LICENSE_PUBLIC,
      physicalLocationTag: 'exterior_rear',
      databaseEntries: ['2.1'],
      categories: C_WHAT_HOW,
      annotations: [],
    },
  },
];

/**
 * Group manifest entries by pinId so the importer can merge all photos
 * for a given pin in a single Firestore write.
 */
export function groupManifestByPin(): Record<string, PinPhoto[]> {
  const byPin: Record<string, PinPhoto[]> = {};
  for (const entry of archivalManifest) {
    if (!byPin[entry.pinId]) byPin[entry.pinId] = [];
    byPin[entry.pinId].push(entry.photo);
  }
  return byPin;
}
