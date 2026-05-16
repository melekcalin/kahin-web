export type Valence = 'positive' | 'negative';
export type Arousal = 'slow' | 'fast';
export type World = 'mirror' | 'escape';
export type Companion = 'alone' | 'together' | 'any';

export interface MoodData {
  valence: Valence | null;
  arousal: Arousal | null;
  world: World | null;
  companion: Companion | null;
}

export interface Film {
  id: number;
  title: string;
  year: string;
  director: string;
  stillUrl: string;
  verdict: string;
  valence: Valence;
  arousal: Arousal;
  world: World;
  synopsis: string;
  rating: number;
  cast: string[];
}

export type AppScreen = 'intro' | 'color' | 'tempo' | 'world' | 'companion' | 'pause' | 'verdict' | 'details' | 'collection';
