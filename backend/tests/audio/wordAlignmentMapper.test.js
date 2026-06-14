const {
  alignWhisperWordsToReference,
  normalizeWord,
  wordSimilarity,
} = require('../../utils/audio/wordAlignmentMapper');

describe('wordAlignmentMapper', () => {
  test('normalizes punctuation, case, accents, and curly apostrophes', () => {
    expect(normalizeWord('Café!')).toBe('cafe');
    expect(normalizeWord('Don’t')).toBe("don't");
  });

  test('aligns exact whisper words to reference words', () => {
    const result = alignWhisperWordsToReference(
      'Hello world',
      [
        { word: 'hello', start: 0, end: 0.4 },
        { word: 'world', start: 0.4, end: 0.9 },
      ]
    );

    expect(result.passed).toBe(true);
    expect(result.metrics.matchRatio).toBe(1);
    expect(result.timings).toHaveLength(2);
    expect(result.timings[0]).toMatchObject({
      word: 'Hello',
      startTime: 0,
      endTime: 0.4,
      matched: true,
    });
  });

  test('interpolates a missing reference word but fails strict default quality gate', () => {
    const result = alignWhisperWordsToReference(
      'Hello beautiful world',
      [
        { word: 'hello', start: 0, end: 0.3 },
        { word: 'world', start: 0.8, end: 1.1 },
      ]
    );

    expect(result.passed).toBe(false);
    expect(result.failureReasons).toContain('low_match_ratio');
    expect(result.timings).toHaveLength(3);
    expect(result.timings[1]).toMatchObject({
      word: 'beautiful',
      matched: false,
      interpolated: true,
    });
  });

  test('passes punctuation differences and common fuzzy similarity', () => {
    expect(wordSimilarity('traveling', 'travelling')).toBeGreaterThan(0.82);

    const result = alignWhisperWordsToReference(
      'Well-known traveling plans',
      [
        { word: 'wellknown', start: 0, end: 0.5 },
        { word: 'travelling', start: 0.5, end: 0.9 },
        { word: 'plans', start: 0.9, end: 1.2 },
      ]
    );

    expect(result.passed).toBe(true);
    expect(result.metrics.matchedWordCount).toBe(3);
  });

  test('fails when word count delta is too high', () => {
    const result = alignWhisperWordsToReference(
      'one two three four five',
      [{ word: 'one', start: 0, end: 0.2 }],
      { minMatchRatio: 0.1, maxWordCountDeltaRatio: 0.12 }
    );

    expect(result.passed).toBe(false);
    expect(result.failureReasons).toContain('word_count_delta_too_high');
  });

  test('repairs and tolerates small non-monotonic whisper timing overlap', () => {
    const result = alignWhisperWordsToReference(
      'one two three four five',
      [
        { word: 'one', start: 0, end: 0.3 },
        { word: 'two', start: 0.3, end: 0.6 },
        { word: 'three', start: 0.58, end: 0.9 },
        { word: 'four', start: 0.9, end: 1.2 },
        { word: 'five', start: 1.2, end: 1.5 },
      ],
      { maxNonMonotonicTimingRatio: 0.2 }
    );

    expect(result.passed).toBe(true);
    expect(result.metrics.nonMonotonicTimingCount).toBe(1);
    expect(result.timings[2].startTime).toBeGreaterThanOrEqual(result.timings[1].endTime);
  });

  test('fails when non-monotonic whisper timing count exceeds tolerance', () => {
    const result = alignWhisperWordsToReference(
      'one two three four',
      [
        { word: 'one', start: 0, end: 0.5 },
        { word: 'two', start: 0.4, end: 0.8 },
        { word: 'three', start: 0.7, end: 1.1 },
        { word: 'four', start: 1.1, end: 1.4 },
      ],
      { maxNonMonotonicTimingRatio: 0.25 }
    );

    expect(result.passed).toBe(false);
    expect(result.failureReasons).toContain('non_monotonic_whisper_timing');
  });

  test('allows long-form style non-monotonic ratio when within configured tolerance', () => {
    const reference = Array.from({ length: 100 }, (_, index) => `word${index + 1}`);
    const whisperWords = reference.map((word, index) => ({
      word,
      start: index * 0.3,
      end: index * 0.3 + 0.25,
    }));

    for (const index of [10, 20, 30, 40]) {
      whisperWords[index].start = whisperWords[index - 1].end - 0.03;
    }

    const result = alignWhisperWordsToReference(reference, whisperWords, {
      maxNonMonotonicTimingRatio: 0.08,
    });

    expect(result.passed).toBe(true);
    expect(result.metrics.nonMonotonicTimingCount).toBe(4);
    expect(result.metrics.maxNonMonotonicTimingCount).toBe(8);
  });
});
