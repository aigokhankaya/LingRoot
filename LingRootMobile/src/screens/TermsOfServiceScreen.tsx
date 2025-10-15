import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../contexts/LanguageContext';

const TermsOfServiceScreen: React.FC = () => {
  const { language } = useLanguage();

  const contentTR = `
KULLANIM ŞARTLARI

Son Güncelleme: 6 Ekim 2025

LingRoot mobil uygulamasını kullanarak aşağıdaki şartları kabul etmiş olursunuz.

1. HİZMET TANIMI

LingRoot, İngilizce öğrenenler için yapay zeka destekli metin-sese dönüştürme, kelime öğrenme ve içerik oluşturma hizmeti sunar.

2. HESAP OLUŞTURMA

• 13 yaş ve üzeri kullanıcılar hesap oluşturabilir
• Doğru ve güncel bilgiler sağlamalısınız
• Hesap güvenliğinden siz sorumlusunuz
• Hesabınızı başkalarıyla paylaşamazsınız

3. ABONELİK VE ÖDEMELER

3.1. Ücretsiz Deneme
• Yeni kullanıcılara 3 ses oluşturma hakkı verilir
• Her ses maksimum 10 dakika olabilir
• Deneme hakkı bittikten sonra premium pakete geçiş gerekir

3.2. Premium Paketler
• Gold Plan: ₺399/ay
• Platinum Plan: ₺599/ay
• Ödemeler Apple App Store üzerinden işlenir
• Abonelikler otomatik olarak yenilenir
• İptal etmek için iOS Ayarlar > Apple ID > Abonelikler'den yönetebilirsiniz

3.3. İade Politikası
• İadeler Apple'ın iade politikasına tabidir
• İade talepleri Apple App Store üzerinden yapılmalıdır

4. KULLANIM KURALLARI

Aşağıdaki davranışlar yasaktır:
• Yasadışı içerik oluşturma
• Telif hakkı ihlali yapan içerikler
• Spam veya kötüye kullanım
• Hizmeti tersine mühendislik ile inceleme
• Otomatik sistemler (botlar) kullanma

5. FİKRİ MÜLKİYET

• LingRoot markası ve logosu şirketimize aittir
• Oluşturduğunuz içerikler size aittir
• Hizmeti sağlamak için içeriklerinizi işleme hakkımız vardır
• Üçüncü taraf API'ler (Google TTS, OpenAI) kendi şartlarına tabidir

6. HİZMET SINIRLAMALARI

• Hizmet "olduğu gibi" sunulur
• Kesintisiz hizmet garantisi vermiyoruz
• Teknik sorunlar yaşanabilir
• API limitleri uygulanır

7. SORUMLULUK SINIRI

• Hizmet kesintilerinden sorumlu değiliz
• Veri kaybından sorumlu değiliz
• Üçüncü taraf hizmetlerden kaynaklanan sorunlardan sorumlu değiliz
• Maksimum sorumluluk ödediğiniz ücretle sınırlıdır

8. HİZMET DEĞİŞİKLİKLERİ

• Hizmeti değiştirme veya sonlandırma hakkımız saklıdır
• Fiyatları değiştirme hakkımız saklıdır
• Önemli değişiklikler önceden bildirilir

9. HESAP ASKIYA ALMA VE SONLANDIRMA

Aşağıdaki durumlarda hesabınızı askıya alabilir veya sonlandırabiliriz:
• Kullanım şartlarını ihlal
• Yasadışı aktiviteler
• Kötüye kullanım
• Ödeme sorunları

10. UYGULANACAK HUKUK

Bu şartlar Türkiye Cumhuriyeti yasalarına tabidir.

11. DEĞİŞİKLİKLER

Bu kullanım şartlarını zaman zaman güncelleyebiliriz. Önemli değişiklikler e-posta ile bildirilecektir.

12. İLETİŞİM

Sorularınız için:
E-posta: support@lingroot.com
Web: https://lingroot.com
`;

  const contentEN = `
TERMS OF SERVICE

Last Updated: October 6, 2025

By using the LingRoot mobile application, you agree to these terms.

1. SERVICE DESCRIPTION

LingRoot provides AI-powered text-to-speech, vocabulary learning, and content creation services for English learners.

2. ACCOUNT CREATION

• Users must be 13 years or older
• You must provide accurate and current information
• You are responsible for account security
• You may not share your account with others

3. SUBSCRIPTIONS AND PAYMENTS

3.1. Free Trial
• New users receive 3 audio creation credits
• Each audio can be up to 10 minutes
• Premium upgrade required after trial credits are used

3.2. Premium Plans
• Gold Plan: ₺399/month
• Platinum Plan: ₺599/month
• Payments are processed through Apple App Store
• Subscriptions automatically renew
• Cancel anytime via iOS Settings > Apple ID > Subscriptions

3.3. Refund Policy
• Refunds are subject to Apple's refund policy
• Refund requests must be made through Apple App Store

4. USAGE RULES

The following behaviors are prohibited:
• Creating illegal content
• Copyright infringement
• Spam or abuse
• Reverse engineering the service
• Using automated systems (bots)

5. INTELLECTUAL PROPERTY

• LingRoot brand and logo are owned by our company
• Content you create belongs to you
• We have the right to process your content to provide the service
• Third-party APIs (Google TTS, OpenAI) are subject to their own terms

6. SERVICE LIMITATIONS

• Service is provided "as is"
• We do not guarantee uninterrupted service
• Technical issues may occur
• API limits apply

7. LIMITATION OF LIABILITY

• We are not liable for service interruptions
• We are not liable for data loss
• We are not liable for issues caused by third-party services
• Maximum liability is limited to the amount you paid

8. SERVICE CHANGES

• We reserve the right to modify or terminate the service
• We reserve the right to change prices
• Significant changes will be notified in advance

9. ACCOUNT SUSPENSION AND TERMINATION

We may suspend or terminate your account for:
• Violation of terms of service
• Illegal activities
• Abuse
• Payment issues

10. GOVERNING LAW

These terms are governed by the laws of the Republic of Turkey.

11. CHANGES

We may update these terms from time to time. Significant changes will be notified via email.

12. CONTACT

For questions:
Email: support@lingroot.com
Web: https://lingroot.com
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

export default TermsOfServiceScreen;
