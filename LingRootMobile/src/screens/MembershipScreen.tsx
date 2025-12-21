import React, { useEffect } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView } from 'react-native';
import UsageEstimateCard from '../components/UsageEstimateCard';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../theme/colors';

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
        <View style={styles.headerSection}>
          <Text style={styles.title}>{language === 'tr' ? 'Paket Bilgilerim' : 'My Plan'}</Text>
          <Text style={styles.subtitle}>{language === 'tr' ? 'Paket kullanım tahminlerin' : 'Usage estimates for your plan'}</Text>
        </View>
        <UsageEstimateCard />
        {/* Gelecekte: Plan adı, yenileme tarihi, sınırlar vs. eklenebilir */}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: 100,
  },
  headerSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.slate800,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.slate500,
    marginTop: 6,
    fontWeight: '500',
  },
});

export default MembershipScreen;
