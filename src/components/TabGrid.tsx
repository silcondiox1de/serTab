import React, { useEffect, useRef } from 'react';
import { TabColumn, Note, InstrumentConfig, NoteDuration } from '../types';
import { TabCell } from './TabCell';

interface DurationMarkerProps {
  duration: NoteDuration;
  onClick: () => void;
  span: number; // Number of steps this note occupies
  beam8: { left: boolean; right: boolean };
  beam16: { left: boolean; right: boolean };
}

const DurationMarker: React.FC<DurationMarkerProps> = ({
  duration,
  onClick,
  span,
  beam8,
  beam16,
}) => {
  const isBeamed = beam8.left || beam8.right;
  const beamClass = "bg-gray-400 group-hover:bg-cyan-400 transition-colors";
  const strokeClass =
    "stroke-gray-400 group-hover:stroke-cyan-400 transition-colors";

  // Center of this duration block (always middle of the span)
  const centerPercent = 50;

  const renderSymbol = () => {
    const strokeWidth = 1.5;
    const height = 32;
    const cx = 10; // center inside SVG (we'll center the SVG itself)

    switch (duration) {
      case "1": // Whole
        return (
          <circle
            cx={cx}
            cy={height / 2}
            r="5"
            strokeWidth={strokeWidth}
            fill="none"
            className={strokeClass}
          />
        );
      case "2": // Half
        return (
          <g className={strokeClass} strokeWidth={strokeWidth} fill="none">
            <line x1={cx} y1={5} x2={cx} y2={height - 8} />
            <circle cx={cx} cy={height - 5} r="4" />
          </g>
        );
      case "4": // Quarter
        return (
          <line
            x1={cx}
            y1={5}
            x2={cx}
            y2={height}
            strokeWidth={strokeWidth}
            className={strokeClass}
          />
        );
      case "8": // Eighth
        if (isBeamed) {
          return (
            <line
              x1={cx}
              y1={5}
              x2={cx}
              y2={height}
              strokeWidth={strokeWidth}
              className={strokeClass}
            />
          );
        }
        return (
          <g className={strokeClass} strokeWidth={strokeWidth} fill="none">
            <line x1={cx} y1={5} x2={cx} y2={height} />
            <path
              d={`M ${cx} ${height} Q ${cx + 10} ${height - 5} ${
                cx + 10
              } ${height - 15}`}
            />
          </g>
        );
      case "16": // Sixteenth
        if (isBeamed) {
          return (
            <line
              x1={cx}
              y1={5}
              x2={cx}
              y2={height}
              strokeWidth={strokeWidth}
              className={strokeClass}
            />
          );
        }
        return (
          <g className={strokeClass} strokeWidth={strokeWidth} fill="none">
            <line x1={cx} y1={5} x2={cx} y2={height} />
            <path
              d={`M ${cx} ${height} Q ${cx + 10} ${height - 5} ${
                cx + 10
              } ${height - 15}`}
            />
            <path
              d={`M ${cx} ${height - 8} Q ${cx + 10} ${height - 13} ${
                cx + 10
              } ${height - 23}`}
            />
          </g>
        );
      default:
        return (
          <line
            x1={cx}
            y1={5}
            x2={cx}
            y2={height}
            strokeWidth={strokeWidth}
            className={strokeClass}
          />
        );
    }
  };

  return (
    <div
      onClick={onClick}
      className="h-full relative cursor-pointer group hover:bg-white/5"
      // width is controlled by flex so it matches chords/notes
      style={{ flex: span, minWidth: 0 }}
      title={`Duration: 1/${duration}`}
    >
      {/* Beams Layer */}
      {isBeamed && (
        <div className="absolute inset-0 pointer-events-none">
          {/* 8th Beam (bottom) */}
          <div className="absolute bottom-0 w-full h-[2px]">
            {beam8.left && (
              <div
                className={`absolute h-full ${beamClass}`}
                style={{
                  left: "-0.5px",
                  width: `calc(${centerPercent}% + 1.5px)`,
                }}
              />
            )}
            {beam8.right && (
              <div
                className={`absolute h-full ${beamClass}`}
                style={{
                  left: `calc(${centerPercent}% - 1px)`,
                  right: "-0.5px",
                }}
              />
            )}
          </div>

          {/* 16th Beam (above 8th) */}
          {duration === "16" && (
            <div className="absolute bottom-[4px] w-full h-[2px]">
              {beam16.left ? (
                <div
                  className={`absolute h-full ${beamClass}`}
                  style={{
                    left: "-0.5px",
                    width: `calc(${centerPercent}% + 1.5px)`,
                  }}
                />
              ) : (
                beam8.left && (
                  <div
                    className={`absolute h-full ${beamClass}`}
                    style={{
                      right: `calc(${100 - centerPercent}% - 1px)`,
                      width: "8px",
                    }}
                  />
                )
              )}

              {beam16.right ? (
                <div
                  className={`absolute h-full ${beamClass}`}
                  style={{
                    left: `calc(${centerPercent}% - 1px)`,
                    right: "-0.5px",
                  }}
                />
              ) : (
                beam8.right && (
                  <div
                    className={`absolute h-full ${beamClass}`}
                    style={{
                      left: `calc(${centerPercent}% - 1px)`,
                      width: "8px",
                    }}
                  />
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* Symbol, centered in the whole span (so it lines up with the fret number) */}
      <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-center pointer-events-none">
        <svg
          width="20"
          height="32"
          viewBox="0 0 20 32"
          className="overflow-visible"
        >
          {renderSymbol()}
        </svg>
      </div>

      {/* Right border */}
      <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-white/5 pointer-events-none" />
    </div>
  );
};

type Connection = {
  fromCol: number;
  fromStr: number;
  toCol: number;
  toStr: number;
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
  connections: Connection[];
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
      STRING_HEIGHT: 'h-8', // increased for better touch target and visuals
      DUR_ROW_HEIGHT: 'h-8',
  };

  const STRING_H_PX = 32; // Matches h-8
  
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
                        {/* Row Labels */}
                        <div className="absolute left-0 top-0 bottom-0 w-14 flex flex-col justify-between text-[9px] font-bold text-gray-600 py-1.5 items-center select-none border-r border-transparent">
                             {tuning.map((t, i) => <div key={i} className="flex-1 flex items-center justify-center">{t}</div>)}
                        </div>

                        <div className="flex w-full h-20 rounded-lg overflow-hidden border border-gray-800 bg-gray-900/50 shadow-sm">
                             {lineBars.map((bar, barOffset) => {
                                 const actualBarIdx = lineStartBarIdx + barOffset;
                                 const isActiveWindow = actualBarIdx >= editRowStartBarIndex && actualBarIdx < editRowStartBarIndex + EDIT_BARS_PER_ROW;
                                 
                                 return (
                                     <div key={actualBarIdx} 
                                          onClick={() => handlePreviewClick(lineStartBarIdx)}
                                          className={`relative border-r border-gray-800 last:border-0 flex-1 h-full cursor-pointer transition-colors
                                            ${isActiveWindow ? 'bg-gray-800 shadow-[inset_0_0_20px_rgba(34,211,238,0.05)]' : 'hover:bg-gray-800/50'}
                                          `}
                                     >
                                        <div className={`absolute top-0.5 left-1 text-[9px] font-mono pointer-events-none font-bold ${isActiveWindow ? 'text-cyan-500' : 'text-gray-700'}`}>
                                            {actualBarIdx + 1}
                                        </div>
                                        {/* Active Window Indicator Line */}
                                        {isActiveWindow && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500/50"></div>}
                                        
                                        <div className="flex flex-col w-full h-full py-1">
                                            {Array.from({length: instrument.stringCount}).map((_, sIdx) => (
                                                <div key={sIdx} className="flex-1 flex w-full items-center relative">
                                                    <div className="absolute inset-x-0 h-[1px] bg-gray-800 top-1/2 -translate-y-1/2 z-0"></div>
                                                    {bar.map((col, cIdx) => (
                                                        <div key={cIdx} className="flex-1 flex items-center justify-center z-10">
                                                            {col[sIdx] !== -1 && (
                                                                <div className={`w-1 h-1 rounded-full ${isActiveWindow ? 'bg-cyan-400' : 'bg-gray-500'}`}></div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                     </div>
                                 )
                             })}
                             {/* Empty slots filler */}
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
      <div 
        ref={editAreaRef}
        className="relative pl-14 mb-8"
      >
        {/* EDITOR badge snug in the corner */}
        <div className="absolute left-0 top-0 -translate-y-1/2 z-30">
          <button
            className="
              px-3 py-0.5
              text-[10px] font-bold uppercase tracking-[0.25em]
              bg-cyan-500/15 text-cyan-300
              border border-cyan-500/40
              rounded-md rounded-bl-none
              shadow-sm
              font-['Courier']
            "
          >
            Editor
          </button>
        </div>


        {/* "Headstock" Sidebar */}
        <div className="absolute left-0 top-0 bottom-0 w-14 z-20 flex flex-col">
          {/* Spacer for chords */}
          <div className={`${DIM.CHORD_ROW_MARGIN} w-full shrink-0`}></div>
          
          {/* Main Headstock Block */}
          <div className="flex-1 bg-gray-800 rounded-l-lg border border-gray-700 border-r-0 shadow-lg flex flex-col py-1 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
              
              {/* Top Label */}
              <div className={`${DIM.CHORD_ROW_HEIGHT} w-full shrink-0 flex items-center justify-center border-b border-gray-700/50`}>
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Chd</span>
              </div>

              {/* Tuning Inputs */}
              <div className="flex-1 flex flex-col justify-center relative">
                  {tuning.map((label, i) => (
                      <div key={i} className={`${DIM.STRING_HEIGHT} flex items-center justify-center shrink-0 px-1 relative group`}>
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-gray-600 rounded-full -ml-1 shadow-inner"></div>
                          <input 
                              type="text"
                              value={label}
                              onChange={(e) => onTuningChange(i, e.target.value)}
                              className="w-full bg-transparent text-center font-bold font-mono focus:outline-none border-transparent text-sm text-gray-300 focus:text-cyan-400 hover:text-white transition-colors cursor-text z-10"
                              maxLength={2}
                          />
                      </div>
                  ))}
              </div>

              {/* Bottom Label */}
              <div className={`${DIM.DUR_ROW_HEIGHT} w-full shrink-0 flex items-center justify-center border-t border-gray-700/50`}>
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Dur</span>
              </div>
          </div>
        </div>

        <div className={`flex overflow-x-auto pb-2 tab-scroll bg-[#111827] rounded-r-lg border border-gray-700 shadow-2xl ${isZoomed ? '' : 'w-full'}`}>
          <div className={`flex min-w-full ${isZoomed ? '' : 'w-full'}`}>
            {barsToRender.map((_, barOffset) => {
              const actualBarIdx = editRowStartBarIndex + barOffset;
              const barStartColIdx = rowStartColIndex + (barOffset * stepsPerBar);
              const isBarActive = actualBarIdx === activeBarIndex;

              const markers: {
                globalIdx: number;
                colIdx: number;
                duration: NoteDuration;
                span: number;
                beam8: { left: boolean; right: boolean };
                beam16: { left: boolean; right: boolean };
              }[] = [];

              let totalStepsUsed = 0;
              let i = 0;
              while(i < stepsPerBar) {
                  const globalIdx = barStartColIdx + i;
                  const d = durations[globalIdx] || '8';
                  const span = getDurationSteps(d);
                  markers.push({ globalIdx: globalIdx, colIdx: i, duration: d, span: span, beam8: {left:false,right:false}, beam16:{left:false,right:false} });
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

              // ---- Connection paths for this bar (using new Connection objects) ----
              const connectionPaths: React.ReactElement[] = [];
              const barConnections = connections.filter(
                conn =>
                  conn.fromCol >= barStartColIdx &&
                  conn.fromCol < barStartColIdx + stepsPerBar
              );
              
              barConnections.forEach((conn, idxConn) => {
                const startMarker = markersWithBeams.find(m => m.globalIdx === conn.fromCol);
                if (!startMarker) return;
              
                const startX =
                  (startMarker.colIdx / stepsPerBar) * 100 +
                  ((startMarker.span / stepsPerBar) * 100) / 2;
              
                // Distance in steps → proportion of the bar width
                const distSteps = conn.toCol - conn.fromCol;
                const endX = startX + (distSteps / stepsPerBar) * 100;
              
                const fromY = conn.fromStr * STRING_H_PX + STRING_H_PX / 2;
                const toY = conn.toStr * STRING_H_PX + STRING_H_PX / 2;
                const sameString = conn.fromStr === conn.toStr;
              
                const midX = (startX + endX) / 2;
              
                // Make the arch height scale with distance a bit so long ties look smoother
                const distanceRatio = Math.min(1, Math.abs(endX - startX) / 100);
                const baseHeight = sameString ? 18 : 14;
                const curveHeight = baseHeight + distanceRatio * 6;
              
                const startY = sameString ? fromY - 8 : fromY - 6;
                const endY   = sameString ? toY   - 8 : toY   - 6;
                const ctrlY  = Math.min(fromY, toY) - curveHeight;
              
                connectionPaths.push(
                  <path
                    key={`${conn.fromCol}-${conn.fromStr}-${conn.toCol}-${conn.toStr}-${idxConn}`}
                    d={`M ${startX} ${startY} Q ${midX} ${ctrlY} ${endX} ${endY}`}
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth="2"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    className="hover:stroke-cyan-400 cursor-pointer transition-colors duration-200"
                    style={{
                      pointerEvents: 'auto',
                      filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.3))',
                    }}
                    onDoubleClick={() =>
                      onRemoveConnectionChain?.(conn.fromCol, conn.toCol, conn.fromStr)
                    }
                  >
                    <title>Double click to remove</title>
                  </path>
                );
              });


              return (
                <div key={actualBarIdx} 
                     className={`flex flex-col relative border-r border-gray-800 last:border-0 transition-colors duration-200 
                        ${isZoomed ? 'flex-shrink-0' : 'flex-1'}
                        ${isBarActive ? 'bg-gray-800/30' : ''}
                     `}
                     style={{ minWidth: isZoomed ? '400px' : '0' }}
                >
                  <div className="absolute top-1 left-2 text-[10px] text-gray-500 font-mono select-none z-10 font-bold bg-[#111827] px-1 rounded">
                      {actualBarIdx + 1}
                  </div>

                  {/* Top Spacer aligns with headstock top margin */}
                  <div className={`${DIM.CHORD_ROW_MARGIN} w-full shrink-0 border-b border-gray-800`}></div>

                  <div className={`flex w-full ${DIM.CHORD_ROW_HEIGHT} relative border-b border-gray-800 bg-gray-900/50`}>
                    {markersWithBeams.map((marker) => {
                      const chord = chordNames[marker.globalIdx];
                      return (
                        <div
                          key={`chord-${marker.globalIdx}`}
                          className="flex items-center justify-center border-r border-gray-800/50 last:border-0 relative group"
                          style={{ flex: marker.span, minWidth: 0 }}
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
                      <svg
                        width="100%"
                        height="100%"
                        viewBox={`0 0 100 ${instrument.stringCount * STRING_H_PX}`}
                        preserveAspectRatio="none"
                        className="overflow-visible"
                      >
                        {connectionPaths}
                      </svg>
                    </div>

                    {Array.from({ length: instrument.stringCount }).map((_, strIdx) => {
                      // Visual string thickness calculation
                      // Lower strings (higher index) should be thicker
                      const thickness = 1 + (strIdx / (instrument.stringCount - 1)) * 2;
                      
                      return (
                        <div key={strIdx} className={`flex ${DIM.STRING_HEIGHT} relative last:border-0`}>
                          {/* String Line Background */}
                          <div className="absolute inset-x-0 bg-gray-600 z-0 pointer-events-none" 
                               style={{ 
                                   height: `${thickness}px`, 
                                   top: '50%', 
                                   marginTop: `-${thickness/2}px`,
                                   opacity: 0.3 + (strIdx * 0.1) // Lower strings slightly more opaque
                               }}>
                          </div>

                          {markersWithBeams.map((marker) => {
                            const globalColIdx = marker.globalIdx;
                            const isPlayingThisCell =
                              currentColumnIndex >= marker.globalIdx &&
                              currentColumnIndex < marker.globalIdx + marker.span;
                          
                            return (
                              <div
                                key={globalColIdx}
                                className="relative border-r border-gray-800 last:border-0"
                                style={{ flex: marker.span, minWidth: 0 }}
                              >
                                {strIdx === 0 && isPlayingThisCell && (
                                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-3 h-3 bg-cyan-400 rounded-full z-40 shadow-[0_0_10px_rgba(34,211,238,0.8)] animate-pulse"></div>
                                )}
                                {isPlayingThisCell && (
                                  <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-cyan-500/50 z-30 pointer-events-none"></div>
                                )}
                                <TabCell
                                  note={columns[globalColIdx] ? columns[globalColIdx][strIdx] : -1}
                                  stringIndex={strIdx}
                                  columnIndex={globalColIdx}
                                  isActive={
                                    activeCell?.col === globalColIdx && activeCell?.str === strIdx
                                  }
                                  onFocus={() => onActiveCellChange({ col: globalColIdx, str: strIdx })}
                                  onUpdate={(val) => handleUpdateNote(globalColIdx, strIdx, val)}
                                  onNavigate={(dir) => handleNavigate(globalColIdx, strIdx, dir)}
                                />
                              </div>
                            );
                          })}
                        </div>
                      )})}
                  </div>

                  <div className={`flex w-full ${DIM.DUR_ROW_HEIGHT} border-t border-gray-800 bg-gray-900/50 relative`}>
                    {markersWithBeams.map((marker) => (
                      <DurationMarker 
                        key={marker.globalIdx}
                        duration={marker.duration}
                        span={marker.span}
                        onClick={() => handleDurationClick(marker.globalIdx)}
                        beam8={marker.beam8}
                        beam16={marker.beam16}
                      />
                    ))}

                    {!isValidDuration && (
                      <div
                        className="absolute bottom-0 left-0 right-0 h-1 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse"
                        title="Bar duration mismatch"
                      ></div>
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
    <div className="relative w-full h-full p-8 pb-32 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
        {renderPreviewSection(0, editRowStartBarIndex)}
        {renderEditArea()}
        {renderPreviewSection(editRowStartBarIndex + EDIT_BARS_PER_ROW, totalBars)}
    </div>
  );
};
