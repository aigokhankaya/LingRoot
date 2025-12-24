import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
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
  Text,
  Modal,
} from 'react-native';
import { useSharedValue, useDerivedValue } from 'react-native-reanimated';

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
  scrollOffsetRef?: React.RefObject<number>;
  onWordPress?: (index: number) => void;
  onWordLongPress?: (word: string, index: number) => void;
  mode?: 'word' | 'sentence';
  onWordPositionChange?: (info: { index: number; top: number; bottom: number; height: number }) => void;
  patternData?: Array<{
    pattern: string;
    pattern_tr: string;
    example_sentence: string;
    example_sentence_tr: string;
  }>; // Full pattern data with translations
  showPatterns?: boolean; // Whether to show pattern highlighting
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ACCENT_COLOR = 'rgba(248, 177, 59, 1)';

export const SkiaWordHighlight: React.FC<SkiaWordHighlightProps> = React.memo(({
  words,
  currentWordIndex,
  selectedWords,
  fontSize = 16,
  lineHeight = 150,
  containerWidth = SCREEN_WIDTH - 32,
  scrollOffsetRef,
  onWordPress,
  onWordLongPress,
  mode = 'word',
  onWordPositionChange,
  patternData = [],
  showPatterns = false,
}) => {
  console.log(`🎨 [SkiaWordHighlight] Received props - showPatterns: ${showPatterns}, patternData.length: ${patternData.length}`);
  if (showPatterns && patternData.length > 0) {
    console.log(`🎨 [SkiaWordHighlight] Pattern data:`, patternData.map(p => p.pattern));
  }

  // State for pattern popup
  const [selectedPattern, setSelectedPattern] = useState<typeof patternData[0] | null>(null);

  // Calculate pattern phrase ranges (startIndex, endIndex)
  const patternRanges = useMemo(() => {
    if (!showPatterns || patternData.length === 0) return [];

    const ranges: Array<{ startIndex: number; endIndex: number; patternData: typeof patternData[0] }> = [];

    // Check each pattern
    for (const pData of patternData) {
      const phrase = pData.pattern;
      const phraseWords = phrase.split(/\s+/);
      const phraseLength = phraseWords.length;

      // Scan through words to find matches
      for (let startIdx = 0; startIdx <= words.length - phraseLength; startIdx++) {
        const candidateWords = words.slice(startIdx, startIdx + phraseLength);
        const candidatePhrase = candidateWords.map(w => w.toLowerCase().replace(/[.,!?;:]/g, '')).join(' ');

        if (candidatePhrase === phrase) {
          ranges.push({
            startIndex: startIdx,
            endIndex: startIdx + phraseLength - 1,
            patternData: pData
          });
          console.log(`🎯 [SkiaWordHighlight] Found pattern "${phrase}" at indices ${startIdx}-${startIdx + phraseLength - 1}`);
        }
      }
    }

    return ranges;
  }, [words, showPatterns, patternData]);

  // Helper: Check if a word at index is part of a pattern phrase
  const isWordInPattern = useCallback((wordIndex: number): boolean => {
    return patternRanges.some(range =>
      wordIndex >= range.startIndex && wordIndex <= range.endIndex
    );
  }, [patternRanges]);

  // Helper: Get pattern data for a word index
  const getPatternForWord = useCallback((wordIndex: number) => {
    const range = patternRanges.find(r =>
      wordIndex >= r.startIndex && wordIndex <= r.endIndex
    );
    return range?.patternData || null;
  }, [patternRanges]);

  // Handle pattern click
  const handlePatternClick = useCallback((wordIndex: number) => {
    const pattern = getPatternForWord(wordIndex);
    if (pattern) {
      console.log(`🎯 [Pattern Click] Opening popup for: "${pattern.pattern}"`);
      setSelectedPattern(pattern);
    }
  }, [getPatternForWord]);

  // Skia Paragraph API - Zero Reflow Architecture
  const INTERNAL_PADDING = 8; // Kenarlardan 8px boşluk
  const [isFontReady, setIsFontReady] = useState(false);
  const fallbackLayouts = useRef<Map<number, { top: number; bottom: number; height: number }>>(new Map());

  // Shared value for current word (60fps updates without rerender)
  const currentWordShared = useSharedValue(currentWordIndex);

  useEffect(() => {
    currentWordShared.value = currentWordIndex;
  }, [currentWordIndex]);

  // Load Roboto Serif font
  const font = useFont(require('../../assets/fonts/Roboto/static/Roboto-Regular.ttf'));

  useEffect(() => {
    if (font && !isFontReady) {
      setIsFontReady(true);
    }
  }, [font, isFontReady]);

  const maybeEmitFallbackPosition = (index: number) => {
    if (!onWordPositionChange) return;
    const layout = fallbackLayouts.current.get(index);
    if (!layout) return;
    onWordPositionChange({ index, ...layout });
  };

  const handleFallbackLayout = (index: number) => (event: any) => {
    const { y, height } = event.nativeEvent.layout;
    const layout = { top: y, bottom: y + height, height };
    fallbackLayouts.current.set(index, layout);
    if (index === currentWordIndex) {
      maybeEmitFallbackPosition(index);
    }
  };

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
  }, [words, fontSize, containerWidth, font, lineHeight]);

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
  }, [words, fontSize, containerWidth, font, lineHeight]);

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

  useEffect(() => {
    if (!onWordPositionChange) return;
    if (currentWordIndex < 0 || currentWordIndex >= wordBoundaries.length) return;

    const boundary = wordBoundaries[currentWordIndex];
    if (!boundary) return;

    onWordPositionChange({
      index: currentWordIndex,
      top: boundary.y,
      bottom: boundary.y + boundary.height,
      height: boundary.height,
    });
  }, [currentWordIndex, wordBoundaries, onWordPositionChange]);

  // Calculate total height and chunk configuration
  const { totalHeight, chunks } = useMemo(() => {
    if (!paragraph) return { totalHeight: 200, chunks: [] };

    const fullHeight = paragraph.getHeight() + 20;

    // Metal applies 3x scale on some devices, so we need to account for that
    // Max Metal texture: 16384px, with 3x scale = 5461px logical pixels
    // Use 3000px to be extra safe and avoid crashes with very long texts
    const CHUNK_HEIGHT = 3000; // Conservative chunk size to prevent crashes

    // Calculate number of chunks needed
    const numChunks = Math.ceil(fullHeight / CHUNK_HEIGHT);

    // Only log for very large texts (more than 4 chunks)
    if (numChunks > 4) {
      console.log(`📦 [Skia] Large text (${fullHeight}px) split into ${numChunks} chunks`);
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

  // Handle touch for word selection - needs chunk context
  const createTouchHandler = (chunk: { startY: number; endY: number; index: number }) => (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;

    // Get boundaries for THIS chunk only
    const chunkBoundaries = wordBoundaries.filter(
      (boundary) => boundary.y >= chunk.startY && boundary.y < chunk.endY
    );

    // Y coordinate is relative to chunk, so just use locationY directly
    const relativeY = locationY;

    console.log(`👆 [TOUCH START] Chunk ${chunk.index}, localY: ${locationY.toFixed(1)}, chunkStart: ${chunk.startY}, chunkBoundaries: ${chunkBoundaries.length}`);

    // Find word in THIS chunk's boundaries
    const touchedWord = chunkBoundaries.find(
      (boundary) => {
        const boundaryRelativeY = boundary.y - chunk.startY;
        return locationX >= boundary.x &&
          locationX <= boundary.x + boundary.width &&
          relativeY >= boundaryRelativeY &&
          relativeY <= boundaryRelativeY + boundary.height;
      }
    );

    if (touchedWord) {
      console.log(`🎯 [TOUCH] Word "${words[touchedWord.index]}" at index ${touchedWord.index}, localY: ${locationY.toFixed(1)}, boundary.y: ${touchedWord.y}, relativeY: ${(touchedWord.y - chunk.startY).toFixed(1)}`);

      // Check if this word is part of a pattern
      const pattern = getPatternForWord(touchedWord.index);
      if (pattern) {
        // Pattern word clicked - show popup
        handlePatternClick(touchedWord.index);
      } else if (onWordPress) {
        // Regular word clicked - normal behavior
        onWordPress(touchedWord.index);
      }
    } else {
      console.log(`❌ [TOUCH] No word found at X: ${locationX.toFixed(1)}, localY: ${locationY.toFixed(1)}`);
    }
  };

  // Handle long press for vocabulary add – mirror chunk-relative logic from createTouchHandler
  const createLongPressHandler = (chunk: { startY: number; endY: number; index: number }) => (event: GestureResponderEvent) => {
    console.log(`🔵 [SkiaWordHighlight onLongPress] TRIGGERED! Chunk: ${chunk.index}`);
    const { locationX, locationY } = event.nativeEvent;

    // Use the same chunk-relative boundaries as normal taps
    const chunkBoundaries = getChunkWordBoundaries(chunk);
    const relativeY = locationY;

    const touchedWord = chunkBoundaries.find((boundary) => {
      const boundaryRelativeY = boundary.y - chunk.startY;
      return (
        locationX >= boundary.x &&
        locationX <= boundary.x + boundary.width &&
        relativeY >= boundaryRelativeY &&
        relativeY <= boundaryRelativeY + boundary.height
      );
    });

    console.log(`🔵 [SkiaWordHighlight] touchedWord: ${touchedWord ? words[touchedWord.index] : 'null'}, onWordLongPress exists: ${!!onWordLongPress}`);

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
  if (!isFontReady || !paragraph) {
    return (
      <View style={fallbackStyles.container}>
        {words.map((word, index) => {
          const cleanWord = word.replace(/[.,!?;:]/g, '').toLowerCase();
          const isHighlighted = index === currentWordIndex;
          const isSelected = selectedWords.has(cleanWord);
          const isPattern = isWordInPattern(index);

          return (
            <TouchableOpacity
              key={index}
              onPress={() => onWordPress?.(index)}
              onLongPress={() => onWordLongPress?.(word, index)}
              onLayout={handleFallbackLayout(index)}
              style={[
                fallbackStyles.word,
                isHighlighted && fallbackStyles.highlightedWord,
                isSelected && fallbackStyles.selectedWord,
                isPattern && fallbackStyles.patternWord,
              ]}
            >
              <Text
                style={[
                  fallbackStyles.wordText,
                  isHighlighted && fallbackStyles.highlightedWordText,
                  isSelected && fallbackStyles.selectedWordText,
                  isPattern && fallbackStyles.patternWordText,
                ]}
              >
                {word}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {chunks.map((chunk) => {
        const chunkBoundaries = getChunkWordBoundaries(chunk);

        return (
          <View key={chunk.index} style={{ height: chunk.height }}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={createTouchHandler(chunk)}
              onLongPress={createLongPressHandler(chunk)}
              delayLongPress={500}
            >
              <Canvas style={{ width: containerWidth, height: chunk.height }}>
                {/* Pattern phrase highlights - render first (lowest priority) */}
                {patternRanges.map((range, rangeIdx) => {
                  // Get boundaries for all words in this phrase
                  const phraseBoundaries = chunkBoundaries.filter(b =>
                    b.index >= range.startIndex && b.index <= range.endIndex
                  );

                  if (phraseBoundaries.length === 0) return null;

                  // Calculate bounding box for entire phrase
                  const firstBoundary = phraseBoundaries[0];
                  const lastBoundary = phraseBoundaries[phraseBoundaries.length - 1];

                  const paddingX = 4;
                  const paddingY = 3;
                  const relativeY = firstBoundary.y - chunk.startY;

                  // Check if phrase spans multiple lines
                  const isSameLine = firstBoundary.y === lastBoundary.y;

                  if (isSameLine) {
                    // Single line: one rectangle
                    const phraseX = firstBoundary.x;
                    const phraseWidth = (lastBoundary.x + lastBoundary.width) - firstBoundary.x;

                    return (
                      <RoundedRect
                        key={`pattern-${rangeIdx}`}
                        x={Math.max(0, phraseX - paddingX)}
                        y={relativeY - paddingY}
                        width={phraseWidth + (paddingX * 2)}
                        height={firstBoundary.height + (paddingY * 2)}
                        r={6}
                        color="rgba(255, 215, 0, 0.4)"
                      />
                    );
                  } else {
                    // Multi-line: draw rectangle for each line segment
                    const lineGroups = new Map<number, typeof phraseBoundaries>();
                    phraseBoundaries.forEach(b => {
                      if (!lineGroups.has(b.y)) {
                        lineGroups.set(b.y, []);
                      }
                      lineGroups.get(b.y)!.push(b);
                    });

                    return Array.from(lineGroups.entries()).map(([lineY, lineBoundaries], lineIdx) => {
                      const first = lineBoundaries[0];
                      const last = lineBoundaries[lineBoundaries.length - 1];
                      const lineRelativeY = lineY - chunk.startY;
                      const lineWidth = (last.x + last.width) - first.x;

                      return (
                        <RoundedRect
                          key={`pattern-${rangeIdx}-line-${lineIdx}`}
                          x={Math.max(0, first.x - paddingX)}
                          y={lineRelativeY - paddingY}
                          width={lineWidth + (paddingX * 2)}
                          height={first.height + (paddingY * 2)}
                          r={6}
                          color="rgba(255, 215, 0, 0.4)"
                        />
                      );
                    });
                  }
                })}

                {/* Word highlights - render on top (current word & selected words) */}
                {chunkBoundaries.map((boundary) => {
                  const word = words[boundary.index];
                  const cleanWord = word.replace(/[.,!?;:]/g, '').toLowerCase();
                  const isHighlighted = boundary.index === currentWordIndex;
                  const isSelected = selectedWords.has(cleanWord);

                  // Skip pattern words - they're already drawn above
                  if (!isHighlighted && !isSelected) return null;

                  // Priority: current word (accent orange) > selected word (gold)
                  const color = isHighlighted ? ACCENT_COLOR : '#FFD700';
                  const paddingX = 4;
                  const paddingY = 3;
                  const relativeY = boundary.y - chunk.startY;

                  return (
                    <RoundedRect
                      key={`highlight-${boundary.index}`}
                      x={Math.max(0, boundary.x - paddingX)}
                      y={relativeY - paddingY}
                      width={boundary.width + (paddingX * 2)}
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

      {/* Pattern Popup Modal */}
      <Modal
        visible={selectedPattern !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPattern(null)}
      >
        <TouchableOpacity
          style={popupStyles.overlay}
          activeOpacity={1}
          onPress={() => setSelectedPattern(null)}
        >
          <View style={popupStyles.popup}>
            <TouchableOpacity activeOpacity={1}>
              {/* Header with pattern */}
              <View style={popupStyles.header}>
                <Text style={popupStyles.patternText}>{selectedPattern?.pattern}</Text>
                <TouchableOpacity onPress={() => setSelectedPattern(null)} style={popupStyles.closeButtonContainer}>
                  <Text style={popupStyles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={popupStyles.content}>
                {/* Anlamı - Yellow card */}
                <View style={[popupStyles.card, popupStyles.meaningCard]}>
                  <View style={popupStyles.cardHeader}>
                    <Text style={popupStyles.cardIcon}>🇹🇷</Text>
                    <Text style={popupStyles.cardTitle}>Anlamı</Text>
                  </View>
                  <Text style={popupStyles.cardValue}>{selectedPattern?.pattern_tr || '-'}</Text>
                </View>

                {/* Örnek Cümle - Blue card */}
                <View style={[popupStyles.card, popupStyles.exampleCard]}>
                  <View style={popupStyles.cardHeader}>
                    <Text style={popupStyles.cardIcon}>🇬🇧</Text>
                    <Text style={popupStyles.cardTitle}>Örnek Cümle</Text>
                  </View>
                  <Text style={popupStyles.cardValue}>{selectedPattern?.example_sentence || '-'}</Text>
                </View>

                {/* Örnek Cümle Çeviri - Green card */}
                <View style={[popupStyles.card, popupStyles.translationCard]}>
                  <View style={popupStyles.cardHeader}>
                    <Text style={popupStyles.cardIcon}>💬</Text>
                    <Text style={popupStyles.cardTitle}>Çeviri</Text>
                  </View>
                  <Text style={popupStyles.cardValue}>{selectedPattern?.example_sentence_tr || '-'}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

const fallbackStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 8,
  },
  word: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f2f2f2',
  },
  wordText: {
    fontSize: 16,
    color: '#374151',
  },
  highlightedWord: {
    backgroundColor: ACCENT_COLOR,
    shadowColor: ACCENT_COLOR,
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  highlightedWordText: {
    color: '#fff',
    fontWeight: '700',
  },
  selectedWord: {
    backgroundColor: '#fde68a',
  },
  selectedWordText: {
    color: '#92400e',
    fontWeight: '600',
  },
  patternWord: {
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
  },
  patternWordText: {
    color: '#333',
  },
});

const popupStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  popup: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
  },
  patternText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  closeButtonContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
  },
  meaningCard: {
    backgroundColor: '#fef3c7',
    borderColor: '#fbbf24',
  },
  exampleCard: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  translationCard: {
    backgroundColor: '#d1fae5',
    borderColor: '#10b981',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  cardValue: {
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 20,
    fontWeight: '400',
  },
});
