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
  const INTERNAL_PADDING = 8; // Kenarlardan 8px boşluk
  
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
    const textContent = words.join('  '); // 2 spaces for word spacing
    
    // Debug: Log first 200 chars
    console.log(`[TEXT CONTENT] First 200 chars: "${textContent.substring(0, 200)}"`);
    console.log(`[TEXT CONTENT] Total length: ${textContent.length}, Words count: ${words.length}`);
    
    // Combine all styles for Make() - Use strutStyle for guaranteed line height
    const heightMult = lineHeight / fontSize;
    console.log(`🔧 [Word] lineHeight: ${lineHeight}, fontSize: ${fontSize}, heightMultiplier: ${heightMult}`);
    
    const combinedStyle = {
      textAlign: 3, // 0=left, 1=right, 2=center, 3=justify
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
    para.layout(containerWidth - INTERNAL_PADDING * 2); // 8px sağdan, 8px soldan
    console.log(`✅ [Word Paragraph] containerWidth: ${containerWidth}`);
    console.log(`✅ [Word Paragraph] heightMultiplier: ${heightMult} | TOTAL HEIGHT: ${para.getHeight()}px`);
    return para;
  }, [words, fontSize, containerWidth, font,lineHeight]);
  
  // Create white paragraph for highlighted word
  const whiteParagraph = useMemo(() => {
    // Wait for font to load
    if (!font) {
      return null;
    }
    
    const textContent = words.join('  '); // 2 spaces for word spacing
    
    // Combine all styles for Make() - Use strutStyle for guaranteed line height
    const heightMult = lineHeight / fontSize;
    
    const combinedStyle = {
      textAlign: 3, // 0=left, 1=right, 2=center, 3=justify
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
    para.layout(containerWidth - INTERNAL_PADDING * 2); // 8px sağdan, 8px soldan
    console.log(`lineHeight: ${lineHeight} | PARAGRAPH HEIGHT: ${para.getHeight()}`);
    console.log(`[Paragraph] L: ${lineHeight} F: ${fontSize} | H: ${para.getHeight()}`);
    
    return para;
  }, [words, fontSize, containerWidth, font,lineHeight]);
  
  // STEP 2: Calculate Word Boundaries SYNCHRONOUSLY (NO ASYNC!)
  
  const wordBoundaries = useMemo(() => {
    if (!paragraph) return [];
    
    const boundaries: WordBoundary[] = [];
    let charIndex = 0;
    
    // Find "Furthermore" index first
    const furthermoreIdx = words.findIndex(w => w.toLowerCase().includes('furthermore'));
    
    words.forEach((word, index) => {
      const startIndex = charIndex;
      const endIndex = charIndex + word.length;
      
      // Debug: Log around "Furthermore" (5 before, 5 after)
      if (furthermoreIdx !== -1 && index >= furthermoreIdx - 5 && index <= furthermoreIdx + 5) {
        console.log(`[WORD ${index}] "${word}" | start: ${startIndex}, end: ${endIndex}, charIndex will be: ${endIndex + (index < words.length - 1 ? 2 : 0)}`);
      }
      
      // Get SYNCHRONOUS metrics from Paragraph
      const rects = paragraph.getRectsForRange(startIndex, endIndex);
      
      if (rects.length > 0) {
        const rect = rects[0];
        
        boundaries.push({
          x: rect.x + INTERNAL_PADDING, // Paragraph x=INTERNAL_PADDING'den başlıyor
          y: rect.y,
          width: rect.width,
          height: rect.height,
          index,
        });
      } else {
        console.warn(`[WORD ${index}] "${word}" | NO RECTS FOUND! start: ${startIndex}, end: ${endIndex}`);
      }
      
      // Add 2 spaces only if not the last word
      charIndex = endIndex + (index < words.length - 1 ? 2 : 0); 
    });
    
    return boundaries;
  }, [paragraph, words]);

  // Calculate total height and chunk configuration
  const { totalHeight, chunks } = useMemo(() => {
    if (!paragraph) return { totalHeight: 200, chunks: [] };
    
    const fullHeight = paragraph.getHeight() + 20;
    
    // Metal applies 3x scale on some devices, so we need to account for that
    // Max Metal texture: 16384px, with 3x scale = 5461px logical pixels
    // Use 5000px to be safe
    const CHUNK_HEIGHT = 5000; // Safe chunk size accounting for 3x scale
    
    // Safety check: if height is too large, split into chunks
    if (fullHeight > CHUNK_HEIGHT) {
      console.warn(`⚠️ [Word] Paragraph too tall (${fullHeight}px), splitting into chunks`);
    }
    
    // Calculate number of chunks needed
    const numChunks = Math.ceil(fullHeight / CHUNK_HEIGHT);
    
    if (numChunks > 1) {
      console.log(`📦 Splitting ${fullHeight}px into ${numChunks} chunks of ${CHUNK_HEIGHT}px each`);
    }
    
    // Create chunk definitions
    const chunkList = Array.from({ length: numChunks }, (_, i) => ({
      index: i,
      startY: i * CHUNK_HEIGHT,
      endY: Math.min((i + 1) * CHUNK_HEIGHT, fullHeight),
      height: Math.min(CHUNK_HEIGHT, fullHeight - i * CHUNK_HEIGHT),
    }));
    
    return { totalHeight: fullHeight, chunks: chunkList };
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


  // Filter word boundaries for each chunk
  const getChunkWordBoundaries = (chunk: { startY: number; endY: number }) => {
    return wordBoundaries.filter(
      (boundary) => boundary.y >= chunk.startY && boundary.y < chunk.endY
    );
  };

  // STEP 3 & 4: Render chunks with Static Paragraph + Dynamic Highlight
  return (
    <View style={styles.container}>
      {chunks.map((chunk) => {
        const chunkBoundaries = getChunkWordBoundaries(chunk);
        
        return (
          <View key={chunk.index} style={{ height: chunk.height }}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={handleTouch}
              onLongPress={handleLongPress}
              delayLongPress={500}
            >
              <Canvas style={{ width: containerWidth, height: chunk.height }}>
                {/* STEP 4: Dynamic Highlight - 60fps, NO RERENDER */}
                {chunkBoundaries.map((boundary, idx) => {
                  const isHighlighted = boundary.index === currentWordIndex;
                  const isSelected = selectedWords.has(
                    words[boundary.index].replace(/[.,!?;:]/g, '').toLowerCase()
                  );
                  
                  if (!isHighlighted && !isSelected) return null;
                  
                  const color = isHighlighted ? '#007AFF' : '#FFD700';
                  
                  // Add horizontal padding
                  const paddingX = 4;
                  const paddingY = 3;
                  
                  // Adjust Y position relative to chunk
                  const relativeY = boundary.y - chunk.startY;
                  
                  // Calculate position with left padding
                  const rectX = Math.max(0, boundary.x - paddingX);
                  const leftPaddingUsed = boundary.x - rectX;
                  
                  // Calculate width with right padding
                  const idealWidth = boundary.width + leftPaddingUsed + paddingX;
                  const maxAllowedWidth = containerWidth - rectX;
                  const rectWidth = Math.min(idealWidth, maxAllowedWidth);
                  
                  return (
                    <RoundedRect
                      key={boundary.index}
                      x={rectX}
                      y={relativeY - paddingY}
                      width={rectWidth}
                      height={boundary.height + (paddingY * 2)}
                      r={6}
                      color={color}
                    />
                  );
                })}
                
                {/* STEP 3: Static Black Paragraph - clipped to chunk */}
                {paragraph && (
                  <Paragraph
                    paragraph={paragraph}
                    x={INTERNAL_PADDING}
                    y={-chunk.startY}
                    width={containerWidth - INTERNAL_PADDING * 2}
                  />
                )}
                
                {/* White Paragraph (only visible on highlighted word in this chunk) */}
                {currentWordIndex >= 0 && currentWordIndex < wordBoundaries.length && whiteParagraph && (() => {
                  const highlightedBoundary = wordBoundaries[currentWordIndex];
                  const isInChunk = highlightedBoundary && 
                    highlightedBoundary.y >= chunk.startY && 
                    highlightedBoundary.y < chunk.endY;
                  
                  if (!isInChunk) return null;
                  
                  const paddingX = 4;
                  const paddingY = 3;
                  const rectX = Math.max(0, highlightedBoundary.x - paddingX);
                  const leftPaddingUsed = highlightedBoundary.x - rectX;
                  const idealWidth = highlightedBoundary.width + leftPaddingUsed + paddingX;
                  const maxAllowedWidth = containerWidth - rectX;
                  const rectWidth = Math.min(idealWidth, maxAllowedWidth);
                  const relativeY = highlightedBoundary.y - chunk.startY;
                  const rectY = relativeY - paddingY;
                  const rectHeight = highlightedBoundary.height + (paddingY * 2);
                  
                  return (
                    <Paragraph
                      paragraph={whiteParagraph}
                      x={INTERNAL_PADDING}
                      y={-chunk.startY}
                      width={containerWidth - INTERNAL_PADDING * 2}
                      clip={{
                        x: rectX,
                        y: rectY,
                        width: rectWidth,
                        height: rectHeight,
                      }}
                    />
                  );
                })()}
              </Canvas>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
