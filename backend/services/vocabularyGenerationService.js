/**
 * Vocabulary Generation Service
 *
 * AI ile konu bazlı kelime üretimi
 * - Batch processing (25 kelime/batch)
 * - Duplicate prevention
 * - Job progress tracking
 * - CEFR distribution
 */

const openaiClient = require('../utils/ai/openaiClient.js');
const logger = require('../utils/common/logger.js');
const db = require('../config/db');
const fs = require('fs');
const path = require('path');

class VocabularyGenerationService {
    constructor() {
        this.batchSize = 25;
        this.batchDelayMs = 2000; // Rate limiting delay between batches
    }

    /**
     * Load prompt template from file
     * @param {string} filename - Prompt file name
     * @returns {string} - Prompt template
     */
    loadPromptTemplate(filename) {
        try {
            const promptPath = path.join(__dirname, `../prompts/vocabulary/${filename}`);
            return fs.readFileSync(promptPath, 'utf-8');
        } catch (error) {
            logger.error(`[VocabGen] Error loading prompt template: ${filename}`, error);
            throw new Error(`Prompt template not found: ${filename}`);
        }
    }

    /**
     * Get topic details by ID
     * @param {number} topicId - Topic ID
     * @returns {Object} - Topic details
     */
    async getTopicById(topicId) {
        const result = await db.query(
            `SELECT * FROM vocabulary_topics WHERE id = $1`,
            [topicId]
        );
        return result.rows[0];
    }

    /**
     * Get all topics with stats
     * @param {Object} options - Filter options
     * @returns {Array} - Topics list
     */
    async getAllTopics(options = {}) {
        const { topicType, isActive = true } = options;

        let query = `
            SELECT
                vt.*,
                COALESCE(
                    CASE
                        WHEN vt.topic_type = 'sector' THEN sv.word_count
                        ELSE tv.word_count
                    END,
                    0
                ) as actual_word_count
            FROM vocabulary_topics vt
            LEFT JOIN (
                SELECT sector_id, COUNT(*) as word_count
                FROM sector_vocabulary
                GROUP BY sector_id
            ) sv ON vt.sector_id = sv.sector_id AND vt.topic_type = 'sector'
            LEFT JOIN (
                SELECT topic_id, COUNT(*) as word_count
                FROM topic_vocabulary
                GROUP BY topic_id
            ) tv ON vt.id = tv.topic_id AND vt.topic_type != 'sector'
            WHERE 1=1
        `;

        const params = [];
        let paramIndex = 1;

        if (isActive !== null) {
            query += ` AND vt.is_active = $${paramIndex++}`;
            params.push(isActive);
        }

        if (topicType) {
            query += ` AND vt.topic_type = $${paramIndex++}`;
            params.push(topicType);
        }

        query += ` ORDER BY vt.topic_type, vt.sort_order`;

        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Get existing words for a topic (to prevent duplicates)
     * @param {number} topicId - Topic ID
     * @param {string} topicType - 'sector', 'travel', or 'intellectual'
     * @returns {Array} - List of existing words
     */
    async getExistingWords(topicId, topicType) {
        let query;
        let params;

        if (topicType === 'sector') {
            // For sectors, get sector_id from vocabulary_topics
            const topicResult = await db.query(
                `SELECT sector_id FROM vocabulary_topics WHERE id = $1`,
                [topicId]
            );
            const sectorId = topicResult.rows[0]?.sector_id;

            if (!sectorId) {
                return [];
            }

            query = `SELECT LOWER(word) as word FROM sector_vocabulary WHERE sector_id = $1`;
            params = [sectorId];
        } else {
            query = `SELECT LOWER(word) as word FROM topic_vocabulary WHERE topic_id = $1`;
            params = [topicId];
        }

        const result = await db.query(query, params);
        return result.rows.map(r => r.word);
    }

    /**
     * Generate vocabulary batch using AI
     * @param {Object} topic - Topic details
     * @param {Array} existingWords - Words to exclude
     * @param {number} batchSize - Number of words to generate
     * @returns {Array} - Generated words
     */
    async generateBatch(topic, existingWords, batchSize = 25) {
        try {
            let promptTemplate = this.loadPromptTemplate('topic_vocabulary_generator.txt');

            // Replace placeholders
            promptTemplate = promptTemplate
                .replace(/\{\{BATCH_SIZE\}\}/g, batchSize.toString())
                .replace(/\{\{TOPIC_NAME_EN\}\}/g, topic.name_en)
                .replace(/\{\{TOPIC_NAME_TR\}\}/g, topic.name_tr)
                .replace(/\{\{TOPIC_TYPE\}\}/g, topic.topic_type)
                .replace(/\{\{TOPIC_DESCRIPTION_EN\}\}/g, topic.description_en || topic.name_en)
                .replace(/\{\{TOPIC_DESCRIPTION_TR\}\}/g, topic.description_tr || topic.name_tr)
                .replace(/\{\{EXISTING_WORDS\}\}/g, existingWords.slice(-100).join(', ') || 'none');

            const response = await openaiClient.generateChatCompletion([
                { role: 'user', content: promptTemplate }
            ], {
                temperature: 0.7,
                maxTokens: 4000,
                model: 'gpt-4o'
            });

            const content = response.content
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim();

            const words = JSON.parse(content);

            // Validate and filter
            const validWords = words.filter(w => {
                const isValid = w.word && w.definition_en && w.definition_tr;
                const isNotDuplicate = !existingWords.includes(w.word.toLowerCase());
                return isValid && isNotDuplicate;
            });

            logger.info(`[VocabGen] Generated ${validWords.length} words for topic: ${topic.name_en}`);
            return validWords;

        } catch (error) {
            logger.error(`[VocabGen] Error generating batch for ${topic.name_en}:`, error);
            throw error;
        }
    }

    /**
     * Save generated words to database
     * @param {number} topicId - Topic ID
     * @param {string} topicType - 'sector', 'travel', or 'intellectual'
     * @param {Array} words - Words to save
     * @returns {Object} - Save result
     */
    async saveGeneratedWords(topicId, topicType, words) {
        let success = 0;
        let failed = 0;

        for (const word of words) {
            try {
                if (topicType === 'sector') {
                    // Get sector_id from vocabulary_topics
                    const topicResult = await db.query(
                        `SELECT sector_id FROM vocabulary_topics WHERE id = $1`,
                        [topicId]
                    );
                    const sectorId = topicResult.rows[0]?.sector_id;

                    if (!sectorId) {
                        failed++;
                        continue;
                    }

                    await db.query(`
                        INSERT INTO sector_vocabulary
                        (sector_id, word, pronunciation, definition_en, definition_tr,
                         example_sentence, example_sentence_tr, category, cefr_level, frequency_rank)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                        ON CONFLICT (sector_id, word) DO UPDATE SET
                            pronunciation = EXCLUDED.pronunciation,
                            definition_en = EXCLUDED.definition_en,
                            definition_tr = EXCLUDED.definition_tr,
                            example_sentence = EXCLUDED.example_sentence,
                            example_sentence_tr = EXCLUDED.example_sentence_tr,
                            category = EXCLUDED.category,
                            cefr_level = EXCLUDED.cefr_level,
                            updated_at = NOW()
                    `, [
                        sectorId,
                        word.word,
                        word.pronunciation || null,
                        word.definition_en,
                        word.definition_tr,
                        word.example_sentence || null,
                        word.example_sentence_tr || null,
                        word.category || null,
                        word.cefr_level || 'B1',
                        word.frequency_rank || null
                    ]);
                } else {
                    await db.query(`
                        INSERT INTO topic_vocabulary
                        (topic_id, word, pronunciation, definition_en, definition_tr,
                         example_sentence, example_sentence_tr, category, cefr_level, frequency_rank)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                        ON CONFLICT (topic_id, word) DO UPDATE SET
                            pronunciation = EXCLUDED.pronunciation,
                            definition_en = EXCLUDED.definition_en,
                            definition_tr = EXCLUDED.definition_tr,
                            example_sentence = EXCLUDED.example_sentence,
                            example_sentence_tr = EXCLUDED.example_sentence_tr,
                            category = EXCLUDED.category,
                            cefr_level = EXCLUDED.cefr_level,
                            updated_at = NOW()
                    `, [
                        topicId,
                        word.word,
                        word.pronunciation || null,
                        word.definition_en,
                        word.definition_tr,
                        word.example_sentence || null,
                        word.example_sentence_tr || null,
                        word.category || null,
                        word.cefr_level || 'B1',
                        word.frequency_rank || null
                    ]);
                }
                success++;
            } catch (error) {
                logger.error(`[VocabGen] Error saving word "${word.word}":`, error);
                failed++;
            }
        }

        // Update topic word count
        await this.updateTopicWordCount(topicId, topicType);

        return { success, failed };
    }

    /**
     * Update topic word count in vocabulary_topics table
     * @param {number} topicId - Topic ID
     * @param {string} topicType - Topic type
     */
    async updateTopicWordCount(topicId, topicType) {
        try {
            let wordCount;

            if (topicType === 'sector') {
                const topicResult = await db.query(
                    `SELECT sector_id FROM vocabulary_topics WHERE id = $1`,
                    [topicId]
                );
                const sectorId = topicResult.rows[0]?.sector_id;

                if (sectorId) {
                    const countResult = await db.query(
                        `SELECT COUNT(*) as count FROM sector_vocabulary WHERE sector_id = $1`,
                        [sectorId]
                    );
                    wordCount = parseInt(countResult.rows[0].count);
                }
            } else {
                const countResult = await db.query(
                    `SELECT COUNT(*) as count FROM topic_vocabulary WHERE topic_id = $1`,
                    [topicId]
                );
                wordCount = parseInt(countResult.rows[0].count);
            }

            if (wordCount !== undefined) {
                await db.query(
                    `UPDATE vocabulary_topics SET current_word_count = $1, updated_at = NOW() WHERE id = $2`,
                    [wordCount, topicId]
                );
            }
        } catch (error) {
            logger.error(`[VocabGen] Error updating topic word count:`, error);
        }
    }

    /**
     * Create a new generation job
     * @param {number} topicId - Topic ID
     * @param {number} targetCount - Target word count
     * @param {string} createdBy - User UUID
     * @returns {Object} - Created job
     */
    async createJob(topicId, targetCount, createdBy) {
        const result = await db.query(`
            INSERT INTO vocabulary_generation_jobs
            (topic_id, target_count, created_by, status)
            VALUES ($1, $2, $3, 'pending')
            RETURNING *
        `, [topicId, targetCount, createdBy]);

        return result.rows[0];
    }

    /**
     * Update job progress
     * @param {string} jobId - Job UUID
     * @param {Object} updates - Fields to update
     * @returns {Object} - Updated job
     */
    async updateJob(jobId, updates) {
        const fields = [];
        const values = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(updates)) {
            fields.push(`${key} = $${paramIndex++}`);
            values.push(value);
        }

        values.push(jobId);

        const result = await db.query(`
            UPDATE vocabulary_generation_jobs
            SET ${fields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `, values);

        return result.rows[0];
    }

    /**
     * Get job by ID
     * @param {string} jobId - Job UUID
     * @returns {Object} - Job details
     */
    async getJobById(jobId) {
        const result = await db.query(
            `SELECT vgj.*, vt.name_en as topic_name, vt.topic_type
             FROM vocabulary_generation_jobs vgj
             JOIN vocabulary_topics vt ON vgj.topic_id = vt.id
             WHERE vgj.id = $1`,
            [jobId]
        );
        return result.rows[0];
    }

    /**
     * Main generation function - orchestrates the entire process
     * @param {number} topicId - Topic ID
     * @param {number} targetCount - Target word count (default 200)
     * @param {string} createdBy - User UUID
     * @returns {Object} - Job details
     */
    async generateVocabulary(topicId, targetCount = 200, createdBy = null) {
        const topic = await this.getTopicById(topicId);

        if (!topic) {
            throw new Error('Topic not found');
        }

        // Create job
        const job = await this.createJob(topicId, targetCount, createdBy);
        const jobId = job.id;

        // Start generation in background
        this.runGenerationJob(jobId, topic, targetCount).catch(error => {
            logger.error(`[VocabGen] Job ${jobId} failed:`, error);
            this.updateJob(jobId, {
                status: 'failed',
                error_message: error.message,
                completed_at: new Date().toISOString()
            });
        });

        return job;
    }

    /**
     * Run the generation job (async, runs in background)
     * @param {string} jobId - Job UUID
     * @param {Object} topic - Topic details
     * @param {number} targetCount - Target word count
     */
    async runGenerationJob(jobId, topic, targetCount) {
        // Update job status to in_progress
        await this.updateJob(jobId, {
            status: 'in_progress',
            started_at: new Date().toISOString()
        });

        const existingWords = await this.getExistingWords(topic.id, topic.topic_type);
        let totalGenerated = 0;
        const batchLogs = [];
        const batchCount = Math.ceil(targetCount / this.batchSize);

        for (let i = 0; i < batchCount; i++) {
            // Check if job was cancelled
            const currentJob = await this.getJobById(jobId);
            if (currentJob.status === 'cancelled') {
                logger.info(`[VocabGen] Job ${jobId} was cancelled`);
                return;
            }

            const remainingCount = targetCount - totalGenerated;
            const currentBatchSize = Math.min(this.batchSize, remainingCount);

            try {
                logger.info(`[VocabGen] Generating batch ${i + 1}/${batchCount} for topic: ${topic.name_en}`);

                const words = await this.generateBatch(topic, existingWords, currentBatchSize);
                const saveResult = await this.saveGeneratedWords(topic.id, topic.topic_type, words);

                totalGenerated += saveResult.success;
                existingWords.push(...words.map(w => w.word.toLowerCase()));

                batchLogs.push({
                    batch: i + 1,
                    requested: currentBatchSize,
                    generated: words.length,
                    saved: saveResult.success,
                    failed: saveResult.failed,
                    timestamp: new Date().toISOString()
                });

                // Update job progress
                await this.updateJob(jobId, {
                    generated_count: totalGenerated,
                    batch_logs: JSON.stringify(batchLogs)
                });

                // Rate limiting delay between batches
                if (i < batchCount - 1) {
                    await new Promise(r => setTimeout(r, this.batchDelayMs));
                }

            } catch (error) {
                logger.error(`[VocabGen] Error in batch ${i + 1}:`, error);
                batchLogs.push({
                    batch: i + 1,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });

                // Continue with next batch on error
                await new Promise(r => setTimeout(r, this.batchDelayMs));
            }
        }

        // Mark job as completed
        await this.updateJob(jobId, {
            status: 'completed',
            generated_count: totalGenerated,
            batch_logs: JSON.stringify(batchLogs),
            completed_at: new Date().toISOString()
        });

        logger.info(`[VocabGen] Job ${jobId} completed. Generated ${totalGenerated} words for ${topic.name_en}`);
    }

    /**
     * Cancel a running job
     * @param {string} jobId - Job UUID
     * @returns {Object} - Updated job
     */
    async cancelJob(jobId) {
        return this.updateJob(jobId, {
            status: 'cancelled',
            completed_at: new Date().toISOString()
        });
    }

    /**
     * Get vocabulary for a topic with pagination
     * @param {number} topicId - Topic ID
     * @param {Object} options - Pagination and filter options
     * @returns {Object} - Vocabulary list with pagination
     */
    async getTopicVocabulary(topicId, options = {}) {
        const { page = 1, limit = 50, cefrLevel, category } = options;
        const offset = (page - 1) * limit;

        const topic = await this.getTopicById(topicId);
        if (!topic) {
            throw new Error('Topic not found');
        }

        let query;
        let countQuery;
        const params = [];
        let paramIndex = 1;

        if (topic.topic_type === 'sector') {
            const baseQuery = `
                FROM sector_vocabulary sv
                JOIN vocabulary_topics vt ON vt.sector_id = sv.sector_id
                WHERE vt.id = $${paramIndex++}
            `;
            params.push(topicId);

            if (cefrLevel) {
                params.push(cefrLevel);
            }
            if (category) {
                params.push(category);
            }

            let filterQuery = '';
            if (cefrLevel) {
                filterQuery += ` AND sv.cefr_level = $${paramIndex++}`;
            }
            if (category) {
                filterQuery += ` AND sv.category = $${paramIndex++}`;
            }

            query = `
                SELECT sv.* ${baseQuery}${filterQuery}
                ORDER BY sv.created_at DESC
                LIMIT $${paramIndex++} OFFSET $${paramIndex++}
            `;
            params.push(limit, offset);

            countQuery = `SELECT COUNT(*) ${baseQuery}${filterQuery}`;
        } else {
            const baseQuery = `
                FROM topic_vocabulary
                WHERE topic_id = $${paramIndex++}
            `;
            params.push(topicId);

            if (cefrLevel) {
                params.push(cefrLevel);
            }
            if (category) {
                params.push(category);
            }

            let filterQuery = '';
            if (cefrLevel) {
                filterQuery += ` AND cefr_level = $${paramIndex++}`;
            }
            if (category) {
                filterQuery += ` AND category = $${paramIndex++}`;
            }

            query = `
                SELECT * ${baseQuery}${filterQuery}
                ORDER BY created_at DESC
                LIMIT $${paramIndex++} OFFSET $${paramIndex++}
            `;
            params.push(limit, offset);

            countQuery = `SELECT COUNT(*) ${baseQuery}${filterQuery}`;
        }

        // Execute queries
        const [itemsResult, countResult] = await Promise.all([
            db.query(query, params),
            db.query(countQuery, params.slice(0, -2)) // Remove limit and offset for count
        ]);

        const total = parseInt(countResult.rows[0].count);

        return {
            items: itemsResult.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Import vocabulary manually (JSON)
     * @param {number} topicId - Topic ID
     * @param {Array} words - Words to import
     * @returns {Object} - Import result
     */
    async importVocabulary(topicId, words) {
        const topic = await this.getTopicById(topicId);
        if (!topic) {
            throw new Error('Topic not found');
        }

        return this.saveGeneratedWords(topicId, topic.topic_type, words);
    }

    /**
     * Get recent jobs for a topic
     * @param {number} topicId - Topic ID (optional)
     * @param {number} limit - Max jobs to return
     * @returns {Array} - Jobs list
     */
    async getRecentJobs(topicId = null, limit = 10) {
        let query = `
            SELECT vgj.*, vt.name_en as topic_name, vt.topic_type
            FROM vocabulary_generation_jobs vgj
            JOIN vocabulary_topics vt ON vgj.topic_id = vt.id
        `;
        const params = [];

        if (topicId) {
            query += ` WHERE vgj.topic_id = $1`;
            params.push(topicId);
        }

        query += ` ORDER BY vgj.created_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);

        const result = await db.query(query, params);
        return result.rows;
    }
}

module.exports = new VocabularyGenerationService();
