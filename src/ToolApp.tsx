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
    
    // explicit octave check (e.g. c2, a#4)
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

    // No explicit octave, find closest to reference frequency (default tuning)
    const noteOnly = clean.replace(/[0-9]/g, '');
    const nIdx = NOTE_OFFSETS[noteOnly];
    if (nIdx === undefined) return referenceFreq;

    let closestFreq = referenceFreq;
    let minDiff = Infinity;

    // Search reasonable range of octaves (0-8)
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

// Toast Component
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
  // State
  const [instrumentType, setInstrumentType] = useState<InstrumentType>('guitar');
  const [timeSignature, setTimeSignature] = useState<TimeSignatureType>('4/4');
  const [bpm, setBpm] = useState<number>(120); 
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentColIndex, setCurrentColIndex] = useState<number>(-1);
  const [songTitle, setSongTitle] = useState("Untitled Project");
  
  // Custom Tuning State
  const [customTuning, setCustomTuning] = useState<string[]>(INSTRUMENTS['guitar'].strings);

  // View State
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const [editRowStartBarIndex, setEditRowStartBarIndex] = useState<number>(0);
  const [isChordLibraryOpen, setIsChordLibraryOpen] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  
  // Autosave UI State
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'modified'>('saved');
  const [hasDraft, setHasDraft] = useState(false);
  
  // Grid Key to force remount on clear
  const [gridKey, setGridKey] = useState<number>(0);

  // Selection state
  const [activeCell, setActiveCell] = useState<{ col: number; str: number } | null>(null);
  const selectedColIndex = activeCell ? activeCell.col : -1;

  // Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Import/Export Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default to 4 bars of 4/4 (64 steps)
  const initialTsConfig = TIME_SIGNATURES['4/4'];
  const initialSteps = initialTsConfig.stepsPerBar * 4;
  const [columns, setColumns] = useState<TabColumn[]>(createEmptyColumns(initialSteps, INSTRUMENTS['guitar'].stringCount));
  const [durations, setDurations] = useState<NoteDuration[]>(createDefaultDurations(initialSteps));
  const [chordNames, setChordNames] = useState<(string | null)[]>(Array(initialSteps).fill(null));
  
  // Note Connections (Slurs)
  const [connections, setConnections] = useState<{ col: number; str: number }[]>([]);

  // History & Clipboard
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [clipboard, setClipboard] = useState<HistoryState | null>(null);

  // AI State
  const [isGenerating, setIsGenerating] = useState(false);

  const currentInstrument = INSTRUMENTS[instrumentType];
  const currentStepsPerBar = TIME_SIGNATURES[timeSignature].stepsPerBar;
  const currentTempoBeat = TIME_SIGNATURES[timeSignature].tempoBeat;

  // Initialize history once on mount
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

  // Helper to determine default note duration based on Time Signature
  const getDefaultDuration = useCallback((ts: TimeSignatureType): NoteDuration => {
      const parts = ts.split('/');
      if (parts.length < 2) return '8';
      const denominator = parseInt(parts[1], 10);
      const val = (denominator * 2).toString();
      
      const validDurations = ['1', '2', '4', '8', '16'];
      return validDurations.includes(val) ? (val as NoteDuration) : '8';
  }, []);

  // Calculate realtime frequencies from customTuning
  const activeFrequencies = useMemo(() => {
      return customTuning.map((t, i) => {
         const def = currentInstrument.frequencies[i] || 440;
         return getFrequencyFromStr(t, def);
      });
  }, [customTuning, currentInstrument]);

  // Sync Audio Engine state
  useEffect(() => {
    let engineBpm = bpm;
    if (currentTempoBeat === 'dotted-quarter') {
        engineBpm = bpm * 1.5;
    }
    audioEngine.setScore(columns, durations, engineBpm, activeFrequencies, instrumentType);
  }, [columns, durations, bpm, activeFrequencies, instrumentType, currentTempoBeat]);

// --------------------------------------------------------------------------
// AI Handlers
// --------------------------------------------------------------------------

const handleOptimize = () => {
    if (window.confirm("Optimize fingering for the entire tab? This uses AI logic to minimize hand movement.")) {
        const newColumns = optimizeFingering(columns, instrumentType);
        updateStateWithHistory(newColumns, durations, chordNames, connections);
        setToastMessage("Fingering Optimized ✨");
    }
};

const handleGenerate = async () => {
    console.log("🖱️ Button Clicked! Checking tab..."); 
    
    // Check if tab is empty
    const isTabEmpty = columns.every(col => col.every(n => n === -1));
    if (isTabEmpty) {
        setToastMessage("Write some notes first!");
        return;
    }

    setIsGenerating(true);
    setToastMessage("AI is listening...");

    try {
        console.log("🚀 Calling Composer Service...");
        
        // Find where the music actually ends so we can append there
        let lastNoteIndex = -1;
        for (let i = columns.length - 1; i >= 0; i--) {
            if (columns[i].some(n => n !== -1)) {
                lastNoteIndex = i;
                break;
            }
        }
        
        // If the grid is full of silence, start at 0. Otherwise start after last note.
        const insertIndex = lastNoteIndex + 1;

        // Generate 2 bars (32 steps)
        const newRiff = await generateRiff(columns, bpm, instrumentType, 32);
        
        console.log("✅ Riff received, length:", newRiff.length);
        
        if (newRiff.length > 0) {
            // Create a new grid that fits the new riff perfectly
            // 1. Keep everything up to the insertion point
            const columnsBefore = columns.slice(0, insertIndex);
            
            // 2. The new riff
            
            // 3. Keep the rest of the old grid (if you want to overwrite empty space)
            // OR just append. Let's just insert it to be safe.
            const columnsAfter = columns.slice(insertIndex);
            
            // Actually, simpler logic for now: Append to the END of the active music.
            // But we need to maintain bar structure (multiples of 16 usually).
            // Let's keep it simple: Append to the very end of the arrays to avoid breaking bar lines for now.
            // UNLESS you want it to sound immediate.
            
            // BETTER STRATEGY: Overwrite the empty space if it exists!
            const newColumns = [...columns];
            const newDurations = [...durations];
            const newChords = [...chordNames];
            
            // If we don't have enough space in the current grid, extend it
            if (insertIndex + newRiff.length > newColumns.length) {
                const extraNeeded = (insertIndex + newRiff.length) - newColumns.length;
                const extraCols = createEmptyColumns(extraNeeded, INSTRUMENTS[instrumentType].stringCount);
                newColumns.push(...extraCols);
                newDurations.push(...Array(extraNeeded).fill(getDefaultDuration(timeSignature)));
                newChords.push(...Array(extraNeeded).fill(null));
            }

            // Write the riff
            newRiff.forEach((col, i) => {
                newColumns[insertIndex + i] = col;
            });

            updateStateWithHistory(newColumns, newDurations, newChords, connections);
            setToastMessage("Riff Generated! 🔮");
            
            // Scroll to where we added it
            setCurrentColIndex(insertIndex); 
        } else {
            setToastMessage("Could not generate riff.");
        }

    } catch (error) {
        console.error("❌ Generation Error:", error);
        setToastMessage("AI Error. Check Console.");
    } finally {
        setIsGenerating(false);
    }
};
  
  // --------------------------------------------------------------------------
  // History Management
  // --------------------------------------------------------------------------

  const updateStateWithHistory = (
      newColumns: TabColumn[], 
      newDurations: NoteDuration[], 
      newChordNames: (string | null)[],
      newConnections: { col: number; str: number }[]
  ) => {
      // Create new history entry
      const newState: HistoryState = {
          columns: newColumns,
          durations: newDurations,
          chordNames: newChordNames,
          connections: newConnections
      };

      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newState);
      
      // Limit history size to 50
      if (newHistory.length > 50) newHistory.shift();

      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);

      // Update actual state
      setColumns(newColumns);
      setDurations(newDurations);
      setChordNames(newChordNames);
      setConnections(newConnections);
  };

  const undo = () => {
      if (historyIndex > 0) {
          const prevIndex = historyIndex - 1;
          const prevState = history[prevIndex];
          setColumns(prevState.columns);
          setDurations(prevState.durations);
          setChordNames(prevState.chordNames);
          setConnections(prevState.connections);
          setHistoryIndex(prevIndex);
          setToastMessage("Undo");
      }
  };

  const redo = () => {
      if (historyIndex < history.length - 1) {
          const nextIndex = historyIndex + 1;
          const nextState = history[nextIndex];
          setColumns(nextState.columns);
          setDurations(nextState.durations);
          setChordNames(nextState.chordNames);
          setConnections(nextState.connections);
          setHistoryIndex(nextIndex);
          setToastMessage("Redo");
      }
  };

  // --------------------------------------------------------------------------
  // Editing Actions
  // --------------------------------------------------------------------------

  const handleUpdateColumn = (index: number, newCol: TabColumn) => {
    const newColumns = [...columns];
    newColumns[index] = newCol;
    updateStateWithHistory(newColumns, durations, chordNames, connections);
  };

  const handleUpdateDuration = (index: number, newDuration: NoteDuration) => {
    const newDurations = [...durations];
    newDurations[index] = newDuration;
    updateStateWithHistory(columns, newDurations, chordNames, connections);
  };

  const handleUpdateChord = (index: number, val: string) => {
    const newChords = [...chordNames];
    newChords[index] = val;
    updateStateWithHistory(columns, durations, newChords, connections);
  };
  
  const handleToggleConnection = () => {
    if (!activeCell) return;
    const { col, str } = activeCell;
    
    // Check if we are deleting or adding
    const exists = connections.some(c => c.col === col && c.str === str);
    
    if (exists) {
        // Remove existing
        const newConnections = connections.filter(c => !(c.col === col && c.str === str));
        setToastMessage("Removed Link");
        updateStateWithHistory(columns, durations, chordNames, newConnections);
    } else {
        // Validation for adding
        const currentNote = columns[col][str];
        if (currentNote === -1) return; // No note to link from

        // Check for next note on the same string
        let hasNeighbor = false;
        for (let i = col + 1; i < columns.length; i++) {
             if (columns[i][str] !== -1) {
                 hasNeighbor = true;
                 break;
             }
        }
        
        if (hasNeighbor) {
            const newConnections = [...connections, { col, str }];
            setToastMessage("Link Added");
            updateStateWithHistory(columns, durations, chordNames, newConnections);
        }
    }
  };

  const handleRemoveConnectionChain = (startCol: number, endCol: number, str: number) => {
    const newConnections = connections.filter(c => {
        if (c.str !== str) return true;
        // Remove all connections that lie within the chain's span
        if (c.col >= startCol && c.col < endCol) return false;
        return true;
    });
    
    if (newConnections.length !== connections.length) {
        updateStateWithHistory(columns, durations, chordNames, newConnections);
        setToastMessage("Chain Removed");
    }
  };

  const handleAddMeasure = () => {
    const emptyCols = createEmptyColumns(currentStepsPerBar, currentInstrument.stringCount);
    const defDur = getDefaultDuration(timeSignature);
    const emptyDurs = createDefaultDurations(currentStepsPerBar, defDur);
    
    updateStateWithHistory(
        [...columns, ...emptyCols],
        [...durations, ...emptyDurs],
        [...chordNames, ...Array(currentStepsPerBar).fill(null)],
        connections
    );
    setToastMessage("Added 1 Bar");
  };

  const handleAddFourMeasures = () => {
    const count = currentStepsPerBar * 4;
    const emptyCols = createEmptyColumns(count, currentInstrument.stringCount);
    const defDur = getDefaultDuration(timeSignature);
    const emptyDurs = createDefaultDurations(count, defDur);
    
    updateStateWithHistory(
        [...columns, ...emptyCols],
        [...durations, ...emptyDurs],
        [...chordNames, ...Array(count).fill(null)],
        connections
    );
    setToastMessage("Added 4 Bars");
  };

  const handleClearTab = () => {
      if (window.confirm("Are you sure you want to clear the entire tab? This cannot be undone via history.")) {
           const initialCount = currentStepsPerBar * 4;
           const defDur = getDefaultDuration(timeSignature);
           const emptyCols = createEmptyColumns(initialCount, currentInstrument.stringCount);
           const emptyDurs = createDefaultDurations(initialCount, defDur);
           const emptyChords = Array(initialCount).fill(null);
           
           // We do reset history here as it's a hard reset
           const newState = { columns: emptyCols, durations: emptyDurs, chordNames: emptyChords, connections: [] };
           setHistory([newState]);
           setHistoryIndex(0);
           setColumns(emptyCols);
           setDurations(emptyDurs);
           setChordNames(emptyChords);
           setConnections([]);
           setGridKey(prev => prev + 1);
           setToastMessage("Tab Cleared");
      }
  };

  const handleClearBar = () => {
      if (!activeCell) return;
      
      const barIndex = Math.floor(activeCell.col / currentStepsPerBar);
      const startIdx = barIndex * currentStepsPerBar;
      const endIdx = startIdx + currentStepsPerBar;
      
      const newColumns = [...columns];
      
      for (let i = startIdx; i < endIdx; i++) {
          if (i < newColumns.length) {
              newColumns[i] = Array(currentInstrument.stringCount).fill(-1);
          }
      }
      // Also remove connections in this bar for cleanliness
      const newConnections = connections.filter(c => !(c.col >= startIdx && c.col < endIdx));
      
      updateStateWithHistory(newColumns, durations, chordNames, newConnections);
      setToastMessage("Bar Cleared");
  };

  // --------------------------------------------------------------------------
  // Copy / Paste Logic
  // --------------------------------------------------------------------------

  const handleCopyBar = () => {
      if (!activeCell) {
          setToastMessage("Select a cell to copy its bar");
          return;
      }
      const barIndex = Math.floor(activeCell.col / currentStepsPerBar);
      const startIdx = barIndex * currentStepsPerBar;
      const endIdx = startIdx + currentStepsPerBar;

      // Slice data
      // Filter connections relevant to this bar and normalize them (relative to startIdx)
      const relativeConnections = connections
          .filter(c => c.col >= startIdx && c.col < endIdx)
          .map(c => ({ col: c.col - startIdx, str: c.str }));

      const copiedState: HistoryState = {
          columns: JSON.parse(JSON.stringify(columns.slice(startIdx, endIdx))),
          durations: [...durations.slice(startIdx, endIdx)],
          chordNames: [...chordNames.slice(startIdx, endIdx)],
          connections: relativeConnections 
      };
      
      setClipboard(copiedState);
      setToastMessage("Bar Copied");
  };

  const handlePasteBar = () => {
      if (!activeCell) {
          setToastMessage("Select a destination cell");
          return;
      }
      if (!clipboard) {
          setToastMessage("Clipboard empty");
          return;
      }

      const barIndex = Math.floor(activeCell.col / currentStepsPerBar);
      const startIdx = barIndex * currentStepsPerBar;
      
      // We overwrite starting from startIdx, limited by clipboard length or total columns
      const clipLen = clipboard.columns.length;
      
      // Prepare new arrays
      const newColumns = [...columns];
      const newDurations = [...durations];
      const newChords = [...chordNames];

      // Remove existing connections in target area
      let newConnections = connections.filter(c => !(c.col >= startIdx && c.col < startIdx + clipLen));

      for (let i = 0; i < clipLen; i++) {
          const targetIdx = startIdx + i;
          if (targetIdx < newColumns.length) {
              newColumns[targetIdx] = clipboard.columns[i];
              newDurations[targetIdx] = clipboard.durations[i];
              newChords[targetIdx] = clipboard.chordNames[i];
          }
      }
      
      // Add pasted connections
      clipboard.connections.forEach(c => {
          const targetCol = startIdx + c.col;
          if (targetCol < newColumns.length) {
              newConnections.push({ col: targetCol, str: c.str });
          }
      });

      updateStateWithHistory(newColumns, newDurations, newChords, newConnections);
      setToastMessage("Bar Pasted");
  };

  // --------------------------------------------------------------------------
  // Project State Helpers (Load/Save/AutoSave)
  // --------------------------------------------------------------------------

  const getProjectState = (): SavedProject => {
    return {
      version: '1.0',
      title: songTitle,
      bpm,
      instrumentType,
      timeSignature,
      columns,
      durations,
      tuning: customTuning,
      chordNames: chordNames.map(c => c || ''),
      connections
    };
  };

  const handleSaveProject = () => {
    const project = getProjectState();
    try {
        const jsonString = JSON.stringify(project, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const href = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = href;
        const safeTitle = songTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'untitled_project';
        link.download = `${safeTitle}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(href);
        setToastMessage("Project Saved");
    } catch (err) {
        console.error("Failed to save project:", err);
        alert("Failed to save project. Please try again.");
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target?.result as string;
            const project = JSON.parse(content);
            
            // Basic structural validation
            if (project && Array.isArray(project.columns) && Array.isArray(project.durations)) {
                if (window.confirm("Importing a project will overwrite the current session. Continue?")) {
                    loadProjectState(project);
                    setToastMessage("Project Imported");
                }
            } else {
                alert("Invalid project file: Missing core data.");
            }
        } catch (error) {
            console.error("Failed to parse project file:", error);
            alert("Failed to read project file. Please ensure it is a valid JSON file exported from SerTab.");
        }
        
        // Reset file input to allow re-importing same file if needed
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };
    reader.readAsText(file);
  };

  const loadProjectState = (project: SavedProject) => {
    audioEngine.stop();
    setIsPlaying(false);
    setCurrentColIndex(-1);
    setActiveCell(null);
    setEditRowStartBarIndex(0);

    setSongTitle(project.title || "Untitled Project");
    setBpm(project.bpm || 120); 
    setInstrumentType(project.instrumentType);
    setTimeSignature(project.timeSignature || '4/4');
    setColumns(project.columns);
    setDurations(project.durations);
    setConnections(project.connections || []);
    
    if (project.chordNames && project.chordNames.length === project.columns.length) {
        setChordNames(project.chordNames);
    } else {
        setChordNames(Array(project.columns.length).fill(null));
    }
    
    const defaultStrings = INSTRUMENTS[project.instrumentType].strings;
    setCustomTuning(project.tuning && project.tuning.length === defaultStrings.length ? project.tuning : defaultStrings);
    
    // Reset History
    const newState = { columns: project.columns, durations: project.durations, chordNames: project.chordNames || [], connections: project.connections || [] };
    setHistory([newState]);
    setHistoryIndex(0);
    
    setGridKey(prev => prev + 1); 
  };

  // Auto-Save Effect
  useEffect(() => {
      if (saveStatus !== 'modified') setSaveStatus('modified');
      const timer = setTimeout(() => {
          setSaveStatus('saving');
          const currentState = getProjectState();
          localStorage.setItem('serumTab_autoSave', JSON.stringify(currentState));
          setHasDraft(true);
          setTimeout(() => setSaveStatus('saved'), 500);
      }, 2000); 
      return () => clearTimeout(timer);
  }, [songTitle, bpm, instrumentType, timeSignature, columns, durations, customTuning, chordNames, connections]);

  // Startup: Check for Draft
  useEffect(() => {
      const savedData = localStorage.getItem('serumTab_autoSave');
      if (savedData) {
          setHasDraft(true);
          try {
              const project = JSON.parse(savedData);
              if (project.columns && project.durations && project.instrumentType) {
                  setTimeout(() => {
                      if (window.confirm("Found an auto-saved draft. Would you like to restore it?")) {
                          loadProjectState(project);
                          setToastMessage("Draft Restored");
                      }
                  }, 100);
              }
          } catch (e) { console.error(e); }
      }
  }, []);

  const handleRestoreDraft = () => {
    const savedData = localStorage.getItem('serumTab_autoSave');
    if (savedData && window.confirm("Restore the last auto-saved session? Current unsaved changes will be lost.")) {
        try {
           const project = JSON.parse(savedData);
           loadProjectState(project);
           setToastMessage("Session Restored");
        } catch(e) { alert("Failed to restore draft."); }
    }
  };


   // --------------------------------------------------------------------------
  // Global Keyboard Shortcuts (Ref-Based for reliability)
  // --------------------------------------------------------------------------
  
  // 1. Keep ref updated with latest state
  useEffect(() => {
      stateRef.current = { 
          activeCell, clipboard, historyIndex, history, isReviewMode, isPlaying, 
          columns, durations, chordNames, connections, currentStepsPerBar,
          handleSaveProject, handleTogglePlay, undo, redo, handleToggleConnection, 
          handleCopyBar, handlePasteBar // Ensure these are captured!
      };
  }, [activeCell, clipboard, historyIndex, history, isReviewMode, isPlaying, columns, durations, chordNames, connections, currentStepsPerBar]);

  // 2. Single Listener that uses the Ref
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const current = stateRef.current;
        const target = e.target as HTMLElement;
        
        // --- FIXED LOGIC: Allow shortcuts if user is in Title Input, BUT NOT if they are in a generic Text Area ---
        // We assume id="project-title" is the only input we want to allow Global Shortcuts (except Copy text)
        const isTitleInput = target.id === 'project-title';
        const isOtherInput = !isTitleInput && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

        if (isOtherInput) return; // Stop if typing in chord box or search

        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); current.handleSaveProject(); return; }
        if (current.isReviewMode) return;
        if (e.code === 'Space' && !isTitleInput) { e.preventDefault(); current.handleTogglePlay(); return; }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? current.redo() : current.undo(); return; }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); current.redo(); return; }
        
        // Copy: Allow browser copy if in Title Input, otherwise trigger App Copy
        if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC') { 
            if (isTitleInput) return; // Let browser copy title text
            e.preventDefault(); 
            console.log("📋 Copy Triggered");
            current.handleCopyBar(); 
            return; 
        }

        // Paste: Allow browser paste if in Title Input, otherwise trigger App Paste
        if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV') { 
            if (isTitleInput) return; // Let browser paste title text
            e.preventDefault(); 
            console.log("📋 Paste Triggered");
            current.handlePasteBar(); 
            return; 
        }
        
        if (e.code === 'KeyL' && !isTitleInput) { e.preventDefault(); current.handleToggleConnection(); return; }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); 

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
    
    // Reset History
    const newState = { columns: emptyCols, durations: emptyDurs, chordNames: emptyChords, connections: [] };
    setHistory([newState]);
    setHistoryIndex(0);

    setColumns(emptyCols);
    setDurations(emptyDurs);
    setChordNames(emptyChords);
    setConnections([]);
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

      const newState = { columns: emptyCols, durations: emptyDurs, chordNames: emptyChords, connections: [] };
      setHistory([newState]);
      setHistoryIndex(0);

      setColumns(emptyCols);
      setDurations(emptyDurs);
      setChordNames(emptyChords);
      setConnections([]);
      setToastMessage(`Switched to ${ts}`);
      setGridKey(prev => prev + 1);
  };

  const handleTuningChange = (index: number, val: string) => {
    const newTuning = [...customTuning];
    newTuning[index] = val;
    setCustomTuning(newTuning);
  };

  useEffect(() => {
    audioEngine.setOnTickCallback((index) => setCurrentColIndex(index));
    audioEngine.setOnStopCallback(() => {
      setIsPlaying(false);
      setCurrentColIndex(-1);
    });
  }, []);

  const handleTogglePlay = () => {
    if (isPlaying) {
      audioEngine.stop();
      setIsPlaying(false);
      setCurrentColIndex(-1);
    } else {
      let startIndex = 0;
      if (selectedColIndex > -1) {
         startIndex = Math.floor(selectedColIndex / currentStepsPerBar) * currentStepsPerBar;
      } else {
         startIndex = editRowStartBarIndex * currentStepsPerBar;
      }
      audioEngine.start(startIndex);
      setIsPlaying(true);
    }
  };

const handlePlayFromStart = () => {
    audioEngine.stop(); // Stop any current playback
    audioEngine.start(0); // Start from index 0
    setIsPlaying(true);
    // Note: We don't change currentColIndex here because AudioEngine callback will update it instantly
  };

  if (isReviewMode) {
    return (
      <ReviewView 
        title={songTitle}
        bpm={bpm}
        timeSignature={timeSignature}
        instrument={currentInstrument}
        tuning={customTuning}
        columns={columns}
        durations={durations}
        chordNames={chordNames}
        connections={connections}
        onClose={() => setIsReviewMode(false)}
        onRemoveConnectionChain={handleRemoveConnectionChain}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white font-sans selection:bg-cyan-500/30 selection:text-white overflow-hidden relative">
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      
      <ChordLibrary 
        isOpen={isChordLibraryOpen} 
        onClose={() => setIsChordLibraryOpen(false)}
        targetIndex={selectedColIndex}
        onSelectChord={(name) => {
            if (selectedColIndex !== -1) {
                handleUpdateChord(selectedColIndex, name);
                setToastMessage(`Inserted ${name}`);
            }
        }}
      />

      <header className="flex-none h-20 bg-gray-900/90 backdrop-blur-xl border-b border-white/5 flex items-center px-8 justify-between z-40 gap-8 shrink-0 shadow-2xl">
        <div className="flex items-center gap-6">
             {/* HOME BUTTON (Logo) */}
             <Link to="/" className="flex flex-col justify-center hover:opacity-80 transition-opacity cursor-pointer group">
                 <div className="flex items-center gap-3">
                     {/* Updated font size to text-xl to match Title */}
                     <h1 className="text-xl font-bold text-white tracking-tight leading-none drop-shadow-sm font-['Courier'] group-hover:text-cyan-400 transition-colors">
                        Tab by serum
                     </h1>
                     <span className="px-1.5 py-0.5 rounded-[4px] bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-bold text-cyan-400 leading-none uppercase tracking-wider">
                        Beta 1.1
                     </span>
                 </div>
                 <div className="text-[10px] text-gray-500 font-['Courier'] font-bold leading-tight mt-0.5">
                    development in progress <span className="text-gray-400">@silicondiox1de</span>
                 </div>
             </Link>
        </div>
        
        <div className="flex items-center gap-6 shrink-0">
             <div className="text-xs font-['Courier'] font-bold flex items-center bg-gray-800/50 px-4 py-2 rounded-full border border-white/5">
                {saveStatus === 'saving' && <span className="text-yellow-500/80 animate-pulse font-medium">Saving...</span>}
                {saveStatus === 'saved' && <span className="text-gray-400 flex items-center"><span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></span>Saved</span>}
                {saveStatus === 'modified' && <span className="text-gray-500 italic">Unsaved</span>}
             </div>

             {hasDraft && (
                 <button 
                    onClick={handleRestoreDraft}
                    className="h-9 px-4 text-xs font-bold text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/50 rounded-lg border border-cyan-900/50 transition-all"
                >
                    Restore Session
                </button>
             )}

             <div className="flex items-center bg-gray-800/50 p-1.5 rounded-xl border border-white/5 gap-1">
                <button 
                    onClick={() => setIsReviewMode(true)}
                    className="h-8 px-4 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all flex items-center gap-2"
                    title="View as Sheet"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    Review
                </button>
                <div className="w-[1px] h-5 bg-white/10 mx-1"></div>
                <button 
                    onClick={handleImportClick}
                    className="h-8 px-4 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all flex items-center gap-2"
                    title="Import project from .json"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    Import
                </button>
                <div className="w-[1px] h-5 bg-white/10 mx-1"></div>
                <button 
                    onClick={handleSaveProject}
                    className="h-8 px-4 text-xs font-bold text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/30 rounded-lg transition-all flex items-center gap-2"
                    title="Download current project to .json"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Export
                </button>
             </div>
        </div>
      </header>
      
      {/* Sub-header for Title */}
      {/* --- NEW TOOLBAR HEADER --- */}
      <div className="flex-none h-14 bg-gray-900 border-b border-white/5 flex items-center justify-between px-6 relative z-30">
        
        {/* LEFT: EDIT TOOLS (Undo, Redo, Clear, Reset) */}
        <div className="flex items-center gap-2">
             <div className="bg-gray-800/40 border border-white/5 rounded-lg p-1 flex items-center gap-1">
                 <button onClick={undo} disabled={!(historyIndex > 0)} className={`h-8 w-8 flex items-center justify-center rounded-md transition-all active:scale-95 ${!(historyIndex > 0) ? 'text-gray-700 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-white/10'}`} title="Undo (Ctrl+Z)">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                 </button>
                 <button onClick={redo} disabled={!(historyIndex < history.length - 1)} className={`h-8 w-8 flex items-center justify-center rounded-md transition-all active:scale-95 ${!(historyIndex < history.length - 1) ? 'text-gray-700 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-white/10'}`} title="Redo (Ctrl+Y)">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                 </button>
                 <div className="w-[1px] h-5 bg-white/10 mx-1"></div>
                 <button onClick={handleClearBar} disabled={!activeCell} className={`h-8 w-8 flex items-center justify-center rounded-md transition-all active:scale-95 ${!activeCell ? 'text-gray-700 cursor-not-allowed' : 'text-gray-400 hover:text-red-400 hover:bg-white/10'}`} title="Clear Selected Bar">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                 </button>
                 <button onClick={handleClearTab} className="h-8 w-8 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-white/10 transition-all active:scale-95" title="Reset All">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                 </button>
             </div>
        </div>

        {/* CENTER: TITLE INPUT */}
        <div className="absolute left-1/2 -translate-x-1/2">
            <div className="relative group flex items-center justify-center gap-2">
                {/* The Input Field */}
            <input 
                type="text" 
                value={songTitle}
                onChange={(e) => setSongTitle(e.target.value)}
                placeholder="Untitled Project"
                className="
                  bg-transparent 
                  text-sm font-bold text-gray-200 
                  placeholder-gray-600 
                  text-center 
                  w-64 px-2 py-1 
                  border-b-2 border-transparent 
                  group-hover:border-gray-600 
                  focus:border-cyan-500 focus:outline-none focus:text-white
                  transition-all duration-200
                  /* Removed font-['Courier'] so it defaults to the App's standard font */
                "
            />
                <div className="absolute -right-6 top-1/2 -translate-y-1/2 text-gray-600 opacity-50 group-hover:opacity-100 group-hover:text-cyan-400 transition-all pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                </div>
            </div>
        </div>

        {/* RIGHT: PLAYBACK CONTROLS */}
        <div className="flex items-center gap-3">
            <div className="flex items-center bg-gray-800/40 border border-white/5 rounded-xl p-1 gap-2">
              <button
                onClick={handlePlayFromStart}
                className="h-10 w-10 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                title="Play from Start"
              >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
              </button>

              <button
                onClick={handleTogglePlay}
                className={`h-10 w-14 rounded-lg flex items-center justify-center shadow-lg transition-all active:scale-95 border ${
                  isPlaying 
                    ? 'bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30' 
                    : 'bg-green-500 text-white border-green-400 shadow-green-500/20 hover:scale-105'
                }`}
                title={isPlaying ? "Stop (Space)" : "Play from selection (Space)"}
              >
                {isPlaying ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current" viewBox="0 0 20 20"><rect x="5" y="5" width="4" height="10" rx="1" /><rect x="11" y="5" width="4" height="10" rx="1" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 fill-current ml-0.5" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
                )}
              </button>
            </div>
        </div>

      </div>
      
      {/* Hidden File Input for Import */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".json" 
        className="hidden" 
      />

      <section className="flex-none shrink-0 z-30 pt-4 px-4 pb-2">
          <Controls
            isPlaying={isPlaying}
            bpm={bpm}
            instrumentType={instrumentType}
            timeSignature={timeSignature}
            isZoomed={isZoomed}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            hasSelection={!!activeCell}
            onTogglePlay={handleTogglePlay}
            onBpmChange={setBpm}
            onAddMeasure={handleAddMeasure}
            onAddFourMeasures={handleAddFourMeasures}
            onInstrumentChange={handleInstrumentChange}
            onTimeSignatureChange={handleTimeSignatureChange}
            onToggleZoom={() => setIsZoomed(!isZoomed)}
            onOpenChordLibrary={() => setIsChordLibraryOpen(true)}
            onUndo={undo}
            onRedo={redo}
            onClearTab={handleClearTab}
            onClearBar={handleClearBar}
            onToggleConnection={handleToggleConnection}
            onOptimize={handleOptimize}
            
            // --- CONNECTING THE AI GENERATOR ---
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />
      </section>

      <main className="flex-1 relative overflow-hidden">
        {/* Background Texture */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
             style={{ 
                 backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                 maskImage: 'linear-gradient(to bottom, black, transparent)'
             }}>
        </div>

        <div className="absolute inset-0 pb-12 pt-0">
             {columns.length > 0 && (
                <TabGrid 
                    key={gridKey}
                    columns={columns} 
                    durations={durations}
                    chordNames={chordNames}
                    currentColumnIndex={currentColIndex}
                    instrument={currentInstrument}
                    stepsPerBar={currentStepsPerBar}
                    tuning={customTuning}
                    isZoomed={isZoomed}
                    editRowStartBarIndex={editRowStartBarIndex}
                    activeCell={activeCell}
                    connections={connections}
                    onActiveCellChange={setActiveCell}
                    onEditRowStartChange={setEditRowStartBarIndex}
                    onTuningChange={handleTuningChange}
                    onUpdateColumn={handleUpdateColumn}
                    onUpdateDuration={handleUpdateDuration}
                    onUpdateChord={handleUpdateChord}
                    onRemoveConnectionChain={handleRemoveConnectionChain}
                />
             )}
        </div>

        <div className="absolute bottom-3 right-4 text-[10px] text-gray-700 font-['Courier'] font-bold pointer-events-none select-none z-50">
           Tool belongs to Serum AI. All rights reserved.
        </div>
      </main>
      
      {/* --- PORTRAIT MODE BLOCKER (Internal) --- */}
      <div id="tool-portrait-warning" className="fixed inset-0 z-[9999] bg-[#0f111a] hidden flex-col items-center justify-center text-center p-8">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-6">
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20z"></path>
            <path d="m9 12 3 3 3-3"></path>
          </svg>
          <h2 className="text-2xl font-bold mb-4">Please Rotate Device</h2>
          <p className="text-gray-400 max-w-xs mx-auto">
            The SerTab editor requires a wide screen. Please turn your phone sideways.
          </p>
          <div className="mt-8 w-10 h-16 border-2 border-gray-600 rounded-lg animate-[spin_3s_infinite]"></div>
      </div>

      {/* Internal Style to trigger the warning ONLY on this page */}
      <style>{`
        @media only screen and (orientation: portrait) and (max-width: 768px) {
           /* Show the warning */
           #tool-portrait-warning { display: flex !important; }
           /* Hide the UI behind it so it doesn't look broken */
           header, section, main { display: none !important; }
        }
      `}</style>

    </div>
  );
};

export default App;
