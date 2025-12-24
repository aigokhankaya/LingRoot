import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { apiService } from '../services/api';
import { computeCostAwareEstimates, CHARS_PER_VIDEO_MINUTE, CHARS_PER_A4_PAGE, type VoiceCategory, formatNumberTR, type UsageSummary } from '../utils/usageEstimates';
import { useLanguage } from '../contexts/LanguageContext';
import { COLORS } from '../theme/colors';

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
        <ActivityIndicator size="small" color={COLORS.brandTeal} />
        <Text style={styles.cardTitle}>
          {language === 'tr' ? 'Kullanım tahminleri yükleniyor...' : 'Loading usage estimates...'}
        </Text>
      </View>
    );
  }

  const perCategory = computeCostAwareEstimates(summary);
  const exceeded = !!summary?.isExceeded;
  const isFreeTrialExhausted = !!(summary as any)?.isFreeTrialExhausted;
  const planName = (summary as any)?.plan?.name || (summary as any)?.plantype;
  const subscription: any = (summary as any)?.subscription;
  const rawEnd = subscription?.current_period_end || subscription?.enddate || subscription?.endDate;
  let formattedEnd = '—';
  if (rawEnd) {
    try {
      const localeTag = language === 'tr' ? 'tr-TR' : 'en-US';
      formattedEnd = new Intl.DateTimeFormat(localeTag, { dateStyle: 'medium' }).format(new Date(rawEnd));
    } catch (e) {
      try {
        formattedEnd = new Date(rawEnd).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US');
      } catch {
        formattedEnd = String(rawEnd);
      }
    }
  }
  const isFreeTrialPlan = planName === 'Free Trial';

  // Free Trial için özel görünüm
  if (isFreeTrialPlan) {
    const audioCount = (summary as any)?.audioCreationCount || 0;
    const maxAudioCount = (summary as any)?.maxAudioCount || 3;
    const remainingCount = (summary as any)?.remainingAudioCount || (maxAudioCount - audioCount);

    return (
      <View style={[styles.card, isFreeTrialExhausted && styles.cardExceeded]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconContainer, { backgroundColor: isFreeTrialExhausted ? 'rgba(198, 40, 40, 0.1)' : 'rgba(39, 190, 170, 0.1)' }]}>
            <Icon name="card-giftcard" size={20} color={isFreeTrialExhausted ? '#C62828' : COLORS.brandTeal} />
          </View>
          <Text style={[styles.cardTitle, isFreeTrialExhausted && { color: '#C62828' }]}>
            {language === 'tr' ? 'Ücretsiz Deneme' : 'Free Trial'}
          </Text>
        </View>

        <View style={{ marginTop: 16 }}>
          <View style={styles.row}>
            <Text style={styles.label}>
              {language === 'tr' ? 'Oluşturulan Ses' : 'Created Audios'}
            </Text>
            <Text style={[styles.value, isFreeTrialExhausted && { color: '#C62828' }]}>
              {audioCount} / {maxAudioCount}
            </Text>
          </View>

          <View style={[styles.row, { marginTop: 10 }]}>
            <Text style={styles.label}>
              {language === 'tr' ? 'Kalan Hak' : 'Remaining Credits'}
            </Text>
            <View style={[styles.remainingBadge, { backgroundColor: remainingCount > 0 ? 'rgba(39, 190, 170, 0.1)' : 'rgba(198, 40, 40, 0.1)' }]}>
              <Text style={[styles.remainingText, { color: remainingCount > 0 ? COLORS.brandTeal : '#C62828' }]}>
                {remainingCount}
              </Text>
            </View>
          </View>
        </View>

        {isFreeTrialExhausted && (
          <View style={styles.exceededBox}>
            <Icon name="error" size={16} color="#C62828" />
            <Text style={styles.exceededText}>
              {language === 'tr'
                ? 'Ücretsiz deneme hakkınız doldu. Premium pakete geçin.'
                : 'Your free trial credits are exhausted. Upgrade to premium.'}
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.card, exceeded && styles.cardExceeded]}>
      <View style={styles.headerRow}>
        <View style={[styles.iconContainer, { backgroundColor: exceeded ? 'rgba(198, 40, 40, 0.1)' : 'rgba(99, 102, 241, 0.1)' }]}>
          <Icon name="insights" size={20} color={exceeded ? '#C62828' : COLORS.brandIndigo} />
        </View>
        <Text style={[styles.cardTitle, exceeded && { color: '#C62828' }]}>
          {language === 'tr' ? 'Kullanım Tahmini' : 'Usage Estimate'}
        </Text>
      </View>

      {/* Top headline metrics removed per request */}

      <View style={{ marginTop: 12 }}>
        <View style={styles.row}>
          <Text style={styles.label}>
            {language === 'tr' ? 'Paket' : 'Plan'}
          </Text>
          <View style={styles.planBadge}>
            <Text style={styles.planBadgeText}>
              {planName || '—'}
            </Text>
          </View>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>
            {language === 'tr' ? 'Geçerlilik' : 'Valid until'}
          </Text>
          <Text style={styles.value}>
            {formattedEnd}
          </Text>
        </View>
      </View>

      {/* Paket Fiyat Bilgisi bölümü mobilde kaldırıldı */}

      {/* Per-category cost-aware section */}
      <View style={styles.categorySection}>
        <Text style={styles.categorySectionTitle}>
          {language === 'tr' ? 'Kategoriye göre kalan kullanım' : 'Remaining usage by category'}
        </Text>
        {((['standard', 'neural', 'generative'] as VoiceCategory[])).map((cat, idx, arr) => (
          <View
            key={cat}
            style={[
              styles.categoryItem,
              idx < arr.length - 1 && styles.categoryItemBorder
            ]}
          >
            <View style={styles.row}>
              <Text style={styles.categoryLabel}>
                {cat === 'neural' ? 'Neural (Premium)' :
                  cat === 'generative' ? 'Generative (Ultra)' :
                    cat === 'standard' ? 'Standard' : cat}
              </Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.categoryValue}>
                  {perCategory[cat].remainingChars === null
                    ? (language === 'tr' ? 'Sınırsız' : 'Unlimited')
                    : `${formatNumberTR(perCategory[cat].remainingChars)} ${language === 'tr' ? 'karakter' : 'characters'}`}
                </Text>
                <Text style={styles.categoryValueSub}>
                  {perCategory[cat].remainingCharsByUsd === null
                    ? (language === 'tr' ? 'Sınırsız' : 'Unlimited')
                    : `${formatNumberTR(Math.floor((perCategory[cat].remainingCharsByUsd || 0) / CHARS_PER_VIDEO_MINUTE))} ${language === 'tr' ? 'dk video' : 'min video'}`}
                </Text>
              </View>
            </View>
          </View>
        ))}

        {/* Podcast Section - Separate */}
        <View style={[styles.categoryItem, styles.podcastSection]}>
          <View style={styles.row}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="podcasts" size={18} color={COLORS.slate500} />
              <Text style={styles.categoryLabel}>Podcast (Google TTS)</Text>
            </View>
            <Text style={styles.categoryValue}>
              {perCategory.standard?.remainingPodcasts === null
                ? (language === 'tr' ? 'Sınırsız' : 'Unlimited')
                : `~${perCategory.standard?.remainingPodcasts} ${language === 'tr' ? 'adet' : 'items'}`}
            </Text>
          </View>
        </View>

        {(() => {
          const cats = ['standard', 'neural', 'generative'] as VoiceCategory[];
          // Check if key exists to avoid crash if type mismatch during HMR
          if (!perCategory.standard) return null;

          const allSame = cats.every((c) => perCategory[c]?.remainingChars === perCategory[cats[0]]?.remainingChars);
          const charLimitExists = perCategory.standard.remainingCharsByLimit !== null;
          if (allSame && charLimitExists) {
            return (
              <View style={styles.infoNote}>
                <Text style={styles.infoNoteText}>
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
    backgroundColor: '#f8f9ff',
    borderRadius: 32,
    padding: 24,
    marginHorizontal: 24,
    marginTop: 16,
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardExceeded: {
    borderColor: 'rgba(198, 40, 40, 0.2)',
    backgroundColor: 'rgba(198, 40, 40, 0.03)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.slate800,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  label: {
    color: COLORS.slate500,
    fontSize: 13,
    fontWeight: '600',
  },
  value: {
    color: COLORS.slate700,
    fontSize: 13,
    fontWeight: '700',
  },
  planBadge: {
    backgroundColor: 'rgba(245, 165, 36, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  planBadgeText: {
    color: COLORS.brandOrange,
    fontSize: 12,
    fontWeight: '800',
  },
  remainingBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  remainingText: {
    fontSize: 18,
    fontWeight: '900',
  },
  categorySection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate100,
  },
  categorySectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.slate400,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  categoryItem: {
    paddingVertical: 10,
  },
  categoryItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate100,
  },
  podcastSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.slate200,
    marginTop: 8,
    paddingTop: 12,
  },
  categoryLabel: {
    color: COLORS.slate600,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  categoryValue: {
    color: COLORS.slate700,
    fontSize: 12,
    fontWeight: '600',
  },
  categoryValueSub: {
    color: COLORS.slate400,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  infoNote: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(245, 165, 36, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 165, 36, 0.15)',
    borderRadius: 14,
  },
  infoNoteText: {
    color: COLORS.brandOrange,
    fontSize: 11,
    fontWeight: '600',
  },
  exceededBox: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(198, 40, 40, 0.05)',
    padding: 14,
    borderRadius: 14,
  },
  exceededText: {
    marginLeft: 6,
    color: '#C62828',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
});

export default UsageEstimateCard;
