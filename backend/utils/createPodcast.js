const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const OpenAI = require("openai");
const logger = require('./logger');
const { synthesizeWithGoogle } = require('./googleTTS');
const { mergeAudioSegmentsToBuffer } = require('./audioMerger');
const { uploadToSupabase } = require('./storageUploader');

// Initialize OpenAI
let openai = null;
if (process.env.OPENAI_API_KEY) {
    try {
        openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    } catch (e) {
        logger.error("Failed to initialize OpenAI client for podcast generation:", e);
    }
}

/**
 * Generates a podcast script using OpenAI
 * @param {string} topic 
 * @param {string} level 
 * @param {number} duration 
 * @returns {Promise<Object>} The script object { title, description, dialogue: [] }
 */
async function generatePodcastScript(topic, level = 'B1', duration = 5) {
    if (!openai) throw new Error("OpenAI not initialized");

    const promptPath = path.join(__dirname, '../prompts/content/generate_podcast_script.txt');
    let promptTemplate = fs.readFileSync(promptPath, 'utf8');

    const prompt = promptTemplate
        .replace('{{topic}}', topic)
        .replace('{{level}}', level)
        .replace('{{duration}}', duration)
        .replace('{{level}}', level) // Replace again for Roles description
        .replace('{{level}}', level); // Replace again for language instruction

    logger.info(`[Podcast] Generating script for topic: "${topic}" (${level})`);

    const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: "You are a creative podcast script writer. Output valid JSON only." },
            { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response from OpenAI");

    try {
        return JSON.parse(content);
    } catch (e) {
        logger.error("Failed to parse podcast script JSON:", content);
        throw new Error("Invalid JSON response from OpenAI");
    }
}

/**
 * Creates a multi-speaker podcast
 * @param {string} topic 
 * @param {string} level 
 * @param {number} durationMinutes 
 * @returns {Promise<Object>} { audioUrl, vttUrl, title, description, duration }
 */
async function createPodcast(topic, level = 'B1', durationMinutes = 5) {
    const requestId = uuidv4();
    logger.info(`[${requestId}] Starting podcast creation: ${topic} (${level})`);

    try {
        // 1. Generate Script
        const script = await generatePodcastScript(topic, level, durationMinutes);
        logger.info(`[${requestId}] Script generated: ${script.title} (${script.dialogue.length} turns)`);

        // 2. Assign Voices
        // Host: US Journey Female (friendly, clear)
        // Expert: US Journey Male (authoritative, deep)
        const hostVoice = 'en-US-Journey-F';
        const expertVoice = 'en-US-Journey-D';

        const audioSegments = [];
        let combinedText = ""; // For transcript/VTT generation
        const wordTimings = []; // For accurate VTT
        let currentTimeOffset = 0;

        // 3. Synthesize Each Turn
        for (const turn of script.dialogue) {
            const speaker = turn.speaker.toLowerCase();
            const text = turn.text;
            const voiceName = speaker === 'host' ? hostVoice : expertVoice;

            logger.info(`[${requestId}] Synthesizing turn: ${speaker} (${text.length} chars)`);

            // Synthesize audio
            const ttsResult = await synthesizeWithGoogle({
                text,
                voiceName,
                languageCode: 'en-US',
                speakingRate: 1.0,
                volumeGainDb: 0
            });

            if (ttsResult && ttsResult.audioContent) {
                audioSegments.push(ttsResult.audioContent);

                // Add silence between turns (0.5s)
                // Note: synthesizeWithGoogle returns raw audio. 
                // We might need a silence buffer. audioMerger handles just concat.
                // ideally we would add silence here, but for MVP just concat is fine.

                // Estimate duration for VTT (approximate based on char length if timing not available)
                // Google TTS returns audioContent, but not timing unless requested.
                // For simplified VTT, we'll estimate: 15 chars ~ 1 second? 
                // Better: if possible, use ffmpeg to get duration of buffer? 
                // For MVP, we will generate VTT based on word count assumption.

                const estimatedDuration = text.split(' ').length * 0.4; // rough estimate
                const words = text.split(' ');

                words.forEach((w, i) => {
                    wordTimings.push({
                        word: w,
                        startTime: currentTimeOffset + ((i / words.length) * estimatedDuration),
                        endTime: currentTimeOffset + (((i + 1) / words.length) * estimatedDuration)
                    });
                });

                currentTimeOffset += estimatedDuration + 0.5; // +0.5s gap
            }
        }

        // 4. Merge Audio
        logger.info(`[${requestId}] Merging ${audioSegments.length} segments`);
        const finalAudioBuffer = await mergeAudioSegmentsToBuffer(audioSegments);

        if (!finalAudioBuffer) {
            throw new Error("Failed to merge audio segments");
        }

        // 5. Upload to Supabase
        const timestamp = Date.now();
        const fileName = `podcast_${requestId}_${timestamp}`;

        // Upload Audio
        const audioFileName = `podcasts_${fileName}.mp3`;
        const audioPublicUrl = await uploadToSupabase(finalAudioBuffer, audioFileName, 'audio/mpeg');

        if (!audioPublicUrl) {
            throw new Error("Failed to upload podcast audio to storage");
        }

        // Upload VTT
        const vttContent = generateVTT(wordTimings);
        const vttBuffer = Buffer.from(vttContent, 'utf-8');
        const vttFileName = `podcasts_${fileName}.vtt`;
        const vttPublicUrl = await uploadToSupabase(vttBuffer, vttFileName, 'text/vtt');

        return {
            success: true,
            audioUrl: audioPublicUrl,
            vttUrl: vttPublicUrl || '',
            title: script.title,
            description: script.description,
            duration: currentTimeOffset // estimated
        };

    } catch (error) {
        logger.error(`[${requestId}] Podcast creation failed:`, error);
        throw error;
    }
}

function generateVTT(timings) {
    let vtt = "WEBVTT\n\n";
    timings.forEach(t => {
        vtt += `${formatTime(t.startTime)} --> ${formatTime(t.endTime)}\n${t.word}\n\n`;
    });
    return vtt;
}

function formatTime(seconds) {
    const date = new Date(0);
    date.setMilliseconds(seconds * 1000);
    return date.toISOString().substr(11, 12);
}

module.exports = {
    createPodcast,
    generatePodcastScript
};
