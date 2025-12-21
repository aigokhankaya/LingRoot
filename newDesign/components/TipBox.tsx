
import React from 'react';

const TipBox: React.FC = () => {
  return (
    <div className="relative overflow-hidden rounded-3xl p-6 bg-amber-50 border border-amber-100">
      <div className="flex items-start gap-4 relative z-10">
        <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 mt-1 flex-shrink-0">
          <span className="material-icons-round">lightbulb</span>
        </div>
        <div>
          <h3 className="font-bold text-slate-900 mb-1">Reading Tip</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Tap on any word while reading to get an instant translation and save it to your vocabulary list.
          </p>
        </div>
      </div>
      <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-amber-500/5 rounded-full" />
    </div>
  );
};

export default TipBox;
