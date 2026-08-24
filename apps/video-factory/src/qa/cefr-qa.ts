import type { CefrLevel, LevelPackage, QaCheck } from "../core/types.js";

const ORDER: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
const MAX_SENTENCE_WORDS: Record<CefrLevel, number> = {
  A1: 6,
  A2: 9,
  B1: 14,
  B2: 20,
  C1: 28,
  C2: 40,
};

function sentenceWordCounts(text: string): number[] {
  return text
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim().split(/\s+/).filter(Boolean).length)
    .filter((count) => count > 0);
}

export function runCefrQa(levelPackages: LevelPackage[]): QaCheck[] {
  const checks: QaCheck[] = [];
  const ordered = [...levelPackages].sort(
    (left, right) => ORDER.indexOf(left.level) - ORDER.indexOf(right.level),
  );
  for (const levelPackage of ordered) {
    const sentenceCounts = levelPackage.script.lines.flatMap((line) =>
      sentenceWordCounts(line.text),
    );
    const maxWords = Math.max(...sentenceCounts, 0);
    checks.push({
      id: "cefr-sentence-length",
      level: levelPackage.level,
      severity: "error",
      passed: maxWords <= MAX_SENTENCE_WORDS[levelPackage.level],
      message: `Longest sentence contains ${maxWords} word(s); ${levelPackage.level} limit is ${MAX_SENTENCE_WORDS[levelPackage.level]}.`,
    });
    checks.push({
      id: "cefr-speaking-rate-present",
      level: levelPackage.level,
      severity: "error",
      passed:
        typeof levelPackage.audio.speakingRate === "number" &&
        levelPackage.audio.speakingRate > 0,
      message:
        typeof levelPackage.audio.speakingRate === "number"
          ? `Speaking rate is ${levelPackage.audio.speakingRate}.`
          : "LingRoot Core did not provide speakingRate.",
    });
  }
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    const previousRate = previous.audio.speakingRate;
    const currentRate = current.audio.speakingRate;
    checks.push({
      id: "cefr-speaking-rate-progression",
      level: current.level,
      severity: "error",
      passed:
        typeof previousRate === "number" &&
        typeof currentRate === "number" &&
        currentRate > previousRate,
      message: `${previous.level} rate ${previousRate ?? "missing"}; ${current.level} rate ${currentRate ?? "missing"}.`,
    });
  }
  return checks;
}
