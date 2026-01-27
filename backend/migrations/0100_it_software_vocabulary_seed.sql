-- Migration: 0100_it_software_vocabulary_seed.sql
-- Description: IT & Software Sector Vocabulary Seed Data (Part 1)
-- Date: 2026-01-25

DO $$
DECLARE
    sector_id_val INT;
BEGIN
    SELECT id INTO sector_id_val FROM sectors WHERE code = 'it_software';
    
    IF sector_id_val IS NULL THEN
        RAISE NOTICE 'IT Software sector not found. Please ensure sectors table is populated.';
        RETURN;
    END IF;

    -- =====================================================
    -- CATEGORY 1: FUNDAMENTALS & CODING (20 words)
    -- =====================================================
    INSERT INTO sector_vocabulary (sector_id, word, pronunciation, definition_en, definition_tr, example_sentence, example_sentence_tr, category, cefr_level, frequency_rank) VALUES
    (sector_id_val, 'Algorithm', 'ˈælɡərɪðəm', 'A set of rules to solve a problem', 'Bir problemi çözmek için izlenen kurallar dizisi', 'The search algorithm is very efficient.', 'Arama algoritması çok verimlidir.', 'fundamentals', 'B1', 1),
    (sector_id_val, 'Bug', 'bʌɡ', 'An error or flaw in software', 'Yazılımdaki hata veya kusur', 'We found a bug in the login page.', 'Giriş sayfasında bir hata bulduk.', 'fundamentals', 'A2', 2),
    (sector_id_val, 'Code', 'kəʊd', 'Instructions written for a computer', 'Bilgisayar için yazılmış talimatlar', 'I write code in Python and JavaScript.', 'Python ve JavaScript dillerinde kod yazarım.', 'fundamentals', 'A1', 3),
    (sector_id_val, 'Database', 'ˈdeɪtəbeɪs', 'An organized collection of data', 'Düzenli veri koleksiyonu', 'The user data is stored in the database.', 'Kullanıcı verileri veritabanında saklanır.', 'fundamentals', 'B1', 4),
    (sector_id_val, 'Debug', 'ˌdiːˈbʌɡ', 'To identify and remove errors', 'Hataları tespit edip gidermek', 'It took hours to debug the application.', 'Uygulamayı debug etmek saatler sürdü.', 'fundamentals', 'B1', 5),
    (sector_id_val, 'Developer', 'dɪˈveləpər', 'A person who builds software', 'Yazılım geliştiren kişi', 'She is a senior software developer.', 'O kıdemli bir yazılım geliştiricisidir.', 'fundamentals', 'A2', 6),
    (sector_id_val, 'Framework', 'ˈfreɪmwɜːk', 'A platform for developing software applications', 'Yazılım geliştirmek için kullanılan yapı veya platform', 'React is a popular frontend framework.', 'React popüler bir frontend çatısıdır.', 'fundamentals', 'B2', 7),
    (sector_id_val, 'Function', 'ˈfʌŋkʃən', 'A block of code that performs a specific task', 'Belirli bir görevi yapan kod bloğu', 'This function calculates the total price.', 'Bu fonksiyon toplam fiyatı hesaplar.', 'fundamentals', 'B1', 8),
    (sector_id_val, 'Variable', 'ˈveəriəbl', 'A container for storing data values', 'Veri değerlerini saklamak için kullanılan birim', 'Define a variable to store the user name.', 'Kullanıcı adını saklamak için bir değişken tanımlayın.', 'fundamentals', 'B1', 9),
    (sector_id_val, 'API', 'ˌeɪ piː ˈaɪ', 'Application Programming Interface; allows apps to talk to each other', 'Uygulama Programlama Arayüzü; uygulamaların haberleşmesini sağlar', 'We use the Google Maps API.', 'Google Haritalar API''sini kullanıyoruz.', 'fundamentals', 'B2', 10),
    (sector_id_val, 'Backend', 'ˈbækend', 'The server-side of an application', 'Bir uygulamanın sunucu tarafı', 'He specializes in backend development.', 'O, backend geliştirme konusunda uzmanlaşmıştır.', 'fundamentals', 'B2', 11),
    (sector_id_val, 'Frontend', 'ˈfrʌntend', 'The client-side of an application that users see', 'Bir uygulamanın kullanıcının gördüğü ön yüzü', 'The frontend needs to be responsive.', 'Frontend''in mobil uyumlu olması gerekir.', 'fundamentals', 'B2', 12),
    (sector_id_val, 'Server', 'ˈsɜːrvər', 'A computer that provides data to other computers', 'Diğer bilgisayarlara veri sağlayan bilgisayar', 'The server is down for maintenance.', 'Sunucu bakım nedeniyle kapalı.', 'fundamentals', 'B1', 13),
    (sector_id_val, 'Deployment', 'dɪˈplɔɪmənt', 'The process of making software available for use', 'Yazılımı kullanıma sunma süreci', 'The deployment was successful.', 'Deployment (canlıya alma) başarılı oldu.', 'fundamentals', 'C1', 14),
    (sector_id_val, 'Repository', 'rɪˈpɒzɪtri', 'A central location where data/code is stored', 'Veri veya kodun saklandığı merkezi yer', 'Push your changes to the git repository.', 'Değişikliklerinizi git deposuna gönderin.', 'fundamentals', 'C1', 15),
    (sector_id_val, 'Open Source', 'ˈəʊpən sɔːs', 'Software with source code that anyone can inspect', 'Kaynak kodu herkes tarafından incelenebilen yazılım', 'Linux is an open source operating system.', 'Linux açık kaynaklı bir işletim sistemidir.', 'fundamentals', 'B2', 16),
    (sector_id_val, 'Compiler', 'kəmˈpaɪlər', 'A program that translates code into machine language', 'Kodu makine diline çeviren program', 'The compiler found a syntax error.', 'Derleyici bir sözdizimi hatası buldu.', 'fundamentals', 'C1', 17),
    (sector_id_val, 'Interface', 'ˈɪntəfeɪs', 'A shared boundary across which two components exchange information', 'İki bileşenin bilgi alışverişi yaptığı ortak sınır', 'The user interface is very intuitive.', 'Kullanıcı arayüzü çok sezgisel.', 'fundamentals', 'B2', 18),
    (sector_id_val, 'Syntax', 'ˈsɪntæks', 'The set of rules that defines the combinations of symbols', 'Sembol kombinasyonlarını tanımlayan kurallar dizisi', 'Python syntax is easy to read.', 'Python sözdizimi okuması kolaydır.', 'fundamentals', 'C1', 19),
    (sector_id_val, 'Query', 'ˈkwɪəri', 'A request for data or information from a database', 'Veritabanından veri veya bilgi isteği / sorgusu', 'Write a SQL query to find the user.', 'Kullanıcıyı bulmak için bir SQL sorgusu yazın.', 'fundamentals', 'B2', 20)
    ON CONFLICT (sector_id, word) DO UPDATE 
    SET definition_en = EXCLUDED.definition_en,
        definition_tr = EXCLUDED.definition_tr,
        example_sentence = EXCLUDED.example_sentence,
        example_sentence_tr = EXCLUDED.example_sentence_tr,
        category = EXCLUDED.category,
        cefr_level = EXCLUDED.cefr_level;


    -- =====================================================
    -- CATEGORY 2: INFRASTRUCTURE & CLOUD (20 words)
    -- =====================================================
    INSERT INTO sector_vocabulary (sector_id, word, pronunciation, definition_en, definition_tr, example_sentence, example_sentence_tr, category, cefr_level, frequency_rank) VALUES
    (sector_id_val, 'Cloud Computing', 'klaʊd kəmˈpjuːtɪŋ', 'Delivery of computing services over the internet', 'Bilgisayar hizmetlerinin internet üzerinden sunulması', 'We are migrating our data to cloud computing.', 'Verilerimizi bulut bilişime taşıyoruz.', 'infrastructure', 'B2', 21),
    (sector_id_val, 'Virtual Machine', 'ˈvɜːtʃuəl məˈʃiːn', 'A digital version of a physical computer', 'Fiziksel bir bilgisayarın dijital versiyonu', 'Run the test on a virtual machine.', 'Testi bir sanal makinede çalıştırın.', 'infrastructure', 'B2', 22),
    (sector_id_val, 'Bandwidth', 'ˈbændwɪdθ', 'The maximum data transfer rate of a network', 'Bir ağın maksimum veri aktarım hızı', 'Video streaming requires high bandwidth.', 'Video akışı yüksek bant genişliği gerektirir.', 'infrastructure', 'C1', 23),
    (sector_id_val, 'Firewall', 'ˈfaɪəwɔːl', 'A network security system that monitors traffic', 'Ağ trafiğini izleyen güvenlik sistemi', 'The firewall blocked the unauthorized access.', 'Güvenlik duvarı yetkisiz erişimi engelledi.', 'infrastructure', 'B2', 24),
    (sector_id_val, 'Latency', 'ˈleɪtənsi', 'The delay before a transfer of data begins', 'Veri aktarımı başlamadan önceki gecikme', 'Low latency is crucial for online gaming.', 'Online oyunlar için düşük gecikme kritiktir.', 'infrastructure', 'C1', 25),
    (sector_id_val, 'Protocol', 'ˈprəʊtəkɒl', 'A set of rules for data exchange', 'Veri alışverişi için kurallar dizisi', 'HTTP is the standard protocol for the web.', 'HTTP, web için standart protokoldür.', 'infrastructure', 'B2', 26),
    (sector_id_val, 'Scalability', 'ˌskeɪləˈbɪləti', 'The capability of a system to handle a growing amount of work', 'Bir sistemin artan iş yükünü karşılama yeteneği', 'Scalability is a key feature of this architecture.', 'Ölçeklenebilirlik bu mimarinin kilit özelliğidir.', 'infrastructure', 'C1', 27),
    (sector_id_val, 'Encryption', 'ɪnˈkrɪpʃn', 'The process of converting information into a code', 'Bilgiyi şifreye dönüştürme süreci', 'End-to-end encryption protects your messages.', 'Uçtan uca şifreleme mesajlarınızı korur.', 'infrastructure', 'B2', 28),
    (sector_id_val, 'Backup', 'ˈbækʌp', 'A copy of a file or other item of data', 'Dosya veya verinin kopyası (yedek)', 'Always create a backup of your files.', 'Dosyalarınızın her zaman yedeğini alın.', 'infrastructure', 'A2', 29),
    (sector_id_val, 'Operating System', 'ˈɒpəreɪtɪŋ ˈsɪstəm', 'Software that manages computer hardware and resources', 'Bilgisayar donanımını ve kaynaklarını yöneten yazılım', 'Windows is a popular operating system.', 'Windows popüler bir işletim sistemidir.', 'infrastructure', 'B1', 30),
    (sector_id_val, 'IP Address', 'aɪ piː əˈdres', 'A unique string of numbers separated by periods that identifies each computer', 'Her bilgisayarı tanımlayan noktalarla ayrılmış benzersiz sayı dizisi', 'Check your IP address in the settings.', 'Ayarlardan IP adresinizi kontrol edin.', 'infrastructure', 'B1', 31),
    (sector_id_val, 'Domain', 'dəˈmeɪn', 'The name of a website', 'Bir web sitesinin adı (alan adı)', 'We bought a new domain for the project.', 'Proje için yeni bir alan adı satın aldık.', 'infrastructure', 'B1', 32),
    (sector_id_val, 'Hosting', 'ˈhəʊstɪŋ', 'Service that creates and maintains a website', 'Web sitesi barındırma hizmeti', 'We use AWS for hosting our application.', 'Uygulamamızı barındırmak için AWS kullanıyoruz.', 'infrastructure', 'B1', 33),
    (sector_id_val, 'Cybersecurity', 'ˌsaɪbəsɪˈkjʊərəti', 'Protection of computer systems from theft or damage', 'Bilgisayar sistemlerinin korunması (siber güvenlik)', 'Cybersecurity is a growing field.', 'Siber güvenlik büyüyen bir alandır.', 'infrastructure', 'B2', 34),
    (sector_id_val, 'Malware', 'ˈmælweər', 'Software that is intended to damage or disable computers', 'Bilgisayarlara zarar vermeyi amaçlayan yazılım', 'The antivirus software detected malware.', 'Antivirüs yazılımı kötü amaçlı yazılım tespit etti.', 'infrastructure', 'C1', 35),
    (sector_id_val, 'Load Balancer', 'ləʊd ˈbælənsər', 'A device that distributes network or application traffic', 'Ağ veya uygulama trafiğini dağıtan cihaz', 'The load balancer prevents server overload.', 'Yük dengeleyici sunucunun aşırı yüklenmesini önler.', 'infrastructure', 'C1', 36),
    (sector_id_val, 'Container', 'kənˈteɪnər', 'A standard unit of software that packages up code', 'Kodu paketleyen standart yazılım birimi', 'Docker is a popular container platform.', 'Docker popüler bir konteyner platformudur.', 'infrastructure', 'B2', 37),
    (sector_id_val, 'Cluster', 'ˈklʌstər', 'A set of connected computers that work together', 'Birlikte çalışan bağlı bilgisayarlar kümesi', 'We have a Kubernetes cluster.', 'Bir Kubernetes kümemiz var.', 'infrastructure', 'C1', 38),
    (sector_id_val, 'Log', 'lɒɡ', 'A record of events that occurred within a system', 'Sistem içinde gerçekleşen olayların kaydı', 'Check the error log for details.', 'Detaylar için hata kaydını (log) kontrol edin.', 'infrastructure', 'B1', 39),
    (sector_id_val, 'Terminal', 'ˈtɜːrmɪnl', 'A text-based interface used to control a computer', 'Bilgisayarı kontrol etmek için kullanılan metin tabanlı arayüz', 'Open the terminal to run the script.', 'Komut dosyasını çalıştırmak için terminali açın.', 'infrastructure', 'B1', 40)
    ON CONFLICT (sector_id, word) DO UPDATE 
    SET definition_en = EXCLUDED.definition_en,
        definition_tr = EXCLUDED.definition_tr,
        example_sentence = EXCLUDED.example_sentence,
        example_sentence_tr = EXCLUDED.example_sentence_tr,
        category = EXCLUDED.category,
        cefr_level = EXCLUDED.cefr_level;

    RAISE NOTICE 'IT & Software vocabulary seed Part 1 completed: 40 words inserted';
    
END $$;
