const db = require('../../config/db');
const logger = require('../common/logger.js');

/**
 * 📚 User Knowledge Analyzer
 * 
 * Analyzes user's external knowledge sources (PDFs, Books, Uploads)
 * and favorites to provide a deeper context for Liro.
 */
class UserKnowledgeAnalyzer {

    /**
     * Generate knowledge profile for user
     * @param {string} userId 
     */
    async generateKnowledgeProfile(userId) {
        try {
            const [uploads, extractedTopics, favorites] = await Promise.all([
                this.getUploadedMaterials(userId),
                this.getExtractedTopics(userId),
                this.getFavorites(userId)
            ]);

            return {
                uploads,
                extractedTopics,
                favorites,
                hasKnowledgeBase: uploads.count > 0 || extractedTopics.length > 0
            };
        } catch (error) {
            logger.error('Failed to generate knowledge profile:', error);
            return this.getDefaultProfile();
        }
    }

    /**
     * Get uploaded documents and books
     */
    async getUploadedMaterials(userId) {
        try {
            // Fetch Documents (PDFs)
            const docsQuery = `
        SELECT title, 'pdf' as type, created_at 
        FROM documents 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT 5
      `;

            // Fetch Books (if user has interacted with them)
            // Assuming we track user books in user_asset_usage or similar, 
            // but for now let's check if there's a user_books table or similar.
            // Since we don't have a direct user_books table in the schema I saw, 
            // I'll stick to documents for now.

            const docsResult = await db.query(docsQuery, [userId]);

            return {
                recent: docsResult.rows.map(d => d.title),
                count: docsResult.rows.length,
                types: ['pdf']
            };
        } catch (error) {
            // Table might not exist yet
            return { recent: [], count: 0, types: [] };
        }
    }

    /**
     * Get topics extracted from files
     */
    async getExtractedTopics(userId) {
        try {
            const query = `
        SELECT title, source_type 
        FROM topics 
        WHERE user_id = $1 AND source_type IN ('pdf', 'book')
        ORDER BY created_at DESC 
        LIMIT 10
      `;

            const result = await db.query(query, [userId]);
            return result.rows;
        } catch (error) {
            return [];
        }
    }

    /**
     * Get user favorites
     */
    async getFavorites(userId) {
        try {
            // Combine data from user_favorites and user_content_progress(is_favorite)

            // 1. From user_favorites table
            const favQuery = `
        SELECT item_type, item_id 
        FROM user_favorites 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT 5
      `;

            // 2. From content progress (favorites)
            const contentFavQuery = `
        SELECT ci.title, 'content' as type
        FROM user_content_progress ucp
        JOIN content_items ci ON ci.id = ucp.content_item_id
        WHERE ucp.user_id = $1 AND ucp.is_favorite = TRUE
        LIMIT 5
      `;

            const [favResult, contentFavResult] = await Promise.all([
                db.query(favQuery, [userId]).catch(() => ({ rows: [] })),
                db.query(contentFavQuery, [userId]).catch(() => ({ rows: [] }))
            ]);

            // Format results
            const favorites = [
                ...contentFavResult.rows.map(r => r.title),
                // For generic favorites, we might need to fetch titles, but for now just ID
                ...favResult.rows.map(r => `${r.item_type}:${r.item_id}`)
            ];

            return favorites.slice(0, 10);
        } catch (error) {
            return [];
        }
    }

    getDefaultProfile() {
        return {
            uploads: { recent: [], count: 0, types: [] },
            extractedTopics: [],
            favorites: [],
            hasKnowledgeBase: false
        };
    }
}

module.exports = new UserKnowledgeAnalyzer();
