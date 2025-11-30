import { TabColumn, NoteDuration, InstrumentType } from '../types';

class AudioEngine {
  private audioContext: AudioContext | null = null;
  private nextNoteTime: number = 0;
  private timerID: number | null = null;
  private isPlaying: boolean = false;
  private scheduleAheadTime: number = 0.1; // Seconds
  private lookahead: number = 25.0; // Milliseconds
  private currentColumn: number = 0;
  private columns: TabColumn[] = [];
  private durations: NoteDuration[] = [];
  private bpm: number = 120;
  private frequencies: number[] = []; // Current instrument frequencies
  private instrumentType: InstrumentType = 'guitar';
  private onTick: ((colIndex: number) => void) | null = null;
  private onStop: (() => void) | null = null;
  private lastNoteIndex: number = -1;

  // 🔗 Link (slur / tie) support
  // connections are defined as "from this cell, sustain to next note on same string"
  private connections: { col: number; str: number }[] = [];
  // start cell "col:str" -> target column index
  private connectionMap: Map<string, number> = new Map();
  // set of all target cells "col:str" for quick skip
  private connectionTargets: Set<string> = new Set();

  constructor() {
    // Lazy initialization
  }

  public async initialize() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  public setScore(
    columns: TabColumn[],
    durations: NoteDuration[],
    bpm: number,
    frequencies: number[],
    instrumentType: InstrumentType,
    connections: { col: number; str: number }[] = [] // ⬅️ new (optional) param
  ) {
    this.columns = columns;
    this.durations = durations;
    this.bpm = bpm;
    this.frequencies = frequencies;
    this.instrumentType = instrumentType;

    // 🔗 store and preprocess connections
    this.connections = connections || [];
    this.connectionMap.clear();
    this.connectionTargets.clear();

    for (const c of this.connections) {
      const startCol = c.col;
      const str = c.str;
      if (!this.columns[startCol]) continue;

      // Find the next note on this string after startCol
      let nextIdx = -1;
      for (let i = startCol + 1; i < this.columns.length; i++) {
        if (this.columns[i][str] !== -1) {
          nextIdx = i;
          break;
        }
      }

      if (nextIdx !== -1) {
        const startKey = `${startCol}:${str}`;
        const targetKey = `${nextIdx}:${str}`;
        this.connectionMap.set(startKey, nextIdx);
        this.connectionTargets.add(targetKey);
      }
    }

    // Calculate last note index for auto-stop
    this.lastNoteIndex = -1;
    for (let i = columns.length - 1; i >= 0; i--) {
      if (columns[i].some((n) => n !== -1)) {
        this.lastNoteIndex = i;
        break;
      }
    }
  }

  public setOnTickCallback(cb: (colIndex: number) => void) {
    this.onTick = cb;
  }

  public setOnStopCallback(cb: () => void) {
    this.onStop = cb;
  }

  public start(startIndex: number = 0) {
    if (this.isPlaying) return;
    this.initialize().then(() => {
      if (!this.audioContext) return;
      this.isPlaying = true;
      // Start playing from valid range
      this.currentColumn = Math.max(0, Math.min(startIndex, this.columns.length - 1));
      this.nextNoteTime = this.audioContext.currentTime + 0.05;
      this.scheduler();
    });
  }

  public stop() {
    this.isPlaying = false;
    if (this.timerID !== null) {
      window.clearTimeout(this.timerID);
      this.timerID = null;
    }
    if (this.onStop) this.onStop();
  }

  private scheduler() {
    if (!this.audioContext) return;

    while (this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime) {
      // Auto-stop logic: If we have passed the last note, stop
      if (this.lastNoteIndex !== -1 && this.currentColumn > this.lastNoteIndex) {
        this.stop();
        return;
      }

      this.scheduleNote(this.currentColumn, this.nextNoteTime);
      this.nextNote();
    }

    if (this.isPlaying) {
      this.timerID = window.setTimeout(() => this.scheduler(), this.lookahead);
    }
  }

  private nextNote() {
    const secondsPerBeat = 60.0 / this.bpm;
    // Each column is strictly a 16th note step in the sequencer grid
    this.nextNoteTime += 0.25 * secondsPerBeat;

    this.currentColumn++;
    if (this.currentColumn >= this.columns.length) {
      this.currentColumn = 0;
    }
  }

  private getDurationInSeconds(duration: NoteDuration): number {
    const secondsPerBeat = 60.0 / this.bpm;
    switch (duration) {
      case '1':
        return 4.0 * secondsPerBeat;
      case '2':
        return 2.0 * secondsPerBeat;
      case '4':
        return 1.0 * secondsPerBeat;
      case '8':
        return 0.5 * secondsPerBeat;
      case '16':
        return 0.25 * secondsPerBeat;
      default:
        return 0.25 * secondsPerBeat;
    }
  }

  // 🔗 helper: is this cell the *target* of a link?
  private isChainTarget(col: number, str: number): boolean {
    return this.connectionTargets.has(`${col}:${str}`);
  }

  // 🔗 helper: sum durations across a link chain starting at (col,str)
  private getChainDurationSeconds(startCol: number, str: number): number {
    let total = 0;
    let currentCol = startCol;

    // simple safeguard against weird loops
    const visited = new Set<number>();

    while (true) {
      if (visited.has(currentCol)) break;
      visited.add(currentCol);

      const durVal = this.durations[currentCol] || '8';
      total += this.getDurationInSeconds(durVal);

      const key = `${currentCol}:${str}`;
      const nextCol = this.connectionMap.get(key);
      if (nextCol == null) break;

      currentCol = nextCol;
    }

    return total;
  }

  private scheduleNote(colIndex: number, time: number) {
    if (!this.audioContext) return;

    const timeUntilPlay = (time - this.audioContext.currentTime) * 1000;
    setTimeout(() => {
      if (this.onTick && this.isPlaying) this.onTick(colIndex);
    }, Math.max(0, timeUntilPlay));

    const column = this.columns[colIndex];
    if (!column) return;

    column.forEach((fret, stringIndex) => {
      // Play only if it's a number and not -1. 'x' is treated as silent note.
      if (typeof fret === 'number' && fret !== -1 && this.frequencies[stringIndex]) {
        // If this cell is only the *target* of a link, don't trigger a new attack;
        // it will be sustained from the previous note in the chain.
        if (this.isChainTarget(colIndex, stringIndex)) {
          return;
        }

        const durationSeconds = this.getChainDurationSeconds(colIndex, stringIndex);
        this.playTone(stringIndex, fret, time, durationSeconds);
      }
    });
  }

  private playTone(stringIndex: number, fret: number, time: number, duration: number) {
    if (!this.audioContext) return;

    const baseFreq = this.frequencies[stringIndex];
    const frequency = baseFreq * Math.pow(2, fret / 12);

    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    // Instrument specific sound design
    let attack = 0.02;
    let release = 0.05;
    let sustainLevel = 0.3;
    let filterStart = 3000;
    let filterEnd = 500;
    let type: OscillatorType = 'triangle';

    switch (this.instrumentType) {
      case 'bass':
        type = 'sawtooth';
        filterStart = 800;
        filterEnd = 100;
        attack = 0.02;
        release = 0.1;
        sustainLevel = 0.6; // Bass has more sustain
        break;
      case 'ukulele':
        type = 'sine'; // Softer, nylon sound
        filterStart = 2000;
        filterEnd = 800;
        attack = 0.01;
        release = 0.1;
        sustainLevel = 0.2; // Plucky, short sustain
        break;
      case 'guitar':
      default:
        type = 'sawtooth'; // Bright electric/acoustic hybrid
        filterStart = 3000;
        filterEnd = 500;
        attack = 0.02;
        release = 0.05;
        sustainLevel = 0.3;
        break;
    }

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, time);

    // Lowpass filter for tone
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterStart, time);
    filter.frequency.exponentialRampToValueAtTime(filterEnd, time + 0.1);

    // Envelope
    const endSustain = time + duration - release;

    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(sustainLevel, time + attack);

    if (endSustain > time + attack) {
      gainNode.gain.setValueAtTime(sustainLevel, endSustain);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);
    } else {
      // Very short note
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);
    }

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    osc.start(time);
    osc.stop(time + duration + 0.1); // Stop osc after full envelope
  }
}

export const audioEngine = new AudioEngine();
