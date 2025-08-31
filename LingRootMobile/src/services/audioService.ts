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
    console.log('TrackPlayer service running:', isSetup);
    
    if (!isSetup) {
      console.log('Setting up TrackPlayer...');
      await TrackPlayer.setupPlayer({
        waitForBuffer: true,
      });
      console.log('TrackPlayer setup complete');
    }

    // Set options to enable background and controls
    console.log('Updating TrackPlayer options...');
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
    console.log('TrackPlayer options updated');
  } catch (error) {
    console.error('TrackPlayer setup error:', error);
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
  const isPlaying = state === State.Playing;
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
  console.log('Creating sound for URL:', url);
  
  try {
    await ensureSetup();
    console.log('TrackPlayer setup completed');

    // Reset queue and add the single track
    await TrackPlayer.reset();
    console.log('TrackPlayer queue reset');

    const track: Track = {
      id: 'current',
      url,
      title: 'LingRoot',
      artist: 'LingRoot',
    };
    
    console.log('Adding track to TrackPlayer:', track);
    await TrackPlayer.add([track]);
    console.log('Track added successfully');
  } catch (error) {
    console.error('Error in createSound:', error);
    throw error;
  }

  const soundLike: SoundLike = {
    playAsync: async () => {
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
