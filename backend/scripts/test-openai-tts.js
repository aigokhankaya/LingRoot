/**
 * OpenAI TTS Test Script
 * Tests the OpenAI TTS integration with a sample text
 * 
 * Usage: node backend/scripts/test-openai-tts.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { synthesizeWithOpenAI, listOpenAIVoices, isOpenAITTSAvailable } = require('../utils/audio/openaiTTS.js');
const fs = require('fs');
const path = require('path');

async function testOpenAITTS() {
    console.log('🎙️ OpenAI TTS Test Script');
    console.log('='.repeat(50));

    // Check if API key is available
    if (!isOpenAITTSAvailable()) {
        console.error('❌ OpenAI API key not configured. Set OPENAI_API_KEY in .env');
        process.exit(1);
    }
    console.log('✅ OpenAI API key found');

    // List available voices
    console.log('\n📋 Available OpenAI TTS Voices:');
    const voices = listOpenAIVoices();
    voices.forEach(v => {
        console.log(`   - ${v.displayName} (${v.gender}): ${v.style}`);
    });

    // Test synthesis with different voices
    const testText = "Hello! Welcome to LingRoot. Learning English has never been easier. Let's explore exciting topics together and improve your language skills step by step.";

    const testVoices = ['nova', 'onyx', 'fable'];

    for (const voice of testVoices) {
        console.log(`\n🎤 Testing voice: ${voice}`);
        console.log(`   Text: "${testText.substring(0, 50)}..."`);

        try {
            const startTime = Date.now();
            const result = await synthesizeWithOpenAI({
                text: testText,
                voice: voice,
                model: 'tts-1',
                speed: 1.0
            });
            const elapsed = Date.now() - startTime;

            console.log(`   ✅ Success!`);
            console.log(`   - Audio size: ${result.audioContent.length} bytes`);
            console.log(`   - Estimated duration: ${result.totalDuration.toFixed(2)}s`);
            console.log(`   - Word count: ${result.wordTimings.length}`);
            console.log(`   - Processing time: ${elapsed}ms`);
            console.log(`   - Timing method: ${result.timingMethod}`);

            // Save to file for manual verification
            const outputDir = path.join(__dirname, '../logs');
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            const outputFile = path.join(outputDir, `test-openai-${voice}.mp3`);
            fs.writeFileSync(outputFile, result.audioContent);
            console.log(`   📁 Saved to: ${outputFile}`);

        } catch (error) {
            console.error(`   ❌ Error: ${error.message}`);
        }
    }

    // Test HD model with one voice
    console.log('\n🎤 Testing HD model (tts-1-hd) with nova voice...');
    try {
        const hdResult = await synthesizeWithOpenAI({
            text: testText,
            voice: 'nova',
            model: 'tts-1-hd',
            speed: 1.0
        });

        console.log(`   ✅ HD Success!`);
        console.log(`   - Audio size: ${hdResult.audioContent.length} bytes`);

        const outputFile = path.join(__dirname, '../logs/test-openai-nova-hd.mp3');
        fs.writeFileSync(outputFile, hdResult.audioContent);
        console.log(`   📁 Saved to: ${outputFile}`);

    } catch (error) {
        console.error(`   ❌ HD Error: ${error.message}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎉 OpenAI TTS test complete!');
    console.log('Check the generated MP3 files in backend/logs/ folder');
}

testOpenAITTS().catch(console.error);
