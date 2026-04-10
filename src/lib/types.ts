export interface ContextualPhoto {
  url: string;
  caption: string;
  source: string;
  year: string;
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
  tags: string[];
  era: string;
  databaseEntryIds: string[];
}
