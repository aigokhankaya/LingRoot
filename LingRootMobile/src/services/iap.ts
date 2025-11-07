import * as RNIap from 'react-native-iap';
import { Platform } from 'react-native';
import { apiService } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Product IDs for Apple and Google Play
// Apple uses the original IDs, Google Play uses app-specific IDs
const APPLE_PRODUCTS = {
  goldMonthly: 'com.lingroot.premium.monthly',
  platinumMonthly: 'com.lingroot.premium.monthly.platin',
  // Test product - remove after approval
  testMonthly: 'com.lingroot.test.monthly',
};

const GOOGLE_PRODUCTS = {
  goldMonthly: 'com.nsyzk.lingrootmobile.gold.monthly',
  platinumMonthly: 'com.nsyzk.lingroot.platinum.monthly',
};

// Use platform-specific product IDs
export const IAP_PRODUCTS = Platform.OS === 'ios' ? APPLE_PRODUCTS : GOOGLE_PRODUCTS;

let purchaseUpdateSub: any = null;
let purchaseErrorSub: any = null;

export async function initIAP() {
  try {
    await RNIap.initConnection();
  } catch (e) {
    // silent
  }
}

export async function endIAP() {
  try {
    purchaseUpdateSub?.remove();
    purchaseErrorSub?.remove();
    purchaseUpdateSub = null;
    purchaseErrorSub = null;
    await RNIap.endConnection();
  } catch {}
}

export async function getProducts() {
  const ids = [IAP_PRODUCTS.goldMonthly, IAP_PRODUCTS.platinumMonthly].filter(Boolean);
  console.log('[IAP] Requesting products with IDs:', ids);
  console.log('[IAP] Platform:', Platform.OS);
  // For subscriptions, prefer getSubscriptions
  try {
    const products = await RNIap.getSubscriptions({ skus: ids });
    console.log('[IAP] Products received:', products.length);
    products.forEach(p => console.log(`  - ${p.productId}: ${p.title}`));
    return products;
  } catch (error: any) {
    console.error('[IAP] Error fetching products:', error.message);
    throw error;
  }
}

async function verifyWithBackend(receipt: string, productId: string, purchaseToken?: string) {
  console.log('[IAP] 🔗 verifyWithBackend called');
  console.log('[IAP] Platform:', Platform.OS);
  console.log('[IAP] Product ID:', productId);
  console.log('[IAP] Receipt length:', receipt?.length || 0);
  console.log('[IAP] Purchase token:', purchaseToken ? 'present' : 'not present');
  
  try {
    if (Platform.OS === 'ios') {
      console.log('[IAP] Calling apiService.verifyAppleReceipt...');
      const result = await apiService.verifyAppleReceipt(receipt, productId);
      console.log('[IAP] ✅ Backend verification successful:', JSON.stringify(result, null, 2));
      return result;
    } else {
      // Google Play IAP verification
      if (!purchaseToken) {
        console.error('[IAP] ❌ Purchase token missing for Android');
        throw new Error('Purchase token is required for Android');
      }
      const packageName = 'com.nsyzk.lingrootmobile';
      console.log('[IAP] Calling apiService.verifyGooglePlayPurchase...');
      console.log('[IAP] Package name:', packageName);
      const result = await apiService.verifyGooglePlayPurchase(purchaseToken, productId, packageName);
      console.log('[IAP] ✅ Backend verification successful:', JSON.stringify(result, null, 2));
      return result;
    }
  } catch (error: any) {
    console.error('[IAP] ❌ Backend verification failed');
    console.error('[IAP] Error type:', typeof error);
    console.error('[IAP] Error message:', error?.message);
    console.error('[IAP] Error response:', error?.response?.data);
    console.error('[IAP] Error status:', error?.response?.status);
    throw error;
  }
}

async function getLanguage(): Promise<'tr' | 'en'> {
  try {
    const lang = await AsyncStorage.getItem('app_language');
    return (lang === 'tr' || lang === 'en') ? lang : 'en';
  } catch {
    return 'en';
  }
}

export async function requestSubscription(productId: string): Promise<{ ok: boolean; message?: string }> {
  try {
    console.log('[IAP] ========================================');
    console.log('[IAP] Starting subscription purchase flow');
    console.log('[IAP] Product ID requested:', productId);
    console.log('[IAP] Platform:', Platform.OS);
    
    await initIAP();
    console.log('[IAP] IAP connection initialized');

    // First, verify the product exists and get subscription details
    let subscriptionOffers: any[] = [];
    try {
      console.log('[IAP] Fetching available products...');
      const products = await getProducts();
      console.log('[IAP] Available products count:', products.length);
      console.log('[IAP] Available product IDs:', products.map(p => p.productId));
      
      // Log detailed product information for debugging
      products.forEach(p => {
        console.log(`[IAP] Product: ${p.productId}`);
        console.log(`  - Title: ${p.title}`);
        console.log(`  - Description: ${p.description}`);
        const price = (p as any).localizedPrice || (p as any).price || 'N/A';
        console.log(`  - Price: ${price}`);
      });
      
      const productExists = products.find(p => p.productId === productId);
      if (!productExists) {
        console.error('[IAP] ❌ Product ID not found in available products!');
        console.error('[IAP] Requested product ID:', productId);
        console.error('[IAP] Available product IDs:', products.map(p => p.productId).join(', '));
        console.error('[IAP] Total products available:', products.length);
        
        const lang = await getLanguage();
        const availableList = products.length > 0 
          ? products.map(p => p.productId).join(', ')
          : 'none';
        
        return { 
          ok: false, 
          message: lang === 'tr'
            ? `Ürün bulunamadı: ${productId}. Mevcut ürünler: ${availableList}`
            : `Product not available: ${productId}. Available: ${availableList}`
        };
      }
      console.log('[IAP] ✅ Product found:', productExists.title);
      const foundPrice = (productExists as any).localizedPrice || (productExists as any).price || 'N/A';
      console.log('[IAP] Product price:', foundPrice);
      
      // For Android, get subscription offers
      if (Platform.OS === 'android' && (productExists as any).subscriptionOfferDetails) {
        const offerDetails = (productExists as any).subscriptionOfferDetails;
        console.log('[IAP] Android subscription offers found:', offerDetails.length);
        
        // Use only the first offer to avoid "duplicate products" error
        if (offerDetails.length > 0) {
          const firstOffer = offerDetails[0];
          subscriptionOffers = [{
            sku: productId,
            offerToken: firstOffer.offerToken || firstOffer.basePlanId || '',
          }];
          console.log('[IAP] Using first subscription offer:', JSON.stringify(subscriptionOffers, null, 2));
        }
      }
    } catch (error: any) {
      console.error('[IAP] ❌ Error fetching products:', error.message);
      console.error('[IAP] Error code:', error.code);
      console.error('[IAP] Full error:', JSON.stringify(error, null, 2));
      const lang = await getLanguage();
      return { 
        ok: false, 
        message: lang === 'tr'
          ? `Ürünler yüklenemedi: ${error.message}`
          : `Cannot fetch products: ${error.message}`
      };
    }

    return await new Promise(async (resolve) => {
      purchaseUpdateSub?.remove();
      purchaseErrorSub?.remove();

      purchaseUpdateSub = RNIap.purchaseUpdatedListener(async (purchase: any) => {
        console.log('[IAP] Purchase update received:', purchase.productId);
        console.log('[IAP] Purchase object:', JSON.stringify(purchase, null, 2));
        try {
          const receipt = purchase.transactionReceipt;
          const purchaseToken = purchase.purchaseToken; // Android purchase token
          
          if (Platform.OS === 'ios' && receipt) {
            console.log('[IAP] iOS receipt received, verifying with backend...');
            try {
              const result = await verifyWithBackend(receipt, productId);
              console.log('[IAP] ✅ Backend verification successful');
              try {
                await RNIap.finishTransaction({ purchase, isConsumable: false });
                console.log('[IAP] Transaction finished');
              } catch (finishErr) {
                console.warn('[IAP] Error finishing transaction:', finishErr);
              }
              const lang = await getLanguage();
              resolve({ ok: true, message: lang === 'tr' ? 'Satın alma doğrulandı' : 'Purchase verified' });
            } catch (verErr: any) {
              console.error('[IAP] ❌ Backend verification failed:', verErr.message);
              try { await RNIap.finishTransaction({ purchase, isConsumable: false }); } catch {}
              const lang = await getLanguage();
              resolve({ ok: false, message: verErr?.message || (lang === 'tr' ? 'Doğrulama başarısız' : 'Verification failed') });
            }
          } else if (Platform.OS === 'android' && purchaseToken) {
            console.log('[IAP] Android purchase token received, verifying with backend...');
            try {
              const result = await verifyWithBackend('', productId, purchaseToken);
              console.log('[IAP] ✅ Backend verification successful');
              try {
                await RNIap.finishTransaction({ purchase, isConsumable: false });
                console.log('[IAP] Transaction finished');
              } catch (finishErr) {
                console.warn('[IAP] Error finishing transaction:', finishErr);
              }
              const lang = await getLanguage();
              resolve({ ok: true, message: lang === 'tr' ? 'Satın alma doğrulandı' : 'Purchase verified' });
            } catch (verErr: any) {
              console.error('[IAP] ❌ Backend verification failed:', verErr.message);
              try { await RNIap.finishTransaction({ purchase, isConsumable: false }); } catch {}
              const lang = await getLanguage();
              resolve({ ok: false, message: verErr?.message || (lang === 'tr' ? 'Doğrulama başarısız' : 'Verification failed') });
            }
          } else {
            console.error('[IAP] ❌ No valid receipt or purchase token found');
            const lang = await getLanguage();
            resolve({ ok: false, message: lang === 'tr' ? 'Satın alma verisi bulunamadı' : 'Purchase data not found' });
          }
        } catch (e: any) {
          console.error('[IAP] ❌ Purchase update error:', e.message);
          const lang = await getLanguage();
          resolve({ ok: false, message: e?.message || (lang === 'tr' ? 'Satın alma başarısız' : 'Purchase failed') });
        }
      });

      purchaseErrorSub = RNIap.purchaseErrorListener(async (error: any) => {
        console.error('[IAP] ❌ Purchase error listener triggered');
        console.error('[IAP] Error code:', error?.code);
        console.error('[IAP] Error message:', error?.message);
        console.error('[IAP] Error responseCode:', error?.responseCode);
        console.error('[IAP] Error debugMessage:', error?.debugMessage);
        console.error('[IAP] Full error object:', JSON.stringify(error, null, 2));
        
        // Detaylı hata mesajı oluştur
        let detailedMessage = '';
        if (error?.code) {
          detailedMessage += `Code: ${error.code}`;
        }
        if (error?.responseCode) {
          detailedMessage += ` | ResponseCode: ${error.responseCode}`;
        }
        if (error?.message) {
          detailedMessage += ` | Message: ${error.message}`;
        }
        if (error?.debugMessage) {
          detailedMessage += ` | Debug: ${error.debugMessage}`;
        }
        
        console.error('[IAP] Detailed error string:', detailedMessage);
        
        const lang = await getLanguage();
        const userMessage = detailedMessage || error?.message || (lang === 'tr' ? 'Satın alma hatası' : 'Purchase error');
        resolve({ ok: false, message: userMessage });
      });

      try {
        console.log('[IAP] ========================================');
        console.log('[IAP] Requesting subscription with SKU:', productId);
        console.log('[IAP] Platform:', Platform.OS);
        console.log('[IAP] Timestamp:', new Date().toISOString());
        
        if (Platform.OS === 'ios') {
          console.log('[IAP] Calling RNIap.requestSubscription for iOS...');
          await RNIap.requestSubscription({ sku: productId, andDangerouslyFinishTransactionAutomaticallyIOS: false });
          console.log('[IAP] ✅ Subscription request sent to App Store successfully');
        } else {
          // Android requires subscriptionOffers for Google Play Billing Library 5.0+
          if (subscriptionOffers.length > 0) {
            console.log('[IAP] Using subscription offers:', subscriptionOffers);
            await RNIap.requestSubscription({ 
              sku: productId,
              subscriptionOffers: subscriptionOffers
            });
          } else {
            console.log('[IAP] No subscription offers found, using basic request');
            await RNIap.requestSubscription({ sku: productId });
          }
          console.log('[IAP] Subscription request sent to Google Play');
        }
      } catch (e: any) {
        console.error('[IAP] ❌ Request subscription EXCEPTION caught');
        console.error('[IAP] Exception type:', typeof e);
        console.error('[IAP] Exception message:', e?.message);
        console.error('[IAP] Exception code:', e?.code);
        console.error('[IAP] Exception responseCode:', e?.responseCode);
        console.error('[IAP] Exception debugMessage:', e?.debugMessage);
        console.error('[IAP] Exception stack:', e?.stack);
        console.error('[IAP] Full exception object:', JSON.stringify(e, null, 2));
        
        // Detaylı hata mesajı oluştur
        let detailedMessage = 'Request failed: ';
        if (e?.code) {
          detailedMessage += `Code: ${e.code}`;
        }
        if (e?.responseCode) {
          detailedMessage += ` | ResponseCode: ${e.responseCode}`;
        }
        if (e?.message) {
          detailedMessage += ` | Message: ${e.message}`;
        }
        if (e?.debugMessage) {
          detailedMessage += ` | Debug: ${e.debugMessage}`;
        }
        
        console.error('[IAP] Detailed exception string:', detailedMessage);
        
        const lang = await getLanguage();
        const userMessage = detailedMessage || e?.message || (lang === 'tr' ? 'Satın alma başlatılamadı' : 'Could not start purchase');
        resolve({ ok: false, message: userMessage });
      }
    });
  } catch (e: any) {
    console.error('[IAP] ❌ Outer catch - unexpected error:', e.message);
    const lang = await getLanguage();
    return { ok: false, message: e?.message || (lang === 'tr' ? 'Satın alma hatası' : 'Purchase error') };
  }
}

export async function restorePurchases(): Promise<{ ok: boolean; message?: string }> {
  try {
    await initIAP();
    const purchases = await RNIap.getAvailablePurchases();
    // Find any subscription purchase
    const subs = purchases.filter(p => !!p.productId && !!p.transactionReceipt);
    
    if (subs.length === 0) {
      const lang = await getLanguage();
      return { ok: false, message: lang === 'tr' ? 'Geri yüklenecek satın alma bulunamadı' : 'No purchases to restore' };
    }
    
    console.log(`[IAP] Found ${subs.length} purchases to restore`);
    
    // Only send the most recent purchase to backend
    // Sort by transactionDate (most recent first)
    subs.sort((a, b) => Number(b.transactionDate || 0) - Number(a.transactionDate || 0));
    const latest = subs[0];
    
    console.log(`[IAP] Restoring latest purchase: ${latest.productId}`);
    
    try {
      if (Platform.OS === 'ios') {
        await verifyWithBackend(latest.transactionReceipt, latest.productId);
      } else {
        await verifyWithBackend('', latest.productId, latest.purchaseToken);
      }
      const lang = await getLanguage();
      return { ok: true, message: lang === 'tr' ? 'Satın alımlar geri yüklendi' : 'Purchases restored' };
    } catch (e: any) {
      const lang = await getLanguage();
      return { ok: false, message: e?.message || (lang === 'tr' ? 'Doğrulama başarısız' : 'Verification failed') };
    }
  } catch (e: any) {
    const lang = await getLanguage();
    return { ok: false, message: e?.message || (lang === 'tr' ? 'Geri yükleme hatası' : 'Restore error') };
  }
}
