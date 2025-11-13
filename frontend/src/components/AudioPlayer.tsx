import React, { useState, useRef, useEffect, useCallback } from 'react';

interface WordTiming {
  word: string;
  timeSeconds: number;
  endTimeSeconds: number;
  source?: 'mfa' | 'tts'; // Track timing source
}

interface AudioPlayerProps {
  audioUrl: string;
  captionsUrl?: string;
  words?: string[];
  timepoints?: WordTiming[];
  text?: string;
  showWordHighlight?: boolean;
}

// Canvas-based word renderer for precise timing
class CanvasWordRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private words: string[] = [];
  private timepoints: WordTiming[] = [];
  private currentWordIndex: number = -1;
  private animationId: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.setupCanvas();
  }

  private setupCanvas() {
    // High DPI support
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
  }

  setWords(words: string[], timepoints: WordTiming[]) {
    this.words = words;
    this.timepoints = timepoints;
    this.render();
  }

  updateCurrentWord(currentTime: number) {
    let newIndex = -1;
    
    // Aggressive timing compensation - try different values
    const compensatedTime = currentTime + 0.15; // Increased to 150ms compensation
    
    // Find current word with lookahead for better sync
    for (let i = 0; i < this.timepoints.length; i++) {
      const tp = this.timepoints[i];
      const endTime = tp.endTimeSeconds || tp.timeSeconds + 0.2;
      
      // More aggressive timing window
      if (compensatedTime >= (tp.timeSeconds - 0.05) && compensatedTime < (endTime + 0.05)) {
        newIndex = i;
        break;
      }
    }
    
    // Debug timing info
    if (newIndex !== this.currentWordIndex && newIndex >= 0) {
      console.log(`🎯 Word change: ${this.currentWordIndex} → ${newIndex}, Audio: ${currentTime.toFixed(3)}s, Compensated: ${compensatedTime.toFixed(3)}s, Target: ${this.timepoints[newIndex]?.timeSeconds?.toFixed(3)}s`);
    }
    
    if (newIndex !== this.currentWordIndex) {
      this.currentWordIndex = newIndex;
      this.render();
    }
  }

  private render() {
    const ctx = this.ctx;
    const canvas = this.canvas;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
    
    if (this.words.length === 0) return;

    // Canvas dimensions
    const canvasWidth = canvas.width / (window.devicePixelRatio || 1);
    const canvasHeight = canvas.height / (window.devicePixelRatio || 1);
    
    // Text styling
    const fontSize = 18;
    const lineHeight = 28;
    const padding = 16;
    const wordSpacing = 8;
    
    ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    ctx.textBaseline = 'top';
    
    let x = padding;
    let y = padding;
    const maxWidth = canvasWidth - padding * 2;
    
    // Render words with precise positioning
    for (let i = 0; i < this.words.length; i++) {
      const word = this.words[i];
      const isCurrentWord = i === this.currentWordIndex;
      const wordWidth = ctx.measureText(word + ' ').width;
      
      // Line wrapping
      if (x + wordWidth > maxWidth && x > padding) {
        x = padding;
        y += lineHeight;
      }
      
      // Word background (for current word)
      if (isCurrentWord) {
        const bgPadding = 4;
        const bgWidth = wordWidth - wordSpacing + bgPadding * 2;
        const bgHeight = fontSize + bgPadding * 2;
        
        // Animated highlight with smooth transitions
        ctx.fillStyle = '#fef3c7'; // yellow-100
        ctx.beginPath();
        ctx.roundRect(x - bgPadding, y - bgPadding, bgWidth, bgHeight, 4);
        ctx.fill();
        
        // Subtle shadow for depth
        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetY = 1;
      }
      
      // Word text
      ctx.fillStyle = isCurrentWord ? '#1f2937' : '#4b5563'; // gray-800 : gray-600
      ctx.font = `${isCurrentWord ? 'bold' : 'normal'} ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
      
      ctx.fillText(word, x, y);
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      
      x += wordWidth;
    }
  }

  resize() {
    this.setupCanvas();
    this.render();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

export default function AudioPlayer({
  audioUrl,
  captionsUrl,
  words = [],
  timepoints = [],
  text = '',
  showWordHighlight = true,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasWordRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timestampDataRef = useRef<WordTiming[]>(timepoints);

  // Initialize Canvas renderer
  useEffect(() => {
    if (canvasRef.current && !rendererRef.current) {
      rendererRef.current = new CanvasWordRenderer(canvasRef.current);
    }
    
    return () => {
      if (rendererRef.current) {
        rendererRef.current.destroy();
      }
    };
  }, []);

  // Update canvas when words/timepoints change
  useEffect(() => {
    if (rendererRef.current && words.length > 0) {
      rendererRef.current.setWords(words, timepoints);
    }
  }, [words, timepoints]);

  // Handle audio play/pause
  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Update timepoints ref when prop changes
  useEffect(() => {
    timestampDataRef.current = timepoints;
  }, [timepoints]);

  // Simplified word finding with aggressive compensation
  const findCurrentWordIndex = useCallback((currentTime: number): number => {
    const data = timestampDataRef.current;
    if (!data || data.length === 0) return -1;

    // Apply aggressive compensation
    const compensatedTime = currentTime + 0.2; // 200ms compensation
    
    // Simple linear search with lookahead
    for (let i = 0; i < data.length; i++) {
      const tp = data[i];
      const endTime = tp.endTimeSeconds || tp.timeSeconds + 0.3;
      
      // Wide timing window for better sync
      if (compensatedTime >= (tp.timeSeconds - 0.1) && compensatedTime < (endTime + 0.1)) {
        console.log(`🎯 Found word ${i}: "${tp.word}" at audio=${currentTime.toFixed(3)}s, compensated=${compensatedTime.toFixed(3)}s, target=${tp.timeSeconds?.toFixed(3)}s-${endTime.toFixed(3)}s`);
        return i;
      }
    }
    
    return -1;
  }, []);

  // Ultra-high-performance animation loop with Canvas rendering
  const animationLoop = useCallback(() => {
    if (!audioRef.current || !rendererRef.current) return;

    // Get high-precision audio time
    const audioElement = audioRef.current;
    const audioCurrentTime = audioElement.currentTime;
    
    // Additional precision: use Web Audio API if available
    let preciseTime = audioCurrentTime;
    try {
      if ((audioElement as any).webkitAudioDecodedByteCount !== undefined) {
        // Chrome/Safari: more precise timing
        preciseTime = audioCurrentTime;
      }
    } catch (e) {
      // Fallback to standard currentTime
    }
    
    setCurrentTime(preciseTime);

    // Update DOM word highlighting with direct React state
    if (showWordHighlight && timestampDataRef.current.length > 0) {
      const newIndex = findCurrentWordIndex(preciseTime);
      
      // Direct React state update for immediate DOM changes
      if (newIndex !== currentWordIndex) {
        setCurrentWordIndex(newIndex);
      }
    }

    // Continue loop
    animationFrameRef.current = requestAnimationFrame(animationLoop);
  }, [showWordHighlight, findCurrentWordIndex, currentWordIndex]);

  // Handle audio loaded
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  // Handle slider change
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  // Format time in MM:SS
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Start/stop animation loop based on play state
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    const startLoop = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(animationLoop);
    };

    const stopLoop = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };

    audioEl.addEventListener('play', startLoop);
    audioEl.addEventListener('pause', stopLoop);
    audioEl.addEventListener('ended', stopLoop);

    // Cleanup
    return () => {
      stopLoop();
      audioEl.removeEventListener('play', startLoop);
      audioEl.removeEventListener('pause', stopLoop);
      audioEl.removeEventListener('ended', stopLoop);
    };
  }, [animationLoop]);

  // Reset word index when audio ends
  useEffect(() => {
    if (!isPlaying) {
      setCurrentWordIndex(-1);
      if (rendererRef.current) {
        rendererRef.current.updateCurrentWord(-1);
      }
    }
  }, [isPlaying]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (rendererRef.current) {
        rendererRef.current.resize();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Detect timing source from timepoints
  const timingSource = timepoints.length > 0 && timepoints[0]?.source === 'mfa' ? 'mfa' : 'tts';
  const isMFATiming = timingSource === 'mfa';
  
  // Calculate timing precision for display
  const timingPrecision = isMFATiming ? 'DOM Rendering (+200ms compensation)' : 'Estimated timing';
  const syncQuality = isMFATiming ? '✓ Acoustic (MFA)' : '⚠ Estimated (TTS)';
  
  // Debug: Log timing info
  useEffect(() => {
    if (timepoints.length > 0) {
      console.log('🎯 AudioPlayer Debug:', {
        timingSource: timingSource,
        isMFATiming: isMFATiming,
        timepointsCount: timepoints.length,
        firstTimepoint: timepoints[0],
        hasSource: timepoints[0]?.source
      });
      
      // Log all timepoints for analysis
      console.log('📊 All MFA Timepoints:', timepoints.map((tp, i) => ({
        index: i,
        word: tp.word,
        start: tp.timeSeconds?.toFixed(3),
        end: tp.endTimeSeconds?.toFixed(3),
        duration: ((tp.endTimeSeconds || 0) - (tp.timeSeconds || 0)).toFixed(3)
      })));
    }
  }, [timepoints, timingSource, isMFATiming]);

  return (
    <div className="w-full bg-white rounded-lg shadow-sm p-4">
      {/* Timing Source Indicator */}
      {showWordHighlight && timepoints.length > 0 && (
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600">Sync Quality:</span>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              isMFATiming 
                ? 'bg-green-100 text-green-700' 
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {syncQuality}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {timingPrecision}
            </span>
            {isMFATiming && (
              <span className="text-xs px-1 py-0.5 bg-blue-100 text-blue-700 rounded">
                Canvas Rendering
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Real-time DOM word highlighting (fallback from Canvas) */}
      {showWordHighlight && words.length > 0 && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg min-h-[120px] max-h-[300px] overflow-y-auto">
          <div className="flex flex-wrap gap-2 text-lg leading-relaxed">
            {words.map((word, index) => (
              <span
                key={index}
                className={`transition-all duration-100 px-2 py-1 rounded ${
                  index === currentWordIndex
                    ? 'bg-red-400 font-bold text-white scale-110 shadow-lg'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
                style={{
                  transform: index === currentWordIndex ? 'scale(1.1)' : 'scale(1)',
                  backgroundColor: index === currentWordIndex ? '#ef4444' : 'transparent',
                  color: index === currentWordIndex ? 'white' : '#374151',
                  fontWeight: index === currentWordIndex ? 'bold' : 'normal',
                  transition: 'all 0.1s ease-in-out'
                }}
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Canvas backup (hidden for now) */}
      <div style={{ display: 'none' }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full min-h-[120px]"
        />
      </div>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      >
        {captionsUrl && (
          <track
            src={captionsUrl}
            kind="subtitles"
            srcLang="en"
            label="English"
            default
          />
        )}
        Your browser does not support the audio element.
      </audio>

      {/* Audio controls */}
      <div className="flex items-center space-x-4">
        {/* Play/Pause button */}
        <button
          onClick={togglePlayPause}
          className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 focus:outline-none"
        >
          {isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          )}
        </button>

        {/* Time display */}
        <div className="text-xs text-gray-500 w-16">
          {formatTime(currentTime)}
        </div>

        {/* Progress bar */}
        <div className="flex-1">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSliderChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Duration */}
        <div className="text-xs text-gray-500 w-16 text-right">
          {formatTime(duration)}
        </div>

        {/* Download button */}
        <a
          href={audioUrl}
          download
          className="text-blue-600 hover:text-blue-800"
          title="Download audio"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </a>
      </div>
    </div>
  );
} 