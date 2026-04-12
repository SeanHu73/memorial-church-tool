import { seedPins } from './seed-pins';
import { QuestionCategory } from './types';

// Simple keyword-based classification of question intent
const CATEGORY_PATTERNS: Record<QuestionCategory, RegExp[]> = {
  who: [/\bwho\b/i, /\bbuilt\b/i, /\bdesign(ed|er)\b/i, /\bcreate[ds]?\b/i, /\bmade\b/i, /\bartist/i, /\barchitect/i, /\bperson\b/i, /\bpeople\b/i],
  what: [/\bwhat\b/i, /\bdescribe\b/i, /\btell me about\b/i, /\bexplain\b/i, /\bwhat('| i)s\b/i, /\bidentify\b/i],
  when: [/\bwhen\b/i, /\byear\b/i, /\bdate\b/i, /\bera\b/i, /\bperiod\b/i, /\bcentury\b/i, /\bold\b/i, /\bage\b/i, /\bhistory\b/i, /\boriginal(ly)?\b/i],
  where: [/\bwhere\b/i, /\blocati/i, /\bfind\b/i, /\bplace[ds]?\b/i, /\bsite\b/i, /\bfrom\b/i],
  why: [/\bwhy\b/i, /\breason\b/i, /\bpurpose\b/i, /\bmeaning\b/i, /\bsignifican/i, /\bimportan/i, /\bmotiv/i, /\bintent/i, /\brepresent/i, /\bsymbol/i],
  how: [/\bhow\b/i, /\bprocess\b/i, /\btechni/i, /\bmethod\b/i, /\bconstruct/i, /\bmaterial/i, /\bwork[sed]*\b/i],
};

function classifyQuestion(question: string): QuestionCategory[] {
  const categories: QuestionCategory[] = [];
  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    if (patterns.some((p) => p.test(question))) {
      categories.push(category as QuestionCategory);
    }
  }
  // Default to 'what' if nothing matched
  if (categories.length === 0) categories.push('what');
  return categories;
}

export interface MatchedHint {
  pinTitle: string;
  physicalArea: string;
  category: QuestionCategory;
  lookAt: string;
  clue: string;
}

export function findRelevantHints(question: string): MatchedHint[] {
  const categories = classifyQuestion(question);
  const hints: MatchedHint[] = [];

  for (const pin of seedPins) {
    for (const cat of categories) {
      const hint = pin.observationHints[cat];
      if (hint) {
        hints.push({
          pinTitle: pin.title,
          physicalArea: pin.location.physicalArea,
          category: cat,
          lookAt: hint.lookAt,
          clue: hint.clue,
        });
      }
    }
  }

  return hints;
}

export function formatHintsForPrompt(hints: MatchedHint[]): string {
  if (hints.length === 0) return '';

  const lines = hints.map(
    (h) =>
      `• At "${h.pinTitle}" (${h.physicalArea.replace(/_/g, ' ')}), for "${h.category}" questions: LOOK AT ${h.lookAt}. CLUE: ${h.clue}`
  );

  return `\n\nOBSERVATION HINTS FROM CONTRIBUTORS:
The following are human-authored observation hints — physical things in the church that relate to this type of question. Use these to craft your observation field. Pick the most relevant one or two; do not list them all.

${lines.join('\n\n')}`;
}
