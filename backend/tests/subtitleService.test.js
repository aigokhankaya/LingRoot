/**
 * @jest-environment node
 * 
 * Subtitle Service Unit Tests
 * Tests for VTT generation and word timing functions
 * 
 * Created: 2026-01-16
 */

// Mock logger
jest.mock('../utils/common/logger.js', () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
}));

const {
    createVTTFile,
    createWordLevelVTT,
    createWordLevelVTTFromTimings,
    createWordLevelVTTFromOptimizedTimings,
    matchWordsWithTimings,
    formatTime
} = require('../services/subtitleService.js');

describe('Subtitle Service', () => {

    describe('formatTime', () => {
        test('should format zero seconds correctly', () => {
            expect(formatTime(0)).toBe('00:00.000');
        });

        test('should format seconds with milliseconds', () => {
            expect(formatTime(1.5)).toBe('00:01.500');
        });

        test('should format minutes correctly', () => {
            expect(formatTime(65.123)).toBe('01:05.123');
        });

        test('should handle large durations', () => {
            // Allow for floating point precision differences
            const result = formatTime(3661.999);
            expect(result.startsWith('61:01.99')).toBe(true);
        });
    });

    describe('createVTTFile', () => {
        test('should create valid VTT header', () => {
            const text = 'Hello world';
            const vtt = createVTTFile(text, 10);

            expect(vtt.startsWith('WEBVTT\n\n')).toBe(true);
        });

        test('should create cues from text', () => {
            const text = 'Hello world test';
            const vtt = createVTTFile(text, 10);

            expect(vtt).toContain('-->');
        });

        test('should handle empty text', () => {
            const vtt = createVTTFile('', 10);

            expect(vtt).toBe('WEBVTT\n\n');
        });

        test('should group words into lines', () => {
            const text = 'One two three four five six seven eight nine ten';
            const vtt = createVTTFile(text, 20);

            // Should have multiple cues (5 words per line default)
            const cueCount = (vtt.match(/-->/g) || []).length;
            expect(cueCount).toBeGreaterThan(1);
        });
    });

    describe('createWordLevelVTT', () => {
        test('should create one cue per word', () => {
            const text = 'Hello world test';
            const vtt = createWordLevelVTT(text, 10);

            const cueCount = (vtt.match(/-->/g) || []).length;
            expect(cueCount).toBe(3); // 3 words
        });

        test('should have valid timing format', () => {
            const text = 'Hello';
            const vtt = createWordLevelVTT(text, 10);

            // Should contain time format MM:SS.mmm
            expect(vtt).toMatch(/\d{2}:\d{2}\.\d{3}/);
        });

        test('should handle single word', () => {
            const vtt = createWordLevelVTT('Hello', 5);

            expect(vtt).toContain('Hello');
            expect(vtt).toContain('-->');
        });
    });

    describe('createWordLevelVTTFromTimings', () => {
        test('should create VTT from timing array', () => {
            const timings = [
                { word: 'Hello', startTime: 0, endTime: 0.5 },
                { word: 'world', startTime: 0.5, endTime: 1.0 },
            ];

            const vtt = createWordLevelVTTFromTimings(timings, 1);

            expect(vtt).toContain('Hello');
            expect(vtt).toContain('world');
            expect(vtt.startsWith('WEBVTT\n\n')).toBe(true);
        });

        test('should handle empty timings', () => {
            const vtt = createWordLevelVTTFromTimings([], 0);

            expect(vtt).toBe('WEBVTT\n\n');
        });
    });

    describe('createWordLevelVTTFromOptimizedTimings', () => {
        test('should handle optimized timing format', () => {
            const timings = [
                { word: 'Hello', timeSeconds: 0, endTimeSeconds: 0.5 },
                { word: 'world', timeSeconds: 0.5, endTimeSeconds: 1.0 },
            ];

            const vtt = createWordLevelVTTFromOptimizedTimings(timings, [], []);

            expect(vtt).toContain('Hello');
            expect(vtt).toContain('world');
        });

        test('should fallback to default duration when endTime missing', () => {
            const timings = [
                { word: 'Hello', timeSeconds: 0 },
            ];

            const vtt = createWordLevelVTTFromOptimizedTimings(timings, [], []);

            expect(vtt).toContain('Hello');
            // Should have timing cue
            expect(vtt).toContain('-->');
        });
    });

    describe('matchWordsWithTimings', () => {
        test('should match words sequentially', () => {
            const allWords = ['Hello', 'world'];
            const wordTimings = [
                { word: 'Hello', timeSeconds: 0, endTimeSeconds: 0.5 },
                { word: 'world', timeSeconds: 0.5, endTimeSeconds: 1.0 },
            ];

            const result = matchWordsWithTimings(allWords, wordTimings, 1);

            expect(result.length).toBe(2);
            expect(result[0].word).toBe('Hello');
            expect(result[1].word).toBe('world');
        });

        test('should interpolate missing timings', () => {
            const allWords = ['Hello', 'beautiful', 'world'];
            const wordTimings = [
                { word: 'Hello', timeSeconds: 0, endTimeSeconds: 0.3 },
                { word: 'world', timeSeconds: 0.6, endTimeSeconds: 1.0 },
            ];

            const result = matchWordsWithTimings(allWords, wordTimings, 1);

            expect(result.length).toBe(3);
            // Middle word should be interpolated
            expect(result[1].word).toBe('beautiful');
            expect(result[1].hasRealTiming).toBe(false);
        });

        test('should handle hyphenated words', () => {
            const allWords = ['solid-state'];
            const wordTimings = [
                { word: 'solid', timeSeconds: 0, endTimeSeconds: 0.3 },
                { word: 'state', timeSeconds: 0.3, endTimeSeconds: 0.6 },
            ];

            const result = matchWordsWithTimings(allWords, wordTimings, 0.6);

            expect(result.length).toBe(1);
            expect(result[0].word).toBe('solid-state');
            expect(result[0].hasRealTiming).toBe(true);
        });

        test('should handle empty arrays', () => {
            const result = matchWordsWithTimings([], [], 0);

            expect(result).toEqual([]);
        });

        test('should handle more words than timings', () => {
            const allWords = ['Hello', 'world', 'test'];
            const wordTimings = [
                { word: 'Hello', timeSeconds: 0, endTimeSeconds: 0.5 },
            ];

            const result = matchWordsWithTimings(allWords, wordTimings, 1.5);

            expect(result.length).toBe(3);
            expect(result[0].hasRealTiming).toBe(true);
            expect(result[1].hasRealTiming).toBe(false);
            expect(result[2].hasRealTiming).toBe(false);
        });
    });
});

describe('VTT Format Compliance', () => {
    test('should produce valid WebVTT format', () => {
        const text = 'This is a test sentence for VTT generation.';
        const vtt = createWordLevelVTT(text, 10);

        // Must start with WEBVTT
        expect(vtt.startsWith('WEBVTT')).toBe(true);

        // Must have blank line after header
        expect(vtt).toMatch(/^WEBVTT\n\n/);

        // Time format: MM:SS.mmm --> MM:SS.mmm
        expect(vtt).toMatch(/\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}\.\d{3}/);
    });

    test('should have non-overlapping cue times', () => {
        const text = 'One two three four five';
        const vtt = createWordLevelVTT(text, 10);

        // Extract all timestamps
        const timeRegex = /(\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}\.\d{3})/g;
        const matches = [...vtt.matchAll(timeRegex)];

        for (let i = 1; i < matches.length; i++) {
            const prevEnd = parseFloat(matches[i - 1][2].replace(':', '').replace('.', ''));
            const currStart = parseFloat(matches[i][1].replace(':', '').replace('.', ''));

            // Current start should be >= previous end (or very close due to floating point)
            expect(currStart).toBeGreaterThanOrEqual(prevEnd - 1);
        }
    });
});
