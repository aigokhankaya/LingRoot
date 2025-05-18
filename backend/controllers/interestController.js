const { supabase } = require('../utils/supabaseClient');
const logger = require('../utils/logger');

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

    // Supabase'den kullanıcı ilgi alanlarını çek
    try {
      const { data, error } = await supabase
        .from('user_interests')
        .select('interest_keyword')
        .eq('user_id', userId);

      // Hata kontrolü
      if (error) {
        logger.error(`Error fetching user interests: ${error.message}`, { userId, error });
        return res.status(500).json({ success: false, error: error.message });
      }

      // Veri yoksa boş liste döndür
      if (!data || data.length === 0) {
        logger.info(`No interests found for user ${userId}`);
        // Geliştirme aşamasında varsayılan değerler ekliyoruz
        const defaultInterests = [
          { interest_keyword: 'İngilizce' },
          { interest_keyword: 'Yapay Zeka' },
          { interest_keyword: 'Seyahat' },
          { interest_keyword: 'Teknoloji' },
          { interest_keyword: 'İş İngilizcesi' }
        ];
        
        logger.info(`Returning default interests for user ${userId}`);
        return res.status(200).json(defaultInterests);
      }

      // Başarılı yanıt
      logger.info(`Successfully retrieved ${data.length} interests for user ${userId}`);
      return res.status(200).json(data);
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

module.exports = { getUserInterests };
