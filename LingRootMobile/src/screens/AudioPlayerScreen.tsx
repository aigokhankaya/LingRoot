import React from 'react';
import { useRoute, useNavigation } from '@react-navigation/native';
import AudioPlayer from '../components/AudioPlayer';
import { AudioTrack } from '../types';
import {
  TourProvider,
  AudioPlayerTooltip,
  AUDIOPLAYER_TOUR_KEY,
  useTourAutoStart,
  roundedMaskPath,
} from '../components/GuideTour';

interface AudioPlayerScreenParams {
  track: AudioTrack;
  highlightMode?: 'word' | 'sentence';
}

const AudioPlayerScreenContent: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const params = route.params as AudioPlayerScreenParams;

  useTourAutoStart(AUDIOPLAYER_TOUR_KEY, 2000);

  const handleClose = () => {
    navigation.goBack();
  };

  if (!params?.track) {
    navigation.goBack();
    return null;
  }

  return (
    <AudioPlayer
      track={params.track}
      visible={true}
      onClose={handleClose}
      timepoints={params.track.timepoints || []}
      words={params.track.words || []}
      initialHighlightMode={params.highlightMode || 'word'}
      asScreen={true}
      enableTour={true}
    />
  );
};

const AudioPlayerScreen: React.FC = () => (
  <TourProvider tooltip={AudioPlayerTooltip} maskPath={roundedMaskPath}>
    <AudioPlayerScreenContent />
  </TourProvider>
);

export default AudioPlayerScreen;
