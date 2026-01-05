const logger = require('./logger');
const fs = require('fs');
const path = require('path');
const userInsightService = require('../services/userInsightService');
const feedbackLoopService = require('../services/feedbackLoopService');

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
  generateSystemPrompt(userProfile, searchResultsText = '') {
    if (!userProfile) {
      return this.getDefaultPrompt();
    }

    try {
      const promptPath = path.join(__dirname, '../prompts/liro_system_personalized.txt');
      let promptTemplate = fs.readFileSync(promptPath, 'utf-8');

      // Remove comments
      promptTemplate = promptTemplate
        .split('\n')
        .filter(line => !line.trim().startsWith('//'))
        .join('\n')
        .trim();

      const {
        basicInfo,
        interests,
        conversationHistory,
        contentHistory,
        vocabularyStats,
        learningProgress,
        recommendations,
        knowledgeProfile,
        topicTreeStatus,
        userInsights,
        smartSuggestions,
        adaptiveContext, // 🔄 Feedback Loop adaptive context
      } = userProfile;

      const username = basicInfo?.username || 'Kullanıcı';
      const preferredLevel = adaptiveContext?.suggestedLevel || contentHistory?.preferredLevel || 'B1';

      // Profil durumuna göre farklı tonlamalar
      const greetingStyle = this.determineGreetingStyle(basicInfo, learningProgress);
      const focusAreas = this.determineFocusAreas(userProfile);
      const avoidanceNotes = this.generateAvoidanceNotes(conversationHistory, contentHistory);
      const suggestionStrategy = this.determineSuggestionStrategy(userProfile);
      const profileSection = this.generateProfileSection(userProfile);
      const learningPreferences = this.generateLearningPreferences(userProfile);
      const focusSection = this.generateFocusSection(focusAreas);
      const personalizedOpening = this.generatePersonalizedOpening(userProfile);
      const knowledgeSection = this.generateKnowledgeSection(knowledgeProfile);
      const topicTreeSection = this.generateTopicTreeSection(topicTreeStatus);
      const userInsightsSection = userInsightService.formatForPrompt(userInsights);
      const smartSuggestionsSection = userInsightService.formatSmartSuggestionsForPrompt(smartSuggestions);
      const adaptiveContextSection = feedbackLoopService.formatForPrompt(adaptiveContext);

      // Replace all placeholders
      return promptTemplate
        .replace(/{{username}}/g, username)
        .replace(/{{greetingStyle}}/g, greetingStyle)
        .replace(/{{profileSection}}/g, profileSection)
        .replace(/{{learningPreferences}}/g, learningPreferences)
        .replace(/{{suggestionStrategy}}/g, suggestionStrategy)
        .replace(/{{avoidanceNotes}}/g, avoidanceNotes)
        .replace(/{{focusSection}}/g, focusSection)
        .replace(/{{personalizedOpening}}/g, personalizedOpening)
        .replace(/{{preferredLevel}}/g, preferredLevel)
        .replace(/{{knowledgeBase}}/g, knowledgeSection)
        .replace(/{{topicTreeStatus}}/g, topicTreeSection)
        .replace(/{{userInsights}}/g, userInsightsSection)
        .replace(/{{smartSuggestions}}/g, smartSuggestionsSection)
        .replace(/{{adaptiveContext}}/g, adaptiveContextSection)
        .replace(/{{searchResults}}/g, searchResultsText);
    } catch (error) {
      logger.error('Failed to load personalized prompt template:', error);
      return this.getDefaultPrompt();
    }
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
      section.push(`- 🔒 Kullanıcının Kayıtlı HOBİLERİ (ARKA PLAN BİLGİSİ - DİREKT ÖNERİ OLARAK KULLANMA!): ${interestList}`);

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
      prefs.push(`🕒 Önceki sohbetlerde konuşulan (şu anki sohbet DEĞİL): "${recent}"`);
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
      return `
⚠️ GEÇMİŞ BİLGİSİ:
Kullanıcının kayıtlı geçmişi BULUNMUYOR. Bu yeni bir kullanıcı veya ilk sohbet.
→ "Daha önce çalışmıştık" veya "Geçen sefer konuşmuştuk" gibi ifadeler KULLANMA!
→ İlk defa tanışıyormuş gibi samimi ve açık bir şekilde konuş.`;
    }

    return `
📝 ÖNCEKİ SOHBETLERDEN GEÇMİŞ BİLGİSİ (Şu anki sohbet DEĞİL!):
Kullanıcı ÖNCEKİ sohbetlerde bu konularda içerik oluşturmuş veya sohbet etmiş:
${recentTopics.slice(0, 10).map((t, i) => `${i + 1}. "${t}"`).join('\n')}

❗ ÖNEMLİ KURALLAR:
- Bu konuları AYNEN tekrar önerme, farklı açılardan yaklaş.
- Eğer kullanıcı ŞU ANKİ sohbette bu konulardan birinden bahsettiyse "daha önce de çalışmıştık" diyebilirsin.
- AMA kullanıcı şu anki sohbette FARKLI bir konu söylediyse (yukarıdaki listede OLMAYAN), o konuyu İLK DEFA konuşuluyor gibi ele al!
- ASLA "bunu daha önce görmüştük" diye varsayım yapma.`;
  }

  /**
   * Öneri stratejisi belirle
   */
  determineSuggestionStrategy(profile) {
    const { recommendations, interests, conversationHistory, contentHistory } = profile;

    let strategy = [];

    // 1. İçerik / Geçmiş ve Konu Ağacı odaklı öneriler
    if (contentHistory.hasCreatedContent || conversationHistory.hasHistory) {
      strategy.push('🎯 ÖNCELİK 1: System prompt\'un sonundaki "Kullanıcının içerik/geçmiş özeti" ve "Konu Ağacı Durumu" bölümlerine bak.');
      strategy.push('   → Özellikle bu özet içindeki "Tamamlanmamış (ÖNCELİKLİ)" ve "Önerilen sıradaki içerikler" satırlarında geçen başlıkları kullan.');
      strategy.push('   → Önce yarım kalan veya sıradaki ünite/konuları öner, tamamen yeni bir hobi konusuna ancak bunlar mantıklı değilse geç.');
    }

    // 2. Seri içerik fırsatları (popüler sohbet konuları)
    if (conversationHistory.popularTopics.length > 0) {
      const popularTopic = conversationHistory.popularTopics[0].topic;
      strategy.push(`🎯 ÖNCELİK 2: "${popularTopic}" konusu çok popüler - Seri içerik sun!`);
      strategy.push('   → "Bu konunun 2. bölümünde..." veya "Daha derin bir bakış: ..."');
    }

    // 3. Seviye ilerleme (var olan içerikler üzerinden)
    if (contentHistory.hasCreatedContent) {
      strategy.push(`🎯 ÖNCELİK 3: Kullanıcı ${contentHistory.preferredLevel} seviyesinde rahat`);
      strategy.push(`   → Arada bir ${this.getNextLevel(contentHistory.preferredLevel)} seviyesi deneyebilir`);
    }

    // 4. Kullanılmamış ilgi alanları (hobiler) – sadece geçmişe dayalı öneri yoksa
    if (recommendations.unusedInterests.length > 0) {
      const unused = recommendations.unusedInterests.slice(0, 3).join('\", \"');
      strategy.push(`🎯 ÖNCELİK 4: Kullanıcının şu ilgi alanları henüz içeriğe dönüşmemiş: "${unused}"`);
      strategy.push('   → İçerik/geçmiş özetinde devam ettirecek net bir konu yoksa bunlardan birine odaklan ve spesifik bir alt konu öner.');
    }

    // 5. İlgi alanlarını birleştirme (keşif modu)
    if (interests.list.length > 3) {
      strategy.push('🎯 ÖNCELİK 5: İlgi alanlarını birleştir!');
      strategy.push(`   → Örnek: "${interests.list[0]}" + "${interests.list[1]}" kombinasyonu`);
    }

    return strategy.length > 0
      ? strategy.join('\n')
      : '🎯 Önce içerik/geçmiş özetinden anlamlı devam konuları bul, ancak bulamazsan kullanıcının hobilerinden yola çıkar!';
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
   * Bilgi Tabanı bölümü oluştur
   */
  generateKnowledgeSection(knowledgeProfile) {
    if (!knowledgeProfile || !knowledgeProfile.hasKnowledgeBase) {
      return '';
    }

    const { uploads, extractedTopics, favorites } = knowledgeProfile;
    let section = ['📚 KULLANICI BİLGİ TABANI (Knowledge Base):'];

    if (uploads.count > 0) {
      section.push(`- Yüklenen Materyaller: ${uploads.recent.join(', ')}`);
    }

    if (extractedTopics.length > 0) {
      section.push(`- Dış Kaynaklardan Çıkarılan Konular: ${extractedTopics.map(t => t.title).join(', ')}`);
    }

    if (favorites.length > 0) {
      section.push(`- ⭐ Favoriler: ${favorites.join(', ')}`);
    }

    return section.join('\n');
  }

  /**
   * Konu Ağacı bölümü oluştur
   */
  generateTopicTreeSection(topicTreeStatus) {
    if (!topicTreeStatus || topicTreeStatus.status !== 'active') {
      return '';
    }

    return `
🌳 KONU AĞACI DURUMU:
- Şu anki konum: "${topicTreeStatus.currentNode}"
- Seviye: ${topicTreeStatus.level}
- ÖNERİ: Kullanıcıyı bu konuyu tamamlamaya veya bir sonraki adıma geçmeye teşvik et.`;
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
    const { interests, conversationHistory, contentHistory, recommendations, audioPreferences } = profile;

    // 1. İçerik / geçmişten devam (özellikle oluşturulmuş içerikler)
    if (contentHistory.recentTopics && contentHistory.recentTopics.length > 0) {
      const lastContentTopic = contentHistory.recentTopics[0];
      const formatHint = audioPreferences && audioPreferences.usesAudio
        ? 'Bunu kısa bir podcast / sesli içerik olarak hazırlayabilirim.'
        : 'Bununla ilgili kısa bir metin veya diyalog hazırlayabilirim.';
      return `Son oluşturduğun içeriklerden biri "${lastContentTopic}" üzerindeydi. ${formatHint} 💡`;
    }

    // 2. Son konuşmanın devamı (önceki sohbetlerden)
    if (conversationHistory.recentTopics.length > 0) {
      const lastTopic = conversationHistory.recentTopics[0];
      return `Önceki sohbetlerde "${lastTopic}" konusu geçmiş. Bu konunun devamını veya farklı bir açısını çalışabiliriz. 💡`;
    }

    // 3. Popüler sohbet konusu
    if (conversationHistory.popularTopics.length > 0) {
      const popularTopic = conversationHistory.popularTopics[0].topic;
      return `"${popularTopic}" konusu ilgini çekebilir - bu alanda içerik üretebiliriz! 📚`;
    }

    // 4. Kullanılmamış ilgi alanı varsa (hobiler)
    if (recommendations.unusedInterests.length > 0) {
      const interest = recommendations.unusedInterests[0];
      return `${interest} konusuyla ilgili bir içerik oluşturmaya ne dersin? Çok ilginç bir bakış açısı buldum! 🎯`;
    }

    // 5. Genel ilgi alanına göre
    if (interests.list.length > 0) {
      const interest = interests.list[0];
      return `${interest} hakkında güncel ve çok ilginç bir konu buldum! Dinlemek ister misin? 🎧`;
    }

    // 6. Varsayılan
    return 'Bugün hangi konuda içerik oluşturalım? Sana özel birkaç öneri hazırladım! 🌟';
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
    try {
      const promptPath = path.join(__dirname, '../prompts/liro_system_default.txt');
      let prompt = fs.readFileSync(promptPath, 'utf-8');

      // Remove comments
      prompt = prompt
        .split('\n')
        .filter(line => !line.trim().startsWith('//'))
        .join('\n')
        .trim();

      return prompt;
    } catch (error) {
      logger.error('Failed to load default prompt:', error);
      // Ultimate fallback
      return `Sen Liro'sun, LingRoot'un AI asistanı. Kullanıcılara İngilizce öğrenme içeriği oluşturmalarında yardımcı oluyorsun.`;
    }
  }
}

module.exports = new LiroPromptGenerator();
