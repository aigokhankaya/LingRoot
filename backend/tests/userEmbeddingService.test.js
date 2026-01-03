const userEmbeddingService = require('../services/userEmbeddingService');
const pool = require('../config/db');

// Mock dependencies
jest.mock('../config/db', () => ({
    query: jest.fn(),
    connect: jest.fn(),
    on: jest.fn()
}));

jest.mock('../utils/openaiClient', () => ({
    embeddings: {
        create: jest.fn()
    }
}));

jest.mock('../utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
}));

describe('UserEmbeddingService Tests', () => {
    const mockUserId = 'user-123';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('generatePreferenceSummary', () => {
        it('should summarize insights correctly', async () => {
            // Mock DB response for insights
            pool.query.mockResolvedValueOnce({
                rows: [
                    { insight_type: 'likes', insight_value: 'Technology' },
                    { insight_type: 'likes', insight_value: 'AI' },
                    { insight_type: 'goals', insight_value: 'Business English' }
                ]
            });

            // Mock DB insert/update
            pool.query.mockResolvedValueOnce({ rows: [] });

            const summary = await userEmbeddingService.generatePreferenceSummary(mockUserId);

            expect(summary).toContain('Likes: Technology, AI');
            expect(summary).toContain('Goals: Business English');
            expect(pool.query).toHaveBeenCalledTimes(2);
        });

        it('should return null if no insights found', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] });

            const summary = await userEmbeddingService.generatePreferenceSummary(mockUserId);

            expect(summary).toBeNull();
        });
    });

    describe('findSimilarUsers', () => {
        it('should execute vector similarity query', async () => {
            const mockEmbedding = [0.1, 0.2, 0.3];

            // Mock user fetching embedding
            pool.query.mockResolvedValueOnce({
                rows: [{ insight_embedding: JSON.stringify(mockEmbedding) }] // pgvector returns string usually
            });

            // Mock similarity search
            pool.query.mockResolvedValueOnce({
                rows: [
                    { id: 'user-456', similarity: 0.95 },
                    { id: 'user-789', similarity: 0.82 }
                ]
            });

            const similarUsers = await userEmbeddingService.findSimilarUsers(mockUserId);

            expect(pool.query).toHaveBeenCalledTimes(2);
            // Check if second query contains cosine operator (<=>)
            expect(pool.query.mock.calls[1][0]).toContain('<=>');
            expect(similarUsers).toHaveLength(2);
            expect(similarUsers[0].id).toBe('user-456');
        });

        it('should return empty list if user has no embedding', async () => {
            pool.query.mockResolvedValueOnce({ rows: [] }); // No user found or no embedding

            const similarUsers = await userEmbeddingService.findSimilarUsers(mockUserId);

            expect(similarUsers).toEqual([]);
        });
    });
});
