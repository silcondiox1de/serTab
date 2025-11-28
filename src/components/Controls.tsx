import React from 'react';
import { InstrumentType, TimeSignatureType, TIME_SIGNATURES } from '../types';

interface ControlsProps {
  // We keep the props definition mainly to avoid breaking the parent, 
  // even if some aren't used in this specific file anymore.
  isPlaying: boolean;
  bpm: number;
  instrumentType: InstrumentType;
  timeSignature: TimeSignatureType;
  isZoomed: boolean;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  onTogglePlay: () => void;
  onPlayFromStart: () => void;
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
  onOptimize: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

const SelectWrapper = ({ label, children }: { label: string, children?: React.ReactNode }) => (
    <div className="flex flex-col justify-center">
        <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1 px-1">{label}</label>
        <div className="relative group">
            {children}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 group-hover:text-gray-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>
        </div>
    </div>
);

const Group = ({ children, className = "" }: { children?: React.ReactNode, className?: string }) => (
    <div className={`bg-gray-800/40 backdrop-blur-sm border border-white/5 rounded-xl p-1.5 flex items-center gap-2 shadow-sm flex-shrink-0 ${className}`}>
        {children}
    </div>
);

const Divider = () => <div className="w-[1px] h-6 bg-white/10 mx-1"></div>;

export const Controls: React.FC<ControlsProps> = ({
  bpm,
  instrumentType,
  timeSignature,
  isZoomed,
  hasSelection,
  onBpmChange,
  onAddMeasure,
  onAddFourMeasures,
  onInstrumentChange,
  onTimeSignatureChange,
  onToggleZoom,
  onOpenChordLibrary,
  onToggleConnection,
  onOptimize,
  onGenerate,
  isGenerating
}) => {
  
  const tempoLabel = TIME_SIGNATURES[timeSignature].tempoBeat === 'dotted-quarter' 
    ? 'Tempo (♩.)' 
    : 'Tempo (♩)';

  return (
    <div className="w-full flex items-center z-30 justify-center">
        
        {/* CENTERED SCROLLABLE TOOLBAR */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            
            {/* 1. Settings Group */}
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

            {/* 2. SERUM LAB GROUP (AI Tools) */}
            <Group className="border-purple-500/30 bg-purple-900/10">
                <div className="flex flex-col justify-center px-1">
                    <span className="text-[9px] text-purple-400 font-bold uppercase tracking-widest leading-none">Serum Lab</span>
                </div>
                <button onClick={onOptimize} className="h-8 px-3 rounded-lg text-xs font-bold text-purple-200 hover:text-white hover:bg-purple-500/20 transition-all border border-transparent flex items-center gap-1.5 active:scale-95" title="Optimize Fingering">
                    <span>✨</span> Fix
                </button>
                <div className="w-[1px] h-6 bg-purple-500/20 mx-1"></div>
                <button onClick={onGenerate} disabled={isGenerating} className={`h-8 px-3 rounded-lg text-xs font-bold transition-all border border-transparent flex items-center gap-1.5 active:scale-95 ${isGenerating ? 'text-purple-400/50 cursor-wait' : 'text-purple-200 hover:text-white hover:bg-purple-500/20'}`} title="Generate Riff">
                    {isGenerating ? (<svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>) : (<span>🔮</span>)} Generate
                </button>
            </Group>

            {/* 3. Helpers Group (Chords + Zoom + Link) */}
            <Group>
                <button onClick={onOpenChordLibrary} className="h-8 px-3 rounded-lg text-xs font-bold text-gray-300 hover:text-white hover:bg-white/10 transition-all border border-transparent flex items-center gap-1.5 active:scale-95"><span>🎵</span> Chords</button>
                <Divider />
                <button onClick={onToggleZoom} className={`h-8 px-3 rounded-lg text-xs font-bold transition-all border border-transparent flex items-center gap-1.5 active:scale-95 ${isZoomed ? 'bg-cyan-500/10 text-cyan-400' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg> {isZoomed ? 'Zoom Out' : 'Zoom In'}
                </button>
                <button onClick={onToggleConnection} disabled={!hasSelection} className={`h-8 px-3 rounded-lg text-xs font-bold transition-all border border-transparent flex items-center gap-1.5 active:scale-95 ${!hasSelection ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 hover:text-white hover:bg-white/10'}`} title="Link/Slur (L)">
                    <svg width="16" height="10" viewBox="0 0 20 12" className="stroke-current" fill="none"><path d="M 2 10 Q 10 0 18 10" strokeWidth="2.5" strokeLinecap="round" /></svg> Link
                </button>
            </Group>

            {/* 4. Structure Group (+1 Bar, +4 Bars) */}
            <Group>
              <button onClick={onAddMeasure} className="h-8 px-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg text-xs font-bold transition-all active:scale-95" title="Add 1 Bar">+1 Bar</button>
              <button onClick={onAddFourMeasures} className="h-8 px-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg text-xs font-bold transition-all active:scale-95" title="Add 4 Bars">+4 Bars</button>
            </Group>

        </div>
    </div>
  );
};
