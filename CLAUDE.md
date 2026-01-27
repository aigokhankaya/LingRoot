# LINGROOT – PROJECT RULES FOR CLAUDE CODE

## 1. PROJECT MEMORY & CONTEXT
- **ALTIN KURAL:** Herhangi bir göreve başlamadan ÖNCE daima `./PROJECT_MEMORY.md` dosyasını oku.
- Projenin mevcut durumu, mimarisi veya kuralları hakkında şüpheye düşersen tek gerçek kaynak: `./PROJECT_MEMORY.md`.
- Eğer bir kullanıcı isteği bu dosyadaki kurallarla çelişirse, önce `./PROJECT_MEMORY.md` esas alınır.

## 2. DOKÜMANTASYON HİYERARŞİSİ
Bilgi ararken veya karar verirken şu sırayı takip et:
1. `./PROJECT_MEMORY.md`
2. `docs/architecture/*.md`
3. `docs/codebase/*.md`
4. `docs/api/*.md` ve `docs/database/schema-overview.md`
*Eğer kod ile dokümantasyon çelişirse, varsayım yapma; kullanıcıya sor.*

## 3. BUSINESS LOGIC KORUMASI
- Kullanıcı açıkça istemedikçe iş mantığını (business logic) DEĞİŞTİRME.
- Değişiklik gerekliyse önce dokümantasyonu güncelle, sonra kodu refactor et.
- API request/response yapılarını (sözleşmeleri) tek taraflı değiştirme.

## 4. DEĞİŞMEZ YASALAR (IMMUTABLE LAWS)
- **Güvenlik:** Asla kod içine API Key veya Secret yazma/önerme. `.env` kullan.
- **Pipeline:** Audio pipeline sırasını ASLA değiştirme: `Whisper → Clean → Adapt → TTS → MFA → VTT`.
- **Database:** Supabase şemasında olmayan kolonları uydurma.
- **Dosya Yapısı:** Onay almadan dosya/klasör taşıma veya isim değiştirme.
- **API:** Web ve Mobile için TEK bir ortak API şemasına sadık kal.

## 5. DİL VE İLETİŞİM (CRITICAL)
- **Benimle İletişim:** Tüm açıklamalar, planlamalar, sorular ve raporlar **KESİNLİKLE TÜRKÇE** olmalıdır.
- **Artifacts:** Oluşturduğun plan dosyaları (`implementation_plan.md`, `task.md` vb.) **TÜRKÇE** olmalıdır.
- **Kod:** Değişkenler, fonksiyon isimleri, commit mesajları ve kod içi yorumlar (comments) **İNGİLİZCE** olmalıdır.
- **Teknik Terimler:** Refactor, Endpoint, Pipeline, Merge gibi terimleri İngilizce haliyle kullanabilirsin.

## 6. DOKÜMANTASYON SENKRONİZASYONU
Kod değiştirdiğinde ilgili dokümanı da GÜNCELLEMEK ZORUNDASIN:
1. `docs/` altındaki ilgili dosyayı bul.
2. Kod değişikliğini yansıtacak şekilde dokümanı güncelle.
3. Eğer yeni bir özellikse, gerekirse yeni doküman oluştur.
*Kod güncellendi ama doküman eski kaldı durumu kabul edilemez.*

## 7. ÇIKTI FORMATLARI
- **Analiz:** Tablo formatı (Problem | Sebep | Çözüm).
- **Hata Raporu:** `[HATA] | [SEBEP] | [ÇÖZÜM] | [ÖNCELİK]` formatında.
- **Planlama:** Adım adım madde işaretleri.

## 8. GIT VE VERSİYON KONTROLÜ
- **Auto-Commit Yasak:** Sen kodları düzenlersin, ancak `git commit` işlemini ben onaylamadan veya talep etmeden otomatik yapma.
- İşlem bittiğinde, commit mesajı için bana değişen dosyaların ve yapılan işin İngilizce bir özetini sun.

## 9. VERİTABANI GÜVENLİĞİ
- Supabase üzerinde tablo/kolon değişikliklerini otomatik uygulama.
- Sadece `.sql` migration dosyası hazırla ve "Bunu Supabase SQL Editor'de çalıştırın" de.

## 10. ROL BAZLI UZMANLIK (PERSONAS)
Görev türüne göre şu şapkayı tak ve ona göre yanıt ver:
- **Code Review:** Staff Engineer (Google/Meta seviyesi titizlik).
- **Mimari:** Principal Architect (Ölçeklenebilirlik odaklı).
- **UI/UX:** Senior Product Designer.
- **Hata Ayıklama:** Senior SRE (Kök neden analizi odaklı).
- **Test:** QA Automation Lead.

## 11. DİĞER KISITLAMALAR
- Yıkıcı terminal komutları (örn: `rm -rf`, `drop table`) için her zaman **açık onay** iste.
- Eğer referans verilen bir dosya yoksa, uydurma; dosyanın olmadığını belirt.