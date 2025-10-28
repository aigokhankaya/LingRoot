const { supabase } = require('../utils/supabaseClient');

/**
 * Get all external services
 */
const getAllExternalServices = async (req, res) => {
  try {
    console.log('🔧 [CONTROLLER] Fetching all external services...');
    
    const { data, error } = await supabase
      .from('external_services')
      .select('id, service_name, service_type, api_url, is_active, configuration, description, created_at, updated_at')
      .order('service_name', { ascending: true });

    if (error) {
      throw error;
    }

    // Mask tokens for security
    const maskedData = data.map(service => ({
      ...service,
      api_token_masked: '***'
    }));

    console.log(`🔧 [CONTROLLER] Found ${data.length} services`);

    res.json({
      success: true,
      data: maskedData
    });
  } catch (error) {
    console.error('❌ [CONTROLLER] Error fetching external services:', error);
    res.status(500).json({
      success: false,
      message: 'Dış servisler alınırken hata oluştu',
      error: error.message
    });
  }
};

/**
 * Get a specific external service by ID
 */
const getExternalServiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('external_services')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        message: 'Servis bulunamadı'
      });
    }

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error fetching external service:', error);
    res.status(500).json({
      success: false,
      message: 'Servis bilgisi alınırken hata oluştu',
      error: error.message
    });
  }
};

/**
 * Get a specific external service by service name
 */
const getExternalServiceByName = async (req, res) => {
  try {
    const { serviceName } = req.params;

    const { data, error } = await supabase
      .from('external_services')
      .select('*')
      .eq('service_name', serviceName)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        message: 'Servis bulunamadı veya aktif değil'
      });
    }

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error fetching external service by name:', error);
    res.status(500).json({
      success: false,
      message: 'Servis bilgisi alınırken hata oluştu',
      error: error.message
    });
  }
};

/**
 * Create a new external service
 */
const createExternalService = async (req, res) => {
  try {
    const {
      service_name,
      service_type,
      api_url,
      api_token,
      is_active = true,
      configuration = {},
      description
    } = req.body;

    // Validation
    if (!service_name || !service_type || !api_url) {
      return res.status(400).json({
        success: false,
        message: 'Servis adı, tipi ve API URL gereklidir'
      });
    }

    const { data, error } = await supabase
      .from('external_services')
      .insert([{
        service_name,
        service_type,
        api_url,
        api_token,
        is_active,
        configuration,
        description
      }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      success: true,
      message: 'Dış servis başarıyla oluşturuldu',
      data: data
    });
  } catch (error) {
    console.error('Error creating external service:', error);
    
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({
        success: false,
        message: 'Bu servis adı zaten mevcut'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Dış servis oluşturulurken hata oluştu',
      error: error.message
    });
  }
};

/**
 * Update an existing external service
 */
const updateExternalService = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      service_name,
      service_type,
      api_url,
      api_token,
      is_active,
      configuration,
      description
    } = req.body;

    // Build update object dynamically
    const updates = {};

    if (service_name !== undefined) updates.service_name = service_name;
    if (service_type !== undefined) updates.service_type = service_type;
    if (api_url !== undefined) updates.api_url = api_url;
    if (api_token !== undefined) updates.api_token = api_token;
    if (is_active !== undefined) updates.is_active = is_active;
    if (configuration !== undefined) updates.configuration = configuration;
    if (description !== undefined) updates.description = description;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Güncellenecek alan bulunamadı'
      });
    }

    const { data, error } = await supabase
      .from('external_services')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        message: 'Servis bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Dış servis başarıyla güncellendi',
      data: data
    });
  } catch (error) {
    console.error('Error updating external service:', error);
    
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({
        success: false,
        message: 'Bu servis adı zaten mevcut'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Dış servis güncellenirken hata oluştu',
      error: error.message
    });
  }
};

/**
 * Delete an external service
 */
const deleteExternalService = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('external_services')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        message: 'Servis bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Dış servis başarıyla silindi',
      data: data
    });
  } catch (error) {
    console.error('Error deleting external service:', error);
    res.status(500).json({
      success: false,
      message: 'Dış servis silinirken hata oluştu',
      error: error.message
    });
  }
};

/**
 * Toggle service active status
 */
const toggleServiceStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // First get current status
    const { data: currentData, error: fetchError } = await supabase
      .from('external_services')
      .select('is_active')
      .eq('id', id)
      .single();

    if (fetchError || !currentData) {
      return res.status(404).json({
        success: false,
        message: 'Servis bulunamadı'
      });
    }

    // Toggle the status
    const { data, error } = await supabase
      .from('external_services')
      .update({ is_active: !currentData.is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Servis durumu güncellendi',
      data: data
    });
  } catch (error) {
    console.error('Error toggling service status:', error);
    res.status(500).json({
      success: false,
      message: 'Servis durumu güncellenirken hata oluştu',
      error: error.message
    });
  }
};

module.exports = {
  getAllExternalServices,
  getExternalServiceById,
  getExternalServiceByName,
  createExternalService,
  updateExternalService,
  deleteExternalService,
  toggleServiceStatus
};
