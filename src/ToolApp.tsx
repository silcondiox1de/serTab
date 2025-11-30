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

const NOTE_OFFSETS: Record<string, number> = { 'c': 0, 'c#': 1, 'db': 1, 'd': 2, 'd#': 3, 'eb': 3, 'e': 4, 'f': 5, 'f#': 6, 'gb': 6, 'g': 7, 'g#': 8, 'ab': 8, 'a': 9, 'a#': 10, 'bb': 10, 'b': 11 };
const BASE_C0 = 16.3516;

const getFrequencyFromStr = (noteStr: string, referenceFreq: number): number => {
    const clean = noteStr.trim().toLowerCase();
    const match = clean.match(/^([a-g][#b]?)([0-8])$/);
    if (match) {
        const notePart = match[1];
        const octPart = parseInt(match[2], 10);
        const nIdx = NOTE_OFFSETS[notePart];
        if (nIdx !== undefined) return BASE_C0 * Math.pow(2, (octPart * 12 + nIdx) / 12);
    }
    const noteOnly = clean.replace(/[0-9]/g, '');
    const nIdx = NOTE_OFFSETS[noteOnly];
    if (nIdx === undefined) return referenceFreq;
    let closestFreq = referenceFreq;
    let minDiff = Infinity;
    for (let oct = 0; oct <= 8; oct++) {
        const candidate = BASE_C0 * Math.pow(2, (oct * 12 + nIdx) / 12);
        const diff = Math.abs(candidate - referenceFreq);
        if (diff < minDiff) { minDiff = diff; closestFreq = candidate; }
    }
    return closestFreq;
};

const Toast = ({ message, onClose }: { message: string | null, onClose: () => void }) => {
    useEffect(() => { if (message) { const timer = setTimeout(onClose, 3000); return () => clearTimeout(timer); } }, [message, onClose]);
    if (!message) return null;
    return (
        <div className="fixed bottom-8 right-8 bg-cyan-500 text-white px-5 py-3 rounded-full shadow-lg shadow-cyan-500/20 z-50 flex items-center animate-bounce-in border border-cyan-400/30 backdrop-blur-md">
            <span className="font-bold mr-2 text-xl">✓</span><span className="font-medium text-sm tracking-wide">{message}</span>
        </div>
    );
};

interface HistoryState { columns: TabColumn[]; durations: NoteDuration[]; chordNames: (string | null)[]; connections: { col: number; str: number }[]; }

const App: React.FC = () => {
  useEffect(() => { document.title = "Tab | Serum Lab"; }, []);

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
  const selectedColIndex = activeCell ? activeCell.col : -1;
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [connections, setConnections] = useState<{ col: number; str: number }[]>([]);
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [clipboard, setClipboard] = useState<HistoryState | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const initialTsConfig = TIME_SIGNATURES['4/4'];
  const initialSteps = initialTsConfig.stepsPerBar * 4;
  const [columns, setColumns] = useState<TabColumn[]>(createEmptyColumns(initialSteps, INSTRUMENTS['guitar'].stringCount));
  const [durations, setDurations] = useState<NoteDuration[]>(createDefaultDurations(initialSteps));
  const [chordNames, setChordNames] = useState<(string | null)[]>(Array(initialSteps).fill(null));

  const currentInstrument = INSTRUMENTS[instrumentType];
  const currentStepsPerBar = TIME_SIGNATURES[timeSignature].stepsPerBar;
  const currentTempoBeat = TIME_SIGNATURES[timeSignature].tempoBeat;

  // --- REF FOR KEYBOARD SHORTCUTS (The Fix) ---
  // We store all current state/handlers in a ref so the event listener can access them fresh.
  const stateRef = useRef({
      activeCell, clipboard, historyIndex, history, isReviewMode, isPlaying, columns, durations, chordNames, connections, currentStepsPerBar,
      // Placeholders for functions defined later
      handleSaveProject: () => {}, 
      handleTogglePlay: () => {}, 
      undo: () => {}, 
      redo: () => {}, 
      handleToggleConnection: () => {}, 
      handleCopyBar: () => {}, 
      handlePasteBar: () => {}
  });

  useEffect(() => {
     const initialState = { columns: createEmptyColumns(initialSteps, INSTRUMENTS['guitar'].stringCount), durations: createDefaultDurations(initialSteps), chordNames: Array(initialSteps).fill(null), connections: [] };
     setHistory([initialState]);
     setHistoryIndex(0);
  }, []);

  const getDefaultDuration = useCallback((ts: TimeSignatureType): NoteDuration => {
      const parts = ts.split('/');
      const val = (parseInt(parts[1], 10) * 2).toString();
      return ['1', '2', '4', '8', '16'].includes(val) ? (val as NoteDuration) : '8';
  }, []);

  const activeFrequencies = useMemo(() => {
      return customTuning.map((t, i) => getFrequencyFromStr(t, currentInstrument.frequencies[i] || 440));
  }, [customTuning, currentInstrument]);

  useEffect(() => {
    let engineBpm = bpm;
    if (currentTempoBeat === 'dotted-quarter') engineBpm = bpm * 1.5;
    audioEngine.setScore(columns, durations, engineBpm, activeFrequencies, instrumentType);
  }, [columns, durations, bpm, activeFrequencies, instrumentType, currentTempoBeat]);

  const updateStateWithHistory = (newColumns: TabColumn[], newDurations: NoteDuration[], newChordNames: (string | null)[], newConnections: { col: number; str: number }[]) => {
      const newState: HistoryState = { columns: newColumns, durations: newDurations, chordNames: newChordNames, connections: newConnections };
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newState);
      if (newHistory.length > 50) newHistory.shift();
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      setColumns(newColumns); setDurations(newDurations); setChordNames(newChordNames); setConnections(newConnections);
  };

  const handleInstrumentChange = (type: InstrumentType) => {
    if (type === instrumentType) return;
    if (!columns.every(col => col.every(n => n === -1)) && !window.confirm(`Switching instruments will clear tab. Continue?`)) return;
    setInstrumentType(type);
    setCustomTuning(INSTRUMENTS[type].strings); 
    setIsPlaying(false); setCurrentColIndex(-1); audioEngine.stop();
    const newCount = currentStepsPerBar * 4;
    const defDur = getDefaultDuration(timeSignature);
    const emptyCols = createEmptyColumns(newCount, INSTRUMENTS[type].stringCount);
    const emptyDurs = createDefaultDurations(newCount, defDur);
    const emptyChords = Array(newCount).fill(null);
    updateStateWithHistory(emptyCols, emptyDurs, emptyChords, []);
    setEditRowStartBarIndex(0); setActiveCell(null); setGridKey(prev => prev + 1);
  };

  const handleTimeSignatureChange = (ts: TimeSignatureType) => {
      if (ts === timeSignature) return;
      if (!columns.every(col => col.every(n => n === -1)) && !window.confirm(`Switching Sig will clear tab. Continue?`)) return;
      setTimeSignature(ts);
      setIsPlaying(false); setCurrentColIndex(-1); audioEngine.stop(); setEditRowStartBarIndex(0); setActiveCell(null);
      const newTotalSteps = TIME_SIGNATURES[ts].stepsPerBar * 4;
      const defDur = getDefaultDuration(ts);
      const emptyCols = createEmptyColumns(newTotalSteps, currentInstrument.stringCount);
      const emptyDurs = createDefaultDurations(newTotalSteps, defDur);
      const emptyChords = Array(newTotalSteps).fill(null);
      updateStateWithHistory(emptyCols, emptyDurs, emptyChords, []);
      setToastMessage(`Switched to ${ts}`); setGridKey(prev => prev + 1);
  };

  const handleTuningChange = (index: number, val: string) => {
    const newTuning = [...customTuning];
    newTuning[index] = val;
    setCustomTuning(newTuning);
  };

  const handleOptimize = () => {
    if (window.confirm("Optimize fingering?")) {
        const newColumns = optimizeFingering(columns, instrumentType);
        updateStateWithHistory(newColumns, durations, chordNames, connections);
        setToastMessage("Fingering Optimized ✨");
    }
  };

  const handleGenerate = async () => {
    const isTabEmpty = columns.every(col => col.every(n => n === -1));
    if (isTabEmpty) { setToastMessage("Write some notes first!"); return; }
    setIsGenerating(true); setToastMessage("AI is listening...");
    try {
        let lastNoteIndex = -1;
        for (let i = columns.length - 1; i >= 0; i--) {
            if (columns[i].some(n => n !== -1)) { lastNoteIndex = i; break; }
        }
        const insertIndex = lastNoteIndex + 1;
        const newRiff = await generateRiff(columns, bpm, instrumentType, 32);
        if (newRiff.length > 0) {
            const newColumns = [...columns];
            const newDurations = [...durations];
            const newChords = [...chordNames];
            if (insertIndex + newRiff.length > newColumns.length) {
                const extraNeeded = (insertIndex + newRiff.length) - newColumns.length;
                const extraCols = createEmptyColumns(extraNeeded, INSTRUMENTS[instrumentType].stringCount);
                newColumns.push(...extraCols);
                newDurations.push(...Array(extraNeeded).fill(getDefaultDuration(timeSignature)));
                newChords.push(...Array(extraNeeded).fill(null));
            }
            newRiff.forEach((col, i) => { newColumns[insertIndex + i] = col; });
            updateStateWithHistory(newColumns, newDurations, newChords, connections);
            setToastMessage("Riff Generated! 🔮");
            setCurrentColIndex(insertIndex); 
        } else { setToastMessage("Could not generate riff."); }
    } catch (error) { console.error(error); setToastMessage("AI Error. Check Console."); } 
    finally { setIsGenerating(false); }
  };

  const undo = () => { if (historyIndex > 0) { const s = history[historyIndex - 1]; setColumns(s.columns); setDurations(s.durations); setChordNames(s.chordNames); setConnections(s.connections); setHistoryIndex(historyIndex - 1); setToastMessage("Undo"); } };
  const redo = () => { if (historyIndex < history.length - 1) { const s = history[historyIndex + 1]; setColumns(s.columns); setDurations(s.durations); setChordNames(s.chordNames); setConnections(s.connections); setHistoryIndex(historyIndex + 1); setToastMessage("Redo"); } };

  const handleUpdateColumn = (idx: number, col: TabColumn) => { const nC = [...columns]; nC[idx] = col; updateStateWithHistory(nC, durations, chordNames, connections); };
  const handleUpdateDuration = (idx: number, d: NoteDuration) => { const nD = [...durations]; nD[idx] = d; updateStateWithHistory(columns, nD, chordNames, connections); };
  const handleUpdateChord = (idx: number, v: string) => { const nCh = [...chordNames]; nCh[idx] = v; updateStateWithHistory(columns, durations, nCh, connections); };
  
  const handleToggleConnection = () => {
    if (!activeCell) return;
    const { col, str } = activeCell;
    const exists = connections.some(c => c.col === col && c.str === str);
    if (exists) {
        const nC = connections.filter(c => !(c.col === col && c.str === str));
        setToastMessage("Removed Link"); updateStateWithHistory(columns, durations, chordNames, nC);
    } else {
        if (columns[col][str] === -1) return;
        let hasN = false;
        for (let i = col + 1; i < columns.length; i++) { if (columns[i][str] !== -1) { hasN = true; break; } }
        if (hasN) {
            const nC = [...connections, { col, str }];
            setToastMessage("Link Added"); updateStateWithHistory(columns, durations, chordNames, nC);
        }
    }
  };

  const handleRemoveConnectionChain = (s: number, e: number, st: number) => {
    const nC = connections.filter(c => { if (c.str !== st) return true; if (c.col >= s && c.col < e) return false; return true; });
    if (nC.length !== connections.length) { updateStateWithHistory(columns, durations, chordNames, nC); setToastMessage("Chain Removed"); }
  };

  const handleAddMeasure = () => {
    const eC = createEmptyColumns(currentStepsPerBar, currentInstrument.stringCount);
    const dD = getDefaultDuration(timeSignature);
    const eD = createDefaultDurations(currentStepsPerBar, dD);
    updateStateWithHistory([...columns, ...eC], [...durations, ...eD], [...chordNames, ...Array(currentStepsPerBar).fill(null)], connections);
    setToastMessage("Added 1 Bar");
  };

  const handleAddFourMeasures = () => {
    const c = currentStepsPerBar * 4;
    const eC = createEmptyColumns(c, currentInstrument.stringCount);
    const dD = getDefaultDuration(timeSignature);
    const eD = createDefaultDurations(c, dD);
    updateStateWithHistory([...columns, ...eC], [...durations, ...eD], [...chordNames, ...Array(c).fill(null)], connections);
    setToastMessage("Added 4 Bars");
  };

  const handleClearTab = () => {
      if (window.confirm("Clear tab?")) {
           const c = currentStepsPerBar * 4;
           const dD = getDefaultDuration(timeSignature);
           const eC = createEmptyColumns(c, currentInstrument.stringCount);
           const eD = createDefaultDurations(c, dD);
           const eCh = Array(c).fill(null);
           const newState = { columns: eC, durations: eD, chordNames: eCh, connections: [] };
           setHistory([newState]); setHistoryIndex(0); setColumns(eC); setDurations(eD); setChordNames(eCh); setConnections([]); setGridKey(p => p + 1); setToastMessage("Tab Cleared");
      }
  };

  const handleClearBar = () => {
      if (!activeCell) return;
      const bIdx = Math.floor(activeCell.col / currentStepsPerBar);
      const s = bIdx * currentStepsPerBar;
      const e = s + currentStepsPerBar;
      const nC = [...columns];
      for (let i = s; i < e; i++) { if (i < nC.length) nC[i] = Array(currentInstrument.stringCount).fill(-1); }
      const nConn = connections.filter(c => !(c.col >= s && c.col < e));
      updateStateWithHistory(nC, durations, chordNames, nConn);
      setToastMessage("Bar Cleared");
  };

  const handleCopyBar = () => {
      if (!activeCell) { setToastMessage("Select a cell to copy"); return; }
      const bIdx = Math.floor(activeCell.col / currentStepsPerBar);
      const s = bIdx * currentStepsPerBar;
      const e = s + currentStepsPerBar;
      const relConn = connections.filter(c => c.col >= s && c.col < e).map(c => ({ col: c.col - s, str: c.str }));
      setClipboard({ columns: JSON.parse(JSON.stringify(columns.slice(s, e))), durations: [...durations.slice(s, e)], chordNames: [...chordNames.slice(s, e)], connections: relConn });
      setToastMessage("Bar Copied");
  };

  const handlePasteBar = () => {
      if (!activeCell) { setToastMessage("Select dest"); return; }
      if (!clipboard) { setToastMessage("Clipboard empty"); return; }
      const s = Math.floor(activeCell.col / currentStepsPerBar) * currentStepsPerBar;
      const len = clipboard.columns.length;
      const nC = [...columns]; const nD = [...durations]; const nCh = [...chordNames];
      let nConn = connections.filter(c => !(c.col >= s && c.col < s + len));
      for (let i = 0; i < len; i++) {
          const t = s + i;
          if (t < nC.length) { nC[t] = clipboard.columns[i]; nD[t] = clipboard.durations[i]; nCh[t] = clipboard.chordNames[i]; }
      }
      clipboard.connections.forEach(c => { const t = s + c.col; if (t < nC.length) nConn.push({ col: t, str: c.str }); });
      updateStateWithHistory(nC, nD, nCh, nConn);
      setToastMessage("Bar Pasted");
  };

  const getProjectState = (): SavedProject => ({ version: '1.0', title: songTitle, bpm, instrumentType, timeSignature, columns, durations, tuning: customTuning, chordNames: chordNames.map(c => c || ''), connections });

  const handleSaveProject = () => {
    try {
        const blob = new Blob([JSON.stringify(getProjectState(), null, 2)], { type: "application/json" });
        const href = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = href; link.download = `${songTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'untitled'}.json`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(href);
        setToastMessage("Project Saved");
    } catch (err) { alert("Failed to save."); }
  };

  const handleImportClick = () => { fileInputRef.current?.click(); };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const project = JSON.parse(ev.target?.result as string);
            if (project && Array.isArray(project.columns) && window.confirm("Import project?")) {
                audioEngine.stop(); setIsPlaying(false); setCurrentColIndex(-1); setActiveCell(null); setEditRowStartBarIndex(0);
                setSongTitle(project.title || "Untitled"); setBpm(project.bpm || 120); setInstrumentType(project.instrumentType); setTimeSignature(project.timeSignature || '4/4');
                setColumns(project.columns); setDurations(project.durations); setConnections(project.connections || []);
                setChordNames(project.chordNames?.length === project.columns.length ? project.chordNames : Array(project.columns.length).fill(null));
                setCustomTuning(project.tuning || INSTRUMENTS[project.instrumentType].strings);
                setHistory([{ columns: project.columns, durations: project.durations, chordNames: project.chordNames || [], connections: project.connections || [] }]); setHistoryIndex(0); setGridKey(p => p + 1);
                setToastMessage("Project Imported");
            }
        } catch (err) { alert("Invalid file."); }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleTogglePlay = () => {
    if (isPlaying) { audioEngine.stop(); setIsPlaying(false); setCurrentColIndex(-1); }
    else {
      const start = selectedColIndex > -1 ? Math.floor(selectedColIndex / currentStepsPerBar) * currentStepsPerBar : editRowStartBarIndex * currentStepsPerBar;
      audioEngine.start(start); setIsPlaying(true);
    }
  };

  const handlePlayFromStart = () => { audioEngine.stop(); audioEngine.start(0); setIsPlaying(true); };

  // --------------------------------------------------------------------------
  // Global Keyboard Shortcuts (FIXED)
  // --------------------------------------------------------------------------
  
  // 1. Update Ref EVERY Render
  useEffect(() => {
      stateRef.current = { 
          activeCell, clipboard, historyIndex, history, isReviewMode, isPlaying, columns, durations, chordNames, connections, currentStepsPerBar,
          handleSaveProject, handleTogglePlay, undo, redo, handleToggleConnection, handleCopyBar, handlePasteBar
      };
  }); // Missing deps array = runs on every render = always fresh

  // 2. Listener attaches ONCE, reads Ref
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const current = stateRef.current; // Access Fresh Data
        const target = e.target as HTMLElement;
        // Only block shortcuts if typing in the specific project title input or large text areas
        const isTitleInput = target.id === 'project-title'; 
        const isOtherInput = !isTitleInput && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

        if (isOtherInput) return; 

        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); current.handleSaveProject(); return; }
        if (current.isReviewMode) return;
        if (e.code === 'Space' && !isTitleInput) { e.preventDefault(); current.handleTogglePlay(); return; }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? current.redo() : current.undo(); return; }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); current.redo(); return; }
        
        // COPY
        if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC') { 
            if (isTitleInput) return;
            e.preventDefault(); 
            current.handleCopyBar(); 
            return; 
        }

        // PASTE
        if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV') { 
            if (isTitleInput) return;
            e.preventDefault(); 
            current.handlePasteBar(); 
            return; 
        }
        
        if (e.code === 'KeyL' && !isTitleInput) { e.preventDefault(); current.handleToggleConnection(); return; }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); 

  if (isReviewMode) {
    return <ReviewView title={songTitle} bpm={bpm} timeSignature={timeSignature} instrument={currentInstrument} tuning={customTuning} columns={columns} durations={durations} chordNames={chordNames} connections={connections} onClose={() => setIsReviewMode(false)} onRemoveConnectionChain={handleRemoveConnectionChain} />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white font-sans selection:bg-cyan-500/30 selection:text-white overflow-hidden relative">
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      <ChordLibrary isOpen={isChordLibraryOpen} onClose={() => setIsChordLibraryOpen(false)} targetIndex={selectedColIndex} onSelectChord={(n) => { if(selectedColIndex!==-1){ handleUpdateChord(selectedColIndex, n); setToastMessage(`Inserted ${n}`); } }} />

      {/* HEADER */}
      <header className="flex-none h-20 bg-gray-900/90 backdrop-blur-xl border-b border-white/5 flex items-center px-8 justify-between z-40 gap-8 shrink-0 shadow-2xl">
        <div className="flex items-center gap-6">
             <Link to="/" className="flex flex-col justify-center hover:opacity-80 transition-opacity cursor-pointer group">
                 <div className="flex items-center gap-3">
                     <h1 className="text-xl font-bold text-white tracking-tight leading-none drop-shadow-sm font-['Courier'] group-hover:text-cyan-400 transition-colors">Tab by serum</h1>
                     <span className="px-1.5 py-0.5 rounded-[4px] bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-bold text-cyan-400 leading-none uppercase tracking-wider">Beta 1.1</span>
                 </div>
                 <div className="text-[10px] text-gray-500 font-['Courier'] font-bold leading-tight mt-0.5">development in progress <span className="text-gray-400">@silicondiox1de</span></div>
             </Link>
        </div>
        <div className="flex items-center gap-6 shrink-0">
             <div className="text-xs font-['Courier'] font-bold flex items-center bg-gray-800/50 px-4 py-2 rounded-full border border-white/5">
                {saveStatus === 'saving' && <span className="text-yellow-500/80 animate-pulse font-medium">Saving...</span>}
                {saveStatus === 'saved' && <span className="text-gray-400 flex items-center"><span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></span>Saved</span>}
                {saveStatus === 'modified' && <span className="text-gray-500 italic">Unsaved</span>}
             </div>
             {hasDraft && <button onClick={handleRestoreDraft} className="h-9 px-4 text-xs font-bold text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/50 rounded-lg border border-cyan-900/50 transition-all">Restore Session</button>}
             <div className="flex items-center bg-gray-800/50 p-1.5 rounded-xl border border-white/5 gap-1">
                <button onClick={() => setIsReviewMode(true)} className="h-8 px-4 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all flex items-center gap-2" title="View as Sheet">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> Review
                </button>
                <div className="w-[1px] h-5 bg-white/10 mx-1"></div>
                <button onClick={handleImportClick} className="h-8 px-4 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all flex items-center gap-2" title="Import project">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg> Import
                </button>
                <div className="w-[1px] h-5 bg-white/10 mx-1"></div>
                <button onClick={handleSaveProject} className="h-8 px-4 text-xs font-bold text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/30 rounded-lg transition-all flex items-center gap-2" title="Download">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Export
                </button>
             </div>
        </div>
      </header>

      {/* TITLE BAR */}
      <div className="flex-none h-14 bg-gray-900 border-b border-white/5 flex items-center justify-between px-6 relative z-30">
        <div className="flex items-center gap-2">
             <div className="bg-gray-800/40 border border-white/5 rounded-lg p-1 flex items-center gap-1">
                 <button onClick={undo} disabled={!(historyIndex > 0)} className={`h-8 w-8 flex items-center justify-center rounded-md transition-all active:scale-95 ${!(historyIndex > 0) ? 'text-gray-700 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg></button>
                 <button onClick={redo} disabled={!(historyIndex < history.length - 1)} className={`h-8 w-8 flex items-center justify-center rounded-md transition-all active:scale-95 ${!(historyIndex < history.length - 1) ? 'text-gray-700 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                 <div className="w-[1px] h-5 bg-white/10 mx-1"></div>
                 <button onClick={handleClearBar} disabled={!activeCell} className={`h-8 w-8 flex items-center justify-center rounded-md transition-all active:scale-95 ${!activeCell ? 'text-gray-700 cursor-not-allowed' : 'text-gray-400 hover:text-red-400 hover:bg-white/10'}`} title="Clear Bar"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                 <button onClick={handleClearTab} className="h-8 w-8 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-white/10 transition-all active:scale-95" title="Reset All"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></button>
             </div>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2">
            <div className="relative group flex items-center justify-center gap-2">
                <input id="project-title" type="text" value={songTitle} onChange={(e) => setSongTitle(e.target.value)} placeholder="Untitled Project" className="bg-transparent text-sm font-bold text-gray-200 placeholder-gray-600 text-center w-64 px-2 py-1 border-b-2 border-transparent group-hover:border-gray-600 focus:border-cyan-500 focus:outline-none focus:text-white transition-all duration-200" />
                <div className="absolute -right-6 top-1/2 -translate-y-1/2 text-gray-600 opacity-50 group-hover:opacity-100 group-hover:text-cyan-400 transition-all pointer-events-none"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></div>
            </div>
        </div>
        <div className="flex items-center gap-3">
            <div className="flex items-center bg-gray-800/40 border border-white/5 rounded-xl p-1 gap-2">
              <button onClick={handlePlayFromStart} className="h-10 w-10 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all active:scale-95" title="Play from Start"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg></button>
              <button onClick={handleTogglePlay} className={`h-10 w-14 rounded-lg flex items-center justify-center shadow-lg transition-all active:scale-95 border ${isPlaying ? 'bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30' : 'bg-green-500 text-white border-green-400 shadow-green-500/20 hover:scale-105'}`} title="Stop/Play">
                {isPlaying ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current" viewBox="0 0 20 20"><rect x="5" y="5" width="4" height="10" rx="1" /><rect x="11" y="5" width="4" height="10" rx="1" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 fill-current ml-0.5" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>}
              </button>
            </div>
        </div>
      </div>
      
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />

      {/* CONTROLS (Pass ALL Props) */}
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
            onPlayFromStart={handlePlayFromStart}
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
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />
      </section>

      <main className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`, maskImage: 'linear-gradient(to bottom, black, transparent)' }}></div>
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
        <div className="absolute bottom-3 right-4 text-[10px] text-gray-700 font-['Courier'] font-bold pointer-events-none select-none z-50">Tool belongs to Serum AI. All rights reserved.</div>
      </main>
      
      <div id="tool-portrait-warning" className="fixed inset-0 z-[9999] bg-[#0f111a] hidden flex-col items-center justify-center text-center p-8">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-6"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20z"></path><path d="m9 12 3 3 3-3"></path></svg>
          <h2 className="text-2xl font-bold mb-4">Please Rotate Device</h2>
          <p className="text-gray-400 max-w-xs mx-auto">The SerTab editor requires a wide screen. Please turn your phone sideways.</p>
          <div className="mt-8 w-10 h-16 border-2 border-gray-600 rounded-lg animate-[spin_3s_infinite]"></div>
      </div>
      <style>{`@media only screen and (orientation: portrait) and (max-width: 768px) { #tool-portrait-warning { display: flex !important; } header, section, main { display: none !important; } }`}</style>
    </div>
  );
};

export default App;
