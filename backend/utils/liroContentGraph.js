const db = require('../config/db');
const logger = require('./logger');

function createEmptyOverview() {
  return {
    current_main_topic: null,
    recent_items: [],
    incomplete_items: [],
    completed_items: [],
    recommended_next: [],
    history_stats: null,
  };
}

/**
 * Kullanıcının tüm üretim geçmişini (TTS, PDF, Chat) analiz eder.
 * Amacı: Kullanıcının gizli tercihlerini (seviye, format, konu) anlamak.
 */
async function analyzeContentHistory(userId) {
  try {
    // Son 50 işlemi çek
    const query = `
      SELECT 
        input, 
        input_type, 
        level, 
        audio_duration_seconds, 
        created_at
      FROM contenthistory
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `;
    
    const result = await db.query(query, [userId]);
    const history = result.rows;

    if (history.length === 0) return null;

    const stats = {
      total_interactions: history.length,
      total_audio_generated: history.filter(h => h.audio_duration_seconds > 0).length,
      preferred_level: 'B1',
      last_activity_date: history[0].created_at,
      has_recent_audio: false
    };

    // En çok tercih edilen seviyeyi bul (Mode)
    const levels = history.map(h => h.level).filter(Boolean);
    if (levels.length > 0) {
      const mode = levels.sort((a,b) =>
        levels.filter(v => v===a).length - levels.filter(v => v===b).length
      ).pop();
      stats.preferred_level = mode;
    }

    // Son 5 işlemde ses var mı?
    stats.has_recent_audio = history.slice(0, 5).some(h => h.audio_duration_seconds > 0);

    return stats;
  } catch (err) {
    logger.warn('Failed to analyze content history:', err);
    return null;
  }
}

async function getUserOverview(userId) {
  const empty = createEmptyOverview();
  if (!userId) return empty;

  let rows;
  let historyStats = null;

  try {
    // 1. Mevcut İlerleme Durumu (Progress)
    const query = `
      SELECT 
        ci.id,
        ci.topic_id,
        ci.content_key,
        ci.title,
        ci.type,
        ci.cefr_level,
        ci.estimated_duration_min,
        ucp.status,
        ucp.progress_percent,
        ucp.times_repeated,
        ucp.last_interaction_at,
        tn.path AS topic_path,
        tn.title AS topic_title
      FROM user_content_progress ucp
      JOIN content_items ci ON ci.id = ucp.content_item_id
      LEFT JOIN topic_nodes tn ON tn.id = ci.topic_id
      WHERE ucp.user_id = $1
      ORDER BY ucp.last_interaction_at DESC
      LIMIT 50
    `;

    const result = await db.query(query, [userId]);
    rows = result.rows || [];

    // 2. Geçmiş Analizi (Learning Engine)
    historyStats = await analyzeContentHistory(userId);

  } catch (error) {
    if (error && (error.code === '42P01' || error.message?.includes('relation "user_content_progress" does not exist'))) {
      logger.warn('Content graph tables not ready, returning empty overview');
      return empty;
    }
    logger.error('Failed to load user content overview:', error);
    return empty;
  }

  const recentItems = rows.map((r) => ({
    key: r.content_key,
    title: r.title,
    type: r.type,
    cefr_level: r.cefr_level,
    status: r.status,
    progress_percent: r.progress_percent,
    times_repeated: r.times_repeated,
    topic_id: r.topic_id,
    topic_path: r.topic_path,
    topic_title: r.topic_title,
    estimated_duration_min: r.estimated_duration_min,
    last_interaction_at: r.last_interaction_at,
  }));

  const incomplete = recentItems.filter((item) => item.status !== 'completed');
  const completed = recentItems.filter((item) => item.status === 'completed');

  // Ana konu belirleme
  let currentMainTopic = null;
  const firstWithTopic = recentItems.find((item) => item.topic_path || item.topic_title);
  if (firstWithTopic) {
    if (firstWithTopic.topic_path) {
      const parts = String(firstWithTopic.topic_path).split('/');
      currentMainTopic = parts[0] || null;
    } else if (firstWithTopic.topic_title) {
      currentMainTopic = firstWithTopic.topic_title;
    }
  }

  // --- ÖNERİ ALGORİTMASI ---
  
  // Öncelik 1: Yarım kalanları bitir
  let recommendedNext = incomplete.slice(0, 3);

  // Öncelik 2: Eğer yer varsa, tamamlanan konuların DEVAMINI (sıradaki üniteyi) getir
  if (recommendedNext.length < 3 && completed.length > 0) {
    // Son bitirilen 2 konuyu al
    const recentTopicIds = [...new Set(completed.map(i => i.topic_id).filter(Boolean))].slice(0, 2);
    
    if (recentTopicIds.length > 0) {
      try {
        // Bu topic'lerde henüz BAŞLANMAMIŞ içerikleri bul (content_key sırasına göre)
        const nextQuery = `
          SELECT ci.id, ci.content_key, ci.title, ci.type, ci.cefr_level, ci.estimated_duration_min, 
                 tn.path as topic_path, tn.title as topic_title
          FROM content_items ci
          LEFT JOIN topic_nodes tn ON tn.id = ci.topic_id
          WHERE ci.topic_id = ANY($1::uuid[])
            AND ci.id NOT IN (
              SELECT content_item_id FROM user_content_progress WHERE user_id = $2
            )
          ORDER BY ci.content_key ASC
          LIMIT 3
        `;
        
        const nextResult = await db.query(nextQuery, [recentTopicIds, userId]);
        const nextItems = nextResult.rows.map(r => ({
          key: r.content_key,
          title: r.title,
          type: r.type,
          cefr_level: r.cefr_level,
          status: 'not_started', // İşaretle
          progress_percent: 0,
          topic_path: r.topic_path,
          topic_title: r.topic_title,
          estimated_duration_min: r.estimated_duration_min
        }));

        // Listeye ekle
        recommendedNext = [...recommendedNext, ...nextItems].slice(0, 3);
      } catch (err) {
        logger.warn('Failed to fetch next items for overview:', err);
      }
    }
  }

  return {
    current_main_topic: currentMainTopic,
    recent_items: recentItems,
    incomplete_items: incomplete,
    completed_items: completed,
    recommended_next: recommendedNext,
    history_stats: historyStats
  };
}

function mapStatusToTr(status) {
  if (!status) return null;
  const normalized = String(status).toLowerCase();
  if (normalized === 'completed') return 'tamamlandı';
  if (normalized === 'in_progress') return 'devam ediyor';
  if (normalized === 'skipped') return 'atlandı';
  return status;
}

function buildOverviewPromptSection(overview) {
  const data = overview || createEmptyOverview();

  const hasItems = (data.recent_items && data.recent_items.length > 0) || (data.incomplete_items && data.incomplete_items.length > 0);
  
  // Eğer hiç progress yoksa ama history varsa, history'den beslenelim
  if (!hasItems && !data.history_stats) {
    return 'Kullanıcının içerik ilerleme özeti: Kullanıcının kayıtlı içerik ilerlemesi bulunmuyor. Kullanıcıya yeni bir konu veya içerik seçmesi için nazikçe öneriler sun.';
  }

  const lines = [];
  lines.push('Kullanıcının içerik/geçmiş özeti:');

  if (data.history_stats) {
    const s = data.history_stats;
    lines.push(`- Geniş Geçmiş Analizi: Toplam ${s.total_interactions} işlem.`);
    lines.push(`- Tercih Ettiği Seviye: ${s.preferred_level}`);
    if (s.total_audio_generated > 2) {
       lines.push(`- Format Tercihi: Sesli (TTS) içerikleri seviyor (${s.total_audio_generated} kez kullandı).`);
    }
  }

  if (data.current_main_topic) {
    lines.push(`- Ana konu alanı: ${data.current_main_topic}`);
  }

  const recent = (data.recent_items || []).slice(0, 3);
  if (recent.length > 0) {
    const parts = recent.map((item) => {
      const statusTr = mapStatusToTr(item.status);
      if (statusTr) {
        return `${item.title} (${statusTr})`;
      }
      return item.title;
    });
    lines.push(`- Son çalıştığı içerikler: ${parts.join(', ')}`);
  }

  const incomplete = (data.incomplete_items || []).slice(0, 3);
  if (incomplete.length > 0) {
    const parts = incomplete.map((item) => item.title);
    lines.push(`- Tamamlanmamış (ÖNCELİKLİ): ${parts.join(', ')}`);
  }

  const recommended = (data.recommended_next || []).slice(0, 3);
  if (recommended.length > 0) {
    const parts = recommended.map((item) => {
      if (item.status === 'not_started') return `${item.title} (YENİ - Sırada)`;
      return item.title;
    });
    lines.push(`- Önerilen sıradaki içerikler: ${parts.join(', ')}`);
  }

  return lines.join('\n');
}

async function markInteraction(userId, contentKey, options = {}) {
  if (!userId || !contentKey) {
    return;
  }

  const now = options.timestamp || new Date();
  const status = options.status || null;
  const progressPercent = typeof options.progressPercent === 'number' ? options.progressPercent : null;
  const viaMode = options.viaMode || null;
  const listenedSeconds = typeof options.listenedSeconds === 'number' ? options.listenedSeconds : null;
  const pagesViewed = typeof options.pagesViewed === 'number' ? options.pagesViewed : null;
  const completedOnce = options.completedOnce === true;

  let contentRow;
  try {
    const contentResult = await db.query(
      'SELECT id FROM content_items WHERE content_key = $1 LIMIT 1',
      [contentKey]
    );
    contentRow = contentResult.rows[0];
  } catch (error) {
    if (error && (error.code === '42P01' || error.message?.includes('relation "content_items" does not exist'))) {
      logger.warn('Content graph tables not ready, cannot mark interaction');
      return;
    }
    logger.error('Failed to lookup content item for interaction:', error);
    return;
  }

  if (!contentRow) {
    logger.warn('Content item not found for interaction', { contentKey });
    return;
  }

  const contentItemId = contentRow.id;

  // user_content_progress UPSERT
  try {
    const progressStatus = status || 'in_progress';
    const progressValue = progressPercent !== null ? progressPercent : 0;

    await db.query(
      `INSERT INTO user_content_progress (
         user_id, content_item_id, status, progress_percent, times_repeated, last_interaction_at, via_mode
       )
       VALUES ($1, $2, $3, $4, CASE WHEN $3 = 'completed' THEN 1 ELSE 0 END, $5, $6)
       ON CONFLICT (user_id, content_item_id)
       DO UPDATE SET
         status = COALESCE(EXCLUDED.status, user_content_progress.status),
         progress_percent = GREATEST(
           user_content_progress.progress_percent,
           COALESCE(EXCLUDED.progress_percent, user_content_progress.progress_percent)
         ),
         last_interaction_at = EXCLUDED.last_interaction_at,
         via_mode = COALESCE(EXCLUDED.via_mode, user_content_progress.via_mode),
         times_repeated = CASE
           WHEN EXCLUDED.status = 'completed' AND user_content_progress.status <> 'completed'
             THEN user_content_progress.times_repeated + 1
           ELSE user_content_progress.times_repeated
         END`,
      [userId, contentItemId, progressStatus, progressValue, now, viaMode]
    );
  } catch (error) {
    if (error && (error.code === '42P01' || error.message?.includes('relation "user_content_progress" does not exist'))) {
      logger.warn('user_content_progress table not ready, skipping interaction log');
      return;
    }
    logger.error('Failed to upsert user_content_progress:', error);
  }

  // user_asset_usage UPSERT
  if (listenedSeconds === null && pagesViewed === null && !completedOnce) {
    return;
  }

  try {
    await db.query(
      `INSERT INTO user_asset_usage (
         user_id, content_item_id, listened_seconds, pages_viewed, completed_once, last_used_at
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, content_item_id)
       DO UPDATE SET
         listened_seconds = GREATEST(
           COALESCE(user_asset_usage.listened_seconds, 0),
           COALESCE(EXCLUDED.listened_seconds, 0)
         ),
         pages_viewed = GREATEST(
           COALESCE(user_asset_usage.pages_viewed, 0),
           COALESCE(EXCLUDED.pages_viewed, 0)
         ),
         completed_once = user_asset_usage.completed_once OR EXCLUDED.completed_once,
         last_used_at = EXCLUDED.last_used_at`,
      [userId, contentItemId, listenedSeconds, pagesViewed, completedOnce, now]
    );
  } catch (error) {
    if (error && (error.code === '42P01' || error.message?.includes('relation "user_asset_usage" does not exist'))) {
      logger.warn('user_asset_usage table not ready, skipping asset usage log');
      return;
    }
    logger.error('Failed to upsert user_asset_usage:', error);
  }
}

module.exports = {
  getUserOverview,
  buildOverviewPromptSection,
  markInteraction,
};
