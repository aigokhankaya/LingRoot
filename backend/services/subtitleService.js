const logger = require('../utils/common/logger.js');

/**
 * Format time as MM:SS.mmm
 * @param {number} seconds 
 * @returns {string} Formatted time string
 */
const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const millisecs = Math.floor((seconds % 1) * 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millisecs.toString().padStart(3, '0')}`;
};

/**
 * Helper function to create VTT file from text (time-based estimation)
 * @param {string} text - Full text content
 * @param {number} duration - Total audio duration in seconds
 * @returns {string} VTT content
 */
const createVTTFile = (text, duration = 30) => {
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const wordsPerLine = 5; // Kaç kelime per subtitle satırı

    let vttContent = 'WEBVTT\n\n';

    for (let i = 0; i < words.length; i += wordsPerLine) {
        const lineWords = words.slice(i, i + wordsPerLine);
        const startTime = (i / words.length) * duration;
        const endTime = ((i + wordsPerLine) / words.length) * duration;

        vttContent += `${formatTime(startTime)} --> ${formatTime(endTime)}\n`;
        vttContent += `${lineWords.join(' ')}\n\n`;
    }

    return vttContent;
};

/**
 * Helper function to create word-level VTT file (estimation)
 * @param {string} text 
 * @param {number} duration 
 * @returns {string} VTT content
 */
const createWordLevelVTT = (text, duration = 30) => {
    const words = text.split(/\s+/).filter(word => word.length > 0);

    let vttContent = 'WEBVTT\n\n';

    words.forEach((word, index) => {
        const startTime = (index / words.length) * duration;
        const endTime = ((index + 1) / words.length) * duration;

        vttContent += `${formatTime(startTime)} --> ${formatTime(endTime)}\n`;
        vttContent += `${word}\n\n`;
    });

    return vttContent;
};

/**
 * Helper function to create VTT from real word timings
 * @param {Array} wordTimings - Array of word timing objects
 * @param {number} totalDuration - Total duration
 * @returns {string} VTT content
 */
const createWordLevelVTTFromTimings = (wordTimings, totalDuration) => {
    let vttContent = 'WEBVTT\n\n';

    wordTimings.forEach((timing, index) => {
        vttContent += `${formatTime(timing.startTime)} --> ${formatTime(timing.endTime)}\n`;
        vttContent += `${timing.word}\n\n`;
    });

    return vttContent;
};

/**
 * Helper function to create word-level VTT file from optimized timings
 * @param {Array} wordTimings 
 * @param {Array} cleanWords 
 * @param {Array} originalWords 
 * @returns {string} VTT content
 */
const createWordLevelVTTFromOptimizedTimings = (wordTimings, cleanWords, originalWords) => {
    let vttContent = 'WEBVTT\n\n';

    // Her temiz kelime için VTT cue oluştur
    wordTimings.forEach((timing, index) => {
        // Timing'de endTimeSeconds kullan
        const startTime = timing.timeSeconds || timing.startTime || 0;
        const endTime = timing.endTimeSeconds || timing.endTime || (startTime + 0.5);

        vttContent += `${formatTime(startTime)} --> ${formatTime(endTime)}\n`;
        vttContent += `${timing.word}\n\n`;
    });

    return vttContent;
};

/**
 * Helper function to match all words with timings (interpolate for missing)
 * @param {Array} allWords 
 * @param {Array} wordTimings 
 * @param {number} totalDuration 
 * @returns {Array} Array of timepoints with matched info
 */
const matchWordsWithTimings = (allWords, wordTimings, totalDuration) => {
    const timepoints = [];
    let timingIndex = 0;

    // Step 1: Sequential matching with hyphenated word handling
    const matched = new Array(allWords.length).fill(null);

    for (let i = 0; i < allWords.length; i++) {
        if (timingIndex >= wordTimings.length) break;

        const originalWord = allWords[i];
        const cleanWord = originalWord.toLowerCase().replace(/[^\w-]/g, '');

        // Check if this is a hyphenated word (e.g., "solid-state")
        if (cleanWord.includes('-')) {
            const parts = cleanWord.split('-').filter(p => p.length > 0);

            // Check if next N timings match the parts
            let allPartsMatch = true;
            const matchedTimings = [];

            for (let j = 0; j < parts.length; j++) {
                if (timingIndex + j >= wordTimings.length) {
                    allPartsMatch = false;
                    break;
                }

                const timingWord = wordTimings[timingIndex + j].word.toLowerCase().replace(/[^\w]/g, '');
                if (timingWord !== parts[j]) {
                    allPartsMatch = false;
                    break;
                }
                matchedTimings.push(wordTimings[timingIndex + j]);
            }

            if (allPartsMatch && matchedTimings.length > 0) {
                // Merge timings for hyphenated word
                const firstTiming = matchedTimings[0];
                const lastTiming = matchedTimings[matchedTimings.length - 1];

                matched[i] = {
                    timeSeconds: firstTiming.timeSeconds,
                    endTimeSeconds: lastTiming.endTimeSeconds,
                    word: originalWord,
                    index: i,
                    hasRealTiming: true
                };

                timingIndex += matchedTimings.length;
                continue;
            }
        }

        // Regular word matching
        const timingWord = wordTimings[timingIndex].word.toLowerCase().replace(/[^\w]/g, '');
        const cleanWordNoHyphen = cleanWord.replace(/-/g, '');

        if (timingWord === cleanWordNoHyphen || timingWord === cleanWord) {
            matched[i] = {
                timeSeconds: wordTimings[timingIndex].timeSeconds,
                endTimeSeconds: wordTimings[timingIndex].endTimeSeconds,
                word: originalWord,
                index: i,
                hasRealTiming: true
            };
            timingIndex++;
        } else {
            // Try to find the word in upcoming timings (skip max 3 timings)
            let found = false;
            for (let skip = 1; skip <= 3 && timingIndex + skip < wordTimings.length; skip++) {
                const nextTimingWord = wordTimings[timingIndex + skip].word.toLowerCase().replace(/[^\w]/g, '');
                if (nextTimingWord === cleanWordNoHyphen || nextTimingWord === cleanWord) {
                    // Found it - skip the mismatched timings
                    logger.warn(`⚠️ Skipped ${skip} timing(s) to match word "${originalWord}" at index ${i}`);
                    timingIndex += skip;

                    matched[i] = {
                        timeSeconds: wordTimings[timingIndex].timeSeconds,
                        endTimeSeconds: wordTimings[timingIndex].endTimeSeconds,
                        word: originalWord,
                        index: i,
                        hasRealTiming: true
                    };
                    timingIndex++;
                    found = true;
                    break;
                }
            }

            if (!found) {
                logger.warn(`⚠️ No timing match for word "${originalWord}" at index ${i}, timing index ${timingIndex}`);
            }
        }
    }

    // Log matching statistics
    const matchedCount = matched.filter(m => m !== null).length;
    logger.info(`📊 Matching stats: ${matchedCount}/${allWords.length} words matched, ${wordTimings.length} timings available`);

    // Step 3: Interpolate missing timings
    for (let i = 0; i < allWords.length; i++) {
        if (matched[i]) {
            timepoints.push(matched[i]);
        } else {
            // Find previous and next real timings
            let prevTiming = null;
            let nextTiming = null;

            for (let j = i - 1; j >= 0; j--) {
                if (matched[j]) {
                    prevTiming = matched[j];
                    break;
                }
            }

            for (let j = i + 1; j < allWords.length; j++) {
                if (matched[j]) {
                    nextTiming = matched[j];
                    break;
                }
            }

            // Interpolate based on surrounding timings
            let startTime, endTime;

            if (prevTiming && nextTiming) {
                // Between two real timings - linear interpolation
                const gapWords = nextTiming.index - prevTiming.index;
                const gapDuration = nextTiming.timeSeconds - prevTiming.endTimeSeconds;
                const wordDuration = gapDuration / gapWords;
                const wordsFromPrev = i - prevTiming.index;

                startTime = prevTiming.endTimeSeconds + (wordDuration * wordsFromPrev);
                endTime = startTime + wordDuration;
            } else if (prevTiming) {
                // After last real timing
                const avgDuration = 0.3; // 300ms default
                startTime = prevTiming.endTimeSeconds + (avgDuration * (i - prevTiming.index - 1));
                endTime = startTime + avgDuration;
            } else if (nextTiming) {
                // Before first real timing
                const avgDuration = nextTiming.timeSeconds / nextTiming.index;
                startTime = avgDuration * i;
                endTime = startTime + avgDuration;
            } else {
                // No real timings at all - use average
                const avgDuration = totalDuration / allWords.length;
                startTime = avgDuration * i;
                endTime = startTime + avgDuration;
            }

            timepoints.push({
                timeSeconds: startTime,
                endTimeSeconds: endTime,
                word: allWords[i],
                index: i,
                hasRealTiming: false
            });
        }
    }

    return timepoints;
};

module.exports = {
    createVTTFile,
    createWordLevelVTT,
    createWordLevelVTTFromTimings,
    createWordLevelVTTFromOptimizedTimings,
    matchWordsWithTimings,
    formatTime
};
