import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getUsageSummary } from '../services/subscriptionService';
import { computeCostAwareEstimates, CHARS_PER_AUDIO_MINUTE, formatNumberTR, type UsageSummary } from '../utils/usageEstimates';
import { useLanguage } from '../contexts/LanguageContext';
import { COLORS } from '../theme/colors';

interface Props {
  refreshKey?: any; // change to re-fetch
}

const UsageEstimateCard: React.FC<Props> = ({ refreshKey }) => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const { language, t } = useLanguage();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res: any = await getUsageSummary();
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
          {t('usage.loading')}
        </Text>
      </View>
    );
  }

  const perCategory = computeCostAwareEstimates(summary);
  const tierKeys = Object.keys(perCategory);
  const providerLabel = summary?.ttsProvider === 'google' ? 'Google TTS'
    : summary?.ttsProvider === 'polly' ? 'Amazon Polly'
    : summary?.ttsProvider || 'TTS';
  const firstTierEst = tierKeys.length > 0 ? perCategory[tierKeys[0]] : null;
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
            {t('usage.freeTrial.title')}
          </Text>
        </View>

        <View style={{ marginTop: 16 }}>
          <View style={styles.row}>
            <Text style={styles.label}>
              {t('usage.freeTrial.createdAudios')}
            </Text>
            <Text style={[styles.value, isFreeTrialExhausted && { color: '#C62828' }]}>
              {audioCount} / {maxAudioCount}
            </Text>
          </View>

          <View style={[styles.row, { marginTop: 10 }]}>
            <Text style={styles.label}>
              {t('usage.freeTrial.remainingCredits')}
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
              {t('usage.freeTrial.exhausted')}
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
          {t('usage.title')}
        </Text>
      </View>

      {/* Top headline metrics removed per request */}

      <View style={{ marginTop: 12 }}>
        <View style={styles.row}>
          <Text style={styles.label}>
            {t('usage.plan')}
          </Text>
          <View style={styles.planBadge}>
            <Text style={styles.planBadgeText}>
              {planName || '—'}
            </Text>
          </View>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>
            {t('usage.validUntil')}
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
          {t('usage.categoryTitle')}
        </Text>
        {tierKeys.map((cat, idx) => {
          const tierLabel = summary?.ttsTiers?.[cat]?.label || cat;
          const est = perCategory[cat];
          if (!est) return null;
          return (
            <View
              key={cat}
              style={[
                styles.categoryItem,
                idx < tierKeys.length - 1 && styles.categoryItemBorder
              ]}
            >
              <View style={styles.row}>
                <Text style={styles.categoryLabel}>
                  {tierLabel}
                </Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.categoryValue}>
                    {est.remainingChars === null
                      ? t('usage.unlimited')
                      : t('usage.characters', { count: formatNumberTR(est.remainingChars) })}
                  </Text>
                  <Text style={styles.categoryValueSub}>
                    {est.remainingCharsByUsd === null
                      ? t('usage.unlimited')
                      : t('usage.minutesAudio', { count: formatNumberTR(Math.floor((est.remainingCharsByUsd || 0) / CHARS_PER_AUDIO_MINUTE)) })}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}

        {/* Podcast Section - Separate */}
        <View style={[styles.categoryItem, styles.podcastSection]}>
          <View style={styles.row}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="podcasts" size={18} color={COLORS.slate500} />
              <Text style={styles.categoryLabel}>
                {`Podcast (${providerLabel})`}
              </Text>
            </View>
            <Text style={styles.categoryValue}>
              {firstTierEst?.remainingPodcasts === null
                ? t('usage.unlimited')
                : t('usage.podcastItems', { count: firstTierEst?.remainingPodcasts ?? 0 })}
            </Text>
          </View>
        </View>

        {(() => {
          if (tierKeys.length === 0) return null;
          const firstEst = perCategory[tierKeys[0]];
          if (!firstEst) return null;

          const allSame = tierKeys.every((c) => perCategory[c]?.remainingChars === firstEst.remainingChars);
          const charLimitExists = firstEst.remainingCharsByLimit !== null;
          if (allSame && charLimitExists) {
            return (
              <View style={styles.infoNote}>
                <Text style={styles.infoNoteText}>
                  {t('usage.bottleneckNote')}
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
            {t('usage.exceeded')}
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
