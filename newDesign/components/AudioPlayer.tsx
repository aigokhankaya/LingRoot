
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AudioContent } from './LibraryDetail';

interface AudioPlayerProps {
  content: AudioContent;
  onClose: () => void;
}

interface DialogueTurn {
  speaker: string;
  text: string;
  originalText?: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ content, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [showOriginal, setShowOriginal] = useState(false);
  const progressInterval = useRef<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const speeds = [1, 1.25, 1.5, 2];
  const brandTeal = 'hsl(172, 66%, 45%)';
  const brandOrange = 'hsl(38, 92%, 60%)';
  const brandIndigo = '#6366f1';

  const isPodcast = content.type === 'podcast';

  // Parse Dialogue for Podcast UI
  const dialogueTurns = useMemo((): DialogueTurn[] => {
    if (!isPodcast) return [];
    
    const lines = (content.transcript || "").split('\n').filter(l => l.trim().includes(':'));
    const originalLines = (content.originalTranscript || "").split('\n').filter(l => l.trim().includes(':'));
    
    return lines.map((line, idx) => {
      const parts = line.split(':');
      const speaker = parts[0].trim();
      const text = parts.slice(1).join(':').trim();
      
      let originalText = undefined;
      if (originalLines[idx]) {
        const oParts = originalLines[idx].split(':');
        originalText = oParts.slice(1).join(':').trim();
      }
      
      return { speaker, text, originalText };
    });
  }, [content, isPodcast]);

  // Determine speaker positions (First unique name is Host, others Guest)
  const hostName = dialogueTurns.length > 0 ? dialogueTurns[0].speaker : '';

  // Calculate highlighing logic
  const currentTurnIndex = useMemo(() => {
    if (progress === 0 || !isPodcast) return -1;
    const idx = Math.floor((progress / 100) * dialogueTurns.length);
    return Math.min(idx, dialogueTurns.length - 1);
  }, [progress, dialogueTurns.length, isPodcast]);

  // Auto-scroll logic for dialogue
  useEffect(() => {
    if (isPodcast && currentTurnIndex !== -1 && scrollContainerRef.current) {
      const activeElement = scrollContainerRef.current.querySelector(`[data-turn-index="${currentTurnIndex}"]`);
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentTurnIndex, isPodcast]);

  // Standard Word Highlighting logic for non-podcasts
  const activeTranscript = showOriginal 
    ? (content.originalTranscript || content.transcript || "") 
    : (content.transcript || "");

  const words = useMemo(() => {
    return activeTranscript.split(/\s+/);
  }, [activeTranscript]);

  const currentWordIndex = useMemo(() => {
    if (progress === 0 || isPodcast) return -1;
    const idx = Math.floor((progress / 100) * words.length);
    return Math.min(idx, words.length - 1);
  }, [progress, words.length, isPodcast]);

  const handleToggleSpeed = () => {
    const currentIndex = speeds.indexOf(speed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setSpeed(speeds[nextIndex]);
  };

  useEffect(() => {
    if (isPlaying) {
      progressInterval.current = window.setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return prev + (0.2 * speed); 
        });
      }, 100);
    } else {
      if (progressInterval.current) clearInterval(progressInterval.current);
    }
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [isPlaying, speed]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white animate-slide-up max-w-md mx-auto overflow-hidden">
      <div className="app-bg" />
      <div className="blob bg-teal-400 w-64 h-64 rounded-full -top-10 -right-10 opacity-10 animate-float" />
      <div className="blob bg-indigo-400 w-80 h-80 rounded-full bottom-20 -left-10 opacity-10 animate-float" style={{ animationDelay: '3s' }} />

      {/* Header */}
      <div className="px-6 pt-12 pb-4 flex items-center justify-between relative z-10">
        <button 
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center text-slate-400 bg-white/50 backdrop-blur rounded-full border border-slate-100 shadow-sm active:scale-90 transition-all shrink-0"
        >
          <span className="material-icons-round">close</span>
        </button>
        
        <div className="text-center flex-1 mx-2 overflow-hidden">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Now Playing</p>
          <h2 className="text-sm font-bold text-slate-700 truncate">{content.title}</h2>
        </div>

        <button 
          onClick={() => setShowOriginal(!showOriginal)}
          className={`w-10 h-10 flex items-center justify-center rounded-full border transition-all active:scale-90 shadow-sm shrink-0 ${
            showOriginal 
              ? 'text-white border-transparent' 
              : 'text-slate-400 bg-white/50 border-slate-100'
          }`}
          style={{ backgroundColor: showOriginal ? brandOrange : undefined }}
        >
          <span className="material-icons-round text-[20px]">{showOriginal ? 'translate' : 'language'}</span>
        </button>
      </div>

      {/* Transcript Area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto no-scrollbar px-6 py-4 relative z-10"
      >
        {isPodcast ? (
          /* Podcast Dialogue View */
          <div className="space-y-6 pb-20">
            {dialogueTurns.map((turn, idx) => {
              const isHost = turn.speaker === hostName;
              const isActive = idx === currentTurnIndex;
              
              return (
                <div 
                  key={idx} 
                  data-turn-index={idx}
                  className={`flex flex-col ${isHost ? 'items-start' : 'items-end'}`}
                >
                  <div className={`flex flex-col max-w-[85%] transition-all duration-300 ${isActive ? 'scale-[1.02]' : 'opacity-80'}`}>
                    {/* Main Bubble */}
                    <div className="flex items-end gap-2">
                       {isHost && (
                         <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500 mb-1">
                           H
                         </div>
                       )}
                       <div 
                        className={`rounded-2xl p-4 shadow-sm relative ${
                          isActive 
                            ? 'shadow-lg border-2' 
                            : 'border'
                        } ${
                          isHost 
                            ? (isActive ? 'bg-indigo-500 text-white border-indigo-600' : 'bg-white border-slate-100 text-slate-700')
                            : (isActive ? 'bg-teal-500 text-white border-teal-600' : 'bg-white border-slate-100 text-slate-700')
                        }`}
                        style={isActive ? { borderColor: isHost ? brandIndigo : brandTeal } : {}}
                      >
                        <p className={`text-sm font-bold leading-relaxed`}>{turn.text}</p>
                      </div>
                      {!isHost && (
                         <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500 mb-1">
                           G
                         </div>
                       )}
                    </div>

                    {/* Original Language Overlay (Visible next to/below if showOriginal is active) */}
                    {showOriginal && turn.originalText && (
                      <div 
                        className={`mt-2 p-3 rounded-xl bg-slate-100/80 backdrop-blur-sm border border-slate-200 shadow-inner animate-slide-up ${
                          isHost ? 'self-start ml-8' : 'self-end mr-8'
                        }`}
                      >
                        <p className="text-[12px] text-slate-500 italic leading-snug">{turn.originalText}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Standard Block Text View */
          <div className="p-4 min-h-full">
            <div 
              className="text-xl font-medium text-slate-600 leading-[2.6rem] italic" 
              style={{ textAlign: 'justify', textJustify: 'inter-word' }}
            >
              {words.length > 0 && words[0] !== "" ? (
                words.map((word, index) => (
                  <React.Fragment key={index}>
                    <span 
                      className="inline transition-colors duration-200 rounded-md px-1"
                      style={{ 
                        backgroundColor: index === currentWordIndex ? brandOrange : 'transparent',
                        color: index === currentWordIndex ? 'white' : 'inherit',
                      }}
                    >
                      {word}
                    </span>
                    {' '}
                  </React.Fragment>
                ))
              ) : (
                <p className="text-center opacity-50">No transcript available for this content.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Player Controls */}
      <div className="relative z-20 pb-12 px-6">
        <div className="bg-white/90 glass rounded-3xl p-5 border border-white/60 shadow-2xl">
          <div className="mb-6 px-1">
            <div className="flex justify-between items-center gap-3">
              <span className="text-[10px] font-bold text-slate-400 w-8">0:00</span>
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden relative">
                <div 
                  className="absolute left-0 top-0 h-full transition-all duration-300 ease-linear rounded-full"
                  style={{ 
                    width: `${progress}%`,
                    backgroundColor: brandTeal,
                    boxShadow: `0 0 10px ${brandTeal}44`
                  }}
                />
              </div>
              <span className="text-[10px] font-bold text-slate-400 w-8 text-right">{content.duration}</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <button 
              onClick={handleToggleSpeed}
              className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-600 active:scale-95 transition-all border border-slate-100"
            >
              <span className="text-xs font-black tracking-tighter">{speed}X</span>
            </button>

            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-16 h-16 flex items-center justify-center rounded-full text-white shadow-xl shadow-orange-500/30 active:scale-90 transition-all hover:scale-105"
              style={{ background: `linear-gradient(135deg, ${brandOrange}, #fbbf24)` }}
            >
              <span className="material-icons-round text-4xl">
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
            </button>

            <button className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-600 active:scale-95 transition-all border border-slate-100">
              <span className="material-icons-round text-xl">info</span>
            </button>

            <div className="flex flex-col items-center gap-0.5 min-w-[40px]">
              <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">Level</span>
              <div 
                className="px-2.5 py-1 rounded-lg text-white font-black text-[11px] shadow-sm"
                style={{ backgroundColor: brandOrange }}
              >
                {content.level}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
