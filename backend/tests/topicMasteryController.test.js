const topicMasteryController = require('../controllers/topicMasteryController');
const topicMasteryService = require('../services/topicMasteryService');

// Mock Service
jest.mock('../services/topicMasteryService');
jest.mock('../utils/common/logger.js');

describe('TopicMastery Controller Integration Tests', () => {
    let mockReq, mockRes;

    beforeEach(() => {
        mockReq = {
            user: { id: 'user-123' },
            params: {},
            body: {}
        };
        mockRes = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };
        jest.clearAllMocks();
    });

    describe('getMastery', () => {
        it('should correctly extract topicId from params and call service', async () => {
            // Setup
            mockReq.params.topicId = 'topic-uuid-123'; // UUID string
            topicMasteryService.getMastery.mockResolvedValue({ mastery_score: 85 });

            // Execute
            await topicMasteryController.getMastery(mockReq, mockRes);

            // Verify
            // CRITICAL CHECK: Controller passed topicId correctly to service?
            expect(topicMasteryService.getMastery).toHaveBeenCalledWith('user-123', 'topic-uuid-123');
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                mastery: { mastery_score: 85 }
            });
        });

        it('should return 400 if topicId is missing', async () => {
            mockReq.params = {}; // No topicId

            await topicMasteryController.getMastery(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: 'topicId is required'
            }));
        });
    });

    describe('recordInteraction', () => {
        it('should pass interaction data correctly', async () => {
            mockReq.params.topicId = 'topic-uuid-123';
            mockReq.body = {
                completionPercentage: 100,
                rating: 5,
                listeningSeconds: 60
            };

            topicMasteryService.updateMastery.mockResolvedValue({ status: 'completed' });

            await topicMasteryController.recordInteraction(mockReq, mockRes);

            expect(topicMasteryService.updateMastery).toHaveBeenCalledWith(
                'user-123',
                'topic-uuid-123',
                {
                    completionPercentage: 100,
                    rating: 5,
                    listeningSeconds: 60
                }
            );
        });
    });
});
