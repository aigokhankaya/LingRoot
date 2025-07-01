'use client';

import React, { useState } from "react";
import { Button } from "../src/components/ui/button";
import { Input } from "../src/components/ui/input";
import { Textarea } from "../src/components/ui/textarea";
import { Switch } from "../src/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "../src/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../src/components/ui/card";
import { Badge } from "../src/components/ui/badge";
import { Separator } from "../src/components/ui/separator";
import { ScrollArea } from "../src/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "../src/components/ui/radio-group";
import { Label } from "../src/components/ui/label";
import { Alert, AlertDescription } from "../src/components/ui/alert";
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getUserProfile, updateUserProfile, uploadProfilePhoto, changePassword, UserProfile } from '../src/lib/api';

const Settings: React.FC = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("profil");
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: false,
    smsNotifications: true,
    marketingEmails: false,
    securityAlerts: true,
    weeklyReports: true
  });
  const [privacy, setPrivacy] = useState({
    profileVisibility: "public",
    dataSharing: false,
    analyticsTracking: true
  });

  const handleProfileClick = () => {
    setIsProfileMenuOpen(!isProfileMenuOpen);
  };

  // Profil Bilgileri Fonksiyonları
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUploadPhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          setIsSaving(true);
          console.log('Profil fotoğrafı yükleniyor:', file.name);
          const result = await uploadProfilePhoto(file);
          setUserProfile(result.user);
          setShowSuccessAlert(true);
          setTimeout(() => setShowSuccessAlert(false), 3000);
        } catch (error) {
          console.error('Profil fotoğrafı yükleme hatası:', error);
          alert('Profil fotoğrafı yüklenirken bir hata oluştu.');
        } finally {
          setIsSaving(false);
        }
      }
    };
    input.click();
  };

  const handleRemovePhoto = () => {
    console.log('Profil fotoğrafı kaldırılıyor');
    setShowSuccessAlert(true);
    setTimeout(() => setShowSuccessAlert(false), 3000);
  };

  const handleChangePassword = async () => {
    if (formData.newPassword !== formData.confirmPassword) {
      alert('Yeni şifreler eşleşmiyor!');
      return;
    }
    
    if (!formData.currentPassword || !formData.newPassword) {
      alert('Mevcut şifre ve yeni şifre alanları zorunludur!');
      return;
    }

    try {
      setIsSaving(true);
      await changePassword(formData.currentPassword, formData.newPassword);
      setFormData(prev => ({ ...prev, currentPassword: "", newPassword: "", confirmPassword: "" }));
      setShowSuccessAlert(true);
      setTimeout(() => setShowSuccessAlert(false), 3000);
    } catch (error: any) {
      console.error('Şifre değiştirme hatası:', error);
      alert(error.message || 'Şifre değiştirirken bir hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  // Bildirim Tercihleri Fonksiyonları
  const handleNotificationChange = (key: string, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }));
  };

  const handleTestNotification = () => {
    console.log('Test bildirimi gönderiliyor');
    alert('Test bildirimi gönderildi! E-posta kutunuzu kontrol edin.');
  };

  // Gizlilik Ayarları Fonksiyonları
  const handlePrivacyChange = (key: string, value: any) => {
    setPrivacy(prev => ({ ...prev, [key]: value }));
  };

  const handleClearBrowsingData = () => {
    if (confirm('Tarayıcı geçmişini temizlemek istediğinizden emin misiniz?')) {
      console.log('Tarayıcı geçmişi temizleniyor');
      setShowSuccessAlert(true);
      setTimeout(() => setShowSuccessAlert(false), 3000);
    }
  };

  const handleExportData = () => {
    console.log('Veriler dışa aktarılıyor');
    // Simüle edilmiş veri indirme
    const data = JSON.stringify({ profile: formData, settings: { notifications, privacy } }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Ödeme Bilgileri Fonksiyonları
  const handleAddPaymentMethod = () => {
    console.log('Yeni ödeme yöntemi ekleniyor');
    alert('Ödeme yöntemi ekleme sayfasına yönlendiriliyorsunuz...');
  };

  const handleEditPaymentMethod = () => {
    console.log('Ödeme yöntemi düzenleniyor');
    alert('Ödeme yöntemi düzenleme sayfasına yönlendiriliyorsunuz...');
  };

  const handleRemovePaymentMethod = () => {
    if (confirm('Bu ödeme yöntemini kaldırmak istediğinizden emin misiniz?')) {
      console.log('Ödeme yöntemi kaldırılıyor');
      setShowSuccessAlert(true);
      setTimeout(() => setShowSuccessAlert(false), 3000);
    }
  };

  const handleViewInvoices = () => {
    console.log('Faturalar görüntüleniyor');
    router.push('/invoices');
  };

  const handleDownloadInvoice = (invoiceId: string) => {
    console.log('Fatura indiriliyor:', invoiceId);
    alert(`Fatura ${invoiceId} indiriliyor...`);
  };

  // Abonelik Planı Fonksiyonları
  const handleUpgradePlan = () => {
    console.log('Plan yükseltiliyor');
    router.push('/pricing');
  };

  const handleChangePaymentMethod = () => {
    console.log('Ödeme yöntemi değiştiriliyor');
    alert('Ödeme yöntemi değiştirme sayfasına yönlendiriliyorsunuz...');
  };

  const handlePauseSubscription = () => {
    if (confirm('Aboneliğinizi duraklatmak istediğinizden emin misiniz?')) {
      console.log('Abonelik duraklatılıyor');
      setShowSuccessAlert(true);
      setTimeout(() => setShowSuccessAlert(false), 3000);
    }
  };

  const handleCancelSubscription = () => {
    if (confirm('Aboneliğinizi iptal etmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      console.log('Abonelik iptal ediliyor');
      setShowSuccessAlert(true);
      setTimeout(() => setShowSuccessAlert(false), 3000);
    }
  };

  // Hesap Yönetimi Fonksiyonları
  const handleFreezeAccount = () => {
    if (confirm('Hesabınızı dondurmak istediğinizden emin misiniz?')) {
      console.log('Hesap dondurulıyor');
      setShowSuccessAlert(true);
      setTimeout(() => setShowSuccessAlert(false), 3000);
    }
  };

  const handleDownloadData = () => {
    console.log('Kullanıcı verileri indiriliyor');
    setShowSuccessAlert(true);
    setTimeout(() => setShowSuccessAlert(false), 3000);
    // Simüle edilmiş veri indirme
    setTimeout(() => {
      const data = JSON.stringify({ userData: 'Tüm kullanıcı verileri burada...' }, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'user-data-export.json';
      a.click();
      URL.revokeObjectURL(url);
    }, 2000);
  };

  const handleDeleteAccount = () => {
    if (confirm('Hesabınızı kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem GERİ ALINAMAZ!')) {
      console.log('Hesap siliniyor');
      alert('Hesap silme işlemi başlatıldı. E-posta ile onay linki gönderilecek.');
    }
  };

  // Genel Fonksiyonlar
  const handleNotificationClick = () => {
    console.log('Bildirimler açılıyor');
    router.push('/notifications');
  };

  const handleHelpSupport = () => {
    console.log('Yardım ve destek açılıyor');
    router.push('/help');
  };

  const handleLogout = () => {
    if (confirm('Çıkış yapmak istediğinizden emin misiniz?')) {
      console.log('Kullanıcı çıkış yapıyor');
      router.push('/login');
    }
  };

  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (
      !target.closest("#profileDropdown") &&
      !target.closest("#profileButton")
    ) {
      setIsProfileMenuOpen(false);
    }
  };

  React.useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Load user profile data
  React.useEffect(() => {
    const loadUserProfile = async () => {
      try {
        setLoading(true);
        const profile = await getUserProfile();
        setUserProfile(profile);
        setFormData({
          firstName: profile.firstName || "",
          lastName: profile.lastName || "",
          email: profile.email || "",
          phone: profile.phone || "",
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
      } catch (error) {
        console.error('Error loading user profile:', error);
        // Fallback to default values if API fails
        setFormData({
          firstName: "Mehmet",
          lastName: "Kaya", 
          email: "mehmet@example.com",
          phone: "+90 (555) 123 4567",
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, []);

  const handleSaveChanges = async () => {
    try {
      setIsSaving(true);
      
      // Update profile information
      const profileUpdates = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone
      };
      
      const updatedProfile = await updateUserProfile(profileUpdates);
      setUserProfile(updatedProfile);
      
      setShowSuccessAlert(true);
      setTimeout(() => {
        setShowSuccessAlert(false);
      }, 3000);
    } catch (error: any) {
      console.error('Profil güncelleme hatası:', error);
      alert(error.message || 'Profil güncellenirken bir hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  const profileImageUrl = userProfile?.profilePhoto || 
    "https://readdy.ai/api/search-image?query=Professional%2520headshot%2520of%2520a%2520Turkish%2520man%2520in%2520his%252030s%2520with%2520short%2520dark%2520hair%2520and%2520a%2520friendly%2520smile%252C%2520business%2520casual%2520attire%252C%2520neutral%2520background%252C%2520high%2520quality%2520portrait&width=150&height=150&seq=profile1&orientation=squarish";

  const bannerImageUrl =
    "https://readdy.ai/api/search-image?query=Abstract%2520digital%2520user%2520interface%2520background%2520with%2520soft%2520blue%2520gradient%2520and%2520subtle%2520geometric%2520patterns%252C%2520modern%2520tech%2520aesthetic%252C%2520clean%2520minimal%2520design%252C%2520professional%2520account%2520settings%2520page%2520banner%252C%2520high%2520quality%2520web%2520header%2520image&width=1440&height=240&seq=banner1&orientation=landscape";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/welcome" className="flex items-center text-blue-600 hover:text-blue-700 cursor-pointer">
                <i className="fas fa-arrow-left mr-2"></i>
                <span className="font-medium">Geri Dön</span>
              </Link>
              <Button
                variant="ghost"
                className="!rounded-button whitespace-nowrap cursor-pointer"
                onClick={() => router.push('/')}
              >
                <i className="fas fa-home mr-2"></i>
                Ana Sayfa
              </Button>
              <Button
                variant="ghost"
                className="!rounded-button whitespace-nowrap cursor-pointer"
                onClick={() => router.push('/welcome')}
              >
                <i className="fas fa-user mr-2"></i>
                Kullanıcı Paneli
              </Button>
            </div>
            <div className="flex items-center space-x-4">
                              <Button
                variant="ghost"
                className="!rounded-button whitespace-nowrap cursor-pointer"
                onClick={handleNotificationClick}
              >
                <i className="fas fa-bell"></i>
              </Button>
              <div className="relative">
                <div
                  id="profileButton"
                  className="flex items-center space-x-3 cursor-pointer"
                  onClick={handleProfileClick}
                >
                  <img
                    src={profileImageUrl}
                    alt="Profile"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="text-sm">
                    <div className="font-medium">
                      {loading ? "Yükleniyor..." : `${formData.firstName} ${formData.lastName}`}
                    </div>
                    <div className="text-gray-500 text-xs">
                      {loading ? "Yükleniyor..." : formData.email}
                    </div>
                  </div>
                  <i
                    className={`fas fa-chevron-${isProfileMenuOpen ? "up" : "down"} ml-2 text-gray-500 transition-transform duration-200`}
                  ></i>
                </div>
                <div
                  id="profileDropdown"
                  className={`absolute right-0 w-48 mt-2 bg-white rounded-lg shadow-lg py-2 ${isProfileMenuOpen ? "block" : "hidden"} z-10`}
                >
                  <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                    <i className="fas fa-user-circle mr-2"></i>
                    Profil Bilgilerim
                  </Link>
                  <Link href="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                    <i className="fas fa-cog mr-2"></i>
                    Hesap Ayarları
                  </Link>
                  <Link href="/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                    <i className="fas fa-history mr-2"></i>
                    Okuma Geçmişim
                  </Link>
                  <a href="#" onClick={(e) => { e.preventDefault(); alert('Favoriler sayfası geliştirme aşamasında!'); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                    <i className="fas fa-heart mr-2"></i>
                    Favorilerim
                  </a>
                  <a href="#" onClick={(e) => { e.preventDefault(); alert('Dil ayarları geliştirme aşamasında!'); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                    <i className="fas fa-globe mr-2"></i>
                    Dil Ayarları
                  </a>
                  <a href="#" onClick={(e) => { e.preventDefault(); handleHelpSupport(); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                    <i className="fas fa-question-circle mr-2"></i>
                    Yardım ve Destek
                  </a>
                  <div className="border-t border-gray-100 mt-2 pt-2">
                    <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }} className="block px-4 py-2 text-sm text-red-600 hover:bg-gray-100 cursor-pointer">
                      <i className="fas fa-sign-out-alt mr-2"></i>
                      Çıkış Yap
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Banner */}
      <div className="relative w-full h-60 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${bannerImageUrl})` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/60 to-blue-700/40 flex items-center">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl">
              <h1 className="text-4xl font-bold text-white mb-2">
                Hesap Ayarları
              </h1>
              <p className="text-xl text-blue-100">
                Hesap bilgilerinizi görüntüleyin ve kişisel tercihlerinizi
                yönetin
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full md:w-64 shrink-0">
            <Card className="border-none shadow-md sticky top-4">
              <CardContent className="p-0">
                <div className="flex flex-col items-center p-6 border-b">
                  <div className="relative mb-4">
                    <img
                      src={profileImageUrl}
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute bottom-0 right-0 rounded-full bg-white shadow-sm w-8 h-8 !rounded-button cursor-pointer"
                    >
                      <i className="fas fa-camera text-gray-600 text-sm"></i>
                    </Button>
                  </div>
                  <h3 className="font-bold text-lg">Mehmet Kaya</h3>
                  <p className="text-gray-500 text-sm">mehmet@example.com</p>
                  <Badge className="mt-2 bg-blue-100 text-blue-800 hover:bg-blue-200">
                    Premium Üye
                  </Badge>
                </div>
                <ScrollArea className="h-[calc(100vh-350px)]">
                  <div className="p-4">
                    <nav className="space-y-1">
                      <Button
                        variant={activeTab === "profil" ? "default" : "ghost"}
                        className="w-full justify-start !rounded-button whitespace-nowrap cursor-pointer"
                        onClick={() => setActiveTab("profil")}
                      >
                        <i className="fas fa-user-circle mr-3"></i>
                        Profil Bilgileri
                      </Button>
                      <Button
                        variant={
                          activeTab === "bildirimler" ? "default" : "ghost"
                        }
                        className="w-full justify-start !rounded-button whitespace-nowrap cursor-pointer"
                        onClick={() => setActiveTab("bildirimler")}
                      >
                        <i className="fas fa-bell mr-3"></i>
                        Bildirim Tercihleri
                      </Button>
                      <Button
                        variant={activeTab === "gizlilik" ? "default" : "ghost"}
                        className="w-full justify-start !rounded-button whitespace-nowrap cursor-pointer"
                        onClick={() => setActiveTab("gizlilik")}
                      >
                        <i className="fas fa-shield-alt mr-3"></i>
                        Gizlilik Ayarları
                      </Button>
                      <Button
                        variant={activeTab === "odeme" ? "default" : "ghost"}
                        className="w-full justify-start !rounded-button whitespace-nowrap cursor-pointer"
                        onClick={() => setActiveTab("odeme")}
                      >
                        <i className="fas fa-credit-card mr-3"></i>
                        Ödeme Bilgileri
                      </Button>
                      <Button
                        variant={activeTab === "abonelik" ? "default" : "ghost"}
                        className="w-full justify-start !rounded-button whitespace-nowrap cursor-pointer"
                        onClick={() => setActiveTab("abonelik")}
                      >
                        <i className="fas fa-crown mr-3"></i>
                        Abonelik Planı
                      </Button>
                      <Button
                        variant={activeTab === "hesap" ? "default" : "ghost"}
                        className="w-full justify-start !rounded-button whitespace-nowrap cursor-pointer"
                        onClick={() => setActiveTab("hesap")}
                      >
                        <i className="fas fa-cog mr-3"></i>
                        Hesap Yönetimi
                      </Button>
                    </nav>
                    <Separator className="my-4" />
                    <div className="space-y-1">
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-gray-600 !rounded-button whitespace-nowrap cursor-pointer"
                        onClick={handleHelpSupport}
                      >
                        <i className="fas fa-question-circle mr-3"></i>
                        Yardım ve Destek
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 !rounded-button whitespace-nowrap cursor-pointer"
                        onClick={handleLogout}
                      >
                        <i className="fas fa-sign-out-alt mr-3"></i>
                        Çıkış Yap
                      </Button>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            {showSuccessAlert && (
              <Alert className="mb-6 bg-green-50 border-green-200 text-green-800">
                <div className="flex items-center">
                  <i className="fas fa-check-circle text-green-500 mr-2 text-lg"></i>
                  <AlertDescription>
                    Değişiklikleriniz başarıyla kaydedildi.
                  </AlertDescription>
                </div>
              </Alert>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* Profile Information */}
<<<<<<< HEAD
            <TabsContent value="profil">
=======
            <div
              className={`${activeTab === "profil" ? "block" : "hidden"}`}
            >
>>>>>>> 2d445a9ea69232713910c0f1a84088ab0a5be0d6
              <Card className="border-none shadow-md mb-6">
                <CardHeader className="pb-2">
                  <CardTitle>Profil Bilgileri</CardTitle>
                  <CardDescription>
                    Kişisel bilgilerinizi görüntüleyin ve düzenleyin
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label
                        htmlFor="firstName"
                        className="text-gray-700 mb-1 block"
                      >
                        Ad
                      </Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        className="border-gray-300"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="lastName"
                        className="text-gray-700 mb-1 block"
                      >
                        Soyad
                      </Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        className="border-gray-300"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="email"
                        className="text-gray-700 mb-1 block"
                      >
                        E-posta Adresi
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="border-gray-300"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="phone"
                        className="text-gray-700 mb-1 block"
                      >
                        Telefon Numarası
                      </Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="border-gray-300"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md mb-6">
                <CardHeader className="pb-2">
                  <CardTitle>Şifre Değiştirme</CardTitle>
                  <CardDescription>
                    Hesap güvenliğiniz için şifrenizi düzenli olarak
                    değiştirmenizi öneririz
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label
                        htmlFor="currentPassword"
                        className="text-gray-700 mb-1 block"
                      >
                        Mevcut Şifre
                      </Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={formData.currentPassword}
                        onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                        className="border-gray-300"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="newPassword"
                        className="text-gray-700 mb-1 block"
                      >
                        Yeni Şifre
                      </Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={formData.newPassword}
                        onChange={(e) => handleInputChange('newPassword', e.target.value)}
                        className="border-gray-300"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Şifreniz en az 8 karakter uzunluğunda olmalı ve büyük
                        harf, küçük harf, rakam ve özel karakter içermelidir.
                      </p>
                    </div>
                    <div>
                      <Label
                        htmlFor="confirmPassword"
                        className="text-gray-700 mb-1 block"
                      >
                        Yeni Şifre (Tekrar)
                      </Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        className="border-gray-300"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle>Profil Fotoğrafı</CardTitle>
                  <CardDescription>
                    Profil fotoğrafınızı değiştirin veya kaldırın
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-6">
                    <img
                      src={profileImageUrl}
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover border border-gray-200"
                    />
                    <div className="space-y-3">
                      <Button 
                        className="!rounded-button whitespace-nowrap cursor-pointer"
                        onClick={handleUploadPhoto}
                      >
                        <i className="fas fa-upload mr-2"></i>
                        Fotoğraf Yükle
                      </Button>
                      <Button
                        variant="outline"
                        className="!rounded-button whitespace-nowrap cursor-pointer"
                        onClick={handleRemovePhoto}
                      >
                        <i className="fas fa-trash-alt mr-2"></i>
                        Fotoğrafı Kaldır
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-4">
                    İzin verilen dosya türleri: JPG, PNG. Maksimum dosya boyutu:
                    2MB.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Notification Preferences */}
            <div
              className={`${activeTab === "bildirimler" ? "block" : "hidden"}`}
            >
              <Card className="border-none shadow-md">
                <CardHeader>
                  <CardTitle>Bildirim Tercihleri</CardTitle>
                  <CardDescription>
                    Hangi bildirimler almak istediğinizi seçin
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">
                        E-posta Bildirimleri
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label
                              htmlFor="emailUpdates"
                              className="font-medium"
                            >
                              Ürün Güncellemeleri
                            </Label>
                            <p className="text-sm text-gray-500">
                              Yeni özellikler ve iyileştirmeler hakkında bilgi
                              alın
                            </p>
                          </div>
                          <Switch 
                            id="emailUpdates" 
                            checked={notifications.emailNotifications}
                            onCheckedChange={(checked) => handleNotificationChange('emailNotifications', checked)}
                          />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <div>
                            <Label
                              htmlFor="emailPromotions"
                              className="font-medium"
                            >
                              Promosyonlar ve İndirimler
                            </Label>
                            <p className="text-sm text-gray-500">
                              Özel teklifler ve kampanyalardan haberdar olun
                            </p>
                          </div>
                          <Switch 
                            id="emailPromotions" 
                            checked={notifications.marketingEmails}
                            onCheckedChange={(checked) => handleNotificationChange('marketingEmails', checked)}
                          />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <div>
                            <Label
                              htmlFor="emailSecurity"
                              className="font-medium"
                            >
                              Güvenlik Uyarıları
                            </Label>
                            <p className="text-sm text-gray-500">
                              Hesabınızla ilgili güvenlik bildirimleri alın
                            </p>
                          </div>
                          <Switch 
                            id="emailSecurity" 
                            checked={notifications.securityAlerts}
                            onCheckedChange={(checked) => handleNotificationChange('securityAlerts', checked)}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium mb-4">
                        Push Bildirimleri
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label
                              htmlFor="pushMessages"
                              className="font-medium"
                            >
                              Mesajlar
                            </Label>
                            <p className="text-sm text-gray-500">
                              Yeni mesaj bildirimleri alın
                            </p>
                          </div>
                          <Switch 
                            id="pushMessages" 
                            checked={notifications.pushNotifications}
                            onCheckedChange={(checked) => handleNotificationChange('pushNotifications', checked)}
                          />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <div>
                            <Label
                              htmlFor="pushReminders"
                              className="font-medium"
                            >
                              Hatırlatıcılar
                            </Label>
                            <p className="text-sm text-gray-500">
                              Yaklaşan etkinlikler ve görevler için
                              hatırlatıcılar alın
                            </p>
                          </div>
                          <Switch 
                            id="pushReminders" 
                            checked={notifications.weeklyReports}
                            onCheckedChange={(checked) => handleNotificationChange('weeklyReports', checked)}
                          />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <div>
                            <Label
                              htmlFor="pushActivity"
                              className="font-medium"
                            >
                              Hesap Aktivitesi
                            </Label>
                            <p className="text-sm text-gray-500">
                              Hesabınızdaki önemli değişiklikler hakkında
                              bildirimler alın
                            </p>
                          </div>
                          <Switch 
                            id="pushActivity" 
                            checked={notifications.securityAlerts}
                            onCheckedChange={(checked) => handleNotificationChange('securityAlerts', checked)}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium mb-4">
                        SMS Bildirimleri
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="smsAuth" className="font-medium">
                              İki Faktörlü Kimlik Doğrulama
                            </Label>
                            <p className="text-sm text-gray-500">
                              Güvenlik kodları ve doğrulama mesajları alın
                            </p>
                          </div>
                          <Switch 
                            id="smsAuth" 
                            checked={notifications.smsNotifications}
                            onCheckedChange={(checked) => handleNotificationChange('smsNotifications', checked)}
                          />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <div>
                            <Label
                              htmlFor="smsMarketing"
                              className="font-medium"
                            >
                              Pazarlama Mesajları
                            </Label>
                            <p className="text-sm text-gray-500">
                              Özel teklifler ve promosyonlar hakkında SMS alın
                            </p>
                          </div>
                          <Switch 
                            id="smsMarketing" 
                            checked={notifications.marketingEmails}
                            onCheckedChange={(checked) => handleNotificationChange('marketingEmails', checked)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Privacy Settings */}
            <div
              className={`${activeTab === "gizlilik" ? "block" : "hidden"}`}
            >
              <Card className="border-none shadow-md mb-6">
                <CardHeader>
                  <CardTitle>Gizlilik Ayarları</CardTitle>
                  <CardDescription>
                    Hesabınızın gizlilik ve güvenlik ayarlarını yönetin
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">
                        Profil Görünürlüğü
                      </h3>
                      <RadioGroup 
                        value={privacy.profileVisibility}
                        onValueChange={(value) => handlePrivacyChange('profileVisibility', value)}
                      >
                        <div className="flex items-start space-x-3 mb-3">
                          <RadioGroupItem
                            value="public"
                            id="public"
                            className="mt-1"
                          />
                          <div>
                            <Label htmlFor="public" className="font-medium">
                              Herkese Açık
                            </Label>
                            <p className="text-sm text-gray-500">
                              Profiliniz tüm kullanıcılar tarafından
                              görüntülenebilir
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3 mb-3">
                          <RadioGroupItem
                            value="contacts"
                            id="contacts"
                            className="mt-1"
                          />
                          <div>
                            <Label htmlFor="contacts" className="font-medium">
                              Sadece Bağlantılar
                            </Label>
                            <p className="text-sm text-gray-500">
                              Profiliniz yalnızca bağlantılarınız tarafından
                              görüntülenebilir
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <RadioGroupItem
                            value="private"
                            id="private"
                            className="mt-1"
                          />
                          <div>
                            <Label htmlFor="private" className="font-medium">
                              Gizli
                            </Label>
                            <p className="text-sm text-gray-500">
                              Profiliniz kimse tarafından görüntülenemez
                            </p>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-medium mb-4">
                        Veri Paylaşımı
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label
                              htmlFor="dataAnalytics"
                              className="font-medium"
                            >
                              Analitik Amaçlı Veri Paylaşımı
                            </Label>
                            <p className="text-sm text-gray-500">
                              Hizmetlerimizi iyileştirmek için kullanım
                              verilerinizi toplamımıza izin verin
                            </p>
                          </div>
                          <Switch 
                            id="dataAnalytics" 
                            checked={privacy.analyticsTracking}
                            onCheckedChange={(checked) => handlePrivacyChange('analyticsTracking', checked)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label
                              htmlFor="dataPersonalization"
                              className="font-medium"
                            >
                              Kişiselleştirme
                            </Label>
                            <p className="text-sm text-gray-500">
                              Size özel içerik ve öneriler sunmak için
                              verilerinizi kullanmamıza izin verin
                            </p>
                          </div>
                          <Switch 
                            id="dataPersonalization" 
                            checked={privacy.dataSharing}
                            onCheckedChange={(checked) => handlePrivacyChange('dataSharing', checked)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label
                              htmlFor="dataThirdParty"
                              className="font-medium"
                            >
                              Üçüncü Taraf Paylaşımı
                            </Label>
                            <p className="text-sm text-gray-500">
                              Verilerinizi iş ortaklarımızla paylaşmamıza izin
                              verin
                            </p>
                          </div>
                          <Switch 
                            id="dataThirdParty" 
                            checked={privacy.dataSharing}
                            onCheckedChange={(checked) => handlePrivacyChange('dataSharing', checked)}
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-medium mb-4">
                        Konum İzinleri
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label
                              htmlFor="locationServices"
                              className="font-medium"
                            >
                              Konum Hizmetleri
                            </Label>
                            <p className="text-sm text-gray-500">
                              Konumunuza dayalı özellikler ve içerik sunmamıza
                              izin verin
                            </p>
                          </div>
                          <Switch id="locationServices" />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label
                              htmlFor="locationBackground"
                              className="font-medium"
                            >
                              Arka Planda Konum Takibi
                            </Label>
                            <p className="text-sm text-gray-500">
                              Uygulama kapalıyken bile konumunuzu takip etmemize
                              izin verin
                            </p>
                          </div>
                          <Switch id="locationBackground" />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md">
                <CardHeader>
                  <CardTitle>Güvenlik Ayarları</CardTitle>
                  <CardDescription>
                    Hesabınızın güvenliğini artırmak için ek önlemler alın
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">
                          İki Faktörlü Kimlik Doğrulama
                        </h3>
                        <p className="text-sm text-gray-500">
                          Hesabınıza giriş yaparken ek bir güvenlik katmanı
                          ekleyin
                        </p>
                      </div>
                      <Switch id="twoFactorAuth" />
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-medium mb-3">Oturum Açma Geçmişi</h3>
                      <p className="text-sm text-gray-500 mb-3">
                        Son 30 gün içindeki hesap etkinlikleriniz
                      </p>
                      <Button
                        variant="outline"
                        className="!rounded-button whitespace-nowrap cursor-pointer"
                        onClick={() => alert('Oturum geçmişi sayfası geliştirme aşamasında!')}
                      >
                        <i className="fas fa-history mr-2"></i>
                        Oturum Geçmişini Görüntüle
                      </Button>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-medium mb-3">Bağlı Cihazlar</h3>
                      <p className="text-sm text-gray-500 mb-3">
                        Hesabınızın bağlı olduğu tüm cihazları yönetin
                      </p>
                      <Button
                        variant="outline"
                        className="!rounded-button whitespace-nowrap cursor-pointer"
                        onClick={() => alert('Bağlı cihazlar sayfası geliştirme aşamasında!')}
                      >
                        <i className="fas fa-laptop mr-2"></i>
                        Bağlı Cihazları Yönet
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment Information */}
            <div
              className={`${activeTab === "odeme" ? "block" : "hidden"}`}
            >
              <Card className="border-none shadow-md mb-6">
                <CardHeader>
                  <CardTitle>Ödeme Bilgileri</CardTitle>
                  <CardDescription>
                    Kayıtlı ödeme yöntemlerinizi görüntüleyin ve yönetin
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">
                        Kayıtlı Kartlar
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                          <div className="flex items-center">
                            <div className="w-12 h-8 bg-blue-600 rounded-md flex items-center justify-center text-white mr-4">
                              <i className="fab fa-cc-visa text-xl"></i>
                            </div>
                            <div>
                              <p className="font-medium">
                                Visa ile biten **** 4589
                              </p>
                              <p className="text-sm text-gray-500">
                                Son Kullanma: 09/2026
                              </p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="!rounded-button whitespace-nowrap cursor-pointer"
                            >
                              <i className="fas fa-pencil-alt mr-1"></i>
                              Düzenle
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 !rounded-button whitespace-nowrap cursor-pointer"
                            >
                              <i className="fas fa-trash-alt mr-1"></i>
                              Sil
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                          <div className="flex items-center">
                            <div className="w-12 h-8 bg-blue-800 rounded-md flex items-center justify-center text-white mr-4">
                              <i className="fab fa-cc-mastercard text-xl"></i>
                            </div>
                            <div>
                              <p className="font-medium">
                                Mastercard ile biten **** 7821
                              </p>
                              <p className="text-sm text-gray-500">
                                Son Kullanma: 03/2025
                              </p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="!rounded-button whitespace-nowrap cursor-pointer"
                            >
                              <i className="fas fa-pencil-alt mr-1"></i>
                              Düzenle
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 !rounded-button whitespace-nowrap cursor-pointer"
                            >
                              <i className="fas fa-trash-alt mr-1"></i>
                              Sil
                            </Button>
                          </div>
                        </div>
                      </div>
                      <Button 
                        className="mt-4 !rounded-button whitespace-nowrap cursor-pointer"
                        onClick={handleAddPaymentMethod}
                      >
                        <i className="fas fa-plus mr-2"></i>
                        Yeni Kart Ekle
                      </Button>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-medium mb-4">
                        Fatura Adresi
                      </h3>
                      <div className="p-4 border rounded-lg bg-gray-50">
                        <p className="font-medium">Mehmet Kaya</p>
                        <p className="text-gray-600">Atatürk Caddesi No: 123</p>
                        <p className="text-gray-600">Kadıköy, İstanbul 34700</p>
                        <p className="text-gray-600">Türkiye</p>
                        <div className="mt-3 flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="!rounded-button whitespace-nowrap cursor-pointer"
                          >
                            <i className="fas fa-pencil-alt mr-1"></i>
                            Düzenle
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-medium mb-4">
                        Ödeme Geçmişi
                      </h3>
                      <div className="border rounded-lg overflow-hidden">
                        <div className="grid grid-cols-5 gap-4 p-3 bg-gray-100 font-medium text-sm">
                          <div>Tarih</div>
                          <div>İşlem No</div>
                          <div>Açıklama</div>
                          <div>Tutar</div>
                          <div>Durum</div>
                        </div>
                        <div className="divide-y">
                          <div className="grid grid-cols-5 gap-4 p-3 text-sm">
                            <div>15.06.2025</div>
                            <div className="text-blue-600">#INV-2506</div>
                            <div>Premium Abonelik - Aylık</div>
                            <div>₺149,99</div>
                            <div>
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                                Ödendi
                              </Badge>
                            </div>
                          </div>
                          <div className="grid grid-cols-5 gap-4 p-3 text-sm">
                            <div>15.05.2025</div>
                            <div className="text-blue-600">#INV-2405</div>
                            <div>Premium Abonelik - Aylık</div>
                            <div>₺149,99</div>
                            <div>
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                                Ödendi
                              </Badge>
                            </div>
                          </div>
                          <div className="grid grid-cols-5 gap-4 p-3 text-sm">
                            <div>15.04.2025</div>
                            <div className="text-blue-600">#INV-2304</div>
                            <div>Premium Abonelik - Aylık</div>
                            <div>₺149,99</div>
                            <div>
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                                Ödendi
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="mt-4 !rounded-button whitespace-nowrap cursor-pointer"
                        onClick={handleViewInvoices}
                      >
                        <i className="fas fa-download mr-2"></i>
                        Tüm Faturaları İndir
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Subscription Plan */}
            <div
              className={`${activeTab === "abonelik" ? "block" : "hidden"}`}
            >
              <Card className="border-none shadow-md mb-6">
                <CardHeader>
                  <CardTitle>Abonelik Planı</CardTitle>
                  <CardDescription>
                    Mevcut abonelik planınızı görüntüleyin ve yönetin
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-bold text-blue-800">
                            Premium Plan
                          </h3>
                          <p className="text-blue-600">
                            Aylık fatura - ₺149,99/ay
                          </p>
                          <div className="mt-2 flex items-center text-sm text-blue-700">
                            <i className="fas fa-calendar-alt mr-2"></i>
                            Bir sonraki fatura tarihi: 15 Temmuz 2025
                          </div>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                          Aktif
                        </Badge>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div className="flex items-center">
                          <i className="fas fa-check text-green-500 mr-2"></i>
                          <span className="text-gray-700">
                            Sınırsız içerik oluşturma
                          </span>
                        </div>
                        <div className="flex items-center">
                          <i className="fas fa-check text-green-500 mr-2"></i>
                          <span className="text-gray-700">
                            Tüm ses modelleri
                          </span>
                        </div>
                        <div className="flex items-center">
                          <i className="fas fa-check text-green-500 mr-2"></i>
                          <span className="text-gray-700">
                            Öncelikli destek
                          </span>
                        </div>
                        <div className="flex items-center">
                          <i className="fas fa-check text-green-500 mr-2"></i>
                          <span className="text-gray-700">
                            Reklamsız deneyim
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium mb-4">
                        Plan Değiştirme
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="border border-gray-200">
                          <CardContent className="p-4">
                            <h4 className="font-bold mb-2">Ücretsiz</h4>
                            <p className="text-2xl font-bold mb-4">
                              ₺0
                              <span className="text-sm font-normal text-gray-500">
                                /ay
                              </span>
                            </p>
                            <ul className="space-y-2 text-sm mb-4">
                              <li className="flex items-start">
                                <i className="fas fa-check text-green-500 mr-2 mt-1"></i>
                                <span>Günlük 5 içerik dönüşümü</span>
                              </li>
                              <li className="flex items-start">
                                <i className="fas fa-check text-green-500 mr-2 mt-1"></i>
                                <span>Temel ses modelleri</span>
                              </li>
                              <li className="flex items-start text-gray-400">
                                <i className="fas fa-times text-gray-400 mr-2 mt-1"></i>
                                <span>Premium ses modelleri</span>
                              </li>
                              <li className="flex items-start text-gray-400">
                                <i className="fas fa-times text-gray-400 mr-2 mt-1"></i>
                                <span>Öncelikli destek</span>
                              </li>
                            </ul>
                            <Button
                              variant="outline"
                              className="w-full !rounded-button whitespace-nowrap cursor-pointer"
                            >
                              Mevcut Plan
                            </Button>
                          </CardContent>
                        </Card>

                        <Card className="border-2 border-blue-500 relative">
                          <div className="absolute top-0 right-0 bg-blue-500 text-white px-3 py-1 text-xs font-bold rounded-bl-lg">
                            MEVCUT
                          </div>
                          <CardContent className="p-4">
                            <h4 className="font-bold mb-2">Premium</h4>
                            <p className="text-2xl font-bold mb-4">
                              ₺149,99
                              <span className="text-sm font-normal text-gray-500">
                                /ay
                              </span>
                            </p>
                            <ul className="space-y-2 text-sm mb-4">
                              <li className="flex items-start">
                                <i className="fas fa-check text-green-500 mr-2 mt-1"></i>
                                <span>Sınırsız içerik dönüşümü</span>
                              </li>
                              <li className="flex items-start">
                                <i className="fas fa-check text-green-500 mr-2 mt-1"></i>
                                <span>Tüm ses modelleri</span>
                              </li>
                              <li className="flex items-start">
                                <i className="fas fa-check text-green-500 mr-2 mt-1"></i>
                                <span>Öncelikli destek</span>
                              </li>
                              <li className="flex items-start">
                                <i className="fas fa-check text-green-500 mr-2 mt-1"></i>
                                <span>Reklamsız deneyim</span>
                              </li>
                            </ul>
                            <Button
                              disabled
                              className="w-full !rounded-button whitespace-nowrap cursor-pointer"
                            >
                              Mevcut Plan
                            </Button>
                          </CardContent>
                        </Card>

                        <Card className="border border-gray-200">
                          <CardContent className="p-4">
                            <h4 className="font-bold mb-2">Pro</h4>
                            <p className="text-2xl font-bold mb-4">
                              ₺299,99
                              <span className="text-sm font-normal text-gray-500">
                                /ay
                              </span>
                            </p>
                            <ul className="space-y-2 text-sm mb-4">
                              <li className="flex items-start">
                                <i className="fas fa-check text-green-500 mr-2 mt-1"></i>
                                <span>Sınırsız içerik dönüşümü</span>
                              </li>
                              <li className="flex items-start">
                                <i className="fas fa-check text-green-500 mr-2 mt-1"></i>
                                <span>Tüm ses modelleri + Özel sesler</span>
                              </li>
                              <li className="flex items-start">
                                <i className="fas fa-check text-green-500 mr-2 mt-1"></i>
                                <span>7/24 öncelikli destek</span>
                              </li>
                              <li className="flex items-start">
                                <i className="fas fa-check text-green-500 mr-2 mt-1"></i>
                                <span>API erişimi</span>
                              </li>
                            </ul>
                            <Button className="w-full !rounded-button whitespace-nowrap cursor-pointer">
                              Yükselt
                            </Button>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-medium mb-4">
                        Abonelik Yönetimi
                      </h3>
                      <div className="space-y-4">
                        <Button
                          variant="outline"
                          className="!rounded-button whitespace-nowrap cursor-pointer"
                        >
                          <i className="fas fa-sync-alt mr-2"></i>
                          Ödeme Yöntemini Değiştir
                        </Button>
                        <Button
                          variant="outline"
                          className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200 !rounded-button whitespace-nowrap cursor-pointer"
                        >
                          <i className="fas fa-pause mr-2"></i>
                          Aboneliği Duraklat
                        </Button>
                        <Button
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 !rounded-button whitespace-nowrap cursor-pointer"
                        >
                          <i className="fas fa-times mr-2"></i>
                          Aboneliği İptal Et
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500 mt-4">
                        İptal işlemi, mevcut fatura döneminin sonunda
                        gerçekleşecektir. İptal tarihine kadar tüm Premium
                        özelliklerden yararlanmaya devam edeceksiniz.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Account Management */}
            <div
              className={`${activeTab === "hesap" ? "block" : "hidden"}`}
            >
              <Card className="border-none shadow-md mb-6">
                <CardHeader>
                  <CardTitle>Hesap Yönetimi</CardTitle>
                  <CardDescription>
                    Hesabınızla ilgili temel işlemleri gerçekleştirin
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Hesap Durumu</h3>
                      <div className="p-4 border rounded-lg bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Hesap Durumu</p>
                            <p className="text-sm text-gray-500">
                              Hesabınız şu anda aktif durumdadır
                            </p>
                          </div>
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                            Aktif
                          </Badge>
                        </div>
                        <div className="mt-4 flex space-x-3">
                          <Button
                            variant="outline"
                            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200 !rounded-button whitespace-nowrap cursor-pointer"
                          >
                            <i className="fas fa-pause mr-2"></i>
                            Hesabı Dondur
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-medium mb-4">
                        Veri ve Gizlilik
                      </h3>
                      <div className="space-y-4">
                        <Button
                          variant="outline"
                          className="!rounded-button whitespace-nowrap cursor-pointer"
                        >
                          <i className="fas fa-download mr-2"></i>
                          Verilerimi İndir
                        </Button>
                        <p className="text-sm text-gray-500">
                          Hesabınızla ilgili tüm verilerin bir kopyasını
                          indirin. Bu işlem birkaç dakika sürebilir.
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-medium mb-4">Hesap Silme</h3>
                      <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                        <p className="text-red-800 font-medium">
                          Hesabınızı Silmek İstiyor musunuz?
                        </p>
                        <p className="text-sm text-red-700 mt-1 mb-4">
                          Bu işlem geri alınamaz. Hesabınız ve tüm verileriniz
                          kalıcı olarak silinecektir.
                        </p>
                        {showDeleteConfirm ? (
                          <div className="space-y-3">
                            <p className="text-sm font-medium text-red-800">
                              Hesabınızı silmek istediğinizden emin misiniz?
                            </p>
                            <Input
                              placeholder="Onaylamak için 'HESABIMI SİL' yazın"
                              className="border-red-300 text-red-800 placeholder:text-red-300"
                            />
                            <div className="flex space-x-3 mt-3">
                              <Button
                                variant="destructive"
                                className="!rounded-button whitespace-nowrap cursor-pointer"
                              >
                                <i className="fas fa-trash-alt mr-2"></i>
                                Hesabımı Kalıcı Olarak Sil
                              </Button>
                              <Button
                                variant="outline"
                                className="!rounded-button whitespace-nowrap cursor-pointer"
                                onClick={() => setShowDeleteConfirm(false)}
                              >
                                İptal
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-100 border-red-300 !rounded-button whitespace-nowrap cursor-pointer"
                            onClick={() => setShowDeleteConfirm(true)}
                          >
                            <i className="fas fa-trash-alt mr-2"></i>
                            Hesabımı Sil
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
<<<<<<< HEAD
            </TabsContent>
            </Tabs>
=======
            </div>
>>>>>>> 2d445a9ea69232713910c0f1a84088ab0a5be0d6

            {/* Save Changes Button */}
            <div className="flex justify-end mt-6">
              <Button
                variant="outline"
                className="mr-3 !rounded-button whitespace-nowrap cursor-pointer"
              >
                İptal
              </Button>
              <Button
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 !rounded-button whitespace-nowrap cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <i className="fas fa-circle-notch fa-spin mr-2"></i>
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save mr-2"></i>
                    Değişiklikleri Kaydet
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 