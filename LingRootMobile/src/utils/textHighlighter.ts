/**
 * Text highlighting utility for daily usage patterns
 * Highlights patterns in text with yellow background
 */

export interface Pattern {
  pattern: string;
  meaning: string;
  example?: string;
}

export interface HighlightedSegment {
  text: string;
  isHighlighted: boolean;
  pattern?: Pattern;
}

/**
 * Split text into segments, highlighting patterns
 * @param text - The text to highlight
 * @param patterns - Array of patterns to find
 * @returns Array of text segments with highlight info
 */
export function highlightPatterns(text: string, patterns: Pattern[]): HighlightedSegment[] {
  if (!text || !patterns || patterns.length === 0) {
    return [{ text, isHighlighted: false }];
  }

  // Sort patterns by length (longest first) to avoid partial matches
  const sortedPatterns = [...patterns].sort((a, b) => b.pattern.length - a.pattern.length);

  // Create a map of positions to highlight
  const highlights: Array<{ start: number; end: number; pattern: Pattern }> = [];
  const textLower = text.toLowerCase();

  sortedPatterns.forEach(pattern => {
    const patternLower = pattern.pattern.toLowerCase();
    let startIndex = 0;

    while (true) {
      const index = textLower.indexOf(patternLower, startIndex);
      if (index === -1) break;

      // Check if this position overlaps with existing highlights
      const overlaps = highlights.some(
        h => (index >= h.start && index < h.end) || (index + patternLower.length > h.start && index < h.end)
      );

      if (!overlaps) {
        highlights.push({
          start: index,
          end: index + patternLower.length,
          pattern
        });
      }

      startIndex = index + 1;
    }
  });

  // Sort highlights by start position
  highlights.sort((a, b) => a.start - b.start);

  // Build segments
  const segments: HighlightedSegment[] = [];
  let currentPos = 0;

  highlights.forEach(highlight => {
    // Add non-highlighted text before this highlight
    if (currentPos < highlight.start) {
      segments.push({
        text: text.substring(currentPos, highlight.start),
        isHighlighted: false
      });
    }

    // Add highlighted text
    segments.push({
      text: text.substring(highlight.start, highlight.end),
      isHighlighted: true,
      pattern: highlight.pattern
    });

    currentPos = highlight.end;
  });

  // Add remaining non-highlighted text
  if (currentPos < text.length) {
    segments.push({
      text: text.substring(currentPos),
      isHighlighted: false
    });
  }

  return segments;
}

/**
 * Get unique patterns from text
 * @param text - The text to search
 * @param patterns - Array of patterns to find
 * @returns Array of patterns found in text
 */
export function findPatternsInText(text: string, patterns: Pattern[]): Pattern[] {
  if (!text || !patterns || patterns.length === 0) {
    return [];
  }

  const textLower = text.toLowerCase();
  const foundPatterns: Pattern[] = [];
  const seenPatterns = new Set<string>();

  patterns.forEach(pattern => {
    const patternLower = pattern.pattern.toLowerCase();
    if (textLower.includes(patternLower) && !seenPatterns.has(patternLower)) {
      seenPatterns.add(patternLower);
      foundPatterns.push(pattern);
    }
  });

  return foundPatterns;
}
