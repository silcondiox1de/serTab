import * as mm from '@magenta/music/es6';
import { TabColumn, InstrumentType, INSTRUMENTS } from '../types';
import { optimizeFingering } from './luthier';

// We use a lightweight model trained on melodies
const MODEL_CHECKPOINT = 'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/basic_rnn';

let musicRnn: mm.MusicRNN | null = null;

const initModel = async () => {
  if (!musicRnn) {
    musicRnn = new mm.MusicRNN(MODEL_CHECKPOINT);
    await musicRnn.initialize();
  }
  return musicRnn;
};

// Helper: Convert Tab Columns to Magenta NoteSequence
const tabToNoteSequence = (
    columns: TabColumn[], 
    bpm: number, 
    instrumentType: InstrumentType
): mm.INoteSequence => {
    const instrument = INSTRUMENTS[instrumentType];
    const tuning = instrument.frequencies;
    const notes: mm.INote[] = [];

    // Calculate time steps (assuming 4 steps per beat / 16th notes)
    // 1 step = 1 column in your grid
    
    columns.forEach((col, stepIndex) => {
        col.forEach((fret, strIndex) => {
            if (fret > -1) {
                // Convert fret to Pitch (MIDI number)
                // Formula: 69 + 12 * log2(freq / 440)
                const freq = tuning[strIndex] * Math.pow(2, fret / 12);
                const pitch = Math.round(69 + 12 * Math.log2(freq / 440));
                
                notes.push({
                    pitch,
                    quantizedStartStep: stepIndex,
                    quantizedEndStep: stepIndex + 2 // Assume 8th note duration for simplicity
                });
            }
        });
    });

    return {
        notes,
        totalQuantizedSteps: columns.length,
        quantizationInfo: { stepsPerQuarter: 4 }, // Standard 16th note grid
        tempos: [{ qpm: bpm }]
    };
};

export const generateRiff = async (
    currentColumns: TabColumn[], 
    bpm: number, 
    instrumentType: InstrumentType,
    stepsToGenerate: number = 32, // Generate 2 bars by default (16 * 2)
    temperature: number = 1.1 // Higher = crazier, Lower = more repetitive
): Promise<TabColumn[]> => {
    
    const model = await initModel();

    // 1. Convert current tab to NoteSequence
    // We only take the last 32 steps (2 bars) as context to keep it fast
    const contextLength = 32;
    const startSlice = Math.max(0, currentColumns.length - contextLength);
    const contextColumns = currentColumns.slice(startSlice);
    
    // If empty, prime it with a generic "C" note so the AI has something to start with
    if (contextColumns.every(c => c.every(n => n === -1))) {
        // Create a dummy context if empty
        return []; 
    }

    const inputSeq = tabToNoteSequence(contextColumns, bpm, instrumentType);

    // 2. Generate!
    const result = await model.continueSequence(inputSeq, stepsToGenerate, temperature);

    // 3. Convert AI Output back to Tab Grid
    // We create empty columns for the new section
    const stringCount = INSTRUMENTS[instrumentType].stringCount;
    const newColumns: TabColumn[] = Array(stepsToGenerate).fill(null).map(() => Array(stringCount).fill(-1));

    // The result notes have 'quantizedStartStep' relative to the start of generation
    result.notes.forEach(note => {
        const step = note.quantizedStartStep;
        if (step !== undefined && step < stepsToGenerate) {
            // We have a pitch, but we don't know string/fret yet.
            // We temporarily put it on String 0 (Top string) just to hold the data.
            // "The Luthier" will fix the position in the next step.
            
            // Reverse math to find a theoretical fret on low E string
            // pitch = 69 + 12*log2(freq/440). 
            // Simplified: pitch 40 is low E (standard guitar).
            // This is a rough placeholder.
            
            // We simply store the pitch value in the first slot and mark it as specific flag if needed
            // But optimizeFingering expects FRETS, not PITCHES.
            
            // Better approach: Let's find ANY valid position for this pitch
            const tuning = INSTRUMENTS[instrumentType].frequencies;
            let placed = false;
            
            for (let s = 0; s < stringCount; s++) {
                const openPitch = Math.round(69 + 12 * Math.log2(tuning[s] / 440));
                const neededFret = note.pitch - openPitch;
                if (neededFret >= 0 && neededFret <= 24) {
                    newColumns[step] = Array(stringCount).fill(-1); // Clear col for monophonic melody
                    newColumns[step][s] = neededFret;
                    placed = true;
                    break;
                }
            }
        }
    });

    // 4. Run "The Luthier" to make it playable
    // This organizes the scattered notes into a logical hand position
    return optimizeFingering(newColumns, instrumentType);
};
