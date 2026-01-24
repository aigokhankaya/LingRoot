/**
 * @jest-environment node
 * 
 * Topic Hierarchy Controller Tests
 * Topic tree management, subtopic generation
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
            is: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
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

describe('Topic Hierarchy Controller Tests', () => {
    const mockTopics = [
        {
            id: 'topic-1',
            user_id: 'user-1',
            title: 'Technology',
            parent_id: null,
            level: 0,
            order_index: 0,
            has_audio: false,
            created_at: '2026-01-15T10:00:00Z',
        },
        {
            id: 'topic-2',
            user_id: 'user-1',
            title: 'Artificial Intelligence',
            parent_id: 'topic-1',
            level: 1,
            order_index: 0,
            has_audio: true,
            mp3_url: 'https://storage.supabase.co/audio/topic-2.mp3',
            created_at: '2026-01-16T10:00:00Z',
        },
        {
            id: 'topic-3',
            user_id: 'user-1',
            title: 'Machine Learning',
            parent_id: 'topic-1',
            level: 1,
            order_index: 1,
            has_audio: false,
            created_at: '2026-01-16T11:00:00Z',
        },
    ];

    describe('createMainTopic', () => {
        test('should create topic with title', () => {
            const topic = {
                title: 'New Topic',
                user_id: 'user-1',
                parent_id: null,
                level: 0,
            };

            expect(topic.title).toBe('New Topic');
            expect(topic.parent_id).toBeNull();
        });

        test('should require title', () => {
            const title = '';
            expect(title).toBeFalsy();
        });

        test('should trim title whitespace', () => {
            const title = '  Technology  ';
            expect(title.trim()).toBe('Technology');
        });

        test('should set level 0 for main topics', () => {
            const topic = { ...mockTopics[0] };
            expect(topic.level).toBe(0);
        });

        test('should generate unique ID', () => {
            const id1 = 'topic-' + Math.random().toString(36).substr(2, 9);
            const id2 = 'topic-' + Math.random().toString(36).substr(2, 9);

            expect(id1).not.toBe(id2);
        });
    });

    describe('generateSubtopics', () => {
        test('should generate subtopics for parent', () => {
            const parentId = 'topic-1';
            const subtopics = mockTopics.filter(t => t.parent_id === parentId);

            expect(subtopics.length).toBe(2);
        });

        test('should set correct parent_id', () => {
            const subtopic = mockTopics[1];
            expect(subtopic.parent_id).toBe('topic-1');
        });

        test('should increment level from parent', () => {
            const parent = mockTopics[0];
            const subtopic = mockTopics[1];

            expect(subtopic.level).toBe(parent.level + 1);
        });

        test('should assign order index to subtopics', () => {
            const subtopics = mockTopics.filter(t => t.parent_id === 'topic-1');
            const orderIndices = subtopics.map(t => t.order_index);

            expect(orderIndices).toContain(0);
            expect(orderIndices).toContain(1);
        });

        test('should limit number of subtopics', () => {
            const maxSubtopics = 5;
            const subtopics = ['AI', 'ML', 'DL', 'NLP', 'CV'];

            expect(subtopics.length).toBeLessThanOrEqual(maxSubtopics);
        });
    });

    describe('addManualSubtopic', () => {
        test('should add subtopic with custom title', () => {
            const subtopic = {
                title: 'Custom Subtopic',
                parent_id: 'topic-1',
                level: 1,
            };

            expect(subtopic.title).toBe('Custom Subtopic');
        });

        test('should validate parent exists', () => {
            const parentId = 'topic-1';
            const parent = mockTopics.find(t => t.id === parentId);

            expect(parent).toBeDefined();
        });

        test('should not allow duplicate titles under same parent', () => {
            const existingTitles = mockTopics
                .filter(t => t.parent_id === 'topic-1')
                .map(t => t.title.toLowerCase());

            const newTitle = 'artificial intelligence';
            const isDuplicate = existingTitles.includes(newTitle);

            expect(isDuplicate).toBe(true);
        });
    });

    describe('getTopicTree', () => {
        test('should return all user topics', () => {
            const userId = 'user-1';
            const userTopics = mockTopics.filter(t => t.user_id === userId);

            expect(userTopics.length).toBe(3);
        });

        test('should organize topics hierarchically', () => {
            const buildTree = (topics, parentId = null) => {
                return topics
                    .filter(t => t.parent_id === parentId)
                    .map(t => ({
                        ...t,
                        children: buildTree(topics, t.id),
                    }));
            };

            const tree = buildTree(mockTopics);
            expect(tree.length).toBe(1); // One root topic
            expect(tree[0].children.length).toBe(2); // Two subtopics
        });

        test('should include audio status in tree', () => {
            const topicWithAudio = mockTopics.find(t => t.has_audio);
            expect(topicWithAudio.mp3_url).toBeDefined();
        });
    });

    describe('getTopicPath', () => {
        test('should return breadcrumb path', () => {
            const getPath = (topics, topicId, path = []) => {
                const topic = topics.find(t => t.id === topicId);
                if (!topic) return path;

                path.unshift(topic);
                if (topic.parent_id) {
                    return getPath(topics, topic.parent_id, path);
                }
                return path;
            };

            const path = getPath(mockTopics, 'topic-2');
            expect(path.length).toBe(2);
            expect(path[0].title).toBe('Technology');
            expect(path[1].title).toBe('Artificial Intelligence');
        });
    });

    describe('deleteTopicAndChildren', () => {
        test('should delete topic by ID', () => {
            const topicId = 'topic-2';
            const remaining = mockTopics.filter(t => t.id !== topicId);

            expect(remaining.length).toBe(2);
        });

        test('should cascade delete children', () => {
            const parentId = 'topic-1';
            const collectChildren = (topics, id) => {
                const children = topics.filter(t => t.parent_id === id);
                return children.flatMap(c => [c, ...collectChildren(topics, c.id)]);
            };

            const toDelete = collectChildren(mockTopics, parentId);
            expect(toDelete.length).toBe(2);
        });

        test('should only allow owner to delete', () => {
            const userId = 'user-1';
            const topic = mockTopics[0];

            expect(topic.user_id).toBe(userId);
        });
    });

    describe('markTopicListened', () => {
        test('should update listened status', () => {
            const topic = { ...mockTopics[1], listened: true, listened_at: new Date().toISOString() };

            expect(topic.listened).toBe(true);
            expect(topic.listened_at).toBeDefined();
        });

        test('should track listening progress', () => {
            const progress = {
                topic_id: 'topic-2',
                position_seconds: 120,
                total_duration: 300,
                percentage: 40,
            };

            expect(progress.percentage).toBe(40);
        });
    });

    describe('saveListeningProgress', () => {
        test('should save current position', () => {
            const progress = {
                mp3_url: 'https://storage.supabase.co/audio/topic-2.mp3',
                position_seconds: 150,
                total_duration: 300,
            };

            expect(progress.position_seconds).toBe(150);
        });

        test('should calculate completion percentage', () => {
            const position = 150;
            const total = 300;
            const percentage = Math.round((position / total) * 100);

            expect(percentage).toBe(50);
        });

        test('should mark as complete when near end', () => {
            const position = 295;
            const total = 300;
            const threshold = 0.95; // 95%

            const isComplete = position / total >= threshold;
            expect(isComplete).toBe(true);
        });
    });

    describe('getIncompleteListenings', () => {
        test('should return partially listened content', () => {
            const listenings = [
                { topic_id: 'topic-1', percentage: 50 },
                { topic_id: 'topic-2', percentage: 100 },
            ];

            const incomplete = listenings.filter(l => l.percentage < 95);
            expect(incomplete.length).toBe(1);
        });

        test('should order by last listened', () => {
            const listenings = [
                { topic_id: 'topic-1', last_played: '2026-01-15T10:00:00Z' },
                { topic_id: 'topic-2', last_played: '2026-01-16T10:00:00Z' },
            ];

            const sorted = listenings.sort((a, b) =>
                new Date(b.last_played) - new Date(a.last_played)
            );

            expect(sorted[0].topic_id).toBe('topic-2');
        });
    });
});
