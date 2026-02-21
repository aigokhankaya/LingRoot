import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { COLORS } from '../../theme/colors';

interface DialogueSegment {
  speaker: string;
  speakerLabel?: string;
  content: string;
  startTime?: number;
  endTime?: number;
}

interface OriginalDialogueSegment {
  content: string;
}

interface PodcastDialogueViewProps {
  dialogueSegments: DialogueSegment[];
  originalDialogueSegments: OriginalDialogueSegment[];
  currentDialogueIndex: number;
  showOriginal: boolean;
  wordsArray: string[];
  dialogueLineRanges: Array<{ lineIndex: number; startIndex: number; endIndex: number }>;
  onDialoguePress: (index: number) => void;
  onWordLongPress: (word: string, wordIndex: number) => void;
  language: 'tr' | 'en';
  dialogueRefs: React.MutableRefObject<Map<number, unknown>>;
}

export const PodcastDialogueView: React.FC<PodcastDialogueViewProps> = ({
  dialogueSegments,
  originalDialogueSegments,
  currentDialogueIndex,
  showOriginal,
  wordsArray,
  dialogueLineRanges,
  onDialoguePress,
  onWordLongPress,
  language,
  dialogueRefs,
}) => {
  // Scroll logic is handled by the parent AudioPlayer component
  // which owns the ScrollView. We only register refs here.

  if (!dialogueSegments || dialogueSegments.length === 0) {
    return (
      <Text style={styles.podcastFallbackText}>
        {language === 'tr' ? 'Podcast metni bulunamadı.' : 'Podcast transcript is not available.'}
      </Text>
    );
  }

  return (
    <View style={styles.podcastDialoguesContainer}>
      {dialogueSegments.map((segment, index) => {
        const isActive = index === currentDialogueIndex;
        const speakerKey = (segment.speaker || '').toUpperCase();
        const isRight = speakerKey === 'B';
        const originalSegment = originalDialogueSegments[index];
        const originalContent = originalSegment?.content ? String(originalSegment.content) : '';
        const hasOriginal = showOriginal && originalContent.trim().length > 0;
        const speakerLabel = segment.speakerLabel
          ? segment.speakerLabel
          : segment.speaker
            ? `Speaker ${speakerKey}`
            : language === 'tr'
              ? 'Anlatıcı'
              : 'Narrator';

        return (
          <View
            key={`${index}-${speakerKey}-${segment.content.slice(0, 10)}`}
            ref={(ref) => {
              if (ref) {
                dialogueRefs.current.set(index, ref);
              }
            }}
            style={[
              styles.podcastDialogueRow,
              hasOriginal && styles.podcastDialogueRowWithOriginal,
            ]}
          >
            {/* Left side: Speaker A (HOST) content or Speaker B (GUEST) original */}
            <View style={[
              styles.podcastBubbleColumn,
              styles.podcastBubbleColumnLeft,
              !isRight ? { flex: 5 } : (hasOriginal ? { flex: 3 } : { flex: 1 })
            ]}>
              {!isRight ? (
                // HOST: Ana diyalog solda
                <View style={styles.podcastBubbleWithAvatar}>

                  <View
                    style={[
                      styles.podcastBubble,
                      styles.podcastBubbleLeft,
                      isActive && styles.podcastBubbleActive,
                      isActive && styles.podcastBubbleActiveLeft,
                    ]}
                  >
                    <Text style={[
                      styles.podcastSpeakerLabel,
                      isActive && { color: 'rgba(255,255,255,0.8)' }
                    ]}>
                      {speakerLabel}
                    </Text>
                    <TouchableOpacity activeOpacity={0.8} onPress={() => onDialoguePress(index)}>
                      <Text
                        style={[
                          styles.podcastBubbleText,
                          isActive && styles.podcastBubbleTextActive,
                        ]}
                      >
                        {segment.content
                          .split(/\s+/)
                          .filter(word => word.length > 0)
                          .map((word, wordIndex, arr) => {
                            const range = dialogueLineRanges.find(r => r.lineIndex === index);
                            let globalIndex = range ? range.startIndex + wordIndex : -1;
                            if (globalIndex < 0 || globalIndex >= wordsArray.length) {
                              globalIndex = wordIndex;
                            }
                            return (
                              <Text
                                key={`${index}-${wordIndex}`}
                                onLongPress={() => onWordLongPress(word, globalIndex)}
                              >
                                {word}
                                {wordIndex < arr.length - 1 ? ' ' : ''}
                              </Text>
                            );
                          })}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : hasOriginal ? (
                // GUEST: Orijinal metin solda (sarı balon)
                <View
                  style={[
                    styles.podcastBubble,
                    styles.podcastBubbleOriginalInline,
                  ]}
                >
                  <Text style={styles.podcastBubbleOriginalText}>
                    {originalContent}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Right side: Speaker B (GUEST) content or Speaker A (HOST) original */}
            <View style={[
              styles.podcastBubbleColumn,
              styles.podcastBubbleColumnRight,
              isRight ? { flex: 5 } : (hasOriginal ? { flex: 3 } : { flex: 1 })
            ]}>
              {isRight ? (
                // GUEST: Ana diyalog sağda
                <View style={styles.podcastBubbleWithAvatarRight}>
                  <View
                    style={[
                      styles.podcastBubble,
                      styles.podcastBubbleRight,
                      isActive && styles.podcastBubbleActive,
                      isActive && styles.podcastBubbleActiveRight,
                    ]}
                  >
                    <Text style={[
                      styles.podcastSpeakerLabel,
                      styles.podcastSpeakerLabelRight,
                      isActive && { color: 'rgba(255,255,255,0.8)' }
                    ]}>
                      {speakerLabel}
                    </Text>
                    <TouchableOpacity activeOpacity={0.8} onPress={() => onDialoguePress(index)}>
                      <Text
                        style={[
                          styles.podcastBubbleText,
                          styles.podcastBubbleTextRight,
                          isActive && styles.podcastBubbleTextActive,
                        ]}
                      >
                        {segment.content
                          .split(/\s+/)
                          .filter(word => word.length > 0)
                          .map((word, wordIndex, arr) => {
                            const range = dialogueLineRanges.find(r => r.lineIndex === index);
                            let globalIndex = range ? range.startIndex + wordIndex : -1;
                            if (globalIndex < 0 || globalIndex >= wordsArray.length) {
                              globalIndex = wordIndex;
                            }
                            return (
                              <Text
                                key={`${index}-${wordIndex}`}
                                onLongPress={() => onWordLongPress(word, globalIndex)}
                              >
                                {word}
                                {wordIndex < arr.length - 1 ? ' ' : ''}
                              </Text>
                            );
                          })}
                      </Text>
                    </TouchableOpacity>
                  </View>

                </View>
              ) : hasOriginal ? (
                // HOST: Orijinal metin sağda (sarı balon)
                <View
                  style={[
                    styles.podcastBubble,
                    styles.podcastBubbleOriginalInline,
                  ]}
                >
                  <Text style={styles.podcastBubbleOriginalText}>
                    {originalContent}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  podcastDialoguesContainer: {
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  podcastDialogueRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 4,
  },
  podcastDialogueRowWithOriginal: {
    // Orijinal metin gösterildiğinde satır genişliğini ayarla
  },
  podcastBubbleColumn: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  podcastBubbleColumnLeft: {
    alignItems: 'flex-start',
  },
  podcastBubbleColumnRight: {
    alignItems: 'flex-end',
  },
  podcastBubbleWithAvatar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  podcastBubbleWithAvatarRight: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  podcastBubble: {
    maxWidth: '100%',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.slate100,
    flexShrink: 1,
    minWidth: 0,
    backgroundColor: COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  podcastBubbleLeft: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 6,
    borderColor: COLORS.brandTeal,
  },
  podcastBubbleRight: {
    backgroundColor: COLORS.surface,
    borderTopRightRadius: 6,
    borderColor: COLORS.brandOrange,
  },
  podcastBubbleOriginalInline: {
    backgroundColor: 'rgba(255, 237, 213, 0.9)', // Sarı/bej arka plan (eski tasarımdaki gibi)
    borderColor: 'rgba(251, 191, 36, 0.3)',
    maxWidth: '100%',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  podcastBubbleActive: {
    shadowColor: COLORS.brandIndigo,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    transform: [{ scale: 1.02 }],
  },
  podcastBubbleActiveLeft: {
    backgroundColor: COLORS.brandOrange,
    borderColor: COLORS.brandOrange,
  },
  podcastBubbleActiveRight: {
    backgroundColor: COLORS.brandTeal,
    borderColor: COLORS.brandTeal,
  },
  podcastSpeakerLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 6,
    color: COLORS.slate400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  podcastSpeakerLabelRight: {
    textAlign: 'right',
  },
  podcastBubbleText: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.slate700,
    fontWeight: '700',
  },
  podcastBubbleTextRight: {
    color: COLORS.slate700,
    textAlign: 'right',
  },
  podcastBubbleTextActive: {
    color: '#FFFFFF',
  },
  podcastBubbleOriginalText: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.slate500,
    fontStyle: 'italic',
  },
  podcastFallbackText: {
    fontSize: 14,
    color: '#6b7280',
  },
});
