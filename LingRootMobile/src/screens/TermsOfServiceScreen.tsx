import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../contexts/LanguageContext';

const TermsOfServiceScreen: React.FC = () => {
  const { language } = useLanguage();

  const contentTR = `
KULLANIM ŞARTLARI

Son Güncelleme: 16 Ocak 2026

LingRoot mobil uygulamasını kullanarak aşağıdaki şartları kabul etmiş olursunuz.

1. HİZMET TANIMI

LingRoot, İngilizce öğrenenler için yapay zeka destekli metin-sese dönüştürme, kelime öğrenme ve içerik oluşturma hizmeti sunar.

2. HESAP OLUŞTURMA VE SORUMLULUKLAR

• 13 yaş ve üzeri kullanıcılar hesap oluşturabilir
• Doğru ve güncel bilgiler sağlamalısınız
• Hesap güvenliğinden siz sorumlusunuz
• Hesabınızı başkalarıyla paylaşamazsınız

3. İÇERİK VE TELİF HAKKI

3.1. Telif Hakkı Uyarısı
LingRoot'a yüklediğiniz tüm içerikler için telif hakkı sorumluluğu size aittir. Başkalarına ait telif hakkı korumalı materyalleri izinsiz yüklemek yasal sorumluluk doğurur.

3.2. Kullanıcı Yüklemeleri (Önemli Sorumluluk Reddi)
Özellikle PDF ve diğer doküman yüklemelerinde; içeriklerin hukuka uygunluğundan, üçüncü kişilere ait telif hakları, kişisel veriler, ticari sırlar ve diğer tüm yasal yükümlülüklerden yalnızca dokümanı yükleyen kullanıcı sorumludur. LingRoot, kullanıcılar tarafından yüklenen dokümanların içeriğini ön incelemeye tabi tutmaz ve bu içeriklerden doğabilecek hiçbir hukuki, idari veya cezai sorumluluğu üstlenmez.

4. ABONELİK VE ÖDEMELER

4.1. Ücretsiz Deneme
• Yeni kullanıcılara sınırlı ses oluşturma hakkı verilir
• Deneme hakkı bittikten sonra premium pakete geçiş gerekir

4.2. Premium Paketler
• Ödemeler Apple App Store üzerinden işlenir
• Abonelikler otomatik olarak yenilenir
• İptal etmek için iOS Ayarlar > Apple ID > Abonelikler'den yönetebilirsiniz

4.3. İade Politikası
• İadeler Apple'ın iade politikasına tabidir
• İade talepleri Apple App Store üzerinden yapılmalıdır

5. KULLANIM KURALLARI

Aşağıdaki davranışlar yasaktır:
• Yasadışı içerik oluşturma
• Telif hakkı ihlali yapan içerikler
• Spam veya kötüye kullanım
• Hizmeti tersine mühendislik ile inceleme
• Otomatik sistemler (botlar) kullanma

6. SORUMLULUK REDDİ VE HİZMET SINIRLAMALARI

• Hizmet "olduğu gibi" sunulur, kesintisiz hizmet garantisi verilmez.
• Teknik sorunlar ve API limitleri uygulanabilir.
• Veri kaybından veya üçüncü taraf hizmetlerden kaynaklanan sorunlardan sorumlu değiliz.

7. YAPAY ZEKA VE TEKNOLOJİ RİSKİ (AI Disclaimer)

LingRoot tarafından sunulan içerikler, yapay zeka teknolojileri kullanılarak üretilmektedir. Yapay zeka modelleri, zaman zaman 'halüsinasyon' olarak adlandırılan yanlış, yanıltıcı veya uydurma bilgiler üretebilir. Hizmet tarafından üretilen çeviriler, özetler veya seslendirmeler profesyonel tavsiye (tıbbi, hukuki, finansal vb.) niteliği taşımaz. Kullanıcılar, kritik kararlar almadan önce üretilen içeriklerin doğruluğunu bağımsız kaynaklardan teyit etmelidir.

8. HESAP ASKIYA ALMA

Kullanım şartlarını ihlal, yasadışı aktiviteler veya kötüye kullanım durumunda hesabınızı askıya alabiliriz.

9. UYGULANACAK HUKUK

Bu şartlar Türkiye Cumhuriyeti yasalarına tabidir.

10. İLETİŞİM

Sorularınız için:
E-posta: legal@lingroot.com
Web: https://lingroot.com
`;

  const contentEN = `
TERMS OF SERVICE

Last Updated: January 16, 2026

By using the LingRoot mobile application, you agree to these terms.

1. SERVICE DESCRIPTION

LingRoot provides AI-powered text-to-speech, vocabulary learning, and content creation services for English learners.

2. ACCOUNT RESPONSIBILITIES

• Users must be 13 years or older
• You must provide accurate and current information
• You are responsible for account security
• You may not share your account with others

3. CONTENT AND COPYRIGHT

3.1. Copyright Warning
You are solely responsible for the copyright of all content you upload to LingRoot. Uploading copyright-protected materials owned by others without permission creates legal liability.

3.2. User Uploads (Liability Disclaimer)
Particularly for PDF and document uploads; the user uploading the document is solely responsible for the legality of the content, third-party intellectual property rights, personal data, trade secrets, and all other legal obligations. LingRoot does not pre-screen content uploaded by users and assumes no legal, administrative, or criminal liability arising from such content.

4. SUBSCRIPTIONS AND PAYMENTS

4.1. Free Trial
• New users receive limited audio creation credits
• Premium upgrade required after trial

4.2. Premium Plans
• Payments are processed through Apple App Store
• Subscriptions automatically renew
• Cancel anytime via iOS Settings > Apple ID > Subscriptions

4.3. Refund Policy
• Refunds are subject to Apple's refund policy
• Refund requests must be made through Apple App Store

5. USAGE RULES

The following behaviors are prohibited:
• Creating illegal content
• Copyright infringement
• Spam or abuse
• Reverse engineering the service
• Using automated systems (bots)

6. DISCLAIMER OF WARRANTIES

• Service is provided "as is" without guarantees of uninterrupted service.
• Technical issues and API limits may apply.
• We are not liable for data loss or issues caused by third-party services.

7. AI AND TECHNOLOGY RISK (AI Disclaimer)
Content provided by LingRoot is generated using artificial intelligence technologies. AI models may occasionally produce incorrect, misleading, or fabricated information (often called "hallucinations"). Translations, summaries, or voiceovers generated by the service do not constitute professional advice (medical, legal, financial, etc.). Users should independently verify the accuracy of the content before making critical decisions.

8. TERMINATION

We may suspend or terminate your account for violation of terms, illegal activities, or abuse.

9. GOVERNING LAW

These terms are governed by the laws of the Republic of Turkey.

10. CONTACT

For questions:
Email: legal@lingroot.com
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

export default React.memo(TermsOfServiceScreen);
