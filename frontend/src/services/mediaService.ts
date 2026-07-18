import type {
  MediaCampaign,
  MediaCampaignInput,
  MediaCampaignListResponse,
} from '@/types/media';

function headers(): HeadersInit {
  const token = typeof window === 'undefined' ? null : localStorage.getItem('lingroot_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/admin/media${path}`, {
    ...init,
    headers: { ...headers(), ...(init.headers || {}) },
    credentials: 'include',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || `İstek başarısız: HTTP ${response.status}`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return payload.data ?? payload;
}

export async function listMediaCampaigns(params: {
  search?: string;
  status?: string;
  platform?: string;
  page?: number;
} = {}): Promise<MediaCampaignListResponse> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.status && params.status !== 'all') query.set('status', params.status);
  if (params.platform && params.platform !== 'all') query.set('platform', params.platform);
  if (params.page) query.set('page', String(params.page));
  query.set('limit', '25');
  const response = await fetch(`/api/admin/media/campaigns?${query}`, { headers: headers(), credentials: 'include' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || 'Kampanyalar yüklenemedi.') as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return { data: payload.data || [], pagination: payload.pagination };
}

export const getMediaCampaign = (id: string) => request<MediaCampaign>(`/campaigns/${id}`);
export const createMediaCampaign = (input: MediaCampaignInput) =>
  request<MediaCampaign>('/campaigns', { method: 'POST', body: JSON.stringify(input) });
export const updateMediaCampaign = (id: string, input: Partial<MediaCampaignInput>) =>
  request<MediaCampaign>(`/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(input) });
export const deleteMediaCampaign = (id: string) =>
  request<void>(`/campaigns/${id}`, { method: 'DELETE' });
export const generateMediaCampaign = (id: string) =>
  request<MediaCampaign>(`/campaigns/${id}/generate`, { method: 'POST' });
export const retryMediaCampaign = (id: string) =>
  request<MediaCampaign>(`/campaigns/${id}/retry`, { method: 'POST' });
export const cancelMediaCampaign = (id: string) =>
  request<MediaCampaign>(`/campaigns/${id}/cancel`, { method: 'POST' });
export const approveMediaCampaign = (id: string, notes = '') =>
  request<MediaCampaign>(`/campaigns/${id}/approve`, { method: 'POST', body: JSON.stringify({ notes }) });
export const requestMediaRevision = (id: string, notes: string) =>
  request<MediaCampaign>(`/campaigns/${id}/request-revision`, { method: 'POST', body: JSON.stringify({ notes }) });
export const duplicateMediaCampaign = (id: string) =>
  request<MediaCampaign>(`/campaigns/${id}/duplicate`, { method: 'POST' });
export const rerunMediaQuality = (id: string) =>
  request<MediaCampaign>(`/campaigns/${id}/quality/rerun`, { method: 'POST' });
export const submitMediaQualityFeedback = (
  campaignId: string,
  runId: string,
  input: { findingId?: string; decision: 'agree' | 'disagree' | 'override_accept' | 'request_repair'; notes?: string },
) => request<MediaCampaign>(`/campaigns/${campaignId}/quality/${runId}/feedback`, {
  method: 'POST', body: JSON.stringify(input),
});
