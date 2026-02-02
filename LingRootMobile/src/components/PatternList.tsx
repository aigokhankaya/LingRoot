import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, ActivityIndicator } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import secureStorage from '../services/secureStorage';
import { getApiBaseUrl } from '../services/environmentConfig';

interface Pattern {
  pattern: string;
  meaning: string;
  example?: string;
}

interface PatternListProps {
  text: string;
  level: string;
}

export const PatternList: React.FC<PatternListProps> = ({ text, level }) => {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<Pattern | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadPatterns();
  }, [text, level]);

  const loadPatterns = async () => {
    if (!text || !level) {
      console.log('⚠️ [PatternList] No text or level provided');
      return;
    }

    try {
      setLoading(true);
      console.log(`🔍 [PatternList] Loading patterns for level: ${level}`);
      
      // Get API base URL and token from environment config
      const apiUrl = await getApiBaseUrl();
      const token = await secureStorage.getItem('auth_token') || await AsyncStorage.getItem('userToken');
      
      console.log(`📍 [PatternList] Using API URL: ${apiUrl}`);
      console.log(`🔐 [PatternList] Token exists: ${!!token}`);
      
      const response = await axios.post(
        `${apiUrl}/api/patterns/find`,
        { text, level },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`📊 [PatternList] API Response:`, response.data);
      console.log(`📊 [PatternList] Found ${response.data.patterns?.length || 0} patterns`);
      
      if (response.data.success && response.data.patterns.length > 0) {
        setPatterns(response.data.patterns);
      } else {
        setPatterns([]);
      }
    } catch (error: any) {
      console.error('❌ [PatternList] Error loading patterns:', error);
      console.error('❌ [PatternList] Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      setPatterns([]);
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
      <View style={styles.container}>
        <Text style={styles.title}>📚 Daily Usage Patterns ({level})</Text>
        <ActivityIndicator size="small" color="#FFD700" style={{ marginTop: 12 }} />
      </View>
    );
  }

  if (patterns.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>📚 Daily Usage Patterns ({level})</Text>
        <Text style={styles.emptyText}>No patterns found in this text</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <Text style={styles.title}>📚 Daily Usage Patterns ({level})</Text>
        <Text style={styles.subtitle}>Found {patterns.length} pattern{patterns.length > 1 ? 's' : ''} in this text</Text>
        
        {patterns.map((pattern, index) => (
          <TouchableOpacity
            key={index}
            style={styles.patternItem}
            onPress={() => handlePatternPress(pattern)}
          >
            <View style={styles.patternBadge}>
              <Text style={styles.patternNumber}>{index + 1}</Text>
            </View>
            <View style={styles.patternContent}>
              <Text style={styles.patternText}>{pattern.pattern}</Text>
              <Text style={styles.patternMeaning} numberOfLines={1}>{pattern.meaning}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Pattern Detail Modal */}
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
                  <Text style={styles.patternTextLarge}>{selectedPattern.pattern}</Text>
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
  container: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#FFD700',
    backgroundColor: '#FFFEF0',
    borderRadius: 8,
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
  },
  patternItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  patternBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  patternNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
  },
  patternContent: {
    flex: 1,
  },
  patternText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  patternMeaning: {
    fontSize: 12,
    color: '#666',
  },
  chevron: {
    fontSize: 24,
    color: '#FFD700',
    marginLeft: 8,
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
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  patternTextLarge: {
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
    backgroundColor: '#FFD700',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
});
