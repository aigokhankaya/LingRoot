const fs = require('fs');
const os = require('os');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const { v4: uuidv4 } = require('uuid');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function buildTurnBoundariesFromChunk(chunkSegment) {
  const turns = chunkSegment.turns || [];
  const wordTimings = chunkSegment.wordTimings || [];
  const chunkDuration = chunkSegment.duration || 0;

  let cursor = 0;
  let previousEnd = 0;

  return turns.map((turn, index) => {
    const turnWordCount = turn.wordCount || 0;
    const turnWordTimings = wordTimings.slice(cursor, cursor + turnWordCount);
    cursor += turnWordCount;

    const firstTiming = turnWordTimings[0];
    const lastTiming = turnWordTimings[turnWordTimings.length - 1];

    const startTime = firstTiming?.startTime ?? previousEnd;
    const rawEndTime = lastTiming?.endTime ?? startTime;
    const fallbackEndTime = index === turns.length - 1 ? chunkDuration : Math.max(startTime + 0.2, rawEndTime);
    const endTime = rawEndTime > startTime ? rawEndTime : fallbackEndTime;

    previousEnd = endTime;

    return {
      turn,
      startTime,
      endTime,
      duration: Math.max(0.15, endTime - startTime),
      wordTimings: turnWordTimings.map((timing) => ({
        ...timing,
        startTime: timing.startTime - startTime,
        endTime: timing.endTime - startTime,
      })),
    };
  });
}

async function sliceMp3BufferByRanges(audioBuffer, ranges, totalDuration) {
  if (ranges.length === 1) {
    return [audioBuffer];
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'podcast-v3-split-'));
  const inputPath = path.join(tempDir, `${uuidv4()}.mp3`);
  fs.writeFileSync(inputPath, audioBuffer);

  try {
    const buffers = [];
    for (let i = 0; i < ranges.length; i++) {
      const range = ranges[i];
      const paddedStart = clamp(range.startTime - 0.01, 0, totalDuration || range.endTime);
      const paddedEnd = clamp(range.endTime + 0.01, paddedStart + 0.1, totalDuration || range.endTime + 0.1);
      const duration = Math.max(0.1, paddedEnd - paddedStart);
      const outputPath = path.join(tempDir, `turn_${i}.mp3`);

      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .setStartTime(paddedStart)
          .duration(duration)
          .audioCodec('libmp3lame')
          .audioBitrate('128k')
          .audioFrequency(24000)
          .audioChannels(1)
          .format('mp3')
          .save(outputPath)
          .on('end', resolve)
          .on('error', reject);
      });

      buffers.push(fs.readFileSync(outputPath));
    }

    return buffers;
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_) {
      // ignore cleanup failures
    }
  }
}

async function splitAlignedChunkSegmentsToTurns(alignedSpeakerResult) {
  const turnSegments = [];
  const alignedSegments = alignedSpeakerResult?.alignedSegments || [];

  for (const chunkSegment of alignedSegments) {
    const boundaries = buildTurnBoundariesFromChunk(chunkSegment);
    const splitBuffers = await sliceMp3BufferByRanges(
      chunkSegment.audioBuffer,
      boundaries,
      chunkSegment.duration || 0
    );

    for (let i = 0; i < boundaries.length; i++) {
      const boundary = boundaries[i];
      turnSegments.push({
        originalIndex: boundary.turn.originalIndex,
        speaker: boundary.turn.speaker,
        speakerLabel: boundary.turn.speaker === 'A' ? 'Host' : 'Guest',
        text: boundary.turn.text,
        audioBuffer: splitBuffers[i],
        duration: boundary.duration,
        wordTimings: boundary.wordTimings,
        wordCount: boundary.turn.wordCount,
        sourceChunkId: chunkSegment.chunkId,
      });
    }
  }

  return turnSegments.sort((left, right) => left.originalIndex - right.originalIndex);
}

module.exports = {
  splitAlignedChunkSegmentsToTurns,
};
