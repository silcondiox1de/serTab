import React from 'react';
import { InstrumentType, TimeSignatureType, TIME_SIGNATURES } from '../types';

interface ControlsProps {
  isPlaying: boolean;
  bpm: number;
  instrumentType: InstrumentType;
  timeSignature: TimeSignatureType;
  isZoomed: boolean;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  onTogglePlay: () => void;
  onBpmChange: (bpm: number) => void;
  onAddMeasure: () => void;
  onAddFourMeasures: () => void;
  onInstrumentChange: (type: InstrumentType) => void;
  onTimeSignatureChange: (ts: TimeSignatureType) => void;
  onToggleZoom: () => void;
  onOpenChordLibrary: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClearTab: () => void;
  onClearBar: () => void;
  onToggleConnection: () => void;
}

// Reusable Select Style Wrapper (Moved outside of Controls)
const SelectWrapper = ({ label, children }: { label: string, children?: React.ReactNode }) => (
    <div className="flex flex-col justify-center">
        <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">{label}</label>
        <div className="relative group">
            {children}
            {/* Custom Chevron for better UI */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 group-hover:text-gray-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>
        </div>
    </div>
);

export const Controls: React.FC<ControlsProps> = ({
  isPlaying,
  bpm,
  instrumentType,
  timeSignature,
  isZoomed,
  canUndo,
  canRedo,
  hasSelection,
  onTogglePlay,
  onBpmChange,
  onAddMeasure,
  onAddFourMeasures,
  onInstrumentChange,
  onTimeSignatureChange,
  onToggleZoom,
  onOpenChordLibrary,
  onUndo,
  onRedo,
  onClearTab,
  onClearBar,
  onToggleConnection
}) => {
  
  const tempoLabel = TIME_SIGNATURES[timeSignature].tempoBeat === 'dotted-quarter' 
    ? 'Tempo (♩.)' 
    : 'Tempo (♩)';

  return (
    <div className="w-full bg-gray-900/90 backdrop-blur-md border-b border-gray-800 p-2 z-30 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4 max-w-full px-4 py-1">
        
        {/* Left Group: Instrument, Time Sig, Tempo */}
        <div className="flex items-center gap-4">
            
            <SelectWrapper label="Instrument">
                <select 
                    value={instrumentType}
                    onChange={(e) => onInstrumentChange(e.target.value as InstrumentType)}
                    className="h-8 bg-gray-800 border border-gray-700 text-gray-200 text-xs font-medium rounded shadow-sm focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 block w-28 pl-2 pr-8 appearance-none cursor-pointer hover:bg-gray-750 transition-colors"
                >
                    <option value="guitar">Guitar</option>
                    <option value="bass">Bass</option>
                    <option value="ukulele">Ukulele</option>
                </select>
            </SelectWrapper>

            <SelectWrapper label="Time Sig">
                <select 
                    value={timeSignature}
                    onChange={(e) => onTimeSignatureChange(e.target.value as TimeSignatureType)}
                    className="h-8 bg-gray-800 border border-gray-700 text-gray-200 text-xs font-medium rounded shadow-sm focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 block w-20 pl-2 pr-8 appearance-none cursor-pointer hover:bg-gray-750 transition-colors"
                >
                    {Object.keys(TIME_SIGNATURES).map(ts => (
                        <option key={ts} value={ts}>{ts}</option>
                    ))}
                </select>
            </SelectWrapper>

            {/* Tempo Control */}
            <div className="flex flex-col justify-center">
                <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">
                  {tempoLabel}
                </label>
                <div className="relative group">
                    <input
                        type="number"
                        min="20"
                        max="500"
                        value={bpm}
                        onChange={(e) => onBpmChange(Number(e.target.value))}
                        className="h-8 bg-gray-800 border border-gray-700 text-gray-200 text-xs font-medium rounded shadow-sm focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 block w-20 px-2 appearance-none hover:bg-gray-750 transition-colors"
                    />
                </div>
            </div>
            
            <div className="h-8 w-[1px] bg-gray-800 mx-2 self-end mb-0.5"></div>

             {/* Edit Actions */}
             <div className="flex items-center space-x-1 pb-0.5 self-end">
                 <button
                    onClick={onUndo}
                    disabled={!canUndo}
                    className={`h-8 w-8 flex items-center justify-center rounded transition-colors ${!canUndo ? 'text-gray-700 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                    title="Undo (Ctrl+Z)"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                 </button>
                 <button
                    onClick={onRedo}
                    disabled={!canRedo}
                    className={`h-8 w-8 flex items-center justify-center rounded transition-colors ${!canRedo ? 'text-gray-700 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                    title="Redo (Ctrl+Y)"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                         <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                 </button>
                 <button
                    onClick={onClearBar}
                    disabled={!hasSelection}
                    className={`h-8 w-8 flex items-center justify-center rounded transition-colors ${!hasSelection ? 'text-gray-700 cursor-not-allowed' : 'text-gray-400 hover:text-red-400 hover:bg-gray-800'}`}
                    title="Clear Bar"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                 </button>
                 <button
                    onClick={onClearTab}
                    className="h-8 w-8 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-gray-800 transition-colors"
                    title="Clear Tab (Reset)"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                 </button>
             </div>
        </div>

        {/* Right Group: Actions & Play */}
        <div className="flex items-center space-x-2 self-end pb-0.5">
           <button
             onClick={onToggleConnection}
             disabled={!hasSelection}
             className={`h-8 px-3 rounded text-xs font-medium transition-colors border flex items-center shadow-sm ${!hasSelection ? 'text-gray-600 border-gray-800 cursor-not-allowed bg-gray-800/50' : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700'}`}
             title="Link/Slur (L)"
           >
              <svg width="20" height="12" viewBox="0 0 20 12" className="mr-1.5 stroke-current" fill="none">
                 <path d="M 2 10 Q 10 0 18 10" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Link
           </button>

           <button
             onClick={onOpenChordLibrary}
             className="h-8 px-3 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white border border-gray-700 rounded text-xs font-medium transition-colors flex items-center shadow-sm"
             title="Select chord names from library"
           >
             <span className="mr-1.5 text-sm">🎵</span> Chords
           </button>

           <button
             onClick={onToggleZoom}
             className={`h-8 px-3 rounded text-xs font-medium transition-colors border shadow-sm ${isZoomed ? 'bg-cyan-700/50 border-cyan-600 text-cyan-100 hover:bg-cyan-600/50' : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700'}`}
             title={isZoomed ? "Zoom Out (Fit 4 bars)" : "Zoom In (Detail view)"}
           >
             {isZoomed ? 'Zoom Out' : 'Zoom In'}
           </button>
           
           <div className="flex rounded shadow-sm">
              <button
                onClick={onAddMeasure}
                className="h-8 px-3 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white rounded-l text-xs font-medium transition-colors border border-gray-700 border-r-0"
                title="Add 1 Bar"
              >
                +1 Bar
              </button>
              <div className="w-[1px] bg-gray-700 h-8"></div>
              <button
                onClick={onAddFourMeasures}
                className="h-8 px-3 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white rounded-r text-xs font-medium transition-colors border border-gray-700 border-l-0"
                title="Add 4 Bars"
              >
                +4 Bars
              </button>
           </div>

          {/* Play Button (Relocated) */}
          <button
            onClick={onTogglePlay}
            className={`h-9 w-9 ml-3 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 border ${
              isPlaying ? 'bg-red-500/10 border-red-500 text-red-500 hover:bg-red-500/20' : 'bg-green-500/10 border-green-500 text-green-500 hover:bg-green-500/20'
            }`}
            title={isPlaying ? "Stop (Space)" : "Play from selected bar (Space)"}
          >
            {isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                <rect x="5" y="5" width="4" height="10" rx="1" />
                <rect x="11" y="5" width="4" height="10" rx="1" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 fill-current ml-0.5" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};