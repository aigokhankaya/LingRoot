import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../contexts/LanguageContext';
import { IAP_PRODUCTS, requestSubscription, restorePurchases } from '../services/iap';
import { getSubscriptionPlans, getUsageSummary } from '../services/subscriptionService';
import { COLORS } from '../theme/colors';

interface SubscriptionPlan {
  id: number;
  name: string;
  description?: string;
  price: number;
  interval: string;
  features?: string[];
  is_active: boolean;
  apple_product_id?: string;
  google_product_id?: string;
  monthly_cost_limit_usd?: number;
  estimates?: {
    video_minutes?: number;
    text_pages?: number;
  };
}

const PackagesScreen: React.FC = () => {
  const navigation = useNavigation();
  const { language } = useLanguage();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingPlanId, setPurchasingPlanId] = useState<number | null>(null);
  const [activePackageName, setActivePackageName] = useState<string | null>(null);
  const [activePackageEndRaw, setActivePackageEndRaw] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    fetchPlans();
    fetchActivePackage();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      // subscriptionService kullanarak backend'den paketleri çek
      const response = await getSubscriptionPlans();

      if (response.success && Array.isArray(response.data)) {
        // Sadece aktif ve satın alınabilir paketleri göster (Free Trial hariç)
        const purchasablePlans = response.data.filter((p: SubscriptionPlan) => {
          const hasProductId = Platform.OS === 'ios' ? p.apple_product_id : p.google_product_id;
          return p.is_active && hasProductId;
        });
        setPlans(purchasablePlans);
      } else {
        Alert.alert('Hata', 'Paket verisi alınamadı');
      }
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Paketler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchActivePackage = async () => {
    try {
      const response = await getUsageSummary();

      if (response.success && response.data) {
        const data = response.data as any;
        if (data.plan?.name) {
          setActivePackageName(data.plan.name);
        } else if (data.subscription?.plantype) {
          setActivePackageName(data.subscription.plantype);
        } else if (data.plantype) {
          setActivePackageName(data.plantype);
        } else if (data.plan_name) {
          setActivePackageName(data.plan_name);
        }

        const sub = data.subscription;
        if (sub) {
          const end = sub.current_period_end || sub.enddate || sub.endDate || null;
          setActivePackageEndRaw(typeof end === 'string' ? end : null);
        } else {
          setActivePackageEndRaw(null);
        }
      } else {
        setActivePackageEndRaw(null);
      }
    } catch (error) {
      // Silent error handling
      setActivePackageEndRaw(null);
    }
  };

  const handlePurchase = async (plan: SubscriptionPlan) => {
    const productId = Platform.OS === 'ios' ? plan.apple_product_id : plan.google_product_id;

    console.log('========================================');
    console.log('[PackagesScreen] Purchase initiated');
    console.log('[PackagesScreen] Plan:', plan.name);
    console.log('[PackagesScreen] Plan ID:', plan.id);
    console.log('[PackagesScreen] Product ID:', productId);
    console.log('[PackagesScreen] Platform:', Platform.OS);
    console.log('[PackagesScreen] Timestamp:', new Date().toISOString());

    if (!productId) {
      const storeName = Platform.OS === 'ios' ? 'Apple Store' : 'Google Play';
      console.error('[PackagesScreen] ❌ No product ID found for this plan');
      Alert.alert(
        language === 'tr' ? 'Hata' : 'Error',
        language === 'tr'
          ? `Bu paket için ${storeName} satın alımı henüz aktif değil`
          : `${storeName} purchase is not yet active for this package`
      );
      return;
    }

    setPurchasingPlanId(plan.id);
    console.log('[PackagesScreen] Calling requestSubscription...');

    try {
      const result = await requestSubscription(productId);

      console.log('[PackagesScreen] requestSubscription returned');
      console.log('[PackagesScreen] Result:', JSON.stringify(result, null, 2));

      if (result.ok) {
        console.log('[PackagesScreen] ✅ Purchase successful');
        console.log('[PackagesScreen] Success message:', result.message);
        Alert.alert(
          'Başarılı',
          result.message || `${plan.name} aboneliği başarıyla satın alındı`,
          [
            {
              text: 'Tamam',
              onPress: () => {
                fetchActivePackage(); // Refresh active package
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        console.error('[PackagesScreen] ❌ Purchase failed');
        console.error('[PackagesScreen] Error message:', result.message);
        console.error('[PackagesScreen] Product ID:', productId);
        console.error('[PackagesScreen] Plan name:', plan.name);
        console.error('[PackagesScreen] Plan ID:', plan.id);

        Alert.alert(
          language === 'tr' ? 'Satın Alma Hatası' : 'Purchase Error',
          language === 'tr' ? 'Satın alma başarısız oldu.' : 'Purchase failed.',
          [{ text: 'Tamam' }]
        );
      }
    } catch (error: any) {
      console.error('[PackagesScreen] ❌ Exception caught in handlePurchase');
      console.error('[PackagesScreen] Exception type:', typeof error);
      console.error('[PackagesScreen] Exception message:', error?.message);
      console.error('[PackagesScreen] Exception code:', error?.code);
      console.error('[PackagesScreen] Exception stack:', error?.stack);
      console.error('[PackagesScreen] Full exception:', JSON.stringify(error, null, 2));
      console.error('[PackagesScreen] Product ID:', productId);
      console.error('[PackagesScreen] Plan name:', plan.name);
      console.error('[PackagesScreen] Plan ID:', plan.id);

      Alert.alert(
        language === 'tr' ? 'Hata' : 'Error',
        language === 'tr' ? 'Satın alma sırasında bir hata oluştu.' : 'An error occurred during purchase.',
        [{ text: 'Tamam' }]
      );
    } finally {
      console.log('[PackagesScreen] Purchase flow completed, resetting purchasingPlanId');
      setPurchasingPlanId(null);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const result = await restorePurchases();

      if (result.ok) {
        Alert.alert(
          language === 'tr' ? 'Başarılı' : 'Success',
          result.message || (language === 'tr'
            ? 'Satın alımlarınız başarıyla geri yüklendi'
            : 'Your purchases have been restored successfully'),
          [
            {
              text: language === 'tr' ? 'Tamam' : 'OK',
              onPress: () => {
                fetchActivePackage(); // Refresh active package
                fetchPlans(); // Refresh plans
              },
            },
          ]
        );
      } else {
        Alert.alert(
          language === 'tr' ? 'Bilgi' : 'Info',
          result.message || (language === 'tr'
            ? 'Geri yüklenecek satın alım bulunamadı'
            : 'No purchases found to restore')
        );
      }
    } catch (error: any) {
      Alert.alert(
        language === 'tr' ? 'Hata' : 'Error',
        error.message || (language === 'tr'
          ? 'Geri yükleme sırasında bir hata oluştu'
          : 'An error occurred during restore')
      );
    } finally {
      setRestoring(false);
    }
  };

  const getPlanColor = (planName: string) => {
    const name = planName.toLowerCase();
    if (name.includes('gold')) return '#FFD700';
    if (name.includes('platinum') || name.includes('platin')) return '#E5E4E2';
    if (name.includes('premium')) return '#4A90E2';
    return '#10B981';
  };

  const formatPrice = (price: number) => {
    return `₺${price}`;
  };

  const formatFeatures = (features?: string[], currentLanguage?: string) => {
    if (!features || features.length === 0) return [];

    // Özellikleri dile göre filtrele
    const langPrefix = currentLanguage === 'tr' ? 'TR:' : 'EN:';

    return features
      .filter(feature => feature.startsWith(langPrefix))
      .map(feature => feature.replace(langPrefix, '').trim());
  };

  const formatDescription = (description?: string, currentLanguage?: string) => {
    if (!description) return '';

    // Açıklama formatı: "TR: Türkçe metin | EN: English text"
    if (description.includes('|')) {
      const parts = description.split('|');
      const langPrefix = currentLanguage === 'tr' ? 'TR:' : 'EN:';

      const langPart = parts.find(part => part.trim().startsWith(langPrefix));
      if (langPart) {
        return langPart.replace(langPrefix, '').trim();
      }
    }

    // Eğer format yoksa olduğu gibi döndür
    return description;
  };

  const formatEndDate = (iso?: string | null) => {
    if (!iso) return '—';
    try {
      const localeTag = language === 'tr' ? 'tr-TR' : 'en-US';
      return new Intl.DateTimeFormat(localeTag, { dateStyle: 'medium' }).format(new Date(iso));
    } catch (e) {
      try {
        return new Date(iso).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US');
      } catch {
        return String(iso);
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Paketler yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {language === 'tr' ? 'Paketler' : 'Packages'}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <Text style={styles.subtitle}>
          {language === 'tr'
            ? 'Size uygun paketi seçin ve premium özelliklerin keyfini çıkarın'
            : 'Choose the package that suits you and enjoy premium features'}
        </Text>

        {plans.map((plan) => {
          const planColor = getPlanColor(plan.name);
          const isPurchasing = purchasingPlanId === plan.id;
          const features = formatFeatures(plan.features, language);
          const description = formatDescription(plan.description, language);
          // Daha esnek eşleştirme: hem plan adı hem de paket adı içinde arama
          const isActive = Boolean(
            activePackageName && (
              plan.name.toLowerCase().includes(activePackageName.toLowerCase()) ||
              activePackageName.toLowerCase().includes(plan.name.toLowerCase())
            )
          );

          return (
            <View key={plan.id} style={[
              styles.planCard,
              isActive && styles.activePlanCard
            ]}>
              {/* Header with gradient-like background */}
              <View style={[styles.planHeader, { backgroundColor: planColor + '20' }]}>
                {isActive && (
                  <View style={styles.activeBadge}>
                    <Icon name="check-circle" size={22} color="#FFFFFF" />
                    <Text style={styles.activeBadgeText}>
                      {language === 'tr' ? '✓ AKTİF PAKET' : '✓ ACTIVE PACKAGE'}
                    </Text>
                  </View>
                )}
                <Text style={[styles.planName, { color: planColor }]}>
                  {plan.name}
                </Text>
                {description && (
                  <Text style={styles.planDescription}>{description}</Text>
                )}
              </View>

              {/* Price section */}
              <View style={styles.planBody}>
                <View style={styles.priceSection}>
                  <Text style={styles.price}>{formatPrice(plan.price)}</Text>
                  <Text style={styles.priceInterval}>
                    /{language === 'tr' ? 'ay' : 'month'}
                  </Text>
                </View>

                {isActive && (
                  <View style={styles.validityContainer}>
                    <Text style={styles.validityLabel}>
                      {language === 'tr' ? 'Geçerlilik' : 'Valid until'}
                    </Text>
                    <Text style={styles.validityValue}>
                      {formatEndDate(activePackageEndRaw)}
                    </Text>
                  </View>
                )}

                {/* Features list */}
                {features.length > 0 && (
                  <View style={styles.featuresContainer}>
                    {features.map((feature, index) => (
                      <View key={index} style={styles.featureItem}>
                        <Icon name="check-circle" size={20} color="#10B981" />
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Estimates */}
                {plan.estimates && (
                  <View style={styles.estimatesContainer}>
                    <Text style={styles.estimatesTitle}>
                      {language === 'tr' ? 'Tahmini Kullanım:' : 'Estimated Usage:'}
                    </Text>
                    {plan.estimates.video_minutes && (
                      <Text style={styles.estimateText}>
                        {language === 'tr'
                          ? `Bu paketle tahmini video: ~${plan.estimates.video_minutes} dk`
                          : `Estimated video with this package: ~${plan.estimates.video_minutes} min`}
                      </Text>
                    )}
                    {plan.estimates.text_pages && (
                      <Text style={styles.estimateText}>
                        {language === 'tr'
                          ? `Bu paketle tahmini metin: ~${plan.estimates.text_pages} sayfa`
                          : `Estimated text with this package: ~${plan.estimates.text_pages} pages`}
                      </Text>
                    )}
                  </View>
                )}

                {/* Purchase button */}
                <TouchableOpacity
                  style={[
                    styles.purchaseButton,
                    { backgroundColor: planColor },
                    (isPurchasing || isActive) && styles.purchaseButtonDisabled,
                  ]}
                  onPress={() => handlePurchase(plan)}
                  disabled={isPurchasing || isActive}
                >
                  {isPurchasing ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : isActive ? (
                    <Text style={styles.purchaseButtonText}>
                      {language === 'tr' ? 'Aktif Paket' : 'Active Package'}
                    </Text>
                  ) : (
                    <Text style={styles.purchaseButtonText}>
                      {language === 'tr' ? 'Paketi Satın Al' : 'Purchase Package'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {plans.length === 0 && (
          <View style={styles.emptyContainer}>
            <Icon name="inventory" size={64} color="#CCC" />
            <Text style={styles.emptyText}>
              {language === 'tr' ? 'Henüz paket bulunmuyor' : 'No packages available yet'}
            </Text>
          </View>
        )}

        {/* Restore Purchases Button */}
        <View style={styles.restoreContainer}>
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={restoring}
          >
            {restoring ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <>
                <Icon name="restore" size={20} color={COLORS.primary} />
                <Text style={styles.restoreButtonText}>
                  {language === 'tr' ? 'Satın Alımları Geri Yükle' : 'Restore Purchases'}
                </Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.restoreHint}>
            {language === 'tr'
              ? 'Daha önce satın aldığınız paketleri geri yükleyin'
              : 'Restore your previously purchased packages'}
          </Text>
        </View>

        {/* Apple Required Subscription Terms */}
        <View style={styles.termsContainer}>
          <Text style={styles.termsText}>
            {language === 'tr'
              ? '• Ödeme, satın alma onaylandığında iTunes Hesabınızdan tahsil edilecektir.\n\n• Abonelik, mevcut dönem bitmeden en az 24 saat önce iptal edilmediği sürece otomatik olarak yenilenir.\n\n• Hesabınız, mevcut dönem sona ermeden 24 saat içinde yenileme için ücretlendirilecektir.\n\n• Abonelikler kullanıcı tarafından yönetilebilir ve otomatik yenileme, satın alma sonrasında kullanıcının Hesap Ayarlarına gidilerek kapatılabilir.\n\n• Ücretsiz deneme süresinin kullanılmayan kısmı, varsa, kullanıcı o yayına abone olduğunda kaybedilecektir.'
              : '• Payment will be charged to iTunes Account at confirmation of purchase.\n\n• Subscription automatically renews unless auto-renew is turned off at least 24-hours before the end of the current period.\n\n• Account will be charged for renewal within 24-hours prior to the end of the current period.\n\n• Subscriptions may be managed by the user and auto-renewal may be turned off by going to the user\'s Account Settings after purchase.\n\n• Any unused portion of a free trial period, if offered, will be forfeited when the user purchases a subscription to that publication.'}
          </Text>

          <View style={styles.legalLinks}>
            <TouchableOpacity onPress={() => (navigation as any).navigate('PrivacyPolicy')}>
              <Text style={styles.legalLink}>
                {language === 'tr' ? 'Gizlilik Politikası' : 'Privacy Policy'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.legalSeparator}>•</Text>
            <TouchableOpacity onPress={() => (navigation as any).navigate('TermsOfService')}>
              <Text style={styles.legalLink}>
                {language === 'tr' ? 'Kullanım Şartları' : 'Terms of Service'}
              </Text>
            </TouchableOpacity>
          </View>
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
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: COLORS.slate500,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: 'transparent',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.slate800,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.slate500,
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
    fontWeight: '500',
  },
  planCard: {
    marginHorizontal: 24,
    marginBottom: 20,
    backgroundColor: '#f8f9ff',
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  planHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate100,
  },
  planName: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  planDescription: {
    fontSize: 13,
    color: COLORS.slate500,
    marginTop: 6,
    fontWeight: '500',
  },
  planBody: {
    padding: 24,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 24,
  },
  price: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.slate800,
  },
  priceInterval: {
    fontSize: 16,
    color: COLORS.slate400,
    marginLeft: 4,
    fontWeight: '600',
  },
  featuresContainer: {
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  featureText: {
    fontSize: 14,
    color: COLORS.slate700,
    marginLeft: 12,
    flex: 1,
    fontWeight: '600',
  },
  estimatesContainer: {
    backgroundColor: COLORS.slate50,
    padding: 20,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.slate100,
  },
  estimatesTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.slate400,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  estimateText: {
    fontSize: 13,
    color: COLORS.slate500,
    marginTop: 4,
    fontWeight: '500',
  },
  validityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(39, 190, 170, 0.08)',
    padding: 14,
    borderRadius: 14,
  },
  validityLabel: {
    fontSize: 12,
    color: COLORS.slate500,
    fontWeight: '600',
  },
  validityValue: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.brandTeal,
  },
  purchaseButton: {
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  purchaseButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  purchaseButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.slate400,
    marginTop: 16,
    fontWeight: '600',
  },
  activePlanCard: {
    borderWidth: 3,
    borderColor: COLORS.brandTeal,
    backgroundColor: 'rgba(39, 190, 170, 0.03)',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brandTeal,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
    shadowColor: COLORS.brandTeal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  restoreContainer: {
    marginHorizontal: 24,
    marginTop: 32,
    marginBottom: 16,
    alignItems: 'center',
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.brandTeal,
    minHeight: 52,
    gap: 10,
  },
  restoreButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.brandTeal,
    marginLeft: 8,
  },
  restoreHint: {
    fontSize: 12,
    color: COLORS.slate400,
    marginTop: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  termsContainer: {
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 24,
    padding: 20,
    backgroundColor: COLORS.slate50,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.slate100,
  },
  termsText: {
    fontSize: 11,
    color: COLORS.slate400,
    lineHeight: 18,
    textAlign: 'left',
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  legalLink: {
    fontSize: 12,
    color: COLORS.brandTeal,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    fontSize: 12,
    color: COLORS.slate300,
    marginHorizontal: 8,
  },
});

export default PackagesScreen;
