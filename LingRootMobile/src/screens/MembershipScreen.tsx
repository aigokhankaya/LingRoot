import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView } from 'react-native';
import UsageEstimateCard from '../components/UsageEstimateCard';

const MembershipScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Üyelik Bilgileri</Text>
        <Text style={styles.subtitle}>Paket kullanım tahminlerin</Text>
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
