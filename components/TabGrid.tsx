import React, { useEffect, useRef } from 'react';
import { TabColumn, Note, InstrumentConfig, NoteDuration } from '../types';
import { TabCell } from './TabCell';

interface DurationMarkerProps {
  duration: NoteDuration;
  onClick: () => void;
  widthPercent: number;
  span: number; // Number of steps this note occupies
  beam8: { left: boolean; right: boolean };
  beam16: { left: boolean; right: boolean };
}

const DurationMarker: React.FC<DurationMarkerProps> = ({ duration, onClick, widthPercent, span, beam8, beam16 }) => {
  const isBeamed = beam8.left || beam8.right;
  const beamClass = "bg-gray-500 group-hover:bg-cyan-400 transition-colors";
  const strokeClass = "stroke-gray-500 group-hover:stroke-cyan-400 transition-colors";

  // Calculate the center position of the note head relative to the container
  const singleStepWidth = 100 / span;
  const centerPercent = singleStepWidth / 2;

  // Render SVG Symbol (Head, Stem, Flags)
  const renderSymbol = () => {
      const strokeWidth = 1.5;
      const height = 32;
      const cx = 10; // Center of 20px wide SVG

      switch (duration) {
          case '1': // Whole Note
              return <circle cx={cx} cy={height/2} r="5" strokeWidth={strokeWidth} fill="none" className={strokeClass} />;
          case '2': // Half Note
               return (
                  <g className={strokeClass} strokeWidth={strokeWidth} fill="none">
                    <line x1={cx} y1={5} x2={cx} y2={height - 8} />
                    <circle cx={cx} cy={height - 5} r="4" />
                  </g>
               );
          case '4': // Quarter Note
              return <line x1={cx} y1={5} x2={cx} y2={height} strokeWidth={strokeWidth} className={strokeClass} />;
          case '8': // 8th Note
              if (isBeamed) {
                  return <line x1={cx} y1={5} x2={cx} y2={32} strokeWidth={strokeWidth} className={strokeClass} />;
              }
              return (
                  <g className={strokeClass} strokeWidth={strokeWidth} fill="none">
                    <line x1={cx} y1={5} x2={cx} y2={height} />
                    <path d={`M ${cx} ${height} Q ${cx+10} ${height-5} ${cx+10} ${height-15}`} />
                  </g>
              );
          case '16': // 16th Note
              if (isBeamed) {
                  return <line x1={cx} y1={5} x2={cx} y2={32} strokeWidth={strokeWidth} className={strokeClass} />;
              }
              return (
                   <g className={strokeClass} strokeWidth={strokeWidth} fill="none">
                    <line x1={cx} y1={5} x2={cx} y2={height} />
                    <path d={`M ${cx} ${height} Q ${cx+10} ${height-5} ${cx+10} ${height-15}`} />
                    <path d={`M ${cx} ${height-8} Q ${cx+10} ${height-13} ${cx+10} ${height-23}`} />
                  </g>
              );
          default: 
              return <line x1={cx} y1={5} x2={cx} y2={height} strokeWidth={strokeWidth} className={strokeClass} />;
      }
  };

  return (
      <div 
        onClick={onClick}
        className="h-full relative cursor-pointer group hover:bg-white/5"
        style={{ width: `${widthPercent}%`, flex: `0 0 ${widthPercent}%` }}
        title={`Duration: 1/${duration}`}
      >
         {/* Beams Layer */}
         {isBeamed && (
            <div className="absolute inset-0 pointer-events-none">
                {/* 8th Beam (Bottom) */}
                <div className="absolute bottom-0 w-full h-[2px]">
                    {/* From Left Edge to Center */}
                    {beam8.left && (
                        <div className={`absolute h-full ${beamClass}`} style={{ left: '-0.5px', width: `calc(${centerPercent}% + 1.5px)` }}></div>
                    )}
                    {/* From Center to Right Edge */}
                    {beam8.right && (
                        <div className={`absolute h-full ${beamClass}`} style={{ left: `calc(${centerPercent}% - 1px)`, right: '-0.5px' }}></div>
                    )}
                </div>
                
                {/* 16th Beam (Above 8th) */}
                {duration === '16' && (
                    <div className="absolute bottom-[4px] w-full h-[2px]">
                         {beam16.left ? (
                             <div className={`absolute h-full ${beamClass}`} style={{ left: '-0.5px', width: `calc(${centerPercent}% + 1.5px)` }}></div>
                         ) : (
                             // Stub Left (only if connected to left 8th)
                             beam8.left && <div className={`absolute h-full ${beamClass}`} style={{ right: `calc(${100 - centerPercent}% - 1px)`, width: '8px' }}></div>
                         )}

                         {beam16.right ? (
                             <div className={`absolute h-full ${beamClass}`} style={{ left: `calc(${centerPercent}% - 1px)`, right: '-0.5px' }}></div>
                         ) : (
                             // Stub Right (only if connected to right 8th)
                             beam8.right && <div className={`absolute h-full ${beamClass}`} style={{ left: `calc(${centerPercent}% - 1px)`, width: '8px' }}></div>
                         )}
                    </div>
                )}
            </div>
         )}

         {/* Symbol Container - Centered in the first step */}
         <div 
            className="absolute top-0 bottom-0 flex items-center justify-center pointer-events-none"
            style={{ left: 0, width: `${singleStepWidth}%` }}
         >
             <svg width="20" height="32" viewBox="0 0 20 32" className="overflow-visible">
                 {renderSymbol()}
             </svg>
         </div>
         
         {/* Right Border separator */}
         <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-gray-700/20 pointer-events-none"></div>
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
  editRowStartBarIndex: number; // Controlled by App
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
  columns, 
  durations,
  chordNames,
  currentColumnIndex, 
  instrument, 
  stepsPerBar,
  tuning, 
  isZoomed,
  editRowStartBarIndex,
  activeCell,
  connections,
  onActiveCellChange,
  onEditRowStartChange,
  onTuningChange,
  onUpdateColumn,
  onUpdateDuration,
  onUpdateChord,
  onRemoveConnectionChain
}) => {
  
  const PREVIEW_BARS_PER_ROW = 8;
  const EDIT_BARS_PER_ROW = 4;
  
  const DIM = {
      CHORD_ROW_MARGIN: 'h-6',
      CHORD_ROW_HEIGHT: 'h-8',
      STRING_HEIGHT: 'h-6', // 24px
      DUR_ROW_HEIGHT: 'h-8',
  };

  const STRING_H_PX = 24;
  
  const totalBars = Math.ceil(columns.length / stepsPerBar);
  const displayBars: TabColumn[][] = [];
  for (let i = 0; i < totalBars; i++) {
    const start = i * stepsPerBar;
    displayBars.push(columns.slice(start, start + stepsPerBar));
  }

  const activeBarIndex = activeCell ? Math.floor(activeCell.col / stepsPerBar) : -1;
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

  // Handle Wheel Event Natively to prevent Default Scrolling
  useEffect(() => {
    const el = editAreaRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
        // Stop the page from scrolling
        e.preventDefault();

        // Throttle rapid scroll events
        if (wheelTimeoutRef.current) return;
        
        const delta = e.deltaY;
        // Threshold to avoid accidental sensitivity
        if (Math.abs(delta) < 10) return;

        const direction = delta > 0 ? 1 : -1;
        const newStart = editRowStartBarIndex + (direction * EDIT_BARS_PER_ROW);

        if (newStart >= 0 && newStart < totalBars) {
            onEditRowStartChange(newStart);
            // Add cooldown to prevent flipping through pages too fast
            wheelTimeoutRef.current = window.setTimeout(() => {
                wheelTimeoutRef.current = null;
            }, 250);
        }
    };

    // { passive: false } is required to allowing preventDefault on wheel events
    el.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
        el.removeEventListener('wheel', handleWheel);
    };
  }, [editRowStartBarIndex, totalBars, onEditRowStartChange]);

  const handleUpdateNote = (globalColIdx: number, strIdx: number, newNote: Note) => {
    const newColumn = [...columns[globalColIdx]];
    newColumn[strIdx] = newNote;
    onUpdateColumn(globalColIdx, newColumn);
  };

  const getDurationSteps = (d: NoteDuration): number => {
    switch(d) {
      case '1': return 16;
      case '2': return 8;
      case '4': return 4;
      case '8': return 2;
      case '16': return 1;
      default: return 2;
    }
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
        if (current + span > globalIndex) {
            return current;
        }
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
      case 'up':
        newStr = Math.max(0, strIdx - 1);
        onActiveCellChange({ col: newCol, str: newStr });
        break;
      case 'down':
        newStr = Math.min(instrument.stringCount - 1, strIdx + 1);
        onActiveCellChange({ col: newCol, str: newStr });
        break;
      case 'left':
        newCol = Math.max(0, getNoteStart(globalColIdx - 1));
        onActiveCellChange({ col: newCol, str: newStr });
        break;
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

  // Pre-process chains outside loop to avoid re-calc per bar (though bars are loop, doing it once for all bars displayed in edit area)
  // Actually we need to do it once per render
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
              if (columns[i][str] !== -1) {
                  nextNoteIdx = i;
                  break;
              }
          }
          if (nextNoteIdx === -1) return;

          used.add(key);
          let currentEnd = nextNoteIdx;

          // Try to chain
          while(true) {
              const nextKey = `${currentEnd},${str}`;
              if (connMap.has(nextKey)) {
                  used.add(nextKey);
                  let farNoteIdx = -1;
                  for(let i = currentEnd + 1; i < columns.length; i++) {
                      if (columns[i][str] !== -1) {
                          farNoteIdx = i;
                          break;
                      }
                  }
                  if (farNoteIdx !== -1) {
                      currentEnd = farNoteIdx;
                  } else {
                      break;
                  }
              } else {
                  break;
              }
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
        <div className="flex flex-col gap-6 opacity-60 hover:opacity-100 transition-opacity duration-300 mb-10 select-none">
            {lines.map((lineBars, lineIdx) => {
                const lineStartBarIdx = startBar + (lineIdx * PREVIEW_BARS_PER_ROW);
                return (
                    <div key={`prev-line-${lineStartBarIdx}`} className="relative pl-8">
                        <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col text-[10px] font-bold text-gray-500 py-1 items-center h-24">
                             {tuning.map((t, i) => <div key={i} className="flex-1 flex items-center justify-center w-full">{t}</div>)}
                        </div>
                        <div className="grid grid-cols-8 w-full bg-gray-900 border border-gray-700 rounded-r overflow-hidden cursor-pointer shadow-sm h-24" 
                             onClick={() => handlePreviewClick(lineStartBarIdx)}>
                             {lineBars.map((bar, barOffset) => {
                                 const actualBarIdx = lineStartBarIdx + barOffset;
                                 return (
                                     <div key={actualBarIdx} className="relative border-r border-gray-800 last:border-0 h-full">
                                        <div className="absolute top-0.5 left-1 text-[9px] text-gray-600 font-mono pointer-events-none font-bold">{actualBarIdx + 1}</div>
                                        <div className="flex flex-col w-full h-full py-1">
                                            {Array.from({length: instrument.stringCount}).map((_, sIdx) => (
                                                <div key={sIdx} className="flex-1 flex w-full items-center relative">
                                                    <div className="absolute inset-x-0 h-[1px] bg-gray-800 top-1/2 -translate-y-1/2 z-0"></div>
                                                    {bar.map((col, cIdx) => (
                                                        <div key={cIdx} className="flex-1 flex items-center justify-center z-10">
                                                            {col[sIdx] !== -1 && (
                                                                <span className="text-[10px] text-gray-300 bg-gray-900 px-0.5 font-mono leading-none">
                                                                    {col[sIdx]}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                     </div>
                                 )
                             })}
                             {Array.from({length: PREVIEW_BARS_PER_ROW - lineBars.length}).map((_, i) => (
                                 <div key={`empty-${i}`} className="bg-gray-900/50 border-r border-gray-800/30 last:border-0"></div>
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
        <div 
            ref={editAreaRef}
            className="relative pl-14 mb-8 bg-[#161e2e] p-4 rounded-xl border border-gray-700/50 shadow-2xl transition-all duration-300 ring-1 ring-white/5"
        >
            <div className="absolute -top-3 left-6 px-3 py-1 bg-gradient-to-r from-cyan-900 to-blue-900 text-cyan-100 text-[10px] uppercase tracking-widest font-bold rounded-full shadow-lg border border-cyan-800/50 z-30">
                Editing Section
            </div>

            {/* Left Sidebar Control Panel Style */}
            <div className="absolute left-0 top-4 bottom-4 w-14 z-20 flex flex-col bg-gray-800 border-r border-gray-700/50 rounded-l-xl shadow-md">
              <div className={`${DIM.CHORD_ROW_MARGIN} w-full shrink-0 border-b border-gray-700/30`}></div>
              <div className={`${DIM.CHORD_ROW_HEIGHT} w-full shrink-0 flex items-center justify-center bg-gray-800/50`}>
                  <span className="text-[8px] text-gray-500 font-bold">CHD</span>
              </div>
              <div className="flex-1 flex flex-col justify-center py-1 bg-gray-900/30">
                  {tuning.map((label, i) => (
                    <div key={i} className={`${DIM.STRING_HEIGHT} flex items-center justify-center shrink-0 px-1`}>
                      <input 
                          type="text"
                          value={label}
                          onChange={(e) => onTuningChange(i, e.target.value)}
                          className="w-full bg-transparent text-center font-mono font-bold focus:outline-none border-transparent text-xs text-gray-400 focus:text-cyan-400 hover:text-gray-200 transition-colors cursor-text"
                          maxLength={3}
                      />
                    </div>
                  ))}
              </div>
              <div className={`${DIM.DUR_ROW_HEIGHT} w-full shrink-0 flex items-center justify-center bg-gray-800/50 border-t border-gray-700/30`}>
                 <span className="text-[8px] text-gray-500 font-bold">DUR</span>
              </div>
            </div>

            <div className={`flex overflow-x-auto pb-2 tab-scroll border border-gray-700/50 bg-gray-900 rounded-r-lg ${isZoomed ? '' : 'w-full'}`}>
                 <div className={`flex min-w-full ${isZoomed ? '' : 'w-full'}`}>
                    {barsToRender.map((_, barOffset) => {
                        const actualBarIdx = editRowStartBarIndex + barOffset;
                        const barStartColIdx = rowStartColIndex + (barOffset * stepsPerBar);
                        const isBarActive = actualBarIdx === activeBarIndex;

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

                             let beam8Right = false;
                             let beam16Right = false;
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

                             let beam8Left = false;
                             let beam16Left = false;
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

                        // Calculate Connections SVG (Using Chains)
                        const connectionPaths: React.ReactElement[] = [];
                        // Filter chains that start in this bar
                        const barChains = chains.filter(c => c.col >= barStartColIdx && c.col < barStartColIdx + stepsPerBar);
                        
                        barChains.forEach((chain, idx) => {
                             const startMarker = markers.find(m => m.globalIdx === chain.col);
                             if (!startMarker) return;

                             // Start X is standard logic
                             const startXPercent = (startMarker.colIdx / stepsPerBar) * 100 + ((startMarker.span / stepsPerBar) * 100) / 2;
                             
                             // End X based on distance
                             const distSteps = chain.endCol - chain.col;
                             const endXPercent = startXPercent + (distSteps / stepsPerBar) * 100;
                             
                             // Y coordinate
                             const y = chain.str * STRING_H_PX + STRING_H_PX / 2;
                             
                             const midX = (startXPercent + endXPercent) / 2;
                             const curveHeight = 12; 
                             const ctrlY = y - curveHeight;

                             connectionPaths.push(
                                 <path 
                                    key={`${chain.col}-${chain.str}-${idx}`}
                                    d={`M ${startXPercent} ${y - 4} Q ${midX} ${ctrlY} ${endXPercent} ${y - 4}`}
                                    fill="none"
                                    stroke="#94a3b8" // Slate-400
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    className="hover:stroke-cyan-400 cursor-pointer transition-colors duration-200"
                                    style={{ pointerEvents: 'auto' }}
                                    onDoubleClick={() => onRemoveConnectionChain?.(chain.col, chain.endCol, chain.str)}
                                 >
                                    <title>Double click to remove</title>
                                 </path>
                             )
                        });

                        return (
                            <div key={actualBarIdx} 
                                 className={`flex flex-col relative border-r border-gray-700/50 last:border-0 transition-colors duration-200 
                                    ${isZoomed ? 'flex-shrink-0' : 'flex-1'}
                                    ${isBarActive ? 'bg-cyan-500/5' : ''}
                                 `}
                                 style={{ minWidth: isZoomed ? '400px' : '0' }}
                            >
                                {isBarActive && <div className="absolute inset-0 border-2 border-cyan-500/20 pointer-events-none z-10 box-border"></div>}
                                <div className="absolute top-1 left-2 text-[10px] text-gray-500 font-mono select-none z-10 font-bold">
                                    {actualBarIdx + 1}
                                </div>

                                <div className={`flex w-full ${DIM.CHORD_ROW_HEIGHT} relative mt-6 border-b border-gray-700/50 bg-gray-800/20`}>
                                   {markersWithBeams.map((marker) => {
                                      const widthPercent = (marker.span / stepsPerBar) * 100;
                                      const chord = chordNames[marker.globalIdx];
                                      return (
                                          <div key={`chord-${marker.globalIdx}`} 
                                               className="flex items-center justify-center border-r border-gray-700/20 last:border-0 relative group"
                                               style={{ width: `${widthPercent}%`, flex: `0 0 ${widthPercent}%` }}
                                          >
                                              <input
                                                 type="text"
                                                 value={chord || ''}
                                                 onChange={(e) => onUpdateChord(marker.globalIdx, e.target.value)}
                                                 onFocus={() => {
                                                     onActiveCellChange({ col: marker.globalIdx, str: 0 })
                                                 }}
                                                 className="w-full h-full bg-transparent text-center font-bold text-cyan-400 placeholder-gray-700 focus:outline-none text-[10px] focus:bg-gray-800 transition-colors"
                                                 placeholder="+"
                                              />
                                          </div>
                                      );
                                   })}
                                </div>

                                <div className="flex flex-col w-full relative"> 
                                    {/* Connection SVG Overlay */}
                                    <div className="absolute inset-0 z-20 pointer-events-none overflow-visible">
                                        <svg width="100%" height="100%" viewBox={`0 0 100 ${instrument.stringCount * STRING_H_PX}`} preserveAspectRatio="none" className="overflow-visible">
                                            {connectionPaths}
                                        </svg>
                                    </div>

                                    {Array.from({ length: instrument.stringCount }).map((_, strIdx) => (
                                        <div key={strIdx} className={`flex ${DIM.STRING_HEIGHT} relative last:border-0`}>
                                            {markersWithBeams.map((marker) => {
                                                const globalColIdx = marker.globalIdx;
                                                const widthPercent = (marker.span / stepsPerBar) * 100;
                                                const isPlayingThisCell = currentColumnIndex >= marker.globalIdx && currentColumnIndex < marker.globalIdx + marker.span;

                                                return (
                                                    <div key={globalColIdx} 
                                                         className="flex-1 relative border-r border-gray-700/30 last:border-0"
                                                         style={{ width: `${widthPercent}%`, flex: `0 0 ${widthPercent}%` }}
                                                    >
                                                         {strIdx === 0 && isPlayingThisCell && (
                                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full z-40 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse"></div>
                                                        )}
                                                        {isPlayingThisCell && (
                                                            <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-red-500/50 z-30 pointer-events-none"></div>
                                                        )}
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
                                    ))}
                                </div>

                                <div className={`flex w-full ${DIM.DUR_ROW_HEIGHT} border-t border-gray-700/50 bg-gray-800/30 relative`}>
                                     {markersWithBeams.map((marker) => {
                                         const widthPercent = (marker.span / stepsPerBar) * 100;
                                         return (
                                            <DurationMarker 
                                                key={marker.globalIdx}
                                                duration={marker.duration}
                                                widthPercent={widthPercent}
                                                span={marker.span}
                                                onClick={() => handleDurationClick(marker.globalIdx)}
                                                beam8={marker.beam8}
                                                beam16={marker.beam16}
                                            />
                                         )
                                     })}
                                     {!isValidDuration && (
                                         <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse" title="Bar duration mismatch"></div>
                                     )}
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
    <div className="relative w-full h-full bg-gray-950 overflow-y-auto overflow-x-hidden p-8 pb-32">
        {renderPreviewSection(0, editRowStartBarIndex)}
        {renderEditArea()}
        {renderPreviewSection(editRowStartBarIndex + EDIT_BARS_PER_ROW, totalBars)}
    </div>
  );
};