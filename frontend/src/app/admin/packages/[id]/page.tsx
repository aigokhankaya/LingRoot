'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import PromotionSection from './PromotionSection';

interface PlanFeatures {
  homepage_features?: {
    text_input?: boolean;
    youtube?: boolean;
    file_upload?: boolean;
    podcast?: boolean;
    topic_suggestions?: boolean;
    topic_tree?: boolean;
    topic?: boolean;
    book?: boolean;
    document?: boolean;
    subject?: boolean;
    weblink?: boolean;
    sectors?: boolean;
    custom?: boolean;
    liro?: boolean;
    daily_usage_patterns?: boolean;
  };
  voice_categories?: {
    standard?: boolean;
    wavenet?: boolean;
    neural2?: boolean;
    studio?: boolean;
    chirp3d?: boolean;
    amazon_standard?: boolean;
    amazon_neural?: boolean;
    amazon_generative?: boolean;
  };
  sentence_patterns?: {
    enabled?: boolean;
    max_patterns?: number;
  };
}

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: string;
  is_active: boolean;
  is_trial: boolean;
  trial_days?: number;
  features: string[];
  plan_features?: PlanFeatures;
  apple_product_id?: string;
  google_product_id?: string;
  monthly_cost_limit_usd?: number;
  openai_token_limit?: number;
  tts_char_limit?: number;
  promotion_active?: boolean;
  promotion_discount_percentage?: number;
  promotion_original_price?: number;
  promotion_price?: number;
  promotion_start_date?: string;
  promotion_end_date?: string;
  promotion_badge_text?: string;
  promotion_description?: string;
  created_at: string;
  updated_at: string;
}

const defaultPlanFeatures: PlanFeatures = {
  homepage_features: {
    text_input: true,
    youtube: true,
    file_upload: true,
    podcast: true,
    topic_suggestions: true,
    topic_tree: true,
    topic: true,
    book: true,
    document: true,
    subject: true,
    weblink: true,
    sectors: true,
    custom: true,
    liro: true,
    daily_usage_patterns: true,
  },
  voice_categories: {
    standard: true,
    wavenet: false,
    neural2: false,
    studio: false,
    chirp3d: false,
    amazon_standard: false,
    amazon_neural: false,
    amazon_generative: false,
  },
  sentence_patterns: {
    enabled: false,
    max_patterns: 0,
  },
};

function mergePlanFeatures(features?: PlanFeatures | null): PlanFeatures {
  return {
    homepage_features: {
      ...defaultPlanFeatures.homepage_features,
      ...(features?.homepage_features || {}),
    },
    voice_categories: {
      ...defaultPlanFeatures.voice_categories,
      ...(features?.voice_categories || {}),
    },
    sentence_patterns: {
      ...defaultPlanFeatures.sentence_patterns,
      ...(features?.sentence_patterns || {}),
    },
  };
}

export default function PackageDetailPage() {
  const router = useRouter();
  const params = useParams();
  const planId = params?.id as string;

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    interval: 'monthly',
    is_active: true,
    is_trial: false,
    trial_days: 7,
    apple_product_id: '',
    google_product_id: '',
    monthly_cost_limit_usd: '',
    openai_token_limit: '',
    tts_char_limit: '',
    features: [] as string[],
    promotion_active: false,
    promotion_discount_percentage: '',
    promotion_original_price: '',
    promotion_price: '',
    promotion_start_date: '',
    promotion_end_date: '',
    promotion_badge_text: '',
    promotion_description: '',
  });

  const [planFeatures, setPlanFeatures] = useState<PlanFeatures>(defaultPlanFeatures);

  useEffect(() => {
    if (planId && planId !== 'new') {
      fetchPlan();
    } else {
      setLoading(false);
    }
  }, [planId]);

  const fetchPlan = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('lingroot_token');
      const response = await fetch(`/api/admin/plans/${planId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (response.ok && data.success) {
        const planData = data.data;
        setPlan(planData);

        // Populate form
        setFormData({
          name: planData.name || '',
          description: planData.description || '',
          price: planData.price?.toString() || '',
          interval: planData.interval || 'monthly',
          is_active: planData.is_active ?? true,
          is_trial: planData.is_trial ?? false,
          trial_days: planData.trial_days || 7,
          apple_product_id: planData.apple_product_id || '',
          google_product_id: planData.google_product_id || '',
          monthly_cost_limit_usd: planData.monthly_cost_limit_usd?.toString() || '',
          openai_token_limit: planData.openai_token_limit?.toString() || '',
          tts_char_limit: planData.tts_char_limit?.toString() || '',
          features: planData.features || [],
          promotion_active: planData.promotion_active ?? false,
          promotion_discount_percentage: planData.promotion_discount_percentage?.toString() || '',
          promotion_original_price: planData.promotion_original_price?.toString() || '',
          promotion_price: planData.promotion_price?.toString() || '',
          promotion_start_date: planData.promotion_start_date ? planData.promotion_start_date.split('T')[0] : '',
          promotion_end_date: planData.promotion_end_date ? planData.promotion_end_date.split('T')[0] : '',
          promotion_badge_text: planData.promotion_badge_text || '',
          promotion_description: planData.promotion_description || '',
        });

        // Populate plan features
        setPlanFeatures(mergePlanFeatures(planData.plan_features));
      } else {
        setError(data.message || 'Paket yüklenemedi');
      }
    } catch (e: any) {
      setError(e.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const token = localStorage.getItem('lingroot_token');
      const url = planId === 'new' ? '/api/admin/plans' : `/api/admin/plans/${planId}`;
      const method = planId === 'new' ? 'POST' : 'PUT';

      const payload = {
        ...formData,
        price: formData.price ? Number(formData.price) : 0,
        trial_days: formData.trial_days ? Number(formData.trial_days) : 7,
        monthly_cost_limit_usd: formData.monthly_cost_limit_usd ? Number(formData.monthly_cost_limit_usd) : null,
        openai_token_limit: formData.openai_token_limit ? Number(formData.openai_token_limit) : null,
        tts_char_limit: formData.tts_char_limit ? Number(formData.tts_char_limit) : null,
        plan_features: planFeatures,
        promotion_active: formData.promotion_active,
        promotion_discount_percentage: formData.promotion_discount_percentage ? Number(formData.promotion_discount_percentage) : null,
        promotion_original_price: formData.promotion_original_price ? Number(formData.promotion_original_price) : null,
        promotion_price: formData.promotion_price ? Number(formData.promotion_price) : null,
        promotion_start_date: formData.promotion_start_date || null,
        promotion_end_date: formData.promotion_end_date || null,
        promotion_badge_text: formData.promotion_badge_text || null,
        promotion_description: formData.promotion_description || null,
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMessage('Paket başarıyla kaydedildi!');
        if (planId === 'new') {
          router.push(`/admin/packages/${data.data.id}`);
        } else {
          fetchPlan();
        }
      } else {
        setError(data.message || 'Paket kaydedilemedi');
      }
    } catch (e: any) {
      setError(e.message || 'Bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleHomepageFeatureChange = (feature: string, checked: boolean) => {
    setPlanFeatures(prev => ({
      ...prev,
      homepage_features: {
        ...(prev?.homepage_features || {}),
        [feature]: checked
      }
    }));
  };

  const handleVoiceCategoryChange = (category: string, checked: boolean) => {
    setPlanFeatures(prev => ({
      ...prev,
      voice_categories: {
        ...(prev?.voice_categories || {}),
        [category]: checked
      }
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <Button
              variant="ghost"
              onClick={() => router.push('/admin/packages')}
              className="mb-2"
            >
              <i className="fas fa-arrow-left mr-2"></i>
              Paketlere Dön
            </Button>
            <h1 className="text-3xl font-bold text-gray-800">
              {planId === 'new' ? 'Yeni Paket Oluştur' : 'Paket Detayları'}
            </h1>
            {plan && (
              <p className="text-gray-600 mt-2">
                Oluşturulma: {new Date(plan.created_at).toLocaleDateString('tr-TR')}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/admin/packages')}
            >
              İptal
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {saving ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <i className="fas fa-save mr-2"></i>
                  Kaydet
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
            {successMessage}
          </div>
        )}

        <div className="space-y-6">
          {/* Temel Bilgiler */}
          <Card>
            <CardHeader>
              <CardTitle>Temel Paket Bilgileri</CardTitle>
              <CardDescription>Paketin genel bilgilerini düzenleyin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Paket Adı *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Örn: Gold, Platinum"
                  />
                </div>
                <div>
                  <Label htmlFor="price">Fiyat (₺) *</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Açıklama</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Paket açıklaması..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="interval">Süre</Label>
                  <select
                    id="interval"
                    value={formData.interval}
                    onChange={(e) => setFormData({ ...formData, interval: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="monthly">Aylık</option>
                    <option value="yearly">Yıllık</option>
                  </select>
                </div>
                <div className="flex items-center space-x-4 pt-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    <Label htmlFor="is_active">Aktif</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_trial"
                      checked={formData.is_trial}
                      onChange={(e) => setFormData({ ...formData, is_trial: e.target.checked })}
                    />
                    <Label htmlFor="is_trial">Deneme Paketi</Label>
                  </div>
                </div>
              </div>

              {formData.is_trial && (
                <div>
                  <Label htmlFor="trial_days">Deneme Süresi (Gün)</Label>
                  <Input
                    id="trial_days"
                    type="number"
                    value={formData.trial_days}
                    onChange={(e) => setFormData({ ...formData, trial_days: Number(e.target.value) })}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Anasayfa Özellikleri */}
          <Card>
            <CardHeader>
              <CardTitle>Anasayfa Özellikleri</CardTitle>
              <CardDescription>
                Mobil ve web anasayfasında hangi giriş kartlarının görüneceğini belirleyin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="text_input"
                    checked={planFeatures.homepage_features?.text_input ?? true}
                    onChange={(e) => handleHomepageFeatureChange('text_input', e.target.checked)}
                  />
                  <Label htmlFor="text_input" className="cursor-pointer">
                    <i className="fas fa-keyboard mr-2 text-indigo-600"></i>
                    Metin Girişi
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="youtube"
                    checked={planFeatures.homepage_features?.youtube ?? false}
                    onChange={(e) => handleHomepageFeatureChange('youtube', e.target.checked)}
                  />
                  <Label htmlFor="youtube" className="cursor-pointer">
                    <i className="fab fa-youtube mr-2 text-red-600"></i>
                    YouTube URL
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="file_upload"
                    checked={planFeatures.homepage_features?.file_upload ?? false}
                    onChange={(e) => handleHomepageFeatureChange('file_upload', e.target.checked)}
                  />
                  <Label htmlFor="file_upload" className="cursor-pointer">
                    <i className="fas fa-file-upload mr-2 text-green-600"></i>
                    Dosya Yükleme
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="podcast"
                    checked={planFeatures.homepage_features?.podcast ?? false}
                    onChange={(e) => handleHomepageFeatureChange('podcast', e.target.checked)}
                  />
                  <Label htmlFor="podcast" className="cursor-pointer">
                    <i className="fas fa-podcast mr-2 text-purple-600"></i>
                    Podcast
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="topic_suggestions"
                    checked={planFeatures.homepage_features?.topic_suggestions ?? true}
                    onChange={(e) => handleHomepageFeatureChange('topic_suggestions', e.target.checked)}
                  />
                  <Label htmlFor="topic_suggestions" className="cursor-pointer">
                    <i className="fas fa-lightbulb mr-2 text-yellow-600"></i>
                    Konu Önerileri
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="topic_tree"
                    checked={planFeatures.homepage_features?.topic_tree ?? true}
                    onChange={(e) => handleHomepageFeatureChange('topic_tree', e.target.checked)}
                  />
                  <Label htmlFor="topic_tree" className="cursor-pointer">
                    <i className="fas fa-sitemap mr-2 text-green-600"></i>
                    Konu Ağacı
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="topic"
                    checked={planFeatures.homepage_features?.topic ?? true}
                    onChange={(e) => handleHomepageFeatureChange('topic', e.target.checked)}
                  />
                  <Label htmlFor="topic" className="cursor-pointer">
                    <i className="fas fa-heart mr-2 text-pink-600"></i>
                    Hobiler
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="book"
                    checked={planFeatures.homepage_features?.book ?? false}
                    onChange={(e) => handleHomepageFeatureChange('book', e.target.checked)}
                  />
                  <Label htmlFor="book" className="cursor-pointer">
                    <i className="fas fa-book mr-2 text-primary"></i>
                    Kitap
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="document"
                    checked={planFeatures.homepage_features?.document ?? true}
                    onChange={(e) => handleHomepageFeatureChange('document', e.target.checked)}
                  />
                  <Label htmlFor="document" className="cursor-pointer">
                    <i className="fas fa-file-lines mr-2 text-sky-600"></i>
                    Doküman
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="subject"
                    checked={planFeatures.homepage_features?.subject ?? true}
                    onChange={(e) => handleHomepageFeatureChange('subject', e.target.checked)}
                  />
                  <Label htmlFor="subject" className="cursor-pointer">
                    <i className="fas fa-graduation-cap mr-2 text-emerald-600"></i>
                    Subject
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="weblink"
                    checked={planFeatures.homepage_features?.weblink ?? true}
                    onChange={(e) => handleHomepageFeatureChange('weblink', e.target.checked)}
                  />
                  <Label htmlFor="weblink" className="cursor-pointer">
                    <i className="fas fa-briefcase mr-2 text-amber-600"></i>
                    Web Link / Sektörler
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sectors"
                    checked={planFeatures.homepage_features?.sectors ?? true}
                    onChange={(e) => handleHomepageFeatureChange('sectors', e.target.checked)}
                  />
                  <Label htmlFor="sectors" className="cursor-pointer">
                    <i className="fas fa-briefcase mr-2 text-cyan-600"></i>
                    Sektör İngilizcesi
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="custom"
                    checked={planFeatures.homepage_features?.custom ?? true}
                    onChange={(e) => handleHomepageFeatureChange('custom', e.target.checked)}
                  />
                  <Label htmlFor="custom" className="cursor-pointer">
                    <i className="fas fa-plus mr-2 text-violet-600"></i>
                    Custom
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="daily_usage_patterns"
                    checked={planFeatures.homepage_features?.daily_usage_patterns ?? true}
                    onChange={(e) => handleHomepageFeatureChange('daily_usage_patterns', e.target.checked)}
                  />
                  <Label htmlFor="daily_usage_patterns" className="cursor-pointer">
                    <i className="fas fa-magic mr-2 text-yellow-500"></i>
                    Günlük Kullanım Kalıpları
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="liro"
                    checked={planFeatures.homepage_features?.liro ?? false}
                    onChange={(e) => handleHomepageFeatureChange('liro', e.target.checked)}
                  />
                  <Label htmlFor="liro" className="cursor-pointer">
                    <i className="fas fa-robot mr-2 text-indigo-500"></i>
                    LIRO (AI Asistan)
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ses Kategorileri */}
          <Card>
            <CardHeader>
              <CardTitle>Ses Kategorileri</CardTitle>
              <CardDescription>
                Create ekranında hangi ses kategorilerinin gösterileceğini belirleyin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">Google Ses Modelleri</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="standard"
                        checked={planFeatures.voice_categories?.standard ?? true}
                        onChange={(e) => handleVoiceCategoryChange('standard', e.target.checked)}
                      />
                      <Label htmlFor="standard" className="cursor-pointer">
                        <i className="fas fa-volume-up mr-2 text-gray-600"></i>
                        Standard
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="wavenet"
                        checked={planFeatures.voice_categories?.wavenet ?? false}
                        onChange={(e) => handleVoiceCategoryChange('wavenet', e.target.checked)}
                      />
                      <Label htmlFor="wavenet" className="cursor-pointer">
                        <i className="fas fa-star mr-2 text-yellow-600"></i>
                        WaveNet
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="neural2"
                        checked={planFeatures.voice_categories?.neural2 ?? false}
                        onChange={(e) => handleVoiceCategoryChange('neural2', e.target.checked)}
                      />
                      <Label htmlFor="neural2" className="cursor-pointer">
                        <i className="fas fa-brain mr-2 text-purple-600"></i>
                        Neural2
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="studio"
                        checked={planFeatures.voice_categories?.studio ?? false}
                        onChange={(e) => handleVoiceCategoryChange('studio', e.target.checked)}
                      />
                      <Label htmlFor="studio" className="cursor-pointer">
                        <i className="fas fa-gem mr-2 text-primary"></i>
                        Studio
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="chirp3d"
                        checked={planFeatures.voice_categories?.chirp3d ?? false}
                        onChange={(e) => handleVoiceCategoryChange('chirp3d', e.target.checked)}
                      />
                      <Label htmlFor="chirp3d" className="cursor-pointer">
                        <i className="fas fa-diamond mr-2 text-orange-600"></i>
                        Chirp3D
                      </Label>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">Amazon Ses Modelleri</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="amazon_standard"
                        checked={planFeatures.voice_categories?.amazon_standard ?? false}
                        onChange={(e) => handleVoiceCategoryChange('amazon_standard', e.target.checked)}
                      />
                      <Label htmlFor="amazon_standard" className="cursor-pointer">
                        <i className="fas fa-volume-down mr-2 text-blue-600"></i>
                        Standard
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="amazon_neural"
                        checked={planFeatures.voice_categories?.amazon_neural ?? false}
                        onChange={(e) => handleVoiceCategoryChange('amazon_neural', e.target.checked)}
                      />
                      <Label htmlFor="amazon_neural" className="cursor-pointer">
                        <i className="fas fa-microchip mr-2 text-indigo-600"></i>
                        Neural
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="amazon_generative"
                        checked={planFeatures.voice_categories?.amazon_generative ?? false}
                        onChange={(e) => handleVoiceCategoryChange('amazon_generative', e.target.checked)}
                      />
                      <Label htmlFor="amazon_generative" className="cursor-pointer">
                        <i className="fas fa-wand-magic-sparkles mr-2 text-purple-500"></i>
                        Generative
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cümle Kalıpları (Gelecek Özellik) */}
          <Card className="opacity-60">
            <CardHeader>
              <CardTitle className="flex items-center">
                Cümle Kalıpları
                <Badge className="ml-2 bg-gray-200 text-gray-600">Yakında</Badge>
              </CardTitle>
              <CardDescription>
                Bu özellik henüz geliştirilmemiştir
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Switch
                  id="sentence_patterns_enabled"
                  checked={false}
                  disabled
                />
                <Label htmlFor="sentence_patterns_enabled" className="text-gray-400">
                  Cümle Kalıpları Özelliği Aktif
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Kullanım Limitleri */}
          <Card>
            <CardHeader>
              <CardTitle>Kullanım Limitleri</CardTitle>
              <CardDescription>
                Paketin kullanım limitlerini belirleyin (opsiyonel)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="monthly_cost_limit_usd">Aylık Maliyet Limiti (USD)</Label>
                  <Input
                    id="monthly_cost_limit_usd"
                    type="number"
                    step="0.01"
                    value={formData.monthly_cost_limit_usd}
                    onChange={(e) => setFormData({ ...formData, monthly_cost_limit_usd: e.target.value })}
                    placeholder="Örn: 10.00"
                  />
                </div>
                <div>
                  <Label htmlFor="openai_token_limit">OpenAI Token Limiti</Label>
                  <Input
                    id="openai_token_limit"
                    type="number"
                    value={formData.openai_token_limit}
                    onChange={(e) => setFormData({ ...formData, openai_token_limit: e.target.value })}
                    placeholder="Örn: 100000"
                  />
                </div>
                <div>
                  <Label htmlFor="tts_char_limit">TTS Karakter Limiti</Label>
                  <Input
                    id="tts_char_limit"
                    type="number"
                    value={formData.tts_char_limit}
                    onChange={(e) => setFormData({ ...formData, tts_char_limit: e.target.value })}
                    placeholder="Örn: 50000"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Promosyon Ayarları */}
          <PromotionSection
            data={{
              promotion_active: formData.promotion_active,
              promotion_discount_percentage: formData.promotion_discount_percentage,
              promotion_original_price: formData.promotion_original_price,
              promotion_price: formData.promotion_price,
              promotion_start_date: formData.promotion_start_date,
              promotion_end_date: formData.promotion_end_date,
              promotion_badge_text: formData.promotion_badge_text,
              promotion_description: formData.promotion_description,
            }}
            onChange={(promoData) => setFormData(prev => ({ ...prev, ...promoData }))}
          />

          {/* Uygulama Mağazası Entegrasyonları */}
          <Card>
            <CardHeader>
              <CardTitle>Uygulama Mağazası Entegrasyonları</CardTitle>
              <CardDescription>
                Apple App Store ve Google Play Store product ID&apos;leri
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="apple_product_id">Apple Product ID</Label>
                  <Input
                    id="apple_product_id"
                    value={formData.apple_product_id}
                    onChange={(e) => setFormData({ ...formData, apple_product_id: e.target.value })}
                    placeholder="com.lingroot.premium.monthly"
                  />
                </div>
                <div>
                  <Label htmlFor="google_product_id">Google Product ID</Label>
                  <Input
                    id="google_product_id"
                    value={formData.google_product_id}
                    onChange={(e) => setFormData({ ...formData, google_product_id: e.target.value })}
                    placeholder="com.nsyzk.lingrootmobile.gold.monthly"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Actions */}
        <div className="flex justify-end gap-2 mt-6 pb-8">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/packages')}
          >
            İptal
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {saving ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Kaydediliyor...
              </>
            ) : (
              <>
                <i className="fas fa-save mr-2"></i>
                Kaydet
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
