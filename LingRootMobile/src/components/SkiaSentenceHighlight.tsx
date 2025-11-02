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
    para.layout(containerWidth - INTERNAL_PADDING * 2); // 8px sağdan, 8px soldan
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
    console.log(`[White Sentence] L: ${lineHeight} F: ${fontSize} | H: ${para.getHeight()}`);
    
    return para;
  }, [sentences, fontSize, containerWidth, font, lineHeight]);
  
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
          width: containerWidth - firstRect.x - INTERNAL_PADDING * 2,
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
            const paddingX = 9;
            const paddingY = 4;
            
            // Calculate position with left padding
            const rectX = Math.max(0, boundary.x - paddingX);
            const leftPaddingUsed = boundary.x - rectX;
            
            // Calculate width with right padding, but don't exceed container
            const idealWidth = boundary.width + leftPaddingUsed + paddingX;
            const maxAllowedWidth = containerWidth - rectX;
            const rectWidth = Math.min(idealWidth, maxAllowedWidth);
            
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
              x={INTERNAL_PADDING}
              y={0}
              width={containerWidth - INTERNAL_PADDING * 2}
            />
          )}
          
          {/* White Paragraph (only visible on highlighted sentence) */}
          {currentSentenceIndex >= 0 && currentSentenceIndex < sentenceBoundaries.length && whiteParagraph && (
            <Paragraph
              paragraph={whiteParagraph}
              x={INTERNAL_PADDING}
              y={0}
              width={containerWidth - INTERNAL_PADDING * 2}
              clip={(() => {
                // 1. RoundedRect'teki padding değerlerinin aynısı
                const paddingX = 6;
                const paddingY = 4;
                
                // 2. Aktif cümlenin sınırlarını al
                const boundary = sentenceBoundaries[currentSentenceIndex];

                // Hata ayıklama: boundary yoksa boş alan kliple
                if (!boundary) {
                  return { x: 0, y: 0, width: 0, height: 0 };
                }

                // 3. RoundedRect'teki hesaplamanın aynısı
                const rectX = Math.max(0, boundary.x - paddingX);
                const leftPaddingUsed = boundary.x - rectX;
                
                const idealWidth = boundary.width + leftPaddingUsed + paddingX;
                const maxAllowedWidth = containerWidth - rectX;
                const rectWidth = Math.min(idealWidth, maxAllowedWidth);
                
                const rectY = boundary.y - paddingY;
                const rectHeight = boundary.height + (paddingY * 2);

                // 4. Hesaplanmış klip alanını döndür
                return {
                  x: rectX,
                  y: rectY,
                  width: rectWidth,
                  height: rectHeight,
                };
              })()}
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
