import React from 'react';
import { TabColumn, InstrumentConfig, NoteDuration, TimeSignatureType, TIME_SIGNATURES } from '../types';

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
  switch(d) {
    case '1': return 16;
    case '2': return 8;
    case '4': return 4;
    case '8': return 2;
    case '16': return 1;
    default: return 2;
  }
};

// NOTE: ReviewDurationMarker is no longer used for the print view markers,
// but kept here in case you want to re-use it later.
const ReviewDurationMarker = ({ duration, beam8, beam16 }: { duration: NoteDuration, beam8: {left: boolean, right: boolean}, beam16: {left: boolean, right: boolean} }) => {
    const stroke = "black";
    const strokeWidth = 1.5;
    const height = 24;
    const cx = 10;
    
    const isBeamed = beam8.left || beam8.right;

    switch (duration) {
          case '1':
              return <circle cx={cx} cy={height/2} r="3.5" stroke={stroke} strokeWidth={strokeWidth} fill="none" />;
          case '2':
               return (
                  <g>
                    <line x1={cx} y1={0} x2={cx} y2={height - 5} stroke={stroke} strokeWidth={strokeWidth} />
                    <circle cx={cx} cy={height - 3} r="3" stroke={stroke} strokeWidth={strokeWidth} fill="none" />
                  </g>
               );
          case '4':
              return <line x1={cx} y1={0} x2={cx} y2={height} stroke={stroke} strokeWidth={strokeWidth} />;
          case '8':
              if (isBeamed) {
                  return <line x1={cx} y1={0} x2={cx} y2={24} stroke={stroke} strokeWidth={strokeWidth} />;
              }
              return (
                  <g>
                    <line x1={cx} y1={0} x2={cx} y2={height} stroke={stroke} strokeWidth={strokeWidth} />
                    <path d={`M ${cx} ${height} Q ${cx+6} ${height-4} ${cx+6} ${height-10}`} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
                  </g>
              );
          case '16':
              if (isBeamed) {
                  return <line x1={cx} y1={0} x2={cx} y2={24} stroke={stroke} strokeWidth={strokeWidth} />;
              }
              return (
                   <g>
                    <line x1={cx} y1={0} x2={cx} y2={height} stroke={stroke} strokeWidth={strokeWidth} />
                    <path d={`M ${cx} ${height} Q ${cx+6} ${height-4} ${cx+6} ${height-10}`} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
                    <path d={`M ${cx} ${height-6} Q ${cx+6} ${height-10} ${cx+6} ${height-16}`} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
                  </g>
              );
          default: 
              return <line x1={cx} y1={0} x2={cx} y2={height} stroke={stroke} strokeWidth={strokeWidth} />;
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
  onRemoveConnectionChain
}) => {
  const stepsPerBar = TIME_SIGNATURES[timeSignature].stepsPerBar;
  const BARS_PER_SYSTEM = 4;
  
  const totalBars = Math.ceil(columns.length / stepsPerBar);
  const totalSystems = Math.ceil(totalBars / BARS_PER_SYSTEM);

  // Find last column that actually has a note; used to hide
  // "ghost" markers after the real music ends.
  let lastUsedColumn = -1;
  for (let i = columns.length - 1; i >= 0; i--) {
    if (columns[i].some(n => n !== -1)) {
      lastUsedColumn = i;
      break;
    }
  }

  // Pre-process chains
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
  
  const renderSystem = (systemIndex: number) => {
    const startBar = systemIndex * BARS_PER_SYSTEM;
    const endBar = Math.min(startBar + BARS_PER_SYSTEM, totalBars);
    
    const systemBars = [];
    for (let b = startBar; b < endBar; b++) {
      const startCol = b * stepsPerBar;
      const endCol = startCol + stepsPerBar;
      systemBars.push({
        barIndex: b,
        cols: columns.slice(startCol, endCol),
        chords: chordNames.slice(startCol, endCol),
        durs: durations.slice(startCol, endCol)
      });
    }

    if (systemBars.length === 0) return null;

    return (
      <div key={systemIndex} className="mb-14 break-inside-avoid">
        {/* Chords */}
        <div className="flex w-full h-6 mb-1 relative">
           {systemBars.map((bar, bIdx) => (
             <div key={bIdx} className="flex-1 flex border-l border-transparent relative">
                {bar.chords.map((chord, cIdx) => (
                  chord ? (
                    <div 
                      key={cIdx} 
                      className="absolute transform -translate-x-1/2 text-sm font-bold text-blue-800"
                      style={{ left: `${(cIdx / stepsPerBar) * 100}%` }}
                    >
                      {chord}
                    </div>
                  ) : null
                ))}
             </div>
           ))}
        </div>

        {/* Staff */}
        <div className="relative">
          <div className="absolute -left-8 top-0 bottom-0 flex flex-col justify-between py-1 text-[10px] text-gray-500 font-mono">
             {tuning.map((t, i) => <span key={i} className="leading-none">{t}</span>)}
          </div>

          <div className="border-l-2 border-black flex w-full">
            {systemBars.map((bar, bIdx) => {
              const startColIndex = bar.barIndex * stepsPerBar;
              
              // Connections logic (Using Chains)
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
                       <path 
                          key={`c-${idx}`}
                          d={`M ${startXPercent} ${y - 4} Q ${midX} ${ctrlY} ${endXPercent} ${y - 4}`}
                          fill="none"
                          stroke="black"
                          strokeWidth={1.2}   // a bit thinner
                          strokeLinecap="round"
                          className="hover:stroke-cyan-600 cursor-pointer transition-colors duration-200"
                          style={{ pointerEvents: 'auto' }}
                          onDoubleClick={() => onRemoveConnectionChain?.(chain.col, chain.endCol, chain.str)}
                       >
                         <title>Double click to remove</title>
                       </path>
                  );
              });

              // Pre-calculate markers for beams (we no longer render the SVG notes with beams
              // but keep this in case you want to re-use durations later)
              const markers: any[] = [];
              let i = 0;
              while (i < stepsPerBar) {
                  const d = bar.durs[i] || '8';
                  const span = getDurationSteps(d);
                  markers.push({ colIdx: i, duration: d, span });
                  i += span;
              }

              return (
                <div key={bIdx} className="flex-1 border-r-2 border-black relative">
                  {/* Bar number: bigger, moved up, with white background to avoid overlap */}
                  <div className="absolute -top-7 left-1 text-xs font-bold text-gray-700 font-mono bg-white px-1 rounded-sm shadow-[0_0_0_1px_rgba(0,0,0,0.05)]">
                    {bar.barIndex + 1}
                  </div>

                  {/* String lines */}
                  <div className="absolute inset-0 flex flex-col justify-between py-1.5 pointer-events-none">
                    {Array.from({length: instrument.stringCount}).map((_, i) => (
                      <div key={i} className="w-full border-t border-gray-300 print:border-gray-500"></div>
                    ))}
                  </div>

                  <div className="relative w-full h-full flex flex-col justify-between py-0.5 z-10">
                     {/* Overlay for connections */}
                     <div className="absolute inset-0 pointer-events-none overflow-visible z-20">
                         <svg width="100%" height="100%" viewBox={`0 0 100 ${instrument.stringCount * 16}`} preserveAspectRatio="none" className="overflow-visible">
                             {connectionPaths}
                         </svg>
                     </div>

                     {Array.from({length: instrument.stringCount}).map((_, strIdx) => (
                       <div key={strIdx} className="relative h-4 flex items-center w-full">
                         {bar.cols.map((col, colIdx) => {
                            const note = col[strIdx];
                            if (note === -1) return null;
                            return (
                              <div 
                                key={colIdx} 
                                className="absolute transform -translate-x-1/2 bg-white px-0.5 text-sm font-bold font-mono text-black leading-none z-10"
                                style={{ left: `${((colIdx + 0.5) / stepsPerBar) * 100}%` }}
                              >
                                {note}
                              </div>
                            );
                         })}
                       </div>
                     ))}
                  </div>

                  {/* NEW: simplified duration / beat markers
                      - thin ticks
                      - shorter height
                      - nothing rendered after the last real note */}
                  <div className="absolute top-full left-0 w-full h-6 mt-1 pointer-events-none">
                    <div className="flex w-full h-full items-end">
                      {Array.from({ length: stepsPerBar }).map((_, stepIdx) => {
                        const globalIdx = startColIndex + stepIdx;
                        if (lastUsedColumn === -1 || globalIdx > lastUsedColumn) {
                          return <div key={stepIdx} className="flex-1" />;
                        }
                        return (
                          <div
                            key={stepIdx}
                            className="flex-1 flex items-end justify-center"
                          >
                            <div
                              className="w-px bg-gray-500"
                              style={{ height: 9, opacity: 0.6 }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
            
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
            @page {
                size: auto;
                margin: 0mm;
            }
            body, html, #root {
                overflow: visible !important;
                height: auto !important;
                width: auto !important;
                background-color: white !important;
                color: black !important;
                display: block !important;
            }
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
        }
      `}</style>
      {/* Navbar */}
      <div className="sticky top-0 bg-white border-b border-gray-300 px-6 py-3 flex justify-between items-center shadow-sm z-50 print:hidden">
         <div className="flex items-center space-x-4">
            <h2 className="font-bold text-gray-800 text-lg">Review Mode</h2>
            <div className="h-4 w-[1px] bg-gray-300"></div>
            <span className="text-sm text-gray-600">{title}</span>
         </div>
         <div className="flex space-x-3">
            <button 
              onClick={() => window.print()}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-bold border border-gray-300 transition-colors flex items-center"
            >
              Print
            </button>
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-bold shadow transition-colors"
            >
              Back to Editor
            </button>
         </div>
      </div>
      {/* Paper */}
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
            {Array.from({length: totalSystems}).map((_, i) => renderSystem(i))}
         </div>
         <div className="mt-20 pt-8 border-t border-gray-200 text-center text-xs text-gray-400 font-['Courier'] font-bold">
           Generated with SerTab • Tool belongs to Serum AI. All rights reserved. No commercial use.
         </div>
      </div>
    </div>
  );
};
