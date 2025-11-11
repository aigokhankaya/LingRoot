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
  const animationFrameRef = useRef<number | null>(null);
  const timestampDataRef = useRef<WordTiming[]>(timepoints);
  const currentIndexRef = useRef<number>(-1);

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

  // O(1) amortized search - advancing pointer pattern
  // Reference: MFA-Analiz.md Section V - Performance Optimization
  const findCurrentWordIndex = useCallback((currentTime: number): number => {
    const data = timestampDataRef.current;
    if (!data || data.length === 0) return -1;

    let index = currentIndexRef.current;
    
    // Start from last known position (or beginning if reset)
    if (index < 0) index = 0;

    // Search forward from current position
    while (index < data.length) {
      const tp = data[index];
      const endTime = tp.endTimeSeconds || tp.timeSeconds + 0.5;

      // Check if we're in this word's time range
      if (currentTime >= tp.timeSeconds && currentTime < endTime) {
        return index; // Perfect match
      }

      // If current time is past this word, move to next
      if (currentTime >= endTime) {
        index++;
        continue;
      }

      // Current time is before this word - we've gone too far
      return Math.max(0, index - 1);
    }

    // Past all words - return last word
    return data.length - 1;
  }, []);

  // High-performance animation loop using requestAnimationFrame
  // Reference: MFA-Analiz.md Section V.2 - requestAnimationFrame approach
  const animationLoop = useCallback(() => {
    if (!audioRef.current) return;

    const currentTime = audioRef.current.currentTime;
    setCurrentTime(currentTime);

    // Update word highlighting
    if (showWordHighlight && timestampDataRef.current.length > 0) {
      const newIndex = findCurrentWordIndex(currentTime);
      
      // Only update state if index changed (minimize re-renders)
      if (newIndex !== currentIndexRef.current) {
        currentIndexRef.current = newIndex;
        setCurrentWordIndex(newIndex);
      }
    }

    // Continue loop
    animationFrameRef.current = requestAnimationFrame(animationLoop);
  }, [showWordHighlight, findCurrentWordIndex]);

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
      currentIndexRef.current = -1;
    }
  }, [isPlaying]);

  // Detect timing source from timepoints
  const timingSource = timepoints.length > 0 && timepoints[0]?.source === 'mfa' ? 'mfa' : 'tts';
  const isMFATiming = timingSource === 'mfa';

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
              {isMFATiming ? '✓ Acoustic (MFA)' : '⚠ Estimated (TTS)'}
            </span>
          </div>
          {isMFATiming && (
            <span className="text-xs text-gray-500">
              Millisecond precision
            </span>
          )}
        </div>
      )}
      
      {/* Word highlighting display */}
      {showWordHighlight && words.length > 0 && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg min-h-[120px] max-h-[300px] overflow-y-auto">
          <div className="flex flex-wrap gap-2 text-lg leading-relaxed">
            {words.map((word, index) => (
              <span
                key={index}
                className={`transition-all duration-200 px-1 rounded ${
                  index === currentWordIndex
                    ? 'bg-yellow-300 font-semibold text-gray-900 scale-110'
                    : 'text-gray-700'
                }`}
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}
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