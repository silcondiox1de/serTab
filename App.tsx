import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TabGrid } from './components/TabGrid';
import { Controls } from './components/Controls';
import { ChordLibrary } from './components/ChordLibrary';
import { ReviewView } from './components/ReviewView';
import { TabColumn, createEmptyColumns, createDefaultDurations, InstrumentType, INSTRUMENTS, TimeSignatureType, TIME_SIGNATURES, NoteDuration, SavedProject } from './types';
import { audioEngine } from './services/audioEngine';

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
        <div className="fixed bottom-6 right-6 bg-cyan-600 text-white px-4 py-3 rounded-lg shadow-xl z-50 flex items-center animate-bounce-in">
            <span className="font-bold mr-2">✓</span>
            {message}
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

  // Sync Audio Engine state
  useEffect(() => {
    let engineBpm = bpm;
    if (currentTempoBeat === 'dotted-quarter') {
        engineBpm = bpm * 1.5;
    }
    audioEngine.setScore(columns, durations, engineBpm, currentInstrument.frequencies, instrumentType);
  }, [columns, durations, bpm, currentInstrument, instrumentType, currentTempoBeat]);

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
  // Global Keyboard Shortcuts
  // --------------------------------------------------------------------------
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        // Ignore if focus is in a text input (except for specific global keys)
        const isInputFocused = (e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA';
        
        // Save: Ctrl+S
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            handleSaveProject();
            return;
        }

        if (isReviewMode) return;

        // Space: Toggle Play (handled previously, but ensuring non-input conflict)
        if (e.code === 'Space' && !isInputFocused) {
             e.preventDefault(); 
             if(isPlaying) {
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
             return;
        }

        // Undo: Ctrl+Z
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            if (e.shiftKey) redo();
            else undo();
            return;
        }

        // Redo: Ctrl+Y
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
            e.preventDefault();
            redo();
            return;
        }

        // Copy: Ctrl+C
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && !isInputFocused) {
            e.preventDefault();
            handleCopyBar();
            return;
        }

        // Paste: Ctrl+V
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && !isInputFocused) {
            e.preventDefault();
            handlePasteBar();
            return;
        }
        
        // Link: L
        if (e.key.toLowerCase() === 'l' && !isInputFocused) {
            e.preventDefault();
            handleToggleConnection();
            return;
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, selectedColIndex, currentStepsPerBar, editRowStartBarIndex, isReviewMode, history, historyIndex, clipboard, columns, durations, chordNames, connections]);


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
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white font-sans selection:bg-cyan-500 selection:text-black">
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

      <header className="flex-none h-16 border-b border-gray-800 bg-gray-900 flex items-center px-6 justify-between z-40 gap-4 shrink-0">
        <div className="flex flex-col">
            <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-cyan-500/20">
                    S
                </div>
                <div className="flex flex-col leading-tight">
                    <span className="text-base font-bold tracking-tight text-gray-100">SerumTab</span>
                    <span className="text-[10px] text-cyan-400 font-mono">beta 0.1</span>
                </div>
            </div>
            <span className="text-[10px] text-gray-500 mt-0.5 ml-11">under development by @silicondioxide</span>
        </div>
        
        <div className="flex items-center space-x-3 shrink-0">
             <div className="text-xs font-mono mr-2 flex items-center">
                {saveStatus === 'saving' && <span className="text-yellow-400 animate-pulse">Saving...</span>}
                {saveStatus === 'saved' && <span className="text-gray-500">All changes saved</span>}
                 {saveStatus === 'modified' && <span className="text-gray-500 italic">Unsaved changes...</span>}
             </div>

             {hasDraft && (
                 <button 
                    onClick={handleRestoreDraft}
                    className="px-3 py-1.5 text-xs font-medium text-cyan-300 hover:text-cyan-100 hover:bg-cyan-900/30 rounded transition-colors"
                    title="Restore last auto-saved session"
                >
                    Restore Session
                </button>
             )}

             <button 
                onClick={() => setIsReviewMode(true)}
                className="px-3 py-1.5 text-xs font-bold text-gray-900 bg-white hover:bg-gray-200 rounded transition-colors"
                title="View as Sheet"
            >
                Review
            </button>

             <button 
                onClick={handleSaveProject}
                className="px-3 py-1.5 text-xs font-bold text-gray-900 bg-cyan-500 hover:bg-cyan-400 rounded transition-colors shadow-lg shadow-cyan-500/20"
                title="Download current project to .json"
            >
                Download
            </button>
        </div>
      </header>

      <section className="flex-none shrink-0">
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
          />
      </section>

      <section className="flex-none shrink-0 bg-[#111827] pt-6 pb-2 flex justify-center z-10">
          <input 
              type="text" 
              value={songTitle}
              onChange={(e) => setSongTitle(e.target.value)}
              placeholder="Song Title"
              className="bg-transparent text-center text-2xl font-bold text-gray-100 placeholder-gray-600 focus:outline-none border-b border-transparent focus:border-cyan-500 hover:border-gray-700 transition-all w-96"
          />
      </section>

      <main className="flex-1 relative overflow-hidden bg-[#111827]">
        <div className="absolute inset-0 opacity-5 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #374151 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
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
                />
             )}
        </div>

        <div className="absolute bottom-2 right-4 text-[10px] text-gray-600 pointer-events-none select-none z-50">
           Tool belongs to Serum AI. All rights reserved. No commercial use.
        </div>
      </main>

    </div>
  );
};

export default App;