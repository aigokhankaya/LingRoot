import React, { useEffect } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
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
        <UsageEstimateCard />
        <View style={styles.disclaimerBox}>
          <Icon name="info-outline" size={14} color={COLORS.slate400} />
          <Text style={styles.disclaimerText}>
            {language === 'tr'
              ? 'Buradaki değerler tahminidir; gerçek kullanım ses uzunluğu ve içerik türüne göre farklılık gösterebilir.'
              : 'These values are estimates; actual usage may vary depending on audio length and content type.'}
          </Text>
        </View>
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
    paddingTop: 44,
    paddingBottom: 100,
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginHorizontal: 28,
    marginTop: 12,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.slate400,
    fontWeight: '500',
    lineHeight: 16,
  },
});

export default React.memo(MembershipScreen);
