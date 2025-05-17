import React from 'react';

type LanguageLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

interface CaptionsProps {
  text: string;
  level?: LanguageLevel;
}

export default function Captions({ text, level }: CaptionsProps) {
  // If no text is provided, return null
  if (!text) return null;

  // Determine the background color based on the level
  const getLevelColor = (): string => {
    switch (level) {
      case 'A1':
        return 'bg-green-50 border-green-200';
      case 'A2':
        return 'bg-emerald-50 border-emerald-200';
      case 'B1':
        return 'bg-blue-50 border-blue-200';
      case 'B2':
        return 'bg-indigo-50 border-indigo-200';
      case 'C1':
        return 'bg-purple-50 border-purple-200';
      case 'C2':
        return 'bg-violet-50 border-violet-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  // Determine the text color based on the level
  const getLevelTextColor = (): string => {
    switch (level) {
      case 'A1':
        return 'text-green-800';
      case 'A2':
        return 'text-emerald-800';
      case 'B1':
        return 'text-blue-800';
      case 'B2':
        return 'text-indigo-800';
      case 'C1':
        return 'text-purple-800';
      case 'C2':
        return 'text-violet-800';
      default:
        return 'text-gray-800';
    }
  };

  return (
    <div className={`w-full rounded-lg p-4 border ${getLevelColor()} mb-4`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className={`text-sm font-medium ${getLevelTextColor()}`}>
          English Level: {level || 'Not specified'}
        </h3>
        <div className="flex space-x-2">
          <button 
            className="text-gray-500 hover:text-gray-700"
            title="Copy text"
            onClick={() => navigator.clipboard.writeText(text)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
              <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
            </svg>
          </button>
        </div>
      </div>
      <div className="prose prose-sm max-w-none">
        <p className="text-gray-700 whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  );
} 