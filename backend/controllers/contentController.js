// Supabase entegrasyonu için güncellenmiş contentController.js
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();
const logger = require("../utils/logger"); // Import logger
const { logStep } = require('../utils/stepLogger');
const { v4: uuidv4 } = require('uuid');

// Supabase istemcisini oluştur
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseBucket = process.env.SUPABASE_BUCKET || "lingroot-audio";
const supabase = createClient(supabaseUrl, supabaseKey);

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

// Placeholder functions - keep as is or implement later
exports.processLink = async (req, res) => {
  const requestId = uuidv4();
  let stepSequence = 1;

  logger.info("processLink called (placeholder)");
  res.json({ message: "Link processed (placeholder)" });
};

exports.processText = async (req, res) => {
  const requestId = uuidv4();
  let stepSequence = 1;

  logger.info("processText called (placeholder)");
  res.json({ message: "Text processed (placeholder)" });
};

exports.processFile = async (req, res) => {
  const requestId = uuidv4();
  let stepSequence = 1;

  logger.info("processFile called (placeholder)");
  res.json({ message: "File processed (placeholder)" });
};

exports.getContentHistory = async (req, res) => {
  const requestId = uuidv4();
  let stepSequence = 1;

  try {
    const userId = req.user.id;
    logger.info(`Fetching content history for user ID: ${userId}`);

    const { data, error } = await supabase
      .from('contenthistory')
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error(`Supabase query error fetching content history for user ID ${userId}:`, error);
      return res.status(500).json({
        success: false,
        message: "İçerik geçmişi alınırken hata oluştu.",
      });
    }

    logger.info(`Successfully fetched ${data.length} content history items for user ID: ${userId}`);
    return res.status(200).json({
      success: true,
      data: data,
    });
  } catch (error) {
    logger.error(`Error fetching content history for user ID ${req.user?.id}:`, error);
    return res.status(500).json({
      success: false,
      message: "İşlem sırasında beklenmeyen bir hata oluştu.",
    });
  }
};

exports.getContentById = async (req, res) => {
  const requestId = uuidv4();
  let stepSequence = 1;

  try {
    const { id } = req.params;
    const userId = req.user.id;
    logger.info(`Fetching content by ID: ${id} for user ID: ${userId}`);

    const { data, error } = await supabase
      .from('contenthistory')
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error) {
      logger.warn(`Content ID ${id} not found or Supabase query error for user ID ${userId}:`, error);
      return res.status(404).json({
        success: false,
        message: "İçerik bulunamadı.",
      });
    }

    logger.info(`Successfully fetched content ID: ${id} for user ID: ${userId}`);
    return res.status(200).json({
      success: true,
      data: data,
    });
  } catch (error) {
    logger.error(`Error fetching content detail for ID ${req.params.id}, user ID ${req.user?.id}:`, error);
    return res.status(500).json({
      success: false,
      message: "İşlem sırasında beklenmeyen bir hata oluştu.",
    });
  }
};

exports.deleteContent = async (req, res) => {
  const requestId = uuidv4();
  let stepSequence = 1;

  try {
    const { id } = req.params;
    const userId = req.user.id;
    logger.info(`Attempting to delete content ID: ${id} for user ID: ${userId}`);

    // Önce kaydın kullanıcıya ait olduğunu doğrula
    const { data: existingData, error: fetchError } = await supabase
      .from('contenthistory')
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (fetchError || !existingData) {
      logger.warn(`Delete failed: Content ID ${id} not found or not owned by user ID ${userId}.`, fetchError);
      return res.status(404).json({
        success: false,
        message: "İçerik bulunamadı veya silme yetkiniz yok.",
      });
    }

    // Kaydı sil
    logger.info(`Deleting content ID: ${id} from database for user ID: ${userId}`);
    const { error: deleteError } = await supabase
      .from('contenthistory')
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (deleteError) {
      logger.error(`Supabase delete error for content ID ${id}, user ID ${userId}:`, deleteError);
      return res.status(500).json({
        success: false,
        message: "İçerik silinirken hata oluştu.",
      });
    }

    logger.info(`Content ID ${id} deleted successfully for user ID: ${userId}`);
    return res.status(200).json({
      success: true,
      message: "İçerik başarıyla silindi.",
    });
  } catch (error) {
    logger.error(`Error deleting content ID ${req.params.id} for user ID ${req.user?.id}:`, error);
    return res.status(500).json({
      success: false,
      message: "İşlem sırasında beklenmeyen bir hata oluştu.",
    });
  }
};

// Supabase Storage"a ses dosyası yükleme fonksiyonu (Bu fonksiyon doğrudan route tarafından çağrılmıyor, diğer servisler kullanabilir)
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

// Birleştirilmiş submitContent fonksiyonu (Bu fonksiyon muhtemelen TTS servisi tarafından çağrılacak)
exports.submitContent = async (req, res) => {
  const requestId = uuidv4();
  let stepSequence = 1;

  try {
    const { input, input_type, level, mp3_url, user_id } = req.body;
    logger.info(`submitContent request received for user ID: ${user_id || 'anon'}`, { input_type, level });

    // Gerekli alanları kontrol et
    if (!input || !input_type || !level || !mp3_url) {
      logger.warn(`submitContent failed: Missing required fields for user ID ${user_id || 'anon'}`);
      return res.status(400).json({
        success: false,
        message: "Eksik bilgi gönderildi. input, input_type, level ve mp3_url zorunludur.",
      });
    }

    // Google Drive URL"sini doğrudan indirme formatına dönüştür
    const convertedMp3Url = convertGoogleDriveUrl(mp3_url);
    if (convertedMp3Url !== mp3_url) {
        logger.info(`Converted Google Drive URL to direct download link: ${convertedMp3Url}`);
    }

    // Supabase veritabanına kaydet
    logger.info(`Saving content history to database for user ID: ${user_id || 'anon'}`);
    const { data, error } = await supabase
      .from('contenthistory')
      .insert([
        {
          input,
          input_type,
          level,
          mp3_url: convertedMp3Url,
          user_id: user_id || "anon", // Ensure user_id is handled
        },
      ])
      .select();

    if (error) {
      logger.error(`Supabase database insert error for content history (user ID ${user_id || 'anon'}):`, error);
      return res.status(500).json({
        success: false,
        message: "Kayıt sırasında hata oluştu.",
        error: error.message,
      });
    }

    logger.info(`Content history saved successfully for user ID: ${user_id || 'anon'}, Record ID: ${data[0]?.id}`);
    // Başarılı yanıt
    return res.status(200).json({
      success: true,
      message: "İçerik başarıyla kaydedildi.",
      mp3_url: convertedMp3Url,
      data: data[0],
    });
  } catch (error) {
    logger.error(`Error in submitContent process for user ID ${req.body?.user_id || 'anon'}:`, error);
    return res.status(500).json({
      success: false,
      message: "İşlem sırasında beklenmeyen bir hata oluştu.",
      error: error.message,
    });
  }
};

exports.createContent = async (req, res) => {
  const requestId = uuidv4();
  let stepSequence = 1;

  try {
    // Başlangıç logu
    logStep({
      requestId: requestId,
      stepName: 'content:create:start',
      stepSequence: stepSequence++,
      inputData: req.body,
      userId: req.user?.id
    });

    // İçerik oluşturma işlemi
    const content = await Content.create(req.body);
    
    // Başarılı sonuç logu
    logStep({
      requestId: requestId,
      stepName: 'content:create:end',
      stepSequence: stepSequence++,
      outputData: content,
      userId: req.user?.id,
      startTime
    });

    res.status(201).json(content);
  } catch (error) {
    // Hata logu
    logStep({
      requestId: requestId,
      stepName: 'content:create:error',
      stepSequence: stepSequence++,
      status: 'failure',
      error,
      userId: req.user?.id,
      startTime
    });

    res.status(500).json({ error: 'İçerik oluşturulurken bir hata oluştu' });
  }
};

