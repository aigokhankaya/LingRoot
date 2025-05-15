import React, { useState } from 'react';
import Link from 'next/link';

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

// The user should ensure the CSS from the original 'lingroot_homepage_v1_modern_video 2.html' 
// (specifically the <style> block) is available globally in their project for this component to be styled correctly.

export default function HomePage() {
  const [selectedLevel, setSelectedLevel] = useState('A1');

  // Emoji fallback for icons if PNGs are not present in public/
  const icons = {
    upload: '/placeholder_icon_upload.png',
    level: '/placeholder_icon_level.png',
    learn: '/placeholder_icon_learn.png',
    adaptive: '/placeholder_icon_adaptive.png',
    pronunciation: '/placeholder_icon_pronunciation.png',
    vocabulary: '/placeholder_icon_vocabulary.png',
    real_content: '/placeholder_icon_real_content.png',
    progress: '/placeholder_icon_progress.png',
    flexible: '/placeholder_icon_flexible.png',
  };
  const iconFallback = {
    upload: '📤',
    level: '🎯',
    learn: '🚀',
    adaptive: '🧠',
    pronunciation: '🗣️',
    vocabulary: '📚',
    real_content: '🌍',
    progress: '📈',
    flexible: '🕒',
  };

  // Helper to render icon or fallback
  const ImgOrEmoji = ({ src, alt, fallback }: { src: string; alt: string; fallback: string }) => (
    <img
      src={src}
      alt={alt}
      style={{ width: 60, height: 60, marginBottom: '1rem', backgroundColor: '#e0e0e0', borderRadius: '50%' }}
      onError={e => {
        const img = e.target as HTMLImageElement;
        img.onerror = null;
        img.style.display = 'none';
        if (img.parentNode) {
          const span = document.createElement('span');
          span.style.fontSize = '2.5rem';
          span.style.display = 'inline-block';
          span.textContent = fallback;
          img.parentNode.appendChild(span);
        }
      }}
    />
  );

  return (
    // The body tag's styles from the original CSS will apply to the parent element in a real app context or via a global stylesheet.
    // We'll start with the header and main content wrapper if needed.
    <>
      <header>
        <div className="logo"><span className="ling">Ling</span><span className="root">Root</span></div>
        <nav>
          <a href="#how-it-works">Nasıl Çalışır?</a>
          <a href="#features">Özellikler</a>
          <a href="#pricing">Fiyatlandırma</a>
          {/* Assuming Next.js Link is a project requirement for navigation */}
          <Link href="/login" legacyBehavior><a className="">Giriş Yap</a></Link>
          <Link href="/register" legacyBehavior><a className="cta-button-nav">Kayıt Ol</a></Link>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-content-left">
          <h1>Tek Video, 6 Farklı Seviye: İngilizceyi Kendi Hızınızda Deneyimleyin!</h1>
          <p>LingRoot ile aynı ilgi çekici videoyu izleyin, seslendirme ve altyazıları A1'den C2'ye kadar kendi İngilizce seviyenize göre anında değiştirin. Dinleyerek ve izleyerek öğrenmenin en etkili yolu!</p>
          {/* Assuming Next.js Link is a project requirement */}
          <Link href="/register" legacyBehavior><a className="cta-button-hero">Hemen Ücretsiz Deneyin!</a></Link>
        </div>
        <div className="interactive-video-module-container">
          <div className="interactive-video-module">
            <div className="video-placeholder">
              {/* Content of video placeholder can be dynamic if needed, matching original HTML's text for now */}
              <span>Örnek Video Alanı ({selectedLevel} Ses ve Altyazı Aktif)</span>
            </div>
            <p style={{textAlign:"center", fontWeight:"bold", marginBottom:"0.8rem", fontSize:"0.95rem"}}>İzlediğiniz videonun seslendirmesini ve altyazısını değiştirmek için seviyenizi seçin:</p>
            <div className="level-selector">
              {LEVELS.map(level => (
                <button
                  key={level}
                  className={`level-button ${selectedLevel === level ? "active" : ""}`}
                  onClick={() => setSelectedLevel(level)}
                  data-level={level} // Keep data-level as in original HTML if its script relied on it, though React handles state
                >
                  {level}
                </button>
              ))}
            </div>
            <div className="subtitle-placeholder">
              <span>{selectedLevel} Seviyesi Altyazı burada görünecektir...</span>
            </div>
            <p style={{fontSize:"0.8rem", textAlign:"center", marginTop:"0.8rem", color:"#666"}}>Açıklama: Yukarıdaki video oynatıcı sabit kalacaktır. Seviye butonlarına tıklandığında, videonun sesi ve altyazıları seçilen İngilizce seviyesine göre anında güncellenecektir.</p>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="section">
        <h2>LingRoot Nasıl Çalışır? Sadece 3 Adımda!</h2>
        <div className="how-it-works-grid">
          <div className="step-item">
            <ImgOrEmoji src={icons.upload} alt="Upload Icon" fallback={iconFallback.upload} />
            <h3>1. İçeriğinizi Yükleyin</h3>
            <p>İstediğiniz YouTube videosunu, Spotify podcast'ini, metni veya dosyayı platforma yapıştırın veya yükleyin.</p>
          </div>
          <div className="step-item">
            <ImgOrEmoji src={icons.level} alt="Level Icon" fallback={iconFallback.level} />
            <h3>2. Seviyenizi Seçin</h3>
            <p>A1'den C2'ye kadar olan İngilizce seviyelerinden size en uygun olanı seçin.</p>
          </div>
          <div className="step-item">
            <ImgOrEmoji src={icons.learn} alt="Learn Icon" fallback={iconFallback.learn} />
            <h3>3. Öğrenmeye Başlayın!</h3>
            <p>LingRoot, içeriği sizin için anında uyarlar. Aynı videoyu farklı seviyelerde dinleyin, altyazıları takip edin ve İngilizcenizi geliştirin!</p>
          </div>
        </div>
      </section>

      <section id="features" className="section" style={{backgroundColor: "#fff"}}>
        <h2>Neden LingRoot? Benzersiz Özelliklerimiz</h2>
        <div className="features-grid">
          <div className="feature-item">
            <ImgOrEmoji src={icons.adaptive} alt="Adaptive Learning Icon" fallback={iconFallback.adaptive} />
            <h3>Kişiselleştirilmiş Öğrenme</h3>
            <p>Her içerik, sizin seviyenize ve ilgi alanlarınıza göre özel olarak uyarlanır.</p>
          </div>
          <div className="feature-item">
            <ImgOrEmoji src={icons.pronunciation} alt="Pronunciation Icon" fallback={iconFallback.pronunciation} />
            <h3>Telaffuz Pratiği</h3>
            <p>Gelişmiş yapay zeka ile konuşma becerilerinizi ve telaffuzunuzu mükemmelleştirin.</p>
          </div>
          <div className="feature-item">
            <ImgOrEmoji src={icons.vocabulary} alt="Vocabulary Icon" fallback={iconFallback.vocabulary} />
            <h3>Geniş Kelime Havuzu</h3>
            <p>Karşılaştığınız yeni kelimeleri kolayca öğrenin ve kalıcı hale getirin.</p>
          </div>
          <div className="feature-item">
            <ImgOrEmoji src={icons.real_content} alt="Real Content Icon" fallback={iconFallback.real_content} />
            <h3>Gerçek Dünya İçerikleri</h3>
            <p>Sıkıcı ders kitapları yerine, sevdiğiniz videolar ve podcast'lerle öğrenin.</p>
          </div>
          <div className="feature-item">
            <ImgOrEmoji src={icons.progress} alt="Progress Tracking Icon" fallback={iconFallback.progress} />
            <h3>İlerleme Takibi</h3>
            <p>Gelişiminizi adım adım takip edin ve motivasyonunuzu yüksek tutun.</p>
          </div>
          <div className="feature-item">
            <ImgOrEmoji src={icons.flexible} alt="Flexible Learning Icon" fallback={iconFallback.flexible} />
            <h3>Esnek ve Erişilebilir</h3>
            <p>İstediğiniz zaman, istediğiniz yerden öğrenme özgürlüğünün tadını çıkarın.</p>
          </div>
        </div>
      </section>

      <section className="testimonials section">
        <h2>Kullanıcılarımız Ne Diyor?</h2>
        <div className="testimonial-item">
          <p>"LingRoot sayesinde daha önce anlamakta zorlandığım videoları bile kendi seviyemde izleyebiliyorum. Aynı içeriği farklı seviyelerde dinlemek inanılmaz faydalı!"</p>
          <span>- Ayşe K.</span>
        </div>
        <div className="testimonial-item">
          <p>"İngilizce öğrenmek hiç bu kadar keyifli olmamıştı. Özellikle 6 seviyeli video özelliği harika bir fikir. Kesinlikle tavsiye ederim."</p>
          <span>- Mehmet Y.</span>
        </div>
      </section>

      <section className="section final-cta">
        <h2>İngilizce Öğrenme Yolculuğunuza Bugün Başlayın!</h2>
        <p>LingRoot'un benzersiz özelliklerini keşfedin ve İngilizce hedeflerinize daha hızlı ulaşın.</p>
        {/* Assuming Next.js Link is a project requirement */}
        <Link href="#signup" legacyBehavior><a className="cta-button-hero" style={{backgroundColor: "#28a745"}}>Hemen Kayıt Ol ve Ücretsiz Dene!</a></Link>
      </section>

      <footer>
        <p>&copy; 2025 LingRoot. Tüm hakları saklıdır.</p>
        <p>
          <a href="#privacy">Gizlilik Politikası</a> | 
          <a href="#terms">Kullanım Şartları</a> | 
          <a href="#contact">İletişim</a>
        </p>
      </footer>
      {/* The <script> block from the original HTML for level buttons is not needed here 
          as React handles the interactivity with useState and onClick handlers. */}
    </>
  );
}

