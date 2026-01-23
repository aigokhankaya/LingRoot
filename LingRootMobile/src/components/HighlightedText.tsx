import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { highlightPatterns, Pattern, HighlightedSegment } from '../utils/textHighlighter';
import { findPatternsInText } from '../services/patternService';

interface HighlightedTextProps {
  text: string;
  level: string;
  style?: any;
  textStyle?: any;
}

export const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  level,
  style,
  textStyle
}) => {
  const [segments, setSegments] = useState<HighlightedSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<Pattern | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadPatterns();
  }, [text, level]);

  const loadPatterns = async () => {
    if (!text || !level) {
      console.log('⚠️ [HighlightedText] No text or level provided');
      setSegments([{ text, isHighlighted: false }]);
      return;
    }

    try {
      setLoading(true);
      console.log(`🔍 [HighlightedText] Loading patterns for level: ${level}, text length: ${text.length}`);
      const response = await findPatternsInText(text, level);

      console.log(`📊 [HighlightedText] API response:`, {
        success: response.success,
        patternCount: response.patterns?.length || 0,
        patterns: response.patterns
      });

      if (response.success && response.patterns.length > 0) {
        const highlighted = highlightPatterns(text, response.patterns);
        setSegments(highlighted);
        console.log(`✨ [HighlightedText] Highlighted ${response.patterns.length} patterns in ${highlighted.length} segments`);
      } else {
        console.log('⚠️ [HighlightedText] No patterns found or API failed');
        setSegments([{ text, isHighlighted: false }]);
      }
    } catch (error) {
      console.error('❌ [HighlightedText] Error loading patterns:', error);
      setSegments([{ text, isHighlighted: false }]);
    } finally {
      setLoading(false);
    }
  };

  const handlePatternPress = (pattern: Pattern) => {
    setSelectedPattern(pattern);
    setModalVisible(true);
  };

  if (loading) {
    return (
      <View style={style}>
        <Text style={[styles.text, textStyle]}>{text}</Text>
      </View>
    );
  }

  return (
    <>
      <View style={style}>
        <Text style={[styles.text, textStyle]}>
          {segments.map((segment, index) => {
            if (segment.isHighlighted && segment.pattern) {
              return (
                <Text
                  key={index}
                  style={styles.highlighted}
                  onPress={() => handlePatternPress(segment.pattern!)}
                >
                  {segment.text}
                </Text>
              );
            }
            return <Text key={index}>{segment.text}</Text>;
          })}
        </Text>
      </View>

      {/* Pattern Info Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            {selectedPattern && (
              <>
                <Text style={styles.modalTitle}>Daily Usage Pattern</Text>
                <View style={styles.patternBox}>
                  <Text style={styles.patternText}>{selectedPattern.pattern}</Text>
                </View>
                <Text style={styles.meaningLabel}>Meaning:</Text>
                <Text style={styles.meaningText}>{selectedPattern.meaning}</Text>
                {selectedPattern.example && (
                  <>
                    <Text style={styles.exampleLabel}>Example:</Text>
                    <Text style={styles.exampleText}>{selectedPattern.example}</Text>
                  </>
                )}
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  highlighted: {
    backgroundColor: 'rgba(255, 255, 0, 0.3)', // Transparent yellow
    borderRadius: 2,
    paddingHorizontal: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  patternBox: {
    backgroundColor: 'rgba(255, 255, 0, 0.2)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  patternText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  meaningLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  meaningText: {
    fontSize: 15,
    color: '#333',
    marginBottom: 12,
    lineHeight: 22,
  },
  exampleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  exampleText: {
    fontSize: 14,
    color: '#555',
    fontStyle: 'italic',
    marginBottom: 16,
    lineHeight: 20,
  },
  closeButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
