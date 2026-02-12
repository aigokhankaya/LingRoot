const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const topicHierarchyController = require('../controllers/topicHierarchyController');

/**
 * Topic Hierarchy Routes
 * Base path: /api/topic-hierarchy
 */

// Ana konu oluştur
router.post(
  '/topics',
  authenticate,
  topicHierarchyController.createMainTopic
);

// OpenAI ile alt konu üret
router.post(
  '/topics/:id/subtopics',
  authenticate,
  topicHierarchyController.generateSubtopics
);

// Manuel alt konu ekle
router.post(
  '/topics/:id/subtopics/manual',
  authenticate,
  topicHierarchyController.addManualSubtopic
);

// Kullanıcının tüm konu ağacını getir
router.get(
  '/topics/tree',
  authenticate,
  topicHierarchyController.getTopicTree
);

// Breadcrumb için konu yolunu getir
router.get(
  '/topics/:id/path',
  authenticate,
  topicHierarchyController.getTopicPath
);

// Konu ve tüm alt konularını sil
router.delete(
  '/topics/:id',
  authenticate,
  topicHierarchyController.deleteTopicAndChildren
);

// Konu sesini dinlenmiş olarak işaretle
router.post(
  '/topics/mark-listened',
  authenticate,
  topicHierarchyController.markTopicListened
);

// Konudan TTS içerik oluştur (mevcut TTS workflow'una yönlendirme)
router.post(
  '/topics/:id/create-content',
  authenticate,
  topicHierarchyController.createContentFromTopic
);

// Dinleme pozisyonunu kaydet
router.post(
  '/topics/save-progress',
  authenticate,
  topicHierarchyController.saveListeningProgress
);

// Yarıda kalan dinlemeleri getir
router.get(
  '/topics/incomplete',
  authenticate,
  topicHierarchyController.getIncompleteListenings
);

// Belirli bir içeriğin dinleme durumunu getir
router.get(
  '/topics/progress/:mp3_url',
  authenticate,
  topicHierarchyController.getListeningProgress
);

// Tek bir topic'in içerik verilerini getir (öneri sistemi için)
router.get(
  '/topics/:id/content',
  authenticate,
  topicHierarchyController.getTopicContent
);

// AI ile konu önerisi al
router.post(
  '/topics/suggest',
  authenticate,
  topicHierarchyController.suggestTopic
);

module.exports = router;
