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
    <div className="relative flex items-center justify-center w-full h-full border-r border-gray-700 bg-gray-900 group">
       {/* String Line Background - Highlight on Hover */}
      <div className="absolute w-full h-[1px] bg-gray-600 pointer-events-none z-0 transition-all duration-200 group-hover:bg-cyan-400 group-hover:h-[2px] group-hover:shadow-[0_0_8px_rgba(34,211,238,0.6)]"></div>
      
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
        className={`relative z-10 w-full h-full text-center bg-transparent border-0 focus:ring-0 focus:outline-none font-mono text-sm transition-colors
          ${note === -1 ? 'text-gray-500 placeholder-transparent' : 'text-cyan-400 font-bold'}
          ${isActive ? 'bg-gray-800 rounded-sm' : ''}
        `}
      />
    </div>
  );
};