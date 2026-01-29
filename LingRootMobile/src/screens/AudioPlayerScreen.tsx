import React from 'react';
import { useRoute, useNavigation } from '@react-navigation/native';
import AudioPlayer from '../components/AudioPlayer';
import { AudioTrack } from '../types';

interface AudioPlayerScreenParams {
  track: AudioTrack;
  highlightMode?: 'word' | 'sentence';
}

const AudioPlayerScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const params = route.params as AudioPlayerScreenParams;

  const handleClose = () => {
    navigation.goBack();
  };

  if (!params?.track) {
    // If no track, go back
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
    />
  );
};

export default AudioPlayerScreen;
