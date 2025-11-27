import React, { useState } from 'react';
import { generateTab } from '../services/geminiService';
import { TabColumn, InstrumentConfig } from '../types';

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTab: (columns: TabColumn[]) => void;
  instrument: InstrumentConfig;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ isOpen, onClose, onApplyTab, instrument }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const columns = await generateTab(prompt, instrument);
      onApplyTab(columns);
      onClose();
    } catch (e) {
      setError("Failed to generate tab. Please check your API Key or try a different prompt.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-700 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-purple-900 to-indigo-900">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <span className="mr-2">✨</span> Gemini {instrument.name} Composer
          </h2>
          <p className="text-purple-200 text-sm mt-1">Describe a riff, style, or song for {instrument.name}, and I'll write the tab.</p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">What should I create?</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`E.g., A funky groove, slow ballad intro...`}
              className="w-full h-32 bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none"
              disabled={isLoading}
            />
          </div>
          
          {error && (
            <div className="p-3 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-900 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white font-medium transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
            className={`px-6 py-2 rounded-lg font-bold text-white shadow-lg flex items-center ${
              isLoading 
                ? 'bg-gray-600 cursor-not-allowed' 
                : 'bg-purple-600 hover:bg-purple-500'
            }`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Composing...
              </>
            ) : (
              'Generate Tab'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
