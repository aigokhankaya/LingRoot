BÖLÜM IV: YÜKSEK DOĞRULUKLU TÜRKÇE HİZALAMA İÇİN ADIM ADIM TEKNİK YOL HARİTASI (PIPELINE)Bu bölüm, teoriyi pratiğe döker. Kullanıcının Google TTS'ten (veya Amazon Polly'den) aldığı bir .wav ses dosyası ve .txt transkripti ile başlayıp, fonem düzeyinde zaman damgalı yüksek hassasiyetli bir JSON dosyası elde etmek için gereken tüm adımları, sorgulanan dil olan Türkçe için özel olarak detaylandırır.4.1. Ön Koşullar: MFA ve Türkçe Dil BileşenleriMFA, "boş" bir araçtır; gücünü ve doğruluğunu, her dil için özel olarak eğitilmiş bileşenlerden alır.26 Türkçe için sağlam bir iş akışı kurmak amacıyla, MFA'nın önceden eğitilmiş (pre-trained) modellerinden üç temel bileşene ihtiyacımız vardır:Türkçe Akustik Model (Acoustic Model):Görevi: Türkçe'deki fonemlerin (seslerin) akustik özelliklerini (MFCC) modelleyen GMM-HMM istatistiksel modelidir.Kullanılacak Model: turkish_mfa_acoustic_model_v3_0_0.42 Bu model, Common Voice ve GlobalPhone gibi veri setlerindeki Türkçe konuşmalar kullanılarak eğitilmiştir.42İndirme Komutu: mfa model download acoustic turkish_mfa (MFA v3.x sözdizimine göre 44).Türkçe Telaffuz Sözlüğü (Pronunciation Dictionary / Lexicon):Görevi: Türkçe kelimelerin (grafem) hangi fonem dizilerinden (telaffuz) oluştuğunu eşleyen bir haritalama dosyasıdır. (Örn: kitap k i t a p).Kullanılacak Model: turkish_cv_dictionary_v2_0_0.45 Bu, Common Voice Türkçe veri seti için oluşturulmuş iyi bir temel sözlüktür.İndirme Komutu: mfa model download dictionary turkish_cv.45Türkçe Grafem-Fonem (G2P) Modeli:Görevi: Bu, iş akışının en kritik parçasıdır. Temel sözlükte (yukarıdaki) bulunmayan kelimelerin (Örn: "YapayZeka", "İstanbul'daki", özel isimler) yazılışından (grafem) okunuşunu (fonem) tahmin eden modeldir.Kullanılacak Model: turkish_mfa_g2p_model_v2_0_0.46İndirme Komutu: mfa model download g2p turkish_mfa (MFA v3.x sözdizimine göre 44).MFA'nın kendisi Docker 48 veya Conda 49 aracılığıyla kolayca kurulabilir.4.2. Adım Adım İş Akışı (Pipeline)Aşağıdaki iş akışı, dinamik olarak üretilen (örn. kullanıcı girdisinden veya bir haber kaynağından gelen) metinler için dahi çalışacak sağlam bir yapı sunar.Adım 1: Girdi Hazırlığı (Corpus Setup)Google TTS veya Amazon Polly'den ses ve metin girdilerini alın. MFA'nın çalışması için bu dosyaların belirli bir yapıda olması gerekir:Bir ana klasör oluşturun (örn. seslerim/).Google TTS'ten aldığınız sesi seslerim/ornek_1.wav olarak kaydedin.Bu sesin tam transkriptini seslerim/ornek_1.txt olarak kaydedin.Kural: Ses dosyası (.wav) ve transkript dosyası (.txt veya .lab) tam olarak aynı dosya adına (uzantı hariç) sahip olmalıdır.51 Transkript, noktalama işaretlerinden arındırılmış, sadece söylenen kelimeleri içermelidir.Adım 2: Kapsamlı Sözlük Oluşturma (G2P ile)İndirilen turkish_cv sözlüğü, transkriptinizdeki tüm kelimeleri (özellikle özel isimler veya teknik terimler) içermeyebilir. MFA, sözlükte olmayan (OOV - Out-of-Vocabulary) kelimeleri hizalayamaz. Bu sorunu aşmak için, G2P modelini kullanarak transkriptlerimizdeki tüm kelimeleri kapsayan özel bir sözlük oluşturmalıyız.Aşağıdaki komut, seslerim/ klasöründeki tüm .txt dosyalarını tarar, kelime listesini çıkarır, bu kelimeleri turkish_mfa_g2p_model_v2_0_0 modelini kullanarak fonetik karşılıklarına dönüştürür 52 ve seslerim_icin_sozluk.txt adında yeni, kapsamlı bir sözlük dosyası oluşturur:Bashmfa g2p seslerim/ turkish_mfa_g2p_model_v2_0_0 seslerim_icin_sozluk.txt
Bu adım, iş akışını statik bir sözlüğe bağımlı olmaktan çıkarır ve dinamik hale getirir.Adım 3: Zorunlu Hizalama (Alignment)Artık elimizde sesler (seslerim/ornek_1.wav), transkriptler (seslerim/ornek_1.txt), kapsamlı bir telaffuz sözlüğü (seslerim_icin_sozluk.txt) ve eğitilmiş bir akustik model (turkish_mfa_acoustic_model_v3_0_0) var. Hizalama komutunu çalıştırmaya hazırız:Bashmfa align seslerim/ seslerim_icin_sozluk.txt turkish_mfa_acoustic_model_v3_0_0 cikti_klasoru/ --output_format json
Bu komut 26:seslerim/ içindeki her ses/metin çiftini alır.seslerim_icin_sozluk.txt ve turkish_mfa_acoustic_model_v3_0_0 kullanarak hizalar.Sonuçları cikti_klasoru/ içine kaydeder.Kritik Parametre: --output_format json.55 MFA varsayılan olarak fonetikçilerin kullandığı Praat TextGrid (.TextGrid) formatında çıktı verir.51 Bu, web geliştiricileri için kullanışsızdır. json formatını 48 belirtmek, doğrudan işlenebilir bir veri yapısı sunar.4.3. Çıktı: MFA JSON Formatının YorumlanmasıYukarıdaki komutun çıktısı, cikti_klasoru/ornek_1.json gibi bir dosya olacaktır. Bu JSON dosyasının yapısı57 ve 57 kaynaklarında belgelenen formata benzer olacaktır ve bir web uygulamasının ihtiyaç duyduğu tüm verileri içerir.JSON çıktısı, tiers (katmanlar) adlı bir ana nesne içerecektir. Bu nesnenin içinde iki anahtar bulunur: words (kelimeler) ve phones (fonemler).57 Her katman, [baslangic_saniyesi, bitis_saniyesi, "etiket"] formatında bir entries (girişler) dizisi içerir.Örnek cikti_klasoru/ornek_1.json Çıktı Yapısı:(Metin: "Merhaba dünya")JSON{
  "tmin": 0.0,
  "tmax": 1.45,
  "tiers": {
    "words": {
      "tmin": 0.0,
      "tmax": 1.45,
      "entries": [0.0, 0.15, "sil"],
        [0.15, 0.78, "merhaba"],
        [0.78, 1.25, "dünya"],
        [1.25, 1.45, "sil"]
    },
    "phones": {
      "tmin": 0.0,
      "tmax": 1.45,
      "entries": [0.0, 0.15, "sil"],
        [0.15, 0.23, "m"],
        [0.23, 0.31, "e"],
        [0.31, 0.39, "ɾ"],
        [0.39, 0.48, "h"],
        [0.48, 0.59, "a"],
        [0.59, 0.68, "b"],
        [0.68, 0.78, "a"],
        [0.78, 0.86, "d"],
        [0.86, 0.95, "y"],
        [0.95, 1.07, "n"],
        [1.07, 1.25, "a"],
        [1.25, 1.45, "sil"]
    }
  }
}
Bu JSON çıktısı, Google/Polly'nin "tahmini" zaman damgalarının aksine, ses dosyasının "ölçülmüş" akustik gerçekliğini temsil eder. words katmanı, kelime kelime vurgulama için kullanılabilir. Ancak phones (fonem) katmanı 26, akıcı "karaoke" efektleri ve dudak senkronizasyonu için gereken gerçek milisaniye hassasiyetini sağlar.BÖLÜM V: PRATİK UYGULAMA: FRONTEND'DE FONEM DÜZEYİNDE SENKRONİZASYON (REACT & JAVASCRIPT)Bölüm IV'te, sesi (audio.wav) ve bu sese ait yüksek doğruluklu zaman damgası verisini (timestamps.json) üreten sağlam bir backend iş akışı oluşturuldu. Bu bölümde, bu verilerin bir React web uygulamasında, "%100'e yakın" doğrulukla, akıcı ve "karaoke tarzı" 58 bir metin vurgulama efekti oluşturmak için nasıl kullanılacağı incelenecektir.5.1. Temel Bileşenler: <audio> Elemanı ve Zaman Damgası VerisiBaşarılı bir frontend senkronizasyonu için iki ana bileşen gereklidir:Ses Elemanı Referansı: Sesi çalmak için standart HTML5 <audio> elemanı kullanılır. Bu elemanın mevcut zamanını (playback time) programatik olarak okuyabilmek için, React'in useRef hook'u ile bir referans oluşturulur: const audioRef = useRef(null);.61Zaman Damgası Verisi: Bölüm IV'te üretilen timestamps.json dosyası, uygulamanın state'ine veya (daha performanslı bir yaklaşım olarak) bir referansına yüklenir.Tüm senkronizasyon mantığının kalbi, sesin o anki çalma zamanını döndüren audioRef.current.currentTime 61 özelliğini yüksek frekansta okumak ve bu değeri zaman damgası verisiyle karşılaştırmaktır.5.2. Senkronizasyon Döngüsü: Neden onTimeUpdate Yetersiz, requestAnimationFrame İdealdircurrentTime değerini okumak için iki yaygın yaklaşım vardır, ancak bu yaklaşımlar arasında performans ve akıcılık açısından çok büyük bir fark bulunur.Yavaş ve Yetersiz Yaklaşım: onTimeUpdate Event'iHTML5 <audio> elemanı, ses çalarken periyodik olarak timeupdate 64 adında bir event fırlatır. Bu event'i dinleyerek currentTime değerini almak mümkündür.61Sorun: Bu event'in tetiklenme frekansı (sıklığı) son derece düşüktür ve tarayıcı tarafından garanti edilmez. Spesifikasyonlara göre, bu frekans sistem yüküne bağlı olarak saniyede 4 kez (4Hz, her 250ms'de bir) ile saniyede 66 kez (66Hz) arasında değişebilir.64 Pratikte, çoğu tarayıcı bu olayı ~250ms (saniyede 4 kez) aralıklarla tetikler.66Etkisi: Bu, akıcı bir animasyon için kabul edilemez derecede yavaştır.67 Fonemlerin (örn. [0.15, 0.23, "m"]) sadece 80 milisaniye sürdüğü bir dünyada, arayüzü her 250 milisaniyede bir güncellemek, birden fazla fonemin atlanmasına, görsel "takılmalara" (jank) ve ses ile görüntü arasında belirgin bir "kaymaya" neden olacaktır.Hızlı ve İdeal Yaklaşım: requestAnimationFrame (rAF)window.requestAnimationFrame() 68, tarayıcıya "bir sonraki boyama (repaint) işleminden hemen önce" belirtilen bir fonksiyonu çalıştırmasını söyleyen, yüksek performanslı bir animasyon API'sidir.Avantajı: Bu, onTimeUpdate gibi belirsiz aralıklarla değil, genellikle ekranın yenileme hızıyla (örn. 60Hz veya 120Hz) senkronize olarak çalışır.68 Bu, bize saniyede 60 ila 120 kez audio.currentTime değerini kontrol etme ve arayüzü (DOM) güncelleme şansı verir; bu da mükemmel akıcılıkta, pürüzsüz bir animasyon (karaoke efekti) 69 anlamına gelir.React Entegrasyonu: Bu rAF döngüsü, bir useEffect hook'u içinde başlatılır ve bileşen kaldırıldığında (unmount) cancelAnimationFrame ile temizlenir.715.3. React için Yüksek Performanslı "Karaoke" Hook'u TasarımıAşağıda, MFA'dan alınan timestamps.json verisini (words veya phones katmanı) kullanarak yüksek performanslı bir vurgulama bileşeninin temel mantığı yer almaktadır.1. Veri Yapısı ve State:Zaman damgası verisi büyük olabileceğinden, her rAF döngüsünde yeniden render tetiklememek için veriyi bir useRef içinde saklamak, sadece o an aktif olan kelimenin/fonemin indeksini (dizinini) useState içinde tutmak en performanslı yaklaşımdır.JavaScriptimport React, { useState, useRef, useEffect } from 'react';
// mfa_json_output, Bölüm IV'teki JSON verisidir.
const wordEntries = mfa_json_output.tiers.words.entries;

const AudioHighlighter = ({ audioSrc }) => {
  const [activeIndex, setActiveIndex] = useState(-1);
  const audioRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  // Zaman damgası verisini bir ref'te sakla
  const timestampData = useRef(wordEntries);
};
2. Yüksek Performanslı Animasyon Döngüsü:rAF döngüsü, ses çalmaya başladığında (onplay) başlamalı ve durduğunda (onpause) veya bittiğinde (onended) durmalıdır.JavaScript//... bileşen içinde...
const animationLoop = () => {
  const currentTime = audioRef.current? audioRef.current.currentTime : 0;

  // Mevcut 'currentTime'a uyan indeksi bul
  const newActiveIndex = findCurrentIndex(timestampData.current, currentTime);

  // Sadece 'activeIndex' değiştiyse state'i güncelle (DOM'u yeniden render et)
  if (newActiveIndex!== activeIndex) {
    setActiveIndex(newActiveIndex);
  }
  
  // Döngünün bir sonraki karede devam etmesini sağla
  animationFrameRef.current = requestAnimationFrame(animationLoop);
};

// Yardımcı fonksiyon: O(log N) veya O(1) olmalı
const findCurrentIndex = (data, time) => {
  // Basit bir O(N) arama:
  // return data.findIndex(entry => time >= entry && time <= entry[1]);
  // Daha performanslı bir O(log N) - binary search - veya O(1) amortized pointer gerekir.
};

useEffect(() => {
  const audioEl = audioRef.current;
  if (!audioEl) return;

  const startLoop = () => {
    animationFrameRef.current = requestAnimationFrame(animationLoop);
  };

  const stopLoop = () => {
    cancelAnimationFrame(animationFrameRef.current);
  };

  audioEl.addEventListener('play', startLoop);
  audioEl.addEventListener('pause', stopLoop);
  audioEl.addEventListener('ended', stopLoop);

  // Temizleme fonksiyonu
  return () => {
    stopLoop();
    audioEl.removeEventListener('play', startLoop);
    audioEl.removeEventListener('pause', stopLoop);
    audioEl.removeEventListener('ended', stopLoop);
  };
}, [activeIndex]); // activeIndex'e bağımlılık, state'in döngü içinde taze kalmasını sağlar
3. Render (Görüntüleme):Render fonksiyonu artık çok basittir. Zaman damgası verisini .map() ile dolaşır ve activeIndex ile eşleşen elemana bir CSS sınıfı ('highlight') ekler.58JavaScript//... bileşen içinde...
  return (
    <div>
      <audio ref={audioRef} src={audioSrc} controls />
      <div className="transcript">
        {timestampData.current.map((entry, index) => {
          const text = entry[2]; // örn: "merhaba" veya "sil"
          if (text === "sil") return null; // Sessizlikleri gösterme

          return (
            <span 
              key={index} 
              className={`word ${index === activeIndex? 'highlight' : ''}`}
            >
              {text}{' '}
            </span>
          );
        })}
      </div>
    </div>
  );
};
Performans ve Kullanıcı Deneyimi için İleri Düzey İyileştirmelerYukarıdaki kod, temel mantığı oluşturur, ancak gerçek bir üretim uygulaması için iki kritik iyileştirme gereklidir:1. $O(1)$ Amortize Edilmiş Arama (Performans):animationLoop fonksiyonu saniyede 60 kez çalışır. Bu döngü içinde çalışan findCurrentIndex fonksiyonu, tüm zaman damgası dizisinde (timestampData.current) her seferinde arama yaparsa (örn. .find() veya .findIndex()), bu $O(N)$ karmaşıklığında bir işlem olur. Uzun bir ses dosyasında (N = 10,000 kelime), bu, tarayıcıyı yavaşlatır.Daha İyi Yaklaşım ($O(1)$ Amortize Edilmiş): Ses sadece ileri doğru aktığı için, tüm diziyi aramak gereksizdir. Bir "ilerleyen işaretçi" (advancing pointer) deseni kullanılmalıdır. Bu işaretçi, o anki activeIndex'i tutar ve sadece currentTime'ın bir sonraki kelimenin/fonemin başlangıç zamanını geçip geçmediğini kontrol eder. Bu, aramayı $O(N)$'den $O(1)$ amortize edilmiş karmaşıklığa düşürür ve rAF döngüsünü ultra-hızlı hale getirir.2. Heceleme (Syllabification) ile Mükemmel UX (Kullanıcı Deneyimi):Nihai hedef, mükemmel bir kullanıcı deneyimidir.75Fonem Düzeyinde Vurgulama: MFA'nın phones katmanını 57 kullanmak, teknik olarak en doğru olanıdır. Ancak "m", "e", "r" gibi tek tek fonemleri vurgulamak, çok hızlı ve "titrek" (jittery) bir görünüme neden olabilir.Kelime Düzeyinde Vurgulama: words katmanını kullanmak (yukarıdaki örnekteki gibi), "merhaba" gibi uzun bir kelimenin tek seferde yanıp sönmesine 58 neden olur. Bu, "karaoke" efekti 76 için yavaş ve "hantal" (clunky) bir his verir.İdeal Çözüm (Hece Düzeyi): İdeal kullanıcı deneyimi (UX), bu ikisinin arasında yer alır: hece düzeyi ("mer-ha-ba").75 Bu, hem akıcı hem de anlamsal olarak doğru bir görsel ritim sağlar.Nihai Çözüm Mimarisi:Backend (MFA): Bölüm IV'teki gibi çalıştırılır ve fonem düzeyinde timestamps.json elde edilir.Backend (Post-processing): Basit bir Türkçe heceleme kütüphanesi (örn. zemberek-nlp veya kural tabanlı bir regex) kullanılarak, timestamps.json dosyası işlenir. Bu betik, fonemleri (örn. "m", "e", "ɾ") heceler ("mer") halinde gruplar ve bitişik fonemlerin başlangıç ve bitiş zamanlarını birleştirir (örn. [0.15, 0.39, "mer"]).Frontend (React): Bu yeni heceler.json dosyasını alır ve Bölüm 5.3'teki requestAnimationFrame döngüsünü, $O(1)$ amortize edilmiş arama ile bu hece verisiyle besler.Bu yaklaşım, kullanıcının "senkron kayması" sorununu çözmekle kalmaz, aynı zamanda son kullanıcı için algısal olarak mümkün olan en iyi senkronizasyon deneyimini sunar.

yukarıda Türkçe için verilen modeller yerine ABD ingilzicesi için aşağıdaki modeller kullanılacak:

Elbette, her üç bileşen için en uygun ve birbiriyle tam uyumlu İngilizce (ABD İngilizcesi) modellerini toparlayalım.

MFA'da en önemli kural, bu üç bileşenin de aynı fonem (phoneme) setini kullanmasıdır. Türkçe için _mfa_ ve _cv_ uzantılı modelleri kullanmışsınız. İngilizce için de benzer şekilde en güncel ve tutarlı olan _mfa_ setini kullanmak en iyi sonucu verecektir.

İşte en uygun İngilizce (US English) seti:

🏛️ En Uygun İngilizce MFA Seti (Modern Standart)

Bu set, MFA'nın güncel sürümleri için önerilen standarttır ve tüm bileşenler birbiriyle uyumludur.

1. Akustik Model (MFA)

Kısa Ad (İndirme için): english_mfa

İndirme Komutu: mfa model download acoustic english_mfa

(Muhtemelen İnecek Model Adı: english_mfa_acoustic_model_v3.1.0 veya daha yenisi)

2. Telaffuz Sözlüğü (Pronunciation Dictionary)

Kısa Ad (İndirme için): english_mfa

İndirme Komutu: mfa model download dictionary english_mfa

(Muhtemelen İnecek Model Adı: english_mfa_dictionary_v3.0.0 veya daha yenisi)

3. G2P Modeli (Grapheme-to-Phoneme)

Kısa Ad (İndirme için): english_mfa

İndirme Komutu: mfa model download g2p english_mfa

(Muhtemelen İnecek Model Adı: english_mfa_g2p_model_v3.0.0 veya daha yenisi)



ingiliz ingilizcesi içinse:

1. Akustik Model (MFA)

İlginç bir şekilde, MFA'nın en güncel ana İngilizce akustik modeli (english_mfa) artık birden fazla diyalekti (ABD, İngiltere, Hindistan, Nijerya dahil) içeren devasa veri setleri üzerinde eğitilmektedir.

Bu nedenle, spesifik bir english_uk_mfa akustik modeli yerine, bu çok diyalektli ana modeli kullanmanız önerilir. Bu model, özel UK sözlüğü ile birleştiğinde İngiliz aksanını doğru şekilde hizalayacaktır.

Kısa Ad (İndirme için): english_mfa

İndirme Komutu: mfa model download acoustic english_mfa

2. Telaffuz Sözlüğü (Pronunciation Dictionary)

Bu bileşen, İngiliz İngilizcesi için kritik farkı yaratır. Amerikan telaffuzundan (örn: "water" /wɑtər/) farklı olan İngiliz telaffuzlarını (örn: "water" /wɔːtə/) içerir.

Kısa Ad (İndirme için): english_uk_mfa

İndirme Komutu: mfa model download dictionary english_uk_mfa

3. G2P Modeli (Grapheme-to-Phoneme)

Bu model, sözlükte olmayan kelimeler için özel olarak İngiliz İngilizcesi telaffuz kurallarını uygulayarak fonem üretir.

Kısa Ad (İndirme için): english_uk_mfa

İndirme Komutu: mfa model download g2p english_uk_mfa

