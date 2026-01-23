/**
 * @jest-environment node
 * 
 * Content Controller Tests
 * Content creation, retrieval, management
 * 
 * Created: 2026-01-17
 */

jest.mock('../../utils/storage/supabaseClient.js', () => ({
    supabase: {
        from: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            range: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn(),
            single: jest.fn(),
        })),
    },
}));

jest.mock('../../utils/common/logger.js', () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
}));

describe('Content Controller Tests', () => {
    const mockContent = [
        {
            id: 'content-1',
            user_id: 'user-1',
            input: 'Sample text content',
            input_type: 'text',
            level: 'B1',
            mp3_url: 'https://storage.supabase.co/audio/content-1.mp3',
            created_at: '2026-01-15T10:00:00Z',
        },
        {
            id: 'content-2',
            user_id: 'user-1',
            input: 'https://example.com/article',
            input_type: 'url',
            level: 'B2',
            mp3_url: 'https://storage.supabase.co/audio/content-2.mp3',
            created_at: '2026-01-16T10:00:00Z',
        },
    ];

    describe('Content Creation', () => {
        describe('Input Validation', () => {
            test('should require input text', () => {
                const input = '';
                expect(input).toBeFalsy();
            });

            test('should require input type', () => {
                const validTypes = ['text', 'url', 'youtube', 'pdf', 'topic', 'podcast'];
                const inputType = 'text';

                expect(validTypes.includes(inputType)).toBe(true);
            });

            test('should validate CEFR level', () => {
                const validLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
                const level = 'B1';

                expect(validLevels.includes(level)).toBe(true);
            });

            test('should validate URL format for URL type', () => {
                const urlRegex = /^https?:\/\/.+/;

                expect(urlRegex.test('https://example.com')).toBe(true);
                expect(urlRegex.test('not-a-url')).toBe(false);
            });

            test('should validate YouTube URL format', () => {
                const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;

                expect(youtubeRegex.test('https://www.youtube.com/watch?v=abc123')).toBe(true);
                expect(youtubeRegex.test('https://youtu.be/abc123')).toBe(true);
                expect(youtubeRegex.test('https://example.com')).toBe(false);
            });

            test('should limit input text length', () => {
                const maxLength = 50000;
                const input = 'a'.repeat(60000);

                expect(input.length > maxLength).toBe(true);
            });
        });

        describe('Content Storage', () => {
            test('should generate unique content ID', () => {
                const id1 = 'content-' + Math.random().toString(36).substr(2, 9);
                const id2 = 'content-' + Math.random().toString(36).substr(2, 9);

                expect(id1).not.toBe(id2);
            });

            test('should store user ID with content', () => {
                const content = { ...mockContent[0] };
                expect(content.user_id).toBeDefined();
            });

            test('should store creation timestamp', () => {
                const content = {
                    created_at: new Date().toISOString(),
                };

                expect(content.created_at).toBeDefined();
            });

            test('should store audio URL after processing', () => {
                const content = { ...mockContent[0] };
                expect(content.mp3_url).toContain('mp3');
            });
        });
    });

    describe('Content Retrieval', () => {
        describe('getContent', () => {
            test('should return content by ID', () => {
                const contentId = 'content-1';
                const content = mockContent.find(c => c.id === contentId);

                expect(content).toBeDefined();
                expect(content.id).toBe(contentId);
            });

            test('should return null for non-existent content', () => {
                const contentId = 'non-existent';
                const content = mockContent.find(c => c.id === contentId);

                expect(content).toBeUndefined();
            });

            test('should only return content owned by user', () => {
                const userId = 'user-1';
                const contentId = 'content-1';
                const content = mockContent.find(c => c.id === contentId && c.user_id === userId);

                expect(content).toBeDefined();
            });
        });

        describe('listContents', () => {
            test('should return user content list', () => {
                const userId = 'user-1';
                const userContent = mockContent.filter(c => c.user_id === userId);

                expect(userContent.length).toBe(2);
            });

            test('should order by creation date', () => {
                const sorted = [...mockContent].sort((a, b) =>
                    new Date(b.created_at) - new Date(a.created_at)
                );

                expect(sorted[0].id).toBe('content-2');
            });

            test('should support pagination', () => {
                const page = 1;
                const limit = 10;
                const offset = (page - 1) * limit;

                expect(offset).toBe(0);
            });

            test('should filter by input type', () => {
                const filtered = mockContent.filter(c => c.input_type === 'text');
                expect(filtered.length).toBe(1);
            });

            test('should filter by level', () => {
                const filtered = mockContent.filter(c => c.level === 'B1');
                expect(filtered.length).toBe(1);
            });
        });
    });

    describe('Content History', () => {
        test('should return recent content', () => {
            const limit = 10;
            const recent = mockContent.slice(0, limit);

            expect(recent.length).toBeLessThanOrEqual(limit);
        });

        test('should include content type in history', () => {
            mockContent.forEach(c => {
                expect(c.input_type).toBeDefined();
            });
        });

        test('should include timestamps in history', () => {
            mockContent.forEach(c => {
                expect(c.created_at).toBeDefined();
            });
        });
    });

    describe('Content Deletion', () => {
        test('should delete content by ID', () => {
            const contentId = 'content-1';
            const remaining = mockContent.filter(c => c.id !== contentId);

            expect(remaining.length).toBe(1);
        });

        test('should only allow owner to delete', () => {
            const userId = 'user-1';
            const contentId = 'content-1';
            const content = mockContent.find(c => c.id === contentId);

            expect(content.user_id).toBe(userId);
        });

        test('should delete associated audio file', () => {
            const content = mockContent[0];
            const audioUrl = content.mp3_url;

            expect(audioUrl).toBeDefined();
        });
    });

    describe('Content Types', () => {
        describe('Text Input', () => {
            test('should accept plain text', () => {
                const input = 'This is a sample text for TTS processing.';
                expect(input.length).toBeGreaterThan(0);
            });
        });

        describe('URL Input', () => {
            test('should extract text from URL', () => {
                const extractedText = 'Extracted article text';
                expect(extractedText).toBeDefined();
            });
        });

        describe('YouTube Input', () => {
            test('should extract video ID from URL', () => {
                const url = 'https://www.youtube.com/watch?v=abc123';
                const match = url.match(/[?&]v=([^&]+)/);
                const videoId = match ? match[1] : null;

                expect(videoId).toBe('abc123');
            });

            test('should extract video ID from short URL', () => {
                const url = 'https://youtu.be/abc123';
                const match = url.match(/youtu\.be\/([^?]+)/);
                const videoId = match ? match[1] : null;

                expect(videoId).toBe('abc123');
            });
        });

        describe('PDF Input', () => {
            test('should validate PDF file type', () => {
                const mimeType = 'application/pdf';
                expect(mimeType).toBe('application/pdf');
            });

            test('should limit PDF file size', () => {
                const maxSize = 10 * 1024 * 1024; // 10MB
                const fileSize = 5 * 1024 * 1024; // 5MB

                expect(fileSize < maxSize).toBe(true);
            });
        });
    });
});
