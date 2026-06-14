const DEFAULT_MIN_MATCH_RATIO = 0.92;
const DEFAULT_MAX_WORD_COUNT_DELTA_RATIO = 0.12;
const DEFAULT_WORD_DURATION_SECONDS = 0.35;
const MIN_WORD_DURATION_SECONDS = 0.04;

function splitWords(text) {
  return String(text || '')
    .split(/\s+/)
    .map(word => word.trim())
    .filter(Boolean);
}

function normalizeWord(word) {
  return String(word || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`]/g, "'")
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9']/g, '');
}

function levenshteinDistance(a, b) {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const curr = new Array(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    for (let j = 0; j <= b.length; j++) {
      prev[j] = curr[j];
    }
  }

  return prev[b.length];
}

function wordSimilarity(a, b) {
  const left = normalizeWord(a);
  const right = normalizeWord(b);

  if (!left && !right) return 1;
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.length >= 4 && right.length >= 4 && (left.startsWith(right) || right.startsWith(left))) {
    return 0.9;
  }

  const distance = levenshteinDistance(left, right);
  return 1 - distance / Math.max(left.length, right.length);
}

function toFiniteSeconds(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeWhisperWords(words) {
  const normalized = [];
  let lastEnd = 0;
  let nonMonotonicTimingCount = 0;

  for (const raw of Array.isArray(words) ? words : []) {
    const start = toFiniteSeconds(raw?.start);
    const end = toFiniteSeconds(raw?.end);
    const word = String(raw?.word || '').trim();

    if (!word || start === null) {
      continue;
    }

    const safeStart = Math.max(0, start);
    const safeEnd = Math.max(safeStart + MIN_WORD_DURATION_SECONDS, end ?? safeStart + DEFAULT_WORD_DURATION_SECONDS);

    if (safeStart < lastEnd - 0.01) {
      nonMonotonicTimingCount++;
    }

    normalized.push({
      word,
      startTime: Math.max(safeStart, lastEnd),
      endTime: Math.max(Math.max(safeStart, lastEnd) + MIN_WORD_DURATION_SECONDS, safeEnd),
    });
    lastEnd = normalized[normalized.length - 1].endTime;
  }

  return { words: normalized, nonMonotonicTimingCount };
}

function interpolateMissingTimings(referenceWords, matched, audioDurationSeconds) {
  const output = [];
  const fallbackDuration = DEFAULT_WORD_DURATION_SECONDS;
  const totalDuration = Number.isFinite(audioDurationSeconds) && audioDurationSeconds > 0
    ? audioDurationSeconds
    : Math.max(referenceWords.length * fallbackDuration, fallbackDuration);

  for (let i = 0; i < referenceWords.length; i++) {
    if (matched[i]) {
      output.push(matched[i]);
      continue;
    }

    let prev = null;
    let next = null;

    for (let j = i - 1; j >= 0; j--) {
      if (matched[j]) {
        prev = matched[j];
        break;
      }
    }

    for (let j = i + 1; j < matched.length; j++) {
      if (matched[j]) {
        next = matched[j];
        break;
      }
    }

    let startTime;
    let endTime;

    if (prev && next && next.index > prev.index) {
      const gapWords = next.index - prev.index;
      const gapDuration = Math.max(MIN_WORD_DURATION_SECONDS * gapWords, next.startTime - prev.endTime);
      const wordDuration = gapDuration / gapWords;
      const wordsFromPrev = i - prev.index;
      startTime = prev.endTime + wordDuration * (wordsFromPrev - 1);
      endTime = startTime + wordDuration;
    } else if (prev) {
      startTime = prev.endTime + fallbackDuration * (i - prev.index - 1);
      endTime = startTime + fallbackDuration;
    } else if (next && next.index > 0) {
      const wordDuration = Math.max(MIN_WORD_DURATION_SECONDS, next.startTime / next.index);
      startTime = wordDuration * i;
      endTime = startTime + wordDuration;
    } else {
      const wordDuration = totalDuration / referenceWords.length;
      startTime = wordDuration * i;
      endTime = startTime + wordDuration;
    }

    output.push({
      word: referenceWords[i],
      startTime: Math.max(0, startTime),
      endTime: Math.max(Math.max(0, startTime) + MIN_WORD_DURATION_SECONDS, endTime),
      sourceWord: referenceWords[i],
      whisperWord: null,
      confidence: null,
      matched: false,
      interpolated: true,
      index: i,
    });
  }

  let lastEnd = 0;
  return output.map(item => {
    const startTime = Math.max(0, item.startTime, lastEnd);
    const endTime = Math.max(startTime + MIN_WORD_DURATION_SECONDS, item.endTime);
    lastEnd = endTime;
    return { ...item, startTime, endTime };
  });
}

function alignWhisperWordsToReference(referenceText, whisperWords, options = {}) {
  const referenceWords = Array.isArray(referenceText) ? referenceText : splitWords(referenceText);
  const minMatchRatio = Number(options.minMatchRatio ?? DEFAULT_MIN_MATCH_RATIO);
  const maxWordCountDeltaRatio = Number(options.maxWordCountDeltaRatio ?? DEFAULT_MAX_WORD_COUNT_DELTA_RATIO);
  const maxNonMonotonicTimingRatio = Number(options.maxNonMonotonicTimingRatio ?? 0.02);
  const audioDurationSeconds = options.audioDurationSeconds;

  const { words: normalizedWhisperWords, nonMonotonicTimingCount } = normalizeWhisperWords(whisperWords);
  const matched = new Array(referenceWords.length).fill(null);
  let whisperIndex = 0;
  let matchedWordCount = 0;

  for (let i = 0; i < referenceWords.length; i++) {
    const referenceWord = referenceWords[i];
    const normalizedReference = normalizeWord(referenceWord);

    if (!normalizedReference) {
      continue;
    }

    let bestIndex = -1;
    let bestScore = 0;
    const lookAheadLimit = Math.min(normalizedWhisperWords.length, whisperIndex + 6);

    for (let j = whisperIndex; j < lookAheadLimit; j++) {
      const score = wordSimilarity(referenceWord, normalizedWhisperWords[j].word);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = j;
      }
      if (score === 1) break;
    }

    if (bestIndex !== -1 && bestScore >= 0.82) {
      const whisperWord = normalizedWhisperWords[bestIndex];
      matched[i] = {
        word: referenceWord,
        startTime: whisperWord.startTime,
        endTime: whisperWord.endTime,
        sourceWord: referenceWord,
        whisperWord: whisperWord.word,
        confidence: null,
        matched: true,
        interpolated: false,
        index: i,
      };
      matchedWordCount++;
      whisperIndex = bestIndex + 1;
    }
  }

  const timings = interpolateMissingTimings(referenceWords, matched, audioDurationSeconds);
  const referenceWordCount = referenceWords.length;
  const whisperWordCount = normalizedWhisperWords.length;
  const interpolatedWordCount = timings.filter(timing => timing.interpolated).length;
  const matchRatio = referenceWordCount > 0 ? matchedWordCount / referenceWordCount : 0;
  const wordCountDeltaRatio = referenceWordCount > 0
    ? Math.abs(referenceWordCount - whisperWordCount) / referenceWordCount
    : 1;
  const maxNonMonotonicTimingCount = Math.max(
    0,
    Math.floor(whisperWordCount * Math.max(0, maxNonMonotonicTimingRatio))
  );
  const lastEndTime = timings.length > 0 ? timings[timings.length - 1].endTime : 0;

  const failureReasons = [];
  if (referenceWordCount === 0) failureReasons.push('empty_reference');
  if (whisperWordCount === 0) failureReasons.push('empty_whisper_words');
  if (matchRatio < minMatchRatio) failureReasons.push('low_match_ratio');
  if (wordCountDeltaRatio > maxWordCountDeltaRatio) failureReasons.push('word_count_delta_too_high');
  if (nonMonotonicTimingCount > maxNonMonotonicTimingCount) failureReasons.push('non_monotonic_whisper_timing');

  return {
    timings,
    passed: failureReasons.length === 0,
    failureReasons,
    metrics: {
      referenceWordCount,
      whisperWordCount,
      matchedWordCount,
      matchRatio,
      wordCountDeltaRatio,
      interpolatedWordCount,
      nonMonotonicTimingCount,
      maxNonMonotonicTimingCount,
      lastEndTime,
    },
  };
}

module.exports = {
  alignWhisperWordsToReference,
  normalizeWord,
  splitWords,
  wordSimilarity,
};
