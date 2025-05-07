export async function cleanTranscriptWithPrompt(rawTranscript: string): Promise<string> {
  const prompt = `You are given a raw transcript extracted from a YouTube video.\nThe transcript has no punctuation, and may contain unnatural breaks or TTS-incompatible characters.\nYour job is to clean and reformat this text for use in Text-to-Speech (TTS) systems, making it fluent, safe, and grammatically correct.\nOBJECTIVES: Add punctuation (periods, commas, question marks). Fix capitalization and sentence boundaries. Rebuild fluent, natural spoken-style sentences. Remove repeated fragments, metadata, filler words, and timestamps.\nTTS-SPECIFIC CLEANUP: Remove all non-verbal and non-alphabetic characters that may break TTS output. This includes: //, /, -, --, ‘, ’, ', ", *, (...), [...], timestamps, HTML tags, special markers, and any bracketed content. Replace malformed apostrophes or quotes with standard characters if needed. Do NOT add any symbols, emojis, or special characters back into the text.\nSTYLE: Spoken English tone. Paragraphs only, no lists, no formatting. Suitable for audio narration.\nINPUT:\n---\n${rawTranscript}\n---\nOUTPUT: Return only the fully cleaned, grammatically correct, TTS-compatible transcript.`;
  const res = await fetch('/api/clean-transcript', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  if (!res.ok) throw new Error('Transcript temizlenemedi.');
  const data = await res.json();
  return data.cleanedText as string;
} 