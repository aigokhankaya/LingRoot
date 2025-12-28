# Persistent Audio Player Implementation Plan

## Problem
Currently, audio playback is tied to a specific modal component (`TopicHierarchySection` -> `OutputSection`). When the user navigates away or closes the modal, the component unmounts. Previously this caused "ghost audio" (corrected), but now it simply stops playback. The user wants playback to continue while navigating, with a minimized visual reference.

## Goal
Implement a site-wide persistent audio player that allows:
1.  **Continuous Playback**: Audio continues playing when navigating between pages.
2.  **Background Mode**: Audio plays even when the UI is "closed" (minimized to a mini-player).
3.  **Mini Player**: A floating or sticky UI element to control playback and restore the full view.
4.  **Synced Text**: Ideally maintain text sync capability when expanded.

## Architecture Design

### 1. Global State: `AudioPlayerContext`
We need a React Context to hold the single source of truth for the audio player.

**File:** `frontend/src/context/AudioPlayerContext.tsx`

**State:**
```typescript
interface AudioTrack {
  id: string;
  url: string;
  title: string;
  level: string;
  metadata: any; // AudioResult data
}

interface AudioPlayerState {
  activeTrack: AudioTrack | null;
  isPlaying: boolean;
  isMinimized: boolean; // true = mini player, false = full modal
  progress: number;
}
```

**Actions:**
*   `play(track: AudioTrack)`: Sets the track and opens the player (defaulting to expanded or last state).
*   `toggleMinimize()`: Switches between mini and expanded modes.
*   `close()`: Stops playback and clears the track.

### 2. Global Component: `GlobalAudioContainer`
A generic container component that stays mounted at the root level (`_app.tsx`).

**File:** `frontend/src/components/AudioPlayer/GlobalAudioContainer.tsx`

*   Subscribes to `AudioPlayerContext`.
*   If `!activeTrack`, renders null.
*   If `activeTrack && isMinimized`: Renders `<MiniPlayer />`.
*   If `activeTrack && !isMinimized`: Renders `<ExpandedPlayerModal />`.

### 3. Components
*   **`MiniPlayer` (Draggable)**:
    *   **Behavior**: A floating UI element that persists across pages.
    *   **Draggable**: Users can drag and reposition this element anywhere on the screen. It should remember its position (optional: save to localStorage).
    *   **Controls**:
        *   Play/Pause toggle.
        *   "Expand" button (opens the full Modal).
        *   "Close" button (stops audio completely and removes player).
        *   Progress bar (miniature).
    *   **Z-Index**: Max (9999) to float above everything.
*   **`ExpandedPlayerModal`**:
    *   The "Full" view (OutputSection).
    *   **Interaction**: Clicking outside the modal (backdrop click) should **MINIMIZE** the player to the MiniPlayer state, NOT stop playback or close it completely.
    *   Includes full text sync, translations, vocabulary features.

### 4. Audio Instance Management (`useGlobalAudio`)
This is the trickiest part.
*   The `Audio` element should probably live in the **Context** or the **GlobalContainer**, not in the UI components (`OutputSection`).
*   **Current Architecture**: `OutputSection` -> `NewSyncedTextPlayer` -> `useWordSync` -> `new Audio()`.
*   **Proposed Architecture**:
    *   `GlobalAudioContainer` instantiates `useWordSync`.
    *   It passes the *state* (currentTime, wordTimestamps, isPlaying) down to the UI components (`MiniPlayer` or `ExpandedPlayerModal`).
    *   This ensures that unmounting the UI (switching from Expanded to Mini) does NOT destroy the audio instance hooks.

## Migration Steps

1.  **Create Context**: Implement `AudioPlayerContext`.
2.  **Lift State**:
    *   Modify `useWordSync` to mostly be a "Controller" hook, possibly split into `useAudioEngine` (logic) and `useTextSync` (rendering data).
    *   For the first iteration, simply keep `GlobalAudioContainer` mounted.
3.  **Create UI Components**:
    *   Extract the visual part of `OutputSection` into a pure presentation component.
    *   Create `MiniPlayer` component.
4.  **Integrate**:
    *   Add `AudioPlayerProvider` and `GlobalAudioContainer` to `_app.tsx`.
    *   Update `TopicHierarchySection` (and other pages) to call `context.play(track)` instead of rendering `<OutputSection />` locally.

## Refactoring Impact
*   **`TopicHierarchySection.tsx`**: Will no longer manage `modalTopicId` for audio purposes. It will just delegate to the context.
*   **`OutputSection.tsx`**: Will become a "dumb" component that receives data/callbacks, rather than managing the audio lifecycle.

## Technical Challenge: `useWordSync` Refactor
`useWordSync` currently mixes **Audio LifeCycle** (creating `new Audio`) with **Text Sync Logic**.
To support minimization:
*   The **Audio Lifecycle** and **Sync Engine** must stay alive in `GlobalAudioContainer`.
*   The **Visuals** (text highlighting) will only render when `!isMinimized`.
*   We need to ensure `useWordSync` exposes `controls` (play, pause, seek) and `state` (currentTime, activeWordIndex) clearly so the `MiniPlayer` can use the controls without rendering the text.
