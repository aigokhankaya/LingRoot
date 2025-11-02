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
            const paddingX = 4;
            const paddingY = 3;
            
            // Calculate position with left padding
            const rectX = Math.max(0, boundary.x - paddingX);
            const leftPaddingUsed = boundary.x - rectX;
            
            // Calculate width with right padding, but don't exceed container
            const idealWidth = boundary.width + leftPaddingUsed + paddingX;
            const maxAllowedWidth = containerWidth - rectX;
            const rectWidth = Math.min(idealWidth, maxAllowedWidth);
            
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
              x={INTERNAL_PADDING}
              y={0}
              width={containerWidth - INTERNAL_PADDING * 2}
            />
          )}
          
          {/* White Paragraph (only visible on highlighted word) */}
          {currentWordIndex >= 0 && currentWordIndex < wordBoundaries.length && whiteParagraph && (
            <Paragraph
              paragraph={whiteParagraph}
              x={INTERNAL_PADDING}
              y={0}
              width={containerWidth - INTERNAL_PADDING * 2}
              clip={(() => {
                // 1. RoundedRect'teki padding değerlerinin aynısı
                const paddingX = 4;
                const paddingY = 3;
                
                // 2. Aktif kelimenin sınırlarını al
                const boundary = wordBoundaries[currentWordIndex];

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
