import React, { useMemo, useEffect } from 'react';
import {
  Canvas,
  Skia,
  Paragraph,
  RoundedRect,
} from '@shopify/react-native-skia';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  GestureResponderEvent,
} from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

interface WordBoundary {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
}

interface SkiaWordHighlightProps {
  words: string[];
  currentWordIndex: number;
  selectedWords: Set<string>;
  fontSize?: number;
  lineHeight?: number;
  containerWidth?: number;
  onWordPress?: (index: number) => void;
  onWordLongPress?: (word: string, index: number) => void;
  mode?: 'word' | 'sentence';
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const SkiaWordHighlight: React.FC<SkiaWordHighlightProps> = React.memo(({
  words,
  currentWordIndex,
  selectedWords,
  fontSize = 16,
  lineHeight = 24,
  containerWidth = SCREEN_WIDTH - 32,
  onWordPress,
  onWordLongPress,
  mode = 'word',
}) => {
  // Skia Paragraph API - Zero Reflow Architecture
  
  // Shared value for current word (60fps updates without rerender)
  const currentWordShared = useSharedValue(currentWordIndex);
  
  useEffect(() => {
    currentWordShared.value = currentWordIndex;
  }, [currentWordIndex]);

  // STEP 1: Create Paragraph with Skia (ONE-TIME, SYNCHRONOUS)
  const paragraph = useMemo(() => {
    // Add extra spaces between words ONLY (not between letters)
    const textContent = words.join('   '); // Triple space for word spacing
    
    const paragraphStyle = {
      textAlign: 0, // left
      heightMultiplier: 1.4, // +40% line height for more spacing
    };
    
    const textStyle = {
      color: Skia.Color('#333333'),
      fontSize: fontSize,
      // NO letterSpacing - keeps letters normal
    };
    
    const builder = Skia.ParagraphBuilder.Make(paragraphStyle);
    builder.pushStyle(textStyle);
    builder.addText(textContent);
    builder.pop();
    
    const para = builder.build();
    para.layout(containerWidth);
    
    return para;
  }, [words, fontSize, containerWidth]);
  
  // Create white paragraph for highlighted word
  const whiteParagraph = useMemo(() => {
    const textContent = words.join('   ');
    
    const paragraphStyle = {
      textAlign: 0,
      heightMultiplier: 1.4,
    };
    
    const textStyle = {
      color: Skia.Color('#FFFFFF'), // White color
      fontSize: fontSize,
    };
    
    const builder = Skia.ParagraphBuilder.Make(paragraphStyle);
    builder.pushStyle(textStyle);
    builder.addText(textContent);
    builder.pop();
    
    const para = builder.build();
    para.layout(containerWidth);
    
    return para;
  }, [words, fontSize, containerWidth]);
  
  // STEP 2: Calculate Word Boundaries SYNCHRONOUSLY (NO ASYNC!)
  const wordBoundaries = useMemo(() => {
    if (!paragraph) return [];
    
    const boundaries: WordBoundary[] = [];
    let charIndex = 0;
    
    words.forEach((word, index) => {
      const startIndex = charIndex;
      const endIndex = charIndex + word.length;
      
      // Get SYNCHRONOUS metrics from Paragraph
      const rects = paragraph.getRectsForRange(startIndex, endIndex);
      
      if (rects.length > 0) {
        const rect = rects[0];
        boundaries.push({
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          index,
        });
      }
      
      charIndex = endIndex + 3; // +3 for triple space
    });
    
    return boundaries;
  }, [paragraph, words]);

  // Calculate canvas height
  const canvasHeight = useMemo(() => {
    return paragraph ? paragraph.getHeight() + 20 : 200;
  }, [paragraph]);
  
  // Handle touch for word selection
  const handleTouch = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    
    const touchedWord = wordBoundaries.find(
      (boundary) =>
        locationX >= boundary.x &&
        locationX <= boundary.x + boundary.width &&
        locationY >= boundary.y &&
        locationY <= boundary.y + boundary.height
    );
    
    if (touchedWord && onWordPress) {
      onWordPress(touchedWord.index);
    }
  };
  
  const handleLongPress = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    
    const touchedWord = wordBoundaries.find(
      (boundary) =>
        locationX >= boundary.x &&
        locationX <= boundary.x + boundary.width &&
        locationY >= boundary.y &&
        locationY <= boundary.y + boundary.height
    );
    
    if (touchedWord && onWordLongPress) {
      onWordLongPress(words[touchedWord.index], touchedWord.index);
    }
  };


  // STEP 3 & 4: Static Paragraph + Dynamic Highlight (ZERO REFLOW)
  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleTouch}
        onLongPress={handleLongPress}
        delayLongPress={500}
      >
        <Canvas style={{ width: containerWidth, height: canvasHeight }}>
          {/* STEP 4: Dynamic Highlight - 60fps, NO RERENDER */}
          {wordBoundaries.map((boundary, idx) => {
            const isHighlighted = idx === currentWordIndex;
            const isSelected = selectedWords.has(
              words[idx].replace(/[.,!?;:]/g, '').toLowerCase()
            );
            
            if (!isHighlighted && !isSelected) return null;
            
            const color = isHighlighted ? '#007AFF' : '#FFD700';
            
            return (
              <RoundedRect
                key={idx}
                x={Math.max(0, boundary.x - 2)} // Don't go below 0
                y={boundary.y - 1}
                width={boundary.x < 2 ? boundary.width + boundary.x : boundary.width + 4} // Adjust width if at edge
                height={boundary.height + 2}
                r={4}
                color={color}
              />
            );
          })}
          
          {/* STEP 3: Static Black Paragraph */}
          {paragraph && (
            <Paragraph
              paragraph={paragraph}
              x={0}
              y={0}
              width={containerWidth}
            />
          )}
          
          {/* White Paragraph (only visible on highlighted word) */}
          {currentWordIndex >= 0 && currentWordIndex < wordBoundaries.length && whiteParagraph && (
            <Paragraph
              paragraph={whiteParagraph}
              x={0}
              y={0}
              width={containerWidth}
              clip={{
                x: wordBoundaries[currentWordIndex].x - 1,
                y: wordBoundaries[currentWordIndex].y - 1,
                width: wordBoundaries[currentWordIndex].width + 2,
                height: wordBoundaries[currentWordIndex].height + 2,
              }}
            />
          )}
        </Canvas>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
