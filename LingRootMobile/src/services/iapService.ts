import { getApiClientAsync } from './apiClient';

export async function verifyAppleReceipt(receiptData: string, productId: string): Promise<{ success: boolean; data?: any; message?: string }> {
    const client = await getApiClientAsync();
    const response = await client.http.post('/api/iap/apple/verify', { receiptData, productId });
    return response.data;
}

export async function verifyGooglePlayPurchase(purchaseToken: string, productId: string, packageName: string): Promise<{ success: boolean; data?: any; message?: string }> {
    const client = await getApiClientAsync();
    const response = await client.http.post('/api/iap/google/verify', { purchaseToken, productId, packageName });
    return response.data;
}
