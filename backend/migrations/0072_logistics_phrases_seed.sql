-- Migration: 0072_logistics_phrases_seed.sql
-- Lojistik Sektörü İletişim Kalıpları Seed Data
-- 70+ Sektöre Özgü İletişim Kalıbı

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
    -- KATEGORI: GENEL ILETISIM KALIPLARI (70 kalıp)
    -- =====================================================
    
    INSERT INTO sector_vocabulary (sector_id, word, pronunciation, definition_en, definition_tr, example_sentence, example_sentence_tr, category, cefr_level, frequency_rank) VALUES
    -- Selamlaşma ve Giriş
    (logistics_sector_id, 'How can I help you?', 'haʊ kæn aɪ help juː', 'Standard greeting to offer assistance', 'Nasıl yardımcı olabilirim?', 'Hello, how can I help you today?', 'Merhaba, bugün size nasıl yardımcı olabilirim?', 'phrases', 'A1', 301),
    (logistics_sector_id, 'I am calling about...', 'aɪ æm ˈkɔːlɪŋ əˈbaʊt', 'Stating the purpose of a call', '...hakkında arıyorum', 'I am calling about the shipment to Berlin.', 'Berlin''e olan sevkiyat hakkında arıyorum.', 'phrases', 'A2', 302),
    (logistics_sector_id, 'Could you please check...', 'kʊd juː pliːz tʃek', 'Polite request to verify information', 'Lütfen ... kontrol eder misiniz?', 'Could you please check the status?', 'Lütfen durumu kontrol eder misiniz?', 'phrases', 'B1', 303),
    
    -- Durum Sorma ve Bilgi Verme
    (logistics_sector_id, 'What is the status of...', 'wɒt ɪz ðə ˈsteɪtəs əv', 'Asking for current situation', '...durumu nedir?', 'What is the status of order #123?', '123 nolu siparişin durumu nedir?', 'phrases', 'B1', 304),
    (logistics_sector_id, 'When can we expect...', 'wen kæn wiː ɪkˈspekt', 'Asking for estimated time', 'Ne zaman bekleyebiliriz?', 'When can we expect delivery?', 'Teslimatı ne zaman bekleyebiliriz?', 'phrases', 'B1', 305),
    (logistics_sector_id, 'It is scheduled for...', 'ɪt ɪz ˈʃedjuːld fɔː', 'Stating planned time', '...için planlandı', 'It is scheduled for tomorrow morning.', 'Yarın sabah için planlandı.', 'phrases', 'B1', 306),
    (logistics_sector_id, 'There is a delay due to...', 'ðeər ɪz ə dɪˈleɪ djuː tuː', 'Explaining reason for lateness', '...nedeniyle gecikme var', 'There is a delay due to bad weather.', 'Kötü hava nedeniyle gecikme var.', 'phrases', 'B2', 307),
    (logistics_sector_id, 'The ETA has changed to...', 'ðə iː tiː eɪ hæz tʃeɪndʒd tuː', 'Updating arrival time', 'ETA ... olarak değişti', 'The ETA has changed to Friday.', 'ETA Cuma olarak değişti.', 'phrases', 'B2', 308),
    
    -- Sorun Bildirme ve Çözme
    (logistics_sector_id, 'We have a problem with...', 'wiː hæv ə ˈprɒbləm wɪð', 'Reporting an issue', '...ile ilgili bir sorunumuz var', 'We have a problem with the documentation.', 'Belgelerle ilgili bir sorunumuz var.', 'phrases', 'A2', 309),
    (logistics_sector_id, 'The shipment is damaged.', 'ðə ˈʃɪpmənt ɪz ˈdæmɪdʒd', 'Reporting physical harm to goods', 'Sevkiyat hasarlı.', 'Please note that the shipment is damaged.', 'Lütfen sevkiyatın hasarlı olduğunu not edin.', 'phrases', 'B1', 310),
    (logistics_sector_id, 'Missing items', 'ˈmɪsɪŋ ˈaɪtəmz', 'Goods not presently in shipment', 'Eksik ürünler', 'There are missing items in this box.', 'Bu kutuda eksik ürünler var.', 'phrases', 'B1', 311),
    (logistics_sector_id, 'Please investigate.', 'pliːz ɪnˈvestɪɡeɪt', 'Request to look into a matter', 'Lütfen araştırın.', 'Please investigate the cause of delay.', 'Lütfen gecikmenin nedenini araştırın.', 'phrases', 'B2', 312),
    (logistics_sector_id, 'We need a solution ASAP.', 'wiː niːd ə səˈluːʃn eɪ es eɪ piː', 'Urgent request for resolution', 'Acilen bir çözüme ihtiyacımız var.', 'This is critical, we need a solution ASAP.', 'Bu kritik, acilen bir çözüme ihtiyacımız var.', 'phrases', 'B2', 313),
    
    -- Fiyat Teslim ve Anlaşma
    (logistics_sector_id, 'Can you give me a quote?', 'kæn juː ɡɪv miː ə kwəʊt', 'Requesting price estimate', 'Bana fiyat teklifi verebilir misiniz?', 'Can you give me a quote for air freight?', 'Hava kargo için fiyat teklifi verebilir misiniz?', 'phrases', 'B1', 314),
    (logistics_sector_id, 'Does this include...', 'dʌz ðɪs ɪnˈkluːd', 'Checking inclusions in price', 'Bu ... içeriyor mu?', 'Does this include customs clearance?', 'Bu gümrüklemeyi içeriyor mu?', 'phrases', 'B1', 315),
    (logistics_sector_id, 'The rate is valid until...', 'ðə reɪt ɪz ˈvælɪd ənˈtɪl', 'Stating offer expiry', 'Fiyat ... tarihine kadar geçerli', 'The rate is valid until end of month.', 'Fiyat ay sonuna kadar geçerli.', 'phrases', 'B2', 316),
    (logistics_sector_id, 'Are there any hidden costs?', 'ɑː ðeər ˈeni ˈhɪdn kɒsts', 'Checking for extra fees', 'Gizli maliyet var mı?', 'Please confirm if there are any hidden costs.', 'Lütfen gizli maliyet olup olmadığını onaylayın.', 'phrases', 'B2', 317),
    (logistics_sector_id, 'We accept your offer.', 'wiː əkˈsept jɔː ˈɒfə', 'Agreeing to terms', 'Teklifinizi kabul ediyoruz.', 'We accept your offer regarding the contract.', 'Sözleşme ile ilgili teklifinizi kabul ediyoruz.', 'phrases', 'B1', 318),
    
    -- Talimat ve Yönlendirme
    (logistics_sector_id, 'Please ensure that...', 'pliːz ɪnˈʃʊə ðæt', 'Giving important instruction', 'Lütfen ... olduğundan emin olun', 'Please ensure that goods are packed covering.', 'Lütfen malların kapalı paketlendiğinden emin olun.', 'phrases', 'B2', 319),
    (logistics_sector_id, 'Do not stack.', 'duː nɒt stæk', 'Instruction not to pile goods', 'Üst üste koymayın.', 'Fragile goods, do not stack.', 'Kırılgan mallar, üst üste koymayın.', 'phrases', 'A2', 320),
    (logistics_sector_id, 'Handle with care.', 'ˈhændl wɪð keə', 'Instruction to be careful', 'Dikkatli taşıyın.', 'Glass inside, handle with care.', 'İçinde cam var, dikkatli taşıyın.', 'phrases', 'A2', 321),
    (logistics_sector_id, 'Keep dry.', 'kiːp draɪ', 'Instruction to avoid moisture', 'Kuru tutun.', 'Electronics inside, keep dry.', 'İçinde elektronik var, kuru tutun.', 'phrases', 'A1', 322),
    (logistics_sector_id, 'Sign here, please.', 'saɪn hɪə pliːz', 'Requesting signature', 'Burayı imzalayın lütfen.', 'Sign here for receipt of goods.', 'Malların teslim alınması için burayı imzalayın.', 'phrases', 'A1', 323),
    
    -- Belgelerle İlgili
    (logistics_sector_id, 'Please send the documents.', 'pliːz send ðə ˈdɒkjʊmənts', 'Requesting paperwork', 'Lütfen belgeleri gönderin.', 'Please send the documents via email.', 'Lütfen belgeleri e-posta ile gönderin.', 'phrases', 'A2', 324),
    (logistics_sector_id, 'I attached the invoice.', 'aɪ əˈtætʃd ðə ˈɪnvɔɪs', 'Informing about attachment', 'Faturayı ekledim.', 'I attached the invoice to this email.', 'Faturayı bu e-postaya ekledim.', 'phrases', 'B1', 325),
    (logistics_sector_id, 'The document is missing.', 'ðə ˈdɒkjʊmənt ɪz ˈmɪsɪŋ', 'Reporting absent paper', 'Belge eksik.', 'The certificate of origin is missing.', 'Menşe şahadetnamesi eksik.', 'phrases', 'B1', 326),
    (logistics_sector_id, 'Is the paperwork ready?', 'ɪz ðə ˈpeɪpəwɜːk ˈredi', 'Checking document status', 'Evraklar hazır mı?', 'Is the paperwork ready for customs?', 'Gümrük için evraklar hazır mı?', 'phrases', 'B1', 327),
    
    -- Kapanış ve Teşekkür
    (logistics_sector_id, 'Thank you for your business.', 'θæŋk juː fɔː jɔː ˈbɪznɪs', 'Professional closing', 'Bizimle çalıştığınız için teşekkürler.', 'Thank you for your business, we appreciate it.', 'Bizimle çalıştığınız için teşekkürler, takdir ediyoruz.', 'phrases', 'B1', 328),
    (logistics_sector_id, 'Let me know if you need anything else.', 'let miː nəʊ ɪf juː niːd ˈeniθɪŋ els', 'Offering further help', 'Başka bir şeye ihtiyacınız olursa haber verin.', 'Let me know if you need anything else regarding this order.', 'Bu siparişle ilgili başka bir şeye ihtiyacınız olursa haber verin.', 'phrases', 'B2', 329),
    (logistics_sector_id, 'Looking forward to hearing from you.', 'ˈlʊkɪŋ ˈfɔːwəd tuː ˈhɪərɪŋ frɒm juː', 'Expectation of reply', 'Sizden haber bekliyorum.', 'Looking forward to hearing from you soon.', 'Yakında sizden haber bekliyorum.', 'phrases', 'B2', 330),
    
    -- Ekstra Kalıplar
    (logistics_sector_id, 'In transit', 'ɪn ˈtrænzɪt', 'Goods are moving', 'Transit halinde', 'The goods are currently in transit.', 'Mallar şu anda transit halinde.', 'phrases', 'B1', 331),
    (logistics_sector_id, 'Out for delivery', 'aʊt fɔː dɪˈlɪvəri', 'On final delivery vehicle', 'Dağıtımda', 'Your package is out for delivery.', 'Paketiniz dağıtımda.', 'phrases', 'B1', 332),
    (logistics_sector_id, 'Customs hold', 'ˈkʌstəmz həʊld', 'Stopped by customs', 'Gümrükte bekletiliyor', 'The shipment is on customs hold.', 'Sevkiyat gümrükte bekletiliyor.', 'phrases', 'B2', 333),
    (logistics_sector_id, 'Cleared customs', 'klɪəd ˈkʌstəmz', 'Approved by customs', 'Gümrükten geçti', 'The goods have cleared customs.', 'Mallar gümrükten geçti.', 'phrases', 'B2', 334),
    (logistics_sector_id, 'Proof of delivery', 'pruːf əv dɪˈlɪvəri', 'Evidence of receipt', 'Teslimat kanıtı', 'We need the proof of delivery.', 'Teslimat kanıtına ihtiyacımız var.', 'phrases', 'B2', 335),
    (logistics_sector_id, 'Return to sender', 'rɪˈtɜːn tuː ˈsendə', 'Send back to origin', 'Göndericiye iade', 'Please mark as return to sender.', 'Lütfen göndericiye iade olarak işaretleyin.', 'phrases', 'B1', 336),
    (logistics_sector_id, 'Address correction', 'əˈdres kəˈrekʃn', 'Fixing destination address', 'Adres düzeltme', 'We need an address correction.', 'Adres düzeltmesine ihtiyacımız var.', 'phrases', 'B1', 337),
    (logistics_sector_id, 'Delivery attempt', 'dɪˈlɪvəri əˈtempt', 'Trying to deliver', 'Teslimat denemesi', 'First delivery attempt failed.', 'İlk teslimat denemesi başarısız oldu.', 'phrases', 'B2', 338),
    (logistics_sector_id, 'Pick and pack', 'pɪk ænd pæk', 'Warehouse service', 'Topla ve paketle', 'Do you offer pick and pack services?', 'Topla ve paketle hizmeti sunuyor musunuz?', 'phrases', 'B2', 339),
    (logistics_sector_id, 'Door to door', 'dɔː tuː dɔː', 'Full service delivery', 'Kapıdan kapıya', 'We need door to door service.', 'Kapıdan kapıya hizmete ihtiyacımız var.', 'phrases', 'A2', 340),
    (logistics_sector_id, 'Port to port', 'pɔːt tuː pɔːt', 'Service between ports only', 'Limandan limana', 'This rate is port to port.', 'Bu fiyat limandan limana.', 'phrases', 'B1', 341),
    (logistics_sector_id, 'Freight prepaid', 'freɪt ˌpriːˈpeɪd', 'Shipping paid in advance', 'Navlun peşin ödenmiş', 'Shipment is freight prepaid.', 'Sevkiyat navlun peşin ödenmiş.', 'phrases', 'C1', 342),
    (logistics_sector_id, 'Freight collect', 'freɪt kəˈlekt', 'Shipping paid by receiver', 'Navlun alıcı ödemeli', 'Please send via freight collect.', 'Lütfen navlun alıcı ödemeli gönderin.', 'phrases', 'C1', 343),
    (logistics_sector_id, 'Billable weight', 'ˈbɪləbl weɪt', 'Weight used for invoicing', 'Faturalandırılabilir ağırlık', 'What is the billable weight?', 'Faturalandırılabilir ağırlık nedir?', 'phrases', 'C1', 344),
    (logistics_sector_id, 'Fuel surcharge', 'fjuːəl ˈsɜːtʃɑːdʒ', 'Note about fuel cost', 'Yakıt ek ücreti', 'Fuel surcharge applies.', 'Yakıt ek ücreti uygulanır.', 'phrases', 'B2', 345),
    (logistics_sector_id, 'Peak season', 'piːk ˈsiːzn', 'Busy time of year', 'Yoğun sezon', 'Rates are higher in peak season.', 'Fiyatlar yoğun sezonda daha yüksektir.', 'phrases', 'B2', 346),
    (logistics_sector_id, 'Spot rate', 'spɒt reɪt', 'One-time market price', 'Spot fiyat', 'We can offer a spot rate.', 'Spot fiyat sunabiliriz.', 'phrases', 'B2', 347),
    (logistics_sector_id, 'Subject to availability', 'səbˈdʒekt tuː əˌveɪləˈbɪləti', 'Condition of offer', 'Müsaitlik durumuna bağlı', 'Offer is subject to availability.', 'Teklif müsaitlik durumuna bağlıdır.', 'phrases', 'C1', 348),
    (logistics_sector_id, 'Pending approval', 'ˈpendɪŋ əˈpruːvl', 'Waiting for permission', 'Onay bekleniyor', 'The order is pending approval.', 'Sipariş onay bekliyor.', 'phrases', 'B2', 349),
    (logistics_sector_id, 'Under review', 'ˈʌndə rɪˈvjuː', 'Being checked', 'İnceleme altında', 'Your claim is under review.', 'Talebiniz inceleme altında.', 'phrases', 'B2', 350),
    (logistics_sector_id, 'As per request', 'æz pɜː rɪˈkwest', 'According to demand', 'Talebe istinaden', 'Sent as per request.', 'Talebe istinaden gönderildi.', 'phrases', 'B2', 351),
    (logistics_sector_id, 'In good condition', 'ɪn ɡʊd kənˈdɪʃn', 'Not damaged', 'İyi durumda', 'Received in good condition.', 'İyi durumda teslim alındı.', 'phrases', 'A2', 352),
    (logistics_sector_id, 'Discrepancy', 'dɪsˈkrepənsi', 'Difference or inconsistency', 'Uyuşmazlık', 'There is a discrepancy in weight.', 'Ağırlıkta uyuşmazlık var.', 'phrases', 'C1', 353),
    (logistics_sector_id, 'Shortage', 'ˈʃɔːtɪdʒ', 'Not enough quantity', 'Eksiklik', 'We have a stock shortage.', 'Stok eksiğimiz var.', 'phrases', 'B2', 354),
    (logistics_sector_id, 'Overage', 'ˈəʊvərɪdʒ', 'Too much quantity', 'Fazlalık', 'There is an overage of 5 units.', '5 birim fazlalık var.', 'phrases', 'C1', 355),
    (logistics_sector_id, 'Refused shipment', 'rɪˈfjuːzd ˈʃɪpmənt', 'Rejected delivery', 'Reddedilen sevkiyat', 'Receiver refused shipment.', 'Alıcı sevkiyatı reddetti.', 'phrases', 'B2', 356),
    (logistics_sector_id, 'Re-route', 'riː ruːt', 'Change destination', 'Yeniden rotalamak', 'Can we re-route the truck?', 'Kamyonu yeniden rotalayabilir miyiz?', 'phrases', 'B2', 357),
    (logistics_sector_id, 'Split shipment', 'splɪt ˈʃɪpmənt', 'Divide delivery', 'Bölünmüş sevkiyat', 'We will send a split shipment.', 'Bölünmüş sevkiyat göndereceğiz.', 'phrases', 'B2', 358),
    (logistics_sector_id, 'Blank sailing', 'blæŋk ˈseɪlɪŋ', 'Cancelled voyage', 'İptal edilen sefer', 'Carrier announced blank sailing.', 'Taşıyıcı sefer iptali duyurdu.', 'phrases', 'C1', 359),
    (logistics_sector_id, 'Roll over', 'rəʊl ˈəʊvə', 'Move to next vessel', 'Sonraki gemiye aktarma', 'Container was rolled over.', 'Konteyner sonraki gemiye aktarıldı.', 'phrases', 'C1', 360),
    (logistics_sector_id, 'Cut-off time', 'kʌt ɒf taɪm', 'Deadline', 'Son kabul saati', 'What is the cut-off time?', 'Son kabul saati nedir?', 'phrases', 'B1', 361),
    (logistics_sector_id, 'Closing date', 'ˈkləʊzɪŋ deɪt', 'Final date', 'Kapanış tarihi', 'Closing date is Monday.', 'Kapanış tarihi Pazartesi.', 'phrases', 'B1', 362),
    (logistics_sector_id, 'Notify party', 'ˈnəʊtɪfaɪ ˈpɑːti', 'Contact for arrival', 'İhbar adresi', 'Who is the notify party?', 'İhbar adresi kim?', 'phrases', 'B2', 363),
    (logistics_sector_id, 'Place of delivery', 'pleɪs əv dɪˈlɪvəri', 'Final destination', 'Teslim yeri', 'Place of delivery is Berlin.', 'Teslim yeri Berlin.', 'phrases', 'A2', 364),
    (logistics_sector_id, 'Port of loading', 'pɔːt əv ˈləʊdɪŋ', 'Departure port', 'Yükleme limanı', 'Port of loading is Izmir.', 'Yükleme limanı İzmir.', 'phrases', 'B1', 365),
    (logistics_sector_id, 'Port of discharge', 'pɔːt əv dɪsˈtʃɑːdʒ', 'Arrival port', 'Boşaltma limanı', 'Port of discharge is Hamburg.', 'Boşaltma limanı Hamburg.', 'phrases', 'B1', 366),
    (logistics_sector_id, 'Vessel name', 'ˈvesl neɪm', 'Ship name', 'Gemi adı', 'What is the vessel name?', 'Gemi adı nedir?', 'phrases', 'A2', 367),
    (logistics_sector_id, 'Voyage number', 'ˈvɔɪɪdʒ ˈnʌmbə', 'Trip ID', 'Sefer numarası', 'Voyage number is 123W.', 'Sefer numarası 123W.', 'phrases', 'A2', 368),
    (logistics_sector_id, 'Container number', 'kənˈteɪnə ˈnʌmbə', 'Box ID', 'Konteyner numarası', 'Container number is MSDU1234567.', 'Konteyner numarası MSDU1234567.', 'phrases', 'A2', 369),
    (logistics_sector_id, 'Seal number', 'siːl ˈnʌmbə', 'Security ID', 'Mühür numarası', 'Seal number matches.', 'Mühür numarası eşleşiyor.', 'phrases', 'B1', 370)
    ON CONFLICT (sector_id, word) DO NOTHING;

    RAISE NOTICE 'Logistics phrases seed completed: 70 phrases inserted';
    
END $$;
