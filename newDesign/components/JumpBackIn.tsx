
import React from 'react';
import { Book } from '../types';

const RECENT_ITEMS: Book[] = [
  {
    id: '1',
    title: 'The Great Gatsby',
    level: 'B2',
    progress: 'Ch. 4',
    type: 'Text',
    icon: 'history_edu',
    color: 'orange'
  },
  {
    id: '2',
    title: 'Spanish Short Stories',
    level: 'A2',
    progress: '5:13',
    type: 'Audio',
    icon: 'graphic_eq',
    color: 'blue'
  }
];

const JumpBackIn: React.FC = () => {
  return (
    <div>
      <h2 className="text-xl font-extrabold text-slate-800 mb-4">Jump Back In</h2>
      <div className="flex overflow-x-auto no-scrollbar gap-4 pb-4 -mx-1 px-1">
        {RECENT_ITEMS.map((item) => (
          <div 
            key={item.id}
            className="flex-shrink-0 w-64 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3 active:scale-95 transition-transform cursor-pointer hover:border-indigo-100"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 
              ${item.color === 'orange' ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'}`}
            >
              <span className="material-icons-round">{item.icon}</span>
            </div>
            <div className="overflow-hidden">
              <h4 className="font-bold text-sm truncate text-slate-900">{item.title}</h4>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-extrabold text-white px-1.5 py-0.5 rounded 
                  ${item.color === 'orange' ? 'bg-orange-500' : 'bg-blue-500'}`}
                >
                  {item.level}
                </span>
                <span className="text-xs text-slate-500">{item.progress} • {item.type}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JumpBackIn;
