'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { initializeGoogleAuth, signInWithGoogle } from '../../lib/googleAuth';
import Footer from '@/components/Footer';
import { useTranslation } from '../../lib/i18n';

import Link from 'next/link';

// Phone helpers: Turkish format +90 555 123 45 67
function extractDigits(value: string): string {
  return (value || '').replace(/\D+/g, '');
}

function extractTRLocalDigits(value: string): string {
  const digits = extractDigits(value);
  // Remove country code if present
  let d = digits.startsWith('90') ? digits.slice(2) : digits;
  // Drop a single leading 0 (common when typing local TR numbers like 0 5xx ...)
  if (d.startsWith('0')) d = d.slice(1);
  // Limit to max 10 local digits
  d = d.slice(0, 10);
  return d;
}

function normalizeTRPhone(value: string): string {
  const local = extractTRLocalDigits(value);
  if (local.length !== 10) return `+90${local}`; // caller should validate length
  return `+90${local}`;
}

function formatTRPhone(value: string): string {
  const local = extractTRLocalDigits(value);
  let parts: string[] = [];
  if (local.length <= 3) {
    parts = [local];
  } else if (local.length <= 6) {
    parts = [local.slice(0, 3), local.slice(3)];
  } else if (local.length <= 8) {
    parts = [local.slice(0, 3), local.slice(3, 6), local.slice(6)];
  } else {
    parts = [local.slice(0, 3), local.slice(3, 6), local.slice(6, 8), local.slice(8, 10)];
  }
  const spaced = parts.filter(Boolean).join(' ').trim();
  // Always show +90 prefix while typing (unless empty)
  return spaced ? `+90 ${spaced}` : '';
}

export default function RegisterPage() {
  const router = useRouter();
  const { register, loginWithGoogle } = useAuth();
  const { currentLocale } = useTranslation();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'phoneNumber') {
      // format as "+90 555 123 45 67" while typing
      const formatted = formatTRPhone(value);
      setFormData(prev => ({ ...prev, phoneNumber: formatted }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, acceptTerms: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate form data
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phoneNumber || !formData.password || !formData.confirmPassword) {
      setError('Lütfen tüm alanları doldurun.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      return;
    }

    if (!formData.acceptTerms) {
      setError('Kullanım şartlarını kabul etmelisiniz.');
      return;
    }

    // phone validation: require 10 local digits for TR numbers
    const localDigits = extractTRLocalDigits(formData.phoneNumber);
    if (localDigits.length !== 10) {
      setError('Lütfen geçerli bir telefon numarası girin.');
      return;
    }

    setLoading(true);

    try {
      // Backend'e kayıt isteği gönder (normalize to +90XXXXXXXXXX)
      const normalizedPhone = normalizeTRPhone(formData.phoneNumber);
      const result = await register(formData.firstName, formData.lastName, formData.email, normalizedPhone, formData.password, currentLocale);
      if (result.success) {
        // Başarılı kayıt sonrası welcome (ses oluşturma) sayfasına yönlendir
        router.push('/welcome');
      } else {
        setError(result.message || 'Kayıt olurken bir hata oluştu.');
      }
    } catch (err: any) {
      setError(err.message || 'Beklenmeyen bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setLoading(true);
    setError(null);

    try {
      // Google Auth'u başlat
      console.log('🔄 Google Auth başlatılıyor...');
      await initializeGoogleAuth();

      // Google Sign-In'i tetikle
      console.log('🔄 Google Sign-In tetikleniyor...');
      const { credential } = await signInWithGoogle();
      console.log('✅ Google credential alındı');

      // Backend'e gönder (loginWithGoogle aynı zamanda kayıt da yapar)
      console.log('🔄 Backend\'e gönderiliyor...');
      const result = await loginWithGoogle(credential, false);

      if (result.success) {
        console.log('✅ Google ile kayıt/giriş başarılı');

        // Token'ın localStorage'a yazılması için kısa bir bekleme
        await new Promise(resolve => setTimeout(resolve, 100));

        // Welcome sayfasına yönlendir
        router.push('/welcome');
      } else {
        console.error('❌ Backend kayıt hatası:', result.message);
        setError(result.message || 'Google ile kayıt başarısız.');
      }
    } catch (err: any) {
      console.error('❌ Google register error:', err);
      setError(err.message || 'Google ile kayıt sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookRegister = () => {
    // Facebook OAuth implementasyonu
    console.log('Facebook ile kayıt ol');
  };

  const handleAppleRegister = () => {
    // Apple OAuth implementasyonu
    console.log('Apple ile kayıt ol');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-white shadow-sm py-4 sticky top-0 z-50">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Link href="/" className="flex items-center space-x-3">
              <img src="/lingroot-icon.svg" alt="LingRoot Logo" className="w-12 h-12" />
              <span className="text-2xl font-extrabold text-primary tracking-tight">LingRoot</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-gray-600 hover:text-primary transition-colors duration-200 cursor-pointer">
              <i className="fas fa-arrow-left mr-2"></i> Ana Sayfaya Dön
            </Link>
          </div>
        </div>
      </nav>

      {/* Registration Section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8 items-stretch">
            {/* Form Column */}
            <div className="lg:w-7/12 bg-white rounded-xl shadow-xl p-8 mx-auto">
              <div className="max-w-md mx-auto">
                <h1 className="text-3xl font-bold mb-2 text-gray-900">
                  <span className="text-primary font-extrabold">LingRoot</span>&apos;a Hoş Geldiniz
                </h1>
                <p className="text-gray-600 mb-8">Sevdiğiniz içeriklerle İngilizce öğrenme yolculuğunuza başlamak için hemen kaydolun.</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Ad</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        type="text"
                        placeholder="Adınız"
                        value={formData.firstName}
                        onChange={handleChange}
                        className="border-gray-300 focus:border-primary"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Soyad</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        type="text"
                        placeholder="Soyadınız"
                        value={formData.lastName}
                        onChange={handleChange}
                        className="border-gray-300 focus:border-primary"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">E-posta</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="ornek@email.com"
                      value={formData.email}
                      onChange={handleChange}
                      className="border-gray-300 focus:border-primary"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Telefon Numarası</Label>
                    <Input
                      id="phoneNumber"
                      name="phoneNumber"
                      type="tel"
                      placeholder="+90 555 123 45 67"
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      className="border-gray-300 focus:border-primary"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Şifre</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="En az 8 karakter"
                      value={formData.password}
                      onChange={handleChange}
                      className="border-gray-300 focus:border-primary"
                      required
                      minLength={8}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Şifre Tekrarı</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="Şifrenizi tekrar girin"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="border-gray-300 focus:border-primary"
                      required
                    />
                  </div>

                  <div className="flex items-start space-x-2 mt-6">
                    <Checkbox
                      id="terms"
                      checked={formData.acceptTerms}
                      onChange={(e) => handleCheckboxChange(e.target.checked)}
                      className="mt-1"
                    />
                    <Label htmlFor="terms" className="text-sm text-gray-600 font-normal">
                      <span>LingRoot&apos;un </span>
                      <Link href="/terms" className="text-primary hover:underline cursor-pointer">Kullanım Şartları</Link>
                      <span> ve </span>
                      <a href="https://www.lingroot.com/privacy-policy" className="text-primary hover:underline cursor-pointer">Gizlilik Politikası</a>
                      <span>&apos;nı okudum ve kabul ediyorum.</span>
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    className="w-full py-6 !rounded-button whitespace-nowrap cursor-pointer"
                    disabled={!formData.acceptTerms || loading}
                  >
                    {loading ? 'Hesap Oluşturuluyor...' : 'Ücretsiz Hesap Oluştur'}
                  </Button>
                </form>

                <div className="relative my-8">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-gray-500 text-sm">
                    veya
                  </span>
                </div>

                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full py-6 border-gray-300 hover:bg-gray-50"
                    onClick={handleGoogleRegister}
                  >
                    <i className="fab fa-google mr-2 text-red-500"></i> Google ile Kaydol
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full py-6 border-gray-300 hover:bg-gray-50"
                    onClick={handleAppleRegister}
                  >
                    <i className="fab fa-apple mr-2"></i> Apple ile Kaydol
                  </Button>
                </div>

                <div className="text-center text-gray-600 text-sm mt-8">
                  Zaten bir hesabınız var mı? {" "}
                  <Link href="/login" className="text-primary hover:text-primary/80 cursor-pointer">
                    Giriş Yap
                  </Link>
                </div>
              </div>
            </div>

            {/* Benefits Column */}
            <div className="lg:w-5/12 bg-slate-900 rounded-xl shadow-xl overflow-hidden relative">
              <div className="absolute inset-0 opacity-10">
                <img
                  src="https://readdy.ai/api/search-image?query=A%2520person%2520with%2520headphones%2520relaxing%2520and%2520learning%2520English%2520through%2520listening%2520to%2520content%2520on%2520a%2520device.%2520The%2520scene%2520has%2520floating%2520language%2520elements%2520and%2520educational%2520symbols%2520around%2520them%252C%2520showing%2520effortless%2520language%2520acquisition.%2520The%2520background%2520is%2520a%2520soft%2520blue%2520gradient%2520with%2520abstract%2520patterns%2520suggesting%2520knowledge%2520and%2520growth.&width=600&height=1024&seq=benefits-bg&orientation=portrait"
                  alt="Learning illustration"
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <div className="relative p-10 h-full flex flex-col justify-center items-center text-center z-10">
                <div className="max-w-lg mx-auto space-y-12">
                  <h2 className="text-3xl font-bold text-white mb-6">Neden LingRoot?</h2>
                  <div className="space-y-8">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                        <i className="fas fa-headphones text-white"></i>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-2">Dinleyerek Öğren</h3>
                        <p className="text-white/80">Sevdiğin içerikleri dinlerken İngilizce öğren. Ekstra zaman harcamana gerek yok.</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                        <i className="fas fa-sliders-h text-white"></i>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-2">Seviyene Uygun</h3>
                        <p className="text-white/80">A1&apos;den C2&apos;ye kadar tüm seviyelerde içerikler. Kendi hızında ilerle ve gelişimini gör.</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                        <i className="fas fa-globe text-white"></i>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-2">Gerçek İçerikler</h3>
                        <p className="text-white/80">YouTube, podcast, blog yazıları... Gerçek dünya içerikleriyle öğren, ders kitaplarını unut.</p>
                      </div>
                    </div>
                  </div>
                </div>
                <Card className="bg-white/10 backdrop-blur-sm border-none mt-12 max-w-lg mx-auto w-full">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-center space-x-4">
                      <img
                        src="https://readdy.ai/api/search-image?query=Professional%2520headshot%2520of%2520a%2520young%2520Turkish%2520woman%2520in%2520her%2520mid%252020s%2520with%2520long%2520dark%2520hair%2520and%2520a%2520warm%2520smile.%2520The%2520photo%2520has%2520a%2520clean%252C%2520neutral%2520background%2520and%2520professional%2520lighting%252C%2520suitable%2520for%2520a%2520testimonial.&width=60&height=60&seq=testimonial-user&orientation=squarish"
                        alt="User"
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-white italic text-sm">&quot;LingRoot ile sadece 3 ayda A1&apos;den B1 seviyesine yükseldim. Artık sevdiğim YouTube kanallarını anlayabiliyorum!&quot;</p>
                        <p className="text-white/70 text-sm mt-2">- Zeynep K.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-gray-900">Kaydolduğunuzda Sizi Neler Bekliyor?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              LingRoot ile İngilizce öğrenmek hiç olmadığı kadar kolay ve eğlenceli.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: "fas fa-bolt",
                title: "Anında Erişim",
                description: "Kaydolduktan hemen sonra tüm özelliklere erişim sağlayın ve öğrenmeye başlayın."
              },
              {
                icon: "fas fa-infinity",
                title: "Sınırsız İçerik",
                description: "İstediğiniz kadar içeriği kendi seviyenize uygun hale getirin ve dinleyin."
              },
              {
                icon: "fas fa-chart-line",
                title: "İlerleme Takibi",
                description: "Gelişiminizi görün, öğrendiğiniz kelimeleri takip edin ve seviyenizi yükseltin."
              }
            ].map((feature, index) => (
              <div key={index} className="bg-muted rounded-xl p-8 hover:shadow-md transition-shadow duration-300">
                <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mb-6">
                  <i className={`${feature.icon} text-white text-xl`}></i>
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-gray-900">Sık Sorulan Sorular</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              LingRoot hakkında merak ettiğiniz soruların cevapları.
            </p>
          </div>
          <div className="max-w-3xl mx-auto">
            {[
              {
                question: "LingRoot tamamen ücretsiz mi?",
                answer: "LingRoot'un temel özellikleri ücretsizdir. Premium özelliklere erişim için aylık veya yıllık abonelik planlarımız bulunmaktadır."
              },
              {
                question: "Hangi içerikleri LingRoot ile öğrenebilirim?",
                answer: "YouTube videoları, podcast'ler, blog yazıları, haber makaleleri ve daha fazlasını LingRoot ile kendi seviyenize uygun hale getirebilirsiniz."
              },
              {
                question: "İngilizce seviyemi nasıl belirleyebilirim?",
                answer: "LingRoot'a kaydolduktan sonra ücretsiz seviye tespit sınavımızı alabilir veya kendiniz bir seviye seçebilirsiniz. İçerikleri dinlerken de seviyenizi istediğiniz zaman değiştirebilirsiniz."
              },
              {
                question: "LingRoot'u nasıl kullanabilirim?",
                answer: "Web sitemiz veya mobil uygulamamız üzerinden LingRoot'a erişebilir, içerik ekleyebilir ve dinleyebilirsiniz. Ayrıca tarayıcı eklentimiz ile web'de gezinirken de içerikleri anında seviyenize uygun hale getirebilirsiniz."
              }
            ].map((faq, index) => (
              <div key={index} className="mb-6 border-b border-gray-200 pb-6 last:border-0">
                <h3 className="text-xl font-bold mb-3">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
} 