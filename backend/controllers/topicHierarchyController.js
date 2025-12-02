const { supabase } = require('../utils/supabaseClient');
const OpenAI = require('openai');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Ana konu oluştur
 * POST /api/topic-hierarchy/topics
 */
exports.createMainTopic = async (req, res) => {
  try {
    const { title, description, level } = req.body;
    const userId = req.user.id;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Konu başlığı zorunludur'
      });
    }

    const allowedLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const normalizedLevelRaw = (level || 'A1').toString().trim().toUpperCase();
    const normalizedLevel = allowedLevels.includes(normalizedLevelRaw)
      ? normalizedLevelRaw
      : 'A1';

    logger.info(`[TOPIC HIERARCHY] Creating main topic: "${title}" for user ${userId} at level ${normalizedLevel}`);

    const { data, error } = await supabase
      .from('topics')
      .insert({
        user_id: userId,
        title: title.trim(),
        description: description?.trim() || null,
        level: normalizedLevel,
        depth: 0,
        parent_id: null,
        is_manual: true
      })
      .select()
      .single();

    if (error) throw error;

    logger.info(`[TOPIC HIERARCHY] Main topic created successfully: ${data.id}`);

    res.json({
      success: true,
      message: 'Ana konu başarıyla oluşturuldu',
      data: { topic: data }
    });
  } catch (error) {
    logger.error('[TOPIC HIERARCHY] Error creating main topic:', error);
    res.status(500).json({
      success: false,
      message: 'Ana konu oluşturulurken hata oluştu',
      error: error.message
    });
  }
};

/**
 * Konu sesini dinlenmiş olarak işaretle
 * POST /api/topic-hierarchy/topics/mark-listened
 * Body: { mp3_url: string }
 */
exports.markTopicListened = async (req, res) => {
  try {
    const { mp3_url } = req.body;
    const userId = req.user.id;

    if (!mp3_url || typeof mp3_url !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'mp3_url zorunludur'
      });
    }

    logger.info(`[TOPIC HIERARCHY] Marking topic audio as listened for user ${userId}, mp3_url=${mp3_url}`);

    // Kullanıcıya ait konular için bu mp3_url ile ilişkili en son topic_contents kaydını bul
    const { data, error } = await supabase
      .from('topic_contents')
      .select('id, topic_id, created_at, topics!inner(user_id)')
      .eq('mp3_url', mp3_url)
      .eq('topics.user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      logger.error('[TOPIC HIERARCHY] Error fetching topic_contents for mark-listened:', error);
      return res.status(500).json({
        success: false,
        message: 'Ses kaydı aranırken hata oluştu',
        error: error.message
      });
    }

    if (!data || data.length === 0) {
      logger.warn(`[TOPIC HIERARCHY] No topic_contents found for mp3_url=${mp3_url} and user ${userId}`);
      return res.status(404).json({
        success: false,
        message: 'İlgili konu ses kaydı bulunamadı'
      });
    }

    const contentId = data[0].id;

    const { error: updateError } = await supabase
      .from('topic_contents')
      .update({ listened_at: new Date().toISOString() })
      .eq('id', contentId);

    if (updateError) {
      logger.error('[TOPIC HIERARCHY] Error updating listened_at on topic_contents:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Dinlenme bilgisi güncellenirken hata oluştu',
        error: updateError.message
      });
    }

    logger.info(`[TOPIC HIERARCHY] Topic audio marked as listened: topic_contents.id=${contentId}`);

    return res.json({
      success: true,
      message: 'Ses kaydı dinlenmiş olarak işaretlendi'
    });
  } catch (error) {
    logger.error('[TOPIC HIERARCHY] Error in markTopicListened:', error);
    return res.status(500).json({
      success: false,
      message: 'Ses kaydı dinlenmiş olarak işaretlenirken hata oluştu',
      error: error.message
    });
  }
};

/**
 * OpenAI ile alt konu üret
 * POST /api/topic-hierarchy/topics/:id/subtopics
 */
exports.generateSubtopics = async (req, res) => {
  try {
    const { id } = req.params;
    const { count = 5, language = 'Turkish', angle } = req.body;
    const userId = req.user.id;

    logger.info(`[TOPIC HIERARCHY] Generating ${count} subtopics for topic ${id}`);

    // Ana konuyu getir
    const { data: parentTopic, error: fetchError } = await supabase
      .from('topics')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !parentTopic) {
      return res.status(404).json({
        success: false,
        message: 'Konu bulunamadı'
      });
    }

    // Mevcut alt konuları başlık benzerliği kontrolü için getir
    const { data: existingChildren, error: existingChildrenError } = await supabase
      .from('topics')
      .select('title')
      .eq('parent_id', id)
      .eq('user_id', userId);

    if (existingChildrenError) {
      logger.error('[TOPIC HIERARCHY] Error fetching existing subtopics for similarity check:', existingChildrenError);
    }

    // Prompt template'i yükle
    const promptPath = path.join(__dirname, '../prompts/topic_hierarchy/generate_subtopics.txt');
    let promptTemplate = '';
    
    try {
      promptTemplate = fs.readFileSync(promptPath, 'utf-8');
    } catch (err) {
      // Fallback inline prompt (generate_subtopics.txt ile aynı mantık)
      promptTemplate = `Ana Konu: "{{main_topic}}"
CEFR Seviye: {{level}}
Dil: {{language}}
Alt Konu Sayısı: {{count}}
Odak Açıklaması (isteğe bağlı): {{angle_description}}

Görevin:
- Bu ana konu için {{count}} adet eğitici alt konu listesi üret.
- Eğer bir odak açıklaması verilmişse (boş değilse), TÜM alt konular doğrudan bu odağa bağlı olmalı ve onu farklı açılardan detaylandırmalıdır. Genel veya konu dışı başlıklar üretme.
- CEFR seviyesi SADECE açıklama cümlelerinin dil zorluğunu ayarlamak içindir. Alt konu başlıklarını ve seçilen konuları seviyeye göre sınırlama; herkes için geçerli, doğal ve öğretici başlıklar üret.
- Açıklama cümlelerinde {{level}} seviyesine uygun kelime dağarcığı ve kavramlar kullan:
  - A1-A2: Günlük, basit, somut konular
  - B1-B2: Orta seviye, biraz soyut kavramlar
  - C1-C2: İleri seviye, akademik ve detaylı konular

JSON formatında döndür:
{
  "subtopics": [
    {
      "title": "Alt Konu Başlığı",
      "description": "1-2 cümle açıklama",
      "keywords": ["anahtar", "kelimeler"]
    }
  ]
}`;
    }

    let prompt = promptTemplate
      .replace(/\{\{main_topic\}\}/g, parentTopic.title)
      .replace(/\{\{level\}\}/g, parentTopic.level)
      .replace(/\{\{language\}\}/g, language)
      .replace(/\{\{count\}\}/g, count.toString())
      .replace(/\{\{angle_description\}\}/g, angle && typeof angle === 'string' && angle.trim().length > 0 ? angle.trim() : 'Belirtilmedi');

    if (angle && typeof angle === 'string' && angle.trim().length > 0) {
      prompt += `\n\nÖNEMLİ: Kullanıcının verdiği odak açıklaması: "${angle.trim()}". Lütfen ürettiğin tüm alt konu başlıklarının bu odağı doğrudan işlemesine dikkat et; genel Kıbrıs bilgisi gibi konu dışı başlıklar üretme.`;
    }

    logger.info('[TOPIC HIERARCHY] Calling OpenAI for subtopic generation');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Sen profesyonel bir eğitim içeriği uzmanısın. ${language} dilinde eğitici alt konular oluşturuyorsun.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    });

    const responseText = completion.choices[0]?.message?.content;
    const parsed = JSON.parse(responseText);

    if (!parsed.subtopics || !Array.isArray(parsed.subtopics)) {
      throw new Error('Invalid OpenAI response format');
    }

    logger.info(`[TOPIC HIERARCHY] OpenAI returned ${parsed.subtopics.length} subtopics`);

    // Benzer başlıkları temizlemek için basit kelime tabanlı benzerlik kontrolü
    const tokenizeTitle = (title) => {
      if (!title || typeof title !== 'string') return [];
      const cleaned = title
        .toLowerCase()
        .replace(/[^a-zA-Z0-9ığüşöçİĞÜŞÖÇ]+/g, ' ')
        .trim();
      return cleaned ? cleaned.split(/\s+/) : [];
    };

    const jaccardSimilarity = (tokensA, tokensB) => {
      if (!tokensA.length || !tokensB.length) return 0;
      const setA = new Set(tokensA);
      const setB = new Set(tokensB);
      let intersection = 0;
      for (const t of setA) {
        if (setB.has(t)) intersection += 1;
      }
      const union = setA.size + setB.size - intersection;
      return union === 0 ? 0 : intersection / union;
    };

    const existingNormalized = [];

    if (Array.isArray(existingChildren)) {
      existingChildren.forEach((child) => {
        const tokens = tokenizeTitle(child.title);
        if (tokens.length > 0) {
          existingNormalized.push({ title: child.title, tokens });
        }
      });
    }

    const filteredSubtopics = [];
    let skippedSimilarCount = 0;

    for (const st of parsed.subtopics) {
      if (!st || !st.title || typeof st.title !== 'string') continue;
      const tokens = tokenizeTitle(st.title);
      if (!tokens.length) continue;

      let isSimilar = false;
      for (const existing of existingNormalized) {
        const sim = jaccardSimilarity(tokens, existing.tokens);
        if (sim >= 0.75) {
          isSimilar = true;
          break;
        }
      }

      if (isSimilar) {
        skippedSimilarCount += 1;
        continue;
      }

      filteredSubtopics.push(st);
      existingNormalized.push({ title: st.title, tokens });
    }

    logger.info(
      `[TOPIC HIERARCHY] Filtered subtopics: kept ${filteredSubtopics.length}, skipped ${skippedSimilarCount} similar titles`
    );

    if (filteredSubtopics.length === 0) {
      return res.json({
        success: true,
        message: 'Yeni, benzersiz alt konu bulunamadı (tüm öneriler mevcut başlıklarla çok benzerdi).',
        data: { subtopics: [] }
      });
    }

    // Alt konuları veritabanına ekle
    const subtopicsToInsert = filteredSubtopics.map((st, index) => ({
      user_id: userId,
      parent_id: id,
      title: st.title,
      description: st.description || '',
      level: parentTopic.level,
      depth: parentTopic.depth + 1,
      order_index: index,
      is_manual: false,
      keywords: st.keywords || []
    }));

    const { data: insertedSubtopics, error: insertError } = await supabase
      .from('topics')
      .insert(subtopicsToInsert)
      .select();

    if (insertError) throw insertError;

    logger.info(`[TOPIC HIERARCHY] Successfully inserted ${insertedSubtopics.length} subtopics`);

    res.json({
      success: true,
      message: `${insertedSubtopics.length} alt konu başarıyla oluşturuldu`,
      data: { subtopics: insertedSubtopics }
    });
  } catch (error) {
    logger.error('[TOPIC HIERARCHY] Error generating subtopics:', error);
    res.status(500).json({
      success: false,
      message: 'Alt konular oluşturulurken hata oluştu',
      error: error.message
    });
  }
};

/**
 * Manuel alt konu ekle
 * POST /api/topic-hierarchy/topics/:id/subtopics/manual
 */
exports.addManualSubtopic = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;
    const userId = req.user.id;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Alt konu başlığı zorunludur'
      });
    }

    logger.info(`[TOPIC HIERARCHY] Adding manual subtopic to topic ${id}`);

    // Parent topic'i getir
    const { data: parentTopic, error: fetchError } = await supabase
      .from('topics')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !parentTopic) {
      return res.status(404).json({
        success: false,
        message: 'Ana konu bulunamadı'
      });
    }

    // Aynı seviyedeki konuların sayısını bul (order_index için)
    const { count } = await supabase
      .from('topics')
      .select('*', { count: 'exact', head: true })
      .eq('parent_id', id);

    const { data: newSubtopic, error: insertError } = await supabase
      .from('topics')
      .insert({
        user_id: userId,
        parent_id: id,
        title: title.trim(),
        description: description?.trim() || null,
        level: parentTopic.level,
        depth: parentTopic.depth + 1,
        order_index: count || 0,
        is_manual: true
      })
      .select()
      .single();

    if (insertError) throw insertError;

    logger.info(`[TOPIC HIERARCHY] Manual subtopic created: ${newSubtopic.id}`);

    res.json({
      success: true,
      message: 'Alt konu başarıyla eklendi',
      data: { subtopic: newSubtopic }
    });
  } catch (error) {
    logger.error('[TOPIC HIERARCHY] Error adding manual subtopic:', error);
    res.status(500).json({
      success: false,
      message: 'Alt konu eklenirken hata oluştu',
      error: error.message
    });
  }
};

/**
 * Kullanıcının tüm konu ağacını getir
 * GET /api/topic-hierarchy/topics/tree
 */
exports.getTopicTree = async (req, res) => {
  try {
    const userId = req.user.id;

    logger.info(`[TOPIC HIERARCHY] Fetching topic tree for user ${userId}`);

    // Tüm konuları getir (client-side'da tree'ye dönüştüreceğiz)
    const { data: topics, error } = await supabase
      .from('topics')
      .select('*')
      .eq('user_id', userId)
      .order('depth', { ascending: true })
      .order('order_index', { ascending: true });

    if (error) throw error;

    if (!topics || topics.length === 0) {
      logger.info('[TOPIC HIERARCHY] No topics found for user');
      return res.json({
        success: true,
        data: {
          topics: [],
          total: 0
        }
      });
    }

    // Her topic için son oluşturulan sesli içeriği getir
    const topicIds = topics.map(t => t.id);
    let latestContentByTopic = {};
    try {
      const { data: contents, error: contentsError } = await supabase
        .from('topic_contents')
        .select('*')
        .in('topic_id', topicIds)
        .order('created_at', { ascending: false });

      if (contentsError) {
        logger.error('[TOPIC HIERARCHY] Error fetching topic_contents:', contentsError);
      } else if (contents && contents.length > 0) {
        contents.forEach(content => {
          if (!latestContentByTopic[content.topic_id]) {
            latestContentByTopic[content.topic_id] = content;
          }
        });
      }
    } catch (contentsErr) {
      logger.error('[TOPIC HIERARCHY] Unexpected error while fetching topic_contents:', contentsErr);
    }

    // Tree yapısına dönüştür
    const topicMap = {};
    const rootTopics = [];

    topics.forEach(topic => {
      topicMap[topic.id] = {
        ...topic,
        children: [],
        latest_content: latestContentByTopic[topic.id] || null
      };
    });

    topics.forEach(topic => {
      if (topic.parent_id === null) {
        rootTopics.push(topicMap[topic.id]);
      } else if (topicMap[topic.parent_id]) {
        topicMap[topic.parent_id].children.push(topicMap[topic.id]);
      }
    });

    // Ana konuları (rootTopics) oluşturulma tarihine göre sırala: en yeni en üstte
    rootTopics.sort((a, b) => {
      const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bCreated - aCreated;
    });

    logger.info(`[TOPIC HIERARCHY] Found ${topics.length} topics, ${rootTopics.length} root topics`);

    res.json({
      success: true,
      data: {
        topics: rootTopics,
        total: topics.length
      }
    });
  } catch (error) {
    logger.error('[TOPIC HIERARCHY] Error fetching topic tree:', error);
    res.status(500).json({
      success: false,
      message: 'Konu ağacı getirilirken hata oluştu',
      error: error.message
    });
  }
};

/**
 * Breadcrumb için konu yolunu getir
 * GET /api/topic-hierarchy/topics/:id/path
 */
exports.getTopicPath = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    logger.info(`[TOPIC HIERARCHY] Fetching path for topic ${id}`);

    // Recursive query ile path'i getir
    const { data, error } = await supabase.rpc('get_topic_path', {
      topic_id: id,
      req_user_id: userId
    });

    if (error) {
      // Function yoksa fallback
      logger.warn('[TOPIC HIERARCHY] RPC function not found, using fallback');
      
      const path = [];
      let currentId = id;
      
      while (currentId) {
        const { data: topic } = await supabase
          .from('topics')
          .select('*')
          .eq('id', currentId)
          .eq('user_id', userId)
          .single();
        
        if (!topic) break;
        path.unshift(topic);
        currentId = topic.parent_id;
      }
      
      return res.json({
        success: true,
        data: { path }
      });
    }

    res.json({
      success: true,
      data: { path: data }
    });
  } catch (error) {
    logger.error('[TOPIC HIERARCHY] Error fetching topic path:', error);
    res.status(500).json({
      success: false,
      message: 'Konu yolu getirilirken hata oluştu',
      error: error.message
    });
  }
};

/**
 * Konu ve tüm alt konularını sil
 * DELETE /api/topic-hierarchy/topics/:id
 */
exports.deleteTopicAndChildren = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    logger.info(`[TOPIC HIERARCHY] Deleting topic and children: ${id}`);

    // Önce topic'in kullanıcıya ait olduğunu kontrol et
    const { data: topic, error: fetchError } = await supabase
      .from('topics')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !topic) {
      return res.status(404).json({
        success: false,
        message: 'Konu bulunamadı'
      });
    }

    // CASCADE delete otomatik çalışacak
    const { error: deleteError } = await supabase
      .from('topics')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (deleteError) throw deleteError;

    logger.info(`[TOPIC HIERARCHY] Topic and children deleted successfully`);

    res.json({
      success: true,
      message: 'Konu ve alt konuları başarıyla silindi'
    });
  } catch (error) {
    logger.error('[TOPIC HIERARCHY] Error deleting topic:', error);
    res.status(500).json({
      success: false,
      message: 'Konu silinirken hata oluştu',
      error: error.message
    });
  }
};

/**
 * Konudan TTS içerik oluştur
 * POST /api/topic-hierarchy/topics/:id/create-content
 */
exports.createContentFromTopic = async (req, res) => {
  try {
    const { id } = req.params;
    const { voice, speaking_rate } = req.body;
    const userId = req.user.id;

    logger.info(`[TOPIC HIERARCHY] Creating TTS content for topic ${id}`);

    // Topic'i getir
    const { data: topic, error: fetchError } = await supabase
      .from('topics')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !topic) {
      return res.status(404).json({
        success: false,
        message: 'Konu bulunamadı'
      });
    }

    // Bu endpoint mevcut TTS controller'ına yönlendirecek
    // Burada sadece topic bilgisini döndürüyoruz
    // Frontend kendi TTS workflow'unu tetikleyecek
    
    res.json({
      success: true,
      message: 'Konu bilgisi alındı, TTS işlemi başlatılabilir',
      data: {
        topic,
        suggested_input: `${topic.title}${topic.description ? ': ' + topic.description : ''}`
      }
    });
  } catch (error) {
    logger.error('[TOPIC HIERARCHY] Error creating content from topic:', error);
    res.status(500).json({
      success: false,
      message: 'İçerik oluşturulurken hata oluştu',
      error: error.message
    });
  }
};
