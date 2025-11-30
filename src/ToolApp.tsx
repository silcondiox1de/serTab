import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom'; 
import { TabGrid } from './components/TabGrid';
import { Controls } from './components/Controls';
import { ChordLibrary } from './components/ChordLibrary';
import { ReviewView } from './components/ReviewView';
import { TabColumn, createEmptyColumns, createDefaultDurations, InstrumentType, INSTRUMENTS, TimeSignatureType, TIME_SIGNATURES, NoteDuration, SavedProject } from './types';
import { audioEngine } from './services/audioEngine';
import { optimizeFingering } from './services/luthier'; 
import { generateRiff } from './services/composer'; 

// Helpers for frequency calculation
const NOTE_OFFSETS: Record<string, number> = {
    'c': 0, 'c#': 1, 'db': 1, 
    'd': 2, 'd#': 3, 'eb': 3, 
    'e': 4, 
    'f': 5, 'f#': 6, 'gb': 6, 
    'g': 7, 'g#': 8, 'ab': 8, 
    'a': 9, 'a#': 10, 'bb': 10, 
    'b': 11
};
const BASE_C0 = 16.3516;

const getFrequencyFromStr = (noteStr: string, referenceFreq: number): number => {
    const clean = noteStr.trim().toLowerCase();
    const match = clean.match(/^([a-g][#b]?)([0-8])$/);
    if (match) {
        const notePart = match[1];
        const octPart = parseInt(match[2], 10);
        const nIdx = NOTE_OFFSETS[notePart];
        if (nIdx !== undefined) {
             const semitones = octPart * 12 + nIdx;
             return BASE_C0 * Math.pow(2, semitones / 12);
        }
    }
    const noteOnly = clean.replace(/[0-9]/g, '');
    const nIdx = NOTE_OFFSETS[noteOnly];
    if (nIdx === undefined) return referenceFreq;
    let closestFreq = referenceFreq;
    let minDiff = Infinity;
    for (let oct = 0; oct <= 8; oct++) {
        const semitones = oct * 12 + nIdx;
        const candidate = BASE_C0 * Math.pow(2, semitones / 12);
        const diff = Math.abs(candidate - referenceFreq);
        if (diff < minDiff) {
            minDiff = diff;
            closestFreq = candidate;
        }
    }
    return closestFreq;
};

const Toast = ({ message, onClose }: { message: string | null, onClose: () => void }) => {
    useEffect(() => {
        if (message) {
            const timer = setTimeout(onClose, 3000);
            return () => clearTimeout(timer);
        }
    }, [message, onClose]);

    if (!message) return null;

    return (
        <div className="fixed bottom-8 right-8 bg-cyan-500 text-white px-5 py-3 rounded-full shadow-lg shadow-cyan-500/20 z-50 flex items-center animate-bounce-in border border-cyan-400/30 backdrop-blur-md">
            <span className="font-bold mr-2 text-xl">✓</span>
            <span className="font-medium text-sm tracking-wide">{message}</span>
        </div>
    );
};

interface HistoryState {
  columns: TabColumn[];
  durations: NoteDuration[];
  chordNames: (string | null)[];
  connections: { col: number; str: number }[];
}

const App: React.FC = () => {
  useEffect(() => {
    document.title = "Tab | Serum Lab";
  }, []);

  // State
  const [instrumentType, setInstrumentType] = useState<InstrumentType>('guitar');
  const [timeSignature, setTimeSignature] = useState<TimeSignatureType>('4/4');
  const [bpm, setBpm] = useState<number>(120); 
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentColIndex, setCurrentColIndex] = useState<number>(-1);
  const [songTitle, setSongTitle] = useState("Untitled Project");
  
  const [customTuning, setCustomTuning] = useState<string[]>(INSTRUMENTS['guitar'].strings);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const [editRowStartBarIndex, setEditRowStartBarIndex] = useState<number>(0);
  const [isChordLibraryOpen, setIsChordLibraryOpen] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'modified'>('saved');
  const [hasDraft, setHasDraft] = useState(false);
  
  const [gridKey, setGridKey] = useState<number>(0);
  const [activeCell, setActiveCell] = useState<{ col: number; str: number } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Ref for Keyboard Shortcuts (Initialized empty to avoid reference errors)
  const stateRef = useRef<any>({});

  const initialTsConfig = TIME_SIGNATURES['4/4'];
  const initialSteps = initialTsConfig.stepsPerBar * 4;
  const [columns, setColumns] = useState<TabColumn[]>(createEmptyColumns(initialSteps, INSTRUMENTS['guitar'].stringCount));
  const [durations, setDurations] = useState<NoteDuration[]>(createDefaultDurations(initialSteps));
  const [chordNames, setChordNames] = useState<(string | null)[]>(Array(initialSteps).fill(null));
  
  const [connections, setConnections] = useState<{ col: number; str: number }[]>([]);

  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [clipboard, setClipboard] = useState<HistoryState | null>(null);

  // AI State
  const [isGenerating, setIsGenerating] = useState(false);

  const currentInstrument = INSTRUMENTS[instrumentType];
  const currentStepsPerBar = TIME_SIGNATURES[timeSignature].stepsPerBar;
  const currentTempoBeat = TIME_SIGNATURES[timeSignature].tempoBeat;

  useEffect(() => {
     const initialState = {
         columns: createEmptyColumns(initialSteps, INSTRUMENTS['guitar'].stringCount),
         durations: createDefaultDurations(initialSteps),
         chordNames: Array(initialSteps).fill(null),
         connections: []
     };
     setHistory([initialState]);
     setHistoryIndex(0);
  }, []);

  const getDefaultDuration = useCallback((ts: TimeSignatureType): NoteDuration => {
      const parts = ts.split('/');
      if (parts.length < 2) return '8';
      const denominator = parseInt(parts[1], 10);
      const val = (denominator * 2).toString();
      return ['1', '2', '4', '8', '16'].includes(val) ? (val as NoteDuration) : '8';
  }, []);

  const activeFrequencies = useMemo(() => {
      return customTuning.map((t, i) => {
         const def = currentInstrument.frequencies[i] || 440;
         return getFrequencyFromStr(t, def);
      });
  }, [customTuning, currentInstrument]);

  useEffect(() => {
    let engineBpm = bpm;
    if (currentTempoBeat === 'dotted-quarter') {
        engineBpm = bpm * 1.5;
    }
    audioEngine.setScore(columns, durations, engineBpm, activeFrequencies, instrumentType);
  }, [columns, durations, bpm, activeFrequencies, instrumentType, currentTempoBeat]);

  // --- Handlers ---

  const updateStateWithHistory = (
      newColumns: TabColumn[], 
      newDurations: NoteDuration[], 
      newChordNames: (string | null)[],
      newConnections: { col: number; str: number }[]
  ) => {
      const newState: HistoryState = {
          columns: newColumns,
          durations: newDurations,
          chordNames: newChordNames,
          connections: newConnections
      };

      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newState);
      
      if (newHistory.length > 50) newHistory.shift();

      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);

      setColumns(newColumns);
      setDurations(newDurations);
      setChordNames(newChordNames);
      setConnections(newConnections);
  };

  const handleInstrumentChange = (type: InstrumentType) => {
    if (type === instrumentType) return;
    const isTabEmpty = columns.every(col => col.every(n => n === -1));
    if (!isTabEmpty && !window.confirm(`Switching to ${INSTRUMENTS[type].name} will clear the current tab. Continue?`)) return;

    setInstrumentType(type);
    setCustomTuning(INSTRUMENTS[type].strings); 
    setIsPlaying(false);
    setCurrentColIndex(-1);
    audioEngine.stop();
    
    const newCount = currentStepsPerBar * 4;
    const defDur = getDefaultDuration(timeSignature);
    const emptyCols = createEmptyColumns(newCount, INSTRUMENTS[type].stringCount);
    const emptyDurs = createDefaultDurations(newCount, defDur);
    const emptyChords = Array(newCount).fill(null);
    
    updateStateWithHistory(emptyCols, emptyDurs, emptyChords, []);
    setEditRowStartBarIndex(0);
    setActiveCell(null);
    setGridKey(prev => prev + 1);
  };

  const handleTimeSignatureChange = (ts: TimeSignatureType) => {
      if (ts === timeSignature) return;
      const isTabEmpty = columns.every(col => col.every(n => n === -1));
      if (!isTabEmpty && !window.confirm(`Switching to ${ts} will clear the current tab. Continue?`)) return;
      
      setTimeSignature(ts);
      setIsPlaying(false);
      setCurrentColIndex(-1);
      audioEngine.stop();
      setActiveCell(null);
      setEditRowStartBarIndex(0);

      const config = TIME_SIGNATURES[ts];
      const newTotalSteps = config.stepsPerBar * 4;
      const defDur = getDefaultDuration(ts);

      const emptyCols = createEmptyColumns(newTotalSteps, currentInstrument.stringCount);
      const emptyDurs = createDefaultDurations(newTotalSteps, defDur);
      const emptyChords = Array(newTotalSteps).fill(null);

      updateStateWithHistory(emptyCols, emptyDurs, emptyChords, []);
      setToastMessage(`Switched to ${ts}`);
      setGridKey(prev => prev + 1);
