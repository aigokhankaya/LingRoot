const openaiClient = require('../utils/ai/openaiClient.js');
const logger = require('../utils/common/logger.js');

/**
 * Text Embedding Utilities
 * Uses OpenAI text-embedding-ada-002 model
 */

/**
 * Generate embedding for a single text
 * @param {string} text - Text to embed
 * @returns {Promise<Array<number>>} - 1536-dimensional embedding vector
 */
async function embedText(text) {
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty');
  }

  try {
    const embedding = await openaiClient.generateEmbedding(text);
    return embedding;
  } catch (error) {
    logger.error('Failed to embed text:', error);
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts (batch)
 * @param {Array<string>} texts - Array of texts to embed
 * @returns {Promise<Array<Array<number>>>} - Array of embedding vectors
 */
async function embedTexts(texts) {
  if (!texts || texts.length === 0) {
    throw new Error('Texts array cannot be empty');
  }

  try {
    const embeddings = await openaiClient.generateEmbedding(texts);
    return embeddings;
  } catch (error) {
    logger.error('Failed to embed texts:', error);
    throw error;
  }
}

/**
 * Calculate cosine similarity between two vectors
 * @param {Array<number>} vecA - First vector
 * @param {Array<number>} vecB - Second vector
 * @returns {number} - Similarity score (0 to 1)
 */
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have same dimensions');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

/**
 * Find most similar items from a list
 * @param {Array<number>} queryEmbedding - Query embedding vector
 * @param {Array<Object>} items - Items with embedding property
 * @param {number} topK - Number of results to return
 * @returns {Array<Object>} - Items sorted by similarity with score
 */
function findSimilar(queryEmbedding, items, topK = 5) {
  const scored = items.map(item => ({
    ...item,
    similarity: cosineSimilarity(queryEmbedding, item.embedding)
  }));

  scored.sort((a, b) => b.similarity - a.similarity);

  return scored.slice(0, topK);
}

/**
 * Embed topic for storage
 * @param {string} title - Topic title
 * @param {string} description - Topic description
 * @returns {Promise<Array<number>>} - Combined embedding
 */
async function embedTopic(title, description) {
  const combinedText = `${title}\n\n${description}`;
  return await embedText(combinedText);
}

module.exports = {
  embedText,
  embedTexts,
  cosineSimilarity,
  findSimilar,
  embedTopic,
};
