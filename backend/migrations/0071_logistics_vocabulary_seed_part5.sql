-- Migration: 0071_logistics_vocabulary_seed_part5.sql
-- Lojistik Sektörü Terminoloji Seed Data - Bölüm 5
-- Ek 100+ Kelime (Toplam 310+ kelimeye ulaşmak için)

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
    -- KATEGORI 12: OZEL KARGO VE TEHLIKELI MADDELER
    -- =====================================================
    
    INSERT INTO sector_vocabulary (sector_id, word, pronunciation, definition_en, definition_tr, example_sentence, example_sentence_tr, category, cefr_level, frequency_rank) VALUES
    (logistics_sector_id, 'Hazmat', 'ˈhæzmæt', 'Hazardous materials', 'Tehlikeli maddeler', 'Hazmat shipments require special permits.', 'Tehlikeli madde sevkiyatları özel izin gerektirir.', 'special_cargo', 'B2', 211),
    (logistics_sector_id, 'DG', 'diː dʒiː', 'Dangerous Goods', 'Tehlikeli Mallar', 'DG classification is mandatory.', 'TM sınıflandırması zorunludur.', 'special_cargo', 'B2', 212),
    (logistics_sector_id, 'Flammable', 'ˈflæməbl', 'Easily catches fire', 'Kolay alev alan', 'Flammable goods require special handling.', 'Yanıcı mallar özel elleçleme gerektirir.', 'special_cargo', 'B1', 213),
    (logistics_sector_id, 'Fragile', 'ˈfrædʒaɪl', 'Easily broken', 'Kolay kırılan', 'Mark the box as fragile.', 'Kutuyu kırılgan olarak işaretleyin.', 'special_cargo', 'A2', 214),
    (logistics_sector_id, 'Perishable', 'ˈperɪʃəbl', 'Subject to decay', 'Bozulmaya açık', 'Perishable goods need temperature control.', 'Bozulabilir ürünler sıcaklık kontrolü gerektirir.', 'special_cargo', 'B2', 215),
    (logistics_sector_id, 'Cold Chain', 'kəʊld tʃeɪn', 'Temperature-controlled supply chain', 'Sıcaklık kontrollü tedarik zinciri', 'Cold chain is critical for vaccines.', 'Soğuk zincir aşılar için kritiktir.', 'special_cargo', 'C1', 216),
    (logistics_sector_id, 'MSDS', 'em es diː es', 'Material Safety Data Sheet', 'Malzeme Güvenlik Veri Formu', 'Provide MSDS for all chemicals.', 'Tüm kimyasallar için MGVF sağlayın.', 'special_cargo', 'C1', 217),
    (logistics_sector_id, 'IMO Class', 'aɪ em əʊ klɑːs', 'International Maritime Organization hazard class', 'Uluslararası Denizcilik Örgütü tehlike sınıfı', 'IMO Class 3 is for flammable liquids.', 'IMO Sınıf 3 yanıcı sıvılar içindir.', 'special_cargo', 'C1', 218),
    (logistics_sector_id, 'UN Number', 'juː en ˈnʌmbə', 'Four-digit code for dangerous goods', 'Tehlikeli mallar için dört haneli kod', 'The UN number identifies the substance.', 'UN numarası maddeyi tanımlar.', 'special_cargo', 'C1', 219),
    (logistics_sector_id, 'Project Cargo', 'ˈprɒdʒekt ˈkɑːɡəʊ', 'Large industrial equipment shipments', 'Büyük endüstriyel ekipman sevkiyatları', 'Project cargo requires special planning.', 'Proje kargosu özel planlama gerektirir.', 'special_cargo', 'C1', 220)
    ON CONFLICT (sector_id, word) DO NOTHING;

    -- =====================================================
    -- KATEGORI 13: LIMAN VE TERMINAL TERIMLERI
    -- =====================================================
    
    INSERT INTO sector_vocabulary (sector_id, word, pronunciation, definition_en, definition_tr, example_sentence, example_sentence_tr, category, cefr_level, frequency_rank) VALUES
    (logistics_sector_id, 'Port', 'pɔːt', 'Harbor for loading and unloading ships', 'Gemilerin yüklenip boşaltıldığı liman', 'The port handles 5 million TEU annually.', 'Liman yıllık 5 milyon TEU elleçler.', 'terminal', 'A2', 221),
    (logistics_sector_id, 'Terminal', 'ˈtɜːmɪnl', 'Facility for handling cargo', 'Kargo elleçleme tesisi', 'Container terminal is open 24/7.', 'Konteyner terminali 7/24 açık.', 'terminal', 'B1', 222),
    (logistics_sector_id, 'Berth', 'bɜːθ', 'Docking space for ships', 'Gemiler için yanaşma yeri', 'The vessel is at berth 5.', 'Gemi 5 numaralı rıhtımda.', 'terminal', 'B2', 223),
    (logistics_sector_id, 'Quay', 'kiː', 'Platform for loading ships', 'Gemilerin yüklenmesi için platform', 'Cranes operate along the quay.', 'Vinçler rıhtım boyunca çalışır.', 'terminal', 'B2', 224),
    (logistics_sector_id, 'Dock', 'dɒk', 'Area where ships are loaded', 'Gemilerin yüklendiği alan', 'Trucks line up at the dock.', 'Kamyonlar iskelede sıraya girer.', 'terminal', 'B1', 225),
    (logistics_sector_id, 'Yard', 'jɑːd', 'Container storage area at terminal', 'Terminaldeki konteyner depolama alanı', 'The container is in the yard.', 'Konteyner sahada.', 'terminal', 'B1', 226),
    (logistics_sector_id, 'Gate', 'ɡeɪt', 'Entry and exit point at terminal', 'Terminaldeki giriş ve çıkış noktası', 'Gate hours are 6 AM to 10 PM.', 'Kapı saatleri 06:00-22:00.', 'terminal', 'A2', 227),
    (logistics_sector_id, 'Crane', 'kreɪn', 'Equipment for lifting containers', 'Konteynerleri kaldıran ekipman', 'The crane lifts 40 containers per hour.', 'Vinç saatte 40 konteyner kaldırır.', 'terminal', 'B1', 228),
    (logistics_sector_id, 'Gantry', 'ˈɡæntri', 'Large crane for ship-to-shore operations', 'Gemiden karaya operasyonlar için büyük vinç', 'Gantry cranes unload the vessel.', 'Köprü vinçleri gemiyi boşaltır.', 'terminal', 'C1', 229),
    (logistics_sector_id, 'Straddle Carrier', 'ˈstrædl ˈkæriə', 'Vehicle that moves containers in yard', 'Sahada konteyner taşıyan araç', 'Straddle carriers stack containers.', 'Ayaklı taşıyıcılar konteynerleri istifler.', 'terminal', 'C1', 230)
    ON CONFLICT (sector_id, word) DO NOTHING;

    -- =====================================================
    -- KATEGORI 14: SIGORTA VE RISK YONETIMI
    -- =====================================================
    
    INSERT INTO sector_vocabulary (sector_id, word, pronunciation, definition_en, definition_tr, example_sentence, example_sentence_tr, category, cefr_level, frequency_rank) VALUES
    (logistics_sector_id, 'Marine Insurance', 'məˈriːn ɪnˈʃʊərəns', 'Insurance for sea cargo', 'Deniz kargosu sigortası', 'Marine insurance covers all risks.', 'Deniz sigortası tüm riskleri kapsar.', 'insurance', 'B2', 231),
    (logistics_sector_id, 'All Risk', 'ɔːl rɪsk', 'Comprehensive insurance coverage', 'Kapsamlı sigorta teminatı', 'We recommend all risk coverage.', 'Tüm risk teminatı öneriyoruz.', 'insurance', 'B2', 232),
    (logistics_sector_id, 'Total Loss', 'ˈtəʊtl lɒs', 'Complete destruction of goods', 'Malların tamamen tahribi', 'The cargo was declared total loss.', 'Kargo tam hasar ilan edildi.', 'insurance', 'B2', 233),
    (logistics_sector_id, 'Partial Loss', 'ˈpɑːʃl lɒs', 'Damage to part of shipment', 'Sevkiyatın bir kısmına hasar', 'Insurance covers partial loss.', 'Sigorta kısmi hasarı kapsar.', 'insurance', 'B2', 234),
    (logistics_sector_id, 'General Average', 'ˈdʒenərəl ˈævərɪdʒ', 'Shared loss in maritime emergency', 'Deniz acil durumunda paylaşılan hasar', 'General average was declared.', 'Müşterek avarya ilan edildi.', 'insurance', 'C1', 235),
    (logistics_sector_id, 'Premium', 'ˈpriːmiəm', 'Cost of insurance', 'Sigorta maliyeti', 'Insurance premium is 0.5% of cargo value.', 'Sigorta primi kargo değerinin %0.5''i.', 'insurance', 'B1', 236),
    (logistics_sector_id, 'Deductible', 'dɪˈdʌktəbl', 'Amount not covered by insurance', 'Sigorta tarafından karşılanmayan miktar', 'Deductible is $500 per claim.', 'Muafiyet talep başına 500 dolar.', 'insurance', 'B2', 237),
    (logistics_sector_id, 'Liability', 'ˌlaɪəˈbɪləti', 'Legal responsibility for losses', 'Kayıplar için yasal sorumluluk', 'Carrier liability is limited.', 'Taşıyıcı sorumluluğu sınırlıdır.', 'insurance', 'B2', 238),
    (logistics_sector_id, 'Indemnity', 'ɪnˈdemnɪti', 'Compensation for losses', 'Kayıplar için tazminat', 'Indemnity was paid within 30 days.', 'Tazminat 30 gün içinde ödendi.', 'insurance', 'C1', 239),
    (logistics_sector_id, 'Subrogation', 'ˌsʌbrəˈɡeɪʃn', 'Insurer taking over claim rights', 'Sigortacının talep haklarını devralması', 'Subrogation allows recovery from carrier.', 'Haleflik taşıyıcıdan tahsilatı sağlar.', 'insurance', 'C1', 240)
    ON CONFLICT (sector_id, word) DO NOTHING;

    -- =====================================================
    -- KATEGORI 15: E-TICARET LOJISTIGI
    -- =====================================================
    
    INSERT INTO sector_vocabulary (sector_id, word, pronunciation, definition_en, definition_tr, example_sentence, example_sentence_tr, category, cefr_level, frequency_rank) VALUES
    (logistics_sector_id, 'Order Fulfillment', 'ˈɔːdə fʊlˈfɪlmənt', 'Processing online orders', 'Online siparişlerin işlenmesi', 'Order fulfillment takes 24 hours.', 'Sipariş karşılama 24 saat sürer.', 'ecommerce', 'B2', 241),
    (logistics_sector_id, 'Same-Day Delivery', 'seɪm deɪ dɪˈlɪvəri', 'Delivery on the order date', 'Sipariş günü teslimat', 'Same-day delivery is available in cities.', 'Aynı gün teslimat şehirlerde mevcut.', 'ecommerce', 'B1', 242),
    (logistics_sector_id, 'Next-Day Delivery', 'nekst deɪ dɪˈlɪvəri', 'Delivery by next business day', 'Sonraki iş gününe kadar teslimat', 'Next-day delivery costs extra.', 'Ertesi gün teslimat ekstra ücretlidir.', 'ecommerce', 'A2', 243),
    (logistics_sector_id, 'Click and Collect', 'klɪk ænd kəˈlekt', 'Order online, pick up in store', 'Online sipariş ver, mağazadan al', 'Click and collect is free.', 'Tıkla ve topla ücretsizdir.', 'ecommerce', 'B1', 244),
    (logistics_sector_id, 'Return', 'rɪˈtɜːn', 'Sending product back to seller', 'Ürünü satıcıya geri gönderme', 'Free returns within 30 days.', '30 gün içinde ücretsiz iade.', 'ecommerce', 'A2', 245),
    (logistics_sector_id, 'Parcel', 'ˈpɑːsl', 'Small package for delivery', 'Teslimat için küçük paket', 'Your parcel has been dispatched.', 'Paketiniz gönderildi.', 'ecommerce', 'A2', 246),
    (logistics_sector_id, 'Courier', 'ˈkʊriə', 'Person or company delivering parcels', 'Paket teslim eden kişi veya şirket', 'The courier will arrive at 3 PM.', 'Kurye saat 15:00''te gelecek.', 'ecommerce', 'A2', 247),
    (logistics_sector_id, 'Locker', 'ˈlɒkə', 'Self-service parcel pickup point', 'Self-servis paket teslim noktası', 'Pick up from the locker near you.', 'Yakınınızdaki dolaptan alın.', 'ecommerce', 'B1', 248),
    (logistics_sector_id, 'Out for Delivery', 'aʊt fə dɪˈlɪvəri', 'Package is being delivered', 'Paket teslimat için yolda', 'Status: out for delivery.', 'Durum: dağıtımda.', 'ecommerce', 'A2', 249),
    (logistics_sector_id, 'Undeliverable', 'ˌʌndɪˈlɪvərəbl', 'Cannot be delivered', 'Teslim edilemez', 'Package returned as undeliverable.', 'Paket teslim edilemez olarak iade edildi.', 'ecommerce', 'B1', 250)
    ON CONFLICT (sector_id, word) DO NOTHING;

    -- =====================================================
    -- KATEGORI 16: SÖZLEŞME VE HUKUK TERIMLERI
    -- =====================================================
    
    INSERT INTO sector_vocabulary (sector_id, word, pronunciation, definition_en, definition_tr, example_sentence, example_sentence_tr, category, cefr_level, frequency_rank) VALUES
    (logistics_sector_id, 'Contract', 'ˈkɒntrækt', 'Legal agreement between parties', 'Taraflar arasındaki yasal anlaşma', 'We signed a 3-year contract.', '3 yıllık sözleşme imzaladık.', 'legal', 'B1', 251),
    (logistics_sector_id, 'Terms and Conditions', 'tɜːmz ænd kənˈdɪʃnz', 'Rules governing agreement', 'Anlaşmayı yöneten kurallar', 'Please read terms and conditions.', 'Lütfen şartlar ve koşulları okuyun.', 'legal', 'B1', 252),
    (logistics_sector_id, 'Force Majeure', 'fɔːs maˈʒɜː', 'Unforeseeable circumstances preventing fulfillment', 'Yerine getirmeyi engelleyen öngörülemeyen koşullar', 'Force majeure clause applies.', 'Mücbir sebep maddesi uygulanır.', 'legal', 'C1', 253),
    (logistics_sector_id, 'Breach', 'briːtʃ', 'Violation of contract terms', 'Sözleşme şartlarının ihlali', 'This is a breach of contract.', 'Bu sözleşme ihlalidir.', 'legal', 'B2', 254),
    (logistics_sector_id, 'Penalty', 'ˈpenəlti', 'Fee for not meeting obligations', 'Yükümlülükleri karşılamamak için ücret', 'Late delivery penalty is 1% per day.', 'Geç teslimat cezası günlük %1.', 'legal', 'B1', 255),
    (logistics_sector_id, 'Arbitration', 'ˌɑːbɪˈtreɪʃn', 'Dispute resolution outside court', 'Mahkeme dışı uyuşmazlık çözümü', 'Disputes are settled by arbitration.', 'Uyuşmazlıklar tahkim ile çözülür.', 'legal', 'C1', 256),
    (logistics_sector_id, 'Jurisdiction', 'ˌdʒʊərɪsˈdɪkʃn', 'Legal authority over disputes', 'Uyuşmazlıklar üzerinde yasal yetki', 'English courts have jurisdiction.', 'İngiliz mahkemeleri yetkilidir.', 'legal', 'C1', 257),
    (logistics_sector_id, 'Indemnification', 'ɪnˌdemnɪfɪˈkeɪʃn', 'Protection against losses', 'Kayıplara karşı koruma', 'Indemnification clause is included.', 'Tazminat maddesi dahildir.', 'legal', 'C1', 258),
    (logistics_sector_id, 'Waiver', 'ˈweɪvə', 'Giving up a right', 'Bir haktan vazgeçme', 'No waiver of liability.', 'Sorumluluktan feragat yok.', 'legal', 'B2', 259),
    (logistics_sector_id, 'Amendment', 'əˈmendmənt', 'Change to contract', 'Sözleşmede değişiklik', 'Amendment requires written consent.', 'Değişiklik yazılı onay gerektirir.', 'legal', 'B2', 260)
    ON CONFLICT (sector_id, word) DO NOTHING;

    RAISE NOTICE 'Logistics vocabulary seed Part 5 completed: 50 words inserted (total: 260)';
    
END $$;
