/**
 * MFA Aligner Mock for Load Testing
 *
 * Generates synthetic word-level timestamps based on word count.
 * Simulates the timing distribution of real MFA alignment.
 */

/**
 * Generate mock word timestamps from transcript text
 * @param {string} transcript - Input text
 * @param {number} avgWordDuration - Average duration per word in seconds
 * @returns {Array} Array of {word, startTime, endTime} objects
 */
function generateMockTimestamps(transcript, avgWordDuration = 0.35) {
  const words = (transcript || '')
    .replace(/[.,!?;:"\-]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0);

  const timestamps = [];
  let currentTime = 0;

  for (const word of words) {
    // Vary duration slightly for realism
    const variation = 0.8 + Math.random() * 0.4; // 0.8x to 1.2x
    const duration = avgWordDuration * variation;

    timestamps.push({
      word,
      startTime: parseFloat(currentTime.toFixed(3)),
      endTime: parseFloat((currentTime + duration).toFixed(3)),
    });

    currentTime += duration;
  }

  return timestamps;
}

module.exports = {
  generateMockTimestamps,
};
