// Supabase entegrasyonu için güncellenmiş contentController.js
const { supabase } = require('../utils/storage/supabaseClient.js');
require("dotenv").config();
const logger = require('../utils/common/logger.js'); // Import logger
const { logStep } = require('../utils/common/stepLogger.js');
const { v4: uuidv4 } = require('uuid');
const { processTextPipeline } = require('../utils/common/pipeline.js');
const { getNewsForTopic } = require('../utils/content/newsService.js');
const { extractFromWebLink } = require('../utils/ai/inputExtractor.js');
const gamificationService = require('../services/gamificationService');
const { invalidateCache } = require('../middleware/redisCache');
const contentHistoryService = require('../services/contentHistoryService');
const quizGenerationService = require('../services/quizGenerationService');

function looksInvalidArticleText(text = '') {
  const sample = String(text || '').slice(0, 5000);
  if (!sample.trim()) return true;

  if (/Permission is hereby granted, free of charge/i.test(sample)) return true;
  if (/Copyright \(c\).{0,120}(Google|Angular)/i.test(sample)) return true;
  if (/__ccd_|google_tag_data|\[50,"|\[46,"|\[52,"|\["require",/i.test(sample)) return true;

  const bracketCommaCount = (sample.match(/[\[\],]/g) || []).length;
  const sentenceCount = (sample.match(/[.!?](\s|$)/g) || []).length;
  if (bracketCommaCount > 200 && sentenceCount < 3) return true;

  return false;
}

function tryParseJson(value) {
  if (value == null) return value;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (!(trimmed.startsWith('[') || trimmed.startsWith('{'))) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

// Supabase yapılandırması
const supabaseBucket = process.env.SUPABASE_BUCKET || "lingroot-audio";

// Google Drive URL dönüştürme fonksiyonu
function convertGoogleDriveUrl(url) {
  if (!url || typeof url !== "string") {
    return url;
  }

  // Google Drive URL"si olup olmadığını kontrol et
  if (!url.includes("drive.google.com/file/d/")) {
    return url;
  }

  try {
    // URL"den dosya ID"sini çıkar
    // Format: https://drive.google.com/file/d/FILE_ID/view?usp=drivesdk
    const fileIdMatch = url.match(/\/file\/d\/([^\/]+)/);
    if (!fileIdMatch || !fileIdMatch[1]) {
      logger.warn(`Could not extract file ID from Google Drive URL: ${url}`);
      return url; // Eşleşme bulunamadı, orijinal URL"yi döndür
    }

    const fileId = fileIdMatch[1];
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    logger.debug(`Converted Google Drive URL ${url} to ${downloadUrl}`);
    // Doğrudan indirme URL"sini oluştur
    return downloadUrl;
  } catch (error) {
    logger.error(`Error converting Google Drive URL ${url}:`, error);
    return url; // Hata durumunda orijinal URL"yi döndür
  }
}

/**
 * Web linkten içerik işleme fonksiyonu. Kullanıcıdan gelen web linkini alır, metin çıkarma ve işleme pipeline'ına gönderir.
 */
exports.processLink = async (req, res) => {
  const { input, level } = req.body;
  const result = await processTextPipeline({ inputData: input, inputType: 'weblink', level });
  if (result.error) return res.status(400).json({ success: false, error: result.error });
  res.json({ success: true, data: result.cleanedText });
};

/**
 * Haber URL'sinden tam metni çıkarıp döndüren yardımcı endpoint.
 */
exports.fetchArticleDetails = async (req, res) => {
  const requestId = uuidv4();
  try {
    const { url, title, sourceName } = req.body || {};
    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Lütfen geçerli bir haber bağlantısı (url) gönderin.',
      });
    }

    logger.info(`[${requestId}] fetchArticleDetails called`, { url });
    const text = await extractFromWebLink(url, {
      title,
      sourceName,
    });
    if (!text || !text.trim() || looksInvalidArticleText(text)) {
      logger.warn(`[${requestId}] Article extraction failed without valid content`, { url });

      return res.status(502).json({
        success: false,
        message: 'Haber metni kaynaktan çıkarılamadı.',
      });
    }

    const trimmed = text.length > 20000 ? text.slice(0, 20000) : text;
    return res.status(200).json({
      success: true,
      data: {
        url,
        text: trimmed,
        length: trimmed.length,
      },
    });
  } catch (error) {
    logger.error(`[${requestId}] Error in fetchArticleDetails`, { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Haber detayı alınırken bir hata oluştu.',
      error: error.message,
    });
  }
};

/**
 * Düz metin işleme fonksiyonu. Kullanıcıdan gelen metni alır, işleme pipeline'ına gönderir.
 */
exports.processText = async (req, res) => {
  const { input, level } = req.body;
  const result = await processTextPipeline({ inputData: input, inputType: 'text', level });
  if (result.error) return res.status(400).json({ success: false, error: result.error });
  res.json({ success: true, data: result.cleanedText });
};

/**
 * Dosya işleme fonksiyonu. Kullanıcıdan yüklenen dosyadan metin çıkarır ve işleme pipeline'ına gönderir.
 */
exports.processFile = async (req, res) => {
  const { level } = req.body;
  const file = req.file;
  const result = await processTextPipeline({ inputData: undefined, inputType: 'file', file, level });
  if (result.error) return res.status(400).json({ success: false, error: result.error });
  res.json({ success: true, data: result.cleanedText });
};

/**
 * YouTube videosundan transcript çıkarma fonksiyonu. Henüz uygulanmadı.
 */
exports.processYoutube = async (req, res) => {
  return res.status(501).json({ success: false, error: 'YouTube transcript processing not implemented yet.' });
};

/**
 * Web linkten içerik çıkarma fonksiyonu. Henüz uygulanmadı.
 */
exports.processWeb = async (req, res) => {
  return res.status(501).json({ success: false, error: 'Web link processing not implemented yet.' });
};

/**
 * Kitap içeriği işleme fonksiyonu. Henüz uygulanmadı.
 */
exports.processBook = async (req, res) => {
  return res.status(501).json({ success: false, error: 'Book processing not implemented yet.' });
};

/**
 * Spotify içeriği işleme fonksiyonu. Henüz uygulanmadı.
 */
exports.processSpotify = async (req, res) => {
  return res.status(501).json({ success: false, error: 'Spotify processing not implemented yet.' });
};

/**
 * Kullanıcıya öneriler sunan fonksiyon. Henüz uygulanmadı.
 */
exports.processSuggestions = async (req, res) => {
  return res.status(501).json({ success: false, error: 'Öneriler (suggestions) özelliği henüz uygulanmadı.' });
};

/**
 * Kullanıcının takip ettiği hashtag'lere veya hobi/konu başlığına göre
 * en güncel haberleri getiren fonksiyon.
 *
 * Body parametreleri:
 * - query / hashtag / topic: Aranacak konu veya #hashtag
 * - limit: Maksimum haber sayısı (1-50 arası, varsayılan 10)
 */
exports.processHashtag = async (req, res) => {
  const requestId = uuidv4();
  try {
    const { query, hashtag, topic, limit, language } = req.body || {};

    const rawQuery = (query || hashtag || topic || '').toString().trim();

    if (!rawQuery) {
      return res.status(400).json({
        success: false,
        message: 'Lütfen bir hashtag veya konu girin.',
      });
    }

    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);

    logger.info(`[${requestId}] processHashtag called`, {
      query: rawQuery,
      limit: safeLimit,
      language: language || 'en',
    });

    const items = await getNewsForTopic({
      query: rawQuery,
      limit: safeLimit,
      language: language || 'en',
    });

    return res.status(200).json({
      success: true,
      data: {
        query: rawQuery,
        limit: safeLimit,
        language: language || 'en',
        count: items.length,
        results: items,
      },
    });
  } catch (error) {
    logger.error(`[${requestId}] Error in processHashtag`, {
      error: error.message,
    });
    return res.status(500).json({
      success: false,
      message: 'Hashtag/hobi haberleri getirilirken bir hata oluştu.',
      error: error.message,
    });
  }
};

/**
 * Kullanıcının içerik geçmişini getiren fonksiyon. Supabase'den ilgili kayıtları çeker.
 */
exports.getContentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = 50;

    const result = await contentHistoryService.getContentHistory(userId, page, limit);

    return res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error in getContentHistory controller:', error);
    if (error.message === 'Invalid user id') {
      return res.status(400).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Kullanıcının içerik sayısını ve toplam süresini getiren fonksiyon.
 */
exports.getContentCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await contentHistoryService.getContentCount(userId);

    return res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error in getContentCount controller:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.getContentById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const data = await contentHistoryService.getContentById(id, userId);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error(`Error in getContentById controller for ID ${req.params.id}, user ID ${req.user?.id}:`, error);

    if (error.message === 'Content not found') {
      return res.status(404).json({
        success: false,
        message: "İçerik bulunamadı.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "İşlem sırasında beklenmeyen bir hata oluştu.",
    });
  }
};

/**
 * Belirli bir içeriği silen fonksiyon. Supabase'den ilgili kaydı siler.
 */
exports.deleteContent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await contentHistoryService.deleteContent(id, userId);

    return res.status(200).json({
      success: true,
      message: "İçerik başarıyla silindi.",
    });
  } catch (error) {
    logger.error(`Error in deleteContent controller for ID ${req.params.id}, user ID ${req.user?.id}:`, error);

    if (error.message === 'Content not found or access denied') {
      return res.status(404).json({
        success: false,
        message: "İçerik bulunamadı veya silme yetkiniz yok.",
      });
    }

    if (error.message === 'Failed to delete content') {
      return res.status(500).json({
        success: false,
        message: "İçerik silinirken hata oluştu.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "İşlem sırasında beklenmeyen bir hata oluştu.",
    });
  }
};

/**
 * Supabase Storage'a ses dosyası yükleyen yardımcı fonksiyon.
 */
async function uploadAudioToSupabase(audioBuffer, fileName) {
  const requestId = uuidv4();
  let stepSequence = 1;

  try {
    // Dosya adı formatı: audio_YYYYMMDD_HHMMSS.mp3
    const timestamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0].replace("T", "_");
    const audioFileName = fileName || `audio_${timestamp}.mp3`;
    const filePath = `audio/${audioFileName}`;
    logger.info(`Attempting to upload audio to Supabase Storage: ${filePath}`);

    // Supabase Storage"a yükle
    const { data, error } = await supabase
      .storage
      .from(supabaseBucket)
      .upload(filePath, audioBuffer, {
        contentType: "audio/mpeg",
        cacheControl: "3600",
        upsert: false, // Set to true if you want to overwrite existing files
      });

    if (error) {
      logger.error(`Supabase Storage upload error for path ${filePath}:`, error);
      throw new Error(`Ses dosyası yüklenemedi: ${error.message}`);
    }

    // Dosyanın public URL"sini oluştur
    logger.info(`Getting public URL for uploaded file: ${filePath}`);
    const { data: publicUrlData } = supabase
      .storage
      .from(supabaseBucket)
      .getPublicUrl(filePath);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      logger.error(`Failed to get public URL for ${filePath} after upload.`);
      throw new Error("Dosya yüklendi ancak public URL alınamadı.");
    }

    logger.info(`Audio file uploaded successfully to Supabase: ${publicUrlData.publicUrl}`);
    return publicUrlData.publicUrl;
  } catch (error) {
    // Error is already logged inside the try block if it originated there
    // Log if it's an unexpected error during the process
    if (!error.message.startsWith("Ses dosyası yüklenemedi") && !error.message.startsWith("Dosya yüklendi ancak")) {
      logger.error("Unexpected error during audio upload to Supabase:", error);
    }
    throw error; // Re-throw the error to be handled by the caller
  }
}

/**
 * İçerik ve ses dosyasını Supabase'e kaydeden fonksiyon. TTS sonrası çağrılır.
 */
exports.submitContent = async (req, res) => {
  const requestId = uuidv4();
  let stepSequence = 1;

  try {
    const { input, input_type, level, mp3_url, translated_text, adapted_text, chapter_id, timepoints, words, dialogue_segments, detected_mood, processing_duration_ms } = req.body;
    const user_id = req.user?.id;
    logger.info(`submitContent request received for user ID: ${user_id || 'anon'}`, {
      input_type,
      level,
      input: input ? `${input.substring(0, 50)}...` : 'undefined',
      mp3_url: mp3_url ? `${mp3_url.substring(0, 50)}...` : 'undefined',
      hasInput: !!input,
      hasInputType: !!input_type,
      hasLevel: !!level,
      hasMp3Url: !!mp3_url,
      chapter_id: chapter_id || null
    });

    // Gerekli alanları kontrol et
    if (!input || !input_type || !level || !mp3_url) {
      logger.warn(`submitContent failed: Missing required fields for user ID ${user_id || 'anon'}`, {
        input: !!input,
        input_type: !!input_type,
        level: !!level,
        mp3_url: !!mp3_url,
        // Değerleri de logla
        inputValue: input,
        inputTypeValue: input_type,
        levelValue: level,
        mp3UrlValue: mp3_url ? mp3_url.substring(0, 50) + '...' : null,
        requestBody: req.body
      });
      return res.status(400).json({
        success: false,
        message: "Eksik bilgi gönderildi. input, input_type, level ve mp3_url zorunludur.",
      });
    }

    // Google Drive URL'sini doğrudan indirme formatına dönüştür
    const convertedMp3Url = convertGoogleDriveUrl(mp3_url);
    if (convertedMp3Url !== mp3_url) {
      logger.info(`Converted Google Drive URL to direct download link: ${convertedMp3Url}`);
    }

    // Check if mock content save mode is enabled from parameters table
    // Mock content save disabled in production

    // User ID'yi UUID formatına çevir ve validate et
    let validUserId = user_id;

    // UUID format kontrolü (36 karakter, 8-4-4-4-12 format)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!user_id || user_id === 'anon') {
      // Anonymous user için null kullan
      validUserId = null;
    } else if (user_id === 'dev-user-123') {
      // Development mock user için null kullan (production'da da güvenli)
      logger.warn(`Mock user ID detected in production: ${user_id}. Using null instead.`);
      validUserId = null;
    } else if (!uuidRegex.test(user_id)) {
      // Geçersiz UUID formatı için null kullan
      logger.warn(`Invalid UUID format for user_id: ${user_id}. Using null instead.`);
      validUserId = null;
    }

    // chapter_id değerini güvenli şekilde parse et
    let chapterIdValue = null;
    if (chapter_id !== undefined && chapter_id !== null && String(chapter_id).trim() !== '') {
      const parsed = parseInt(String(chapter_id), 10);
      if (!Number.isNaN(parsed)) {
        chapterIdValue = parsed;
      } else {
        logger.warn(`submitContent received invalid chapter_id: ${chapter_id}`);
      }
    }

    // Debug: Kaydedilecek verileri logla
    logger.debug('[SUBMIT_CONTENT] Save payload', {
      input: input ? input.substring(0, 50) + '...' : 'EMPTY',
      translated_text: translated_text ? translated_text.substring(0, 50) + '...' : 'EMPTY',
      adapted_text: adapted_text ? adapted_text.substring(0, 50) + '...' : 'EMPTY',
      user_id: validUserId,
      chapter_id: chapterIdValue,
      hasTimepoints: Array.isArray(timepoints) && timepoints.length > 0,
      hasWords: Array.isArray(words) && words.length > 0
    });

    // Supabase veritabanına kaydet (duplicate mp3_url için upsert mantığı)
    logger.info(`Saving content history to database for user ID: ${validUserId}`);
    const now = new Date().toISOString();

    const looksLikeDialogueTranscript = (text) => {
      if (!text || typeof text !== 'string') return false;
      return /^(Speaker\s+[AB]|Host|Guest):/im.test(text);
    };

    // Önce mevcut kayıt var mı kontrol et
    let existingId = null;
    let existingRow = null;
    try {
      const existingQuery = await supabase
        .from('contenthistory')
        .select('id, translated_text, adapted_text, dialogue_segments, input_type')
        .eq('user_id', validUserId)
        .eq('mp3_url', convertedMp3Url)
        .order('created_at', { ascending: false })
        .limit(1);
      if (!existingQuery.error && existingQuery.data && existingQuery.data.length > 0) {
        existingId = existingQuery.data[0].id;
        existingRow = existingQuery.data[0];
        logger.info(`Existing contenthistory found for user ${validUserId}, id=${existingId}; updating instead of insert`);
      }
    } catch (existErr) {
      logger.warn('Existing record check failed; proceeding with insert', existErr);
    }

    let data, error;
    if (existingId) {
      // Güncelle
      const incomingTranslated = translated_text || '';
      const incomingAdapted = adapted_text || '';
      const existingTranslated = (existingRow && typeof existingRow.translated_text === 'string') ? existingRow.translated_text : '';
      const existingAdapted = (existingRow && typeof existingRow.adapted_text === 'string') ? existingRow.adapted_text : '';
      const existingDialogueSegments = (existingRow && typeof existingRow.dialogue_segments === 'string') ? existingRow.dialogue_segments : '';

      const resolvedTranslatedText = (input_type === 'podcast')
        ? (() => {
          if (existingTranslated && looksLikeDialogueTranscript(existingTranslated) && !looksLikeDialogueTranscript(incomingTranslated)) {
            return existingTranslated;
          }
          if (!incomingTranslated && existingTranslated) {
            return existingTranslated;
          }
          return incomingTranslated;
        })()
        : incomingTranslated;

      const resolvedAdaptedText = (input_type === 'podcast')
        ? (incomingAdapted || existingAdapted || '')
        : incomingAdapted;

      const updatePayload = {
        input,
        input_type,
        level,
        translated_text: resolvedTranslatedText,
        adapted_text: resolvedAdaptedText,
        chapter_id: chapterIdValue,
        updated_at: now,
        detected_mood: detected_mood || null,
      };

      // Processing duration tracking (if provided)
      if (typeof processing_duration_ms === 'number' && processing_duration_ms > 0) {
        updatePayload.processing_duration_ms = Math.round(processing_duration_ms);
      }

      // Podcast zamanlamas3i i e7in g f6nderilen timepoints/words varsa g fcncelle
      // contenthistory.words/timepoints kolonlar31 TEXT oldu1fu i e7in JSON string olarak sakla
      if (Array.isArray(timepoints) && timepoints.length > 0) {
        updatePayload.timepoints = JSON.stringify(timepoints);
        // Pre-compute duration_seconds from last timepoint
        const lastTp = timepoints[timepoints.length - 1];
        const dur = lastTp?.timeSeconds || lastTp?.endTime || lastTp?.time || lastTp?.end || 0;
        if (typeof dur === 'number' && dur > 0) {
          updatePayload.duration_seconds = Math.round(dur);
        }
      }
      if (Array.isArray(words) && words.length > 0) {
        updatePayload.words = JSON.stringify(words);
      }

      if (Array.isArray(dialogue_segments) && dialogue_segments.length > 0) {
        updatePayload.dialogue_segments = JSON.stringify(dialogue_segments);
      } else if (input_type === 'podcast' && existingDialogueSegments && (!dialogue_segments || (Array.isArray(dialogue_segments) && dialogue_segments.length === 0))) {
        updatePayload.dialogue_segments = existingDialogueSegments;
      }

      ({ data, error } = await supabase
        .from('contenthistory')
        .update(updatePayload)
        .eq('id', existingId)
        .select());
    } else {
      // Ekle
      const insertPayload = {
        input,
        input_type,
        level,
        mp3_url: convertedMp3Url,
        translated_text: translated_text || '',
        adapted_text: adapted_text || '',
        user_id: validUserId,
        created_at: now,
        updated_at: now,
        detected_mood: detected_mood || null,
      };

      // Processing duration tracking (if provided)
      if (typeof processing_duration_ms === 'number' && processing_duration_ms > 0) {
        insertPayload.processing_duration_ms = Math.round(processing_duration_ms);
      }

      // Podcast zamanlamas3i i e7in g f6nderilen timepoints/words varsa JSON string olarak sakla
      if (Array.isArray(timepoints) && timepoints.length > 0) {
        insertPayload.timepoints = JSON.stringify(timepoints);
        // Pre-compute duration_seconds from last timepoint
        const lastTp = timepoints[timepoints.length - 1];
        const dur = lastTp?.timeSeconds || lastTp?.endTime || lastTp?.time || lastTp?.end || 0;
        if (typeof dur === 'number' && dur > 0) {
          insertPayload.duration_seconds = Math.round(dur);
        }
      }
      if (Array.isArray(words) && words.length > 0) {
        insertPayload.words = JSON.stringify(words);
      }

      if (Array.isArray(dialogue_segments) && dialogue_segments.length > 0) {
        insertPayload.dialogue_segments = JSON.stringify(dialogue_segments);
      }

      ({ data, error } = await supabase
        .from('contenthistory')
        .insert([insertPayload])
        .select());
    }

    if (error) {
      logger.error(`Supabase database upsert error for content history (user ID ${user_id || 'anon'}):`, error);
      logger.error(`Error details:`, {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });

      // Supabase connection hatası için özel handling
      if (error.message?.includes('500') || error.message?.includes('Internal server error')) {
        return res.status(503).json({
          success: false,
          message: "Veritabanı geçici olarak erişilemez durumda. Lütfen birkaç dakika sonra tekrar deneyin.",
          error: "Database temporarily unavailable"
        });
      }

      return res.status(500).json({
        success: false,
        message: "Kayıt sırasında hata oluştu.",
        error: error.message,
      });
    }

    logger.info(`Content history saved successfully for user ID: ${user_id || 'anon'}, Record ID: ${data[0]?.id}`);

    // Invalidate cached content history and stats for this user
    if (validUserId) {
      invalidateCache(`content:history:${validUserId}`);
      invalidateCache(`stats:user:${validUserId}`);
    }

    // Kullanım limiti kontrolü ve paketi gerekirse pasife çek
    try {
      const state = await require('../utils/infra/usageLimiter.js').checkLimits(req.user.id);
      if (state?.hasPlan && state.isExceeded) {
        logger.warn(`[USAGE LIMIT] User ${req.user.id} exceeded limits after content save. Deactivating active subscription.`);
        // En yeni aktif aboneliği pasife çek
        const { data: activeSub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', req.user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (activeSub?.id) {
          await supabase
            .from('subscriptions')
            .update({ status: 'inactive', updated_at: new Date().toISOString() })
            .eq('id', activeSub.id);
        }
      }
    } catch (limitErr) {
      logger.error('[USAGE LIMIT] post-save limit check failed:', limitErr);
    }

    // Award XP for content creation (only for new content, not updates)
    if (!existingId && validUserId) {
      try {
        await gamificationService.addXP(
          validUserId,
          gamificationService.xpRewards.CONTENT_COMPLETE || 100,
          'content_creation',
          data[0]?.id,
          'Yeni içerik oluşturuldu'
        );
        // Update daily quest progress
        await gamificationService.updateDailyQuestProgress(validUserId, 'create_content', 1);
        logger.info(`[Gamification] Awarded content creation XP to user ${validUserId}`);
      } catch (xpErr) {
        logger.warn('[Gamification] Content creation XP award failed:', xpErr.message);
      }
    }

    // Başarılı yanıt
    return res.status(200).json({
      success: true,
      message: "İçerik başarıyla kaydedildi.",
      mp3_url: convertedMp3Url,
      data: data[0],
    });
  } catch (error) {
    logger.error(`Error in submitContent process for user ID ${req.user?.id || 'anon'}:`, error);
    return res.status(500).json({
      success: false,
      message: "İşlem sırasında beklenmeyen bir hata oluştu.",
      error: error.message,
    });
  }
};

/**
 * Supabase bağlantısını test eden fonksiyon
 */
exports.testSupabaseConnection = async (req, res) => {
  try {
    logger.info('Testing Supabase connection...');

    // Basit bir query ile bağlantıyı test et
    const { data, error } = await supabase
      .from('contenthistory')
      .select('id')
      .limit(1);

    if (error) {
      logger.error('Supabase connection test failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Supabase connection failed',
        error: error.message,
        details: {
          code: error.code,
          details: error.details,
          hint: error.hint
        }
      });
    }

    logger.info('Supabase connection test successful');
    return res.status(200).json({
      success: true,
      message: 'Supabase connection is working',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Unexpected error during Supabase connection test:', error);
    return res.status(500).json({
      success: false,
      message: 'Connection test failed',
      error: error.message
    });
  }
};

/**
 * İçerik oluşturma fonksiyonu. Supabase'e yeni içerik kaydı ekler.
 */
exports.createContent = async (req, res) => {
  const requestId = uuidv4();
  let stepSequence = 1;
  const userId = req.user?.id;

  try {
    logStep({
      requestId,
      stepName: "content:create:start",
      stepSequence: stepSequence++,
      inputData: req.body,
      userId,
    });

    const { input, input_type, level, mp3_url } = req.body;

    // User ID'yi UUID formatına çevir ve validate et
    let validUserId = userId;

    // UUID format kontrolü (36 karakter, 8-4-4-4-12 format)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!userId || userId === 'anon') {
      validUserId = null;
    } else if (userId === 'dev-user-123') {
      // Development mock user için null kullan (production'da da güvenli)
      logger.warn(`Mock user ID detected in production: ${userId}. Using null instead.`);
      validUserId = null;
    } else if (!uuidRegex.test(userId)) {
      // Geçersiz UUID formatı için null kullan
      logger.warn(`Invalid UUID format for user_id: ${userId}. Using null instead.`);
      validUserId = null;
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("contenthistory")
      .insert([
        {
          input,
          input_type,
          level,
          mp3_url,
          user_id: validUserId,
          created_at: now,
          updated_at: now,
        },
      ])
      .select();

    if (error) throw error;

    logStep({
      requestId,
      stepName: "content:create:end",
      stepSequence: stepSequence++,
      outputData: data,
      userId,
    });

    return res.status(201).json({ success: true, data: data[0] });
  } catch (error) {
    logStep({
      requestId,
      stepName: "content:create:error",
      stepSequence: stepSequence++,
      status: "failure",
      error,
      userId,
    });

    return res.status(500).json({
      success: false,
      message: "İçerik oluşturulurken bir hata oluştu.",
      error: error.message,
    });
  }
};

/**
 * PUT /api/content/:id/progress
 * Update listening progress for a content item
 */
exports.updateProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const { position, duration } = req.body;
    const userId = req.user.id;

    if (position === undefined || position === null) {
      return res.status(400).json({ success: false, message: 'Position is required' });
    }

    // Get current state
    const { data: existing, error: fetchError } = await supabase
      .from('contenthistory')
      .select('id, is_completed, duration')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ success: false, message: 'İçerik bulunamadı' });
    }

    // Check if completing (position >= 90% of duration)
    const contentDuration = duration || existing.duration || 0;
    const completionThreshold = contentDuration * 0.9;
    const isCompleting = !existing.is_completed && position >= completionThreshold && contentDuration > 0;

    const updatePayload = {
      last_position: Math.floor(position),
      updated_at: new Date().toISOString()
    };

    if (duration && !existing.duration) {
      updatePayload.duration = Math.floor(duration);
    }

    if (isCompleting) {
      updatePayload.is_completed = true;
      updatePayload.completed_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('contenthistory')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', userId);

    if (updateError) {
      logger.error('[ContentProgress] Update failed:', updateError);
      return res.status(500).json({ success: false, message: 'Güncelleme başarısız' });
    }

    // Award XP on completion
    let xpResult = null;
    if (isCompleting) {
      try {
        xpResult = await gamificationService.addXP(
          userId,
          gamificationService.xpRewards.CONTENT_LISTEN_PER_MINUTE ? Math.floor(contentDuration / 60) * gamificationService.xpRewards.CONTENT_LISTEN_PER_MINUTE : 50,
          'content_listening',
          id,
          'İçerik dinleme tamamlandı'
        );
        await gamificationService.updateDailyQuestProgress(userId, 'listen_content', 1);
        logger.info(`[Gamification] Awarded listening completion XP to user ${userId}`);
      } catch (xpErr) {
        logger.warn('[Gamification] Listening XP award failed:', xpErr.message);
      }
    }

    return res.json({
      success: true,
      position: updatePayload.last_position,
      isCompleted: isCompleting || existing.is_completed,
      xpEarned: xpResult?.xpAdded || 0
    });
  } catch (error) {
    logger.error('[ContentProgress] Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/content/in-progress
 * Get unfinished content for resume functionality
 */
exports.getInProgress = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('contenthistory')
      .select('id, input, input_type, level, mp3_url, last_position, duration, created_at, updated_at')
      .eq('user_id', userId)
      .eq('is_completed', false)
      .gt('last_position', 0)
      .order('updated_at', { ascending: false })
      .limit(5);

    if (error) {
      logger.error('[InProgress] Fetch error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    logger.error('[InProgress] Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/content/:id/quiz
 * Generate a quiz based on content vocabulary
 *
 * ENHANCED VERSION:
 * - Multiple question types (MC, Cloze, Matching)
 * - Smart distractor selection (semantic + phonetic similarity)
 * - SRS integration (includes words user struggled with before)
 * - Adaptive difficulty based on user performance
 */
exports.generateQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { count = 5, types, difficulty } = req.query;

    const quizData = await quizGenerationService.generateQuiz(id, userId, {
      count,
      types,
      difficulty
    });

    return res.json({
      success: true,
      data: quizData
    });
  } catch (error) {
    logger.error('[GenerateQuiz Controller] Error:', error);

    if (error.message === 'Content not found') {
      return res.status(404).json({ success: false, message: 'İçerik bulunamadı' });
    }

    if (error.message.includes('Not enough words')) {
      return res.status(400).json({
        success: false,
        message: 'Bu içerikte yeterli kelime yok. En az 3 kelime gerekli.'
      });
    }

    return res.status(500).json({ success: false, message: error.message });
  }
};


/**
 * POST /api/content/:id/quiz/submit
 * Submit quiz answers and award XP
 *
 * ENHANCED VERSION:
 * - Multi-type question evaluation via Quiz Engine
 * - SRS integration for wrong answers
 * - Rich feedback with explanations
 * - Word attempt tracking for analytics
 */
exports.submitQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { answers, questions: clientQuestions } = req.body;
    const userId = req.user.id;

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ success: false, message: 'Answers array required' });
    }

    const result = await quizGenerationService.submitQuiz(id, userId, answers, clientQuestions);

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('[SubmitQuiz Controller] Error:', error);

    if (error.message === 'Content not found') {
      return res.status(404).json({ success: false, message: 'İçerik bulunamadı' });
    }

    return res.status(500).json({ success: false, message: error.message });
  }
};
