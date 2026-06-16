const { synthesizeWithGoogle } = require('../../googleTTS.js');

async function synthesizeChunkWithNeural2(chunk, options = {}) {
  const voiceName = chunk.voice.fallbackVoiceName;
  const languageCode = chunk.voice.languageCode;

  const result = await synthesizeWithGoogle({
    text: chunk.combinedText,
    voiceName,
    languageCode,
    speakingRate: options.speakingRate || 1.0,
    userId: options.userId || null,
  });

  return {
    ...chunk,
    audioBuffer: Buffer.from(result.audioContent),
    wordCount: chunk.combinedWordCount,
    duration: result.totalDuration || null,
    durationEstimated: false,
    provider: 'neural2',
    nativeWordTimings: result.wordTimings || [],
  };
}

module.exports = {
  synthesizeChunkWithNeural2,
};
