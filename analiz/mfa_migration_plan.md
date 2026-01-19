# MFA Servisi Taşıma Planı: Lokalden VPS'e

## 1. Gereksinim Analizi
Montreal Forced Aligner (MFA) servisinin sorunsuz çalışması için gereken temel kaynaklar:
- **Çalışma Zamanı (Runtime):** Docker (MFA imajı için şart).
- **CPU:** Yüksek tek çekirdek performansı (Single-core performance) kritiktir. Paralel işlem yapılabilse de hizalama işlemi CPU yoğunludur.
- **RAM:** En az 4GB-8GB önerilir.
- **Disk:** Hizalama sırasında çok sayıda küçük dosya (TextGrid vb.) yazıldığı için hızlı disk I/O (NVMe SSD) önemlidir.
- **İşletim Sistemi:** Linux (Ubuntu/Debian) en stabil Docker performansı için standarttır.

## 2. Alternatiflerin Karşılaştırılması

### Seçenek A: Standart Cloud VPS (DigitalOcean, Hetzner, Linode)
**En İyisi:** Maliyet, kontrol ve performans dengesi için.
*   **Mimari:** Docker çalıştıran Ubuntu sanal sunucusu.
*   **Güvenlik:** Cloudflared (Tünel) ile port açmadan güvenli erişim VEYA Nginx + Certbot (LetsEncrypt).
*   **Artıları:**
    *   Tam kontrol (Root erişimi).
    *   Sabit, öngörülebilir fiyatlandırma.
    *   Kolay dikey ölçeklendirme (Upgrade).
*   **Eksileri:**
    *   OS güncellemeleri ve güvenliği sizin sorumluluğunuzdadır.
*   **Önerilen Özellikler:** 2-4 vCPU, 4-8GB RAM.
    *   *DigitalOcean*: ~$24/ay civarı.
    *   *Hetzner*: CX31 veya CPX31 - Fiyat/performans lideri (~€7-13/ay).

### Seçenek B: Container-as-a-Service (Google Cloud Run / AWS Fargate)
**En İyisi:** "Server yönetmek istemiyorum" diyenler için.
*   **Artıları:**
    *   Sunucu yönetimi yok.
    *   Kullanılmadığında maliyet sıfıra iner (Scale to zero).
*   **Eksileri:**
    *   **Cold Start:** MFA imajı büyüktür; ilk istekte servisin ayağa kalkması 10-20 saniye sürebilir.
    *   **Disk Sorunu:** Kalıcı disk yoktur (Ephemeral). Geçici dosyalar /tmp altında tutulabilir ama hafıza limitine takılabilir.
    *   **Maliyet:** İşlemci sürekli çalıştığında VPS'ten daha pahalıya gelebilir.
    *   **Zaman Aşımı:** Cloud Run'da maksimum işlem süresi (60 dk) sınırı vardır.

### Seçenek C: Dedicated Sunucu (Hetzner Auction / OVH)
**En İyisi:** Çok yüksek hacimli prodüksiyon işleri için.
*   **Artıları:**
    *   Maksimum performans (Sanallaştırma katmanı yok).
    *   Devasa RAM/Disk alanı.
*   **Eksileri:**
    *   Kişisel/orta ölçekli proje için gereğinden fazla (Overkill).
    *   Başlangıç maliyeti daha yüksek (~€30+/ay).

## 3. Önerilen Yaklaşım: Seçenek A (Hetzner veya DigitalOcean VPS)

LingRoot projesi için **Standart VPS** en mantıklı adımdır. Mevcut lokal Docker yapınızı neredeyse birebir kopyalayarak çalıştırabilirsiniz.

### Öneri: Hetzner Cloud (CPX31 Modeli)
Avrupa lokasyonlu, CPU performansı yüksek ve çok uygun maliyetli.
*   **Model:** CPX31 (veya yük az ise CX31)
*   **Özellikler:** 4 vCPU, 8 GB RAM, 80 GB NVMe Disk.
*   **Fiyat:** Yaklaşık €13/ay (CX31 ise ~€6).
*   **Lokasyon:** Almanya veya Finlandiya.

### Önerilen Kurulum Mimarisi
1.  **Sunucu:** Ubuntu 22.04 / 24.04 LTS.
2.  **Servis:** Docker içinde `lingroot-mfa-service`.
3.  **Dışa Açılım (Erişim):**
    *   **Yöntem 1 (Önerilen - En Kolay):** **Cloudflared Tünel**. Şu an lokalde yaptığınız gibi, sunucuya `cloudflared` kurup aynı hesabı bağlayın. Port açmaya, SSL sertifikasıyla uğraşmaya gerek kalmaz.
    *   **Yöntem 2:** Nginx Reverse Proxy + SSL (LetsEncrypt).

## 4. Taşıma Adımları (Migration Steps)

### 1. Sunucu Hazırlığı
- [ ] VPS kirala (örn. Hetzner).
- [ ] Sunucuya SSH ile bağlan.
- [ ] Docker ve Docker Compose kurulumunu yap.

### 2. Kod ve Model Transferi
- [ ] Projeyi sunucuya çek (Git clone).
- [ ] `.env` dosyasını oluştur.
- [ ] `mfa-models` klasörünü sunucuya indir (veya Docker volume ile bağla).

### 3. Servisi Başlatma
```bash
docker compose up -d --build
```

### 4. Geçiş (Switch Over)
- [ ] LingRoot backend `.env` dosyasını güncelle:
    ```ini
    MFA_SERVICE_URL=https://yeni-vps-adresiniz.com
    ```
- [ ] Test et.

## 5. Tahmini Aylık Maliyet
| Kalem | Hetzner (Önerilen) | DigitalOcean |
| :--- | :--- | :--- |
| Sunucu (4vCPU/8GB) | ~€13 | ~$48 |
| Trafik | 20TB Ücretsiz | 4-5TB |
| **Toplam** | **~€13** | **~$48** |
