
import React from 'react';

interface HeaderProps {
  username: string;
  audioCreated: number;
  minutesContent: number;
}

const Header: React.FC<HeaderProps> = ({ username, audioCreated, minutesContent }) => {
  const brandTeal = 'hsl(172, 66%, 45%)';
  const brandOrange = 'hsl(38, 92%, 60%)';

  return (
    <header className="px-6 pt-12 pb-4 flex justify-between items-center animate-slide-up">
      <div className="flex flex-col">
        <p className="text-lg font-semibold text-slate-500 mb-0.5">Good Evening,</p>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          {username}
        </h1>
      </div>
      
      <div className="flex gap-2">
        {/* Audio Created Card */}
        <div 
          className="bg-white px-3 py-2 rounded-2xl border shadow-sm flex flex-col items-center justify-center min-w-[75px]"
          style={{ borderColor: brandTeal }}
        >
          <span 
            className="text-xl font-extrabold leading-none mb-1"
            style={{ color: brandOrange }}
          >
            {audioCreated}
          </span>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight text-center leading-tight">
            Audio<br/>Created
          </span>
        </div>

        {/* Minutes Content Card */}
        <div 
          className="bg-white px-3 py-2 rounded-2xl border shadow-sm flex flex-col items-center justify-center min-w-[75px]"
          style={{ borderColor: brandTeal }}
        >
          <span 
            className="text-xl font-extrabold leading-none mb-1"
            style={{ color: brandOrange }}
          >
            {minutesContent}
          </span>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight text-center leading-tight">
            Minutes<br/>Content
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
