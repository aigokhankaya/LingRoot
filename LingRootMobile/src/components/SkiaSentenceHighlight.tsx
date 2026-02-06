import React, { useMemo, useEffect } from 'react';
import {
  Canvas,
  Skia,
  Paragraph,
  RoundedRect,
  BlurMask,
  useFont,
} from '@shopify/react-native-skia';
import {
  View,
  StyleSheet,
  useWindowDimensions,
  TouchableOpacity,
  GestureResponderEvent,
} from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

interface SentenceBoundary {
  startChar: number;
  endChar: number;
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
}

interface SkiaSentenceHighlightProps {
  sentences: string[];
  currentSentenceIndex: number;
  selectedWords: Set<string>;
  fontSize?: number;
  lineHeight?: number;
  containerWidth?: number;
  onSentencePress?: (index: number, text: string) => void;
  onWordLongPress?: (word: string, index: number) => void;
  visible?: boolean; // Whether parent modal is visible - used to prevent rendering during close
}

export const SkiaSentenceHighlight: React.FC<SkiaSentenceHighlightProps> = React.memo(({
  sentences,
  currentSentenceIndex,
  selectedWords,
  fontSize = 16,
  lineHeight = 20,
  containerWidth,
  onSentencePress,
  onWordLongPress,
  visible = true,
}) => {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const finalContainerWidth = containerWidth || SCREEN_WIDTH - 32;

  // Skia Paragraph API - Zero Reflow Architecture
  const INTERNAL_PADDING = 8; // Kenarlardan 8px boşluk

  const currentSentenceShared = useSharedValue(currentSentenceIndex);
  
  useEffect(() => {
    currentSentenceShared.value = currentSentenceIndex;
  }, [currentSentenceIndex]);

  // Load Roboto Serif font
  const font = useFont(require('../../assets/fonts/Roboto/static/Roboto-Regular.ttf'));

  // STEP 1: Create Paragraph with all sentences
  const paragraph = useMemo(() => {
    // Wait for font to load
    if (!font) {
      return null;
    }
    
    const textContent = sentences.join('.   ') + '.'; // 3 spaces after period 
    
    // Combine all styles for Make() - Use strutStyle for guaranteed line height
    const heightMult = lineHeight / fontSize;
    console.log(`🔧 [Sentence] lineHeight: ${lineHeight}, fontSize: ${fontSize}, heightMultiplier: ${heightMult}`);
    
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
    para.layout(finalContainerWidth - INTERNAL_PADDING * 2); // 8px sağdan, 8px soldan
    console.log(`✅ [Sentence Paragraph] heightMultiplier: ${heightMult} | TOTAL HEIGHT: ${para.getHeight()}px`);
    
    return para;
  }, [sentences, fontSize, finalContainerWidth, font, lineHeight]);
  
  // Create white paragraph for highlighted sentence
  const whiteParagraph = useMemo(() => {
    // Wait for font to load
    if (!font) {
      return null;
    }
    
    const textContent = sentences.join('.   ') + '.'; // 3 spaces
    
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
    para.layout(finalContainerWidth - INTERNAL_PADDING * 2); // 8px sağdan, 8px soldan
    console.log(`[White Sentence] L: ${lineHeight} F: ${fontSize} | H: ${para.getHeight()}`);
    
    return para;
  }, [sentences, fontSize, finalContainerWidth, font, lineHeight]);
  
  // STEP 2: Calculate Sentence Boundaries SYNCHRONOUSLY
  
  const sentenceBoundaries = useMemo(() => {
    if (!paragraph) return [];
    
    const boundaries: SentenceBoundary[] = [];
    let charIndex = 0;
    
    sentences.forEach((sentence, index) => {
      const startIndex = charIndex;
      const endIndex = charIndex + sentence.length;
      
      const rects = paragraph.getRectsForRange(startIndex, endIndex);
      
      if (rects.length > 0) {
        // Merge all rects for multi-line sentences
        const firstRect = rects[0];
        const lastRect = rects[rects.length - 1];
        
        boundaries.push({
          startChar: startIndex,
          endChar: endIndex,
          x: firstRect.x + INTERNAL_PADDING, // Paragraph x=INTERNAL_PADDING'den başlıyor
          y: firstRect.y,
          width: finalContainerWidth - firstRect.x - INTERNAL_PADDING * 2,
          height: lastRect.y + lastRect.height - firstRect.y,
          index,
        });
      }
      
      charIndex = endIndex + 4; // +4 for '.   ' (period + 3 spaces)
    });
    
    return boundaries;
  }, [paragraph, sentences, finalContainerWidth]);

  // Calculate total height and chunk configuration
  const { totalHeight, chunks } = useMemo(() => {
    if (!paragraph) return { totalHeight: 200, chunks: [] };
    
    const fullHeight = paragraph.getHeight() + 20;
    
    // Metal applies 3x scale on some devices, so we need to account for that
    // Max Metal texture: 16384px, with 3x scale = 5461px logical pixels
    // Use 5000px to be safe
    const CHUNK_HEIGHT = 5000; // Safe chunk size accounting for 3x scale
    
    // Calculate number of chunks needed
    const numChunks = Math.ceil(fullHeight / CHUNK_HEIGHT);
    
    if (numChunks > 1) {
      console.log(`📦 [Sentence] Splitting ${fullHeight}px into ${numChunks} chunks of ${CHUNK_HEIGHT}px each`);
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
  
  const handleTouch = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    
    const touchedSentence = sentenceBoundaries.find(
      (boundary) =>
        locationY >= boundary.y &&
        locationY <= boundary.y + boundary.height
    );
    
    if (touchedSentence && onSentencePress) {
      onSentencePress(touchedSentence.index, sentences[touchedSentence.index]);
    }
  };

  // Filter sentence boundaries for each chunk
  const getChunkSentenceBoundaries = (chunk: { startY: number; endY: number }) => {
    return sentenceBoundaries.filter(
      (boundary) => boundary.y >= chunk.startY && boundary.y < chunk.endY
    );
  };

  // Early return when not visible - prevents Skia Canvas from rendering during modal close
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      {chunks.map((chunk) => {
        const chunkBoundaries = getChunkSentenceBoundaries(chunk);
        
        return (
          <View key={chunk.index} style={{ height: chunk.height }}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={handleTouch}
            >
              <Canvas style={{ width: finalContainerWidth, height: chunk.height }}>
                {/* Dynamic Highlight with Glow Effect */}
                {chunkBoundaries.map((boundary, idx) => {
                  const isHighlighted = boundary.index === currentSentenceIndex;
                  
                  if (!isHighlighted) return null;
                  
                  // Add horizontal padding
                  const paddingX = 9;
                  const paddingY = 4;
                  
                  // Adjust Y position relative to chunk
                  const relativeY = boundary.y - chunk.startY;
                  
                  // Calculate position with left padding
                  const rectX = Math.max(0, boundary.x - paddingX);
                  const leftPaddingUsed = boundary.x - rectX;
                  
                  // Calculate width with right padding
                  const idealWidth = boundary.width + leftPaddingUsed + paddingX;
                  const maxAllowedWidth = finalContainerWidth - rectX;
                  const rectWidth = Math.min(idealWidth, maxAllowedWidth);
                  
                  return (
                    <React.Fragment key={boundary.index}>
                      {/* Glow effect */}
                      <RoundedRect
                        x={rectX}
                        y={relativeY - paddingY}
                        width={rectWidth}
                        height={boundary.height + (paddingY * 2)}
                        r={8}
                        color="rgba(0, 122, 255, 0.3)"
                      >
                        <BlurMask blur={8} style="normal" />
                      </RoundedRect>
                      {/* Main background */}
                      <RoundedRect
                        x={rectX}
                        y={relativeY - paddingY}
                        width={rectWidth}
                        height={boundary.height + (paddingY * 2)}
                        r={8}
                        color="rgba(0, 122, 255, 0.25)"
                      />
                    </React.Fragment>
                  );
                })}
                
                {/* Static Black Paragraph - clipped to chunk */}
                {paragraph && (
                  <Paragraph
                    paragraph={paragraph}
                    x={INTERNAL_PADDING}
                    y={-chunk.startY}
                    width={finalContainerWidth - INTERNAL_PADDING * 2}
                  />
                )}
                
                {/* White Paragraph (only visible on highlighted sentence in this chunk) */}
                {currentSentenceIndex >= 0 && currentSentenceIndex < sentenceBoundaries.length && whiteParagraph && (() => {
                  const highlightedBoundary = sentenceBoundaries[currentSentenceIndex];
                  const isInChunk = highlightedBoundary && 
                    highlightedBoundary.y >= chunk.startY && 
                    highlightedBoundary.y < chunk.endY;
                  
                  if (!isInChunk) return null;
                  
                  const paddingX = 6;
                  const paddingY = 4;
                  const rectX = Math.max(0, highlightedBoundary.x - paddingX);
                  const leftPaddingUsed = highlightedBoundary.x - rectX;
                  const idealWidth = highlightedBoundary.width + leftPaddingUsed + paddingX;
                  const maxAllowedWidth = finalContainerWidth - rectX;
                  const rectWidth = Math.min(idealWidth, maxAllowedWidth);
                  const relativeY = highlightedBoundary.y - chunk.startY;
                  const rectY = relativeY - paddingY;
                  const rectHeight = highlightedBoundary.height + (paddingY * 2);
                  
                  return (
                    <Paragraph
                      paragraph={whiteParagraph}
                      x={INTERNAL_PADDING}
                      y={-chunk.startY}
                      width={finalContainerWidth - INTERNAL_PADDING * 2}
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
