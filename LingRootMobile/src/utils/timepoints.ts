import { DialogueSegment, Timepoint } from '../types';

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

export const parseJsonArray = (raw: unknown): unknown[] => {
  if (Array.isArray(raw)) {
    return raw;
  }

  if (typeof raw !== 'string' || raw.trim() === '') {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const normalizeWords = (raw: unknown): string[] =>
  parseJsonArray(raw)
    .map((item: unknown) => {
      if (typeof item === 'string') {
        return item;
      }

      if (item && typeof item === 'object') {
        const candidate = item as Record<string, unknown>;
        return (
          candidate.word ||
          candidate.text ||
          candidate.token ||
          candidate.value ||
          ''
        );
      }

      return '';
    })
    .map((word) => String(word).trim())
    .filter((word) => word.length > 0);

export const normalizeTimepoints = (raw: unknown): Timepoint[] => {
  const parsed = parseJsonArray(raw);
  const sanitized: Timepoint[] = [];
  let lastEnd = 0;

  parsed.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      return;
    }

    const timepoint = item as Record<string, unknown>;
    const start = toFiniteSeconds(timepoint.timeSeconds ?? timepoint.start);
    if (start === null) {
      return;
    }

    const explicitEnd = toFiniteSeconds(timepoint.endTimeSeconds ?? timepoint.end);
    const safeStart = Math.max(0, start);
    const timeSeconds = Math.max(safeStart, lastEnd);
    const endTimeSeconds = Math.max(
      timeSeconds + MIN_WORD_DURATION_SECONDS,
      explicitEnd === null ? timeSeconds + DEFAULT_WORD_DURATION_SECONDS : Math.max(0, explicitEnd)
    );

    sanitized.push({
      timeSeconds,
      endTimeSeconds,
      word:
        typeof timepoint.word === 'string'
          ? timepoint.word
          : typeof timepoint.markName === 'string'
            ? timepoint.markName
            : undefined,
      index: typeof timepoint.index === 'number' ? timepoint.index : index,
      hasRealTiming:
        typeof timepoint.hasRealTiming === 'boolean'
          ? timepoint.hasRealTiming
          : true,
      source: typeof timepoint.source === 'string' ? timepoint.source : undefined,
    });

    lastEnd = endTimeSeconds;
  });

  return sanitized;
};

export const normalizeDialogueSegments = (raw: unknown): DialogueSegment[] => {
  const normalized = parseJsonArray(raw).map<DialogueSegment | null>((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const segment = item as Record<string, unknown>;
      const content = typeof segment.content === 'string' ? segment.content.trim() : '';
      if (!content) {
        return null;
      }

      const startTime = toFiniteSeconds(segment.startTime);
      const endTime = toFiniteSeconds(segment.endTime);

      return {
        speaker: typeof segment.speaker === 'string' ? segment.speaker : '',
        speakerLabel: typeof segment.speakerLabel === 'string' ? segment.speakerLabel : undefined,
        content,
        startTime: startTime === null ? undefined : Math.max(0, startTime),
        endTime:
          endTime === null
            ? undefined
            : Math.max(
              startTime === null ? 0 : Math.max(0, startTime) + MIN_WORD_DURATION_SECONDS,
              Math.max(0, endTime)
            ),
      };
    });

  return normalized.filter((segment): segment is DialogueSegment => segment !== null);
};
