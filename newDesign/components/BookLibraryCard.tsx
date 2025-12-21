
import React from 'react';

interface BookLibraryCardProps {
  onClick?: () => void;
}

const BookLibraryCard: React.FC<BookLibraryCardProps> = ({ onClick }) => {
  const brandTeal = 'hsl(172, 66%, 45%)';

  return (
    <div 
      onClick={onClick}
      className="group relative overflow-hidden rounded-3xl p-6 bg-white/80 glass text-slate-900 shadow-glass hover:shadow-xl transition-all duration-500 cursor-pointer border border-white/50 border-l-[6px] border-l-indigo-500"
    >
      <div className="absolute right-0 bottom-0 h-full w-2/3 bg-gradient-to-l from-indigo-50/20 to-transparent pointer-events-none" />
      <div className="absolute -left-6 -top-6 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl" />
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-3 border border-indigo-100 shadow-sm transition-transform group-hover:scale-110">
              <span className="material-icons-round text-2xl text-indigo-500">local_library</span>
            </div>
            <h3 className="font-extrabold text-xl mb-1 text-slate-800">Book Library</h3>
            <p className="text-slate-500 text-sm mb-4">Immersive reading & listening</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
            <span className="material-icons-round text-indigo-400 text-sm">auto_stories</span>
          </div>
        </div>

        {/* 3D Book Illustration Container */}
        <div className="relative h-44 mt-4 flex items-center justify-center w-full" style={{ perspective: '1000px' }}>
          {/* Left Book */}
          <div 
            className="absolute w-20 h-28 rounded-md bg-gradient-to-r from-orange-600 to-orange-500 shadow-xl opacity-90 transition-transform duration-700 group-hover:translate-x-[-70px]" 
            style={{ transform: 'translateX(-50px) translateZ(-60px) rotateY(-25deg)', borderLeft: '4px solid rgba(255,255,255,0.1)' }}
          >
            <div className="absolute right-2 top-4 w-12 h-1 bg-white/20 rounded-full" />
            <div className="absolute right-2 top-6 w-8 h-1 bg-white/10 rounded-full" />
          </div>
          
          {/* Right Book */}
          <div 
            className="absolute w-20 h-28 rounded-md bg-gradient-to-r from-teal-700 to-teal-600 shadow-xl opacity-90 transition-transform duration-700 group-hover:translate-x-[70px]" 
            style={{ transform: 'translateX(50px) translateZ(-60px) rotateY(25deg)', borderLeft: '4px solid rgba(255,255,255,0.1)' }}
          >
            <div className="absolute right-2 top-4 w-12 h-1 bg-white/20 rounded-full" />
            <div className="absolute right-2 top-6 w-8 h-1 bg-white/10 rounded-full" />
          </div>
          
          {/* Center Book */}
          <div 
            className="relative w-28 h-36 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#4f46e5] shadow-2xl z-20 flex flex-col items-center justify-center border-l-4 border-white/20 group-hover:scale-105 transition-transform duration-500 ease-out animate-soft-float" 
            style={{ transform: 'translateZ(20px)' }}
          >
            <div className="w-20 h-24 border border-white/20 rounded-sm flex flex-col items-center justify-center p-2 bg-black/10 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent" />
              <span className="material-icons-round text-white text-4xl mb-1 relative z-10">school</span>
              <div className="w-12 h-0.5 bg-white/40 mt-1 relative z-10" />
              <div className="w-8 h-0.5 bg-white/30 mt-1 relative z-10" />
            </div>
            <div className="absolute bottom-3 text-[9px] font-bold tracking-[0.2em] uppercase text-white/60">LingRoot</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookLibraryCard;
