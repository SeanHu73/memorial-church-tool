export interface ContextualPhoto {
  url: string;
  caption: string;
  source: string;
  year: string;
}

export type QuestionCategory = 'who' | 'what' | 'when' | 'where' | 'why' | 'how';

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
  photo: {
    url: string;
    caption: string;
    credit: string;
  };
  inquiry: {
    question: string;
    answer: string;
    contextualPhoto: ContextualPhoto | null;
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
