const { supabase } = require('../utils/storage/supabaseClient.js');
const logger = require('../utils/common/logger.js');

const normalizeInterestRows = (rows = []) =>
  rows
    .map((row) => row?.interest_keyword || row?.interest)
    .filter((value) => typeof value === 'string' && value.trim().length > 0)
    .map((value) => ({ interest_keyword: value }));

const getUserInterests = async (req, res) => {
  try {
    // Gelen isteği logla - debug için daha detaylı
    logger.debug('User interests requested', {
      path: req.path,
      headers: req.headers,
      userId: req.user?.id || 'no_user_id'
    });

    // Kimlik doğrulama kontrolü
    const userId = req.user?.id;
    if (!userId) {
      logger.warn('Unauthorized access attempt to user interests');
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Gelen isteği logla
    logger.info(`User ${userId} requested their interests`);

    // Supabase istemcisini kontrol et
    if (!supabase) {
      logger.error('Supabase client is not available', { userId });
      return res.status(500).json({ success: false, error: 'Database connection error' });
    }

    // Supabase'den kullanıcı ilgi alanlarını çek
    try {
      logger.debug(`Querying user_interests for user ${userId}`);

      const { data, error } = await supabase
        .from('user_interests')
        .select('*')
        .eq('user_id', userId);

      // Hata kontrolü
      if (error) {
        logger.error(`Error fetching user interests: ${error.message}`, { userId, error });
        return res.status(500).json({ success: false, error: error.message });
      }

      // Veri yoksa boş dizi döndür - Frontend onboarding akışında ilgi alanı seçtirebilir
      if (!data || data.length === 0) {
        logger.info(`No interests found for user ${userId} - returning empty array for onboarding`);
        return res.status(200).json({
          success: true,
          data: [],
          needsOnboarding: true,
          message: 'Henüz ilgi alanı eklenmemiş. Lütfen ilgi alanlarınızı seçin.'
        });
      }

      const normalizedData = normalizeInterestRows(data);

      // Başarılı yanıt
      logger.info(`Successfully retrieved ${normalizedData.length} interests for user ${userId}`);
      return res.status(200).json(normalizedData);
    } catch (dbError) {
      logger.error(`Database operation error: ${dbError.message}`, { userId, error: dbError });
      return res.status(500).json({ success: false, error: 'Database operation failed' });
    }
  } catch (err) {
    // Genel hata yakalama
    logger.error('Unexpected error in getUserInterests', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/**
 * Kullanıcı ilgi alanlarını günceller - ekleme, silme veya tamamen değiştirme
 */
const updateUserInterests = async (req, res) => {
  try {
    // Kimlik doğrulama kontrolü
    const userId = req.user?.id;
    if (!userId) {
      logger.warn('Unauthorized attempt to update user interests');
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Gelen veriyi kontrol et
    const { interests } = req.body;

    if (!interests || !Array.isArray(interests)) {
      logger.warn(`Invalid interests data received`, { userId, interests });
      return res.status(400).json({
        success: false,
        error: 'Interests must be provided as an array'
      });
    }

    logger.info(`User ${userId} is updating their interests`, { interestCount: interests.length });

    // Supabase istemcisini kontrol et
    if (!supabase) {
      logger.error('Supabase client is not available', { userId });
      return res.status(500).json({ success: false, error: 'Database connection error' });
    }

    // Önce kullanıcının mevcut ilgi alanlarını sil
    const { error: deleteError } = await supabase
      .from('user_interests')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      logger.error(`Error deleting user interests: ${deleteError.message}`, { userId });
      return res.status(500).json({ success: false, error: deleteError.message });
    }

    // Boş ilgi alanları listesi gönderildiyse, silme işlemi sonrası tamamlanır
    if (interests.length === 0) {
      logger.info(`User ${userId} cleared all interests`);
      return res.status(200).json({ success: true, message: 'All interests removed' });
    }

    // Yeni ilgi alanlarını ekle
    const baseInterestsToInsert = interests.map(interest => ({
      user_id: userId,
      created_at: new Date().toISOString()
    }));

    let insertedData = null;
    let insertError = null;

    const keywordPayload = baseInterestsToInsert.map((row, index) => ({
      ...row,
      interest_keyword: interests[index]
    }));

    const keywordResult = await supabase
      .from('user_interests')
      .insert(keywordPayload)
      .select();

    insertedData = keywordResult.data;
    insertError = keywordResult.error;

    if (insertError && /interest_keyword/i.test(insertError.message || '')) {
      logger.warn(`interest_keyword column unavailable, retrying with interest column`, { userId });

      const legacyPayload = baseInterestsToInsert.map((row, index) => ({
        ...row,
        interest: interests[index]
      }));

      const legacyResult = await supabase
        .from('user_interests')
        .insert(legacyPayload)
        .select();

      insertedData = legacyResult.data;
      insertError = legacyResult.error;
    }

    if (insertError) {
      logger.error(`Error inserting new interests: ${insertError.message}`, { userId });
      return res.status(500).json({ success: false, error: insertError.message });
    }

    logger.info(`Successfully updated interests for user ${userId}`);
    return res.status(200).json({
      success: true,
      message: 'Interests updated successfully',
      data: normalizeInterestRows(insertedData)
    });
  } catch (err) {
    logger.error(`Unexpected error in updateUserInterests: ${err.message}`, { userId: req.user?.id, error: err });
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

module.exports = { getUserInterests, updateUserInterests };
