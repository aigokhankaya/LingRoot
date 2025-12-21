
import React from 'react';

const LiroBanner: React.FC = () => {
  const brandTeal = 'hsl(172, 66%, 45%)';
  const brandTealLight = 'hsla(172, 66%, 45%, 0.1)';

  return (
    <div className="bg-white/70 glass rounded-3xl p-6 shadow-glass relative overflow-hidden group border border-white/50">
      <div 
        className="absolute right-[-20px] top-[-20px] w-32 h-32 rounded-full blur-3xl animate-pulse" 
        style={{ backgroundColor: brandTealLight }}
      />
      
      <div className="flex items-center gap-4 relative z-10">
        <div className="relative">
          {/* Icon Container */}
          <div 
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg relative overflow-hidden transition-colors"
            style={{ 
              backgroundColor: brandTeal,
              boxShadow: `0 10px 15px -3px hsla(172, 66%, 45%, 0.2)`
            }}
          >
            
            {/* Pulsing Sound Waves behind the robot */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-8 h-8 rounded-full border border-white/40 animate-sound-wave" />
              <div className="w-8 h-8 rounded-full border border-white/40 animate-sound-wave" style={{ animationDelay: '0.6s' }} />
              <div className="w-8 h-8 rounded-full border border-white/40 animate-sound-wave" style={{ animationDelay: '1.2s' }} />
            </div>

            {/* Custom Robot Head with Headphones */}
            <div className="relative flex items-center justify-center">
              {/* Headphone Band */}
              <div className="absolute -top-1 w-7 h-5 border-t-2 border-l-2 border-r-2 border-white/80 rounded-t-full" />
              
              {/* Robot Head Icon */}
              <span className="material-icons-round text-white text-3xl relative z-10">smart_toy</span>
              
              {/* Headphone Cups */}
              <div className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1.5 h-4 bg-white/90 rounded-sm shadow-sm z-20" />
              <div className="absolute -right-0.5 top-1/2 -translate-y-1/2 w-1.5 h-4 bg-white/90 rounded-sm shadow-sm z-20" />
            </div>
          </div>

          {/* Status Indicator */}
          <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
            <span 
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: brandTeal }}
            ></span>
            <span 
              className="relative inline-flex rounded-full h-3 w-3 border-2 border-white"
              style={{ backgroundColor: brandTeal }}
            ></span>
          </span>
        </div>
        
        <div className="flex-1">
          <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
            Liro AI
            <span 
              className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold"
              style={{ backgroundColor: brandTealLight, color: brandTeal }}
            >
              Ready
            </span>
          </h3>
          <p className="text-sm text-slate-500 leading-snug">Continue reading "The Little Prince"?</p>
        </div>
        
        <button 
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm transition-all transform hover:scale-105 active:scale-95"
          style={{ color: brandTeal }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = brandTeal;
            e.currentTarget.style.color = 'white';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
            e.currentTarget.style.color = brandTeal;
          }}
        >
          <span className="material-icons-round">play_arrow</span>
        </button>
      </div>
    </div>
  );
};

export default LiroBanner;
