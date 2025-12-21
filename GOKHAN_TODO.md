# 📝 Gökhan ToDo List

Bu dosya, proje genelinde yapılması planlanan iyileştirmeleri, mimari notları ve ileriye dönük görevleri içerir.

---

## 🏗️ Mimari Standardizasyon: Veritabanı Alan İsimleri

**Durum:** Beklemede (Future Work)
**Öncelik:** Orta/Yüksek (Kod kalitesi için)

### Mevcut Durum Analizi
Projede aynı tür veriyi (İngilizce seviye uyarlı metin) tutan iki farklı tabloda farklı alan isimleri kullanıldığı tespit edilmiştir. Bu durum bir standardizasyon hatasıdır ve kodun bakımını zorlaştırır.

1.  **Tutarsız Alan İsimleri:**
    *   `contenthistory` tablosu: **`adapted_text`** kullanıyor.
    *   `topic_contents` tablosu: **`text_content`** kullanıyor.
    *   **Sorun:** Her iki alan da tamamen aynı veriyi (TTS için hazırlanan, seviyeye uygun İngilizce metni) tutuyor.

2.  **Tablo Ayrımı Mantığı (Doğru Kullanım):**
    *   `contenthistory` (Kullanıcı Logu): Kesinlikle kullanıcının o anki aktivitesini takip eder. Sürekli büyür ve kişiye özeldir.
    *   `topic_contents` (Sistem Önbelleği/Yapısı): Konu ağacındaki (Topic Tree) belirli bir düğümün "resmi" içeriğini tutar. Bu içerik genellikle paylaşılan veya kalıcı içeriktir, basit bir log değildir.

### Yapılacaklar (Action Plan)

Veritabanı alan isimlerini standartlaştırmak için aşağıdaki adımlar uygulanmalıdır:

- [ ] **Backend Alias (Takma Ad):** `topic_contents` tablosunu sorgularken, kod tarafında `text_content` alanını `adapted_text` olarak alias ile çekelim veya modellerde bu dönüşümü yapalım.
- [ ] **Refactoring:** Kodun her yerinde (Frontend veri karşılama dahil) İngilizce metin için sadece `adapted_text` değişken adını kullanalım.
- [ ] **Database Migration (Opsiyonel/İleri Seviye):** İleride veritabanı bakımı yapıldığında, `topic_contents` tablosundaki `text_content` sütununun adını fiziksel olarak `adapted_text` olarak değiştirelim.

### Hedef
Tüm projede:
*   **İngilizce Metin** = `adapted_text`
*   **Kullanıcı Dili (Çeviri)** = `translated_text`

olarak standartlaşmalıdır.
