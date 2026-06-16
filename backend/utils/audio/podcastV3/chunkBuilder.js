function getUtf8ByteLength(str) {
  return Buffer.byteLength(String(str || ''), 'utf8');
}

function createChunkFromTurns(turns, speaker, chunkIndex, voiceConfig) {
  const combinedText = turns.map((turn) => turn.text).join(' ');
  return {
    chunkId: `${speaker}_${chunkIndex}`,
    chunkIndex,
    originalIndex: chunkIndex,
    speaker,
    voice: {
      providerVoiceId: speaker === 'A' ? voiceConfig.host.geminiSpeakerId : voiceConfig.guest.geminiSpeakerId,
      fallbackVoiceName: speaker === 'A' ? voiceConfig.host.fallbackVoiceName : voiceConfig.guest.fallbackVoiceName,
      languageCode: speaker === 'A' ? voiceConfig.host.languageCode : voiceConfig.guest.languageCode,
    },
    speakerLabel: speaker === 'A' ? 'Host' : 'Guest',
    turns,
    text: combinedText,
    combinedText,
    combinedWordCount: turns.reduce((sum, turn) => sum + turn.wordCount, 0),
    estimatedBytes: getUtf8ByteLength(combinedText),
  };
}

function buildSpeakerChunks(speakerTurns, speaker, voicePlan, profile) {
  if (!speakerTurns || speakerTurns.length === 0) {
    return [];
  }

  const maxInputBytes = profile?.chunking?.maxInputBytes || 2400;
  const maxTurnsPerChunk = profile?.chunking?.maxTurnsPerChunk || 4;

  const chunks = [];
  let currentTurns = [];
  let currentText = '';
  let chunkIndex = 0;

  for (const turn of speakerTurns) {
    const nextText = currentTurns.length > 0 ? `${currentText} ${turn.text}` : turn.text;
    const nextBytes = getUtf8ByteLength(nextText);
    const wouldOverflow = currentTurns.length >= maxTurnsPerChunk || nextBytes > maxInputBytes;

    if (currentTurns.length > 0 && wouldOverflow) {
      chunks.push(createChunkFromTurns(currentTurns, speaker, chunkIndex, voicePlan));
      chunkIndex += 1;
      currentTurns = [turn];
      currentText = turn.text;
      continue;
    }

    currentTurns.push(turn);
    currentText = nextText;
  }

  if (currentTurns.length > 0) {
    chunks.push(createChunkFromTurns(currentTurns, speaker, chunkIndex, voicePlan));
  }

  return chunks;
}

function buildPodcastChunks(groupedTurns, voicePlan, profile) {
  return {
    hostChunks: buildSpeakerChunks(groupedTurns.hostTurns, 'A', voicePlan, profile),
    guestChunks: buildSpeakerChunks(groupedTurns.guestTurns, 'B', voicePlan, profile),
  };
}

module.exports = {
  buildPodcastChunks,
  buildSpeakerChunks,
  getUtf8ByteLength,
};
