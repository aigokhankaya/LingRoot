# AI Geliştirmeleri - User Stories

**Döküman Kodu:** LR-AI-US-2026-Q1  
**Tarih:** 4 Ocak 2026  
**Sprint:** AI Enhancement Sprint 1

---

## 📚 User Story Listesi

### Epic: Kullanıcı Tanıma ve Kişiselleştirme

---

#### US-001: İçerik Geri Bildirim Sistemi
**Rol:** Kullanıcı  
**İstiyorum ki:** Dinlediğim içerikleri beğenip/beğenmediğimi belirteyim  
**Böylece:** Sistem tercihlerimi öğrensin ve daha iyi öneriler sunsun

**Kabul Kriterleri:**
- [ ] Her içeriğin sonunda 👍/👎 butonları görünür
- [ ] Beğenmeme durumunda neden seçenekleri sunulur (Çok zor, Sıkıcı, Çok uzun)
- [ ] Geri bildirim toast mesajı ile onaylanır
- [ ] Liro AI sonraki sohbetlerde bu tercihleri yansıtır

**Story Points:** 5  
**Durum:** ✅ Tamamlandı

---

#### US-002: Kelime Tekrar Sistemi (SRS)
**Rol:** Öğrenci  
**İstiyorum ki:** Öğrendiğim kelimeleri bilimsel yöntemlerle tekrar edeyim  
**Böylece:** Kelimeler uzun süreli hafızama yerleşsin

**Kabul Kriterleri:**
- [ ] İçerik dinlerken kelimeleri öğrenme listesine ekleyebilirim
- [ ] Dashboard'da "Bugün X kelime tekrarın var" bildirimi görürüm
- [ ] Flashcard tarzı tekrar ekranında "Biliyorum/Bilmiyorum" seçebilirim
- [ ] Sistem doğru/yanlış cevaplara göre sonraki tekrar tarihini hesaplar
- [ ] Mastered kelimeler için rozet/kutlama gösterilir

**Story Points:** 8  
**Durum:** ✅ Tamamlandı

---

#### US-003: Konu Ustalık Takibi
**Rol:** Kullanıcı  
**İstiyorum ki:** Bir konuyu ne kadar öğrendiğimi yüzde olarak göreyim  
**Böylece:** Hangi konulara daha fazla çalışmam gerektiğini bileyim

**Kabul Kriterleri:**
- [ ] Konu kartlarında progress bar görünür
- [ ] Yüzde değeri (0-100%) açıkça yazılır
- [ ] 100% tamamlanan konularda "USTA" rozeti görünür
- [ ] Seviye atlama animasyonu oynar

**Story Points:** 5  
**Durum:** ✅ Tamamlandı

---

### Epic: Akıllı İçerik Üretimi

---

#### US-004: Semantik İçerik Önerisi
**Rol:** Kullanıcı  
**İstiyorum ki:** Bana benzer kullanıcıların beğendiği içerikler önerilsin  
**Böylece:** İlgi alanlarıma uygun yeni konular keşfedeyim

**Kabul Kriterleri:**
- [ ] Dashboard'da "Sana Özel Öneriler" bölümü var
- [ ] Öneriler kullanıcı profiline göre kişiselleştirilmiş
- [ ] Her öneride neden önerildiği kısaca açıklanır

**Story Points:** 8  
**Durum:** ✅ Tamamlandı

---

#### US-005: Doğru Alt Konu Üretimi
**Rol:** Kullanıcı  
**İstiyorum ki:** "Türk Devletleri" gibi bir çoğul başlık girdiğimde, sistem devlet isimlerini alt konu olarak üretsin  
**Böylece:** Beklediğim gibi ilgili öğelerin listesini alayım

**Kabul Kriterleri:**
- [ ] Çoğul konularda (X'ler, X'leri) liste mantığıyla alt konular üretilir
- [ ] "İstanbul'un İlçeleri" → Kadıköy, Beşiktaş, Fatih... (kategori değil)
- [ ] Tekil konularda tematik alt konular üretilir (Tarih, Kültür, Ekonomi)

**Story Points:** 3  
**Durum:** ✅ Tamamlandı (Prompt düzeltmesi)

---

### Epic: Stabilite ve Deneyim

---

#### US-006: Seri Günü Kutlamaları
**Rol:** Kullanıcı  
**İstiyorum ki:** Üst üste öğrenme yaptığım günlerde kutlama animasyonları göreyim  
**Böylece:** Motivasyonum artsın ve devam etmek isteyeyim

**Kabul Kriterleri:**
- [ ] 3 günlük seride küçük kutlama
- [ ] 7 günlük seride büyük kutlama + rozet
- [ ] 30 günlük seride premium kutlama

**Story Points:** 3  
**Durum:** ✅ Tamamlandı

---

#### US-007: Self-Healing Mekanizmaları
**Rol:** Sistem  
**İstiyorum ki:** Geçici hatalar otomatik olarak yeniden denensin  
**Böylece:** Kullanıcı deneyimi kesintiye uğramasın

**Kabul Kriterleri:**
- [ ] API hataları 3 kez retry edilir (exponential backoff)
- [ ] 5+ hata sonrası circuit breaker devreye girer
- [ ] Kritik hatalar fallback mekanizmalarına yönlendirilir

**Story Points:** 5  
**Durum:** ✅ Tamamlandı

---

## 📊 Sprint Özeti

| Metrik | Değer |
|--------|-------|
| Toplam Story | 7 |
| Toplam Story Points | 37 |
| Tamamlanan | 7 (100%) |
| Test Bekleyen | 7 |

---

## 🔗 İlgili Dökümanlar

- [Test Planı](./ai-enhancement-test-plan.md)
- [Mimari Döküman](../architecture/ai-enhancement-plan.md)
- [QA Checklist](./qa-checklist.md)
