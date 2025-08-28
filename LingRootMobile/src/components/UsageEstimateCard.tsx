import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { apiService } from '../services/api';
import { computeEstimates, computeCostAwareEstimates, COST_PER_1K, CHARS_PER_VIDEO_MINUTE, CHARS_PER_A4_PAGE, type VoiceCategory, formatNumberTR, type UsageSummary } from '../utils/usageEstimates';

interface Props {
  refreshKey?: any; // change to re-fetch
}

const UsageEstimateCard: React.FC<Props> = ({ refreshKey }) => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<UsageSummary | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res: any = await apiService.getUsageSummary();
        console.log('📱 [USAGE DEBUG] usage-summary response:', JSON.stringify(res?.data || res, null, 2));
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
        <Text style={styles.cardTitle}>Kullanım tahminleri yükleniyor...</Text>
      </View>
    );
  }

  const est = computeEstimates(summary);
  const perCategory = computeCostAwareEstimates(summary);
  // Derived pricing values for display
  const planPriceTry = (summary as any)?.limits?.pricing?.planPriceTry ?? (summary as any)?.subscription?.plan?.price ?? 0;
  const usdTryRate = (summary as any)?.limits?.pricing?.usdTryRate ?? 40;
  const budgetUsdFromTry = (summary as any)?.limits?.pricing?.budgetUsdFromTry ?? Number((((planPriceTry || 0) / (usdTryRate || 1)) / 3).toFixed(2));
  const exceeded = !!summary?.isExceeded;

  return (
    <View style={[styles.card, exceeded && styles.cardExceeded]}>      
      <View style={styles.headerRow}>
        <Icon name="insights" size={18} color={exceeded ? '#C62828' : '#007AFF'} />
        <Text style={[styles.cardTitle, exceeded && { color: '#C62828' }]}>Kullanım Tahmini</Text>
      </View>

      {/* Top headline metrics removed per request */}

      {/* Pricing info (TL -> USD and 1/3 budget) */}
      {(planPriceTry > 0) && (
        <View style={{ marginTop: 6, padding: 8, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8 }}>
          <Text style={{ fontSize: 12, color: '#374151', fontWeight: '700', marginBottom: 4 }}>Paket Fiyat Bilgisi</Text>
          <View style={styles.row}>
            <Text style={[styles.label, { fontSize: 12 }]}>Paket fiyatı (TL)</Text>
            <Text style={[styles.value, { fontSize: 12 }]}>{formatNumberTR((planPriceTry || 0))} TL</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { fontSize: 12 }]}>Kur (USD/TRY)</Text>
            <Text style={[styles.value, { fontSize: 12 }]}>{usdTryRate}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { fontSize: 12 }]}>Paket fiyatı (USD)</Text>
            <Text style={[styles.value, { fontSize: 12 }]}>${(((planPriceTry || 0) / (usdTryRate || 1))).toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { fontSize: 12 }]}>Aylık bütçe (1/3 USD)</Text>
            <Text style={[styles.value, { fontSize: 12 }]}>${(budgetUsdFromTry || 0).toFixed(2)}</Text>
          </View>
        </View>
      )}

      {/* Per-category cost-aware section */}
      <View style={{ marginTop: 8 }}>
        <Text style={{ fontSize: 12, color: '#374151', fontWeight: '700', marginBottom: 4 }}>Kategoriye göre kalan kullanım</Text>
        {(['standard','neural2','wavenet','studio','chirp3d'] as VoiceCategory[]).map((cat) => (
          <View key={cat} style={{ paddingVertical: 4 }}>
            <View style={styles.row}>
              <Text style={[styles.label, { textTransform: 'capitalize' }]}>{cat}</Text>
              <Text style={styles.value}>
                {perCategory[cat].remainingChars === null ? 'Sınırsız' : `${formatNumberTR(perCategory[cat].remainingChars)} karakter`} ·
                {perCategory[cat].remainingCharsByUsd === null ? ' Sınırsız' : ` ${formatNumberTR(Math.floor((perCategory[cat].remainingCharsByUsd || 0) / CHARS_PER_VIDEO_MINUTE))} dk`} ·
                {perCategory[cat].remainingCharsByUsd === null ? ' Sınırsız' : ` ${formatNumberTR(Math.floor((perCategory[cat].remainingCharsByUsd || 0) / CHARS_PER_A4_PAGE))} sayfa`}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.label, { fontSize: 11 }]}>Karakter limiti</Text>
              <Text style={[styles.value, { fontSize: 11 }]}>
                {perCategory[cat].remainingCharsByLimit === null ? 'Sınırsız' : `${formatNumberTR(perCategory[cat].remainingCharsByLimit)} karakter`}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.label, { fontSize: 11 }]}>USD'e göre</Text>
              <Text style={[styles.value, { fontSize: 11 }]}>
                {perCategory[cat].remainingCharsByUsd === null ? 'Sınırsız' : `${formatNumberTR(perCategory[cat].remainingCharsByUsd)} karakter`}
              </Text>
            </View>
          </View>
        ))}
        {perCategory.standard.remainingUsdBasis !== null && (
          <Text style={{ marginTop: 4, fontSize: 11, color: '#6B7280' }}>
            Uygulanan limit = min(Karakter, USD). Fiyatlar (1K): std/wvn ${COST_PER_1K.standard}, n2 ${COST_PER_1K.neural2}, studio ${COST_PER_1K.studio}, chirp3d ${COST_PER_1K.chirp3d}
          </Text>
        )}
        {(() => {
          const cats = ['standard','neural2','wavenet','studio','chirp3d'] as VoiceCategory[];
          const allSame = cats.every((c) => perCategory[c].remainingChars === perCategory[cats[0]].remainingChars);
          const charLimitExists = perCategory.standard.remainingCharsByLimit !== null;
          if (allSame && charLimitExists) {
            return (
              <View style={{ marginTop: 6, paddingVertical: 6, paddingHorizontal: 8, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 8 }}>
                <Text style={{ color: '#92400E', fontSize: 11 }}>Karakter limiti dar boğaz olduğu için tüm kategoriler aynı görünüyor.</Text>
              </View>
            );
          }
          return null;
        })()}
      </View>

      {/* Cost breakdown and remaining USD budget */}
      {summary?.usage && (
        <View style={{ marginTop: 8, padding: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8 }}>
          <Text style={{ fontSize: 12, color: '#374151', fontWeight: '700', marginBottom: 4 }}>Aylık Maliyet Özeti</Text>
          <View style={styles.row}>
            <Text style={[styles.label, { fontSize: 12 }]}>OpenAI maliyeti</Text>
            <Text style={[styles.value, { fontSize: 12 }]}>${(summary.usage.openaiCostUsd || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { fontSize: 12 }]}>TTS maliyeti</Text>
            <Text style={[styles.value, { fontSize: 12 }]}>${(summary.usage.ttsCostUsd || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { fontSize: 12 }]}>Toplam maliyet</Text>
            <Text style={[styles.value, { fontSize: 12 }]}>${(summary.usage.totalCostUsd || 0).toFixed(2)}</Text>
          </View>
          {summary?.limits && (summary.limits.monthlyUsdLimit !== null && summary.limits.monthlyUsdLimit !== undefined) ? (
            <>
              <View style={styles.row}>
                <Text style={[styles.label, { fontSize: 12 }]}>Bütçe (USD)</Text>
                <Text style={[styles.value, { fontSize: 12 }]}>${(summary.limits.monthlyUsdLimit || 0).toFixed(2)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.label, { fontSize: 12 }]}>Kalan bütçe</Text>
                <Text style={[styles.value, { fontSize: 12, color: (((summary.limits.monthlyUsdLimit ?? 0) - (summary.usage.totalCostUsd || 0)) <= 0) ? '#C62828' : '#111827' }]}> 
                  ${Math.max(0, (summary.limits.monthlyUsdLimit ?? 0) - (summary.usage.totalCostUsd || 0)).toFixed(2)}
                </Text>
              </View>
            </>
          ) : null}
        </View>
      )}

      {exceeded && (
        <View style={styles.exceededBox}>
          <Icon name="error" size={16} color="#C62828" />
          <Text style={styles.exceededText}>Paket kullanım sınırınız aşıldı.</Text>
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
