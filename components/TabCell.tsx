import React, { useRef, useEffect } from 'react';
import { Note } from '../types';

interface TabCellProps {
  note: Note;
  stringIndex: number;
  columnIndex: number;
  isActive: boolean;
  onUpdate: (val: Note) => void;
  onFocus: () => void;
  onNavigate: (direction: 'up' | 'down' | 'left' | 'right') => void;
}

export const TabCell: React.FC<TabCellProps> = ({
  note,
  stringIndex,
  columnIndex,
  isActive,
  onUpdate,
  onFocus,
  onNavigate
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus if this cell becomes active (via keyboard nav from parent)
  useEffect(() => {
    if (isActive && inputRef.current) {
        inputRef.current.focus();
    }
  }, [isActive]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      onNavigate('up');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      onNavigate('down');
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onNavigate('left');
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onNavigate('right');
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      onUpdate(-1);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      onUpdate(-1);
      return;
    }

    if (val.toLowerCase() === 'x') {
      onUpdate('x');
      return;
    }
    
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 0 && num <= 24) {
      onUpdate(num);
    }
  };

  return (
    <div className="relative flex items-center justify-center w-full h-full group z-10">
      
      {/* Interaction Layer */}
      <div 
         className={`absolute inset-0 transition-all duration-150 rounded-sm
            ${isActive ? 'bg-cyan-500/20 ring-1 ring-cyan-500/50 shadow-[0_0_10px_rgba(34,211,238,0.1)]' : 'hover:bg-white/5'}
         `}
      ></div>

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        autoComplete="off"
        value={note === -1 ? '' : note}
        onClick={onFocus}
        onFocus={onFocus}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={`relative z-20 w-full h-full text-center bg-transparent border-0 focus:ring-0 focus:outline-none font-mono text-sm transition-all
          ${note === -1 ? 'text-transparent' : 'text-cyan-400 font-bold scale-110 drop-shadow-sm'}
        `}
      />
    </div>
  );
};