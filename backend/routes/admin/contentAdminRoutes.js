/**
 * 🔐 Content Admin Routes
 * 
 * Sektörel içerik yönetimi (tek içerik işlemleri)
 */

const express = require('express');
const router = express.Router();
const sectorAdminController = require('../../controllers/sectorAdminController');
const { authenticate, authorizeAdmin } = require('../../middleware/auth');

// Tüm endpoint'ler admin auth gerektirir
router.use(authenticate);
router.use(authorizeAdmin);

// Tek içerik işlemleri
router.put('/:contentId', sectorAdminController.updateContent);
router.delete('/:contentId', sectorAdminController.deleteContent);
router.patch('/:contentId/status', sectorAdminController.updateContentStatus);

module.exports = router;
