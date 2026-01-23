-- Migration: 0071_logistics_vocabulary_seed_part3.sql
-- Lojistik Sektörü Terminoloji Seed Data - Bölüm 3
-- Ağırlık/Ölçü, Hizmet Modelleri, Genel İş İngilizcesi

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
    -- KATEGORI 7: AGIRLIK VE OLCU BIRIMLERI (50 kelime)
    -- =====================================================
    
    INSERT INTO sector_vocabulary (sector_id, word, pronunciation, definition_en, definition_tr, example_sentence, example_sentence_tr, category, cefr_level, frequency_rank) VALUES
    (logistics_sector_id, 'Gross Weight', 'ɡrəʊs weɪt', 'Total weight including packaging', 'Ambalaj dahil toplam ağırlık', 'Gross weight is 25 kg per carton.', 'Brüt ağırlık koli başına 25 kg.', 'measurements', 'B1', 112),
    (logistics_sector_id, 'Net Weight', 'net weɪt', 'Weight of goods without packaging', 'Ambalaj hariç mal ağırlığı', 'Net weight is 22 kg per carton.', 'Net ağırlık koli başına 22 kg.', 'measurements', 'B1', 113),
    (logistics_sector_id, 'Tare Weight', 'teə weɪt', 'Weight of empty container or vehicle', 'Boş konteyner veya araç ağırlığı', 'Container tare weight is 2,300 kg.', 'Konteyner dara ağırlığı 2.300 kg.', 'measurements', 'B2', 114),
    (logistics_sector_id, 'Chargeable Weight', 'ˈtʃɑːdʒəbl weɪt', 'Weight used for billing (actual or volumetric)', 'Faturalama için kullanılan ağırlık (gerçek veya hacimsel)', 'Chargeable weight is the higher of actual or volumetric.', 'Ücretlendirilebilir ağırlık gerçek veya hacimselinden yüksek olanıdır.', 'measurements', 'C1', 115),
    (logistics_sector_id, 'Volumetric Weight', 'ˌvɒljʊˈmetrɪk weɪt', 'Weight calculated from dimensions', 'Boyutlardan hesaplanan ağırlık', 'Volumetric weight formula is L x W x H / 5000.', 'Hacimsel ağırlık formülü U x G x Y / 5000.', 'measurements', 'B2', 116),
    (logistics_sector_id, 'CBM', 'siː biː em', 'Cubic Meter - volume measurement', 'Metreküp - hacim ölçüsü', 'The shipment is 15 CBM.', 'Sevkiyat 15 CBM.', 'measurements', 'B1', 117),
    (logistics_sector_id, 'Ldm', 'el diː em', 'Loading Meter - truck floor space', 'Yükleme Metresi - kamyon zemin alanı', 'We need 6 Ldm for this load.', 'Bu yük için 6 Ldm gerekiyor.', 'measurements', 'B2', 118),
    (logistics_sector_id, 'Payload', 'ˈpeɪləʊd', 'Maximum cargo weight capacity', 'Maksimum kargo ağırlık kapasitesi', 'Truck payload is 24 tons.', 'Kamyon yük kapasitesi 24 ton.', 'measurements', 'B2', 119),
    (logistics_sector_id, 'Deadweight', 'ˈdedweɪt', 'Total weight a ship can carry', 'Bir geminin taşıyabileceği toplam ağırlık', 'The vessel has 50,000 DWT capacity.', 'Geminin 50.000 DWT kapasitesi var.', 'measurements', 'C1', 120),
    (logistics_sector_id, 'Dimensions', 'daɪˈmenʃnz', 'Length, width, and height measurements', 'Uzunluk, genişlik ve yükseklik ölçüleri', 'Please provide exact dimensions.', 'Lütfen tam boyutları sağlayın.', 'measurements', 'A2', 121),
    (logistics_sector_id, 'Stackable', 'ˈstækəbl', 'Able to be stacked on top of other goods', 'Diğer malların üzerine istiflenmesine uygun', 'These pallets are stackable.', 'Bu paletler istiflenebilir.', 'measurements', 'B1', 122),
    (logistics_sector_id, 'Non-stackable', 'nɒn ˈstækəbl', 'Cannot be stacked due to fragility', 'Kırılganlık nedeniyle istiflenemez', 'Fragile items are non-stackable.', 'Kırılgan ürünler istiflenemez.', 'measurements', 'B2', 123),
    (logistics_sector_id, 'Overweight', 'ˈəʊvəweɪt', 'Exceeding maximum weight limits', 'Maksimum ağırlık limitlerini aşan', 'Overweight containers incur penalties.', 'Aşırı ağır konteynerler ceza alır.', 'measurements', 'B1', 124),
    (logistics_sector_id, 'Oversized', 'ˈəʊvəsaɪzd', 'Exceeding standard dimensions', 'Standart boyutları aşan', 'Oversized cargo requires special permits.', 'Aşırı boyutlu kargo özel izin gerektirir.', 'measurements', 'B1', 125)
    ON CONFLICT (sector_id, word) DO NOTHING;

    -- =====================================================
    -- KATEGORI 8: HIZMET MODELLERI (25 kelime)
    -- =====================================================
    
    INSERT INTO sector_vocabulary (sector_id, word, pronunciation, definition_en, definition_tr, example_sentence, example_sentence_tr, category, cefr_level, frequency_rank) VALUES
    (logistics_sector_id, '1PL', 'wʌn piː el', 'First-party logistics - company handles own logistics', 'Birinci parti lojistik - şirket kendi lojistiğini yönetir', 'Small businesses often use 1PL.', 'Küçük işletmeler genellikle 1PL kullanır.', 'service_models', 'C1', 126),
    (logistics_sector_id, '2PL', 'tuː piː el', 'Second-party logistics - asset-based transport provider', 'İkinci parti lojistik - varlık tabanlı taşıma sağlayıcı', 'We contracted a 2PL for trucking.', 'Kamyon taşımacılığı için 2PL anlaştık.', 'service_models', 'C1', 127),
    (logistics_sector_id, '3PL', 'θriː piː el', 'Third-party logistics - outsourced logistics operations', 'Üçüncü parti lojistik - dış kaynaklı lojistik operasyonlar', 'Our 3PL handles warehousing and shipping.', '3PL''imiz depolama ve sevkiyatı yönetir.', 'service_models', 'B2', 128),
    (logistics_sector_id, '4PL', 'fɔː piː el', 'Fourth-party logistics - supply chain integrator', 'Dördüncü parti lojistik - tedarik zinciri entegratörü', 'A 4PL manages our entire supply chain.', 'Bir 4PL tüm tedarik zincirimizi yönetir.', 'service_models', 'C1', 129),
    (logistics_sector_id, '5PL', 'faɪv piː el', 'Fifth-party logistics - technology-focused aggregator', 'Beşinci parti lojistik - teknoloji odaklı toplayıcı', '5PLs use AI and blockchain.', '5PL''ler yapay zeka ve blokzincir kullanır.', 'service_models', 'C1', 130),
    (logistics_sector_id, 'Fulfillment', 'fʊlˈfɪlmənt', 'Complete order processing and delivery service', 'Tam sipariş işleme ve teslimat hizmeti', 'We use a fulfillment center for e-commerce.', 'E-ticaret için fulfillment merkezi kullanıyoruz.', 'service_models', 'B2', 131),
    (logistics_sector_id, 'Last Mile', 'lɑːst maɪl', 'Final leg of delivery to end customer', 'Son müşteriye teslimatın son ayağı', 'Last mile delivery is the most expensive.', 'Son kilometre teslimatı en pahalısıdır.', 'service_models', 'B2', 132),
    (logistics_sector_id, 'First Mile', 'fɜːst maɪl', 'Initial pickup from origin', 'Kaynaktan ilk alım', 'First mile pickup is scheduled for Monday.', 'İlk mil alımı Pazartesi planlanıyor.', 'service_models', 'B2', 133),
    (logistics_sector_id, 'Middle Mile', 'ˈmɪdl maɪl', 'Transport between distribution centers', 'Dağıtım merkezleri arasında taşıma', 'Middle mile transport uses rail.', 'Orta mil taşıma ray kullanır.', 'service_models', 'B2', 134),
    (logistics_sector_id, 'Hub', 'hʌb', 'Central distribution point', 'Merkezi dağıtım noktası', 'Our main hub is in Frankfurt.', 'Ana hubımız Frankfurt''ta.', 'service_models', 'B1', 135),
    (logistics_sector_id, 'Spoke', 'spəʊk', 'Secondary distribution point connected to hub', 'Hub''a bağlı ikincil dağıtım noktası', 'Each spoke serves a regional market.', 'Her spoke bölgesel pazara hizmet eder.', 'service_models', 'B2', 136),
    (logistics_sector_id, 'Drop Shipping', 'drɒp ˈʃɪpɪŋ', 'Shipping directly from manufacturer to customer', 'Üreticiden doğrudan müşteriye sevkiyat', 'We use drop shipping for online orders.', 'Online siparişler için stoksuz satış kullanıyoruz.', 'service_models', 'B2', 137),
    (logistics_sector_id, 'White Glove', 'waɪt ɡlʌv', 'Premium delivery with setup services', 'Kurulum hizmetleri ile premium teslimat', 'White glove delivery includes installation.', 'Beyaz eldiven teslimat kurulum dahildir.', 'service_models', 'C1', 138),
    (logistics_sector_id, 'Express', 'ɪkˈspres', 'Fast delivery service with guaranteed timing', 'Garantili zamanlama ile hızlı teslimat hizmeti', 'Express delivery takes 24 hours.', 'Express teslimat 24 saat sürer.', 'service_models', 'A2', 139),
    (logistics_sector_id, 'Standard', 'ˈstændəd', 'Regular delivery service', 'Normal teslimat hizmeti', 'Standard delivery takes 5-7 days.', 'Standart teslimat 5-7 gün sürer.', 'service_models', 'A2', 140)
    ON CONFLICT (sector_id, word) DO NOTHING;

    -- =====================================================
    -- KATEGORI 9: GENEL IS INGILIZCESI - LOJISTIK (100+ kelime)
    -- =====================================================
    
    INSERT INTO sector_vocabulary (sector_id, word, pronunciation, definition_en, definition_tr, example_sentence, example_sentence_tr, category, cefr_level, frequency_rank) VALUES
    (logistics_sector_id, 'Quote', 'kwəʊt', 'Price estimate for services', 'Hizmetler için fiyat tahmini', 'Please send a quote for this shipment.', 'Bu sevkiyat için teklif gönderin.', 'business', 'A2', 141),
    (logistics_sector_id, 'Rate', 'reɪt', 'Price charged for transportation', 'Taşıma için alınan fiyat', 'What is your rate per container?', 'Konteyner başına tarifeniz nedir?', 'business', 'A2', 142),
    (logistics_sector_id, 'Invoice', 'ˈɪnvɔɪs', 'Bill for services rendered', 'Verilen hizmetler için fatura', 'Please send the invoice by email.', 'Lütfen faturayı e-posta ile gönderin.', 'business', 'A2', 143),
    (logistics_sector_id, 'Payment', 'ˈpeɪmənt', 'Money transferred for services', 'Hizmetler için aktarılan para', 'Payment terms are net 30 days.', 'Ödeme vadesi 30 gündür.', 'business', 'A2', 144),
    (logistics_sector_id, 'Contract', 'ˈkɒntrækt', 'Legal agreement for services', 'Hizmetler için yasal sözleşme', 'We signed a 2-year contract.', '2 yıllık sözleşme imzaladık.', 'business', 'B1', 145),
    (logistics_sector_id, 'Order', 'ˈɔːdə', 'Request for goods or services', 'Mal veya hizmet talebi', 'We received your order.', 'Siparişinizi aldık.', 'business', 'A1', 146),
    (logistics_sector_id, 'Shipment', 'ˈʃɪpmənt', 'Goods being transported', 'Taşınan mallar', 'Your shipment is on the way.', 'Sevkiyatınız yolda.', 'business', 'A2', 147),
    (logistics_sector_id, 'Delivery', 'dɪˈlɪvəri', 'Act of bringing goods to recipient', 'Malları alıcıya getirme eylemi', 'Delivery is scheduled for Friday.', 'Teslimat Cuma için planlandı.', 'business', 'A1', 148),
    (logistics_sector_id, 'Pickup', 'ˈpɪkʌp', 'Collection of goods from origin', 'Malların kaynaktan toplanması', 'Pickup is at 10 AM tomorrow.', 'Alım yarın sabah 10''da.', 'business', 'A2', 149),
    (logistics_sector_id, 'Tracking', 'ˈtrækɪŋ', 'Monitoring shipment location', 'Sevkiyat konumunu izleme', 'Tracking shows arrival tomorrow.', 'Takip yarın varışı gösteriyor.', 'business', 'A2', 150),
    (logistics_sector_id, 'Delay', 'dɪˈleɪ', 'Late arrival or departure', 'Geç varış veya kalkış', 'There is a 2-day delay.', '2 günlük gecikme var.', 'business', 'A2', 151),
    (logistics_sector_id, 'Damage', 'ˈdæmɪdʒ', 'Harm to goods during transport', 'Taşıma sırasında mallara hasar', 'We found damage to 3 boxes.', '3 kutuda hasar bulduk.', 'business', 'A2', 152),
    (logistics_sector_id, 'Claim', 'kleɪm', 'Request for compensation for loss', 'Kayıp için tazminat talebi', 'We filed a claim for the damage.', 'Hasar için talep açtık.', 'business', 'B1', 153),
    (logistics_sector_id, 'Insurance', 'ɪnˈʃʊərəns', 'Protection against loss or damage', 'Kayıp veya hasara karşı koruma', 'Insurance covers up to $50,000.', 'Sigorta 50.000 dolara kadar kapsar.', 'business', 'B1', 154),
    (logistics_sector_id, 'Surcharge', 'ˈsɜːtʃɑːdʒ', 'Additional fee on top of base rate', 'Temel tarife üzerine ek ücret', 'Fuel surcharge is 15%.', 'Yakıt ek ücreti %15.', 'business', 'B2', 155),
    (logistics_sector_id, 'Discount', 'ˈdɪskaʊnt', 'Reduction in price', 'Fiyatta indirim', 'We offer volume discounts.', 'Hacim indirimi sunuyoruz.', 'business', 'A2', 156),
    (logistics_sector_id, 'Negotiate', 'nɪˈɡəʊʃieɪt', 'Discuss to reach agreement on terms', 'Şartlar üzerinde anlaşmaya varmak için tartışmak', 'Let us negotiate the rate.', 'Fiyatı müzakere edelim.', 'business', 'B1', 157),
    (logistics_sector_id, 'Confirm', 'kənˈfɜːm', 'Verify or approve', 'Doğrulamak veya onaylamak', 'Please confirm the booking.', 'Lütfen rezervasyonu onaylayın.', 'business', 'A2', 158),
    (logistics_sector_id, 'Schedule', 'ˈʃedjuːl', 'Planned time for activities', 'Aktiviteler için planlanan zaman', 'What is the delivery schedule?', 'Teslimat programı nedir?', 'business', 'A2', 159),
    (logistics_sector_id, 'Reschedule', 'riːˈʃedjuːl', 'Change planned time', 'Planlanan zamanı değiştirmek', 'We need to reschedule pickup.', 'Alımı yeniden programlamamız gerekiyor.', 'business', 'B1', 160)
    ON CONFLICT (sector_id, word) DO NOTHING;

    RAISE NOTICE 'Logistics vocabulary seed Part 3 completed: 49 words inserted (total: 160)';
    
END $$;
