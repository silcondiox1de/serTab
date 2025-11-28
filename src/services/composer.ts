import * as mm from '@magenta/music/es6';
import { TabColumn, InstrumentType, INSTRUMENTS } from '../types';
import { optimizeFingering } from './luthier';

// Using the basic Melody RNN model
const MODEL_CHECKPOINT = 'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/basic_rnn';

let musicRnn: mm.MusicRNN | null = null;

const initModel = async () => {
  if (!musicRnn) {
    console.log("🤖 AI: Initializing Model...");
    musicRnn = new mm.MusicRNN(MODEL_CHECKPOINT);
    await musicRnn.initialize();
    console.log("🤖 AI: Model Ready!");
  }
  return musicRnn;
};

const tabToNoteSequence = (
    columns: TabColumn[], 
    bpm: number, 
    instrumentType: InstrumentType
): mm.INoteSequence => {
    const instrument = INSTRUMENTS[instrumentType];
    const tuning = instrument.frequencies;
    const notes: mm.INote[] = [];

    columns.forEach((col, stepIndex) => {
        // Find the highest pitch in this column (Melody only!)
        // This prevents chords from crashing the Melody model
        let bestPitch = -1;
        
        col.forEach((fret, strIndex) => {
            if (fret > -1) {
                const freq = tuning[strIndex] * Math.pow(2, fret / 12);
                const pitch = Math.round(69 + 12 * Math.log2(freq / 440));
                if (pitch > bestPitch) bestPitch = pitch;
            }
        });

        if (bestPitch > -1) {
             notes.push({
                pitch: bestPitch,
                quantizedStartStep: stepIndex,
                quantizedEndStep: stepIndex + 1 // Keep it short
            });
        }
    });

    return {
        notes,
        totalQuantizedSteps: columns.length,
        quantizationInfo: { stepsPerQuarter: 4 },
        tempos: [{ qpm: bpm }]
    };
};

export const generateRiff = async (
    currentColumns: TabColumn[], 
    bpm: number, 
    instrumentType: InstrumentType,
    stepsToGenerate: number = 32, // Generate 2 bars
    temperature: number = 1.1 
): Promise<TabColumn[]> => {
    
    console.log("🤖 AI: Starting generation...");
    const model = await initModel();

    // 1. Prepare Context
    // We grab the last 32 steps (2 bars) to give the AI some ideas
    const contextLength = 32;
    const startSlice = Math.max(0, currentColumns.length - contextLength);
    const contextColumns = currentColumns.slice(startSlice);
    
    console.log(`🤖 AI: Analyzing last ${contextColumns.length} steps...`);

    // If completely empty, we can't generate a melody continuation.
    // We return empty so the UI handles it.
    if (contextColumns.every(c => c.every(n => n === -1))) {
        console.warn("🤖 AI: Context is empty!");
        return []; 
    }

    // 2. Convert to AI Format
    const inputSeq = tabToNoteSequence(contextColumns, bpm, instrumentType);

    // 3. Generate
    console.log("🤖 AI: Dreaming up new notes...");
    const result = await model.continueSequence(inputSeq, stepsToGenerate, temperature);
    console.log(`🤖 AI: Generated ${result.notes.length} notes.`);

    // 4. Convert back to Tab
    const stringCount = INSTRUMENTS[instrumentType].stringCount;
    const newColumns: TabColumn[] = Array(stepsToGenerate).fill(null).map(() => Array(stringCount).fill(-1));
    const tuning = INSTRUMENTS[instrumentType].frequencies;

    result.notes.forEach(note => {
        const step = note.quantizedStartStep;
        if (step !== undefined && step < stepsToGenerate) {
            // Find a valid string for this pitch
            for (let s = 0; s < stringCount; s++) {
                const openPitch = Math.round(69 + 12 * Math.log2(tuning[s] / 440));
                const neededFret = note.pitch - openPitch;
                
                // Keep it in a playable range (0-15ish) for "Riffs"
                if (neededFret >= 0 && neededFret <= 15) {
                    newColumns[step] = Array(stringCount).fill(-1); 
                    newColumns[step][s] = neededFret;
                    break;
                }
            }
        }
    });

    console.log("🤖 AI: Optimizing fingering...");
    return optimizeFingering(newColumns, instrumentType);
};
