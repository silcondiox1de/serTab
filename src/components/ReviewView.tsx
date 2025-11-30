import React from 'react';
import {
  TabColumn,
  InstrumentConfig,
  NoteDuration,
  TimeSignatureType,
  TIME_SIGNATURES,
} from '../types';

interface ReviewViewProps {
  title: string;
  bpm: number;
  timeSignature: TimeSignatureType;
  instrument: InstrumentConfig;
  tuning: string[];
  columns: TabColumn[];
  durations: NoteDuration[];
  chordNames: (string | null)[];
  connections?: { col: number; str: number }[];
  onClose: () => void;
  onRemoveConnectionChain?: (startCol: number, endCol: number, str: number) => void;
}

const getDurationSteps = (d: NoteDuration): number => {
  switch (d) {
    case '1': return 16;
    case '2': return 8;
    case '4': return 4;
    case '8': return 2;
    case '16': return 1;
    default: return 2;
  }
};

const ReviewDurationMarker = ({
  duration,
  beam8,
  beam16,
}: {
  duration: NoteDuration;
  beam8: { left: boolean; right: boolean };
  beam16: { left: boolean; right: boolean };
}) => {
  const stroke = 'black';
  const strokeWidth = 1; 
  const height = 20;
  const cx = 10;

  const isBeamed = beam8.left || beam8.right;

  switch (duration) {
    case '1':
      return <circle cx={cx} cy={height / 2} r="3.5" stroke={stroke} strokeWidth={strokeWidth} fill="none" />;
    case '2':
      return (
        <g>
          <line x1={cx} y1={1} x2={cx} y2={height - 5} stroke={stroke} strokeWidth={strokeWidth} />
          <circle cx={cx} cy={height - 3} r="3" stroke={stroke} strokeWidth={strokeWidth} fill="none" />
        </g>
      );
    case '4':
      return <line x1={cx} y1={1} x2={cx} y2={height - 1} stroke={stroke} strokeWidth={strokeWidth} />;
    case '8':
      if (isBeamed) return <line x1={cx} y1={1} x2={cx} y2={height} stroke={stroke} strokeWidth={strokeWidth} />;
      return (
        <g>
          <line x1={cx} y1={1} x2={cx} y2={height} stroke={stroke} strokeWidth={strokeWidth} />
          <path d={`M ${cx} ${height} Q ${cx + 6} ${height - 4} ${cx + 6} ${height - 10}`} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
        </g>
      );
    case '16':
      if (isBeamed) return <line x1={cx} y1={1} x2={cx} y2={height} stroke={stroke} strokeWidth={strokeWidth} />;
      return (
        <g>
          <line x1={cx} y1={1} x2={cx} y2={height} stroke={stroke} strokeWidth={strokeWidth} />
          <path d={`M ${cx} ${height} Q ${cx + 6} ${height - 4} ${cx + 6} ${height - 10}`} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
          <path d={`M ${cx} ${height - 6} Q ${cx + 6} ${height - 10} ${cx + 6} ${height - 16}`} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
        </g>
      );
    default:
      return <line x1={cx} y1={1} x2={cx} y2={height} stroke={stroke} strokeWidth={strokeWidth} />;
  }
};

export const ReviewView: React.FC<ReviewViewProps> = ({
  title,
  bpm,
  timeSignature,
  instrument,
  tuning,
  columns,
  durations,
  chordNames,
  connections = [],
  onClose,
  onRemoveConnectionChain,
}) => {
  const stepsPerBar = TIME_SIGNATURES[timeSignature].stepsPerBar;
  const BARS_PER_SYSTEM = 4;

  const totalBars = Math.ceil(columns.length / stepsPerBar);
  const totalSystems = Math.ceil(totalBars / BARS_PER_SYSTEM);

  // Last column in the whole piece that has any note
  let lastUsedColumn = -1;
  for (let i = columns.length - 1; i >= 0; i--) {
    if (columns[i].some((n) => n !== -1)) {
      lastUsedColumn = i;
      break;
    }
  }

  // Chains logic
  const chains: { col: number; endCol: number; str: number }[] = [];
  {
    const used = new Set<string>();
    const sorted = [...connections].sort((a, b) => a.col - b.col);
    const connMap = new Set(connections.map((c) => `${c.col},${c.str}`));

    sorted.forEach((conn) => {
      const key = `${conn.col},${conn.str}`;
      if (used.has(key)) return;
      let start = conn.col;
      let str = conn.str;
      let nextNoteIdx = -1;
      for (let i = start + 1; i < columns.length; i++) {
        if (columns[i][str] !== -1) { nextNoteIdx = i; break; }
      }
      if (nextNoteIdx === -1) return;
      used.add(key);
      let currentEnd = nextNoteIdx;
      while (true) {
        const nextKey = `${currentEnd},${str}`;
        if (connMap.has(nextKey)) {
          used.add(nextKey);
          let farNoteIdx = -1;
          for (let i = currentEnd + 1; i < columns.length; i++) {
            if (columns[i][str] !== -1) { farNoteIdx = i; break; }
          }
          if (farNoteIdx !== -1) { currentEnd = farNoteIdx; } else { break; }
        } else { break; }
      }
      chains.push({ col: start, endCol: currentEnd, str });
    });
  }

  const renderSystem = (systemIndex: number) => {
    const startBar = systemIndex * BARS_PER_SYSTEM;
    const endBar = Math.min(startBar + BARS_PER_SYSTEM, totalBars);

    const systemBars: {
      barIndex: number;
      cols: TabColumn[];
      chords: (string | null)[];
      durs: NoteDuration[];
    }[] = [];

    for (let b = startBar; b < endBar; b++) {
      const startCol = b * stepsPerBar;
      const endCol = startCol + stepsPerBar;
      systemBars.push({
        barIndex: b,
        cols: columns.slice(startCol, endCol),
        chords: chordNames.slice(startCol, endCol),
        durs: durations.slice(startCol, endCol),
      });
    }

    if (systemBars.length === 0) return null;

    return (
      <div key={systemIndex} className="mb-14 break-inside-avoid">
        {/* Chord row */}
        <div className="flex w-full h-6 mb-1 relative">
          {systemBars.map((bar, bIdx) => (
            <div key={bIdx} className="flex-1 flex border-l border-transparent relative">
              {bar.chords.map((chord, cIdx) =>
                chord && (
                  <div key={cIdx} className="absolute transform -translate-x-1/2 text-sm font-bold text-blue-800" style={{ left: `${(cIdx / stepsPerBar) * 100}%` }}>
                    {chord}
                  </div>
                ),
              )}
            </div>
          ))}
        </div>

        {/* Staff + bars */}
        <div className="relative">
          {/* 1. TUNING MARKERS REMOVED (Kept update 1) */}
          
          <div className="border-l-2 border-black flex w-full">
            {systemBars.map((bar, bIdx) => {
              const startColIndex = bar.barIndex * stepsPerBar;
              
              // Chains in this bar
              const barChains = chains.filter(c => c.col >= startColIndex && c.col < startColIndex + stepsPerBar);
              const connectionPaths: React.ReactElement[] = [];

              barChains.forEach((chain, idx) => {
                const localColIdx = chain.col - startColIndex;
                const startXPercent = ((localColIdx + 0.5) / stepsPerBar) * 100;
                const distSteps = chain.endCol - chain.col;
                const endXPercent = startXPercent + (distSteps / stepsPerBar) * 100;
                const y = chain.str * 16 + 8;
                const midX = (startXPercent + endXPercent) / 2;
                const ctrlY = y - 8;

                connectionPaths.push(
                  <path key={`c-${idx}`} d={`M ${startXPercent} ${y - 4} Q ${midX} ${ctrlY} ${endXPercent} ${y - 4}`} fill="none" stroke="black" strokeWidth={1.2} strokeLinecap="round" className="hover:stroke-cyan-600 cursor-pointer transition-colors duration-200" style={{ pointerEvents: 'auto' }} onDoubleClick={() => onRemoveConnectionChain?.(chain.col, chain.endCol, chain.str)}><title>Double click to remove</title></path>
                );
              });

              const markers: { colIdx: number; duration: NoteDuration; span: number; beam8: any; beam16: any; }[] = [];
              let i = 0;
              while (i < stepsPerBar) {
                const globalIdx = startColIndex + i;
                if (lastUsedColumn !== -1 && globalIdx > lastUsedColumn) {
                    // Stop if we passed the last note in song
                    break;
                }

                const d = bar.durs[i] || '8';
                const span = getDurationSteps(d);
                
                // --- REVERT 3: REMOVED 'hasNoteInSpan' CHECK ---
                // Now we push a marker regardless of whether there is a note or not.
                // This fills the duration bar completely.
                markers.push({ colIdx: i, duration: d, span, beam8: { left: false, right: false }, beam16: { left: false, right: false } });
                // -----------------------------------------------
                
                i += span;
              }

              // Beam logic
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

              return (
                <div key={bIdx} className="flex-1 border-r-2 border-black flex flex-col relative"> {/* 4. BARLINE (Kept update 4) */}
                  
                  {/* 2. BAR NUMBER TOP LEFT (Kept update 2) */}
                  <div className="absolute top-[-20px] left-0 text-xs font-mono font-bold text-gray-500">
                    {bar.barIndex + 1}
                  </div>

                  {/* STAFF AREA */}
                  <div className="relative flex-1">
                    {/* string lines */}
                    <div className="absolute inset-0 flex flex-col justify-between py-1.5 pointer-events-none">
                      {Array.from({ length: instrument.stringCount }).map((_, i) => (
                        <div key={i} className="w-full border-t border-gray-300 print:border-gray-500"></div>
                      ))}
                    </div>

                    {/* connections */}
                    <div className="absolute inset-0 pointer-events-none overflow-visible z-10">
                      <svg width="100%" height="100%" viewBox={`0 0 100 ${instrument.stringCount * 16}`} preserveAspectRatio="none" className="overflow-visible">
                        {connectionPaths}
                      </svg>
                    </div>

                    {/* notes */}
                    <div className="relative w-full h-full flex flex-col justify-between py-0.5 z-20">
                      {Array.from({ length: instrument.stringCount }).map((_, strIdx) => (
                        <div key={strIdx} className="relative h-4 flex items-center w-full">
                          {bar.cols.map((col, colIdx) => {
                            const note = col[strIdx];
                            if (note === -1) return null;
                            return (
                              <div key={colIdx} className="absolute transform -translate-x-1/2 bg-white px-0.5 text-sm font-bold font-mono text-black leading-none" style={{ left: `${((colIdx + 0.5) / stepsPerBar) * 100}%` }}>
                                {note}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* DURATION MARKER ROW */}
                  <div className="h-6 relative">
                    {markersWithBeams.map((m, mIdx) => {
                      const widthPercent = (m.span / stepsPerBar) * 100;
                      const leftPercent = (m.colIdx / stepsPerBar) * 100;
                      const singleStepWidth = 100 / m.span;

                      return (
                        <div key={mIdx} className="absolute inset-y-0" style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}>
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ left: 0, width: `${singleStepWidth}%` }}>
                            <svg width="20" height="24" viewBox="0 0 20 24" className="overflow-visible">
                              <ReviewDurationMarker duration={m.duration} beam8={m.beam8} beam16={m.beam16} />
                            </svg>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                </div>
              );
            })}

            {/* filler for partial system */}
            {systemBars.length < BARS_PER_SYSTEM && (
              <div className="flex-[0_0_auto]" style={{ width: `${(BARS_PER_SYSTEM - systemBars.length) * 25}%` }}></div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-gray-200 z-[100] overflow-y-auto print:static print:overflow-visible print:bg-white print:h-auto print:block">
      <style>{`
        @media print {
          @page { size: auto; margin: 0mm; }
          body, html, #root { overflow: visible !important; height: auto !important; width: auto !important; background-color: white !important; color: black !important; display: block !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      <div className="sticky top-0 bg-white border-b border-gray-300 px-6 py-3 flex justify-between items-center shadow-sm z-50 print:hidden">
        <div className="flex items-center space-x-4">
          <h2 className="font-bold text-gray-800 text-lg">Review Mode</h2>
          <div className="h-4 w-[1px] bg-gray-300" />
          <span className="text-sm text-gray-600">{title}</span>
        </div>
        <div className="flex space-x-3">
          <button onClick={() => window.print()} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-bold border border-gray-300 transition-colors flex items-center">Print</button>
          <button onClick={onClose} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-bold shadow transition-colors">Back to Editor</button>
        </div>
      </div>

      <div className="max-w-[850px] mx-auto bg-white min-h-screen my-8 shadow-xl p-12 print:shadow-none print:my-0 print:mx-auto print:w-full print:p-8 print:max-w-none">
        <div className="border-b-2 border-gray-800 pb-6 mb-10 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 uppercase tracking-tight">{title}</h1>
          <div className="flex justify-center space-x-8 text-sm text-gray-600 font-mono uppercase tracking-widest mt-4">
            <div><span className="font-bold text-gray-400 block text-[10px]">Instrument</span>{instrument.name}</div>
            <div><span className="font-bold text-gray-400 block text-[10px]">Tuning</span>{tuning.join(' ')}</div>
            <div><span className="font-bold text-gray-400 block text-[10px]">Tempo</span>{bpm} BPM</div>
            <div><span className="font-bold text-gray-400 block text-[10px]">Time Sig</span>{timeSignature}</div>
          </div>
        </div>

        <div className="space-y-4">
          {Array.from({ length: totalSystems }).map((_, i) => renderSystem(i))}
        </div>

        <div className="mt-20 pt-8 border-t border-gray-200 text-center text-xs text-gray-400 font-['Courier'] font-bold">
          Generated with SerTab • Tool belongs to Serum AI. All rights reserved. No commercial use.
        </div>
      </div>
    </div>
  );
};
