
export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type WordType = 'noun' | 'verb' | 'preposition' | 'adjective' | 'adverb' | 'phrase';
export type Gender = 'der' | 'die' | 'das' | 'none';

export interface VerbConjugation {
  present3rd: string;
  past: string;
  pastParticiple: string;
}

export interface VocabItem {
  id: string;
  word: string;
  translation: string;
  type: WordType;
  level: Level;
  example: string;
  exampleTranslation: string;
  gender?: Gender;
  plural?: string;
  isIrregular?: boolean;
  conjugation?: VerbConjugation;
  cases?: string[];
}

export const LEVEL_TARGETS: Record<Level, number> = {
  A1: 1000,
  A2: 1000,
  B1: 1500,
  B2: 1500,
  C1: 3000,
  C2: 2000
};

export interface UserProgress {
  masteredItems: VocabItem[];
  learningItems: VocabItem[];
  levelStats: Record<Level, number>;
}

export type ViewState = 'HOME' | 'LOADING' | 'QUIZ' | 'SUMMARY' | 'LIBRARY' | 'CHAT';

export interface QuizSession {
  level: Level;
  items: VocabItem[];
  results: {
    mastered: VocabItem[];
    toStudy: VocabItem[];
  };
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

// Added missing chess-related types to fix cross-component import errors
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type Color = 'w' | 'b';

export interface GameState {
  fen: string;
  turn: Color;
  isCheck: boolean;
  isCheckmate: boolean;
  history: string[];
}

export interface AIAnalysis {
  evaluation: string;
  bestMove?: string;
  suggestion: string;
  explanation: string;
}
