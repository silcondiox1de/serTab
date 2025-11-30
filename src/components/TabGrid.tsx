import React, { useEffect, useRef } from 'react';
import { TabColumn, Note, InstrumentConfig, NoteDuration } from '../types';
import { TabCell } from './TabCell';

interface DurationMarkerProps {
  duration: NoteDuration;
  onClick: () => void;
  widthPercent: number;
  span: number;
  beam8: { left: boolean; right: boolean };
  beam16: { left: boolean; right: boolean };
}

const DurationMarker: React.FC<DurationMarkerProps> = ({ duration, onClick, widthPercent, span, beam8, beam16 }) => {
  const isBeamed = beam8.left || beam8.right;
  const beamClass = "bg-gray-400 group-hover:bg-cyan-400 transition-colors";
  const strokeClass = "stroke-gray-400 group-hover:stroke-cyan-400 transition-colors";
  const singleStepWidth = 100 / span;
  const centerPercent = singleStepWidth / 2;

  const renderSymbol = () => {
      const strokeWidth = 1.5;
      const height = 32;
      const cx = 10; 

      switch (duration) {
          case '1': return <circle cx={cx} cy={height/2} r="5" strokeWidth={strokeWidth} fill="none" className={strokeClass} />;
          case '2': return (<g className={strokeClass} strokeWidth={strokeWidth} fill="none"><line x1={cx} y1={5} x2={cx} y2={height - 8} /><circle cx={cx} cy={height - 5} r="4" /></g>);
          case '4': return <line x1={cx} y1={5} x2={cx} y2={height} strokeWidth={strokeWidth} className={strokeClass} />;
          case '8': return isBeamed ? <line x1={cx} y1={5} x2={cx} y2={32} strokeWidth={strokeWidth} className={strokeClass} /> : (<g className={strokeClass} strokeWidth={strokeWidth} fill="none"><line x1={cx} y1={5} x2={cx} y2={height} /><path d={`M ${cx} ${height} Q ${cx+10} ${height-5} ${cx+10} ${height-15}`} /></g>);
          case '16': return isBeamed ? <line x1={cx} y1={5} x2={cx} y2={32} strokeWidth={strokeWidth} className={strokeClass} /> : (<g className={strokeClass} strokeWidth={strokeWidth} fill="none"><line x1={cx} y1={5} x2={cx} y2={height} /><path d={`M ${cx} ${height} Q ${cx+10} ${height-5} ${cx+10} ${height-15}`} /><path d={`M ${cx} ${height-8} Q ${cx+10} ${height-13} ${cx+10} ${height-23}`} /></g>);
          default: return <line x1={cx} y1={5} x2={cx} y2={height} strokeWidth={strokeWidth} className={strokeClass} />;
      }
  };

  return (
      <div onClick={onClick} className="h-full relative cursor-pointer group hover:bg-white/5" style={{ width: `${widthPercent}%`, flex: `0 0 ${widthPercent}%` }} title={`Duration: 1/${duration}`}>
         {isBeamed && (
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute bottom-0 w-full h-[2px]">
                    {beam8.left && <div className={`absolute h-full ${beamClass}`} style={{ left: '-0.5px', width: `calc(${centerPercent}% + 1.5px)` }}></div>}
                    {beam8.right && <div className={`absolute h-full ${beamClass}`} style={{ left: `calc(${centerPercent}% - 1px)`, right: '-0.5px' }}></div>}
                </div>
                {duration === '16' && (
                    <div className="absolute bottom-[4px] w-full h-[2px]">
                         {beam16.left ? <div className={`absolute h-full ${beamClass}`} style={{ left: '-0.5px', width: `calc(${centerPercent}% + 1.5px)` }}></div> : (beam8.left && <div className={`absolute h-full ${beamClass}`} style={{ right: `calc(${100 - centerPercent}% - 1px)`, width: '8px' }}></div>)}
                         {beam16.right ? <div className={`absolute h-full ${beamClass}`} style={{ left: `calc(${centerPercent}% - 1px)`, right: '-0.5px' }}></div> : (beam8.right && <div className={`absolute h-full ${beamClass}`} style={{ left: `calc(${centerPercent}% - 1px)`, width: '8px' }}></div>)}
                    </div>
                )}
            </div>
         )}
         <div className="absolute top-0 bottom-0 flex items-center justify-center pointer-events-none" style={{ left: 0, width: `${singleStepWidth}%` }}>
             <svg width="20" height="32" viewBox="0 0 20 32" className="overflow-visible">{renderSymbol()}</svg>
         </div>
         <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-white/5 pointer-events-none"></div>
      </div>
  )
};

interface TabGridProps {
  columns: TabColumn[];
  durations: NoteDuration[];
  chordNames: (string | null)[];
  currentColumnIndex: number;
  instrument: InstrumentConfig;
  stepsPerBar: number;
  tuning: string[];
  isZoomed: boolean;
  editRowStartBarIndex: number;
  activeCell: { col: number; str: number } | null;
  connections: { col: number; str: number }[];
  onActiveCellChange: (cell: { col: number; str: number } | null) => void;
  onEditRowStartChange: (index: number) => void;
  onTuningChange: (stringIndex: number, newVal: string) => void;
  onUpdateColumn: (index: number, column: TabColumn) => void;
  onUpdateDuration: (index: number, duration: NoteDuration) => void;
  onUpdateChord: (index: number, val: string) => void;
  onRemoveConnectionChain?: (startCol: number, endCol: number, str: number) => void;
}

export const TabGrid: React.FC<TabGridProps> = ({ 
  columns, durations, chordNames, currentColumnIndex, instrument, stepsPerBar, tuning, isZoomed, editRowStartBarIndex, activeCell, connections,
  onActiveCellChange, onEditRowStartChange, onTuningChange, onUpdateColumn, onUpdateDuration, onUpdateChord, onRemoveConnectionChain
}) => {
  
  const PREVIEW_BARS_PER_ROW = 8;
  const EDIT_BARS_PER_ROW = 4;
  const DIM = { CHORD_ROW_MARGIN: 'h-6', CHORD_ROW_HEIGHT: 'h-8', STRING_HEIGHT: 'h-8', DUR_ROW_HEIGHT: 'h-8' };
  const STRING_H_PX = 32; 
  
  const totalBars = Math.ceil(columns.length / stepsPerBar);
  const displayBars: TabColumn[][] = [];
  for (let i = 0; i < totalBars; i++) {
    const start = i * stepsPerBar;
    displayBars.push(columns.slice(start, start + stepsPerBar));
  }

  const wheelTimeoutRef = useRef<number | null>(null);
  const editAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentColumnIndex >= 0) {
      const playingBarIndex = Math.floor(currentColumnIndex / stepsPerBar);
      if (playingBarIndex < editRowStartBarIndex || playingBarIndex >= editRowStartBarIndex + EDIT_BARS_PER_ROW) {
         const newStart = Math.floor(playingBarIndex / EDIT_BARS_PER_ROW) * EDIT_BARS_PER_ROW;
         onEditRowStartChange(newStart);
      }
    }
  }, [currentColumnIndex, stepsPerBar, editRowStartBarIndex, onEditRowStartChange]);

  // Auto-scroll for playhead
  useEffect(() => {
    const el = editAreaRef.current;
    if (!el || currentColumnIndex < 0) return;
    // Logic to ensure playhead is visible would go here, but the page-flip logic above handles the main jumps.
  }, [currentColumnIndex]);

  useEffect(() => {
    const el = editAreaRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        if (wheelTimeoutRef.current) return;
        const delta = e.deltaY;
        if (Math.abs(delta) < 10) return;
        const direction = delta > 0 ? 1 : -1;
        const newStart = editRowStartBarIndex + (direction * EDIT_BARS_PER_ROW);
        if (newStart >= 0 && newStart < totalBars) {
            onEditRowStartChange(newStart);
            wheelTimeoutRef.current = window.setTimeout(() => { wheelTimeoutRef.current = null; }, 250);
        }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => { el.removeEventListener('wheel', handleWheel); };
  }, [editRowStartBarIndex, totalBars, onEditRowStartChange]);

  const handleUpdateNote = (globalColIdx: number, strIdx: number, newNote: Note) => {
    const newColumn = [...columns[globalColIdx]];
    newColumn[strIdx] = newNote;
    onUpdateColumn(globalColIdx, newColumn);
  };

  const getDurationSteps = (d: NoteDuration): number => {
    switch(d) { case '1': return 16; case '2': return 8; case '4': return 4; case '8': return 2; case '16': return 1; default: return 2; }
  };

  const getNoteStart = (globalIndex: number) => {
    if (globalIndex < 0) return 0;
    const barIndex = Math.floor(globalIndex / stepsPerBar);
    const barStart = barIndex * stepsPerBar;
    if (globalIndex >= durations.length) return globalIndex;
    let current = barStart;
    while(current < barStart + stepsPerBar) {
        const d = durations[current] || '8';
        const span = getDurationSteps(d);
        if (current + span > globalIndex) return current;
        current += span;
    }
    return globalIndex;
  };

  const handleDurationClick = (globalColIdx: number) => {
      const current = durations[globalColIdx] || '8';
      let next: NoteDuration = '8';
      switch (current) {
          case '16': next = '8'; break;
          case '8': next = '4'; break;
          case '4': next = '2'; break;
          case '2': next = '1'; break;
          case '1': next = '16'; break;
          default: next = '8';
      }
      onUpdateDuration(globalColIdx, next);
  };

  const handleNavigate = (globalColIdx: number, strIdx: number, direction: 'up' | 'down' | 'left' | 'right') => {
    let newCol = globalColIdx;
    let newStr = strIdx;
    switch (direction) {
      case 'up': newStr = Math.max(0, strIdx - 1); onActiveCellChange({ col: newCol, str: newStr }); break;
      case 'down': newStr = Math.min(instrument.stringCount - 1, strIdx + 1); onActiveCellChange({ col: newCol, str: newStr }); break;
      case 'left': newCol = Math.max(0, getNoteStart(globalColIdx - 1)); onActiveCellChange({ col: newCol, str: newStr }); break;
      case 'right': 
        const currentDuration = durations[globalColIdx] || '8';
        const span = getDurationSteps(currentDuration);
        newCol = Math.min(columns.length - 1, globalColIdx + span);
        onActiveCellChange({ col: newCol, str: newStr });
        break;
    }
    const newBarIndex = Math.floor(newCol / stepsPerBar);
    if (newBarIndex < editRowStartBarIndex) {
        onEditRowStartChange(Math.max(0, editRowStartBarIndex - EDIT_BARS_PER_ROW));
    } else if (newBarIndex >= editRowStartBarIndex + EDIT_BARS_PER_ROW) {
        onEditRowStartChange(editRowStartBarIndex + EDIT_BARS_PER_ROW);
    }
  };

  const handlePreviewClick = (barIndex: number) => {
    const newStart = Math.floor(barIndex / EDIT_BARS_PER_ROW) * EDIT_BARS_PER_ROW;
    onEditRowStartChange(newStart);
  };

  const chains: { col: number; endCol: number; str: number }[] = [];
  {
      const used = new Set<string>();
      const sorted = [...connections].sort((a,b) => a.col - b.col);
      const connMap = new Set(connections.map(c => `${c.col},${c.str}`));
      sorted.forEach(conn => {
          const key = `${conn.col},${conn.str}`;
          if (used.has(key)) return;
          let start = conn.col;
          let str = conn.str;
          let nextNoteIdx = -1;
          for(let i = start + 1; i < columns.length; i++) {
              if (columns[i][str] !== -1) { nextNoteIdx = i; break; }
          }
          if (nextNoteIdx === -1) return;
          used.add(key);
          let currentEnd = nextNoteIdx;
          while(true) {
              const nextKey = `${currentEnd},${str}`;
              if (connMap.has(nextKey)) {
                  used.add(nextKey);
                  let farNoteIdx = -1;
                  for(let i = currentEnd + 1; i < columns.length; i++) {
                      if (columns[i][str] !== -1) { farNoteIdx = i; break; }
                  }
                  if (farNoteIdx !== -1) { currentEnd = farNoteIdx; } else { break; }
              } else { break; }
          }
          chains.push({ col: start, endCol: currentEnd, str });
      });
  }

  const renderPreviewSection = (startBar: number, endBar: number) => {
    const barsToRender = displayBars.slice(startBar, endBar);
    if (barsToRender.length === 0) return null;
    const lines: TabColumn[][][] = [];
    for (let i = 0; i < barsToRender.length; i += PREVIEW_BARS_PER_ROW) {
        lines.push(barsToRender.slice(i, i + PREVIEW_BARS_PER_ROW));
    }
    return (
        <div className="flex flex-col gap-3 opacity-80 hover:opacity-100 transition-opacity duration-300 mb-8 select-none">
            {lines.map((lineBars, lineIdx) => {
                const lineStartBarIdx = startBar + (lineIdx * PREVIEW_BARS_PER_ROW);
                return (
                    <div key={`prev-line-${lineStartBarIdx}`} className="relative pl-14">
                        <div className="absolute left-0 top-0 bottom-0 w-14 flex flex-col justify-between text-[9px] font-bold text-gray-600 py-1.5 items-center select-none border-r border-transparent">
                             {tuning.map((t, i) => <div key={i} className="flex-1 flex items-center justify-center">{t}</div>)}
                        </div>
                        <div className="flex w-full h-20 rounded-lg overflow-hidden border border-gray-800 bg-gray-900/50 shadow-sm">
                             {lineBars.map((bar, barOffset) => {
                                 const actualBarIdx = lineStartBarIdx + barOffset;
                                 const isActiveWindow = actualBarIdx >= editRowStartBarIndex && actualBarIdx < editRowStartBarIndex + EDIT_BARS_PER_ROW;
                                 return (
                                     <div key={actualBarIdx} onClick={() => handlePreviewClick(lineStartBarIdx)} className={`relative border-r border-gray-800 last:border-0 flex-1 h-full cursor-pointer transition-colors ${isActiveWindow ? 'bg-gray-800 shadow-[inset_0_0_20px_rgba(34,211,238,0.05)]' : 'hover:bg-gray-800/50'}`}>
                                         <div className={`absolute top-0.5 left-1 text-[9px] font-mono pointer-events-none font-bold ${isActiveWindow ? 'text-cyan-500' : 'text-gray-700'}`}>{actualBarIdx + 1}</div>
                                         {isActiveWindow && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500/50"></div>}
                                         <div className="flex flex-col w-full h-full py-1">
                                             {Array.from({length: instrument.stringCount}).map((_, sIdx) => (
                                                 <div key={sIdx} className="flex-1 flex w-full items-center relative">
                                                     <div className="absolute inset-x-0 h-[1px] bg-gray-800 top-1/2 -translate-y-1/2 z-0"></div>
                                                     {bar.map((col, cIdx) => (
                                                         <div key={cIdx} className="flex-1 flex items-center justify-center z-10">
                                                             {col[sIdx] !== -1 && <div className={`w-1 h-1 rounded-full ${isActiveWindow ? 'bg-cyan-400' : 'bg-gray-500'}`}></div>}
                                                         </div>
                                                     ))}
                                                 </div>
                                             ))}
                                         </div>
                                     </div>
                                 )
                             })}
                             {Array.from({length: PREVIEW_BARS_PER_ROW - lineBars.length}).map((_, i) => (
                                 <div key={`empty-${i}`} className="flex-1 bg-gray-950/30 border-r border-gray-900 last:border-0"></div>
                             ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
  };

  const renderEditArea = () => {
    const barsToRender = displayBars.slice(editRowStartBarIndex, editRowStartBarIndex + EDIT_BARS_PER_ROW);
    const rowStartColIndex = editRowStartBarIndex * stepsPerBar;

    return (
        <div ref={editAreaRef} className="relative pl-14 mb-8">
            <div className="absolute -top-3 left-0 w-14 flex justify-center z-30">
                 <div className="px-2 py-0.5 bg-cyan-600 text-white text-[9px] uppercase tracking-wider font-bold rounded shadow-lg font-['Courier']">Editor</div>
            </div>
            <div className="absolute left-0 top-0 bottom-0 w-14 z-20 flex flex-col">
                <div className={`${DIM.CHORD_ROW_MARGIN} w-full shrink-0`}></div>
                <div className="flex-1 bg-gray-800 rounded-l-lg border border-gray-700 border-r-0 shadow-lg flex flex-col py-1 overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
                    <div className={`${DIM.CHORD_ROW_HEIGHT} w-full shrink-0 flex items-center justify-center border-b border-gray-700/50`}>
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Chd</span>
                    </div>
                    <div className="flex-1 flex flex-col justify-center relative">
                        {tuning.map((label, i) => (
                            <div key={i} className={`${DIM.STRING_HEIGHT} flex items-center justify-center shrink-0 px-1 relative group`}>
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-gray-600 rounded-full -ml-1 shadow-inner"></div>
                                <input type="text" value={label} onChange={(e) => onTuningChange(i, e.target.value)} className="w-full bg-transparent text-center font-bold font-mono focus:outline-none border-transparent text-sm text-gray-300 focus:text-cyan-400 hover:text-white transition-colors cursor-text z-10" maxLength={2} />
                            </div>
                        ))}
                    </div>
                    <div className={`${DIM.DUR_ROW_HEIGHT} w-full shrink-0 flex items-center justify-center border-t border-gray-700/50`}>
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Dur</span>
                    </div>
                </div>
            </div>

            {/* --- OVERFLOW VISIBLE for Playhead --- */}
            <div className={`flex overflow-x-auto pb-2 pt-4 -mt-4 tab-scroll bg-[#111827] rounded-r-lg border border-gray-700 shadow-2xl overflow-visible ${isZoomed ? '' : 'w-full'}`}>
                 <div className={`flex min-w-full ${isZoomed ? '' : 'w-full'}`}>
                    {barsToRender.map((_, barOffset) => {
                        const actualBarIdx = editRowStartBarIndex + barOffset;
                        const barStartColIdx = rowStartColIndex + (barOffset * stepsPerBar);
                        const isBarActive = actualBarIdx === Math.floor((activeCell?.col ?? -1) / stepsPerBar);

                        const markers: any[] = [];
                        let totalStepsUsed = 0;
                        let i = 0;
                        while(i < stepsPerBar) {
                           const globalIdx = barStartColIdx + i;
                           const d = durations[globalIdx] || '8';
                           const span = getDurationSteps(d);
                           markers.push({ globalIdx: globalIdx, colIdx: i, duration: d, span: span });
                           totalStepsUsed += span;
                           i += span;
                        }
                        const isValidDuration = totalStepsUsed === stepsPerBar;

                        const markersWithBeams = markers.map((m, idx) => {
                             const is8or16 = m.duration === '8' || m.duration === '16';
                             const is16 = m.duration === '16';
                             const currentBeat = Math.floor(m.colIdx / 4);
                             let beam8Right = false, beam16Right = false;
                             const next = markers[idx + 1];
                             if (next) {
                                 const nextBeat = Math.floor(next.colIdx / 4);
                                 const nextIs8or16 = next.duration === '8' || next.duration === '16';
                                 const nextIs16 = next.duration === '16';
                                 if (currentBeat === nextBeat) {
                                     if (is8or16 && nextIs8or16) beam8Right = true;
                                     if (is16 && nextIs16) beam16Right = true;
                                 }
                             }
                             let beam8Left = false, beam16Left = false;
                             const prev = markers[idx - 1];
                             if (prev) {
                                 const prevBeat = Math.floor(prev.colIdx / 4);
                                 const prevIs8or16 = prev.duration === '8' || prev.duration === '16';
                                 const prevIs16 = prev.duration === '16';
                                 if (currentBeat === prevBeat) {
                                     if (is8or16 && prevIs8or16) beam8Left = true;
                                     if (is16 && prevIs16) beam16Left = true;
                                 }
                             }
                             return { ...m, beam8: { left: beam8Left, right: beam8Right }, beam16: { left: beam16Left, right: beam16Right } };
                        });

                        // --- BAR LEVEL PLAYHEAD LOGIC ---
                        // Check if the playhead is currently inside this specific bar
                        const isPlayheadInBar = currentColumnIndex >= barStartColIdx && currentColumnIndex < barStartColIdx + stepsPerBar;
                        let playheadLeftPercent = 0;
                        
                        if (isPlayheadInBar) {
                            // Calculate exact percentage position within this bar
                            const relativeIndex = currentColumnIndex - barStartColIdx;
                            
                            // We need to sum the width of all markers up to the current one to get exact position
                            // because markers have variable widths
                            let stepsCounted = 0;
                            for(let m of markers) {
                                if (m.globalIdx === currentColumnIndex) {
                                    // Found the current marker
                                    playheadLeftPercent = (stepsCounted / stepsPerBar) * 100;
                                    break;
                                }
                                stepsCounted += m.span;
                            }
                        }

                        return (
                            <div key={actualBarIdx} className={`flex flex-col relative border-r border-gray-800 last:border-0 transition-colors duration-200 ${isZoomed ? 'flex-shrink-0' : 'flex-1'} ${isBarActive ? 'bg-gray-800/30' : ''}`} style={{ minWidth: isZoomed ? '400px' : '0' }}>
                                
                                {/* --- GLOBAL PLAYHEAD OVERLAY (Bar Level) --- */}
                                {isPlayheadInBar && (
                                    <div 
                                        className="absolute top-0 bottom-0 w-[2px] bg-green-400 z-50 pointer-events-none shadow-[0_0_15px_rgba(74,222,128,0.9)] transition-all duration-75 ease-linear"
                                        style={{ left: `${playheadLeftPercent}%` }}
                                    >
                                        {/* The glowing head */}
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-3 h-3 bg-green-400 rounded-full shadow-lg"></div>
                                    </div>
                                )}
                                {/* -------------------------------------------- */}

                                <div className="absolute top-1 left-2 text-[10px] text-gray-500 font-mono select-none z-10 font-bold bg-[#111827] px-1 rounded">{actualBarIdx + 1}</div>
                                <div className={`${DIM.CHORD_ROW_MARGIN} w-full shrink-0 border-b border-gray-800`}></div>

                                <div className={`flex w-full ${DIM.CHORD_ROW_HEIGHT} relative border-b border-gray-800 bg-gray-900/50`}>
                                   {markersWithBeams.map((marker) => {
                                      const widthPercent = (marker.span / stepsPerBar) * 100;
                                      const chord = chordNames[marker.globalIdx];
                                      return (
                                          <div key={`chord-${marker.globalIdx}`} className="flex items-center justify-center border-r border-gray-800/50 last:border-0 relative group" style={{ width: `${widthPercent}%`, flex: `0 0 ${widthPercent}%` }}>
                                              <input type="text" value={chord || ''} onChange={(e) => onUpdateChord(marker.globalIdx, e.target.value)} onFocus={() => onActiveCellChange({ col: marker.globalIdx, str: 0 })} className="w-full h-full bg-transparent text-center font-bold text-cyan-400 placeholder-gray-700 focus:outline-none text-[10px] focus:bg-gray-800 transition-colors" placeholder="+" />
                                          </div>
                                      );
                                   })}
                                </div>

                                <div className="flex flex-col w-full relative"> 
                                    {Array.from({ length: instrument.stringCount }).map((_, strIdx) => {
                                        const thickness = 1 + (strIdx / (instrument.stringCount - 1)) * 2;
                                        return (
                                        <div key={strIdx} className={`flex ${DIM.STRING_HEIGHT} relative last:border-0`}>
                                            <div className="absolute inset-x-0 bg-gray-600 z-0 pointer-events-none" style={{ height: `${thickness}px`, top: '50%', marginTop: `-${thickness/2}px`, opacity: 0.3 + (strIdx * 0.1) }}></div>
                                            {markersWithBeams.map((marker) => {
                                                const globalColIdx = marker.globalIdx;
                                                const widthPercent = (marker.span / stepsPerBar) * 100;
                                                
                                                return (
                                                    <div key={globalColIdx} className="flex-1 relative border-r border-gray-800 last:border-0" style={{ width: `${widthPercent}%`, flex: `0 0 ${widthPercent}%` }}>
                                                         <TabCell
                                                            note={columns[globalColIdx] ? columns[globalColIdx][strIdx] : -1}
                                                            stringIndex={strIdx}
                                                            columnIndex={globalColIdx}
                                                            isActive={activeCell?.col === globalColIdx && activeCell?.str === strIdx}
                                                            onFocus={() => onActiveCellChange({ col: globalColIdx, str: strIdx })}
                                                            onUpdate={(val) => handleUpdateNote(globalColIdx, strIdx, val)}
                                                            onNavigate={(dir) => handleNavigate(globalColIdx, strIdx, dir)}
                                                         />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        );
                                    })}
                                </div>

                                <div className={`flex w-full ${DIM.DUR_ROW_HEIGHT} border-t border-gray-800 bg-gray-900/50 relative`}>
                                     {markersWithBeams.map((marker) => {
                                         const widthPercent = (marker.span / stepsPerBar) * 100;
                                         return <DurationMarker key={marker.globalIdx} duration={marker.duration} widthPercent={widthPercent} span={marker.span} onClick={() => handleDurationClick(marker.globalIdx)} beam8={marker.beam8} beam16={marker.beam16} />;
                                     })}
                                     {!isValidDuration && <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse" title="Bar duration mismatch"></div>}
                                </div>
                            </div>
                        );
                    })}
                 </div>
            </div>
        </div>
    );
  };

  return (
    <div className="relative w-full h-full p-8 pb-32 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
        {renderPreviewSection(0, editRowStartBarIndex)}
        {renderEditArea()}
        {renderPreviewSection(editRowStartBarIndex + EDIT_BARS_PER_ROW, totalBars)}
    </div>
  );
};
