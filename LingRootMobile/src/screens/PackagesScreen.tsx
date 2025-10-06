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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../contexts/LanguageContext';
import { IAP_PRODUCTS, requestSubscription, restorePurchases } from '../services/iap';
import { apiService } from '../services/api';

interface SubscriptionPlan {
  id: number;
  name: string;
  description?: string;
  price: number;
  interval: string;
  features?: string[];
  is_active: boolean;
  apple_product_id?: string;
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
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    fetchPlans();
    fetchActivePackage();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      // apiService kullanarak backend'den paketleri çek
      const response = await apiService.getSubscriptionPlans();
      console.log('Plans response:', response);
      
      if (response.success && Array.isArray(response.data)) {
        // Sadece aktif ve satın alınabilir paketleri göster (Free Trial hariç)
        const purchasablePlans = response.data.filter((p: SubscriptionPlan) => 
          p.is_active && p.apple_product_id // Sadece Apple Product ID'si olan paketler
        );
        console.log('Purchasable plans:', purchasablePlans.length, purchasablePlans);
        setPlans(purchasablePlans);
      } else {
        console.log('Invalid response format:', response);
        Alert.alert('Hata', 'Paket verisi alınamadı');
      }
    } catch (error: any) {
      console.error('Fetch plans error:', error);
      Alert.alert('Hata', error.message || 'Paketler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchActivePackage = async () => {
    try {
      const response = await apiService.getUsageSummary();
      console.log('Usage Summary Response:', JSON.stringify(response, null, 2));
      
      // Önce plan objesinden al
      if (response.success && response.data?.plan?.name) {
        console.log('Active Package Name from plan:', response.data.plan.name);
        setActivePackageName(response.data.plan.name);
      } 
      // Sonra subscription.plantype'dan al
      else if (response.success && response.data?.subscription?.plantype) {
        console.log('Active Package Name from plantype:', response.data.subscription.plantype);
        setActivePackageName(response.data.subscription.plantype);
      }
      // Son olarak plantype'dan al
      else if (response.success && response.data?.plantype) {
        console.log('Active Package Name from data.plantype:', response.data.plantype);
        setActivePackageName(response.data.plantype);
      }
    } catch (error) {
      console.log('Active package fetch error:', error);
    }
  };

  const handlePurchase = async (plan: SubscriptionPlan) => {
    if (!plan.apple_product_id) {
      Alert.alert('Hata', 'Bu paket için Apple Store satın alımı henüz aktif değil');
      return;
    }

    setPurchasingPlanId(plan.id);
    try {
      const result = await requestSubscription(plan.apple_product_id);
      
      if (result.ok) {
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
        Alert.alert('Hata', result.message || 'Satın alma başarısız');
      }
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Satın alma sırasında bir hata oluştu');
    } finally {
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

  const formatFeatures = (features?: string[]) => {
    if (!features || features.length === 0) return [];
    return features;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
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
          const features = formatFeatures(plan.features);
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
                {plan.description && (
                  <Text style={styles.planDescription}>{plan.description}</Text>
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
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <>
                <Icon name="restore" size={20} color="#007AFF" />
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
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  planCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  planHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  planName: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  planBody: {
    padding: 20,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  price: {
    fontSize: 48,
    fontWeight: '800',
    color: '#111827',
  },
  priceInterval: {
    fontSize: 18,
    color: '#6B7280',
    marginLeft: 4,
  },
  featuresContainer: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  estimatesContainer: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  estimatesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  estimateText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  purchaseButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  activePlanCard: {
    borderWidth: 3,
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    alignSelf: 'flex-start',
    marginBottom: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  activeBadgeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  restoreContainer: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    minHeight: 48,
    gap: 8,
  },
  restoreButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
  },
  restoreHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  termsContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  termsText: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 16,
    textAlign: 'left',
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  legalLink: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    fontSize: 12,
    color: '#9CA3AF',
    marginHorizontal: 8,
  },
});

export default PackagesScreen;
