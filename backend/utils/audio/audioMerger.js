const ffmpeg = require("fluent-ffmpeg");
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
const fs = require("fs");
const path = require("path");
const os = require("os");
const logger = require('../common/logger.js'); // Winston logger

// Set FFmpeg path from @ffmpeg-installer/ffmpeg (works on all platforms including Docker/Nixpacks)
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
logger.info(`✅ FFmpeg path set: ${ffmpegInstaller.path}`);

/**
 * Get the duration of an audio file in seconds using ffprobe.
 * @param {string} filePath - Path to the audio file.
 * @returns {Promise<number>} Duration in seconds.
 */
async function getAudioDuration(filePath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
                logger.warn(`Failed to get audio duration via ffprobe: ${err.message}`);
                reject(err);
                return;
            }
            const duration = metadata?.format?.duration;
            if (typeof duration === 'number' && !isNaN(duration)) {
                resolve(duration);
            } else {
                reject(new Error('Could not extract duration from ffprobe metadata'));
            }
        });
    });
}

/**
 * Get the duration of an audio buffer in seconds.
 * Writes buffer to temp file, probes it, then cleans up.
 * @param {Buffer} audioBuffer - Audio buffer to measure.
 * @returns {Promise<number>} Duration in seconds.
 */
async function getBufferDuration(audioBuffer) {
    const tempPath = path.join(os.tmpdir(), `duration_probe_${Date.now()}.mp3`);
    try {
        fs.writeFileSync(tempPath, audioBuffer);
        const duration = await getAudioDuration(tempPath);
        return duration;
    } finally {
        try {
            if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
            }
        } catch (cleanupErr) {
            logger.warn(`Failed to cleanup temp duration probe file: ${cleanupErr.message}`);
        }
    }
}

/**
 * Merges multiple MP3 audio segments (Buffers) into a single MP3 file using ffmpeg.
 * @param {Buffer[]} audioSegments Array of audio Buffers.
 * @param {string} outputFilePath The final MP3 output path.
 * @returns {Promise<boolean>} True if merge successful, false if failed.
 */
async function mergeAudioSegments(audioSegments, outputFilePath) {
    if (!audioSegments || audioSegments.length === 0) {
        logger.warn("No audio segments provided for merging.");
        return false;
    }

    logger.info(`🔊 Starting merge of ${audioSegments.length} segments to: ${outputFilePath}`);

    let tempDir;
    try {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "lingroot-audio-"));
        logger.debug(`🗂️ Created temp dir: ${tempDir}`);
    } catch (err) {
        logger.error("❌ Temp dir creation failed:", err);
        return false;
    }

    const tempFilePaths = [];
    let mergeInputList = "";

    try {
        // Write all audio segments to temp files
        for (let i = 0; i < audioSegments.length; i++) {
            if (audioSegments[i] && audioSegments[i].length > 0) {
                const tempFilePath = path.join(tempDir, `segment_${i}.mp3`);
                fs.writeFileSync(tempFilePath, audioSegments[i]);
                tempFilePaths.push(tempFilePath);
                mergeInputList += `file '${tempFilePath.replace(/\\/g, "/")}'\n`;
                logger.debug(`✅ Segment ${i + 1} written: ${tempFilePath}`);
            } else {
                logger.warn(`⚠️ Skipping empty audio segment ${i + 1}`);
            }
        }

        if (tempFilePaths.length === 0) {
            logger.error("❌ No valid audio segments found. Aborting merge.");
            return false;
        }

        // Write the FFmpeg concat list
        const listFilePath = path.join(tempDir, "mylist.txt");

        if (!mergeInputList.trim()) {
            logger.error("❌ FFmpeg list content is empty. Cannot proceed.");
            return false;
        }

        fs.writeFileSync(listFilePath, mergeInputList, 'utf8');
        logger.debug(`📄 FFmpeg list file created: ${listFilePath}`);

        // Ensure output directory exists
        const outputDir = path.dirname(outputFilePath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
            logger.info(`📁 Output directory created: ${outputDir}`);
        }

        // Run FFmpeg to merge files with proper encoding
        return await new Promise((resolve, reject) => {
            ffmpeg()
                .input(listFilePath)
                .inputOptions(["-f concat", "-safe 0"])
                .outputOptions([
                    "-c:a libmp3lame",  // Force MP3 encoding
                    "-b:a 128k",        // Set bitrate
                    "-ar 24000",        // Set sample rate to match Google TTS
                    "-ac 1",            // Mono channel
                    "-f mp3"            // Force MP3 format
                ])
                .save(outputFilePath)
                .on("start", (cmd) => logger.debug(`▶️ FFmpeg started: ${cmd}`))
                .on("end", () => {
                    logger.info(`🎉 Merge complete: ${outputFilePath}`);
                    resolve(true);
                })
                .on("error", (err) => {
                    logger.error(`❌ FFmpeg error: ${err.message}`, { err });
                    if (fs.existsSync(outputFilePath)) {
                        try {
                            fs.unlinkSync(outputFilePath);
                            logger.warn(`🧹 Removed corrupted output: ${outputFilePath}`);
                        } catch (unlinkErr) {
                            logger.error(`❌ Failed to delete output: ${unlinkErr.message}`);
                        }
                    }
                    reject(err);
                });
        });

    } catch (e) {
        logger.error(`❌ Unexpected error in mergeAudioSegments: ${e.message}`, { e });
        return false;
    } finally {
        // Cleanup temp directory
        try {
            if (tempDir && fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
                logger.info(`🧼 Cleaned temp directory: ${tempDir}`);
            }
        } catch (cleanupErr) {
            logger.error(`❌ Cleanup error: ${cleanupErr.message}`);
        }
    }
}

/**
 * Merges multiple MP3 audio segments (Buffers) and returns the merged audio as Buffer.
 * @param {Buffer[]} audioSegments Array of audio Buffers.
 * @param {Object} [options] Options object.
 * @param {boolean} [options.includeDuration=false] If true, returns {buffer, duration} instead of just buffer.
 * @param {number} [options.bitrateKbps=128] Output MP3 bitrate.
 * @param {number} [options.sampleRateHertz=24000] Output sample rate.
 * @returns {Promise<Buffer|{buffer: Buffer, duration: number}|null>} Merged audio Buffer (or object with duration) or null if failed.
 */
async function mergeAudioSegmentsToBuffer(audioSegments, options = {}) {
    const {
        includeDuration = false,
        normalize = false,
        bitrateKbps = 128,
        sampleRateHertz = 24000,
    } = options;

    if (!audioSegments || audioSegments.length === 0) {
        logger.warn("No audio segments provided for merging.");
        return null;
    }

    // Load test mode: optionally skip FFmpeg merge and concatenate buffers
    const { isLoadTestMode, shouldSkipFFmpeg } = require('../../tests/load/mocks/mockConfig');
    if (isLoadTestMode() && shouldSkipFFmpeg()) {
        logger.info('[LOAD_TEST] Skipping FFmpeg merge, returning concatenated buffer');
        return Buffer.concat(audioSegments.filter(Boolean));
    }

    // Standard single-segment output can be returned unchanged. High-quality
    // output still passes through FFmpeg so mastering and encode settings apply.
    if (audioSegments.length === 1 && !normalize && bitrateKbps === 128 && sampleRateHertz === 24000) {
        logger.info("Single audio segment, returning as-is");
        if (includeDuration) {
            try {
                const duration = await getBufferDuration(audioSegments[0]);
                logger.info(`Single segment duration: ${duration.toFixed(2)}s`);
                return { buffer: audioSegments[0], duration };
            } catch (durationErr) {
                logger.warn(`Could not get duration for single segment: ${durationErr.message}`);
                return { buffer: audioSegments[0], duration: null };
            }
        }
        return audioSegments[0];
    }

    logger.info(`Starting merge of ${audioSegments.length} segments to Buffer`);

    let tempDir;
    try {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "lingroot-audio-"));
        logger.debug(`Created temp dir: ${tempDir}`);
    } catch (err) {
        logger.error("Temp dir creation failed:", err);
        return null;
    }

    const tempFilePaths = [];
    let mergeInputList = "";
    const outputFilePath = path.join(tempDir, "merged_output.mp3");

    try {
        // Write all audio segments to temp files
        for (let i = 0; i < audioSegments.length; i++) {
            if (audioSegments[i] && audioSegments[i].length > 0) {
                const tempFilePath = path.join(tempDir, `segment_${i}.mp3`);
                fs.writeFileSync(tempFilePath, audioSegments[i]);
                tempFilePaths.push(tempFilePath);
                mergeInputList += `file '${tempFilePath.replace(/\\/g, "/")}'\n`;
                logger.debug(`Segment ${i + 1} written: ${tempFilePath}`);
            } else {
                logger.warn(`Skipping empty audio segment ${i + 1}`);
            }
        }

        if (tempFilePaths.length === 0) {
            logger.error("No valid audio segments found. Aborting merge.");
            return null;
        }

        // Write the FFmpeg concat list
        const listFilePath = path.join(tempDir, "mylist.txt");

        if (!mergeInputList.trim()) {
            logger.error("FFmpeg list content is empty. Cannot proceed.");
            return null;
        }

        fs.writeFileSync(listFilePath, mergeInputList, 'utf8');
        logger.debug(`FFmpeg list file created: ${listFilePath}`);

        // Run FFmpeg to merge files with proper encoding
        const success = await new Promise((resolve, reject) => {
            const command = ffmpeg()
                .input(listFilePath)
                .inputOptions(["-f concat", "-safe 0"]);
            if (normalize) {
                command.audioFilters('loudnorm=I=-16:TP=-1.5:LRA=11');
            }
            command
                .outputOptions([
                    "-c:a libmp3lame",  // Force MP3 encoding
                    `-b:a ${bitrateKbps}k`,
                    `-ar ${sampleRateHertz}`,
                    "-ac 1",            // Mono channel
                    "-f mp3"            // Force MP3 format
                ])
                .save(outputFilePath)
                .on("start", (cmd) => logger.debug(`FFmpeg started: ${cmd}`))
                .on("end", () => {
                    logger.info(`Merge complete: ${outputFilePath}`);
                    resolve(true);
                })
                .on("error", (err) => {
                    logger.error(`FFmpeg error: ${err.message}`, { err });
                    reject(err);
                });
        });

        if (!success) {
            logger.error("FFmpeg merge failed");
            return null;
        }

        // Read the merged file as Buffer
        if (fs.existsSync(outputFilePath)) {
            const mergedBuffer = fs.readFileSync(outputFilePath);
            logger.info(`Merged audio buffer created - Size: ${mergedBuffer.length} bytes`);

            // Get duration if requested
            if (includeDuration) {
                try {
                    const duration = await getAudioDuration(outputFilePath);
                    logger.info(`Merged audio duration: ${duration.toFixed(2)}s`);
                    return { buffer: mergedBuffer, duration };
                } catch (durationErr) {
                    logger.warn(`Could not get merged audio duration: ${durationErr.message}`);
                    return { buffer: mergedBuffer, duration: null };
                }
            }

            return mergedBuffer;
        } else {
            logger.error("Merged output file not found");
            return null;
        }

    } catch (e) {
        logger.error(`Unexpected error in mergeAudioSegmentsToBuffer: ${e.message}`, { e });
        return null;
    } finally {
        // Cleanup temp directory
        try {
            if (tempDir && fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
                logger.info(`Cleaned temp directory: ${tempDir}`);
            }
        } catch (cleanupErr) {
            logger.error(`Cleanup error: ${cleanupErr.message}`);
        }
    }
}

module.exports = {
    mergeAudioSegments,
    mergeAudioSegmentsToBuffer,
    getAudioDuration,
    getBufferDuration
};
