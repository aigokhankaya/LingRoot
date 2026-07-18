import type { SubtitleCue } from "../core/types.js";

const MAX_WORDS_PER_CAPTION = 7;
const MAX_WORDS_PER_MERGED_CAPTION = 11;
const MIN_CAPTION_DURATION_MS = 1200;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function quoteCount(text: string, quote: string): number {
  return [...text].filter((character) => character === quote).length;
}

function captionChunks(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+(?:['"])?|[^.!?]+$/g) ?? [text];
  return sentences.flatMap((sentence) => {
    const words = sentence.trim().split(/\s+/).filter(Boolean);
    const chunks: string[] = [];
    for (let index = 0; index < words.length; index += MAX_WORDS_PER_CAPTION) {
      chunks.push(words.slice(index, index + MAX_WORDS_PER_CAPTION).join(" "));
    }
    return chunks;
  });
}

export function readableSubtitleCues(cues: SubtitleCue[]): SubtitleCue[] {
  const splitCues = cues.flatMap((cue) => {
    const chunks = captionChunks(cue.text);
    const weights = chunks.map((chunk) => chunk.split(/\s+/).length);
    const totalWeight = weights.reduce((total, weight) => total + weight, 0);
    const duration = cue.endMs - cue.startMs;
    let elapsedWeight = 0;
    return chunks.map((text, index) => {
      const startMs = Math.round(
        cue.startMs + (duration * elapsedWeight) / totalWeight,
      );
      elapsedWeight += weights[index]!;
      const endMs =
        index === chunks.length - 1
          ? cue.endMs
          : Math.round(cue.startMs + (duration * elapsedWeight) / totalWeight);
      return { sceneId: cue.sceneId, text, startMs, endMs };
    });
  });

  const readable: SubtitleCue[] = [];
  for (let index = 0; index < splitCues.length; index += 1) {
    const cue = splitCues[index]!;
    const previous = readable.at(-1);
    const leadingQuote = cue.text.match(/^(['"])\s*/)?.[1];
    if (
      leadingQuote
      && previous?.sceneId === cue.sceneId
      && quoteCount(previous.text, leadingQuote) % 2 === 1
    ) {
      previous.text += leadingQuote;
      cue.text = cue.text.replace(/^(['"])\s*/, "");
    }
    if (cue.endMs - cue.startMs >= MIN_CAPTION_DURATION_MS) {
      readable.push(cue);
      continue;
    }

    const mergeTarget = readable.at(-1);
    if (
      mergeTarget?.sceneId === cue.sceneId
      && wordCount(mergeTarget.text) + wordCount(cue.text) <= MAX_WORDS_PER_MERGED_CAPTION
    ) {
      mergeTarget.text = `${mergeTarget.text} ${cue.text}`;
      mergeTarget.endMs = cue.endMs;
      continue;
    }

    const next = splitCues[index + 1];
    if (
      next?.sceneId === cue.sceneId
      && wordCount(cue.text) + wordCount(next.text) <= MAX_WORDS_PER_MERGED_CAPTION
    ) {
      next.text = `${cue.text} ${next.text}`;
      next.startMs = cue.startMs;
      continue;
    }

    readable.push(cue);
  }
  return readable;
}
