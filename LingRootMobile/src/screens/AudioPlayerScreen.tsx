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
  returnTo?: 'goBack' | 'onboardingHome';
  disableTour?: boolean;
}

const AudioPlayerScreenContent: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const params = route.params as AudioPlayerScreenParams;

  useTourAutoStart(AUDIOPLAYER_TOUR_KEY, 2000, undefined, !!params?.disableTour);

  const handleClose = () => {
    if (params?.returnTo === 'onboardingHome') {
      navigation.navigate('Main' as never, { screen: 'Home' } as never);
      return;
    }

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
      enableTour={!params?.disableTour}
    />
  );
};

const AudioPlayerScreen: React.FC = () => (
  <TourProvider tooltip={AudioPlayerTooltip} maskPath={roundedMaskPath}>
    <AudioPlayerScreenContent />
  </TourProvider>
);

export default React.memo(AudioPlayerScreen);
