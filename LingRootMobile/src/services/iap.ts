import * as RNIap from 'react-native-iap';
import { Platform } from 'react-native';
import { apiService } from './api';

// Product IDs for Apple and Google Play
// Apple uses the original IDs, Google Play uses app-specific IDs
const APPLE_PRODUCTS = {
  goldMonthly: 'com.lingroot.premium.monthly',
  platinumMonthly: 'com.lingroot.premium.monthly.platin',
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
  // For subscriptions, prefer getSubscriptions
  return RNIap.getSubscriptions({ skus: ids });
}

async function verifyWithBackend(receipt: string, productId: string) {
  // Calls backend /api/iap/apple/verify (added in apiService)
  return apiService.verifyAppleReceipt(receipt, productId);
}

export async function requestSubscription(productId: string): Promise<{ ok: boolean; message?: string }> {
  try {
    await initIAP();

    return await new Promise(async (resolve) => {
      purchaseUpdateSub?.remove();
      purchaseErrorSub?.remove();

      purchaseUpdateSub = RNIap.purchaseUpdatedListener(async (purchase: any) => {
        try {
          const receipt = purchase.transactionReceipt;
          if (receipt) {
            // Verify with backend
            try {
              const result = await verifyWithBackend(receipt, productId);
              // Finish transaction
              try {
                await RNIap.finishTransaction({ purchase, isConsumable: false });
              } catch {}
              resolve({ ok: true, message: 'Satın alma doğrulandı' });
            } catch (verErr: any) {
              // Still try to finish to avoid stuck state
              try { await RNIap.finishTransaction({ purchase, isConsumable: false }); } catch {}
              resolve({ ok: false, message: verErr?.message || 'Doğrulama başarısız' });
            }
          }
        } catch (e: any) {
          resolve({ ok: false, message: e?.message || 'Satın alma başarısız' });
        }
      });

      purchaseErrorSub = RNIap.purchaseErrorListener((error: any) => {
        resolve({ ok: false, message: error?.message || 'Satın alma hatası' });
      });

      try {
        await RNIap.requestSubscription({ sku: productId, andDangerouslyFinishTransactionAutomaticallyIOS: false });
      } catch (e: any) {
        resolve({ ok: false, message: e?.message || 'Satın alma başlatılamadı' });
      }
    });
  } catch (e: any) {
    return { ok: false, message: e?.message || 'Satın alma hatası' };
  }
}

export async function restorePurchases(): Promise<{ ok: boolean; message?: string }> {
  try {
    await initIAP();
    const purchases = await RNIap.getAvailablePurchases();
    // Find any subscription purchase and verify the freshest one
    const subs = purchases.filter(p => !!p.productId);
    // Sort by transactionDate desc
    subs.sort((a, b) => Number(b.transactionDate || 0) - Number(a.transactionDate || 0));
    if (subs.length === 0) {
      return { ok: false, message: 'Geri yüklenecek satın alma bulunamadı' };
    }
    const latest = subs[0];
    if (!latest.transactionReceipt || !latest.productId) {
      return { ok: false, message: 'Geçersiz makbuz' };
    }
    try {
      await verifyWithBackend(latest.transactionReceipt, latest.productId);
      return { ok: true, message: 'Satın alımlar geri yüklendi' };
    } catch (e: any) {
      return { ok: false, message: e?.message || 'Doğrulama başarısız' };
    }
  } catch (e: any) {
    return { ok: false, message: e?.message || 'Geri yükleme hatası' };
  }
}
