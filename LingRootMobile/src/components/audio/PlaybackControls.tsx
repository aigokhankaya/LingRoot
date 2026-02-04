import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS } from '../../theme/colors';
import { CopilotStep, walkthroughable } from 'react-native-copilot';

const WalkthroughableView = walkthroughable(View);

interface PlaybackControlsProps {
  isPlaying: boolean;
  isLoading: boolean;
  duration: number;
  position: number;
  playbackRate: number;
  isTestEnvironment: boolean;
  manualSeconds: string;
  manualMillis: string;
  wordsArray: string[];
  sentences: string[];
  currentSentenceIndex: number;
  enableTour?: boolean;
  tourSteps?: Record<string, { tr: string; en: string }>;
  lang: 'tr' | 'en';
  level: string;
  onPlayPause: () => void;
  onSpeedChange: () => void;
  onSeek: (positionMs: number) => void;
  onManualSecondsChange: (value: string) => void;
  onManualMillisChange: (value: string) => void;
  onInfoPress: () => void;
}

const formatTime = (milliseconds: number) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  isLoading,
  duration,
  position,
  playbackRate,
  isTestEnvironment,
  manualSeconds,
  manualMillis,
  wordsArray,
  sentences,
  currentSentenceIndex,
  enableTour = false,
  tourSteps,
  lang,
  level,
  onPlayPause,
  onSpeedChange,
  onSeek,
  onManualSecondsChange,
  onManualMillisChange,
  onInfoPress,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const progressPercentage = duration > 0 ? (position / duration) * 100 : 0;

  const controlsContent = (
    <View style={styles.controlsContainer}>
      {isTestEnvironment && (
        <View style={styles.manualSeekContainer}>
          <TextInput
            style={styles.timeInput}
            placeholder="Sn"
            keyboardType="numeric"
            maxLength={4}
            value={manualSeconds}
            onChangeText={onManualSecondsChange}
          />
          <Text style={styles.timeSeparator}>.</Text>
          <TextInput
            style={styles.timeInput}
            placeholder="Ms"
            keyboardType="numeric"
            maxLength={3}
            value={manualMillis}
            onChangeText={onManualMillisChange}
          />
          <TouchableOpacity
            style={styles.seekButton}
            onPress={() => {
              const seconds = parseFloat(manualSeconds || '0');
              const millis = parseFloat(manualMillis || '0');
              const totalMs = (seconds * 1000) + millis;
              console.log(`🎯 [MANUAL SEEK] Seeking to ${seconds}.${millis}s (${totalMs}ms)`);
              onSeek(totalMs);
            }}
          >
            <Text style={styles.seekButtonText}>Git</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.progressContainer}>
        <Text style={styles.timeText}>{formatTime(position)}</Text>
        <TouchableOpacity
          style={styles.progressBar}
          activeOpacity={0.8}
          hitSlop={{ top: 12, bottom: 12, left: 0, right: 0 }}
          onPress={(e) => {
            const { locationX } = e.nativeEvent;
            const progressBarWidth = screenWidth - 32 - 100;
            const percentage = locationX / progressBarWidth;
            const seekPosition = percentage * duration;
            console.log(`📊 [PROGRESS BAR] Clicked at ${locationX}px, seeking to ${(seekPosition / 1000).toFixed(2)}s`);
            onSeek(seekPosition);
          }}
        >
          <View
            style={[
              styles.progressFill,
              { width: `${progressPercentage}%` }
            ]}
          />
        </TouchableOpacity>
        <Text style={styles.timeText}>{formatTime(duration)}</Text>
      </View>

      <View style={styles.playbackControls}>
        {enableTour && tourSteps ? (
          <CopilotStep order={3} name="playerSpeed" text={tourSteps.playerSpeed[lang]}>
            <WalkthroughableView>
              <TouchableOpacity
                style={styles.speedButton}
                onPress={onSpeedChange}
              >
                <Text style={styles.speedText}>{playbackRate}x</Text>
              </TouchableOpacity>
            </WalkthroughableView>
          </CopilotStep>
        ) : (
          <TouchableOpacity
            style={styles.speedButton}
            onPress={onSpeedChange}
          >
            <Text style={styles.speedText}>{playbackRate}x</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.playButton}
          onPress={onPlayPause}
          disabled={isLoading}
        >
          {isLoading ? (
            <Icon name="hourglass-empty" size={32} color="#FFFFFF" />
          ) : (
            <Icon
              name={isPlaying ? "pause" : "play-arrow"}
              size={32}
              color="#FFFFFF"
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.infoButton}
          onPress={onInfoPress}
        >
          <Icon name="info" size={24} color="#666" />
        </TouchableOpacity>

        <View style={styles.levelBadgeBottom}>
          <Text style={styles.levelText}>{level}</Text>
        </View>
      </View>
    </View>
  );

  // If tour is enabled and tourSteps are provided, wrap in CopilotStep
  if (enableTour && tourSteps) {
    return (
      <CopilotStep order={2} name="playerControls" text={tourSteps.playerControls[lang]}>
        <WalkthroughableView style={styles.controlsContainerWrapper}>
          {controlsContent}
        </WalkthroughableView>
      </CopilotStep>
    );
  }

  return controlsContent;
};

const styles = StyleSheet.create({
  controlsContainerWrapper: {
    width: '100%',
  },
  controlsContainer: {
    backgroundColor: COLORS.surfaceGlass,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: COLORS.brandIndigo,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 6,
  },
  manualSeekContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    width: 60,
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: '#fff',
  },
  timeSeparator: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 4,
    color: '#333',
  },
  seekButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 12,
  },
  seekButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    minWidth: 40,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.slate100,
    borderRadius: 3,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.brandTeal,
    borderRadius: 3,
  },
  playbackControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  speedButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.slate50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.slate100,
  },
  speedText: {
    fontSize: 12,
    color: COLORS.slate600,
    fontWeight: '800',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.brandOrange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.brandOrange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  infoButton: {
    padding: 8,
  },
  levelBadgeBottom: {
    backgroundColor: COLORS.brandOrange,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    minWidth: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.brandOrange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  levelText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
});
