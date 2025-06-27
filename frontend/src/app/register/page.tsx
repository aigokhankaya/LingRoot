'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";

export default function RegisterPage() {
  const router = useRouter();
  const { register, loginWithGoogle } = useAuth();
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, acceptTerms: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate form data
    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
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

    setLoading(true);

    try {
      // Backend'e kayıt isteği gönder
      const result = await register(formData.username, '', formData.email, '', formData.password);
      if (result.success) {
        // Başarılı kayıt sonrası dashboard'a yönlendir
        router.push('/dashboard');
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
    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 Google ile kayıt/giriş işlemi başlatılıyor...');
      
      // Google Auth modülünü dinamik olarak import et
      console.log('📦 Google Auth modülü yükleniyor...');
      const { initializeGoogleAuth, signInWithGoogle } = await import('../../lib/googleAuth');
      
      // Google Auth'u başlat
      console.log('🔧 Google Auth başlatılıyor...');
      await initializeGoogleAuth();
      
      // Google Sign-In'i tetikle
      console.log('🎯 Google Sign-In tetikleniyor...');
      const { credential } = await signInWithGoogle();
      
      // useAuth hook'undan loginWithGoogle fonksiyonunu kullan
      console.log('🔐 Backend ile kimlik doğrulama yapılıyor...');
      const result = await loginWithGoogle(credential);
      
      if (result.success) {
        // Başarılı giriş sonrası dashboard'a yönlendir
        console.log('✅ Google ile giriş başarılı, dashboard\'a yönlendiriliyor...');
        router.push('/dashboard');
      } else {
        console.error('❌ Backend kimlik doğrulama hatası:', result.message);
        setError(result.message || 'Google ile giriş yaparken bir hata oluştu.');
      }
    } catch (err: any) {
      console.error('❌ Google kayıt hatası:', err);
      
      // Kullanıcı dostu hata mesajları
      let userErrorMessage = 'Google ile kayıt olurken bir hata oluştu.';
      
      if (err.message.includes('popup') || err.message.includes('pencere')) {
        userErrorMessage = 'Google giriş penceresi açılamadı veya kapatıldı. Lütfen popup engelleyiciyi kontrol edin ve tekrar deneyin.';
      } else if (err.message.includes('cancelled') || err.message.includes('iptal')) {
        userErrorMessage = 'Google girişi iptal edildi.';
      } else if (err.message.includes('timeout') || err.message.includes('zaman aşımı')) {
        userErrorMessage = 'Google giriş zaman aşımına uğradı. Lütfen tekrar deneyin.';
      } else if (err.message.includes('yapılandırılmamış') || err.message.includes('Client ID')) {
        userErrorMessage = 'Google giriş servisi geçici olarak kullanılamıyor. Lütfen daha sonra tekrar deneyin.';
      } else if (err.message.includes('yüklenmedi') || err.message.includes('Services')) {
        userErrorMessage = 'Google servisleri yüklenemedi. İnternet bağlantınızı kontrol edin ve sayfayı yenileyin.';
      } else if (err.message.includes('Failed to fetch') || err.message.includes('bağlanılamadı')) {
        userErrorMessage = 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin ve tekrar deneyin.';
      }
      
      setError(userErrorMessage);
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm py-4 sticky top-0 z-50">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
                          <a href="/" className="flex items-center space-x-3">
                <img src="/logo.svg" alt="LingRoot Logo" className="w-10 h-10" />
                <span className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 bg-clip-text text-transparent tracking-tight">LingRoot</span>
              </a>
          </div>
          <div className="flex items-center space-x-4">
            <a href="/" className="text-gray-600 hover:text-blue-600 transition-colors duration-200 cursor-pointer">
              <i className="fas fa-arrow-left mr-2"></i> Ana Sayfaya Dön
            </a>
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
                <h1 className="text-3xl font-bold mb-2 text-gray-900"><span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 bg-clip-text text-transparent font-extrabold">LingRoot</span>'a Hoş Geldiniz</h1>
                <p className="text-gray-600 mb-8">Sevdiğiniz içeriklerle İngilizce öğrenme yolculuğunuza başlamak için hemen kaydolun.</p>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="username">Kullanıcı Adı</Label>
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      placeholder="kullaniciadi"
                      value={formData.username}
                      onChange={handleChange}
                      className="border-gray-300 focus:border-blue-500"
                      required
                    />
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
                      className="border-gray-300 focus:border-blue-500"
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
                      className="border-gray-300 focus:border-blue-500"
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
                      className="border-gray-300 focus:border-blue-500"
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
                    <Label htmlFor="terms" className="text-sm text-gray-600 font-normal leading-relaxed">
                      <span>LingRoot'un </span>
                      <a href="/terms" className="text-blue-600 hover:underline cursor-pointer">Kullanım Şartları</a>
                      <span> ve </span>
                      <a href="/privacy" className="text-blue-600 hover:underline cursor-pointer">Gizlilik Politikası</a>
                      <span>'nı okudum ve kabul ediyorum.</span>
                    </Label>
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 font-semibold text-base"
                    disabled={!formData.acceptTerms || loading}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Hesap Oluşturuluyor...
                      </div>
                    ) : (
                      'Ücretsiz Hesap Oluştur'
                    )}
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
                    className="w-full py-3 border-gray-300 hover:bg-gray-50 font-medium"
                    onClick={handleGoogleRegister}
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
                        Google ile bağlanılıyor...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <i className="fab fa-google mr-2 text-red-500"></i> 
                        Google ile Kaydol
                      </div>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full py-3 border-gray-300 hover:bg-gray-50 font-medium"
                    onClick={handleFacebookRegister}
                  >
                    <div className="flex items-center justify-center">
                      <i className="fab fa-facebook mr-2 text-blue-600"></i> 
                      Facebook ile Kaydol
                    </div>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full py-3 border-gray-300 hover:bg-gray-50 font-medium"
                    onClick={handleAppleRegister}
                  >
                    <div className="flex items-center justify-center">
                      <i className="fab fa-apple mr-2"></i> 
                      Apple ile Kaydol
                    </div>
                  </Button>
                </div>
                
                <div className="text-center text-gray-600 text-sm mt-8">
                  Zaten bir hesabınız var mı? {" "}
                  <a href="/login" className="text-blue-600 hover:text-blue-800 cursor-pointer">
                    Giriş Yap
                  </a>
                </div>
              </div>
            </div>

            {/* Benefits Column */}
            <div className="lg:w-5/12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-xl overflow-hidden relative">
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
                        <p className="text-blue-100">Sevdiğin içerikleri dinlerken İngilizce öğren. Ekstra zaman harcamana gerek yok.</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                        <i className="fas fa-sliders-h text-white"></i>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-2">Seviyene Uygun</h3>
                        <p className="text-blue-100">A1'den C2'ye kadar tüm seviyelerde içerikler. Kendi hızında ilerle ve gelişimini gör.</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                        <i className="fas fa-globe text-white"></i>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-2">Gerçek İçerikler</h3>
                        <p className="text-blue-100">YouTube, podcast, blog yazıları... Gerçek dünya içerikleriyle öğren, ders kitaplarını unut.</p>
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
                        <p className="text-white italic text-sm">"LingRoot ile sadece 3 ayda A1'den B1 seviyesine yükseldim. Artık sevdiğim YouTube kanallarını anlayabiliyorum!"</p>
                        <p className="text-blue-200 text-sm mt-2">- Zeynep K.</p>
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
              <div key={index} className="bg-blue-50 rounded-xl p-8 hover:shadow-md transition-shadow duration-300">
                <div className="w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mb-6">
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
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
                              <div className="flex items-center space-x-3 mb-6">
                  <img src="/logo.svg" alt="LingRoot Logo" className="w-12 h-12" />
                  <span className="text-2xl font-extrabold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-500 bg-clip-text text-transparent tracking-tight">LingRoot</span>
                </div>
              <p className="text-gray-400 mb-4">
                "Your routines turn into English."
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">
                  <i className="fab fa-facebook-f text-xl"></i>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">
                  <i className="fab fa-twitter text-xl"></i>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">
                  <i className="fab fa-instagram text-xl"></i>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">
                  <i className="fab fa-youtube text-xl"></i>
                </a>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">Hızlı Bağlantılar</h3>
              <ul className="space-y-2">
                <li><a href="/about" className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">Hakkımızda</a></li>
                <li><a href="/nasil-calisir" className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">Nasıl Çalışır?</a></li>
                <li><a href="/fiyatlandirma" className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">Fiyatlandırma</a></li>
                <li><a href="/blog" className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">Blog</a></li>
                <li><a href="/contact" className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">İletişim</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">Yasal</h3>
              <ul className="space-y-2">
                <li><a href="/privacy" className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">Gizlilik Politikası</a></li>
                <li><a href="/terms" className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">Kullanım Şartları</a></li>
                <li><a href="/cookies" className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">Çerez Politikası</a></li>
                <li><a href="/kvkk" className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">KVKK</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">Bize Ulaşın</h3>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <i className="fas fa-envelope mr-2 text-gray-400"></i>
                  <a href="mailto:info@lingroot.com" className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">info@lingroot.com</a>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-phone-alt mr-2 text-gray-400"></i>
                  <a href="tel:+902121234567" className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">+90 212 123 45 67</a>
                </li>
                <li className="flex items-start mt-4">
                  <i className="fas fa-map-marker-alt mr-2 mt-1 text-gray-400"></i>
                  <span className="text-gray-400">İstanbul, Türkiye</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm mb-4 md:mb-0">
              &copy; 2025 LingRoot. Tüm hakları saklıdır.
            </p>
            <div className="flex space-x-4">
              <i className="fab fa-cc-visa text-2xl text-gray-400"></i>
              <i className="fab fa-cc-mastercard text-2xl text-gray-400"></i>
              <i className="fab fa-cc-paypal text-2xl text-gray-400"></i>
              <i className="fab fa-apple-pay text-2xl text-gray-400"></i>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 