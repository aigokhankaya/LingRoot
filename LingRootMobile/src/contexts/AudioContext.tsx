import React, { createContext, useContext, useState, ReactNode } from 'react';
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

  const isTrackPlaying = (trackId: string): boolean => {
    const result = currentTrack?.id === trackId && isPlaying;
    return result;
  };

  const setCurrentTrackWithLog = (track: AudioTrack | null) => {
    setCurrentTrack(track);
  };

  const setIsPlayingWithLog = (playing: boolean) => {
    setIsPlaying(playing);
  };

  const value: AudioContextType = {
    currentTrack,
    isPlaying,
    sound,
    setCurrentTrack: setCurrentTrackWithLog,
    setIsPlaying: setIsPlayingWithLog,
    setSound,
    isTrackPlaying,
    stopAllAudio: async () => {
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
      }
    },
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
}; 