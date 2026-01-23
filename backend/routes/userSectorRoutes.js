/**
 * 👤 User Sector Routes
 * 
 * Kullanıcı sektör tercihleri route'ları
 * ✅ Joi validation aktif
 */

const express = require('express');
const router = express.Router();
const userSectorController = require('../controllers/userSectorController');
const { authenticate } = require('../middleware/auth');
const { validateBody } = require('../middleware/validation');
const { addUserSectorSchema } = require('../middleware/schemas/sectorSchemas');

// Tüm endpoint'ler auth gerektirir
router.use(authenticate);

// Kullanıcı sektörleri
router.get('/', userSectorController.getUserSectors);
router.post('/', validateBody(addUserSectorSchema), userSectorController.addUserSector);
router.delete('/:sectorId', userSectorController.removeUserSector);
router.get('/:sectorId/stats', userSectorController.getUserSectorStats);

// İçerik ve kelime ilerleme
router.post('/content/:contentId/complete', userSectorController.markContentComplete);
router.post('/vocabulary/:wordId/learned', userSectorController.markVocabularyLearned);

module.exports = router;

