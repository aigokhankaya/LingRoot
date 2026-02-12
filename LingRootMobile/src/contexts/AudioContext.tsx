import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { AudioTrack } from '../types';
import { SoundLike } from '../services/audioService';

interface AudioContextType {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  sound: SoundLike | null;
  setCurrentTrack: (track: AudioTrack | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setSound: (sound: SoundLike | null) => void;
  isTrackPlaying: (trackId: string) => boolean;
  stopAllAudio: () => Promise<void>;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const useAudioContext = () => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudioContext must be used within an AudioProvider');
  }
  return context;
};

interface AudioProviderProps {
  children: ReactNode;
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<SoundLike | null>(null);

  const isTrackPlaying = useCallback((trackId: string): boolean => {
    const result = currentTrack?.id === trackId && isPlaying;
    return result;
  }, [currentTrack, isPlaying]);

  const setCurrentTrackWithLog = useCallback((track: AudioTrack | null) => {
    setCurrentTrack(track);
  }, []);

  const setIsPlayingWithLog = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, []);

  const stopAllAudio = useCallback(async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
    }
  }, [sound]);

  const value: AudioContextType = useMemo(() => ({
    currentTrack,
    isPlaying,
    sound,
    setCurrentTrack: setCurrentTrackWithLog,
    setIsPlaying: setIsPlayingWithLog,
    setSound,
    isTrackPlaying,
    stopAllAudio,
  }), [currentTrack, isPlaying, sound, setCurrentTrackWithLog, setIsPlayingWithLog, isTrackPlaying, stopAllAudio]);

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
}; 