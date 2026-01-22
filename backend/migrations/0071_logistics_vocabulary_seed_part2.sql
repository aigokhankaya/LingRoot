-- Migration: 0071_logistics_vocabulary_seed_part2.sql
-- Lojistik Sektörü Terminoloji Seed Data - Bölüm 2
-- Gümrük, Belgeler, Incoterms, Akronimler

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
    -- KATEGORI 4: GÜMRÜK VE DIS TICARET BELGELERI (80 kelime)
    -- =====================================================
    
    INSERT INTO sector_vocabulary (sector_id, word, pronunciation, definition_en, definition_tr, example_sentence, example_sentence_tr, category, cefr_level, frequency_rank) VALUES
    (logistics_sector_id, 'Bill of Lading', 'bɪl əv ˈleɪdɪŋ', 'Legal document between shipper and carrier for sea transport', 'Deniz taşımacılığında gönderici ve taşıyıcı arasındaki yasal belge', 'The bill of lading shows 3 containers.', 'Konşimento 3 konteyner gösteriyor.', 'customs', 'B2', 61),
    (logistics_sector_id, 'Air Waybill', 'eə ˈweɪbɪl', 'Transport document for air freight', 'Hava taşımacılığı için taşıma belgesi', 'The air waybill number is 123-45678901.', 'Hava konşimentosu numarası 123-45678901.', 'customs', 'B2', 62),
    (logistics_sector_id, 'CMR', 'siː em ɑː', 'International road transport document', 'Uluslararası kara yolu taşıma belgesi', 'Please provide the CMR for customs.', 'Lütfen gümrük için CMR sağlayın.', 'customs', 'B2', 63),
    (logistics_sector_id, 'Commercial Invoice', 'kəˈmɜːʃl ˈɪnvɔɪs', 'Document showing sale details for customs', 'Gümrük için satış detaylarını gösteren belge', 'The commercial invoice must match the packing list.', 'Ticari fatura çeki listesiyle eşleşmeli.', 'customs', 'B1', 64),
    (logistics_sector_id, 'Packing List', 'ˈpækɪŋ lɪst', 'Detailed list of shipment contents', 'Sevkiyat içeriğinin detaylı listesi', 'The packing list shows 100 cartons.', 'Çeki listesi 100 koli gösteriyor.', 'customs', 'B1', 65),
    (logistics_sector_id, 'Certificate of Origin', 'səˈtɪfɪkət əv ˈɒrɪdʒɪn', 'Document certifying country of manufacture', 'Üretim ülkesini belgeleyen sertifika', 'The certificate of origin is required for preferential tariffs.', 'Tercihli tarifeler için menşe şahadetnamesi gerekli.', 'customs', 'B2', 66),
    (logistics_sector_id, 'Customs Clearance', 'ˈkʌstəmz ˈklɪərəns', 'Process of getting goods through customs', 'Malları gümrükten geçirme süreci', 'Customs clearance takes 2-3 days.', 'Gümrükleme 2-3 gün sürer.', 'customs', 'B2', 67),
    (logistics_sector_id, 'Customs Declaration', 'ˈkʌstəmz ˌdekləˈreɪʃn', 'Form declaring goods imported or exported', 'İthal veya ihraç edilen malları beyan eden form', 'The customs declaration must be accurate.', 'Gümrük beyannamesi doğru olmalı.', 'customs', 'B2', 68),
    (logistics_sector_id, 'Duties', 'ˈdjuːtiz', 'Taxes paid on imported goods', 'İthal mallara ödenen vergiler', 'Import duties are 10% for this product.', 'Bu ürün için ithalat vergileri %10.', 'customs', 'B1', 69),
    (logistics_sector_id, 'Tariff', 'ˈtærɪf', 'Schedule of customs duties', 'Gümrük vergileri tarifesi', 'Check the tariff code for this item.', 'Bu ürün için tarife kodunu kontrol edin.', 'customs', 'B2', 70),
    (logistics_sector_id, 'HS Code', 'eɪtʃ es kəʊd', 'Harmonized System code for classifying goods', 'Malları sınıflandırmak için Armonize Sistem kodu', 'The HS code determines the duty rate.', 'GTİP kodu vergi oranını belirler.', 'customs', 'B2', 71),
    (logistics_sector_id, 'Bonded Warehouse', 'ˈbɒndɪd ˈweəhaʊs', 'Warehouse where goods are stored before customs clearance', 'Gümrükleme öncesi malların depolandığı antrepo', 'Goods can stay in bonded warehouse for 90 days.', 'Mallar antrepoda 90 gün kalabilir.', 'customs', 'C1', 72),
    (logistics_sector_id, 'Free Trade Zone', 'friː treɪd zəʊn', 'Area where goods are exempt from customs duties', 'Malların gümrük vergisinden muaf olduğu alan', 'Our factory is in a free trade zone.', 'Fabrikamız serbest bölgede.', 'customs', 'B2', 73),
    (logistics_sector_id, 'Import License', 'ˈɪmpɔːt ˈlaɪsns', 'Permit required for importing certain goods', 'Belirli malları ithal etmek için gereken izin', 'An import license is needed for this product.', 'Bu ürün için ithalat lisansı gerekli.', 'customs', 'B2', 74),
    (logistics_sector_id, 'Export License', 'ˈekspɔːt ˈlaɪsns', 'Permit required for exporting certain goods', 'Belirli malları ihraç etmek için gereken izin', 'Military equipment requires an export license.', 'Askeri ekipman için ihracat lisansı gerekli.', 'customs', 'B2', 75),
    (logistics_sector_id, 'Quarantine', 'ˈkwɒrəntiːn', 'Isolation period for inspecting goods', 'Malları incelemek için izolasyon süreci', 'Food products require quarantine inspection.', 'Gıda ürünleri karantina incelemesi gerektirir.', 'customs', 'B2', 76),
    (logistics_sector_id, 'Embargo', 'ɪmˈbɑːɡəʊ', 'Official ban on trade with a country', 'Bir ülkeyle ticarete resmi yasak', 'The embargo prohibits all exports.', 'Ambargo tüm ihracatı yasaklar.', 'customs', 'C1', 77),
    (logistics_sector_id, 'Contraband', 'ˈkɒntrəbænd', 'Goods illegally imported or exported', 'Yasadışı olarak ithal veya ihraç edilen mallar', 'Contraband was found in the container.', 'Konteynerde kaçak mal bulundu.', 'customs', 'C1', 78),
    (logistics_sector_id, 'Broker', 'ˈbrəʊkə', 'Agent who handles customs procedures', 'Gümrük prosedürlerini yöneten acente', 'Our customs broker filed the declaration.', 'Gümrük müşavirimiz beyannameyi dosyaladı.', 'customs', 'B1', 79),
    (logistics_sector_id, 'Inspection', 'ɪnˈspekʃn', 'Official examination of goods', 'Malların resmi incelemesi', 'Random inspection was conducted.', 'Rastgele muayene yapıldı.', 'customs', 'B1', 80)
    ON CONFLICT (sector_id, word) DO NOTHING;

    -- =====================================================
    -- KATEGORI 5: INCOTERMS 2020 (40 kelime)
    -- =====================================================
    
    INSERT INTO sector_vocabulary (sector_id, word, pronunciation, definition_en, definition_tr, example_sentence, example_sentence_tr, category, cefr_level, frequency_rank) VALUES
    (logistics_sector_id, 'EXW', 'eks wɜːks', 'Ex Works - seller delivers at their premises', 'İşyerinde Teslim - satıcı kendi tesisinde teslim eder', 'EXW price is $1,000 per unit.', 'EXW fiyatı birim başına 1.000 dolar.', 'incoterms', 'B2', 81),
    (logistics_sector_id, 'FOB', 'ef əʊ biː', 'Free on Board - risk passes when loaded on ship', 'Güvertede Teslim - gemiye yüklendiğinde risk geçer', 'FOB Shanghai port is our standard term.', 'FOB Şanghay limanı standart şartımız.', 'incoterms', 'B2', 82),
    (logistics_sector_id, 'CIF', 'siː aɪ ef', 'Cost Insurance Freight - seller pays freight and insurance', 'Mal Bedeli Sigorta Navlun - satıcı navlun ve sigorta öder', 'CIF includes insurance to destination.', 'CIF varış yerine sigorta dahildir.', 'incoterms', 'B2', 83),
    (logistics_sector_id, 'DDP', 'diː diː piː', 'Delivered Duty Paid - seller delivers cleared goods', 'Gümrük Resmi Ödenmiş Olarak Teslim - satıcı gümrüğü geçmiş mal teslim eder', 'DDP means total landed cost.', 'DDP toplam varış maliyeti demektir.', 'incoterms', 'B2', 84),
    (logistics_sector_id, 'DAP', 'diː eɪ piː', 'Delivered at Place - seller delivers to named place', 'Belirlenen Yerde Teslim - satıcı belirlenen yerde teslim eder', 'DAP warehouse address is required.', 'DAP depo adresi gerekli.', 'incoterms', 'B2', 85),
    (logistics_sector_id, 'FCA', 'ef siː eɪ', 'Free Carrier - seller delivers to carrier at named place', 'Taşıyıcıya Teslim - satıcı belirlenen yerde taşıyıcıya teslim eder', 'FCA factory means we handle pickup.', 'FCA fabrika biz alımı yönetiyoruz demek.', 'incoterms', 'B2', 86),
    (logistics_sector_id, 'CPT', 'siː piː tiː', 'Carriage Paid To - seller pays freight to destination', 'Taşıma Ödenmiş Olarak - satıcı varış yerine navlun öder', 'CPT includes transport to your door.', 'CPT kapınıza taşıma dahildir.', 'incoterms', 'C1', 87),
    (logistics_sector_id, 'CIP', 'siː aɪ piː', 'Carriage and Insurance Paid - includes insurance', 'Taşıma ve Sigorta Ödenmiş - sigorta dahil', 'CIP provides insurance coverage.', 'CIP sigorta teminatı sağlar.', 'incoterms', 'C1', 88),
    (logistics_sector_id, 'DPU', 'diː piː juː', 'Delivered at Place Unloaded - seller unloads at destination', 'Belirlenen Yerde Boşaltılmış Teslim - satıcı varış yerinde boşaltır', 'DPU includes unloading at terminal.', 'DPU terminalde boşaltma dahildir.', 'incoterms', 'C1', 89),
    (logistics_sector_id, 'FAS', 'ef eɪ es', 'Free Alongside Ship - seller places goods alongside vessel', 'Gemi Doğrultusunda Teslim - satıcı malları geminin yanına yerleştirir', 'FAS is used for bulk cargo.', 'FAS dökme yük için kullanılır.', 'incoterms', 'C1', 90),
    (logistics_sector_id, 'CFR', 'siː ef ɑː', 'Cost and Freight - seller pays freight to port', 'Mal Bedeli ve Navlun - satıcı limana navlun öder', 'CFR does not include insurance.', 'CFR sigorta dahil değildir.', 'incoterms', 'B2', 91)
    ON CONFLICT (sector_id, word) DO NOTHING;

    -- =====================================================
    -- KATEGORI 6: AKRONIMLER VE KISALTMALAR (100 kelime)
    -- =====================================================
    
    INSERT INTO sector_vocabulary (sector_id, word, pronunciation, definition_en, definition_tr, example_sentence, example_sentence_tr, category, cefr_level, frequency_rank) VALUES
    (logistics_sector_id, 'ETA', 'iː tiː eɪ', 'Estimated Time of Arrival', 'Tahmini Varış Zamanı', 'ETA is tomorrow at 14:00.', 'TVZ yarın saat 14:00.', 'acronyms', 'A2', 92),
    (logistics_sector_id, 'ETD', 'iː tiː diː', 'Estimated Time of Departure', 'Tahmini Kalkış Zamanı', 'ETD from Shanghai is Monday.', 'Şanghay''dan TKZ Pazartesi.', 'acronyms', 'A2', 93),
    (logistics_sector_id, 'ATA', 'eɪ tiː eɪ', 'Actual Time of Arrival', 'Gerçek Varış Zamanı', 'ATA was 15:30 local time.', 'GVZ yerel saatle 15:30 idi.', 'acronyms', 'B1', 94),
    (logistics_sector_id, 'ATD', 'eɪ tiː diː', 'Actual Time of Departure', 'Gerçek Kalkış Zamanı', 'ATD confirmed as 08:00.', 'GKZ 08:00 olarak onaylandı.', 'acronyms', 'B1', 95),
    (logistics_sector_id, 'POD', 'piː əʊ diː', 'Proof of Delivery', 'Teslimat Kanıtı', 'Please send the signed POD.', 'Lütfen imzalı teslimat kanıtını gönderin.', 'acronyms', 'B1', 96),
    (logistics_sector_id, 'ASN', 'eɪ es en', 'Advanced Shipment Notice', 'Ön Sevk İhbarı', 'Send ASN 48 hours before delivery.', 'Teslimattan 48 saat önce ASN gönderin.', 'acronyms', 'B2', 97),
    (logistics_sector_id, 'EDI', 'iː diː aɪ', 'Electronic Data Interchange', 'Elektronik Veri Değişimi', 'We use EDI for all orders.', 'Tüm siparişler için EDI kullanıyoruz.', 'acronyms', 'B2', 98),
    (logistics_sector_id, 'TMS', 'tiː em es', 'Transportation Management System', 'Taşıma Yönetim Sistemi', 'Our TMS optimizes routes.', 'TMS''imiz rotaları optimize eder.', 'acronyms', 'B2', 99),
    (logistics_sector_id, 'RFID', 'ɑː ef aɪ diː', 'Radio Frequency Identification', 'Radyo Frekanslı Tanımlama', 'RFID tags track each pallet.', 'RFID etiketleri her paleti izler.', 'acronyms', 'B2', 100),
    (logistics_sector_id, 'GPS', 'dʒiː piː es', 'Global Positioning System', 'Küresel Konumlama Sistemi', 'GPS tracking is standard on all trucks.', 'GPS takibi tüm kamyonlarda standart.', 'acronyms', 'A2', 101),
    (logistics_sector_id, 'BAF', 'biː eɪ ef', 'Bunker Adjustment Factor - fuel surcharge', 'Yakıt Fiyat Ayarlama Faktörü', 'BAF increased due to oil prices.', 'Petrol fiyatları nedeniyle BAF arttı.', 'acronyms', 'C1', 102),
    (logistics_sector_id, 'CAF', 'siː eɪ ef', 'Currency Adjustment Factor', 'Döviz Kuru Ayarlama Faktörü', 'CAF is applied monthly.', 'CAF aylık olarak uygulanır.', 'acronyms', 'C1', 103),
    (logistics_sector_id, 'GRI', 'dʒiː ɑː aɪ', 'General Rate Increase', 'Genel Fiyat Artışı', 'GRI takes effect January 1st.', 'GFİ 1 Ocak''ta yürürlüğe girer.', 'acronyms', 'B2', 104),
    (logistics_sector_id, 'THC', 'tiː eɪtʃ siː', 'Terminal Handling Charges', 'Terminal Elleçleme Ücretleri', 'THC is $150 per container.', 'TEÜ konteyner başına 150 dolar.', 'acronyms', 'B2', 105),
    (logistics_sector_id, 'D/O', 'diː əʊ', 'Delivery Order - release document', 'Teslim Emri - çıkış belgesi', 'Collect the D/O from shipping line.', 'Armatörden ordinoyu alın.', 'acronyms', 'B2', 106),
    (logistics_sector_id, 'B/L', 'biː el', 'Bill of Lading abbreviation', 'Konşimento kısaltması', 'Please courier the original B/L.', 'Lütfen orijinal konşimentoyu kurye ile gönderin.', 'acronyms', 'B2', 107),
    (logistics_sector_id, 'AWB', 'eɪ dʌbljuː biː', 'Air Waybill abbreviation', 'Hava Konşimentosu kısaltması', 'The AWB number is required for tracking.', 'Takip için AWB numarası gerekli.', 'acronyms', 'B2', 108),
    (logistics_sector_id, 'TONU', 'təʊnjuː', 'Truck Ordered Not Used - no-show fee', 'Araç İstendi Kullanılmadı - gelmeme ücreti', 'TONU charges apply if not cancelled 24h ahead.', '24 saat önceden iptal edilmezse TONU ücreti uygulanır.', 'acronyms', 'C1', 109),
    (logistics_sector_id, 'Demurrage', 'dɪˈmʌrɪdʒ', 'Charge for exceeding free time at port', 'Limanda ücretsiz süreyi aşma ücreti', 'Demurrage is $100 per day.', 'Demuraj günlük 100 dolar.', 'acronyms', 'B2', 110),
    (logistics_sector_id, 'Detention', 'dɪˈtenʃn', 'Charge for keeping container beyond free time', 'Konteyneri ücretsiz süre dışında tutma ücreti', 'Detention starts after 5 free days.', 'Tutma 5 ücretsiz günden sonra başlar.', 'acronyms', 'B2', 111)
    ON CONFLICT (sector_id, word) DO NOTHING;

    RAISE NOTICE 'Logistics vocabulary seed Part 2 completed: 51 words inserted (total: 111)';
    
END $$;
