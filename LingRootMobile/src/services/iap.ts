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

async function verifyWithBackend(receipt: string, productId: string) {
  // Calls backend /api/iap/apple/verify (added in apiService)
  return apiService.verifyAppleReceipt(receipt, productId);
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

    // First, verify the product exists
    try {
      console.log('[IAP] Fetching available products...');
      const products = await getProducts();
      console.log('[IAP] Available products:', products.map(p => p.productId));
      
      const productExists = products.find(p => p.productId === productId);
      if (!productExists) {
        console.error('[IAP] ❌ Product ID not found in available products!');
        console.error('[IAP] Requested:', productId);
        console.error('[IAP] Available:', products.map(p => p.productId).join(', '));
        return { ok: false, message: `Product not available: ${productId}` };
      }
      console.log('[IAP] ✅ Product found:', productExists.title);
    } catch (error: any) {
      console.error('[IAP] ❌ Error fetching products:', error.message);
      return { ok: false, message: `Cannot fetch products: ${error.message}` };
    }

    return await new Promise(async (resolve) => {
      purchaseUpdateSub?.remove();
      purchaseErrorSub?.remove();

      purchaseUpdateSub = RNIap.purchaseUpdatedListener(async (purchase: any) => {
        console.log('[IAP] Purchase update received:', purchase.productId);
        try {
          const receipt = purchase.transactionReceipt;
          if (receipt) {
            console.log('[IAP] Receipt received, verifying with backend...');
            // Verify with backend
            try {
              const result = await verifyWithBackend(receipt, productId);
              console.log('[IAP] ✅ Backend verification successful');
              // Finish transaction
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
              // Still try to finish to avoid stuck state
              try { await RNIap.finishTransaction({ purchase, isConsumable: false }); } catch {}
              const lang = await getLanguage();
              resolve({ ok: false, message: verErr?.message || (lang === 'tr' ? 'Doğrulama başarısız' : 'Verification failed') });
            }
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
        console.error('[IAP] Error details:', JSON.stringify(error, null, 2));
        const lang = await getLanguage();
        resolve({ ok: false, message: error?.message || (lang === 'tr' ? 'Satın alma hatası' : 'Purchase error') });
      });

      try {
        console.log('[IAP] Requesting subscription with SKU:', productId);
        await RNIap.requestSubscription({ sku: productId, andDangerouslyFinishTransactionAutomaticallyIOS: false });
        console.log('[IAP] Subscription request sent to App Store');
      } catch (e: any) {
        console.error('[IAP] ❌ Request subscription failed');
        console.error('[IAP] Error:', e.message);
        console.error('[IAP] Error code:', e.code);
        console.error('[IAP] Full error:', JSON.stringify(e, null, 2));
        const lang = await getLanguage();
        resolve({ ok: false, message: e?.message || (lang === 'tr' ? 'Satın alma başlatılamadı' : 'Could not start purchase') });
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
      await verifyWithBackend(latest.transactionReceipt, latest.productId);
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
