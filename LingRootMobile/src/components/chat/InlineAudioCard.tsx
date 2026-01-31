import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { createSound, SoundLike } from '../../services/audioService';

interface InlineAudioCardProps {
  title: string;
  level: string;
  mp3Url: string;
  duration: number;
  language: string;
  onFullScreen: () => void;
}

export const InlineAudioCard: React.FC<InlineAudioCardProps> = ({
  title,
  level,
  mp3Url,
  duration,
  language,
  onFullScreen,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration * 1000);
  const [isLoading, setIsLoading] = useState(false);
  const soundRef = useRef<SoundLike | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      if (!soundRef.current) return;
      try {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          setPosition(status.positionMillis);
          if (status.durationMillis) {
            setTotalDuration(status.durationMillis);
          }
          if (status.didJustFinish) {
            setIsPlaying(false);
            setPosition(0);
            if (pollRef.current) clearInterval(pollRef.current);
          }
        }
      } catch {}
    }, 500);
  }, []);

  const togglePlayPause = async () => {
    try {
      if (!soundRef.current) {
        setIsLoading(true);
        const sound = await createSound(mp3Url);
        soundRef.current = sound;
        await sound.playAsync();
        setIsPlaying(true);
        setIsLoading(false);
        startPolling();
      } else if (isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
        if (pollRef.current) clearInterval(pollRef.current);
      } else {
        await soundRef.current.playAsync();
        setIsPlaying(true);
        startPolling();
      }
    } catch {
      setIsLoading(false);
    }
  };

  const progress = totalDuration > 0 ? (position / totalDuration) * 100 : 0;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Icon name="headphones" size={18} color="#0F766E" />
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>{level}</Text>
        </View>
      </View>

      <View style={styles.playerRow}>
        <TouchableOpacity onPress={togglePlayPause} style={styles.playButton}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Icon name={isPlaying ? 'pause' : 'play-arrow'} size={22} color="#FFFFFF" />
          )}
        </TouchableOpacity>

        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.timeText}>
            {formatTime(position)} / {formatTime(totalDuration)}
          </Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={() => {
          // Stop inline playback before opening full screen
          if (soundRef.current && isPlaying) {
            soundRef.current.pauseAsync();
            setIsPlaying(false);
            if (pollRef.current) clearInterval(pollRef.current);
          }
          onFullScreen();
        }}>
          <Icon name="fullscreen" size={16} color="#374151" />
          <Text style={styles.actionText}>
            {language === 'tr' ? 'Tam Ekran' : 'Full Screen'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#D1FAE5',
  },
  levelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065F46',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  playButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#27BEAA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    flex: 1,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginBottom: 4,
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#27BEAA',
  },
  timeText: {
    fontSize: 11,
    color: '#6B7280',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
});
