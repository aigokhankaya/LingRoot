-- Migration: 0071_logistics_vocabulary_seed_part4.sql
-- Lojistik Sektörü - İletişim Kalıpları ve Ek Kelimeler

DO $$
DECLARE
    logistics_sector_id INT;
BEGIN
    SELECT id INTO logistics_sector_id FROM sectors WHERE code = 'logistics';
    
    IF logistics_sector_id IS NULL THEN
        RAISE NOTICE 'Logistics sector not found.';
        RETURN;
    END IF;

    -- =====================================================
    -- KATEGORI 10: DAHA FAZLA IS INGILIZCESI (100 kelime)
    -- =====================================================
    
    INSERT INTO sector_vocabulary (sector_id, word, pronunciation, definition_en, definition_tr, example_sentence, example_sentence_tr, category, cefr_level, frequency_rank) VALUES
    (logistics_sector_id, 'Urgent', 'ˈɜːdʒənt', 'Requiring immediate action', 'Acil eylem gerektiren', 'This shipment is urgent.', 'Bu sevkiyat acil.', 'business', 'A2', 161),
    (logistics_sector_id, 'Priority', 'praɪˈɒrɪti', 'High importance status', 'Yüksek önem durumu', 'This order has priority.', 'Bu sipariş öncelikli.', 'business', 'B1', 162),
    (logistics_sector_id, 'Deadline', 'ˈdedlaɪn', 'Final date for completion', 'Tamamlanma için son tarih', 'The deadline is Friday.', 'Son tarih Cuma.', 'business', 'A2', 163),
    (logistics_sector_id, 'Capacity', 'kəˈpæsəti', 'Maximum amount that can be handled', 'İşlenebilecek maksimum miktar', 'Warehouse capacity is full.', 'Depo kapasitesi dolu.', 'business', 'B1', 164),
    (logistics_sector_id, 'Availability', 'əˌveɪləˈbɪləti', 'State of being available', 'Mevcut olma durumu', 'Check truck availability.', 'Kamyon müsaitliğini kontrol edin.', 'business', 'B1', 165),
    (logistics_sector_id, 'Requirement', 'rɪˈkwaɪəmənt', 'Something needed or demanded', 'Gereken veya talep edilen şey', 'What are your requirements?', 'Gereksinimleriniz nelerdir?', 'business', 'B1', 166),
    (logistics_sector_id, 'Specification', 'ˌspesɪfɪˈkeɪʃn', 'Detailed description of requirements', 'Gereksinimlerin detaylı açıklaması', 'Please provide specifications.', 'Lütfen spesifikasyonları sağlayın.', 'business', 'B2', 167),
    (logistics_sector_id, 'Documentation', 'ˌdɒkjʊmenˈteɪʃn', 'Official papers and records', 'Resmi belgeler ve kayıtlar', 'All documentation is ready.', 'Tüm belgeler hazır.', 'business', 'B1', 168),
    (logistics_sector_id, 'Compliance', 'kəmˈplaɪəns', 'Following rules and regulations', 'Kural ve düzenlemelere uyum', 'We ensure full compliance.', 'Tam uyum sağlıyoruz.', 'business', 'B2', 169),
    (logistics_sector_id, 'Approval', 'əˈpruːvl', 'Official permission', 'Resmi izin', 'We need approval to proceed.', 'Devam etmek için onay gerekiyor.', 'business', 'B1', 170),
    (logistics_sector_id, 'Authorization', 'ˌɔːθəraɪˈzeɪʃn', 'Permission to do something', 'Bir şeyi yapma izni', 'Authorization is required for release.', 'Çıkış için yetkilendirme gerekli.', 'business', 'B2', 171),
    (logistics_sector_id, 'Notification', 'ˌnəʊtɪfɪˈkeɪʃn', 'Official message or notice', 'Resmi mesaj veya bildirim', 'Send notification of arrival.', 'Varış bildirimi gönderin.', 'business', 'B1', 172),
    (logistics_sector_id, 'Update', 'ˈʌpdeɪt', 'New information about status', 'Durum hakkında yeni bilgi', 'Please provide an update.', 'Lütfen güncelleme sağlayın.', 'business', 'A2', 173),
    (logistics_sector_id, 'Inquiry', 'ɪnˈkwaɪəri', 'Request for information', 'Bilgi talebi', 'Thank you for your inquiry.', 'Sorgunuz için teşekkürler.', 'business', 'B1', 174),
    (logistics_sector_id, 'Response', 'rɪˈspɒns', 'Reply to communication', 'İletişime yanıt', 'We await your response.', 'Yanıtınızı bekliyoruz.', 'business', 'A2', 175),
    (logistics_sector_id, 'Attachment', 'əˈtætʃmənt', 'File sent with email', 'E-posta ile gönderilen dosya', 'Please see attachment.', 'Lütfen eki görün.', 'business', 'A2', 176),
    (logistics_sector_id, 'Reference', 'ˈrefrəns', 'Identification number', 'Kimlik numarası', 'Quote our reference number.', 'Referans numaramızı belirtin.', 'business', 'B1', 177),
    (logistics_sector_id, 'Issue', 'ˈɪʃuː', 'Problem or concern', 'Sorun veya endişe', 'We have an issue with delivery.', 'Teslimatla ilgili sorunumuz var.', 'business', 'A2', 178),
    (logistics_sector_id, 'Resolution', 'ˌrezəˈluːʃn', 'Solution to a problem', 'Soruna çözüm', 'We found a resolution.', 'Bir çözüm bulduk.', 'business', 'B2', 179),
    (logistics_sector_id, 'Escalate', 'ˈeskəleɪt', 'Raise to higher authority', 'Daha yüksek yetkiye iletmek', 'We will escalate this issue.', 'Bu sorunu yükselteceğiz.', 'business', 'B2', 180),
    (logistics_sector_id, 'Feedback', 'ˈfiːdbæk', 'Response about performance', 'Performans hakkında geri bildirim', 'Please provide feedback.', 'Lütfen geri bildirim sağlayın.', 'business', 'A2', 181),
    (logistics_sector_id, 'Report', 'rɪˈpɔːt', 'Formal account of information', 'Resmi bilgi hesabı', 'Send the daily report.', 'Günlük raporu gönderin.', 'business', 'A2', 182),
    (logistics_sector_id, 'Review', 'rɪˈvjuː', 'Examination of something', 'Bir şeyin incelenmesi', 'Let us review the contract.', 'Sözleşmeyi inceleyelim.', 'business', 'B1', 183),
    (logistics_sector_id, 'Process', 'ˈprəʊses', 'Series of actions to achieve result', 'Sonuç elde etmek için eylemler serisi', 'What is your process?', 'Süreciniz nedir?', 'business', 'B1', 184),
    (logistics_sector_id, 'Procedure', 'prəˈsiːdʒə', 'Official way of doing something', 'Bir şeyi yapmanın resmi yolu', 'Follow the standard procedure.', 'Standart prosedürü izleyin.', 'business', 'B1', 185),
    (logistics_sector_id, 'Coordinate', 'kəʊˈɔːdɪneɪt', 'Organize activities together', 'Aktiviteleri birlikte organize etmek', 'We will coordinate with warehouse.', 'Depo ile koordine edeceğiz.', 'business', 'B1', 186),
    (logistics_sector_id, 'Allocate', 'ˈæləkeɪt', 'Assign resources for purpose', 'Amaç için kaynak atamak', 'Allocate a truck for pickup.', 'Alım için kamyon tahsis edin.', 'business', 'B2', 187),
    (logistics_sector_id, 'Optimize', 'ˈɒptɪmaɪz', 'Make as effective as possible', 'Mümkün olduğunca etkili yapmak', 'We optimize routes daily.', 'Rotaları günlük optimize ediyoruz.', 'business', 'B2', 188),
    (logistics_sector_id, 'Consolidate', 'kənˈsɒlɪdeɪt', 'Combine multiple shipments', 'Birden fazla sevkiyatı birleştirmek', 'Consolidate orders for efficiency.', 'Verimlilik için siparişleri konsolide edin.', 'business', 'B2', 189),
    (logistics_sector_id, 'Expedite', 'ˈekspədaɪt', 'Speed up a process', 'Bir süreci hızlandırmak', 'Please expedite this order.', 'Lütfen bu siparişi hızlandırın.', 'business', 'B2', 190)
    ON CONFLICT (sector_id, word) DO NOTHING;

    -- =====================================================
    -- KATEGORI 11: TEKNIK TERIMLER (100 kelime daha)
    -- =====================================================
    
    INSERT INTO sector_vocabulary (sector_id, word, pronunciation, definition_en, definition_tr, example_sentence, example_sentence_tr, category, cefr_level, frequency_rank) VALUES
    (logistics_sector_id, 'Loading', 'ˈləʊdɪŋ', 'Putting goods onto transport', 'Malları taşımaya yerleştirme', 'Loading takes 2 hours.', 'Yükleme 2 saat sürer.', 'operations', 'A2', 191),
    (logistics_sector_id, 'Unloading', 'ʌnˈləʊdɪŋ', 'Removing goods from transport', 'Malları taşımadan çıkarma', 'Unloading is in progress.', 'Boşaltma devam ediyor.', 'operations', 'A2', 192),
    (logistics_sector_id, 'Handling', 'ˈhændlɪŋ', 'Moving and managing goods', 'Malları taşıma ve yönetme', 'Careful handling is required.', 'Dikkatli elleçleme gerekli.', 'operations', 'B1', 193),
    (logistics_sector_id, 'Storage', 'ˈstɔːrɪdʒ', 'Keeping goods in warehouse', 'Malları depoda tutma', 'Storage fees apply after 7 days.', 'Depolama ücretleri 7 günden sonra uygulanır.', 'operations', 'A2', 194),
    (logistics_sector_id, 'Transit', 'ˈtrænzɪt', 'Movement between locations', 'Lokasyonlar arasında hareket', 'Goods are in transit.', 'Mallar transit halinde.', 'operations', 'B1', 195),
    (logistics_sector_id, 'Transshipment', 'trænsˈʃɪpmənt', 'Transfer at intermediate point', 'Ara noktada aktarma', 'Transshipment occurs in Singapore.', 'Aktarma Singapur''da gerçekleşir.', 'operations', 'C1', 196),
    (logistics_sector_id, 'Dispatch', 'dɪˈspætʃ', 'Send goods to destination', 'Malları varış yerine göndermek', 'Dispatch is scheduled for 2 PM.', 'Sevk saat 14:00 için planlandı.', 'operations', 'B1', 197),
    (logistics_sector_id, 'Receipt', 'rɪˈsiːt', 'Document confirming goods received', 'Mal alındığını onaylayan belge', 'Please sign the receipt.', 'Lütfen makbuzu imzalayın.', 'operations', 'A2', 198),
    (logistics_sector_id, 'Manifest', 'ˈmænɪfest', 'List of cargo on transport', 'Taşımadaki kargoların listesi', 'Check the cargo manifest.', 'Kargo manifestosunu kontrol edin.', 'operations', 'B2', 199),
    (logistics_sector_id, 'Booking', 'ˈbʊkɪŋ', 'Reservation for transport space', 'Taşıma alanı rezervasyonu', 'Booking confirmed for next week.', 'Gelecek hafta için rezervasyon onaylandı.', 'operations', 'A2', 200),
    (logistics_sector_id, 'Cutoff', 'ˈkʌtɒf', 'Deadline for accepting cargo', 'Kargo kabul son tarihi', 'Container cutoff is Wednesday.', 'Konteyner kesim Çarşamba.', 'operations', 'B2', 201),
    (logistics_sector_id, 'Release', 'rɪˈliːs', 'Permission to take possession', 'Teslim alma izni', 'Container release is pending.', 'Konteyner çıkışı beklemede.', 'operations', 'B1', 202),
    (logistics_sector_id, 'Clearance', 'ˈklɪərəns', 'Authorization to proceed', 'Devam etme yetkisi', 'Customs clearance is complete.', 'Gümrük temizliği tamamlandı.', 'operations', 'B1', 203),
    (logistics_sector_id, 'Seal', 'siːl', 'Security device on container', 'Konteynerdeki güvenlik cihazı', 'Check the seal number.', 'Mühür numarasını kontrol edin.', 'operations', 'B1', 204),
    (logistics_sector_id, 'Inspection', 'ɪnˈspekʃn', 'Examination of goods', 'Malların incelenmesi', 'Inspection passed successfully.', 'Muayene başarıyla geçildi.', 'operations', 'B1', 205),
    (logistics_sector_id, 'Sorting', 'ˈsɔːtɪŋ', 'Organizing items by category', 'Öğeleri kategoriye göre düzenleme', 'Sorting is done automatically.', 'Sınıflandırma otomatik yapılır.', 'operations', 'B1', 206),
    (logistics_sector_id, 'Labeling', 'ˈleɪblɪŋ', 'Attaching identification tags', 'Kimlik etiketleri takma', 'Proper labeling is essential.', 'Düzgün etiketleme önemlidir.', 'operations', 'B1', 207),
    (logistics_sector_id, 'Scanning', 'ˈskænɪŋ', 'Reading barcodes electronically', 'Barkodları elektronik olarak okuma', 'Scanning updates the system.', 'Tarama sistemi günceller.', 'operations', 'A2', 208),
    (logistics_sector_id, 'Verification', 'ˌverɪfɪˈkeɪʃn', 'Confirming accuracy', 'Doğruluğun onaylanması', 'Quantity verification is required.', 'Miktar doğrulaması gerekli.', 'operations', 'B2', 209),
    (logistics_sector_id, 'Reconciliation', 'ˌrekənsɪlɪˈeɪʃn', 'Matching records with actual', 'Kayıtları gerçekle eşleştirme', 'Monthly reconciliation is done.', 'Aylık mutabakat yapılır.', 'operations', 'C1', 210)
    ON CONFLICT (sector_id, word) DO NOTHING;

    RAISE NOTICE 'Logistics vocabulary seed Part 4 completed: 50 words inserted (total: 210)';
    
END $$;
