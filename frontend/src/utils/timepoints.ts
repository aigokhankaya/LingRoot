export interface Timepoint {
  timeSeconds?: number | string;
  endTimeSeconds?: number | string;
  start?: number | string;
  end?: number | string;
  word?: string;
  markName?: string;
  index?: number;
  hasRealTiming?: boolean;
  source?: 'mfa' | 'groq_whisper' | 'tts' | string;
}

export interface WordTimestamp {
  word: string;
  startTime: number;
  endTime: number;
}

const DEFAULT_WORD_DURATION_SECONDS = 0.35;
const MIN_WORD_DURATION_SECONDS = 0.04;

const toFiniteSeconds = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

export const normalizeSyncWord = (word: string): string =>
  word
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`]/g, "'")
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9']/g, '');

export const createLinearWordTimestamps = (words: string[], duration: number): WordTimestamp[] => {
  if (!words || words.length === 0 || !duration || !Number.isFinite(duration)) {
    return [];
  }

  const safeDuration = Math.max(duration, words.length * MIN_WORD_DURATION_SECONDS);
  const timePerWord = safeDuration / words.length;

  return words.map((word, index) => ({
    word,
    startTime: index * timePerWord,
    endTime: (index + 1) * timePerWord
  }));
};

const sanitizeTimepoints = (timepoints: Timepoint[]): Array<{
  word: string;
  startTime: number;
  endTime: number;
}> => {
  const sanitized: Array<{ word: string; startTime: number; endTime: number }> = [];
  let lastEnd = 0;

  for (const raw of timepoints) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }

    const start = toFiniteSeconds(raw.timeSeconds ?? raw.start);
    if (start === null) {
      continue;
    }

    const explicitEnd = toFiniteSeconds(raw.endTimeSeconds ?? raw.end);
    const safeStart = Math.max(0, start);
    const monotonicStart = Math.max(safeStart, lastEnd);
    const safeExplicitEnd = explicitEnd === null ? null : Math.max(0, explicitEnd);
    const endTime = Math.max(
      monotonicStart + MIN_WORD_DURATION_SECONDS,
      safeExplicitEnd ?? monotonicStart + DEFAULT_WORD_DURATION_SECONDS
    );

    sanitized.push({
      word: raw.word || raw.markName || '',
      startTime: monotonicStart,
      endTime
    });

    lastEnd = endTime;
  }

  return sanitized;
};

export const createAlignedWordTimestamps = (
  timepoints: Timepoint[] | undefined,
  displayWords: string[],
  offsetMs = 0
): WordTimestamp[] => {
  if (!Array.isArray(timepoints) || timepoints.length === 0 || displayWords.length === 0) {
    return [];
  }

  const sanitizedTimepoints = sanitizeTimepoints(timepoints);
  if (sanitizedTimepoints.length === 0) {
    return [];
  }

  const result: WordTimestamp[] = [];
  const offsetSeconds = offsetMs / 1000;
  let tpIdx = 0;

  for (const displayWord of displayWords) {
    const cleanDisplay = normalizeSyncWord(displayWord);

    if (cleanDisplay === '') {
      const prevEnd = result.length > 0 ? result[result.length - 1].endTime : 0;
      result.push({ word: displayWord, startTime: prevEnd, endTime: prevEnd });
      continue;
    }

    if (tpIdx >= sanitizedTimepoints.length) {
      const prevEnd = result.length > 0 ? result[result.length - 1].endTime : 0;
      result.push({
        word: displayWord,
        startTime: prevEnd,
        endTime: prevEnd + DEFAULT_WORD_DURATION_SECONDS
      });
      continue;
    }

    const current = sanitizedTimepoints[tpIdx];
    const cleanCurrent = normalizeSyncWord(current.word);

    if (cleanCurrent === cleanDisplay) {
      result.push({ word: displayWord, startTime: current.startTime, endTime: current.endTime });
      tpIdx++;
      continue;
    }

    if (cleanCurrent && cleanDisplay.length > cleanCurrent.length && cleanDisplay.startsWith(cleanCurrent)) {
      const startTime = current.startTime;
      let endTime = current.endTime;
      let consumed = cleanCurrent;
      tpIdx++;

      while (tpIdx < sanitizedTimepoints.length) {
        const next = sanitizedTimepoints[tpIdx];
        const cleanNext = normalizeSyncWord(next.word);
        if (!cleanNext || !cleanDisplay.startsWith(consumed + cleanNext)) {
          break;
        }

        consumed += cleanNext;
        endTime = next.endTime;
        tpIdx++;

        if (consumed === cleanDisplay) {
          break;
        }
      }

      result.push({ word: displayWord, startTime, endTime });
      continue;
    }

    result.push({ word: displayWord, startTime: current.startTime, endTime: current.endTime });
    tpIdx++;
  }

  if (offsetSeconds === 0) {
    return result;
  }

  return result.map((timestamp) => ({
    ...timestamp,
    startTime: Math.max(0, timestamp.startTime - offsetSeconds),
    endTime: Math.max(
      Math.max(0, timestamp.startTime - offsetSeconds) + MIN_WORD_DURATION_SECONDS,
      timestamp.endTime - offsetSeconds
    )
  }));
};
