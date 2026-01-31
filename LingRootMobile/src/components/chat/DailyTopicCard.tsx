import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl } from '../../services/environmentConfig';

interface DailyTopicCardProps {
  language: string;
  onStart: (message: string) => void;
}

interface DailyTopic {
  topic: string;
  level: string;
  estimatedMinutes: number;
}

const DAILY_TOPIC_CACHE_KEY = 'liro_daily_topic';
const DAILY_TOPIC_DATE_KEY = 'liro_daily_topic_date';

export const DailyTopicCard: React.FC<DailyTopicCardProps> = ({ language, onStart }) => {
  const [topic, setTopic] = useState<DailyTopic | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDailyTopic();
  }, []);

  const loadDailyTopic = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const cachedDate = await AsyncStorage.getItem(DAILY_TOPIC_DATE_KEY);
      const cachedTopic = await AsyncStorage.getItem(DAILY_TOPIC_CACHE_KEY);

      if (cachedDate === today && cachedTopic) {
        setTopic(JSON.parse(cachedTopic));
        setLoading(false);
        return;
      }

      const apiUrl = await getApiBaseUrl();
      const token = await getToken();
      const response = await fetch(`${apiUrl}/api/ai-chat/daily-topic`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.topic) {
          const topicData: DailyTopic = {
            topic: data.topic,
            level: data.level || 'B1',
            estimatedMinutes: data.estimatedMinutes || 3,
          };
          setTopic(topicData);
          await AsyncStorage.setItem(DAILY_TOPIC_CACHE_KEY, JSON.stringify(topicData));
          await AsyncStorage.setItem(DAILY_TOPIC_DATE_KEY, today);
        }
      }
    } catch {
      // Silently fail — card won't show
    } finally {
      setLoading(false);
    }
  };

  const getToken = async () => {
    const token = await AsyncStorage.getItem('auth_token');
    if (token && token !== 'null' && token !== 'undefined') return token;
    const legacy = await AsyncStorage.getItem('lingroot_token');
    return legacy || '';
  };

  const handlePress = () => {
    if (!topic) return;
    const message = language === 'tr'
      ? `Gunun konusu: ${topic.topic} hakkinda ${topic.level} seviyesinde icerik olustur`
      : `Daily topic: Create ${topic.level} level content about ${topic.topic}`;
    onStart(message);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#27BEAA" />
      </View>
    );
  }

  if (!topic) return null;

  return (
    <TouchableOpacity style={styles.container} activeOpacity={0.85} onPress={handlePress}>
      <View style={styles.header}>
        <Icon name="wb-sunny" size={18} color="#F59E0B" />
        <Text style={styles.headerText}>
          {language === 'tr' ? "Gunun Konusu" : "Daily Topic"}
        </Text>
      </View>
      <Text style={styles.topicText}>"{topic.topic}"</Text>
      <Text style={styles.meta}>
        {topic.level} · {topic.estimatedMinutes} {language === 'tr' ? 'dk anlatim' : 'min narration'}
      </Text>
      <View style={styles.buttonRow}>
        <View style={styles.startButton}>
          <Text style={styles.startButtonText}>
            {language === 'tr' ? 'Hadi Baslayalim' : "Let's Start"}
          </Text>
          <Icon name="arrow-forward" size={16} color="#FFFFFF" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
    letterSpacing: 0.3,
  },
  topicText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  buttonRow: {
    alignItems: 'flex-start',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#27BEAA',
  },
  startButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
