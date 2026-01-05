import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

// Audio track metadata
export interface AudioTrack {
    id: string;
    url: string;
    title: string;
    level: string;
    words?: string[];
    timepoints?: Array<{
        timeSeconds: number;
        endTimeSeconds?: number;
        word?: string;
        markName?: string;
    }>;
    originalText?: string;
    translatedText?: string;
    dialogueSegments?: any[];
    topic?: string;
}

interface AudioPlayerState {
    activeTrack: AudioTrack | null;
    isPlaying: boolean;
    isMinimized: boolean;
    currentTime: number;
    duration: number;
    isLoading: boolean;
    error: string | null;
}

interface AudioPlayerContextType extends AudioPlayerState {
    // Actions
    playTrack: (track: AudioTrack, autoPlay?: boolean) => void;
    play: () => void;
    pause: () => void;
    togglePlayPause: () => void;
    seek: (time: number) => void;
    minimize: () => void;
    expand: () => void;
    close: () => void;
    setPlaybackRate: (rate: number) => void;
    // Refs for external access
    audioRef: React.RefObject<HTMLAudioElement | null>;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null);

export const useAudioPlayer = () => {
    const context = useContext(AudioPlayerContext);
    if (!context) {
        throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
    }
    return context;
};

// Safe hook that returns null if not in provider
export const useAudioPlayerSafe = () => {
    return useContext(AudioPlayerContext);
};

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activeTrack, setActiveTrack] = useState<AudioTrack | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const syncIntervalRef = useRef<number | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
            }
        };
    }, []);

    // Start time sync interval
    const startSync = useCallback(() => {
        if (syncIntervalRef.current) {
            clearInterval(syncIntervalRef.current);
        }
        syncIntervalRef.current = window.setInterval(() => {
            if (audioRef.current) {
                setCurrentTime(audioRef.current.currentTime);
            }
        }, 100);
    }, []);

    // Stop time sync interval
    const stopSync = useCallback(() => {
        if (syncIntervalRef.current) {
            clearInterval(syncIntervalRef.current);
            syncIntervalRef.current = null;
        }
    }, []);

    // Play a new track (autoPlay: false by default to prevent double audio issue)
    const playTrack = useCallback((track: AudioTrack, autoPlay: boolean = false) => {
        console.log('🎵 [GLOBAL PLAYER] Loading new track:', track.title, 'autoPlay:', autoPlay);

        // Stop existing audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        stopSync();

        // Reset state
        setError(null);
        setIsLoading(true);
        setCurrentTime(0);
        setDuration(0);
        setActiveTrack(track);
        setIsMinimized(false); // Start expanded

        // Create new audio element
        const audio = new Audio(track.url);
        audioRef.current = audio;

        // Event listeners
        audio.addEventListener('loadedmetadata', () => {
            console.log('✅ [GLOBAL PLAYER] Audio loaded, duration:', audio.duration);
            setDuration(audio.duration);
            setIsLoading(false);
        });

        audio.addEventListener('canplaythrough', () => {
            setIsLoading(false);
        });

        audio.addEventListener('play', () => {
            console.log('▶️ [GLOBAL PLAYER] Playing');
            setIsPlaying(true);
            startSync();
        });

        audio.addEventListener('pause', () => {
            console.log('⏸️ [GLOBAL PLAYER] Paused');
            setIsPlaying(false);
            stopSync();
        });

        audio.addEventListener('ended', () => {
            console.log('⏹️ [GLOBAL PLAYER] Ended');
            setIsPlaying(false);
            stopSync();
            setCurrentTime(0);
        });

        audio.addEventListener('waiting', () => {
            setIsLoading(true);
        });

        audio.addEventListener('playing', () => {
            setIsLoading(false);
        });

        audio.addEventListener('error', (e) => {
            console.error('❌ [GLOBAL PLAYER] Audio error:', e);
            setError('Ses dosyası yüklenemedi');
            setIsLoading(false);
            setIsPlaying(false);
        });

        // Only auto-play if explicitly requested
        if (autoPlay) {
            audio.play().catch(err => {
                console.error('❌ [GLOBAL PLAYER] Autoplay failed:', err);
                setError('Otomatik oynatma engellendi. Oynat butonuna basın.');
                setIsPlaying(false);
            });
        }
    }, [startSync, stopSync]);

    // Play current track
    const play = useCallback(async () => {
        if (!audioRef.current) return;
        try {
            await audioRef.current.play();
        } catch (err: any) {
            console.error('Play error:', err);
            setError(`Oynatma hatası: ${err.message}`);
        }
    }, []);

    // Pause current track
    const pause = useCallback(() => {
        if (!audioRef.current) return;
        audioRef.current.pause();
    }, []);

    // Toggle play/pause
    const togglePlayPause = useCallback(() => {
        if (isPlaying) {
            pause();
        } else {
            play();
        }
    }, [isPlaying, play, pause]);

    // Seek to time
    const seek = useCallback((time: number) => {
        if (!audioRef.current) return;
        audioRef.current.currentTime = time;
        setCurrentTime(time);
    }, []);

    // Minimize player
    const minimize = useCallback(() => {
        console.log('📦 [GLOBAL PLAYER] Minimizing');
        setIsMinimized(true);
    }, []);

    // Expand player
    const expand = useCallback(() => {
        console.log('📐 [GLOBAL PLAYER] Expanding');
        setIsMinimized(false);
    }, []);

    // Close player completely
    const close = useCallback(() => {
        console.log('❌ [GLOBAL PLAYER] Closing');
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        stopSync();
        setActiveTrack(null);
        setIsPlaying(false);
        setIsMinimized(false);
        setCurrentTime(0);
        setDuration(0);
        setError(null);
    }, [stopSync]);

    // Set playback rate
    const setPlaybackRate = useCallback((rate: number) => {
        if (!audioRef.current) return;
        audioRef.current.playbackRate = rate;
    }, []);

    const value: AudioPlayerContextType = {
        activeTrack,
        isPlaying,
        isMinimized,
        currentTime,
        duration,
        isLoading,
        error,
        playTrack,
        play,
        pause,
        togglePlayPause,
        seek,
        minimize,
        expand,
        close,
        setPlaybackRate,
        audioRef,
    };

    return (
        <AudioPlayerContext.Provider value={value}>
            {children}
        </AudioPlayerContext.Provider>
    );
};

export default AudioPlayerContext;
