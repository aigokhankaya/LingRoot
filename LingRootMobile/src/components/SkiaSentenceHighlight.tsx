import React, { useMemo, useEffect } from 'react';
import {
  Canvas,
  Skia,
  Paragraph,
  RoundedRect,
  BlurMask,
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

  // STEP 1: Create Paragraph with all sentences
  const paragraph = useMemo(() => {
    const textContent = sentences.join('.   ') + '.'; // Triple space after period
    
    const paragraphStyle = {
      textAlign: 0,
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
  }, [sentences, fontSize, containerWidth]);
  
  // Create white paragraph for highlighted sentence
  const whiteParagraph = useMemo(() => {
    const textContent = sentences.join('.   ') + '.';
    
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
  }, [sentences, fontSize, containerWidth]);
  
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
          x: firstRect.x,
          y: firstRect.y,
          width: containerWidth - firstRect.x,
          height: lastRect.y + lastRect.height - firstRect.y,
          index,
        });
      }
      
      charIndex = endIndex + 4; // +4 for '.   ' (period + triple space)
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
            
            return (
              <React.Fragment key={idx}>
                {/* Glow effect */}
                <RoundedRect
                  x={Math.max(0, boundary.x - 4)} // Don't go below 0
                  y={boundary.y - 2}
                  width={boundary.x < 4 ? boundary.width + boundary.x + 4 : boundary.width + 8} // Adjust width if at edge
                  height={boundary.height + 4}
                  r={6}
                  color="rgba(0, 122, 255, 0.3)"
                >
                  <BlurMask blur={6} style="normal" />
                </RoundedRect>
                {/* Main background */}
                <RoundedRect
                  x={Math.max(0, boundary.x - 4)} // Don't go below 0
                  y={boundary.y - 2}
                  width={boundary.x < 4 ? boundary.width + boundary.x + 4 : boundary.width + 8} // Adjust width if at edge
                  height={boundary.height + 4}
                  r={6}
                  color="rgba(0, 122, 255, 0.25)"
                />
              </React.Fragment>
            );
          })}
          
          {/* Static Black Paragraph */}
          {paragraph && (
            <Paragraph
              paragraph={paragraph}
              x={0}
              y={0}
              width={containerWidth}
            />
          )}
          
          {/* White Paragraph (only visible on highlighted sentence) */}
          {currentSentenceIndex >= 0 && currentSentenceIndex < sentenceBoundaries.length && whiteParagraph && (
            <Paragraph
              paragraph={whiteParagraph}
              x={0}
              y={0}
              width={containerWidth}
              clip={{
                x: Math.max(0, sentenceBoundaries[currentSentenceIndex].x - 4),
                y: sentenceBoundaries[currentSentenceIndex].y - 2,
                width: sentenceBoundaries[currentSentenceIndex].width + 8,
                height: sentenceBoundaries[currentSentenceIndex].height + 4,
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
