
export type Note = number | -1 | 'x'; // -1 represents empty/rest, 'x' represents dead/muted note

export type InstrumentType = 'guitar' | 'bass' | 'ukulele';

export type NoteDuration = '1' | '2' | '4' | '8' | '16';

export interface InstrumentConfig {
  name: string;
  strings: string[]; // Visual labels from Top (String 1) to Bottom
  frequencies: number[]; // Frequencies in Hz corresponding to strings
  stringCount: number;
}

export const INSTRUMENTS: Record<InstrumentType, InstrumentConfig> = {
  guitar: {
    name: 'Guitar',
    strings: ['e', 'B', 'G', 'D', 'A', 'E'], // High E to Low E
    frequencies: [329.63, 246.94, 196.00, 146.83, 110.00, 82.41],
    stringCount: 6
  },
  bass: {
    name: 'Bass',
    strings: ['G', 'D', 'A', 'E'], // High G to Low E
    frequencies: [98.00, 73.42, 55.00, 41.20], // G2, D2, A1, E1
    stringCount: 4
  },
  ukulele: {
    name: 'Ukulele',
    strings: ['A', 'E', 'C', 'G'], // A4, E4, C4, G4 (High G tuning)
    frequencies: [440.00, 329.63, 261.63, 392.00], 
    stringCount: 4
  }
};

export interface TimeSignatureConfig {
  name: string;
  stepsPerBar: number; // Number of 16th note steps per bar
  tempoBeat: 'quarter' | 'dotted-quarter';
}

export const TIME_SIGNATURES: Record<string, TimeSignatureConfig> = {
  '4/4': { name: '4/4', stepsPerBar: 16, tempoBeat: 'quarter' },
  '3/4': { name: '3/4', stepsPerBar: 12, tempoBeat: 'quarter' },
  '2/4': { name: '2/4', stepsPerBar: 8, tempoBeat: 'quarter' },
  '6/8': { name: '6/8', stepsPerBar: 12, tempoBeat: 'dotted-quarter' }, // Treating as 12 16th notes
  '12/8': { name: '12/8', stepsPerBar: 24, tempoBeat: 'dotted-quarter' },
  '5/4': { name: '5/4', stepsPerBar: 20, tempoBeat: 'quarter' },
};

export type TimeSignatureType = keyof typeof TIME_SIGNATURES;

// A column is an array of Notes. Length depends on the instrument.
export type TabColumn = Note[];

export interface SongState {
  title: string;
  bpm: number;
  columns: TabColumn[];
  durations: NoteDuration[];
  isPlaying: boolean;
  currentColumnIndex: number;
}

export interface SavedProject {
  version: string;
  title: string;
  bpm: number;
  instrumentType: InstrumentType;
  timeSignature: TimeSignatureType;
  columns: TabColumn[];
  durations: NoteDuration[];
  tuning: string[];
  chordNames?: string[];
  connections?: { col: number; str: number }[];
}

export const createEmptyColumns = (count: number, stringCount: number): TabColumn[] => {
    // We map to create new array instances for each column to avoid reference issues
    return Array(count).fill(null).map(() => Array(stringCount).fill(-1));
};

export const createDefaultDurations = (count: number, defaultVal: NoteDuration = '8'): NoteDuration[] => {
    return Array(count).fill(defaultVal);
};