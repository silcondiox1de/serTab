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

// Reusable Select Style Wrapper
const SelectWrapper = ({ label, children }: { label: string, children?: React.ReactNode }) => (
    <div className="flex flex-col justify-center">
        <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1 px-1">{label}</label>
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

const Group = ({ children, className = "" }: { children?: React.ReactNode, className?: string }) => (
    <div className={`bg-gray-800/40 backdrop-blur-sm border border-white/5 rounded-xl p-1.5 flex items-center gap-2 shadow-sm ${className}`}>
        {children}
    </div>
);

const Divider = () => <div className="w-[1px] h-6 bg-white/10 mx-1"></div>;

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
    <div className="w-full flex justify-between items-center z-30">
        <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
            
            {/* Settings Group */}
            <Group>
                <SelectWrapper label="Instrument">
                    <select 
                        value={instrumentType}
                        onChange={(e) => onInstrumentChange(e.target.value as InstrumentType)}
                        className="h-8 bg-gray-900/50 border border-gray-700/50 text-gray-300 text-xs font-bold rounded-lg shadow-inner focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 block w-28 pl-2.5 pr-8 appearance-none cursor-pointer hover:bg-gray-800 transition-colors"
                    >
                        <option value="guitar">Guitar</option>
                        <option value="bass">Bass</option>
                        <option value="ukulele">Ukulele</option>
                    </select>
                </SelectWrapper>

                <SelectWrapper label="Sig">
                    <select 
                        value={timeSignature}
                        onChange={(e) => onTimeSignatureChange(e.target.value as TimeSignatureType)}
                        className="h-8 bg-gray-900/50 border border-gray-700/50 text-gray-300 text-xs font-bold rounded-lg shadow-inner focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 block w-16 pl-2.5 pr-6 appearance-none cursor-pointer hover:bg-gray-800 transition-colors"
                    >
                        {Object.keys(TIME_SIGNATURES).map(ts => (
                            <option key={ts} value={ts}>{ts}</option>
                        ))}
                    </select>
                </SelectWrapper>

                <div className="flex flex-col justify-center">
                    <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1 px-1">{tempoLabel}</label>
                    <input
                        type="number"
                        min="20"
                        max="500"
                        value={bpm}
                        onChange={(e) => onBpmChange(Number(e.target.value))}
                        className="h-8 bg-gray-900/50 border border-gray-700/50 text-gray-300 text-xs font-bold rounded-lg shadow-inner focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 block w-16 px-2.5 hover:bg-gray-800 transition-colors"
                    />
                </div>
            </Group>

            {/* History Group */}
            <Group>
                 <button
                    onClick={onUndo}
                    disabled={!canUndo}
                    className={`h-8 w-8 flex items-center justify-center rounded-lg transition-all active:scale-95 ${!canUndo ? 'text-gray-700 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                    title="Undo (Ctrl+Z)"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                 </button>
                 <button
                    onClick={onRedo}
                    disabled={!canRedo}
                    className={`h-8 w-8 flex items-center justify-center rounded-lg transition-all active:scale-95 ${!canRedo ? 'text-gray-700 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                    title="Redo (Ctrl+Y)"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                         <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                 </button>
                 <Divider />
                 <button
                    onClick={onClearBar}
                    disabled={!hasSelection}
                    className={`h-8 w-8 flex items-center justify-center rounded-lg transition-all active:scale-95 ${!hasSelection ? 'text-gray-700 cursor-not-allowed' : 'text-gray-400 hover:text-red-400 hover:bg-white/10'}`}
                    title="Clear Selected Bar"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                 </button>
                 <button
                    onClick={onClearTab}
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-white/10 transition-all active:scale-95"
                    title="Reset All"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                 </button>
            </Group>

            {/* Tools Group */}
            <Group>
                <button
                    onClick={onToggleConnection}
                    disabled={!hasSelection}
                    className={`h-8 px-3 rounded-lg text-xs font-bold transition-all border border-transparent flex items-center gap-1.5 active:scale-95 ${!hasSelection ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                    title="Link/Slur (L)"
                >
                    <svg width="16" height="10" viewBox="0 0 20 12" className="stroke-current" fill="none">
                        <path d="M 2 10 Q 10 0 18 10" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                    Link
                </button>
                <button
                    onClick={onOpenChordLibrary}
                    className="h-8 px-3 rounded-lg text-xs font-bold text-gray-300 hover:text-white hover:bg-white/10 transition-all border border-transparent flex items-center gap-1.5 active:scale-95"
                >
                    <span>🎵</span> Chords
                </button>
                <Divider />
                <button
                    onClick={onToggleZoom}
                    className={`h-8 px-3 rounded-lg text-xs font-bold transition-all border border-transparent flex items-center gap-1.5 active:scale-95 ${isZoomed ? 'bg-cyan-500/10 text-cyan-400' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        {isZoomed ? (
                            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                        ) : (
                            <path d="M15 3h6v6M14 10l6.1-6.1M9 21H3v-6M10 14l-6.1 6.1"/>
                        )}
                    </svg>
                    {isZoomed ? 'Zoom Out' : 'Zoom In'}
                </button>
            </Group>

            {/* Structure Group */}
            <Group>
              <button
                onClick={onAddMeasure}
                className="h-8 px-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg text-xs font-bold transition-all active:scale-95"
                title="Add 1 Bar"
              >
                +1 Bar
              </button>
              <button
                onClick={onAddFourMeasures}
                className="h-8 px-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg text-xs font-bold transition-all active:scale-95"
                title="Add 4 Bars"
              >
                +4 Bars
              </button>
            </Group>

        </div>

        {/* Playback (Right Side) */}
        <div>
          <button
            onClick={onTogglePlay}
            className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-xl transition-all active:scale-95 border hover:scale-105 ${
              isPlaying 
                ? 'bg-red-500 text-white border-red-400 shadow-red-500/20' 
                : 'bg-green-500 text-white border-green-400 shadow-green-500/20'
            }`}
            title={isPlaying ? "Stop (Space)" : "Play from selected bar (Space)"}
          >
            {isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current" viewBox="0 0 20 20">
                <rect x="5" y="5" width="4" height="10" rx="1" />
                <rect x="11" y="5" width="4" height="10" rx="1" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 fill-current ml-1" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            )}
          </button>
        </div>
    </div>
  );
};