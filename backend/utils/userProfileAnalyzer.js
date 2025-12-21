const db = require('../config/db');
const logger = require('./logger');
const userKnowledgeAnalyzer = require('./userKnowledgeAnalyzer');
const userInsightService = require('../services/userInsightService');

const LOW_QUALITY_TOPICS = [
  'selam',
  'merhaba',
  'hi',
  'hello',
  'hey',
  'test',
  'deneme',
  'bugün ne var',
  'bugun ne var',
  'bugün ne önerirsin bana',
  'bugun ne onerirsin bana',
];

function normalizeTopicSubject(subject) {
  if (!subject) return '';
  return subject
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[!?.…]+$/g, '');
}

function isLowQualityTopic(subject) {
  const norm = normalizeTopicSubject(subject);
  if (!norm) return true;
  if (LOW_QUALITY_TOPICS.includes(norm)) return true;
  if (norm === 'selam :)' || norm === 'selam :d') return true;
  if (norm.startsWith('selam') || norm.startsWith('merhaba')) return true;
  return false;
}

/**
 * 🧠 User Profile Analyzer for Liro
 * 
 * Kullanıcının tüm verilerini analiz ederek Liro için kapsamlı bir profil oluşturur.
 * Bu profil, kişiselleştirilmiş içerik önerileri ve sohbet yönlendirmesi için kullanılır.
 */

class UserProfileAnalyzer {
  /**
   * Kullanıcının kapsamlı profilini oluştur
   * @param {string} userId - User UUID
   * @returns {Promise<Object>} Detaylı kullanıcı profili
   */
  async generateUserProfile(userId) {
    try {
      const profile = {
        basicInfo: await this.getBasicInfo(userId),
        interests: await this.getInterests(userId),
        conversationHistory: await this.getConversationHistory(userId),
        contentHistory: await this.getContentHistory(userId),
        vocabularyStats: await this.getVocabularyStats(userId),
        audioPreferences: await this.getAudioPreferences(userId),
        behavioralPatterns: await this.getBehavioralPatterns(userId),
        learningProgress: await this.getLearningProgress(userId),
        recommendations: await this.generateRecommendations(userId),
        // New Modules
        knowledgeProfile: await userKnowledgeAnalyzer.generateKnowledgeProfile(userId),
        topicTreeStatus: await this.getTopicTreeStatus(userId),
        // User Persona System
        userInsights: await userInsightService.getInsights(userId),
      };

      return profile;
    } catch (error) {
      logger.error('Failed to generate user profile:', error);
      return this.getDefaultProfile();
    }
  }

  /**
   * 1. Temel Kullanıcı Bilgileri
   */
  async getBasicInfo(userId) {
    try {
      const result = await db.query(
        `SELECT 
          id,
          email,
          firstname,
          lastname,
          created_at,
          updated_at,
          EXTRACT(DAY FROM (NOW() - created_at)) as account_age_days
        FROM users 
        WHERE id = $1`,
        [userId]
      );

      const user = result.rows[0];
      if (!user) return null;

      return {
        id: user.id,
        username: user.firstname || user.email?.split('@')[0] || 'Kullanıcı',
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        accountAge: {
          days: parseInt(user.account_age_days),
          isNew: user.account_age_days < 7,
          isActive: user.account_age_days < 30,
        },
        joinedAt: user.created_at,
      };
    } catch (error) {
      logger.error('Failed to get basic info:', error);
      return null;
    }
  }

  /**
   * 2. İlgi Alanları & Hobiler
   */
  async getInterests(userId) {
    try {
      const result = await db.query(
        `SELECT 
          interest_keyword as interest_name,
          'topic' as interest_type,
          created_at,
          EXTRACT(DAY FROM (NOW() - created_at)) as days_since_added
        FROM user_interests 
        WHERE user_id = $1 
        ORDER BY created_at DESC
        LIMIT 20`,
        [userId]
      );

      const interests = result.rows;

      return {
        list: interests.map(i => i.interest_name),
        recent: interests.filter(i => i.days_since_added < 30).map(i => i.interest_name),
        count: interests.length,
        isEmpty: interests.length === 0,
      };
    } catch (error) {
      logger.error('Failed to get interests:', error);
      return { list: [], recent: [], count: 0, isEmpty: true };
    }
  }

  /**
   * 3. Sohbet Geçmişi Analizi
   */
  async getConversationHistory(userId) {
    try {
      // Son sohbetler
      const conversationsResult = await db.query(
        `SELECT 
          id,
          subject,
          status,
          created_at,
          updated_at,
          (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
        FROM conversations c
        WHERE user_id = $1 
        ORDER BY updated_at DESC 
        LIMIT 20`,
        [userId]
      );

      // En popüler konular
      const topicsResult = await db.query(
        `SELECT 
          c.subject,
          COUNT(m.id) as message_count,
          MAX(m.created_at) as last_message_at
        FROM conversations c
        JOIN messages m ON c.id = m.conversation_id
        WHERE c.user_id = $1
        GROUP BY c.subject
        ORDER BY message_count DESC
        LIMIT 10`,
        [userId]
      );

      // Son mesajlar (içerik analizi için)
      const recentMessagesResult = await db.query(
        `SELECT 
          m.content,
          m.sender_type,
          m.created_at,
          c.subject as conversation_topic
        FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        WHERE c.user_id = $1
        ORDER BY m.created_at DESC
        LIMIT 50`,
        [userId]
      );

      const conversations = conversationsResult.rows;
      const popularTopics = topicsResult.rows;
      const recentMessages = recentMessagesResult.rows;

      const recentTopics = conversations
        .map(c => c.subject)
        .filter(Boolean)
        .filter(t => !isLowQualityTopic(t))
        .slice(0, 5);

      const filteredPopularTopics = popularTopics.filter(
        t => t.subject && !isLowQualityTopic(t.subject)
      );

      return {
        totalConversations: conversations.length,
        recentTopics,
        popularTopics: filteredPopularTopics.map(t => ({
          topic: t.subject,
          messageCount: parseInt(t.message_count),
          lastDiscussed: t.last_message_at,
        })),
        recentMessages: recentMessages
          .filter(m => m.sender_type === 'user')
          .slice(0, 10)
          .map(m => m.content),
        avgMessagesPerConversation: conversations.length > 0
          ? Math.round(conversations.reduce((sum, c) => sum + parseInt(c.message_count), 0) / conversations.length)
          : 0,
        hasHistory: conversations.length > 0,
      };
    } catch (error) {
      logger.error('Failed to get conversation history:', error);
      return {
        totalConversations: 0,
        recentTopics: [],
        popularTopics: [],
        recentMessages: [],
        avgMessagesPerConversation: 0,
        hasHistory: false,
      };
    }
  }

  /**
   * 4. İçerik Oluşturma Geçmişi
   */
  async getContentHistory(userId) {
    try {
      // Content tablosu yok, conversations'dan konu çıkaralım
      const contentResult = await db.query(
        `SELECT 
          id,
          subject as title,
          subject as topic,
          'B1' as level,
          'conversation' as content_type,
          0 as view_count,
          created_at
        FROM conversations 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT 50`,
        [userId]
      );

      // Konu analizi - conversations'dan
      const topicAnalysisResult = await db.query(
        `SELECT 
          subject as topic,
          COUNT(*) as count,
          3 as avg_level_numeric
        FROM conversations 
        WHERE user_id = $1 
        GROUP BY subject 
        ORDER BY count DESC 
        LIMIT 10`,
        [userId]
      );

      // Seviye tercihi - varsayılan B1
      const levelPreferenceResult = { rows: [{ level: 'B1' }] };

      const contents = contentResult.rows;
      const topicAnalysis = topicAnalysisResult.rows;
      const preferredLevel = levelPreferenceResult.rows[0];

      const recentTopics = contents
        .map(c => c.topic)
        .filter(Boolean)
        .filter(t => !isLowQualityTopic(t))
        .slice(0, 10);

      const filteredTopicAnalysis = topicAnalysis.filter(
        t => t.topic && !isLowQualityTopic(t.topic)
      );

      return {
        totalContent: contents.length,
        recentTopics,
        popularTopics: filteredTopicAnalysis.map(t => ({
          topic: t.topic,
          count: parseInt(t.count),
          avgLevel: this.numericToLevel(Math.round(t.avg_level_numeric)),
        })),
        preferredLevel: preferredLevel?.level || 'B1',
        contentTypes: this.analyzeContentTypes(contents),
        hasCreatedContent: contents.length > 0,
      };
    } catch (error) {
      logger.error('Failed to get content history:', error);
      return {
        totalContent: 0,
        recentTopics: [],
        popularTopics: [],
        preferredLevel: 'B1',
        contentTypes: {},
        hasCreatedContent: false,
      };
    }
  }

  /**
   * 5. Kelime Öğrenme İstatistikleri
   */
  async getVocabularyStats(userId) {
    try {
      const statsResult = await db.query(
        `SELECT 
          COUNT(*) as total_words,
          50 as avg_mastery,
          0 as mastered_words,
          0 as struggling_words,
          MAX(created_at) as last_study_date,
          0 as words_studied_this_week
        FROM user_vocabulary 
        WHERE user_id = $1`,
        [userId]
      );

      const stats = statsResult.rows[0];

      return {
        totalWords: parseInt(stats.total_words) || 0,
        masteredWords: parseInt(stats.mastered_words) || 0,
        strugglingWords: parseInt(stats.struggling_words) || 0,
        avgMastery: Math.round(parseFloat(stats.avg_mastery) || 0),
        lastStudyDate: stats.last_study_date,
        recentActivity: parseInt(stats.words_studied_this_week) || 0,
        isActiveStudent: (stats.words_studied_this_week || 0) > 0,
      };
    } catch (error) {
      logger.error('Failed to get vocabulary stats:', error);
      return {
        totalWords: 0,
        masteredWords: 0,
        strugglingWords: 0,
        avgMastery: 0,
        lastStudyDate: null,
        recentActivity: 0,
        isActiveStudent: false,
      };
    }
  }

  /**
   * 6. Audio/TTS Tercihleri
   */
  async getAudioPreferences(userId) {
    try {
      // Narrations tablosu yok, user_settings'den al
      const audioResult = await db.query(
        `SELECT 
          default_voice as voice_id,
          'en-US' as language,
          'amazon' as provider,
          1 as usage_count,
          100 as avg_completion,
          0 as total_listening_time
        FROM user_settings 
        WHERE user_id = $1 
        LIMIT 1`,
        [userId]
      );

      const preferences = audioResult.rows;

      return {
        preferredVoice: preferences[0]?.voice_id || null,
        preferredLanguage: preferences[0]?.language || 'en-US',
        preferredProvider: preferences[0]?.provider || 'amazon',
        avgCompletion: Math.round(parseFloat(preferences[0]?.avg_completion) || 0),
        totalListeningTime: parseInt(preferences.reduce((sum, p) => sum + (parseInt(p.total_listening_time) || 0), 0)),
        usesAudio: preferences.length > 0,
      };
    } catch (error) {
      logger.error('Failed to get audio preferences:', error);
      return {
        preferredVoice: null,
        preferredLanguage: 'en-US',
        preferredProvider: 'amazon',
        avgCompletion: 0,
        totalListeningTime: 0,
        usesAudio: false,
      };
    }
  }

  /**
   * 7. Davranışsal Örüntüler
   */
  async getBehavioralPatterns(userId) {
    try {
      // En aktif saatler
      const activeHoursResult = await db.query(
        `SELECT 
          EXTRACT(HOUR FROM created_at) as hour,
          COUNT(*) as activity_count
        FROM messages 
        WHERE sender_id = $1 
          AND created_at > NOW() - INTERVAL '30 days'
        GROUP BY hour 
        ORDER BY activity_count DESC 
        LIMIT 3`,
        [userId]
      );

      // Aktivite günleri
      const activeDaysResult = await db.query(
        `SELECT 
          COUNT(DISTINCT DATE(created_at)) as active_days,
          COUNT(*) as total_activities
        FROM messages 
        WHERE sender_id = $1 
          AND created_at > NOW() - INTERVAL '30 days'`,
        [userId]
      );

      const activeHours = activeHoursResult.rows;
      const activeDays = activeDaysResult.rows[0];

      return {
        mostActiveHours: activeHours.map(h => parseInt(h.hour)),
        activeDaysLast30: parseInt(activeDays.active_days) || 0,
        avgActivitiesPerDay: activeDays.active_days > 0
          ? Math.round(activeDays.total_activities / activeDays.active_days)
          : 0,
        isRegularUser: (activeDays.active_days || 0) > 7,
        isVeryActive: (activeDays.active_days || 0) > 20,
      };
    } catch (error) {
      logger.error('Failed to get behavioral patterns:', error);
      return {
        mostActiveHours: [],
        activeDaysLast30: 0,
        avgActivitiesPerDay: 0,
        isRegularUser: false,
        isVeryActive: false,
      };
    }
  }

  /**
   * 8. Öğrenme İlerlemesi
   */
  async getLearningProgress(userId) {
    try {
      const progressResult = await db.query(
        `SELECT 
          (SELECT COUNT(*) FROM conversations WHERE user_id = $1) as total_content,
          (SELECT COUNT(*) FROM user_vocabulary WHERE user_id = $1) as total_vocabulary,
          (SELECT COUNT(*) FROM conversations WHERE user_id = $1) as total_conversations,
          0 as total_audio
        `,
        [userId]
      );

      const progress = progressResult.rows[0];

      const totalActivities =
        parseInt(progress.total_content) +
        parseInt(progress.total_vocabulary) +
        parseInt(progress.total_conversations) +
        parseInt(progress.total_audio);

      return {
        totalContent: parseInt(progress.total_content) || 0,
        totalVocabulary: parseInt(progress.total_vocabulary) || 0,
        totalConversations: parseInt(progress.total_conversations) || 0,
        totalAudio: parseInt(progress.total_audio) || 0,
        totalActivities,
        experienceLevel: this.calculateExperienceLevel(totalActivities),
      };
    } catch (error) {
      logger.error('Failed to get learning progress:', error);
      return {
        totalContent: 0,
        totalVocabulary: 0,
        totalConversations: 0,
        totalAudio: 0,
        totalActivities: 0,
        experienceLevel: 'beginner',
      };
    }
  }

  /**
   * 9. Akıllı Öneriler Oluştur
   */
  async generateRecommendations(userId) {
    try {
      let unusedInterests = [];
      let underutilizedTopics = [];

      // Daha önce önerilmeyen konular (topics tablosu varsa)
      try {
        const unusedInterestsResult = await db.query(
          `SELECT ui.interest_keyword as interest_name
          FROM user_interests ui
          LEFT JOIN topics t ON t.user_id = ui.user_id AND LOWER(t.title) LIKE '%' || LOWER(ui.interest_keyword) || '%'
          WHERE ui.user_id = $1 AND t.id IS NULL
          LIMIT 5`,
          [userId]
        );
        unusedInterests = unusedInterestsResult.rows.map(r => r.interest_name);
      } catch (topicsError) {
        // Topics tablosu yoksa, tüm ilgi alanlarını kullan
        logger.debug('Topics table not found, using all interests');
        const allInterestsResult = await db.query(
          `SELECT interest_keyword as interest_name
          FROM user_interests
          WHERE user_id = $1
          LIMIT 5`,
          [userId]
        );
        unusedInterests = allInterestsResult.rows.map(r => r.interest_name);
      }

      // Az kullanılan konular (topics tablosu varsa)
      try {
        const underutilizedTopicsResult = await db.query(
          `SELECT title, usage_count
          FROM topics
          WHERE user_id = $1 AND usage_count < 3
          ORDER BY created_at DESC
          LIMIT 5`,
          [userId]
        );
        underutilizedTopics = underutilizedTopicsResult.rows.map(r => r.title);
      } catch (topicsError2) {
        // Topics tablosu yoksa ignore et
        logger.debug('Topics table not found, skipping underutilized topics');
      }

      return {
        unusedInterests,
        underutilizedTopics,
        shouldSuggestNewTopics: unusedInterests.length > 0,
        shouldRevisitTopics: underutilizedTopics.length > 0,
      };
    } catch (error) {
      logger.error('Failed to generate recommendations:', error);
      return {
        unusedInterests: [],
        underutilizedTopics: [],
        shouldSuggestNewTopics: false,
        shouldRevisitTopics: false,
      };
    }
  }

  /**
   * Helper: İçerik türlerini analiz et
   */
  analyzeContentTypes(contents) {
    const types = {};
    contents.forEach(c => {
      const type = c.content_type || 'text';
      types[type] = (types[type] || 0) + 1;
    });
    return types;
  }

  /**
   * Helper: Sayısal seviyeyi CEFR'a çevir
   */
  numericToLevel(num) {
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    return levels[Math.max(0, Math.min(num - 1, 5))] || 'B1';
  }

  /**
   * Helper: Deneyim seviyesini hesapla
   */
  calculateExperienceLevel(totalActivities) {
    if (totalActivities < 10) return 'beginner';
    if (totalActivities < 50) return 'intermediate';
    if (totalActivities < 150) return 'advanced';
    return 'expert';
  }

  /**
   * 10. Konu Ağacı Durumu (Topic Tree)
   */
  async getTopicTreeStatus(userId) {
    try {
      // Find the current active node in the topic tree
      // Logic: Find the most recent content item the user interacted with,
      // get its topic, and find the next sibling or child in the tree.

      const query = `
        SELECT 
          tn.id,
          tn.title as current_node,
          tn.path,
          tn.level as node_level
        FROM user_content_progress ucp
        JOIN content_items ci ON ci.id = ucp.content_item_id
        JOIN topic_nodes tn ON tn.id = ci.topic_id
        WHERE ucp.user_id = $1
        ORDER BY ucp.last_interaction_at DESC
        LIMIT 1
      `;

      const result = await db.query(query, [userId]);
      const currentNode = result.rows[0];

      if (!currentNode) {
        return { currentNode: null, nextNode: null, status: 'not_started' };
      }

      // Find next node (mock logic: just finding a node with higher order or next ID)
      // In a real tree, we'd query parent/children relationships.
      // Assuming topic_nodes has 'order_index' or similar.
      // For now, let's just return the current node info.

      return {
        currentNode: currentNode.current_node,
        currentPath: currentNode.path,
        level: currentNode.node_level,
        status: 'active'
      };

    } catch (error) {
      // Table might not exist
      return { currentNode: null, nextNode: null, status: 'unknown' };
    }
  }

  /**
   * Varsayılan profil (hata durumunda)
   */
  getDefaultProfile() {
    return {
      basicInfo: { username: 'Kullanıcı', accountAge: { days: 0, isNew: true } },
      interests: { list: [], count: 0, isEmpty: true },
      conversationHistory: { hasHistory: false, totalConversations: 0, recentTopics: [], popularTopics: [] },
      contentHistory: { hasCreatedContent: false, preferredLevel: 'B1', popularTopics: [] },
      vocabularyStats: { totalWords: 0, avgMastery: 0, isActiveStudent: false },
      audioPreferences: { usesAudio: false },
      behavioralPatterns: { isRegularUser: false },
      learningProgress: { totalActivities: 0, experienceLevel: 'beginner' },
      recommendations: { unusedInterests: [], shouldSuggestNewTopics: false },
      knowledgeProfile: { uploads: { count: 0 }, extractedTopics: [], favorites: [] },
      topicTreeStatus: { status: 'unknown' }
    };
  }
}

module.exports = new UserProfileAnalyzer();
