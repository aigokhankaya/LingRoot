import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../contexts/LanguageContext';

const PrivacyPolicyScreen: React.FC = () => {
  const { language } = useLanguage();

  const contentTR = `
GİZLİLİK POLİTİKASI

Son Güncelleme: 6 Ekim 2025

LingRoot olarak gizliliğinize önem veriyoruz. Bu gizlilik politikası, kişisel bilgilerinizi nasıl topladığımızı, kullandığımızı ve koruduğumuzu açıklar.

1. TOPLANAN BİLGİLER

1.1. Hesap Bilgileri
• Ad ve soyad
• E-posta adresi
• Telefon numarası
• Şifre (şifrelenmiş olarak saklanır)

1.2. Kullanım Verileri
• Oluşturduğunuz ses dosyaları
• Metin içerikleri
• Kelime listeleri ve çalışma geçmişi
• Uygulama kullanım istatistikleri
• Cihaz bilgileri (model, işletim sistemi)

1.3. Ödeme Bilgileri
• Abonelik bilgileri
• Apple App Store üzerinden yapılan ödemeler (Apple tarafından işlenir)
• Ödeme geçmişi

2. BİLGİLERİN KULLANIMI

Topladığımız bilgileri şu amaçlarla kullanırız:
• Hizmetlerimizi sağlamak ve geliştirmek
• Ses dosyaları oluşturmak (Google Text-to-Speech API)
• Metin çevirileri yapmak (OpenAI API)
• Kelime önerileri ve CEFR seviye belirleme (OpenAI API)
• Hesap güvenliğini sağlamak
• Müşteri desteği sunmak
• Yasal yükümlülükleri yerine getirmek

3. ÜÇÜNCÜ TARAF HİZMETLER

Aşağıdaki üçüncü taraf hizmetlerini kullanıyoruz:
• Google Text-to-Speech API (ses oluşturma)
• OpenAI API (metin işleme, çeviri, seviye belirleme)
• Apple App Store (ödeme işlemleri)
• Supabase (veri saklama)

Bu hizmetler kendi gizlilik politikalarına tabidir.

4. VERİ GÜVENLİĞİ

• Tüm veriler şifrelenmiş bağlantılar (HTTPS) üzerinden iletilir
• Şifreler bcrypt ile hash'lenerek saklanır
• Veritabanı erişimi güvenli kimlik doğrulama ile korunur
• Düzenli güvenlik güncellemeleri yapılır

5. VERİ SAKLAMA

• Hesap bilgileriniz hesabınızı silene kadar saklanır
• Ses dosyaları ve içerikler hesabınızla ilişkili olarak saklanır
• Kullanım istatistikleri analiz amacıyla saklanır

6. HAKLARINIZ

• Kişisel verilerinize erişim hakkı
• Verilerinizi düzeltme hakkı
• Verilerinizi silme hakkı (hesap silme)
• Veri taşınabilirliği hakkı
• İtiraz etme hakkı

7. ÇOCUKLARIN GİZLİLİĞİ

Hizmetimiz 13 yaş altı çocuklara yönelik değildir. Bilerek 13 yaş altı çocuklardan kişisel bilgi toplamıyoruz.

8. DEĞİŞİKLİKLER

Bu gizlilik politikasını zaman zaman güncelleyebiliriz. Önemli değişiklikler e-posta ile bildirilecektir.

9. İLETİŞİM

Gizlilik ile ilgili sorularınız için:
E-posta: support@lingroot.com
Web: https://lingroot.com

KVKK kapsamındaki haklarınızı kullanmak için yukarıdaki iletişim bilgilerinden bize ulaşabilirsiniz.
`;

  const contentEN = `
PRIVACY POLICY

Last Updated: October 6, 2025

At LingRoot, we value your privacy. This privacy policy explains how we collect, use, and protect your personal information.

1. INFORMATION WE COLLECT

1.1. Account Information
• Full name
• Email address
• Phone number
• Password (stored encrypted)

1.2. Usage Data
• Audio files you create
• Text content
• Vocabulary lists and study history
• App usage statistics
• Device information (model, operating system)

1.3. Payment Information
• Subscription details
• Payments made through Apple App Store (processed by Apple)
• Payment history

2. HOW WE USE YOUR INFORMATION

We use the collected information for:
• Providing and improving our services
• Creating audio files (Google Text-to-Speech API)
• Text translations (OpenAI API)
• Word suggestions and CEFR level determination (OpenAI API)
• Account security
• Customer support
• Legal compliance

3. THIRD-PARTY SERVICES

We use the following third-party services:
• Google Text-to-Speech API (audio creation)
• OpenAI API (text processing, translation, level determination)
• Apple App Store (payment processing)
• Supabase (data storage)

These services are subject to their own privacy policies.

4. DATA SECURITY

• All data is transmitted over encrypted connections (HTTPS)
• Passwords are hashed using bcrypt
• Database access is protected with secure authentication
• Regular security updates are performed

5. DATA RETENTION

• Your account information is stored until you delete your account
• Audio files and content are stored associated with your account
• Usage statistics are retained for analysis purposes

6. YOUR RIGHTS

• Right to access your personal data
• Right to correct your data
• Right to delete your data (account deletion)
• Right to data portability
• Right to object

7. CHILDREN'S PRIVACY

Our service is not directed to children under 13. We do not knowingly collect personal information from children under 13.

8. CHANGES

We may update this privacy policy from time to time. Significant changes will be notified via email.

9. CONTACT

For privacy-related questions:
Email: support@lingroot.com
Web: https://lingroot.com

You can contact us using the above information to exercise your rights under applicable data protection laws.
`;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <Text style={styles.text}>
          {language === 'tr' ? contentTR : contentEN}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
    color: '#374151',
  },
});

export default PrivacyPolicyScreen;
