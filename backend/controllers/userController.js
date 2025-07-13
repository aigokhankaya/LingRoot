const { supabase } = require('../utils/supabaseClient');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer configuration for profile photo upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/profiles');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir!'));
    }
  }
});

// Get user profile
const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, bio, avatar, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return res.status(500).json({
        success: false,
        message: 'Profil bilgileri alınırken hata oluştu'
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Update user profile
const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, bio } = req.body;

    // Validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'İsim alanı zorunludur'
      });
    }

    if (name.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'İsim 100 karakterden uzun olamaz'
      });
    }

    if (bio && bio.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Hakkında bölümü 500 karakterden uzun olamaz'
      });
    }

    // Prepare update data
    const updateData = {
      name: name.trim(),
      bio: bio ? bio.trim() : null,
      updated_at: new Date().toISOString()
    };

    // Handle profile photo upload if provided
    if (req.file) {
      // Generate a public URL for the uploaded file
      const photoUrl = `/uploads/profiles/${req.file.filename}`;
      updateData.avatar = photoUrl;
    }

    // Update user in database
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('id, email, name, bio, avatar, created_at, updated_at')
      .single();

    if (error) {
      console.error('Error updating user profile:', error);
      
      // Clean up uploaded file if database update fails
      if (req.file) {
        fs.unlink(req.file.path, (unlinkError) => {
          if (unlinkError) console.error('Error deleting file:', unlinkError);
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Profil güncellenirken hata oluştu'
      });
    }

    res.json({
      success: true,
      message: 'Profil başarıyla güncellendi',
      data: updatedUser
    });
  } catch (error) {
    console.error('Error in updateUserProfile:', error);
    
    // Clean up uploaded file if error occurs
    if (req.file) {
      fs.unlink(req.file.path, (unlinkError) => {
        if (unlinkError) console.error('Error deleting file:', unlinkError);
      });
    }

    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  upload
}; 