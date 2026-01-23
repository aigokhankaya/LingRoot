/**
 * 🔐 Sector Admin Routes
 * 
 * Admin panel sektör yönetimi route'ları
 * ✅ Joi validation aktif
 */

const express = require('express');
const router = express.Router();
const sectorAdminController = require('../../controllers/sectorAdminController');
const { authenticate, authorizeAdmin } = require('../../middleware/auth');
const { validateBody, validateQuery } = require('../../middleware/validation');
const {
    createSectorSchema,
    updateSectorSchema,
    createContentSchema,
    importContentSchema,
    contentQuerySchema,
    createVocabularySchema,
    importVocabularySchema,
    vocabularyQuerySchema
} = require('../../middleware/schemas/sectorSchemas');

// Tüm endpoint'ler admin auth gerektirir
router.use(authenticate);
router.use(authorizeAdmin);

// Sektör yönetimi
router.get('/', sectorAdminController.getAllSectors);
router.post('/', validateBody(createSectorSchema), sectorAdminController.createSector);
router.put('/:id', validateBody(updateSectorSchema), sectorAdminController.updateSector);
router.delete('/:id', sectorAdminController.deleteSector);

// İçerik yönetimi
router.get('/:id/content', validateQuery(contentQuerySchema), sectorAdminController.getSectorContent);
router.post('/:id/content', validateBody(createContentSchema), sectorAdminController.createContent);
router.post('/:id/content/import', validateBody(importContentSchema), sectorAdminController.importContent);

// Terminoloji yönetimi
router.get('/:id/vocabulary', validateQuery(vocabularyQuerySchema), sectorAdminController.getSectorVocabulary);
router.post('/:id/vocabulary', validateBody(createVocabularySchema), sectorAdminController.createVocabulary);
router.post('/:id/vocabulary/import', validateBody(importVocabularySchema), sectorAdminController.importVocabulary);

// İstatistikler
router.get('/stats/overview', sectorAdminController.getSectorStats);

module.exports = router;

