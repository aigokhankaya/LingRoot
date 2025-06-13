const { createClient } = require("@supabase/supabase-js");
const logger = require("../utils/logger");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Tüm parametreleri getir
 */
exports.getAllParameters = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('parameters')
      .select('*')
      .order('key');

    if (error) {
      logger.error('Error fetching parameters:', error);
      return res.status(500).json({
        success: false,
        message: 'Parametreler alınırken hata oluştu.',
        error: error.message
      });
    }

    return res.json({
      success: true,
      data: data
    });
  } catch (error) {
    logger.error('Unexpected error in getAllParameters:', error);
    return res.status(500).json({
      success: false,
      message: 'Beklenmeyen bir hata oluştu.',
      error: error.message
    });
  }
};

/**
 * Belirli bir parametreyi getir
 */
exports.getParameter = async (req, res) => {
  try {
    const { key } = req.params;

    const { data, error } = await supabase
      .from('parameters')
      .select('*')
      .eq('key', key)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Parametre bulunamadı.'
        });
      }
      
      logger.error('Error fetching parameter:', error);
      return res.status(500).json({
        success: false,
        message: 'Parametre alınırken hata oluştu.',
        error: error.message
      });
    }

    return res.json({
      success: true,
      data: data
    });
  } catch (error) {
    logger.error('Unexpected error in getParameter:', error);
    return res.status(500).json({
      success: false,
      message: 'Beklenmeyen bir hata oluştu.',
      error: error.message
    });
  }
};

/**
 * Parametre güncelle veya oluştur
 */
exports.updateParameter = async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Value alanı zorunludur.'
      });
    }

    // Upsert operation - update if exists, insert if not
    const { data, error } = await supabase
      .from('parameters')
      .upsert([
        {
          key: key,
          value: value,
          description: description,
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      logger.error('Error updating parameter:', error);
      return res.status(500).json({
        success: false,
        message: 'Parametre güncellenirken hata oluştu.',
        error: error.message
      });
    }

    logger.info(`Parameter updated: ${key} = ${value}`);
    return res.json({
      success: true,
      message: 'Parametre başarıyla güncellendi.',
      data: data
    });
  } catch (error) {
    logger.error('Unexpected error in updateParameter:', error);
    return res.status(500).json({
      success: false,
      message: 'Beklenmeyen bir hata oluştu.',
      error: error.message
    });
  }
};

/**
 * Parametre sil
 */
exports.deleteParameter = async (req, res) => {
  try {
    const { key } = req.params;

    const { error } = await supabase
      .from('parameters')
      .delete()
      .eq('key', key);

    if (error) {
      logger.error('Error deleting parameter:', error);
      return res.status(500).json({
        success: false,
        message: 'Parametre silinirken hata oluştu.',
        error: error.message
      });
    }

    logger.info(`Parameter deleted: ${key}`);
    return res.json({
      success: true,
      message: 'Parametre başarıyla silindi.'
    });
  } catch (error) {
    logger.error('Unexpected error in deleteParameter:', error);
    return res.status(500).json({
      success: false,
      message: 'Beklenmeyen bir hata oluştu.',
      error: error.message
    });
  }
};

/**
 * Mock modları toggle etmek için özel endpoint'ler
 */
exports.toggleMockTts = async (req, res) => {
  try {
    const { enabled } = req.body;
    
    const { data, error } = await supabase
      .from('parameters')
      .upsert([
        {
          key: 'mock_tts_enabled',
          value: enabled ? 'true' : 'false',
          description: 'Enable mock TTS responses instead of real API calls',
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      logger.error('Error toggling mock TTS:', error);
      return res.status(500).json({
        success: false,
        message: 'Mock TTS ayarı güncellenirken hata oluştu.',
        error: error.message
      });
    }

    logger.info(`Mock TTS ${enabled ? 'enabled' : 'disabled'}`);
    return res.json({
      success: true,
      message: `Mock TTS ${enabled ? 'etkinleştirildi' : 'devre dışı bırakıldı'}.`,
      data: data
    });
  } catch (error) {
    logger.error('Unexpected error in toggleMockTts:', error);
    return res.status(500).json({
      success: false,
      message: 'Beklenmeyen bir hata oluştu.',
      error: error.message
    });
  }
};

exports.toggleMockContentSave = async (req, res) => {
  try {
    const { enabled } = req.body;
    
    const { data, error } = await supabase
      .from('parameters')
      .upsert([
        {
          key: 'mock_content_save_enabled',
          value: enabled ? 'true' : 'false',
          description: 'Enable mock content saving instead of real database saves',
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      logger.error('Error toggling mock content save:', error);
      return res.status(500).json({
        success: false,
        message: 'Mock content save ayarı güncellenirken hata oluştu.',
        error: error.message
      });
    }

    logger.info(`Mock content save ${enabled ? 'enabled' : 'disabled'}`);
    return res.json({
      success: true,
      message: `Mock content save ${enabled ? 'etkinleştirildi' : 'devre dışı bırakıldı'}.`,
      data: data
    });
  } catch (error) {
    logger.error('Unexpected error in toggleMockContentSave:', error);
    return res.status(500).json({
      success: false,
      message: 'Beklenmeyen bir hata oluştu.',
      error: error.message
    });
  }
};

exports.toggleMockAuth = async (req, res) => {
  try {
    const { enabled } = req.body;
    
    const { data, error } = await supabase
      .from('parameters')
      .upsert([
        {
          key: 'mock_auth_enabled',
          value: enabled ? 'true' : 'false',
          description: 'Enable mock authentication for testing purposes',
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      logger.error('Error toggling mock auth:', error);
      return res.status(500).json({
        success: false,
        message: 'Mock auth ayarı güncellenirken hata oluştu.',
        error: error.message
      });
    }

    logger.info(`Mock auth ${enabled ? 'enabled' : 'disabled'}`);
    return res.json({
      success: true,
      message: `Mock auth ${enabled ? 'etkinleştirildi' : 'devre dışı bırakıldı'}.`,
      data: data
    });
  } catch (error) {
    logger.error('Unexpected error in toggleMockAuth:', error);
    return res.status(500).json({
      success: false,
      message: 'Beklenmeyen bir hata oluştu.',
      error: error.message
    });
  }
}; 