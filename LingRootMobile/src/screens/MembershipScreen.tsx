import React, { useEffect } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView } from 'react-native';
import UsageEstimateCard from '../components/UsageEstimateCard';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigation } from '@react-navigation/native';

const MembershipScreen: React.FC = () => {
  const { language } = useLanguage();
  const navigation = useNavigation<any>();

  useEffect(() => {
    navigation.setOptions({
      headerTitle: language === 'tr' ? 'Paket Bilgilerim' : 'My Plan',
    });
  }, [language, navigation]);
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{language === 'tr' ? 'Paket Bilgilerim' : 'My Plan'}</Text>
        <Text style={styles.subtitle}>{language === 'tr' ? 'Paket kullanım tahminlerin' : 'Usage estimates for your plan'}</Text>
        <UsageEstimateCard />
        {/* Gelecekte: Plan adı, yenileme tarihi, sınırlar vs. eklenebilir */}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    paddingBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 8,
  },
});

export default MembershipScreen;
