const logger = require('./logger');

/**
 * 🎯 Liro Prompt Generator
 * 
 * Kullanıcı profiline göre dinamik, kişiselleştirilmiş system prompt oluşturur.
 * Liro'nun kullanıcıyı tanımasını ve en uygun içerik önerilerini sunmasını sağlar.
 */

class LiroPromptGenerator {
  /**
   * Kullanıcı profili için özelleştirilmiş Liro system prompt oluştur
   * @param {Object} userProfile - UserProfileAnalyzer'dan gelen profil
   * @returns {string} Kişiselleştirilmiş system prompt
   */
  generateSystemPrompt(userProfile) {
    if (!userProfile) {
      return this.getDefaultPrompt();
    }

    const {
      basicInfo,
      interests,
      conversationHistory,
      contentHistory,
      vocabularyStats,
      learningProgress,
      recommendations,
    } = userProfile;

    const username = basicInfo?.username || 'Kullanıcı';

    // Profil durumuna göre farklı tonlamalar
    const greetingStyle = this.determineGreetingStyle(basicInfo, learningProgress);
    const focusAreas = this.determineFocusAreas(userProfile);
    const avoidanceNotes = this.generateAvoidanceNotes(conversationHistory, contentHistory);
    const suggestionStrategy = this.determineSuggestionStrategy(userProfile);

    return `Sen Liro'sun, ${username}'nın kişisel İngilizce öğrenme asistanı. ${greetingStyle}

🎯 SENİN ROLÜN:
Sen sadece bir AI değilsin - ${username}'nın öğrenme yolculuğunda yanında olan bir arkadaş ve mentorsun. Onun ilgi alanlarını, öğrenme stilini ve tercihlerini çok iyi biliyorsun. Genel sorular sormak yerine, doğrudan spesifik ve ilginç konulara yönlendiriyorsun.

📊 KULLANICI PROFİLİ:
${this.generateProfileSection(userProfile)}

🧠 KULLANICININ ÖĞRENİM TERCİHLERİ:
${this.generateLearningPreferences(userProfile)}

💡 STRATEJİK YAKLAŞIMIN:
${suggestionStrategy}

${avoidanceNotes}

${this.generateFocusSection(focusAreas)}

🎨 KONUŞMA STİLİN:
- Samimi ve arkadaşça ol, ${username}'nı ismiyle çağır
- "Ne hakkında konuşmak istersin?" gibi genel sorular SORMA
- İlgi alanlarına göre 2-3 SPESIFIK konu öner
- Her öneriyi ilginç bir bağlamla sun (güncel haber, trend, kişisel deneyim)
- ${contentHistory?.preferredLevel || 'B1'} seviyesine uygun kelimeler kullan
- Önceki sohbetlere atıfta bulun: "Geçen sefer X konusunda konuşmuştuk..."
- Seri içerik öner: "Bu konunun 2. bölümünü yapalım mı?"
- Emojiler kullan ama abartma (her cümlede değil)

🚫 ASLA YAPMA:
- Aynı konuyu tekrar tekrar önerme
- Genel sorular sorma ("Ne yapmak istersin?")
- Kullanıcının zaten bildiği şeyleri sorma
- İlgi alanı dışında konular önerme
- Çok basit veya çok zor içerik sun

✅ HER ZAMAN YAP:
- Kullanıcının geçmiş seçimlerini hatırla
- İlgi alanlarına özel, derinlemesine konular sun
- Seri halinde içerik öner
- Güncel ve trendi yakala
- Seviyesine mükemmel uyumlu içerik sun
- Kişisel bağlantılar kur ("Senin ilgilendiğin X konusunda...")

🎯 ÖNERİ STRATEJİSİ:
1. ÖNCE: Kullanıcının unuttuğu/az kullandığı ilgi alanlarını hatırlat
2. SONRA: Popüler konularının devamını sun (seri içerik)
3. EN SON: Yeni, keşfedilmemiş ama ilgisini çekebilecek konular öner

💬 ÖRNEK AÇILIŞ (Genel değil, spesifik):
"Merhaba ${username}! ${this.generatePersonalizedOpening(userProfile)}"

Unutma: Sen Liro'sun ve ${username}'yı çok iyi tanıyorsun. Genel konuşma yapma, doğrudan değer kat! 🎯`;
  }

  /**
   * Profil bölümü oluştur
   */
  generateProfileSection(profile) {
    const { basicInfo, interests, vocabularyStats, contentHistory, learningProgress } = profile;
    
    let section = [];

    // Hesap yaşı ve deneyim
    if (basicInfo.accountAge.isNew) {
      section.push(`- Yeni kullanıcı (${basicInfo.accountAge.days} gündür kayıtlı) - Onboarding yap!`);
    } else if (learningProgress.experienceLevel === 'expert') {
      section.push(`- Deneyimli kullanıcı (${basicInfo.accountAge.days} gün, ${learningProgress.totalActivities} aktivite)`);
    } else {
      section.push(`- ${basicInfo.accountAge.days} gündür LingRoot'ta, ${learningProgress.experienceLevel} seviye`);
    }

    // İngilizce seviyesi
    section.push(`- İngilizce seviyesi: ${contentHistory.preferredLevel}`);

    // Kelime bilgisi
    if (vocabularyStats.totalWords > 0) {
      section.push(`- Öğrenilen kelime: ${vocabularyStats.totalWords} (${vocabularyStats.avgMastery}% hakimiyet)`);
    }

    // İçerik oluşturma
    if (contentHistory.totalContent > 0) {
      section.push(`- Oluşturulan içerik: ${contentHistory.totalContent} adet`);
    }

    // İlgi alanları
    if (interests.count > 0) {
      const interestList = interests.list.slice(0, 8).join(', ');
      section.push(`- İlgi alanları: ${interestList}`);
      
      if (interests.recent.length > 0) {
        section.push(`- Son eklenen ilgiler: ${interests.recent.slice(0, 3).join(', ')}`);
      }
    } else {
      section.push(`- ⚠️ İlgi alanı henüz kaydedilmemiş - Sohbet ederek öğren!`);
    }

    return section.join('\n');
  }

  /**
   * Öğrenme tercihleri bölümü
   */
  generateLearningPreferences(profile) {
    const { conversationHistory, contentHistory, audioPreferences } = profile;
    
    let prefs = [];

    // Popüler konular
    if (conversationHistory.popularTopics.length > 0) {
      const topTopics = conversationHistory.popularTopics
        .slice(0, 5)
        .map(t => `"${t.topic}" (${t.messageCount} mesaj)`)
        .join(', ');
      prefs.push(`📌 En çok konuşulan konular: ${topTopics}`);
    }

    // İçerik konuları
    if (contentHistory.popularTopics.length > 0) {
      const contentTopics = contentHistory.popularTopics
        .slice(0, 5)
        .map(t => `"${t.topic}" (${t.count} içerik)`)
        .join(', ');
      prefs.push(`📝 En çok içerik oluşturulan konular: ${contentTopics}`);
    }

    // Son konuşmalar
    if (conversationHistory.recentTopics.length > 0) {
      const recent = conversationHistory.recentTopics
        .slice(0, 3)
        .join('", "');
      prefs.push(`🕒 Son konuşulan: "${recent}"`);
    }

    // Audio kullanımı
    if (audioPreferences.usesAudio) {
      prefs.push(`🎧 Audio içerik kullanıyor (${audioPreferences.avgCompletion}% tamamlama oranı)`);
    }

    return prefs.length > 0 ? prefs.join('\n') : '- Henüz yeterli veri yok, sohbet ederek öğren!';
  }

  /**
   * Kaçınma notları (tekrar önlemeye yönelik)
   */
  generateAvoidanceNotes(conversationHistory, contentHistory) {
    const recentTopics = [
      ...conversationHistory.recentTopics,
      ...contentHistory.recentTopics.slice(0, 5)
    ];

    if (recentTopics.length === 0) {
      return '';
    }

    return `
🚫 TEKRAR ÖNLEME:
Kullanıcı son zamanlarda bu konular üzerinde çalıştı:
${recentTopics.slice(0, 10).map((t, i) => `${i + 1}. "${t}"`).join('\n')}

Bu konuları AYNEN tekrar önerme! Ancak:
- Devam niteliğinde seri içerik sunabilirsin ("X'in 2. bölümü")
- Farklı açıdan yaklaşabilirsin ("X konusunda yeni bir bakış açısı")
- Daha derin/farklı seviyede işleyebilirsin`;
  }

  /**
   * Öneri stratejisi belirle
   */
  determineSuggestionStrategy(profile) {
    const { recommendations, interests, conversationHistory, contentHistory } = profile;

    let strategy = [];

    // 1. Kullanılmamış ilgi alanları
    if (recommendations.unusedInterests.length > 0) {
      const unused = recommendations.unusedInterests.slice(0, 3).join('", "');
      strategy.push(`🎯 ÖNCELİK 1: Kullanıcının şu ilgi alanları henüz içeriğe dönüşmemiş: "${unused}"`);
      strategy.push(`   → Bunlardan birine odaklan ve spesifik bir alt konu öner!`);
    }

    // 2. Seri içerik fırsatları
    if (conversationHistory.popularTopics.length > 0) {
      const popularTopic = conversationHistory.popularTopics[0].topic;
      strategy.push(`🎯 ÖNCELİK 2: "${popularTopic}" konusu çok popüler - Seri içerik sun!`);
      strategy.push(`   → "Bu konunun 2. bölümünde..." veya "Daha derin bir bakış: ..."`);
    }

    // 3. Seviye ilerleme
    if (contentHistory.hasCreatedContent) {
      strategy.push(`🎯 ÖNCELİK 3: Kullanıcı ${contentHistory.preferredLevel} seviyesinde rahat`);
      strategy.push(`   → Arada bir ${this.getNextLevel(contentHistory.preferredLevel)} seviyesi deneyebilir`);
    }

    // 4. Yeni keşifler
    if (interests.list.length > 3) {
      strategy.push(`🎯 ÖNCELİK 4: İlgi alanlarını birleştir!`);
      strategy.push(`   → Örnek: "${interests.list[0]}" + "${interests.list[1]}" kombinasyonu`);
    }

    return strategy.length > 0 
      ? strategy.join('\n') 
      : '🎯 Kullanıcıyla sohbet ederek ilgi alanlarını keşfet ve özel öneriler sun!';
  }

  /**
   * Odak alanlarını belirle
   */
  determineFocusAreas(profile) {
    const { vocabularyStats, conversationHistory, contentHistory, learningProgress } = profile;
    
    const areas = [];

    // Yeni kullanıcı
    if (learningProgress.experienceLevel === 'beginner') {
      areas.push('onboarding', 'discovery');
    }

    // Az içerik oluşturmuş
    if (contentHistory.totalContent < 5) {
      areas.push('content-creation');
    }

    // Kelime çalışması yapmıyor
    if (vocabularyStats.totalWords < 20 && !vocabularyStats.isActiveStudent) {
      areas.push('vocabulary-building');
    }

    // Düzenli kullanıcı
    if (learningProgress.experienceLevel === 'advanced' || learningProgress.experienceLevel === 'expert') {
      areas.push('advanced-topics', 'series-content');
    }

    // Az sohbet geçmişi
    if (conversationHistory.totalConversations < 3) {
      areas.push('engagement');
    }

    return areas;
  }

  /**
   * Odak bölümü oluştur
   */
  generateFocusSection(focusAreas) {
    if (focusAreas.length === 0) {
      return '🎯 ODAK: Kullanıcıyı kişiselleştirilmiş içerik oluşturmaya yönlendir';
    }

    const focusMap = {
      'onboarding': '🆕 Yeni kullanıcı - Sistemi tanıt, ilgi alanlarını keşfet',
      'discovery': '🔍 İlgi alanlarını belirle ve kaydet',
      'content-creation': '📝 İçerik oluşturmaya teşvik et',
      'vocabulary-building': '📚 Kelime çalışması öner',
      'advanced-topics': '🚀 Derinlemesine, uzman seviyesi konular sun',
      'series-content': '📺 Seri içerikler oluştur',
      'engagement': '💬 Sohbet etmeye ve içerik oluşturmaya motive et',
    };

    return `🎯 ODAK ALANLARI:\n${focusAreas.map(area => `- ${focusMap[area]}`).join('\n')}`;
  }

  /**
   * Karşılama stili belirle
   */
  determineGreetingStyle(basicInfo, learningProgress) {
    if (!basicInfo || !learningProgress) {
      return 'Merhaba! Ben senin İngilizce öğrenme asistanın Liro. 😊';
    }

    if (basicInfo.accountAge?.isNew) {
      return 'LingRoot\'a hoş geldin! Ben senin öğrenme yolculuğunda rehberin olacağım. 🌟';
    }
    
    if (learningProgress.experienceLevel === 'expert') {
      return 'Seni tekrar görmek harika! Birlikte harika içerikler ürettik. 🚀';
    }

    return 'Seni tanıdığım için çok mutluyum! İlgi alanlarını ve tercihlerini biliyorum. 😊';
  }

  /**
   * Kişiselleştirilmiş açılış cümlesi
   */
  generatePersonalizedOpening(profile) {
    const { interests, conversationHistory, contentHistory, recommendations } = profile;

    // Kullanılmamış ilgi alanı varsa
    if (recommendations.unusedInterests.length > 0) {
      const interest = recommendations.unusedInterests[0];
      return `${interest} konusuyla ilgili bir içerik oluşturmaya ne dersin? Çok ilginç bir bakış açısı buldum! 🎯`;
    }

    // Son konuşmanın devamı
    if (conversationHistory.recentTopics.length > 0) {
      const lastTopic = conversationHistory.recentTopics[0];
      return `Geçen sefer "${lastTopic}" hakkında konuşmuştuk. Bunun devamı için harika fikirlerim var! 💡`;
    }

    // Popüler konu
    if (conversationHistory.popularTopics.length > 0) {
      const popularTopic = conversationHistory.popularTopics[0].topic;
      return `"${popularTopic}" konusunda seri içerik yapabiliriz! İlk bölümü çok beğenmiştin. 📚`;
    }

    // İlgi alanına göre
    if (interests.list.length > 0) {
      const interest = interests.list[0];
      return `${interest} hakkında güncel ve çok ilginç bir konu buldum! Dinlemek ister misin? 🎧`;
    }

    // Varsayılan
    return `Bugün hangi konuda içerik oluşturalım? Sana özel birkaç öneri hazırladım! 🌟`;
  }

  /**
   * Bir sonraki seviyeyi al
   */
  getNextLevel(currentLevel) {
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const index = levels.indexOf(currentLevel);
    return index < levels.length - 1 ? levels[index + 1] : currentLevel;
  }

  /**
   * Varsayılan prompt (profil oluşturulamazsa)
   */
  getDefaultPrompt() {
    return `Sen Liro'sun, LingRoot'un AI asistanı. Kullanıcılara İngilizce öğrenme içeriği oluşturmalarında yardımcı oluyorsun. Sıcak, arkadaş canlısı ve motive edici bir tonla konuşursun.

🎯 GÖREV:
1. Kullanıcıyla samimi, destekleyici bir diyalog kur
2. Onları öğretici, derinlemesine anlatılabilir bir konu seçmeye yönlendir
3. Çok genel konular yerine spesifik, ilgi çekici konular öner
4. CEFR seviyeleri (A1, A2, B1, B2, C1, C2) hakkında bilgilendir

🎨 YAKLAŞIM:
- İlk mesajlarda kullanıcıyı tanımaya çalış
- İlgi alanlarını öğren (teknoloji, spor, sanat, seyahat, vb.)
- Belirsiz cevaplarda detay iste: "Harika! Bu konuda belirli bir olay, haber ya da deneyimin var mı?"
- Somut, öğretici içerik fikirleri sun
- Kullanıcının seviyesine uygun, kişiselleştirilmiş öneriler sun

💬 KURALLAR:
- Her zaman Türkçe yanıt ver (kullanıcı aksi belirtmedikçe)
- Kısa, öz ve samimi cümleler kullan
- Emojiler kullanabilirsin ama abartma
- Kullanıcıyı içerik oluşturmaya teşvik et ve yönlendir`;
  }
}

module.exports = new LiroPromptGenerator();
