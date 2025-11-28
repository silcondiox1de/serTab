import * as mm from '@magenta/music/es6';
import { TabColumn, InstrumentType, INSTRUMENTS } from '../types';
import { optimizeFingering } from './luthier';

const MODEL_CHECKPOINT = 'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/basic_rnn';

// AI Model Constraints
const MIN_AI_PITCH = 48; // C3
const MAX_AI_PITCH = 83; // B5

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
        let bestPitch = -1;
        
        col.forEach((fret, strIndex) => {
            if (fret > -1) {
                const freq = tuning[strIndex] * Math.pow(2, fret / 12);
                let pitch = Math.round(69 + 12 * Math.log2(freq / 440));
                
                // --- CRITICAL FIX: TRANSPOSE TO SAFE RANGE ---
                // If note is too low (like Low E), shift it up an octave
                while (pitch < MIN_AI_PITCH) pitch += 12;
                // If note is too high, shift it down
                while (pitch > MAX_AI_PITCH) pitch -= 12;
                
                if (pitch > bestPitch) bestPitch = pitch;
            }
        });

        if (bestPitch > -1) {
             notes.push({
                pitch: bestPitch,
                quantizedStartStep: stepIndex,
                quantizedEndStep: stepIndex + 1 
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
    stepsToGenerate: number = 32, 
    temperature: number = 1.1 
): Promise<TabColumn[]> => {
    
    console.log("🤖 AI: Starting generation...");
    const model = await initModel();

    // 1. Find the last note written
    let lastNoteIndex = -1;
    for (let i = currentColumns.length - 1; i >= 0; i--) {
        if (currentColumns[i].some(n => n !== -1)) {
            lastNoteIndex = i;
            break;
        }
    }

    if (lastNoteIndex === -1) {
        console.warn("🤖 AI: Context is empty!");
        return []; 
    }

    // 2. Slice context
    const sliceEnd = lastNoteIndex + 1;
    const sliceStart = Math.max(0, sliceEnd - 32); 
    const contextColumns = currentColumns.slice(sliceStart, sliceEnd);
    
    console.log(`🤖 AI: Analyzed steps ${sliceStart} to ${sliceEnd}`);

    const inputSeq = tabToNoteSequence(contextColumns, bpm, instrumentType);

    // 3. Generate
    console.log("🤖 AI: Dreaming up new notes...");
    const result = await model.continueSequence(inputSeq, stepsToGenerate, temperature);
    console.log(`🤖 AI: Generated ${result.notes.length} notes.`);

    // 4. Convert back
    const stringCount = INSTRUMENTS[instrumentType].stringCount;
    const newColumns: TabColumn[] = Array(stepsToGenerate).fill(null).map(() => Array(stringCount).fill(-1));
    const tuning = INSTRUMENTS[instrumentType].frequencies;

    result.notes.forEach(note => {
        const step = note.quantizedStartStep;
        if (step !== undefined && step < stepsToGenerate) {
            
            // Try to place the note naturally
            let placed = false;
            let pitch = note.pitch;

            // Attempt 1: As is
            placed = tryPlaceNote(pitch, newColumns, step, tuning, stringCount);

            // Attempt 2: If too high/low to be playable, shift octave and try again
            if (!placed) placed = tryPlaceNote(pitch - 12, newColumns, step, tuning, stringCount);
            if (!placed) placed = tryPlaceNote(pitch + 12, newColumns, step, tuning, stringCount);
        }
    });

    console.log("🤖 AI: Optimizing fingering...");
    return optimizeFingering(newColumns, instrumentType);
};

// Helper to place a note on the grid if valid
const tryPlaceNote = (
    pitch: number, 
    columns: TabColumn[], 
    step: number, 
    tuning: number[], 
    stringCount: number
): boolean => {
    for (let s = 0; s < stringCount; s++) {
        const openPitch = Math.round(69 + 12 * Math.log2(tuning[s] / 440));
        const neededFret = pitch - openPitch;
        
        // Allow a wider range (0-19) for the output
        if (neededFret >= 0 && neededFret <= 19) {
            columns[step] = Array(stringCount).fill(-1); 
            columns[step][s] = neededFret;
            return true;
        }
    }
    return false;
};
