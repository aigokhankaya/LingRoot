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
  Dimensions,
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
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const SkiaSentenceHighlight: React.FC<SkiaSentenceHighlightProps> = React.memo(({
  sentences,
  currentSentenceIndex,
  selectedWords,
  fontSize = 16,
  lineHeight = 20,
  containerWidth = SCREEN_WIDTH - 32,
  onSentencePress,
  onWordLongPress,
}) => {
  // Skia Paragraph API - Zero Reflow Architecture
  
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
    console.log(`✅ [Sentence Paragraph] heightMultiplier: ${heightMult} | TOTAL HEIGHT: ${para.getHeight()}px`);
    
    return para;
  }, [sentences, fontSize, containerWidth, font, lineHeight]);
  
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
    console.log(`[White Sentence] L: ${lineHeight} F: ${fontSize} | H: ${para.getHeight()}`);
    
    return para;
  }, [sentences, fontSize, containerWidth, font, lineHeight]);
  
  // STEP 2: Calculate Sentence Boundaries SYNCHRONOUSLY
  // Horizontal offset for padding
  const PARAGRAPH_OFFSET_X = 6;
  
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
          x: firstRect.x + PARAGRAPH_OFFSET_X, // Add offset
          y: firstRect.y,
          width: containerWidth - firstRect.x - PARAGRAPH_OFFSET_X,
          height: lastRect.y + lastRect.height - firstRect.y,
          index,
        });
      }
      
      charIndex = endIndex + 4; // +4 for '.   ' (period + 3 spaces)
    });
    
    return boundaries;
  }, [paragraph, sentences, containerWidth]);

  const canvasHeight = useMemo(() => {
    return paragraph ? paragraph.getHeight() + 20 : 200;
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


  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleTouch}
      >
        <Canvas style={{ width: containerWidth, height: canvasHeight }}>
          {/* Dynamic Highlight with Glow Effect */}
          {sentenceBoundaries.map((boundary, idx) => {
            const isHighlighted = idx === currentSentenceIndex;
            
            if (!isHighlighted) return null;
            
            // Add horizontal padding (6px left, 6px right for sentences)
            const paddingX = 6;
            const paddingY = 4;
            
            // Calculate position and width, ensuring we don't go negative
            const rectX = Math.max(0, boundary.x - paddingX);
            const leftPaddingUsed = boundary.x - rectX; // Actual padding used on left
            const rectWidth = boundary.width + leftPaddingUsed + paddingX; // Add left padding used + right padding
            
            return (
              <React.Fragment key={idx}>
                {/* Glow effect */}
                <RoundedRect
                  x={rectX}
                  y={boundary.y - paddingY}
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
                  y={boundary.y - paddingY}
                  width={rectWidth}
                  height={boundary.height + (paddingY * 2)}
                  r={8}
                  color="rgba(0, 122, 255, 0.25)"
                />
              </React.Fragment>
            );
          })}
          
          {/* Static Black Paragraph */}
          {paragraph && (
            <Paragraph
              paragraph={paragraph}
              x={PARAGRAPH_OFFSET_X}
              y={0}
              width={containerWidth}
            />
          )}
          
          {/* White Paragraph (only visible on highlighted sentence) */}
          {currentSentenceIndex >= 0 && currentSentenceIndex < sentenceBoundaries.length && whiteParagraph && (
            <Paragraph
              paragraph={whiteParagraph}
              x={PARAGRAPH_OFFSET_X}
              y={0}
              width={containerWidth}
              clip={{
                x: Math.max(0, sentenceBoundaries[currentSentenceIndex].x - 8),
                y: sentenceBoundaries[currentSentenceIndex].y - 4,
                width: sentenceBoundaries[currentSentenceIndex].width + 16,
                height: sentenceBoundaries[currentSentenceIndex].height + 8,
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
