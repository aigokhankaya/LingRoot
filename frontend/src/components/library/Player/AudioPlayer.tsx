import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { updateProgress } from '@/lib/api';

interface AudioPlayerProps {
  src: string;
  initialTime?: number;
  duration?: number;
  contentType: 'book' | 'document';
  contentId: number;
  chapterIndex: number;
  onEnded?: () => void;
  onTimeUpdate?: (time: number) => void;
  autoPlay?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  initialTime = 0,
  duration: initialDuration = 0,
  contentType,
  contentId,
  chapterIndex,
  onEnded,
  onTimeUpdate,
  autoPlay = false
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(initialDuration);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Sync interval ref
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = initialTime;
      if (autoPlay) {
        audioRef.current.play().catch(e => console.warn('Autoplay failed:', e));
      }
    }
  }, [src, initialTime, autoPlay]);

  // Sync progress every 15 seconds
  useEffect(() => {
    if (isPlaying) {
      syncIntervalRef.current = setInterval(() => {
        if (audioRef.current) {
          const progress = (audioRef.current.currentTime / (audioRef.current.duration || 1)) * 100;
          updateProgress(contentType, contentId, {
            chapterIndex,
            positionSeconds: Math.floor(audioRef.current.currentTime),
            progressPercentage: Math.min(progress, 100),
            isFinished: false
          }).catch(console.error);
        }
      }, 15000);
    } else {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    }

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [isPlaying, contentType, contentId, chapterIndex]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      onTimeUpdate?.(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setIsLoading(false);
    }
  };

  const handleSeek = (value: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value;
      setCurrentTime(value);
    }
  };

  const handleSkip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime += seconds;
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    updateProgress(contentType, contentId, {
      chapterIndex,
      positionSeconds: duration,
      progressPercentage: 100,
      isFinished: true // Bu sadece o bölüm için, tüm kitap için değil. Player sayfasında yönetilmeli.
    });
    onEnded?.();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const speeds = [0.8, 1, 1.2, 1.5, 2];

  return (
    <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 shadow-lg fixed bottom-0 left-0 right-0 z-40">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
      />

      <div className="max-w-7xl mx-auto flex flex-col gap-2">
        {/* Progress Bar */}
        <div className="flex items-center gap-3 text-xs font-medium text-gray-500 w-full">
          <span>{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={(e) => handleSeek(Number(e.target.value))}
            className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
          />
          <span>{formatTime(duration)}</span>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between">
          {/* Left: Speed & Volume */}
          <div className="flex items-center gap-4 w-1/3">
            <select
              value={playbackRate}
              onChange={(e) => {
                const rate = Number(e.target.value);
                setPlaybackRate(rate);
                if (audioRef.current) audioRef.current.playbackRate = rate;
              }}
              className="bg-gray-100 dark:bg-gray-700 text-xs px-2 py-1 rounded border-none outline-none focus:ring-1 focus:ring-blue-500"
            >
              {speeds.map(s => <option key={s} value={s}>{s}x</option>)}
            </select>

            <div className="hidden sm:flex items-center gap-2 group">
              <button onClick={() => setIsMuted(!isMuted)}>
                {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setVolume(val);
                  setIsMuted(val === 0);
                  if (audioRef.current) audioRef.current.volume = val;
                }}
                className="w-20 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-gray-600 [&::-webkit-slider-thumb]:rounded-full"
              />
            </div>
          </div>

          {/* Center: Play Controls */}
          <div className="flex items-center gap-6 justify-center w-1/3">
            <button 
              onClick={() => handleSkip(-15)}
              className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors p-2"
              title="-15s"
            >
              <SkipBack size={20} />
            </button>
            
            <button
              onClick={togglePlay}
              disabled={isLoading || !src}
              className="w-12 h-12 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-500/30 transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 size={24} className="animate-spin" />
              ) : isPlaying ? (
                <Pause size={24} fill="currentColor" />
              ) : (
                <Play size={24} fill="currentColor" className="ml-1" />
              )}
            </button>

            <button 
              onClick={() => handleSkip(30)}
              className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors p-2"
              title="+30s"
            >
              <SkipForward size={20} />
            </button>
          </div>

          {/* Right: Chapter Info (Placeholder) */}
          <div className="w-1/3 flex justify-end">
             {/* Chapter navigation buttons could go here */}
          </div>
        </div>
      </div>
    </div>
  );
};
