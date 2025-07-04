const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const { getTtsProviderSetting, setTtsProviderSetting } = require('../controllers/adminController');
const { supabase } = require('../utils/supabaseClient');

// All routes require authentication and admin authorization
router.use(authenticate);
router.use(authorizeAdmin);

// Admin dashboard stats
router.get('/stats', adminController.getDashboardStats);

// User management
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Content management
router.get('/content', adminController.getAllContent);
router.delete('/content/:id', adminController.deleteContent);

// Subscription management
router.get('/subscriptions', adminController.getAllSubscriptions);
router.put('/subscriptions/:id', adminController.updateSubscription);

// TTS provider ayarını getir
router.get('/settings/tts-provider', getTtsProviderSetting);
// TTS provider ayarını güncelle
router.post('/settings/tts-provider', setTtsProviderSetting);

// Kullanıcıya ait ses dosyalarını listele
router.get('/user-audios/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const { data, error } = await supabase
      .from('contenthistory')
      .select('id, mp3_url, created_at, input')
      .eq('user_id', userId)
      .not('mp3_url', 'is', null)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        success: false,
        message: 'Ses dosyaları getirilirken hata oluştu'
      });
    }
    
    res.json({
      success: true,
      audioFiles: data || []
    });
  } catch (error) {
    console.error('Error fetching user audio files:', error);
    res.status(500).json({
      success: false,
      message: 'Ses dosyaları getirilirken hata oluştu'
    });
  }
});

// Seçili ses dosyalarını sil (hem DB'den hem Supabase Storage'dan)
router.delete('/user-audios', async (req, res) => {
  try {
    const { audioFileIds } = req.body;
    
    if (!audioFileIds || !Array.isArray(audioFileIds)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz ses dosyası ID listesi'
      });
    }

    // Önce silinecek dosyaların URL'lerini al
    const { data: filesToDelete, error: fetchError } = await supabase
      .from('contenthistory')
      .select('id, mp3_url')
      .in('id', audioFileIds)
      .not('mp3_url', 'is', null);
    
    if (fetchError) {
      console.error('Error fetching files to delete:', fetchError);
      return res.status(500).json({
        success: false,
        message: 'Silinecek dosyalar bulunamadı'
      });
    }
    
    // Supabase Storage'dan dosyaları sil
    const deletePromises = filesToDelete.map(async (file) => {
      try {
        // URL'den dosya path'ini çıkar (audio-outputs/audio/... kısmı)
        const url = new URL(file.mp3_url);
        const filePath = url.pathname.split('/storage/v1/object/public/audio-outputs/')[1];
        
        if (filePath) {
          const { error } = await supabase.storage
            .from('audio-outputs')
            .remove([filePath]);
            
          if (error) {
            console.error(`Storage'dan dosya silinirken hata (${file.id}):`, error);
          }
        }
      } catch (error) {
        console.error(`Dosya URL'i parse edilirken hata (${file.id}):`, error);
      }
    });
    
    await Promise.all(deletePromises);
    
    // DB'den kayıtları sil
    const { error: deleteError } = await supabase
      .from('contenthistory')
      .delete()
      .in('id', audioFileIds);
    
    if (deleteError) {
      console.error('Error deleting from database:', deleteError);
      return res.status(500).json({
        success: false,
        message: 'Veritabanından silme işlemi başarısız'
      });
    }
    
    res.json({
      success: true,
      message: `${audioFileIds.length} ses dosyası başarıyla silindi`
    });
    
  } catch (error) {
    console.error('Error deleting user audio files:', error);
    res.status(500).json({
      success: false,
      message: 'Ses dosyaları silinirken hata oluştu'
    });
  }
});

module.exports = router;