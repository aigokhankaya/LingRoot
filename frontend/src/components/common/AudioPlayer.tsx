import React, { useRef, useState } from 'react';

interface AudioPlayerProps {
  src: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ src }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  return (
    <div className="flex items-center space-x-2">
      <button onClick={handlePlayPause} className="btn-primary">
        {playing ? 'Pause' : 'Play'}
      </button>
      <audio ref={audioRef} src={src} onEnded={() => setPlaying(false)} />
    </div>
  );
};

export default AudioPlayer; 