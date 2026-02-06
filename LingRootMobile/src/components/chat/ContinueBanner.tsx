import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface ContinueBannerProps {
  title: string;
  level: string;
  language: string;
  onListen: () => void;
  onNewTopic: () => void;
  onDismiss: () => void;
}

export const ContinueBanner: React.FC<ContinueBannerProps> = ({
  title,
  level,
  language,
  onListen,
  onNewTopic,
  onDismiss,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Icon name="replay" size={18} color="#0369A1" />
        <Text style={styles.headerText}>
          {language === 'tr' ? 'Son olusturdugum icerik:' : 'Last created content:'}
        </Text>
        <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
          <Icon name="close" size={16} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
      <Text style={styles.title}>"{title}" · {level}</Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.listenButton} onPress={onListen}>
          <Icon name="play-arrow" size={16} color="#FFFFFF" />
          <Text style={styles.listenText}>
            {language === 'tr' ? 'Dinle' : 'Listen'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.newTopicButton} onPress={onNewTopic}>
          <Icon name="add" size={16} color="#374151" />
          <Text style={styles.newTopicText}>
            {language === 'tr' ? 'Yeni Konu' : 'New Topic'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  headerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#1E40AF',
  },
  dismissButton: {
    padding: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  listenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#27BEAA',
  },
  listenText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  newTopicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  newTopicText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
});
