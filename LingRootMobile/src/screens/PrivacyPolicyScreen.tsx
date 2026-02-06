import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../contexts/LanguageContext';

const PrivacyPolicyScreen: React.FC = () => {
  const { language } = useLanguage();

  const contentTR = `
GİZLİLİK POLİTİKASI

Son Güncelleme: 16 Ocak 2026

LingRoot olarak gizliliğinize önem veriyoruz. Bu gizlilik politikası, kişisel bilgilerinizi nasıl topladığımızı, kullandığımızı ve koruduğumuzu açıklar.

1. TOPLANAN BİLGİLER

1.1. Hesap Bilgileri
• Ad ve soyad
• E-posta adresi
• Şifre (şifrelenmiş olarak saklanır)

1.2. Biyometrik ve Ses Verileri (Önemli)
• Hizmetin bir parçası olarak, sesli komutlarınız veya ses klonlama özelliği için yüklediğiniz ses dosyaları işlenebilir.
• Ses verileriniz SADECE size bu hizmeti sağlamak (örn. metin seslendirme, telaffuz analizi) amacıyla kullanılır.
• Ses verileriniz izniniz olmadan kimlik doğrulama veya üçüncü taraf reklamcılık amacıyla kullanılmaz.

1.3. Kullanım Verileri
• Oluşturduğunuz ses dosyaları, metin içerikleri
• Kelime listeleri, çalışma geçmişi
• Cihaz bilgileri (model, IP, işletim sistemi)

2. BİLGİLERİN KULLANIMI VE YAPAY ZEKA

Topladığımız bilgileri şu amaçlarla kullanırız:
• Hizmetleri sağlamak (TTS, Çeviri, Seviye Belirleme)
• Text-to-Speech ve LLM (Large Language Model) hizmetleri için OpenAI ve Google Cloud API'lerini kullanmak.
• AI Modellerinin İyileştirilmesi: Anonimleştirilmiş (kimlikten arındırılmış) kullanım verileri, yapay zeka modellerinin doğruluğunu ve performansını artırmak için analiz edilebilir. Kişisel veriler doğrudan model eğitiminde kullanılmaz.

3. ÜÇÜNCÜ TARAF HİZMETLER VE VERİ AKTARIMI

Hizmetlerimizi sunabilmek için verileriniz güvenli protokollerle aşağıdaki sağlayıcılara aktarılabilir:
• Google Cloud (Text-to-Speech, Storage)
• OpenAI (Metin işleme, dil modelleri) - Veriler yurtdışı sunucularında işlenebilir.
• Apple App Store (Ödeme işlemleri)
• Supabase (Veritabanı ve kimlik doğrulama)

Bu hizmetler uluslararası güvenlik standartlarına (SOC2, GDPR) uygundur.

4. VERİ GÜVENLİĞİ

• Tüm veriler SSL/TLS şifreleme ile iletilir.
• Veritabanı erişimi katı yetkilendirme kurallarına bağlıdır.
• Hassas veriler (şifreler) hashlenerek saklanır.

5. HAKLARINIZ (KVKK ve GDPR)

• Verilerinize erişme, düzeltme ve silme (unutulma) hakkına sahipsiniz.
• Hesabınızı uygulama içinden sildiğinizde, ilişkili tüm kişisel veriler sistemden kalıcı olarak kaldırılır veya anonimleştirilir.

6. İLETİŞİM

Gizlilik ile ilgili sorularınız için:
E-posta: privacy@lingroot.com
`;

  const contentEN = `
PRIVACY POLICY

Last Updated: January 16, 2026

At LingRoot, we value your privacy. This privacy policy explains how we collect, use, and protect your personal information.

1. INFORMATION WE COLLECT

1.1. Account Information
• Full name
• Email address
• Password (stored encrypted)

1.2. Biometric and Voice Data (Important)
• As part of the service, voice files you upload for voice commands or voice cloning features may be processed.
• Your voice data is used ONLY to provide this service to you (e.g., text-to-speech, pronunciation analysis).
• Your voice data is not used for authentication or third-party advertising purposes without your consent.

1.3. Usage Data
• Audio files you create, text content
• Vocabulary lists and study history
• Device information (model, IP, operating system)

2. HOW WE USE YOUR INFORMATION AND AI

We use the collected information for:
• Providing services (TTS, Translation, Level Determination)
• Using OpenAI and Google Cloud APIs for Text-to-Speech and LLM (Large Language Model) services.
• AI Model Improvement: Anonymized (de-identified) usage data may be analyzed to improve the accuracy and performance of AI models. Personal data is not directly used in model training.

3. THIRD-PARTY SERVICES AND DATA TRANSFER

To provide our services, your data may be transferred to the following providers via secure protocols:
• Google Cloud (Text-to-Speech, Storage)
• OpenAI (Text processing, language models) - Data may be processed on international servers.
• Apple App Store (Payment processing)
• Supabase (Database and authentication)

These services comply with international security standards (SOC2, GDPR).

4. DATA SECURITY

• All data is transmitted via SSL/TLS encryption.
• Database access is subject to strict authorization rules.
• Sensitive data (passwords) is stored hashed.

5. YOUR RIGHTS (KVKK and GDPR)

• You have the right to access, correct, and delete (be forgotten) your data.
• When you delete your account from within the app, all associated personal data is permanently removed from the system or anonymized.

6. CONTACT

For privacy-related questions:
Email: privacy@lingroot.com
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

export default React.memo(PrivacyPolicyScreen);
