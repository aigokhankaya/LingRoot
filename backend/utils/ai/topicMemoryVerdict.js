const db = require('../../config/db');
const logger = require('../common/logger.js');
const { embedTexts, cosineSimilarity } = require('../../lib/embedding');

/**
 * Topic Memory Verdict System
 * 
 * Kullanıcının yazdığı konuyu geçmiş konuşma başlıklarıyla semantik olarak karşılaştırır.
 * "NEW" (yeni konu) veya "KNOWN" (daha önce konuşulmuş) verdict üretir.
 * Bu verdict, Liro'nun "daha önce çalışmıştık" gibi ifadeler kullanıp kullanamayacağını belirler.
 */

const SIMILARITY_THRESHOLD_HIGH = 0.96;
const SIMILARITY_THRESHOLD_MID = 0.93;
const MAX_CANDIDATES = 30;

// Stopwords: seviye, level gibi kelimeler konu karşılaştırmasında göz ardı edilmeli
const STOPWORDS = new Set([
  'seviyesinde', 'seviyesi', 'seviye', 'level',
  'düzeyinde', 'düzey', 'duzeyinde', 'duzey',
  'hakkında', 'hakkinda', 'konusunda',
  'a1', 'a2', 'b1', 'b2', 'c1', 'c2',
]);

// Entity grupları: "İngiliz" ve "İngiltere" aynı entity olarak kabul edilmeli
const ENTITY_GROUPS = [
  {
    id: 'uk',
    terms: ['ingiliz', 'ingiltere', 'birleşik krallık', 'birlesik krallik', 'britanya', 'british', 'uk', 'united kingdom', 'england', 'britain'],
  },
  {
    id: 'france',
    terms: ['fransız', 'fransiz', 'fransa', 'france', 'french'],
  },
  {
    id: 'germany',
    terms: ['alman', 'almanya', 'germany', 'german', 'deutschland'],
  },
  {
    id: 'turkey',
    terms: ['türk', 'turk', 'türkiye', 'turkiye', 'turkey', 'turkish', 'osmanlı', 'osmanli', 'ottoman'],
  },
  {
    id: 'usa',
    terms: ['amerikan', 'amerika', 'abd', 'usa', 'united states', 'american'],
  },
  {
    id: 'russia',
    terms: ['rus', 'rusya', 'russia', 'russian', 'sovyet', 'soviet'],
  },
  {
    id: 'china',
    terms: ['çin', 'cin', 'china', 'chinese'],
  },
  {
    id: 'japan',
    terms: ['japon', 'japonya', 'japan', 'japanese'],
  },
  {
    id: 'whale',
    terms: ['balina', 'whale', 'balinalar'],
  },
  {
    id: 'history',
    terms: ['tarih', 'tarihi', 'tarihçe', 'tarihce', 'history', 'historical', 'geçmiş', 'gecmis'],
  },
  {
    id: 'evolution',
    terms: ['evrim', 'evrimi', 'evolution', 'evolutionary', 'evrimsel'],
  },
];

/**
 * Konu metninden seviye ve stopword'leri temizle
 */
function extractTopicCore(text) {
  if (!text) return '';

  let t = text.toString().trim();

  // CEFR seviyelerini kaldır
  t = t.replace(/\b(A1|A2|B1|B2|C1|C2)\b/gi, '');

  // Stopword'leri kaldır
  for (const sw of STOPWORDS) {
    const regex = new RegExp(`\\b${sw}\\b`, 'gi');
    t = t.replace(regex, '');
  }

  // Noktalama ve fazla boşlukları temizle
  t = t.replace(/[!?.…,]+/g, ' ').replace(/\s+/g, ' ').trim();

  return t;
}

/**
 * Metni normalize et (lowercase, özel karakterleri kaldır)
 */
function normalizeText(text) {
  if (!text) return '';
  return extractTopicCore(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Metinden token'ları çıkar (stopword'ler hariç)
 */
function tokenize(text) {
  const norm = normalizeText(text);
  if (!norm) return [];
  return norm.split(' ').filter(t => t.length > 1 && !STOPWORDS.has(t));
}

/**
 * Metindeki entity grup ID'lerini bul
 */
function getEntityGroups(text) {
  const norm = normalizeText(text);
  if (!norm) return [];

  const found = [];
  for (const group of ENTITY_GROUPS) {
    for (const term of group.terms) {
      if (norm.includes(term)) {
        found.push(group.id);
        break;
      }
    }
  }
  return [...new Set(found)];
}

/**
 * İki konu arasında token veya entity grup örtüşmesi var mı?
 */
function hasSemanticOverlap(topicA, topicB) {
  const tokensA = tokenize(topicA);
  const tokensB = tokenize(topicB);

  // Tam token eşleşmesi sayısı (en az 2 ortak token olmalı)
  let exactMatchCount = 0;
  for (const ta of tokensA) {
    for (const tb of tokensB) {
      if (ta === tb && ta.length >= 3) {
        exactMatchCount++;
        break;
      }
    }
  }

  // En az 2 ortak token varsa (stopwords hariç) -> true
  if (exactMatchCount >= 2) return true;

  // Entity grup örtüşmesi kontrolü - DAHA KATI
  const groupsA = new Set(getEntityGroups(topicA));
  const groupsB = new Set(getEntityGroups(topicB));

  // Her iki konuda da aynı entity grubu VE aynı konu tipi olmalı
  let entityMatches = [];
  let typeMatches = [];

  for (const g of groupsA) {
    if (groupsB.has(g)) {
      if (['history', 'evolution'].includes(g)) {
        typeMatches.push(g);
      } else {
        entityMatches.push(g);
      }
    }
  }

  // Entity (ülke/varlık) + konu tipi (tarih/evrim) her ikisi de eşleşmeli
  // VE en az 1 tam token eşleşmesi olmalı
  const hasEntityAndType = entityMatches.length > 0 && typeMatches.length > 0;
  return hasEntityAndType && exactMatchCount >= 1;
}

/**
 * Ana fonksiyon: Konu bellek kararı üret
 * 
 * @param {Object} params
 * @param {string} params.userId - Kullanıcı ID
 * @param {string} params.conversationId - Mevcut konuşma ID (hariç tutulacak)
 * @param {string} params.userMessage - Kullanıcının yazdığı mesaj/konu
 * @returns {Promise<Object>} - { verdict: 'NEW'|'KNOWN', queryTopic, matchedTopic, similarity, reason }
 */
async function computeTopicMemoryVerdict({ userId, conversationId, userMessage }) {
  const raw = (userMessage || '').toString().trim();
  const queryTopic = extractTopicCore(raw);

  // Boş sorgu
  if (!queryTopic || queryTopic.length < 2) {
    return {
      verdict: 'NEW',
      queryTopic: raw,
      matchedTopic: null,
      similarity: null,
      reason: 'empty_or_too_short'
    };
  }

  // Önceki konuşma başlıklarını çek
  let candidates = [];
  try {
    const result = await db.query(
      `SELECT DISTINCT subject
       FROM conversations
       WHERE user_id = $1 AND id != $2 AND subject IS NOT NULL AND subject != ''
       ORDER BY subject
       LIMIT 100`,
      [userId, conversationId]
    );
    candidates = result.rows.map(r => r.subject).filter(Boolean);
  } catch (err) {
    logger.warn('Topic memory: candidate query failed', err);
    return {
      verdict: 'NEW',
      queryTopic,
      matchedTopic: null,
      similarity: null,
      reason: 'db_error'
    };
  }

  // Adayları temizle ve benzersizleştir
  const cleanedCandidates = [...new Set(
    candidates.map(extractTopicCore).filter(c => c && c.length > 1)
  )].slice(0, MAX_CANDIDATES);

  if (cleanedCandidates.length === 0) {
    return {
      verdict: 'NEW',
      queryTopic,
      matchedTopic: null,
      similarity: null,
      reason: 'no_history'
    };
  }

  // Embedding hesapla
  let embeddings;
  try {
    const textsToEmbed = [queryTopic, ...cleanedCandidates];
    embeddings = await embedTexts(textsToEmbed);
  } catch (err) {
    logger.warn('Topic memory: embedding failed', err);
    // Embedding başarısız olursa sadece token/entity overlap kontrolü yap
    for (const candidate of cleanedCandidates) {
      if (hasSemanticOverlap(queryTopic, candidate)) {
        return {
          verdict: 'KNOWN',
          queryTopic,
          matchedTopic: candidate,
          similarity: null,
          reason: 'semantic_overlap_only'
        };
      }
    }
    return {
      verdict: 'NEW',
      queryTopic,
      matchedTopic: null,
      similarity: null,
      reason: 'embedding_failed'
    };
  }

  const queryEmbedding = embeddings[0];

  // En benzer konuyu bul
  let bestTopic = null;
  let bestSimilarity = -1;

  for (let i = 0; i < cleanedCandidates.length; i++) {
    const sim = cosineSimilarity(queryEmbedding, embeddings[i + 1]);
    if (sim > bestSimilarity) {
      bestSimilarity = sim;
      bestTopic = cleanedCandidates[i];
    }
  }

  // Karar ver - ÇOK KATI KURALLAR
  const hasOverlap = bestTopic ? hasSemanticOverlap(queryTopic, bestTopic) : false;

  let verdict = 'NEW';
  let reason = 'no_match';

  // KNOWN için ÇOK yüksek similarity (0.96+) VEYA
  // Yüksek similarity (0.93+) VE semantic overlap olmalı
  if (bestSimilarity >= SIMILARITY_THRESHOLD_HIGH && hasOverlap) {
    verdict = 'KNOWN';
    reason = 'very_high_similarity_with_overlap';
  } else if (bestSimilarity >= SIMILARITY_THRESHOLD_MID && hasOverlap) {
    verdict = 'KNOWN';
    reason = 'high_similarity_with_overlap';
  }
  // Diğer tüm durumlar -> NEW (daha güvenli)

  logger.info(`🧠 Topic Memory Verdict: ${verdict}`, {
    queryTopic,
    matchedTopic: bestTopic,
    similarity: bestSimilarity?.toFixed(3),
    hasOverlap,
    reason
  });

  return {
    verdict,
    queryTopic,
    matchedTopic: verdict === 'KNOWN' ? bestTopic : null,
    similarity: bestSimilarity,
    reason
  };
}

/**
 * Verdict'i prompt için formatlı metin olarak döndür
 */
function formatVerdictForPrompt(verdictResult) {
  if (!verdictResult) {
    return `
🔴 TOPIC_MEMORY_VERDICT: NEW
→ Bu konuyu daha önce HİÇ konuşmadınız.
→ "Daha önce çalışmıştık", "Geçen sefer konuşmuştuk" gibi ifadeler YASAK!
→ Yeni konu gibi davran.`;
  }

  const { verdict, queryTopic, matchedTopic, similarity } = verdictResult;

  if (verdict === 'KNOWN' && matchedTopic) {
    return `
🟢 TOPIC_MEMORY_VERDICT: KNOWN
→ Kullanıcı "${queryTopic}" konusunu sordu.
→ Daha önce "${matchedTopic}" konusu konuşulmuş (benzerlik: ${(similarity * 100).toFixed(0)}%).
→ Bu durumda "daha önce çalışmıştık" diyebilirsin.`;
  }

  return `
🔴 TOPIC_MEMORY_VERDICT: NEW
→ Kullanıcı "${queryTopic}" konusunu sordu.
→ Bu konu daha önce HİÇ konuşulmamış!
→ "Daha önce çalışmıştık", "Geçen sefer konuşmuştuk" gibi ifadeler YASAK!
→ Yeni konu gibi davran, geçmiş referansı VERME!`;
}

module.exports = {
  computeTopicMemoryVerdict,
  formatVerdictForPrompt,
  extractTopicCore,
  normalizeText,
  hasSemanticOverlap,
};
