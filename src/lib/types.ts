export type QuestionCategory = 'who' | 'what' | 'when' | 'where' | 'why' | 'how';

export interface PhotoAnnotation {
  x: number;             // percentage position (0-100)
  y: number;
  caption: string;
  categories: QuestionCategory[];
  clues: Partial<Record<QuestionCategory, string>>;
}

export interface PinPhoto {
  url: string;
  type: 'onsite' | 'archival' | 'contributor';
  caption: string;
  credit: string;
  source: string | null;    // URL of the original archive source (for archival)
  year: string | null;      // when the photo was taken (for archival)
  license: string | null;   // licence status (for archival)
  annotations: PhotoAnnotation[];
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
