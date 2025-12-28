import React from 'react';

interface PatternResult {
    id: string;
    type: string;
    text: string;
    translation: string;
    explanation: string;
    level: string;
    example_text: string;
    example_translation: string;
}

interface PatternResultsProps {
    results: PatternResult[];
}

export default function PatternResults({ results }: PatternResultsProps) {
    if (!results || results.length === 0) {
        return (
            <div className="text-center p-8 text-gray-500 bg-gray-900/50 rounded-lg border border-gray-800">
                No patterns found. Try searching for "break a leg" or "How about".
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((item) => (
                <div
                    key={item.id}
                    className="bg-gray-800 border border-gray-700 rounded-lg p-5 hover:border-indigo-500 transition-colors"
                >
                    <div className="flex justify-between items-start mb-2">
                        <span className={`text-xs px-2 py-1 rounded capitalize font-medium
              ${item.type === 'idiom' ? 'bg-purple-900 text-purple-200' :
                                item.type === 'proverb' ? 'bg-amber-900 text-amber-200' : 'bg-blue-900 text-blue-200'}
            `}>
                            {item.type}
                        </span>
                        {item.level && <span className="text-xs text-gray-400 border border-gray-600 px-1 rounded">{item.level}</span>}
                    </div>

                    <h3 className="text-lg font-bold text-white mb-1">{item.text}</h3>
                    <p className="text-indigo-300 font-medium mb-3">{item.translation}</p>

                    {item.explanation && (
                        <p className="text-sm text-gray-400 mb-4">{item.explanation}</p>
                    )}

                    {(item.example_text || item.example_translation) && (
                        <div className="bg-gray-900/60 p-3 rounded text-sm border-l-2 border-indigo-600">
                            <p className="text-gray-300 italic">"{item.example_text}"</p>
                            <p className="text-gray-500 mt-1">{item.example_translation}</p>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
