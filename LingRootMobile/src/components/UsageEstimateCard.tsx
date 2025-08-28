import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { apiService } from '../services/api';
import { computeCostAwareEstimates, CHARS_PER_VIDEO_MINUTE, CHARS_PER_A4_PAGE, type VoiceCategory, formatNumberTR, type UsageSummary } from '../utils/usageEstimates';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  refreshKey?: any; // change to re-fetch
}

const UsageEstimateCard: React.FC<Props> = ({ refreshKey }) => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const { language } = useLanguage();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res: any = await apiService.getUsageSummary();
        if (mounted && res?.success) {
          setSummary(res.data || null);
        }
      } catch (e) {
        if (mounted) setSummary(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.cardTitle}>
          {language === 'tr' ? 'Kullanım tahminleri yükleniyor...' : 'Loading usage estimates...'}
        </Text>
      </View>
    );
  }

  const perCategory = computeCostAwareEstimates(summary);
  const exceeded = !!summary?.isExceeded;

  return (
    <View style={[styles.card, exceeded && styles.cardExceeded]}>      
      <View style={styles.headerRow}>
        <Icon name="insights" size={18} color={exceeded ? '#C62828' : '#007AFF'} />
        <Text style={[styles.cardTitle, exceeded && { color: '#C62828' }]}>
          {language === 'tr' ? 'Kullanım Tahmini' : 'Usage Estimate'}
        </Text>
      </View>

      {/* Top headline metrics removed per request */}

      {/* Paket Fiyat Bilgisi bölümü mobilde kaldırıldı */}

      {/* Per-category cost-aware section */}
      <View style={{ marginTop: 8 }}>
        <Text style={{ fontSize: 12, color: '#374151', fontWeight: '700', marginBottom: 4 }}>
          {language === 'tr' ? 'Kategoriye göre kalan kullanım' : 'Remaining usage by category'}
        </Text>
        {((['standard','neural2','wavenet','studio','chirp3d'] as VoiceCategory[])).map((cat, idx, arr) => (
          <View
            key={cat}
            style={{
              paddingVertical: 6,
              borderBottomWidth: idx < arr.length - 1 ? 1 : 0,
              borderBottomColor: '#E5E7EB',
            }}
          >
            <View style={styles.row}>
              <Text style={[styles.label, { textTransform: 'capitalize' }]}>{cat}</Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.value}>
                  {perCategory[cat].remainingChars === null
                    ? (language === 'tr' ? 'Sınırsız' : 'Unlimited')
                    : `${formatNumberTR(perCategory[cat].remainingChars)} ${language === 'tr' ? 'karakter' : 'characters'}`}
                </Text>
                <Text style={styles.value}>
                  {perCategory[cat].remainingCharsByUsd === null
                    ? (language === 'tr' ? 'Sınırsız' : 'Unlimited')
                    : `${formatNumberTR(Math.floor((perCategory[cat].remainingCharsByUsd || 0) / CHARS_PER_VIDEO_MINUTE))} ${language === 'tr' ? 'dk' : 'min'}`}
                </Text>
                <Text style={styles.value}>
                  {perCategory[cat].remainingCharsByUsd === null
                    ? (language === 'tr' ? 'Sınırsız' : 'Unlimited')
                    : `${formatNumberTR(Math.floor((perCategory[cat].remainingCharsByUsd || 0) / CHARS_PER_A4_PAGE))} ${language === 'tr' ? 'sayfa' : 'pages'}`}
                </Text>
              </View>
            </View>
          </View>
        ))}
        
        {(() => {
          const cats = ['standard','neural2','wavenet','studio','chirp3d'] as VoiceCategory[];
          const allSame = cats.every((c) => perCategory[c].remainingChars === perCategory[cats[0]].remainingChars);
          const charLimitExists = perCategory.standard.remainingCharsByLimit !== null;
          if (allSame && charLimitExists) {
            return (
              <View style={{ marginTop: 6, paddingVertical: 6, paddingHorizontal: 8, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 8 }}>
                <Text style={{ color: '#92400E', fontSize: 11 }}>
                  {language === 'tr'
                    ? 'Karakter limiti dar boğaz olduğu için tüm kategoriler aynı görünüyor.'
                    : 'Character limit is the bottleneck, so all categories look the same.'}
                </Text>
              </View>
            );
          }
          return null;
        })()}
      </View>

      {/* Aylık Maliyet Özeti bölümü mobilde kaldırıldı */}

      {exceeded && (
        <View style={styles.exceededBox}>
          <Icon name="error" size={16} color="#C62828" />
          <Text style={styles.exceededText}>
            {language === 'tr' ? 'Paket kullanım sınırınız aşıldı.' : 'Your plan usage limit has been exceeded.'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardExceeded: {
    borderColor: '#FFCDD2',
    backgroundColor: '#FFF5F5',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  cardTitle: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  label: {
    color: '#6B7280',
    fontSize: 13,
  },
  value: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '600',
  },
  exceededBox: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exceededText: {
    marginLeft: 6,
    color: '#C62828',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default UsageEstimateCard;
