import React, { useState } from 'react';

interface ChordLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectChord: (chordName: string) => void;
  targetIndex: number;
}

const ROOTS = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];
const QUALITIES = [
  { label: 'Major', suffix: '' },
  { label: 'Minor', suffix: 'm' },
  { label: '5', suffix: '5' },
  { label: '7', suffix: '7' },
  { label: 'Maj7', suffix: 'maj7' },
  { label: 'm7', suffix: 'm7' },
  { label: 'sus2', suffix: 'sus2' },
  { label: 'sus4', suffix: 'sus4' },
  { label: 'dim', suffix: 'dim' },
  { label: 'aug', suffix: 'aug' },
  { label: 'add9', suffix: 'add9' },
  { label: 'm9', suffix: 'm9' },
];

export const ChordLibrary: React.FC<ChordLibraryProps> = ({ isOpen, onClose, onSelectChord, targetIndex }) => {
  const [selectedRoot, setSelectedRoot] = useState('C');
  const [selectedQuality, setSelectedQuality] = useState('');

  if (!isOpen) return null;

  const currentChordName = `${selectedRoot}${selectedQuality}`;

  const handleInsert = () => {
    onSelectChord(currentChordName);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700 flex flex-col overflow-hidden animate-bounce-in">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-cyan-900 to-blue-900 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center">
            <span className="mr-2">🎸</span> Chord Library
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          
          {/* Roots */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Root</label>
            <div className="grid grid-cols-6 gap-2">
              {ROOTS.map(root => (
                <button
                  key={root}
                  onClick={() => setSelectedRoot(root)}
                  className={`px-1 py-2 rounded text-sm font-bold transition-all ${
                    selectedRoot === root 
                      ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {root}
                </button>
              ))}
            </div>
          </div>

          {/* Qualities */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Quality</label>
            <div className="grid grid-cols-4 gap-2">
              {QUALITIES.map(q => (
                <button
                  key={q.suffix}
                  onClick={() => setSelectedQuality(q.suffix)}
                  className={`px-1 py-2 rounded text-xs font-bold transition-all ${
                    selectedQuality === q.suffix 
                      ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preview & Action */}
          <div className="bg-gray-900 rounded-xl p-4 flex items-center justify-between border border-gray-700">
             <div className="flex flex-col">
                <span className="text-xs text-gray-500 uppercase">Selected</span>
                <span className="text-3xl font-bold text-cyan-400 font-mono tracking-tight">{currentChordName}</span>
             </div>
             
             <button 
                onClick={handleInsert}
                disabled={targetIndex === -1}
                className={`px-6 py-3 rounded-lg font-bold text-white shadow-lg transition-all ${
                    targetIndex === -1 
                    ? 'bg-gray-600 cursor-not-allowed opacity-50'
                    : 'bg-cyan-500 hover:bg-cyan-400 hover:scale-105 active:scale-95'
                }`}
             >
                {targetIndex === -1 ? 'Select a column first' : 'Insert Chord'}
             </button>
          </div>

        </div>
      </div>
    </div>
  );
};