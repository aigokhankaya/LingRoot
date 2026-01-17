const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { generateBilingualContent } = require('../utils/ai/translateAndAdapt.js');
const logger = require('../utils/common/logger.js');

// Mock logger to avoid errors if utils expect it
logger.info = console.log;
logger.error = console.error;
logger.warn = console.warn;
logger.debug = () => { };

async function testGeneration() {
    console.log('--- Testing Factual Content Generation ---');
    const topic = "The History of the Light Bulb";
    const level = "B1";

    console.log(`Topic: ${topic}`);
    console.log(`Level: ${level}`);
    console.log('Generating...');

    try {
        const result = await generateBilingualContent(topic, 'Turkish', level, null);

        console.log('\n--- English Output ---');
        console.log(result.englishText.substring(0, 500) + '...');

        console.log('\n--- Turkish Output ---');
        console.log(result.translatedText.substring(0, 500) + '...');

        console.log('\n--- Usage ---');
        console.log(result.usage);

    } catch (err) {
        console.error('Generation failed:', err);
    }
}

testGeneration();
