-- Migration: 0071_logistics_vocabulary_seed_part1.sql
-- Lojistik Sektörü Terminoloji Seed Data
-- Kaynak: NotebookLM Analizi - 1000+ kelime

-- Önce lojistik sektör ID'sini al
DO $$
DECLARE
    logistics_sector_id INT;
BEGIN
    SELECT id INTO logistics_sector_id FROM sectors WHERE code = 'logistics';
    
    IF logistics_sector_id IS NULL THEN
        RAISE NOTICE 'Logistics sector not found. Please ensure sectors table is populated.';
        RETURN;
    END IF;

    -- =====================================================
    -- KATEGORI 1: TEDARIK ZINCIRI TEMELLERI (20 kelime)
    -- =====================================================
    
    INSERT INTO sector_vocabulary (sector_id, word, pronunciation, definition_en, definition_tr, example_sentence, example_sentence_tr, category, cefr_level, frequency_rank) VALUES
    (logistics_sector_id, 'Supply Chain', 'səˈplaɪ tʃeɪn', 'Network of organizations involved in producing and delivering a product', 'Bir ürünün üretim ve teslimatında yer alan organizasyonlar ağı', 'Our supply chain spans three continents.', 'Tedarik zincirimiz üç kıtaya yayılıyor.', 'fundamentals', 'B1', 1),
    (logistics_sector_id, 'Logistics', 'ləˈdʒɪstɪks', 'Planning and control of goods flow from origin to destination', 'Malların kaynaktan varış noktasına akışının planlanması ve kontrolü', 'Logistics costs represent 10% of our budget.', 'Lojistik maliyetleri bütçemizin %10''unu oluşturuyor.', 'fundamentals', 'B1', 2),
    (logistics_sector_id, 'Procurement', 'prəˈkjʊəmənt', 'Process of obtaining goods or services from external sources', 'Mal veya hizmetlerin dış kaynaklardan edinilme süreci', 'Our procurement team handles all purchases.', 'Satınalma ekibimiz tüm alımları yönetiyor.', 'fundamentals', 'B2', 3),
    (logistics_sector_id, 'Distribution', 'ˌdɪstrɪˈbjuːʃən', 'Process of delivering products to customers', 'Ürünlerin müşterilere teslimat süreci', 'We have distribution centers in five cities.', 'Beş şehirde dağıtım merkezimiz var.', 'fundamentals', 'B1', 4),
    (logistics_sector_id, 'Outsourcing', 'ˈaʊtsɔːsɪŋ', 'Contracting business processes to external companies', 'İş süreçlerinin dış firmalara devredilmesi', 'We are outsourcing our warehousing operations.', 'Depolama operasyonlarımızı dış kaynak kullanımına veriyoruz.', 'fundamentals', 'B2', 5),
    (logistics_sector_id, 'Reverse Logistics', 'rɪˈvɜːs ləˈdʒɪstɪks', 'Movement of goods from customer back to origin for returns or recycling', 'İade veya geri dönüşüm için malların müşteriden kaynağa geri hareketi', 'Reverse logistics handles all product returns.', 'Tersine lojistik tüm ürün iadelerini yönetir.', 'fundamentals', 'C1', 6),
    (logistics_sector_id, 'Inventory', 'ˈɪnvəntri', 'Stock of goods held by a business', 'İşletmenin elinde tuttuğu mal stoku', 'We need to reduce inventory levels.', 'Envanter seviyelerini azaltmamız gerekiyor.', 'fundamentals', 'B1', 7),
    (logistics_sector_id, 'Lead Time', 'liːd taɪm', 'Time between placing an order and receiving delivery', 'Sipariş verme ile teslimat alma arasındaki süre', 'Lead time for this product is 4 weeks.', 'Bu ürün için tedarik süresi 4 haftadır.', 'fundamentals', 'B2', 8),
    (logistics_sector_id, 'Vendor', 'ˈvendər', 'Supplier or seller of goods and services', 'Mal ve hizmet tedarikçisi veya satıcısı', 'We work with multiple vendors.', 'Birden fazla tedarikçi ile çalışıyoruz.', 'fundamentals', 'B1', 9),
    (logistics_sector_id, 'Supplier', 'səˈplaɪər', 'Company that provides goods or materials', 'Mal veya malzeme tedarik eden şirket', 'Our main supplier is based in Germany.', 'Ana tedarikçimiz Almanya''da bulunuyor.', 'fundamentals', 'A2', 10),
    (logistics_sector_id, 'Carrier', 'ˈkæriər', 'Company that physically transports goods', 'Malları fiziksel olarak taşıyan şirket', 'The carrier will pick up the shipment tomorrow.', 'Taşıyıcı sevkiyatı yarın alacak.', 'fundamentals', 'B1', 11),
    (logistics_sector_id, 'Shipper', 'ˈʃɪpər', 'Person or company that sends goods', 'Mal gönderen kişi veya şirket', 'The shipper is responsible for proper packaging.', 'Gönderici uygun paketlemeden sorumludur.', 'fundamentals', 'B1', 12),
    (logistics_sector_id, 'Consignee', 'ˌkɒnsaɪˈniː', 'Person or company that receives shipped goods', 'Gönderilen malları teslim alan kişi veya şirket', 'The consignee must sign upon delivery.', 'Alıcı teslimat sırasında imza atmalıdır.', 'fundamentals', 'B2', 13),
    (logistics_sector_id, 'Freight', 'freɪt', 'Goods transported in bulk by truck, train, ship, or aircraft', 'Kamyon, tren, gemi veya uçakla toplu taşınan mallar', 'Freight costs have increased this year.', 'Navlun maliyetleri bu yıl arttı.', 'fundamentals', 'B1', 14),
    (logistics_sector_id, 'Cargo', 'ˈkɑːɡəʊ', 'Goods carried by a vehicle', 'Bir araç tarafından taşınan mallar', 'The cargo weighs 500 metric tons.', 'Kargo 500 metrik ton ağırlığında.', 'fundamentals', 'B1', 15),
    (logistics_sector_id, 'Shipment', 'ˈʃɪpmənt', 'Quantity of goods sent together', 'Birlikte gönderilen mal miktarı', 'Your shipment will arrive on Monday.', 'Sevkiyatınız Pazartesi günü ulaşacak.', 'fundamentals', 'A2', 16),
    (logistics_sector_id, 'Consignment', 'kənˈsaɪnmənt', 'Batch of goods delivered together', 'Birlikte teslim edilen mal partisi', 'This consignment contains 50 boxes.', 'Bu parti 50 kutu içeriyor.', 'fundamentals', 'B2', 17),
    (logistics_sector_id, 'Throughput', 'ˈθruːpʊt', 'Amount of goods processed in a given time', 'Belirli bir sürede işlenen mal miktarı', 'We need to increase warehouse throughput.', 'Depo verimini artırmamız gerekiyor.', 'fundamentals', 'C1', 18),
    (logistics_sector_id, 'Visibility', 'ˌvɪzəˈbɪləti', 'Ability to track and monitor shipments in real-time', 'Sevkiyatları gerçek zamanlı izleme yeteneği', 'We need end-to-end supply chain visibility.', 'Uçtan uca tedarik zinciri görünürlüğüne ihtiyacımız var.', 'fundamentals', 'B2', 19),
    (logistics_sector_id, 'Scalability', 'ˌskeɪləˈbɪləti', 'Ability to adjust logistics capacity based on demand', 'Talebe göre lojistik kapasitesini ayarlama yeteneği', 'Our system offers full scalability.', 'Sistemimiz tam ölçeklenebilirlik sunuyor.', 'fundamentals', 'C1', 20)
    ON CONFLICT (sector_id, word) DO NOTHING;

    -- =====================================================
    -- KATEGORI 2: TASIMACILK MODLARI VE TERIMLERI (20 kelime)
    -- =====================================================
    
    INSERT INTO sector_vocabulary (sector_id, word, pronunciation, definition_en, definition_tr, example_sentence, example_sentence_tr, category, cefr_level, frequency_rank) VALUES
    (logistics_sector_id, 'FCL', 'ef siː el', 'Full Container Load - container filled by single shipper', 'Tam Konteyner Yükü - tek gönderici tarafından doldurulan konteyner', 'We always ship FCL for large orders.', 'Büyük siparişler için her zaman FCL gönderiyoruz.', 'transportation', 'B2', 21),
    (logistics_sector_id, 'LCL', 'el siː el', 'Less than Container Load - shared container shipment', 'Parsiyel Konteyner Yükü - paylaşımlı konteyner sevkiyatı', 'LCL is more economical for small shipments.', 'LCL küçük sevkiyatlar için daha ekonomik.', 'transportation', 'B2', 22),
    (logistics_sector_id, 'FTL', 'ef tiː el', 'Full Truck Load - entire truck for single shipment', 'Tam Kamyon Yükü - tek sevkiyat için tüm kamyon', 'FTL shipments are faster but more expensive.', 'FTL sevkiyatları daha hızlı ama daha pahalı.', 'transportation', 'B2', 23),
    (logistics_sector_id, 'LTL', 'el tiː el', 'Less than Truckload - partial truck shipment', 'Parsiyel Kamyon Yükü - kısmi kamyon sevkiyatı', 'LTL combines multiple shipments on one truck.', 'LTL birden fazla sevkiyatı tek kamyonda birleştirir.', 'transportation', 'B2', 24),
    (logistics_sector_id, 'Intermodal', 'ˌɪntəˈməʊdl', 'Transport using multiple modes without handling goods', 'Mallara dokunmadan birden fazla mod kullanan taşıma', 'Intermodal transport reduces handling costs.', 'İntermodal taşıma elleçleme maliyetlerini azaltır.', 'transportation', 'C1', 25),
    (logistics_sector_id, 'Multimodal', 'ˌmʌltiˈməʊdl', 'Transport under single contract using multiple modes', 'Tek sözleşme altında birden fazla mod kullanan taşıma', 'We offer multimodal transport solutions.', 'Çok modlu taşıma çözümleri sunuyoruz.', 'transportation', 'C1', 26),
    (logistics_sector_id, 'RORO', 'ˈrəʊrəʊ', 'Roll-on/Roll-off vessel for wheeled cargo', 'Tekerlekli kargo için Ro-Ro gemisi', 'RORO ships are ideal for vehicle transport.', 'RORO gemileri araç taşımacılığı için idealdir.', 'transportation', 'B2', 27),
    (logistics_sector_id, 'Bulk Cargo', 'bʌlk ˈkɑːɡəʊ', 'Unpackaged goods transported in large quantities', 'Paketlenmemiş büyük miktarlarda taşınan mallar', 'Bulk cargo includes grain and coal.', 'Dökme yük tahıl ve kömür içerir.', 'transportation', 'B2', 28),
    (logistics_sector_id, 'Break Bulk', 'breɪk bʌlk', 'Cargo loaded individually, not in containers', 'Konteynerle değil tek tek yüklenen kargo', 'Break bulk is used for oversized equipment.', 'Break bulk aşırı boyutlu ekipman için kullanılır.', 'transportation', 'C1', 29),
    (logistics_sector_id, 'Haulage', 'ˈhɔːlɪdʒ', 'Road transport of goods by truck', 'Malların kamyonla kara yolu taşımacılığı', 'We provide domestic haulage services.', 'Yurt içi nakliye hizmetleri sunuyoruz.', 'transportation', 'B2', 30),
    (logistics_sector_id, 'Drayage', 'ˈdreɪɪdʒ', 'Short-distance transport between ports and warehouses', 'Limanlar ve depolar arasında kısa mesafe taşıma', 'Drayage costs are increasing at major ports.', 'Büyük limanlarda dreyaj maliyetleri artıyor.', 'transportation', 'C1', 31),
    (logistics_sector_id, 'Transloading', 'trænzˈləʊdɪŋ', 'Transferring cargo between transport modes', 'Kargonun taşıma modları arasında aktarılması', 'Transloading occurs at the rail terminal.', 'Aktarma ray terminalinde gerçekleşir.', 'transportation', 'C1', 32),
    (logistics_sector_id, 'Cross-Docking', 'krɒs ˈdɒkɪŋ', 'Unloading from inbound to outbound transport with minimal storage', 'Minimum depolama ile gelen taşımadan gidene aktarma', 'Cross-docking reduces warehousing costs.', 'Çapraz sevkiyat depolama maliyetlerini azaltır.', 'transportation', 'B2', 33),
    (logistics_sector_id, 'TEU', 'tiː iː juː', 'Twenty-foot Equivalent Unit - standard container measure', 'Yirmi Fit Eşdeğer Birim - standart konteyner ölçüsü', 'The vessel has a capacity of 10,000 TEU.', 'Geminin kapasitesi 10.000 TEU.', 'transportation', 'B2', 34),
    (logistics_sector_id, 'Container', 'kənˈteɪnə', 'Standardized box for shipping goods', 'Mal taşımacılığı için standart kutu', 'We need two 40-foot containers.', 'İki adet 40 fitlik konteynere ihtiyacımız var.', 'transportation', 'A2', 35),
    (logistics_sector_id, 'Trailer', 'ˈtreɪlə', 'Vehicle towed by truck for carrying cargo', 'Kargo taşımak için kamyon tarafından çekilen araç', 'The trailer was loaded with pallets.', 'Römork paletlerle yüklendi.', 'transportation', 'B1', 36),
    (logistics_sector_id, 'Chassis', 'ˈʃæsi', 'Frame for mounting container on truck', 'Konteyneri kamyona monte etmek için şasi', 'We need a chassis for container pickup.', 'Konteyner alımı için şasiye ihtiyacımız var.', 'transportation', 'B2', 37),
    (logistics_sector_id, 'Reefer', 'ˈriːfə', 'Refrigerated container for temperature-sensitive goods', 'Sıcaklığa duyarlı mallar için soğutmalı konteyner', 'Reefer containers maintain -20°C.', 'Frigorifik konteynerler -20°C korur.', 'transportation', 'B2', 38),
    (logistics_sector_id, 'Flatbed', 'ˈflætbed', 'Truck with flat cargo area without sides', 'Yanları olmayan düz kargo alanlı kamyon', 'Flatbed trucks carry oversized cargo.', 'Açık kasalı kamyonlar aşırı boyutlu kargo taşır.', 'transportation', 'B2', 39),
    (logistics_sector_id, 'Tanker', 'ˈtæŋkə', 'Vehicle for transporting liquids or gases', 'Sıvı veya gaz taşımak için araç', 'The tanker carries 20,000 liters of fuel.', 'Tanker 20.000 litre yakıt taşıyor.', 'transportation', 'B1', 40)
    ON CONFLICT (sector_id, word) DO NOTHING;

    -- =====================================================
    -- KATEGORI 3: DEPO VE ENVANTER YONETIMI (20 kelime)
    -- =====================================================
    
    INSERT INTO sector_vocabulary (sector_id, word, pronunciation, definition_en, definition_tr, example_sentence, example_sentence_tr, category, cefr_level, frequency_rank) VALUES
    (logistics_sector_id, 'Warehouse', 'ˈweəhaʊs', 'Building for storing goods before distribution', 'Dağıtım öncesi mal depolama binası', 'Our main warehouse is 50,000 square meters.', 'Ana depomuz 50.000 metrekare.', 'warehouse', 'A2', 41),
    (logistics_sector_id, 'WMS', 'ˌdʌbljuː em ˈes', 'Warehouse Management System - software for warehouse operations', 'Depo Yönetim Sistemi - depo operasyonları yazılımı', 'Our WMS tracks all inventory in real-time.', 'WMS''imiz tüm envanteri gerçek zamanlı izler.', 'warehouse', 'B2', 42),
    (logistics_sector_id, 'SKU', 'es keɪ juː', 'Stock Keeping Unit - unique product identifier', 'Stok Tutma Birimi - benzersiz ürün tanımlayıcı', 'Each product has a unique SKU.', 'Her ürünün benzersiz bir SKU''su var.', 'warehouse', 'B2', 43),
    (logistics_sector_id, 'Picking', 'ˈpɪkɪŋ', 'Selecting items from storage for orders', 'Siparişler için depodan ürün seçme', 'Picking accuracy is 99.8%.', 'Toplama doğruluğu %99.8.', 'warehouse', 'B1', 44),
    (logistics_sector_id, 'Packing', 'ˈpækɪŋ', 'Preparing items for shipment with protection', 'Ürünleri koruma ile sevkiyata hazırlama', 'Packing materials include bubble wrap.', 'Paketleme malzemeleri balonlu naylon içerir.', 'warehouse', 'A2', 45),
    (logistics_sector_id, 'FIFO', 'ˈfaɪfəʊ', 'First In First Out - oldest stock ships first', 'İlk Giren İlk Çıkar - en eski stok önce gönderilir', 'We use FIFO for perishable goods.', 'Bozulabilir ürünler için FIFO kullanıyoruz.', 'warehouse', 'B2', 46),
    (logistics_sector_id, 'LIFO', 'ˈlaɪfəʊ', 'Last In First Out - newest stock ships first', 'Son Giren İlk Çıkar - en yeni stok önce gönderilir', 'LIFO is used for non-perishable items.', 'LIFO bozulmayan ürünler için kullanılır.', 'warehouse', 'B2', 47),
    (logistics_sector_id, 'FEFO', 'ˈfefəʊ', 'First Expired First Out - earliest expiry ships first', 'İlk Sona Eren İlk Çıkar - en erken son kullanma tarihi önce', 'FEFO is critical for pharmaceuticals.', 'FEFO ilaçlar için kritik önemde.', 'warehouse', 'C1', 48),
    (logistics_sector_id, 'Replenishment', 'rɪˈplenɪʃmənt', 'Restocking items when inventory runs low', 'Envanter azaldığında ürünleri yeniden stoklama', 'Automatic replenishment triggers at 100 units.', 'Otomatik yenileme 100 birimde tetiklenir.', 'warehouse', 'B2', 49),
    (logistics_sector_id, 'Safety Stock', 'ˈseɪfti stɒk', 'Extra inventory held for unexpected demand', 'Beklenmedik talep için tutulan ekstra envanter', 'We maintain 2 weeks of safety stock.', '2 haftalık emniyet stoğu tutuyoruz.', 'warehouse', 'B2', 50),
    (logistics_sector_id, 'Stockout', 'ˈstɒkaʊt', 'Situation when inventory runs out', 'Envanterin tükendiği durum', 'We must avoid stockouts during peak season.', 'Yoğun sezonda stok tükenmesinden kaçınmalıyız.', 'warehouse', 'B2', 51),
    (logistics_sector_id, 'Pallet', 'ˈpælɪt', 'Flat platform for stacking and moving goods', 'Mal istiflemek ve taşımak için düz platform', 'Each pallet holds 48 boxes.', 'Her palet 48 kutu taşır.', 'warehouse', 'B1', 52),
    (logistics_sector_id, 'Racking', 'ˈrækɪŋ', 'Shelving system for storing pallets', 'Paletleri depolamak için raf sistemi', 'We installed new racking in Zone A.', 'A Bölgesine yeni raf kurduk.', 'warehouse', 'B2', 53),
    (logistics_sector_id, 'Aisle', 'aɪl', 'Passage between storage racks', 'Depolama rafları arasındaki geçit', 'Keep aisles clear for forklifts.', 'Forkliftler için koridorları açık tutun.', 'warehouse', 'B1', 54),
    (logistics_sector_id, 'Forklift', 'ˈfɔːklɪft', 'Vehicle for lifting and moving pallets', 'Paletleri kaldırıp taşımak için araç', 'The forklift can lift 3 tons.', 'Forklift 3 ton kaldırabilir.', 'warehouse', 'B1', 55),
    (logistics_sector_id, 'Cycle Count', 'ˈsaɪkl kaʊnt', 'Regular partial inventory count', 'Düzenli kısmi envanter sayımı', 'We do cycle counts every week.', 'Her hafta dönemsel sayım yapıyoruz.', 'warehouse', 'B2', 56),
    (logistics_sector_id, 'Shrinkage', 'ˈʃrɪŋkɪdʒ', 'Loss of inventory due to theft or damage', 'Hırsızlık veya hasar nedeniyle envanter kaybı', 'Shrinkage rate is below 0.5%.', 'Fire oranı %0.5''in altında.', 'warehouse', 'B2', 57),
    (logistics_sector_id, 'Slotting', 'ˈslɒtɪŋ', 'Strategic product placement in warehouse', 'Depoda stratejik ürün yerleşimi', 'Proper slotting improves picking efficiency.', 'Doğru yerleşim toplama verimliliğini artırır.', 'warehouse', 'C1', 58),
    (logistics_sector_id, 'Put-away', 'pʊt əˈweɪ', 'Process of placing received goods in storage', 'Alınan malları depoya yerleştirme süreci', 'Put-away must be completed within 24 hours.', 'Yerleştirme 24 saat içinde tamamlanmalı.', 'warehouse', 'B2', 59),
    (logistics_sector_id, 'JIT', 'dʒeɪ aɪ tiː', 'Just-In-Time - inventory arrives when needed', 'Tam Zamanında - envanter gerektiğinde gelir', 'JIT reduces warehousing costs.', 'JIT depolama maliyetlerini azaltır.', 'warehouse', 'B2', 60)
    ON CONFLICT (sector_id, word) DO NOTHING;

    RAISE NOTICE 'Logistics vocabulary seed Part 1 completed: 60 words inserted';
    
END $$;
