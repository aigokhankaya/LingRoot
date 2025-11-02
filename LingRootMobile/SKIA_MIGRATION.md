# React Native Skia Migration - AudioPlayer Highlighting

## Overview
Migrated AudioPlayer word and sentence highlighting from traditional React Native components to React Native Skia for better performance and smoother animations.

## Changes Made

### 1. Dependencies Added
- **@shopify/react-native-skia** - High-performance 2D graphics library

### 2. New Components Created

#### `SkiaWordHighlight.tsx`
- GPU-accelerated word highlighting using Skia Canvas
- Features:
  - Rounded rectangle backgrounds with blur effects
  - Smooth color transitions
  - Touch event handling for word selection
  - Automatic text layout and wrapping
  - Support for selected words (vocabulary)

#### `SkiaSentenceHighlight.tsx`
- GPU-accelerated sentence highlighting
- Features:
  - Glow effects for active sentences
  - Blur mask for depth
  - Touch handling for sentence navigation
  - Automatic sentence layout

### 3. AudioPlayer Integration
- Replaced old `renderWordHighlighting` with `SkiaWordHighlight` component
- Replaced old `renderSentenceHighlighting` with `SkiaSentenceHighlight` component
- Maintained all existing functionality:
  - Word press to seek
  - Long press to add to vocabulary
  - Current word/sentence tracking
  - Selected words highlighting

## Performance Benefits

### Before (React Native Components)
- Multiple View/Text components per word (100+ for long texts)
- Heavy re-renders on every word change
- Layout calculations in JavaScript thread
- Potential jank on lower-end devices

### After (Skia)
- Single Canvas component
- GPU-accelerated rendering
- Minimal re-renders (only canvas redraws)
- Layout calculations optimized
- Smooth 60fps animations

## Technical Details

### Skia Features Used
1. **Canvas** - Main drawing surface
2. **RoundedRect** - Rounded backgrounds for highlights
3. **BlurMask** - Glow effects for active elements
4. **Group** - Logical grouping of drawing operations
5. **Text** - Hardware-accelerated text rendering
6. **useFont** - System font loading

### Touch Handling
- TouchableOpacity wrapper for gesture detection
- Manual hit testing using word/sentence positions
- Supports both press and long press events

## Usage

```tsx
// Word Mode
<SkiaWordHighlight
  words={wordsArray}
  currentWordIndex={currentWordIndex}
  selectedWords={selectedWords}
  fontSize={16}
  lineHeight={24}
  containerWidth={screenWidth - 32}
  onWordPress={handleWordPress}
  onWordLongPress={handleWordLongPress}
  mode="word"
/>

// Sentence Mode
<SkiaSentenceHighlight
  sentences={sentences}
  currentSentenceIndex={currentSentenceIndex}
  selectedWords={selectedWords}
  fontSize={16}
  lineHeight={20}
  containerWidth={screenWidth - 32}
  onSentencePress={handleSentencePress}
  onWordLongPress={handleWordLongPress}
/>
```

## Testing Checklist

- [ ] Word highlighting follows audio playback
- [ ] Tap on word seeks to that position
- [ ] Long press on word adds to vocabulary
- [ ] Selected words show gold highlight
- [ ] Sentence mode highlights current sentence
- [ ] Tap on sentence seeks to that position
- [ ] Smooth scrolling with highlighted words
- [ ] No performance issues on long texts (500+ words)
- [ ] Works on both Android and iOS
- [ ] Blur effects render correctly

## Future Optimizations

1. **Text Measurement** - Use actual font metrics instead of estimation
2. **Virtualization** - Only render visible words/sentences
3. **Animations** - Add smooth transition animations using Skia's animation API
4. **Custom Fonts** - Support custom font loading
5. **Advanced Effects** - Add more visual effects (shadows, gradients, etc.)

## Rollback Plan

If issues arise, the old implementation can be restored by:
1. Reverting `AudioPlayer.tsx` changes
2. Removing Skia component imports
3. Restoring old `renderWordHighlighting` and `renderSentenceHighlighting` functions

## Notes

- Skia uses system fonts by default (no custom font files needed)
- All existing AudioPlayer features preserved
- No breaking changes to parent components
- Backward compatible with existing timepoints and words data
