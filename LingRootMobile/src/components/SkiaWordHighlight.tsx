import React, { useMemo, useEffect } from 'react';
import {
  Canvas,
  Skia,
  Paragraph,
  RoundedRect,
  useFont,
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
  lineHeight = 150,
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

  // Load Roboto Serif font
  const font = useFont(require('../../assets/fonts/Roboto/static/Roboto-Regular.ttf'));

  // STEP 1: Create Paragraph with Skia (ONE-TIME, SYNCHRONOUS)
  const paragraph = useMemo(() => {
    // Wait for font to load
    if (!font) {
      return null;
    }
    
    // Add extra spaces between words ONLY (not between letters)
    const textContent = words.join('   '); // 3 spaces for word spacing
    
    // Combine all styles for Make() - Use strutStyle for guaranteed line height
    const heightMult = lineHeight / fontSize;
    console.log(`🔧 [Word] lineHeight: ${lineHeight}, fontSize: ${fontSize}, heightMultiplier: ${heightMult}`);
    
    const combinedStyle = {
      textAlign: 0,
      strutStyle: {
        strutEnabled: true,
        fontSize: fontSize,
        heightMultiplier: heightMult,
        forceStrutHeight: true, // Force this height
      },
      textStyle: {
        color: Skia.Color('#333333'),
        fontSize: fontSize,
        font: font,
      },
    };
    
    const builder = Skia.ParagraphBuilder.Make(combinedStyle);
    builder.addText(textContent);
    
    const para = builder.build();
    para.layout(containerWidth);
    console.log(`✅ [Word Paragraph] heightMultiplier: ${heightMult} | TOTAL HEIGHT: ${para.getHeight()}px`);
    return para;
  }, [words, fontSize, containerWidth, font,lineHeight]);
  
  // Create white paragraph for highlighted word
  const whiteParagraph = useMemo(() => {
    // Wait for font to load
    if (!font) {
      return null;
    }
    
    const textContent = words.join('   '); // 3 spaces
    
    // Combine all styles for Make() - Use strutStyle for guaranteed line height
    const heightMult = lineHeight / fontSize;
    
    const combinedStyle = {
      textAlign: 0,
      strutStyle: {
        strutEnabled: true,
        fontSize: fontSize,
        heightMultiplier: heightMult,
        forceStrutHeight: true, // Force this height
      },
      textStyle: {
        color: Skia.Color('#FFFFFF'), // White color
        fontSize: fontSize,
        font: font,
      },
    };
    
    const builder = Skia.ParagraphBuilder.Make(combinedStyle);
    builder.addText(textContent);
    
    const para = builder.build();
    para.layout(containerWidth);
    console.log(`lineHeight: ${lineHeight} | PARAGRAPH HEIGHT: ${para.getHeight()}`);
    console.log(`[Paragraph] L: ${lineHeight} F: ${fontSize} | H: ${para.getHeight()}`);
    
    return para;
  }, [words, fontSize, containerWidth, font,lineHeight]);
  
  // STEP 2: Calculate Word Boundaries SYNCHRONOUSLY (NO ASYNC!)
  // Horizontal offset for padding
  const PARAGRAPH_OFFSET_X = 6;
  
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
        
        // Debug: Log rect values for specific words
        if (word.toLowerCase().includes('civil')) {
          console.log(`[RECT DEBUG] Word: "${word}", x: ${rect.x}, width: ${rect.width}`);
        }
        
        boundaries.push({
          x: rect.x + PARAGRAPH_OFFSET_X, // Add offset
          y: rect.y,
          width: rect.width,
          height: rect.height,
          index,
        });
      }
      
      charIndex = endIndex + 3; // +3 for 3 spaces
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
            
            // Add horizontal padding (6px left, 6px right)
            const paddingX = 6;
            const paddingY = 3;
            
            // Calculate position and width, ensuring we don't go negative
            const rectX = Math.max(0, boundary.x - paddingX);
            const leftPaddingUsed = boundary.x - rectX; // Actual padding used on left
            const rectWidth = boundary.width + leftPaddingUsed + paddingX; // Add left padding used + right padding
            
            // Debug first word
            if (idx === 0) {
              console.log(`[Word ${idx}] boundary.x: ${boundary.x}, rectX: ${rectX}, leftPadding: ${leftPaddingUsed}, width: ${boundary.width}, rectWidth: ${rectWidth}`);
            }
            
            return (
              <RoundedRect
                key={idx}
                x={rectX}
                y={boundary.y - paddingY}
                width={rectWidth}
                height={boundary.height + (paddingY * 2)}
                r={6}
                color={color}
              />
            );
          })}
          
          {/* STEP 3: Static Black Paragraph */}
          {paragraph && (
            <Paragraph
              paragraph={paragraph}
              x={PARAGRAPH_OFFSET_X}
              y={0}
              width={containerWidth}
            />
          )}
          
          {/* White Paragraph (only visible on highlighted word) */}
          {currentWordIndex >= 0 && currentWordIndex < wordBoundaries.length && whiteParagraph && (
            <Paragraph
              paragraph={whiteParagraph}
              x={PARAGRAPH_OFFSET_X}
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
