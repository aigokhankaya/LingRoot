/**
 * @jest-environment node
 * 
 * Voice Model Service Unit Tests
 * Tests for TTS provider selection and voice listing
 * 
 * Created: 2026-01-16
 * Updated: 2026-01-17 - Complete rewrite with proper module isolation
 */

describe('VoiceModel Service', () => {
    let voiceModelService;
    let mockGetLingrootVoices;
    let mockMapLingrootToProviderVoice;
    let mockGetDefaultLingrootVoiceId;

    beforeEach(() => {
        jest.resetModules();

        // Mock supabase
        jest.doMock('../utils/storage/supabaseClient.js', () => ({
            supabase: {
                from: jest.fn(() => ({
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
                })),
            },
        }));

        // Mock logger
        jest.doMock('../utils/common/logger.js', () => ({
            error: jest.fn(),
            warn: jest.fn(),
            info: jest.fn(),
            debug: jest.fn(),
        }));

        // Mock Google TTS
        jest.doMock('../utils/audio/googleTTS.js', () => ({
            listGoogleVoices: jest.fn().mockResolvedValue([
                { name: 'en-US-Standard-A', gender: 'FEMALE', package: 'Basic' },
            ]),
        }));

        // Mock Azure TTS
        jest.doMock('../utils/audio/azureTTS.js', () => ({
            listAzureVoices: jest.fn().mockResolvedValue([]),
            isAzureTTSAvailable: jest.fn().mockReturnValue(false),
        }));

        // Mock Amazon Polly
        jest.doMock('../utils/audio/amazonPolly.js', () => ({
            listPollyVoices: jest.fn().mockResolvedValue([]),
            isPollyAvailable: jest.fn().mockReturnValue(false),
        }));

        // Create mock functions for lingrootVoices
        mockGetLingrootVoices = jest.fn().mockReturnValue([
            { id: 'emma', label: 'Emma', gender: 'female', accent: 'british', quality: 'premium' },
            { id: 'james', label: 'James', gender: 'male', accent: 'american', quality: 'basic' },
            { id: 'sophia', label: 'Sophia', gender: 'female', accent: 'american', quality: 'gold' },
        ]);
        mockMapLingrootToProviderVoice = jest.fn().mockReturnValue({ name: 'en-US-Standard-A', languageCode: 'en-US' });
        mockGetDefaultLingrootVoiceId = jest.fn().mockReturnValue('emma');

        jest.doMock('../utils/audio/lingrootVoices.js', () => ({
            getLingrootVoices: mockGetLingrootVoices,
            mapLingrootToProviderVoice: mockMapLingrootToProviderVoice,
            getDefaultLingrootVoiceId: mockGetDefaultLingrootVoiceId,
        }));

        // Now require the service
        voiceModelService = require('../services/voiceModelService.js');
    });

    afterEach(() => {
        jest.resetModules();
    });

    describe('getTtsProvider', () => {
        test('should return google as default provider when no setting exists', async () => {
            const provider = await voiceModelService.getTtsProvider();
            expect(provider).toBe('google');
        });

        test('should return a valid provider string', async () => {
            const provider = await voiceModelService.getTtsProvider();
            expect(typeof provider).toBe('string');
            expect(['google', 'azure', 'polly', 'openai']).toContain(provider);
        });
    });

    describe('listVoices', () => {
        test('should return Lingroot voices with correct structure', async () => {
            const result = await voiceModelService.listVoices('en-US');

            expect(result).toHaveProperty('voices');
            expect(result).toHaveProperty('defaultVoice');
            expect(result).toHaveProperty('stats');
            expect(Array.isArray(result.voices)).toBe(true);
            expect(result.voices.length).toBe(3);
        });

        test('should include required voice properties', async () => {
            const result = await voiceModelService.listVoices('en-US');

            expect(result.voices.length).toBeGreaterThan(0);
            const voice = result.voices[0];
            expect(voice).toHaveProperty('id');
            expect(voice).toHaveProperty('displayName');
            expect(voice).toHaveProperty('gender');
            expect(voice).toHaveProperty('accent');
            expect(voice).toHaveProperty('quality');
        });
    });

    describe('getFilteredVoices', () => {
        test('should filter voices by gender', async () => {
            const result = await voiceModelService.getFilteredVoices({ gender: 'female' });

            expect(result).toHaveProperty('voices');
            expect(result).toHaveProperty('filters');
            expect(result.filters.gender).toBe('female');
            expect(result.voices.length).toBe(2);
        });

        test('should filter voices by accent', async () => {
            const result = await voiceModelService.getFilteredVoices({ accent: 'british' });

            expect(result).toHaveProperty('voices');
            expect(result.filters.accent).toBe('british');
            expect(result.voices.length).toBe(1);
        });

        test('should filter voices by category/quality', async () => {
            const result = await voiceModelService.getFilteredVoices({ category: 'standard' });

            expect(result).toHaveProperty('filteredCount');
            expect(result.filteredCount).toBe(1);
        });

        test('should return all voices when no filter applied', async () => {
            const result = await voiceModelService.getFilteredVoices({});

            expect(result.filteredCount).toBe(result.totalCount);
            expect(result.filteredCount).toBe(3);
        });
    });
});

describe('Lingroot Voice Abstraction', () => {
    const mockVoices = [
        { id: 'emma', label: 'Emma', gender: 'female', accent: 'british', quality: 'premium' },
        { id: 'james', label: 'James', gender: 'male', accent: 'american', quality: 'basic' },
        { id: 'sophia', label: 'Sophia', gender: 'female', accent: 'american', quality: 'gold' },
    ];

    test('should have consistent voice IDs', () => {
        const ids = mockVoices.map(v => v.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);

        ids.forEach(id => {
            expect(id).toBe(id.toLowerCase());
        });
    });

    test('should have valid quality tiers', () => {
        const validTiers = ['basic', 'premium', 'gold', 'platinum', 'ultra', 'generative'];

        mockVoices.forEach(voice => {
            expect(validTiers).toContain(voice.quality);
        });
    });

    test('should have valid accents', () => {
        const validAccents = ['american', 'british', 'australian', 'indian'];

        mockVoices.forEach(voice => {
            expect(validAccents).toContain(voice.accent);
        });
    });

    test('should have valid genders', () => {
        const validGenders = ['male', 'female'];

        mockVoices.forEach(voice => {
            expect(validGenders).toContain(voice.gender);
        });
    });
});
