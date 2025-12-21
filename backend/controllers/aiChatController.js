const db = require('../config/db');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const claudeClient = require('../utils/claudeClient');
const openaiClient = require('../utils/openaiClient');
const userProfileAnalyzer = require('../utils/userProfileAnalyzer');
const liroPromptGenerator = require('../utils/liroPromptGenerator');
const liroContentGraph = require('../utils/liroContentGraph');
const { supabase } = require('../utils/supabaseClient');
const { calculateOpenAiCost } = require('../utils/costTracker');
const { suggestTopicsForUser, extractAndStoreTopic } = require('../lib/rag');
const directorAgentService = require('../services/directorAgentService');

/**
 * Get all AI conversations for a user
 */
const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT 
        id,
        user_id,
        subject as title,
        created_at,
        updated_at
      FROM conversations
      WHERE user_id = $1
      ORDER BY updated_at DESC
      LIMIT 50
    `;

    const result = await db.query(query, [userId]);

    res.json({
      success: true,
      conversations: result.rows
    });
  } catch (error) {
    logger.error('Error fetching AI conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Konuşmalar getirilemedi'
    });
  }
};

/**
 * Create a new AI conversation
 */
const createConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Başlık gereklidir'
      });
    }

    const query = `
      INSERT INTO conversations (user_id, subject)
      VALUES ($1, $2)
      RETURNING id, user_id, subject as title, created_at, updated_at
    `;

    const result = await db.query(query, [userId, title.trim()]);

    res.json({
      success: true,
      conversation: result.rows[0]
    });
  } catch (error) {
    logger.error('Error creating AI conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Konuşma oluşturulamadı'
    });
  }
};

/**
 * Get messages for a conversation
 */
const getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    // Verify conversation belongs to user
    const convCheck = await db.query(
      'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
      [conversationId, userId]
    );

    if (convCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Konuşma bulunamadı'
      });
    }

    const query = `
      SELECT 
        id,
        conversation_id,
        CASE 
          WHEN sender_type = 'admin' THEN 'assistant'
          ELSE sender_type
        END as role,
        content,
        created_at
      FROM messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC
    `;

    const result = await db.query(query, [conversationId]);

    res.json({
      success: true,
      messages: result.rows
    });
  } catch (error) {
    logger.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Mesajlar getirilemedi'
    });
  }
};

/**
 * Send a message and get AI response (OpenAI with smart prompting)
 */
const sendMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Mesaj içeriği gereklidir'
      });
    }

    // Verify conversation belongs to user
    const convCheck = await db.query(
      'SELECT id, subject as title FROM conversations WHERE id = $1 AND user_id = $2',
      [conversationId, userId]
    );

    if (convCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Konuşma bulunamadı'
      });
    }

    // Get conversation history
    const historyResult = await db.query(
      `SELECT 
         CASE 
           WHEN sender_type = 'admin' THEN 'assistant'
           ELSE sender_type
         END as role,
         content 
       FROM messages 
       WHERE conversation_id = $1 
       ORDER BY created_at ASC 
       LIMIT 15`,
      [conversationId]
    );

    // Build message history
    const messageHistory = historyResult.rows;

    // Add current user message
    messageHistory.push({
      role: 'user',
      content: content.trim()
    });

    // Save user message
    const userMessageResult = await db.query(
      `INSERT INTO messages (conversation_id, sender_id, sender_type, content)
       VALUES ($1, $2, 'user', $3)
       RETURNING id, conversation_id, 'user' as role, content, created_at`,
      [conversationId, userId, content.trim()]
    );

    logger.info('🧠 Generating user profile for Liro...');
    const userProfile = await userProfileAnalyzer.generateUserProfile(userId);

    let contentOverview = null;
    let overviewPrompt = '';
    try {
      contentOverview = await liroContentGraph.getUserOverview(userId);
      overviewPrompt = liroContentGraph.buildOverviewPromptSection(contentOverview);
    } catch (overviewError) {
      logger.warn('Failed to build content overview for Liro:', overviewError);
    }

    let liroSystemPrompt = liroPromptGenerator.generateSystemPrompt(userProfile);
    if (overviewPrompt) {
      liroSystemPrompt = `${liroSystemPrompt}\n\n${overviewPrompt}`;
    }

    // DIRECTOR AGENT: Analyze User Mood and Inject Instruction
    let userMood = 'Neutral';
    try {
      userMood = await directorAgentService.analyzeMood(content.trim());
      const moodInstruction = directorAgentService.generatePersonaInstruction(userMood, 'chat_assistant');
      liroSystemPrompt += `\n\n${moodInstruction}`;

      // Update conversation mood asynchronously
      db.query(`UPDATE conversations SET current_mood = $1 WHERE id = $2`, [userMood, conversationId]).catch(err => logger.warn('Failed to update conversation mood', err));

    } catch (moodErr) {
      logger.warn('Director Agent mood analysis failed in chat:', moodErr);
    }
    logger.debug('📝 Liro prompt generated:', {
      username: userProfile.basicInfo?.username,
      interests: userProfile.interests?.count,
      experienceLevel: userProfile.learningProgress?.experienceLevel
    });

    // Hybrid Model Selection for Chat
    // Use gpt-4o-mini for A1-B1 levels (faster, cheaper)
    // Use gpt-4o for B2-C2 levels (better nuance)
    const userLevel = userProfile?.learningProgress?.experienceLevel || 'B1';
    const isAdvanced = ['B2', 'C1', 'C2'].includes(userLevel);
    const selectedModel = isAdvanced ? 'gpt-4o' : 'gpt-4o-mini';

    logger.info(`🤖 Liro Chat Model Selected: ${selectedModel} (Level: ${userLevel})`);

    // Get AI response with Liro's personalized prompting
    let assistantContent;
    let openaiUsage = null;
    const openaiModel = selectedModel; // Used for cost tracking later

    try {
      const response = await openaiClient.generateChatCompletion(messageHistory, {
        systemPrompt: liroSystemPrompt,
        temperature: 0.8,
        model: selectedModel
      });
      assistantContent = response.content;
      openaiUsage = response.usage || null;
    } catch (openaiError) {
      logger.error('OpenAI API error:', openaiError);
      // Fallback to alternative AI provider if OpenAI fails
      try {
        assistantContent = await claudeClient.generateResponse(messageHistory, {
          systemPrompt: liroSystemPrompt,
        });
      } catch (claudeError) {
        logger.error('Both AI providers failed:', claudeError);
        return res.status(500).json({
          success: false,
          message: 'AI yanıtı alınamadı. Lütfen daha sonra tekrar deneyin.'
        });
      }
    }

    // Save assistant message (sender_id as user for now, sender_type as admin indicates AI)
    const assistantMessageResult = await db.query(
      `INSERT INTO messages (conversation_id, sender_id, sender_type, content)
       VALUES ($1, $2, 'admin', $3)
       RETURNING id, conversation_id, 'assistant' as role, content, created_at`,
      [conversationId, userId, assistantContent]
    );

    // Update conversation's updated_at
    await db.query(
      'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
      [conversationId]
    );

    // Cost tracking: log OpenAI usage for Liro Chat into contenthistory (no TTS)
    try {
      if (openaiUsage && userId) {
        const cost = calculateOpenAiCost(openaiUsage, openaiModel);
        const promptTokens = openaiUsage.prompt_tokens || 0;
        const completionTokens = openaiUsage.completion_tokens || 0;
        const totalTokens = openaiUsage.total_tokens || (promptTokens + completionTokens);
        const insertData = {
          user_id: userId,
          level: userProfile?.learningProgress?.experienceLevel || 'B1',
          mp3_url: null,
          input: content.trim(),
          translated_text: null,
          adapted_text: assistantContent,
          input_type: 'chat',
          created_at: new Date().toISOString(),
          words: null,
          timepoints: null,
          openai_prompt_tokens: promptTokens,
          openai_completion_tokens: completionTokens,
          openai_total_tokens: totalTokens,
          openai_cost_usd: cost.totalCostUsd || 0,
          tts_characters: 0,
          tts_category: null,
          tts_cost_usd: 0,
          total_cost_usd: cost.totalCostUsd || 0,
          tts_provider: null,
          tts_voice_name: null,
          audio_duration_seconds: null,
          entry_source: 'liro_chat',
        };

        const { data: chData, error: chError } = await supabase
          .from('contenthistory')
          .insert(insertData)
          .select();

        if (chError) {
          logger.error('💰 [LIRO COST] Failed to insert contenthistory record for chat:', chError);
        } else {
          logger.info('💰 [LIRO COST] Logged Liro Chat usage to contenthistory:', { id: chData?.[0]?.id, tokens: totalTokens, costUsd: cost.totalCostUsd });
        }
      }
    } catch (costError) {
      logger.error('💰 [LIRO COST] Unexpected error while logging chat cost:', costError);
    }

    // Extract and store topic if conversation is mature enough (background task)

    if (messageHistory.length >= 6) {
      extractAndStoreTopic(conversationId, userId).catch(err => {
        logger.error('Background topic extraction failed:', err);
      });
    }

    res.json({
      success: true,
      userMessage: userMessageResult.rows[0],
      assistantMessage: assistantMessageResult.rows[0]
    });

  } catch (error) {
    logger.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Mesaj gönderilemedi'
    });
  }
};

/**
 * 🧠 Get user context for smart prompting
 * @deprecated - Now using userProfileAnalyzer.generateUserProfile() and liroPromptGenerator
 * 
 * This function is kept for backwards compatibility but is no longer used.
 * The new system provides comprehensive user profiling through:
 * - userProfileAnalyzer.generateUserProfile(userId)
 * - liroPromptGenerator.generateSystemPrompt(userProfile)
 */
async function getUserContext(userId) {
  logger.warn('⚠️ getUserContext is deprecated. Use userProfileAnalyzer instead.');
  return {
    previousTopics: [],
    interests: [],
    userLevel: 'B1',
  };
}

/**
 * Delete a conversation
 */
const deleteConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    const result = await db.query(
      'DELETE FROM conversations WHERE id = $1 AND user_id = $2 RETURNING id',
      [conversationId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Konuşma bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Konuşma silindi'
    });
  } catch (error) {
    logger.error('Error deleting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Konuşma silinemedi'
    });
  }
};

/**
 * Update conversation title
 */
const updateConversationTitle = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { title } = req.body || {};

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Başlık gereklidir',
      });
    }

    const result = await db.query(
      `UPDATE conversations 
       SET subject = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING id, user_id, subject as title, created_at, updated_at`,
      [title.trim(), conversationId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Konuşma bulunamadı',
      });
    }

    res.json({
      success: true,
      conversation: result.rows[0],
    });
  } catch (error) {
    logger.error('Error updating AI conversation title:', error);
    res.status(500).json({
      success: false,
      message: 'Konuşma güncellenemedi',
    });
  }
};

/**
 * Get topic suggestions for user
 */
const getTopicSuggestions = async (req, res) => {
  try {
    const { suggestTopicsForUser } = require('../lib/rag');
    const userId = req.user.id;
    const { conversationId } = req.params;
    let conversationContext = '';

    // Skip database query if conversationId is "new" or not a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (conversationId && conversationId !== 'new' && uuidRegex.test(conversationId)) {
      const messagesResult = await db.query(
        `SELECT content FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 5`,
        [conversationId]
      );
      conversationContext = messagesResult.rows.map(r => r.content).join('\n');
    }
    const suggestions = await suggestTopicsForUser(userId, conversationContext);

    res.json({
      success: true,
      suggestions
    });
  } catch (error) {
    logger.error('Error getting topic suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Öneriler getirilemedi'
    });
  }
};

/**
 * Get popular topics
 */
const getPopularTopics = async (req, res) => {
  try {
    const { getPopularTopics: getPopular } = require('../lib/rag');
    const limit = parseInt(req.query.limit) || 10;
    const topics = await getPopular(limit);

    res.json({
      success: true,
      topics
    });
  } catch (error) {
    logger.error('Error getting popular topics:', error);
    res.status(500).json({
      success: false,
      message: 'Popüler konular getirilemedi'
    });
  }
};

const getDailySuggestions = async (req, res) => {
  try {
    const userId = req.user.id;

    const userProfile = await userProfileAnalyzer.generateUserProfile(userId);

    // Read last feedback (if any)
    const lastFeedbackResult = await db.query(
      `SELECT suggestion_id, action_type, clicked, reason, raw_text, created_at
       FROM user_daily_suggestion_logs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    const lastFeedback = lastFeedbackResult.rows[0] || null;

    // Read recently shown suggestions to avoid repetition
    let recentlyShownIds = [];
    try {
      const recentlyShownResult = await db.query(
        `SELECT suggestion_id
         FROM user_daily_suggestions_shown
         WHERE user_id = $1
           AND shown_at > NOW() - INTERVAL '3 days'
         ORDER BY shown_at DESC
         LIMIT 20`,
        [userId]
      );
      recentlyShownIds = recentlyShownResult.rows.map(r => r.suggestion_id).filter(Boolean);
    } catch (recentErr) {
      logger.warn('Failed to read recently shown daily suggestions:', recentErr);
    }

    const profileSummary = {
      name: userProfile?.basicInfo?.username || 'Kullanıcı',
      cefr_level: userProfile?.contentHistory?.preferredLevel || 'B1',
      interest_tags: userProfile?.interests?.list || [],
      recent_topics: userProfile?.conversationHistory?.recentTopics || [],
      popular_topics: (userProfile?.conversationHistory?.popularTopics || []).map(t => t.topic),
      experience_level: userProfile?.learningProgress?.experienceLevel || 'intermediate',
      account_age_days: userProfile?.basicInfo?.accountAge?.days || null,
    };

    const candidates = [];

    const lastConversationResult = await db.query(
      `SELECT 
         c.id,
         c.subject as topic,
         c.updated_at,
         (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as message_count
       FROM conversations c
       WHERE c.user_id = $1
       ORDER BY c.updated_at DESC
       LIMIT 1`,
      [userId]
    );

    if (lastConversationResult.rows.length > 0) {
      const conv = lastConversationResult.rows[0];
      const messageCount = parseInt(conv.message_count, 10) || 0;
      if (messageCount >= 3) {
        candidates.push({
          id: conv.id,
          type: 'continue_chat',
          conversationId: conv.id,
          topic_hint: conv.topic || 'Sohbet',
          estimated_time_min: 5,
        });
      }
    }

    const unusedInterests = userProfile?.recommendations?.unusedInterests || [];
    const recentInterests = userProfile?.interests?.recent || [];
    const allInterests = userProfile?.interests?.list || [];

    let primaryInterest = null;
    if (unusedInterests.length > 0) {
      primaryInterest = unusedInterests[0];
    } else if (recentInterests.length > 0) {
      primaryInterest = recentInterests[0];
    } else if (allInterests.length > 0) {
      primaryInterest = allInterests[0];
    }

    if (primaryInterest) {
      candidates.push({
        id: `interest_${primaryInterest}`,
        type: 'new_chat',
        interest: primaryInterest,
        estimated_time_min: 7,
      });
    }

    if (candidates.length < 3) {
      candidates.push({
        id: 'quick_motiv_speaking',
        type: 'motiv',
        skill: 'speaking',
        estimated_time_min: 3,
      });
    }

    const feedback = {
      last_suggestion_rejected: !!(lastFeedback && lastFeedback.reason === 'not_relevant'),
      last_reason: lastFeedback?.reason || null,
      last_raw_text: lastFeedback?.raw_text || null,
      disliked_tags: [],
      recently_shown_ids: recentlyShownIds,
    };

    let contentOverview = null;
    try {
      contentOverview = await liroContentGraph.getUserOverview(userId);
      if (contentOverview && Array.isArray(contentOverview.recommended_next)) {
        const graphItems = contentOverview.recommended_next.slice(0, 3);
        graphItems.forEach((item) => {
          const contentKey = item.key || item.content_key || item.contentKey;
          if (!contentKey) return;
          const candidateId = `content_${contentKey}`;
          if (candidates.some((c) => c.id === candidateId)) return;
          candidates.push({
            id: candidateId,
            type: 'content_item',
            content_key: contentKey,
            title: item.title || null,
            estimated_time_min: item.estimated_duration_min || null,
          });
        });
      }
    } catch (overviewError) {
      logger.warn('Failed to get content overview for daily suggestions:', overviewError);
    }

    const systemPrompt =
      'Sen Liro\'sun, LingRoot\'un AI destekli İngilizce öğrenme asistanısın. ' +
      'Görevin, verilen kullanıcı profili (user_profile), aday öneriler (candidates), ' +
      'geri bildirim (feedback) ve içerik özeti (content_overview) alanlarından yola çıkarak ' +
      'kullanıcıya bugüne özel en fazla 3 kısa ve aksiyon odaklı öneri kartı sunmak. ' +
      'ÖNCELİK: Eğer content_overview.recommended_next alanında veya candidates dizisinde type="content_item" olan adaylar varsa, kartlarını ÖNCE bu içeriklere dayandır; bunlar kullanıcının konu ağacı ve geçmiş ilerlemesiyle ilişkilidir. ' +
      'Hobi/ilgi alanı tabanlı type="new_chat" gibi adayları yalnızca içerik/geçmişe dayalı mantıklı bir öneri üretemediğinde kullan. ' +
      'Her suggestion objesinde zorunlu alanlar: id (string), title_tr (string), short_description_tr (string), action_type (string), action_payload (object). ' +
      'action_type alanı SADECE şu değerlerden biri olabilir: "continue_chat", "start_chat_topic", "start_motiv_recording", "start_podcast_topic". ' +
      'Eşleştirme kuralları: candidates.type="continue_chat" ise action_type="continue_chat" ve action_payload={"conversationId": candidate.conversationId, "topic_hint": candidate.topic_hint}. ' +
      'candidates.type="new_chat" ise action_type="start_chat_topic" ve action_payload={"topic": candidate.interest}. ' +
      'candidates.type="motiv" ise action_type="start_motiv_recording" ve action_payload={}. ' +
      'candidates.type="content_item" veya content_key dolu ise, action_type genellikle "start_chat_topic" olmalı ve action_payload={"topic": suggestion.title_tr veya candidate.title}. Ayrıca suggestion.content_key alanına candidate.content_key değerini KESİNLİKLE yaz. ' +
      'Her zaman geçerli ve minify edilmiş JSON döndür. Kod bloğu veya açıklama ekleme. ' +
      'Şema: {"daily_message_tr": string, "suggestions": Array, "fallback_questions_tr": Array}.';

    const payload = {
      user_profile: profileSummary,
      candidates,
      feedback,
      content_overview: contentOverview
        ? {
          current_main_topic: contentOverview.current_main_topic,
          recent_items: (contentOverview.recent_items || []).slice(0, 5),
          incomplete_items: (contentOverview.incomplete_items || []).slice(0, 5),
          recommended_next: (contentOverview.recommended_next || []).slice(0, 3),
        }
        : null,
    };

    let parsed;

    try {
      const completion = await openaiClient.generateChatCompletion(
        [
          {
            role: 'user',
            content: JSON.stringify(payload),
          },
        ],
        {
          systemPrompt,
          temperature: 0.7,
          maxTokens: 800,
          model: 'gpt-4o-mini',
        }
      );

      const raw = completion.content || '';
      parsed = JSON.parse(raw);
    } catch (aiError) {
      logger.error('Error generating daily suggestions with OpenAI:', aiError);
    }

    if (!parsed) {
      parsed = buildFallbackDailySuggestions(profileSummary, candidates);
    }

    // Log which suggestions were shown today (best-effort, non-blocking for user)
    try {
      if (parsed && Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0) {
        const validSuggestions = parsed.suggestions.filter(
          (s) => s && typeof s.id === 'string' && s.id.trim().length > 0
        );

        if (validSuggestions.length > 0) {
          const values = [];
          const placeholders = [];

          validSuggestions.forEach((s, idx) => {
            values.push(userId, s.id);
            const base = idx * 2;
            placeholders.push(`($${base + 1}, $${base + 2})`);
          });

          await db.query(
            `INSERT INTO user_daily_suggestions_shown (user_id, suggestion_id)
             VALUES ${placeholders.join(', ')}`,
            values
          );
        }
      }
    } catch (logError) {
      logger.warn('Failed to log daily suggestions shown:', logError);
    }

    res.json({
      success: true,
      ...parsed,
    });
  } catch (error) {
    logger.error('Error in getDailySuggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Öneriler getirilemedi',
    });
  }
};

function buildFallbackDailySuggestions(profileSummary, candidates) {
  const name = profileSummary?.name || 'Bugün';
  const interests = profileSummary?.interest_tags || [];
  const firstInterest = interests[0] || null;

  const suggestions = [];

  if (candidates.length > 0) {
    const first = candidates[0];
    if (first.type === 'continue_chat') {
      suggestions.push({
        id: first.id,
        title_tr: 'Son sohbetine kısa bir devam',
        short_description_tr:
          'Önceki konuşmana birkaç yeni soru ekleyerek yaklaşık 5 dakikalık bir pratik yapıyorsun.',
        skill_focus: 'speaking',
        estimated_time_min: first.estimated_time_min || 5,
        reason_tr:
          'Devam eden sohbetleri tamamlamak akıcılığını ve özgüvenini artırır.',
        action_label_tr: 'Sohbete Devam Et',
        action_type: 'continue_chat',
        action_payload: {
          conversationId: first.conversationId,
          topic_hint: first.topic_hint || null,
        },
      });
    }
  }

  if (firstInterest && suggestions.length < 2) {
    suggestions.push({
      id: `interest_${firstInterest}`,
      title_tr: `${firstInterest} hakkında mini sohbet`,
      short_description_tr: `${firstInterest} temasında 4-5 soruluk kısa bir günlük konuşma pratiği yapıyorsun.`,
      skill_focus: 'speaking',
      estimated_time_min: 7,
      reason_tr: `${firstInterest} zaten ilgi alanın olduğu için bu konuda konuşmak motivasyonunu yükseltir.`,
      action_label_tr: 'Sohbete Başla',
      action_type: 'start_chat_topic',
      action_payload: {
        topic: firstInterest,
      },
    });
  }

  if (suggestions.length < 2) {
    suggestions.push({
      id: 'quick_motiv_speaking',
      title_tr: '3 cümlelik motivasyon kaydı',
      short_description_tr:
        'Bugünkü ruh halini anlatan 3 cümlelik kısa bir ses kaydı hazırlıyorsun ve telaffuzunu pratik ediyorsun.',
      skill_focus: 'pronunciation',
      estimated_time_min: 3,
      reason_tr: 'Kısa ses kayıtları telaffuzunu hızlıca geliştirir ve özgüven kazandırır.',
      action_label_tr: 'Motiv Ses Kaydet',
      action_type: 'start_motiv_recording',
      action_payload: {},
    });
  }

  const dailyMessage = firstInterest
    ? `${name}, bugün ${firstInterest} üzerinden konuşma pratiği yapalım. İstersen son sohbetine de kısa bir devam ekleyebilirsin.`
    : `${name}, bugün sana hemen başlayabileceğin 1-2 kısa İngilizce pratik önerisi hazırladım.`;

  return {
    daily_message_tr: dailyMessage,
    suggestions,
    fallback_questions_tr: [
      'Bugün hangi konular sana daha çekici geliyor? Futbol, iş hayatı mı yoksa günlük sohbet mi?',
    ],
  };
}

const saveDailySuggestionFeedback = async (req, res) => {
  try {
    const userId = req.user.id;
    const { suggestion_id, action_type, clicked, reason, raw_text, content_key } = req.body || {};

    if (!suggestion_id || typeof suggestion_id !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'suggestion_id gereklidir',
      });
    }

    const insertQuery = `
      INSERT INTO user_daily_suggestion_logs (user_id, suggestion_id, action_type, clicked, reason, raw_text)
      VALUES ($1, $2, $3, COALESCE($4, true), $5, $6)
      RETURNING id, user_id, suggestion_id, action_type, clicked, reason, raw_text, created_at
    `;

    const isClicked = typeof clicked === 'boolean' ? clicked : true;

    const params = [
      userId,
      suggestion_id,
      action_type || null,
      isClicked,
      reason || null,
      raw_text || null,
    ];

    const result = await db.query(insertQuery, params);

    try {
      const isClicked = typeof clicked === 'boolean' ? clicked : true;
      if (content_key && isClicked) {
        await liroContentGraph.markInteraction(userId, content_key, {
          status: reason === 'accepted' ? 'completed' : undefined,
          viaMode: 'chat',
        });
      }
    } catch (interactionError) {
      logger.warn('Failed to mark interaction from daily suggestion feedback:', interactionError);
    }

    res.json({
      success: true,
      feedback: result.rows[0],
    });
  } catch (error) {
    logger.error('Error saving daily suggestion feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Geri bildirim kaydedilemedi',
    });
  }
};

module.exports = {
  getConversations,
  createConversation,
  getMessages,
  sendMessage,
  deleteConversation,
  updateConversationTitle,
  getTopicSuggestions,
  getPopularTopics,
  getDailySuggestions,
  saveDailySuggestionFeedback,
};
