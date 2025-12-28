import React from 'react';
import MiniPlayer from './MiniPlayer';
import ExpandedPlayerModal from './ExpandedPlayerModal';

/**
 * GlobalAudioContainer
 * 
 * This component should be rendered at the root level (_app.tsx).
 * It manages which audio player UI to show based on the global audio state.
 * 
 * - If no track is playing: renders nothing
 * - If minimized: renders MiniPlayer (draggable floating widget)
 * - If expanded: renders ExpandedPlayerModal (full modal with text sync)
 */
const GlobalAudioContainer: React.FC = () => {
    return (
        <>
            <MiniPlayer />
            <ExpandedPlayerModal />
        </>
    );
};

export default GlobalAudioContainer;
