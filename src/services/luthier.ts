import { TabColumn, InstrumentType, INSTRUMENTS } from '../types';

// Standard frequency for A4
const A4 = 440;

// Helper: Get pitch (frequency) of a specific string+fret
// We use integer semitones relative to A4 for easier matching
const getSemitone = (stringOpenFreq: number, fret: number): number => {
    // Formula: freq = open * 2^(fret/12)
    // We convert this to a linear "semitone index" for easy comparison
    // MIDI note number math: 69 + 12 * log2(freq / 440)
    const freq = stringOpenFreq * Math.pow(2, fret / 12);
    return Math.round(69 + 12 * Math.log2(freq / A4));
};

interface NoteOption {
    strIndex: number;
    fret: number;
    semitone: number;
}

// Cost Weights
const COST_FRET_DISTANCE = 1.0; // Moving hand up/down neck
const COST_STRING_CROSSING = 0.5; // Changing strings
const COST_OPEN_STRING_BONUS = -2.0; // We like open strings!

export const optimizeFingering = (
    columns: TabColumn[], 
    instrumentType: InstrumentType
): TabColumn[] => {
    const instrument = INSTRUMENTS[instrumentType];
    const stringCount = instrument.stringCount;
    const tuning = instrument.frequencies; // Array of open string freqs

    // 1. Extract the musical notes (semitones) from the current tab
    // We ignore empty columns or columns with no notes
    const sequence: { index: number, semitones: number[] }[] = [];

    columns.forEach((col, colIdx) => {
        const notesInCol: number[] = [];
        col.forEach((fret, strIdx) => {
            if (fret > -1) {
                // Calculate absolute pitch
                const pitch = getSemitone(tuning[strIdx], fret);
                notesInCol.push(pitch);
            }
        });
        
        // For MVP, we only optimize single-note lines (melody). 
        // Polyphony (chords) optimization is much harder (Tier 3!).
        if (notesInCol.length === 1) {
            sequence.push({ index: colIdx, semitones: notesInCol });
        }
    });

    if (sequence.length < 2) return columns; // Nothing to optimize

    // 2. Find all possible locations on the fretboard for each note
    const graph: NoteOption[][] = sequence.map(item => {
        const targetPitch = item.semitones[0];
        const options: NoteOption[] = [];

        // Check every string
        tuning.forEach((openFreq, strIdx) => {
            // Reverse math: fret = 12 * log2(target / open)
            // We do this via semitone subtraction to be safe
            const openPitch = Math.round(69 + 12 * Math.log2(openFreq / A4));
            const neededFret = targetPitch - openPitch;

            // Is this physically playable? (0 to 24 frets)
            if (neededFret >= 0 && neededFret <= 24) {
                options.push({ strIndex: strIdx, fret: neededFret, semitone: targetPitch });
            }
        });
        return options;
    });

    // 3. Viterbi Algorithm (Find lowest cost path)
    // dp[i][j] = min cost to reach note i at option j
    const dp: number[][] = graph.map(() => []);
    const path: number[][] = graph.map(() => []); // Stores index of previous best option

    // Initialize first note (Cost 0)
    graph[0].forEach((_, idx) => {
        dp[0][idx] = 0;
        path[0][idx] = -1; 
    });

    // Iterate through the sequence
    for (let i = 1; i < graph.length; i++) {
        const currentOptions = graph[i];
        const prevOptions = graph[i - 1];

        currentOptions.forEach((currOpt, currIdx) => {
            let minCost = Infinity;
            let bestPrevIdx = -1;

            // Compare against every possible position of the previous note
            prevOptions.forEach((prevOpt, prevIdx) => {
                // Calculate Cost
                const fretDist = Math.abs(currOpt.fret - prevOpt.fret);
                const stringDist = Math.abs(currOpt.strIndex - prevOpt.strIndex);
                
                let moveCost = (fretDist * COST_FRET_DISTANCE) + (stringDist * COST_STRING_CROSSING);
                
                // Bonus: Prefer open strings if playable
                if (currOpt.fret === 0) moveCost += COST_OPEN_STRING_BONUS;

                // Total cost to get here
                const totalCost = dp[i - 1][prevIdx] + moveCost;

                if (totalCost < minCost) {
                    minCost = totalCost;
                    bestPrevIdx = prevIdx;
                }
            });

            dp[i][currIdx] = minCost;
            path[i][currIdx] = bestPrevIdx;
        });
    }

    // 4. Backtrack to build the new tab
    const lastStep = graph.length - 1;
    let bestFinalIdx = -1;
    let minFinalCost = Infinity;

    // Find best ending
    dp[lastStep].forEach((cost, idx) => {
        if (cost < minFinalCost) {
            minFinalCost = cost;
            bestFinalIdx = idx;
        }
    });

    // Reconstruct
    const optimizedMapping: { colIndex: number, option: NoteOption }[] = [];
    let currentIdx = bestFinalIdx;

    for (let i = lastStep; i >= 0; i--) {
        optimizedMapping.unshift({ 
            colIndex: sequence[i].index, 
            option: graph[i][currentIdx] 
        });
        currentIdx = path[i][currentIdx];
    }

    // 5. Apply to columns
    // We clone the columns to avoid mutation
    const newColumns = columns.map(col => [...col]);

    optimizedMapping.forEach(item => {
        const { colIndex, option } = item;
        // Clear the old column
        newColumns[colIndex] = new Array(stringCount).fill(-1);
        // Set the new note
        newColumns[colIndex][option.strIndex] = option.fret;
    });

    return newColumns;
};
