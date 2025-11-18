import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  RepeatMode,
  State,
  Track,
} from 'react-native-track-player';

// A minimal Sound-like interface to mimic expo-av API used by AudioPlayer
export interface SoundLike {
  playAsync: () => Promise<void>;
  pauseAsync: () => Promise<void>;
  getStatusAsync: () => Promise<{
    isLoaded: boolean;
    isPlaying: boolean;
    positionMillis: number;
    durationMillis: number | null;
    didJustFinish?: boolean;
  }>;
  setPositionAsync: (positionMs: number) => Promise<void>;
  setRateAsync: (rate: number, shouldCorrectPitch?: boolean) => Promise<void>;
  setOnPlaybackStatusUpdate: (cb: (status: any) => void) => void;
  unloadAsync: () => Promise<void>;
  stopAsync: () => Promise<void>;
}

let statusCallback: ((status: any) => void) | null = null;
let progressListenerRegistered = false;

async function ensureSetup() {
  try {
    // Check if already initialized to avoid duplicate setup
    const isSetup = await TrackPlayer.isServiceRunning();
    
    if (!isSetup) {
      await TrackPlayer.setupPlayer({
        waitForBuffer: true,
      });
    }

    // Set options to enable background and controls
    await TrackPlayer.updateOptions({
      stoppingAppPausesPlayback: true,
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      },
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SeekTo,
        Capability.Stop,
      ],
      compactCapabilities: [Capability.Play, Capability.Pause],
      progressUpdateEventInterval: 0.5,
    });
  } catch (error) {
    throw error;
  }

  if (!progressListenerRegistered) {
    progressListenerRegistered = true;
    TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, async () => {
      if (statusCallback) {
        const status = await buildStatus();
        statusCallback(status);
      }
    });
    TrackPlayer.addEventListener(Event.PlaybackState, async () => {
      if (statusCallback) {
        const status = await buildStatus();
        statusCallback(status);
      }
    });
    TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
      if (statusCallback) {
        const status = await buildStatus(true);
        statusCallback(status);
      }
    });
  }
}

async function buildStatus(forceFinished = false) {
  const [position, duration, state] = await Promise.all([
    TrackPlayer.getPosition(),
    TrackPlayer.getDuration(),
    TrackPlayer.getState(),
  ]);
  const isPlaying = state === State.Playing || state === State.Buffering;
  const didJustFinish = forceFinished || (duration > 0 && position >= duration);
  
  return {
    isLoaded: true,
    isPlaying,
    positionMillis: Math.max(0, Math.floor(position * 1000)),
    durationMillis: duration ? Math.floor(duration * 1000) : null,
    didJustFinish,
  };
}

export async function createSound(url: string): Promise<SoundLike> {
  try {
    await ensureSetup();

    // Reset queue and add the single track
    await TrackPlayer.reset();

    const track: Track = {
      id: 'current',
      url,
      title: 'LingRoot',
      artist: 'LingRoot',
    };
    
    await TrackPlayer.add([track]);
    
    // Wait for track to be ready
    let attempts = 0;
    while (attempts < 20) {
      const state = await TrackPlayer.getState();
      
      if (state !== State.None && state !== State.Loading) {
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
  } catch (error) {
    throw error;
  }

  const soundLike: SoundLike = {
    playAsync: async () => {
      // Wait for track to be ready
      const state = await TrackPlayer.getState();
      
      if (state === State.None || state === State.Stopped) {
        // Give it a moment to load
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      await TrackPlayer.play();
    },
    pauseAsync: async () => {
      await TrackPlayer.pause();
    },
    getStatusAsync: async () => {
      return buildStatus();
    },
    setPositionAsync: async (positionMs: number) => {
      await TrackPlayer.seekTo(positionMs / 1000);
    },
    setRateAsync: async (rate: number) => {
      try {
        await TrackPlayer.setRate(rate);
      } catch {}
    },
    setOnPlaybackStatusUpdate: (cb: (status: any) => void) => {
      statusCallback = cb;
    },
    unloadAsync: async () => {
      await TrackPlayer.reset();
    },
    stopAsync: async () => {
      await TrackPlayer.stop();
    },
  };

  return soundLike;
}

export async function stopAll() {
  try {
    await TrackPlayer.stop();
    await TrackPlayer.reset();
  } catch {}
}
